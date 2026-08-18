-- =====================================================================
-- Módulo CIPA — RPCs públicas (PWA do eleitor, papel `anon`)
-- Estas 4 funções são toda a superfície exposta ao trabalhador.
-- =====================================================================

create or replace function public.cipa_assert_aberta(p_eleicao_id uuid)
returns public.eleicoes
language plpgsql stable set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v public.eleicoes;
begin
  select * into v from eleicoes where id = p_eleicao_id;
  if not found then raise exception 'ELEICAO_NAO_ENCONTRADA'; end if;
  if v.status <> 'ABERTA' then raise exception 'ELEICAO_NAO_ABERTA'; end if;
  if now() < v.data_inicio then raise exception 'ELEICAO_NAO_INICIADA'; end if;
  if now() > v.data_fim then raise exception 'ELEICAO_ENCERRADA'; end if;
  return v;
end $$;

create or replace function public.cipa_assert_candidato(p_eleicao_id uuid, p_candidato_id uuid)
returns void
language plpgsql stable set search_path to 'public','pg_catalog','pg_temp'
as $$
begin
  if not exists (
    select 1 from candidatos
    where id = p_candidato_id and eleicao_id = p_eleicao_id and inscricao_status = 'DEFERIDA'
  ) then raise exception 'CANDIDATO_INVALIDO'; end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. Cédula pública — nunca devolve total_votos
-- ---------------------------------------------------------------------
create or replace function public.cipa_obter_cedula(p_eleicao_id uuid)
returns json
language plpgsql stable security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v_e public.eleicoes; v_u public.unidades;
begin
  select * into v_e from eleicoes where id = p_eleicao_id;
  if not found then raise exception 'ELEICAO_NAO_ENCONTRADA'; end if;
  select * into v_u from unidades where id = v_e.unidade_id;

  return json_build_object(
    'eleicao', json_build_object(
      'id', v_e.id, 'titulo', v_e.titulo, 'norma', v_e.norma, 'gestao', v_e.gestao,
      'status', v_e.status, 'data_inicio', v_e.data_inicio, 'data_fim', v_e.data_fim,
      'permite_voto_branco', v_e.permite_voto_branco,
      'permite_voto_nulo', v_e.permite_voto_nulo,
      'permite_qr_code', v_e.permite_qr_code,
      'aceitando_votos', (v_e.status = 'ABERTA'
        and now() between v_e.data_inicio and v_e.data_fim)
    ),
    'unidade', json_build_object(
      'razao_social', v_u.razao_social, 'nome_fantasia', v_u.nome_fantasia,
      'municipio', v_u.municipio, 'uf', v_u.uf
    ),
    'candidatos', coalesce((
      select json_agg(c order by c.ordem nulls last, c.numero_urna nulls last, c.nome_urna)
      from (
        select id, numero_urna, nome_urna, cargo, setor, foto_url, ordem
        from candidatos where eleicao_id = p_eleicao_id and inscricao_status = 'DEFERIDA'
      ) c
    ), '[]'::json)
  );
end $$;

-- ---------------------------------------------------------------------
-- 2. Validação do link mágico
-- ---------------------------------------------------------------------
create or replace function public.cipa_validar_token(p_token text)
returns json
language plpgsql stable security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v public.eleicao_eleitores;
begin
  if p_token is null or length(p_token) < 32 then raise exception 'TOKEN_INVALIDO'; end if;
  select * into v from eleicao_eleitores where token_hash = public.cipa_hash_token(p_token);
  if not found then raise exception 'TOKEN_INVALIDO'; end if;
  if v.token_expira_em is not null and now() > v.token_expira_em then
    raise exception 'TOKEN_EXPIRADO';
  end if;

  return json_build_object(
    'eleicao_id', v.eleicao_id,
    'nome', split_part(v.nome, ' ', 1),
    'cpf_mascara', public.cipa_mascara_cpf(v.cpf),
    'ja_votou', v.status_voto
  );
end $$;

-- ---------------------------------------------------------------------
-- 3. Porta A — link mágico
-- ---------------------------------------------------------------------
create or replace function public.cipa_registrar_voto_link(
  p_token text,
  p_tipo_voto public.cipa_tipo_voto default 'NOMINAL',
  p_candidato_id uuid default null,
  p_ip text default null,
  p_user_agent text default null
) returns json
language plpgsql security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v_el public.eleicao_eleitores; v_e public.eleicoes;
begin
  select * into v_el from eleicao_eleitores
   where token_hash = public.cipa_hash_token(coalesce(p_token,'')) for update;
  if not found then raise exception 'TOKEN_INVALIDO'; end if;
  if v_el.token_expira_em is not null and now() > v_el.token_expira_em then
    raise exception 'TOKEN_EXPIRADO';
  end if;

  v_e := public.cipa_assert_aberta(v_el.eleicao_id);

  if v_el.status_voto then raise exception 'JA_VOTOU'; end if;
  if exists (select 1 from lista_assinaturas
              where eleicao_id = v_el.eleicao_id and cpf = v_el.cpf) then
    raise exception 'JA_VOTOU';
  end if;
  if exists (select 1 from urna_quarentena
              where eleicao_id = v_el.eleicao_id and cpf_declarado = v_el.cpf
                and status_analise = 'PENDENTE') then
    raise exception 'VOTO_EM_ANALISE';
  end if;

  if p_tipo_voto = 'NOMINAL' then
    if p_candidato_id is null then raise exception 'CANDIDATO_OBRIGATORIO'; end if;
    perform public.cipa_assert_candidato(v_el.eleicao_id, p_candidato_id);
    update candidatos set total_votos = total_votos + 1 where id = p_candidato_id;
  elsif p_tipo_voto = 'BRANCO' then
    if not v_e.permite_voto_branco then raise exception 'BRANCO_NAO_PERMITIDO'; end if;
    update eleicoes set votos_branco = votos_branco + 1 where id = v_e.id;
  else
    if not v_e.permite_voto_nulo then raise exception 'NULO_NAO_PERMITIDO'; end if;
    update eleicoes set votos_nulo = votos_nulo + 1 where id = v_e.id;
  end if;

  insert into lista_assinaturas
    (eleicao_id, eleitor_id, nome, cpf, cargo, data_hora_voto, ip_dispositivo, origem_voto)
  values (v_el.eleicao_id, v_el.id, v_el.nome, v_el.cpf, v_el.cargo, now(), p_ip::inet, 'LINK_MAGICO');

  update eleicao_eleitores set status_voto = true, votou_em = now() where id = v_el.id;

  insert into cipa_auditoria (eleicao_id, empresa_id, acao, detalhes, ip)
  values (v_e.id, v_e.empresa_id, 'VOTO_REGISTRADO',
          jsonb_build_object('origem','LINK_MAGICO'), p_ip::inet);

  return json_build_object('status','sucesso','origem','LINK_MAGICO');
end $$;

-- ---------------------------------------------------------------------
-- 4. Porta B — QR Code / autodeclaração
-- ---------------------------------------------------------------------
create or replace function public.cipa_registrar_voto_qr(
  p_eleicao_id uuid,
  p_cpf text,
  p_nome text,
  p_cargo text default null,
  p_tipo_voto public.cipa_tipo_voto default 'NOMINAL',
  p_candidato_id uuid default null,
  p_ip text default null,
  p_user_agent text default null
) returns json
language plpgsql security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v_e public.eleicoes; v_cpf text;
begin
  v_e := public.cipa_assert_aberta(p_eleicao_id);
  if not v_e.permite_qr_code then raise exception 'QR_CODE_DESABILITADO'; end if;

  v_cpf := public.cipa_digitos(coalesce(p_cpf,''));
  if not public.cipa_cpf_valido(v_cpf) then raise exception 'CPF_INVALIDO'; end if;
  if p_nome is null or length(btrim(p_nome)) < 5
     or position(' ' in btrim(p_nome)) = 0 then raise exception 'NOME_INVALIDO'; end if;

  if exists (select 1 from lista_assinaturas
              where eleicao_id = p_eleicao_id and cpf = v_cpf) then
    raise exception 'JA_VOTOU';
  end if;
  if exists (select 1 from urna_quarentena
              where eleicao_id = p_eleicao_id and cpf_declarado = v_cpf
                and status_analise = 'PENDENTE') then
    raise exception 'VOTO_EM_ANALISE';
  end if;
  if exists (select 1 from eleicao_eleitores
              where eleicao_id = p_eleicao_id and cpf = v_cpf and status_voto) then
    raise exception 'JA_VOTOU';
  end if;

  if p_tipo_voto = 'NOMINAL' then
    if p_candidato_id is null then raise exception 'CANDIDATO_OBRIGATORIO'; end if;
    perform public.cipa_assert_candidato(p_eleicao_id, p_candidato_id);
  elsif p_tipo_voto = 'BRANCO' and not v_e.permite_voto_branco then
    raise exception 'BRANCO_NAO_PERMITIDO';
  elsif p_tipo_voto = 'NULO' and not v_e.permite_voto_nulo then
    raise exception 'NULO_NAO_PERMITIDO';
  end if;

  begin
    insert into urna_quarentena (
      eleicao_id, nome_declarado, cpf_declarado, cargo_declarado,
      ip_dispositivo, user_agent, data_hora, candidato_escolhido_id, tipo_voto, status_analise
    ) values (
      p_eleicao_id, p_nome, v_cpf, p_cargo,
      p_ip::inet, left(coalesce(p_user_agent,''), 400), now(),
      case when p_tipo_voto = 'NOMINAL' then p_candidato_id else null end,
      p_tipo_voto, 'PENDENTE'
    );
  exception when unique_violation then
    raise exception 'VOTO_EM_ANALISE';
  end;

  insert into cipa_auditoria (eleicao_id, empresa_id, acao, detalhes, ip)
  values (p_eleicao_id, v_e.empresa_id, 'VOTO_QUARENTENA',
          jsonb_build_object('cpf_mascara', public.cipa_mascara_cpf(v_cpf)), p_ip::inet);

  return json_build_object('status','quarentena','origem','QR_CODE');
end $$;

-- ---------------------------------------------------------------------
-- Permissões: só estas 4 para o eleitor anônimo
-- ---------------------------------------------------------------------
revoke execute on function public.cipa_obter_cedula(uuid) from public;
revoke execute on function public.cipa_validar_token(text) from public;
revoke execute on function public.cipa_registrar_voto_link(text, public.cipa_tipo_voto, uuid, text, text) from public;
revoke execute on function public.cipa_registrar_voto_qr(uuid, text, text, text, public.cipa_tipo_voto, uuid, text, text) from public;

grant execute on function public.cipa_obter_cedula(uuid) to anon, authenticated;
grant execute on function public.cipa_validar_token(text) to anon, authenticated;
grant execute on function public.cipa_registrar_voto_link(text, public.cipa_tipo_voto, uuid, text, text) to anon, authenticated;
grant execute on function public.cipa_registrar_voto_qr(uuid, text, text, text, public.cipa_tipo_voto, uuid, text, text) to anon, authenticated;
