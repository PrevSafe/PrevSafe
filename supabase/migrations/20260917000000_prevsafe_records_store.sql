-- Armazenamento de dados do PrevSafe SST.
-- Cada registro do app vira uma linha: organizacao + colecao + id + payload JSONB.
-- Substitui o localStorage: os dados passam a viver no servidor, compartilhados
-- entre dispositivos e usuarios da mesma organizacao.

create table if not exists public.prevsafe_members (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id text not null,
  role text not null default 'ADMIN',
  created_at timestamptz not null default now(),
  primary key (auth_user_id, organization_id)
);

comment on table public.prevsafe_members is
  'Vinculo entre usuario autenticado e organizacao do PrevSafe. Base de toda a RLS de prevsafe_records.';

create table if not exists public.prevsafe_records (
  organization_id text not null,
  collection text not null,
  record_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  primary key (organization_id, collection, record_id)
);

comment on table public.prevsafe_records is
  'Registros do PrevSafe SST. deleted_at marca exclusao logica para que outros dispositivos propaguem a remocao.';

create index if not exists prevsafe_records_org_collection_idx
  on public.prevsafe_records (organization_id, collection)
  where deleted_at is null;

create index if not exists prevsafe_records_updated_at_idx
  on public.prevsafe_records (organization_id, updated_at desc);

-- Funcao security definer: evita recursao de RLS ao consultar a tabela de membros.
create or replace function public.prevsafe_is_member(p_organization_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.prevsafe_members m
    where m.auth_user_id = auth.uid()
      and m.organization_id = p_organization_id
  );
$$;

revoke all on function public.prevsafe_is_member(text) from public, anon;
grant execute on function public.prevsafe_is_member(text) to authenticated;

alter table public.prevsafe_members enable row level security;
alter table public.prevsafe_records enable row level security;

drop policy if exists prevsafe_members_select_own on public.prevsafe_members;
create policy prevsafe_members_select_own
  on public.prevsafe_members for select
  to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists prevsafe_records_select on public.prevsafe_records;
create policy prevsafe_records_select
  on public.prevsafe_records for select
  to authenticated
  using (public.prevsafe_is_member(organization_id));

drop policy if exists prevsafe_records_insert on public.prevsafe_records;
create policy prevsafe_records_insert
  on public.prevsafe_records for insert
  to authenticated
  with check (public.prevsafe_is_member(organization_id));

drop policy if exists prevsafe_records_update on public.prevsafe_records;
create policy prevsafe_records_update
  on public.prevsafe_records for update
  to authenticated
  using (public.prevsafe_is_member(organization_id))
  with check (public.prevsafe_is_member(organization_id));

drop policy if exists prevsafe_records_delete on public.prevsafe_records;
create policy prevsafe_records_delete
  on public.prevsafe_records for delete
  to authenticated
  using (public.prevsafe_is_member(organization_id));

-- Mantem updated_at/updated_by coerentes mesmo se o cliente nao enviar.
create or replace function public.prevsafe_records_touch()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists prevsafe_records_touch_trg on public.prevsafe_records;
create trigger prevsafe_records_touch_trg
  before insert or update on public.prevsafe_records
  for each row execute function public.prevsafe_records_touch();

revoke all on public.prevsafe_records from anon;
revoke all on public.prevsafe_members from anon;
grant select, insert, update, delete on public.prevsafe_records to authenticated;
grant select on public.prevsafe_members to authenticated;
