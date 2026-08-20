-- =====================================================================
-- Módulo CIPA — votos corrigíveis
-- Hoje o vínculo voto-eleitor morre no instante em que o voto é computado
-- (proteção de sigilo). Isso adia esse apagamento para o encerramento da
-- eleição, abrindo uma janela em que um voto específico pode ser revertido
-- (ex.: CPF fora da lista aprovado por engano) sem comprometer o sigilo
-- de ninguém: cipa_votos_computados só é lido por funções SECURITY DEFINER
-- restritas a admin, e é apagada por completo no encerramento.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Comparação de nome tolerante a acento — usada só na Porta B, para
-- decidir se o nome autodeclarado bate com o cadastro sem exigir grafia
-- idêntica (crase, cedilha etc. variam entre formulário e RH).
-- ---------------------------------------------------------------------
create extension if not exists unaccent with schema extensions;

create or replace function public.cipa_normaliza_nome(p_nome text)
returns text language sql immutable
set search_path to 'extensions', 'public', 'pg_catalog', 'pg_temp'
as $$ select upper(unaccent(btrim(coalesce(p_nome, '')))); $$;

-- ---------------------------------------------------------------------
-- 1. cipa_votos_computados — o vínculo voto-eleitor, retido só enquanto
-- a eleição está aberta. Sem policy de select/insert/update/delete para
-- anon/authenticated: acesso exclusivo pelas funções SECURITY DEFINER
-- desta migration. É essa ausência de policy que preserva o sigilo
-- mesmo dentro da janela de correção.
-- ---------------------------------------------------------------------
create table public.cipa_votos_computados (
  id           uuid primary key default gen_random_uuid(),
  eleicao_id   uuid not null references public.eleicoes(id) on delete cascade,
  eleitor_id   uuid not null references public.eleicao_eleitores(id) on delete cascade,
  origem       varchar(20) not null check (origem in ('LINK_MAGICO','QR_CODE')),
  tipo_voto    varchar(10) not null check (tipo_voto in ('NOMINAL','BRANCO','NULO')),
  candidato_id uuid references public.candidatos(id) on delete set null,
  criado_em    timestamptz not null default now(),
  unique (eleitor_id)
);

create index idx_cipa_votos_computados_eleicao on public.cipa_votos_computados (eleicao_id);

alter table public.cipa_votos_computados enable row level security;
revoke all on public.cipa_votos_computados from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. cipa_tentativas_negadas — trilha de auditoria/monitoramento de
-- fraude para votos bloqueados na validação. Não afeta quórum nem
-- contagem.
-- ---------------------------------------------------------------------
create table public.cipa_tentativas_negadas (
  id             uuid primary key default gen_random_uuid(),
  eleicao_id     uuid not null references public.eleicoes(id) on delete cascade,
  cpf            varchar(11) not null,
  nome_declarado varchar(255),
  motivo         varchar(30) not null check (motivo in ('CPF_FORA_DA_LISTA','CPF_JA_VOTOU')),
  ip_dispositivo inet,
  user_agent     text,
  criado_em      timestamptz not null default now()
);

create index idx_cipa_tentativas_negadas_eleicao
  on public.cipa_tentativas_negadas (eleicao_id, criado_em desc);

create or replace function public.cipa_tg_normaliza_tentativa()
returns trigger language plpgsql set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
begin
  new.cpf := public.cipa_digitos(new.cpf);
  if new.nome_declarado is not null then
    new.nome_declarado := btrim(regexp_replace(new.nome_declarado, '\s+', ' ', 'g'));
  end if;
  return new;
end $$;

drop trigger if exists trg_tentativas_normaliza on public.cipa_tentativas_negadas;
create trigger trg_tentativas_normaliza before insert or update on public.cipa_tentativas_negadas
  for each row execute function public.cipa_tg_normaliza_tentativa();

alter table public.cipa_tentativas_negadas enable row level security;
revoke all on public.cipa_tentativas_negadas from anon, authenticated;

create policy cipa_tentativas_negadas_select on public.cipa_tentativas_negadas
  for select to authenticated
  using (public.cipa_acesso_eleicao(eleicao_id));

-- ---------------------------------------------------------------------
-- 3. cipa_reversoes_auditoria — único lugar do sistema que registra a
-- dupla (CPF, candidato) de um voto revertido. NÃO é cipa_auditoria:
-- aquela tabela é lida por qualquer papel autenticado da empresa
-- (cipa_auditoria_select), e sua própria regra de criação já proíbe
-- gravar ali essa dupla, porque quebraria o sigilo do voto para
-- técnico/inspetor/leitura. Aqui a leitura é restrita a admin.
-- ---------------------------------------------------------------------
create table public.cipa_reversoes_auditoria (
  id             bigint generated always as identity primary key,
  eleicao_id     uuid not null references public.eleicoes(id) on delete cascade,
  empresa_id     uuid not null references public.empresas(id) on delete cascade,
  ator_id        uuid,
  cpf            varchar not null,
  nome_eleitor   varchar not null,
  tipo_voto      public.cipa_tipo_voto not null,
  candidato_id   uuid references public.candidatos(id) on delete set null,
  candidato_nome varchar,
  motivo         text not null,
  criado_em      timestamptz not null default now()
);

create index idx_cipa_reversoes_eleicao
  on public.cipa_reversoes_auditoria (eleicao_id, criado_em desc);

alter table public.cipa_reversoes_auditoria enable row level security;
revoke all on public.cipa_reversoes_auditoria from anon, authenticated;

create policy cipa_reversoes_auditoria_select on public.cipa_reversoes_auditoria
  for select to authenticated
  using (
    public.cipa_acesso_eleicao(eleicao_id)
    and public.auth_papel_na_empresa(empresa_id) = 'admin'
  );

-- ---------------------------------------------------------------------
-- 4. Porta A — link mágico: mesma validação de sempre, só ganha a linha
-- em cipa_votos_computados dentro da mesma transação do voto.
-- ---------------------------------------------------------------------
create or replace function public.cipa_registrar_voto_link(
  p_token text,
  p_tipo_voto public.cipa_tipo_voto default 'NOMINAL',
  p_candidato_id uuid default null,
  p_ip text default null,
  p_user_agent text default null
) returns json
language plpgsql security definer set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
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

  insert into cipa_votos_computados (eleicao_id, eleitor_id, origem, tipo_voto, candidato_id)
  values (v_el.eleicao_id, v_el.id, 'LINK_MAGICO', p_tipo_voto, p_candidato_id);

  update eleicao_eleitores set status_voto = true, votou_em = now() where id = v_el.id;

  insert into cipa_auditoria (eleicao_id, empresa_id, acao, detalhes, ip)
  values (v_e.id, v_e.empresa_id, 'VOTO_REGISTRADO',
          jsonb_build_object('origem','LINK_MAGICO'), p_ip::inet);

  return json_build_object('status','sucesso','origem','LINK_MAGICO');
end $$;

-- ---------------------------------------------------------------------
-- 5. Porta B — QR Code / autodeclaração.
-- Mudança de comportamento: CPF fora da lista não vai mais para
-- quarentena (vira tentativa negada) e nome que bate com o cadastro
-- computa o voto direto, sem revisão humana. Quarentena agora é só
-- para nome divergente.
-- ---------------------------------------------------------------------
create or replace function public.cipa_registrar_voto_qr(
  p_eleicao_id uuid,
  p_cpf text,
  p_nome text,
  p_cargo text default null,
  p_tipo_voto public.cipa_tipo_voto default 'NOMINAL',
  p_candidato_id uuid default null,
  p_ip text default null,
  p_user_agent text default null
) returns json
language plpgsql security definer set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
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
  -- Por isso retornam um json normal com status 'negado', e é a camada HTTP
  -- (api/cipa/votar.ts) que traduz isso em erro para o cliente.
  if not found then
    insert into cipa_tentativas_negadas (eleicao_id, cpf, nome_declarado, motivo, ip_dispositivo, user_agent)
    values (p_eleicao_id, v_cpf, p_nome, 'CPF_FORA_DA_LISTA', p_ip::inet, left(coalesce(p_user_agent,''), 400));
    return json_build_object('status','negado','codigo','CPF_FORA_DA_LISTA');
  end if;

  if v_el.status_voto
     or exists (select 1 from cipa_votos_computados where eleitor_id = v_el.id)
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

    insert into cipa_votos_computados (eleicao_id, eleitor_id, origem, tipo_voto, candidato_id)
    values (p_eleicao_id, v_el.id, 'QR_CODE', p_tipo_voto, p_candidato_id);

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
end $$;

-- ---------------------------------------------------------------------
-- 6. Aprovação de quarentena — só chega aqui quem tinha nome divergente.
-- Ganha a linha em cipa_votos_computados; urna_quarentena continua
-- desvinculada do eleitor como sempre foi (o vínculo agora vive só em
-- cipa_votos_computados).
-- ---------------------------------------------------------------------
create or replace function public.cipa_aprovar_voto(p_quarentena_id uuid)
returns json
language plpgsql security definer set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
declare v_q public.urna_quarentena; v_e public.eleicoes; v_eleitor_id uuid;
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

  select id into v_eleitor_id from eleicao_eleitores
   where eleicao_id = v_q.eleicao_id and cpf = v_q.cpf_declarado;

  insert into lista_assinaturas
    (eleicao_id, eleitor_id, nome, cpf, cargo, data_hora_voto, ip_dispositivo, origem_voto)
  values (v_q.eleicao_id, v_eleitor_id,
          v_q.nome_declarado, v_q.cpf_declarado, v_q.cargo_declarado,
          v_q.data_hora, v_q.ip_dispositivo, 'QR_CODE');

  -- só existe eleitor_id quando o CPF consta no snapshot da folha; sem
  -- ele não há o que vincular em cipa_votos_computados (FK obrigatória).
  if v_eleitor_id is not null then
    insert into cipa_votos_computados (eleicao_id, eleitor_id, origem, tipo_voto, candidato_id)
    values (v_q.eleicao_id, v_eleitor_id, 'QR_CODE', v_q.tipo_voto, v_q.candidato_escolhido_id);
  end if;

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
end $$;

-- ---------------------------------------------------------------------
-- 7. Reversão — só admin, só com a eleição ainda aberta. Desfaz contagem,
-- presença e o vínculo, e destrava o eleitor para votar de novo (sem
-- isso a correção não seria possível: os RPCs de voto continuariam
-- vendo status_voto = true e recusando um novo voto).
-- ---------------------------------------------------------------------
create or replace function public.cipa_reverter_voto(p_voto_id uuid, p_motivo text)
returns json
language plpgsql security definer set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
declare
  v_v         public.cipa_votos_computados;
  v_e         public.eleicoes;
  v_el        public.eleicao_eleitores;
  v_cand_nome varchar;
  v_rotulo    text;
begin
  if coalesce(btrim(p_motivo),'') = '' then raise exception 'MOTIVO_OBRIGATORIO'; end if;

  select * into v_v from cipa_votos_computados where id = p_voto_id for update;
  if not found then raise exception 'VOTO_NAO_ENCONTRADO'; end if;

  v_e := public.cipa_assert_acesso(v_v.eleicao_id);
  if public.auth_papel_na_empresa(v_e.empresa_id) <> 'admin' then
    raise exception 'ACESSO_NEGADO';
  end if;
  if v_e.status in ('ENCERRADA','APURADA') then
    raise exception 'ELEICAO_JA_ENCERRADA';
  end if;

  select * into v_el from eleicao_eleitores where id = v_v.eleitor_id;

  if v_v.tipo_voto = 'NOMINAL' then
    update candidatos set total_votos = total_votos - 1
     where id = v_v.candidato_id and eleicao_id = v_v.eleicao_id;
    select nome_urna into v_cand_nome from candidatos where id = v_v.candidato_id;
    v_rotulo := v_cand_nome;
  elsif v_v.tipo_voto = 'BRANCO' then
    update eleicoes set votos_branco = votos_branco - 1 where id = v_v.eleicao_id;
    v_rotulo := 'Voto em branco';
  else
    update eleicoes set votos_nulo = votos_nulo - 1 where id = v_v.eleicao_id;
    v_rotulo := 'Voto nulo';
  end if;

  delete from lista_assinaturas
   where eleicao_id = v_v.eleicao_id and eleitor_id = v_v.eleitor_id;

  delete from cipa_votos_computados where id = p_voto_id;

  update eleicao_eleitores set status_voto = false, votou_em = null
   where id = v_v.eleitor_id;

  insert into cipa_reversoes_auditoria
    (eleicao_id, empresa_id, ator_id, cpf, nome_eleitor, tipo_voto, candidato_id, candidato_nome, motivo)
  values (v_v.eleicao_id, v_e.empresa_id, auth.uid(), v_el.cpf, v_el.nome,
          v_v.tipo_voto, v_v.candidato_id, v_cand_nome, p_motivo);

  return json_build_object('status','revertido','eleitor_nome', v_el.nome, 'candidato_afetado', v_rotulo);
end $$;

-- ---------------------------------------------------------------------
-- 8. Leitura para o painel de correção — admin only. Não existe select
-- direto em cipa_votos_computados; é essa função que decide quem pode
-- ver a lista.
-- ---------------------------------------------------------------------
create or replace function public.cipa_listar_votos_corrigiveis(p_eleicao_id uuid)
returns table (
  id             uuid,
  eleitor_nome   varchar,
  eleitor_cpf    varchar,
  origem         varchar,
  tipo_voto      varchar,
  candidato_nome varchar,
  criado_em      timestamptz
)
language plpgsql stable security definer set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
declare v_e public.eleicoes;
begin
  v_e := public.cipa_assert_acesso(p_eleicao_id);
  if public.auth_papel_na_empresa(v_e.empresa_id) <> 'admin' then
    raise exception 'ACESSO_NEGADO';
  end if;

  return query
  select v.id, el.nome, el.cpf, v.origem, v.tipo_voto, c.nome_urna, v.criado_em
  from cipa_votos_computados v
  join eleicao_eleitores el on el.id = v.eleitor_id
  left join candidatos c on c.id = v.candidato_id
  where v.eleicao_id = p_eleicao_id
  order by v.criado_em desc;
end $$;

-- ---------------------------------------------------------------------
-- 9. Encerramento — corte definitivo do sigilo. Apagar
-- cipa_votos_computados é o PRIMEIRO passo, antes de qualquer outra
-- verificação que possa falhar: se o pagamento do vínculo dependesse de
-- chegar ao fim da função sem erro, uma falha tardia (ex.: payload da
-- ata) deixaria o vínculo vivo numa eleição que o resto do sistema já
-- trata como encerrada.
-- ---------------------------------------------------------------------
create or replace function public.cipa_encerrar_eleicao(p_eleicao_id uuid)
returns json
language plpgsql security definer set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
declare v_e public.eleicoes; v_u public.unidades; v_pend int; v_vot int; v_out json;
begin
  v_e := public.cipa_assert_acesso(p_eleicao_id);

  delete from cipa_votos_computados where eleicao_id = p_eleicao_id;

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
      'cnae', v_u.cnae_principal,
      'municipio', v_u.municipio,
      'uf', v_u.uf
    ),
    'eleicao', json_build_object(
      'titulo', v_e.titulo, 'norma', v_e.norma, 'gestao', v_e.gestao,
      'data_inicio', v_e.data_inicio, 'data_fim', v_e.data_fim,
      'encerrada_em', v_e.encerrada_em,
      'vagas_efetivos', v_e.vagas_efetivos, 'vagas_suplentes', v_e.vagas_suplentes,
      'apuracao_iniciada_em', v_e.apuracao_iniciada_em,
      'apuracao_encerrada_em', v_e.apuracao_encerrada_em,
      'ata_lavrada_por', v_e.ata_lavrada_por,
      'local_apuracao', v_e.local_apuracao
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
            c.nome_completo, c.nome_urna, c.cargo as cargo_funcao, c.setor,
            c.numero_urna, c.total_votos, c.data_admissao,
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
             where eleicao_id = p_eleicao_id group by status_analise) q),
    'comissao', coalesce((
      select json_agg(json_build_object(
        'nome', cc.nome, 'cpf', cc.cpf, 'cargo', cc.cargo, 'papel', cc.papel
      ) order by cc.criado_em)
      from cipa_comissao cc where cc.eleicao_id = p_eleicao_id
    ), '[]'::json),
    'indicados', coalesce((
      select json_agg(json_build_object(
        'nome', ci.nome, 'cargo', ci.cargo, 'setor', ci.setor,
        'condicao', ci.condicao, 'ordem', ci.ordem
      ) order by ci.condicao, ci.ordem)
      from cipa_indicados ci where ci.eleicao_id = p_eleicao_id
    ), '[]'::json)
  ) into v_out;

  insert into cipa_auditoria (eleicao_id, empresa_id, ator_id, acao)
  values (p_eleicao_id, v_e.empresa_id, auth.uid(), 'ELEICAO_ENCERRADA');

  return v_out;
end $$;

-- ---------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------
revoke execute on function public.cipa_registrar_voto_link(text, public.cipa_tipo_voto, uuid, text, text) from public;
revoke execute on function public.cipa_registrar_voto_qr(uuid, text, text, text, public.cipa_tipo_voto, uuid, text, text) from public;
grant execute on function public.cipa_registrar_voto_link(text, public.cipa_tipo_voto, uuid, text, text) to anon, authenticated;
grant execute on function public.cipa_registrar_voto_qr(uuid, text, text, text, public.cipa_tipo_voto, uuid, text, text) to anon, authenticated;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname in ('cipa_aprovar_voto','cipa_encerrar_eleicao',
                               'cipa_reverter_voto','cipa_listar_votos_corrigiveis')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
end $$;
