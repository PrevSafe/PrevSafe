-- =====================================================================
-- PrevSafe :: SST Linter — corrige riscos_exames_compatibilidade e
-- periodicidade_meses: os códigos de procedimento usados desde a
-- Fase 1 (0001, 0512, 1096, 1102, 1128, 0476) também vieram do
-- sst_linter_validator.py e não são os códigos reais da Tabela 27 —
-- só 0281 (Audiometria) bateu com o oficial por coincidência. Com o
-- catálogo oficial completo semeado em 20260901000000, ficou claro
-- que, por exemplo, 0001 é "1,1-dicloro-2,2-bis (P-clorofeniletileno)"
-- e não "Exame Clínico". Esta migration substitui pelos códigos
-- oficiais corretos (localizados no catálogo real por nome de exame)
-- e move a periodicidade da Fase 1 para eles.
-- =====================================================================

delete from riscos_exames_compatibilidade where (fator_risco_codigo, procedimento_codigo) in (
  ('02.01.001', '0281'),
  ('02.01.014', '0001'),
  ('01.08.001', '1096'),
  ('01.08.001', '1102'),
  ('01.18.001', '1128'),
  ('01.18.001', '0476'),
  ('01.03.001', '0512'),
  ('02.01.006', '0512')
);

insert into riscos_exames_compatibilidade (fator_risco_codigo, procedimento_codigo) values
  ('02.01.001', '0281'), -- Ruído -> Audiometria tonal ocupacional
  ('02.01.014', '0295'), -- Calor -> Avaliação clínica ocupacional
  ('01.08.001', '0385'), -- Chumbo -> Chumbo sanguíneo
  ('01.08.001', '0095'), -- Chumbo -> Ácido delta aminolevulínico (ALA)
  ('01.18.001', '1078'), -- Sílica livre -> Radiografia de tórax Padrão OIT
  ('01.18.001', '1057'), -- Sílica livre -> Prova de função pulmonar (espirometria)
  ('01.03.001', '0693'), -- Benzeno -> Hemograma com contagem de plaquetas
  ('02.01.006', '0693')  -- Radiações ionizantes -> Hemograma com contagem de plaquetas
on conflict (fator_risco_codigo, procedimento_codigo) do nothing;

-- Limpa a periodicidade que ficou presa nos códigos errados da Fase 1...
update procedimentos_t27 set periodicidade_meses = null
where codigo_esocial in ('0001', '0512', '1096', '1102', '1128', '0476');

-- ...e aplica nos códigos oficiais corretos.
update procedimentos_t27 set periodicidade_meses = 12 where codigo_esocial in ('0281', '0295', '1078', '1057');
update procedimentos_t27 set periodicidade_meses = 6 where codigo_esocial in ('0385', '0095', '0693');
