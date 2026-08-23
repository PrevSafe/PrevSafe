-- =====================================================================
-- PrevSafe :: Gestão PGR/PCMSO (NR-1) — GHEs e Inventário de Riscos
--
-- Modelo: a empresa organiza os trabalhadores em GHEs (Grupos de
-- Exposição Homogênea) — conjuntos de funcionários/cargos/setores
-- expostos aos mesmos riscos ocupacionais. Para cada GHE, cataloga-se
-- um Inventário de Riscos (físico, químico, biológico, ergonômico ou
-- de acidente), com probabilidade x severidade (1-5 cada) definindo o
-- nível de risco.
--
-- A Matriz de Riscos (tela) é só uma leitura agregada de
-- riscos_inventario — não tem tabela própria.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) GHES — grupos de exposição homogênea, por unidade
-- ---------------------------------------------------------------------

create table if not exists ghes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  unidade_id uuid not null references unidades(id),
  nome varchar(150) not null,
  descricao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_ghes_empresa on ghes(empresa_id);

drop trigger if exists trg_ghes_atualizado on ghes;
create trigger trg_ghes_atualizado before update on ghes
  for each row execute function public.set_atualizado_em();

alter table ghes enable row level security;

drop policy if exists ghes_select on ghes;
drop policy if exists ghes_insert on ghes;
drop policy if exists ghes_update on ghes;
drop policy if exists ghes_delete on ghes;

create policy ghes_select on ghes for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'ghe', 'visualizar')
  and unidade_visivel(auth.uid(), unidade_id)
);
create policy ghes_insert on ghes for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'ghe', 'criar')
  and unidade_visivel(auth.uid(), unidade_id)
);
create policy ghes_update on ghes for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'ghe', 'editar')
    and unidade_visivel(auth.uid(), unidade_id)
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'ghe', 'editar')
    and unidade_visivel(auth.uid(), unidade_id)
  );
create policy ghes_delete on ghes for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'ghe', 'excluir')
  and unidade_visivel(auth.uid(), unidade_id)
);


-- ---------------------------------------------------------------------
-- 2) RISCOS_INVENTARIO — riscos identificados por GHE. Sem unidade_id
-- direto: a visibilidade por unidade chega via ghe_id -> ghes, cuja
-- própria RLS já filtra por unidade_visivel (mesmo padrão usado em
-- epi_entregas com funcionarios).
-- ---------------------------------------------------------------------

create table if not exists riscos_inventario (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  ghe_id uuid not null references ghes(id) on delete cascade,
  tipo_risco varchar(20) not null check (tipo_risco in ('fisico','quimico','biologico','ergonomico','acidente')),
  descricao text not null,
  fonte_geradora text,
  medidas_controle text,
  probabilidade smallint not null check (probabilidade between 1 and 5),
  severidade smallint not null check (severidade between 1 and 5),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_riscos_inventario_empresa on riscos_inventario(empresa_id);
create index if not exists idx_riscos_inventario_ghe on riscos_inventario(ghe_id);

drop trigger if exists trg_riscos_inventario_atualizado on riscos_inventario;
create trigger trg_riscos_inventario_atualizado before update on riscos_inventario
  for each row execute function public.set_atualizado_em();

alter table riscos_inventario enable row level security;

drop policy if exists riscos_inventario_select on riscos_inventario;
drop policy if exists riscos_inventario_insert on riscos_inventario;
drop policy if exists riscos_inventario_update on riscos_inventario;
drop policy if exists riscos_inventario_delete on riscos_inventario;

create policy riscos_inventario_select on riscos_inventario for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'riscos', 'visualizar')
  and exists (select 1 from ghes g where g.id = riscos_inventario.ghe_id)
);
create policy riscos_inventario_insert on riscos_inventario for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'riscos', 'criar')
  and exists (select 1 from ghes g where g.id = riscos_inventario.ghe_id)
);
create policy riscos_inventario_update on riscos_inventario for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'riscos', 'editar')
    and exists (select 1 from ghes g where g.id = riscos_inventario.ghe_id)
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'riscos', 'editar')
    and exists (select 1 from ghes g where g.id = riscos_inventario.ghe_id)
  );
create policy riscos_inventario_delete on riscos_inventario for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'riscos', 'excluir')
  and exists (select 1 from ghes g where g.id = riscos_inventario.ghe_id)
);


-- ---------------------------------------------------------------------
-- 3) Controle de acesso — recursos 'ghe' e 'riscos', CRUD completo.
-- A Matriz de Riscos é só leitura de riscos_inventario, então usa a
-- permissão 'riscos' (visualizar) — sem recurso próprio.
-- ---------------------------------------------------------------------

insert into recursos (codigo, nome, modulo, ordem) values
  ('ghe', 'Grupos de Exposição (GHE)', 'nucleo', 60),
  ('riscos', 'Inventário e Matriz de Riscos', 'nucleo', 61)
on conflict (codigo) do update set nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into recurso_acoes (recurso_codigo, acao_codigo)
select r.codigo, a.codigo from recursos r cross join acoes a
where r.codigo in ('ghe','riscos') and a.codigo in ('visualizar','criar','editar','excluir')
on conflict do nothing;
