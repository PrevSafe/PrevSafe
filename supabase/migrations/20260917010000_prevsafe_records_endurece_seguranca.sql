-- Endurecimento apontado pelo linter de seguranca do Supabase.

-- 1) A politica passa a usar um EXISTS direto em prevsafe_members em vez de uma
--    funcao SECURITY DEFINER exposta em /rest/v1/rpc. Nao ha recursao: a RLS de
--    prevsafe_members ja restringe cada usuario as proprias linhas.
drop policy if exists prevsafe_records_select on public.prevsafe_records;
create policy prevsafe_records_select
  on public.prevsafe_records for select
  to authenticated
  using (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid()
      and m.organization_id = prevsafe_records.organization_id
  ));

drop policy if exists prevsafe_records_insert on public.prevsafe_records;
create policy prevsafe_records_insert
  on public.prevsafe_records for insert
  to authenticated
  with check (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid()
      and m.organization_id = prevsafe_records.organization_id
  ));

drop policy if exists prevsafe_records_update on public.prevsafe_records;
create policy prevsafe_records_update
  on public.prevsafe_records for update
  to authenticated
  using (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid()
      and m.organization_id = prevsafe_records.organization_id
  ))
  with check (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid()
      and m.organization_id = prevsafe_records.organization_id
  ));

drop policy if exists prevsafe_records_delete on public.prevsafe_records;
create policy prevsafe_records_delete
  on public.prevsafe_records for delete
  to authenticated
  using (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid()
      and m.organization_id = prevsafe_records.organization_id
  ));

drop function if exists public.prevsafe_is_member(text);

-- 2) O trigger nao precisa de SECURITY DEFINER: so carimba quem alterou.
--    Como invoker, deixa de ser chamavel por /rest/v1/rpc com privilegio elevado.
create or replace function public.prevsafe_records_touch()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

revoke all on function public.prevsafe_records_touch() from public, anon, authenticated;
