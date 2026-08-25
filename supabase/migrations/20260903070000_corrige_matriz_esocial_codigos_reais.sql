-- =====================================================================
-- PrevSafe :: corrige riscos_exames_compatibilidade após 20260903000000
--
-- 20260903000000 seguiu o PDF "Matriz de Compatibilidade eSocial"
-- fornecido pelo time de negócio, mas esse PDF usa os MESMOS códigos
-- ilustrativos do sst_linter_validator.py que 20260901010000 e
-- 20260901020000 já haviam identificado como não-oficiais (ver
-- comentários dessas duas migrations). O reseed oficial da Tabela 24/27
-- (20260901000000) já contém o agente e o exame corretos sob outros
-- códigos:
--   Cádmio e seus compostos tóxicos -> 01.06.001 (não 02.01.011)
--   Cádmio urinário                 -> 0352      (não 0222, que é
--                                       duplicata de "Cádmio na Urina")
--
-- Esta migration remove as linhas órfãs criadas por engano em
-- 20260903000000 e reinsere o cruzamento sob os códigos oficiais reais,
-- e aproveita para preencher referencia_legal/severidade nas oito
-- linhas oficiais que já existiam e que o UPDATE de 20260903000000
-- não alcançou (porque ele mirava nos códigos antigos/errados da
-- Fase 1, já substituídos pelas correções de 20260901).
-- =====================================================================

delete from riscos_exames_compatibilidade
where fator_risco_codigo = '02.01.011' and procedimento_codigo = '0222';

delete from fatores_risco_t24 where codigo_esocial = '02.01.011';
delete from procedimentos_t27 where codigo_esocial = '0222';

insert into riscos_exames_compatibilidade (fator_risco_codigo, procedimento_codigo, obrigatorio, referencia_legal, severidade) values
  ('01.06.001', '0352', true, 'NR-7 Anexo I Q2', 'HARD_BLOCK')
on conflict (fator_risco_codigo, procedimento_codigo) do update set
  obrigatorio = excluded.obrigatorio,
  referencia_legal = excluded.referencia_legal,
  severidade = excluded.severidade;

update riscos_exames_compatibilidade set referencia_legal = 'NR-7 Anexo II'
  where fator_risco_codigo = '02.01.001' and procedimento_codigo = '0281'; -- Ruído -> Audiometria Tonal
update riscos_exames_compatibilidade set referencia_legal = 'Corpo da NR-7'
  where fator_risco_codigo = '02.01.014' and procedimento_codigo = '0295'; -- Calor -> Avaliação clínica ocupacional
update riscos_exames_compatibilidade set referencia_legal = 'NR-7 Anexo I Q2'
  where fator_risco_codigo = '01.08.001' and procedimento_codigo in ('0385', '0095'); -- Chumbo -> Pb-S, ALA-U
update riscos_exames_compatibilidade set referencia_legal = 'NR-7 Anexo III'
  where fator_risco_codigo = '01.18.001' and procedimento_codigo in ('1078', '1057'); -- Sílica -> RX Tórax OIT, Espirometria
update riscos_exames_compatibilidade set referencia_legal = 'NR-7 Anexo V'
  where fator_risco_codigo = '01.03.001' and procedimento_codigo = '0693'; -- Benzeno -> Hemograma c/ plaquetas
update riscos_exames_compatibilidade set referencia_legal = 'NR-7 Anexo V'
  where fator_risco_codigo = '02.01.006' and procedimento_codigo = '0693'; -- Radiações ionizantes -> Hemograma c/ plaquetas
