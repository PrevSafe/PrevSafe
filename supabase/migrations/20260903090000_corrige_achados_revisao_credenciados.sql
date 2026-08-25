-- =====================================================================
-- PrevSafe :: correções encontradas na revisão de código do Módulo 1
-- (Rede Credenciada) e do módulo de Treinamentos Obrigatórios.
--
-- 1) treinamentos_obrigatorios: as políticas de RLS checavam o recurso
--    'dds' em vez do recurso 'treinamentos_obrigatorios' que a própria
--    migration 20260903050000 registrou em recursos/recurso_acoes —
--    concessões feitas na tela de Controle de Acessos para
--    'treinamentos_obrigatorios' não tinham efeito nenhum.
-- 2) clinicas_credenciadas.cnpj tinha checagem de formato mas nenhuma
--    constraint de unicidade — o front-end já trata o erro 23505 de
--    duplicidade, mas o banco permitia duplicatas.
-- 3) Índices que faltavam nas FKs mais consultadas no fluxo de
--    conciliação financeira.
-- =====================================================================

drop policy if exists treinamentos_obrigatorios_select on treinamentos_obrigatorios;
drop policy if exists treinamentos_obrigatorios_insert on treinamentos_obrigatorios;
drop policy if exists treinamentos_obrigatorios_update on treinamentos_obrigatorios;
drop policy if exists treinamentos_obrigatorios_delete on treinamentos_obrigatorios;

create policy treinamentos_obrigatorios_select on treinamentos_obrigatorios for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'treinamentos_obrigatorios', 'visualizar')
);
create policy treinamentos_obrigatorios_insert on treinamentos_obrigatorios for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'treinamentos_obrigatorios', 'criar')
);
create policy treinamentos_obrigatorios_update on treinamentos_obrigatorios for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'treinamentos_obrigatorios', 'editar')
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'treinamentos_obrigatorios', 'editar')
  );
create policy treinamentos_obrigatorios_delete on treinamentos_obrigatorios for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'treinamentos_obrigatorios', 'excluir')
);

create unique index if not exists clinicas_credenciadas_cnpj_uk
  on clinicas_credenciadas (cnpj) where cnpj is not null;

create index if not exists idx_faturas_plano on faturas(plano_id);
create index if not exists idx_repasses_agenda on repasses_clinicas_credenciadas(agenda_medica_id)
  where agenda_medica_id is not null;
