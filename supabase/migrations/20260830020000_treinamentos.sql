-- =====================================================================
-- PrevSafe :: DDS e Treinamentos (NR-1)
-- Registro de eventos de capacitação/conscientização (DDS ou
-- treinamento formal) ministrados a um grupo de funcionários, com
-- lista de presença.
--
-- NOTA DE INTEGRAÇÃO: as tabelas NÃO se chamam `treinamentos` /
-- `treinamento_participantes` porque o banco de produção já tem uma
-- tabela `treinamentos` (por funcionário: nome/carga_horaria/
-- data_realizacao/data_validade/instrutor, sem unidade_id nem lista de
-- presença) e uma `dds_registros`, aplicadas fora deste repositório
-- (não há migration local correspondente). Para não colidir com o
-- schema já em produção, este módulo usa `treinamentos_eventos` /
-- `treinamentos_eventos_participantes`. O código de recurso do
-- catálogo de permissões continua 'treinamentos' (não há conflito
-- nesse nível, é só uma string, e o recurso 'treinamentos' ainda não
-- existe no catálogo hoje — só existe 'dds').
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) TREINAMENTOS_EVENTOS — evento (DDS ou treinamento formal)
-- ---------------------------------------------------------------------

create table if not exists treinamentos_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  unidade_id uuid not null references unidades(id),
  tipo varchar(20) not null check (tipo in ('dds','treinamento')),
  tema varchar(200) not null,
  data_evento date not null,
  carga_horaria_minutos integer check (carga_horaria_minutos is null or carga_horaria_minutos > 0),
  instrutor varchar(150),
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_treinamentos_eventos_empresa on treinamentos_eventos(empresa_id, data_evento desc);

drop trigger if exists trg_treinamentos_eventos_atualizado on treinamentos_eventos;
create trigger trg_treinamentos_eventos_atualizado before update on treinamentos_eventos
  for each row execute function public.set_atualizado_em();

alter table treinamentos_eventos enable row level security;

drop policy if exists treinamentos_eventos_select on treinamentos_eventos;
drop policy if exists treinamentos_eventos_insert on treinamentos_eventos;
drop policy if exists treinamentos_eventos_update on treinamentos_eventos;
drop policy if exists treinamentos_eventos_delete on treinamentos_eventos;

create policy treinamentos_eventos_select on treinamentos_eventos for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'treinamentos', 'visualizar')
  and unidade_visivel(auth.uid(), unidade_id)
);
create policy treinamentos_eventos_insert on treinamentos_eventos for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'treinamentos', 'criar')
  and unidade_visivel(auth.uid(), unidade_id)
);
create policy treinamentos_eventos_update on treinamentos_eventos for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'treinamentos', 'editar')
    and unidade_visivel(auth.uid(), unidade_id)
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'treinamentos', 'editar')
    and unidade_visivel(auth.uid(), unidade_id)
  );
create policy treinamentos_eventos_delete on treinamentos_eventos for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'treinamentos', 'excluir')
  and unidade_visivel(auth.uid(), unidade_id)
);


-- ---------------------------------------------------------------------
-- 2) TREINAMENTOS_EVENTOS_PARTICIPANTES — lista de presença. Sem
-- empresa_id/unidade_id direto: a visibilidade chega via evento_id ->
-- treinamentos_eventos, cuja própria RLS já filtra por empresa/
-- permissão/unidade (mesmo padrão usado em epi_entregas -> funcionarios).
-- ---------------------------------------------------------------------

create table if not exists treinamentos_eventos_participantes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references treinamentos_eventos(id) on delete cascade,
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  presente boolean not null default true,
  unique (evento_id, funcionario_id)
);

create index if not exists idx_treinamentos_eventos_participantes_evento on treinamentos_eventos_participantes(evento_id);

alter table treinamentos_eventos_participantes enable row level security;

drop policy if exists treinamentos_eventos_participantes_select on treinamentos_eventos_participantes;
drop policy if exists treinamentos_eventos_participantes_insert on treinamentos_eventos_participantes;
drop policy if exists treinamentos_eventos_participantes_update on treinamentos_eventos_participantes;
drop policy if exists treinamentos_eventos_participantes_delete on treinamentos_eventos_participantes;

create policy treinamentos_eventos_participantes_select on treinamentos_eventos_participantes for select to authenticated using (
  exists (select 1 from treinamentos_eventos t where t.id = treinamentos_eventos_participantes.evento_id)
);
create policy treinamentos_eventos_participantes_insert on treinamentos_eventos_participantes for insert to authenticated with check (
  exists (select 1 from treinamentos_eventos t where t.id = treinamentos_eventos_participantes.evento_id)
);
create policy treinamentos_eventos_participantes_update on treinamentos_eventos_participantes for update to authenticated
  using (
    exists (select 1 from treinamentos_eventos t where t.id = treinamentos_eventos_participantes.evento_id)
  )
  with check (
    exists (select 1 from treinamentos_eventos t where t.id = treinamentos_eventos_participantes.evento_id)
  );
create policy treinamentos_eventos_participantes_delete on treinamentos_eventos_participantes for delete to authenticated using (
  exists (select 1 from treinamentos_eventos t where t.id = treinamentos_eventos_participantes.evento_id)
);


-- ---------------------------------------------------------------------
-- 3) Controle de acesso — recurso 'treinamentos', CRUD completo
-- (mesmo padrão de 'epi'/'funcionarios').
-- ---------------------------------------------------------------------

insert into recursos (codigo, nome, modulo, ordem) values
  ('treinamentos', 'DDS e Treinamentos', 'nucleo', 57)
on conflict (codigo) do update set
  nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into recurso_acoes (recurso_codigo, acao_codigo)
select 'treinamentos', a.codigo from acoes a
where a.codigo in ('visualizar','criar','editar','excluir')
on conflict do nothing;
