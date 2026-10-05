/**
 * Verificacao do PCMSO (NR-07).
 *
 *   node scripts/verificar-pcmso.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * O PCMSO e lido por auditor fiscal do trabalho, por conselho de medicina e
 * por juiz. O que nao pode acontecer:
 *
 *   1. citar norma de memoria. Todo item da NR-07 vem de lib/nr07Texto.ts e
 *      tem de estar, palavra por palavra, em normas/nr07-vigente.txt (o PDF
 *      oficial). Toda lei, resolucao do CFM e outra NR vem de
 *      lib/pcmsoFontes.ts, identico a normas/fontes-pcmso.json.
 *   2. afirmar o que ninguem decidiu: periodicidade, exame ou fundamento
 *      preenchido por padrao, "vigencia de 12 meses", protocolo-modelo como se
 *      fosse do cliente, protocolo de OUTRO cliente.
 *   3. deixar de cobrar o que a norma exige: exame clinico nas cinco ocasioes,
 *      periodicidade do 7.5.8, Anexos II a V pelo inventario, atividade critica,
 *      relatorio analitico.
 *   4. expor dado de saude: nenhum CPF no documento, relatorio so agregado, e
 *      grupo pequeno somado aos demais.
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
const TMP = path.join(RAIZ, '.tmp-pcmso-verificacao');

function inconclusivo(motivo, detalhe) {
  console.log('\nINCONCLUSIVO — a verificação não pôde ser executada.');
  console.log(`motivo: ${motivo}`);
  if (detalhe) console.log(String(detalhe).split('\n').slice(0, 20).join('\n'));
  process.exit(2);
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
fs.writeFileSync(path.join(TMP, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    outDir: TMP, module: 'commonjs', target: 'es2020', moduleResolution: 'node',
    esModuleInterop: true, skipLibCheck: true, baseUrl: RAIZ, paths: { '@/*': ['./*'] },
  },
  files: ['lib/pdfExportService.ts', 'lib/pcmso.ts', 'lib/pcmsoModelo.ts', 'lib/nr07Texto.ts', 'lib/pcmsoFontes.ts', 'lib/esocialDados.ts']
    .map((f) => path.join(RAIZ, f)),
}));
try {
  execFileSync('npx', ['tsc', '-p', path.join(TMP, 'tsconfig.json')], { stdio: 'pipe', shell: true, cwd: RAIZ });
} catch (e) {
  inconclusivo('npx tsc falhou', e.stdout?.toString() || e.message);
}
const achar = (n) => [path.join(TMP, 'lib', n), path.join(TMP, n)].find((p) => fs.existsSync(p));
for (const dir of [path.join(TMP, 'lib'), TMP]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const alvo = path.join(dir, f);
    fs.writeFileSync(alvo, fs.readFileSync(alvo, 'utf8').replace(/require\("@\/lib\/([^"]+)"\)/g, 'require("./$1")'));
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
    inst.save = function () { ultimoPdf = Buffer.from(this.output('arraybuffer')); return this; };
    return inst;
  }
  Envolvido.prototype = Original.prototype;
  for (const k of Object.keys(Original)) Envolvido[k] = Original[k];
  jspdf.jsPDF = Envolvido;
} catch (e) {
  inconclusivo('não foi possível carregar o jspdf', e.message);
}

let servico, P, modelo, nr07, fontesMod, esocial;
try {
  esocial = require_(achar('esocialDados.js'));
  servico = require_(achar('pdfExportService.js'));
  P = require_(achar('pcmso.js'));
  modelo = require_(achar('pcmsoModelo.js'));
  nr07 = require_(achar('nr07Texto.js'));
  fontesMod = require_(achar('pcmsoFontes.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const semComentarios = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/gm, '$1')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ');
/** Sem espaco nenhum: imune a quebra de linha e de coluna do PDF. */
const compacto = (t) => String(t).replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/(\w)-\s*\n\s*(\w)/g, '$1$2').replace(/\s+/g, '');

const WINANSI = { 0x85: '...', 0x91: "'", 0x92: "'", 0x93: '"', 0x94: '"', 0x95: '*', 0x96: '-', 0x97: '-' };
function textoDoPdf(buf) {
  const bruto = buf.toString('latin1');
  const out = [];
  for (const m of bruto.matchAll(/\((?:\\[\s\S]|[^\\()])*\)\s*Tj/g)) {
    const cru = m[0].slice(1, m[0].lastIndexOf(')')).replace(/\\([\\()])/g, '$1');
    out.push([...cru].map((ch) => WINANSI[ch.charCodeAt(0)] ?? ch).join(''));
  }
  return out.join(' ').replace(/\s+/g, ' ');
}
function gerar(args) {
  ultimoPdf = null;
  try {
    servico.exportPCMSODocumentPdf(args);
  } catch (e) {
    check(false, `o gerador do PCMSO não quebra (${e.message})`);
    return '';
  }
  if (!ultimoPdf) inconclusivo('exportPCMSODocumentPdf não produziu PDF');
  const texto = textoDoPdf(ultimoPdf);
  // Caractere que a Helvetica nao desenha vira "\0L\0S\0C" e a celula sai ilegivel.
  if (texto.includes('\u0000')) check(false, `o PDF não tem texto ilegível (achado: ${JSON.stringify(texto.slice(Math.max(0, texto.indexOf('\u0000') - 30), texto.indexOf('\u0000') + 30))})`);
  return texto;
}
/** O texto do PDF contem a frase, ignorando quebras e espacos. */
const tem = (pdf, frase) => compacto(pdf.replace(/ - /g, ' — ')).includes(compacto(frase.replace(/ - /g, ' — ')))
  || compacto(pdf).includes(compacto(frase));

// ===========================================================================
// 1. FIDELIDADE DAS CITACOES
// ===========================================================================
console.log('\n— fidelidade das citações');

const oficial = compacto(ler('normas/nr07-vigente.txt'));
const itens = nr07.NR07_ITENS;
const chaves = Object.keys(itens);
check(chaves.length === 50, `lib/nr07Texto.ts transcreve os 50 itens de 7.1.1 a 7.7.4 (tem ${chaves.length})`);
for (const k of ['7.1.1', '7.3.2', '7.3.2.2', '7.4.1', '7.5.1', '7.5.4', '7.5.6', '7.5.8', '7.5.9', '7.5.11', '7.5.18', '7.5.19.1', '7.5.19.5', '7.6.1.1', '7.6.2', '7.6.6', '7.7.1']) {
  check(Boolean(itens[k]), `o item ${k} está transcrito`);
}
const fora = chaves.filter((k) => !oficial.includes(compacto(itens[k])));
check(fora.length === 0, `todo item de lib/nr07Texto.ts está, palavra por palavra, no texto oficial (fora: ${fora.join(', ') || 'nenhum'})`);
check(itens['7.5.11'].includes('135 (centro e trinta e cinco) dias'), 'a grafia do original é preservada (7.5.11, "centro e trinta e cinco")');

const snapshot = JSON.parse(ler('normas/fontes-pcmso.json')).dispositivos;
const fontes = fontesMod.FONTES_PCMSO;
check(JSON.stringify(Object.keys(fontes).sort()) === JSON.stringify(Object.keys(snapshot).sort()),
  `lib/pcmsoFontes.ts e normas/fontes-pcmso.json têm os mesmos ${Object.keys(snapshot).length} dispositivos`);
const divergentes = Object.keys(snapshot).filter((k) => !fontes[k] || fontes[k].texto !== snapshot[k].texto);
check(divergentes.length === 0, `o texto de cada dispositivo é idêntico ao da proveniência (divergem: ${divergentes.join(', ') || 'nenhum'})`);
const semUrl = Object.entries(fontes).filter(([k, f]) => !String(f.url).startsWith('http') && k !== 'portaria-765-2025-art1').map(([k]) => k);
check(semUrl.length === 0, `todo dispositivo tem a URL da fonte oficial (sem: ${semUrl.join(', ') || 'nenhum'})`);
const naoVigentes = Object.entries(fontes).filter(([, f]) => /SUSPENS|REVOGAD/i.test(f.status)).map(([k]) => k);
check(naoVigentes.length === 0, `nenhum dispositivo suspenso ou revogado entre as fontes (achados: ${naoVigentes.join(', ') || 'nenhum'})`);
const modeloFonte = semComentarios(ler('lib/pcmsoModelo.ts'));
check(!/2\.382\/2024|1\.246\/2010|cfm-2323-art1[025]\b|cfm-1821-art10/.test(modeloFonte),
  'o modelo não cita a Res. 2.382 (suspensa), a Portaria 1.246 (revogada) nem os arts. suspensos da 2.323');
let lancou = false;
try { fontesMod.trecho('clt-168', 'TEXTO QUE NAO EXISTE'); } catch { lancou = true; }
check(lancou, 'trecho() lança erro quando o marcador não está na fonte');
check(!/['"`]Art\.\s*\d+[^'"`]{40,}['"`]/.test(modeloFonte.replace(/trecho\([^)]*\)/g, '')),
  'o modelo não redigita artigo de lei: cita por fonte() ou trecho()');

// ===========================================================================
// 2. REGRAS
// ===========================================================================
console.log('\n— regras (lib/pcmso.ts)');

const R = (o) => ({ status: 'ACTIVE', ...o });
check(P.periodicidadeMaximaDoClinico([R({ risk_category: 'FÍSICO', severity: 2, probability: 2 })]).meses === 12, 'risco identificado: clínico no máximo a cada 12 meses (7.5.8, II, "a")');
check(P.periodicidadeMaximaDoClinico([R({ risk_category: 'AUSÊNCIA_RISCO', risk_code_table_24: '09.01.001' })]).meses === 24, 'só registro de ausência: a cada 24 meses (7.5.8, II, "b")');
check(P.periodicidadeMaximaDoClinico([]).meses === 24, 'sem risco: a cada 24 meses');
const semCl = P.periodicidadeMaximaDoClinico([R({ risk_category: 'QUÍMICO' })]);
check(semCl.meses === 12 && semCl.semClassificacao === 1, 'risco sem classificação conta como exposição (lado seguro: 12 meses)');

const GH = [{ id: 'g1', client_id: 'c1', code: 'GHE-01' }, { id: 'g2', client_id: 'c1', code: 'GHE-02' }, { id: 'gx', client_id: 'cx', code: 'GHE-X' }];
const PROTS = [
  R({ id: 'a', client_id: 'c1', ghe_id: 'g1', exam_code_table_27: '0295' }),
  R({ id: 'b', client_id: 'cx', ghe_id: 'gx', exam_code_table_27: '0295' }),
  R({ id: 'c', exam_code_table_27: '0530' }),
  R({ id: 'd', client_id: 'c1', ghe_id: 'g1', exam_code_table_27: '0693', status: 'INACTIVE' }),
  R({ id: 'e', ghe_id: 'g2', exam_code_table_27: '0295' })
];
const doPcmso = P.protocolosDoPcmso(PROTS, GH, 'c1').map((p) => p.id).sort().join(',');
check(doPcmso === 'a,e', `só os protocolos do cliente e dos GHE dele, sem modelo, sem inativo, sem outro cliente (veio ${doPcmso})`);
check(P.protocolosModelo(PROTS).length === 1, 'o protocolo-modelo é contado à parte');

const CLI = { id: 'c1', document_number: '12.483.776/0001-99', risk_degree: 2 };
const baseCad = {
  cliente: CLI, ghes: [GH[0]],
  riscos: [R({ ghe_id: 'g1', risk_category: 'FÍSICO', agent_name: 'Calor', health_effects: 'Exaustão', severity: 2, probability: 2 })],
  protocolos: [R({ client_id: 'c1', ghe_id: 'g1', exam_code_table_27: '0295', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO', 'RETORNO_TRABALHO', 'MUDANCA_RISCO', 'DEMISSIONAL'], interpretation_criteria: 'Anamnese dirigida ao calor' })],
  colaboradores: [{ id: 'e1', client_id: 'c1', ghe_id: 'g1', status: 'ACTIVE' }]
};
const curtos = (e) => P.faltasDoCadastro(e).map((f) => `${f.secao}:${f.curto}`).join(' | ');
const p0Ref = () => baseCad.protocolos[0];
check(curtos(baseCad) === '', `cadastro completo: nenhuma falta (veio "${curtos(baseCad)}")`);
check(curtos({ ...baseCad, cliente: { ...CLI, document_number: '' } }).includes('1.1:CNPJ'), 'sem CNPJ ou CAEPF: falta (7.5.19.1, "a")');
check(curtos({ ...baseCad, cliente: { ...CLI, risk_degree: null } }).includes('1.1:grau de risco'), 'sem grau de risco: falta (7.5.11 e 7.6.6)');
check(curtos({ ...baseCad, pendenciaDoCoordenador: 'x' }).includes('1.2:médico responsável'), 'sem médico responsável: falta (7.4.1, "c")');
check(curtos({ ...baseCad, colaboradores: [{ id: 'e9', client_id: 'c1', status: 'ACTIVE' }] }).includes('1.3:'), 'empregado ativo sem GHE: falta');
check(curtos({ ...baseCad, riscos: [] }).includes('4.2:GHE-01 sem inventário'), 'GHE sem inventário: falta (7.5.1)');
check(curtos({ ...baseCad, riscos: [{ ...baseCad.riscos[0], health_effects: '' }] }).includes('agravos'), 'risco sem possível agravo: falta (7.5.4, "a")');
check(curtos({ ...baseCad, riscos: [{ ...baseCad.riscos[0], severity: null }] }).includes('classificação'), 'risco sem classificação: falta (7.5.1)');
check(!curtos({ ...baseCad, riscos: [R({ ghe_id: 'g1', risk_category: 'AUSÊNCIA_RISCO', risk_code_table_24: '09.01.001', agent_name: 'Ausência' })] }).includes('agravos'),
  'o registro de ausência de risco não pede agravo nem classificação');
check(curtos({ ...baseCad, protocolos: [] }).includes('5.3:exame clínico'), 'GHE sem exame clínico: falta (7.5.7)');
check(curtos({ ...baseCad, protocolos: [{ ...baseCad.protocolos[0], triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'] }] }).includes('ocasiões do exame clínico'),
  'exame clínico sem retorno e mudança de risco: falta (7.5.6)');
check(curtos({ ...baseCad, protocolos: [{ ...baseCad.protocolos[0], periodicity_months: 24 }] }).includes('5.2:periodicidade do clínico'),
  'clínico a cada 24 meses num GHE exposto: falta (7.5.8, II)');
check(curtos({ ...baseCad, protocolos: [{ ...baseCad.protocolos[0], interpretation_criteria: '' }] }).includes('6.1:critério do exame clínico'),
  'GHE exposto cujo exame clínico não tem critério: falta (7.5.4, "c")');
const longos = (e) => P.faltasDoCadastro(e).map((f) => f.longo).join(' | ');
check(/confirmação da dispensa/.test(longos({ ...baseCad, dispensaPossivel: true, protocolos: [{ ...baseCad.protocolos[0], periodicity_months: 24 }] }))
  && /excede o máximo de 12 meses/.test(longos({ ...baseCad, protocolos: [{ ...baseCad.protocolos[0], periodicity_months: 24 }] })),
  'clínico bienal: com dispensa possível a pendência pede a confirmação (7.7.1); sem ela, excede o máximo (7.5.8)');
const vedadoP = (codigo) => R({ client_id: 'c1', ghe_id: 'g1', exam_code_table_27: codigo, triggers: ['ADMISSIONAL'], interpretation_criteria: 'c', technical_justification: 'j' });
for (const [codigo, rotulo] of [['0732', 'HIV antígeno P24'], ['0733', 'anticorpos HIV'], ['1290', 'HIV pesquisa'], ['1381', 'Western blot anti-HIV'], ['0739', 'gonadotrofina coriônica']]) {
  check(curtos({ ...baseCad, protocolos: [p0Ref(), vedadoP(codigo)] }).includes('5.3:exame vedado'), `exame vedado na matriz (${codigo}, ${rotulo}): falta mesmo com justificativa`);
}
check(curtos({ ...baseCad, protocolos: [p0Ref(), { ...vedadoP('0568'), technical_justification: '' }] }).includes('justificativa técnica')
  && !curtos({ ...baseCad, protocolos: [p0Ref(), vedadoP('0568')] }).includes('justificativa'),
  'espermograma exige justificativa técnica mesmo marcado pela NR (Lei 9.029, art. 2º)');
const p0 = baseCad.protocolos[0];
check(curtos({ ...baseCad, protocolos: [p0, R({ client_id: 'c1', ghe_id: 'g1', exam_code_table_27: '8888', exam_name: 'X', triggers: ['ADMISSIONAL'], interpretation_criteria: 'c' })] }).includes('código da Tabela 27'),
  'código inexistente na Tabela 27: falta');
check(curtos({ ...baseCad, protocolos: [p0, R({ client_id: 'c1', ghe_id: 'g1', exam_code_table_27: '0693', triggers: ['PERIODICO'], interpretation_criteria: 'c' })] }).includes('5.3:periodicidade'),
  'exame periódico sem periodicidade: falta');
const criterio = R({ client_id: 'c1', ghe_id: 'g1', exam_code_table_27: '0693', triggers: ['ADMISSIONAL'], mandatory_by_standard: 'CRITERIO_MEDICO', interpretation_criteria: 'c' });
check(curtos({ ...baseCad, protocolos: [p0, criterio] }).includes('justificativa técnica'), 'exame a critério do médico sem justificativa: falta (7.5.18)');
check(!curtos({ ...baseCad, protocolos: [p0, { ...criterio, technical_justification: 'Benzeno no GHE' }] }).includes('justificativa'), 'com justificativa: sem falta');
check(curtos({ ...baseCad, protocolos: [p0, { ...criterio, technical_justification: 'j', interpretation_criteria: '' }] }).includes('6.1:critério de interpretação'),
  'exame complementar sem critério de interpretação: falta (7.5.4, "c")');
check(!curtos({ ...baseCad, protocolos: [p0, R({ client_id: 'c1', ghe_id: 'g1', exam_code_table_27: '0281', triggers: ['ADMISSIONAL'] })] }).includes('critério'),
  'audiometria usa o critério do Anexo II: sem falta de critério');

const ruido = (o = {}) => R({ ghe_id: 'g1', risk_category: 'FÍSICO', risk_code_table_24: '02.01.001', agent_name: 'Ruído', ...o });
const anexos = (rs) => P.anexosAcionados(rs).map((a) => a.anexo).join(',');
check(anexos([ruido()]) === 'II', 'ruído aciona o Anexo II');
check(anexos([ruido({ measured_value: '74', measurement_unit: 'dB(A)', action_level: '80 dB(A)' })]) === '', 'ruído medido abaixo do nível de ação (em dB) não aciona');
check(anexos([ruido({ measured_value: '0,4', measurement_unit: 'dose', action_level: 'dose 0,5' })]) === 'II', 'medição em dose não prova nada: o Anexo II se aplica');
check(anexos([R({ risk_code_table_24: '01.18.001', agent_name: 'Sílica' })]) === 'III', 'sílica aciona o Anexo III');
check(anexos([R({ risk_code_table_24: '01.02.001', agent_name: 'Asbesto', health_effects: 'Asbestose' })]) === 'III', 'asbesto aciona o Anexo III');
check(anexos([R({ risk_code_table_24: '02.01.015', agent_name: 'Trabalho em tubulão de ar comprimido' })]) === 'IV', 'ar comprimido aciona o Anexo IV');
check(anexos([R({ risk_code_table_24: '02.01.006', agent_name: 'Radiações ionizantes' })]) === 'V', 'radiação ionizante aciona o Anexo V');
check(anexos([R({ agent_name: 'Formaldeído', health_effects: 'Câncer de nasofaringe' })]) === 'V', 'agente indicado como cancerígeno no PGR aciona o Anexo V');
check(anexos([R({ risk_category: 'ERGONÔMICO', agent_name: 'Postura' })]) === '', 'risco ergonômico não aciona Anexo');
const fAn = (rs, ps) => P.faltasDosAnexos({ cliente: CLI, ghes: [GH[0]], riscos: rs, protocolos: ps }).map((f) => f.curto).join(' | ');
check(fAn([ruido()], [p0]).includes('audiometria'), 'Anexo II sem audiometria: falta');
const audio = (o = {}) => R({ client_id: 'c1', ghe_id: 'g1', exam_code_table_27: '0281', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'], ...o });
check(fAn([ruido()], [p0, audio()]) === '', 'com audiometria na admissão, anual e na demissão: sem falta');
check(fAn([ruido()], [p0, audio({ triggers: ['ADMISSIONAL', 'PERIODICO'] })]).includes('na demissão'), 'audiometria sem a demissional: falta (Anexo II, 4.1)');
check(fAn([ruido()], [p0, audio({ periodicity_months: 24 })]).includes('anual'), 'audiometria bienal: falta (Anexo II, 4.1, "b")');
const silica = R({ ghe_id: 'g1', risk_code_table_24: '01.18.001', agent_name: 'Sílica' });
check(fAn([silica], [p0]).includes('RX') && fAn([silica], [p0]).includes('espirometria'), 'Anexo III sem RX OIT e espirometria: duas faltas');
check(fAn([R({ ghe_id: 'g1', risk_code_table_24: '02.01.015', agent_name: 'Tubulão de ar comprimido' })], [p0]).includes('6 meses'), 'Anexo IV com clínico de 12 meses: falta (aptidão de 6 meses)');
const exame = (codigo, meses, o = {}) => R({ client_id: 'c1', ghe_id: 'g1', exam_code_table_27: codigo, periodicity_months: meses, triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'], ...o });
check(fAn([silica], [p0, exame('1078', 24), exame('1057', 36)]).includes('espirometria a cada dois anos'), 'espirometria a cada 36 meses: falta (Anexo III, 3.1)');
check(!fAn([silica], [p0, exame('1078', 24), exame('1057', 24)]).includes('espirometria'), 'espirometria bienal na sílica: sem falta');
const asbesto = R({ ghe_id: 'g1', risk_code_table_24: '01.02.001', agent_name: 'Asbesto' });
check(fAn([asbesto], [p0, exame('1078', 24), exame('1057', 24)]).includes('asbesto'), 'asbesto com RX e espirometria bienais: falta (NR-15, Anexo 12, item 18)');
check(!fAn([asbesto], [p0, exame('1078', 12), exame('1057', 12)]).includes('asbesto'), 'asbesto com RX e espirometria anuais: sem falta');
const tolueno = R({ ghe_id: 'g1', risk_category: 'QUÍMICO', agent_name: 'Tolueno' });
check(fAn([tolueno], [p0]).includes('Anexo I'), 'agente com nome de substância do Anexo I, sem decisão do médico: falta');
check(!fAn([tolueno], [p0, exame('0693', 12, { technical_justification: 'Anexo I: tolueno confirmado pelo CAS; indicador previsto' })]).includes('Anexo I'),
  'decisão registrada citando o "Anexo I": sem falta');
check(fAn([tolueno], [p0, exame('0281', 12, { technical_justification: 'Anexo II do ruído' })]).includes('Anexo I'), 'citar o "Anexo II" não resolve o Anexo I');
const fAnV = (colabs) => P.faltasDosAnexos({ cliente: CLI, ghes: [GH[0]], riscos: [R({ ghe_id: 'g1', risk_code_table_24: '02.01.006', agent_name: 'Radiações ionizantes' })], protocolos: [p0], colaboradores: colabs }).map((f) => f.curto).join(' | ');
check(fAnV([]).includes('funções expostas') && !fAnV([{ id: 'x', ghe_id: 'g1', job_title: 'Técnico em radiologia', status: 'ACTIVE' }]).includes('funções expostas'),
  'Anexo V sem função cadastrada no GHE: falta (Anexo V, 3.1)');

check(P.prazoDeDispensaDoDemissional(2) === 135 && P.prazoDeDispensaDoDemissional(3) === 90 && P.prazoDeDispensaDoDemissional(null) === null,
  'dispensa do demissional: 135 dias (graus 1 e 2), 90 dias (graus 3 e 4), indefinida sem grau (7.5.11)');
check(P.relatorioPodeSerSimplificado(2, 25) && !P.relatorioPodeSerSimplificado(2, 26) && P.relatorioPodeSerSimplificado(4, 10) && !P.relatorioPodeSerSimplificado(4, 11) && !P.relatorioPodeSerSimplificado(null, 1),
  'relatório simplificado: graus 1 e 2 até 25, graus 3 e 4 até 10, nunca sem grau (7.6.6)');

const colab = (id, onde, asos) => ({ id, client_id: 'c1', ghe_id: 'g1', job_title: onde, status: 'ACTIVE', aso_history: asos });
const aso = (data, exames) => ({ aso_type: 'PERIODICO', exam_date: data, exams: exames });
const rel = P.relatorioAnalitico({
  colaboradores: [
    colab('a', 'Soldador', [aso('2026-05-01', [{ exam_code_table_27: '0295' }, { exam_code_table_27: '0281', result: 'ALTERADO' }])]),
    colab('b', 'Soldador', [aso('2026-05-02', [{ exam_code_table_27: '0281', result: 'NORMAL' }]), aso('2020-01-01', [{ exam_code_table_27: '0281' }])]),
    colab('c', 'Soldador', [aso('2026-05-03', [{ exam_code_table_27: 'XXXX' }])]),
    colab('d', 'Vigia', [aso('2026-05-04', [{ exam_code_table_27: '0281', result: 'AGRAVAMENTO' }])])
  ],
  cats: [{ employee_id: 'd', accident_type: 'DOENCA_OCUPACIONAL', accident_date: '2026-06-01' }, { employee_id: 'zz', accident_type: 'TIPICO', accident_date: '2026-06-01' }],
  periodo: { inicio: '2025-10-02', fim: '2026-10-02' },
  ondeDe: (c) => c.job_title,
  nomeDoExame: (c) => c
});
check(rel.examesClinicos === 4, `exames clínicos = ASO do período (4), sem o de 2020 (veio ${rel.examesClinicos})`);
check(rel.complementares.find((x) => x.codigo === '0281')?.quantidade === 3, 'complementares por tipo, sem contar a avaliação clínica 0295');
check(!rel.complementares.some((x) => x.codigo === '0295'), 'a avaliação clínica (0295) nunca entra entre os exames complementares');
check(rel.semCodigoValido === 1, 'exame sem código válido fica fora da contagem por tipo, e é contado à parte');
check(!('examesClinicosPorOcasiao' in rel), 'a alínea "a" não se divide por ocasião ("demissional: 1" aponta quem saiu)');
check(!rel.anormais.some((a) => a.onde === 'Soldador') && !rel.anormais.some((a) => a.onde === P.GRUPOS_PEQUENOS) && rel.suprimidas >= 1,
  'conta quem foi EXAMINADO: 3 soldadores no quadro, 2 com audiometria → somados aos pequenos; 2 anormais em 3 → linha omitida');
check(!rel.anormais.some((a) => a.onde === 'Vigia'), 'função com menos de 3 examinados não aparece como categoria');
check(rel.doencasNovas.length === 0 && rel.suprimidas >= 1, 'CAT de doença num grupo pequeno que somado fica abaixo de 3: omitida');
const relDe = (resultados) => P.relatorioAnalitico({
  colaboradores: resultados.map((r, i) => colab(`s${i}`, 'Soldador', [aso('2026-05-01', [{ exam_code_table_27: '0281', result: r }])])),
  cats: [], periodo: { inicio: '2025-10-02', fim: '2026-10-02' }, ondeDe: (c) => c.job_title, nomeDoExame: (c) => c
});
const r3 = relDe(['ESTAVEL', 'NORMAL', 'NORMAL']);
check(r3.anormais.length === 1 && r3.anormais[0].anormais === 1 && r3.anormais[0].total === 3, 'resultado ESTÁVEL conta como anormal');
const rTodos = relDe(['ALTERADO', 'ALTERADO', 'AGRAVAMENTO']);
check(rTodos.anormais.length === 0 && rTodos.suprimidas === 1, 'linha em que todos os examinados são anormais é omitida (revelaria cada resultado)');
check(relDe(['ALTERADO', 'ESTAVEL', 'NORMAL']).anormais.length === 0, 'linha com um só resultado normal é omitida (o normal saberia o resultado dos outros)');
const rUm = P.relatorioAnalitico({
  colaboradores: [colab('v', 'Vigia', [aso('2026-05-01', [{ exam_code_table_27: '0281', result: 'ALTERADO' }])])],
  cats: [], periodo: { inicio: '2025-10-02', fim: '2026-10-02' }, ondeDe: (c) => c.job_title, nomeDoExame: (c) => c
});
check(rUm.anormais.length === 0 && rUm.suprimidas === 1, 'grupo pequeno que somado fica abaixo de 3 examinados: omitido');
check(rel.catsPorTipo.length === 1, 'CAT de quem não é do cliente fica de fora');

const at = P.atividadesCriticasDoCliente([
  R({ client_id: 'c1', catalog_key: 'nr35-altura', ghe_ids: ['g1'] }),
  R({ client_id: 'c1', catalog_key: 'nr33-autorizados', job_ids: ['j1'] }),
  R({ client_id: 'c1', norm: 'NR-10' }),
  R({ client_id: 'cx', catalog_key: 'nr11-operador', ghe_ids: ['gx'] })
], 'c1', GH, [{ id: 'j1', name: 'Vigia' }]);
check(at.map((a) => a.chave).join(',') === 'NR-35,NR-33,NR-10', 'atividades críticas pela matriz de treinamentos, só do cliente');
check(at.find((a) => a.chave === 'NR-33').alcance === 'Vigia', 'o alcance vem dos GHE e cargos do treinamento');
check(at.find((a) => a.chave === 'NR-35').aptidaoNoAso && !at.find((a) => a.chave === 'NR-10').aptidaoNoAso,
  'NR-35 manda consignar a aptidão no ASO; NR-10 não (registro no prontuário)');
const fAt = P.faltasDasAtividadesCriticas(at, [R({ client_id: 'c1', ghe_id: 'g1', exam_code_table_27: '0295' })], GH, 'c1').map((f) => f.curto).join(' | ');
check(fAt.includes('alcance de intervenção'), 'atividade crítica sem alcance: falta');
check(fAt.includes('critério da aptidão (NR-35'), 'GHE em altura cujo clínico não tem critério de aptidão: falta');
check(!P.faltasDasAtividadesCriticas(at.slice(0, 1), [R({ client_id: 'c1', ghe_id: 'g1', exam_code_table_27: '0295', interpretation_criteria: 'Mal súbito, fatores psicossociais' })], GH, 'c1').length,
  'com critério de aptidão: sem falta');
check(P.faltasDasAtividadesCriticas(at.slice(0, 1), [], GH, 'c1').some((f) => f.curto.startsWith('critério da aptidão')),
  'atividade em altura sem protocolo clínico nenhum: a falta do critério continua');
const atInv = P.atividadesCriticasDoCliente([], 'c1', GH, [], [
  R({ ghe_id: 'g1', agent_name: 'Queda em trabalho em altura' }),
  R({ ghe_id: 'g2', risk_code_table_24: '02.01.006', agent_name: 'Radiações ionizantes' }),
  R({ ghe_id: 'gx', agent_name: 'Trabalho em altura de outro cliente' })
]);
check(atInv.map((a) => a.chave).join(',') === 'NR-35,ANEXO-V' && atInv[0].alcance === 'GHE-01' && atInv[1].aptidaoNoAso,
  'atividades críticas também pelo inventário (altura → NR-35; radiação → aptidão do Anexo V, 5.1.1), só do cliente');

check(P.exigenciasSetoriais('86.50-0-04')[0]?.nr === 'NR-32' && P.exigenciasSetoriais('1011-2/01')[0]?.nr === 'NR-36'
  && P.exigenciasSetoriais('38.11-4-00')[0]?.nr === 'NR-38' && P.exigenciasSetoriais('47.61-0-03').length === 0,
  'exigências setoriais pelo CNAE: NR-32 (86), NR-36 (101x), NR-38 (38), nenhuma no comércio');
check(P.exigenciasSetoriais('1011-2/01')[0].relatorioCompleto === true, 'NR-36: o relatório analítico não pode ser o simplificado (36.12.7)');
const nr32Rx = P.exigenciasSetoriais('86.10-1-01', [R({ risk_code_table_24: '02.01.006', agent_name: 'Raios X' })])[0];
const com = (lista, id) => lista.some((i) => i.includes(fontesMod.fonte(id).texto));
check(com(nr32Rx.itens, 'nr32-32.4.8') && !com(P.exigenciasSetoriais('86.10-1-01')[0].itens, 'nr32-32.4.8'),
  'NR-32 com radiação no inventário: entram 32.4.4 e 32.4.8; sem radiação, não');
check(nr32Rx.itens.some((i) => i.startsWith(fontesMod.fonte('nr32-32.4.2.1-caput').texto) && i.includes(fontesMod.fonte('nr32-32.4.4').texto))
  && nr32Rx.itens.some((i) => i.startsWith(fontesMod.fonte('nr32-32.4.6-caput').texto)),
  'NR-32: as alíneas "d" (32.4.2.1) e "f" (32.4.6) saem com o caput, que diz quem deve');
check(P.exigenciasSetoriais('86.10-1-01')[0].aRedigir.length === 4 && P.exigenciasSetoriais('86.10-1-01')[0].atestar.length === 0,
  'NR-32: o conteúdo que o documento não redige vira "a redigir" (pendência), nunca "a atestar"');
check(P.exigenciasSetoriais('86.10-1-01', [R({ risk_category: 'QUÍMICO', agent_name: 'Glutaraldeído' })])[0].itens.some((i) => i.startsWith('32.3.5.1')),
  'NR-32 com produto químico: o 32.3.5.1 (fichas descritivas) entra');
check(nr32Rx.organizacao.length === 1 && /32\.4\.6, "f"/.test(nr32Rx.organizacao[0]), 'NR-32, 32.4.6 "f": obrigação do empregador, declarada pela organização');

const disp = (cli, cat) => P.dispensaDoPcmso(cli, { grupos: [{ identificados: cat ? [{ risk_category: cat }] : [] }] }).possivel;
check(disp({ porte: 'ME', risk_degree: 1 }, 'ACIDENTES') === true, 'ME de grau 1 só com risco de acidente: dispensa possível (NR-01, 1.8.6)');
check(disp({ porte: 'ME', risk_degree: 1 }, 'FÍSICO') === false && disp({ porte: 'ME', risk_degree: 1 }, 'ERGONÔMICO') === false,
  'com agente físico ou fator ergonômico: sem dispensa');
check(disp({ porte: 'DEMAIS', risk_degree: 1 }) === false && disp({ porte: 'ME', risk_degree: 3 }) === false, 'porte maior ou grau 3: sem dispensa');
const tDisp = P.dispensaDoPcmso({ porte: 'EPP', risk_degree: 2 }, { grupos: [] }).texto;
check(tDisp.includes('1.8.6.1') && tDisp.includes('não confere'), 'a dispensa sai condicionada à declaração que o sistema não confere, e lembra que os exames continuam');
check(!/vale como PCMSO/.test(tDisp), 'a dispensa não diz que o documento "vale como PCMSO"');
const mResp = (o) => P.montarPcmso({ cliente: CLI, ghes: [GH[0]], riscos: baseCad.riscos, protocolos: baseCad.protocolos, colaboradores: baseCad.colaboradores, ...o })
  .faltas.map((f) => `${f.secao}:${f.curto}`).join(' | ');
check(mResp({ coordenadorSemRqe: true }).includes('1.2:RQE') && !mResp({}).includes('RQE'), 'coordenador sem RQE: falta (Res. CFM 2.376/2024, art. 2º; 7.5.2)');
check(mResp({ semResponsavelPeloPgr: true }).includes('4.1:responsável pelo PGR'), 'sem responsável pelo PGR: falta na seção do inventário (7.5.1)');
const mSet = P.montarPcmso({ cliente: { ...CLI, main_cnae: '86.10-1-01' }, ghes: [GH[0]], riscos: baseCad.riscos, protocolos: baseCad.protocolos, colaboradores: baseCad.colaboradores });
check(mSet.setoriais[0]?.nr === 'NR-32' && mSet.faltas.filter((f) => f.secao === '5.8').length === 4,
  'serviço de saúde: cada conteúdo da NR-32 que o documento não redige é uma pendência (seção 5.8)');
check(curtos({ ...baseCad, riscos: [R({ ghe_id: 'g1', risk_category: 'AUSÊNCIA_RISCO', risk_code_table_24: '09.01.001', agent_name: 'Ausência' })], protocolos: [{ ...baseCad.protocolos[0], interpretation_criteria: '' }] }).includes('6.1:critério do exame clínico'),
  'GHE sem risco também precisa de critério para o exame clínico (7.5.4, "c")');
check(curtos({ ...baseCad, protocolos: [p0Ref(), { ...vedadoP('0789'), technical_justification: '' }] }).includes('justificativa técnica'),
  'hormônio da gestação (0789) exige justificativa técnica (Lei 9.029, art. 2º)');
check(/7\.7\.1\.1/.test(P.faltasDoCadastro({ ...baseCad, pendenciaDoCoordenador: 'x', dispensaPossivel: true }).map((f) => f.longo).join(' ')),
  'dispensa possível: a falta de médico responsável diz que, confirmada a dispensa, vale o 7.7.1.1');

const a1 = (n) => P.agentesDoAnexoI([{ agent_name: n }]).map((x) => x.substancia).join(' | ');
check(a1('Tolueno') === 'Tolueno', 'Anexo I: "Tolueno" casa só com tolueno');
check(a1('Etilbenzeno') === 'Etilbenzeno', 'Anexo I: "Etilbenzeno" não vira "Benzeno" (palavra inteira)');
check(!a1('Ciclohexanona').includes('n-hexano'), 'Anexo I: "Ciclohexanona" não vira "n-hexano"');
check(!a1('Tolueno diisocianato (TDI)').includes('Tolueno |') && a1('Tolueno diisocianato (TDI)').includes('diisocianato'), 'Anexo I: TDI casa com os diisocianatos, não com o tolueno');
check(P.criterioDoExame({ exam_code_table_27: '0281' }).includes('Anexo II') && P.criterioDoExame({ exam_code_table_27: '0693' }).startsWith('PENDENTE'),
  'critério do exame: o do Anexo, ou PENDENTE');

// S-2220 (lib/esocialDados.ts): o que esta auditoria mudou.
{
  const x = esocial.xmlDosExamesDoS2220([
    { code: '9999', name: 'Teste A', date: '2026-03-01' }, { code: '9999', name: 'Teste B', date: '2026-03-01' }, { code: '0295', name: 'Clínico', date: '2026-03-01' }
  ]);
  check((x.match(/<procRealizado>9999<\/procRealizado>/g) || []).length === 1 && /<obsProc>Teste A; Teste B<\/obsProc>/.test(x),
    'S-2220: o código 9999 vai uma vez só, com todas as descrições (MOS, item 1.10)');
  const colab9 = { id: 'k', name: 'K', client_id: 'c1', aso_history: [] };
  const m = esocial.montarAsoDoEvento(colab9, { id: 'a', aso_type: 'PERIODICO', exam_date: '2026-03-02', result: '', physician_name: 'X', physician_crm: '1', physician_uf: 'BA',
    exams: [{ exam_code_table_27: '0733', exam_name: 'HIV', exam_date: '2026-03-01' }, { exam_code_table_27: '0295', exam_name: 'Clínico', exam_date: '2026-03-01' }] });
  check(!m.dados.exams_list.some((e) => e.code === '0733') && m.pendencias.some((p) => /HIV|não pode integrar/.test(p.motivo)),
    'S-2220: exame vedado não vai ao governo, e o evento aponta a pendência');
  check(m.dados.result === '' && m.pendencias.some((p) => /sem conclusão/.test(p.motivo)), 'S-2220: ASO sem conclusão não vira "apto"');
}

// ===========================================================================
// 3. O DOCUMENTO
// ===========================================================================
console.log('\n— o documento gerado');

const ORG = { id: 'o1', name: 'PrevSafe Engenharia', document_number: '11.222.333/0001-44', pcmso_physician_name: 'Dr. Global da Consultoria' };
const CLIENTE = { id: 'c1', legal_name: 'Metalurgica Exemplo Ltda', trade_name: 'Metal Exemplo', document_number: '12.483.776/0001-99', main_cnae: '25.11-0-00', risk_degree: 3, porte: 'DEMAIS', address: 'Rua B, 20', city: 'Salvador', state: 'BA' };
const GHES = [
  { id: 'g1', code: 'GHE-01', name: 'Solda', client_id: 'c1' },
  { id: 'g2', code: 'GHE-02', name: 'Escritório', client_id: 'c1' },
  { id: 'gx', code: 'GHE-X', name: 'Outro cliente', client_id: 'cx' }
];
const RISCOS = [
  R({ ghe_id: 'g1', client_id: 'c1', risk_category: 'FÍSICO', risk_code_table_24: '02.01.001', agent_name: 'Ruído contínuo', health_effects: 'PAIR', severity: 3, probability: 3 }),
  R({ ghe_id: 'g1', client_id: 'c1', risk_category: 'QUÍMICO', agent_name: 'Fumos de solda com cromo hexavalente', health_effects: 'Câncer de pulmão', severity: 4, probability: 3 }),
  R({ ghe_id: 'g2', client_id: 'c1', risk_category: 'AUSÊNCIA_RISCO', risk_code_table_24: '09.01.001', agent_name: 'Ausência de agente nocivo' })
];
const PROTOCOLOS = [
  R({ id: 'p1', client_id: 'c1', ghe_id: 'g1', exam_code_table_27: '0295', exam_name: 'Avaliação clínica ocupacional', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO', 'RETORNO_TRABALHO', 'MUDANCA_RISCO', 'DEMISSIONAL'], mandatory_by_standard: 'NR-07' }),
  R({ id: 'p2', client_id: 'c1', ghe_id: 'g2', exam_code_table_27: '0295', exam_name: 'Avaliação clínica ocupacional', periodicity_months: 24, triggers: ['ADMISSIONAL', 'PERIODICO', 'RETORNO_TRABALHO', 'MUDANCA_RISCO', 'DEMISSIONAL'], mandatory_by_standard: 'NR-07' }),
  R({ id: 'px', client_id: 'cx', ghe_id: 'gx', exam_code_table_27: '0385', exam_name: 'Chumbo sanguíneo de OUTRO CLIENTE', periodicity_months: 6, triggers: ['PERIODICO'] }),
  R({ id: 'pm', exam_code_table_27: '0530', exam_name: 'ECG MODELO DO SISTEMA', periodicity_months: 12, triggers: ['PERIODICO'] })
];
const EMPREGADOS = Array.from({ length: 12 }, (_, i) => ({
  id: `e${i}`, client_id: 'c1', ghe_id: i < 10 ? 'g1' : 'g2', name: `Trabalhador Numero ${i}`, cpf: '52998224725',
  job_title: i < 10 ? 'Soldador' : 'Assistente', status: 'ACTIVE',
  aso_history: [{ aso_type: 'PERIODICO', exam_date: '2026-04-1' + (i % 9), result: 'APTO', exams: [{ exam_code_table_27: '0295' }, ...(i < 10 ? [{ exam_code_table_27: '0281', result: i === 0 ? 'ALTERADO' : 'NORMAL' }] : [])] }]
}));
const args = {
  client: CLIENTE, organization: ORG, examProtocols: PROTOCOLOS, ghes: GHES, risks: RISCOS,
  employees: EMPREGADOS, units: [], catRecords: [], trainingRequirements: []
};
const pdf = gerar(args);
for (const s of ['1. IDENTIFICAÇÃO', '2. OBJETIVO', '2.4 Base legal', '2.5 Vedações', '3. RESPONSABILIDADES', '4. INTEGRAÇÃO COM O PGR', '5. PLANEJAMENTO DOS EXAMES',
  '5.4 Exames exigidos pelos Anexos', '5.5 Atividades críticas', '6. CRITÉRIOS DE INTERPRETAÇÃO', '7. ATESTADO DE SAÚDE OCUPACIONAL', '8. PRONTUÁRIO, SIGILO',
  '9. RELATÓRIO ANALÍTICO', '10. ESOCIAL', '11. CHECKLIST', '12. ENCERRAMENTO']) {
  check(pdf.includes(s), `o PCMSO tem a seção "${s}"`);
}
check(!/VIGÊNCIA:|Vigência do Programa|6\.734\/2020 e Diretrizes|Portaria MTP n[ºo°] 6\.734/i.test(pdf), 'nada de "VIGÊNCIA ano/ano" nem de "Portaria MTP nº 6.734" (a portaria é SEPRT)');
check(tem(pdf, 'A NR-07 não fixa prazo de validade para o PCMSO'), 'o documento diz que a NR-07 não fixa validade, em vez de inventar uma');
check(!pdf.includes('OUTRO CLIENTE') && !pdf.includes('GHE-X'), 'o protocolo e o GHE de outro cliente não aparecem');
check(!pdf.includes('ECG MODELO DO SISTEMA') && pdf.includes('protocolo(s)-modelo do sistema não integram'), 'o protocolo-modelo não entra no programa, e o documento diz isso');
check(!pdf.includes('52998224725') && !pdf.includes('529.982.247-25'), 'nenhum CPF no documento');
check(!pdf.includes('Trabalhador Numero'), 'nenhum nome de empregado fora de serviço de saúde');
check(!pdf.includes('Dr. Global da Consultoria'), 'o médico geral da consultoria não aparece como responsável do cliente');
check(pdf.includes('médico responsável pelo PCMSO indicado pelo empregador'), 'sem médico atribuído ao cliente: pendência impressa (7.4.1, "c")');
check(tem(pdf, 'no máximo a cada 12 meses') && tem(pdf, 'no máximo a cada 24 meses'), 'periodicidade máxima por GHE: 12 (exposto) e 24 (sem risco)');
check(tem(pdf, 'Nesta organização (grau de risco 3), o exame clínico demissional pode ser dispensado se o exame clínico ocupacional mais recente tiver sido realizado há menos de 90 dias'),
  'dispensa do demissional calculada pelo grau (3 → 90 dias)');
check(pdf.includes('Ausência de risco registrada no PGR'), 'o registro de ausência de risco sai como tal, sem pendência');
check(tem(pdf, 'Anexo II — Controle médico da exposição a níveis de pressão sonora elevados') || tem(pdf, 'Anexo II - Controle médico'), 'o ruído aciona o Anexo II no quadro 5.4');
check(tem(pdf, fontesMod.fonte('nr07-anexoV-4.1').texto), 'exposição a cancerígeno: prontuário por 40 anos, texto literal do Anexo V');
check(!tem(pdf, fontesMod.fonte('nr07-anexoV-5.4').texto), 'sem radiação ionizante, a guarda de 75/30 anos não aparece');
for (const [rotulo, texto] of [['HIV (Portaria 671, art. 199, § 1º)', fontesMod.trecho('p671-art199', '§ 1º', 'quanto ao HIV.')], ['ASO em branco (2.323, art. 6º, II)', fontesMod.fonte('cfm-2323-art6-II').texto], ['resultados no ASO (2.323, art. 6º, V)', fontesMod.fonte('cfm-2323-art6-V').texto],
  ['gravidez (CLT, art. 373-A, IV)', fontesMod.fonte('clt-373A-IV').texto], ['telemedicina (2.323, art. 6º, I)', fontesMod.fonte('cfm-2323-art6-I').texto]]) {
  check(tem(pdf, texto), `vedação: ${rotulo}`);
}
check(tem(pdf, fontesMod.fonte('cfm-2376-art3').texto), 'registro no CRM como responsável por cada PCMSO (Res. 2.376/2024, art. 3º)');
check(tem(pdf, 'terá um médico do trabalho como seu responsável'), 'advertência: 7.5.2 da NR-07 x art. 2º da Res. 2.376/2024');
check(tem(pdf, nr07.NR07_ITENS['7.3.2.2']), 'o PCMSO não tem caráter de seleção de pessoal (7.3.2.2)');
check(tem(pdf, 'nos exames médicos por ocasião da admissão, mudança de função, avaliação periódica'), 'a vedação do teste de HIV é a do texto vigente');
check(pdf.includes('a) Exames clínicos realizados 12'), 'relatório analítico: 12 exames clínicos no período');
check(pdf.includes('c) Resultados anormais'), 'organização acima do 7.6.6: o relatório traz as alíneas "c" a "f"');
check(tem(pdf, 'Soldador: 1 resultado(s) anormal(is) em 10 exame(s)'), 'resultado anormal por função, com 10 examinados');
check(tem(pdf, 'Critério de sigilo deste programa') && tem(pdf, 'examinados no período'), 'o documento explica o critério de sigilo, por examinados');
check(tem(pdf, fontesMod.fonte('nr01-1.6.2').texto), 'assinatura digital: o texto literal do subitem 1.6.2 da NR-01');
check(!tem(pdf, 'devem ficar à disposição da inspeção do trabalho'), 'nada de regra da NR-01 parafraseada de memória');
check(tem(pdf, 'Apresentado e discutido com os responsáveis por SST e com a CIPA, quando existente (subitem 7.6.5)'), 'ciência da CIPA, quando existente, no relatório analítico (7.6.5)');
check(tem(pdf, 'Elaborado pelo médico responsável pelo PCMSO (subitem 7.6.2)'), 'o relatório analítico tem assinatura e data próprias');

// Sem medico atribuido: MINUTA.
check(pdf.includes('MINUTA DE PCMSO') && pdf.includes('MINUTA EMITIDA POR') && tem(pdf, 'este documento não vale como PCMSO'),
  'sem médico responsável: o documento sai como MINUTA, em toda página e na capa');
check(!tem(pdf, 'O médico responsável pelo PCMSO declara'), 'minuta: sem termo de responsabilidade em nome de médico que não existe');
check(!pdf.includes('ELABORADO POR'), 'a consultoria emite; não se diz "elaborado por" ela');
check(tem(pdf, 'as pendências da seção 11.1 forem resolvidas'), 'minuta: só vale como PCMSO depois de resolvidas as pendências e assinada');
check(tem(pdf, modelo.PCMSO_NOTA_HIV_POS_EXPOSICAO), 'a ressalva do art. 6º da Res. 2.437 não vira autorização para testar sem a decisão do trabalhador');
check(!pdf.includes('linha(s) omitida(s)') && tem(pdf, 'Linhas que o critério de sigilo acima omite não são contadas nem indicadas'),
  'o relatório não conta as linhas omitidas (a contagem revelaria anormal em grupo pequeno)');
check(!tem(pdf, '7.6.1.2 e 7.6.1.3'), 'a troca de médico remete ao 7.6.1.2, e não ao 7.6.1.3 (prontuário eletrônico)');
check(tem(pdf, 'Declaração da organização') && tem(pdf, 'garantir que este PCMSO seja conhecido e atendido por todos os médicos')
  && !tem(pdf, 'Todos os médicos que examinam os empregados conhecem e atendem este PCMSO'),
  'o 7.5.4 "d" e a guarda dos prontuários são declarados pela organização, não atestados pelo médico');
check(!pdf.includes('Conteúdo exigido por NR setorial'), 'sem NR setorial, o checklist não aponta para uma seção 5.8 que não existe');

// Vedacoes: tres colunas e caput.
check(tem(pdf, 'Vedação Texto da norma Fonte') && tem(pdf, 'Lei nº 14.289/2022, art. 2º, III'), 'a tabela de vedações tem a coluna da fonte');
check(!modelo.PCMSO_VEDACOES.some((l) => l[2].includes('7.5.18')), 'o 7.5.18 (permissão com condição) não está entre as vedações');
check(tem(pdf, `É vedado ao médico: ${fontesMod.fonte('cem-art76').texto}`), 'CEM, art. 76, impresso com "É vedado ao médico:"');
{
  // Toda vedacao do CEM e do art. 6o da 2.323 impressa pelo modelo vem depois
  // do seu caput, no mesmo texto: sem ele, "Revelar fato..." vira ordem.
  const textos = [];
  const juntar = (v) => {
    if (typeof v === 'string') textos.push(v);
    else if (Array.isArray(v)) v.forEach(juntar);
    else if (v && typeof v === 'object') Object.values(v).forEach(juntar);
  };
  Object.values(modelo).forEach(juntar);
  const CEM = ['cem-art12', 'cem-art31', 'cem-art73', 'cem-art76', 'cem-art80', 'cem-art85', 'cem-art88', 'cem-art89'];
  const ART6 = ['cfm-2323-art6-II', 'cfm-2323-art6-III', 'cfm-2323-art6-IV', 'cfm-2323-art6-V'];
  const soltas = [];
  for (const t of textos) {
    for (const id of [...CEM, ...ART6, 'clt-373A-IV']) {
      const inicio = fontesMod.fonte(id).texto.slice(0, 40);
      const i = t.indexOf(inicio);
      if (i < 0) continue;
      const antes = t.slice(0, i);
      const caput = CEM.includes(id) ? 'É vedado ao médico:'
        : id === 'clt-373A-IV' ? fontesMod.fonte('clt-373A-caput').texto
        : 'É vedado ao médico que presta assistência ao trabalhador:';
      if (!antes.includes(caput)) soltas.push(id);
    }
  }
  check(soltas.length === 0, `toda vedação do CEM, da 2.323 (art. 6º) e da CLT (art. 373-A) sai com o caput (soltas: ${soltas.join(', ') || 'nenhuma'})`);
}

// Checklist em tres estados.
check(!pdf.includes('Atendido no cadastro') && pdf.includes('A atestar pelo médico') && tem(pdf, modelo.PCMSO_CHECKLIST_LEGENDA),
  'checklist: pendente, cadastro conferido ou a atestar pelo médico — nunca "atendido"');
check(pdf.includes('11.2 Itens a atestar pelo médico responsável'), 'a lista do que o médico atesta ao assinar');

const linhasPend = (pdf.match(/Pendências deste PCMSO \((\d+)\)/) || [])[1];
const montadoRef = P.montarPcmso({ cliente: CLIENTE, ghes: GHES.filter((g) => g.client_id === 'c1'), riscos: RISCOS, protocolos: PROTOCOLOS, colaboradores: EMPREGADOS, treinamentos: [], cargos: [], pendenciaDoCoordenador: 'x', semResponsavelPeloPgr: true });
check(Number(linhasPend) === montadoRef.faltas.length, `as pendências do PDF são as de montarPcmso (${linhasPend} e ${montadoRef.faltas.length})`);
check(montadoRef.faltas.every((f) => tem(pdf, f.longo.replace(/\.+$/, '').slice(0, 70))), 'cada pendência sai impressa com o texto da regra');

// Com medico atribuido ao cliente.
const comMedico = gerar({
  ...args,
  technicalProfessionals: [{ id: 'm1', full_name: 'Dra. Ana Coordenadora', council: 'CRM', council_number: '12345', council_state: 'BA', cpf: '11144477735', status: 'ACTIVE', specialty: 'Medicina do Trabalho' }],
  technicalResponsibilities: [{ id: 'r1', client_id: 'c1', professional_id: 'm1', role: 'PCMSO_COORD', start_date: '2026-01-01', status: 'ACTIVE' }]
});
check(comMedico.includes('Dra. Ana Coordenadora') && !comMedico.includes('médico responsável pelo PCMSO indicado pelo empregador'),
  'com médico atribuído ao cliente: o nome sai e a pendência some');
check(!comMedico.includes('MINUTA') && comMedico.includes('EMITIDO POR') && tem(comMedico, 'O médico responsável pelo PCMSO declara'),
  'com médico atribuído: sem minuta, com termo');
{
  const emitido = (comMedico.match(/Emitido em (\d{2}\/\d{2}\/\d{4})/) || [])[1];
  check(Boolean(emitido) && !comMedico.includes(`Data: ${emitido}`), 'a data da assinatura não vem preenchida com a da emissão');
}
check(tem(comMedico, 'RQE de Medicina do Trabalho do médico responsável'), 'médico atribuído sem RQE: pendência (Res. CFM 2.376/2024, art. 2º)');

// Servico de saude: NR-32 e relacao nominal.
const clinica = gerar({
  ...args,
  client: { ...CLIENTE, main_cnae: '86.10-1-01', risk_degree: 3 },
  risks: [...RISCOS, R({ ghe_id: 'g1', client_id: 'c1', risk_category: 'BIOLÓGICO', agent_name: 'Material biológico', health_effects: 'Hepatite B', severity: 3, probability: 3 })]
});
check(clinica.includes('5.8 Exigências de NR setorial') && tem(clinica, fontesMod.fonte('nr32-32.2.3.1').texto.slice(0, 80)), 'serviço de saúde: a NR-32 entra, com o texto literal');
check(clinica.includes('Trabalhador Numero 0') && !clinica.includes('52998224725'), 'NR-32: a relação nominal traz o nome do exposto (32.2.3.1, "c"), e nunca o CPF');
check(tem(clinica, 'PENDENTE — setor não cadastrado') && tem(clinica, 'falta o setor (local) de 10 trabalhador(es)'), 'NR-32: sem setor, o local sai PENDENTE e entra nas pendências');
check(tem(clinica, 'não o exame ocupacional. O resultado fica no prontuário'), 'NR-32: a testagem para HIV pós-exposição fica fora do ASO, do S-2220 e do documento');
check(tem(clinica, 'conteúdo que a NR-32 manda constar do PCMSO e que este documento não redige') && !tem(clinica, 'no corpo deste PCMSO'),
  'NR-32: o conteúdo que falta é pendência, e não item "a atestar"');
check(tem(clinica, fontesMod.trecho('nr32-32.3.5.1', '32.3.5.1', 'subitem 32.3.4.1.1.')), 'NR-32 com químico no inventário: o 32.3.5.1 sai');

// Anexos III, V e I, asbesto e demissional.
const completo = gerar({
  ...args,
  risks: [...RISCOS,
    R({ ghe_id: 'g1', client_id: 'c1', risk_category: 'QUÍMICO', risk_code_table_24: '01.18.001', agent_name: 'Sílica livre cristalizada', health_effects: 'Silicose', severity: 4, probability: 3 }),
    R({ ghe_id: 'g1', client_id: 'c1', risk_category: 'QUÍMICO', risk_code_table_24: '01.02.001', agent_name: 'Asbesto', health_effects: 'Asbestose', severity: 5, probability: 2 }),
    R({ ghe_id: 'g1', client_id: 'c1', risk_category: 'FÍSICO', risk_code_table_24: '02.01.006', agent_name: 'Radiações ionizantes', health_effects: 'Efeitos estocásticos', severity: 4, probability: 2 }),
    R({ ghe_id: 'g1', client_id: 'c1', risk_category: 'QUÍMICO', agent_name: 'Tolueno', health_effects: 'Neurotoxicidade', severity: 3, probability: 2 })]
});
check(tem(completo, fontesMod.fonte('nr07-anexoIII-q1-titulo').texto) && tem(completo, 'Empresas sem avaliações quantitativas') && tem(completo, fontesMod.fonte('nr07-anexoIII-3.1').texto),
  'Anexo III: o Quadro 1 das radiografias e a espirometria bienal (3.1), literais');
check(tem(completo, fontesMod.fonte('nr15-anexo12-18').texto.slice(0, 120)), 'asbesto: exames anuais da NR-15, Anexo 12, item 18');
check(tem(completo, 'LSC* até 10% LEO**') && tem(completo, 'corresponde ao sinal "menor ou igual"'), 'Quadro 1: o sinal que a fonte não desenha sai como "até", com a nota');
check(tem(completo, fontesMod.fonte('nr07-anexoIII-2.15').texto) && tem(completo, fontesMod.fonte('nr07-anexoIII-2.17.2').texto),
  'Anexo III: guarda das radiografias (2.15) e comunicação da próxima avaliação ao exposto a asbesto (2.17.2)');
check(tem(completo, fontesMod.fonte('nr07-anexoV-5.1').texto) && tem(completo, fontesMod.fonte('nr07-anexoV-3.1.1').texto),
  'Anexo V: aptidão para áreas controladas (5.1) e orientação aos médicos examinadores (3.1.1)');
check(completo.includes('5.4.1 Atividades e funções') && tem(completo, 'Soldador') && tem(completo, fontesMod.fonte('nr07-anexoV-5.1.1').texto),
  'Anexo V: funções expostas registradas (3.1) e aptidão para radiação no ASO (5.1.1)');
check(tem(completo, 'Anexo I (confirmar pelo CAS)'), 'o agente do Anexo I é marcado no quadro de riscos (4.2)');
check(tem(completo, 'A dispensa do subitem 7.5.11 alcança o exame clínico') && tem(completo, fontesMod.fonte('nr07-anexoII-4.1.1').texto),
  'demissional: a dispensa é do clínico; audiometria e radiografia têm regra própria');

// NR-36: relatorio completo mesmo pequeno.
const frigorifico = gerar({ ...args, client: { ...CLIENTE, main_cnae: '10.11-2-01', risk_degree: 2 } });
check(frigorifico.includes('c) Resultados anormais') && tem(frigorifico, 'a forma simplificada do subitem 7.6.6 não se aplica'),
  'NR-36: grau 2 com 12 empregados ainda traz o relatório completo (36.12.7)');

// ME candidata a dispensa
const me = gerar({
  client: { id: 'c9', legal_name: 'Papelaria ME', document_number: '45.723.174/0001-10', main_cnae: '47.61-0-03', risk_degree: 1, porte: 'ME' },
  organization: ORG,
  ghes: [{ id: 'h1', code: 'GHE-01', name: 'Loja', client_id: 'c9' }],
  risks: [R({ ghe_id: 'h1', client_id: 'c9', risk_category: 'ACIDENTES', agent_name: 'Queda', health_effects: 'Contusão', severity: 2, probability: 2 })],
  examProtocols: [], employees: [{ id: 'k', client_id: 'c9', ghe_id: 'h1', status: 'ACTIVE', aso_history: [] }]
});
check(tem(me, fontesMod.fonte('nr01-1.8.6').texto) && tem(me, 'que este sistema não confere'), 'ME de grau 1 sem exposição: a dispensa do 1.8.6 sai condicionada');
check(me.includes('a) Exames clínicos realizados') && !me.includes('c) Resultados anormais'), 'organização pequena: relatório só com "a" e "b" (7.6.6)');
check(tem(me, nr07.NR07_ITENS['7.7.1']) && tem(me, nr07.NR07_ITENS['7.7.4']), 'ME candidata à dispensa: os subitens 7.7.1 a 7.7.4 saem no documento');
check(tem(me, 'precisa ser conciliada com ele antes de ser prestada'), 'ME com risco de acidente: o documento alerta que a informação do 7.7.2 precisa ser conciliada');
check(tem(me, '(a cada 24, se confirmada a dispensa: subitem 7.7.1)'), 'ME: a periodicidade da abrangência (1.3) diz que vale o 7.7.1 se a dispensa for confirmada');

// ===========================================================================
// 3.1 CONTEUDO DAS NR SETORIAIS REGISTRADO PELO MEDICO
// ===========================================================================
// O que a NR-32, a NR-36 e a NR-38 mandam constar do PCMSO e o sistema nao
// redige. O medico redige; o sistema registra e imprime, atribuido a ele e com
// a data. Sem registro completo, o item continua pendencia - e nada no lugar.
console.log('\n— conteúdo das NR setoriais registrado pelo médico');

// As chaves ja estao gravadas nos clientes (Client.pcmso_sectoral_content):
// renomear uma faz o conteudo registrado sumir do documento sem ninguem apagar.
const CHAVES_SETORIAIS = [
  'nr32-riscos-biologicos', 'nr32-vigilancia-medica', 'nr32-programa-de-vacinacao', 'nr32-exposicao-acidental',
  'nr36-instrumental-clinico-epidemiologico', 'nr36-conservacao-auditiva', 'nr36-relatorio-analitico',
  'nr38-imunizacao', 'nr38-perfurocortante'
];
// Citacoes conferidas no texto oficial: a chave e que muda de lugar, nao elas.
const CITACOES_SETORIAIS = [
  'NR-32, 32.2.3.1, "a" e "b": reconhecimento e avaliação dos riscos biológicos e localização das áreas de risco',
  'NR-32, 32.2.3.1, "d": vigilância médica dos trabalhadores potencialmente expostos',
  'NR-32, 32.2.3.1, "e", e 32.2.4.17.1: programa de vacinação (tétano, difteria, hepatite B e as estabelecidas no PCMSO)',
  'NR-32, 32.2.3.3, "a" a "g": procedimentos para a possibilidade de exposição acidental a agentes biológicos',
  'NR-36, 36.12.3: instrumental clínico-epidemiológico que oriente as medidas do PGR e das melhorias ergonômicas',
  'NR-36, 36.12.5: Programa de Conservação Auditiva para os expostos acima do nível de ação',
  'NR-36, 36.12.7: conteúdo que a NR-36 acrescenta ao relatório analítico',
  'NR-38, 38.4.1: programa de imunização ativa, principalmente contra tétano e hepatite B',
  'NR-38, 38.4.3: procedimento específico para acidente com perfurocortante, se houver esse risco no PGR'
];
const itensSetoriais = ['86.10-1-01', '10.11-2-01', '38.11-4-00'].flatMap((c) => P.exigenciasSetoriais(c).flatMap((e) => e.aRedigir));
check(JSON.stringify(itensSetoriais.map((i) => i.chave)) === JSON.stringify(CHAVES_SETORIAIS),
  `chave estável: cada item a redigir mantém a chave já gravada (veio ${itensSetoriais.map((i) => i.chave).join(', ')})`);
check(JSON.stringify(itensSetoriais.map((i) => i.texto)) === JSON.stringify(CITACOES_SETORIAIS),
  'as citações dos itens a redigir continuam as conferidas no texto oficial');

const itens32 = P.exigenciasSetoriais('86.10-1-01')[0].aRedigir;
// Com a chave renomeada o find falha; o caso da lista de chaves acusa, e o
// resto do verificador continua rodando.
const ITEM_VAC = itens32.find((i) => i.chave === 'nr32-programa-de-vacinacao') || { chave: 'nr32-programa-de-vacinacao', texto: CITACOES_SETORIAIS[2] };
const MEDICO = 'Dra. Ana Coordenadora (Medicina do Trabalho - CRM 12345/BA)';
const regTexto = (texto, o = {}) => ({
  forma: 'TEXTO', texto, autor_id: 'm1', autor: MEDICO, data: '2025-03-10',
  registrado_em: '2025-03-11T10:00:00.000Z', registrado_por: 'Usuário de teste', ...o
});
const REG = {
  'nr32-riscos-biologicos': regTexto('Marcador RB-01: reconhecimento escrito pelo médico.'),
  'nr32-vigilancia-medica': regTexto('Marcador VM-02: vigilância escrita pelo médico.'),
  'nr32-programa-de-vacinacao': { forma: 'ANEXO', anexo_titulo: 'Programa de imunização, marcador PV-03', anexo_local: 'Arquivo do SESMT, pasta 4', data: '2025-08-15', autor_id: 'm1', autor: MEDICO },
  'nr32-exposicao-acidental': regTexto('Marcador EA-04: procedimentos escritos pelo médico.')
};
const BIO = R({ ghe_id: 'g1', client_id: 'c1', risk_category: 'BIOLÓGICO', agent_name: 'Material biológico', health_effects: 'Hepatite B', severity: 3, probability: 3 });
// Com setor: a pendencia da relacao nominal (5.8.1) nao se mistura com a do conteudo.
const COM_SETOR = EMPREGADOS.map((e) => ({ ...e, sector_name: 'Enfermagem' }));
const CLINICA = { ...CLIENTE, main_cnae: '86.10-1-01' };
const clinicaCom = (registros) => gerar({ ...args, employees: COM_SETOR, risks: [...RISCOS, BIO], client: { ...CLINICA, pcmso_sectoral_content: registros } });
const montarClinica = (registros, o = {}) => P.montarPcmso({
  cliente: { ...CLINICA, pcmso_sectoral_content: registros }, ghes: GHES.filter((g) => g.client_id === 'c1'),
  riscos: [...RISCOS, BIO], protocolos: PROTOCOLOS, colaboradores: COM_SETOR, ...o
});
const faltas58 = (m) => m.faltas.filter((f) => f.secao === '5.8');
const NAO_REDIGE = 'e que este documento não redige:';
const pendenteNoPdf = (pdf, item) => tem(pdf, `${NAO_REDIGE} ${item.texto}`);
const situacaoNoChecklist = (pdf) =>
  (pdf.match(/Conteúdo exigido por NR setorial NR-32, NR-36, NR-38 5\.8 (Pendente|Cadastro conferido|A atestar pelo médico)/) || [])[1] || 'linha não encontrada';

// Tudo registrado.
const pdfTudo = clinicaCom(REG);
check(tem(pdfTudo, 'Marcador RB-01: reconhecimento escrito pelo médico.') && tem(pdfTudo, 'Marcador EA-04: procedimentos escritos pelo médico.')
  && tem(pdfTudo, `Redigido por ${MEDICO} em 10/03/2025.`),
  'conteúdo registrado como texto: sai impresso na seção 5.8, atribuído ao médico e com a data');
check(tem(pdfTudo, 'Documento anexo a este PCMSO: Programa de imunização, marcador PV-03, de 15/08/2025.')
  && tem(pdfTudo, 'Arquivado em: Arquivo do SESMT, pasta 4.') && tem(pdfTudo, `Redigido por ${MEDICO}.`),
  'conteúdo registrado como documento anexo: sai o título, a data, onde fica arquivado e quem redigiu');
check(itens32.every((i) => !pendenteNoPdf(pdfTudo, i)) && faltas58(montarClinica(REG)).length === 0,
  'com os quatro itens da NR-32 registrados, a pendência de cada um some');
check(situacaoNoChecklist(pdfTudo) === 'Cadastro conferido',
  `checklist: com todos os itens registrados, a linha da NR setorial sai "Cadastro conferido" (veio "${situacaoNoChecklist(pdfTudo)}")`);
check(pdfTudo.includes('MINUTA DE PCMSO'), 'conteúdo setorial registrado não tira a MINUTA de quem não tem médico responsável indicado');

// Nada registrado.
const pdfNada = clinicaCom(undefined);
check(itens32.every((i) => pendenteNoPdf(pdfNada, i)) && faltas58(montarClinica(undefined)).length === 4,
  'sem registro, cada item da NR-32 continua pendência, com a citação');
check(P.TELA_DO_CONTEUDO_SETORIAL.startsWith('Engenharia SST > 3. Aplicação de Exames > ')
  && faltas58(montarClinica(undefined)).every((f) => f.longo.endsWith(`(${P.TELA_DO_CONTEUDO_SETORIAL})`))
  && tem(pdfNada, `(${P.TELA_DO_CONTEUDO_SETORIAL}).`),
  'a pendência aponta a tela em que se resolve (Engenharia SST > 3. Aplicação de Exames > ...)');
check(situacaoNoChecklist(pdfNada) === 'Pendente', `checklist: sem registro, a linha da NR setorial sai "Pendente" (veio "${situacaoNoChecklist(pdfNada)}")`);
{
  // Sem registro, a tabela da 5.8 so pode ter o cabecalho, as citacoes e o
  // PENDENTE. Qualquer outra coisa ali foi escrita pelo sistema.
  const i = pdfNada.indexOf('Exigência da NR Conteúdo registrado');
  const f = pdfNada.indexOf('Testagem para HIV', i);
  let sobra = i < 0 || f < 0 ? null : compacto(pdfNada.slice(i, f));
  if (sobra !== null) {
    for (const t of ['Exigência da NR Conteúdo registrado', 'PENDENTE — sem registro completo (seção 11.1).', ...itens32.map((x) => x.texto)]) {
      sobra = sobra.split(compacto(t)).join('');
    }
    // Moldura da pagina, quando a tabela atravessa a quebra: rodape, marca
    // d'agua e cabecalho da minuta. E o marcador da lista que vem depois.
    sobra = sobra
      .replace(/MINUTA·PCMSO-\d+-\d{4}-REV\d+·emitidoem\d{2}\/\d{2}\/\d{4}\d+\/\d+/g, '')
      .split(compacto('MINUTA DE PCMSO — SEM MÉDICO RESPONSÁVEL INDICADO')).join('')
      .split(compacto(`${CLIENTE.trade_name} · `)).join('')
      .replace(/PCMSO-\d+-\d{4}-REV\d+/g, '')
      .replace(/MINUTA/g, '')
      .replace(/\*$/, '');
  }
  check(sobra === '', `nada inventado: sem registro, a tabela da 5.8 só traz as citações e "PENDENTE" (sobrou: ${JSON.stringify(sobra)})`);
}

// Registro parcial: alguns itens, ou um item incompleto.
const metade = { 'nr32-riscos-biologicos': REG['nr32-riscos-biologicos'], 'nr32-programa-de-vacinacao': REG['nr32-programa-de-vacinacao'] };
const pdfMetade = clinicaCom(metade);
check(tem(pdfMetade, 'Marcador RB-01') && tem(pdfMetade, 'marcador PV-03') && !tem(pdfMetade, 'Marcador VM-02')
  && !pendenteNoPdf(pdfMetade, itens32[0]) && !pendenteNoPdf(pdfMetade, itens32[2])
  && pendenteNoPdf(pdfMetade, itens32[1]) && pendenteNoPdf(pdfMetade, itens32[3]),
  'registro parcial: os dois itens registrados saem impressos, e só os outros dois continuam pendência');
check(situacaoNoChecklist(pdfMetade) === 'Pendente', `checklist: com dois de quatro itens registrados, a linha continua "Pendente" (veio "${situacaoNoChecklist(pdfMetade)}")`);
const pdfSemAutor = clinicaCom({ ...REG, 'nr32-vigilancia-medica': regTexto('Marcador VM-02: vigilância escrita pelo médico.', { autor: '', autor_id: '' }) });
check(!tem(pdfSemAutor, 'Marcador VM-02') && tem(pdfSemAutor, 'O registro está incompleto e não sai impresso; falta o médico que redigiu')
  && situacaoNoChecklist(pdfSemAutor) === 'Pendente',
  'registro sem o médico que redigiu: não sai impresso, a pendência diz o que falta e o checklist fica "Pendente"');
{
  const incompletos = [
    ['texto em branco', regTexto('   ')],
    ['sem data', regTexto('x', { data: '' })],
    ['data fora do formato', regTexto('x', { data: '10/03/2025' })],
    ['anexo sem onde fica arquivado', { ...REG['nr32-programa-de-vacinacao'], anexo_local: ' ' }],
    ['anexo sem título', { ...REG['nr32-programa-de-vacinacao'], anexo_titulo: '' }],
    ['sem a forma', { texto: 'x', autor: MEDICO, data: '2025-03-10' }],
    ['vazio', {}]
  ];
  const aceitos = incompletos.filter(([, r]) => P.faltasDoConteudoSetorial(r).length === 0).map(([n]) => n);
  check(aceitos.length === 0, `registro incompleto não vale (aceitos: ${aceitos.join(', ') || 'nenhum'})`);
  check(P.faltasDoConteudoSetorial(REG['nr32-riscos-biologicos']).length === 0 && P.faltasDoConteudoSetorial(REG['nr32-programa-de-vacinacao']).length === 0,
    'registro completo vale, como texto e como documento anexo');
  check(faltas58(montarClinica({ ...REG, 'nr32-riscos-biologicos': regTexto('Marcador futuro', { data: '2026-12-31' }) }, { hoje: '2026-10-04' })).length === 1
    && faltas58(montarClinica(REG, { hoje: '2026-10-04' })).length === 0,
    'conteúdo datado depois da emissão não vale');
}

// Chave estavel: o registro e achado pela chave, e nao pela citacao.
check(P.registroDoItem({ ...ITEM_VAC, texto: 'NR-32: outra redação da mesma exigência' }, REG) === REG['nr32-programa-de-vacinacao'],
  'chave estável: corrigir a redação da citação não perde o conteúdo registrado');
{
  const pelaCitacao = Object.fromEntries(itens32.map((i) => [i.texto, REG[i.chave]]));
  check(P.registroDoItem(ITEM_VAC, pelaCitacao) === null && faltas58(montarClinica(pelaCitacao)).length === 4,
    'registro guardado pelo texto da citação não vale: a chave é a do item');
}

// Conteudo do programa, e nao de pessoa.
const pdfCpf = clinicaCom({ ...REG, 'nr32-vigilancia-medica': regTexto('Marcador VM-02: vigilância de 529.982.247-25.') });
check(!tem(pdfCpf, 'Marcador VM-02') && !pdfCpf.includes('529.982.247-25') && tem(pdfCpf, 'retirar um número de CPF: o conteúdo é do programa, e não de pessoa'),
  'conteúdo com CPF não sai impresso, e a pendência não repete o número');
const pdfNome = clinicaCom({ ...REG, 'nr32-vigilancia-medica': regTexto('Marcador VM-02: acompanhar o trabalhador numero 3 de perto.') });
check(!tem(pdfNome, 'Marcador VM-02') && tem(pdfNome, 'retirar o nome de um trabalhador deste cliente'),
  'conteúdo com o nome de empregado do cliente não sai impresso');
check(P.dadoDeTrabalhadorNoTexto('Pronto-socorro: (71) 3333-4444; plantão 71987654321.', COM_SETOR) === null
  && P.dadoDeTrabalhadorNoTexto('Avisar o Trabalhador Numero 10.', COM_SETOR) !== null
  && P.dadoDeTrabalhadorNoTexto('Avisar o Trabalhador Numero 100.', COM_SETOR) === null,
  'telefone não é confundido com CPF, e nome se compara por palavra inteira');

// O que a Helvetica nao desenha deixaria a celula ilegivel.
const pdfSimbolo = clinicaCom({ ...REG, 'nr32-vigilancia-medica': regTexto('Marcador VM-02: anti-HBs ≥ 10 mUI/mL.') });
check(!tem(pdfSimbolo, 'Marcador VM-02') && tem(pdfSimbolo, 'trocar caractere que o PDF não imprime (U+2265)'),
  'conteúdo com caractere que o PDF não imprime: não sai (sairia ilegível), e a pendência diz qual trocar');
// A lista da regra, e nao uma copia: caractere acrescentado a ela tem de sair legivel.
const pdfAceitos = clinicaCom({ ...REG, 'nr32-vigilancia-medica': regTexto(`Marcador VM-02: ${P.EXTRAS_DO_WINANSI} ºª°§½ çãõ.`) });
check(tem(pdfAceitos, 'Marcador VM-02') && !pdfAceitos.includes('\u0000'),
  'os caracteres que a regra aceita saem legíveis no PDF');

// A NR continua valendo pelo CNAE: registro guardado nao a faz aplicar.
const pdfComercio = gerar({ ...args, client: { ...CLIENTE, main_cnae: '47.61-0-03', pcmso_sectoral_content: REG } });
check(!tem(pdfComercio, 'Marcador RB-01') && !pdfComercio.includes('5.8 Exigências de NR setorial'),
  'conteúdo registrado não faz a NR setorial valer: quem a indica é o CNAE, e quem confirma é o responsável');

// O formulario nao sugere nada.
check(Object.values(P.RASCUNHO_VAZIO_DO_CONTEUDO_SETORIAL).every((v) => v === '') && Object.isFrozen(P.RASCUNHO_VAZIO_DO_CONTEUDO_SETORIAL),
  'nada inventado: o rascunho do formulário tem todos os campos vazios');
{
  const tela = semComentarios(ler('components/sst/PcmsoConteudoSetorial.tsx'));
  check(!/\bplaceholder\s*=|\bdefaultValue\s*=/.test(tela), 'nada inventado: nenhum campo do formulário tem placeholder ou valor padrão');
  const valores = (tela.match(/\bvalue=\{[^}]*\}/g) || []).filter((v) => !/^value=\{(rascunho\.\w+|m\.id|antigo\.autor_id)\}$/.test(v));
  check(valores.length === 0, `nada inventado: todo campo mostra o rascunho, sem valor alternativo (fora: ${valores.join(' ') || 'nenhum'})`);
  check(/useState<RascunhoDoConteudoSetorial>\(\{\s*\.\.\.RASCUNHO_VAZIO_DO_CONTEUDO_SETORIAL\s*\}\)/.test(tela)
    && /:\s*\{\s*\.\.\.RASCUNHO_VAZIO_DO_CONTEUDO_SETORIAL\s*\}\);/.test(tela),
    'o formulário parte do rascunho vazio, ao abrir a tela e ao registrar item novo');
  check(/faltasDoConteudoSetorial\(registro,/.test(tela) && /updateClient\(cliente\.id, \{ pcmso_sectoral_content: \{ \.\.\.registros, \[item\.chave\]: registro \} \}\)/.test(tela),
    'a tela confere o registro com a mesma regra do PDF e o grava no cliente, pela chave do item');
}

// ===========================================================================
// 4. TELAS E LIGACOES
// ===========================================================================
console.log('\n— telas e ligações');

const gerador = semComentarios(ler('components/sst/TechnicalDocsGeneratorTab.tsx'));
const preview = semComentarios(ler('components/sst/DocumentPreviewModal.tsx'));
const chamada = (fonte) => {
  const i = fonte.indexOf('exportPCMSODocumentPdf(');
  return i < 0 ? '' : fonte.slice(i, fonte.indexOf(')', fonte.indexOf('}', i)));
};
for (const campo of ['risks', 'units', 'sectors', 'jobs', 'catRecords', 'trainingRequirements']) {
  check(new RegExp(`\\b${campo}\\b`).test(chamada(gerador)), `a aba de documentos passa ${campo} ao PCMSO`);
  check(new RegExp(`\\b${campo}\\b`).test(chamada(preview)), `a pré-visualização passa ${campo} ao PCMSO`);
}
const resumo = semComentarios(ler('components/sst/PcmsoResumo.tsx'));
check(/montarPcmso\(/.test(resumo), 'o resumo de tela usa montarPcmso, a mesma conta do PDF');
for (const proibido of ['12 Meses', 'Vigência do Programa', 'Todos os Colaboradores', 'Conforme protocolo clínico', "'Geral'", 'NR-07 Quadro I/II']) {
  check(!gerador.includes(proibido) && !preview.includes(proibido) && !resumo.includes(proibido), `nenhuma tela afirma "${proibido}"`);
}
check(!/pcmso_physician_name/.test(preview) && !/pcmso_physician_name/.test(gerador), 'as telas não usam o médico geral da consultoria como coordenador do cliente');
const aba = semComentarios(ler('components/sst/ExamPCMSOTab.tsx'));
check(/<PcmsoPendencias\b/.test(aba), 'a aba de protocolos mostra as pendências do PCMSO');
check(/CRITERIO_MEDICO' && !protocolForm\.technical_justification\.trim\(\)/.test(aba), 'o formulário recusa exame a critério do médico sem justificativa (7.5.18)');
check(/technical_justification/.test(aba) && /interpretation_criteria/.test(aba), 'o formulário grava justificativa e critério de interpretação');
check((aba.match(/procedimentoVedado\(/g) || []).length >= 2, 'o formulário recusa exame vedado no protocolo e no ASO avulso');
check(/filter\(\(p\) => !procedimentoVedado\(/.test(semComentarios(ler('lib/esocialDados.ts'))), 'protocolo antigo com exame vedado não vira exame sugerido do ASO');
const pdfFonte = semComentarios(ler('lib/pdfExportService.ts'));
for (const arg of ['treinamentos:', 'cargos:', 'coordenadorSemRqe:', 'semResponsavelPeloPgr:']) {
  check(resumo.includes(arg) && pdfFonte.includes(arg), `a tela e o PDF passam ${arg.slice(0, -1)} a montarPcmso`);
}
check(!/faltasExtras:\s*faltasDasAtividadesCriticas/.test(resumo + pdfFonte), 'as faltas das atividades críticas não são somadas duas vezes');
{
  // A pendencia do conteudo setorial cita um caminho; ele tem de existir.
  const [, abaNumerada, subAba] = P.TELA_DO_CONTEUDO_SETORIAL.split(' > ');
  const painel = semComentarios(ler('components/sst/SSTUnifiedEngineeringView.tsx'));
  check(painel.includes(`${abaNumerada} (PCMSO & ASO)`) && aba.includes(`${subAba} (`) && /<PcmsoConteudoSetorial\b/.test(aba),
    `o caminho da pendência existe: aba "${abaNumerada}", sub-aba "${subAba}", com o formulário`);
  const chamadaDe = (fonteTsx) => {
    const i = fonteTsx.indexOf('montarPcmso({');
    return i < 0 ? '' : fonteTsx.slice(i, fonteTsx.indexOf('});', i));
  };
  check(/\bhoje\b/.test(chamadaDe(resumo)) && /\bhoje: emissao\b/.test(chamadaDe(pdfFonte)),
    'a tela e o PDF passam a data a montarPcmso (conteúdo datado depois dela não vale)');
}

console.log(`\n${casos - falhas}/${casos} casos passaram.`);
if (falhas > 0) {
  console.log(`${falhas} falha(s).`);
  process.exit(1);
}
console.log('PCMSO: NR-07 literal do texto oficial, fontes com proveniência, nada preenchido por padrão, sem dado de saúde individual.');
