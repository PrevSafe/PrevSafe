-- =====================================================================
-- PrevSafe :: SST Linter (Fase 1) — auditoria preventiva de
-- consistência entre riscos (GHE), exames do PCMSO e código de agente
-- nocivo do cargo (GFIP), antes do envio ao eSocial.
--
-- Catálogos oficiais T24 (fatores de risco) e T27 (procedimentos do
-- PCMSO) seguem o mesmo padrão de categorias_trabalhador_esocial:
-- tabela global (sem empresa_id), RLS só-leitura, seed fixo no
-- próprio arquivo de migração. Este seed cobre só os pares descritos
-- em sst_linter_validator.py — não é a Tabela 24/27 oficial completa.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) FATORES_RISCO_T24 — catálogo oficial de fatores de risco
-- ---------------------------------------------------------------------

create table if not exists fatores_risco_t24 (
  codigo_esocial varchar(10) primary key,
  descricao text not null,
  tipo_risco varchar(20) not null
    check (tipo_risco in ('fisico','quimico','biologico','ergonomico','acidente')),
  exige_quantificacao boolean not null default false,
  enseja_aposentadoria_especial boolean not null default false
);

alter table fatores_risco_t24 enable row level security;

drop policy if exists fatores_risco_t24_select on fatores_risco_t24;
create policy fatores_risco_t24_select on fatores_risco_t24 for select to authenticated using (true);

insert into fatores_risco_t24 (codigo_esocial, descricao, tipo_risco, exige_quantificacao, enseja_aposentadoria_especial) values
  ('01.01.002', 'Ruído contínuo ou intermitente', 'fisico', true, true),
  ('01.05.001', 'Calor', 'fisico', true, false),
  ('02.01.005', 'Chumbo e seus compostos tóxicos', 'quimico', true, true),
  ('01.18.001', 'Sílica cristalina', 'quimico', true, true),
  ('03.01.004', 'Benzeno e seus compostos', 'quimico', true, true),
  ('01.03.001', 'Radiações ionizantes', 'fisico', true, true)
on conflict (codigo_esocial) do update set
  descricao = excluded.descricao,
  tipo_risco = excluded.tipo_risco,
  exige_quantificacao = excluded.exige_quantificacao,
  enseja_aposentadoria_especial = excluded.enseja_aposentadoria_especial;

-- Código especial: ausência de risco (usado pela regra LNT-S2240-003).
insert into fatores_risco_t24 (codigo_esocial, descricao, tipo_risco, exige_quantificacao, enseja_aposentadoria_especial) values
  ('09.01.001', 'Ausência de risco', 'acidente', false, false)
on conflict (codigo_esocial) do nothing;


-- ---------------------------------------------------------------------
-- 2) PROCEDIMENTOS_T27 — catálogo oficial de exames complementares
-- ---------------------------------------------------------------------

create table if not exists procedimentos_t27 (
  codigo_esocial varchar(10) primary key,
  nome_exame text not null,
  periodicidade_meses smallint check (periodicidade_meses is null or periodicidade_meses > 0)
);

alter table procedimentos_t27 enable row level security;

drop policy if exists procedimentos_t27_select on procedimentos_t27;
create policy procedimentos_t27_select on procedimentos_t27 for select to authenticated using (true);

insert into procedimentos_t27 (codigo_esocial, nome_exame, periodicidade_meses) values
  ('0281', 'Audiometria Tonal', 12),
  ('0001', 'Exame Clínico (Ficha Clínica / ASO)', 12),
  ('1096', 'Chumbo no Sangue (Pb-S)', 6),
  ('1102', 'Ácido Delta-Aminolevulínico Urinário (ALA-U)', 6),
  ('1128', 'RX Tórax OIT', 12),
  ('0476', 'Espirometria', 12),
  ('0512', 'Hemograma Completo', 6)
on conflict (codigo_esocial) do update set
  nome_exame = excluded.nome_exame,
  periodicidade_meses = excluded.periodicidade_meses;


-- ---------------------------------------------------------------------
-- 3) RISCOS_EXAMES_COMPATIBILIDADE — matriz T24 <-> T27
-- ---------------------------------------------------------------------

create table if not exists riscos_exames_compatibilidade (
  fator_risco_codigo varchar(10) not null references fatores_risco_t24(codigo_esocial) on delete cascade,
  procedimento_codigo varchar(10) not null references procedimentos_t27(codigo_esocial) on delete cascade,
  obrigatorio boolean not null default true,
  primary key (fator_risco_codigo, procedimento_codigo)
);

alter table riscos_exames_compatibilidade enable row level security;

drop policy if exists riscos_exames_compatibilidade_select on riscos_exames_compatibilidade;
create policy riscos_exames_compatibilidade_select on riscos_exames_compatibilidade for select to authenticated using (true);

insert into riscos_exames_compatibilidade (fator_risco_codigo, procedimento_codigo) values
  ('01.01.002', '0281'),
  ('01.05.001', '0001'),
  ('02.01.005', '1096'),
  ('02.01.005', '1102'),
  ('01.18.001', '1128'),
  ('01.18.001', '0476'),
  ('03.01.004', '0512'),
  ('01.03.001', '0512')
on conflict (fator_risco_codigo, procedimento_codigo) do nothing;


-- ---------------------------------------------------------------------
-- 4) Elos que faltavam: risco -> catálogo oficial / EPI exigido,
-- e cargo -> GHE (resolve "quais riscos afetam este trabalhador").
-- ---------------------------------------------------------------------

alter table riscos_inventario
  add column if not exists fator_risco_t24_codigo varchar(10) references fatores_risco_t24(codigo_esocial);

alter table riscos_inventario
  add column if not exists epi_id uuid references epis(id);

alter table cargos
  add column if not exists ghe_id uuid references ghes(id);

create index if not exists idx_riscos_inventario_fator_t24 on riscos_inventario(fator_risco_t24_codigo);
create index if not exists idx_cargos_ghe on cargos(ghe_id);


-- ---------------------------------------------------------------------
-- 5) ASO_EXAMES_PROCEDIMENTOS — quais procedimentos da T27 foram
-- efetivamente realizados em cada evento de ASO.
-- ---------------------------------------------------------------------

create table if not exists aso_exames_procedimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  aso_exame_id uuid not null references aso_exames(id) on delete cascade,
  procedimento_codigo varchar(10) not null references procedimentos_t27(codigo_esocial),
  criado_em timestamptz not null default now(),
  unique (aso_exame_id, procedimento_codigo)
);

create index if not exists idx_aso_exames_procedimentos_exame on aso_exames_procedimentos(aso_exame_id);

alter table aso_exames_procedimentos enable row level security;

drop policy if exists aso_exames_procedimentos_select on aso_exames_procedimentos;
drop policy if exists aso_exames_procedimentos_insert on aso_exames_procedimentos;
drop policy if exists aso_exames_procedimentos_update on aso_exames_procedimentos;
drop policy if exists aso_exames_procedimentos_delete on aso_exames_procedimentos;

create policy aso_exames_procedimentos_select on aso_exames_procedimentos for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'aso', 'visualizar')
  and exists (select 1 from aso_exames a where a.id = aso_exames_procedimentos.aso_exame_id)
);
create policy aso_exames_procedimentos_insert on aso_exames_procedimentos for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'aso', 'criar')
  and exists (select 1 from aso_exames a where a.id = aso_exames_procedimentos.aso_exame_id)
);
create policy aso_exames_procedimentos_update on aso_exames_procedimentos for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'aso', 'editar')
    and exists (select 1 from aso_exames a where a.id = aso_exames_procedimentos.aso_exame_id)
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'aso', 'editar')
    and exists (select 1 from aso_exames a where a.id = aso_exames_procedimentos.aso_exame_id)
  );
create policy aso_exames_procedimentos_delete on aso_exames_procedimentos for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'aso', 'excluir')
  and exists (select 1 from aso_exames a where a.id = aso_exames_procedimentos.aso_exame_id)
);
