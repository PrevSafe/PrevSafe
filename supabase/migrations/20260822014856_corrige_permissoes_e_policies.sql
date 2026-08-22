-- =====================================================================
-- PrevSafe · Correção do modelo de permissões existente
--
-- Esta migration NÃO instala um sistema novo. Ela corrige o sistema
-- que já existe (tem_permissao / auth_empresas_ids / unidade_visivel /
-- cipa_acesso_eleicao / modulo_ativo), que é mais completo do que o
-- que eu havia proposto antes.
--
-- Descarte 20260828000000, 20260829000000 e 20260830000000 se ainda
-- estiverem na pasta de migrations. Nenhuma delas foi aplicada.
--
-- Corrige dois problemas:
--   A. tem_permissao ignora perfis_acesso.is_admin
--   B. policies de escrita da CIPA exigem só vínculo com a empresa,
--      não permissão — um perfil somente-leitura consegue escrever
--
-- Aplicar com: npx supabase db push
-- =====================================================================


-- ---------------------------------------------------------------------
-- A. tem_permissao passa a reconhecer is_admin
--
-- Sem esta mudança a flag aplicada em 20260827000000 é decorativa:
-- todas as policies chamam tem_permissao, e ela só olhava
-- perfil_permissoes. O acesso do Administrador hoje depende
-- inteiramente das 60 linhas de snapshot.
--
-- Acrescentei também a checagem de profiles.ativo — hoje um usuário
-- desativado mantém acesso enquanto o vínculo estiver ativo.
-- ---------------------------------------------------------------------
create or replace function public.tem_permissao(
  p_usuario uuid,
  p_empresa uuid,
  p_recurso text,
  p_acao    text
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from usuarios_empresas ue
    join profiles pr      on pr.id = ue.usuario_id
    join perfis_acesso pa on pa.id = ue.perfil_id
    where ue.usuario_id = p_usuario
      and ue.empresa_id = p_empresa
      and ue.ativo = true
      and coalesce(pr.ativo, true)
      and (
        pa.is_admin
        or exists (
          select 1
          from perfil_permissoes pp
          where pp.perfil_id      = pa.id
            and pp.recurso_codigo = p_recurso
            and pp.acao_codigo    = p_acao
        )
      )
  );
$function$;


-- ---------------------------------------------------------------------
-- B. Helper para as tabelas que só alcançam a empresa via eleição
-- ---------------------------------------------------------------------
create or replace function public.empresa_da_eleicao(p_eleicao_id uuid)
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $function$
  select e.empresa_id from eleicoes e where e.id = p_eleicao_id;
$function$;

revoke all     on function public.empresa_da_eleicao(uuid) from public;
grant  execute on function public.empresa_da_eleicao(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- C. candidatos — separa a policy ALL em INSERT/UPDATE/DELETE
--
-- candidatos_write exigia apenas cipa_acesso_eleicao(), que só verifica
-- se a eleição é da empresa do usuário. Qualquer membro da empresa
-- escrevia na tabela, inclusive perfis somente-leitura.
--
-- Mantive cipa_acesso_eleicao nas policies novas: ele continua sendo a
-- barreira de tenant. O que faltava era a camada funcional.
-- ---------------------------------------------------------------------
drop policy if exists candidatos_write on public.candidatos;

create policy candidatos_insert on public.candidatos
  for insert to authenticated
  with check (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(auth.uid(), empresa_da_eleicao(eleicao_id), 'cipa.candidatos', 'criar')
  );

create policy candidatos_update on public.candidatos
  for update to authenticated
  using (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(auth.uid(), empresa_da_eleicao(eleicao_id), 'cipa.candidatos', 'editar')
  )
  with check (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(auth.uid(), empresa_da_eleicao(eleicao_id), 'cipa.candidatos', 'editar')
  );

create policy candidatos_delete on public.candidatos
  for delete to authenticated
  using (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(auth.uid(), empresa_da_eleicao(eleicao_id), 'cipa.candidatos', 'excluir')
  );

-- ATENÇÃO: candidatos.total_votos é atualizado pela apuração. Se a
-- apuração roda pelo client, ela agora exige 'cipa.candidatos: editar'
-- — e o recurso da apuração é 'cipa.apuracao'. Se a tela quebrar,
-- mova a atualização para uma função SECURITY DEFINER que valide
-- 'cipa.apuracao: criar'. Contagem de voto não deveria ser UPDATE
-- solto do client de qualquer forma.


-- ---------------------------------------------------------------------
-- D. cipa_comissao e cipa_indicados — mesmo problema, e estas têm
--    empresa_id próprio, então não precisam do helper
-- ---------------------------------------------------------------------
drop policy if exists cipa_comissao_write on public.cipa_comissao;

create policy cipa_comissao_insert on public.cipa_comissao
  for insert to authenticated
  with check (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(auth.uid(), empresa_id, 'cipa.comissao', 'criar')
  );

create policy cipa_comissao_update on public.cipa_comissao
  for update to authenticated
  using      (cipa_acesso_eleicao(eleicao_id)
              and tem_permissao(auth.uid(), empresa_id, 'cipa.comissao', 'editar'))
  with check (cipa_acesso_eleicao(eleicao_id)
              and tem_permissao(auth.uid(), empresa_id, 'cipa.comissao', 'editar'));

create policy cipa_comissao_delete on public.cipa_comissao
  for delete to authenticated
  using (cipa_acesso_eleicao(eleicao_id)
         and tem_permissao(auth.uid(), empresa_id, 'cipa.comissao', 'excluir'));


drop policy if exists cipa_indicados_write on public.cipa_indicados;

create policy cipa_indicados_insert on public.cipa_indicados
  for insert to authenticated
  with check (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(auth.uid(), empresa_id, 'cipa.comissao', 'criar')
  );

create policy cipa_indicados_update on public.cipa_indicados
  for update to authenticated
  using      (cipa_acesso_eleicao(eleicao_id)
              and tem_permissao(auth.uid(), empresa_id, 'cipa.comissao', 'editar'))
  with check (cipa_acesso_eleicao(eleicao_id)
              and tem_permissao(auth.uid(), empresa_id, 'cipa.comissao', 'editar'));

create policy cipa_indicados_delete on public.cipa_indicados
  for delete to authenticated
  using (cipa_acesso_eleicao(eleicao_id)
         and tem_permissao(auth.uid(), empresa_id, 'cipa.comissao', 'excluir'));


-- ---------------------------------------------------------------------
-- E. eleicoes — insert, update e delete não checavam permissão
--
-- eleicoes_update era o mais grave: bastava pertencer à empresa para
-- alterar qualquer eleição, incluindo status e datas de uma eleição
-- em andamento.
-- ---------------------------------------------------------------------
drop policy if exists eleicoes_insert on public.eleicoes;
create policy eleicoes_insert on public.eleicoes
  for insert to authenticated
  with check (
    empresa_id in (select auth_empresas_ids())
    and modulo_ativo(empresa_id, 'CIPA')
    and tem_permissao(auth.uid(), empresa_id, 'cipa.eleicoes', 'criar')
  );

drop policy if exists eleicoes_update on public.eleicoes;
create policy eleicoes_update on public.eleicoes
  for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'cipa.eleicoes', 'editar')
    and unidade_visivel(auth.uid(), unidade_id)
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'cipa.eleicoes', 'editar')
  );

drop policy if exists eleicoes_delete on public.eleicoes;
create policy eleicoes_delete on public.eleicoes
  for delete to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'cipa.eleicoes', 'excluir')
    and status = any (array['RASCUNHO'::cipa_status_eleicao, 'AGENDADA'::cipa_status_eleicao])
  );

-- A restrição de status continua: eleição já aberta não se apaga,
-- nem com permissão. Regra de negócio acima de permissão de usuário.


-- ---------------------------------------------------------------------
-- F. Leituras que checavam só o vínculo com a empresa
--
-- Foram estas que produziram os 131 e os 5 no teste com o perfil CIPA:
-- ele enxergava a trilha de auditoria e a lista de perfis sem ter
-- nenhuma permissão para isso.
-- ---------------------------------------------------------------------
drop policy if exists cipa_auditoria_select on public.cipa_auditoria;
create policy cipa_auditoria_select on public.cipa_auditoria
  for select to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'cipa.auditoria', 'visualizar')
  );

drop policy if exists lista_assinaturas_select on public.lista_assinaturas;
create policy lista_assinaturas_select on public.lista_assinaturas
  for select to authenticated
  using (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(auth.uid(), empresa_da_eleicao(eleicao_id), 'cipa.eleitores', 'visualizar')
  );

drop policy if exists cipa_tentativas_negadas_select on public.cipa_tentativas_negadas;
create policy cipa_tentativas_negadas_select on public.cipa_tentativas_negadas
  for select to authenticated
  using (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(auth.uid(), empresa_da_eleicao(eleicao_id), 'cipa.quarentena', 'visualizar')
  );

-- perfis_acesso_select fica de fora de propósito. Restringir a lista
-- de perfis a quem tem 'acessos: visualizar' é o correto, mas telas
-- que só exibem o nome do perfil do próprio usuário quebrariam.
-- Verifique antes; se nada depender disso, aplique:
--
--   drop policy if exists perfis_acesso_select on public.perfis_acesso;
--   create policy perfis_acesso_select on public.perfis_acesso
--     for select to authenticated
--     using (
--       empresa_id in (select auth_empresas_ids())
--       and tem_permissao(auth.uid(), empresa_id, 'acessos', 'visualizar')
--     );


-- ---------------------------------------------------------------------
-- G. Remove a função duplicada que eu havia criado
--
-- has_permission fazia o mesmo que tem_permissao, com assinatura
-- diferente. Duas fontes de verdade sobre permissão é exatamente o
-- tipo de coisa que produz divergência silenciosa entre a UI e a RLS.
-- Nenhuma policy a referencia.
-- ---------------------------------------------------------------------
drop function if exists public.has_permission(text, text, uuid);


-- ---------------------------------------------------------------------
-- H. OPCIONAL — agora sim é seguro limpar o snapshot do Administrador
--
-- Depois do item A, is_admin concede tudo por si. As 60 linhas viram
-- redundantes. Rode SÓ depois de confirmar em produção que o admin
-- continua enxergando tudo:
--
--   delete from perfil_permissoes pp
--   using perfis_acesso pa
--   where pa.id = pp.perfil_id and pa.is_admin;
-- ---------------------------------------------------------------------
