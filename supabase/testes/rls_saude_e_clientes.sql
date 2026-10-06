-- ===========================================================================
-- Teste da RLS de 20261005120000_papel_saude_e_isolamento_de_clientes.sql
-- ===========================================================================
--
-- Rode DEPOIS da migracao. Nao grava nada: usuarios, vinculos e registros sao
-- ficticios, criados dentro de begin/rollback, e somem no fim - passe ou
-- falhe. Nenhum dado real e lido: toda contagem filtra pela organizacao
-- ficticia 'org-teste-rls-20261005'.
--
--   psql "<connection string>" -v ON_ERROR_STOP=1 -f supabase/testes/rls_saude_e_clientes.sql
--
-- ou cole o arquivo inteiro numa aba nova do SQL Editor do painel.
--
-- Passou: a ultima linha mostra "rls_saude_e_clientes: N casos passaram".
-- Falhou: para no primeiro caso errado com "FALHA: <caso>", e o rollback
-- desfaz tudo o que o teste criou.
--
-- Cada usuario e simulado como o PostgREST faz: `set local role
-- authenticated` e o JWT em request.jwt.claims, de onde auth.uid() le o sub.

begin;

-- ---------------------------------------------------------------------------
-- Ferramentas do teste (pg_temp: somem com a transacao)
-- ---------------------------------------------------------------------------
create function pg_temp.confere(ok boolean, caso text)
returns void
language plpgsql
as $$
begin
  if ok is distinct from true then
    raise exception 'FALHA: %', caso;
  end if;
  perform set_config(
    'teste_rls.casos',
    (coalesce(nullif(current_setting('teste_rls.casos', true), ''), '0')::int + 1)::text,
    true
  );
  raise notice 'OK    %', caso;
end;
$$;

-- Executa um comando e devolve 'linhas:N' ou 'erro:SQLSTATE'. O bloco com
-- exception abre uma subtransacao: um comando recusado nao aborta o teste.
create function pg_temp.executa(comando text)
returns text
language plpgsql
as $$
declare
  n bigint;
begin
  execute comando;
  get diagnostics n = row_count;
  return 'linhas:' || n;
exception when others then
  return 'erro:' || sqlstate;
end;
$$;

create function pg_temp.conta(consulta text)
returns bigint
language plpgsql
as $$
declare
  n bigint;
begin
  execute 'select count(*) from (' || consulta || ') t' into n;
  return n;
end;
$$;

-- Troca o usuario simulado (o papel continua authenticated).
create function pg_temp.como(usuario uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', usuario, 'role', 'authenticated')::text,
    true
  );
end;
$$;

grant execute on function pg_temp.confere(boolean, text) to authenticated;
grant execute on function pg_temp.executa(text) to authenticated;
grant execute on function pg_temp.conta(text) to authenticated;
grant execute on function pg_temp.como(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Cenario (como postgres, dono das tabelas: a RLS nao se aplica aqui)
--
--   a...001 ADMIN    a...002 GESTOR    a...003 SAUDE    a...004 TECNICO
--   a...005 CLIENTE_USER do cliente A   a...006 CLIENTE_ADMIN do cliente B
--   a...007 ADMIN de OUTRA organizacao
-- ---------------------------------------------------------------------------
insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'teste-rls-admin@exemplo.invalid', '{}', '{}', now(), now()),
  ('a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'teste-rls-gestor@exemplo.invalid', '{}', '{}', now(), now()),
  ('a0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'teste-rls-saude@exemplo.invalid', '{}', '{}', now(), now()),
  ('a0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'teste-rls-tecnico@exemplo.invalid', '{}', '{}', now(), now()),
  ('a0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'teste-rls-cliente-a@exemplo.invalid', '{}', '{}', now(), now()),
  ('a0000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'teste-rls-cliente-b@exemplo.invalid', '{}', '{}', now(), now()),
  ('a0000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'teste-rls-fora@exemplo.invalid', '{}', '{}', now(), now());

insert into public.prevsafe_members (auth_user_id, organization_id, role, client_id)
values
  ('a0000000-0000-4000-8000-000000000001', 'org-teste-rls-20261005', 'ADMIN', null),
  ('a0000000-0000-4000-8000-000000000002', 'org-teste-rls-20261005', 'GESTOR', null),
  ('a0000000-0000-4000-8000-000000000003', 'org-teste-rls-20261005', 'SAUDE', null),
  ('a0000000-0000-4000-8000-000000000004', 'org-teste-rls-20261005', 'TÉCNICO', null),
  ('a0000000-0000-4000-8000-000000000005', 'org-teste-rls-20261005', 'CLIENTE_USER', 'cli-teste-a'),
  ('a0000000-0000-4000-8000-000000000006', 'org-teste-rls-20261005', 'CLIENTE_ADMIN', 'cli-teste-b'),
  ('a0000000-0000-4000-8000-000000000007', 'org-teste-rls-outra', 'ADMIN', null);

insert into public.prevsafe_records (organization_id, collection, record_id, data)
values
  ('org-teste-rls-20261005', 'organization', '__singleton__', '{"id": "org-teste", "name": "Consultoria ficticia"}'),
  ('org-teste-rls-20261005', 'esocialConfig', '__singleton__', '{"certificate_alias": "ficticio"}'),
  ('org-teste-rls-20261005', 'clients', 'cli-teste-a', '{"id": "cli-teste-a", "trade_name": "Cliente A"}'),
  ('org-teste-rls-20261005', 'clients', 'cli-teste-b', '{"id": "cli-teste-b", "trade_name": "Cliente B"}'),
  ('org-teste-rls-20261005', 'profiles', 'perfil-cli-a', '{"id": "perfil-cli-a", "auth_user_id": "a0000000-0000-4000-8000-000000000005", "client_id": "cli-teste-a"}'),
  ('org-teste-rls-20261005', 'profiles', 'perfil-admin', '{"id": "perfil-admin", "auth_user_id": "a0000000-0000-4000-8000-000000000001"}'),
  ('org-teste-rls-20261005', 'employees', 'emp-a', '{"id": "emp-a", "client_id": "cli-teste-a", "name": "Trabalhador A", "cpf": "00000000191", "aso_history": [{"id": "aso-a", "aso_type": "PERIODICO", "exam_date": "2026-09-01", "valid_until": "2027-09-01", "result": "APTO", "exams": [{"id": "exm-a", "exam_code_table_27": "0281", "exam_name": "Audiometria", "exam_date": "2026-09-01"}]}]}'),
  ('org-teste-rls-20261005', 'employees', 'emp-b', '{"id": "emp-b", "client_id": "cli-teste-b", "name": "Trabalhador B", "cpf": "00000000272", "aso_history": []}'),
  -- Funcionario com o resultado ainda no formato antigo (antes do script).
  ('org-teste-rls-20261005', 'employees', 'emp-legado', '{"id": "emp-legado", "client_id": "cli-teste-a", "name": "Trabalhador legado", "aso_history": [{"id": "aso-l", "aso_type": "PERIODICO", "exam_date": "2026-01-10", "result": "APTO_COM_RESTRICAO", "restrictions_notes": "restricao ficticia", "exams": [{"id": "exm-l", "exam_code_table_27": "0281", "exam_name": "Audiometria", "exam_date": "2026-01-10", "result": "ALTERADO", "observation": "achado ficticio"}]}]}'),
  ('org-teste-rls-20261005', 'examResults', 'exres-emp-a-aso-a', '{"id": "exres-emp-a-aso-a", "client_id": "cli-teste-a", "employee_id": "emp-a", "aso_id": "aso-a", "aso_result": "APTO_COM_RESTRICAO", "restrictions_notes": "restricao ficticia", "results": [{"exam_id": "exm-a", "exam_code_table_27": "0281", "result": "ALTERADO"}]}'),
  ('org-teste-rls-20261005', 'catRecords', 'cat-a', '{"id": "cat-a", "client_id": "cli-teste-a", "cid_10": "S00"}'),
  ('org-teste-rls-20261005', 'transactions', 'fin-a', '{"id": "fin-a", "client_id": "cli-teste-a", "amount": 100}'),
  ('org-teste-rls-20261005', 'leads', 'lead-1', '{"id": "lead-1", "company_name": "Lead ficticio"}'),
  ('org-teste-rls-20261005', 'proposals', 'prop-a', '{"id": "prop-a", "client_id": "cli-teste-a"}'),
  ('org-teste-rls-20261005', 'contracts', 'ctr-a', '{"id": "ctr-a", "client_id": "cli-teste-a"}'),
  ('org-teste-rls-20261005', 'contracts', 'ctr-b', '{"id": "ctr-b", "client_id": "cli-teste-b"}'),
  ('org-teste-rls-20261005', 'serviceOrders', 'os-a', '{"id": "os-a", "client_id": "cli-teste-a", "status": "WAITING_ACCEPTANCE"}'),
  ('org-teste-rls-20261005', 'serviceOrders', 'os-b', '{"id": "os-b", "client_id": "cli-teste-b", "status": "WAITING_ACCEPTANCE"}'),
  ('org-teste-rls-20261005', 'documents', 'doc-a-liberado', '{"id": "doc-a-liberado", "client_id": "cli-teste-a", "is_client_released": true}'),
  ('org-teste-rls-20261005', 'documents', 'doc-a-rascunho', '{"id": "doc-a-rascunho", "client_id": "cli-teste-a", "is_client_released": false}'),
  ('org-teste-rls-20261005', 'documents', 'doc-b', '{"id": "doc-b", "client_id": "cli-teste-b", "is_client_released": true}'),
  ('org-teste-rls-20261005', 'requests', 'req-a', '{"id": "req-a", "client_id": "cli-teste-a", "status": "OPEN"}'),
  ('org-teste-rls-20261005', 'requests', 'req-b', '{"id": "req-b", "client_id": "cli-teste-b", "status": "OPEN"}'),
  ('org-teste-rls-20261005', 'sstSignatures', 'sig-a', '{"id": "sig-a", "client_id": "cli-teste-a", "status": "PENDING"}'),
  ('org-teste-rls-20261005', 'evaluations', 'eval-b', '{"id": "eval-b", "client_id": "cli-teste-b", "nps_score": 9}'),
  ('org-teste-rls-20261005', 'auditLogs', 'audit-equipe', '{"id": "audit-equipe", "action": "LOGIN"}'),
  ('org-teste-rls-20261005', 'notifications', 'notif-equipe', '{"id": "notif-equipe", "title": "interna"}'),
  -- Outra organizacao, com o MESMO client_id de proposito: o filtro por
  -- cliente nao pode dispensar o filtro por organizacao.
  ('org-teste-rls-outra', 'employees', 'emp-outra', '{"id": "emp-outra", "client_id": "cli-teste-a"}'),
  ('org-teste-rls-outra', 'serviceOrders', 'os-outra', '{"id": "os-outra", "client_id": "cli-teste-a"}');

-- ---------------------------------------------------------------------------
-- Vinculo: as restricoes novas valem para toda linha gravada
-- ---------------------------------------------------------------------------
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_members (auth_user_id, organization_id, role) values ('a0000000-0000-4000-8000-000000000005', 'org-teste-rls-x', 'CLIENTE_USER')$q$) = 'erro:23514',
  'conta de cliente sem client_id e recusada (prevsafe_members_cliente_coerente)');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_members (auth_user_id, organization_id, role, client_id) values ('a0000000-0000-4000-8000-000000000002', 'org-teste-rls-x', 'GESTOR', 'cli-teste-a')$q$) = 'erro:23514',
  'membro da equipe com client_id e recusado');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_members (auth_user_id, organization_id, role) values ('a0000000-0000-4000-8000-000000000003', 'org-teste-rls-x', 'MEDICO')$q$) = 'erro:23514',
  'papel fora da lista e recusado (prevsafe_members_papel_conhecido)');

-- ---------------------------------------------------------------------------
-- Estrutura: quatro politicas, todas para authenticated, pela funcao nova
-- ---------------------------------------------------------------------------
select pg_temp.confere(
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'prevsafe_records'
      and roles = '{authenticated}'
      and coalesce(qual, '') || coalesce(with_check, '') like '%prevsafe_pode_%') = 4
  and (select count(*) from pg_policies where schemaname = 'public' and tablename = 'prevsafe_records') = 4,
  'prevsafe_records tem 4 politicas, todas para authenticated e pela regra nova');
select pg_temp.confere(
  (select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in ('prevsafe_evidencias_select', 'prevsafe_evidencias_insert', 'prevsafe_evidencias_update',
                         'prevsafe_evidencias_delete', 'prevsafe_site_insert', 'prevsafe_site_update', 'prevsafe_site_delete')
      and coalesce(qual, '') || coalesce(with_check, '') like '%prevsafe_eh_equipe%') = 7,
  'os buckets de evidencias e do site exigem equipe');
select pg_temp.confere(
  exists (select 1 from pg_trigger
    where tgname = 'prevsafe_funcionario_sem_resultado_trg'
      and tgrelid = 'public.prevsafe_records'::regclass and not tgisinternal),
  'o gatilho de employees esta instalado');

set local role authenticated;

-- ---------------------------------------------------------------------------
-- ADMIN
-- ---------------------------------------------------------------------------
select pg_temp.como('a0000000-0000-4000-8000-000000000001');

select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'examResults'$q$) = 1,
  'ADMIN le examResults');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'catRecords'$q$) = 1,
  'ADMIN le catRecords');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'employees'$q$) = 3,
  'ADMIN le os funcionarios de todos os clientes');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-outra'$q$) = 0,
  'ADMIN nao le outra organizacao');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'examResults', 'exres-admin', '{"id": "exres-admin", "employee_id": "emp-b", "aso_id": "aso-x", "results": []}')$q$) = 'linhas:1',
  'ADMIN grava examResults');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'employees', 'emp-novo', '{"id": "emp-novo", "client_id": "cli-teste-a", "aso_history": [{"id": "aso-n", "result": "APTO", "exams": [{"id": "exm-n", "exam_code_table_27": "0281", "result": "NORMAL"}]}]}')$q$) = 'erro:P0001',
  'nem o ADMIN grava resultado de exame dentro de employees (gatilho)');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'employees', 'emp-novo', '{"id": "emp-novo", "client_id": "cli-teste-a", "aso_history": [{"id": "aso-n", "result": "APTO_COM_RESTRICAO", "exams": []}]}')$q$) = 'erro:P0001',
  'nem a conclusao APTO_COM_RESTRICAO');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'employees', 'emp-novo', '{"id": "emp-novo", "client_id": "cli-teste-a", "aso_history": [{"id": "aso-n", "result": "APTO", "exams": [{"id": "exm-n", "exam_code_table_27": "0281", "exam_date": "2026-09-01"}]}]}')$q$) = 'linhas:1',
  'funcionario com ASO sem dado clinico e gravado');
select pg_temp.confere(
  pg_temp.executa($q$update public.prevsafe_records set data = jsonb_set(data, '{name}', '"Nome corrigido"') where organization_id = 'org-teste-rls-20261005' and collection = 'employees' and record_id = 'emp-legado'$q$) = 'linhas:1',
  'editar o nome de quem ainda tem o resultado legado continua possivel (UPDATE)');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) select organization_id, collection, record_id, jsonb_set(data, '{name}', '"Nome pelo upsert"') from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'employees' and record_id = 'emp-legado' on conflict (organization_id, collection, record_id) do update set data = excluded.data$q$) = 'linhas:1',
  'e pelo upsert, que e como o app grava (BEFORE INSERT acha a versao anterior)');
select pg_temp.confere(
  pg_temp.executa($q$update public.prevsafe_records set data = jsonb_set(data, '{aso_history,0,exams,0,result}', '"NORMAL"') where organization_id = 'org-teste-rls-20261005' and collection = 'employees' and record_id = 'emp-legado'$q$) = 'erro:P0001',
  'trocar o resultado legado dentro de employees e recusado');
select pg_temp.confere(
  pg_temp.executa($q$update public.prevsafe_records set data = data #- '{aso_history,0,exams,0,observation}' where organization_id = 'org-teste-rls-20261005' and collection = 'employees' and record_id = 'emp-legado'$q$) = 'linhas:1',
  'tirar dado clinico de employees e permitido');

-- ---------------------------------------------------------------------------
-- GESTOR: perde so examResults
-- ---------------------------------------------------------------------------
select pg_temp.como('a0000000-0000-4000-8000-000000000002');

select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'examResults'$q$) = 0,
  'GESTOR nao le examResults');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'examResults', 'exres-gestor', '{"id": "exres-gestor"}')$q$) = 'erro:42501',
  'GESTOR nao grava examResults');
select pg_temp.confere(
  pg_temp.executa($q$update public.prevsafe_records set data = '{}' where organization_id = 'org-teste-rls-20261005' and collection = 'examResults'$q$) = 'linhas:0',
  'GESTOR nao altera examResults');
select pg_temp.confere(
  pg_temp.executa($q$delete from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'examResults'$q$) = 'linhas:0',
  'GESTOR nao apaga examResults');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'catRecords'$q$) = 1,
  'GESTOR continua lendo catRecords (colecao de saude que ja era dele)');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection in ('employees', 'transactions', 'leads', 'proposals')$q$) = 7,
  'GESTOR continua lendo funcionarios, financeiro, leads e propostas');
select pg_temp.confere(
  pg_temp.executa($q$update public.prevsafe_records set data = jsonb_set(data, '{name}', '"Trabalhador A2"') where organization_id = 'org-teste-rls-20261005' and collection = 'employees' and record_id = 'emp-a'$q$) = 'linhas:1',
  'GESTOR continua editando o cadastro do funcionario');

-- ---------------------------------------------------------------------------
-- SAUDE
-- ---------------------------------------------------------------------------
select pg_temp.como('a0000000-0000-4000-8000-000000000003');

select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'examResults'$q$) = 2,
  'SAUDE le examResults');
select pg_temp.confere(
  pg_temp.executa($q$update public.prevsafe_records set data = jsonb_set(data, '{restrictions_notes}', '"revista pela SAUDE"') where organization_id = 'org-teste-rls-20261005' and collection = 'examResults' and record_id = 'exres-emp-a-aso-a'$q$) = 'linhas:1',
  'SAUDE altera examResults');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'examResults', 'exres-saude', '{"id": "exres-saude"}')$q$) = 'linhas:1',
  'SAUDE grava examResults');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection in ('catRecords', 'employees')$q$) = 5,
  'SAUDE le catRecords e os funcionarios');
select pg_temp.confere(
  pg_temp.executa($q$update public.prevsafe_records set data = jsonb_set(data, '{aso_history,0,exams,0,result}', '"NORMAL"') where organization_id = 'org-teste-rls-20261005' and collection = 'employees' and record_id = 'emp-a'$q$) = 'erro:P0001',
  'nem a SAUDE grava resultado dentro de employees: o lugar e examResults');

-- ---------------------------------------------------------------------------
-- TECNICO
-- ---------------------------------------------------------------------------
select pg_temp.como('a0000000-0000-4000-8000-000000000004');

select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection in ('examResults', 'catRecords')$q$) = 0,
  'TECNICO nao le examResults nem catRecords');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'employees'$q$) = 4,
  'TECNICO le os funcionarios');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'examResults', 'exres-tecnico', '{"id": "exres-tecnico"}')$q$) = 'erro:42501',
  'TECNICO nao grava examResults');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'catRecords', 'cat-tecnico', '{"id": "cat-tecnico"}')$q$) = 'erro:42501',
  'TECNICO nao grava catRecords');
select pg_temp.confere(public.prevsafe_eh_equipe('org-teste-rls-20261005'),
  'TECNICO e equipe (buckets de evidencia e site)');

-- ---------------------------------------------------------------------------
-- CLIENTE_USER do cliente A
-- ---------------------------------------------------------------------------
select pg_temp.como('a0000000-0000-4000-8000-000000000005');

select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'clients'$q$) = 1
  and pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'clients' and record_id = 'cli-teste-a'$q$) = 1,
  'cliente A le so o proprio cadastro em clients');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and data->>'client_id' = 'cli-teste-b'$q$) = 0
  and pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and record_id = 'cli-teste-b'$q$) = 0,
  'cliente A nao le nada do cliente B, em colecao nenhuma');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-outra'$q$) = 0,
  'cliente A nao le a outra organizacao, nem com o mesmo client_id');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection in ('examResults', 'catRecords', 'employees')$q$) = 0,
  'cliente A nao le saude nem funcionarios, nem os da propria empresa');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection in ('transactions', 'leads', 'proposals', 'esocialConfig')$q$) = 0,
  'cliente A nao le colecao interna: financeiro, leads, propostas (nem a propria), configuracao do eSocial');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection in ('serviceOrders', 'contracts', 'requests', 'sstSignatures')$q$) = 4,
  'cliente A le as proprias OS, contratos, pendencias e assinaturas');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'documents'$q$) = 1
  and pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and record_id = 'doc-a-liberado'$q$) = 1,
  'cliente A le so o documento liberado, nao o rascunho');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection in ('organization', 'profiles')$q$) = 2,
  'cliente A le a organizacao e o proprio perfil, nao o dos outros');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection in ('auditLogs', 'notifications')$q$) = 0,
  'cliente A nao le a auditoria nem as notificacoes da equipe');
select pg_temp.confere(
  pg_temp.executa($q$update public.prevsafe_records set data = jsonb_set(data, '{status}', '"ACCEPTED"') where organization_id = 'org-teste-rls-20261005' and collection = 'serviceOrders' and record_id = 'os-a'$q$) = 'linhas:1',
  'cliente A da aceite na propria OS');
select pg_temp.confere(
  pg_temp.executa($q$update public.prevsafe_records set data = jsonb_set(data, '{status}', '"ACCEPTED"') where organization_id = 'org-teste-rls-20261005' and collection = 'serviceOrders' and record_id = 'os-b'$q$) = 'linhas:0',
  'cliente A nao altera a OS do cliente B');
select pg_temp.confere(
  pg_temp.executa($q$update public.prevsafe_records set data = jsonb_set(data, '{client_id}', '"cli-teste-b"') where organization_id = 'org-teste-rls-20261005' and collection = 'serviceOrders' and record_id = 'os-a'$q$) = 'erro:42501',
  'cliente A nao move a propria OS para o cliente B');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'serviceOrders', 'os-falsa', '{"id": "os-falsa", "client_id": "cli-teste-b"}')$q$) = 'erro:42501',
  'cliente A nao cria registro em nome do cliente B');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'requests', 'req-a2', '{"id": "req-a2", "client_id": "cli-teste-a", "status": "OPEN"}')$q$) = 'linhas:1',
  'cliente A abre pendencia da propria empresa');
select pg_temp.confere(
  pg_temp.executa($q$update public.prevsafe_records set deleted_at = now() where organization_id = 'org-teste-rls-20261005' and collection = 'requests' and record_id = 'req-a2'$q$) = 'linhas:1',
  'cliente A retira a propria pendencia (exclusao logica)');
select pg_temp.confere(
  pg_temp.executa($q$delete from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'requests'$q$) = 'linhas:0',
  'cliente A nao apaga linha de vez');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'evaluations', 'eval-a', '{"id": "eval-a", "client_id": "cli-teste-a", "nps_score": 10}')$q$) = 'linhas:1',
  'cliente A registra avaliacao da propria empresa');
select pg_temp.confere(
  pg_temp.executa($q$update public.prevsafe_records set data = jsonb_set(data, '{nps_score}', '0') where organization_id = 'org-teste-rls-20261005' and collection = 'evaluations' and record_id = 'eval-a'$q$) = 'linhas:0',
  'avaliacao enviada nao e reescrita');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'auditLogs', 'audit-cli-a', '{"id": "audit-cli-a", "action": "SERVICE_ACCEPTED"}')$q$) = 'linhas:1'
  and pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'auditLogs'$q$) = 1,
  'cliente A grava a propria auditoria e le so ela');
select pg_temp.confere(
  pg_temp.executa($q$update public.prevsafe_records set data = '{}' where organization_id = 'org-teste-rls-20261005' and collection = 'auditLogs' and record_id = 'audit-cli-a'$q$) = 'linhas:0',
  'cliente A nao reescreve a propria auditoria');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'auditLogs', 'audit-cli-a', '{"id": "audit-cli-a"}') on conflict (organization_id, collection, record_id) do nothing$q$) = 'linhas:0',
  'reenvio da mesma auditoria com ON CONFLICT DO NOTHING nao falha (e o que o app faz)');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'auditLogs', 'audit-equipe', '{"id": "audit-equipe", "action": "ADULTERADO"}') on conflict (organization_id, collection, record_id) do update set data = excluded.data$q$) = 'erro:42501',
  'cliente A nao sobrescreve a auditoria da equipe por upsert');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'employees', 'emp-cli', '{"id": "emp-cli", "client_id": "cli-teste-a"}')$q$) = 'erro:42501',
  'cliente A nao grava em employees');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'documents', 'doc-cli', '{"id": "doc-cli", "client_id": "cli-teste-a", "is_client_released": true}')$q$) = 'erro:42501',
  'cliente A nao grava documento');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_members$q$) = 1,
  'cliente A ve so o proprio vinculo');
select pg_temp.confere(
  pg_temp.executa($q$update public.prevsafe_members set client_id = 'cli-teste-b' where auth_user_id = 'a0000000-0000-4000-8000-000000000005'$q$) = 'erro:42501',
  'cliente A nao troca o proprio client_id');
select pg_temp.confere(not public.prevsafe_eh_equipe('org-teste-rls-20261005'),
  'cliente A nao e equipe (sem bucket de evidencias, sem site)');

-- ---------------------------------------------------------------------------
-- CLIENTE_ADMIN do cliente B
-- ---------------------------------------------------------------------------
select pg_temp.como('a0000000-0000-4000-8000-000000000006');

select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection = 'clients' and record_id = 'cli-teste-b'$q$) = 1
  and pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and (data->>'client_id' = 'cli-teste-a' or record_id = 'cli-teste-a')$q$) = 0,
  'cliente B le o proprio cadastro e nada do cliente A');
select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005' and collection in ('serviceOrders', 'evaluations', 'documents')$q$) = 3,
  'cliente B le a propria OS, a propria avaliacao e o proprio documento liberado');

-- ---------------------------------------------------------------------------
-- ADMIN de outra organizacao
-- ---------------------------------------------------------------------------
select pg_temp.como('a0000000-0000-4000-8000-000000000007');

select pg_temp.confere(pg_temp.conta($q$select 1 from public.prevsafe_records where organization_id = 'org-teste-rls-20261005'$q$) = 0,
  'ADMIN de outra organizacao nao le nada desta');
select pg_temp.confere(
  pg_temp.executa($q$insert into public.prevsafe_records (organization_id, collection, record_id, data) values ('org-teste-rls-20261005', 'leads', 'lead-intruso', '{"id": "lead-intruso"}')$q$) = 'erro:42501',
  'ADMIN de outra organizacao nao grava nesta');

-- ---------------------------------------------------------------------------
reset role;

select 'rls_saude_e_clientes: ' || current_setting('teste_rls.casos') || ' casos passaram' as resultado;

rollback;
