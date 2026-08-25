-- =====================================================================
-- PrevSafe :: Rede Credenciada (Módulo 1 — clínicas parceiras)
-- Cadastro de clínicas parceiras por região para realização de exames
-- complementares externos (S-2220), com catálogo de procedimentos que
-- cada clínica realiza e o valor de repasse acordado.
--
-- Escopo por empresa_id, como todo o restante do núcleo — o modelo de
-- rede compartilhada entre todos os clientes de uma mesma consultoria
-- fica para quando existir uma camada de acesso por consultoria_id
-- (hoje o RLS só resolve vínculo usuário->empresa via usuarios_empresas).
-- =====================================================================

create table if not exists clinicas_credenciadas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome_fantasia varchar(150) not null,
  razao_social varchar(255),
  cnpj varchar(14) check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  regiao_uf char(2) not null,
  regiao_cidade varchar(120) not null,
  endereco text,
  telefone varchar(20),
  email varchar(255),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_clinicas_credenciadas_empresa on clinicas_credenciadas(empresa_id, ativo);
create index if not exists idx_clinicas_credenciadas_regiao on clinicas_credenciadas(regiao_uf, regiao_cidade);

drop trigger if exists trg_clinicas_credenciadas_atualizado on clinicas_credenciadas;
create trigger trg_clinicas_credenciadas_atualizado before update on clinicas_credenciadas
  for each row execute function public.set_atualizado_em();

alter table clinicas_credenciadas enable row level security;

drop policy if exists clinicas_credenciadas_select on clinicas_credenciadas;
drop policy if exists clinicas_credenciadas_insert on clinicas_credenciadas;
drop policy if exists clinicas_credenciadas_update on clinicas_credenciadas;
drop policy if exists clinicas_credenciadas_delete on clinicas_credenciadas;

create policy clinicas_credenciadas_select on clinicas_credenciadas for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'credenciados', 'visualizar')
);
create policy clinicas_credenciadas_insert on clinicas_credenciadas for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'credenciados', 'criar')
);
create policy clinicas_credenciadas_update on clinicas_credenciadas for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'credenciados', 'editar')
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'credenciados', 'editar')
  );
create policy clinicas_credenciadas_delete on clinicas_credenciadas for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'credenciados', 'excluir')
);


-- ---------------------------------------------------------------------
-- Catálogo de procedimentos (T27) que cada clínica realiza, com o
-- valor de repasse acordado — usado na conciliação financeira
-- (financeiro/faturamento) quando a clínica emite a fatura de exames.
-- ---------------------------------------------------------------------

create table if not exists clinicas_credenciadas_procedimentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas_credenciadas(id) on delete cascade,
  procedimento_codigo varchar(10) not null references procedimentos_t27(codigo_esocial),
  valor_repasse numeric(10, 2) not null check (valor_repasse >= 0),
  criado_em timestamptz not null default now(),
  unique (clinica_id, procedimento_codigo)
);

create index if not exists idx_clinicas_credenciadas_proc_clinica on clinicas_credenciadas_procedimentos(clinica_id);

alter table clinicas_credenciadas_procedimentos enable row level security;

drop policy if exists clinicas_credenciadas_procedimentos_select on clinicas_credenciadas_procedimentos;
drop policy if exists clinicas_credenciadas_procedimentos_insert on clinicas_credenciadas_procedimentos;
drop policy if exists clinicas_credenciadas_procedimentos_update on clinicas_credenciadas_procedimentos;
drop policy if exists clinicas_credenciadas_procedimentos_delete on clinicas_credenciadas_procedimentos;

create policy clinicas_credenciadas_procedimentos_select on clinicas_credenciadas_procedimentos for select to authenticated using (
  exists (
    select 1 from clinicas_credenciadas c
    where c.id = clinica_id
      and c.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), c.empresa_id, 'credenciados', 'visualizar')
  )
);
create policy clinicas_credenciadas_procedimentos_insert on clinicas_credenciadas_procedimentos for insert to authenticated with check (
  exists (
    select 1 from clinicas_credenciadas c
    where c.id = clinica_id
      and c.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), c.empresa_id, 'credenciados', 'editar')
  )
);
create policy clinicas_credenciadas_procedimentos_update on clinicas_credenciadas_procedimentos for update to authenticated
  using (
    exists (
      select 1 from clinicas_credenciadas c
      where c.id = clinica_id
        and c.empresa_id in (select auth_empresas_ids())
        and tem_permissao(auth.uid(), c.empresa_id, 'credenciados', 'editar')
    )
  )
  with check (
    exists (
      select 1 from clinicas_credenciadas c
      where c.id = clinica_id
        and c.empresa_id in (select auth_empresas_ids())
        and tem_permissao(auth.uid(), c.empresa_id, 'credenciados', 'editar')
    )
  );
create policy clinicas_credenciadas_procedimentos_delete on clinicas_credenciadas_procedimentos for delete to authenticated using (
  exists (
    select 1 from clinicas_credenciadas c
    where c.id = clinica_id
      and c.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), c.empresa_id, 'credenciados', 'excluir')
  )
);

insert into recursos (codigo, nome, modulo, ordem) values
  ('credenciados', 'Rede Credenciada', 'nucleo', 65)
on conflict (codigo) do update set nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into recurso_acoes (recurso_codigo, acao_codigo)
select r.codigo, a.codigo from recursos r cross join acoes a
where r.codigo in ('credenciados') and a.codigo in ('visualizar', 'criar', 'editar', 'excluir')
on conflict do nothing;
