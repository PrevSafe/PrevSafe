-- =====================================================================
-- PrevSafe :: ADR-001 — acesso de um usuário a múltiplas empresas
-- Fase ADITIVA: cria o vínculo N:N usuarios_empresas e migra todo o RLS
-- para usá-lo. NÃO remove profiles.empresa_id nem as funções antigas
-- auth_empresa_id()/auth_papel() — isso fica para uma segunda migration,
-- depois de validado em produção (ver comentário no fim do arquivo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) USUARIOS_EMPRESAS — vínculo N:N usuário x empresa, com papel por vínculo
-- ---------------------------------------------------------------------

create table if not exists usuarios_empresas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  papel varchar(20) not null default 'tecnico'
    check (papel in ('admin','tecnico','inspetor','leitura')),
  padrao boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (usuario_id, empresa_id)
);

-- No máximo uma empresa padrão por usuário.
drop index if exists idx_usuarios_empresas_padrao_unica;
create unique index idx_usuarios_empresas_padrao_unica
  on usuarios_empresas (usuario_id)
  where padrao;

create index if not exists idx_usuarios_empresas_usuario on usuarios_empresas(usuario_id);
create index if not exists idx_usuarios_empresas_empresa on usuarios_empresas(empresa_id);


-- ---------------------------------------------------------------------
-- 2) Migra os vínculos existentes de profiles para usuarios_empresas
-- ---------------------------------------------------------------------

insert into usuarios_empresas (usuario_id, empresa_id, papel, padrao)
select id, empresa_id, papel, true from profiles where empresa_id is not null
on conflict (usuario_id, empresa_id) do nothing;


-- ---------------------------------------------------------------------
-- 3) Novas funções de sessão (substituem auth_empresa_id()/auth_papel()
--    para as policies de domínio). SECURITY DEFINER evita recursão de RLS.
-- ---------------------------------------------------------------------

create or replace function public.auth_empresas_ids()
returns setof uuid language sql stable security definer set search_path = public as $fn$
  select empresa_id from usuarios_empresas
  where usuario_id = auth.uid() and ativo = true
$fn$;

create or replace function public.auth_papel_na_empresa(p_empresa_id uuid)
returns text language sql stable security definer set search_path = public as $fn$
  select papel from usuarios_empresas
  where usuario_id = auth.uid() and empresa_id = p_empresa_id and ativo = true
$fn$;

grant execute on function public.auth_empresas_ids() to authenticated;
grant execute on function public.auth_papel_na_empresa(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 4) Policies das tabelas de domínio — todas passam a usar
--    auth_empresas_ids() / auth_papel_na_empresa(empresa_id).
--    categorias_trabalhador_esocial é global e não muda.
-- ---------------------------------------------------------------------

drop policy if exists unidades_select on unidades;
create policy unidades_select on unidades for select to authenticated
  using (empresa_id in (select auth_empresas_ids()));
drop policy if exists unidades_write on unidades;
create policy unidades_write on unidades for all to authenticated
  using (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura')
  with check (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura');

drop policy if exists setores_select on setores;
create policy setores_select on setores for select to authenticated
  using (empresa_id in (select auth_empresas_ids()));
drop policy if exists setores_write on setores;
create policy setores_write on setores for all to authenticated
  using (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura')
  with check (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura');

drop policy if exists cargos_select on cargos;
create policy cargos_select on cargos for select to authenticated
  using (empresa_id in (select auth_empresas_ids()));
drop policy if exists cargos_write on cargos;
create policy cargos_write on cargos for all to authenticated
  using (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura')
  with check (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura');

drop policy if exists lotacoes_select on lotacoes;
create policy lotacoes_select on lotacoes for select to authenticated
  using (empresa_id in (select auth_empresas_ids()));
drop policy if exists lotacoes_write on lotacoes;
create policy lotacoes_write on lotacoes for all to authenticated
  using (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura')
  with check (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura');

drop policy if exists funcionarios_select on funcionarios;
create policy funcionarios_select on funcionarios for select to authenticated
  using (empresa_id in (select auth_empresas_ids()));
drop policy if exists funcionarios_write on funcionarios;
create policy funcionarios_write on funcionarios for all to authenticated
  using (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura')
  with check (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura');

drop policy if exists funcionarios_lotacoes_select on funcionarios_lotacoes;
create policy funcionarios_lotacoes_select on funcionarios_lotacoes for select to authenticated
  using (empresa_id in (select auth_empresas_ids()));
drop policy if exists funcionarios_lotacoes_write on funcionarios_lotacoes;
create policy funcionarios_lotacoes_write on funcionarios_lotacoes for all to authenticated
  using (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura')
  with check (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura');

-- inspecoes, planos_acao e tarefas tinham policy única "_all" com nome antigo;
-- removidas e recriadas no padrão _select/_write.
drop policy if exists inspecoes_all on inspecoes;
drop policy if exists inspecoes_select on inspecoes;
create policy inspecoes_select on inspecoes for select to authenticated
  using (empresa_id in (select auth_empresas_ids()));
drop policy if exists inspecoes_write on inspecoes;
create policy inspecoes_write on inspecoes for all to authenticated
  using (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura')
  with check (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura');

drop policy if exists planos_all on planos_acao;
drop policy if exists planos_acao_select on planos_acao;
create policy planos_acao_select on planos_acao for select to authenticated
  using (empresa_id in (select auth_empresas_ids()));
drop policy if exists planos_acao_write on planos_acao;
create policy planos_acao_write on planos_acao for all to authenticated
  using (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura')
  with check (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura');

drop policy if exists tarefas_all on tarefas;
drop policy if exists tarefas_select on tarefas;
create policy tarefas_select on tarefas for select to authenticated
  using (empresa_id in (select auth_empresas_ids()));
drop policy if exists tarefas_write on tarefas;
create policy tarefas_write on tarefas for all to authenticated
  using (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura')
  with check (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) <> 'leitura');


-- ---------------------------------------------------------------------
-- 5) Policies de empresas e profiles
-- ---------------------------------------------------------------------

drop policy if exists empresas_select on empresas;
create policy empresas_select on empresas for select to authenticated
  using (id in (select auth_empresas_ids()));

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (
    id = auth.uid() or exists (
      select 1 from usuarios_empresas ue
      where ue.usuario_id = profiles.id
        and ue.empresa_id in (select auth_empresas_ids())
    )
  );

-- profiles_update_self não muda.


-- ---------------------------------------------------------------------
-- 6) RLS de usuarios_empresas — cada um vê só os próprios vínculos.
--    Sem policy de escrita por enquanto: vínculos são criados via SQL/admin.
-- ---------------------------------------------------------------------

alter table usuarios_empresas enable row level security;

drop policy if exists usuarios_empresas_select on usuarios_empresas;
create policy usuarios_empresas_select on usuarios_empresas for select to authenticated
  using (usuario_id = auth.uid());


-- ---------------------------------------------------------------------
-- 7) profiles.empresa_id vira opcional — o trigger de novo usuário não
--    grava mais esse campo (o vínculo passa a viver em usuarios_empresas).
--    A coluna e a FK continuam existindo (fase aditiva, ver nota no fim).
-- ---------------------------------------------------------------------

alter table profiles alter column empresa_id drop not null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  v_empresa_id uuid;
begin
  insert into profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email, ''), new.email)
  on conflict (id) do nothing;

  v_empresa_id := nullif(new.raw_user_meta_data->>'empresa_id', '')::uuid;
  if v_empresa_id is not null then
    insert into usuarios_empresas (usuario_id, empresa_id, padrao)
    values (new.id, v_empresa_id, true)
    on conflict (usuario_id, empresa_id) do nothing;
  end if;

  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 8) dashboard_resumo passa a receber a empresa ativa explicitamente —
--    com múltiplos vínculos, o RLS sozinho deixaria passar linhas de
--    todas as empresas do usuário e a agregação somaria tudo junto.
-- ---------------------------------------------------------------------

drop function if exists public.dashboard_resumo();

create or replace function public.dashboard_resumo(p_empresa_id uuid)
returns json language sql stable security invoker set search_path = public as $fn$
  select json_build_object(
    'inspecoes_mes', (select count(*) from inspecoes where empresa_id = p_empresa_id and status = 'concluida' and realizada_em >= date_trunc('month', current_date)::date),
    'planos_pendentes', (select count(*) from planos_acao where empresa_id = p_empresa_id and status in ('pendente','em_andamento')),
    'conformidade_geral', (select round(avg(percentual_conformidade)) from inspecoes where empresa_id = p_empresa_id and status = 'concluida' and realizada_em >= (current_date - interval '90 days')::date),
    'conformidade_mes_anterior', (select round(avg(percentual_conformidade)) from inspecoes where empresa_id = p_empresa_id and status = 'concluida' and realizada_em >= (date_trunc('month', current_date) - interval '1 month')::date and realizada_em < date_trunc('month', current_date)::date),
    'por_norma', coalesce((select json_agg(x order by x.norma) from (select norma, round(avg(percentual_conformidade)) as percentual from inspecoes where empresa_id = p_empresa_id and status = 'concluida' and norma is not null and realizada_em >= (current_date - interval '180 days')::date group by norma) x), '[]'::json),
    'planos_por_status', coalesce((select json_agg(y order by y.status) from (select status, count(*) as total from planos_acao where empresa_id = p_empresa_id group by status) y), '[]'::json),
    'proximas_tarefas', coalesce((select json_agg(z order by z.inicio_em) from (select id, titulo, tipo, prioridade, inicio_em, responsavel_nome from tarefas where empresa_id = p_empresa_id and not concluida and inicio_em >= now() - interval '12 hours' order by inicio_em limit 5) z), '[]'::json)
  )
$fn$;

grant execute on function public.dashboard_resumo(uuid) to authenticated;


-- =====================================================================
-- NOTA: esta migration é aditiva de propósito. profiles.empresa_id (agora
-- nullable) e as funções auth_empresa_id()/auth_papel() continuam
-- existindo, sem uso pelas policies. Elas só serão removidas numa segunda
-- migration, depois que o app novo estiver validado em produção.
-- =====================================================================
