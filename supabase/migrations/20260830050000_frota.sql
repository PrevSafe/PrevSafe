-- =====================================================================
-- PrevSafe :: Frota e Maquinário
-- Cadastro dos veículos e máquinas/equipamentos da empresa que exigem
-- controle de segurança (NR-12 para máquinas, NRs correlatas para
-- veículos). Uma tabela única cobre os dois tipos, diferenciados por
-- `tipo`, já que o modelo de dados é o mesmo (identificação, status e
-- prazo de manutenção/revisão).
-- =====================================================================

create table if not exists frota (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  unidade_id uuid not null references unidades(id),
  tipo varchar(20) not null check (tipo in ('veiculo','maquina')),
  identificacao varchar(30) not null, -- placa (veículo) ou código/patrimônio (máquina)
  descricao varchar(200) not null, -- modelo/descrição do item
  status varchar(20) not null default 'ativo' check (status in ('ativo','manutencao','inativo')),
  data_ultima_manutencao date,
  data_proxima_manutencao date,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, identificacao)
);

create index if not exists idx_frota_empresa on frota(empresa_id);

drop trigger if exists trg_frota_atualizado on frota;
create trigger trg_frota_atualizado before update on frota
  for each row execute function public.set_atualizado_em();

alter table frota enable row level security;

drop policy if exists frota_select on frota;
drop policy if exists frota_insert on frota;
drop policy if exists frota_update on frota;
drop policy if exists frota_delete on frota;

create policy frota_select on frota for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'frota', 'visualizar')
  and unidade_visivel(auth.uid(), unidade_id)
);
create policy frota_insert on frota for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'frota', 'criar')
  and unidade_visivel(auth.uid(), unidade_id)
);
create policy frota_update on frota for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'frota', 'editar')
    and unidade_visivel(auth.uid(), unidade_id)
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'frota', 'editar')
    and unidade_visivel(auth.uid(), unidade_id)
  );
create policy frota_delete on frota for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'frota', 'excluir')
  and unidade_visivel(auth.uid(), unidade_id)
);


-- ---------------------------------------------------------------------
-- Controle de acesso — recurso 'frota', CRUD completo (mesmo padrão de
-- 'epi'/'funcionarios').
-- ---------------------------------------------------------------------

insert into recursos (codigo, nome, modulo, ordem) values
  ('frota', 'Frota e Maquinário', 'nucleo', 62)
on conflict (codigo) do update set
  nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into recurso_acoes (recurso_codigo, acao_codigo)
select 'frota', a.codigo from acoes a
where a.codigo in ('visualizar','criar','editar','excluir')
on conflict do nothing;
