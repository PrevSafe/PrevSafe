-- ---------------------------------------------------------------------
-- Segundo fator por e-mail (OTP) na Porta B (QR Code do mural).
--
-- Quem provar posse do e-mail já cadastrado em eleicao_eleitores tem o
-- voto creditado direto, sem passar por quarentena — mas com prova real
-- de identidade (código de 6 dígitos), não apenas nome batendo com o
-- cadastro. Quem não tiver e-mail cadastrado ou não verificar continua
-- caindo em quarentena, exatamente como hoje: não é bloqueio duro.
--
-- Segurança do desenho: cipa_registrar_voto_qr é uma RPC SECURITY DEFINER
-- chamável direto via /rest/v1/rpc/... com a chave anon, então NENHUM
-- parâmetro booleano "já verifiquei" pode ser aceito no payload — a RPC
-- confere ela mesma a existência de uma prova de verificação gravada
-- antes, nunca confia em nada vindo da chamada. Geração/hash do código e
-- envio do e-mail só acontecem em api/cipa/otp.ts, com a service role key
-- — nunca em uma função exposta ao anon (que devolveria o código em claro
-- para quem chamasse a função direto).
-- ---------------------------------------------------------------------

create table public.cipa_otp_qr (
  id          uuid primary key default gen_random_uuid(),
  eleicao_id  uuid not null references public.eleicoes(id) on delete cascade,
  cpf         varchar(11) not null,
  codigo_hash text not null,
  tentativas  int not null default 0,
  expira_em   timestamptz not null,
  criado_em   timestamptz not null default now(),
  constraint cipa_otp_qr_uk unique (eleicao_id, cpf)
);
alter table public.cipa_otp_qr enable row level security;

create table public.cipa_otp_verificados (
  eleicao_id uuid not null references public.eleicoes(id) on delete cascade,
  cpf        varchar(11) not null,
  expira_em  timestamptz not null,
  criado_em  timestamptz not null default now(),
  primary key (eleicao_id, cpf)
);
alter table public.cipa_otp_verificados enable row level security;

-- Sem nenhuma policy: acesso só via service_role (api/cipa/otp.ts, que
-- bypassa RLS) e leitura interna das funções SECURITY DEFINER do módulo
-- (que rodam como dono da tabela, também fora do alcance do RLS).

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

  -- CPF provou posse do e-mail cadastrado (api/cipa/otp.ts): credita o
  -- voto direto, com prova de identidade de verdade — não é mais "nome
  -- bateu com o cadastro", que era o problema original.
  if exists (select 1 from cipa_otp_verificados
              where eleicao_id = p_eleicao_id and cpf = v_cpf and expira_em > now()) then
    delete from cipa_otp_verificados where eleicao_id = p_eleicao_id and cpf = v_cpf;

    if p_tipo_voto = 'NOMINAL' then
      update candidatos set total_votos = total_votos + 1
       where id = p_candidato_id and eleicao_id = p_eleicao_id;
    elsif p_tipo_voto = 'BRANCO' then
      update eleicoes set votos_branco = votos_branco + 1 where id = p_eleicao_id;
    else
      update eleicoes set votos_nulo = votos_nulo + 1 where id = p_eleicao_id;
    end if;

    insert into lista_assinaturas
      (eleicao_id, eleitor_id, nome, cpf, cargo, data_hora_voto, ip_dispositivo, origem_voto)
    values (p_eleicao_id, v_el.id, v_el.nome, v_cpf, coalesce(v_el.cargo, p_cargo), now(), p_ip::inet, 'QR_CODE');

    insert into cipa_votos_computados (eleicao_id, origem, tipo_voto, candidato_id)
    values (p_eleicao_id, 'QR_CODE', p_tipo_voto, p_candidato_id);

    update eleicao_eleitores set status_voto = true, votou_em = now() where id = v_el.id;

    insert into cipa_auditoria (eleicao_id, empresa_id, acao, detalhes, ip)
    values (p_eleicao_id, v_e.empresa_id, 'VOTO_REGISTRADO',
            jsonb_build_object('origem','QR_CODE','verificacao','OTP_EMAIL'), p_ip::inet);

    return json_build_object('status','sucesso','origem','QR_CODE');
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
