-- Permite abrir a eleicao sem lista previa de eleitores. Nesse modo, o
-- trabalhador se identifica no proprio QR Code e todo voto passa pela
-- quarentena. O quorum da NR-05 fica sem denominador ate que a relacao
-- de empregados seja importada.
create or replace function public.cipa_abrir_eleicao(p_eleicao_id uuid)
returns json language plpgsql security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $fn$
declare v_e public.eleicoes; v_cand int; v_apt int;
begin
  v_e := public.cipa_assert_acesso(p_eleicao_id);

  if not public.modulo_ativo(v_e.empresa_id, 'CIPA') then
    raise exception 'MODULO_NAO_CONTRATADO';
  end if;
  if v_e.status not in ('RASCUNHO','AGENDADA') then raise exception 'STATUS_INVALIDO'; end if;

  select count(*) into v_cand from candidatos
   where eleicao_id = p_eleicao_id and inscricao_status = 'DEFERIDA';
  select count(*) into v_apt from eleicao_eleitores where eleicao_id = p_eleicao_id;

  if v_cand < 1 then raise exception 'SEM_CANDIDATOS_DEFERIDOS'; end if;

  -- Sem lista de aptos, exige o QR Code habilitado: e a unica porta de entrada.
  if v_apt < 1 and not v_e.permite_qr_code then
    raise exception 'SEM_ELEITORES_E_SEM_QR';
  end if;

  update eleicoes
     set status = 'ABERTA', aberta_em = now(), total_eleitores_aptos = v_apt
   where id = p_eleicao_id;

  insert into cipa_auditoria (eleicao_id, empresa_id, ator_id, acao, detalhes)
  values (p_eleicao_id, v_e.empresa_id, auth.uid(), 'ELEICAO_ABERTA',
          jsonb_build_object('aptos', v_apt, 'candidatos', v_cand,
                             'sem_lista_previa', v_apt < 1));

  return json_build_object('status','sucesso','aptos',v_apt,'candidatos',v_cand);
end $fn$;
