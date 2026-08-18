-- =====================================================================
-- Módulo CIPA — estrutura
-- A eleição pertence à UNIDADE (estabelecimento), não à empresa: a NR-05
-- constitui uma CIPA por CNPJ, dimensionada pelo CNAE e pelo nº de
-- empregados daquele estabelecimento.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
do $$ begin create type public.cipa_norma as enum ('NR-05','NR-31');
exception when duplicate_object then null; end $$;

do $$ begin create type public.cipa_status_eleicao as enum
  ('RASCUNHO','AGENDADA','ABERTA','ENCERRADA','APURADA','CANCELADA');
exception when duplicate_object then null; end $$;

do $$ begin create type public.cipa_origem_voto as enum ('LINK_MAGICO','QR_CODE');
exception when duplicate_object then null; end $$;

do $$ begin create type public.cipa_tipo_voto as enum ('NOMINAL','BRANCO','NULO');
exception when duplicate_object then null; end $$;

do $$ begin create type public.cipa_status_analise as enum ('PENDENTE','APROVADO','REJEITADO');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. Utilitários
-- ---------------------------------------------------------------------
create or replace function public.cipa_digitos(p_texto text)
returns text language sql immutable strict set search_path to 'pg_catalog','pg_temp'
as $$ select regexp_replace(p_texto, '\D', '', 'g'); $$;

create or replace function public.cipa_cpf_valido(p_cpf text)
returns boolean language plpgsql immutable set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v text; s int; d int; i int;
begin
  if p_cpf is null then return false; end if;
  v := public.cipa_digitos(p_cpf);
  if length(v) <> 11 or v ~ '^(\d)\1{10}$' then return false; end if;
  s := 0; for i in 1..9 loop s := s + substr(v,i,1)::int * (11 - i); end loop;
  d := 11 - (s % 11); if d >= 10 then d := 0; end if;
  if d <> substr(v,10,1)::int then return false; end if;
  s := 0; for i in 1..10 loop s := s + substr(v,i,1)::int * (12 - i); end loop;
  d := 11 - (s % 11); if d >= 10 then d := 0; end if;
  return d = substr(v,11,1)::int;
end $$;

create or replace function public.cipa_mascara_cpf(p_cpf text)
returns text language sql immutable set search_path to 'public','pg_catalog','pg_temp'
as $$
  select case when p_cpf is null or length(public.cipa_digitos(p_cpf)) <> 11 then null
    else '***.' || substr(public.cipa_digitos(p_cpf),4,3) || '.'
         || substr(public.cipa_digitos(p_cpf),7,3) || '-**' end;
$$;

create or replace function public.cipa_hash_token(p_token text)
returns text language sql immutable strict
set search_path to 'extensions','public','pg_catalog','pg_temp'
as $$ select encode(digest(p_token, 'sha256'), 'hex'); $$;

create or replace function public.cipa_novo_token()
returns text language sql volatile
set search_path to 'extensions','public','pg_catalog','pg_temp'
as $$ select encode(gen_random_bytes(24), 'hex'); $$;

grant execute on function public.cipa_digitos(text), public.cipa_cpf_valido(text),
  public.cipa_mascara_cpf(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Eleição
-- empresa_id é redundante em relação a unidade_id, mas mantido para que
-- toda policy resolva com auth_empresas_ids() sem join. Trigger garante
-- a consistência.
-- ---------------------------------------------------------------------
create table if not exists public.eleicoes (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references public.empresas(id) on delete cascade,
  unidade_id            uuid not null references public.unidades(id) on delete restrict,
  titulo                varchar not null,
  norma                 public.cipa_norma not null default 'NR-05',
  gestao                varchar,
  data_inicio           timestamptz not null,
  data_fim              timestamptz not null,
  status                public.cipa_status_eleicao not null default 'RASCUNHO',

  permite_voto_branco   boolean not null default true,
  permite_voto_nulo     boolean not null default true,
  permite_qr_code       boolean not null default true,
  vagas_efetivos        smallint not null default 1 check (vagas_efetivos > 0),
  vagas_suplentes       smallint not null default 1 check (vagas_suplentes >= 0),

  total_eleitores_aptos integer not null default 0 check (total_eleitores_aptos >= 0),
  votos_branco          integer not null default 0 check (votos_branco >= 0),
  votos_nulo            integer not null default 0 check (votos_nulo >= 0),

  aberta_em             timestamptz,
  encerrada_em          timestamptz,
  ata_eleicao_md        text,
  ata_posse_md          text,

  criado_por            uuid references auth.users(id) on delete set null,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),
  constraint eleicoes_periodo_ck check (data_fim > data_inicio)
);

create index if not exists idx_eleicoes_empresa on public.eleicoes (empresa_id);
create index if not exists idx_eleicoes_unidade on public.eleicoes (unidade_id);

create or replace function public.cipa_tg_valida_unidade()
returns trigger language plpgsql set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v_empresa uuid;
begin
  select empresa_id into v_empresa from unidades where id = new.unidade_id;
  if v_empresa is null then
    raise exception 'UNIDADE_INEXISTENTE';
  end if;
  new.empresa_id := v_empresa;   -- deriva, não confia no cliente
  return new;
end $$;

drop trigger if exists trg_eleicoes_unidade on public.eleicoes;
create trigger trg_eleicoes_unidade before insert or update of unidade_id on public.eleicoes
  for each row execute function public.cipa_tg_valida_unidade();

drop trigger if exists trg_eleicoes_atualizado on public.eleicoes;
create trigger trg_eleicoes_atualizado before update on public.eleicoes
  for each row execute function public.set_atualizado_em();

-- ---------------------------------------------------------------------
-- 4. Eleitores — SNAPSHOT da folha no momento da abertura
-- Não é view sobre funcionarios: com rotatividade, uma admissão posterior
-- ou um desligamento no meio da votação mudariam o quórum e a ata.
-- ---------------------------------------------------------------------
create table if not exists public.eleicao_eleitores (
  id               uuid primary key default gen_random_uuid(),
  eleicao_id       uuid not null references public.eleicoes(id) on delete cascade,
  funcionario_id   uuid references public.funcionarios(id) on delete set null,
  nome             varchar not null,
  cpf              varchar not null,
  matricula        varchar,
  cargo            varchar,
  setor            varchar,
  email            varchar,
  telefone         varchar,
  data_admissao    date,

  token_hash       text unique,
  token_expira_em  timestamptz,
  token_enviado_em timestamptz,

  status_voto      boolean not null default false,
  votou_em         timestamptz,
  criado_em        timestamptz not null default now(),

  constraint eleitores_cpf_valido_ck check (public.cipa_cpf_valido(cpf)),
  constraint eleitores_cpf_uk unique (eleicao_id, cpf)
);

create index if not exists idx_eleicao_eleitores_eleicao on public.eleicao_eleitores (eleicao_id);

create or replace function public.cipa_tg_normaliza_eleitor()
returns trigger language plpgsql set search_path to 'public','pg_catalog','pg_temp'
as $$
begin
  new.cpf := public.cipa_digitos(new.cpf);
  new.nome := btrim(regexp_replace(new.nome, '\s+', ' ', 'g'));
  return new;
end $$;

drop trigger if exists trg_eleitores_normaliza on public.eleicao_eleitores;
create trigger trg_eleitores_normaliza before insert or update on public.eleicao_eleitores
  for each row execute function public.cipa_tg_normaliza_eleitor();

-- ---------------------------------------------------------------------
-- 5. Candidatos
-- data_admissao é copiada do funcionário: é o critério de desempate.
-- ---------------------------------------------------------------------
create table if not exists public.candidatos (
  id               uuid primary key default gen_random_uuid(),
  eleicao_id       uuid not null references public.eleicoes(id) on delete cascade,
  funcionario_id   uuid references public.funcionarios(id) on delete set null,
  numero_urna      smallint,
  nome_completo    varchar not null,
  nome_urna        varchar not null,
  cpf              varchar,
  cargo            varchar,
  setor            varchar,
  data_admissao    date,
  foto_url         text,
  inscricao_status varchar not null default 'DEFERIDA'
                   check (inscricao_status in ('PENDENTE','DEFERIDA','INDEFERIDA')),
  motivo_indeferimento text,
  total_votos      integer not null default 0 check (total_votos >= 0),
  ordem            smallint,
  criado_em        timestamptz not null default now(),
  unique (eleicao_id, numero_urna)
);

create index if not exists idx_candidatos_eleicao on public.candidatos (eleicao_id);

-- ---------------------------------------------------------------------
-- 6. Urna de quarentena (Porta B)
-- ---------------------------------------------------------------------
create table if not exists public.urna_quarentena (
  id                     uuid primary key default gen_random_uuid(),
  eleicao_id             uuid not null references public.eleicoes(id) on delete cascade,
  nome_declarado         varchar not null,
  cpf_declarado          varchar not null,
  cargo_declarado        varchar,
  ip_dispositivo         inet,
  user_agent             text,
  data_hora              timestamptz not null default now(),

  -- Anulado no instante da aprovação ou da rejeição.
  candidato_escolhido_id uuid references public.candidatos(id) on delete restrict,
  tipo_voto              public.cipa_tipo_voto not null default 'NOMINAL',

  status_analise         public.cipa_status_analise not null default 'PENDENTE',
  analisado_por          uuid references auth.users(id) on delete set null,
  analisado_em           timestamptz,
  motivo_rejeicao        text,

  constraint quarentena_cpf_ck check (public.cipa_cpf_valido(cpf_declarado)),
  constraint quarentena_vinculo_ck check (
    case
      when tipo_voto <> 'NOMINAL' then candidato_escolhido_id is null
      when status_analise = 'PENDENTE' then candidato_escolhido_id is not null
      else candidato_escolhido_id is null
    end
  )
);

create unique index if not exists urna_quarentena_pendente_uk
  on public.urna_quarentena (eleicao_id, cpf_declarado) where status_analise = 'PENDENTE';
create index if not exists idx_quarentena_fila
  on public.urna_quarentena (eleicao_id, status_analise, data_hora);

create or replace function public.cipa_tg_normaliza_quarentena()
returns trigger language plpgsql set search_path to 'public','pg_catalog','pg_temp'
as $$
begin
  new.cpf_declarado := public.cipa_digitos(new.cpf_declarado);
  new.nome_declarado := btrim(regexp_replace(new.nome_declarado, '\s+', ' ', 'g'));
  return new;
end $$;

drop trigger if exists trg_quarentena_normaliza on public.urna_quarentena;
create trigger trg_quarentena_normaliza before insert or update on public.urna_quarentena
  for each row execute function public.cipa_tg_normaliza_quarentena();

-- ---------------------------------------------------------------------
-- 7. Lista de presença — prova de QUEM votou, jamais EM QUEM
-- ---------------------------------------------------------------------
create table if not exists public.lista_assinaturas (
  id             uuid primary key default gen_random_uuid(),
  eleicao_id     uuid not null references public.eleicoes(id) on delete cascade,
  eleitor_id     uuid references public.eleicao_eleitores(id) on delete set null,
  nome           varchar not null,
  cpf            varchar not null,
  cargo          varchar,
  data_hora_voto timestamptz not null default now(),
  ip_dispositivo inet,
  origem_voto    public.cipa_origem_voto not null,
  constraint lista_assinaturas_uk unique (eleicao_id, cpf)
);

create index if not exists idx_assinaturas_eleicao on public.lista_assinaturas (eleicao_id);

create or replace function public.cipa_tg_bloqueia_alteracao()
returns trigger language plpgsql set search_path to 'public','pg_catalog','pg_temp'
as $$
begin
  raise exception 'Registro imutável: a lista de presença é append-only.'
    using errcode = 'insufficient_privilege';
end $$;

drop trigger if exists trg_assinaturas_imutavel on public.lista_assinaturas;
create trigger trg_assinaturas_imutavel before update or delete on public.lista_assinaturas
  for each row execute function public.cipa_tg_bloqueia_alteracao();

-- ---------------------------------------------------------------------
-- 8. Auditoria do módulo
-- REGRA: nunca gravar aqui a dupla (CPF, candidato).
-- ---------------------------------------------------------------------
create table if not exists public.cipa_auditoria (
  id         bigint generated always as identity primary key,
  eleicao_id uuid references public.eleicoes(id) on delete set null,
  empresa_id uuid references public.empresas(id) on delete set null,
  ator_id    uuid,
  acao       varchar not null,
  detalhes   jsonb not null default '{}'::jsonb,
  ip         inet,
  criado_em  timestamptz not null default now()
);

create index if not exists idx_cipa_auditoria_eleicao
  on public.cipa_auditoria (eleicao_id, criado_em desc);
