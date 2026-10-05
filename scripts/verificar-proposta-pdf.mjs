/**
 * Verificacao do PDF da proposta comercial.
 *
 *   node scripts/verificar-proposta-pdf.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * A proposta nao podia ser impressa nem exportada. O PDF novo vai para o
 * cliente com dados reais, e tres defeitos o tornariam pior que nao ter PDF:
 *
 *   1. CONDICAO DE PAGAMENTO DIVERGENTE - se o PDF calculasse as parcelas por
 *      conta propria, a proposta diria uma coisa e o contrato (clausula 7) e o
 *      Financeiro outra. E um plano incompleto impresso como cronograma
 *      parcial seria aceito pelo cliente como "a condicao".
 *   2. DADO INVENTADO - e-mail, valor ou data de exemplo no lugar do campo
 *      vazio. O que o PDF afirma tem que estar no registro.
 *   3. CELULA ILEGIVEL - a Helvetica do jsPDF so desenha WinAnsi. Um ">=" ou
 *      um emoji no texto digitado troca a string inteira para UTF-16 e a
 *      celula sai "R e g u l a r" (foi assim com o Kit Admissional).
 *
 * Este teste GERA o PDF e confere o texto que saiu, contra as funcoes de
 * lib/planoDePagamento.ts - a mesma fonte do contrato.
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
const TMP = path.join(RAIZ, '.tmp-proposta-pdf-verificacao');

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
    files: [path.join(RAIZ, 'lib/propostaPdf.ts')],
  })
);

try {
  execFileSync('npx', ['tsc', '-p', path.join(TMP, 'tsconfig.json')], {
    stdio: 'pipe', shell: true, cwd: RAIZ
  });
} catch (e) {
  inconclusivo('npx tsc falhou', e.stdout?.toString() || e.message);
}

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
const achar = (n) => [path.join(TMP, 'lib', n), path.join(TMP, n)].find((p) => fs.existsSync(p));

// O save do jsPDF grava em disco no Node. Interceptado, guarda o nome e os
// bytes; e a ultima instancia criada fica a mao para conferir o autoPrint.
let salvo = null;
let ultimaInstancia = null;
try {
  const jspdf = require_('jspdf');
  const Original = jspdf.jsPDF;
  function Envolvido(...args) {
    const inst = new Original(...args);
    inst.save = function (nome) {
      salvo = { nome, pdf: Buffer.from(this.output('arraybuffer')) };
      return this;
    };
    ultimaInstancia = inst;
    return inst;
  }
  Envolvido.prototype = Original.prototype;
  for (const k of Object.keys(Original)) Envolvido[k] = Original[k];
  jspdf.jsPDF = Envolvido;
} catch (e) {
  inconclusivo('não foi possível carregar o jspdf', e.message);
}

let mod, plano, versao;
try {
  mod = require_(achar('propostaPdf.js'));
  plano = require_(achar('planoDePagamento.js'));
  versao = require_(achar('versaoDoDocumento.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}

const { montarPdfDaProposta, exportProposalPdf, paraWinAnsi, SEM_PLANO_DE_PAGAMENTO, PLANO_EM_DEFINICAO } = mod;
const { cronogramaDoPlano, descreverPlano, faltasDoPlano, ROTULO_DA_FORMA } = plano;
const { VERSAO_DO_DOCUMENTO } = versao;
const { formatCurrency, formatDate } = require_(achar('utils.js'));

let casos = 0;
let falhas = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

// ===========================================================================
// Leitura do PDF (mesma tecnica de verificar-pgr.mjs)
// ===========================================================================

/**
 * O jsPDF escreve em WinAnsi, onde travessao, bullet e reticencias ocupam a
 * faixa 0x85-0x97 - que em latin1 sao caracteres de controle. Traduzidos aqui,
 * e o esperado passa por comoNoPdf, para comparar texto com texto.
 */
const WINANSI = { 0x85: '...', 0x91: "'", 0x92: "'", 0x93: '"', 0x94: '"', 0x95: '*', 0x96: '-', 0x97: '-' };
const comoNoPdf = (s) => String(s)
  .replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/•/g, '*');

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
/** String que caiu em UTF-16: o jsPDF nao marca, e sobra um NUL por letra. */
const quebrados = (buf) => trechosDoPdf(buf).filter((t) => t.includes('\u0000'));
const pdfDe = (doc) => Buffer.from(doc.output('arraybuffer'));
const gerar = (args) => pdfDe(montarPdfDaProposta(args));

/** Posicao de uma sequencia de trechos consecutivos (celulas de uma linha). */
function acharSequencia(trechos, seq, desde = 0) {
  for (let i = desde; i <= trechos.length - seq.length; i++) {
    if (seq.every((s, j) => trechos[i + j].trim() === comoNoPdf(s))) return i;
  }
  return -1;
}
const contar = (lista, alvo) => lista.filter((t) => t.includes(alvo)).length;
/**
 * Celulas seguidas no texto corrido. Celula estreita quebra em linhas (cada
 * linha e um Tj); no texto corrido elas voltam a ser a frase.
 */
const temSeq = (buf, seq) => corrido(buf).includes(seq.map(comoNoPdf).join(' '));
const semLixo = (tc) => !/undefined|NaN|\bnull\b/.test(tc);

/** Texto sem comentarios: a varredura procura a forma do defeito, nao a prosa. */
const semComentarios = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');

// ===========================================================================
// Massa
// ===========================================================================
const ORG = {
  id: 'org1', name: 'Consultoria Alfa SST',
  legal_name: 'ALFA CONSULTORIA EM SEGURANCA DO TRABALHO LTDA',
  document_number: '11.222.333/0001-81', email: 'contato@alfasst.com.br', phone: '(71) 3333-4444',
  status: 'ACTIVE', created_at: '2026-01-01T12:00:00.000Z', updated_at: '2026-01-01T12:00:00.000Z',
};
const CLIENTE = {
  id: 'c1', organization_id: 'org1',
  legal_name: 'GRAUS CLINICA DE REABILITACAO LTDA', trade_name: 'Graus Clínica',
  document_type: 'CNPJ', document_number: '12.483.776/0001-99',
  address: 'Rua das Flores, 100', neighborhood: 'Centro', city: 'Salvador', state: 'BA', zip_code: '40000-000',
  email: 'financeiro@grausclinica.com.br', phone: '(71) 9999-0000',
};
/** Sem e-mail, sem telefone, sem rua; nome fantasia igual a razao social. */
const CLIENTE_SEM_CONTATO = {
  id: 'c2', organization_id: 'org1',
  legal_name: 'PADARIA BOM PAO LTDA', trade_name: 'Padaria Bom Pao Ltda',
  document_number: '98.765.432/0001-10', city: 'Eunápolis', state: 'BA',
};

const ITENS = [
  {
    id: 'i1', proposal_id: 'prop1', service_template_id: 't1',
    service_name: 'PGR', description: 'Programa de Gerenciamento de Riscos (NR-01)',
    quantity: 1, unit_price: 6500, original_price: 6500, discount_type: 'FIXED', discount_value: 0, discount: 0, total: 6500,
  },
  {
    id: 'i2', proposal_id: 'prop1', service_template_id: 't2',
    service_name: 'PCMSO', description: 'Inclui ASO para ≥ 20 trabalhadores 🚀 e relatório analítico',
    quantity: 1, unit_price: 5200, original_price: 5200, discount_type: 'FIXED', discount_value: 500, discount: 500, total: 4700,
  },
  {
    id: 'i3', proposal_id: 'prop1', service_template_id: 't3',
    service_name: 'Treinamento NR-35', description: 'Turma de até 10 pessoas',
    quantity: 10, unit_price: 150, original_price: 150, discount_type: 'PERCENT', discount_value: 10, discount: 150, total: 1350,
  },
];

/** Entrada no Pix + 12 parcelas fixas no boleto. 10.000 / 12 nao e exato. */
const PLANO_COMPLETO = {
  partes: [
    { id: 'p1', tipo: 'UNICA', forma: 'PIX', descricao: 'Entrada', valor: 2550, vencimento: '2026-10-10' },
    { id: 'p2', tipo: 'FIXAS', forma: 'BOLETO', valor: 10000, quantidade: 12, periodicidade: 'MENSAL', vencimento: '2026-11-30' },
  ],
  observacoes: 'Boletos enviados por e-mail com 5 dias de antecedência → financeiro',
};
/** As parcelas fixas sem quantidade: a entrada esta completa, o resto nao. */
const PLANO_INCOMPLETO = {
  partes: [
    PLANO_COMPLETO.partes[0],
    { id: 'p2', tipo: 'FIXAS', forma: 'BOLETO', valor: 10000, periodicidade: 'MENSAL', vencimento: '2026-11-30' },
  ],
};
/** Completo, mas soma 12.000,00 para um total de 12.550,00. */
const PLANO_SOMA_ERRADA = {
  partes: [
    { ...PLANO_COMPLETO.partes[0], valor: 2000 },
    PLANO_COMPLETO.partes[1],
  ],
};

/**
 * Carimbos as 21h30 e 22h30 de Brasilia, ja no dia seguinte em UTC: o dia
 * impresso tem de ser o de Brasilia (05/10 e 04/11), nao o do ISO.
 */
const PROPOSTA = {
  id: 'prop1', organization_id: 'org1', client_id: 'c1',
  proposal_number: 'PROP-2026-000123',
  title: 'Gestão de SST 2026/2027 — PGR, PCMSO e NR-35',
  description: 'Escopo conforme visita técnica de 28/09.\nValores sem deslocamento fora de Salvador.',
  items: ITENS, subtotal: 13200, discount: 650, total: 12550,
  payment_plan: PLANO_COMPLETO,
  valid_until: '2026-11-05T01:30:00.000Z',
  status: 'SENT', created_by: 'u1',
  created_at: '2026-10-06T00:30:00.000Z', updated_at: '2026-10-06T00:30:00.000Z',
};

// ===========================================================================
// 1. PROPOSTA COMPLETA
// ===========================================================================
console.log('\n— proposta completa: cabeçalho, cliente, serviços e valores');
const pdfCheio = gerar({ proposal: PROPOSTA, client: CLIENTE, organization: ORG });
const tCheio = trechosDoPdf(pdfCheio);
const tc = corrido(pdfCheio);

check(paginas(pdfCheio) >= 1, `o PDF foi gerado (${paginas(pdfCheio)} página(s))`);
check(quebrados(pdfCheio).length === 0, 'nenhuma string caiu em UTF-16 (texto com ≥ e emoji incluído)');
check(tc.includes('PROPOSTA COMERCIAL') && tc.includes('PROP-2026-000123'), 'cabeçalho: "PROPOSTA COMERCIAL" e o número');
check(tc.includes('Consultoria Alfa SST') && temSeq(pdfCheio, ['Emitente:', ORG.legal_name, 'CNPJ:', ORG.document_number]),
  'quem emite: nome, razão social e CNPJ da organização');
check(temSeq(pdfCheio, ['E-mail:', ORG.email, 'Telefone:', ORG.phone]), 'contatos da organização que existem no cadastro');
check(temSeq(pdfCheio, ['Emissão:', '05/10/2026', 'Validade:', 'até 04/11/2026']),
  'emissão e validade no dia de Brasília (o ISO em UTC já é 06/10 e 05/11)');
check(tc.includes('Proposta válida até 04/11/2026.'), 'frase da validade: "Proposta válida até 04/11/2026."');
check(!tc.includes('Aceita'), 'proposta enviada (SENT) não diz "Aceita"');

check(temSeq(pdfCheio, ['Razão social:', CLIENTE.legal_name, 'CNPJ:', CLIENTE.document_number]), 'cliente: razão social e CNPJ');
check(temSeq(pdfCheio, ['Nome fantasia:', 'Graus Clínica']), 'cliente: nome fantasia diferente da razão social');
check(temSeq(pdfCheio, ['Endereço:', 'Rua das Flores, 100, Centro - Salvador/BA - CEP 40000-000']), 'cliente: endereço, cidade e CEP');
check(temSeq(pdfCheio, ['E-mail:', CLIENTE.email, 'Telefone:', CLIENTE.phone]), 'cliente: e-mail e telefone cadastrados');

check(tc.includes(comoNoPdf(PROPOSTA.title)), 'título da proposta');
check(tc.includes('Escopo conforme visita técnica de 28/09.') && tc.includes('Valores sem deslocamento fora de Salvador.'),
  'observações da proposta, com a quebra de linha');

check(['PGR', 'PCMSO', 'Treinamento NR-35'].every((n) => tCheio.some((t) => t.trim() === n)), 'o nome de cada serviço');
check(tc.includes('Programa de Gerenciamento de Riscos (NR-01)') && tc.includes('Turma de até 10 pessoas'), 'a descrição de cada serviço');
check(temSeq(pdfCheio, ['1', 'R$ 6.500,00', '-', 'R$ 6.500,00']), 'PGR: qtd. 1, unitário, sem desconto, total');
check(temSeq(pdfCheio, ['1', 'R$ 5.200,00', 'R$ 500,00', 'R$ 4.700,00']), 'PCMSO: desconto em reais e total');
check(temSeq(pdfCheio, ['10', 'R$ 150,00', 'R$ 150,00', '(10%)', 'R$ 1.350,00']), 'NR-35: desconto de 10% com o percentual');
check(temSeq(pdfCheio, ['Subtotal', 'R$ 13.200,00']) && temSeq(pdfCheio, ['Descontos', 'R$ 650,00'])
  && temSeq(pdfCheio, ['TOTAL', 'R$ 12.550,00']), 'subtotal, descontos e TOTAL da proposta');

check(tc.includes('Inclui ASO para >= 20 trabalhadores e relatório analítico'),
  'texto digitado com ≥ e emoji: o ≥ vira ">=" e o emoji sai, a frase continua legível');
check(tc.includes('5 dias de antecedência -> financeiro'), 'a seta digitada nas observações do plano vira "->"');

// ===========================================================================
// 2. CONDICOES DE PAGAMENTO: PLANO COMPLETO
// ===========================================================================
console.log('\n— plano completo: alíneas e cronograma iguais aos de lib/planoDePagamento.ts');
const cronograma = cronogramaDoPlano(PLANO_COMPLETO);
const frases = descreverPlano(PLANO_COMPLETO);
check(faltasDoPlano(PLANO_COMPLETO, PROPOSTA.total).length === 0 && cronograma.length === 13 && frases.length === 2,
  'a massa é um plano completo de 13 parcelas (entrada + 12 boletos) que soma o total');
check(tc.includes('Valor total de R$ 12.550,00, pago da seguinte forma:'), 'abre com o valor total, como a cláusula 7');
check(tc.includes(comoNoPdf(`a) ${frases[0]};`)) && tc.includes(comoNoPdf(`b) ${frases[1]}.`)),
  'as formas em alíneas a) e b), com o texto de descreverPlano');
check(tc.includes(comoNoPdf(`Condição acordada: ${paraWinAnsi(PLANO_COMPLETO.observacoes)}`)), 'as observações do plano');
check(temSeq(pdfCheio, ['Nº', 'Vencimento', 'Valor', 'Forma', 'Referência']), 'o cronograma tem as colunas Nº, vencimento, valor, forma e referência');

let posicao = 0;
const linhasDoCronograma = [];
const divergentes = [];
for (const p of cronograma) {
  const linha = [String(p.numero), formatDate(p.vencimento), formatCurrency(p.valor), ROTULO_DA_FORMA[p.forma], p.rotulo];
  const i = acharSequencia(tCheio, linha, posicao);
  if (i >= 0) { linhasDoCronograma.push(i); posicao = i + linha.length; } else divergentes.push(linha.join(' | '));
}
check(linhasDoCronograma.length === 13,
  `as 13 parcelas saem na ordem, com número, data, valor, forma e referência de cronogramaDoPlano${divergentes.length ? ` — não achou: ${divergentes[0]}` : ''}`);
// Cada pagina e um stream, em ordem, e o rodape e o ultimo texto de cada uma:
// a pagina de um trecho e quantos rodapes vieram antes dele, mais um.
const paginaDoTrecho = (trechos, i) => trechos.slice(0, i).filter((t) => /^Página \d+ de \d+$/.test(t.trim())).length + 1;
const paginasDoCronograma = new Set(linhasDoCronograma.map((i) => paginaDoTrecho(tCheio, i)));
check(linhasDoCronograma.length === 13 && paginasDoCronograma.size === 1,
  `o cronograma de 13 parcelas, que cabe numa página, não fica partido entre páginas (está em ${[...paginasDoCronograma].join(' e ')})`);
check(cronograma.some((p) => p.vencimento === '2027-02-28') && tc.includes('28/02/2027'),
  'o vencimento de fevereiro é o que a regra do plano dá (28/02), sem recálculo no PDF');
check(tc.includes(formatCurrency(cronograma[12].valor)) && cronograma[12].valor !== cronograma[1].valor,
  'a última parcela leva a sobra dos centavos, como no cronograma');
check(!tc.includes(SEM_PLANO_DE_PAGAMENTO) && !tc.includes(PLANO_EM_DEFINICAO), 'plano completo não diz "não definida" nem "em definição"');

// ===========================================================================
// 3. SEM PLANO, PLANO INCOMPLETO, SOMA DIFERENTE
// ===========================================================================
console.log('\n— sem plano e plano em aberto');
const semCronograma = (buf) => {
  const t = corrido(buf);
  return !t.includes('Vencimento') && !t.includes('Referência') && !/\ba\) /.test(t) && !t.includes('Condição acordada');
};
for (const [nome, pp] of [['sem payment_plan', undefined], ['plano sem nenhuma parte', { partes: [] }]]) {
  const buf = gerar({ proposal: { ...PROPOSTA, payment_plan: pp }, client: CLIENTE, organization: ORG });
  const t = corrido(buf);
  check(t.includes('Condição de pagamento não definida nesta proposta.'), `${nome}: "Condição de pagamento não definida nesta proposta."`);
  check(semCronograma(buf) && !t.includes('Pix') && !t.includes('Boleto'), `${nome}: sem alíneas, sem cronograma e sem forma de pagamento`);
}

check(faltasDoPlano(PLANO_INCOMPLETO, PROPOSTA.total).length > 0 && cronogramaDoPlano(PLANO_INCOMPLETO).length === 1,
  'a massa incompleta tem faltas e um cronograma PARCIAL (só a entrada)');
const pdfIncompleto = gerar({ proposal: { ...PROPOSTA, payment_plan: PLANO_INCOMPLETO }, client: CLIENTE, organization: ORG });
const tIncompleto = corrido(pdfIncompleto);
check(tIncompleto.includes(PLANO_EM_DEFINICAO), 'plano incompleto: "Condição de pagamento em definição."');
check(semCronograma(pdfIncompleto), 'plano incompleto: nenhum cronograma nem alínea');
check(!tIncompleto.includes('10/10/2026') && !tIncompleto.includes('Entrada') && !tIncompleto.includes('R$ 2.550,00'),
  'plano incompleto: a entrada completa não sai sozinha como se fosse a condição');

check(faltasDoPlano(PLANO_SOMA_ERRADA, PROPOSTA.total).some((f) => /soma/.test(f)) && cronogramaDoPlano(PLANO_SOMA_ERRADA).length === 13,
  'a massa com soma errada tem todas as partes completas (13 parcelas) e não fecha com o total');
const pdfSoma = gerar({ proposal: { ...PROPOSTA, payment_plan: PLANO_SOMA_ERRADA }, client: CLIENTE, organization: ORG });
check(corrido(pdfSoma).includes(PLANO_EM_DEFINICAO) && semCronograma(pdfSoma),
  'soma diferente do total: "em definição", sem cronograma');

const pdfTotalZero = gerar({ proposal: { ...PROPOSTA, items: [], subtotal: 0, discount: 0, total: 0 }, client: CLIENTE, organization: ORG });
check(corrido(pdfTotalZero).includes(PLANO_EM_DEFINICAO) && semCronograma(pdfTotalZero),
  'proposta de total zero com plano: "em definição", como na cláusula 7 do contrato');
check(corrido(pdfTotalZero).includes('Nenhum serviço registrado nesta proposta.'), 'proposta sem item diz que não há serviço');

// ===========================================================================
// 4. ACEITE E SITUACAO
// ===========================================================================
console.log('\n— proposta aceita');
// 01h15 UTC de 07/10 sao 22h15 de 06/10 em Brasilia.
const pdfAceita = gerar({
  proposal: { ...PROPOSTA, status: 'APPROVED', approved_at: '2026-10-07T01:15:00.000Z' }, client: CLIENTE, organization: ORG,
});
check(corrido(pdfAceita).includes('Aceita em 06/10/2026'), 'aceita: "Aceita em 06/10/2026"');
check(!corrido(pdfAceita).includes('Aceita em 07/10/2026'), 'o dia do aceite é o de Brasília, não o do ISO em UTC');
const tAceitaSemData = corrido(gerar({ proposal: { ...PROPOSTA, status: 'APPROVED', approved_at: undefined }, client: CLIENTE, organization: ORG }));
check(!tAceitaSemData.includes('Aceita em') && tAceitaSemData.includes('Aceita (data do aceite não registrada)'),
  'aceita sem approved_at: não inventa a data');
check(!corrido(gerar({ proposal: { ...PROPOSTA, status: 'NEGOTIATION', approved_at: '2026-10-07T01:15:00.000Z' }, client: CLIENTE, organization: ORG })).includes('Aceita'),
  'approved_at sem status APPROVED: não diz "Aceita"');
check(corrido(gerar({ proposal: { ...PROPOSTA, status: 'CANCELLED' }, client: CLIENTE, organization: ORG })).includes('Cancelada'),
  'proposta cancelada sai marcada como cancelada');

check(tc.includes('De acordo - CONTRATANTE'), 'bloco de aceite: "De acordo — CONTRATANTE"');
check(['Nome:', 'Cargo / CPF:', 'Data:', 'Assinatura'].every((r) => tCheio.some((t) => t.trim() === r)),
  'bloco de aceite: nome, cargo/CPF, data e assinatura');
const iAceite = tCheio.findIndex((t) => t.includes('De acordo'));
check(iAceite >= 0 && tCheio[iAceite + 1]?.trim() === CLIENTE.legal_name && tCheio[iAceite + 2]?.trim() === 'Nome:',
  'bloco de aceite: a razão social do cliente e os campos em branco (nada preenchido)');

// ===========================================================================
// 5. RODAPE
// ===========================================================================
console.log('\n— rodapé em todas as páginas');
function conferirRodape(buf, rotulo) {
  const t = trechosDoPdf(buf);
  const n = paginas(buf);
  const todas = Array.from({ length: n }, (_, i) => `Página ${i + 1} de ${n}`).every((p) => t.some((x) => x.trim() === p));
  check(contar(t, 'PrevSafe - G Monteiro Empreendimentos Ltda') === n && contar(t, VERSAO_DO_DOCUMENTO) === n,
    `${rotulo}: "PrevSafe - G Monteiro Empreendimentos Ltda | ${VERSAO_DO_DOCUMENTO}" nas ${n} página(s)`);
  check(todas, `${rotulo}: "Página X de ${n}" em cada página`);
}
conferirRodape(pdfCheio, 'proposta completa');
check(tc.includes('Página 1 de'), 'a primeira página diz "Página 1 de"');
const MUITOS_ITENS = Array.from({ length: 45 }, (_, i) => ({
  ...ITENS[0], id: `m${i}`, service_name: `Serviço ${i + 1}`, description: `Descrição do serviço ${i + 1}`,
}));
const pdfLongo = gerar({ proposal: { ...PROPOSTA, items: MUITOS_ITENS }, client: CLIENTE, organization: ORG });
check(paginas(pdfLongo) >= 2, `proposta com 45 itens ocupa ${paginas(pdfLongo)} páginas`);
conferirRodape(pdfLongo, 'proposta longa');
check(quebrados(pdfLongo).length === 0 && semLixo(corrido(pdfLongo)), 'proposta longa: nenhum texto quebrado nem "undefined"');

// ===========================================================================
// 6. NADA INVENTADO
// ===========================================================================
console.log('\n— campo vazio não vira dado');
const MINIMA = {
  id: 'prop2', organization_id: 'org1', client_id: 'c2', proposal_number: 'PROP-2026-000124',
  title: '', description: '',
  items: [{ id: 'x1', proposal_id: 'prop2', service_template_id: '', service_name: 'Visita técnica', description: '' }],
  status: 'DRAFT', created_by: 'u1', valid_until: '',
};
const pdfMinima = gerar({ proposal: MINIMA, client: CLIENTE_SEM_CONTATO, organization: ORG });
const tMinima = trechosDoPdf(pdfMinima);
const tcMinima = corrido(pdfMinima);
check(contar(tMinima, 'E-mail:') === 1 && tMinima.filter((t) => t.includes('@')).every((t) => t.trim() === ORG.email),
  'cliente sem e-mail: nenhum e-mail impresso para ele (só o da organização)');
check(contar(tMinima, 'Telefone:') === 1, 'cliente sem telefone: nenhum telefone impresso para ele');
check(!tcMinima.includes('Nome fantasia'), 'nome fantasia igual à razão social não se repete');
check(temSeq(pdfMinima, ['Endereço:', 'Eunápolis/BA']), 'endereço: só a cidade/UF que existe');
check(!tcMinima.includes('R$ 0,00'), 'valor ausente não vira R$ 0,00');
check(temSeq(pdfMinima, ['Visita técnica', '-', 'não informado', '-', 'não informado']),
  'item sem quantidade, valor e total: quantidade omitida, valores "não informado"');
check(!trechosDoPdf(pdfMinima).some((t) => /^(mada|mado|formada|formado)$/.test(t.trim())),
  'nenhum "não informado" partido no meio da palavra numa coluna estreita');
check(temSeq(pdfMinima, ['TOTAL', 'não informado']) && !tcMinima.includes('Descontos'),
  'sem total gravado: "não informado"; sem desconto gravado: a linha não sai');
check(temSeq(pdfMinima, ['Emissão:', 'não informada', 'Validade:', 'não informada']), 'sem data de emissão e de validade: "não informada"');
check(tcMinima.includes('Validade da proposta não informada.') && !tcMinima.includes('válida até'), 'sem validade não há "válida até"');
check(temSeq(pdfMinima, ['Título:', 'não informado']) && !tcMinima.includes('Observações:'), 'sem título: "não informado"; sem observação: a linha não sai');
check(tcMinima.includes(SEM_PLANO_DE_PAGAMENTO), 'sem plano: a frase honesta');

const pdfSemNinguem = gerar({ proposal: MINIMA, client: null, organization: null });
const tcSemNinguem = corrido(pdfSemNinguem);
check(tcSemNinguem.includes('Emitente não informado') && tcSemNinguem.includes('Cliente não informado.'),
  'sem organização e sem cliente: diz que não foram informados');
check(!tcSemNinguem.includes('@') && !tcSemNinguem.includes('E-mail') && !tcSemNinguem.includes('Telefone')
  && !/PREVSAFE SST/i.test(tcSemNinguem.replace('PrevSafe - G Monteiro', '')),
  'sem organização: nenhum nome, e-mail ou telefone de exemplo no lugar');

for (const [nome, buf] of [['completa', pdfCheio], ['mínima', pdfMinima], ['sem cliente e organização', pdfSemNinguem],
  ['aceita', pdfAceita], ['incompleta', pdfIncompleto]]) {
  check(semLixo(corrido(buf)), `${nome}: nenhum "undefined", "NaN" ou "null" no texto`);
}

// ===========================================================================
// 7. WINANSI
// ===========================================================================
console.log('\n— caracteres fora da WinAnsi');
check(paraWinAnsi('≥ 20 🚀') === '>= 20 ', '≥ vira ">=" e o emoji sai');
check(paraWinAnsi('trabalhadores 🚀 e') === 'trabalhadores e', 'o emoji entre palavras não deixa espaço duplo');
check(paraWinAnsi('Ação — “ok” • 50% € ™ œ ½ ² º') === 'Ação — “ok” • 50% € ™ œ ½ ² º', 'o que a WinAnsi tem fica como está');
check(paraWinAnsi('á') === 'á' && paraWinAnsi('Ştefan Ăna') === 'Stefan Ana', 'acento decomposto se junta; letra sem forma no Latin-1 perde só o acento');
check(paraWinAnsi('👨‍👩‍👧 ok') === ' ok' && paraWinAnsi('李') === '?', 'emoji composto sai inteiro; outro alfabeto vira "?" visível');
check(paraWinAnsi(undefined) === '' && paraWinAnsi(null) === '', 'ausente vira texto vazio, nunca "undefined"');
const TORTURA = '✓ Inclui → visita ≤ 2h ✔ ★ ① ﬁm 😀 👍🏽 🇧🇷 ■ item — “citação” • ½ ² m³ € ™ œ Ž ă ș 李 ​ fim';
const pdfTortura = gerar({
  proposal: {
    ...PROPOSTA, title: TORTURA, description: TORTURA,
    items: [{ ...ITENS[0], service_name: TORTURA, description: TORTURA }],
    payment_plan: { ...PLANO_COMPLETO, observacoes: TORTURA, partes: [{ ...PLANO_COMPLETO.partes[0], descricao: 'Entrada ✓' }, PLANO_COMPLETO.partes[1]] },
  },
  client: { ...CLIENTE, legal_name: `Clínica ${TORTURA}`, trade_name: '🏥 Clínica', address: 'Rua ① ★' },
  organization: { ...ORG, name: `Alfa ${TORTURA}`, legal_name: `Alfa ${TORTURA}` },
});
check(quebrados(pdfTortura).length === 0,
  `texto digitado com conferido, seta, emoji, bandeira, ideograma etc. em todo campo: nenhuma célula em UTF-16 (${quebrados(pdfTortura).length} quebrada(s))`);
check(corrido(pdfTortura).includes('Inclui -> visita <= 2h'), 'a parte legível do texto digitado continua lá');

// ===========================================================================
// 8. EXPORTACAO: BAIXAR E IMPRIMIR
// ===========================================================================
console.log('\n— baixar e imprimir');
salvo = null;
const rBaixar = exportProposalPdf({ proposal: PROPOSTA, client: CLIENTE, organization: ORG });
check(rBaixar?.ok === true && salvo?.nome === 'proposta-PROP-2026-000123.pdf', 'baixar (padrão): doc.save("proposta-<numero>.pdf")');
check(Boolean(salvo) && corrido(salvo.pdf).includes('PROP-2026-000123'), 'o arquivo baixado é a proposta');
salvo = null;
exportProposalPdf({ proposal: { ...PROPOSTA, proposal_number: 'PROP/2026 001' }, client: CLIENTE, organization: ORG, acao: 'baixar' });
check(salvo?.nome === 'proposta-PROP-2026-001.pdf', 'número com barra ou espaço não quebra o nome do arquivo');

const chamadas = [];
let retornoDoOpen = {};
globalThis.window = { open: (url, alvo) => { chamadas.push({ url: String(url), alvo }); return retornoDoOpen; }, URL: globalThis.URL };
salvo = null;
const rImprimir = exportProposalPdf({ proposal: PROPOSTA, client: CLIENTE, organization: ORG, acao: 'imprimir' });
check(rImprimir?.ok === true && chamadas.length === 1 && chamadas[0].url.startsWith('blob:') && chamadas[0].alvo === '_blank',
  'imprimir: abre o PDF (blob URL) numa aba nova');
const fonteImpresso = ultimaInstancia ? Buffer.from(ultimaInstancia.output('arraybuffer')).toString('latin1') : '';
check(/\/OpenAction/.test(fonteImpresso) && /\/N \/Print/.test(fonteImpresso), 'imprimir: o PDF abre com a janela de impressão (autoPrint)');
check(salvo === null, 'imprimir não baixa o arquivo');

retornoDoOpen = null;
const rBloqueado = exportProposalPdf({ proposal: PROPOSTA, client: CLIENTE, organization: ORG, acao: 'imprimir' });
check(rBloqueado?.ok === false && /bloque/i.test(rBloqueado?.mensagem || '') && /pop-up/i.test(rBloqueado?.mensagem || ''),
  'pop-up bloqueado (window.open devolve null): ok false e a mensagem explica');
delete globalThis.window;
const rSemJanela = exportProposalPdf({ proposal: PROPOSTA, client: CLIENTE, organization: ORG, acao: 'imprimir' });
check(rSemJanela?.ok === false && Boolean(rSemJanela?.mensagem), 'sem navegador: ok false com mensagem, sem exceção');
const rQuebrado = exportProposalPdf({ proposal: null, client: CLIENTE, organization: ORG });
check(rQuebrado?.ok === false && Boolean(rQuebrado?.mensagem), 'falha ao montar: ok false com mensagem, sem exceção na tela');

// ===========================================================================
// 9. A FONTE
// ===========================================================================
console.log('\n— a fonte de lib/propostaPdf.ts');
const fonte = semComentarios(fs.readFileSync(path.join(RAIZ, 'lib/propostaPdf.ts'), 'utf8').replace(/\r\n/g, '\n'));
check(!/\.toLocaleDateString\(/.test(fonte) && !/new Date\(/.test(fonte), 'nenhuma data por toLocaleDateString nem new Date (que voltam um dia)');
check(!/(somarMesesISO|dividirEmParcelas|parcelasDaParte|MESES_DA_PERIODICIDADE|emCentavos)\b/.test(fonte),
  'o PDF não recalcula parcela nem vencimento: nada de somarMesesISO, dividirEmParcelas, parcelasDaParte');
check(/cronogramaDoPlano\(/.test(fonte) && /descreverPlano\(/.test(fonte) && /faltasDoPlano\(/.test(fonte),
  'usa cronogramaDoPlano, descreverPlano e faltasDoPlano');
check((fonte.match(/doc\.text\(/g) || []).length === 1 && (fonte.match(/autoTable\(doc/g) || []).length === 1,
  'um só doc.text e um só autoTable, ambos atrás da troca para WinAnsi');

// ===========================================================================
console.log(`\n${casos - falhas}/${casos} casos OK`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S)`);
  process.exit(1);
}
console.log('Proposta em PDF: condição de pagamento igual à do contrato, nada inventado, texto legível e rodapé em toda página.');
