revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

grant select on public.cipa_votos_computados to authenticated;
grant select, update on public.urna_quarentena to authenticated;
grant select on public.cipa_tentativas_negadas to authenticated;
grant select, insert on public.cipa_auditoria             to authenticated;
grant select, insert on public.cipa_reversoes_auditoria   to authenticated;
grant select, insert, update, delete on public.eleicao_eleitores to authenticated;
grant select on public.lista_assinaturas to authenticated;

drop policy if exists cipa_votos_computados_select on public.cipa_votos_computados;
create policy cipa_votos_computados_select on public.cipa_votos_computados
  for select to authenticated
  using (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(
      auth.uid(),
      (select e.empresa_id from eleicoes e where e.id = eleicao_id),
      'cipa.apuracao', 'visualizar'
    )
  );

drop policy if exists urna_quarentena_update on public.urna_quarentena;
create policy urna_quarentena_update on public.urna_quarentena
  for update to authenticated
  using (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(
      auth.uid(),
      (select e.empresa_id from eleicoes e where e.id = eleicao_id),
      'cipa.quarentena', 'aprovar'
    )
  )
  with check (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(
      auth.uid(),
      (select e.empresa_id from eleicoes e where e.id = eleicao_id),
      'cipa.quarentena', 'aprovar'
    )
  );

drop policy if exists eleicao_eleitores_insert on public.eleicao_eleitores;
create policy eleicao_eleitores_insert on public.eleicao_eleitores
  for insert to authenticated
  with check (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(
      auth.uid(),
      (select e.empresa_id from eleicoes e where e.id = eleicao_id),
      'cipa.eleitores', 'criar'
    )
  );

drop policy if exists eleicao_eleitores_update on public.eleicao_eleitores;
create policy eleicao_eleitores_update on public.eleicao_eleitores
  for update to authenticated
  using (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(
      auth.uid(),
      (select e.empresa_id from eleicoes e where e.id = eleicao_id),
      'cipa.eleitores', 'editar'
    )
  )
  with check (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(
      auth.uid(),
      (select e.empresa_id from eleicoes e where e.id = eleicao_id),
      'cipa.eleitores', 'editar'
    )
  );

drop policy if exists eleicao_eleitores_delete on public.eleicao_eleitores;
create policy eleicao_eleitores_delete on public.eleicao_eleitores
  for delete to authenticated
  using (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(
      auth.uid(),
      (select e.empresa_id from eleicoes e where e.id = eleicao_id),
      'cipa.eleitores', 'excluir'
    )
  );

drop policy if exists cipa_auditoria_insert on public.cipa_auditoria;
create policy cipa_auditoria_insert on public.cipa_auditoria
  for insert to authenticated
  with check (empresa_id in (select auth_empresas_ids()));

drop policy if exists cipa_reversoes_auditoria_insert on public.cipa_reversoes_auditoria;
create policy cipa_reversoes_auditoria_insert on public.cipa_reversoes_auditoria
  for insert to authenticated
  with check (
    cipa_acesso_eleicao(eleicao_id)
    and tem_permissao(auth.uid(), empresa_id, 'cipa.auditoria', 'reverter')
  );
