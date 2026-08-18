-- =====================================================================
-- Licenciamento de módulos (CIPA, e os próximos)
-- Suporta os dois modelos de cobrança: pela consultoria ou pela empresa.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Consultoria: entidade puramente comercial.
-- O acesso continua sendo resolvido por usuarios_empresas; consultorias
-- existe apenas para pendurar contrato e agrupar faturamento.
-- ---------------------------------------------------------------------
create table if not exists public.consultorias (
  id                uuid primary key default gen_random_uuid(),
  razao_social      varchar not null,
  nome_fantasia     varchar,
  tipo_inscricao    smallint not null default 1,
  numero_inscricao  varchar not null,
  ativo             boolean not null default true,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  unique (tipo_inscricao, numero_inscricao)
);

drop trigger if exists trg_consultorias_atualizado on public.consultorias;
create trigger trg_consultorias_atualizado before update on public.consultorias
  for each row execute function public.set_atualizado_em();

alter table public.empresas
  add column if not exists consultoria_id uuid references public.consultorias(id) on delete set null;

create index if not exists idx_empresas_consultoria on public.empresas (consultoria_id);

-- ---------------------------------------------------------------------
-- 2. Catálogo de módulos
-- ---------------------------------------------------------------------
create table if not exists public.modulos (
  codigo     text primary key,
  nome       varchar not null,
  descricao  text,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

insert into public.modulos (codigo, nome, descricao) values
  ('CIPA', 'CIPA / CIPATR Digital',
   'Eleição eletrônica de CIPA (NR-05) e CIPATR (NR-31), com sigilo do voto, lista de presença e atas.')
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------
-- 3. Licenças
-- Exatamente um titular por linha: consultoria OU empresa.
-- Licença de consultoria cobre todas as empresas vinculadas a ela.
-- ---------------------------------------------------------------------
create table if not exists public.licencas_modulo (
  id                  uuid primary key default gen_random_uuid(),
  modulo_codigo       text not null references public.modulos(codigo) on delete restrict,
  consultoria_id      uuid references public.consultorias(id) on delete cascade,
  empresa_id          uuid references public.empresas(id) on delete cascade,
  plano               varchar not null default 'PADRAO',
  inicio              date not null default current_date,
  fim                 date,
  ativo               boolean not null default true,
  limite_eleicoes_ano integer,
  observacao          text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  constraint licenca_titular_ck check (num_nonnulls(consultoria_id, empresa_id) = 1),
  constraint licenca_vigencia_ck check (fim is null or fim >= inicio)
);

create unique index if not exists licencas_consultoria_uk
  on public.licencas_modulo (modulo_codigo, consultoria_id) where consultoria_id is not null;
create unique index if not exists licencas_empresa_uk
  on public.licencas_modulo (modulo_codigo, empresa_id) where empresa_id is not null;

drop trigger if exists trg_licencas_atualizado on public.licencas_modulo;
create trigger trg_licencas_atualizado before update on public.licencas_modulo
  for each row execute function public.set_atualizado_em();

-- ---------------------------------------------------------------------
-- 4. Resolução da licença
-- ---------------------------------------------------------------------
create or replace function public.modulo_ativo(p_empresa_id uuid, p_modulo text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from licencas_modulo l
    left join empresas e on e.id = p_empresa_id
    where l.modulo_codigo = p_modulo
      and l.ativo
      and l.inicio <= current_date
      and (l.fim is null or l.fim >= current_date)
      and (
        l.empresa_id = p_empresa_id
        or (l.consultoria_id is not null and l.consultoria_id = e.consultoria_id)
      )
  );
$$;

-- Lista os módulos liberados para a empresa: usada para montar o menu.
create or replace function public.modulos_da_empresa(p_empresa_id uuid)
returns table (codigo text, nome varchar, plano varchar, fim date)
language sql
stable
security definer
set search_path to 'public'
as $$
  select m.codigo, m.nome, l.plano, l.fim
  from modulos m
  join licencas_modulo l on l.modulo_codigo = m.codigo
  left join empresas e on e.id = p_empresa_id
  where m.ativo
    and l.ativo
    and l.inicio <= current_date
    and (l.fim is null or l.fim >= current_date)
    and (
      l.empresa_id = p_empresa_id
      or (l.consultoria_id is not null and l.consultoria_id = e.consultoria_id)
    )
    and p_empresa_id in (select auth_empresas_ids())
  order by m.nome;
$$;

-- ---------------------------------------------------------------------
-- 5. RLS
-- Licença e contrato são dados da operação, não do cliente: leitura
-- restrita, escrita apenas por service_role (rotina de faturamento).
-- ---------------------------------------------------------------------
alter table public.consultorias    enable row level security;
alter table public.modulos         enable row level security;
alter table public.licencas_modulo enable row level security;

grant select on public.modulos to authenticated;
grant select on public.consultorias, public.licencas_modulo to authenticated;

drop policy if exists modulos_select on public.modulos;
create policy modulos_select on public.modulos
  for select to authenticated using (ativo);

drop policy if exists consultorias_select on public.consultorias;
create policy consultorias_select on public.consultorias
  for select to authenticated
  using (id in (select consultoria_id from empresas where id in (select auth_empresas_ids())));

drop policy if exists licencas_modulo_select on public.licencas_modulo;
create policy licencas_modulo_select on public.licencas_modulo
  for select to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    or consultoria_id in (
      select consultoria_id from empresas where id in (select auth_empresas_ids())
    )
  );

grant execute on function public.modulo_ativo(uuid, text) to authenticated;
grant execute on function public.modulos_da_empresa(uuid) to authenticated;
