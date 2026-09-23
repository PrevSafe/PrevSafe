/**
 * Verificacao do Kit Admissional: gera o PDF DE VERDADE e le os bytes.
 *
 *   node scripts/verificar-kit-admissional.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * O usuario gerou o kit de duas recepcionistas e o PDF saiu com:
 *
 *   1. TEXTO DESCONFIGURADO - "R e g u l a r '", "P r e s e n c a  C o n f i r
 *      m a d a '". Causa: o jsPDF escreve em WinAnsi e, quando a string tem UM
 *      caractere de fora (o "✓"), troca a codificacao da STRING INTEIRA para
 *      UTF-16BE sem marcar isso no PDF. O leitor desenha cada byte como um
 *      caractere: sobra um NUL antes de cada letra.
 *
 *   2. DADOS INVENTADOS - "Regular", "Presenca Confirmada" e "Apto" eram selos
 *      fixos no codigo. O "Apto" do ASO vinha de employee.status === 'ACTIVE':
 *      cadastro ativo virava aptidao medica. A OS declarava "Protetor Auditivo
 *      (CA 14235)" para uma recepcionista - o primeiro item do catalogo - na
 *      mesma pagina em que o kit dizia "0 EPI(s) Registrado(s)".
 *
 * Os dois defeitos so aparecem no PDF pronto, entao e o PDF pronto que este
 * teste examina: renderiza, extrai os operadores de texto e afirma sobre eles.
 *
 * Saida: 0 tudo passou, 1 houve falha, 2 INCONCLUSIVO.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..'
);
const TMP = path.join(RAIZ, '.tmp-kit-verificacao');

function inconclusivo(motivo, detalhe) {
  console.log('\nINCONCLUSIVO — a verificação não pôde ser executada.');
  console.log(`motivo: ${motivo}`);
  if (detalhe) console.log(String(detalhe).split('\n').slice(0, 20).join('\n'));
  process.exit(2);
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const TSCONFIG = path.join(TMP, 'tsconfig.verificacao.json');
fs.writeFileSync(
  TSCONFIG,
  JSON.stringify({
    compilerOptions: {
      outDir: TMP,
      module: 'commonjs',
      target: 'es2020',
      moduleResolution: 'node',
      esModuleInterop: true,
      skipLibCheck: true,
      baseUrl: RAIZ,
      paths: { '@/*': ['./*'] },
    },
    files: [
      path.join(RAIZ, 'lib/pdfExportService.ts'),
      path.join(RAIZ, 'lib/limpezaDeOrdensDeServico.ts'),
    ],
  })
);

try {
  execFileSync('npx', ['tsc', '-p', TSCONFIG], { stdio: 'pipe', shell: true, cwd: RAIZ });
} catch (e) {
  inconclusivo('npx tsc falhou', e.stdout?.toString() || e.message);
}

const achar = (nome) =>
  [path.join(TMP, 'lib', nome), path.join(TMP, nome)].find((p) => fs.existsSync(p));

const CAMINHO = achar('pdfExportService.js');
if (!CAMINHO) inconclusivo('o tsc não emitiu pdfExportService.js');

// O alias "@/" nao e reescrito pelo tsc.
for (const dir of [path.join(TMP, 'lib'), TMP]) {
  if (!fs.existsSync(dir)) continue;
  for (const arquivo of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const alvo = path.join(dir, arquivo);
    const js = fs
      .readFileSync(alvo, 'utf8')
      .replace(/require\("@\/lib\/([^"]+)"\)/g, 'require("./$1")');
    fs.writeFileSync(alvo, js);
  }
}

fs.writeFileSync(path.join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const require_ = createRequire(path.join(RAIZ, 'scripts', 'x.cjs'));

// doc.save() gravaria o arquivo. Captura o PDF em memoria, em vez disso.
//
// O jsPDF define `save` como propriedade DA INSTANCIA, dentro do construtor,
// entao nao adianta mexer no prototype: e preciso envolver o construtor. O
// pdfExportService faz `new jspdf_1.jsPDF(...)`, resolvido na hora da chamada,
// e por isso basta trocar a exportacao antes de carrega-lo.
let ultimoPdf = null;
try {
  const jspdf = require_('jspdf');
  const Original = jspdf.jsPDF || jspdf.default || jspdf;
  function Envolvido(...args) {
    const inst = new Original(...args);
    inst.save = function () {
      ultimoPdf = Buffer.from(this.output('arraybuffer'));
      return this;
    };
    return inst;
  }
  Envolvido.prototype = Original.prototype;
  for (const k of Object.keys(Original)) Envolvido[k] = Original[k];
  jspdf.jsPDF = Envolvido;
} catch (e) {
  inconclusivo('não foi possível carregar o jspdf', e.message);
}

let servico;
try {
  servico = require_(CAMINHO);
} catch (e) {
  inconclusivo('não foi possível carregar o módulo compilado', e.message);
}

const { exportAdmissionKitPDF } = servico;
if (typeof exportAdmissionKitPDF !== 'function') {
  inconclusivo('exportAdmissionKitPDF não foi exportada');
}

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

// ===========================================================================
// Leitura do PDF: os operadores de texto, como o leitor os ve.
// ===========================================================================

/** Todas as strings que o PDF manda desenhar, ja com os escapes desfeitos. */
function trechosDoPdf(buf) {
  const bruto = buf.toString('latin1');
  const trechos = [];
  for (const m of bruto.matchAll(/\((?:\\[\s\S]|[^\\()])*\)\s*Tj/g)) {
    const dentro = m[0].slice(1, m[0].lastIndexOf(')'));
    trechos.push(dentro.replace(/\\([\\()])/g, '$1'));
  }
  return trechos;
}

/** O texto do PDF em uma string so, para procurar por conteudo. */
const textoDoPdf = (buf) => trechosDoPdf(buf).join('\n');

/**
 * O mesmo texto em linha unica. A autoTable quebra a celula em varios
 * operadores - "(CRM" fica numa linha e "54321/BA)" na seguinte -, entao
 * procurar por frase precisa ser feito aqui, e nao no texto com as quebras.
 */
const textoCorrido = (buf) => trechosDoPdf(buf).join(' ').replace(/\s+/g, ' ');

/**
 * Uma string caiu em UTF-16BE (o defeito do "R e g u l a r"): o jsPDF emite os
 * bytes intercalados com NUL quando a string tem caractere fora do WinAnsi.
 */
const trechosQuebrados = (buf) => trechosDoPdf(buf).filter((t) => t.includes('\u0000'));

function gerar(args) {
  ultimoPdf = null;
  exportAdmissionKitPDF(...args);
  if (!ultimoPdf) inconclusivo('exportAdmissionKitPDF não produziu PDF');
  return ultimoPdf;
}

// ===========================================================================
// O cenário
// ===========================================================================
const ORGANIZACAO_SEM_RT = { id: 'org-1', name: 'PrevSafe' };
const ORGANIZACAO = {
  id: 'org-1',
  name: 'PrevSafe',
  technical_responsible_name: 'Gean Monteiro',
  technical_responsible_title: 'Engenheiro de Segurança do Trabalho',
  technical_responsible_council: 'CREA-BA 123456',
};
const CLIENTE = {
  id: 'cli-1',
  legal_name: 'GRAUS CLINICA DE REABILITACAO LTDA',
  trade_name: 'Graus Clínica',
  document_number: '12.483.776/0001-99',
};

/** A recepcionista do caso real: cadastro ativo e nada mais registrado. */
const recepcionistaSemNada = {
  id: 'emp-1',
  client_id: 'cli-1',
  name: 'ANA CLARA SANTOS NASCIMENTO',
  cpf: '07934596561',
  registration_number: '23',
  admission_date: '2026-08-12',
  job_title: 'Recepcionista',
  cbo: '4221-05',
  sector_name: 'Atendimento',
  ghe_id: 'ghe-atendimento',
  ghe_name: 'Atendimento',
  status: 'ACTIVE',
  aso_history: [],
};

const recepcionistaCompleta = {
  ...recepcionistaSemNada,
  id: 'emp-2',
  aso_history: [
    {
      id: 'aso-1',
      aso_type: 'ADMISSIONAL',
      exam_date: '2026-08-10',
      valid_until: '2027-08-10',
      result: 'APTO',
      physician_name: 'Dra. Helena Rocha',
      physician_crm: '54321',
      physician_uf: 'BA',
      exams: [
        {
          id: 'ex-1',
          exam_code_table_27: '0295',
          exam_name: 'Avaliação clínica ocupacional (anamnese e exame físico)',
          exam_date: '2026-08-10',
          procedure_type: 'CLINICO',
          result: 'NORMAL',
          protocol_id: 'prot-1',
        },
        {
          id: 'ex-2',
          exam_code_table_27: '0281',
          exam_name: 'Audiometria tonal ocupacional',
          exam_date: '2026-08-10',
          procedure_type: 'AUDIOMETRIA',
          result: 'ALTERADO',
          protocol_id: 'prot-2',
        },
      ],
    },
  ],
};

const recepcionistaInapta = {
  ...recepcionistaCompleta,
  id: 'emp-3',
  aso_history: [{ ...recepcionistaCompleta.aso_history[0], result: 'INAPTO' }],
};

const ORDEM_DE_SERVICO = {
  id: 'os-1',
  employee_id: 'emp-2',
  os_code: 'OS-NR01-2026-0002',
  issue_date: '2026-08-12',
  employee_signed: true,
  signed_at: '2026-08-12',
  employee_job_title: 'Recepcionista',
  job_description: 'Atendimento ao público e rotinas administrativas.',
  physical_risks: [],
  chemical_risks: [],
  biological_risks: [],
  ergonomic_risks: [],
  accident_mechanical_risks: [],
  mandatory_epis: [],
  safe_work_procedures: ['Manter as vias de circulação desobstruídas'],
  mandatory_employee_obligations: ['Submeter-se aos exames do PCMSO'],
  responsible_engineer_name: 'Gean Monteiro',
  responsible_engineer_registration: 'CREA-BA 123456',
};

const TREINAMENTO_FEITO = {
  id: 'tr-1',
  client_id: 'cli-1',
  training_code: 'CAP-INT-2026-001',
  training_title: 'Treinamento de Integração em SST (NR-01 item 1.7)',
  modality: 'PRESENCIAL',
  workload_hours: 6,
  start_date: '2026-08-12',
  schedule_time: '08:00 às 14:00',
  location_or_platform: 'Sala de treinamento — Unidade Centro',
  instructor_name: 'Carla Menezes',
  instructor_qualification: 'Técnica em Segurança do Trabalho',
  instructor_registration_number: 'MTE/BA 0012345',
  status: 'COMPLETED',
  attendees: [
    {
      employee_id: 'emp-2',
      employee_name: 'ANA CLARA SANTOS NASCIMENTO',
      employee_cpf: '07934596561',
      employee_job_title: 'Recepcionista',
      employee_sector: 'Atendimento',
      present: true,
      completed: true,
      attendance_rate_percent: 100,
      signed: true,
      signature_type: 'DIGITAL_BIOMETRIC',
    },
  ],
};

const TREINAMENTO_AGENDADO = {
  ...TREINAMENTO_FEITO,
  id: 'tr-2',
  status: 'SCHEDULED',
  attendees: [
    {
      ...TREINAMENTO_FEITO.attendees[0],
      employee_id: 'emp-1',
      present: false,
      completed: false,
      attendance_rate_percent: 0,
      signed: false,
      signature_type: undefined,
    },
  ],
};

const ENTREGA_DE_EPI = {
  id: 'epi-1',
  employee_id: 'emp-2',
  delivery_date: '2026-08-12',
  ca_number: '31469',
  epi_name: 'Protetor auricular tipo plug',
  quantity: 1,
  biometric_face_matched: true,
  delivered_by_user_name: 'Almoxarifado',
};

/**
 * Protocolos do PCMSO aplicados ao GHE. Sem eles o kit nao tinha como mostrar
 * "o exame que foi aplicado" - era a segunda queixa do usuario.
 */
const PROTOCOLOS = [
  {
    id: 'prot-1',
    client_id: 'cli-1',
    ghe_id: 'ghe-atendimento',
    exam_code_table_27: '0295',
    exam_name: 'Avaliação clínica ocupacional',
    periodicity_months: 12,
    triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'],
    mandatory_by_standard: 'NR-07',
    status: 'ACTIVE',
  },
  {
    id: 'prot-2',
    client_id: 'cli-1',
    ghe_id: 'ghe-atendimento',
    exam_code_table_27: '0281',
    exam_name: 'Audiometria tonal ocupacional',
    periodicity_months: 12,
    triggers: ['ADMISSIONAL', 'PERIODICO'],
    mandatory_by_standard: 'NR-07',
    status: 'ACTIVE',
  },
  {
    // Protocolo de OUTRO cliente: nao pode aparecer neste kit.
    id: 'prot-outro',
    client_id: 'cli-9',
    ghe_id: 'ghe-de-outra-empresa',
    exam_code_table_27: '1057',
    exam_name: 'Prova de função pulmonar completa',
    periodicity_months: 12,
    triggers: ['ADMISSIONAL'],
    mandatory_by_standard: 'NR-07',
    status: 'ACTIVE',
  },
];

// ===========================================================================
// 1. RENDERIZACAO — nenhuma string pode cair em UTF-16BE
// ===========================================================================
console.log('\n--- 1. Renderização (o "R e g u l a r" do relatório) ---');

const cenarios = [
  // Sem nada: nem protocolo de exame aplicado ao GHE.
  ['sem nada registrado', [recepcionistaSemNada, null, [], null, ORGANIZACAO_SEM_RT, CLIENTE, []]],
  ['tudo registrado', [recepcionistaCompleta, ORDEM_DE_SERVICO, [ENTREGA_DE_EPI], TREINAMENTO_FEITO, ORGANIZACAO, CLIENTE, PROTOCOLOS]],
  ['ASO inapto', [recepcionistaInapta, ORDEM_DE_SERVICO, [ENTREGA_DE_EPI], TREINAMENTO_FEITO, ORGANIZACAO, CLIENTE, PROTOCOLOS]],
  ['treinamento agendado', [recepcionistaSemNada, ORDEM_DE_SERVICO, [], TREINAMENTO_AGENDADO, ORGANIZACAO, CLIENTE, PROTOCOLOS]],
];

const pdfs = {};
for (const [nome, args] of cenarios) {
  const buf = gerar(args);
  pdfs[nome] = buf;
  const quebrados = trechosQuebrados(buf);
  check(
    quebrados.length === 0,
    `${nome}: nenhuma string caiu em UTF-16BE` +
      (quebrados.length ? ` — ${JSON.stringify(quebrados[0].replace(/\u0000/g, '\\0'))}` : '')
  );
}

const semNada = textoDoPdf(pdfs['sem nada registrado']);
const completo = textoDoPdf(pdfs['tudo registrado']);
const inapto = textoDoPdf(pdfs['ASO inapto']);
const agendado = textoDoPdf(pdfs['treinamento agendado']);
const completoCorrido = textoCorrido(pdfs['tudo registrado']);

if (process.env.LER) {
  console.log('===== ' + (process.env.LER === 'cheio' ? 'KIT COMPLETO' : 'KIT SEM NADA') + ' =====');
  console.log(process.env.LER === 'cheio' ? completo : semNada);
  process.exit(0);
}

check(completo.includes('Presença confirmada'), 'acentuação chega intacta ao PDF');

// ===========================================================================
// 2. O KIT VAZIO NAO AFIRMA NADA
// ===========================================================================
console.log('\n--- 2. Colaborador sem OS, sem EPI, sem treinamento e sem ASO ---');

check(!/\bApto\b/.test(semNada), 'não declara "Apto" sem ASO registrado');
check(!semNada.includes('Presença confirmada'), 'não declara presença sem treinamento');
check(!/\bRegular\b/.test(semNada), 'não declara a ficha de EPI "Regular" com zero entregas');
check(!semNada.includes('PRESENTE (100%)'), 'não imprime "PRESENTE (100%)" fixo na lista de presença');
check(!semNada.includes('Biometria Facial / Assinado'), 'não imprime assinatura biométrica fixa');
check(!semNada.includes('CAP-INT-001'), 'não inventa código de treinamento');
check(!semNada.includes('6 Horas (Híbrido)'), 'não inventa carga horária e modalidade');
check(!semNada.includes('(Integral)'), 'não inventa o horário "(Integral)"');
check(!semNada.includes('Treinamento Registrado no SESMT'), 'não afirma registro de treinamento inexistente');

check(semNada.includes('PENDÊNCIAS'), 'traz o quadro de pendências');
check(semNada.includes('ASO admissional não registrado (NR-07 item 7.5.2).'), 'aponta o ASO pendente');
check(semNada.includes('Nenhuma entrega de EPI registrada com número de C.A. (NR-06).'), 'aponta o EPI pendente');
check(
  semNada.includes('Treinamento de integração não registrado no sistema (NR-01 item 1.7).'),
  'aponta o treinamento pendente'
);
check(semNada.includes('Ordem de Serviço (NR-01) ainda não gerada para esta função.'), 'aponta a OS pendente');
check(
  semNada.includes('Responsável técnico não preenchido em Configurações > Responsabilidade Técnica.'),
  'aponta o responsável técnico pendente'
);

// O termo do Art. 158 e assinado pelo trabalhador.
check(
  !semNada.includes('Recebeu gratuitamente os Equipamentos de Proteção Individual'),
  'o termo NÃO declara recebimento de EPI sem entrega registrada'
);
check(
  !semNada.includes('Participou do Treinamento de Integração'),
  'o termo NÃO declara participação em treinamento sem presença'
);
check(
  !semNada.includes('Recebeu e tomou conhecimento formal da Ordem de Serviço'),
  'o termo NÃO declara ciência da OS sem OS gerada'
);
check(
  semNada.includes('Foi orientado(a) de que o descumprimento das normas'),
  'o termo mantém a cláusula que não depende de registro'
);
check(
  semNada.includes('não são declarados neste termo'),
  'o termo diz por que as demais cláusulas não estão nele'
);

check(
  semNada.includes('CONTEÚDO PROGRAMÁTICO PREVISTO'),
  'o conteúdo do treinamento é "PREVISTO", não "MINISTRADO"'
);
check(!semNada.includes('PROGRAMÁTICO MINISTRADO'), 'não afirma conteúdo ministrado sem aula');

check(semNada.includes('079.345.965-61'), 'CPF sai formatado');
check(semNada.includes('GHE não atribuído') || !semNada.includes('Atendimento | Atendimento'),
  'setor e GHE iguais não saem repetidos');

// ===========================================================================
// 3. O KIT COMPLETO DIZ O QUE ESTA REGISTRADO
// ===========================================================================
console.log('\n--- 3. Colaborador com tudo registrado ---');

check(completo.includes('Apto'), 'declara "Apto" quando o ASO diz apto');
check(completo.includes('Dra. Helena Rocha'), 'nomeia o médico do ASO');
check(completoCorrido.includes('(CRM 54321/BA)'), 'traz o CRM do médico');
check(completo.includes('Presença confirmada'), 'confirma a presença quando o participante consta presente');
check(completoCorrido.includes('PRESENTE (100%)'), 'a lista de presença traz o percentual real');
check(completo.includes('Carla Menezes'), 'nomeia o instrutor real');
check(completo.includes('CAP-INT-2026-001'), 'traz o código real do treinamento');
check(completo.includes('08:00 às 14:00'), 'traz o horário real');
check(completo.includes('1 EPI(s) registrado(s) com C.A.'), 'conta as entregas de EPI');
check(completo.includes('31469'), 'traz o C.A. real da entrega');
check(!completo.includes('14235'), 'não traz o C.A. 14235 do catálogo');
check(completo.includes('CONTEÚDO PROGRAMÁTICO MINISTRADO'), 'o conteúdo é "MINISTRADO" quando houve presença');
check(!completo.includes('PENDÊNCIAS'), 'não abre quadro de pendências quando não há pendência');
check(
  completo.includes('Recebeu gratuitamente os Equipamentos de Proteção Individual'),
  'o termo declara o EPI quando há entrega'
);
check(completo.includes('emitida em 12/08/2026'), 'a OS sai como "emitida em", não como "Vigência"');
check(!completo.includes('Vigência'), 'não chama a data de emissão de vigência');

// ===========================================================================
// 4. O CASO QUE MAIS IMPORTA: ASO INAPTO
// ===========================================================================
console.log('\n--- 4. ASO inapto com cadastro ativo ---');

// O selo vinha de employee.status === 'ACTIVE'. Um trabalhador com cadastro
// ativo e ASO INAPTO recebia um kit dizendo "Apto".
check(inapto.includes('Inapto'), 'declara "Inapto" quando o ASO diz inapto');
check(!/\bApto\b(?!\s*com)/.test(inapto.replace(/Inapto/g, '')), 'não declara "Apto" com cadastro ativo e ASO inapto');

// ===========================================================================
// 5. TREINAMENTO REGISTRADO, MAS SEM PRESENCA
// ===========================================================================
console.log('\n--- 5. Treinamento agendado, presença ainda não confirmada ---');

check(
  agendado.includes('Treinamento de integração registrado, mas sem presença confirmada deste trabalhador.'),
  'distingue treinamento marcado de treinamento assistido'
);
check(!agendado.includes('PRESENTE'), 'não marca presença de quem ainda não assistiu');
check(agendado.includes('CONTEÚDO PROGRAMÁTICO PREVISTO'), 'conteúdo previsto enquanto a aula não ocorre');

// ===========================================================================
// 5b. O EXAME APLICADO AO GHE CHEGA AO KIT
// ===========================================================================
// "nao trouxe o exame que foi aplicado": o kit tinha quatro paginas e nenhuma
// delas mostrava exame nenhum.
console.log('\n--- 5b. Anexo de exames (PCMSO / ASO) ---');

check(completo.includes('ANEXO 4: EXAMES OCUPACIONAIS DO PCMSO'), 'o kit traz o anexo de exames');
check(completo.includes('0295'), 'traz o código do exame aplicado ao GHE');
check(completo.includes('0281'), 'traz o segundo exame aplicado ao GHE');
check(
  completoCorrido.includes('Audiometria tonal ocupacional'),
  'traz a denominação oficial da Tabela 27'
);
check(!completo.includes('1057'), 'NÃO traz o exame do protocolo de outro cliente');
check(completo.includes('Alterado'), 'traz o resultado lançado do exame');
check(completo.includes('Dra. Helena Rocha'), 'o anexo nomeia o médico examinador');
check(completoCorrido.includes('Válido até'), 'o anexo traz a validade do ASO');

// Sem protocolo aplicado, o anexo diz onde resolver em vez de sair vazio.
check(
  semNada.includes('NENHUM EXAME APLICADO AO GHE DESTA FUNÇÃO'),
  'sem protocolo, o anexo avisa em vez de sair em branco'
);
check(
  semNada.includes('2. GHE & Inventário de Riscos > botão "Aplicar Exame"'),
  'o aviso diz onde aplicar o exame'
);
check(
  semNada.includes('Nenhum exame do PCMSO aplicado ao GHE desta função'),
  'a falta de exame entra no quadro de pendências'
);

// ASO registrado sem os exames lancados: o S-2220 sai incompleto.
const semExamesLancados = { ...recepcionistaCompleta, id: 'emp-4' };
semExamesLancados.aso_history = [{ ...recepcionistaCompleta.aso_history[0], exams: [] }];
const pdfSemLancamento = textoDoPdf(
  gerar([semExamesLancados, ORDEM_DE_SERVICO, [ENTREGA_DE_EPI], TREINAMENTO_FEITO, ORGANIZACAO, CLIENTE, PROTOCOLOS])
);
check(
  pdfSemLancamento.includes('ASO registrado sem o lançamento dos 2 exame(s)'),
  'ASO sem exames lançados vira pendência, com a contagem certa'
);

// ===========================================================================
// 5c. O CARIMBO DE VERSAO
// ===========================================================================
// O usuario gerou o kit depois da correcao e recebeu o PDF antigo: o
// navegador rodou um bundle em cache. Do PDF nao dava para saber. Agora da.
console.log('\n--- 5c. Carimbo da versão no rodapé ---');

const VERSAO_ESPERADA = fs
  .readFileSync(path.join(RAIZ, 'lib/versaoDoDocumento.ts'), 'utf8')
  .match(/VERSAO_PUBLICADA = '([^']+)'/)?.[1];
check(!!VERSAO_ESPERADA, 'lib/versaoDoDocumento.ts declara a versão publicada');
check(
  completoCorrido.includes(`v${VERSAO_ESPERADA}`),
  `todo PDF sai carimbado com a versão (v${VERSAO_ESPERADA})`
);

// ===========================================================================
// 5d. A OS JA GRAVADA COM DADOS INVENTADOS
// ===========================================================================
// Corrigir o gerador nao alcanca as OS que ja estao no banco: elas continuam
// sendo impressas no kit exatamente como foram criadas.
console.log('\n--- 5d. Limpeza das Ordens de Serviço já gravadas ---');

const CAMINHO_LIMPEZA = achar('limpezaDeOrdensDeServico.js');
let limpeza = null;
if (CAMINHO_LIMPEZA) {
  try {
    limpeza = require_(CAMINHO_LIMPEZA);
  } catch (e) {
    console.log('     (não foi possível carregar a limpeza: ' + e.message + ')');
  }
}
check(!!limpeza?.limparOrdemDeServico, 'limparOrdemDeServico está disponível');

if (limpeza?.limparOrdemDeServico) {
  // A OS real da recepcionista, como o gerador antigo a gravou.
  const osPoluida = {
    id: 'os-velha',
    employee_id: 'emp-1',
    os_code: 'OS-NR01-2026-0002',
    physical_risks: ['Ruído de fundo operacional e iluminação de área de trabalho'],
    chemical_risks: ['Ausência de exposição habitual a agentes químicos agressivos'],
    biological_risks: ['Ausência de exposição a micro-organismos patogênicos'],
    ergonomic_risks: ['Postura de trabalho com exigência de atenção contínua e esforço visual'],
    accident_mechanical_risks: ['Queda em mesmo nível, tropeços e contato com quinas de móveis/máquinas'],
    collective_protections_epc: [
      'Iluminação natural e artificial dimensionada conforme NHO-11',
      'Sistema de combate a incêndio com extintores e hidrantes inspecionados',
    ],
    routine_activities: [
      'Executa rotinas administrativas na recepção.',
      'Manutenção da ordem e limpeza do posto de trabalho 5S',
      'Participar dos DDS (Diálogos Diários de Segurança)',
    ],
    mandatory_epis: [
      {
        epi_name: 'Protetor Auditivo de Inserção tipo Plug Silicone',
        ca_number: '14235',
        usage_recommendation: 'Uso obrigatório nas dependências operacionais',
      },
    ],
  };

  const limpa = limpeza.limparOrdemDeServico(osPoluida);

  check(
    !JSON.stringify(limpa).includes('Ruído de fundo operacional'),
    'remove o risco físico inventado da OS gravada'
  );
  check(
    !JSON.stringify(limpa).includes('quinas de móveis'),
    'remove o risco de acidente inventado da OS gravada'
  );
  check(limpa.mandatory_epis.length === 0, 'remove o EPI pescado do catálogo (CA 14235)');
  check(
    limpa.collective_protections_epc.length === 0,
    'remove as proteções coletivas afirmadas sem visita'
  );
  check(
    limpa.routine_activities.length === 1 &&
      limpa.routine_activities[0].includes('rotinas administrativas'),
    'mantém a rotina real do cargo e remove 5S/DDS'
  );
  check(
    limpa.physical_risks[0]?.includes('Inventário de riscos não elaborado'),
    'esvaziadas as cinco categorias, a OS passa a declarar a pendência'
  );

  // O que NAO pode acontecer: apagar risco que alguem levantou de verdade.
  const osReal = {
    id: 'os-real',
    physical_risks: ['Ruído contínuo 87,3 dB(A) - Dosimetria NHO-01 - Fonte: compressor'],
    chemical_risks: [],
    biological_risks: [],
    ergonomic_risks: [],
    accident_mechanical_risks: [],
    collective_protections_epc: ['Enclausuramento acústico do compressor'],
    routine_activities: ['Operação de prensa hidráulica'],
    mandatory_epis: [
      {
        epi_name: 'Protetor auricular tipo concha',
        ca_number: '31469',
        usage_recommendation: 'Uso obrigatório contínuo durante a jornada',
      },
    ],
  };
  const intacta = limpeza.limparOrdemDeServico(osReal);
  check(intacta === osReal, 'OS sem conteúdo inventado volta intacta (mesma referência)');
  check(intacta.mandatory_epis.length === 1, 'o EPI realmente atribuído NÃO é removido');
  check(
    intacta.physical_risks[0].includes('87,3 dB(A)'),
    'o risco realmente medido NÃO é removido'
  );
}

// ===========================================================================
// 6. A FONTE DOS RISCOS INVENTADOS (conferência no código)
// ===========================================================================
// generateWorkOrderOSForEmployee vive num componente React e nao roda aqui.
// A conferencia e do texto-fonte: se algum destes voltar, a OS volta a
// afirmar risco, EPI ou rotina que ninguem levantou.
console.log('\n--- 6. Gerador da Ordem de Serviço (conferência no código-fonte) ---');

const contexto = fs.readFileSync(path.join(RAIZ, 'context/PrevSafeContext.tsx'), 'utf8');
const proibidos = [
  ['Ruído de fundo operacional', 'risco físico presumido'],
  ['Ausência de exposição habitual a agentes químicos', 'risco químico presumido'],
  ['Ausência de exposição a micro-organismos', 'risco biológico presumido'],
  ['esforço visual', 'risco ergonômico presumido'],
  ['quinas de móveis/máquinas', 'risco de acidente presumido'],
  ['epiCatalog[0].ca_number', 'EPI pescado do catálogo'],
  ['hidrantes inspecionados', 'EPC afirmado sem visita ao local'],
  ['disjuntores DR', 'EPC afirmado sem visita ao local'],
  ['Diálogos Diários de Segurança', 'rotina presumida'],
  ["'0000-00'", 'CBO inexistente'],
  ['GHE Padrão Operacional', 'nome de GHE inventado'],
  ['Unidade Operacional Matriz', 'nome de unidade inventado'],
  ['Auditório Central SST', 'local de treinamento inventado'],
  ['Certificamos que o trabalhador cumpriu com êxito', 'certificação antes da aula'],
];
for (const [agulha, oque] of proibidos) {
  check(!contexto.includes(agulha), `a OS não volta a trazer: ${oque}`);
}
// A frase vive numa constante so, importada pelos dois caminhos que a
// escrevem: o gerador (OS nova) e a limpeza (OS antiga esvaziada).
const limpezaFonte = fs.readFileSync(path.join(RAIZ, 'lib/limpezaDeOrdensDeServico.ts'), 'utf8');
check(
  limpezaFonte.includes('Inventário de riscos não elaborado para este GHE'),
  'a frase de inventário pendente está acentuada e numa fonte única'
);
check(
  contexto.includes('const semInventario = AVISO_SEM_INVENTARIO;'),
  'sem inventário, a OS declara a pendência em vez de inventar risco'
);

// ===========================================================================
// 7. VARREDURA DOS GLIFOS QUE O jsPDF NAO ESCREVE
// ===========================================================================
console.log('\n--- 7. Glifos fora do WinAnsi nos geradores de PDF ---');

const foraDoWinAnsi = (texto) => {
  const achados = new Set();
  for (const ch of texto) {
    const cp = ch.codePointAt(0);
    // Acima de U+2026 tudo quebra, exceto os poucos que a WinAnsi carrega.
    if (cp > 0x2026 && ![0x2030, 0x2039, 0x203a, 0x20ac].includes(cp)) achados.add(ch);
  }
  return [...achados];
};

for (const arquivo of ['lib/pdfExportService.ts', 'lib/reportPdfService.ts']) {
  const caminho = path.join(RAIZ, arquivo);
  if (!fs.existsSync(caminho)) continue;
  const achados = foraDoWinAnsi(fs.readFileSync(caminho, 'utf8'));
  check(
    achados.length === 0,
    `${arquivo} não usa glifo que o jsPDF não escreve` +
      (achados.length ? ` — encontrados: ${achados.join(' ')}` : '')
  );
}

// ===========================================================================
console.log(`\n${casos - falhas}/${casos} casos passaram.`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S).`);
  process.exit(1);
}
console.log('Kit Admissional: nenhum dado inventado e nenhuma string quebrada.');
process.exit(0);
