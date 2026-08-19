-- =====================================================================
-- Módulo CIPA — payload da ata: comissão, indicados e dados da apuração
-- Recria cipa_encerrar_eleicao só para acrescentar campos ao json de
-- retorno (comissão eleitoral, indicados do empregador, setor do
-- candidato, município/UF e as colunas novas de eleicoes). Nenhuma regra
-- de negócio muda: mesmas validações, mesmo encerramento, mesma auditoria.
-- =====================================================================

create or replace function public.cipa_encerrar_eleicao(p_eleicao_id uuid)
returns json
language plpgsql security definer set search_path to 'public','pg_catalog','pg_temp'
as $$
declare v_e public.eleicoes; v_u public.unidades; v_pend int; v_vot int; v_out json;
begin
  v_e := public.cipa_assert_acesso(p_eleicao_id);

  select count(*) into v_pend from urna_quarentena
   where eleicao_id = p_eleicao_id and status_analise = 'PENDENTE';
  if v_pend > 0 then
    raise exception 'QUARENTENA_PENDENTE: % envelope(s) aguardando análise', v_pend;
  end if;

  if v_e.status = 'ABERTA' then
    update eleicoes set status = 'ENCERRADA', encerrada_em = now() where id = p_eleicao_id;
    select * into v_e from eleicoes where id = p_eleicao_id;
  elsif v_e.status not in ('ENCERRADA','APURADA') then
    raise exception 'STATUS_INVALIDO';
  end if;

  select * into v_u from unidades where id = v_e.unidade_id;
  select count(*) into v_vot from lista_assinaturas where eleicao_id = p_eleicao_id;

  select json_build_object(
    'empresa', json_build_object(
      'razao_social', v_u.razao_social,
      'cnpj', v_u.numero_inscricao,
      'total_funcionarios', v_e.total_eleitores_aptos,
      'grau_risco', v_u.grau_risco,
      'cnae', v_u.cnae_principal,
      'municipio', v_u.municipio,
      'uf', v_u.uf
    ),
    'eleicao', json_build_object(
      'titulo', v_e.titulo, 'norma', v_e.norma, 'gestao', v_e.gestao,
      'data_inicio', v_e.data_inicio, 'data_fim', v_e.data_fim,
      'encerrada_em', v_e.encerrada_em,
      'vagas_efetivos', v_e.vagas_efetivos, 'vagas_suplentes', v_e.vagas_suplentes,
      'apuracao_iniciada_em', v_e.apuracao_iniciada_em,
      'apuracao_encerrada_em', v_e.apuracao_encerrada_em,
      'ata_lavrada_por', v_e.ata_lavrada_por,
      'local_apuracao', v_e.local_apuracao
    ),
    'quorum', json_build_object(
      'aptos', v_e.total_eleitores_aptos, 'votantes', v_vot,
      'percentual', case when v_e.total_eleitores_aptos > 0
        then round(100.0 * v_vot / v_e.total_eleitores_aptos, 2) else 0 end,
      'atingido', v_vot * 2 > v_e.total_eleitores_aptos
    ),
    'apuracao', json_build_object(
      'votos_brancos', v_e.votos_branco,
      'votos_nulos', v_e.votos_nulo,
      'votos_nominais', coalesce((select sum(total_votos) from candidatos
                                   where eleicao_id = p_eleicao_id), 0),
      'classificacao', coalesce((
        select json_agg(x order by x.posicao)
        from (
          select
            row_number() over (order by c.total_votos desc,
                                        c.data_admissao asc nulls last,
                                        c.nome_completo) as posicao,
            c.nome_completo, c.nome_urna, c.cargo as cargo_funcao, c.setor,
            c.numero_urna, c.total_votos, c.data_admissao,
            case
              when row_number() over (order by c.total_votos desc,
                                               c.data_admissao asc nulls last,
                                               c.nome_completo) <= v_e.vagas_efetivos then 'EFETIVO'
              when row_number() over (order by c.total_votos desc,
                                               c.data_admissao asc nulls last,
                                               c.nome_completo)
                   <= v_e.vagas_efetivos + v_e.vagas_suplentes then 'SUPLENTE'
              else 'NAO_ELEITO'
            end as situacao,
            count(*) over (partition by c.total_votos) > 1 as empate,
            (count(*) over (partition by c.total_votos) > 1
              and c.data_admissao is not null) as desempate_por_admissao
          from candidatos c
          where c.eleicao_id = p_eleicao_id and c.inscricao_status = 'DEFERIDA'
        ) x
      ), '[]'::json)
    ),
    'quarentena', (select coalesce(json_object_agg(status_analise, qtd), '{}'::json)
      from (select status_analise, count(*) qtd from urna_quarentena
             where eleicao_id = p_eleicao_id group by status_analise) q),
    'comissao', coalesce((
      select json_agg(json_build_object(
        'nome', cc.nome, 'cpf', cc.cpf, 'cargo', cc.cargo, 'papel', cc.papel
      ) order by cc.criado_em)
      from cipa_comissao cc where cc.eleicao_id = p_eleicao_id
    ), '[]'::json),
    'indicados', coalesce((
      select json_agg(json_build_object(
        'nome', ci.nome, 'cargo', ci.cargo, 'setor', ci.setor,
        'condicao', ci.condicao, 'ordem', ci.ordem
      ) order by ci.condicao, ci.ordem)
      from cipa_indicados ci where ci.eleicao_id = p_eleicao_id
    ), '[]'::json)
  ) into v_out;

  insert into cipa_auditoria (eleicao_id, empresa_id, ator_id, acao)
  values (p_eleicao_id, v_e.empresa_id, auth.uid(), 'ELEICAO_ENCERRADA');

  return v_out;
end $$;

revoke execute on function public.cipa_encerrar_eleicao(uuid) from public, anon;
grant execute on function public.cipa_encerrar_eleicao(uuid) to authenticated, service_role;
