-- ===========================================================================
-- RLS por papel: dados de saude deixam de ser legiveis por qualquer membro
-- ===========================================================================
--
-- PROBLEMA
--
-- As quatro politicas de prevsafe_records conferiam apenas se o usuario
-- pertence a organizacao. Nao havia nenhuma dimensao de papel nem de colecao.
-- Na pratica, qualquer conta vinculada lia examProtocols, workAbsences (com
-- CID-10) e catRecords - dados de saude, que a LGPD trata como sensiveis
-- (art. 5o, II) e que a NR-07 e as resolucoes do CFM restringem ao medico
-- coordenador do PCMSO.
--
-- As restricoes por papel existiam so na interface. Como a chave anonima do
-- Supabase e publica por natureza, qualquer pessoa com uma conta da
-- organizacao podia ler tudo fora da interface.
--
-- Isso tambem contradizia a Clausula 8a da minuta de contrato, que promete ao
-- cliente exatamente esse sigilo.
--
-- DECISAO
--
-- As colecoes de saude passam a exigir papel ADMIN ou GESTOR - a equipe propria
-- da assessoria que administra o PCMSO. Contas de cliente (CLIENTE_ADMIN,
-- CLIENTE_USER) e tecnicos de campo deixam de alcanca-las.
--
-- A lista e conservadora de proposito: restringe o que e inequivocamente dado
-- de saude. Ampliar depois e facil; descobrir que um prontuario vazou, nao.
--
-- NOTA SOBRE ESCRITA
--
-- A politica de INSERT ja era permissiva (qual = null). Mantemos o mesmo
-- alcance de papel na escrita das colecoes sensiveis, para nao abrir pela
-- porta dos fundos o que se fechou na leitura.

-- ---------------------------------------------------------------------------
-- 1. Colecoes que carregam dado de saude
-- ---------------------------------------------------------------------------
create or replace function public.prevsafe_colecao_de_saude(colecao text)
returns boolean
language sql
immutable
as $$
  select colecao in (
    'examProtocols',   -- protocolos e resultados de exame ocupacional
    'workAbsences',    -- afastamentos, com CID-10
    'catRecords'       -- CAT, com CID-10 e descricao da lesao
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Papel do usuario na organizacao
--
-- Le de prevsafe_members, que so a service role escreve. NAO usa
-- auth.jwt()->'user_metadata', que o proprio usuario altera com
-- auth.updateUser({ data: { role: 'ADMIN' } }) - era por ali que as rotas de
-- administracao podiam ser escaladas.
--
-- security definer para nao depender da RLS da propria prevsafe_members.
-- ---------------------------------------------------------------------------
create or replace function public.prevsafe_papel_na_organizacao(org text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.prevsafe_members m
  where m.auth_user_id = auth.uid()
    and m.organization_id = org
  limit 1;
$$;

revoke all on function public.prevsafe_papel_na_organizacao(text) from public;
grant execute on function public.prevsafe_papel_na_organizacao(text) to authenticated;
grant execute on function public.prevsafe_colecao_de_saude(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Condicao unica de acesso
--
-- Pertencer a organizacao continua sendo necessario. Alem disso, se a colecao
-- for de saude, o papel precisa ser ADMIN ou GESTOR.
-- ---------------------------------------------------------------------------
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
      or coalesce(public.prevsafe_papel_na_organizacao(org), '') in ('ADMIN', 'GESTOR')
    );
$$;

revoke all on function public.prevsafe_pode_acessar(text, text) from public;
grant execute on function public.prevsafe_pode_acessar(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Politicas
-- ---------------------------------------------------------------------------
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
