/**
 * Verificacao do documento da Avaliacao Ergonomica Preliminar (AEP).
 *
 *   node scripts/verificar-aep.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * A AEP e um documento entregue ao cliente, ao sindicato e a fiscalizacao. Ele
 * afirma o que foi avaliado e a que conclusao se chegou - entao o que nao pode
 * acontecer, nunca, e ele dar por avaliado o que ninguem avaliou. Aspecto sem
 * conclusao tem que sair PENDENTE, e nao "Adequado".
 *
 * Este teste GERA O PDF e le o que saiu. As duas coisas que ele persegue:
 *
 *   1. nenhum valor normativo escrito de memoria. Os numeros da NR-17 mudaram
 *      em 2021 e a redacao antiga ainda circula: 20 a 23 graus, umidade minima
 *      de 40%, iluminamento pela NBR 5413. Nenhum dos tres pode aparecer.
 *   2. nenhum campo preenchido por padrao. O que falta sai com o nome do que
 *      falta, e a mesma AEP incompleta produz as mesmas pendencias na aba de
 *      cadastro, na secao 7.4 do PGR e aqui - porque a regra e a mesma funcao.
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
const TMP = path.join(RAIZ, '.tmp-aep-verificacao');

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
      path.join(RAIZ, 'lib/nr17.ts'),
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

let servico, nr17;
try {
  servico = require_(achar('pdfExportService.js'));
  nr17 = require_(achar('nr17.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}

const { exportAEPDocumentPdf } = servico;
const {
  faltasDaAEP,
  NR17_ASPECTOS,
  dispensadaDeElaborarAET,
  descreverDispensaDaAET,
  PORTES,
} = nr17;

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

/**
 * Texto do arquivo sem comentarios.
 *
 * O cabecalho de `porteDaReceita` CITA o defeito antigo para explicar por que
 * a funcao existe. Sem isto, a varredura pega a propria prosa e acusa um
 * defeito que ja foi corrigido.
 */
const semComentariosDoArquivo = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');

/**
 * As strings que o PDF manda desenhar.
 *
 * O jsPDF escreve em WinAnsi, onde travessao, bullet e reticencias ocupam a
 * faixa 0x85-0x97 — que em latin1 sao caracteres de controle. Sem traduzi-los,
 * "Inadequado — exige medida" vira "Inadequado \u0097 exige medida" e a
 * comparacao falha por um motivo que nao tem nada a ver com o documento.
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
const corrido = (buf) => trechosDoPdf(buf).join(' ').replace(/\s+/g, ' ');
const paginas = (buf) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
const quebrados = (buf) => trechosDoPdf(buf).filter((t) => t.includes('\u0000'));

/** TAMANHO de uma celula, em milimetros (ver verificar-pgr.mjs). */
const PT_EM_MM = 25.4 / 72;
function celula(buf, rotulo, depois = false) {
  const bruto = buf.toString('latin1');
  const i = bruto.indexOf(`(${rotulo.replace(/[()]/g, (c) => `\\${c}`)}`);
  if (i < 0) return null;
  const indice = depois ? bruto.indexOf('() Tj', i) : i;
  if (indice < 0) return null;
  const rects = [...bruto.slice(0, indice)
    .matchAll(/(-?\d[\d.]*) (-?\d[\d.]*) (-?\d[\d.]*) (-?\d[\d.]*) re/g)];
  const r = rects[rects.length - 1];
  if (!r) return null;
  return { largura: Number(r[3]) * PT_EM_MM, altura: Math.abs(Number(r[4])) * PT_EM_MM };
}

// ===========================================================================
// DADOS
// ===========================================================================
const ORG = {
  id: 'org-1',
  name: 'PrevSafe Engenharia',
  document_number: '11.222.333/0001-44',
  technical_responsible_name: 'Ana Paula Ribeiro',
  technical_responsible_council: 'CREA-SP 123456/D',
};

const CLIENTE = {
  id: 'cli-1',
  legal_name: 'Industria Modelo Ltda',
  trade_name: 'Modelo',
  document_number: '12.483.776/0001-99',
  address: 'Rua das Industrias, 100',
  city: 'Volta Redonda',
  state: 'RJ',
  cnae_code: '2542-0/00',
  risk_degree: 3,
  porte: 'DEMAIS',
};

const UNIDADE = {
  id: 'un-1', client_id: 'cli-1', status: 'ACTIVE',
  legal_representative: 'Marcos Tavares', risk_degree: 3,
};

const GHES = [{ id: 'ghe-1', client_id: 'cli-1', code: 'GHE-01', name: 'Montagem' }];
const CARGOS = [{ id: 'cargo-1', client_id: 'cli-1', name: 'Montador' }];

/** AEP completa: nada pendente. */
/**
 * Avaliacao psicossocial completa e sem fator presente - nada a inventariar.
 * Desde 26/05/2026 ela faz parte da AEP (subitem 1.5.3.2.1 da NR-01): AEP
 * sem ela nao esta completa. As chaves sao as de FATORES_PSICOSSOCIAIS.
 */
const PSICOSSOCIAL_COMPLETA = {
  estrategias: ['OBSERVACAO_E_DIALOGO'],
  indicadores_consultados: 'Afastamentos do setor nos ultimos 12 meses, somados',
  fatores: Object.fromEntries(
    ['assedio', 'mudancas', 'clareza', 'recompensas', 'suporte', 'autonomia', 'justica',
      'traumaticos', 'subcarga', 'sobrecarga', 'relacionamentos', 'comunicacao', 'remoto']
      .map((k) => [k, { conclusao: 'NAO_IDENTIFICADO' }])
  ),
  avaliacao_de_desempenho: { conclusao: 'NAO_HA_SISTEMA' },
  orientacao_das_chefias: { conclusao: 'ATENDE' },
};

const AEP_COMPLETA = {
  id: 'aep-1', client_id: 'cli-1', status: 'ACTIVE',
  situation_name: 'Montagem manual em bancada',
  ghe_ids: ['ghe-1'], job_ids: ['cargo-1'], worker_count: 12,
  approach: 'COMBINADA',
  methods: 'Observacao direta da atividade, entrevista com os montadores e registro fotografico',
  assessment_date: '2026-09-10',
  assessor: 'Ana Paula Ribeiro - CREA-SP 123456/D',
  aspects: {
    organizacao: { conclusao: 'ADEQUADO' },
    sobrecarga: { conclusao: 'INADEQUADO', observacao: 'Ciclo de 14 s com elevacao de ombro acima de 90 graus' },
    cargas: { conclusao: 'NAO_APLICAVEL' },
    mobiliario: { conclusao: 'INADEQUADO', observacao: 'Bancada fixa em 95 cm, sem regulagem' },
    maquinas: { conclusao: 'ADEQUADO' },
    conforto: { conclusao: 'ADEQUADO' },
  },
  prevention_measures: ['a', 'c'],
  prevention_description: 'Bancada regulavel ate marco de 2027 e pausa de 10 min a cada 50 trabalhados',
  workers_heard: 'SIM',
  workers_heard_note: 'Reuniao com os 12 montadores em 12/09/2026',
  workers_heard_date: '2026-09-12',
  workers_heard_count: 12,
  psychosocial: PSICOSSOCIAL_COMPLETA,
  aet_triggers: [],
  created_at: '2026-09-10',
};

/** AEP vazia: so o nome. Tudo o mais tem de sair como pendencia. */
const AEP_VAZIA = {
  id: 'aep-2', client_id: 'cli-1', status: 'ACTIVE',
  situation_name: 'Expedicao',
  created_at: '2026-09-10',
};

/** Gatilho do 17.3.2 observado e AET nao realizada. */
const AEP_COM_GATILHO = {
  ...AEP_COMPLETA,
  id: 'aep-3', situation_name: 'Solda de chassi',
  aet_triggers: ['a', 'c'], aet_report_date: '',
};

const AEP_DE_OUTRO_CLIENTE = {
  ...AEP_COMPLETA, id: 'aep-x', client_id: 'cli-99',
  situation_name: 'Situacao de outra empresa',
};

const AEP_INATIVA = {
  ...AEP_COMPLETA, id: 'aep-i', status: 'INACTIVE',
  situation_name: 'Situacao desativada',
};

function gerar(args) {
  ultimoPdf = null;
  exportAEPDocumentPdf(args);
  if (!ultimoPdf) inconclusivo('exportAEPDocumentPdf não produziu PDF');
  return ultimoPdf;
}

const pdf = gerar({
  client: CLIENTE, organization: ORG, units: [UNIDADE], ghes: GHES, jobs: CARGOS,
  ergonomicAssessments: [
    AEP_COMPLETA, AEP_VAZIA, AEP_COM_GATILHO, AEP_DE_OUTRO_CLIENTE, AEP_INATIVA
  ],
});
const t = corrido(pdf);

const pdfSemAep = gerar({
  client: CLIENTE, organization: ORG, units: [UNIDADE], ghes: GHES, jobs: CARGOS,
  ergonomicAssessments: [],
});
const tSemAep = corrido(pdfSemAep);

// ===========================================================================
// 1. O DOCUMENTO EXISTE E TEM ESTRUTURA
// ===========================================================================
console.log('--- 1. Estrutura do documento ---');

check(paginas(pdf) >= 5, `o documento tem ${paginas(pdf)} páginas`);
check(quebrados(pdf).length === 0, 'nenhuma string caiu em UTF-16BE');
check(t.includes('AVALIAÇÃO ERGONÔMICA'), 'a capa traz o título');
check(t.includes('AEP-12483776000199-2026-REV00'), 'a capa traz o código do documento');
check(/\d+ \/ \d+/.test(t), 'as páginas são numeradas');

for (const secao of [
  '1. OBJETO E ALCANCE',
  '2. O QUE A AVALIAÇÃO PERCORRE',
  '3. ORGANIZAÇÃO DO TRABALHO E EXIGÊNCIAS A EVITAR',
  '4. MEDIDAS DE PREVENÇÃO: DUAS OU MAIS',
  '5. PARÂMETROS DE CONFORTO (item 17.8)',
  '6. QUANDO A AET É DEVIDA',
  '7. RESULTADOS POR SITUAÇÃO DE TRABALHO',
  '8. PENDÊNCIAS',
  '9. ENCERRAMENTO E ASSINATURAS',
]) {
  check(t.includes(secao), `traz a seção "${secao}"`);
}

// Os seis aspectos, um por capitulo da NR-17.
for (const asp of NR17_ASPECTOS) {
  check(t.includes(asp.rotulo), `percorre o aspecto "${asp.rotulo}" (${asp.fonte})`);
}

// ===========================================================================
// 2. NENHUM VALOR NORMATIVO DA REDACAO REVOGADA
// ===========================================================================
console.log('\n--- 2. A redação vigente, e só ela ---');

check(t.includes('18 e 25'), 'temperatura: a faixa vigente de 18 a 25 °C (subitem 17.8.4.2)');
check(!/20 a 23|20 e 23/.test(t), 'NÃO traz a faixa revogada de 20 a 23 °C');
check(t.includes('NHO 11'), 'iluminamento pela NHO 11 da Fundacentro');
check(!/5413/.test(t), 'NÃO cita a NBR 5413, substituída');
check(!/umidade relativa do ar não inferior a 40|40%/.test(t), 'NÃO traz a umidade mínima de 40%, que saiu do texto');
check(t.includes('65 dB'), 'conforto acústico: 65 dB(A) (subitem 17.8.4.1.2)');
check(t.includes('Portarias MTP'), 'diz em que redação a NR-17 está');
check(t.includes('17.3.1.2.1'), 'cita o subitem que torna o registro obrigatório');
check(t.includes('17.3.5'), 'cita o item que manda os resultados integrarem o inventário');
check(t.includes('17.3.8'), 'cita a oitiva dos empregados');
check(t.includes('20 anos'), 'cita a guarda de 20 anos do relatório de AET (item 17.3.7)');

// A NR-17 nao prescreve metodo: nao pode haver escala de pontos.
check(
  !/(const|let)\s+\w*[Ss]core|pontuacao\s*[:=]|pontos\s*[:=]\s*\d|peso\s*[:=]\s*\d/
    .test(fs.readFileSync(path.join(RAIZ, 'lib/pdfExportService.ts'), 'utf8')),
  'o gerador não inventa pontuação: o subitem 17.3.1.1 deixa a abordagem a quem avalia'
);

// ===========================================================================
// 3. O QUE FOI AVALIADO SAI; O QUE NAO FOI SAI COMO PENDENTE
// ===========================================================================
console.log('\n--- 3. Nada preenchido por padrão ---');

check(t.includes('Montagem manual em bancada'), 'a situação avaliada aparece');
check(t.includes('Ciclo de 14 s'), 'o que se observou no aspecto inadequado aparece');
check(t.includes('Inadequado - exige medida'), 'o aspecto inadequado sai nomeado');
check(t.includes('Combinação de abordagens'), 'a abordagem sai por extenso');
check(t.includes('Ana Paula Ribeiro'), 'quem avaliou aparece');

check(t.includes('Expedicao'), 'a situação sem preenchimento também aparece, e não some');
check(t.includes('PENDENTE'), 'o que falta sai marcado como pendente');
check(
  t.includes('O QUE FALTA NESTA SITUAÇÃO'),
  'cada situação incompleta diz, nela mesma, o que falta'
);

// A mesma regra da aba e da secao 7.4 do PGR: a prova e comparar com a funcao.
const faltasEsperadas = faltasDaAEP(AEP_VAZIA, { dispensaDeAET: false, alcance: '' });
// Oito, e sao estas: uma AEP so com nome nao tem aspecto inadequado (entao as
// regras de medida do 17.4.3.1 nao incidem) nem gatilho do 17.3.2 observado.
// A oitava e a avaliacao psicossocial, que desde 26/05/2026 faz parte da AEP -
// uma pendencia so, e nao uma por fator, enquanto nada foi comecado.
check(faltasEsperadas.length === 8,
  `a AEP vazia tem ${faltasEsperadas.length} faltas pela regra única (esperadas 8)`);
for (const esperada of ['GHE ou cargo', 'abordagem', 'métodos', 'data', 'quem avaliou',
  'aspecto(s) sem conclusão', 'oitiva', 'fatores psicossociais']) {
  check(faltasEsperadas.some((f) => f.curto.includes(esperada)),
    `a regra cobra "${esperada}"`);
}
for (const falta of faltasEsperadas.slice(0, 6)) {
  check(t.includes(falta.longo.slice(0, 38)), `o documento cobra: "${falta.longo.slice(0, 44)}…"`);
}

// Aspecto nao avaliado nao pode virar "Adequado": e o defeito que este
// documento nao pode ter, porque ele seria assinado.
const aspectosDaVazia = corrido(gerar({
  client: CLIENTE, organization: ORG, units: [UNIDADE], ghes: GHES, jobs: CARGOS,
  ergonomicAssessments: [AEP_VAZIA],
}));
check(!aspectosDaVazia.includes('Adequado'),
  'AEP sem nenhuma conclusão NÃO imprime "Adequado" em aspecto nenhum');
check((aspectosDaVazia.match(/PENDENTE/g) || []).length >= 6,
  'os seis aspectos não avaliados saem pendentes, um a um');

// ===========================================================================
// 4. AET: GATILHO OBSERVADO COBRA O RELATORIO
// ===========================================================================
console.log('\n--- 4. AET ---');

check(t.includes('Solda de chassi'), 'a situação com gatilho aparece');
check(/PENDENTE - exigida pelas alíneas "a", "c"/.test(t),
  'gatilho observado sem relatório: a AET sai cobrada, com as alíneas');

// Na dispensa do item 17.3.4, so as alineas "c" e "d" obrigam.
const tMe = corrido(gerar({
  client: { ...CLIENTE, porte: 'ME', risk_degree: 1 },
  organization: ORG, units: [{ ...UNIDADE, risk_degree: 1 }], ghes: GHES, jobs: CARGOS,
  ergonomicAssessments: [{ ...AEP_COMPLETA, id: 'aep-me', aet_triggers: ['a'] }],
}));
check(tMe.includes('se enquadra na dispensa'), 'ME de grau 1: o documento reconhece a dispensa do 17.3.4');
check(!tMe.includes('PENDENTE - exigida'),
  'na dispensa, o gatilho da alínea "a" NÃO obriga a AET (subitem 17.3.4.1)');

const tSemPorte = corrido(gerar({
  client: { ...CLIENTE, porte: '' },
  organization: ORG, units: [{ ...UNIDADE, risk_degree: null }], ghes: GHES, jobs: CARGOS,
  ergonomicAssessments: [AEP_COMPLETA],
}));
check(tSemPorte.includes('não afirma nem nega a dispensa'),
  'sem o porte, o documento declara a dúvida em vez de presumir a dispensa');

// ===========================================================================
// PORTE DA ORGANIZACAO
//
// O porte decide, com o grau de risco, a dispensa de ELABORAR a AET (item
// 17.3.4). O campo existia no cadastro do cliente e NUNCA teve input: so era
// preenchido pela consulta a Receita. Cliente criado a mao, ou com CPF, CAEPF
// ou CNO, ficava sem porte para sempre - e a AEP mandava preencher numa tela
// onde o campo nao existia.
// ===========================================================================
console.log('\n--- Porte: o campo, e o que ele decide ---');
{
  const tela = fs.readFileSync(path.join(RAIZ, 'components/crm/ClientsView.tsx'), 'utf8');
  check(/clientForm\.porte/.test(tela) && /setClientForm\(\{ \.\.\.clientForm, porte:/.test(tela),
    'a tela de clientes tem onde informar o porte');
  check(/PORTES\.map/.test(tela),
    'e as opções vêm da mesma lista que a regra do item 17.3.4 reconhece');
  check(!/porte \|\| 'Empresa Geral'/.test(tela),
    'o painel não chama de "Empresa Geral" o porte que ninguém informou');

  // Os valores oferecidos na tela TEM de ser entendidos pela regra. Separados,
  // a tela grava um texto que a regra nao le e a dispensa nunca e avaliada.
  check(dispensadaDeElaborarAET('MEI', 4) === true,
    'MEI é dispensado de elaborar a AET em qualquer grau (item 17.3.4)');
  check(dispensadaDeElaborarAET('ME', 2) === true, 'ME de grau 2 é dispensada');
  check(dispensadaDeElaborarAET('ME', 3) === false, 'ME de grau 3 não é');
  check(dispensadaDeElaborarAET('EPP', 1) === true, 'EPP de grau 1 é dispensada');
  check(dispensadaDeElaborarAET('DEMAIS', 1) === false,
    'médio e grande porte não são dispensados, mesmo em grau 1');
  for (const p of PORTES) {
    check(dispensadaDeElaborarAET(p.valor, 1) !== null,
      `a regra entende a opção "${p.valor}" oferecida na tela`);
  }

  // Como a Receita escreve.
  check(dispensadaDeElaborarAET('MICRO EMPRESA', 1) === true,
    '"MICRO EMPRESA", com espaço, é entendido como ME');
  check(dispensadaDeElaborarAET('EMPRESA DE PEQUENO PORTE', 2) === true,
    '"EMPRESA DE PEQUENO PORTE" é entendido como EPP');

  // Sem porte NAO se presume nada.
  check(dispensadaDeElaborarAET('', 1) === null, 'sem porte, a dispensa fica indefinida');
  check(dispensadaDeElaborarAET('ME', null) === null,
    'com porte e sem grau de risco, também');

  // A consequencia aparece na hora de preencher.
  check(/dispensada/i.test(descreverDispensaDaAET('MEI', 3)),
    'o campo explica que o MEI é dispensado');
  check(/17\.3\.4\.1/.test(descreverDispensaDaAET('ME', 1)),
    'e lembra do subitem 17.3.4.1, que traz a AET de volta pelas alíneas "c" e "d"');
  check(/porte/i.test(descreverDispensaDaAET('', 1)),
    'sem porte, diz que falta o porte');
  check(/grau de risco/i.test(descreverDispensaDaAET('ME', null)),
    'com porte e sem grau, diz que falta o grau — e não manda preencher o que já está lá');

  // A consulta a Receita nao chuta mais.
  // Sem os comentários: o cabeçalho de `porteDaReceita` CITA o defeito antigo
  // para explicar por que a função existe, e a varredura pegava a própria prosa.
  const lookup = semComentariosDoArquivo(
    fs.readFileSync(path.join(RAIZ, 'lib/companyLookup.ts'), 'utf8')
  );
  check(!/data\.porte \|\| 'DEMAIS'/.test(lookup),
    "a consulta não classifica como 'DEMAIS' a empresa cujo porte a Receita não informou");
  check(/codigo_porte/.test(lookup),
    'o porte vem do código numérico da Receita, não do texto');
  check(/opcao_pelo_mei/.test(lookup), 'e o MEI vem da opção pelo SIMEI');
}

// ===========================================================================
// 5. SO AS AEP DESTE CLIENTE
// ===========================================================================
console.log('\n--- 5. Vazamento entre clientes ---');

check(!t.includes('Situacao de outra empresa'), 'NÃO traz AEP de outro cliente');
check(!t.includes('Situacao desativada'), 'NÃO traz AEP inativa');
check(t.includes('3 situações de trabalho avaliadas'), 'a capa conta só as três deste cliente');

// ===========================================================================
// 6. SEM NENHUMA AEP: PENDENCIA, E NAO DOCUMENTO LIMPO
// ===========================================================================
console.log('\n--- 6. Nenhuma situação avaliada ---');

check(paginas(pdfSemAep) >= 4, 'o documento mantém a estrutura mesmo sem nenhuma avaliação');
check(tSemAep.includes('Nenhuma situação de trabalho avaliada'),
  'diz que não há avaliação nenhuma');
check(tSemAep.includes('17.2.1'),
  'e lembra que a NR-17 alcança todas as situações de trabalho');
check(tSemAep.includes('não cabe declarar que não há o que avaliar'),
  'não oferece declaração de inexistência, que aqui não cabe');
check(!tSemAep.includes('Nenhuma pendência'),
  'sem avaliação, o documento NÃO se declara sem pendência');
check(t.includes('13. Avaliação Ergonômica') || tSemAep.includes('13. Avaliação Ergonômica'),
  'a pendência aponta a tela onde se cadastra');

// ===========================================================================
// 7. ASSINATURA: O QUADRO CABE UMA ASSINATURA
// ===========================================================================
console.log('\n--- 7. Quadro de assinatura ---');

const cabecalho = celula(pdf, 'Assinatura (manual');
const quadro = celula(pdf, 'Assinatura (manual', true);
check(t.includes('Assinatura (manual ou eletrônica)'), 'o quadro serve para as duas formas');
check(Boolean(cabecalho) && cabecalho.largura >= 60,
  `a coluna de assinatura tem ${(cabecalho?.largura ?? 0).toFixed(1)} mm de largura`);
check(Boolean(quadro) && quadro.altura >= 24,
  `o quadro de assinatura tem ${(quadro?.altura ?? 0).toFixed(1)} mm de altura`);
check(t.includes('Responsável técnico pela avaliação'), 'assina quem avaliou');
check(t.includes('Responsável legal da organização'), 'assina o responsável legal');
check(t.includes('CIPA ou representante dos trabalhadores'), 'há ciência dos trabalhadores');

// ===========================================================================
// 8. A TELA CHEGA AO DOCUMENTO
// ===========================================================================
console.log('\n--- 8. Ligação com a tela (conferência no código) ---');

const tela = fs.readFileSync(path.join(RAIZ, 'components/sst/TechnicalDocsGeneratorTab.tsx'), 'utf8');
const previa = fs.readFileSync(path.join(RAIZ, 'components/sst/DocumentPreviewModal.tsx'), 'utf8');
const nr17Fonte = fs.readFileSync(path.join(RAIZ, 'lib/nr17.ts'), 'utf8');
const aba = fs.readFileSync(path.join(RAIZ, 'components/sst/ErgonomicAssessmentTab.tsx'), 'utf8');
const gerador = fs.readFileSync(path.join(RAIZ, 'lib/pdfExportService.ts'), 'utf8');

check(/activeDocType === 'AEP'/.test(tela), 'a tela de documentos tem a aba da AEP');
check(/exportAEPDocumentPdf\(\{/.test(tela), 'e o botão gera o PDF');
check(/'AEP'/.test(previa) && /exportAEPDocumentPdf/.test(previa),
  'a pré-visualização conhece a AEP (é dela que sai o Imprimir)');

// A regra do que falta e UMA. Tres copias divergem, e a que divergir primeiro
// vai dar por completa uma avaliacao que nao esta.
check(/export function faltasDaAEP/.test(nr17Fonte), 'a regra do que falta mora em lib/nr17.ts');
check(/faltasDaAEP\(/.test(aba), 'a aba de cadastro usa a mesma regra');
check((gerador.match(/faltasDaAEP\(/g) || []).length >= 2,
  'o PGR e o documento da AEP usam a mesma regra');
check(!/naoAvaliados\.length > 0/.test(aba),
  'a cópia antiga saiu da aba de cadastro');

console.log(`\n${casos - falhas}/${casos} casos passaram.`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S).`);
  process.exit(1);
}
console.log('AEP: documento próprio, na redação vigente, sem nada preenchido por padrão.');
process.exit(0);
