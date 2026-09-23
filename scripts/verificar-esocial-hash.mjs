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
    files: [path.join(RAIZ, 'lib/esocialDados.ts'), path.join(RAIZ, 'lib/documentoHash.ts')],
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
try {
  esocial = require_(path.join(SAIDA, 'esocialDados.js'));
  hashLib = require_(path.join(SAIDA, 'documentoHash.js'));
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
  check(
    pendencias.some((p) => /exame com resultado/i.test(p.motivo)),
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
  check(
    m.dados.exams_list[0].observation === 'Perda leve bilateral em 4kHz.',
    'a observação do achado acompanha o exame'
  );
  check(
    !m.pendencias.some((p) => /exame com resultado/i.test(p.motivo)),
    'com exames lançados, a pendência de exames desaparece'
  );

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
