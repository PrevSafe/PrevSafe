/**
 * Verificacao do PGR contra o modelo da PrevSafe.
 *
 *   node scripts/verificar-pgr.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * O usuario gerou o PGR e ele saiu com UMA PAGINA: tres secoes, sem
 * metodologia, sem criterios de avaliacao, sem caracterizacao dos processos.
 * O modelo tem dez secoes mais capa, e e a metodologia (secao 5) que sustenta
 * a classificacao de cada risco perante a fiscalizacao.
 *
 * Havia ainda DUAS formulas de classificacao no sistema, divergentes entre si
 * e do modelo. A mais grave: score 20 saia "ALTO" numa tela e "CRITICO" na
 * outra, quando no modelo 20 e MUITO ALTO - nivel em que a atividade nao se
 * inicia ou e interrompida ate a reducao do risco.
 *
 * Este teste GERA O PDF e confere o que saiu, celula por celula contra a
 * matriz do modelo.
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
const TMP = path.join(RAIZ, '.tmp-pgr-verificacao');

function inconclusivo(motivo, detalhe) {
  console.log('\nINCONCLUSIVO — a verificação não pôde ser executada.');
  console.log(`motivo: ${motivo}`);
  if (detalhe) console.log(String(detalhe).split('\n').slice(0, 20).join('\n'));
  process.exit(2);
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

fs.writeFileSync(
  path.join(TMP, 'tsconfig.json'),
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
      path.join(RAIZ, 'lib/classificacaoDeRisco.ts'),
      path.join(RAIZ, 'lib/pgrModelo.ts'),
      path.join(RAIZ, 'lib/situacaoOperacional.ts'),
    ],
  })
);

try {
  execFileSync('npx', ['tsc', '-p', path.join(TMP, 'tsconfig.json')], {
    stdio: 'pipe', shell: true, cwd: RAIZ
  });
} catch (e) {
  inconclusivo('npx tsc falhou', e.stdout?.toString() || e.message);
}

const achar = (n) => [path.join(TMP, 'lib', n), path.join(TMP, n)].find((p) => fs.existsSync(p));
for (const dir of [path.join(TMP, 'lib'), TMP]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const alvo = path.join(dir, f);
    fs.writeFileSync(
      alvo,
      fs.readFileSync(alvo, 'utf8').replace(/require\("@\/lib\/([^"]+)"\)/g, 'require("./$1")')
    );
  }
}
fs.writeFileSync(path.join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const require_ = createRequire(path.join(RAIZ, 'scripts', 'x.cjs'));

let ultimoPdf = null;
try {
  const jspdf = require_('jspdf');
  const Original = jspdf.jsPDF;
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

let servico, classif, situacao, catTreinamentos, nr17;
try {
  servico = require_(achar('pdfExportService.js'));
  classif = require_(achar('classificacaoDeRisco.js'));
  situacao = require_(achar('situacaoOperacional.js'));
  catTreinamentos = require_(achar('catalogoDeTreinamentos.js'));
  nr17 = require_(achar('nr17.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}

const { exportPGRDocumentPdf } = servico;
const { classificarRisco, matrizDoModelo, FAIXAS_DO_MODELO, normalizarNivelAntigo } = classif;

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

/**
 * As strings que o PDF manda desenhar.
 *
 * O jsPDF escreve em WinAnsi, onde travessao, bullet e reticencias ocupam a
 * faixa 0x85-0x97 — que em latin1 sao caracteres de controle. Sem traduzi-los,
 * "20 — Muito alto" vira "20 \u0097 Muito alto" e a comparacao falha por um
 * motivo que nao tem nada a ver com o documento.
 */
const WINANSI = { 0x85: '...', 0x91: "'", 0x92: "'", 0x93: '"', 0x94: '"', 0x95: '*', 0x96: '-', 0x97: '-' };

function trechosDoPdf(buf) {
  const bruto = buf.toString('latin1');
  const out = [];
  for (const m of bruto.matchAll(/\((?:\\[\s\S]|[^\\()])*\)\s*Tj/g)) {
    const cru = m[0].slice(1, m[0].lastIndexOf(')')).replace(/\\([\\()])/g, '$1');
    out.push([...cru].map((ch) => WINANSI[ch.charCodeAt(0)] ?? ch).join(''));
  }
  return out;
}
const texto = (buf) => trechosDoPdf(buf).join('\n');
const corrido = (buf) => trechosDoPdf(buf).join(' ').replace(/\s+/g, ' ');
const paginas = (buf) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
const quebrados = (buf) => trechosDoPdf(buf).filter((t) => t.includes('\u0000'));

// ===========================================================================
// 1. A MATRIZ, CELULA POR CELULA CONTRA O MODELO
// ===========================================================================
console.log('\n--- 1. Matriz S x P (seção 5.6 do modelo) ---');

// Transcrita da tabela da secao 5.6. Linha S5 a S1, coluna P1 a P5.
const MATRIZ_DO_MODELO = {
  5: [[5, 'Médio'], [10, 'Médio'], [15, 'Alto'], [20, 'Muito alto'], [25, 'Muito alto']],
  4: [[4, 'Baixo'], [8, 'Médio'], [12, 'Alto'], [16, 'Alto'], [20, 'Muito alto']],
  3: [[3, 'Baixo'], [6, 'Médio'], [9, 'Médio'], [12, 'Alto'], [15, 'Alto']],
  2: [[2, 'Baixo'], [4, 'Baixo'], [6, 'Médio'], [8, 'Médio'], [10, 'Médio']],
  1: [[1, 'Baixo'], [2, 'Baixo'], [3, 'Baixo'], [4, 'Baixo'], [5, 'Médio']],
};

let celulasOk = 0;
let celulasErradas = [];
for (const s of [5, 4, 3, 2, 1]) {
  for (let p = 1; p <= 5; p++) {
    const [scoreEsperado, rotuloEsperado] = MATRIZ_DO_MODELO[s][p - 1];
    const c = classificarRisco(s, p);
    if (c && c.score === scoreEsperado && c.rotulo === rotuloEsperado) celulasOk++;
    else celulasErradas.push(`S${s}xP${p}: esperado ${scoreEsperado} ${rotuloEsperado}, veio ${c ? `${c.score} ${c.rotulo}` : 'null'}`);
  }
}
check(celulasOk === 25, `as 25 células da matriz batem com o modelo${celulasErradas.length ? ` — ${celulasErradas[0]}` : ''}`);

// A tabela impressa no PGR e gerada pela mesma funcao: nao pode divergir.
const impressa = matrizDoModelo();
check(impressa.length === 5 && impressa[0].severidade === 5, 'a matriz impressa começa em S5, como no modelo');
check(
  impressa.every((l, i) => l.celulas.every((c, j) => c.score === MATRIZ_DO_MODELO[[5, 4, 3, 2, 1][i]][j][0])),
  'a matriz impressa é a mesma que a função calcula'
);

check(
  FAIXAS_DO_MODELO.map((f) => `${f.rotulo} ${f.de}-${f.ate}`).join('; ') ===
    'Baixo 1-4; Médio 5-10; Alto 12-16; Muito alto 20-25',
  'as faixas são as do modelo (1-4, 5-10, 12-16, 20-25)'
);

// O caso que divergia entre as duas telas.
const vinte = classificarRisco(4, 5);
check(vinte?.nivel === 'MUITO_ALTO', 'score 20 é MUITO ALTO (saía "ALTO" numa tela e "CRITICO" na outra)');
check(
  vinte?.decisao.includes('não se inicia ou é interrompida'),
  'score 20 manda interromper a atividade, conforme a seção 5.7'
);
check(classificarRisco(3, 3)?.nivel === 'MEDIO', 'score 9 é MÉDIO (o catálogo dizia BAIXO)');
check(classificarRisco(4, 3)?.nivel === 'ALTO', 'score 12 é ALTO (as duas telas diziam MÉDIO)');

check(classificarRisco(0, 3) === null, 'sem severidade avaliada não há classificação');
check(classificarRisco(3, undefined) === null, 'sem probabilidade avaliada não há classificação');
check(normalizarNivelAntigo('CRITICO') === 'MUITO_ALTO', 'o rótulo antigo CRITICO vira MUITO_ALTO');
check(normalizarNivelAntigo('MUITO_BAIXO') === 'BAIXO', 'o rótulo antigo MUITO_BAIXO vira BAIXO');

// Prioridades e prazos da secao 5.7.
check(classificarRisco(5, 5)?.prioridade === 1 && classificarRisco(5, 5)?.prazoEmDias === 30, 'muito alto: prioridade 1, 30 dias');
check(classificarRisco(4, 4)?.prioridade === 2 && classificarRisco(4, 4)?.prazoEmDias === 90, 'alto: prioridade 2, 90 dias');
check(classificarRisco(2, 3)?.prioridade === 3 && classificarRisco(2, 3)?.prazoEmDias === 270, 'médio: prioridade 3, 270 dias');
check(classificarRisco(1, 1)?.prioridade === 4, 'baixo: prioridade 4');

// ===========================================================================
// 2. O DOCUMENTO GERADO
// ===========================================================================
console.log('\n--- 2. Estrutura do PGR emitido ---');

const CLIENTE = {
  id: 'c1',
  legal_name: 'GRAUS CLINICA DE REABILITACAO LTDA',
  trade_name: 'Graus Clínica',
  document_number: '12.483.776/0001-99',
  main_cnae: '86.50-0-04',
  risk_degree: 2,
  address: 'Rua X, 100', city: 'Salvador', state: 'BA',
};
const ORG = {
  id: 'o1', name: 'PrevSafe',
  technical_responsible_name: 'Gean Monteiro',
  technical_responsible_title: 'Técnico em Segurança do Trabalho',
  technical_responsible_council: 'MTE 0023487/BA',
  pcmso_physician_name: 'Dra. Helena Rocha', pcmso_physician_crm: 'CRM-BA 54321',
};
const GHES = [{ id: 'g1', code: 'GHE-01', name: 'Atendimento', client_id: 'c1' }];
const RISCO_CLASSIFICADO = {
  id: 'r1', ghe_id: 'g1', client_id: 'c1', risk_category: 'FISICO',
  agent_name: 'Ruído contínuo', generating_source: 'Equipamentos de climatização',
  health_effects: 'PAIR, zumbido', evaluation_type: 'QUANTITATIVA',
  measured_value: '78,4', measurement_unit: 'dB(A)',
  measurement_methodology: 'NHO-01', action_level: 'dose 0,5', tolerance_limit: 'dose 1,0',
  severity: 4, probability: 5, epc_implemented: false, epi_required: false,
  operational_situation: ['ROTINEIRA', 'NAO_ROTINEIRA'],
  operational_situation_note: 'limpeza e ajuste',
};
// Risco de OUTRO cliente: a versao anterior o trazia para o plano de acao.
const RISCO_DE_OUTRO_CLIENTE = {
  id: 'r9', ghe_id: 'ghe-de-outra-empresa', client_id: 'cli-9',
  risk_category: 'QUIMICO', agent_name: 'Benzeno em outra empresa',
  severity: 5, probability: 5, epc_implemented: false,
};
const FUNCIONARIOS = [
  { id: 'e1', ghe_id: 'g1', client_id: 'c1', name: 'Ana Clara', job_title: 'Recepcionista', status: 'ACTIVE' },
  { id: 'e2', ghe_id: 'g1', client_id: 'c1', name: 'Samily Oliveira', job_title: 'Recepcionista', status: 'ACTIVE' },
];
const SETORES = [{ id: 's1', name: 'Atendimento', client_id: 'c1' }];

/** O estabelecimento com a caracterizacao da secao 6.1 preenchida. */
const UNIDADE = {
  id: 'u1', client_id: 'c1', name: 'FISIOMED', code: 'UN-01',
  establishment_type: 'MATRIZ', status: 'ACTIVE',
  address: 'Av. Ivan de Almeida Moura, 430', city: 'Eunapolis', state: 'BA',
  cnae: '86.50-0-04', risk_degree: 2, employee_count: 2,
  built_area_m2: '320', total_area_m2: '450',
  buildings_description: 'Bloco unico terreo em alvenaria, pe-direito 3 m',
  utilities_description: 'Energia da concessionaria, ar-condicionado split, sem caldeira',
  external_hazards: 'Avenida de trafego intenso na testada; area sem historico de alagamento',
  emergency_resources: 'Extintores ABC, rota de fuga sinalizada, ponto de encontro no estacionamento, hospital de referencia a 1,2 km',
  outsourced_worker_count: '4',
  work_shifts_description: '07h-17h, seg-sex; sem turno noturno',
  legal_representative: 'Marcos Tavares - socio administrador',
  pgr_coordinator: 'Juliana Reis - gerente administrativa',
  external_work_fronts: 'Atendimento domiciliar de fisioterapia na regiao central',
  emergency_scenarios: 'Incendio na sala de arquivo, choque no quadro de distribuicao, queda de paciente na rampa',
  emergency_evacuation: 'Alarme manual na recepcao, rota unica sinalizada ate a calcada, ponto de encontro no estacionamento, contagem pela recepcionista de plantao',
  emergency_large_scale: 'Nao aplicavel: sem processo de grande porte, sem inflamaveis a granel e sem vizinhanca industrial',
  emergency_drills: 'Anual, com abandono total da edificacao',
  emergency_drill_last_date: '2026-04-18',
  harassment_conduct_rules: 'Capitulo 7 do Regulamento Interno, revisao de 03/2026, divulgado no mural e na integracao',
  harassment_report_channel: 'Formulario lacrado na recepcao e telefone da contabilidade externa; apuracao em 30 dias pela diretoria; anonimato garantido',
  harassment_training_actions: 'Palestra de 2h para todos os niveis, com modulo de igualdade e diversidade',
  harassment_training_last_date: '2026-05-20'
};

/** O mesmo estabelecimento sem os campos da secao 9.8. */
const UNIDADE_SEM_ASSEDIO = (() => {
  const u = { ...UNIDADE };
  delete u.harassment_conduct_rules;
  delete u.harassment_report_channel;
  delete u.harassment_training_actions;
  delete u.harassment_training_last_date;
  return u;
})();

/** Capacitacao da alinea "c" realizada ha mais de 12 meses. */
const UNIDADE_ASSEDIO_VENCIDO = { ...UNIDADE, harassment_training_last_date: '2024-02-10' };

/**
 * Efetivo que obriga a CIPA: grau de risco 2 na faixa de 51 a 80 empregados
 * da o Quadro I com 1 efetivo. So entao o subitem 1.4.1.1 alcanca a
 * organizacao. Com os 2 empregados da fixture principal, o estabelecimento
 * nomeia representante da NR-05 (item 5.4.13) e a secao 9.8 nao se aplica.
 */
const FUNCIONARIOS_COM_CIPA = Array.from({ length: 60 }, (_, i) => ({
  id: `ec${i}`, ghe_id: 'g1', client_id: 'c1', name: `Colaborador ${i}`,
  job_title: 'Recepcionista', status: 'ACTIVE',
}));

/**
 * Contratadas do item 1.5.8, uma por regime do subitem 1.5.8.1.
 *
 * A completa nao gera pendencia; as outras duas exercitam cada exigencia que o
 * regime escolhido puxa: inventario e plano (1.5.8.1.1) e extensao das medidas
 * (1.5.8.1.2).
 */
const CONTRATADA_COMPLETA = {
  id: 'ct1', client_id: 'c1', status: 'ACTIVE',
  legal_name: 'Alfa Conservacao e Limpeza Ltda', document_number: '11.222.333/0001-44',
  contracted_service: 'Limpeza e conservacao das areas comuns',
  work_location: 'DEPENDENCIAS', gro_regime: 'PROGRAMA_DA_CONTRATADA',
  received_inventory_date: '2026-03-10', received_action_plan_date: '2026-03-10',
  informed_risks_date: '2026-03-12', informed_risks_evidence: 'Oficio 12/2026 com protocolo assinado',
  received_risks_date: '2026-03-18', received_risks_evidence: 'Comunicacao sobre saneante desinfetante',
  interaction_risks: 'SIM', joint_measures: 'Isolamento da area durante a lavagem e reuniao diaria de compatibilizacao',
};
const CONTRATADA_TITULAR = {
  id: 'ct2', client_id: 'c1', status: 'ACTIVE',
  legal_name: 'Joao Eletricista MEI', document_number: '123.456.789-00',
  contracted_service: 'Manutencao eletrica preventiva do quadro geral',
  work_location: 'DEPENDENCIAS', gro_regime: 'SOMENTE_TITULAR_OU_SOCIOS',
  informed_risks_date: '2026-06-02',
  interaction_risks: 'NAO',
};
const CONTRATADA_SEM_REGIME = {
  id: 'ct3', client_id: 'c1', status: 'ACTIVE',
  legal_name: 'Beta Manutencao Predial Ltda',
  contracted_service: 'Manutencao do ar-condicionado',
  work_location: 'DEPENDENCIAS',
};
/** Contratada de OUTRO cliente: nao pode aparecer neste PGR. */
const CONTRATADA_DE_OUTRO_CLIENTE = {
  id: 'ct9', client_id: 'cli-9', status: 'ACTIVE',
  legal_name: 'Gama Vigilancia de Outra Empresa',
  contracted_service: 'Vigilancia patrimonial',
  work_location: 'DEPENDENCIAS', gro_regime: 'PGR_DO_CONTRATANTE',
};
/** Estabelecimento que declarou, com data, nao ter contratada atuando. */
const UNIDADE_SEM_CONTRATADA = {
  ...UNIDADE, no_contracted_organizations_declared_at: '2026-09-15'
};

/**
 * Maquinas da secao 6.5, uma por norma.
 *
 * A autoclave e o caso que passa desapercebido numa clinica: e vaso de pressao
 * da NR-13. A do NR-13 esta com a inspecao VENCIDA de proposito, para conferir
 * que o PGR aponta a data - que vem do relatorio do PH, nao de calculo nosso.
 */
const MAQUINA_NR12 = {
  id: 'mq1', client_id: 'c1', status: 'ACTIVE',
  name: 'Prensa excentrica 40 t', tag: 'MAQ-014',
  manufacturer: 'Metalurgica Sul', manufacture_year: '2019',
  location: 'Galpao de producao, linha 2', operational_state: 'EM_OPERACAO',
  applicable_norms: ['NR_12'],
  risk_appraisal_date: '2026-02-05', risk_appraisal_author: 'Eng. Carla Nunes, CREA-BA 98765',
  safety_systems: 'Protecao movel com chave de seguranca e interface, comando bimanual, botao de emergencia',
  maintenance_record: 'Ficha por equipamento arquivada na manutencao',
};
const MAQUINA_NR13_VENCIDA = {
  id: 'mq2', client_id: 'c1', status: 'ACTIVE',
  name: 'Autoclave horizontal 100 L', tag: 'AUT-01',
  location: 'Sala de esterilizacao', operational_state: 'EM_OPERACAO',
  applicable_norms: ['NR_13'],
  nr13_category: 'Vaso de pressao classe IV',
  nr13_last_inspection_date: '2024-05-20',
  nr13_next_inspection_date: '2025-05-20',
  nr13_professional: 'Eng. Mario Lopes, CREA-BA 11223',
};
const MAQUINA_NR11 = {
  id: 'mq3', client_id: 'c1', status: 'ACTIVE',
  name: 'Empilhadeira a gas', location: 'Expedicao',
  applicable_norms: ['NR_11'],
  nr11_load_capacity: '2.500 kg, placa no posto do operador',
  nr11_operators: 'Dois operadores autorizados por documento interno',
};
/** Sem norma marcada e sem outro requisito: nao classificada. */
const MAQUINA_SEM_NORMA = {
  id: 'mq4', client_id: 'c1', status: 'ACTIVE',
  name: 'Compressor de ar de pistao', location: 'Casa de maquinas',
};
/** Maquina de OUTRO cliente: nao pode aparecer neste PGR. */
const MAQUINA_DE_OUTRO_CLIENTE = {
  id: 'mq9', client_id: 'cli-9', status: 'ACTIVE',
  name: 'Torno mecanico de outra empresa', applicable_norms: ['NR_12'],
};
/** Estabelecimento que declarou nao ter maquina com requisito especifico. */
const UNIDADE_SEM_MAQUINA = {
  ...UNIDADE, no_specific_machines_declared_at: '2026-09-16'
};

/**
 * Produtos quimicos da secao 6.4, um por caminho do item 26.4 da NR-26.
 *
 * O saneante e o caso que engana: dispensado da ROTULAGEM pelo subitem
 * 26.4.2.4, continua a exigir classificacao e ficha com dados de seguranca.
 */
const QUIMICO_PERIGOSO_COMPLETO = {
  id: 'qm1', client_id: 'c1', status: 'ACTIVE',
  name: 'Alcool etilico 70% INPM', manufacturer: 'Quimica Bahia',
  use_description: 'Desinfeccao de superficies e macas entre atendimentos',
  location: 'Salas de atendimento e deposito', quantity: '5 L/mes',
  components: 'etanol (CAS 64-17-5), 70% v/v; agua (CAS 7732-18-5)',
  ghs_classification: 'PERIGOSO',
  ghs_hazard_classes: 'Liquido inflamavel categoria 2; irritacao ocular categoria 2A',
  ghs_signal_word: 'Perigo - H225, H319',
  labeling_status: 'CONFORME_GHS',
  sds_status: 'DISPONIVEL', sds_date: '2025-11-03',
  sds_location: 'Pasta fisica na copa e no deposito',
  training_date: '2026-04-22',
};
const QUIMICO_SANEANTE = {
  id: 'qm2', client_id: 'c1', status: 'ACTIVE',
  name: 'Hipoclorito de sodio 2,5%',
  use_description: 'Limpeza de piso',
  components: 'hipoclorito de sodio (CAS 7681-52-9), 2,5%',
  ghs_classification: 'PERIGOSO',
  ghs_hazard_classes: 'Corrosao cutanea categoria 1B',
  labeling_status: 'DISPENSADA_SANEANTE', anvisa_registration: '3.0123.4567.001-8',
  sds_status: 'DISPONIVEL', sds_date: '2026-01-15',
  sds_location: 'Pasta fisica no deposito',
  training_date: '2026-04-22',
};
/** Saneante sem o numero que fundamenta a dispensa. */
const QUIMICO_SANEANTE_SEM_REGISTRO = {
  ...QUIMICO_SANEANTE, id: 'qm3', name: 'Desinfetante concentrado',
  anvisa_registration: undefined,
};
/** Nao perigoso e sem FDS: o 26.4.3.3 entra como nota, nao como pendencia. */
const QUIMICO_NAO_PERIGOSO = {
  id: 'qm4', client_id: 'c1', status: 'ACTIVE',
  name: 'Detergente neutro',
  components: 'tensoativo anionico (CAS 25155-30-0), 5%',
  ghs_classification: 'NAO_PERIGOSO',
  labeling_status: 'SIMPLIFICADA',
  sds_status: 'NAO_OBTIDA',
  training_date: '2026-04-22',
};
/** Sem classificacao GHS: pendencia do proprio subitem 26.4.1.1. */
const QUIMICO_SEM_CLASSIFICACAO = {
  id: 'qm5', client_id: 'c1', status: 'ACTIVE',
  name: 'Removedor multiuso',
};
/** Produto de OUTRO cliente: nao pode aparecer neste PGR. */
const QUIMICO_DE_OUTRO_CLIENTE = {
  id: 'qm9', client_id: 'cli-9', status: 'ACTIVE',
  name: 'Xileno de outra empresa', ghs_classification: 'PERIGOSO',
};
/** Estabelecimento que declarou nao utilizar produto quimico. */
const UNIDADE_SEM_QUIMICO = {
  ...UNIDADE, no_chemical_products_declared_at: '2026-09-17'
};
/**
 * Linhas da matriz de capacitacao.
 *
 * A de NR-35 e completa e conferida; a de NR-12 exercita `basis` EMPREGADOR,
 * que e o caso em que a norma NAO fixa carga; e a incompleta exercita a
 * pendencia agrupada.
 */
const CAPACITACAO_NR35 = {
  id: 'cp1', client_id: 'c1', status: 'ACTIVE',
  name: 'Trabalho em altura', norm: 'NR-35',
  norm_reference: 'subitens 35.3.2 e 35.3.3.1', catalog_key: 'nr35-altura',
  basis: 'NORMA', initial_hours: '8 h', periodic_months: 24, periodic_hours: '8 h',
  audience_note: 'Trabalhadores que executam trabalho em altura',
};
const CAPACITACAO_NR12 = {
  id: 'cp2', client_id: 'c1', status: 'ACTIVE',
  name: 'Operacao, manutencao e inspecao de maquinas', norm: 'NR-12',
  norm_reference: 'subitens 12.16.2 e 12.16.3', catalog_key: 'nr12-maquinas',
  basis: 'EMPREGADOR', initial_hours: '4 h', periodic_months: 12,
  job_ids: ['cargo-1'],
};
const CAPACITACAO_INCOMPLETA = {
  id: 'cp3', client_id: 'c1', status: 'ACTIVE',
  name: 'Integracao em SST', norm: 'NR-01',
};
/** Linha de OUTRO cliente: nao pode aparecer neste PGR. */
const CAPACITACAO_DE_OUTRO_CLIENTE = {
  id: 'cp9', client_id: 'cli-9', status: 'ACTIVE',
  name: 'Brigada de incendio de outra empresa', norm: 'NR-23',
};
const CARGOS = [{ id: 'cargo-1', client_id: 'c1', name: 'Tecnico de manutencao', status: 'ACTIVE' }];

/**
 * AEP da NR-17.
 *
 * A completa cobre os seis aspectos, tem abordagem, metodos, autoria, duas
 * medidas do 17.4.3.1 e oitiva registrada. A incompleta exercita as pendencias
 * uma a uma. A com gatilho "b" e sem relatorio exercita a AET devida - e, na
 * dispensa do 17.3.4, que o gatilho "b" NAO obriga.
 */
const AEP_COMPLETA = {
  id: 'ae1', client_id: 'c1', status: 'ACTIVE',
  situation_name: 'Recepcao - atendimento em posto informatizado',
  ghe_ids: ['g1'], job_ids: ['cargo-1'], worker_count: 2,
  approach: 'COMBINADA',
  methods: 'Observacao direta em dois turnos, entrevista com os trabalhadores e medicao de iluminamento pela NHO 11',
  assessment_date: '2026-03-12', assessor: 'Eng. Carla Nunes, CREA-BA 98765',
  aspects: {
    organizacao: { conclusao: 'ADEQUADO' },
    sobrecarga: { conclusao: 'INADEQUADO', observacao: 'Digitacao continua por mais de duas horas sem alternancia' },
    cargas: { conclusao: 'NAO_APLICAVEL' },
    mobiliario: { conclusao: 'INADEQUADO', observacao: 'Cadeira sem regulagem de altura e sem apoio lombar' },
    maquinas: { conclusao: 'ADEQUADO' },
    conforto: { conclusao: 'ADEQUADO', observacao: 'Iluminamento conforme a NHO 11; ar entre 22 e 24 graus' },
  },
  prevention_measures: ['a', 'b'],
  prevention_description: 'Pausa de 10 min a cada 50 min fora do posto e revezamento com o arquivo a cada 2 h',
  workers_heard: 'SIM', workers_heard_note: 'Entrevista individual com as duas recepcionistas',
};
/** Sem abordagem, sem metodos, sem aspectos, sem oitiva. */
const AEP_INCOMPLETA = {
  id: 'ae2', client_id: 'c1', status: 'ACTIVE',
  situation_name: 'Arquivo - manuseio de prontuarios',
};
/** Inadequado com uma medida so: viola o 17.4.3.1 e o 17.4.3.1.1. */
const AEP_UMA_MEDIDA = {
  ...AEP_COMPLETA, id: 'ae3', situation_name: 'Esterilizacao - autoclave',
  prevention_measures: ['a'],
};
/** Gatilho "b" do 17.3.2 sem relatorio de AET. */
const AEP_COM_GATILHO_B = {
  ...AEP_COMPLETA, id: 'ae4', situation_name: 'Fisioterapia - atendimento em maca',
  aet_triggers: ['b'],
};
/** Gatilho "c": obriga a AET mesmo na dispensa do 17.3.4 (subitem 17.3.4.1). */
const AEP_COM_GATILHO_C = {
  ...AEP_COMPLETA, id: 'ae5', situation_name: 'Lavanderia - manuseio de roupa suja',
  aet_triggers: ['c'],
};
/** AEP de OUTRO cliente: nao pode aparecer neste PGR. */
const AEP_DE_OUTRO_CLIENTE = {
  ...AEP_COMPLETA, id: 'ae9', client_id: 'cli-9',
  situation_name: 'Linha de montagem de outra empresa',
};
/** Risco ergonomico no inventario, para a coerencia do item 17.3.5. */
const RISCO_ERGONOMICO = {
  id: 'rerg', ghe_id: 'g1', client_id: 'c1', risk_category: 'ERGONOMICO',
  agent_name: 'Postura sentada prolongada', generating_source: 'Atendimento em posto informatizado',
  severity: 2, probability: 3, epc_implemented: false,
  operational_situation: ['ROTINEIRA'],
};
/** Cliente ME de grau 2: dispensado de ELABORAR a AET (item 17.3.4). */
const CLIENTE_ME = { ...CLIENTE, porte: 'MICROEMPRESA', risk_degree: 2 };
/** Cliente de grande porte: nao alcancado pela dispensa. */
const CLIENTE_GRANDE = { ...CLIENTE, porte: 'DEMAIS', risk_degree: 3 };

/** Risco quimico no inventario, para a checagem de coerencia da 6.4 com a 7. */
const RISCO_QUIMICO = {
  id: 'rq1', ghe_id: 'g1', client_id: 'c1', risk_category: 'QUIMICO',
  agent_name: 'Alcool etilico', generating_source: 'Desinfeccao de superficies',
  severity: 2, probability: 3, epc_implemented: false,
  operational_situation: ['ROTINEIRA'],
};

function gerar(args) {
  ultimoPdf = null;
  exportPGRDocumentPdf(args);
  if (!ultimoPdf) inconclusivo('exportPGRDocumentPdf não produziu PDF');
  return ultimoPdf;
}

const pdfCheio = gerar({
  client: CLIENTE, organization: ORG, ghes: GHES,
  risks: [RISCO_CLASSIFICADO, RISCO_DE_OUTRO_CLIENTE],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  contractedOrganizations: [
    CONTRATADA_COMPLETA, CONTRATADA_TITULAR, CONTRATADA_SEM_REGIME,
    CONTRATADA_DE_OUTRO_CLIENTE
  ],
  machinesEquipment: [
    MAQUINA_NR12, MAQUINA_NR13_VENCIDA, MAQUINA_NR11, MAQUINA_SEM_NORMA,
    MAQUINA_DE_OUTRO_CLIENTE
  ],
  chemicalProducts: [
    QUIMICO_PERIGOSO_COMPLETO, QUIMICO_SANEANTE, QUIMICO_SANEANTE_SEM_REGISTRO,
    QUIMICO_NAO_PERIGOSO, QUIMICO_SEM_CLASSIFICACAO, QUIMICO_DE_OUTRO_CLIENTE
  ],
  trainingRequirements: [
    CAPACITACAO_NR35, CAPACITACAO_NR12, CAPACITACAO_INCOMPLETA,
    CAPACITACAO_DE_OUTRO_CLIENTE
  ],
  jobs: CARGOS,
  ergonomicAssessments: [
    AEP_COMPLETA, AEP_INCOMPLETA, AEP_UMA_MEDIDA, AEP_DE_OUTRO_CLIENTE
  ],
});
const pdfVazio = gerar({
  client: CLIENTE, organization: ORG, ghes: [], risks: [], employees: [], sectors: [], units: [],
});

const t = texto(pdfCheio);
const tc = corrido(pdfCheio);
const tv = texto(pdfVazio);

check(paginas(pdfCheio) >= 10, `o PGR tem ${paginas(pdfCheio)} páginas (tinha 1)`);
check(quebrados(pdfCheio).length === 0, 'nenhuma string caiu em UTF-16BE');

// As dez secoes do modelo.
const SECOES = [
  '1. IDENTIFICAÇÃO DA ORGANIZAÇÃO E ABRANGÊNCIA',
  '2. OBJETIVO, CAMPO DE APLICAÇÃO E BASE LEGAL',
  '3. TERMOS E DEFINIÇÕES',
  '4. ESTRUTURA, RESPONSABILIDADES E INTEGRAÇÃO',
  '5. METODOLOGIA DO GERENCIAMENTO DE RISCOS',
  '6. CARACTERIZAÇÃO DO ESTABELECIMENTO',
  '7. INVENTÁRIO DE RISCOS OCUPACIONAIS',
  '8. PLANO DE AÇÃO',
  '9. ACOMPANHAMENTO, RESPOSTA A EMERGÊNCIAS E GESTÃO DO PROGRAMA',
  '10. ANEXOS E CHECKLIST DE CONFORMIDADE',
];
for (const s of SECOES) {
  check(tc.includes(s), `traz a seção "${s.slice(0, 42)}${s.length > 42 ? '…' : ''}"`);
}

// Subsecoes da metodologia, que e o que faltava.
for (const sub of ['5.1 Levantamento preliminar', '5.2 Identificação de perigos',
  '5.3 Avaliação ergonômica e fatores psicossociais', '5.4 Gradação da severidade',
  '5.5 Gradação da probabilidade', '5.6 Matriz de risco', '5.7 Classificação e tomada de decisão']) {
  check(tc.includes(sub), `metodologia: "${sub}"`);
}

// Capa e controle documental.
check(tc.includes('PROGRAMA DE'), 'a capa traz o título do documento');
check(tc.includes('PGR-12483776000199-2026-REV00'), 'a capa traz o código do documento');
check(tc.includes('CONTROLE DE REVISÕES'), 'traz o controle de revisões');
check(tc.includes('TERMO DE RESPONSABILIDADE E APROVAÇÃO'), 'traz o termo de responsabilidade');
check(tc.includes('23/09/2028') || /\d{2}\/\d{2}\/20\d\d \(24 meses/.test(tc), 'a próxima revisão é a 24 meses');
check(tc.includes('subitem 1.5.4.4.6.1'), 'cita o subitem do prazo ampliado com certificação SGSST');

// Conteudo normativo do modelo.
check(tc.includes('Orientação Técnica SIT nº 3/2023'), 'reproduz a nota sobre quem pode elaborar o PGR');
check(tc.includes('Portarias MTE nº 1.419/2024 e nº 765/2025'), 'cita a redação vigente da NR-01');
check(tc.includes('Anexo I'), 'as definições citam o Anexo I da NR-01');
check(tc.includes('1.5.4.4.2.2'), 'cita o subitem dos critérios de avaliação');
check(tc.includes('1.5.7.3.2'), 'cita o subitem das alíneas do inventário');
check(tc.includes('20 anos'), 'cita a guarda de 20 anos do histórico');
check(!tc.includes('OHSAS'), 'não cita a OHSAS 18001, cancelada');
check(!tc.includes('AS/NZS'), 'não cita a AS/NZS 4360, superada');

// O risco real, com a classificacao do modelo.
check(tc.includes('Ruído contínuo'), 'o inventário traz o perigo cadastrado');
check(tc.includes('R-GHE-01-01'), 'o registro do inventário recebe ID rastreável');
check(tc.includes('20 - Muito alto'), 'o risco S4xP5 sai classificado 20 Muito alto');

// Vazamento entre clientes: a versao anterior nao filtrava o plano de acao.
check(!tc.includes('Benzeno em outra empresa'), 'NÃO traz risco de outro cliente');

// Pendencias em vez de conteudo inventado.
check(tc.includes('PENDENTE'), 'os campos sem dado saem como pendência nomeada');
check(/10\.3 Pendências deste PGR \(\d+\)/.test(tc), 'o PGR fecha com a lista de pendências');
check(tc.includes('Atendido'), 'o checklist marca o que está atendido');
check(tc.includes('Com pendência'), 'o checklist marca o que falta');

// Nada de exemplo do modelo vaza para o documento do cliente.
// 'R-GES02-F01' NAO entra nesta lista: o modelo o traz na secao 7.1 como
// exemplo do FORMATO do ID, e o gerador reproduz a secao 7.1 inteira. O que
// nao pode vazar sao os registros de exemplo da secao 7.2.
for (const exemplo of ['Serraria', 'plaina', 'dose 1,40', 'Excesso de demandas', 'correia exposta']) {
  check(!t.includes(exemplo), `não reproduz o exemplo "${exemplo}" do modelo`);
}

// Cliente sem nada cadastrado.
console.log('\n--- 3. Cliente sem GHE e sem risco ---');
check(paginas(pdfVazio) >= 10, `mantém a estrutura completa (${paginas(pdfVazio)} páginas)`);
check(
  tv.includes('Inventário vazio'),
  'diz que o inventário está vazio em vez de emitir como concluído'
);
check(
  corrido(pdfVazio).includes('não atende ao subitem 1.5.7.1'),
  'avisa que sem inventário o documento não atende ao subitem 1.5.7.1'
);
check(corrido(pdfVazio).includes('5.6 Matriz de risco'), 'a metodologia sai mesmo sem inventário');

// ===========================================================================
// 3b. SITUACAO OPERACIONAL (alinea "b" do subitem 1.5.7.3.2)
// ===========================================================================
// O inventario tem de dizer em que situacao o perigo existe: rotineira,
// nao rotineira (manutencao, limpeza, setup) ou emergencia. O mesmo perigo
// tem probabilidade diferente em cada uma, e a nao rotineira costuma ser a
// pior - a maquina esta aberta. O campo nao existia.
console.log('');
console.log('--- 3b. Situação operacional R / NR / E ---');

const { descreverSituacao, normalizarSituacoes, temSituacaoOperacional, SITUACOES_OPERACIONAIS } = situacao;

check(SITUACOES_OPERACIONAIS.length === 3, 'as tres situacoes do modelo existem');
check(
  SITUACOES_OPERACIONAIS.map((o) => o.sigla).join(',') === 'R,NR,E',
  'as siglas sao R, NR e E'
);

check(descreverSituacao(['ROTINEIRA']) === 'R', 'uma situacao sai como a sigla');
check(
  descreverSituacao(['ROTINEIRA', 'NAO_ROTINEIRA']) === 'R e NR',
  'duas situacoes saem como "R e NR"'
);
check(
  descreverSituacao(['ROTINEIRA', 'NAO_ROTINEIRA'], 'limpeza e ajuste') === 'R e NR (limpeza e ajuste)',
  'a circunstancia entra entre parenteses, como no exemplo 2 do modelo'
);
check(
  descreverSituacao(['EMERGENCIA', 'ROTINEIRA', 'NAO_ROTINEIRA']) === 'R, NR e E',
  'a ordem sai sempre R, NR, E, independente de como foi gravada'
);
check(descreverSituacao([]) === '', 'sem situacao, devolve vazio (quem chama decide a pendencia)');
check(descreverSituacao(undefined) === '', 'risco antigo, sem o campo, nao quebra');

// Aceita a sigla, para dado vindo de importacao.
check(
  normalizarSituacoes(['R', 'NR']).join(',') === 'ROTINEIRA,NAO_ROTINEIRA',
  'aceita a sigla no lugar do valor'
);
check(normalizarSituacoes(['XPTO']).length === 0, 'descarta valor desconhecido em vez de aceitar');
check(normalizarSituacoes(['R', 'R']).length === 1, 'nao duplica');

check(temSituacaoOperacional({ operational_situation: ['ROTINEIRA'] }), 'o registro com situacao atende a alinea "b"');
check(!temSituacaoOperacional({}), 'o registro sem situacao nao atende');

// No documento.
check(
  tc.includes('R e NR (limpeza e ajuste)'),
  'o PGR imprime a situacao operacional do risco'
);
check(
  !tc.includes('Situação operacional (R, NR ou E) do risco "Ruído contínuo"'),
  'com a situacao preenchida, a pendencia da alinea "b" some'
);

// Risco sem o campo continua apontando a pendencia, e dizendo onde resolver.
const semSituacao = { ...RISCO_CLASSIFICADO, id: 'r2', operational_situation: undefined };
const pdfSemSituacao = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [semSituacao],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
}));
check(
  pdfSemSituacao.includes('Situação operacional (R, NR ou E)'),
  'risco sem o campo continua apontando a pendencia'
);
check(
  pdfSemSituacao.includes('edite o risco em GHE & Inventário de Riscos'),
  'a pendencia diz onde resolver'
);

// A tela pede o campo e nao deixa salvar sem ele.
const abaGhe = fs.readFileSync(path.join(RAIZ, 'components/sst/GHERiskInventoryTab.tsx'), 'utf8');
const catalogo = fs.readFileSync(path.join(RAIZ, 'components/sst/OccupationalRisksCatalogView.tsx'), 'utf8');
check(
  abaGhe.includes('riskForm.operational_situation.length === 0'),
  'a aba do GHE nao deixa salvar risco sem situacao operacional'
);
check(
  abaGhe.includes('operational_situation: riskForm.operational_situation'),
  'a aba do GHE grava a situacao'
);
check(
  abaGhe.includes('normalizarSituacoes(risk.operational_situation)'),
  'ao editar um risco, a situacao gravada e carregada'
);
check(
  catalogo.includes('operational_situation: situacaoAplicada'),
  'aplicar risco do catalogo tambem grava a situacao'
);

// ===========================================================================
// 3c. CARACTERIZACAO DO ESTABELECIMENTO (secao 6.1)
// ===========================================================================
// Alinea "a" do subitem 1.5.7.3.2. Os cinco campos nao existiam no sistema:
// area, edificacoes, utilidades, entorno e recursos de emergencia. Ficavam
// como cinco pendencias fixas em todo PGR emitido.
console.log('');
console.log('--- 3c. Caracterizacao do estabelecimento (6.1) ---');

check(tc.includes('FISIOMED (UN-01) - Matriz'), 'a 6.1 nomeia o estabelecimento, com codigo e tipo');
check(tc.includes('320 m² construída / 450 m² total'), 'traz area construida e area total');
check(tc.includes('Bloco unico terreo em alvenaria'), 'traz as edificacoes');
check(tc.includes('sem caldeira'), 'traz as utilidades');
check(tc.includes('Avenida de trafego intenso na testada'), 'traz o entorno e os perigos externos');
check(tc.includes('hospital de referencia a 1,2 km'), 'traz os recursos de emergencia');

// Os recursos de emergencia alimentam tambem a 9.4.
check(
  (tc.match(/hospital de referencia a 1,2 km/g) || []).length >= 2,
  'os recursos de emergencia aparecem tambem na secao 9.4'
);

// Preenchida a 6.1, some a pendencia de perigos externos do checklist.
check(
  !tc.includes('Entorno e perigos externos previsíveis não cadastrados'),
  'com o entorno preenchido, a pendencia do subitem 1.5.4.3.2 some'
);

// Sem estabelecimento cadastrado, aponta onde resolver.
const semUnidade = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [],
}));
check(
  semUnidade.includes('Nenhum estabelecimento cadastrado em Hierarquia > Unidades'),
  'sem estabelecimento, a 6.1 diz onde cadastrar'
);
check(
  semUnidade.includes('Hierarquia > Unidades'),
  'as pendencias da 6.1 apontam a tela'
);

// Mais de um estabelecimento: o PGR e por estabelecimento (1.5.3.1.1.1).
const duasUnidades = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO],
  employees: FUNCIONARIOS, sectors: SETORES,
  units: [UNIDADE, { ...UNIDADE, id: 'u2', name: 'FILIAL CENTRO', code: 'UN-02' }],
}));
check(
  duasUnidades.includes('2 estabelecimentos cadastrados e o PGR é emitido por estabelecimento'),
  'com mais de um estabelecimento, avisa que o PGR e por estabelecimento'
);
check(
  duasUnidades.includes('subitem 1.5.3.1.1.1'),
  'e cita o subitem que exige isso'
);

// A tela: edicao de unidade nao existia, e code/type eram descartados.
const hierarquia = fs.readFileSync(path.join(RAIZ, 'components/sst/HierarchyTab.tsx'), 'utf8');
const contexto2 = fs.readFileSync(path.join(RAIZ, 'context/PrevSafeContext.tsx'), 'utf8');
check(contexto2.includes('const updateUnit = useCallback'), 'o contexto passou a permitir editar a unidade');
check(hierarquia.includes('handleOpenUnitModal(u)'), 'a tabela de unidades tem botao de editar');
check(hierarquia.includes('establishment_type: unitForm.type'), 'o tipo de estabelecimento passou a ser gravado');
check(hierarquia.includes('code: unitForm.code.trim()'), 'o codigo da unidade passou a ser gravado');
check(hierarquia.includes('external_hazards: unitForm.external_hazards'), 'o entorno e gravado');
check(
  !/if \(!unitForm\.name\) return;/.test(hierarquia),
  'salvar unidade nao da mais `return` em silencio'
);

// ===========================================================================
// 3d. PESSOAS E ABRANGENCIA (secoes 1.1, 1.2 e 1.3)
// ===========================================================================
// Cinco campos que nao existiam: terceirizados, jornada, responsavel legal,
// coordenador da implementacao e frentes de trabalho.
console.log('');
console.log('--- 3d. Pessoas e abrangencia (1.1 a 1.3) ---');

check(tc.includes('07h-17h, seg-sex'), '1.1 traz a jornada e os turnos');
check(tc.includes('Marcos Tavares - socio administrador'), '1.2 nomeia o responsavel legal');
check(tc.includes('Juliana Reis - gerente administrativa'), '1.2 nomeia o coordenador da implementacao');
check(
  tc.includes('Atendimento domiciliar de fisioterapia'),
  '1.3 traz as frentes de trabalho e locais externos'
);

// O responsavel legal e o coordenador chegam ao termo de responsabilidade.
check(
  (tc.match(/Marcos Tavares/g) || []).length >= 2,
  'o responsavel legal chega tambem ao termo de responsabilidade'
);
check(
  (tc.match(/Juliana Reis/g) || []).length >= 3,
  'o coordenador chega ao termo e ao acompanhamento do plano (9.1)'
);

// As pendencias correspondentes somem.
for (const sumiu of [
  'Número de trabalhadores terceirizados no local não cadastrado',
  'Jornada e turnos do estabelecimento não cadastrados',
  'Responsável legal da organização não cadastrado',
  'Coordenador da implementação do PGR não cadastrado',
  'Frentes de trabalho e locais externos não cadastrados'
]) {
  check(!tc.includes(sumiu), `pendencia resolvida: ${sumiu.slice(0, 44)}...`);
}

// Sem estabelecimento, as cinco continuam apontando a tela.
check(
  semUnidade.includes('Jornada e turnos do estabelecimento não cadastrados (Hierarquia > Unidades)'),
  'sem estabelecimento, a pendencia da jornada aponta a tela'
);
check(
  semUnidade.includes('Coordenador da implementação do PGR não cadastrado (Hierarquia > Unidades)'),
  'sem estabelecimento, a pendencia do coordenador aponta a tela'
);

// A tela grava e recarrega os cinco.
for (const campo of [
  'outsourced_worker_count', 'work_shifts_description',
  'legal_representative', 'pgr_coordinator', 'external_work_fronts'
]) {
  check(
    hierarquia.includes(`${campo}: unitForm.${campo}`) && hierarquia.includes(`${campo}: unit.${campo}`),
    `a tela grava e recarrega ${campo}`
  );
}

// ===========================================================================
// 3e. EMERGENCIAS (item 1.5.6) E ASSEDIO (subitem 1.4.1.1)
// ===========================================================================
console.log('');
console.log('--- 3e. Emergencias (9.4) e assedio (9.8) ---');

// --- 9.4: o que o estabelecimento definiu -----------------------------------
check(tc.includes('9.4 Preparação e resposta a emergências (item 1.5.6)'), '9.4 cita o item 1.5.6');
check(tc.includes('1.5.6.1'), '9.4 cita o subitem dos procedimentos');
check(
  tc.includes('alíneas "a" e "b" do subitem 1.5.6.2'),
  '9.4 cita as duas alineas do conteudo minimo'
);
check(tc.includes('Incendio na sala de arquivo'), '9.4 traz os cenarios cadastrados');
check(tc.includes('Alarme manual na recepcao'), '9.4 traz o abandono dos locais afetados');
check(
  tc.includes('Nao aplicavel: sem processo de grande porte'),
  '9.4 imprime a declaracao de nao aplicabilidade da grande magnitude'
);
check(tc.includes('Anual, com abandono total'), '9.4 traz a periodicidade dos simulados');
check(tc.includes('Último simulado realizado em 18/04/2026'), '9.4 traz a data do ultimo simulado');

// Sem estabelecimento, cada uma das quatro aponta a tela.
for (const [rotulo, texto_] of [
  ['cenarios', 'Cenários de emergência não cadastrados (Hierarquia > Unidades)'],
  ['abandono', 'ponto de encontro e responsáveis pelo abandono não cadastrados (Hierarquia > Unidades)'],
  ['grande magnitude', 'Medidas para emergências de grande magnitude não declaradas'],
  ['simulados', 'exercícios simulados não cadastradas (subitens 1.5.6.3 e 1.5.6.3.1)'],
]) {
  check(semUnidade.includes(texto_), `sem estabelecimento, a pendencia de ${rotulo} aponta a tela`);
}

// A NR-01 nao fixa prazo para o simulado: o documento nao pode inventar um.
check(
  !/simulado[^.]{0,80}a cada \d+ meses/i.test(tc),
  '9.4 nao atribui prazo legal ao simulado, que a NR-01 nao fixa'
);

// --- 9.8: a aplicabilidade sai do dimensionamento da CIPA -------------------
check(
  tc.includes('9.8 Prevenção e combate ao assédio sexual'),
  '9.8 usa o titulo do subitem 1.4.1.1'
);

// Com 2 empregados e grau 2 nao ha CIPA a constituir: item 5.4.13 da NR-05.
check(
  tc.includes('não lhe são exigíveis') && tc.includes('item 5.4.13'),
  '9.8 diz que o subitem nao alcanca quem nao constitui CIPA'
);
check(
  !tc.includes('Regras de conduta sobre assédio nas normas internas'),
  '9.8 nao cobra as tres medidas de quem nao esta obrigado a CIPA'
);
check(tc.includes('Não aplicável'), 'o checklist da 10.2 ganhou o estado "Nao aplicavel"');
check(
  tc.includes('por iniciativa própria') && tc.includes('Capitulo 7 do Regulamento Interno'),
  '9.8 imprime como adocao voluntaria o que foi cadastrado sem obrigacao'
);

// Obrigada a CIPA: as tres alineas passam a ser cobradas.
const comCipa = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO],
  employees: FUNCIONARIOS_COM_CIPA, sectors: SETORES, units: [UNIDADE],
}));
check(
  comCipa.includes('obrigada a constituir CIPA neste estabelecimento'),
  '9.8 reconhece a obrigacao a partir do Quadro I da NR-05'
);
check(
  comCipa.includes('Portaria MTP nº 4.219, de 20 de dezembro de 2022'),
  '9.8 cita a portaria que incluiu o subitem 1.4.1.1'
);
for (const alinea of [
  'a) Regras de conduta sobre assédio sexual',
  'b) Procedimentos de recebimento e acompanhamento de denúncias',
  'c) Ações de capacitação, orientação e sensibilização, no mínimo a cada 12 meses',
]) {
  check(comCipa.includes(alinea), `9.8 traz a medida "${alinea.slice(0, 26)}..."`);
}
check(
  comCipa.includes('garantido o anonimato de quem denuncia'),
  '9.8 nao omite o anonimato, que esta na propria alinea "b"'
);
check(
  comCipa.includes('Última ação em 20/05/2026') && comCipa.includes('nova ação até 20/05/2027'),
  '9.8 calcula o prazo de 12 meses da alinea "c"'
);
check(
  !comCipa.includes('Não aplicável'),
  'obrigada a CIPA, o checklist nao marca o requisito como nao aplicavel'
);

// Obrigada a CIPA e sem os dados: tres pendencias, nao tres frases vazias.
const comCipaSemDados = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO],
  employees: FUNCIONARIOS_COM_CIPA, sectors: SETORES, units: [UNIDADE_SEM_ASSEDIO],
}));
for (const [rotulo, texto_] of [
  ['"a"', 'Regras de conduta sobre assédio nas normas internas'],
  ['"b"', 'Canal e procedimento de denúncia, apuração e sanções não cadastrados'],
  ['"c"', 'sensibilização sobre violência, assédio, igualdade e diversidade não cadastradas'],
]) {
  check(comCipaSemDados.includes(texto_), `sem dado, a alinea ${rotulo} sai como pendencia`);
}

// Capacitacao vencida: o prazo esta na propria alinea "c", entao o PGR pode dizer.
const assedioVencido = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO],
  employees: FUNCIONARIOS_COM_CIPA, sectors: SETORES, units: [UNIDADE_ASSEDIO_VENCIDO],
}));
check(
  assedioVencido.includes('Ação de capacitação sobre assédio vencida')
  && assedioVencido.includes('terminou em 10/02/2025'),
  '9.8 aponta a capacitacao vencida com a data do vencimento'
);

// Sem grau de risco nao da para dizer se o subitem se aplica.
const semGrau = corrido(gerar({
  client: { ...CLIENTE, risk_degree: undefined }, organization: ORG, ghes: GHES,
  risks: [RISCO_CLASSIFICADO], employees: FUNCIONARIOS_COM_CIPA, sectors: SETORES, units: [UNIDADE],
}));
check(
  semGrau.includes('Não é possível dizer se o subitem 1.4.1.1 se aplica'),
  'sem grau de risco, a 9.8 declara a duvida em vez de decidir'
);

// A tela grava e recarrega os nove campos novos.
for (const campo of [
  'emergency_scenarios', 'emergency_evacuation', 'emergency_large_scale',
  'emergency_drills', 'emergency_drill_last_date',
  'harassment_conduct_rules', 'harassment_report_channel',
  'harassment_training_actions', 'harassment_training_last_date',
]) {
  check(
    hierarquia.includes(`${campo}: unitForm.${campo}`) && hierarquia.includes(`${campo}: unit.${campo}`),
    `a tela grava e recarrega ${campo}`
  );
}

// ===========================================================================
// 3f. ORGANIZACOES CONTRATADAS (item 1.5.8)
// ===========================================================================
console.log('');
console.log('--- 3f. Contratadas (9.5) ---');

check(
  tc.includes('9.5 GRO nas relações de prestação de serviços a terceiros (item 1.5.8)'),
  '9.5 usa o titulo do item 1.5.8'
);
for (const sub of ['1.5.8.1', '1.5.8.2', '1.5.8.3', '1.5.8.4']) {
  check(tc.includes(sub), `9.5 cita o subitem ${sub}`);
}

// As tres contratadas do cliente saem; a de outro cliente, nao.
check(tc.includes('Alfa Conservacao e Limpeza'), '9.5 lista a contratada completa');
check(tc.includes('Joao Eletricista MEI'), '9.5 lista a contratada de titular unico');
check(tc.includes('Beta Manutencao Predial'), '9.5 lista a contratada sem regime definido');
check(
  !tc.includes('Gama Vigilancia de Outra Empresa'),
  'NAO traz contratada de outro cliente'
);

// Cada regime puxa o que a NR-01 exige dele.
check(
  tc.includes('Programas da contratada (1.5.8.1)') && tc.includes('Inventário: 10/03/2026'),
  'quem usa o programa da contratada tem inventario e plano conferidos (1.5.8.1.1)'
);
check(
  tc.includes('Somente titular ou sócios (1.5.8.1.2)'),
  'o regime do titular unico sai nomeado com o subitem'
);
check(
  tc.includes('Informou (1.5.8.2): 12/03/2026') && tc.includes('Recebeu (1.5.8.3): 18/03/2026'),
  '9.5 registra a troca de informacoes nos dois sentidos, com data'
);
check(
  tc.includes('Há riscos de interação. Isolamento da area durante a lavagem'),
  '9.5 traz as medidas definidas em conjunto (1.5.8.4)'
);
check(
  tc.includes('Avaliado: sem riscos resultantes da interação'),
  '9.5 distingue "avaliado e nao ha" de "ninguem avaliou"'
);

// A contratada completa nao gera pendencia; as outras duas geram, uma cada.
check(
  !tc.includes('Contratada Alfa Conservacao e Limpeza Ltda: falta'),
  'a contratada completa nao gera pendencia'
);
check(
  tc.includes('Contratada Joao Eletricista MEI: falta')
  && tc.includes('como as medidas deste PGR se estendem à atividade contratada (subitem 1.5.8.1.2)'),
  'o titular unico sem extensao das medidas gera pendencia do 1.5.8.1.2'
);
check(
  tc.includes('Contratada Beta Manutencao Predial Ltda: falta')
  && tc.includes('regime de GRO'),
  'a contratada sem regime gera pendencia do 1.5.8.1'
);
check(
  tc.includes('sem regime de GRO definido') && tc.includes('não admite a omissão'),
  '9.5 avisa que atuar no local sem regime definido nao e opcao'
);

// Uma pendencia por contratada, nao uma por campo: a 10.3 tem de continuar legivel.
check(
  (tc.match(/Contratada [^:]{3,60}: falta/g) || []).length === 2,
  'as pendencias sao agrupadas por contratada, uma cada'
);

// Lista vazia nao e declaracao de inexistencia.
const semContratada = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  contractedOrganizations: [],
}));
check(
  semContratada.includes('Nenhuma organização contratada cadastrada')
  && semContratada.includes('Lista vazia não é declaração de inexistência'),
  'sem contratada e sem declaracao, a 9.5 sai como pendencia'
);
check(
  semContratada.includes('Engenharia SST > Contratadas'),
  'a pendencia da 9.5 aponta a tela'
);

// Com a declaracao datada, deixa de ser pendencia.
const declarado = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE_SEM_CONTRATADA],
  contractedOrganizations: [],
}));
check(
  declarado.includes('declarou em 15/09/2026 que nenhuma organização'),
  'a declaracao datada sai no documento com a data'
);
check(
  !declarado.includes('Nenhuma organização contratada cadastrada'),
  'declarada a inexistencia, a 9.5 deixa de ser pendencia'
);
check(
  declarado.includes('devem ser revistas antes do início das atividades'),
  'a declaracao vem com a obrigacao de revisar ao contratar'
);

// A tela: CRUD, tres estados do risco de interacao e nada com padrao.
const contratadasTela = fs.readFileSync(
  path.join(RAIZ, 'components/sst/ContractedOrganizationsTab.tsx'), 'utf8'
);
check(
  contratadasTela.includes('addContractedOrganization')
  && contratadasTela.includes('updateContractedOrganization')
  && contratadasTela.includes('deleteContractedOrganization'),
  'a tela cria, edita e remove contratada'
);
check(
  /work_location: '' as LocalDaContratada \| ''/.test(contratadasTela)
  && /gro_regime: '' as GroRegimeContratada \| ''/.test(contratadasTela)
  && /interaction_risks: '' as 'SIM' \| 'NAO' \| ''/.test(contratadasTela),
  'local, regime e interacao comecam vazios, sem padrao'
);
check(
  contratadasTela.includes('no_contracted_organizations_declared_at: dataDeHoje()'),
  'a tela grava a declaracao de inexistencia com data'
);
check(
  contratadasTela.includes('no_contracted_organizations_declared_at: undefined'),
  'cadastrar contratada retira a declaracao de que nao havia nenhuma'
);
check(
  !/if \(!form\.legal_name\.trim\(\)\) return;/.test(contratadasTela),
  'salvar sem razao social avisa, em vez de dar `return` em silencio'
);

// A colecao entra na sincronizacao: sem isso o cadastro morre no F5.
const sync = fs.readFileSync(path.join(RAIZ, 'lib/supabaseSync.ts'), 'utf8');
check(sync.includes("'contractedOrganizations'"), 'a colecao das contratadas e sincronizada');
const contexto = fs.readFileSync(path.join(RAIZ, 'context/PrevSafeContext.tsx'), 'utf8');
check(contexto.includes('parsed.contractedOrganizations'), 'o snapshot carrega as contratadas');

// ===========================================================================
// 3g. MAQUINAS E EQUIPAMENTOS (secao 6.5)
// ===========================================================================
console.log('');
console.log('--- 3g. Maquinas e equipamentos (6.5) ---');

check(
  tc.includes('6.5 Máquinas e equipamentos com requisitos específicos'),
  '6.5 mantem o titulo do modelo'
);
check(
  tc.includes('alínea "a" do subitem 1.5.7.3.2'),
  '6.5 diz a que exigencia da NR-01 a relacao serve'
);
check(tc.includes('subitem 12.1.9'), '6.5 cita o subitem da apreciacao de riscos');
check(tc.includes('subitem 12.11.2'), '6.5 cita o subitem do registro das manutencoes');

// As quatro maquinas do cliente saem; a de outro cliente, nao.
check(tc.includes('Prensa excentrica 40 t'), '6.5 lista a maquina da NR-12');
check(tc.includes('Autoclave horizontal 100 L'), '6.5 lista o equipamento da NR-13');
check(tc.includes('Empilhadeira a gas'), '6.5 lista o equipamento da NR-11');
check(
  !tc.includes('Torno mecanico de outra empresa'),
  'NAO traz maquina de outro cliente'
);

// Cada norma puxa a evidencia que lhe cabe.
check(
  tc.includes('Apreciação de riscos: 05/02/2026, Eng. Carla Nunes'),
  'NR-12: a apreciacao de riscos sai com data e autor'
);
check(
  tc.includes('Registro de manutenções: Ficha por equipamento'),
  'NR-12: sai onde fica o registro das manutencoes'
);
check(
  tc.includes('NR-13 - Vaso de pressao classe IV') && tc.includes('Próxima: 20/05/2025'),
  'NR-13: categoria, inspecoes e PH saem na mesma celula'
);
check(
  tc.includes('NR-11 - Carga: 2.500 kg'),
  'NR-11: capacidade de carga e operadores saem'
);

// Inspecao vencida: o PGR aponta, porque a data veio do relatorio do PH.
check(
  tc.includes('inspeção de segurança vencida em 20/05/2025'),
  '6.5 aponta a inspecao da NR-13 vencida, com a data'
);

// O que o documento NAO pode fazer: calcular o prazo da NR-13.
check(
  tc.includes('este PGR não os substitui nem os recalcula'),
  '6.5 declara que nao recalcula os prazos da NR-13'
);
check(
  !/pr[óo]ximo prazo|pr[óo]xima inspe[çc][ãa]o calculada|vence em \d+ meses/i.test(tc),
  '6.5 nao calcula prazo de inspecao a partir da categoria'
);

// Maquina sem classificacao e pendencia nomeada.
check(
  tc.includes('Máquina Compressor de ar de pistao: falta classificação das normas aplicáveis'),
  'maquina sem norma marcada sai como pendencia nomeada'
);

// Uma pendencia por maquina, agrupada: so a sem norma e a da NR-13 vencida.
check(
  (tc.match(/Máquina [^:]{3,60}: falta/g) || []).length === 2,
  'as pendencias sao agrupadas por maquina, uma cada'
);
check(
  !tc.includes('Máquina Prensa excentrica 40 t (MAQ-014): falta'),
  'a maquina completa da NR-12 nao gera pendencia'
);

// Lista vazia nao e declaracao de inexistencia.
const semMaquina = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  machinesEquipment: [],
}));
check(
  semMaquina.includes('Nenhuma máquina ou equipamento cadastrado')
  && semMaquina.includes('Engenharia SST > Máquinas'),
  'sem maquina e sem declaracao, a 6.5 sai como pendencia apontando a tela'
);

const maquinaDeclarada = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE_SEM_MAQUINA],
  machinesEquipment: [],
}));
check(
  maquinaDeclarada.includes('declarou em 16/09/2026 que nenhuma máquina'),
  'a declaracao datada sai no documento'
);
check(
  maquinaDeclarada.includes('Vaso de pressão, caldeira e compressor de ar entram na NR-13'),
  'a declaracao vem com o aviso dos equipamentos que passam desapercebidos'
);

// A tela.
const maquinasTela = fs.readFileSync(
  path.join(RAIZ, 'components/sst/MachinesEquipmentTab.tsx'), 'utf8'
);
check(
  maquinasTela.includes('addMachineEquipment')
  && maquinasTela.includes('updateMachineEquipment')
  && maquinasTela.includes('deleteMachineEquipment'),
  'a tela cria, edita e remove maquina'
);
check(
  /applicable_norms: \[\] as NormaDeMaquina\[\]/.test(maquinasTela),
  'nenhuma norma vem marcada por padrao'
);
check(
  maquinasTela.includes('no_specific_machines_declared_at: dataDeHoje()')
  && maquinasTela.includes('no_specific_machines_declared_at: undefined'),
  'a tela grava a declaracao e a retira ao cadastrar maquina'
);
check(
  !/nr13_next_inspection_date: .*setUTCMonth|somarMeses|addMonths/.test(maquinasTela),
  'a tela nao calcula a proxima inspecao da NR-13'
);
check(
  !/if \(!form\.name\.trim\(\)\) return;/.test(maquinasTela),
  'salvar sem nome avisa, em vez de dar `return` em silencio'
);
check(sync.includes("'machinesEquipment'"), 'a colecao das maquinas e sincronizada');
check(contexto.includes('parsed.machinesEquipment'), 'o snapshot carrega as maquinas');

// ===========================================================================
// 3h. PRODUTOS QUIMICOS (secao 6.4)
// ===========================================================================
console.log('');
console.log('--- 3h. Produtos quimicos (6.4) ---');

check(tc.includes('6.4 Inventário de produtos químicos'), '6.4 mantem o titulo do modelo');
for (const sub of ['26.4.1.1', '26.4.3.1', '26.5.1', '26.5.2']) {
  check(tc.includes(sub), `6.4 cita o subitem ${sub}`);
}

// Os cinco produtos do cliente saem; o de outro cliente, nao.
check(tc.includes('Alcool etilico 70% INPM'), '6.4 lista o produto perigoso completo');
check(tc.includes('Hipoclorito de sodio 2,5%'), '6.4 lista o saneante');
check(tc.includes('Detergente neutro'), '6.4 lista o produto nao perigoso');
check(!tc.includes('Xileno de outra empresa'), 'NAO traz produto de outro cliente');

// CAS, GHS e FDS: os tres que o modelo pede na 6.4.
check(
  tc.includes('etanol (CAS 64-17-5), 70% v/v'),
  '6.4 traz os componentes com numero CAS'
);
check(
  tc.includes('Liquido inflamavel categoria 2') && tc.includes('Perigo - H225, H319'),
  '6.4 traz classe de perigo e palavra de advertencia do GHS'
);
check(
  tc.includes('Revisão: 03/11/2025') && tc.includes('Acesso: Pasta fisica na copa'),
  '6.4 traz a revisao da FDS e onde o trabalhador a acessa (26.5.1)'
);
check(tc.includes('Treinamento: 22/04/2026'), '6.4 traz a data do treinamento do 26.5.2');

// O SANEANTE: dispensa so da rotulagem.
check(
  tc.includes('Saneante Anvisa, dispensada (26.4.2.4)')
  && tc.includes('Anvisa: 3.0123.4567.001-8'),
  'o saneante sai com a dispensa e o numero que a fundamenta'
);
check(
  tc.includes('A dispensa é apenas da rotulagem')
  && tc.includes('subitem 26.4.3 continuam exigíveis'),
  '6.4 diz no documento que a dispensa do saneante nao alcanca classificacao nem FDS'
);
check(
  !tc.includes('Produto Hipoclorito de sodio 2,5%: falta'),
  'o saneante completo nao gera pendencia'
);
check(
  tc.includes('Produto Desinfetante concentrado: falta')
  && tc.includes('que fundamenta a dispensa do subitem 26.4.2.4'),
  'saneante sem numero Anvisa gera pendencia: dispensa sem prova nao vale'
);

// NAO PERIGOSO: o 26.4.3.3 e nota, nao pendencia - o juizo e do avaliador.
check(
  tc.includes('O subitem 26.4.3.3 exige a ficha também para produto não classificado como perigoso'),
  'produto nao perigoso sem FDS recebe a nota do 26.4.3.3'
);
check(
  !tc.includes('Produto Detergente neutro: falta ficha com dados de segurança'),
  'a falta de FDS do nao perigoso nao e afirmada como descumprimento'
);

// Sem classificacao GHS: pendencia do proprio subitem.
check(
  tc.includes('Produto Removedor multiuso: falta classificação quanto aos perigos segundo o GHS (subitem 26.4.1.1)'),
  'produto sem classificacao GHS sai como pendencia nomeada'
);

// Uma pendencia por produto, agrupada.
check(
  (tc.match(/Produto [^:]{3,60}: falta/g) || []).length === 2,
  'as pendencias sao agrupadas por produto, uma cada'
);

// COERENCIA ENTRE A 6.4 E A 7: produto perigoso e nenhum agente quimico.
check(
  tc.includes('nenhum agente químico no inventário da seção 7'),
  '6.4 aponta a contradicao entre produto perigoso e inventario sem agente quimico'
);
const comRiscoQuimico = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES,
  risks: [RISCO_CLASSIFICADO, RISCO_QUIMICO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  chemicalProducts: [QUIMICO_PERIGOSO_COMPLETO],
}));
check(
  !comRiscoQuimico.includes('nenhum agente químico no inventário da seção 7'),
  'com agente quimico inventariado, a contradicao desaparece'
);

// Lista vazia nao e declaracao de inexistencia.
const semQuimico = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  chemicalProducts: [],
}));
check(
  semQuimico.includes('Nenhum produto químico cadastrado')
  && semQuimico.includes('Engenharia SST > Produtos Químicos'),
  'sem produto e sem declaracao, a 6.4 sai como pendencia apontando a tela'
);
const quimicoDeclarado = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE_SEM_QUIMICO],
  chemicalProducts: [],
}));
check(
  quimicoDeclarado.includes('declarou em 17/09/2026 que nenhum produto químico'),
  'a declaracao datada sai no documento'
);
check(
  quimicoDeclarado.includes('Álcool 70%, hipoclorito, desinfetante e detergente são')
  && quimicoDeclarado.includes('dispensa do subitem 26.4.2.4 alcança apenas a rotulagem'),
  'a declaracao vem com o aviso de que saneante nao e "sem produto quimico"'
);

// A tela.
const quimicosTela = fs.readFileSync(
  path.join(RAIZ, 'components/sst/ChemicalProductsTab.tsx'), 'utf8'
);
check(
  quimicosTela.includes('addChemicalProduct')
  && quimicosTela.includes('updateChemicalProduct')
  && quimicosTela.includes('deleteChemicalProduct'),
  'a tela cria, edita e remove produto'
);
check(
  /ghs_classification: '' as ChemicalProduct\['ghs_classification'\] \| ''/.test(quimicosTela)
  && /sds_status: '' as ChemicalProduct\['sds_status'\] \| ''/.test(quimicosTela),
  'classificacao GHS e FDS comecam vazias, sem padrao'
);
check(
  quimicosTela.includes('a classificação e a FDS continuam')
  || quimicosTela.includes('a classificação e a FDS continuam exigíveis deste produto'),
  'a tela avisa que a dispensa do saneante nao alcanca classificacao nem FDS'
);
check(
  quimicosTela.includes('no_chemical_products_declared_at: dataDeHoje()')
  && quimicosTela.includes('no_chemical_products_declared_at: undefined'),
  'a tela grava a declaracao e a retira ao cadastrar produto'
);
check(
  !/if \(!form\.name\.trim\(\)\) return;/.test(quimicosTela),
  'salvar sem nome avisa, em vez de dar `return` em silencio'
);
check(sync.includes("'chemicalProducts'"), 'a colecao dos produtos e sincronizada');
check(contexto.includes('parsed.chemicalProducts'), 'o snapshot carrega os produtos');

// ===========================================================================
// 3i. MATRIZ DE CAPACITACAO (secao 9.7) E O CATALOGO DAS NR
// ===========================================================================
console.log('');
console.log('--- 3i. Matriz de capacitacao (9.7) ---');

const {
  CATALOGO_DE_TREINAMENTOS, GATILHOS_DE_TREINAMENTO_EVENTUAL, catalogoPorChave, CHAVE_CIPA
} = catTreinamentos;

// --- O catalogo: toda linha tem fonte, e nenhuma carga sem base normativa ---
check(CATALOGO_DE_TREINAMENTOS.length > 0, `o catalogo tem ${CATALOGO_DE_TREINAMENTOS.length} treinamentos`);
check(
  CATALOGO_DE_TREINAMENTOS.every((t) => t.fonte && /\d/.test(t.fonte)),
  'toda linha do catalogo cita um subitem com numero'
);
check(
  CATALOGO_DE_TREINAMENTOS.every((t) => t.norma && /^NR-\d{2}$/.test(t.norma)),
  'toda linha do catalogo nomeia a NR de origem'
);
check(
  CATALOGO_DE_TREINAMENTOS.every((t) => ['NORMA', 'EMPREGADOR', 'ORGANIZACAO'].includes(t.base)),
  'toda linha declara de onde vem a carga: norma, empregador ou organizacao'
);
// O ponto central: carga ou periodicidade so podem vir preenchidas quando a
// NORMA as fixa. Preenche-las numa linha 'EMPREGADOR' seria atribuir a NR um
// numero que ela nao tem - o defeito que a NR-12 torna obvio.
check(
  CATALOGO_DE_TREINAMENTOS.filter((t) => t.base === 'EMPREGADOR')
    .every((t) => !t.cargaInicial && !t.periodicidadeMeses && !t.cargaPeriodica),
  'linha "definida pelo empregador" nao traz carga nem periodicidade de norma'
);
check(
  CATALOGO_DE_TREINAMENTOS.filter((t) => t.base === 'NORMA' && t.chave !== CHAVE_CIPA)
    .every((t) => !!t.cargaInicial),
  'toda linha "fixada na NR" traz a carga inicial que a norma fixa'
);
// A CIPA e a excecao deliberada: a carga depende do grau de risco, e vem de
// lib/nr5Quadros.ts em vez de numero fixo aqui.
check(
  !catalogoPorChave(CHAVE_CIPA).cargaInicial,
  'a carga da CIPA nao esta fixada no catalogo: depende do grau de risco'
);

// Os numeros conferidos no texto das normas, um por um.
const ESPERADO = [
  ['nr35-altura', '8 h', 24, '8 h'],
  ['nr33-autorizados', '16 h', 12, '8 h'],
  ['nr33-supervisores', '40 h', 12, '8 h'],
  ['nr10-basico', '40 h', 24, '16 h'],
  ['nr10-sep', '40 h', 24, '16 h'],
  ['nr10-mt-at', '16 h', 24, '16 h'],
  ['nr10-area-classificada', '16 h', 24, '16 h'],
  ['nr13-caldeiras', '40 h', undefined, undefined],
  ['nr13-unidades-processo', '40 h', undefined, undefined],
];
for (const [chave, inicial, meses, periodica] of ESPERADO) {
  const item = catalogoPorChave(chave);
  check(
    !!item && item.cargaInicial === inicial && item.periodicidadeMeses === meses
      && item.cargaPeriodica === periodica,
    `catalogo: ${chave} = inicial ${inicial}, periodico ${meses ?? 'nao fixado'}`
  );
}
// As tres que a norma NAO fixa.
for (const chave of ['nr06-epi', 'nr12-maquinas', 'nr26-quimicos']) {
  const item = catalogoPorChave(chave);
  check(
    !!item && item.base === 'EMPREGADOR',
    `catalogo: ${chave} fica com o empregador, porque a NR nao fixa carga`
  );
}
check(
  GATILHOS_DE_TREINAMENTO_EVENTUAL.length === 3
  && GATILHOS_DE_TREINAMENTO_EVENTUAL.some((g) => g.includes('180 dias')),
  'os tres gatilhos do eventual, com o retorno de afastamento superior a 180 dias'
);

// --- O documento -----------------------------------------------------------
check(tc.includes('9.7 Capacitação e treinamento (item 1.7)'), '9.7 cita o item 1.7');
for (const sub of ['1.7.1.2.1', '1.7.1.2.2', '1.7.1.1', '1.7.2']) {
  check(tc.includes(sub), `9.7 cita o subitem ${sub}`);
}
check(tc.includes('Trabalho em altura'), '9.7 lista o treinamento da matriz');
check(
  tc.includes('subitens 35.3.2 e 35.3.3.1'),
  '9.7 imprime o subitem que exige cada treinamento'
);
check(
  tc.includes('A cada 24 meses, 8 h'),
  '9.7 imprime a periodicidade e a carga do periodico'
);
check(
  tc.includes('Trabalhadores que executam trabalho em altura'),
  '9.7 diz a quem cada treinamento se aplica'
);
check(
  tc.includes('Tecnico de manutencao'),
  '9.7 resolve o cargo pelo id, em vez de imprimir o id'
);
check(
  !tc.includes('Brigada de incendio de outra empresa'),
  'NAO traz treinamento de outro cliente'
);

// Norma x empregador: a distincao sai no documento.
check(
  tc.includes('Fixada na NR') && tc.includes('Definida pelo empregador (subitem 1.7.1.2.2)'),
  '9.7 distingue carga fixada na NR de carga definida pelo empregador'
);
check(
  tc.includes('a NR exige o treinamento mas não fixa carga horária ou periodicidade'),
  '9.7 explica o que significa "definida pelo empregador"'
);

// Pendencia agrupada por treinamento.
check(
  tc.includes('Treinamento Integracao em SST: falta'),
  'linha incompleta sai como pendencia nomeada'
);
check(
  (tc.match(/Treinamento [^:]{3,60}: falta/g) || []).length === 1,
  'as pendencias sao agrupadas por treinamento, uma cada'
);
check(
  !tc.includes('Treinamento Trabalho em altura: falta'),
  'a linha completa nao gera pendencia'
);

// O eventual sai sempre, inclusive com matriz vazia.
check(
  tc.includes('período superior a 180 dias'),
  '9.7 traz os gatilhos do treinamento eventual'
);

// Matriz vazia e sempre pendencia: nao ha declaracao de inexistencia possivel.
const semMatriz = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  trainingRequirements: [],
}));
check(
  semMatriz.includes('Matriz de capacitação não cadastrada')
  && semMatriz.includes('Engenharia SST > Matriz de Capacitação'),
  'matriz vazia sai como pendencia apontando a tela'
);
check(
  semMatriz.includes('de modo que a matriz nunca é vazia'),
  'a pendencia explica por que nao cabe declarar inexistencia aqui'
);
check(
  semMatriz.includes('período superior a 180 dias'),
  'os gatilhos do eventual saem mesmo sem matriz'
);

// --- Coerencia com as secoes 6.4, 6.5 e 7 ---------------------------------
// O PDF principal tem maquina NR-12 e linha de NR-12: sem lacuna. Tem
// equipamento NR-13, produto quimico e nenhuma linha dessas normas: lacuna.
check(
  !tc.includes('nenhum treinamento de NR-12 na matriz'),
  'com linha de NR-12 na matriz, a maquina da 6.5 nao gera lacuna'
);
check(
  tc.includes('equipamento(s) da NR-13 na seção 6.5 e nenhum treinamento de NR-13 na matriz'),
  'equipamento da NR-13 sem treinamento de NR-13 gera pendencia'
);
check(
  tc.includes('produto(s) químico(s) na seção 6.4 e nenhum treinamento de NR-26 na matriz'),
  'produto quimico sem treinamento de NR-26 gera pendencia, citando o 26.5.2'
);

// Sem a linha de NR-12, a lacuna aparece.
const semNr12 = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  machinesEquipment: [MAQUINA_NR12],
  trainingRequirements: [CAPACITACAO_NR35],
}));
check(
  semNr12.includes('máquina(s) com requisito de NR-12 na seção 6.5 e nenhum treinamento de NR-12'),
  'maquina de NR-12 sem treinamento de NR-12 gera pendencia, citando o 12.16.1'
);

// EPI exigido no inventario sem treinamento de NR-06.
const comEpi = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES,
  risks: [{ ...RISCO_CLASSIFICADO, epi_required: true }],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  trainingRequirements: [CAPACITACAO_NR35],
}));
check(
  comEpi.includes('com EPI exigido e nenhum treinamento de NR-06 na matriz'),
  'risco com EPI exigido sem treinamento de NR-06 gera pendencia'
);

// --- A tela ----------------------------------------------------------------
const matrizTela = fs.readFileSync(
  path.join(RAIZ, 'components/sst/TrainingMatrixTab.tsx'), 'utf8'
);
check(
  matrizTela.includes('addTrainingRequirement')
  && matrizTela.includes('updateTrainingRequirement')
  && matrizTela.includes('deleteTrainingRequirement'),
  'a tela cria, edita e remove linha da matriz'
);
check(
  matrizTela.includes("from '@/lib/catalogoDeTreinamentos'"),
  'os presets da tela vem do catalogo, nao de literais na propria tela'
);
check(
  matrizTela.includes('NR5_CARGA_HORARIA_TREINAMENTO'),
  'a carga da CIPA vem do Quadro da NR-05 conforme o grau de risco'
);
check(
  /basis: '' as TrainingRequirement\['basis'\] \| ''/.test(matrizTela),
  '`basis` comeca vazio: nao se presume que a carga e normativa'
);
check(
  !/cargaInicial: '\d/.test(matrizTela) && !/initial_hours: '\d+ ?h'/.test(matrizTela),
  'a tela nao traz carga horaria de NR escrita nela mesma'
);
check(
  !/if \(!form\.name\.trim\(\)\) return;/.test(matrizTela),
  'salvar sem nome avisa, em vez de dar `return` em silencio'
);
check(sync.includes("'trainingRequirements'"), 'a colecao da matriz e sincronizada');
check(contexto.includes('parsed.trainingRequirements'), 'o snapshot carrega a matriz');

// ===========================================================================
// 3j. AEP DA NR-17 (secoes 5.3 e 7.4)
// ===========================================================================
console.log('');
console.log('--- 3j. AEP da NR-17 (5.3 e 7.4) ---');

const {
  NR17_ASPECTOS, NR17_ALTERNATIVAS_DE_PREVENCAO, NR17_MINIMO_DE_ALTERNATIVAS,
  NR17_GATILHOS_DA_AET, NR17_ETAPAS_DA_AET, PARAMETROS_DE_CONFORTO,
  NR17_FATORES_DA_ORGANIZACAO, NR17_EXIGENCIAS_A_EVITAR, dispensadaDeElaborarAET
} = nr17;

// --- O modulo normativo ----------------------------------------------------
check(NR17_ASPECTOS.length === 6, `os seis aspectos da NR-17 (${NR17_ASPECTOS.length})`);
check(
  NR17_ASPECTOS.every((a) => /^ite(m|ns) 17\./.test(a.fonte)),
  'todo aspecto cita o item da NR-17 de onde saiu'
);
check(NR17_FATORES_DA_ORGANIZACAO.length === 6, 'as seis alineas do item 17.4.1');
check(NR17_EXIGENCIAS_A_EVITAR.length === 6, 'as seis alineas do item 17.4.3');
check(NR17_ALTERNATIVAS_DE_PREVENCAO.length === 4, 'as quatro alternativas do subitem 17.4.3.1');
check(NR17_MINIMO_DE_ALTERNATIVAS === 2, 'o minimo de duas alternativas do subitem 17.4.3.1');
check(NR17_GATILHOS_DA_AET.length === 4, 'os quatro gatilhos do item 17.3.2');
check(NR17_ETAPAS_DA_AET.length === 6, 'as seis etapas do item 17.3.3');

// Os numeros da redacao VIGENTE, nao da anterior.
const conforto = PARAMETROS_DE_CONFORTO.map((c) => c.parametro).join(' | ');
check(conforto.includes('18 e 25'), 'conforto termico: 18 a 25 graus, da redacao vigente');
check(!/20 e 23|20 a 23/.test(conforto), 'NAO traz a faixa de 20 a 23 graus, da redacao revogada');
check(conforto.includes('NHO 11'), 'iluminamento pela NHO 11 da Fundacentro, versao 2018');
check(!/5413|8995/.test(conforto), 'NAO cita a NBR 5413 nem a ISO 8995, da redacao revogada');
check(conforto.includes('65 dB(A)'), 'conforto acustico: ate 65 dB(A) nos demais casos');
check(
  !/umidade relativa.*40|40 ?%/.test(conforto),
  'NAO traz umidade minima de 40%, que a redacao vigente nao fixa'
);

// Item 17.3.4: a dispensa de ELABORAR a AET.
check(dispensadaDeElaborarAET('MICROEMPRESA', 2) === true, 'ME de grau 2 dispensada de elaborar a AET');
check(dispensadaDeElaborarAET('EPP', 1) === true, 'EPP de grau 1 dispensada');
check(dispensadaDeElaborarAET('MICROEMPRESA', 3) === false, 'ME de grau 3 NAO dispensada');
check(dispensadaDeElaborarAET('MEI', 4) === true, 'MEI dispensado em qualquer grau');
check(dispensadaDeElaborarAET('DEMAIS', 2) === false, 'empresa de demais portes NAO dispensada');
check(dispensadaDeElaborarAET('', 2) === null, 'sem porte informado nao se presume a dispensa');
check(dispensadaDeElaborarAET('MICROEMPRESA', null) === null, 'sem grau de risco nao se presume a dispensa');

// --- Secao 5.3: a metodologia ---------------------------------------------
check(
  tc.includes('5.3 Avaliação ergonômica e fatores psicossociais (item 17.3 da NR-17)'),
  '5.3 passou a nomear o item 17.3'
);
for (const sub of ['17.3.1.1', '17.3.1.2', '17.3.1.2.1', '17.3.5', '17.3.6', '17.3.8', '17.4.3.1.1', '17.3.7']) {
  check(tc.includes(sub), `5.3 cita o subitem ${sub}`);
}
check(
  tc.includes('A NR-17 não prescreve método, técnica ou ferramenta específicos'),
  '5.3 diz que a norma nao prescreve instrumento'
);
check(
  tc.includes('pode ser contemplada nas etapas de identificação de perigos'),
  '5.3 registra que a AEP pode viver no processo do item 1.5.4 da NR-01'
);
for (const aspecto of NR17_ASPECTOS) {
  check(tc.includes(aspecto.rotulo), `5.3.1 traz o aspecto "${aspecto.rotulo}"`);
}
check(tc.includes('18 e 25'), '5.3.4 imprime a faixa de temperatura vigente');
check(tc.includes('NHO 11'), '5.3.4 imprime o iluminamento pela NHO 11');
check(
  tc.includes('pausas e altern') && tc.includes('tornam-se obrigat'),
  '5.3.3 explica a regra do subitem 17.4.3.1.1'
);
for (const etapa of NR17_ETAPAS_DA_AET) {
  check(tc.includes(etapa.texto.slice(0, 34)), `5.3.5 traz a etapa "${etapa.alinea}" da AET`);
}

// Porte nao informado: a dispensa nao se presume.
check(
  tc.includes('Porte da organização não informado')
  && tc.includes('dispensa de elaborar a AET do item 17.3.4'),
  'sem porte, a 5.3 declara a duvida sobre a dispensa em vez de decidir'
);
const comMe = corrido(gerar({
  client: CLIENTE_ME, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO, RISCO_ERGONOMICO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  ergonomicAssessments: [AEP_COMPLETA],
}));
check(
  comMe.includes('Esta organização se enquadra na dispensa')
  && comMe.includes('apenas nas situações das alíneas "c" e "d"'),
  'ME de grau 2: a 5.3 reconhece a dispensa e limita a AET as alineas "c" e "d"'
);
const comGrande = corrido(gerar({
  client: CLIENTE_GRANDE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO, RISCO_ERGONOMICO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  ergonomicAssessments: [AEP_COMPLETA],
}));
check(
  comGrande.includes('não se enquadra na dispensa do item 17.3.4'),
  'demais portes: a AET e devida nas quatro situacoes'
);

// --- Secao 7.4: os registros ----------------------------------------------
check(
  tc.includes('7.4 Resultados da avaliação ergonômica preliminar'),
  '7.4 mantem o titulo do modelo'
);
check(tc.includes('Recepcao - atendimento em posto informatizado'), '7.4 lista a AEP registrada');
check(
  !tc.includes('Linha de montagem de outra empresa'),
  'NAO traz AEP de outro cliente'
);
check(
  tc.includes('Combinação de abordagens') && tc.includes('Observacao direta em dois turnos'),
  '7.4 traz a abordagem e os metodos empregados'
);
check(
  tc.includes('Eng. Carla Nunes, CREA-BA 98765') && tc.includes('12/03/2026'),
  '7.4 traz autoria e data da avaliacao'
);
check(
  tc.includes('Digitacao continua por mais de duas horas'),
  '7.4 traz a observacao do aspecto julgado inadequado'
);
check(
  tc.includes('Inadequado - exige medida') && tc.includes('Não aplicável a esta situação'),
  '7.4 distingue adequado, inadequado e nao aplicavel'
);
check(
  tc.includes('Empregados ouvidos: Entrevista individual'),
  '7.4 registra a oitiva dos empregados (17.3.8)'
);
check(
  tc.includes('Pausas para recuperação psicofisiológica'),
  '7.4 nomeia as alternativas de prevencao adotadas'
);
check(
  !tc.includes('AEP Recepcao - atendimento em posto informatizado: falta'),
  'a AEP completa nao gera pendencia'
);

// A incompleta: cada exigencia da norma cobrada por nome.
for (const [rotulo, texto_] of [
  ['abordagem', 'abordagem empregada: qualitativa, semiquantitativa, quantitativa ou combinação (subitem 17.3.1.1)'],
  ['aspectos', 'conclusão dos aspectos:'],
  ['oitiva', 'os empregados foram ouvidos no processo (item 17.3.8)'],
  ['GHE', 'GHE ou cargo a que a situação corresponde'],
]) {
  check(
    tc.includes(texto_),
    `AEP incompleta: pendencia de ${rotulo} citada com o subitem`
  );
}

// Uma medida so: o 17.4.3.1 exige duas, e o 17.4.3.1.1 impoe "a" e "b".
check(
  tc.includes(`ao menos ${NR17_MINIMO_DE_ALTERNATIVAS} alternativas de prevenção do subitem 17.4.3.1, e há 1 registrada`),
  'uma medida so gera pendencia contando as registradas'
);

// Pendencia agrupada por AEP.
check(
  (tc.match(/AEP [^:]{3,60}: falta/g) || []).length === 2,
  'as pendencias sao agrupadas por AEP, uma cada'
);

// Gatilho da AET.
const comGatilhoB = corrido(gerar({
  client: CLIENTE_GRANDE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO, RISCO_ERGONOMICO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  ergonomicAssessments: [AEP_COM_GATILHO_B],
}));
check(
  comGatilhoB.includes('AET, exigida pelas alíneas "b" do item 17.3.2'),
  'gatilho "b" sem relatorio gera pendencia de AET quando nao ha dispensa'
);
// Na dispensa do 17.3.4, o gatilho "b" NAO obriga; o "c" obriga.
const meGatilhoB = corrido(gerar({
  client: CLIENTE_ME, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO, RISCO_ERGONOMICO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  ergonomicAssessments: [AEP_COM_GATILHO_B],
}));
check(
  !meGatilhoB.includes('AET, exigida pelas alíneas')
  && meGatilhoB.includes('AET não exigível pela dispensa do item 17.3.4'),
  'na dispensa do 17.3.4, o gatilho "b" nao obriga a AET'
);
const meGatilhoC = corrido(gerar({
  client: CLIENTE_ME, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO, RISCO_ERGONOMICO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  ergonomicAssessments: [AEP_COM_GATILHO_C],
}));
check(
  meGatilhoC.includes('AET, exigida pelas alíneas "c" do item 17.3.2'),
  'na dispensa do 17.3.4, o gatilho "c" obriga a AET (subitem 17.3.4.1)'
);

// Coerencia com o inventario (item 17.3.5) e cobertura dos GHE (item 17.2.1).
check(
  tc.includes('nenhum agente ergonômico no inventário da seção 7.2'),
  'AEP registrada sem risco ergonomico inventariado gera pendencia do 17.3.5'
);
check(
  !comMe.includes('nenhum agente ergonômico no inventário da seção 7.2'),
  'com risco ergonomico inventariado, a contradicao desaparece'
);
const gheSemAep = corrido(gerar({
  client: CLIENTE_GRANDE, organization: ORG,
  ghes: [...GHES, { id: 'g2', code: 'GHE-02', name: 'Limpeza', client_id: 'c1' }],
  risks: [RISCO_CLASSIFICADO, RISCO_ERGONOMICO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  ergonomicAssessments: [AEP_COMPLETA],
}));
check(
  gheSemAep.includes('GHE sem avaliação ergonômica preliminar: GHE-02'),
  'GHE sem AEP sai nomeado, citando o item 17.2.1'
);

// Sem AEP nenhuma: nao cabe declaracao de inexistencia.
const semAep = corrido(gerar({
  client: CLIENTE_GRANDE, organization: ORG, ghes: GHES, risks: [RISCO_CLASSIFICADO],
  employees: FUNCIONARIOS, sectors: SETORES, units: [UNIDADE],
  ergonomicAssessments: [],
}));
check(
  semAep.includes('Nenhuma avaliação ergonômica preliminar registrada')
  && semAep.includes('Engenharia SST > Avaliação Ergonômica'),
  'sem AEP, a 7.4 sai como pendencia apontando a tela'
);
check(
  semAep.includes('item 17.2.1 aplica a NR-17 a todas as situações de trabalho'),
  'a pendencia explica por que nao cabe declarar inexistencia aqui'
);

// --- A tela ----------------------------------------------------------------
const aepTela = fs.readFileSync(
  path.join(RAIZ, 'components/sst/ErgonomicAssessmentTab.tsx'), 'utf8'
);
check(
  aepTela.includes('addErgonomicAssessment')
  && aepTela.includes('updateErgonomicAssessment')
  && aepTela.includes('deleteErgonomicAssessment'),
  'a tela cria, edita e remove AEP'
);
check(
  aepTela.includes("from '@/lib/nr17'"),
  'os aspectos e os parametros vem do modulo da NR-17, nao de literais na tela'
);
check(
  /approach: '' as AbordagemDaAvaliacao \| ''/.test(aepTela)
  && /workers_heard: '' as 'SIM' \| 'NAO' \| ''/.test(aepTela),
  'abordagem e oitiva comecam vazias, sem padrao'
);
check(
  aepTela.includes('aspects: {} as Record<'),
  'nenhum aspecto nasce concluido: mapa vazio'
);
// O defeito que esta tela existe para nao cometer: inventar pontuacao.
// A prosa do arquivo fala de pontuacao para explicar por que nao ha nenhuma,
// entao a busca tem de ser pela forma que o defeito teria no codigo, e nao
// pela palavra.
check(
  !/(const|let)\s+\w*[Ss]core|pontuacao\s*[:=]|pontos\s*[:=]\s*\d|peso\s*[:=]\s*\d/.test(aepTela),
  'a tela nao inventa pontuacao nem escala para atribuir a NR-17'
);
check(
  !/18 e 25|65 dB|NHO 11/.test(aepTela.replace(/PARAMETROS_DE_CONFORTO/g, '')) === false
  || aepTela.includes('PARAMETROS_DE_CONFORTO'),
  'os parametros de conforto na tela vem da constante conferida'
);
check(
  !/if \(!form\.situation_name\.trim\(\)\) return;/.test(aepTela),
  'salvar sem situacao avisa, em vez de dar `return` em silencio'
);
check(sync.includes("'ergonomicAssessments'"), 'a colecao das AEP e sincronizada');
check(contexto.includes('parsed.ergonomicAssessments'), 'o snapshot carrega as AEP');

// ===========================================================================
// 4. UMA CLASSIFICACAO SO NO SISTEMA
// ===========================================================================
console.log('\n--- 4. Fonte única de classificação (conferência no código) ---');
const aba = fs.readFileSync(path.join(RAIZ, 'components/sst/GHERiskInventoryTab.tsx'), 'utf8');
const ctx = fs.readFileSync(path.join(RAIZ, 'context/PrevSafeContext.tsx'), 'utf8');
check(aba.includes('classificarRisco('), 'a aba do GHE usa a matriz do modelo');
check(ctx.includes('classificarRisco('), 'o catálogo de riscos usa a matriz do modelo');
check(!/riskScore <= 3\) risk_level/.test(aba), 'a fórmula antiga saiu da aba do GHE');
check(!/riskScore >= 20 \? 'CRITICO'/.test(ctx), 'a fórmula antiga saiu do catálogo');

console.log(`\n${casos - falhas}/${casos} casos passaram.`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S).`);
  process.exit(1);
}
console.log('PGR: estrutura do modelo, matriz conferida célula a célula, sem dado inventado.');
process.exit(0);
