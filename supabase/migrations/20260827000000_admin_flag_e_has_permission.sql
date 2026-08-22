-- =====================================================================
-- PrevSafe · Administrador por definição + checagem central de permissão
--
-- Substitui o modelo de "snapshot" (copiar todas as linhas de
-- recurso_acoes para perfil_permissoes) por uma flag no perfil.
-- Efeito prático: recursos novos passam a valer para o admin
-- automaticamente, sem re-rodar seed.
--
-- Aplicar com:  npx supabase db push
-- NÃO rodar via `supabase db query` no PowerShell (os $$ quebram).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Flag de administrador
-- ---------------------------------------------------------------------
alter table public.perfis_acesso
  add column if not exists is_admin boolean not null default false;

comment on column public.perfis_acesso.is_admin is
  'Quando true, o perfil concede todos os recursos/ações da empresa, '
  'inclusive os cadastrados no futuro. Não depende de perfil_permissoes.';


-- ---------------------------------------------------------------------
-- 2. Promove os perfis "Administrador" que já existem
-- ---------------------------------------------------------------------
update public.perfis_acesso
   set is_admin = true
 where nome = 'Administrador'
   and is_admin = false;


-- ---------------------------------------------------------------------
-- 3. Garante um perfil administrador por empresa
--    (idempotente: roda em qualquer ambiente, inclusive banco vazio)
-- ---------------------------------------------------------------------
insert into public.perfis_acesso (empresa_id, nome, descricao, is_admin)
select e.id,
       'Administrador',
       'Acesso completo a todos os recursos.',
       true
from public.empresas e
where not exists (
  select 1
  from public.perfis_acesso pa
  where pa.empresa_id = e.id
    and pa.is_admin
);


-- ---------------------------------------------------------------------
-- 4. No máximo um perfil admin por empresa
--    Se esta linha falhar, existem perfis admin duplicados: rode
--    select empresa_id, count(*) from perfis_acesso where is_admin
--    group by 1 having count(*) > 1;
--    e consolide antes de reaplicar.
-- ---------------------------------------------------------------------
create unique index if not exists perfis_acesso_um_admin_por_empresa
  on public.perfis_acesso (empresa_id)
  where is_admin;


-- ---------------------------------------------------------------------
-- 5. has_permission — fonte única da verdade
--
-- SECURITY DEFINER é obrigatório aqui, não é conveniência: as políticas
-- de RLS das tabelas de negócio vão chamar esta função, e ela consulta
-- usuarios_empresas / perfis_acesso / perfil_permissoes. Se rodasse como
-- invoker, a RLS dessas tabelas seria avaliada dentro da própria checagem
-- de RLS e o Postgres entraria em recursão infinita.
--
-- search_path fixo evita que um schema malicioso no path do chamador
-- sequestre os nomes das tabelas.
-- ---------------------------------------------------------------------
create or replace function public.has_permission(
  p_recurso    text,
  p_acao       text,
  p_empresa_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.usuarios_empresas ue
    join public.perfis_acesso pa on pa.id = ue.perfil_id
    where ue.usuario_id = auth.uid()
      and (p_empresa_id is null or ue.empresa_id = p_empresa_id)
      and (
        pa.is_admin
        or exists (
          select 1
          from public.perfil_permissoes pp
          where pp.perfil_id      = pa.id
            and pp.recurso_codigo = p_recurso
            and pp.acao_codigo    = p_acao
        )
      )
  );
$$;

comment on function public.has_permission(text, text, uuid) is
  'true se o usuário autenticado tem a ação sobre o recurso. '
  'Com p_empresa_id nulo, verifica em qualquer empresa vinculada — '
  'em políticas de RLS sempre passe a empresa da linha.';

revoke all     on function public.has_permission(text, text, uuid) from public;
grant  execute on function public.has_permission(text, text, uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 6. get_my_access — o que o app carrega uma vez após o login
--
-- Devolve o vínculo + a lista achatada "recurso:acao". Para admin, a
-- lista é gerada na hora a partir de recurso_acoes, então nunca fica
-- defasada. Retorna null quando o usuário não tem vínculo.
-- ---------------------------------------------------------------------
create or replace function public.get_my_access(
  p_empresa_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with vinculo as (
    select ue.empresa_id,
           pa.id       as perfil_id,
           pa.nome     as perfil_nome,
           pa.is_admin
    from public.usuarios_empresas ue
    join public.perfis_acesso pa on pa.id = ue.perfil_id
    where ue.usuario_id = auth.uid()
      and (p_empresa_id is null or ue.empresa_id = p_empresa_id)
    order by ue.empresa_id
    limit 1
  ),
  perms as (
    select ra.recurso_codigo, ra.acao_codigo
    from vinculo v
    cross join public.recurso_acoes ra
    where v.is_admin

    union

    select pp.recurso_codigo, pp.acao_codigo
    from vinculo v
    join public.perfil_permissoes pp on pp.perfil_id = v.perfil_id
    where not v.is_admin
  )
  select jsonb_build_object(
    'empresa_id',  v.empresa_id,
    'perfil_id',   v.perfil_id,
    'perfil_nome', v.perfil_nome,
    'is_admin',    v.is_admin,
    'permissoes',  coalesce(
      (select jsonb_agg(p.recurso_codigo || ':' || p.acao_codigo order by 1) from perms p),
      '[]'::jsonb
    )
  )
  from vinculo v;
$$;

revoke all     on function public.get_my_access(uuid) from public;
grant  execute on function public.get_my_access(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 7. minhas_empresas — para o seletor de empresa no app
-- ---------------------------------------------------------------------
create or replace function public.minhas_empresas()
returns table (empresa_id uuid, perfil_nome text, is_admin boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select ue.empresa_id, pa.nome, pa.is_admin
  from public.usuarios_empresas ue
  join public.perfis_acesso pa on pa.id = ue.perfil_id
  where ue.usuario_id = auth.uid()
  order by pa.nome;
$$;

revoke all     on function public.minhas_empresas() from public;
grant  execute on function public.minhas_empresas() to authenticated;


-- ---------------------------------------------------------------------
-- 8. OPCIONAL E DESTRUTIVO — limpar o snapshot antigo
--
-- As 60 linhas que o seed criou para o Administrador agora são
-- redundantes: a flag já concede tudo. Manter não quebra nada, mas
-- confunde quem for auditar as permissões depois. Descomente só quando
-- tiver confirmado que a flag está funcionando em produção.
-- ---------------------------------------------------------------------
-- delete from public.perfil_permissoes pp
-- using public.perfis_acesso pa
-- where pa.id = pp.perfil_id
--   and pa.is_admin;


-- =====================================================================
-- EXEMPLO DE USO EM RLS (não faz parte desta migration)
--
-- alter table public.documentos enable row level security;
--
-- create policy "documentos: ler"
--   on public.documentos for select to authenticated
--   using (public.has_permission('documentos', 'ler', empresa_id));
--
-- create policy "documentos: criar"
--   on public.documentos for insert to authenticated
--   with check (public.has_permission('documentos', 'criar', empresa_id));
--
-- create policy "documentos: editar"
--   on public.documentos for update to authenticated
--   using      (public.has_permission('documentos', 'editar', empresa_id))
--   with check (public.has_permission('documentos', 'editar', empresa_id));
--
-- Sempre passe a coluna empresa_id da própria linha. Sem ela, um usuário
-- com permissão na empresa A enxergaria linhas da empresa B.
-- =====================================================================
