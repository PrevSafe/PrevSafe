-- ===========================================================================
-- ROLLBACK de 20261005120000_papel_saude_e_isolamento_de_clientes.sql
-- ===========================================================================
--
-- NAO APLICAR junto com as migracoes. Este arquivo fica fora de
-- supabase/migrations de proposito: o `supabase db push` aplicaria tudo o que
-- encontrasse la. Use so se a migracao causar problema em producao, e com
-- confirmacao. Cole o arquivo inteiro numa aba nova do SQL Editor do painel,
-- ou rode com psql e a connection string do projeto:
--
--   psql "<connection string>" -v ON_ERROR_STOP=1 -f supabase/rollback/20261005120000_papel_saude_e_isolamento_de_clientes.sql
--
-- Tudo roda numa transacao: se uma linha falhar, nada muda.
--
-- O QUE VOLTA
--
--   - as quatro politicas de prevsafe_records voltam a usar
--     prevsafe_pode_acessar (so organizacao + colecoes de saude);
--   - buckets de evidencias e do site e site_posts voltam a aceitar qualquer
--     membro;
--   - saem o gatilho de employees, as funcoes novas e as duas restricoes de
--     prevsafe_members.
--
-- O QUE NAO VOLTA, DE PROPOSITO
--
--   1. examResults continua protegida. Na regra antiga ela nao era colecao de
--      saude: depois do rollback, os resultados ja movidos pelo script
--      ficariam legiveis por qualquer conta da organizacao, inclusive as de
--      cliente. Por isso prevsafe_colecao_de_saude passa a inclui-la, e
--      prevsafe_pode_acessar aceita SAUDE ao lado de ADMIN e GESTOR (sem isso
--      o medico perderia os resultados que so ele lancou). E o mais perto do
--      estado anterior que nao abre dado de saude.
--   2. A coluna prevsafe_members.client_id fica. Ela nao da acesso a nada sem
--      as politicas novas, e apaga-la perderia o vinculo das contas de
--      cliente preenchido a mao. Para remove-la mesmo assim, descomente o
--      ultimo bloco.
--   3. Os dados movidos pelo script nao voltam para employees. Para isso ha o
--      backup JSON que o script grava antes de qualquer alteracao.

begin;

-- ---------------------------------------------------------------------------
-- 1. Regra antiga, com examResults entre as colecoes de saude
-- ---------------------------------------------------------------------------
create or replace function public.prevsafe_colecao_de_saude(colecao text)
returns boolean
language sql
immutable
as $$
  select colecao in (
    'examProtocols',   -- protocolos e resultados de exame ocupacional
    'workAbsences',    -- afastamentos, com CID-10
    'catRecords',      -- CAT, com CID-10 e descricao da lesao
    'examResults'      -- resultados de exame movidos de employees (ver cabecalho)
  );
$$;

create or replace function public.prevsafe_pode_acessar(org text, colecao text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.prevsafe_members m
      where m.auth_user_id = auth.uid()
        and m.organization_id = org
    )
    and (
      not public.prevsafe_colecao_de_saude(colecao)
      or coalesce(public.prevsafe_papel_na_organizacao(org), '') in ('ADMIN', 'GESTOR', 'SAUDE')
    );
$$;

revoke all on function public.prevsafe_pode_acessar(text, text) from public;
grant execute on function public.prevsafe_pode_acessar(text, text) to authenticated;

drop policy if exists prevsafe_records_select on public.prevsafe_records;
create policy prevsafe_records_select on public.prevsafe_records
  for select
  using (public.prevsafe_pode_acessar(organization_id, collection));

drop policy if exists prevsafe_records_insert on public.prevsafe_records;
create policy prevsafe_records_insert on public.prevsafe_records
  for insert
  with check (public.prevsafe_pode_acessar(organization_id, collection));

drop policy if exists prevsafe_records_update on public.prevsafe_records;
create policy prevsafe_records_update on public.prevsafe_records
  for update
  using (public.prevsafe_pode_acessar(organization_id, collection))
  with check (public.prevsafe_pode_acessar(organization_id, collection));

drop policy if exists prevsafe_records_delete on public.prevsafe_records;
create policy prevsafe_records_delete on public.prevsafe_records
  for delete
  using (public.prevsafe_pode_acessar(organization_id, collection));

-- ---------------------------------------------------------------------------
-- 2. Gatilho de employees
-- ---------------------------------------------------------------------------
drop trigger if exists prevsafe_funcionario_sem_resultado_trg on public.prevsafe_records;
drop function if exists public.prevsafe_funcionario_sem_resultado_de_exame();
drop function if exists public.prevsafe_dados_clinicos_do_funcionario(jsonb);

-- ---------------------------------------------------------------------------
-- 3. Buckets e site_posts como em 20260918000000 e 20260919000000/010000
-- ---------------------------------------------------------------------------
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

drop policy if exists site_posts_membros_leitura on public.site_posts;
create policy site_posts_membros_leitura
  on public.site_posts for select
  to authenticated
  using (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid() and m.organization_id = site_posts.organization_id
  ));

drop policy if exists site_posts_membros_insert on public.site_posts;
create policy site_posts_membros_insert
  on public.site_posts for insert
  to authenticated
  with check (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid() and m.organization_id = site_posts.organization_id
  ));

drop policy if exists site_posts_membros_update on public.site_posts;
create policy site_posts_membros_update
  on public.site_posts for update
  to authenticated
  using (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid() and m.organization_id = site_posts.organization_id
  ))
  with check (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid() and m.organization_id = site_posts.organization_id
  ));

drop policy if exists site_posts_membros_delete on public.site_posts;
create policy site_posts_membros_delete
  on public.site_posts for delete
  to authenticated
  using (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid() and m.organization_id = site_posts.organization_id
  ));

-- ---------------------------------------------------------------------------
-- 4. Funcoes e restricoes novas
-- ---------------------------------------------------------------------------
drop function if exists public.prevsafe_pode_ler(text, text, text, jsonb, uuid);
drop function if exists public.prevsafe_pode_gravar(text, text, text, jsonb, uuid, text);
drop function if exists public.prevsafe_portal_pode_ler(text, text, jsonb, uuid, text);
drop function if exists public.prevsafe_portal_pode_gravar(text, jsonb, uuid, text, text);
drop function if exists public.prevsafe_eh_equipe(text);
drop function if exists public.prevsafe_colecao_de_resultado_de_exame(text);
drop function if exists public.prevsafe_papel_de_cliente(text);

alter table public.prevsafe_members drop constraint if exists prevsafe_members_cliente_coerente;
alter table public.prevsafe_members drop constraint if exists prevsafe_members_papel_conhecido;

-- ---------------------------------------------------------------------------
-- 5. OPCIONAL E DESTRUTIVO - apaga o vinculo das contas de cliente
-- ---------------------------------------------------------------------------
-- alter table public.prevsafe_members drop column if exists client_id;

commit;
