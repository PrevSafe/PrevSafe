-- =====================================================================
-- PrevSafe :: 01_login.sql
-- Tabelas necessárias para a TELA DE LOGIN.
-- Rode numa aba nova do SQL Editor, sem nada selecionado.
-- =====================================================================

-- empresas = raiz do multi-tenant. Toda tabela futura vai pendurar aqui.
create table if not exists empresas (
  id            uuid primary key default gen_random_uuid(),
  razao_social  varchar(255) not null,
  nome_fantasia varchar(255),
  cnpj          varchar(14) unique not null check (cnpj ~ '^[0-9]{14}$'),
  criado_em     timestamptz not null default now()
);

-- profiles = espelho de auth.users. É daqui que o RLS descobre o tenant.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  empresa_id  uuid not null references empresas(id) on delete restrict,
  nome        varchar(255) not null,
  email       varchar(255),
  cpf         varchar(11) unique check (cpf ~ '^[0-9]{11}$'),
  papel       varchar(20) not null default 'tecnico'
              check (papel in ('admin','tecnico','inspetor','leitura')),
  ativo       boolean not null default true,
  avatar_url  text,
  criado_em   timestamptz not null default now()
);

create index if not exists idx_profiles_empresa on profiles(empresa_id);


-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

-- SECURITY DEFINER evita recursão infinita: sem isso, a policy de profiles
-- consultaria profiles para se avaliar.
create or replace function public.auth_empresa_id()
returns uuid language sql stable security definer set search_path = public as $$
  select empresa_id from profiles where id = auth.uid()
$$;

alter table empresas enable row level security;
alter table profiles enable row level security;

drop policy if exists empresas_select on empresas;
create policy empresas_select on empresas for select to authenticated
  using (id = auth_empresa_id());

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (empresa_id = auth_empresa_id());

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());


-- ---------------------------------------------------------------------
-- Login por CPF
-- O Supabase Auth só autentica por e-mail. Esta função traduz CPF -> e-mail
-- antes do signIn. É SECURITY DEFINER para funcionar com usuário anônimo,
-- e devolve apenas o e-mail — nunca expõe o resto do profile.
-- ---------------------------------------------------------------------
create or replace function public.email_por_cpf(p_cpf text)
returns text language sql stable security definer set search_path = public as $$
  select email from profiles
  where cpf = regexp_replace(p_cpf, '[^0-9]', '', 'g')
    and ativo = true
  limit 1
$$;

grant execute on function public.email_por_cpf(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- Seed: sua empresa e seu usuário admin
-- ---------------------------------------------------------------------

-- 1) Crie a empresa (ajuste os dados; CNPJ com 14 dígitos, sem pontuação):
insert into empresas (razao_social, nome_fantasia, cnpj)
values ('Sua Empresa LTDA', 'PrevSafe', '00000000000191')
on conflict (cnpj) do nothing;

-- 2) Crie o usuário pela interface:
--    Authentication -> Users -> Add user -> Create new user
--    Marque "Auto Confirm User", senão o login falha com "Email not confirmed".

-- 3) Depois de criar o usuário, rode SÓ este bloco para vincular:
-- insert into profiles (id, empresa_id, nome, email, cpf, papel)
-- select u.id, e.id, 'Gean', u.email, '00000000000', 'admin'
-- from auth.users u cross join empresas e
-- order by u.created_at desc, e.criado_em desc
-- limit 1
-- on conflict (id) do nothing;

-- 4) Confira (deve retornar 1 linha):
-- select p.nome, p.email, p.papel, e.razao_social
-- from profiles p join empresas e on e.id = p.empresa_id;
