-- =====================================================================
-- PrevSafe :: corrige o escopo do unique de CNPJ em clinicas_credenciadas
--
-- 20260903090000 criou clinicas_credenciadas_cnpj_uk como unique GLOBAL
-- de cnpj, mas a tabela é multi-tenant (empresa_id) como todo o resto
-- do schema. Uma clínica legitimamente credenciada por duas empresas
-- clientes diferentes da PrevSafe não conseguia ser cadastrada pela
-- segunda empresa. O unique correto é por (empresa_id, cnpj).
-- =====================================================================

drop index if exists clinicas_credenciadas_cnpj_uk;

create unique index if not exists clinicas_credenciadas_empresa_cnpj_uk
  on clinicas_credenciadas (empresa_id, cnpj) where cnpj is not null;
