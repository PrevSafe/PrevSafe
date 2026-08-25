-- =====================================================================
-- PrevSafe :: Equipamentos de Medição (Módulo 3 — engenharia de segurança)
-- Cadastro de decibelímetros, dosímetros, termômetros etc. usados nas
-- medições de campo do PGR/LTCAT, com controle de calibração e
-- certificado. Cada linha de riscos_inventario pode referenciar o
-- equipamento usado na medição que embasou a severidade/probabilidade.
-- =====================================================================

create table if not exists equipamentos_medicao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  tipo varchar(30) not null
    check (tipo in ('decibelimetro', 'dosimetro', 'termometro', 'luximetro', 'outro')),
  identificacao varchar(100) not null,
  numero_serie varchar(100),
  fabricante varchar(150),
  data_calibracao date,
  data_validade_calibracao date,
  certificado_numero varchar(100),
  certificado_url text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint chk_equipamentos_medicao_calibracao
    check (data_validade_calibracao is null or data_calibracao is null or data_validade_calibracao >= data_calibracao)
);

create index if not exists idx_equipamentos_medicao_empresa on equipamentos_medicao(empresa_id, ativo);

drop trigger if exists trg_equipamentos_medicao_atualizado on equipamentos_medicao;
create trigger trg_equipamentos_medicao_atualizado before update on equipamentos_medicao
  for each row execute function public.set_atualizado_em();

alter table equipamentos_medicao enable row level security;

drop policy if exists equipamentos_medicao_select on equipamentos_medicao;
drop policy if exists equipamentos_medicao_insert on equipamentos_medicao;
drop policy if exists equipamentos_medicao_update on equipamentos_medicao;
drop policy if exists equipamentos_medicao_delete on equipamentos_medicao;

create policy equipamentos_medicao_select on equipamentos_medicao for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'equipamentos_medicao', 'visualizar')
);
create policy equipamentos_medicao_insert on equipamentos_medicao for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'equipamentos_medicao', 'criar')
);
create policy equipamentos_medicao_update on equipamentos_medicao for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'equipamentos_medicao', 'editar')
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'equipamentos_medicao', 'editar')
  );
create policy equipamentos_medicao_delete on equipamentos_medicao for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'equipamentos_medicao', 'excluir')
);

alter table riscos_inventario
  add column if not exists equipamento_medicao_id uuid references equipamentos_medicao(id) on delete set null;

create index if not exists idx_riscos_inventario_equipamento on riscos_inventario(equipamento_medicao_id);

insert into recursos (codigo, nome, modulo, ordem) values
  ('equipamentos_medicao', 'Equipamentos de Medição', 'nucleo', 66)
on conflict (codigo) do update set nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into recurso_acoes (recurso_codigo, acao_codigo)
select r.codigo, a.codigo from recursos r cross join acoes a
where r.codigo in ('equipamentos_medicao') and a.codigo in ('visualizar', 'criar', 'editar', 'excluir')
on conflict do nothing;
