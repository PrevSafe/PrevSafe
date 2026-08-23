-- =====================================================================
-- PrevSafe :: Controle de ASO (Atestado de Saúde Ocupacional — NR-7/PCMSO)
-- Cada linha é um exame ocupacional realizado por um funcionário
-- (admissional, periódico, retorno ao trabalho, mudança de risco
-- ocupacional ou demissional), com o resultado do médico do trabalho
-- e o prazo até o próximo exame.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ASOS — sem unidade_id direto: a visibilidade por unidade chega via
-- funcionario_id -> funcionarios, cuja própria RLS já filtra por
-- unidade_visivel (mesmo padrão usado em epi_entregas).
-- ---------------------------------------------------------------------

create table if not exists asos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  tipo_exame varchar(30) not null
    check (tipo_exame in ('admissional','periodico','retorno_trabalho','mudanca_risco','demissional')),
  data_exame date not null,
  data_vencimento date,
  resultado varchar(20) not null
    check (resultado in ('apto','inapto','apto_com_restricoes')),
  medico_nome varchar(150),
  medico_crm varchar(20),
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_asos_empresa on asos(empresa_id, data_exame desc);
create index if not exists idx_asos_funcionario on asos(funcionario_id);

drop trigger if exists trg_asos_atualizado on asos;
create trigger trg_asos_atualizado before update on asos
  for each row execute function public.set_atualizado_em();

alter table asos enable row level security;

drop policy if exists asos_select on asos;
drop policy if exists asos_insert on asos;
drop policy if exists asos_update on asos;
drop policy if exists asos_delete on asos;

create policy asos_select on asos for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'aso', 'visualizar')
  and exists (select 1 from funcionarios f where f.id = asos.funcionario_id)
);
create policy asos_insert on asos for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'aso', 'criar')
  and exists (select 1 from funcionarios f where f.id = asos.funcionario_id)
);
create policy asos_update on asos for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'aso', 'editar')
    and exists (select 1 from funcionarios f where f.id = asos.funcionario_id)
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'aso', 'editar')
    and exists (select 1 from funcionarios f where f.id = asos.funcionario_id)
  );
create policy asos_delete on asos for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'aso', 'excluir')
  and exists (select 1 from funcionarios f where f.id = asos.funcionario_id)
);


-- ---------------------------------------------------------------------
-- Controle de acesso — recurso 'aso', CRUD completo (mesmo padrão de
-- 'epi').
-- ---------------------------------------------------------------------

insert into recursos (codigo, nome, modulo, ordem) values
  ('aso', 'Controle de ASO', 'nucleo', 56)
on conflict (codigo) do update set
  nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into recurso_acoes (recurso_codigo, acao_codigo)
select 'aso', a.codigo from acoes a
where a.codigo in ('visualizar','criar','editar','excluir')
on conflict do nothing;
