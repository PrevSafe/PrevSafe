-- =====================================================================
-- PrevSafe :: estrutura organizacional
-- Corrige empresas/unidades para aceitar CPF (produtor rural) e cria o
-- catálogo de setores/cargos + a tabela de lotações (Unidade > Setor > Cargo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) EMPRESAS — aceitar CNPJ ou CPF (produtor rural pessoa física)
-- ---------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'empresas' and column_name = 'cnpj'
  ) then
    alter table empresas rename column cnpj to numero_inscricao;
  end if;
end $$;

alter table empresas drop constraint if exists empresas_cnpj_check;
alter table empresas drop constraint if exists chk_empresas_inscricao;

alter table empresas
  add column if not exists tipo_inscricao smallint not null default 1;

alter table empresas drop constraint if exists chk_empresas_tipo_inscricao;
alter table empresas
  add constraint chk_empresas_tipo_inscricao check (tipo_inscricao in (1, 2)); -- 1=CNPJ, 2=CPF

alter table empresas
  add constraint chk_empresas_inscricao
  check (numero_inscricao ~ '^[0-9]{11}$' or numero_inscricao ~ '^[0-9]{14}$');


-- ---------------------------------------------------------------------
-- 2) UNIDADES — matriz + inscrição pode repetir por Inscrição Estadual
-- ---------------------------------------------------------------------

alter table unidades
  add column if not exists matriz boolean not null default false;

alter table unidades
  drop constraint if exists unidades_empresa_id_numero_inscricao_key;

-- Um mesmo CAEPF pode ter várias fazendas distintas pela Inscrição Estadual.
drop index if exists idx_unidades_inscricao_ie;
create unique index idx_unidades_inscricao_ie
  on unidades (empresa_id, numero_inscricao, coalesce(inscricao_estadual, ''));

-- Só uma matriz por empresa.
drop index if exists idx_unidades_matriz_unica;
create unique index idx_unidades_matriz_unica
  on unidades (empresa_id)
  where matriz;

-- Se a empresa tem exatamente uma unidade, ela é a matriz.
update unidades u
set matriz = true
where not u.matriz
  and (select count(*) from unidades u2 where u2.empresa_id = u.empresa_id) = 1;


-- ---------------------------------------------------------------------
-- 3) SETORES — vira catálogo da empresa (não pertence mais a uma unidade)
-- ---------------------------------------------------------------------

drop table if exists setores cascade;

create table setores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  codigo varchar(20),
  nome varchar(255) not null,
  descricao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, nome)
);

create index idx_setores_empresa on setores(empresa_id, ativo);


-- ---------------------------------------------------------------------
-- 4) CARGOS — catálogo da empresa, com código de ocorrência GFIP/SEFIP
-- ---------------------------------------------------------------------

drop table if exists cargos cascade;

create table cargos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  codigo varchar(20),
  nome varchar(255) not null,
  cbo varchar(6) check (cbo ~ '^[0-9]{6}$'),
  codigo_gfip smallint not null default 0 check (codigo_gfip between 0 and 4),
  descricao_atividades text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, nome)
);

comment on column cargos.codigo_gfip is
  'Código de ocorrência da SEFIP/GFIP para o vínculo (tabela de ocorrência única): '
  '0 = nunca esteve exposto a agente nocivo; '
  '1 = já esteve exposto, neutralizado por proteção eficaz (EPC/EPI comprovadamente eficaz); '
  '2 = exposição a agente nocivo — aposentadoria especial aos 15 anos (SAT/RAT +12%); '
  '3 = exposição a agente nocivo — aposentadoria especial aos 20 anos (SAT/RAT +9%); '
  '4 = exposição a agente nocivo — aposentadoria especial aos 25 anos (SAT/RAT +6%).';

create index idx_cargos_empresa on cargos(empresa_id, ativo);


-- ---------------------------------------------------------------------
-- 5) LOTACOES — a estrutura organizacional: Unidade > Setor > Cargo
-- ---------------------------------------------------------------------

create table if not exists lotacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  unidade_id uuid not null references unidades(id) on delete cascade,
  setor_id uuid not null references setores(id) on delete cascade,
  cargo_id uuid references cargos(id) on delete cascade,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- cargo_id nulo representa "setor presente na unidade, cargos ainda não definidos".
drop index if exists idx_lotacoes_unica;
create unique index idx_lotacoes_unica
  on lotacoes (unidade_id, setor_id, coalesce(cargo_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists idx_lotacoes_empresa on lotacoes(empresa_id);
create index if not exists idx_lotacoes_unidade_setor on lotacoes(unidade_id, setor_id);


-- ---------------------------------------------------------------------
-- 6) Triggers de atualizado_em e políticas RLS
-- ---------------------------------------------------------------------

drop trigger if exists trg_setores_atualizado on setores;
create trigger trg_setores_atualizado before update on setores
  for each row execute function public.set_atualizado_em();

drop trigger if exists trg_cargos_atualizado on cargos;
create trigger trg_cargos_atualizado before update on cargos
  for each row execute function public.set_atualizado_em();

drop trigger if exists trg_lotacoes_atualizado on lotacoes;
create trigger trg_lotacoes_atualizado before update on lotacoes
  for each row execute function public.set_atualizado_em();

alter table setores enable row level security;
alter table cargos enable row level security;
alter table lotacoes enable row level security;

drop policy if exists setores_select on setores;
create policy setores_select on setores for select to authenticated
  using (empresa_id = auth_empresa_id());
drop policy if exists setores_write on setores;
create policy setores_write on setores for all to authenticated
  using (empresa_id = auth_empresa_id() and auth_papel() <> 'leitura')
  with check (empresa_id = auth_empresa_id() and auth_papel() <> 'leitura');

drop policy if exists cargos_select on cargos;
create policy cargos_select on cargos for select to authenticated
  using (empresa_id = auth_empresa_id());
drop policy if exists cargos_write on cargos;
create policy cargos_write on cargos for all to authenticated
  using (empresa_id = auth_empresa_id() and auth_papel() <> 'leitura')
  with check (empresa_id = auth_empresa_id() and auth_papel() <> 'leitura');

drop policy if exists lotacoes_select on lotacoes;
create policy lotacoes_select on lotacoes for select to authenticated
  using (empresa_id = auth_empresa_id());
drop policy if exists lotacoes_write on lotacoes;
create policy lotacoes_write on lotacoes for all to authenticated
  using (empresa_id = auth_empresa_id() and auth_papel() <> 'leitura')
  with check (empresa_id = auth_empresa_id() and auth_papel() <> 'leitura');
