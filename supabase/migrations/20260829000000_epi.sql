-- =====================================================================
-- PrevSafe :: Entrega de EPI (NR-6)
-- Catálogo de equipamentos (epis) + livro de entregas ao funcionário
-- (epi_entregas). Cada entrega é uma linha própria, para dar
-- rastreabilidade completa do que foi entregue, quando e por quê.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) EPIS — catálogo por empresa (nome + Certificado de Aprovação)
-- ---------------------------------------------------------------------

create table if not exists epis (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome varchar(150) not null,
  ca varchar(10) not null check (ca ~ '^[0-9]+$'),
  vida_util_dias integer check (vida_util_dias is null or vida_util_dias > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, ca)
);

create index if not exists idx_epis_empresa on epis(empresa_id, ativo);

drop trigger if exists trg_epis_atualizado on epis;
create trigger trg_epis_atualizado before update on epis
  for each row execute function public.set_atualizado_em();

alter table epis enable row level security;

drop policy if exists epis_select on epis;
drop policy if exists epis_insert on epis;
drop policy if exists epis_update on epis;
drop policy if exists epis_delete on epis;

create policy epis_select on epis for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'epi', 'visualizar')
);
create policy epis_insert on epis for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'epi', 'criar')
);
create policy epis_update on epis for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'epi', 'editar')
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'epi', 'editar')
  );
create policy epis_delete on epis for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'epi', 'excluir')
);


-- ---------------------------------------------------------------------
-- 2) EPI_ENTREGAS — livro de entrega. Sem unidade_id direto: a
-- visibilidade por unidade chega via funcionario_id -> funcionarios,
-- cuja própria RLS já filtra por unidade_visivel (mesmo padrão usado
-- em funcionarios_lotacoes).
-- ---------------------------------------------------------------------

create table if not exists epi_entregas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  epi_id uuid not null references epis(id) on delete restrict,
  quantidade smallint not null default 1 check (quantidade > 0),
  data_entrega date not null default current_date,
  data_validade date,
  motivo varchar(30) not null default 'entrega_inicial'
    check (motivo in ('entrega_inicial','troca_periodica','substituicao_dano','substituicao_perda')),
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_epi_entregas_empresa on epi_entregas(empresa_id, data_entrega desc);
create index if not exists idx_epi_entregas_funcionario on epi_entregas(funcionario_id);

drop trigger if exists trg_epi_entregas_atualizado on epi_entregas;
create trigger trg_epi_entregas_atualizado before update on epi_entregas
  for each row execute function public.set_atualizado_em();

alter table epi_entregas enable row level security;

drop policy if exists epi_entregas_select on epi_entregas;
drop policy if exists epi_entregas_insert on epi_entregas;
drop policy if exists epi_entregas_update on epi_entregas;
drop policy if exists epi_entregas_delete on epi_entregas;

create policy epi_entregas_select on epi_entregas for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'epi', 'visualizar')
  and exists (select 1 from funcionarios f where f.id = epi_entregas.funcionario_id)
);
create policy epi_entregas_insert on epi_entregas for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'epi', 'criar')
  and exists (select 1 from funcionarios f where f.id = epi_entregas.funcionario_id)
);
create policy epi_entregas_update on epi_entregas for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'epi', 'editar')
    and exists (select 1 from funcionarios f where f.id = epi_entregas.funcionario_id)
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'epi', 'editar')
    and exists (select 1 from funcionarios f where f.id = epi_entregas.funcionario_id)
  );
create policy epi_entregas_delete on epi_entregas for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'epi', 'excluir')
  and exists (select 1 from funcionarios f where f.id = epi_entregas.funcionario_id)
);


-- ---------------------------------------------------------------------
-- 3) Controle de acesso — recurso 'epi', CRUD completo (mesmo padrão
-- de 'funcionarios'/'cargos').
-- ---------------------------------------------------------------------

insert into recursos (codigo, nome, modulo, ordem) values
  ('epi', 'Entrega de EPI', 'nucleo', 55)
on conflict (codigo) do update set
  nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into recurso_acoes (recurso_codigo, acao_codigo)
select 'epi', a.codigo from acoes a
where a.codigo in ('visualizar','criar','editar','excluir')
on conflict do nothing;
