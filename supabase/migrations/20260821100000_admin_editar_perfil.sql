-- =====================================================================
-- PrevSafe :: permite que um admin edite o nome de qualquer profile
-- dentro da própria empresa. Hoje profiles_update_self só permite que
-- cada usuário edite o próprio nome. Aditiva: mantém profiles_update_self.
-- =====================================================================

revoke update on profiles from authenticated;
grant update (nome) on profiles to authenticated;

drop policy if exists profiles_update_admin on profiles;
create policy profiles_update_admin on profiles for update to authenticated
  using (exists (
    select 1 from usuarios_empresas alvo
    join usuarios_empresas eu on eu.empresa_id = alvo.empresa_id
    where alvo.usuario_id = profiles.id
      and eu.usuario_id = auth.uid()
      and eu.papel = 'admin'
  ));
