-- =====================================================================
-- Módulo CIPA — RPCs do painel (papel `authenticated`)
-- SECURITY DEFINER ignora RLS: toda função checa acesso explicitamente.
-- =====================================================================

create or replace function public.cipa_assert_acesso(p_eleicao_id uuid)
returns public.eleicoes
language plpgsql stable security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v public.eleicoes;
begin
  select * into v from eleicoes where id = p_eleicao_id;
  if not found then raise exception 'ELEICAO_NAO_ENCONTRADA'; end if;
  if v.empresa_id not in (select auth_empresas_ids()) then
    raise exception 'ACESSO_NEGADO';
  end if;
  return v;
end $$;

-- ---------------------------------------------------------------------
-- 1. Snapshot da folha -> lista de aptos
-- Congela quem estava ativo na unidade. Não é view: rotatividade durante
-- a votação mudaria quórum e ata.
-- ---------------------------------------------------------------------
create or replace function public.cipa_montar_eleitores(
  p_eleicao_id uuid,
  p_apenas_unidade boolean default false
) returns json
language plpgsql security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v_e public.eleicoes; v_inseridos int := 0; v_total int;
begin
  v_e := public.cipa_assert_acesso(p_eleicao_id);
  if v_e.status not in ('RASCUNHO','AGENDADA') then
    raise exception 'ELEICAO_NAO_EDITAVEL';
  end if;

  -- Lotação vigente do funcionário: traz unidade, setor e cargo.
  -- p_apenas_unidade restringe aos lotados na unidade da eleição, que é o
  -- recorte correto da NR-05 (uma CIPA por estabelecimento). Quem não tem
  -- lotação registrada entra pela empresa, para não excluir ninguém por
  -- falha de cadastro.
  insert into eleicao_eleitores
    (eleicao_id, funcionario_id, nome, cpf, matricula, cargo, setor, email, telefone, data_admissao)
  select
    p_eleicao_id, f.id, f.nome, public.cipa_digitos(f.cpf), f.matricula_esocial,
    cg.nome, st.nome, f.email, f.telefone, f.data_admissao
  from funcionarios f
  left join lateral (
    select l.unidade_id, l.setor_id, l.cargo_id
    from funcionarios_lotacoes fl
    join lotacoes l on l.id = fl.lotacao_id
    where fl.funcionario_id = f.id
      and fl.data_inicio <= current_date
      and (fl.data_fim is null or fl.data_fim >= current_date)
    order by fl.data_inicio desc
    limit 1
  ) lot on true
  left join cargos  cg on cg.id = lot.cargo_id
  left join setores st on st.id = lot.setor_id
  where f.empresa_id = v_e.empresa_id
    and f.status = 'ATIVO'
    and f.data_desligamento is null
    and public.cipa_cpf_valido(f.cpf)
    and (
      not p_apenas_unidade
      or lot.unidade_id is null
      or lot.unidade_id = v_e.unidade_id
    )
  on conflict (eleicao_id, cpf) do nothing;

  get diagnostics v_inseridos = row_count;
  select count(*) into v_total from eleicao_eleitores where eleicao_id = p_eleicao_id;
  update eleicoes set total_eleitores_aptos = v_total where id = p_eleicao_id;

  insert into cipa_auditoria (eleicao_id, empresa_id, ator_id, acao, detalhes)
  values (p_eleicao_id, v_e.empresa_id, auth.uid(), 'SNAPSHOT_ELEITORES',
          jsonb_build_object('incluidos', v_inseridos, 'total', v_total));

  return json_build_object('status','sucesso','incluidos',v_inseridos,'total_aptos',v_total);
end $$;

-- Fallback: empresa que ainda não carregou o cadastro de funcionários.
create or replace function public.cipa_importar_eleitores(p_eleicao_id uuid, p_eleitores jsonb)
returns json
language plpgsql security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare
  v_e public.eleicoes; v_item jsonb; v_cpf text;
  v_ok int := 0; v_ign jsonb := '[]'::jsonb; v_total int;
begin
  v_e := public.cipa_assert_acesso(p_eleicao_id);
  if v_e.status not in ('RASCUNHO','AGENDADA','ABERTA') then
    raise exception 'ELEICAO_NAO_EDITAVEL';
  end if;
  if jsonb_typeof(p_eleitores) <> 'array' then raise exception 'PAYLOAD_INVALIDO'; end if;

  for v_item in select * from jsonb_array_elements(p_eleitores) loop
    v_cpf := public.cipa_digitos(coalesce(v_item->>'cpf',''));
    if not public.cipa_cpf_valido(v_cpf) or coalesce(btrim(v_item->>'nome'),'') = '' then
      v_ign := v_ign || jsonb_build_object('linha', v_item, 'motivo', 'CPF ou nome inválido');
      continue;
    end if;

    insert into eleicao_eleitores (eleicao_id, nome, cpf, matricula, cargo, setor, email, telefone)
    values (p_eleicao_id, v_item->>'nome', v_cpf, v_item->>'matricula',
            v_item->>'cargo', v_item->>'setor',
            nullif(v_item->>'email',''), nullif(v_item->>'telefone',''))
    on conflict (eleicao_id, cpf) do update set
      nome     = excluded.nome,
      cargo    = coalesce(excluded.cargo, eleicao_eleitores.cargo),
      setor    = coalesce(excluded.setor, eleicao_eleitores.setor),
      email    = coalesce(excluded.email, eleicao_eleitores.email),
      telefone = coalesce(excluded.telefone, eleicao_eleitores.telefone)
    where eleicao_eleitores.status_voto = false;

    v_ok := v_ok + 1;
  end loop;

  select count(*) into v_total from eleicao_eleitores where eleicao_id = p_eleicao_id;
  update eleicoes set total_eleitores_aptos = v_total where id = p_eleicao_id;

  return json_build_object('status','sucesso','processados',v_ok,
                           'ignorados',v_ign,'total_aptos',v_total);
end $$;

-- ---------------------------------------------------------------------
-- 2. Links mágicos — token em claro devolvido uma única vez
-- ---------------------------------------------------------------------
create or replace function public.cipa_gerar_tokens(
  p_eleicao_id uuid, p_validade_horas int default 168, p_apenas_sem_token boolean default true
) returns table (eleitor_id uuid, nome varchar, email varchar, telefone varchar, token text)
language plpgsql security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v_e public.eleicoes; r record; v_t text;
begin
  v_e := public.cipa_assert_acesso(p_eleicao_id);
  for r in select * from eleicao_eleitores el
            where el.eleicao_id = p_eleicao_id and el.status_voto = false
              and (not p_apenas_sem_token or el.token_hash is null)
            order by el.nome
  loop
    v_t := public.cipa_novo_token();
    update eleicao_eleitores
       set token_hash = public.cipa_hash_token(v_t),
           token_expira_em = now() + make_interval(hours => p_validade_horas)
     where id = r.id;
    eleitor_id := r.id; nome := r.nome; email := r.email;
    telefone := r.telefone; token := v_t;
    return next;
  end loop;

  insert into cipa_auditoria (eleicao_id, empresa_id, ator_id, acao)
  values (p_eleicao_id, v_e.empresa_id, auth.uid(), 'TOKENS_GERADOS');
end $$;

-- ---------------------------------------------------------------------
-- 3. Abertura — único ponto onde a licença é exigida
-- ---------------------------------------------------------------------
create or replace function public.cipa_abrir_eleicao(p_eleicao_id uuid)
returns json
language plpgsql security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v_e public.eleicoes; v_cand int; v_apt int;
begin
  v_e := public.cipa_assert_acesso(p_eleicao_id);

  if not public.modulo_ativo(v_e.empresa_id, 'CIPA') then
    raise exception 'MODULO_NAO_CONTRATADO';
  end if;
  if v_e.status not in ('RASCUNHO','AGENDADA') then raise exception 'STATUS_INVALIDO'; end if;

  select count(*) into v_cand from candidatos
   where eleicao_id = p_eleicao_id and inscricao_status = 'DEFERIDA';
  select count(*) into v_apt from eleicao_eleitores where eleicao_id = p_eleicao_id;

  if v_cand < 1 then raise exception 'SEM_CANDIDATOS_DEFERIDOS'; end if;
  if v_apt < 1 then raise exception 'SEM_ELEITORES'; end if;

  update eleicoes
     set status = 'ABERTA', aberta_em = now(), total_eleitores_aptos = v_apt
   where id = p_eleicao_id;

  insert into cipa_auditoria (eleicao_id, empresa_id, ator_id, acao, detalhes)
  values (p_eleicao_id, v_e.empresa_id, auth.uid(), 'ELEICAO_ABERTA',
          jsonb_build_object('aptos', v_apt, 'candidatos', v_cand));

  return json_build_object('status','sucesso','aptos',v_apt,'candidatos',v_cand);
end $$;

-- ---------------------------------------------------------------------
-- 4. Fila de quarentena — cruzamento com o snapshot da folha
-- ---------------------------------------------------------------------
create or replace function public.cipa_fila_quarentena(
  p_eleicao_id uuid, p_status public.cipa_status_analise default 'PENDENTE'
) returns table (
  id uuid, nome_declarado varchar, cpf_mascara text, cargo_declarado varchar,
  data_hora timestamptz, ip_dispositivo inet, status_analise public.cipa_status_analise,
  alerta text, nome_rh varchar, cargo_rh varchar, votos_mesmo_ip int
)
language plpgsql stable security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
begin
  perform public.cipa_assert_acesso(p_eleicao_id);

  return query
  with base as (
    select q.*, el.nome as rh_nome, el.cargo as rh_cargo, el.status_voto as rh_votou,
           exists (select 1 from lista_assinaturas la
                    where la.eleicao_id = q.eleicao_id and la.cpf = q.cpf_declarado) as assinou,
           (select count(*) from urna_quarentena q2
             where q2.eleicao_id = q.eleicao_id
               and q2.ip_dispositivo is not distinct from q.ip_dispositivo
               and q2.ip_dispositivo is not null)::int as mesmo_ip
    from urna_quarentena q
    left join eleicao_eleitores el
      on el.eleicao_id = q.eleicao_id and el.cpf = q.cpf_declarado
    where q.eleicao_id = p_eleicao_id and q.status_analise = p_status
  )
  select b.id, b.nome_declarado, public.cipa_mascara_cpf(b.cpf_declarado), b.cargo_declarado,
         b.data_hora, b.ip_dispositivo, b.status_analise,
         case
           when b.assinou or b.rh_votou then 'TENTATIVA_DUPLICADA'
           when b.rh_nome is null then 'CPF_NAO_ENCONTRADO_RH'
           when upper(btrim(split_part(b.rh_nome,' ',1)))
                <> upper(btrim(split_part(b.nome_declarado,' ',1))) then 'DIVERGENCIA_NOME'
           when b.mesmo_ip >= 5 then 'MULTIPLOS_VOTOS_MESMO_IP'
           else 'OK'
         end,
         b.rh_nome, b.rh_cargo, b.mesmo_ip
  from base b order by b.data_hora;
end $$;

-- ---------------------------------------------------------------------
-- 5. Aprovação — separação entre voto e identidade
-- ---------------------------------------------------------------------
create or replace function public.cipa_aprovar_voto(p_quarentena_id uuid)
returns json
language plpgsql security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v_q public.urna_quarentena; v_e public.eleicoes;
begin
  select * into v_q from urna_quarentena where id = p_quarentena_id for update;
  if not found then raise exception 'ENVELOPE_NAO_ENCONTRADO'; end if;

  v_e := public.cipa_assert_acesso(v_q.eleicao_id);

  if v_q.status_analise <> 'PENDENTE' then raise exception 'VOTO_JA_PROCESSADO'; end if;
  if v_e.status not in ('ABERTA','ENCERRADA') then raise exception 'STATUS_INVALIDO'; end if;
  if exists (select 1 from lista_assinaturas
              where eleicao_id = v_q.eleicao_id and cpf = v_q.cpf_declarado) then
    raise exception 'CPF_JA_ASSINOU';
  end if;

  if v_q.tipo_voto = 'NOMINAL' then
    update candidatos set total_votos = total_votos + 1
     where id = v_q.candidato_escolhido_id and eleicao_id = v_q.eleicao_id;
    if not found then raise exception 'CANDIDATO_INVALIDO'; end if;
  elsif v_q.tipo_voto = 'BRANCO' then
    update eleicoes set votos_branco = votos_branco + 1 where id = v_q.eleicao_id;
  else
    update eleicoes set votos_nulo = votos_nulo + 1 where id = v_q.eleicao_id;
  end if;

  insert into lista_assinaturas
    (eleicao_id, eleitor_id, nome, cpf, cargo, data_hora_voto, ip_dispositivo, origem_voto)
  values (v_q.eleicao_id,
          (select id from eleicao_eleitores
            where eleicao_id = v_q.eleicao_id and cpf = v_q.cpf_declarado),
          v_q.nome_declarado, v_q.cpf_declarado, v_q.cargo_declarado,
          v_q.data_hora, v_q.ip_dispositivo, 'QR_CODE');

  -- 🔥 queima do vínculo
  update urna_quarentena
     set status_analise = 'APROVADO', candidato_escolhido_id = null,
         analisado_por = auth.uid(), analisado_em = now()
   where id = p_quarentena_id;

  update eleicao_eleitores
     set status_voto = true, votou_em = coalesce(votou_em, v_q.data_hora)
   where eleicao_id = v_q.eleicao_id and cpf = v_q.cpf_declarado;

  insert into cipa_auditoria (eleicao_id, empresa_id, ator_id, acao, detalhes)
  values (v_q.eleicao_id, v_e.empresa_id, auth.uid(), 'QUARENTENA_APROVADA',
          jsonb_build_object('cpf_mascara', public.cipa_mascara_cpf(v_q.cpf_declarado)));

  return json_build_object('status','sucesso');
end $$;

create or replace function public.cipa_rejeitar_voto(p_quarentena_id uuid, p_motivo text)
returns json
language plpgsql security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v_q public.urna_quarentena; v_e public.eleicoes;
begin
  if coalesce(btrim(p_motivo),'') = '' then raise exception 'MOTIVO_OBRIGATORIO'; end if;
  select * into v_q from urna_quarentena where id = p_quarentena_id for update;
  if not found then raise exception 'ENVELOPE_NAO_ENCONTRADO'; end if;
  v_e := public.cipa_assert_acesso(v_q.eleicao_id);
  if v_q.status_analise <> 'PENDENTE' then raise exception 'VOTO_JA_PROCESSADO'; end if;

  update urna_quarentena
     set status_analise = 'REJEITADO', candidato_escolhido_id = null,
         motivo_rejeicao = p_motivo, analisado_por = auth.uid(), analisado_em = now()
   where id = p_quarentena_id;

  insert into cipa_auditoria (eleicao_id, empresa_id, ator_id, acao, detalhes)
  values (v_q.eleicao_id, v_e.empresa_id, auth.uid(), 'QUARENTENA_REJEITADA',
          jsonb_build_object('cpf_mascara', public.cipa_mascara_cpf(v_q.cpf_declarado),
                             'motivo', p_motivo));

  return json_build_object('status','sucesso');
end $$;

create or replace function public.cipa_aprovar_lote(p_ids uuid[])
returns json
language plpgsql security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v_id uuid; v_ok int := 0; v_erros jsonb := '[]'::jsonb;
begin
  foreach v_id in array p_ids loop
    begin
      perform public.cipa_aprovar_voto(v_id);
      v_ok := v_ok + 1;
    exception when others then
      v_erros := v_erros || jsonb_build_object('id', v_id, 'erro', sqlerrm);
    end;
  end loop;
  return json_build_object('aprovados', v_ok, 'erros', v_erros);
end $$;

-- ---------------------------------------------------------------------
-- 6. Painel — quórum sem resultado parcial
-- ---------------------------------------------------------------------
create or replace function public.cipa_painel(p_eleicao_id uuid)
returns json
language plpgsql stable security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v_e public.eleicoes; v_vot int; v_pend int;
begin
  v_e := public.cipa_assert_acesso(p_eleicao_id);
  select count(*) into v_vot from lista_assinaturas where eleicao_id = p_eleicao_id;
  select count(*) into v_pend from urna_quarentena
   where eleicao_id = p_eleicao_id and status_analise = 'PENDENTE';

  return json_build_object(
    'status', v_e.status,
    'aptos', v_e.total_eleitores_aptos,
    'votantes', v_vot,
    'quorum_percent', case when v_e.total_eleitores_aptos > 0
      then round(100.0 * v_vot / v_e.total_eleitores_aptos, 2) else 0 end,
    'quorum_atingido', v_vot * 2 > v_e.total_eleitores_aptos,
    'quarentena_pendente', v_pend,
    'por_origem', (select coalesce(json_object_agg(origem_voto, qtd), '{}'::json)
      from (select origem_voto, count(*) qtd from lista_assinaturas
             where eleicao_id = p_eleicao_id group by origem_voto) t),
    'modulo_ativo', public.modulo_ativo(v_e.empresa_id, 'CIPA'),
    'resultado_disponivel', v_e.status in ('ENCERRADA','APURADA')
  );
end $$;

-- ---------------------------------------------------------------------
-- 7. Encerramento + payload da ata
-- Desempate por maior tempo de serviço (data_admissao mais antiga).
-- ---------------------------------------------------------------------
create or replace function public.cipa_encerrar_eleicao(p_eleicao_id uuid)
returns json
language plpgsql security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v_e public.eleicoes; v_u public.unidades; v_pend int; v_vot int; v_out json;
begin
  v_e := public.cipa_assert_acesso(p_eleicao_id);

  select count(*) into v_pend from urna_quarentena
   where eleicao_id = p_eleicao_id and status_analise = 'PENDENTE';
  if v_pend > 0 then
    raise exception 'QUARENTENA_PENDENTE: % envelope(s) aguardando análise', v_pend;
  end if;

  if v_e.status = 'ABERTA' then
    update eleicoes set status = 'ENCERRADA', encerrada_em = now() where id = p_eleicao_id;
    select * into v_e from eleicoes where id = p_eleicao_id;
  elsif v_e.status not in ('ENCERRADA','APURADA') then
    raise exception 'STATUS_INVALIDO';
  end if;

  select * into v_u from unidades where id = v_e.unidade_id;
  select count(*) into v_vot from lista_assinaturas where eleicao_id = p_eleicao_id;

  select json_build_object(
    'empresa', json_build_object(
      'razao_social', v_u.razao_social,
      'cnpj', v_u.numero_inscricao,
      'total_funcionarios', v_e.total_eleitores_aptos,
      'grau_risco', v_u.grau_risco,
      'cnae', v_u.cnae_principal
    ),
    'eleicao', json_build_object(
      'titulo', v_e.titulo, 'norma', v_e.norma, 'gestao', v_e.gestao,
      'data_inicio', v_e.data_inicio, 'data_fim', v_e.data_fim,
      'encerrada_em', v_e.encerrada_em,
      'vagas_efetivos', v_e.vagas_efetivos, 'vagas_suplentes', v_e.vagas_suplentes
    ),
    'quorum', json_build_object(
      'aptos', v_e.total_eleitores_aptos, 'votantes', v_vot,
      'percentual', case when v_e.total_eleitores_aptos > 0
        then round(100.0 * v_vot / v_e.total_eleitores_aptos, 2) else 0 end,
      'atingido', v_vot * 2 > v_e.total_eleitores_aptos
    ),
    'apuracao', json_build_object(
      'votos_brancos', v_e.votos_branco,
      'votos_nulos', v_e.votos_nulo,
      'votos_nominais', coalesce((select sum(total_votos) from candidatos
                                   where eleicao_id = p_eleicao_id), 0),
      'classificacao', coalesce((
        select json_agg(x order by x.posicao)
        from (
          select
            row_number() over (order by c.total_votos desc,
                                        c.data_admissao asc nulls last,
                                        c.nome_completo) as posicao,
            c.nome_completo, c.nome_urna, c.cargo as cargo_funcao, c.numero_urna,
            c.total_votos, c.data_admissao,
            case
              when row_number() over (order by c.total_votos desc,
                                               c.data_admissao asc nulls last,
                                               c.nome_completo) <= v_e.vagas_efetivos then 'EFETIVO'
              when row_number() over (order by c.total_votos desc,
                                               c.data_admissao asc nulls last,
                                               c.nome_completo)
                   <= v_e.vagas_efetivos + v_e.vagas_suplentes then 'SUPLENTE'
              else 'NAO_ELEITO'
            end as situacao,
            count(*) over (partition by c.total_votos) > 1 as empate,
            (count(*) over (partition by c.total_votos) > 1
              and c.data_admissao is not null) as desempate_por_admissao
          from candidatos c
          where c.eleicao_id = p_eleicao_id and c.inscricao_status = 'DEFERIDA'
        ) x
      ), '[]'::json)
    ),
    'quarentena', (select coalesce(json_object_agg(status_analise, qtd), '{}'::json)
      from (select status_analise, count(*) qtd from urna_quarentena
             where eleicao_id = p_eleicao_id group by status_analise) q)
  ) into v_out;

  insert into cipa_auditoria (eleicao_id, empresa_id, ator_id, acao)
  values (p_eleicao_id, v_e.empresa_id, auth.uid(), 'ELEICAO_ENCERRADA');

  return v_out;
end $$;

-- ---------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname in ('cipa_montar_eleitores','cipa_importar_eleitores','cipa_gerar_tokens',
                               'cipa_abrir_eleicao','cipa_fila_quarentena','cipa_aprovar_voto',
                               'cipa_rejeitar_voto','cipa_aprovar_lote','cipa_painel',
                               'cipa_encerrar_eleicao','cipa_assert_acesso')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
end $$;
