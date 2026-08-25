-- =====================================================================
-- PrevSafe :: sincroniza a matriz T24 x T27 com o PDF
-- "Matriz de Compatibilidade eSocial" (S-1.3 / NR-7), fornecido como
-- especificação de banco pelo time de negócio em 2026-08-23.
--
-- 1) Acrescenta a linha de Cádmio (T24 02.01.011 -> T27 0222), a única
--    do PDF que ainda não existia em riscos_exames_compatibilidade.
-- 2) Acrescenta referencia_legal e severidade à matriz, espelhando o
--    "Linter Rules DB" do PDF (schema_version 1.3), para que
--    sst_linter_validator.py e o motor de linter no banco emitam o
--    mesmo texto de fundamentação legal e o mesmo nível de bloqueio.
-- =====================================================================

insert into fatores_risco_t24 (codigo_esocial, descricao, tipo_risco, exige_quantificacao, enseja_aposentadoria_especial) values
  ('02.01.011', 'Cádmio e seus compostos tóxicos', 'quimico', true, true)
on conflict (codigo_esocial) do update set
  descricao = excluded.descricao,
  tipo_risco = excluded.tipo_risco,
  exige_quantificacao = excluded.exige_quantificacao,
  enseja_aposentadoria_especial = excluded.enseja_aposentadoria_especial;

insert into procedimentos_t27 (codigo_esocial, nome_exame, periodicidade_meses) values
  ('0222', 'Cádmio na Urina (Cd-U)', 6)
on conflict (codigo_esocial) do update set
  nome_exame = excluded.nome_exame,
  periodicidade_meses = excluded.periodicidade_meses;

alter table riscos_exames_compatibilidade
  add column if not exists referencia_legal text,
  add column if not exists severidade varchar(20) not null default 'HARD_BLOCK'
    check (severidade in ('HARD_BLOCK', 'SOFT_WARNING'));

-- Fundamentação legal de cada cruzamento, conforme a coluna
-- "Referência NR-7" do PDF. Todos HARD_BLOCK: o PDF não descreve
-- nenhum cruzamento com severidade branda.
update riscos_exames_compatibilidade set referencia_legal = 'NR-7 Anexo II'
  where fator_risco_codigo = '01.01.002' and procedimento_codigo = '0281';
update riscos_exames_compatibilidade set referencia_legal = 'Corpo da NR-7'
  where fator_risco_codigo = '01.05.001' and procedimento_codigo = '0001';
update riscos_exames_compatibilidade set referencia_legal = 'NR-7 Anexo I Q2'
  where fator_risco_codigo = '02.01.005' and procedimento_codigo in ('1096', '1102');
update riscos_exames_compatibilidade set referencia_legal = 'NR-7 Anexo III'
  where fator_risco_codigo = '01.18.001' and procedimento_codigo in ('1128', '0476');
update riscos_exames_compatibilidade set referencia_legal = 'NR-7 Anexo V'
  where fator_risco_codigo in ('03.01.004', '01.03.001') and procedimento_codigo = '0512';

insert into riscos_exames_compatibilidade (fator_risco_codigo, procedimento_codigo, obrigatorio, referencia_legal, severidade) values
  ('02.01.011', '0222', true, 'NR-7 Anexo I Q2', 'HARD_BLOCK')
on conflict (fator_risco_codigo, procedimento_codigo) do update set
  obrigatorio = excluded.obrigatorio,
  referencia_legal = excluded.referencia_legal,
  severidade = excluded.severidade;
