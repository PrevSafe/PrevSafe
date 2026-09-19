-- Imagens do site publico (capas de artigo e ilustracoes de servico).
--
-- Publico de proposito, ao contrario do bucket de evidencias de campo: estas
-- imagens aparecem em paginas abertas e em cartoes de redes sociais. URL
-- assinada nao serve aqui, porque expira e quebraria o compartilhamento e o
-- cache do Google.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prevsafe-site',
  'prevsafe-site',
  true,
  3145728, -- 3 MB
  array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists prevsafe_site_insert on storage.objects;
create policy prevsafe_site_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'prevsafe-site'
    and exists (
      select 1 from public.prevsafe_members m
      where m.auth_user_id = auth.uid()
        and m.organization_id = (storage.foldername(name))[1]
    )
  );

drop policy if exists prevsafe_site_update on storage.objects;
create policy prevsafe_site_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'prevsafe-site'
    and exists (
      select 1 from public.prevsafe_members m
      where m.auth_user_id = auth.uid()
        and m.organization_id = (storage.foldername(name))[1]
    )
  );

drop policy if exists prevsafe_site_delete on storage.objects;
create policy prevsafe_site_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'prevsafe-site'
    and exists (
      select 1 from public.prevsafe_members m
      where m.auth_user_id = auth.uid()
        and m.organization_id = (storage.foldername(name))[1]
    )
  );
