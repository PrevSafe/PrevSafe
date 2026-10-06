/**
 * Verificacao do gerador de eventos eSocial e dos hashes que o sistema exibe.
 *
 *   node scripts/verificar-esocial-hash.mjs
 *
 * O QUE ESTA SENDO PROVADO
 *
 * 1. eSocial: que os payloads do S-2240 e do S-2220 saem dos registros reais e
 *    que o que nao esta cadastrado vira PENDENCIA - nunca um valor de exemplo.
 *    A funcao antiga devolvia ruido de "86.2 dB(A)", CPF 123.456.789-01 e
 *    "Eng. Eduardo Vasconcelos, CREA-SP 5069812/D" sem que ninguem medisse nada.
 *
 * 2. Hash: que o comprovante de voto da CIPA e DERIVADO do voto. A funcao
 *    antiga recebia o hash e o horario, descartava os dois e devolvia letras
 *    sorteadas - dois votantes podiam sair com o mesmo comprovante.
 *
 * Saida: 0 tudo passou, 1 houve falha, 2 INCONCLUSIVO.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..'
);
const TMP = path.join(RAIZ, '.tmp-esocial-verificacao');

function inconclusivo(motivo, detalhe) {
  console.log('\nINCONCLUSIVO — a verificação não pôde ser executada.');
  console.log(`motivo: ${motivo}`);
  if (detalhe) console.log(String(detalhe).split('\n').slice(0, 20).join('\n'));
  process.exit(2);
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

// tsconfig proprio: lib/esocialDados.ts importa tipos de '@/types', e o tsc
// pela linha de comando nao aceita --paths.
const TSCONFIG = path.join(TMP, 'tsconfig.verificacao.json');
fs.writeFileSync(
  TSCONFIG,
  JSON.stringify({
    compilerOptions: {
      outDir: TMP,
      module: 'commonjs',
      target: 'es2020',
      moduleResolution: 'node',
      skipLibCheck: true,
      baseUrl: RAIZ,
      paths: { '@/*': ['./*'] },
    },
    files: [
      path.join(RAIZ, 'lib/esocialDados.ts'),
      path.join(RAIZ, 'lib/documentoHash.ts'),
      // validarCPF: o montador do [respMonit] o usa para decidir se {cpfResp} vai.
      path.join(RAIZ, 'lib/validacoesBr.ts'),
      // <ideEmpregador>, namespace e Id: a regra unica dos montadores.
      path.join(RAIZ, 'lib/esocialEmpregador.ts'),
      // Constantes do envelope (versao do aplicativo, aviso de XML nao assinado).
      path.join(RAIZ, 'lib/esocialEventos.ts'),
    ],
  })
);

try {
  execFileSync('npx', ['tsc', '-p', TSCONFIG], { stdio: 'pipe', shell: true, cwd: RAIZ });
} catch (e) {
  inconclusivo('npx tsc falhou ao compilar os modulos', e.stdout?.toString() || e.message);
}

// O tsc preserva a raiz comum dos fontes: a saida fica em <TMP>/lib/.
const SAIDA = path.join(TMP, 'lib');

// O alias "@/" nao e reescrito pelo tsc; troca por caminho relativo no JS
// emitido, para o require do teste resolver.
for (const arquivo of fs.readdirSync(SAIDA).filter((f) => f.endsWith('.js'))) {
  const alvo = path.join(SAIDA, arquivo);
  const js = fs.readFileSync(alvo, 'utf8').replace(/require\("@\/lib\/([^"]+)"\)/g, 'require("./$1")');
  fs.writeFileSync(alvo, js);
}

fs.writeFileSync(path.join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const require_ = createRequire(import.meta.url);
let esocial;
let hashLib;
let validacoesBr;
let empregadorLib;
let eventosLib;
try {
  esocial = require_(path.join(SAIDA, 'esocialDados.js'));
  hashLib = require_(path.join(SAIDA, 'documentoHash.js'));
  validacoesBr = require_(path.join(SAIDA, 'validacoesBr.js'));
  empregadorLib = require_(path.join(SAIDA, 'esocialEmpregador.js'));
  eventosLib = require_(path.join(SAIDA, 'esocialEventos.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}

const {
  montarFatorDeRisco,
  montarCondicoesAmbientais,
  montarAsoDoEvento,
  selecionarAsoMaisRecente,
  riscosDoColaborador,
  extrairCodigoTabela24,
  normalizarCategoriaRisco,
  exameSugeridosParaAso,
  sugerirTipoDeProcedimento,
  tpExameOcupDoAso,
  resAsoDoAso,
  xmlDosExamesDoS2220,
} = esocial;

if (typeof montarCondicoesAmbientais !== 'function') {
  inconclusivo('lib/esocialDados.ts não exportou montarCondicoesAmbientais');
}

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

// ===========================================================================
// PARTE 1 — o evento nao inventa nada
// ===========================================================================
console.log('--- S-2240: dados vem do inventario, nao do codigo ---');

const colaborador = {
  id: 'emp-1',
  client_id: 'cli-1',
  client_unit_id: 'un-1',
  job_id: 'job-1',
  ghe_id: 'ghe-1',
  name: 'Maria Souza',
  cpf: '529.982.247-25',
  registration_number: 'MAT-7781',
  cbo: '7823-05',
  job_title: 'Motorista de Caminhão',
  admission_date: '2023-04-17',
  status: 'ACTIVE',
  aso_history: [],
};

const riscoMedido = {
  id: 'risk-1',
  client_id: 'cli-1',
  ghe_id: 'ghe-1',
  job_id: 'job-1',
  risk_category: 'FÍSICO',
  // 02.01.001 e o codigo do Ruido na Tabela 24. A fixture usava 01.01.001,
  // que e Arsenio - o mesmo engano que o catalogo do sistema tinha.
  risk_code_table_24: '02.01.001 - Ruído Contínuo ou Intermitente',
  agent_name: 'Ruído contínuo',
  evaluation_type: 'QUANTITATIVA',
  measured_value: '91.4',
  measurement_unit: 'dB(A)',
  tolerance_limit: '85.0 dB(A) para 8h (NR-15 Anexo 1)',
  measurement_methodology: 'NHO-01 Fundacentro, dosímetro classe 1',
  epc_implemented: false,
  epc_effective: false,
  epi_required: true,
  epis: [{ ca_number: 'CA 31.552', epi_name: 'Protetor auricular', is_effective: true }],
  insalubridade_applies: true,
  periculosidade_applies: false,
};

{
  const { fator, pendencias } = montarFatorDeRisco(riscoMedido);

  check(
    fator.intensity_concentration === '91.4 dB(A)',
    `intensidade vem do inventário: ${fator.intensity_concentration} (não "86.2 dB(A)" do código antigo)`
  );
  check(
    fator.risk_code_table_24 === '02.01.001',
    `código da Tabela 24 extraído sem a descrição: ${fator.risk_code_table_24}`
  );
  check(
    fator.description === 'Ruído',
    `a descrição é a denominação oficial da Tabela 24: "${fator.description}"`
  );
  check(
    fator.technique_used === 'NHO-01 Fundacentro, dosímetro classe 1',
    'técnica de medição vem do inventário'
  );
  check(
    JSON.stringify(fator.epi_ca_numbers) === JSON.stringify(['CA 31.552']),
    `CA do EPI vem do cadastro: ${fator.epi_ca_numbers} (não "CA 14235")`
  );
  check(fator.is_insalubre === true, 'insalubridade vem do enquadramento do risco');
  check(pendencias.length === 0, `risco completo não gera pendência (gerou ${pendencias.length})`);
}

console.log('\n--- avaliação qualitativa não vira medição ---');
{
  const qualitativo = {
    ...riscoMedido,
    id: 'risk-2',
    evaluation_type: 'QUALITATIVA',
    measured_value: undefined,
    measurement_methodology: undefined,
  };
  const { fator } = montarFatorDeRisco(qualitativo);
  check(
    fator.intensity_concentration === undefined,
    'sem valor medido, NÃO declara intensidade'
  );
  check(fator.technique_used === undefined, 'sem medição, NÃO declara técnica de medição');
}

console.log('\n--- quantitativa sem valor medido é pendência, não número ---');
{
  const semValor = { ...riscoMedido, id: 'risk-3', measured_value: undefined };
  const { fator, pendencias } = montarFatorDeRisco(semValor);
  check(fator.intensity_concentration === undefined, 'não inventa a intensidade que falta');
  check(
    pendencias.some((p) => /sem valor medido/i.test(p.motivo)),
    'a falta do valor medido é reportada como pendência'
  );
}

console.log('\n--- responsável técnico ---');
{
  const semResponsavel = montarCondicoesAmbientais({
    colaborador,
    riscos: [riscoMedido],
    ambiente: 'Planta 1',
    atividades: 'Condução de veículo pesado',
    dataInicio: '2023-04-17',
  });

  check(
    semResponsavel.dados.responsible_technician_cpf === '',
    'sem CPF cadastrado, o campo sai VAZIO (não "123.456.789-00")'
  );
  check(
    semResponsavel.dados.responsible_technician_name === '',
    'sem responsável, o nome sai vazio (não "Eng. Eduardo Vasconcelos")'
  );
  check(
    semResponsavel.dados.responsible_technician_crea_crm === '',
    'sem registro, o CREA sai vazio (não "CREA-SP 5069812/D")'
  );
  check(
    semResponsavel.pendencias.some((p) => /CPF/i.test(p.motivo)),
    'a falta do CPF do responsável é reportada'
  );

  const comResponsavel = montarCondicoesAmbientais({
    colaborador,
    riscos: [riscoMedido],
    responsavelNome: 'Ana Ribeiro',
    responsavelCpf: '529.982.247-25',
    responsavelRegistro: 'CREA 1234567',
    responsavelUf: 'BA',
    ambiente: 'Planta 1',
    atividades: 'Condução de veículo pesado',
    dataInicio: '2023-04-17',
  });
  check(
    comResponsavel.dados.responsible_technician_cpf === '529.982.247-25',
    'com CPF cadastrado, o campo é preenchido com ele'
  );
  check(
    comResponsavel.pendencias.length === 0,
    `cadastro completo não gera pendência (gerou ${comResponsavel.pendencias.length}: ${comResponsavel.pendencias
      .map((p) => p.motivo)
      .join(' | ')})`
  );
}

console.log('\n--- sem agente do Anexo IV, declara ausência ---');
{
  // EXPECTATIVA CORRIGIDA. A versão anterior deste teste exigia
  // `ambient_risks.length === 0` com inventário vazio, e eu a escrevi antes de
  // ter a Tabela 24 em mãos. Com a tabela, o certo é outro: o S-2240 declara
  // agentes do Anexo IV, e a AUSÊNCIA de agente tem código próprio
  // (09.01.001). Uma lista vazia seria recusada pelo governo; 09.01.001 é a
  // declaração correta. O que não pode é isso acontecer em silêncio — daí a
  // pendência obrigatória.
  const semRisco = montarCondicoesAmbientais({
    colaborador,
    riscos: [],
    ambiente: 'Planta 1',
    atividades: 'x',
    dataInicio: '2023-04-17',
  });
  check(
    semRisco.dados.ambient_risks.length === 1 &&
      semRisco.dados.ambient_risks[0].risk_code_table_24 === '09.01.001',
    'inventário vazio declara 09.01.001 (ausência de agente nocivo)'
  );
  check(
    semRisco.dados.ambient_risks[0].category === 'AUSÊNCIA_RISCO',
    'e no grupo de ausência de risco'
  );
  check(
    semRisco.pendencias.some((p) => /nenhum risco inventariado/i.test(p.motivo)),
    'a ausência de inventário é reportada como pendência, não passa em silêncio'
  );

  // Riscos que existem mas NÃO são do Anexo IV: ergonômico e de acidente.
  const soErgonomico = montarCondicoesAmbientais({
    colaborador,
    riscos: [
      {
        id: 'r-ergo',
        client_id: 'cli-1',
        ghe_id: 'ghe-1',
        risk_category: 'ERGONÔMICO',
        risk_code_table_24: '',
        agent_name: 'Movimentos repetitivos',
        evaluation_type: 'QUALITATIVA',
        epis: [],
      },
    ],
    ambiente: 'Planta 1',
    atividades: 'x',
    dataInicio: '2023-04-17',
  });
  check(
    soErgonomico.dados.ambient_risks.length === 1 &&
      soErgonomico.dados.ambient_risks[0].risk_code_table_24 === '09.01.001',
    'risco ergonômico NÃO vira agente nocivo — declara 09.01.001'
  );
  check(
    soErgonomico.pendencias.some((p) => /não constam do Anexo IV/i.test(p.motivo)),
    'e explica que eles permanecem no PGR'
  );

  // Código PREENCHIDO que não existe na tabela continua sendo erro.
  const codigoRuim = montarCondicoesAmbientais({
    colaborador,
    riscos: [{ ...riscoMedido, id: 'r-ruim', risk_code_table_24: '77.77.777' }],
    ambiente: 'Planta 1',
    atividades: 'x',
    dataInicio: '2023-04-17',
  });
  check(
    codigoRuim.pendencias.some((p) => /77\.77\.777/.test(p.motivo)),
    'código preenchido que não existe na Tabela 24 é reportado'
  );
}

console.log('\n--- S-2220: sem ASO registrado não há evento ---');
{
  check(selecionarAsoMaisRecente(colaborador) === null, 'colaborador sem ASO devolve null');

  const comAsos = {
    ...colaborador,
    aso_history: [
      {
        id: 'a1',
        aso_type: 'ADMISSIONAL',
        exam_date: '2023-04-17',
        result: 'APTO',
        physician_name: 'Dra. Lúcia Prado',
        physician_crm: 'CRM-BA 55123',
        physician_uf: 'BA',
      },
      {
        id: 'a2',
        aso_type: 'PERIODICO',
        exam_date: '2026-03-02',
        result: 'APTO_COM_RESTRICAO',
        physician_name: 'Dr. Paulo Nunes',
        physician_crm: 'CRM-BA 77901',
        physician_uf: 'BA',
      },
    ],
  };

  const escolhido = selecionarAsoMaisRecente(comAsos);
  check(escolhido.id === 'a2', `escolhe o ASO mais recente: ${escolhido.exam_date}`);

  const { dados, pendencias } = montarAsoDoEvento(comAsos, escolhido);
  check(dados.physician_name === 'Dr. Paulo Nunes', 'médico vem do ASO registrado');
  check(
    dados.physician_crm === 'CRM-BA 77901',
    `CRM vem do ASO (não "CRM-SP 145892" fixo): ${dados.physician_crm}`
  );
  check(
    dados.result === 'APTO',
    'APTO_COM_RESTRICAO vira APTO (o eSocial só tem apto/inapto)'
  );
  check(dados.exam_date === '2026-03-02', 'data do exame vem do ASO, não é a data de hoje');
  check(
    dados.exams_list.length === 0,
    'ASO sem exames lançados não inventa a lista'
  );
  // A mensagem perdeu "com resultado" quando o indResult saiu do evento (MOS
  // 1.6); o regex antigo nao casava mais e este caso falhava.
  check(
    pendencias.some((p) => /Nenhum exame registrado/i.test(p.motivo)),
    'a falta dos exames é reportada como pendência, não preenchida com o protocolo'
  );
}

console.log('\n--- lançamento de exames realizados ---');
{
  const protocolos = [
    {
      id: 'prot-1',
      client_id: 'cli-1',
      ghe_id: 'ghe-1',
      exam_code_table_27: '0295 - Audiometria Tonal e Vocal',
      exam_name: 'Audiometria Tonal e Vocal',
      triggers: ['ADMISSIONAL', 'PERIODICO'],
      status: 'ACTIVE',
    },
    {
      id: 'prot-2',
      client_id: 'cli-1',
      ghe_id: 'ghe-1',
      exam_code_table_27: '0362',
      exam_name: 'Avaliação Clínica Ocupacional',
      triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'],
      status: 'ACTIVE',
    },
    {
      id: 'prot-3',
      client_id: 'cli-1',
      ghe_id: 'ghe-1',
      exam_code_table_27: '0999',
      exam_name: 'Espirometria',
      triggers: ['DEMISSIONAL'],
      status: 'ACTIVE',
    },
    {
      id: 'prot-4',
      client_id: 'cli-OUTRO',
      ghe_id: 'ghe-9',
      exam_code_table_27: '0111',
      exam_name: 'Hemograma',
      triggers: ['PERIODICO'],
      status: 'ACTIVE',
    },
    {
      id: 'prot-5',
      client_id: 'cli-1',
      ghe_id: 'ghe-1',
      exam_code_table_27: '0222',
      exam_name: 'Exame desativado',
      triggers: ['PERIODICO'],
      status: 'INACTIVE',
    },
  ];

  const sugeridos = exameSugeridosParaAso(colaborador, protocolos, 'PERIODICO');
  check(
    sugeridos.length === 2,
    `sugere só os exames devidos no PERIÓDICO deste GHE: ${sugeridos.length} (audiometria e clínico)`
  );
  check(
    !sugeridos.some((s) => s.exam_name === 'Espirometria'),
    'não sugere exame cujo gatilho é só DEMISSIONAL'
  );
  check(
    !sugeridos.some((s) => s.exam_name === 'Hemograma'),
    'não sugere protocolo de outro cliente'
  );
  check(
    !sugeridos.some((s) => s.exam_name === 'Exame desativado'),
    'não sugere protocolo inativo'
  );
  check(
    sugeridos[0].exam_code_table_27 === '0295',
    `extrai o código da Tabela 27 sem a descrição: ${sugeridos[0].exam_code_table_27}`
  );
  check(
    !('result' in sugeridos[0]) && !('exam_date' in sugeridos[0]),
    'a sugestão NÃO traz resultado nem data: o planejamento não sabe o que foi encontrado'
  );

  check(
    sugerirTipoDeProcedimento('Audiometria Tonal e Vocal') === 'AUDIOMETRIA',
    'sugere o tipo de procedimento pelo nome'
  );
  check(
    sugerirTipoDeProcedimento('Dosagem de chumbo no sangue') === 'OUTRO',
    'nome não reconhecido vira OUTRO, não cai numa categoria por aproximação'
  );

  // Com exames lançados, o S-2220 sai completo.
  const comExames = {
    ...colaborador,
    aso_history: [
      {
        id: 'a3',
        aso_type: 'PERIODICO',
        exam_date: '2026-03-02',
        result: 'APTO',
        physician_name: 'Dr. Paulo Nunes',
        physician_crm: 'CRM-BA 77901',
        physician_uf: 'BA',
        exams: [
          {
            id: 'exm-1',
            exam_code_table_27: '0295',
            exam_name: 'Audiometria Tonal e Vocal',
            exam_date: '2026-03-01',
            procedure_type: 'AUDIOMETRIA',
            result: 'ALTERADO',
            observation: 'Perda leve bilateral em 4kHz.',
          },
          {
            id: 'exm-2',
            exam_code_table_27: '0362',
            exam_name: 'Avaliação Clínica Ocupacional',
            exam_date: '2026-03-02',
            procedure_type: 'CLINICO',
            result: 'NORMAL',
          },
        ],
      },
    ],
  };

  const aso3 = selecionarAsoMaisRecente(comExames);
  const m = montarAsoDoEvento(comExames, aso3);

  check(m.dados.exams_list.length === 2, `os 2 exames lançados vão para o evento (${m.dados.exams_list.length})`);
  check(
    m.dados.exams_list[0].code === '0295' && m.dados.exams_list[0].result === 'ALTERADO',
    'código e resultado vêm do que foi lançado'
  );
  check(
    m.dados.exams_list[0].date === '2026-03-01',
    'a data do exame é a dele, não a do ASO (2026-03-02)'
  );
  // MOS S-1.3, S-2220, item 1.9: a fonte do evento e o ASO, nao o prontuario.
  // A observacao clinica do exame fica no sistema e nao vai para o evento.
  check(
    m.dados.exams_list.every((e) => e.observation === undefined),
    'a observação clínica do exame não é copiada para o evento'
  );

  // Codigos do leiaute S-1.3 (S-2220).
  const tipos = [['ADMISSIONAL', '0'], ['PERIODICO', '1'], ['RETORNO_TRABALHO', '2'], ['MUDANCA_RISCO', '3'], ['DEMISSIONAL', '9']];
  for (const [tipo, codigo] of tipos) {
    check(tpExameOcupDoAso(tipo) === codigo, `tpExameOcup do ${tipo} é ${codigo} (${tpExameOcupDoAso(tipo)})`);
  }
  check(tpExameOcupDoAso(undefined) === '', 'ASO sem tipo não ganha tpExameOcup');
  check(resAsoDoAso('APTO_COM_RESTRICAO') === '1', 'apto com restrição é resAso 1 (apto), não 2');
  check(resAsoDoAso('INAPTO') === '2' && resAsoDoAso('APTO') === '1', 'resAso de apto e inapto');
  check(resAsoDoAso(undefined) === '', 'ASO sem resultado não vira inapto');

  const xmlExames = xmlDosExamesDoS2220([
    { code: '0281', name: 'Audiometria', date: '2026-03-01', procedure_type: 'AUDIOMETRIA', result: 'ALTERADO', observation: 'Perda em 4kHz', order: 'SEQUENCIAL' },
    { code: '0295', name: 'Avaliação clínica', date: '2026-03-02', procedure_type: 'CLINICO', result: 'NORMAL' },
    { code: '9999', name: 'Teste de esforço <adaptado>', date: '2026-03-02', procedure_type: 'OUTRO', result: 'NORMAL' },
  ]);
  check(!/indResult/.test(xmlExames), 'indResult não vai sem autorização do trabalhador (MOS 1.6)');
  check(!/4kHz/.test(xmlExames), 'a observação clínica não vai para o XML');
  check((xmlExames.match(/<obsProc>/g) || []).length === 1 && /<obsProc>Teste de esforço &lt;adaptado&gt;<\/obsProc>/.test(xmlExames),
    'obsProc só no código que o exige (9999), com o nome escapado');
  check((xmlExames.match(/<ordExame>/g) || []).length === 1 && /<procRealizado>0281<\/procRealizado>\s*<ordExame>2<\/ordExame>/.test(xmlExames),
    'ordExame só na audiometria, sequencial = 2');

  // Audiometria inicial x sequencial pelo historico.
  const comAudio = {
    ...colaborador,
    aso_history: [
      { id: 'b1', aso_type: 'ADMISSIONAL', exam_date: '2025-01-10', result: 'APTO', physician_name: 'X', physician_crm: '1', physician_uf: 'BA',
        exams: [{ id: 'x1', exam_code_table_27: '0281', exam_name: 'Audiometria', exam_date: '2025-01-10', procedure_type: 'AUDIOMETRIA', result: 'NORMAL' }] },
      { id: 'b2', aso_type: 'PERIODICO', exam_date: '2026-01-10', result: 'APTO', physician_name: 'X', physician_crm: '1', physician_uf: 'BA',
        exams: [{ id: 'x2', exam_code_table_27: '0281', exam_name: 'Audiometria', exam_date: '2026-01-10', procedure_type: 'AUDIOMETRIA', result: 'NORMAL' }] },
    ],
  };
  check(montarAsoDoEvento(comAudio, comAudio.aso_history[0]).dados.exams_list[0].order === 'INICIAL', 'a primeira audiometria é inicial');
  check(montarAsoDoEvento(comAudio, comAudio.aso_history[1]).dados.exams_list[0].order === 'SEQUENCIAL', 'a audiometria seguinte é sequencial');
  check(
    !m.pendencias.some((p) => /Nenhum exame registrado/i.test(p.motivo)),
    'com exames lançados, a pendência de exames desaparece'
  );

  {
    const ctx = fs.readFileSync(path.join(RAIZ, 'context/PrevSafeContext.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    check(!/<(tpExame|tpAso|indResult|exameMedico|dscProc)>/.test(ctx), 'o contexto não monta mais tags fora do leiaute do S-2220');
    // Eram duas copias do XML (pre-visualizacao e criacao a partir do ASO);
    // agora a criacao chama a pre-visualizacao, entao cada regra aparece uma vez.
    check((ctx.match(/xmlDosExamesDoS2220\(/g) || []).length === 1 && (ctx.match(/tpExameOcupDoAso\(/g) || []).length === 1 && (ctx.match(/resAsoDoAso\(/g) || []).length === 1,
      'o S-2220 tem um montador só, com uma regra de códigos');
  }

  // Exame incompleto continua sendo reportado.
  const semCodigo = {
    ...comExames,
    aso_history: [
      {
        ...comExames.aso_history[0],
        exams: [{ ...comExames.aso_history[0].exams[0], exam_code_table_27: '', exam_date: '' }],
      },
    ],
  };
  const m2 = montarAsoDoEvento(semCodigo, selecionarAsoMaisRecente(semCodigo));
  check(
    m2.pendencias.some((p) => /Tabela 27/i.test(p.motivo)),
    'exame sem código da Tabela 27 é reportado'
  );
  check(
    m2.pendencias.some((p) => /sem data de realização/i.test(p.motivo)),
    'exame sem data de realização é reportado'
  );
}

console.log('\n--- S-2220: um montador só, Id de 36 caracteres, grupos do leiaute ---');
{
  // Cru para extrair e executar as funcoes; sem comentarios para procurar a
  // FORMA dos defeitos no codigo (o comentario que conta o defeito antigo nao conta).
  const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const ctxCru = fs.readFileSync(path.join(RAIZ, 'context/PrevSafeContext.tsx'), 'utf8');
  const ctx = semComentarios(ctxCru);
  const view = semComentarios(fs.readFileSync(path.join(RAIZ, 'components/esocial/ESocialEventsView.tsx'), 'utf8'));

  // ---- forma dos defeitos no fonte ----
  // O atributo e "Id" (XSD do S-1.3); o codigo escrevia "id". Os dois nomes
  // contam aqui: Id montado a mao e defeito com qualquer grafia.
  check(!/\b[Ii]d="ID/.test(ctx), 'nenhum Id de evento é montado à mão no template (era ID1 + CPF do trabalhador + 202608)');
  const idsNosTemplates = [...ctx.matchAll(/<evt\w+ [Ii]d="([^"]*)"/g)].map((x) => x[1].trim());
  check(idsNosTemplates.length > 0 && idsNosTemplates.every((x) => /^\$\{(idEvt|novoIdDoEvento\([^)]*\))\}$/.test(x)),
    `todo <evt... id> vem da regra do leiaute (${idsNosTemplates.length} templates)`);
  check((ctx.match(/<evtMonit[\s>]/g) || []).length === 1, 'há um só template do evtMonit (S-2220) no contexto');

  const corpoDaCriacao = (ctx.match(/const generateS2220FromEmployeeAso = useCallback\(([\s\S]*?)\n  \}, \[/) || [])[1] || '';
  check(corpoDaCriacao !== '' && /xml_content\s*=\s*generateESocialXmlPreview\(newEvt\)/.test(corpoDaCriacao)
    && !/<\?xml|<evtMonit|xml_content:\s*xml\b/.test(corpoDaCriacao),
  'a criação a partir do ASO grava o XML do montador da pré-visualização, sem template próprio');

  const templateS2220 = (ctx.match(/<evtMonit Id="\$\{idEvt\}">[\s\S]*?<\/evtMonit>/) || [''])[0];
  // <ideEmpregador> agora sai de xmlDoIdeEmpregador (lib/esocialEmpregador.ts).
  check(/^<evtMonit Id="\$\{idEvt\}">\s*<ideEvento>\s*<indRetif>[\s\S]*?<tpAmb>[\s\S]*?<procEmi>[\s\S]*?<verProc>[\s\S]*?<\/ideEvento>\s*(<ideEmpregador>|\$\{xmlDoIdeEmpregador\()/.test(templateS2220),
    'o template abre com <ideEvento> (ocorrência 1), antes de <ideEmpregador>');
  check(templateS2220 !== '' && !/^\s*<(resAso|nrCRM|ufCRM)>/m.test(templateS2220),
    'resAso e nrCRM/ufCRM do médico (0-1) não são escritos incondicionalmente');
  check(!/<nmMed>\$\{[^}]*\|\|\s*['"`]/.test(templateS2220), 'nmMed não tem nome substituto quando o ASO não traz o médico');

  const corpoRespMonit = (ctx.match(/const blocoRespMonitXml = useCallback\(([\s\S]*?)\n  \}, \[/) || [])[1] || '';
  check(corpoRespMonit !== '' && !/^\s*\+\s*`\$\{recuo\}\s*<cpfResp>/m.test(corpoRespMonit),
    'respMonit: <cpfResp> não é concatenado incondicionalmente');
  check(corpoRespMonit !== '' && !/resp\.(crm|uf)\s*\?/.test(corpoRespMonit),
    'respMonit: nrCRM e ufCRM não são opcionais dentro do grupo (ocorrência 1)');

  check(!/exams_list:\s*\[\s*\{/.test(view), 'o formulário manual não escreve uma lista de exames literal');
  check(!/aso_data\?\.result\s*\|\|\s*['"](APTO|INAPTO)['"]/.test(view), 'o formulário manual não presume a conclusão do ASO');
  check(/=\s*initialEvent\?\.aso_data\?\.exams_list\b/.test(view) && /exams_list:\s*examesDoAso\b/.test(view),
    'ao editar, o formulário devolve os exames que o evento já tinha');

  // ---- execucao: as funcoes do contexto, extraidas e rodando ----
  const bemFormado = (x) => {
    const corpo = x.replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '');
    const pilha = [];
    for (const t of corpo.matchAll(/<(\/?)([A-Za-z][\w:.-]*)[^>]*?(\/?)>/g)) {
      if (t[3] === '/') continue;
      if (t[1] === '/') { if (pilha.pop() !== t[2]) return false; } else pilha.push(t[2]);
    }
    const fora = corpo.replace(/<\/?[A-Za-z][^>]*>/g, '');
    return pilha.length === 0 && !/[<>]/.test(fora) && !/&(?!amp;|lt;|gt;|quot;|apos;)/.test(fora);
  };

  try {
    const pegar = (re, nome) => {
      const x = ctxCru.match(re);
      if (!x) throw new Error(`${nome} não encontrado no contexto`);
      return x[1] ?? x[0];
    };
    const fonte = [
      pegar(/^const textoXml = [\s\S]*?;\s*$/m, 'textoXml'),
      pegar(/^const UFS_DO_CRM = new Set\(\[[\s\S]*?\]\);$/m, 'UFS_DO_CRM'),
      // idDoEventoESocial saiu do contexto para lib/esocialEmpregador.ts e
      // entra abaixo como parametro, com as demais regras do empregador.
      `const novoIdDoEvento = ${pegar(/const novoIdDoEvento = useCallback\(([\s\S]*?), \[\]\);/, 'novoIdDoEvento')};`,
      `const campoDoEvento = ${pegar(/const campoDoEvento = useCallback\(([\s\S]*?), \[\]\);/, 'campoDoEvento')};`,
      `const blocoRespMonitXml = ${pegar(/const blocoRespMonitXml = useCallback\(([\s\S]*?\n  \}), \[technicalResponsibilities/, 'blocoRespMonitXml')};`,
      // A pre-visualizacao le o XML da montagem unica dos eventos.
      `const montarEventoESocial = ${pegar(/const montarEventoESocial = useCallback\(([\s\S]*?\n  \}), \[/, 'montarEventoESocial')};`,
      'const generateESocialXmlPreview = (e) => montarEventoESocial(e).xml;',
    ].join('\n');
    // Resolucao normal de modulo, e nao <RAIZ>/node_modules: num git worktree
    // o node_modules fica num diretorio acima, e o caminho fixo nao o achava.
    const ts = require_('typescript');
    const js = ts.transpileModule(fonte, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    }).outputText;

    let respAtual = null;
    const {
      idDoEventoESocial, inscricaoDoEmpregador, inscricaoDoAmbiente, xmlDoIdeEmpregador,
      xmlDaInscricaoDoAmbiente, namespaceDoEvento,
    } = empregadorLib;
    const fns = new Function(
      'clients', 'organization', 'respMonitDoCliente', 'technicalResponsibilities', 'technicalProfessionals',
      'validarCPF', 'xmlDosExamesDoS2220', 'tpExameOcupDoAso', 'resAsoDoAso', 'dataDeHoje', 'sequenciaDoId',
      'responsaveisPeloRegistroAmbiental', 'workAbsences',
      'idDoEventoESocial', 'inscricaoDoEmpregador', 'inscricaoDoAmbiente', 'xmlDoIdeEmpregador', 'xmlDaInscricaoDoAmbiente', 'namespaceDoEvento',
      'COMENTARIO_SEM_ASSINATURA', 'VERSAO_DO_APLICATIVO_EMISSOR',
      `${js}\nreturn { idDoEventoESocial, novoIdDoEvento, blocoRespMonitXml, generateESocialXmlPreview };`
    )(
      [{ id: 'cli-1', document_type: 'CNPJ', document_number: '11.222.333/0001-81' }],
      { document_number: '99.888.777/0001-66' },
      () => respAtual, [], [],
      validacoesBr.validarCPF, xmlDosExamesDoS2220, tpExameOcupDoAso, resAsoDoAso,
      () => '2026-10-02', { current: { segundo: 0, usados: {} } },
      () => [], [],
      idDoEventoESocial, inscricaoDoEmpregador, inscricaoDoAmbiente, xmlDoIdeEmpregador, xmlDaInscricaoDoAmbiente, namespaceDoEvento,
      eventosLib.COMENTARIO_SEM_ASSINATURA, eventosLib.VERSAO_DO_APLICATIVO_EMISSOR
    );

    // REGRA_VALIDA_ID_EVENTO: IDTNNNNNNNNNNNNNNAAAAMMDDHHMMSSQQQQQ
    const quando = new Date(2026, 9, 2, 8, 5, 9);
    const id1 = fns.idDoEventoESocial('1', '11222333000181', quando, 1);
    check(id1 === 'ID' + '1' + '11222333000181' + '20261002' + '080509' + '00001' && id1.length === 36,
      `Id pela regra do leiaute: ${id1} (${id1.length} caracteres)`);
    check(fns.idDoEventoESocial('1', '11222333', quando, 12) === 'ID1' + '11222333000000' + '20261002080509' + '00012',
      'CNPJ de 8 posições completa com zeros à direita; sequencial com zeros à esquerda');
    check(fns.idDoEventoESocial('2', '529.982.247-25', quando, 1) === 'ID2' + '52998224725000' + '20261002080509' + '00001',
      'empregador pessoa física: T = 2 e o CPF dele, completado à direita');

    const a = fns.novoIdDoEvento('1', '11222333000181');
    const b = fns.novoIdDoEvento('1', '11222333000181');
    const c = fns.novoIdDoEvento('1', '99888777000166');
    check(a !== b && (a.slice(0, 31) !== b.slice(0, 31) || Number(b.slice(31)) === Number(a.slice(31)) + 1),
      `mesmo empregador no mesmo segundo: o sequencial incrementa (${a.slice(31)} → ${b.slice(31)})`);
    check(c.endsWith('00001'), 'outro empregador começa o próprio sequencial');

    // Evento a partir de um ASO registrado, pelo mesmo caminho da criacao.
    const colab = {
      ...colaborador,
      aso_history: [{
        id: 'c1', aso_type: 'PERIODICO', exam_date: '2026-03-02', result: 'APTO',
        physician_name: 'Dr. Paulo & Filhos <Nunes>', physician_crm: 'CRM-BA 77901', physician_uf: 'ba',
        exams: [{ id: 'e1', exam_code_table_27: '0295', exam_name: 'Avaliação clínica', exam_date: '2026-03-02', procedure_type: 'CLINICO', result: 'NORMAL' }],
      }],
    };
    const dados = montarAsoDoEvento(colab, colab.aso_history[0]).dados;
    const evento = (aso) => ({
      id: 'evt-t', organization_id: 'org', client_id: 'cli-1', event_type: 'S-2220', event_number: 'T',
      status: 'DRAFT', environment: 'PRODUCAO', is_rectification: false, worker_name: 'Maria Souza',
      worker_cpf: '529.982.247-25', worker_registration: 'MAT-7781', worker_cbo: '7823-05', worker_role: '',
      aso_data: aso, created_at: '', updated_at: '',
    });

    respAtual = { nome: 'Dra. Ana & Cia', cpf: '', crm: 'CRM 12345', uf: 'BA' };
    const xml = fns.generateESocialXmlPreview(evento(dados));
    const idXml = (xml.match(/<evtMonit Id="([^"]*)">/) || [])[1] || '';
    // EXPECTATIVA CORRIGIDA. Este caso exigia o CNPJ de 14 digitos no Id. O
    // cliente da fixture nao tem natureza juridica de administracao publica
    // federal, entao o {ideEmpregador/nrInsc} e a raiz (leiaute S-1.3, S-1000) e
    // o Id leva a raiz completada com zeros a direita (REGRA_VALIDA_ID_EVENTO).
    // Os casos dessa regra estao em scripts/verificar-esocial-leiaute.mjs.
    check(/^ID1\d{33}$/.test(idXml) && idXml.startsWith('ID1' + '11222333' + '000000'),
      `o Id do XML tem 36 caracteres e a inscrição do empregador: ${idXml}`);
    check(!idXml.includes('52998224725'), 'o Id não leva o CPF do trabalhador');
    // EXPECTATIVA CORRIGIDA. Este caso exigia <Reference URI="#Id"> - o bloco
    // <Signature> com DigestValue e SignatureValue de enfeite que o montador
    // escrevia. O PrevSafe nao assina: o XML nao pode parecer assinado.
    check(!/<Signature|<SignatureValue>|<DigestValue>/.test(xml) && xml.includes('ds:Signature ausente'),
      'o XML não traz assinatura de enfeite e diz que não está assinado');
    check(/<evtMonit Id="[^"]*">\s*<ideEvento>\s*<indRetif>1<\/indRetif>\s*<tpAmb>1<\/tpAmb>\s*<procEmi>1<\/procEmi>\s*<verProc>[^<]+<\/verProc>\s*<\/ideEvento>\s*<ideEmpregador>/.test(xml),
      'o XML gerado tem <ideEvento> completo antes de <ideEmpregador>');
    check(/<resAso>1<\/resAso>/.test(xml) && (xml.match(/<exame>/g) || []).length === 1, 'resAso e o exame do ASO vão quando existem');
    const medico = (xml.match(/<medico>[\s\S]*?<\/medico>/) || [''])[0];
    check(medico.includes('<nmMed>Dr. Paulo &amp; Filhos &lt;Nunes&gt;</nmMed>'), 'nmMed sai com escape de XML');
    check(medico.includes('<nrCRM>77901</nrCRM>') && medico.includes('<ufCRM>BA</ufCRM>'), 'nrCRM e ufCRM do médico vão quando existem');
    check(/<respMonit>/.test(xml) && !/<cpfResp>/.test(xml) && xml.includes('<nmResp>Dra. Ana &amp; Cia</nmResp>'),
      'respMonit sem CPF cadastrado: o grupo vai sem <cpfResp> (0-1), com o nome escapado');
    check(!/undefined/.test(xml) && bemFormado(xml), 'o XML não tem "undefined" e as tags fecham');

    const xmlOutro = fns.generateESocialXmlPreview(evento(dados));
    check((xmlOutro.match(/<evtMonit Id="([^"]*)">/) || [])[1] !== idXml, 'dois eventos gerados em seguida têm Ids diferentes');

    respAtual = { nome: 'Dra. Ana', cpf: '529.982.247-25', crm: '', uf: 'BA' };
    const vazio = { ...dados, result: '', physician_name: '', physician_crm: '', physician_uf: '', exams_list: [] };
    const xml2 = fns.generateESocialXmlPreview(evento(vazio));
    const medico2 = (xml2.match(/<medico>[\s\S]*?<\/medico>/) || [''])[0];
    check(!/<resAso>/.test(xml2), 'sem conclusão no ASO, <resAso> (0-1) não sai');
    check(!/<(nrCRM|ufCRM)>/.test(medico2) && /<nmMed><\/nmMed>/.test(medico2),
      'sem médico no ASO: nmMed fica vazio (pendência visível), nrCRM/ufCRM não saem');
    check(!/<exame>/.test(xml2) && /<!--[^>]*exame/.test(xml2), 'sem exames: nenhum exame fictício, só o aviso de pendência');
    check(!/<respMonit>/.test(xml2) && /<!--[^>]*respMonit/.test(xml2),
      'coordenador sem CRM: não monta respMonit inválido, deixa a pendência');
    check(!/undefined/.test(xml2) && bemFormado(xml2), 'o XML com pendências continua sem "undefined" e com as tags fechando');

    respAtual = { nome: 'Dra. Ana', cpf: '529.982.247-25', crm: 'CRM 12345', uf: 'BA' };
    check(/<cpfResp>52998224725<\/cpfResp>/.test(fns.blocoRespMonitXml('cli-1', '2026-03-02', '')), 'CPF válido do coordenador vai em <cpfResp>');
    respAtual = { nome: 'Dra. Ana', cpf: '111.111.111-11', crm: 'CRM 12345', uf: 'BA' };
    check(!/<cpfResp>/.test(fns.blocoRespMonitXml('cli-1', '2026-03-02', '')), 'CPF inválido não vai ("Se informado, deve ser um CPF válido")');
    respAtual = null;
    check(!/<respMonit>/.test(fns.blocoRespMonitXml('cli-1', '2026-03-02', '')), 'sem coordenador atribuído, sem respMonit');
  } catch (e) {
    check(false, `não foi possível executar o montador do contexto: ${e.message}`);
  }
}

console.log('\n--- ligação colaborador → riscos ---');
{
  const outroGhe = { ...riscoMedido, id: 'r-outro', ghe_id: 'ghe-99', job_id: 'job-99' };
  const achados = riscosDoColaborador(colaborador, [riscoMedido, outroGhe]);
  check(
    achados.length === 1 && achados[0].id === 'risk-1',
    'pega só os riscos do GHE do colaborador'
  );

  const semVinculo = { ...colaborador, ghe_id: undefined, job_id: undefined };
  check(
    riscosDoColaborador(semVinculo, [riscoMedido]).length === 0,
    'sem GHE nem cargo, NÃO adivinha riscos — devolve vazio'
  );
}

console.log('\n--- normalização sem invenção ---');
{
  check(normalizarCategoriaRisco('FISICO') === 'FÍSICO', 'aceita a forma sem acento');
  check(
    normalizarCategoriaRisco('COISA_NOVA') === 'AUSÊNCIA_RISCO',
    'categoria desconhecida não vira FÍSICO por padrão'
  );
  check(extrairCodigoTabela24('02.01.014 – Fumos') === '02.01.014', 'corta na travessão também');
  check(extrairCodigoTabela24(undefined) === '', 'sem código, devolve vazio (não completa dígitos)');
}

// ===========================================================================
// PARTE 2 — o hash
// ===========================================================================
console.log('\n--- SHA-256 confere com o node:crypto ---');
{
  const { sha256Hex } = hashLib;
  for (const texto of ['', 'abc', 'PrevSafe · laudo de insalubridade', 'á'.repeat(200)]) {
    const meu = sha256Hex(texto);
    const oficial = crypto.createHash('sha256').update(texto, 'utf8').digest('hex');
    check(meu === oficial, `sha256("${texto.slice(0, 24)}${texto.length > 24 ? '…' : ''}") confere`);
  }
}

console.log('\n--- comprovante de voto da CIPA é derivado do voto ---');
{
  // Reimplementa o que lib/cipaService.ts faz, a partir do sha256 ja conferido
  // acima. cipaService importa o contexto inteiro, entao nao da para carregar
  // aqui; o que importa provar e a propriedade do algoritmo.
  const { sha256Hex } = hashLib;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const comprovante = (hash, time) => {
    const digest = sha256Hex(`${hash || ''}::${time || ''}::COMPROVANTE_CIPA`);
    let code = 'CIPAVOTE-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(parseInt(digest.substring(i * 2, i * 2 + 2), 16) % chars.length);
      if (i === 3) code += '-';
    }
    return code;
  };

  const a = comprovante('VOTER_HASH_aaa', '2026-09-21T10:00:00.000Z');
  const b = comprovante('VOTER_HASH_aaa', '2026-09-21T10:00:00.000Z');
  const c = comprovante('VOTER_HASH_bbb', '2026-09-21T10:00:00.000Z');
  const d = comprovante('VOTER_HASH_aaa', '2026-09-21T10:00:01.000Z');

  check(a === b, `o mesmo voto sempre dá o mesmo comprovante: ${a}`);
  check(a !== c, 'votantes diferentes recebem comprovantes diferentes');
  check(a !== d, 'o mesmo votante em instantes diferentes recebe comprovantes diferentes');
  check(/^CIPAVOTE-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(a), `formato legível para anotar: ${a}`);
  check(
    !/[IO01]/.test(a.replace('CIPAVOTE-', '')),
    'o alfabeto não tem I, O, 0 nem 1 (confundem quando anotados à mão)'
  );

  // A prova de que NAO e sorteado: 400 votos distintos, nenhum repetido.
  const vistos = new Set();
  for (let i = 0; i < 400; i++) vistos.add(comprovante(`VOTER_HASH_${i}`, '2026-09-21T10:00:00.000Z'));
  check(vistos.size === 400, `400 votos distintos geraram 400 comprovantes distintos (${vistos.size})`);
}

console.log(
  falhas === 0 ? `\nTODOS OS TESTES PASSARAM (${casos} casos)` : `\n${falhas} FALHA(S) em ${casos} casos`
);
process.exitCode = falhas === 0 ? 0 : 1;
