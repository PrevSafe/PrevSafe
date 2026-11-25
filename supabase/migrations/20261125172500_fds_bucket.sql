-- Bucket `fds` — PDFs de Ficha com Dados de Segurança (FDS/FISPQ).
--
-- Privado: o acesso passa pelas políticas de storage.objects, não pela URL.
-- Teto de 10 MB por objeto e só application/pdf, porque é isso que a leitura
-- da FDS aceita. O nome do objeto é o SHA-256 do arquivo (`{hash}.pdf`), o que
-- faz a mesma ficha enviada por empresas diferentes ocupar espaço uma vez.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fds', 'fds', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
