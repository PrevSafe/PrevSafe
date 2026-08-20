-- =====================================================================
-- PrevSafe :: Controle de acesso granular — FUNDAÇÃO
-- Cria o modelo de dados (catálogo de recursos/ações, perfis customizáveis
-- por empresa, matriz de permissões, escopo de unidades por usuário) e a
-- tela de administração que o gerencia.
--
-- IMPORTANTE — esta migration é só o modelo + a tela. Nenhuma policy de
-- RLS existente muda: o papel antigo (admin/tecnico/inspetor/leitura) em
-- usuarios_empresas.papel continua sendo a única coisa que protege as
-- tabelas de domínio. tem_permissao()/unidade_visivel() ficam prontas
-- para uso, mas nenhuma policy chama elas ainda — isso é uma etapa
-- futura, depois que o modelo novo estiver validado em produção.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Catálogo de recursos — definido pelo código, igual para toda empresa
-- ---------------------------------------------------------------------

create table if not exists recursos (
  codigo varchar(60) primary key,
  nome varchar(120) not null,
  modulo varchar(40) not null check (modulo in ('nucleo','cipa')),
  ordem smallint not null default 0
);

insert into recursos (codigo, nome, modulo, ordem) values
  ('dashboard',        'Painel',                      'nucleo', 0),
  ('unidades',         'Unidades',                     'nucleo', 10),
  ('setores',          'Setores',                      'nucleo', 20),
  ('cargos',           'Cargos',                       'nucleo', 30),
  ('estrutura',        'Estrutura Organizacional',     'nucleo', 40),
  ('funcionarios',     'Funcionários',                 'nucleo', 50),
  ('cipa.eleicoes',    'Eleições CIPA',                'cipa',   100),
  ('cipa.eleitores',   'Eleitores CIPA',                'cipa',   110),
  ('cipa.candidatos',  'Candidatos CIPA',               'cipa',   120),
  ('cipa.comissao',    'Comissão eleitoral CIPA',       'cipa',   130),
  ('cipa.quarentena',  'Quarentena CIPA',                'cipa',   140),
  ('cipa.cartaz',      'Cartaz do mural CIPA',          'cipa',   150),
  ('cipa.apuracao',    'Apuração e atas CIPA',          'cipa',   160)
on conflict (codigo) do update set
  nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;


-- ---------------------------------------------------------------------
-- 2) Catálogo de ações — também global
-- ---------------------------------------------------------------------

create table if not exists acoes (
  codigo varchar(30) primary key,
  nome varchar(60) not null
);

insert into acoes (codigo, nome) values
  ('visualizar', 'Visualizar'),
  ('criar',      'Criar'),
  ('editar',     'Editar'),
  ('excluir',    'Excluir'),
  ('aprovar',    'Aprovar')
on conflict (codigo) do update set nome = excluded.nome;


-- ---------------------------------------------------------------------
-- 3) Quais ações fazem sentido em cada recurso
-- ---------------------------------------------------------------------

create table if not exists recurso_acoes (
  recurso_codigo varchar(60) references recursos(codigo) on delete cascade,
  acao_codigo varchar(30) references acoes(codigo) on delete cascade,
  primary key (recurso_codigo, acao_codigo)
);

-- CRUD completo: todo o núcleo + os recursos CIPA de cadastro/gestão.
insert into recurso_acoes (recurso_codigo, acao_codigo)
select r.codigo, a.codigo
from recursos r
cross join acoes a
where a.codigo in ('visualizar','criar','editar','excluir')
  and (r.modulo = 'nucleo' or r.codigo in ('cipa.eleicoes','cipa.eleitores','cipa.candidatos','cipa.comissao'))
on conflict do nothing;

-- Quarentena: só analisa (vê) e aprova/rejeita — não é um cadastro CRUD.
insert into recurso_acoes (recurso_codigo, acao_codigo) values
  ('cipa.quarentena', 'visualizar'),
  ('cipa.quarentena', 'aprovar')
on conflict do nothing;

-- Cartaz do mural: só leitura (impressão/exibição).
insert into recurso_acoes (recurso_codigo, acao_codigo) values
  ('cipa.cartaz', 'visualizar')
on conflict do nothing;

-- Apuração: vê o resultado e gera a ata (criar), sem editar/excluir.
insert into recurso_acoes (recurso_codigo, acao_codigo) values
  ('cipa.apuracao', 'visualizar'),
  ('cipa.apuracao', 'criar')
on conflict do nothing;


-- ---------------------------------------------------------------------
-- 4) Perfis de acesso — customizáveis, por empresa
-- ---------------------------------------------------------------------

create table if not exists perfis_acesso (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome varchar(80) not null,
  descricao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, nome)
);

create index if not exists idx_perfis_acesso_empresa on perfis_acesso(empresa_id);

drop trigger if exists trg_perfis_acesso_atualizado on perfis_acesso;
create trigger trg_perfis_acesso_atualizado before update on perfis_acesso
  for each row execute function public.set_atualizado_em();


-- ---------------------------------------------------------------------
-- 5) Matriz de permissões — presença da linha = permitido
-- ---------------------------------------------------------------------

create table if not exists perfil_permissoes (
  perfil_id uuid references perfis_acesso(id) on delete cascade,
  recurso_codigo varchar(60) references recursos(codigo) on delete cascade,
  acao_codigo varchar(30) references acoes(codigo) on delete cascade,
  primary key (perfil_id, recurso_codigo, acao_codigo)
);


-- ---------------------------------------------------------------------
-- 6) usuarios_empresas ganha o vínculo com o perfil — nullable, convive
--    com a coluna `papel`, que segue sendo a fonte de verdade do RLS.
-- ---------------------------------------------------------------------

alter table usuarios_empresas add column if not exists perfil_id uuid
  references perfis_acesso(id) on delete set null;

create index if not exists idx_usuarios_empresas_perfil on usuarios_empresas(perfil_id);


-- ---------------------------------------------------------------------
-- 7) Escopo de unidades por usuário — padrão NEGADO (ausência = não vê)
-- ---------------------------------------------------------------------

create table if not exists usuario_unidades (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  unidade_id uuid not null references unidades(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (usuario_id, unidade_id)
);

create index if not exists idx_usuario_unidades_usuario on usuario_unidades(usuario_id);
create index if not exists idx_usuario_unidades_empresa on usuario_unidades(empresa_id);


-- ---------------------------------------------------------------------
-- 8) Funções que a próxima etapa vai plugar no RLS. Prontas, sem uso
--    ainda por nenhuma policy de domínio.
-- ---------------------------------------------------------------------

create or replace function public.tem_permissao(
  p_usuario uuid, p_empresa uuid, p_recurso text, p_acao text
) returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1
    from usuarios_empresas ue
    join perfil_permissoes pp on pp.perfil_id = ue.perfil_id
    where ue.usuario_id = p_usuario
      and ue.empresa_id = p_empresa
      and ue.ativo = true
      and pp.recurso_codigo = p_recurso
      and pp.acao_codigo = p_acao
  );
$fn$;

create or replace function public.unidade_visivel(
  p_usuario uuid, p_unidade_id uuid
) returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from usuario_unidades
    where usuario_id = p_usuario and unidade_id = p_unidade_id
  );
$fn$;

grant execute on function public.tem_permissao(uuid, uuid, text, text) to authenticated;
grant execute on function public.unidade_visivel(uuid, uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 9) MIGRAÇÃO DE DADOS — crítica: preserva o acesso que cada vínculo já
--    tem hoje, para ninguém ficar travado no primeiro deploy.
--
--    Para cada empresa com vínculos existentes:
--    - cria os 4 perfis padrão, com a matriz de permissões replicando a
--      semântica atual de cada papel (admin = tudo; técnico/inspetor =
--      visualizar/criar/editar, sem excluir; leitura = só visualizar);
--    - associa perfil_id em cada vínculo conforme o papel atual dele;
--    - libera, em usuario_unidades, TODAS as unidades da empresa para
--      cada vínculo — reproduzindo o acesso que a pessoa já tem hoje via
--      empresa_id. Só usuários criados DEPOIS desta migration começam
--      sem nenhuma unidade liberada.
-- ---------------------------------------------------------------------

do $mig$
declare
  v_empresa record;
  v_admin uuid;
  v_tecnico uuid;
  v_inspetor uuid;
  v_leitura uuid;
begin
  for v_empresa in select distinct empresa_id from usuarios_empresas loop

    insert into perfis_acesso (empresa_id, nome, descricao) values
      (v_empresa.empresa_id, 'Administrador', 'Acesso completo a todos os recursos.'),
      (v_empresa.empresa_id, 'Técnico',       'Visualiza, cria e edita. Não exclui.'),
      (v_empresa.empresa_id, 'Inspetor',      'Visualiza, cria e edita. Não exclui.'),
      (v_empresa.empresa_id, 'Leitura',       'Somente visualização.')
    on conflict (empresa_id, nome) do nothing;

    select id into v_admin    from perfis_acesso where empresa_id = v_empresa.empresa_id and nome = 'Administrador';
    select id into v_tecnico  from perfis_acesso where empresa_id = v_empresa.empresa_id and nome = 'Técnico';
    select id into v_inspetor from perfis_acesso where empresa_id = v_empresa.empresa_id and nome = 'Inspetor';
    select id into v_leitura  from perfis_acesso where empresa_id = v_empresa.empresa_id and nome = 'Leitura';

    insert into perfil_permissoes (perfil_id, recurso_codigo, acao_codigo)
    select v_admin, ra.recurso_codigo, ra.acao_codigo from recurso_acoes ra
    on conflict do nothing;

    insert into perfil_permissoes (perfil_id, recurso_codigo, acao_codigo)
    select v_tecnico, ra.recurso_codigo, ra.acao_codigo from recurso_acoes ra
    where ra.acao_codigo in ('visualizar','criar','editar')
    on conflict do nothing;

    insert into perfil_permissoes (perfil_id, recurso_codigo, acao_codigo)
    select v_inspetor, ra.recurso_codigo, ra.acao_codigo from recurso_acoes ra
    where ra.acao_codigo in ('visualizar','criar','editar')
    on conflict do nothing;

    insert into perfil_permissoes (perfil_id, recurso_codigo, acao_codigo)
    select v_leitura, ra.recurso_codigo, ra.acao_codigo from recurso_acoes ra
    where ra.acao_codigo = 'visualizar'
    on conflict do nothing;

    update usuarios_empresas ue
    set perfil_id = case ue.papel
      when 'admin'    then v_admin
      when 'tecnico'  then v_tecnico
      when 'inspetor' then v_inspetor
      when 'leitura'  then v_leitura
    end
    where ue.empresa_id = v_empresa.empresa_id and ue.perfil_id is null;

    insert into usuario_unidades (usuario_id, empresa_id, unidade_id)
    select ue.usuario_id, ue.empresa_id, u.id
    from usuarios_empresas ue
    join unidades u on u.empresa_id = ue.empresa_id
    where ue.empresa_id = v_empresa.empresa_id
    on conflict (usuario_id, unidade_id) do nothing;

  end loop;
end;
$mig$;


-- ---------------------------------------------------------------------
-- 10) RLS das tabelas novas.
--     Leitura: authenticated dentro da própria empresa.
--     Escrita: só quem tem hoje o papel 'admin' — temporário, a tela de
--     administração desta etapa é a única porta de entrada, então a
--     trava atual do RLS (baseada no papel antigo) é suficiente por ora.
-- ---------------------------------------------------------------------

-- Catálogos globais — sem empresa_id, leitura livre para authenticated.
-- Escrita continua só via migration (nenhuma policy de INSERT/UPDATE/DELETE).
alter table recursos enable row level security;
drop policy if exists recursos_select on recursos;
create policy recursos_select on recursos for select to authenticated using (true);

alter table acoes enable row level security;
drop policy if exists acoes_select on acoes;
create policy acoes_select on acoes for select to authenticated using (true);

alter table recurso_acoes enable row level security;
drop policy if exists recurso_acoes_select on recurso_acoes;
create policy recurso_acoes_select on recurso_acoes for select to authenticated using (true);

-- Perfis de acesso
alter table perfis_acesso enable row level security;

drop policy if exists perfis_acesso_select on perfis_acesso;
create policy perfis_acesso_select on perfis_acesso for select to authenticated
  using (empresa_id in (select auth_empresas_ids()));

drop policy if exists perfis_acesso_write on perfis_acesso;
create policy perfis_acesso_write on perfis_acesso for all to authenticated
  using (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) = 'admin')
  with check (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) = 'admin');

-- Matriz de permissões — sem empresa_id direto, escopo via perfis_acesso.
alter table perfil_permissoes enable row level security;

drop policy if exists perfil_permissoes_select on perfil_permissoes;
create policy perfil_permissoes_select on perfil_permissoes for select to authenticated
  using (exists (
    select 1 from perfis_acesso pa
    where pa.id = perfil_permissoes.perfil_id
      and pa.empresa_id in (select auth_empresas_ids())
  ));

drop policy if exists perfil_permissoes_write on perfil_permissoes;
create policy perfil_permissoes_write on perfil_permissoes for all to authenticated
  using (exists (
    select 1 from perfis_acesso pa
    where pa.id = perfil_permissoes.perfil_id
      and pa.empresa_id in (select auth_empresas_ids())
      and auth_papel_na_empresa(pa.empresa_id) = 'admin'
  ))
  with check (exists (
    select 1 from perfis_acesso pa
    where pa.id = perfil_permissoes.perfil_id
      and pa.empresa_id in (select auth_empresas_ids())
      and auth_papel_na_empresa(pa.empresa_id) = 'admin'
  ));

-- Escopo de unidades por usuário
alter table usuario_unidades enable row level security;

drop policy if exists usuario_unidades_select on usuario_unidades;
create policy usuario_unidades_select on usuario_unidades for select to authenticated
  using (empresa_id in (select auth_empresas_ids()));

drop policy if exists usuario_unidades_write on usuario_unidades;
create policy usuario_unidades_write on usuario_unidades for all to authenticated
  using (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) = 'admin')
  with check (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) = 'admin');

-- usuarios_empresas já tem RLS (migration 20260816): cada um só vê o
-- próprio vínculo, e não havia nenhuma policy de escrita. A tela de
-- administração desta etapa precisa listar TODOS os vínculos da empresa
-- e gravar perfil_id neles — isso é aditivo (novas policies, nenhuma
-- removida) e trocado só por admin da própria empresa.
drop policy if exists usuarios_empresas_select_admin on usuarios_empresas;
create policy usuarios_empresas_select_admin on usuarios_empresas for select to authenticated
  using (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) = 'admin');

drop policy if exists usuarios_empresas_update_admin on usuarios_empresas;
create policy usuarios_empresas_update_admin on usuarios_empresas for update to authenticated
  using (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) = 'admin')
  with check (empresa_id in (select auth_empresas_ids())
         and auth_papel_na_empresa(empresa_id) = 'admin');
