create table if not exists unidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  razao_social varchar(255) not null,
  nome_fantasia varchar(255),
  tipo_inscricao smallint not null default 1 check (tipo_inscricao in (1,3,4)),
  numero_inscricao varchar(14) not null check (numero_inscricao ~ '^[0-9]+$'),
  inscricao_estadual varchar(20),
  cnae_principal varchar(7),
  cnae_secundario varchar(7),
  grau_risco smallint check (grau_risco between 1 and 4),
  cep varchar(8),
  logradouro text,
  municipio varchar(120),
  uf char(2),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, numero_inscricao)
);

create index if not exists idx_unidades_empresa on unidades(empresa_id, ativo);

create or replace function public.auth_papel()
returns text language sql stable security definer set search_path = public as $fn$
  select papel from profiles where id = auth.uid()
$fn$;

create or replace function public.set_atualizado_em()
returns trigger language plpgsql as $fn$
begin
  new.atualizado_em := now();
  return new;
end $fn$;

drop trigger if exists trg_unidades_atualizado on unidades;
create trigger trg_unidades_atualizado before update on unidades
  for each row execute function public.set_atualizado_em();

alter table unidades enable row level security;

drop policy if exists unidades_select on unidades;
create policy unidades_select on unidades for select to authenticated
  using (empresa_id = auth_empresa_id());

drop policy if exists unidades_write on unidades;
create policy unidades_write on unidades for all to authenticated
  using (empresa_id = auth_empresa_id() and auth_papel() <> 'leitura')
  with check (empresa_id = auth_empresa_id() and auth_papel() <> 'leitura');
