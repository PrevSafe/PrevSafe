-- ===========================================================================
-- Papel SAUDE, resultados de exame em colecao propria e contas de cliente
-- isoladas na propria empresa
-- ===========================================================================
--
-- PROBLEMA 1 - resultado de exame dentro do cadastro do funcionario
--
-- O historico de ASO fica dentro do registro do funcionario (colecao
-- employees): aso_history[].exams[].result e .observation, restrictions_notes
-- e a conclusao APTO_COM_RESTRICAO. employees nao e colecao de saude, entao
-- qualquer conta da organizacao lia esses dados pela API. A RLS filtra por
-- colecao; enquanto o resultado morar dentro de employees, nenhuma politica
-- consegue separa-lo do resto do cadastro.
--
-- PROBLEMA 2 - conta de cliente lia todos os clientes
--
-- CLIENTE_ADMIN e CLIENTE_USER passavam no mesmo teste da equipe: "pertence a
-- organizacao". Liam funcionarios, CPF, riscos, financeiro, leads e propostas
-- de todos os clientes da consultoria, e podiam gravar em qualquer colecao. O
-- vinculo entre a conta e o cliente so existia em lugares que o proprio
-- usuario altera: o registro em profiles (colecao gravavel por qualquer
-- membro, inclusive o cliente) e o user_metadata (auth.updateUser). Nenhum
-- dos dois serve para autorizar.
--
-- DECISAO
--
-- 1. Papel novo SAUDE: o medico do trabalho e a equipe que ele supervisiona.
--    Resultado de exame, observacao clinica e restricao do ASO saem de
--    employees e vao para a colecao examResults, que so SAUDE e ADMIN leem e
--    gravam. GESTOR e os demais continuam vendo, no cadastro, tipo, data,
--    validade e apto/inapto. SAUDE entra tambem nas colecoes de saude que ja
--    existiam (examProtocols, workAbsences, catRecords), ao lado de ADMIN e
--    GESTOR.
--
-- 2. prevsafe_members ganha client_id, gravado so pela service role (a tabela
--    nao tem politica de escrita para authenticated). E ele que amarra a conta
--    de cliente ao cliente. Conta de cliente sem client_id nao ve nada.
--
-- 3. Conta de cliente so alcanca as colecoes que o portal do cliente usa
--    (components/client-portal/ClientPortalView.tsx e as acoes que ele chama),
--    e nelas so o que e da propria empresa:
--
--      leitura   organization (quem presta o servico), clients (o proprio
--                registro), profiles (o proprio perfil), contracts,
--                documents (so os liberados ao cliente)
--      edicao    serviceOrders (aceite e pedido de revisao), requests
--                (pendencias), sstSignatures (assinatura)
--      inclusao  evaluations (NPS), notifications e auditLogs gerados pela
--                propria conta
--
--    Nunca colecao de saude, de outro cliente ou interna da consultoria. O
--    mesmo vale para os buckets de evidencias e do site e para site_posts:
--    a escrita e a leitura interna ficam com a equipe.
--
-- 4. A equipe da consultoria continua com o que tinha: toda colecao que nao e
--    de saude, para qualquer papel interno. A unica perda e examResults para
--    quem nao e SAUDE nem ADMIN.
--
-- 5. Defesa no banco: gatilho em employees recusa resultado, observacao e
--    restricao NOVOS vindos de conta de usuario. O dado legado que ja esta la
--    passa intacto ate o script scripts/migrar-resultados-de-exame.mjs move-lo;
--    o que nao passa e uma versao antiga do app aberta numa aba gravando
--    resultado de volta no cadastro.
--
-- As funcoes antigas (prevsafe_pode_acessar, prevsafe_papel_na_organizacao)
-- ficam no banco sem uso pelas politicas: o rollback em
-- supabase/rollback/20261005120000_papel_saude_e_isolamento_de_clientes.sql
-- volta a usa-las.
--
-- Teste: supabase/testes/rls_saude_e_clientes.sql (roda em begin/rollback).

-- ---------------------------------------------------------------------------
-- 1. Vinculo da conta de cliente com o cliente
-- ---------------------------------------------------------------------------
alter table public.prevsafe_members add column if not exists client_id text;

comment on column public.prevsafe_members.client_id is
  'Cliente (record_id na colecao clients) a que a conta CLIENTE_ADMIN/CLIENTE_USER pertence. Gravado so pela service role. Conta de cliente sem client_id nao ve nada.';

-- So a service role grava o vinculo (rotas app/api/admin/*). O authenticated
-- tinha INSERT/UPDATE/DELETE na tabela e era barrado so por nao haver politica
-- de escrita: o UPDATE da propria linha (trocar o client_id, subir o papel)
-- afetava zero linhas em silencio. Sem o privilegio, a tentativa vira erro de
-- permissao, e a protecao deixa de depender de ninguem criar uma politica de
-- escrita por engano. Visto no ensaio desta migracao em producao (06/10/2026).
revoke insert, update, delete on public.prevsafe_members from anon, authenticated;

-- NOT VALID: as contas de cliente que ja existem ainda estao sem client_id e
-- nao podem impedir a migracao. A regra vale para toda linha nova ou alterada,
-- entao a rota de criacao de usuario e a de troca de papel nao conseguem
-- gravar conta de cliente sem cliente, nem membro da equipe com cliente.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'prevsafe_members_cliente_coerente'
      and conrelid = 'public.prevsafe_members'::regclass
  ) then
    alter table public.prevsafe_members
      add constraint prevsafe_members_cliente_coerente
      check (
        case
          when upper(btrim(coalesce(role, ''))) in ('CLIENTE_ADMIN', 'CLIENTE_USER')
            then nullif(btrim(coalesce(client_id, '')), '') is not null
          else client_id is null
        end
      ) not valid;
  end if;

  -- Papel fora da lista vira equipe sem acesso a saude nas politicas abaixo.
  -- Barrar o erro de digitacao na gravacao evita que o papel do medico, escrito
  -- com acento ou com outra grafia, o deixe sem os resultados sem ninguem
  -- perceber. TECNICO leva acento porque e assim que o app o grava.
  if not exists (
    select 1 from pg_constraint
    where conname = 'prevsafe_members_papel_conhecido'
      and conrelid = 'public.prevsafe_members'::regclass
  ) then
    alter table public.prevsafe_members
      add constraint prevsafe_members_papel_conhecido
      check (
        btrim(coalesce(role, '')) in (
          'ADMIN', 'GESTOR', 'COMERCIAL', 'TÉCNICO', 'FINANCEIRO', 'SAUDE',
          'CLIENTE_ADMIN', 'CLIENTE_USER'
        )
      ) not valid;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Classificacao de papel e de colecao
-- ---------------------------------------------------------------------------
create or replace function public.prevsafe_papel_de_cliente(papel text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select upper(btrim(coalesce(papel, ''))) in ('CLIENTE_ADMIN', 'CLIENTE_USER');
$$;

-- Separada de prevsafe_colecao_de_saude de proposito: la o GESTOR entra, aqui
-- nao.
create or replace function public.prevsafe_colecao_de_resultado_de_exame(colecao text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select colecao = 'examResults';
$$;

-- ---------------------------------------------------------------------------
-- 3. O que a conta de cliente le e grava (sempre so da propria empresa)
--
-- `cliente` e o client_id do vinculo; `autor` e updated_by, que o gatilho
-- prevsafe_records_touch carimba com auth.uid() em toda gravacao - por isso
-- serve para "o que a propria conta registrou", e o campo user_id do JSON,
-- que o app preenche, nao.
-- ---------------------------------------------------------------------------
create or replace function public.prevsafe_portal_pode_ler(
  colecao text,
  registro text,
  dados jsonb,
  autor uuid,
  cliente text
)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select cliente is not null and case colecao
    -- Quem presta o servico: nome, CNPJ e responsaveis tecnicos, os mesmos
    -- impressos em todo documento entregue ao cliente.
    when 'organization'  then true
    -- O cadastro da propria empresa, e so ele.
    when 'clients'       then registro = cliente
    -- O proprio perfil (nome de quem esta logado).
    when 'profiles'      then dados->>'auth_user_id' = auth.uid()::text
    when 'contracts'     then dados->>'client_id' = cliente
    when 'serviceOrders' then dados->>'client_id' = cliente
    when 'requests'      then dados->>'client_id' = cliente
    when 'evaluations'   then dados->>'client_id' = cliente
    when 'sstSignatures' then dados->>'client_id' = cliente
    -- Laudo em elaboracao nao e do cliente ainda: so depois de liberado.
    when 'documents'     then dados->>'client_id' = cliente
                              and dados->>'is_client_released' = 'true'
    when 'auditLogs'     then autor = auth.uid()
    when 'notifications' then autor = auth.uid()
    else false
  end;
$$;

create or replace function public.prevsafe_portal_pode_gravar(
  colecao text,
  dados jsonb,
  autor uuid,
  cliente text,
  operacao text
)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select cliente is not null and case
    -- Aceite e pedido de revisao (serviceOrders), pendencia aberta, respondida
    -- ou retirada (requests) e assinatura (sstSignatures). INSERT entra junto
    -- porque o app grava por upsert, e o Postgres confere a politica de INSERT
    -- tambem no upsert que acaba em UPDATE. O client_id na nova versao da
    -- linha impede mover o registro para outro cliente.
    when colecao in ('serviceOrders', 'requests', 'sstSignatures')
      then operacao in ('INSERT', 'UPDATE') and dados->>'client_id' = cliente
    -- Avaliacao: so inclui, e so para a propria empresa.
    when colecao = 'evaluations'
      then operacao = 'INSERT' and dados->>'client_id' = cliente
    -- Auditoria e notificacao geradas pela propria conta: so inclui. Sem
    -- UPDATE a conta nao reescreve a propria trilha nem a notificacao que a
    -- equipe ja tratou; o app envia estas colecoes com ON CONFLICT DO NOTHING.
    when colecao in ('auditLogs', 'notifications')
      then operacao = 'INSERT' and autor = auth.uid()
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Condicao unica de leitura e de gravacao
--
-- security invoker: a leitura de prevsafe_members passa pela RLS dela
-- (prevsafe_members_select_own), que entrega ao usuario so as proprias linhas.
-- Nao ha recursao: aquela politica nao consulta prevsafe_records.
--
-- Papel comparado em maiusculas e sem espacos, como o app faz
-- (lib/supabaseSync.ts). Papel vazio ou desconhecido, fora dos de cliente, e
-- tratado como equipe sem acesso a saude - o mesmo alcance que tinha antes.
-- ---------------------------------------------------------------------------
create or replace function public.prevsafe_pode_ler(
  org text,
  colecao text,
  registro text,
  dados jsonb,
  autor uuid
)
returns boolean
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_papel text;
  v_cliente text;
begin
  select upper(btrim(coalesce(m.role, ''))),
         nullif(btrim(coalesce(m.client_id, '')), '')
    into v_papel, v_cliente
  from public.prevsafe_members m
  where m.auth_user_id = auth.uid()
    and m.organization_id = org;

  if not found then
    return false;
  end if;

  if public.prevsafe_papel_de_cliente(v_papel) then
    return coalesce(public.prevsafe_portal_pode_ler(colecao, registro, dados, autor, v_cliente), false);
  end if;

  if public.prevsafe_colecao_de_resultado_de_exame(colecao) then
    return v_papel in ('ADMIN', 'SAUDE');
  end if;

  if public.prevsafe_colecao_de_saude(colecao) then
    return v_papel in ('ADMIN', 'GESTOR', 'SAUDE');
  end if;

  return true;
end;
$$;

create or replace function public.prevsafe_pode_gravar(
  org text,
  colecao text,
  registro text,
  dados jsonb,
  autor uuid,
  operacao text
)
returns boolean
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_papel text;
  v_cliente text;
begin
  select upper(btrim(coalesce(m.role, ''))),
         nullif(btrim(coalesce(m.client_id, '')), '')
    into v_papel, v_cliente
  from public.prevsafe_members m
  where m.auth_user_id = auth.uid()
    and m.organization_id = org;

  if not found then
    return false;
  end if;

  if public.prevsafe_papel_de_cliente(v_papel) then
    return coalesce(public.prevsafe_portal_pode_gravar(colecao, dados, autor, v_cliente, operacao), false);
  end if;

  if public.prevsafe_colecao_de_resultado_de_exame(colecao) then
    return v_papel in ('ADMIN', 'SAUDE');
  end if;

  if public.prevsafe_colecao_de_saude(colecao) then
    return v_papel in ('ADMIN', 'GESTOR', 'SAUDE');
  end if;

  return true;
end;
$$;

-- Membro da equipe da consultoria (qualquer papel que nao seja de cliente).
-- Usada nos buckets e no conteudo do site, que nao passam por prevsafe_records.
create or replace function public.prevsafe_eh_equipe(org text)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.prevsafe_members m
    where m.auth_user_id = auth.uid()
      and m.organization_id = org
      and not public.prevsafe_papel_de_cliente(m.role)
  );
$$;

revoke all on function public.prevsafe_papel_de_cliente(text) from public, anon;
revoke all on function public.prevsafe_colecao_de_resultado_de_exame(text) from public, anon;
revoke all on function public.prevsafe_portal_pode_ler(text, text, jsonb, uuid, text) from public, anon;
revoke all on function public.prevsafe_portal_pode_gravar(text, jsonb, uuid, text, text) from public, anon;
revoke all on function public.prevsafe_pode_ler(text, text, text, jsonb, uuid) from public, anon;
revoke all on function public.prevsafe_pode_gravar(text, text, text, jsonb, uuid, text) from public, anon;
revoke all on function public.prevsafe_eh_equipe(text) from public, anon;

grant execute on function public.prevsafe_papel_de_cliente(text) to authenticated, service_role;
grant execute on function public.prevsafe_colecao_de_resultado_de_exame(text) to authenticated, service_role;
grant execute on function public.prevsafe_portal_pode_ler(text, text, jsonb, uuid, text) to authenticated, service_role;
grant execute on function public.prevsafe_portal_pode_gravar(text, jsonb, uuid, text, text) to authenticated, service_role;
grant execute on function public.prevsafe_pode_ler(text, text, text, jsonb, uuid) to authenticated, service_role;
grant execute on function public.prevsafe_pode_gravar(text, text, text, jsonb, uuid, text) to authenticated, service_role;
grant execute on function public.prevsafe_eh_equipe(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Politicas de prevsafe_records
--
-- updated_by entra como autor: no INSERT e no UPDATE o gatilho
-- prevsafe_records_touch (BEFORE) ja o carimbou com auth.uid() quando o
-- WITH CHECK e avaliado.
-- ---------------------------------------------------------------------------
drop policy if exists prevsafe_records_select on public.prevsafe_records;
create policy prevsafe_records_select on public.prevsafe_records
  for select
  to authenticated
  using (public.prevsafe_pode_ler(organization_id, collection, record_id, data, updated_by));

drop policy if exists prevsafe_records_insert on public.prevsafe_records;
create policy prevsafe_records_insert on public.prevsafe_records
  for insert
  to authenticated
  with check (public.prevsafe_pode_gravar(organization_id, collection, record_id, data, updated_by, 'INSERT'));

drop policy if exists prevsafe_records_update on public.prevsafe_records;
create policy prevsafe_records_update on public.prevsafe_records
  for update
  to authenticated
  using (public.prevsafe_pode_gravar(organization_id, collection, record_id, data, updated_by, 'UPDATE'))
  with check (public.prevsafe_pode_gravar(organization_id, collection, record_id, data, updated_by, 'UPDATE'));

drop policy if exists prevsafe_records_delete on public.prevsafe_records;
create policy prevsafe_records_delete on public.prevsafe_records
  for delete
  to authenticated
  using (public.prevsafe_pode_gravar(organization_id, collection, record_id, data, updated_by, 'DELETE'));

-- ---------------------------------------------------------------------------
-- 6. employees nao recebe dado clinico novo
-- ---------------------------------------------------------------------------

-- Os campos clinicos de um registro de funcionario, como lista comparavel:
-- restricao, conclusao "apto com restricao" e resultado/observacao de exame.
-- Um item por campo preenchido, e nao um por exame: assim apagar so a
-- observacao de um exame deixa a lista menor (permitido), e trocar o
-- resultado cria um item que nao existia (recusado). Lista vazia quando o
-- cadastro esta limpo.
create or replace function public.prevsafe_dados_clinicos_do_funcionario(dados jsonb)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  with asos as (
    select aso
    from jsonb_array_elements(
      case when jsonb_typeof(dados->'aso_history') = 'array'
        then dados->'aso_history' else '[]'::jsonb end
    ) as aso
  ),
  exames as (
    select aso, ex
    from asos
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(aso->'exams') = 'array' then aso->'exams' else '[]'::jsonb end
    ) as ex
  ),
  itens as (
    select jsonb_build_object('aso', aso->>'id', 'campo', 'restricao', 'valor', aso->'restrictions_notes') as item
    from asos
    where nullif(btrim(coalesce(aso->>'restrictions_notes', '')), '') is not null
    union all
    select jsonb_build_object('aso', aso->>'id', 'campo', 'conclusao', 'valor', aso->'result')
    from asos
    where aso->>'result' = 'APTO_COM_RESTRICAO'
    union all
    select jsonb_build_object('aso', aso->>'id', 'exame', ex->>'id', 'campo', 'resultado', 'valor', ex->'result')
    from exames
    where nullif(btrim(coalesce(ex->>'result', '')), '') is not null
    union all
    select jsonb_build_object('aso', aso->>'id', 'exame', ex->>'id', 'campo', 'observacao', 'valor', ex->'observation')
    from exames
    where nullif(btrim(coalesce(ex->>'observation', '')), '') is not null
  )
  select coalesce(jsonb_agg(item), '[]'::jsonb) from itens;
$$;

-- Recusa a gravacao de conta de usuario que traga dado clinico que a versao
-- anterior do mesmo funcionario nao tinha. A service role (backup,
-- restauracao, script de migracao) nao tem auth.uid() e passa.
--
-- No upsert o Postgres dispara o BEFORE INSERT antes de descobrir o conflito:
-- por isso, no INSERT, a versao anterior e procurada na tabela. Sem isso, o
-- app atual nao conseguiria salvar uma edicao de nome de um funcionario que
-- ainda carrega o resultado legado.
create or replace function public.prevsafe_funcionario_sem_resultado_de_exame()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_novo jsonb;
  v_antigo jsonb;
begin
  if auth.uid() is null then
    return new;
  end if;

  v_novo := public.prevsafe_dados_clinicos_do_funcionario(new.data);
  if v_novo = '[]'::jsonb then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_antigo := public.prevsafe_dados_clinicos_do_funcionario(old.data);
  else
    select public.prevsafe_dados_clinicos_do_funcionario(r.data)
      into v_antigo
    from public.prevsafe_records r
    where r.organization_id = new.organization_id
      and r.collection = new.collection
      and r.record_id = new.record_id;
  end if;

  -- O legado igual passa: e o mesmo dado, levado adiante ate o script move-lo.
  if coalesce(v_antigo, '[]'::jsonb) @> v_novo then
    return new;
  end if;

  raise exception 'Resultado de exame, observacao clinica e restricao do ASO nao sao gravados no cadastro do funcionario.'
    using hint = 'Eles ficam na colecao examResults, restrita aos papeis SAUDE e ADMIN. Recarregue o sistema para usar a versao atual.';
end;
$$;

revoke all on function public.prevsafe_dados_clinicos_do_funcionario(jsonb) from public, anon;
grant execute on function public.prevsafe_dados_clinicos_do_funcionario(jsonb) to authenticated, service_role;
revoke all on function public.prevsafe_funcionario_sem_resultado_de_exame() from public, anon, authenticated;

drop trigger if exists prevsafe_funcionario_sem_resultado_trg on public.prevsafe_records;
create trigger prevsafe_funcionario_sem_resultado_trg
  before insert or update on public.prevsafe_records
  for each row
  when (new.collection = 'employees')
  execute function public.prevsafe_funcionario_sem_resultado_de_exame();

-- ---------------------------------------------------------------------------
-- 7. Buckets e conteudo do site: so a equipe
--
-- A foto de evidencia mostra o interior da planta de um cliente; com a regra
-- antiga, a conta de outro cliente a lia. E a conta de cliente podia publicar
-- no site e trocar imagens dele.
-- ---------------------------------------------------------------------------
drop policy if exists prevsafe_evidencias_select on storage.objects;
create policy prevsafe_evidencias_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'prevsafe-evidencias'
    and public.prevsafe_eh_equipe((storage.foldername(name))[1])
  );

drop policy if exists prevsafe_evidencias_insert on storage.objects;
create policy prevsafe_evidencias_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'prevsafe-evidencias'
    and public.prevsafe_eh_equipe((storage.foldername(name))[1])
  );

drop policy if exists prevsafe_evidencias_update on storage.objects;
create policy prevsafe_evidencias_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'prevsafe-evidencias'
    and public.prevsafe_eh_equipe((storage.foldername(name))[1])
  );

drop policy if exists prevsafe_evidencias_delete on storage.objects;
create policy prevsafe_evidencias_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'prevsafe-evidencias'
    and public.prevsafe_eh_equipe((storage.foldername(name))[1])
  );

drop policy if exists prevsafe_site_insert on storage.objects;
create policy prevsafe_site_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'prevsafe-site'
    and public.prevsafe_eh_equipe((storage.foldername(name))[1])
  );

drop policy if exists prevsafe_site_update on storage.objects;
create policy prevsafe_site_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'prevsafe-site'
    and public.prevsafe_eh_equipe((storage.foldername(name))[1])
  );

drop policy if exists prevsafe_site_delete on storage.objects;
create policy prevsafe_site_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'prevsafe-site'
    and public.prevsafe_eh_equipe((storage.foldername(name))[1])
  );

-- A leitura publica do que esta PUBLICADO (site_posts_leitura_publica) nao
-- muda: rascunho e escrita ficam com a equipe.
drop policy if exists site_posts_membros_leitura on public.site_posts;
create policy site_posts_membros_leitura
  on public.site_posts for select
  to authenticated
  using (public.prevsafe_eh_equipe(organization_id));

drop policy if exists site_posts_membros_insert on public.site_posts;
create policy site_posts_membros_insert
  on public.site_posts for insert
  to authenticated
  with check (public.prevsafe_eh_equipe(organization_id));

drop policy if exists site_posts_membros_update on public.site_posts;
create policy site_posts_membros_update
  on public.site_posts for update
  to authenticated
  using (public.prevsafe_eh_equipe(organization_id))
  with check (public.prevsafe_eh_equipe(organization_id));

drop policy if exists site_posts_membros_delete on public.site_posts;
create policy site_posts_membros_delete
  on public.site_posts for delete
  to authenticated
  using (public.prevsafe_eh_equipe(organization_id));
