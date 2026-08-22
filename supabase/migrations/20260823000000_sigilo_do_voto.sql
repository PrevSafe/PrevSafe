-- =====================================================================
-- PrevSafe · Sigilo do voto (NR-5)
--
-- Remove o vínculo nominal entre eleitor e voto. Hoje
-- cipa_votos_computados guarda eleitor_id e candidato_id na mesma
-- linha, o que permite reconstruir a urna inteira com nome e CPF.
--
-- Quem votou continua registrado em lista_assinaturas — é o que a ata
-- precisa. O que deixa de existir é a ligação entre a pessoa e o
-- conteúdo do voto.
--
-- CONSEQUÊNCIA: cipa_reverter_voto e cipa_listar_votos_corrigiveis
-- deixam de existir. Não é possível manter as duas coisas: se o
-- sistema sabe reverter o voto de uma pessoa, o sistema sabe em quem
-- ela votou. Erros passam a ser tratados antes da apuração, pela
-- quarentena, que já cumpre esse papel.
--
-- Seguro rodar agora: cipa_votos_computados está com zero linhas.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Remove as RPCs que dependem do vínculo
--
-- Antes da coluna, porque cipa_listar_votos_corrigiveis faz join por
-- eleitor_id e ficaria quebrada de qualquer forma.
-- ---------------------------------------------------------------------
drop function if exists public.cipa_reverter_voto(uuid, text);
drop function if exists public.cipa_listar_votos_corrigiveis(uuid);


-- ---------------------------------------------------------------------
-- 2. Remove o vínculo
-- ---------------------------------------------------------------------
alter table public.cipa_votos_computados
  drop column if exists eleitor_id;


-- ---------------------------------------------------------------------
-- 3. Fecha o vazamento por horário
--
-- Só apagar eleitor_id não basta: lista_assinaturas.data_hora_voto e
-- cipa_votos_computados.criado_em eram gravados no mesmo instante, com
-- diferença de milissegundos. Bastaria ordenar as duas tabelas por
-- horário para reconstruir a correspondência linha a linha.
--
-- Truncar para o dia elimina a correlação. A apuração não usa a hora
-- do voto para nada; a ata usa a data da eleição.
-- ---------------------------------------------------------------------
alter table public.cipa_votos_computados
  alter column criado_em set default date_trunc('day', now());

comment on column public.cipa_votos_computados.criado_em is
  'Truncado para o dia de propósito. Horário exato permitiria cruzar '
  'com lista_assinaturas e identificar o voto de cada eleitor.';

comment on table public.cipa_votos_computados is
  'Urna. NÃO adicionar coluna que identifique o eleitor, direta ou '
  'indiretamente (id, CPF, matrícula, horário exato). O sigilo do voto '
  'é exigência da NR-5. Quem votou fica em lista_assinaturas.';


-- ---------------------------------------------------------------------
-- 4. cipa_registrar_voto_link — sem eleitor_id no voto
-- ---------------------------------------------------------------------
create or replace function public.cipa_registrar_voto_link(
  p_token text,
  p_tipo_voto cipa_tipo_voto default 'NOMINAL'::cipa_tipo_voto,
  p_candidato_id uuid default null,
  p_ip text default null,
  p_user_agent text default null
)
returns json
language plpgsql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare v_el public.eleicao_eleitores; v_e public.eleicoes;
begin
  select * into v_el from eleicao_eleitores
   where token_hash = public.cipa_hash_token(coalesce(p_token,'')) for update;
  if not found then raise exception 'TOKEN_INVALIDO'; end if;
  if v_el.token_expira_em is not null and now() > v_el.token_expira_em then
    raise exception 'TOKEN_EXPIRADO';
  end if;

  v_e := public.cipa_assert_aberta(v_el.eleicao_id);

  if v_el.status_voto then raise exception 'JA_VOTOU'; end if;
  if exists (select 1 from lista_assinaturas
              where eleicao_id = v_el.eleicao_id and cpf = v_el.cpf) then
    raise exception 'JA_VOTOU';
  end if;
  if exists (select 1 from urna_quarentena
              where eleicao_id = v_el.eleicao_id and cpf_declarado = v_el.cpf
                and status_analise = 'PENDENTE') then
    raise exception 'VOTO_EM_ANALISE';
  end if;

  if p_tipo_voto = 'NOMINAL' then
    if p_candidato_id is null then raise exception 'CANDIDATO_OBRIGATORIO'; end if;
    perform public.cipa_assert_candidato(v_el.eleicao_id, p_candidato_id);
    update candidatos set total_votos = total_votos + 1 where id = p_candidato_id;
  elsif p_tipo_voto = 'BRANCO' then
    if not v_e.permite_voto_branco then raise exception 'BRANCO_NAO_PERMITIDO'; end if;
    update eleicoes set votos_branco = votos_branco + 1 where id = v_e.id;
  else
    if not v_e.permite_voto_nulo then raise exception 'NULO_NAO_PERMITIDO'; end if;
    update eleicoes set votos_nulo = votos_nulo + 1 where id = v_e.id;
  end if;

  insert into lista_assinaturas
    (eleicao_id, eleitor_id, nome, cpf, cargo, data_hora_voto, ip_dispositivo, origem_voto)
  values (v_el.eleicao_id, v_el.id, v_el.nome, v_el.cpf, v_el.cargo, now(), p_ip::inet, 'LINK_MAGICO');

  -- Sem eleitor_id: a partir daqui o voto não é rastreável até a pessoa.
  insert into cipa_votos_computados (eleicao_id, origem, tipo_voto, candidato_id)
  values (v_el.eleicao_id, 'LINK_MAGICO', p_tipo_voto, p_candidato_id);

  update eleicao_eleitores set status_voto = true, votou_em = now() where id = v_el.id;

  insert into cipa_auditoria (eleicao_id, empresa_id, acao, detalhes, ip)
  values (v_e.id, v_e.empresa_id, 'VOTO_REGISTRADO',
          jsonb_build_object('origem','LINK_MAGICO'), p_ip::inet);

  return json_build_object('status','sucesso','origem','LINK_MAGICO');
end $function$;


-- ---------------------------------------------------------------------
-- 5. cipa_registrar_voto_qr — sem eleitor_id no voto
--
-- A checagem de duplicidade que consultava cipa_votos_computados por
-- eleitor_id saiu. Não faz falta: status_voto e lista_assinaturas já
-- cobrem o mesmo caso, e lista_assinaturas é a fonte correta para
-- "esta pessoa já votou".
-- ---------------------------------------------------------------------
create or replace function public.cipa_registrar_voto_qr(
  p_eleicao_id uuid,
  p_cpf text,
  p_nome text,
  p_cargo text default null,
  p_tipo_voto cipa_tipo_voto default 'NOMINAL'::cipa_tipo_voto,
  p_candidato_id uuid default null,
  p_ip text default null,
  p_user_agent text default null
)
returns json
language plpgsql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare
  v_e     public.eleicoes;
  v_cpf   text;
  v_el    public.eleicao_eleitores;
  v_bate  boolean;
begin
  v_e := public.cipa_assert_aberta(p_eleicao_id);
  if not v_e.permite_qr_code then raise exception 'QR_CODE_DESABILITADO'; end if;

  v_cpf := public.cipa_digitos(coalesce(p_cpf,''));
  if not public.cipa_cpf_valido(v_cpf) then raise exception 'CPF_INVALIDO'; end if;
  if p_nome is null or length(btrim(p_nome)) < 5
     or position(' ' in btrim(p_nome)) = 0 then raise exception 'NOME_INVALIDO'; end if;

  select * into v_el from eleicao_eleitores
   where eleicao_id = p_eleicao_id and cpf = v_cpf for update;

  -- Estas duas negativas gravam em cipa_tentativas_negadas e, por isso, NÃO
  -- podem usar `raise exception`: uma exceção não tratada aborta a transação
  -- inteira da chamada RPC e desfaria o próprio insert que acabamos de fazer.
  if not found then
    insert into cipa_tentativas_negadas (eleicao_id, cpf, nome_declarado, motivo, ip_dispositivo, user_agent)
    values (p_eleicao_id, v_cpf, p_nome, 'CPF_FORA_DA_LISTA', p_ip::inet, left(coalesce(p_user_agent,''), 400));
    return json_build_object('status','negado','codigo','CPF_FORA_DA_LISTA');
  end if;

  if v_el.status_voto
     or exists (select 1 from lista_assinaturas where eleicao_id = p_eleicao_id and cpf = v_cpf) then
    insert into cipa_tentativas_negadas (eleicao_id, cpf, nome_declarado, motivo, ip_dispositivo, user_agent)
    values (p_eleicao_id, v_cpf, p_nome, 'CPF_JA_VOTOU', p_ip::inet, left(coalesce(p_user_agent,''), 400));
    return json_build_object('status','negado','codigo','JA_VOTOU');
  end if;
  if exists (select 1 from urna_quarentena
              where eleicao_id = p_eleicao_id and cpf_declarado = v_cpf
                and status_analise = 'PENDENTE') then
    raise exception 'VOTO_EM_ANALISE';
  end if;

  if p_tipo_voto = 'NOMINAL' then
    if p_candidato_id is null then raise exception 'CANDIDATO_OBRIGATORIO'; end if;
    perform public.cipa_assert_candidato(p_eleicao_id, p_candidato_id);
  elsif p_tipo_voto = 'BRANCO' and not v_e.permite_voto_branco then
    raise exception 'BRANCO_NAO_PERMITIDO';
  elsif p_tipo_voto = 'NULO' and not v_e.permite_voto_nulo then
    raise exception 'NULO_NAO_PERMITIDO';
  end if;

  v_bate := public.cipa_normaliza_nome(v_el.nome) = public.cipa_normaliza_nome(p_nome);

  if v_bate then
    if p_tipo_voto = 'NOMINAL' then
      update candidatos set total_votos = total_votos + 1
       where id = p_candidato_id and eleicao_id = p_eleicao_id;
    elsif p_tipo_voto = 'BRANCO' then
      update eleicoes set votos_branco = votos_branco + 1 where id = p_eleicao_id;
    else
      update eleicoes set votos_nulo = votos_nulo + 1 where id = p_eleicao_id;
    end if;

    insert into lista_assinaturas
      (eleicao_id, eleitor_id, nome, cpf, cargo, data_hora_voto, ip_dispositivo, origem_voto)
    values (p_eleicao_id, v_el.id, v_el.nome, v_cpf, coalesce(v_el.cargo, p_cargo), now(), p_ip::inet, 'QR_CODE');

    insert into cipa_votos_computados (eleicao_id, origem, tipo_voto, candidato_id)
    values (p_eleicao_id, 'QR_CODE', p_tipo_voto, p_candidato_id);

    update eleicao_eleitores set status_voto = true, votou_em = now() where id = v_el.id;

    insert into cipa_auditoria (eleicao_id, empresa_id, acao, detalhes, ip)
    values (p_eleicao_id, v_e.empresa_id, 'VOTO_REGISTRADO',
            jsonb_build_object('origem','QR_CODE'), p_ip::inet);

    return json_build_object('status','sucesso','origem','QR_CODE');
  end if;

  begin
    insert into urna_quarentena (
      eleicao_id, nome_declarado, cpf_declarado, cargo_declarado,
      ip_dispositivo, user_agent, data_hora, candidato_escolhido_id, tipo_voto, status_analise
    ) values (
      p_eleicao_id, p_nome, v_cpf, p_cargo,
      p_ip::inet, left(coalesce(p_user_agent,''), 400), now(),
      case when p_tipo_voto = 'NOMINAL' then p_candidato_id else null end,
      p_tipo_voto, 'PENDENTE'
    );
  exception when unique_violation then
    raise exception 'VOTO_EM_ANALISE';
  end;

  insert into cipa_auditoria (eleicao_id, empresa_id, acao, detalhes, ip)
  values (p_eleicao_id, v_e.empresa_id, 'VOTO_QUARENTENA',
          jsonb_build_object('cpf_mascara', public.cipa_mascara_cpf(v_cpf)), p_ip::inet);

  return json_build_object('status','quarentena','origem','QR_CODE');
end $function$;


-- ---------------------------------------------------------------------
-- 6. cipa_aprovar_voto — sem eleitor_id no voto
--
-- O insert em cipa_votos_computados deixa de ser condicional: antes só
-- acontecia quando o CPF constava da folha, porque a FK exigia um
-- eleitor_id válido. Sem a FK, todo voto aprovado é computado — que é
-- o comportamento correto: aprovar um envelope significa contar o voto.
-- ---------------------------------------------------------------------
create or replace function public.cipa_aprovar_voto(p_quarentena_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare v_q public.urna_quarentena; v_e public.eleicoes; v_eleitor_id uuid;
begin
  select * into v_q from urna_quarentena where id = p_quarentena_id for update;
  if not found then raise exception 'ENVELOPE_NAO_ENCONTRADO'; end if;

  v_e := public.cipa_assert_acesso(v_q.eleicao_id);

  if not public.tem_permissao(auth.uid(), v_e.empresa_id, 'cipa.quarentena', 'aprovar') then
    raise exception 'ACESSO_NEGADO';
  end if;

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

  select id into v_eleitor_id from eleicao_eleitores
   where eleicao_id = v_q.eleicao_id and cpf = v_q.cpf_declarado;

  insert into lista_assinaturas
    (eleicao_id, eleitor_id, nome, cpf, cargo, data_hora_voto, ip_dispositivo, origem_voto)
  values (v_q.eleicao_id, v_eleitor_id,
          v_q.nome_declarado, v_q.cpf_declarado, v_q.cargo_declarado,
          v_q.data_hora, v_q.ip_dispositivo, 'QR_CODE');

  insert into cipa_votos_computados (eleicao_id, origem, tipo_voto, candidato_id)
  values (v_q.eleicao_id, 'QR_CODE', v_q.tipo_voto, v_q.candidato_escolhido_id);

  -- queima do vínculo
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
end $function$;

commit;


-- =====================================================================
-- OPCIONAL, depois de ajustar o front-end
--
-- A ação 'reverter' do recurso cipa.auditoria e a tabela
-- cipa_reversoes_auditoria ficaram sem uso. Deixei de pé para não
-- alterar o catálogo de permissões no mesmo passo. Quando quiser
-- limpar:
--
--   delete from perfil_permissoes where recurso_codigo = 'cipa.auditoria' and acao_codigo = 'reverter';
--   delete from recurso_acoes     where recurso_codigo = 'cipa.auditoria' and acao_codigo = 'reverter';
--   drop policy if exists cipa_reversoes_auditoria_insert on public.cipa_reversoes_auditoria;
--   drop table if exists public.cipa_reversoes_auditoria;
-- =====================================================================
