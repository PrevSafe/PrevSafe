-- =====================================================================
-- PrevSafe :: Matriz de Obrigatoriedade de Treinamentos (Módulo 7 — S-2245)
-- Define, por cargo, quais treinamentos de segurança são obrigatórios
-- (ex.: NR-35 para trabalho em altura, NR-10 para eletricidade) e a
-- periodicidade de reciclagem. Cruza com a tabela treinamentos, já
-- existente, que registra as realizações efetivas por funcionário.
-- =====================================================================

create table if not exists treinamentos_obrigatorios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  cargo_id uuid not null references cargos(id) on delete cascade,
  norma_regulamentadora varchar(20) not null,
  nome_treinamento varchar(150) not null,
  carga_horaria smallint check (carga_horaria is null or carga_horaria > 0),
  periodicidade_meses smallint not null check (periodicidade_meses > 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, cargo_id, norma_regulamentadora)
);

create index if not exists idx_treinamentos_obrigatorios_empresa on treinamentos_obrigatorios(empresa_id);
create index if not exists idx_treinamentos_obrigatorios_cargo on treinamentos_obrigatorios(cargo_id);

drop trigger if exists trg_treinamentos_obrigatorios_atualizado on treinamentos_obrigatorios;
create trigger trg_treinamentos_obrigatorios_atualizado before update on treinamentos_obrigatorios
  for each row execute function public.set_atualizado_em();

alter table treinamentos_obrigatorios enable row level security;

drop policy if exists treinamentos_obrigatorios_select on treinamentos_obrigatorios;
drop policy if exists treinamentos_obrigatorios_insert on treinamentos_obrigatorios;
drop policy if exists treinamentos_obrigatorios_update on treinamentos_obrigatorios;
drop policy if exists treinamentos_obrigatorios_delete on treinamentos_obrigatorios;

create policy treinamentos_obrigatorios_select on treinamentos_obrigatorios for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'dds', 'visualizar')
);
create policy treinamentos_obrigatorios_insert on treinamentos_obrigatorios for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'dds', 'editar')
);
create policy treinamentos_obrigatorios_update on treinamentos_obrigatorios for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'dds', 'editar')
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'dds', 'editar')
  );
create policy treinamentos_obrigatorios_delete on treinamentos_obrigatorios for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'dds', 'excluir')
);

-- ---------------------------------------------------------------------
-- Vínculo do treinamento realizado à norma que ele atende, para que a
-- view de pendências abaixo saiba comparar "o que foi feito" com
-- "o que a matriz exige" pelo mesmo código de norma.
-- ---------------------------------------------------------------------

alter table treinamentos
  add column if not exists norma_regulamentadora varchar(20);

-- ---------------------------------------------------------------------
-- View de pendências: para cada funcionário com lotação vigente,
-- cruza a matriz de obrigatoriedade do seu cargo com o treinamento
-- realizado mais recente da mesma norma, e marca ausente/vencido.
-- ---------------------------------------------------------------------

create or replace view treinamentos_pendencias as
select
  fl.empresa_id,
  fl.funcionario_id,
  tobr.id as treinamento_obrigatorio_id,
  tobr.norma_regulamentadora,
  tobr.nome_treinamento,
  tobr.periodicidade_meses,
  ultimo.id as ultimo_treinamento_id,
  ultimo.data_realizacao,
  ultimo.data_validade,
  case
    when ultimo.id is null then 'ausente'
    when ultimo.data_validade is not null and ultimo.data_validade < current_date then 'vencido'
    else 'em_dia'
  end as situacao
from funcionarios_lotacoes fl
join lotacoes l on l.id = fl.lotacao_id
join treinamentos_obrigatorios tobr
  on tobr.empresa_id = fl.empresa_id and tobr.cargo_id = l.cargo_id
left join lateral (
  select t.id, t.data_realizacao, t.data_validade
  from treinamentos t
  where t.funcionario_id = fl.funcionario_id
    and t.norma_regulamentadora = tobr.norma_regulamentadora
  order by t.data_realizacao desc
  limit 1
) ultimo on true
where fl.data_fim is null;

insert into recursos (codigo, nome, modulo, ordem) values
  ('treinamentos_obrigatorios', 'Matriz de Treinamentos Obrigatórios', 'nucleo', 68)
on conflict (codigo) do update set nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into recurso_acoes (recurso_codigo, acao_codigo)
select r.codigo, a.codigo from recursos r cross join acoes a
where r.codigo in ('treinamentos_obrigatorios') and a.codigo in ('visualizar', 'criar', 'editar', 'excluir')
on conflict do nothing;
