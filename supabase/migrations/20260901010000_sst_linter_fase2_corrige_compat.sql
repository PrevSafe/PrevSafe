-- =====================================================================
-- PrevSafe :: SST Linter — corrige riscos_exames_compatibilidade após
-- o reseed oficial da Tabela 24 em 20260901000000.
--
-- A Fase 1 (20260831000000) usou códigos do sst_linter_validator.py
-- que NÃO são os códigos oficiais da Tabela 24 para a maioria dos
-- agentes (ex.: usou 01.05.001 para "Calor", mas esse código
-- oficialmente é "Bromo e seus compostos tóxicos"; usou 02.01.005
-- para "Chumbo", que oficialmente é "Perfuratrizes e marteletes
-- pneumáticos"). O reseed da Fase 2 sobrescreveu esses códigos com o
-- agente oficial correto (upsert por código), o que deixou a matriz
-- de compatibilidade antiga apontando para o agente errado.
--
-- Verificado antes de corrigir: nenhuma linha de riscos_inventario
-- referenciava esses códigos (fator_risco_t24_codigo), então a
-- correção abaixo não quebra nenhum vínculo de empresa.
-- =====================================================================

-- 01.01.002 não é um código oficial da Tabela 24 (era só um código
-- ilustrativo do Python de referência) — remove o órfão.
delete from fatores_risco_t24 where codigo_esocial = '01.01.002';

-- Remove os pares que ficaram apontando para o agente errado.
delete from riscos_exames_compatibilidade where (fator_risco_codigo, procedimento_codigo) in (
  ('01.01.002', '0281'),
  ('01.05.001', '0001'),
  ('02.01.005', '1096'),
  ('02.01.005', '1102'),
  ('03.01.004', '0512')
);

-- Reinsere apontando para os códigos oficiais corretos:
-- Ruído (02.01.001) -> Audiometria Tonal (0281)
-- Calor (02.01.014) -> Exame Clínico (0001)
-- Chumbo (01.08.001) -> Chumbo no Sangue (1096) e ALA-U (1102)
-- Radiações ionizantes (02.01.006) -> Hemograma Completo (0512)
insert into riscos_exames_compatibilidade (fator_risco_codigo, procedimento_codigo) values
  ('02.01.001', '0281'),
  ('02.01.014', '0001'),
  ('01.08.001', '1096'),
  ('01.08.001', '1102'),
  ('02.01.006', '0512')
on conflict (fator_risco_codigo, procedimento_codigo) do nothing;
