-- =====================================================================
-- PrevSafe :: Controle de ASO (NR-7) + DDS e Treinamentos (NR-1/NR-6)
--
-- Três tabelas independentes, mesmo padrão de epi_entregas: cada uma
-- ancorada em empresa_id (RLS por empresa) e, quando o registro é de
-- uma pessoa, também em funcionario_id (visibilidade por unidade chega
-- pela própria RLS de funcionarios).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) ASO_EXAMES — exames ocupacionais do PCMSO por funcionário
-- ---------------------------------------------------------------------

create table if not exists aso_exames (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  tipo_exame varchar(20) not null
    check (tipo_exame in ('admissional','periodico','mudanca_funcao','retorno_trabalho','demissional')),
  data_exame date not null default current_date,
  data_vencimento date,
  resultado varchar(10) not null default 'apto' check (resultado in ('apto','inapto')),
  medico_nome varchar(150),
  medico_crm varchar(20),
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_aso_exames_empresa on aso_exames(empresa_id, data_exame desc);
create index if not exists idx_aso_exames_funcionario on aso_exames(funcionario_id);

drop trigger if exists trg_aso_exames_atualizado on aso_exames;
create trigger trg_aso_exames_atualizado before update on aso_exames
  for each row execute function public.set_atualizado_em();

alter table aso_exames enable row level security;

drop policy if exists aso_exames_select on aso_exames;
drop policy if exists aso_exames_insert on aso_exames;
drop policy if exists aso_exames_update on aso_exames;
drop policy if exists aso_exames_delete on aso_exames;

create policy aso_exames_select on aso_exames for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'aso', 'visualizar')
  and exists (select 1 from funcionarios f where f.id = aso_exames.funcionario_id)
);
create policy aso_exames_insert on aso_exames for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'aso', 'criar')
  and exists (select 1 from funcionarios f where f.id = aso_exames.funcionario_id)
);
create policy aso_exames_update on aso_exames for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'aso', 'editar')
    and exists (select 1 from funcionarios f where f.id = aso_exames.funcionario_id)
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'aso', 'editar')
    and exists (select 1 from funcionarios f where f.id = aso_exames.funcionario_id)
  );
create policy aso_exames_delete on aso_exames for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'aso', 'excluir')
  and exists (select 1 from funcionarios f where f.id = aso_exames.funcionario_id)
);


-- ---------------------------------------------------------------------
-- 2) DDS_REGISTROS — diálogo diário/semanal de segurança (registro do
-- encontro; sem lista nominal de presença, só a contagem — quem
-- precisar de presença nominal já tem a lista de treinamento).
-- ---------------------------------------------------------------------

create table if not exists dds_registros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  data date not null default current_date,
  tema varchar(150) not null,
  responsavel varchar(150),
  quantidade_participantes smallint check (quantidade_participantes is null or quantidade_participantes >= 0),
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_dds_registros_empresa on dds_registros(empresa_id, data desc);

drop trigger if exists trg_dds_registros_atualizado on dds_registros;
create trigger trg_dds_registros_atualizado before update on dds_registros
  for each row execute function public.set_atualizado_em();

alter table dds_registros enable row level security;

drop policy if exists dds_registros_select on dds_registros;
drop policy if exists dds_registros_insert on dds_registros;
drop policy if exists dds_registros_update on dds_registros;
drop policy if exists dds_registros_delete on dds_registros;

create policy dds_registros_select on dds_registros for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'dds', 'visualizar')
);
create policy dds_registros_insert on dds_registros for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'dds', 'criar')
);
create policy dds_registros_update on dds_registros for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'dds', 'editar')
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'dds', 'editar')
  );
create policy dds_registros_delete on dds_registros for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'dds', 'excluir')
);


-- ---------------------------------------------------------------------
-- 3) TREINAMENTOS — capacitações formais por funcionário (NR-6, NR-35,
-- NR-33, NR-10, brigada, CIPA etc.), com validade para reciclagem.
-- Mesmo resource 'dds' das reuniões de DDS: são as duas faces do mesmo
-- item de menu ("DDS e Treinamentos") e do mesmo controle de acesso.
-- ---------------------------------------------------------------------

create table if not exists treinamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  nome varchar(150) not null,
  carga_horaria smallint check (carga_horaria is null or carga_horaria > 0),
  data_realizacao date not null default current_date,
  data_validade date,
  instrutor varchar(150),
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_treinamentos_empresa on treinamentos(empresa_id, data_realizacao desc);
create index if not exists idx_treinamentos_funcionario on treinamentos(funcionario_id);

drop trigger if exists trg_treinamentos_atualizado on treinamentos;
create trigger trg_treinamentos_atualizado before update on treinamentos
  for each row execute function public.set_atualizado_em();

alter table treinamentos enable row level security;

drop policy if exists treinamentos_select on treinamentos;
drop policy if exists treinamentos_insert on treinamentos;
drop policy if exists treinamentos_update on treinamentos;
drop policy if exists treinamentos_delete on treinamentos;

create policy treinamentos_select on treinamentos for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'dds', 'visualizar')
  and exists (select 1 from funcionarios f where f.id = treinamentos.funcionario_id)
);
create policy treinamentos_insert on treinamentos for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'dds', 'criar')
  and exists (select 1 from funcionarios f where f.id = treinamentos.funcionario_id)
);
create policy treinamentos_update on treinamentos for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'dds', 'editar')
    and exists (select 1 from funcionarios f where f.id = treinamentos.funcionario_id)
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'dds', 'editar')
    and exists (select 1 from funcionarios f where f.id = treinamentos.funcionario_id)
  );
create policy treinamentos_delete on treinamentos for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'dds', 'excluir')
  and exists (select 1 from funcionarios f where f.id = treinamentos.funcionario_id)
);


-- ---------------------------------------------------------------------
-- 4) Controle de acesso — recursos 'aso' e 'dds', CRUD completo
-- (mesmo padrão de 'epi'). Ficam entre 'funcionarios' (50) e 'epi' (55)
-- e logo depois de 'epi', na mesma ordem em que aparecem no menu.
-- ---------------------------------------------------------------------

insert into recursos (codigo, nome, modulo, ordem) values
  ('aso', 'Controle de ASO', 'nucleo', 52),
  ('dds', 'DDS e Treinamentos', 'nucleo', 56)
on conflict (codigo) do update set
  nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into recurso_acoes (recurso_codigo, acao_codigo)
select r.codigo, a.codigo
from recursos r cross join acoes a
where r.codigo in ('aso', 'dds')
  and a.codigo in ('visualizar','criar','editar','excluir')
on conflict do nothing;
