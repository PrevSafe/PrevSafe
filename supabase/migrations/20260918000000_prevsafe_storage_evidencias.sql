-- Bucket privado das evidencias fotograficas de campo (PWA do tecnico).
-- Privado de proposito: a foto mostra o interior da planta do cliente e
-- costuma conter pessoas, entao so membros da organizacao podem ve-la.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prevsafe-evidencias',
  'prevsafe-evidencias',
  false,
  10485760, -- 10 MB por foto
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = excluded.public;

-- O caminho do arquivo comeca pelo organization_id:
--   <organization_id>/<ordem-de-servico>/<arquivo>.jpg
-- A primeira pasta e o que amarra o objeto a organizacao na RLS.
drop policy if exists prevsafe_evidencias_select on storage.objects;
create policy prevsafe_evidencias_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'prevsafe-evidencias'
    and exists (
      select 1 from public.prevsafe_members m
      where m.auth_user_id = auth.uid()
        and m.organization_id = (storage.foldername(name))[1]
    )
  );

drop policy if exists prevsafe_evidencias_insert on storage.objects;
create policy prevsafe_evidencias_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'prevsafe-evidencias'
    and exists (
      select 1 from public.prevsafe_members m
      where m.auth_user_id = auth.uid()
        and m.organization_id = (storage.foldername(name))[1]
    )
  );

drop policy if exists prevsafe_evidencias_update on storage.objects;
create policy prevsafe_evidencias_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'prevsafe-evidencias'
    and exists (
      select 1 from public.prevsafe_members m
      where m.auth_user_id = auth.uid()
        and m.organization_id = (storage.foldername(name))[1]
    )
  );

drop policy if exists prevsafe_evidencias_delete on storage.objects;
create policy prevsafe_evidencias_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'prevsafe-evidencias'
    and exists (
      select 1 from public.prevsafe_members m
      where m.auth_user_id = auth.uid()
        and m.organization_id = (storage.foldername(name))[1]
    )
  );
