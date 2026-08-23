-- ---------------------------------------------------------------------
-- Correção de segurança: a Porta B (QR Code / autodeclaração) credita o
-- voto direto, sem revisão humana, sempre que o nome digitado bate com o
-- cadastro. Isso permite que qualquer pessoa que conheça CPF+nome de um
-- colega elegível vote no lugar dele, do mesmo dispositivo, repetidamente
-- — é a causa raiz do bug relatado (mesmo navegador, CPFs diferentes).
--
-- Esta migration parte do estado ATUAL das funções em produção (conferido
-- via MCP do Supabase antes de escrever este arquivo — o repositório local
-- estava desatualizado em relação ao banco, que já tinha migrations mais
-- recentes não commitadas, entre elas a que tirou `eleitor_id` de
-- cipa_votos_computados para reforçar o sigilo do voto; este arquivo
-- preserva essa mudança).
--
--   1. Reverte o "voto direto quando o nome bate": todo voto QR_CODE
--      volta a passar por urna_quarentena para aprovação manual,
--      reativando a fila e os alertas já existentes em
--      cipa_fila_quarentena (ex.: MULTIPLOS_VOTOS_MESMO_IP).
--   2. Acrescenta um limite de tentativas por IP/eleição (rate limiting
--      sem infraestrutura externa), tanto na Porta A quanto na Porta B.
-- ---------------------------------------------------------------------

alter table public.cipa_tentativas_negadas
  drop constraint if exists cipa_tentativas_negadas_motivo_check;
alter table public.cipa_tentativas_negadas
  add constraint cipa_tentativas_negadas_motivo_check
  check (motivo in ('CPF_FORA_DA_LISTA', 'CPF_JA_VOTOU', 'MUITAS_TENTATIVAS'));

-- ---------------------------------------------------------------------
-- Limite de tentativas por IP dentro de uma eleição. Conta, na janela
-- informada, quantos eventos (tentativas negadas, envelopes em
-- quarentena e votos assinados) já saíram do mesmo IP. Não depende de
-- nenhum serviço externo: só lê tabelas que o próprio módulo já mantém.
-- ---------------------------------------------------------------------
create or replace function public.cipa_ip_excedeu_limite(
  p_eleicao_id uuid,
  p_ip inet,
  p_limite int default 8,
  p_janela interval default interval '10 minutes'
) returns boolean
language sql stable set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
  select p_ip is not null and (
    (select count(*) from public.cipa_tentativas_negadas
      where eleicao_id = p_eleicao_id and ip_dispositivo = p_ip
        and criado_em > now() - p_janela)
    +
    (select count(*) from public.urna_quarentena
      where eleicao_id = p_eleicao_id and ip_dispositivo = p_ip
        and data_hora > now() - p_janela)
    +
    (select count(*) from public.lista_assinaturas
      where eleicao_id = p_eleicao_id and ip_dispositivo = p_ip
        and data_hora_voto > now() - p_janela)
  ) >= p_limite;
$$;

-- ---------------------------------------------------------------------
-- Porta A — link mágico. Corpo idêntico ao vigente em produção, só com o
-- limite de tentativas por IP acrescentado logo após confirmar que a
-- eleição está aberta (defesa em profundidade; o token de 24 bytes já é
-- praticamente impossível de adivinhar, mas o mesmo IP pode ter várias
-- cópias de links legítimos vazados).
-- ---------------------------------------------------------------------
create or replace function public.cipa_registrar_voto_link(
  p_token text,
  p_tipo_voto public.cipa_tipo_voto default 'NOMINAL',
  p_candidato_id uuid default null,
  p_ip text default null,
  p_user_agent text default null
) returns json
language plpgsql security definer set search_path to 'public', 'pg_catalog', 'pg_temp'
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

  if public.cipa_ip_excedeu_limite(v_el.eleicao_id, p_ip::inet) then
    raise exception 'MUITAS_TENTATIVAS';
  end if;

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

  -- Sem eleitor_id: a partir daqui o voto não é rastreável até a pessoa.
  insert into cipa_votos_computados (eleicao_id, origem, tipo_voto, candidato_id)
  values (v_el.eleicao_id, 'LINK_MAGICO', p_tipo_voto, p_candidato_id);

  update eleicao_eleitores set status_voto = true, votou_em = now() where id = v_el.id;

  insert into cipa_auditoria (eleicao_id, empresa_id, acao, detalhes, ip)
  values (v_e.id, v_e.empresa_id, 'VOTO_REGISTRADO',
          jsonb_build_object('origem','LINK_MAGICO'), p_ip::inet);

  return json_build_object('status','sucesso','origem','LINK_MAGICO');
end $$;

-- ---------------------------------------------------------------------
-- Porta B — QR Code / autodeclaração.
-- Correção de segurança: todo voto volta a passar por urna_quarentena,
-- mesmo quando o nome digitado bate com o cadastro (removido o bloco que
-- computava o voto direto nesse caso). CPF+nome são dados conhecíveis
-- dentro da empresa e não provam posse do CPF — a fila de revisão em
-- cipa_fila_quarentena já calcula os alertas de divergência de nome e de
-- múltiplos envelopes no mesmo IP; só precisava voltar a receber dados.
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
language plpgsql security definer set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
declare
  v_e   public.eleicoes;
  v_cpf text;
  v_el  public.eleicao_eleitores;
begin
  v_e := public.cipa_assert_aberta(p_eleicao_id);
  if not v_e.permite_qr_code then raise exception 'QR_CODE_DESABILITADO'; end if;

  v_cpf := public.cipa_digitos(coalesce(p_cpf,''));
  if not public.cipa_cpf_valido(v_cpf) then raise exception 'CPF_INVALIDO'; end if;
  if p_nome is null or length(btrim(p_nome)) < 5
     or position(' ' in btrim(p_nome)) = 0 then raise exception 'NOME_INVALIDO'; end if;

  if public.cipa_ip_excedeu_limite(p_eleicao_id, p_ip::inet) then
    insert into cipa_tentativas_negadas (eleicao_id, cpf, nome_declarado, motivo, ip_dispositivo, user_agent)
    values (p_eleicao_id, v_cpf, p_nome, 'MUITAS_TENTATIVAS', p_ip::inet, left(coalesce(p_user_agent,''), 400));
    return json_build_object('status','negado','codigo','MUITAS_TENTATIVAS');
  end if;

  select * into v_el from eleicao_eleitores
   where eleicao_id = p_eleicao_id and cpf = v_cpf for update;

  -- Estas duas negativas gravam em cipa_tentativas_negadas e, por isso, NÃO
  -- podem usar `raise exception`: uma exceção não tratada aborta a transação
  -- inteira da chamada RPC e desfaria o próprio insert que acabamos de fazer.
  if not found then
    insert into cipa_tentativas_negadas (eleicao_id, cpf, nome_declarado, motivo, ip_dispositivo, user_agent)
    values (p_eleicao_id, v_cpf, p_nome, 'CPF_FORA_DA_LISTA', p_ip::inet, left(coalesce(p_user_agent,''), 400));
    return json_build_object('status','negado','codigo','CPF_FORA_DA_LISTA');
  end if;

  if v_el.status_voto
     or exists (select 1 from lista_assinaturas where eleicao_id = p_eleicao_id and cpf = v_cpf) then
    insert into cipa_tentativas_negadas (eleicao_id, cpf, nome_declarado, motivo, ip_dispositivo, user_agent)
    values (p_eleicao_id, v_cpf, p_nome, 'CPF_JA_VOTOU', p_ip::inet, left(coalesce(p_user_agent,''), 400));
    return json_build_object('status','negado','codigo','JA_VOTOU');
  end if;
  if exists (select 1 from urna_quarentena
              where eleicao_id = p_eleicao_id and cpf_declarado = v_cpf
                and status_analise = 'PENDENTE') then
    raise exception 'VOTO_EM_ANALISE';
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
