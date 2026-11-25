-- Políticas do bucket `fds`.
--
-- Leitura liberada a qualquer usuário autenticado: a FDS é documento público
-- do fabricante, guardado por hash e compartilhado entre empresas — é isso que
-- torna a deduplicação possível. O dado do cliente (que ELE usa aquele
-- produto) vive em produtos_quimicos, sob RLS por empresa.
drop policy if exists fds_leitura on storage.objects;
create policy fds_leitura on storage.objects
  for select to authenticated
  using (bucket_id = 'fds');

-- Escrita: só quem pode cadastrar produto químico em alguma empresa.
drop policy if exists fds_escrita on storage.objects;
create policy fds_escrita on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fds'
    and exists (
      select 1 from public.usuarios_empresas ue
      where ue.usuario_id = auth.uid() and ue.ativo
        and public.tem_permissao(auth.uid(), ue.empresa_id, 'produtos_quimicos', 'criar')
    )
  );

-- Sem update e sem delete, de propósito: o objeto é imutável. Trocar o
-- conteúdo de um hash quebraria a ficha de todas as empresas que o referenciam,
-- e apagar deixaria produto sem FDS em empresa alheia.
