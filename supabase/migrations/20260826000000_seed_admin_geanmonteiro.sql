do $$
declare
  v_usuario_id uuid;
  v_empresa_id uuid;
  v_perfil_id  uuid;
begin
  select ue.usuario_id, ue.empresa_id
    into v_usuario_id, v_empresa_id
  from usuarios_empresas ue
  join profiles p on p.id = ue.usuario_id
  where p.email = 'geanmonteiro1@gmail.com'
  limit 1;

  if v_usuario_id is null then
    raise exception 'Vinculo nao encontrado para este e-mail';
  end if;

  select id into v_perfil_id
  from perfis_acesso
  where empresa_id = v_empresa_id and nome = 'Administrador';

  if v_perfil_id is null then
    insert into perfis_acesso (empresa_id, nome, descricao)
    values (v_empresa_id, 'Administrador', 'Acesso completo a todos os recursos.')
    returning id into v_perfil_id;
  end if;

  update usuarios_empresas
     set perfil_id = v_perfil_id
   where usuario_id = v_usuario_id and empresa_id = v_empresa_id;

  insert into perfil_permissoes (perfil_id, recurso_codigo, acao_codigo)
  select v_perfil_id, ra.recurso_codigo, ra.acao_codigo
  from recurso_acoes ra
  on conflict (perfil_id, recurso_codigo, acao_codigo) do nothing;
end $$;