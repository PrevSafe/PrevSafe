-- =====================================================================
-- Módulo CIPA — Comissão eleitoral
-- Dados que a ata narrativa precisa e que ainda não existem no banco:
-- quem compõe a comissão eleitoral, quem o empregador indicou (paridade
-- da NR-05) e os dados da sessão de apuração.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Membros da comissão eleitoral
-- ---------------------------------------------------------------------
create table if not exists public.cipa_comissao (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  eleicao_id uuid not null references public.eleicoes(id) on delete cascade,
  nome       varchar(255) not null,
  cpf        varchar(11) check (cpf is null or cpf ~ '^[0-9]{11}$'),
  cargo      varchar(255),
  papel      varchar(20) not null
             check (papel in ('presidente','vice_presidente','secretario','membro')),
  criado_em  timestamptz not null default now()
);

-- No máximo um presidente e um vice por eleição.
create unique index if not exists cipa_comissao_presidente_uk
  on public.cipa_comissao (eleicao_id) where papel = 'presidente';
create unique index if not exists cipa_comissao_vice_uk
  on public.cipa_comissao (eleicao_id) where papel = 'vice_presidente';

create index if not exists idx_cipa_comissao_eleicao on public.cipa_comissao (eleicao_id);

-- ---------------------------------------------------------------------
-- 2. Indicados pelo empregador — não são eleitos; a NR-05 exige
-- composição paritária entre eleitos e indicados.
-- ---------------------------------------------------------------------
create table if not exists public.cipa_indicados (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  eleicao_id uuid not null references public.eleicoes(id) on delete cascade,
  nome       varchar(255) not null,
  cargo      varchar(255),
  setor      varchar(255),
  condicao   varchar(10) not null check (condicao in ('titular','suplente')),
  ordem      smallint not null default 1,
  criado_em  timestamptz not null default now()
);

create index if not exists idx_cipa_indicados_eleicao
  on public.cipa_indicados (eleicao_id, condicao, ordem);

-- ---------------------------------------------------------------------
-- 3. empresa_id é redundante em relação a eleicao_id, mas mantido para
-- que toda policy resolva com auth_empresas_ids() sem join — mesmo
-- motivo do trigger em eleicoes.unidade_id. Trigger garante consistência.
-- ---------------------------------------------------------------------
create or replace function public.cipa_tg_deriva_empresa()
returns trigger language plpgsql set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v_empresa uuid;
begin
  select empresa_id into v_empresa from eleicoes where id = new.eleicao_id;
  if v_empresa is null then
    raise exception 'ELEICAO_NAO_ENCONTRADA';
  end if;
  new.empresa_id := v_empresa;
  return new;
end $$;

drop trigger if exists trg_cipa_comissao_empresa on public.cipa_comissao;
create trigger trg_cipa_comissao_empresa before insert or update of eleicao_id on public.cipa_comissao
  for each row execute function public.cipa_tg_deriva_empresa();

drop trigger if exists trg_cipa_indicados_empresa on public.cipa_indicados;
create trigger trg_cipa_indicados_empresa before insert or update of eleicao_id on public.cipa_indicados
  for each row execute function public.cipa_tg_deriva_empresa();

-- ---------------------------------------------------------------------
-- 4. Colunas novas em eleicoes — dados da sessão de apuração.
-- ---------------------------------------------------------------------
alter table public.eleicoes
  add column if not exists apuracao_iniciada_em  timestamptz,
  add column if not exists apuracao_encerrada_em timestamptz,
  add column if not exists ata_lavrada_por        varchar(255),
  add column if not exists local_apuracao         varchar(255);

-- ---------------------------------------------------------------------
-- 5. RLS — mesmo padrão de candidatos: select e write por
-- cipa_acesso_eleicao(eleicao_id).
-- ---------------------------------------------------------------------
alter table public.cipa_comissao  enable row level security;
alter table public.cipa_indicados enable row level security;

revoke all on public.cipa_comissao, public.cipa_indicados from anon;

grant select, insert, update, delete on public.cipa_comissao, public.cipa_indicados to authenticated;

drop policy if exists cipa_comissao_select on public.cipa_comissao;
create policy cipa_comissao_select on public.cipa_comissao
  for select to authenticated using (public.cipa_acesso_eleicao(eleicao_id));

drop policy if exists cipa_comissao_write on public.cipa_comissao;
create policy cipa_comissao_write on public.cipa_comissao
  for all to authenticated
  using (public.cipa_acesso_eleicao(eleicao_id))
  with check (public.cipa_acesso_eleicao(eleicao_id));

drop policy if exists cipa_indicados_select on public.cipa_indicados;
create policy cipa_indicados_select on public.cipa_indicados
  for select to authenticated using (public.cipa_acesso_eleicao(eleicao_id));

drop policy if exists cipa_indicados_write on public.cipa_indicados;
create policy cipa_indicados_write on public.cipa_indicados
  for all to authenticated
  using (public.cipa_acesso_eleicao(eleicao_id))
  with check (public.cipa_acesso_eleicao(eleicao_id));
