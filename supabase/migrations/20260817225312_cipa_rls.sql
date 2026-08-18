-- =====================================================================
-- Módulo CIPA — RLS
-- Acesso resolvido por auth_empresas_ids(), igual ao resto do PrevSafe.
-- A licença trava a CRIAÇÃO de eleição; nunca a votação em curso.
-- =====================================================================

alter table public.eleicoes          enable row level security;
alter table public.eleicao_eleitores enable row level security;
alter table public.candidatos        enable row level security;
alter table public.urna_quarentena   enable row level security;
alter table public.lista_assinaturas enable row level security;
alter table public.cipa_auditoria    enable row level security;

-- O eleitor é anônimo e fala apenas com as RPCs. Nenhuma tabela para ele.
revoke all on public.eleicoes, public.eleicao_eleitores, public.candidatos,
              public.urna_quarentena, public.lista_assinaturas, public.cipa_auditoria
  from anon;

grant select, insert, update, delete on public.eleicoes, public.candidatos to authenticated;
grant select on public.eleicao_eleitores, public.lista_assinaturas, public.cipa_auditoria to authenticated;

-- 🔒 candidato_escolhido_id fica FORA do GRANT: nem `select *` a devolve.
grant select (
  id, eleicao_id, nome_declarado, cpf_declarado, cargo_declarado,
  ip_dispositivo, user_agent, data_hora, tipo_voto,
  status_analise, analisado_por, analisado_em, motivo_rejeicao
) on public.urna_quarentena to authenticated;

-- ---------------------------------------------------------------------
-- Eleições
-- ---------------------------------------------------------------------
drop policy if exists eleicoes_select on public.eleicoes;
create policy eleicoes_select on public.eleicoes
  for select to authenticated
  using (empresa_id in (select auth_empresas_ids()));

-- Criar eleição exige módulo contratado.
drop policy if exists eleicoes_insert on public.eleicoes;
create policy eleicoes_insert on public.eleicoes
  for insert to authenticated
  with check (
    empresa_id in (select auth_empresas_ids())
    and public.modulo_ativo(empresa_id, 'CIPA')
  );

-- Editar NÃO exige licença vigente: eleição já criada segue seu curso
-- até o fim, mesmo com assinatura vencida. Interromper processo eleitoral
-- por inadimplência não é aceitável.
drop policy if exists eleicoes_update on public.eleicoes;
create policy eleicoes_update on public.eleicoes
  for update to authenticated
  using (empresa_id in (select auth_empresas_ids()))
  with check (empresa_id in (select auth_empresas_ids()));

drop policy if exists eleicoes_delete on public.eleicoes;
create policy eleicoes_delete on public.eleicoes
  for delete to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and status in ('RASCUNHO','AGENDADA')
  );

-- ---------------------------------------------------------------------
-- Tabelas filhas
-- ---------------------------------------------------------------------
create or replace function public.cipa_acesso_eleicao(p_eleicao_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from eleicoes e
    where e.id = p_eleicao_id
      and e.empresa_id in (select auth_empresas_ids())
  );
$$;

grant execute on function public.cipa_acesso_eleicao(uuid) to authenticated;

drop policy if exists candidatos_select on public.candidatos;
create policy candidatos_select on public.candidatos
  for select to authenticated using (public.cipa_acesso_eleicao(eleicao_id));

drop policy if exists candidatos_write on public.candidatos;
create policy candidatos_write on public.candidatos
  for all to authenticated
  using (public.cipa_acesso_eleicao(eleicao_id))
  with check (public.cipa_acesso_eleicao(eleicao_id));

drop policy if exists eleicao_eleitores_select on public.eleicao_eleitores;
create policy eleicao_eleitores_select on public.eleicao_eleitores
  for select to authenticated using (public.cipa_acesso_eleicao(eleicao_id));

drop policy if exists urna_quarentena_select on public.urna_quarentena;
create policy urna_quarentena_select on public.urna_quarentena
  for select to authenticated using (public.cipa_acesso_eleicao(eleicao_id));

drop policy if exists lista_assinaturas_select on public.lista_assinaturas;
create policy lista_assinaturas_select on public.lista_assinaturas
  for select to authenticated using (public.cipa_acesso_eleicao(eleicao_id));

drop policy if exists cipa_auditoria_select on public.cipa_auditoria;
create policy cipa_auditoria_select on public.cipa_auditoria
  for select to authenticated
  using (empresa_id in (select auth_empresas_ids()));

-- eleicao_eleitores, urna_quarentena e lista_assinaturas não recebem
-- policy de escrita: toda gravação passa pelas RPCs SECURITY DEFINER,
-- que é onde vivem as travas de duplicidade e a queima do vínculo.
