/**
 * Verificacao dos fatores de risco psicossociais avaliados na AEP.
 *
 *   node scripts/verificar-psicossocial.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * Desde 26/05/2026 o subitem 1.5.3.2.1 da NR-01 manda considerar os fatores de
 * risco psicossociais relacionados ao trabalho "nos termos da NR-17". O sistema
 * os avalia NA AEP, leva o fator presente ao inventario do PGR (item 17.3.5) e
 * emite um relatorio que e RECORTE dos dois. O que este teste persegue:
 *
 *   1. AEP sem avaliacao psicossocial nao esta completa - e diz isso uma vez,
 *      nao dezenove.
 *   2. Fator presente fora do inventario e risco que perdeu o fator de origem
 *      aparecem como pendencia, na AEP, no PGR e no relatorio.
 *   3. O risco nasce com severidade e probabilidade de quem avalia - nunca de
 *      um padrao do sistema - e sem codigo da Tabela 24.
 *   4. Fator psicossocial NAO vai ao S-2240, ao LTCAT nem aos laudos de
 *      insalubridade e periculosidade: nao e agente nocivo, nem agente da NR-15,
 *      nem atividade da NR-16.
 *   5. O relatorio nao diverge do PGR: mesma acao, mesmo numero R-...
 *   6. Nada sobre pessoa: o documento nao traz nome de trabalhador.
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
const TMP = path.join(RAIZ, '.tmp-psicossocial-verificacao');

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
      path.join(RAIZ, 'lib/psicossocial.ts'),
      path.join(RAIZ, 'lib/planoDeAcao.ts'),
      path.join(RAIZ, 'lib/nr17.ts'),
      path.join(RAIZ, 'lib/laudoDados.ts'),
      path.join(RAIZ, 'lib/classificacaoDeRisco.ts'),
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

let servico, psico, plano, nr17, laudos, classif;
try {
  servico = require_(achar('pdfExportService.js'));
  psico = require_(achar('psicossocial.js'));
  plano = require_(achar('planoDeAcao.js'));
  nr17 = require_(achar('nr17.js'));
  laudos = require_(achar('laudoDados.js'));
  classif = require_(achar('classificacaoDeRisco.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}

const {
  exportAEPDocumentPdf, exportPsychosocialReportPdf, exportPGRDocumentPdf, exportLTCATDocumentPdf
} = servico;
const {
  FATORES_PSICOSSOCIAIS, BASE_NORMATIVA_PSICOSSOCIAL, VIGENCIA_DO_CAPITULO_1_5,
  O_QUE_A_AVALIACAO_NAO_E, ESTRATEGIAS_PSICOSSOCIAIS, PREFIXO_DO_RISCO,
  faltasPsicossociais, faltasDeInventarioPsicossocial, riscosPsicossociaisSemAEP,
  conferirPedidoDeInventario, riscoDoFator, fatoresDaAvaliacao, avaliacaoIniciada, linhasDosFatores
} = psico;
const { acoesDoPlano } = plano;
const { faltasDaAEP } = nr17;
const { montarCorpoInsalubridade, montarCorpoPericulosidade } = laudos;
const { classificarRisco } = classif;

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

/** Texto sem comentarios: a varredura procura a forma do defeito, nao a prosa. */
const semComentarios = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/gm, '$1')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ');
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

/**
 * Trecho de uma declaracao ate a proxima do mesmo nivel.
 *
 * Contar chaves a partir da primeira nao serve: a primeira costuma ser a do
 * parametro desestruturado ou a do tipo de retorno - `(id): { ok: boolean }`.
 */
function corpoDe(fonte, inicio) {
  const i = fonte.indexOf(inicio);
  if (i < 0) return '';
  const resto = fonte.slice(i + inicio.length);
  // Funcao exportada vai ate a proxima exportacao: dentro dela ha const no
  // mesmo recuo que as do contexto.
  if (inicio.startsWith('export ')) {
    const fim = resto.search(/\nexport /);
    return inicio + (fim < 0 ? resto : resto.slice(0, fim));
  }
  const proximo = resto.search(/\n(export (async )?function |  const [A-Za-z0-9_]+ = (useCallback|useMemo)\(|  const [A-Za-z0-9_]+ = \()/);
  return inicio + (proximo < 0 ? resto : resto.slice(0, proximo));
}

// O jsPDF escreve em WinAnsi: travessao e bullet caem em 0x85-0x97.
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

function gerar(fn, args) {
  ultimoPdf = null;
  try {
    fn(args);
  } catch (e) {
    check(false, `o gerador não quebra (${e.message})`);
    return '';
  }
  if (!ultimoPdf) inconclusivo('o gerador não produziu PDF');
  return corrido(ultimoPdf);
}

// ===========================================================================
// DADOS
// ===========================================================================
const ORG = {
  id: 'org-1', name: 'PrevSafe Engenharia', document_number: '11.222.333/0001-44',
  technical_responsible_name: 'Ana Paula Ribeiro', technical_responsible_council: 'CREA-SP 123456/D',
};
const CLIENTE = {
  id: 'cli-1', legal_name: 'Escritorio Modelo Ltda', trade_name: 'Modelo',
  document_number: '12.483.776/0001-99', address: 'Rua A, 100', city: 'Salvador', state: 'BA',
  porte: 'DEMAIS', risk_degree: 2,
};
const UNIDADE = { id: 'u1', client_id: 'cli-1', name: 'Matriz', status: 'ACTIVE', risk_degree: 2 };
const GHES = [
  { id: 'g1', code: 'GHE-01', name: 'Atendimento', client_id: 'cli-1' },
  { id: 'g2', code: 'GHE-02', name: 'Fiscal', client_id: 'cli-1' },
];
// Nomes de pessoas: nao podem aparecer em documento nenhum deste recurso.
const FUNCIONARIOS = [
  { id: 'e1', ghe_id: 'g1', client_id: 'cli-1', name: 'Joselita Bragança', status: 'ACTIVE' },
  { id: 'e2', ghe_id: 'g2', client_id: 'cli-1', name: 'Wanderclei Prates', status: 'ACTIVE' },
];

const CHAVES = FATORES_PSICOSSOCIAIS.map((f) => f.chave);
const todosNao = () => Object.fromEntries(CHAVES.map((k) => [k, { conclusao: 'NAO_IDENTIFICADO' }]));

/** Completa, sem fator presente. */
const PSICO_COMPLETA = {
  estrategias: ['OBSERVACAO_E_DIALOGO'],
  indicadores_consultados: 'Afastamentos do setor, somados',
  fatores: todosNao(),
  avaliacao_de_desempenho: { conclusao: 'NAO_HA_SISTEMA' },
  orientacao_das_chefias: { conclusao: 'ATENDE' },
};

const AEP_BASE = {
  id: 'aep-1', client_id: 'cli-1', status: 'ACTIVE',
  situation_name: 'Atendimento a clientes por telefone e e-mail',
  ghe_ids: ['g1', 'g2'], worker_count: 19,
  approach: 'QUALITATIVA', methods: 'Observacao da atividade e entrevistas',
  assessment_date: '2026-09-10', assessor: 'Ana Paula Ribeiro',
  aspects: Object.fromEntries(['organizacao', 'sobrecarga', 'cargas', 'mobiliario', 'maquinas', 'conforto']
    .map((k) => [k, { conclusao: 'ADEQUADO' }])),
  workers_heard: 'SIM', workers_heard_note: 'Entrevistas por equipe',
  workers_heard_date: '2026-09-10', workers_heard_count: 19,
};

/** Sobrecarga presente (no inventario de g1 so), assedio presente (fora). */
const AEP_COM_PRESENTES = {
  ...AEP_BASE,
  psychosocial: {
    ...PSICO_COMPLETA,
    fatores: {
      ...todosNao(),
      sobrecarga: {
        conclusao: 'PRESENTE',
        caracterizacao: 'Horas extras frequentes e intervalo de refeicao suprimido nas equipes de atendimento',
        fontes: ['OBSERVACAO', 'DIALOGO'],
      },
      assedio: {
        conclusao: 'PRESENTE',
        caracterizacao: 'Cobranca de metas com exposicao publica em reuniao semanal',
        fontes: ['DIALOGO'],
      },
    },
  },
};

const RISCO_SOBRECARGA_G1 = {
  id: 'rps1', client_id: 'cli-1', ghe_id: 'g1', status: 'ACTIVE',
  risk_category: 'ERGONÔMICO', risk_code_table_24: '',
  agent_name: `${PREFIXO_DO_RISCO}Excesso de demandas no trabalho (sobrecarga)`,
  severity: 4, probability: 3, epc_implemented: false, epc_effective: false,
  origin_aep_id: 'aep-1', origin_psychosocial_factor: 'sobrecarga',
  operational_situation: ['ROTINEIRA'],
};
const RISCO_SOBRECARGA_G2 = { ...RISCO_SOBRECARGA_G1, id: 'rps2', ghe_id: 'g2' };
const RISCO_RUIDO = {
  id: 'rr1', client_id: 'cli-1', ghe_id: 'g1', status: 'ACTIVE',
  risk_category: 'FÍSICO', risk_code_table_24: '02.01.001',
  agent_name: 'Ruído contínuo do climatizador', severity: 2, probability: 2,
  epc_implemented: true, epc_effective: true, operational_situation: ['ROTINEIRA'],
};
const RISCO_POSTURA = {
  id: 'rerg', client_id: 'cli-1', ghe_id: 'g1', status: 'ACTIVE',
  risk_category: 'ERGONÔMICO', risk_code_table_24: '',
  agent_name: 'Postura sentada prolongada', severity: 2, probability: 3, epc_implemented: false,
};
const RISCO_ACIDENTE = {
  id: 'racd', client_id: 'cli-1', ghe_id: 'g1', status: 'ACTIVE',
  risk_category: 'ACIDENTES', risk_code_table_24: '',
  agent_name: 'Queda no mesmo nível na copa', severity: 2, probability: 2, epc_implemented: false,
};

const nomeDoGhe = (id) => GHES.find((g) => g.id === id)?.code || id;
const comPsico = (p) => ({ ...AEP_BASE, psychosocial: p });

// ===========================================================================
// 1. CONTEUDO NORMATIVO
// ===========================================================================
console.log('\n— conteúdo normativo (Guia do MTE, NR-01, NR-17)');

const LISTA_DO_GUIA = [
  'Assédio de qualquer natureza no trabalho',
  'Má gestão de mudanças organizacionais',
  'Baixa clareza de papel/função',
  'Baixas recompensas e reconhecimento',
  'Falta de suporte/apoio no trabalho',
  'Baixo controle no trabalho/Falta de autonomia',
  'Baixa justiça organizacional',
  'Eventos violentos ou traumáticos',
  'Baixa demanda no trabalho (subcarga)',
  'Excesso de demandas no trabalho (sobrecarga)',
  'Más relacionamentos no local de trabalho',
  'Trabalho em condições de difícil comunicação',
  'Trabalho remoto e isolado',
];
check(FATORES_PSICOSSOCIAIS.length === 13, `a listagem do Guia tem 13 fatores (tem ${FATORES_PSICOSSOCIAIS.length})`);
check(
  JSON.stringify(FATORES_PSICOSSOCIAIS.map((f) => f.perigo)) === JSON.stringify(LISTA_DO_GUIA),
  'os 13 fatores estão na ordem e na grafia do Guia'
);
const cons = (k) => FATORES_PSICOSSOCIAIS.find((f) => f.chave === k)?.consequencias || [];
check(cons('sobrecarga').includes('DORT') && cons('autonomia').includes('DORT') && cons('mudancas').includes('DORT'),
  'sobrecarga, autonomia e mudanças trazem DORT como consequência, como no Guia');
check(cons('remoto').includes('Fadiga'), 'trabalho remoto e isolado traz fadiga, como no Guia');
check(JSON.stringify(cons('assedio')) === JSON.stringify(['Transtorno mental']),
  'assédio traz só transtorno mental, como no Guia');
check(new Set(CHAVES).size === 13, 'as chaves dos fatores não se repetem');

const itens = BASE_NORMATIVA_PSICOSSOCIAL.map((b) => b.item).join(' | ');
for (const it of ['1.5.3.1.4', '1.5.3.2.1', '1.5.4.4.5.3', '17.3.5', '17.3.8']) {
  check(itens.includes(it), `a base normativa cita o item ${it}`);
}
const textoBase = BASE_NORMATIVA_PSICOSSOCIAL.map((b) => b.texto).join(' ');
check(textoBase.includes('incluindo os fatores de risco psicossociais relacionados ao trabalho'),
  'o texto do 1.5.3.1.4 e do 1.5.3.2.1 está transcrito');
check(textoBase.includes('as exigências da atividade de trabalho e a eficácia das medidas de prevenção implementadas'),
  'o texto do 1.5.4.4.5.3 está transcrito');
check(VIGENCIA_DO_CAPITULO_1_5 === '26/05/2026', 'a vigência é 26/05/2026 (Portaria MTE nº 765/2025)');
const naoE = O_QUE_A_AVALIACAO_NAO_E.join(' ');
check(/saúde mental/.test(naoE) && /PCMSO/.test(naoE) && /relacionados ao trabalho/.test(naoE),
  'o texto diz que não avalia saúde mental, não sai do trabalho e não é o exame de aptidão');
check(ESTRATEGIAS_PSICOSSOCIAIS.length === 4
  && ESTRATEGIAS_PSICOSSOCIAIS.find((e) => e.valor === 'EQUIPE_ESPECIALIZADA')?.basta === false,
  'a equipe de especialistas sozinha não basta como caminho (Guia, cap. 3)');

// ===========================================================================
// 2. O QUE FALTA NA AVALIACAO
// ===========================================================================
console.log('\n— o que falta na avaliação psicossocial');

const nada = faltasPsicossociais(AEP_BASE);
check(nada.length === 1 && nada[0].longo.includes('1.5.3.2.1'),
  `AEP sem avaliação: uma pendência só, citando o 1.5.3.2.1 (são ${nada.length})`);
check(faltasDaAEP(AEP_BASE, { dispensaDeAET: false, alcance: 'GHE-01' })
  .some((f) => f.curto.includes('fatores psicossociais')),
  'faltasDaAEP — a regra única da aba, da AEP e do PGR — inclui a avaliação psicossocial');
check(faltasPsicossociais(comPsico(PSICO_COMPLETA)).length === 0, 'avaliação completa sem fator presente: nada falta');
check(faltasDaAEP(comPsico(PSICO_COMPLETA), { dispensaDeAET: false, alcance: 'GHE-01' }).length === 0,
  'AEP completa, com avaliação psicossocial completa: nada falta na AEP');
check(!avaliacaoIniciada(AEP_BASE) && avaliacaoIniciada(comPsico({ estrategias: ['OFICINA'] })),
  'avaliacaoIniciada distingue nada feito de algo começado');

const curtos = (p, aep = AEP_BASE) => faltasPsicossociais({ ...aep, psychosocial: p }).map((f) => f.curto).join(' | ');
const longos = (p, aep = AEP_BASE) => faltasPsicossociais({ ...aep, psychosocial: p }).map((f) => f.longo).join(' | ');

check(curtos({ ...PSICO_COMPLETA, estrategias: [] }).includes('estratégia'), 'sem estratégia: pendência');
check(curtos({ ...PSICO_COMPLETA, estrategias: ['EQUIPE_ESPECIALIZADA'] }).includes('caminho além da equipe'),
  'só equipe de especialistas: pendência de caminho');
check(!curtos({ ...PSICO_COMPLETA, estrategias: ['EQUIPE_ESPECIALIZADA', 'OFICINA'] }).includes('caminho'),
  'equipe de especialistas com oficina: sem pendência de caminho');

const q = { ...PSICO_COMPLETA, estrategias: ['QUESTIONARIO'] };
check(curtos(q).includes('anonimato') && curtos(q).includes('nome do questionário') && curtos(q).includes('fundamentação'),
  'questionário sem nome, fundamentação e anonimato: três pendências');
check(curtos({ ...q, anonimato_garantido: false, instrumento: 'X', instrumento_fundamentacao: 'Y' }).includes('anonimato'),
  'anonimato não confirmado continua pendente');
check(curtos({ ...q, anonimato_garantido: true, instrumento: 'X', instrumento_fundamentacao: 'Y' }) === '',
  'questionário nomeado, fundamentado e anônimo: nada falta');

const umSem = { ...PSICO_COMPLETA, fatores: { ...todosNao() } };
delete umSem.fatores.justica;
check(longos(umSem).includes('"Baixa justiça organizacional"') && curtos(umSem).includes('1 fator(es)'),
  'fator sem conclusão: pendência com o nome do fator');

const presenteNu = { ...PSICO_COMPLETA, fatores: { ...todosNao(), suporte: { conclusao: 'PRESENTE' } } };
check(curtos(presenteNu).includes('caracterização') && curtos(presenteNu).includes('fonte da constatação'),
  'fator presente sem caracterização e sem fonte: duas pendências');

const fonteSemEstrategia = {
  ...PSICO_COMPLETA,
  fatores: { ...todosNao(), suporte: { conclusao: 'PRESENTE', caracterizacao: 'x', fontes: ['QUESTIONARIO'] } },
};
check(curtos(fonteSemEstrategia).includes('fonte sem estratégia'),
  'fonte "questionário" sem questionário declarado: pendência');

check(curtos({ ...PSICO_COMPLETA, avaliacao_de_desempenho: undefined }).includes('17.4.4'), '17.4.4 sem conclusão: pendência');
check(curtos({ ...PSICO_COMPLETA, avaliacao_de_desempenho: { conclusao: 'NAO_ATENDE' } }).includes('17.4.4'),
  '17.4.4 "não atende" sem observação: pendência');
check(!curtos({ ...PSICO_COMPLETA, avaliacao_de_desempenho: { conclusao: 'NAO_ATENDE', observacao: 'Bonus por volume sem pausa' } }).includes('17.4.4'),
  '17.4.4 "não atende" com observação: sem pendência');
check(curtos({ ...PSICO_COMPLETA, orientacao_das_chefias: undefined }).includes('17.4.7'), '17.4.7 sem conclusão: pendência');
check(curtos({ ...PSICO_COMPLETA, orientacao_das_chefias: { conclusao: 'NAO_ATENDE' } }).includes('17.4.7'),
  '17.4.7 "não atende" sem observação: pendência');

const semRegistro = { ...AEP_BASE, workers_heard_date: '', workers_heard_count: undefined, workers_heard_note: '' };
const lr = longos(PSICO_COMPLETA, semRegistro);
check(lr.includes('data') && lr.includes('número de ouvidos') && lr.includes('forma'),
  'oitiva "sim" sem data, número e forma: pendência que nomeia os três');
check(!longos(PSICO_COMPLETA).includes('registro da oitiva'), 'oitiva registrada: sem pendência');

const adicionalSemPerigo = { ...PSICO_COMPLETA, adicionais: [{ id: 'ad1', perigo: '', conclusao: 'NAO_IDENTIFICADO' }] };
check(curtos(adicionalSemPerigo).includes('descrição do fator adicional'), 'fator adicional sem descrição: pendência');
const adicionalSemConclusao = { ...PSICO_COMPLETA, adicionais: [{ id: 'ad2', perigo: 'Jornada em turnos alternados' }] };
check(longos(adicionalSemConclusao).includes('Jornada em turnos alternados'), 'fator adicional sem conclusão: pendência com o nome');
check(fatoresDaAvaliacao(comPsico(adicionalSemConclusao)).length === 14, 'os fatores adicionais se somam aos 13 do Guia');

// ===========================================================================
// 3. COERENCIA COM O INVENTARIO
// ===========================================================================
console.log('\n— coerência com o inventário (item 17.3.5)');

const inv = (riscos, aep = AEP_COM_PRESENTES) => faltasDeInventarioPsicossocial(aep, riscos, nomeDoGhe).map((f) => f.longo);

const semNada = inv([]);
check(semNada.some((t) => t.includes('"Excesso de demandas no trabalho (sobrecarga)"') && t.includes('GHE-01, GHE-02')),
  'fator presente fora do inventário: pendência que nomeia os GHE');
const soG1 = inv([RISCO_SOBRECARGA_G1]);
check(soG1.some((t) => t.includes('sobrecarga') && t.includes('GHE-02') && !t.includes('GHE-01')),
  'no inventário de um GHE só: a pendência nomeia só o outro');
check(!inv([RISCO_SOBRECARGA_G1, RISCO_SOBRECARGA_G2]).some((t) => t.includes('sobrecarga')),
  'no inventário dos dois GHE: a sobrecarga sai das pendências');
check(inv([RISCO_SOBRECARGA_G1, RISCO_SOBRECARGA_G2]).some((t) => t.includes('Assédio')),
  'o assédio, presente e fora do inventário, continua pendente');
check(inv([{ ...RISCO_SOBRECARGA_G1, status: 'INACTIVE' }, RISCO_SOBRECARGA_G2])
  .some((t) => t.includes('sobrecarga') && t.includes('GHE-01')),
  'risco INATIVO não conta como inventariado');
check(inv([{ ...RISCO_SOBRECARGA_G1, origin_aep_id: 'outra-aep' }, RISCO_SOBRECARGA_G2])
  .some((t) => t.includes('sobrecarga') && t.includes('GHE-01')),
  'risco nascido de OUTRA AEP não conta');

const semSobrecarga = {
  ...AEP_COM_PRESENTES,
  psychosocial: { ...AEP_COM_PRESENTES.psychosocial, fatores: { ...AEP_COM_PRESENTES.psychosocial.fatores, sobrecarga: { conclusao: 'NAO_IDENTIFICADO' } } },
};
check(inv([RISCO_SOBRECARGA_G1], semSobrecarga).some((t) => t.includes('reavalie') && t.includes('1.5.4.4.6')),
  'risco cujo fator deixou de ser presente: pendência de reavaliação (1.5.4.4.6)');
check(inv([], { ...AEP_COM_PRESENTES, ghe_ids: [] }).some((t) => t.includes('GHE da situação')),
  'fator presente numa situação sem GHE: pendência de GHE');
check(riscosPsicossociaisSemAEP([RISCO_SOBRECARGA_G1], [{ ...AEP_COM_PRESENTES, status: 'INACTIVE' }]).length === 1
  && riscosPsicossociaisSemAEP([RISCO_SOBRECARGA_G1], [AEP_COM_PRESENTES]).length === 0,
  'risco cuja AEP de origem foi desativada é apontado; com a AEP ativa, não');

// ===========================================================================
// 4. LEVAR AO INVENTARIO
// ===========================================================================
console.log('\n— levar o fator ao inventário');

const pedidoValido = {
  aep: AEP_COM_PRESENTES, chave: 'sobrecarga', gheId: 'g1', severidade: 4, probabilidade: 3,
  situacoes: ['ROTINEIRA'], medidaImplementada: false, eficaciaVerificada: false,
};
const recusa = (p, riscos = []) => conferirPedidoDeInventario({ ...pedidoValido, ...p }, riscos);

check(recusa({ chave: 'justica' }).ok === false, 'fator não presente: recusado');
check(recusa({
  aep: { ...AEP_COM_PRESENTES, psychosocial: { ...AEP_COM_PRESENTES.psychosocial, fatores: { ...AEP_COM_PRESENTES.psychosocial.fatores, sobrecarga: { conclusao: 'PRESENTE', fontes: ['DIALOGO'] } } } }
}).ok === false, 'sem caracterização: recusado');
check(recusa({
  aep: { ...AEP_COM_PRESENTES, psychosocial: { ...AEP_COM_PRESENTES.psychosocial, fatores: { ...AEP_COM_PRESENTES.psychosocial.fatores, sobrecarga: { conclusao: 'PRESENTE', caracterizacao: 'x' } } } }
}).ok === false, 'sem fonte da constatação: recusado');
check(recusa({ gheId: 'g9' }).ok === false, 'GHE fora da situação: recusado');
for (const [s, p] of [[0, 3], [6, 3], [4, undefined], [NaN, NaN]]) {
  check(recusa({ severidade: s, probabilidade: p }).ok === false, `severidade ${s} e probabilidade ${p}: recusado (o sistema não escolhe)`);
}
check(recusa({ situacoes: [] }).ok === false, 'sem situação operacional: recusado');
check(recusa({ eficaciaVerificada: true }).ok === false, 'eficácia verificada sem medida implementada: recusado');
check(recusa({ medidaImplementada: true }).ok === false, 'medida implementada sem descrição: recusado');
check(recusa({}, [RISCO_SOBRECARGA_G1]).ok === false, 'o mesmo fator já no inventário do GHE: recusado');

const conf = conferirPedidoDeInventario(pedidoValido, []);
check(conf.ok === true && conf.fator?.chave === 'sobrecarga', 'pedido completo: aceito');
const novo = conf.ok ? riscoDoFator(pedidoValido, conf.fator) : {};
check(novo.risk_category === 'ERGONÔMICO', 'o risco nasce na categoria ergonômica (1.5.3.1.4)');
check(novo.risk_code_table_24 === '', 'o risco nasce sem código da Tabela 24');
check(novo.evaluation_type === 'QUALITATIVA', 'avaliação qualitativa');
check(novo.severity === 4 && novo.probability === 3, 'severidade e probabilidade são as escolhidas');
check(novo.risk_level === classificarRisco(4, 3).nivel && novo.risk_level === 'ALTO',
  'o nível sai da matriz do PGR (S4 × P3 = Alto)');
check(novo.origin_aep_id === 'aep-1' && novo.origin_psychosocial_factor === 'sobrecarga', 'o risco guarda a AEP e o fator de origem');
check(novo.agent_name === `${PREFIXO_DO_RISCO}Excesso de demandas no trabalho (sobrecarga)`, 'o nome do risco identifica o fator');
check(novo.health_effects === 'Transtorno mental, DORT', 'as consequências vêm do Guia');
check(String(novo.generating_source).includes('Atendimento a clientes') && String(novo.generating_source).includes('Horas extras'),
  'a fonte geradora traz a situação e a caracterização');
check(novo.insalubridade_applies === false && novo.periculosidade_applies === false && novo.special_retirement_applies === false
  && novo.epi_required === false, 'não enseja insalubridade, periculosidade, aposentadoria especial nem EPI');
check(novo.epc_implemented === false && novo.epc_effective === false, 'sem medida informada, o risco nasce sem controle');
const comMedida = { ...pedidoValido, medidaImplementada: true, eficaciaVerificada: false, descricaoDaMedida: 'Priorizacao semanal de tarefas' };
const novo2 = riscoDoFator(comMedida, conferirPedidoDeInventario(comMedida, []).fator);
check(novo2.epc_implemented === true && novo2.epc_effective === false && novo2.epc_description === 'Priorizacao semanal de tarefas',
  'medida implementada sem eficácia verificada: registrada como tal');

// ===========================================================================
// 5. PLANO DE ACAO
// ===========================================================================
console.log('\n— plano de ação');

const acoes = acoesDoPlano([RISCO_RUIDO, RISCO_SOBRECARGA_G1], GHES, () => 1);
const aPsico = acoes.find((a) => a.risco.id === 'rps1');
const aRuido = acoes.find((a) => a.risco.id === 'rr1');
check(aPsico && /organização do trabalho/.test(aPsico.medida) && /com os trabalhadores/.test(aPsico.medida),
  'risco psicossocial: medida na organização do trabalho, com os trabalhadores');
check(aPsico && !/proteção coletiva/i.test(aPsico.medida + aPsico.hierarquia), 'risco psicossocial: nada de "proteção coletiva"');
check(aRuido && /Manter e monitorar/.test(aRuido.medida), 'o risco de ruído continua com a redação de antes');
check(aPsico?.id === 'R-GHE-01-02', 'o número da ação vem da ordem do inventário (R-GHE-01-02)');

const pdfFonte = semComentarios(ler('lib/pdfExportService.ts'));
const corpoPgr = corpoDe(pdfFonte, 'export function exportPGRDocumentPdf(');
const corpoRel = corpoDe(pdfFonte, 'export function exportPsychosocialReportPdf(');
// O plano passou a ser registro: a chamada leva as opcoes (os registros, o
// efetivo da regra dos 20% e a data da emissao). A intencao continua a
// mesma: uma regra so, chamada uma vez, com as MESMAS opcoes nos dois
// geradores - opcao diferente da numero ou prazo diferente.
const CHAMADA_DO_PLANO = /acoesDoPlano\(riscosDoCliente, gheDoCliente, expostosDoGhe, (\{[^{}]*\})\)/;
const opcoesNoPgr = (corpoPgr.match(CHAMADA_DO_PLANO) || [])[1] || '';
const opcoesNoRel = (corpoRel.match(new RegExp(`${CHAMADA_DO_PLANO.source}\\s*\\.filter\\(`)) || [])[1] || '';
check(/\bacoes: pgrActionPlan\b/.test(opcoesNoPgr) && /\befetivo: efetivoDoCliente\b/.test(opcoesNoPgr)
  && (corpoPgr.match(/acoesDoPlano\(/g) || []).length === 1
  && !/const acoes = riscosDoCliente/.test(corpoPgr),
  'o PGR monta o plano pela regra única (acoesDoPlano), uma vez, com os registros e o efetivo, sem cópia própria');
check(opcoesNoRel !== '' && opcoesNoRel === opcoesNoPgr && (corpoRel.match(/acoesDoPlano\(/g) || []).length === 1,
  'o relatório usa a mesma regra com as MESMAS opções do PGR e filtra DEPOIS, para manter a numeração do PGR');
const definicao = (corpo, nome) => (corpo.match(new RegExp(`const ${nome} = ([^;]+);`)) || [])[1];
check(Boolean(definicao(corpoPgr, 'efetivoDoCliente')) && definicao(corpoPgr, 'efetivoDoCliente') === definicao(corpoRel, 'efetivoDoCliente')
  && Boolean(definicao(corpoPgr, 'emissao')) && definicao(corpoPgr, 'emissao') === definicao(corpoRel, 'emissao'),
  'as opções são o mesmo recorte nos dois geradores: o mesmo efetivo e a mesma data');

// ===========================================================================
// 6. DOCUMENTO DA AEP
// ===========================================================================
console.log('\n— documento da AEP');

const argsAep = {
  client: CLIENTE, organization: ORG, ghes: GHES, units: [UNIDADE],
  ergonomicAssessments: [AEP_COM_PRESENTES], risks: [RISCO_SOBRECARGA_G1, RISCO_RUIDO],
};
const tAep = gerar(exportAEPDocumentPdf, argsAep);
check(tAep.includes('3.1 FATORES DE RISCO PSICOSSOCIAIS RELACIONADOS AO TRABALHO'), 'a AEP tem a seção 3.1 dos fatores psicossociais');
check(tAep.includes('não avalia a saúde mental') || tAep.includes('Não avalia a saúde mental'), 'a AEP diz que não avalia saúde mental');
check(tAep.includes('FATORES DE RISCO PSICOSSOCIAIS - COMO FORAM AVALIADOS'), 'cada situação traz como os fatores foram avaliados');
check(tAep.includes('Excesso de demandas no trabalho (sobrecarga)') && tAep.includes('Baixa justiça organizacional'),
  'cada situação traz o quadro com os fatores do Guia');
check(tAep.includes('Alto (S4 × P3)') || tAep.includes('Alto (S4 x P3)') || /Alto \(S4 .{1,3} P3\)/.test(tAep),
  'o fator inventariado sai com o nível do inventário');
// Na LINHA da sobrecarga: o assedio, fora do inventario, tambem tem
// "GHE-02: PENDENTE", e procurar no documento inteiro nao distinguiria.
const linhaSobrecarga = linhasDosFatores(AEP_COM_PRESENTES, [RISCO_SOBRECARGA_G1], nomeDoGhe)
  .find((l) => l[0].startsWith('Excesso de demandas'));
check(Boolean(linhaSobrecarga) && /GHE-01: Alto/.test(linhaSobrecarga[3]) && /GHE-02: PENDENTE/.test(linhaSobrecarga[3]),
  'no quadro, cada GHE da situação é conferido com o SEU risco (GHE-01 no inventário, GHE-02 pendente)');
const trechoSobrecarga = tAep.slice(
  tAep.indexOf('Excesso de demandas no trabalho (sobrecarga)'),
  tAep.indexOf('Más relacionamentos no local de trabalho')
);
check(/GHE-02: PENDENTE/.test(trechoSobrecarga), 'no PDF, a linha da sobrecarga traz o GHE-02 como PENDENTE');
check(tAep.includes('fora do inventário de riscos do GHE'), 'a pendência do fator fora do inventário vai à seção 8');
check(tAep.includes('REQUISITOS DA NR-17 LIGADOS AOS FATORES PSICOSSOCIAIS'), 'a AEP traz os itens 17.4.4 e 17.4.7');
check(!tAep.includes('Joselita') && !tAep.includes('Wanderclei'), 'a AEP não traz nome de trabalhador');

const tAepSemRiscos = gerar(exportAEPDocumentPdf, { ...argsAep, risks: undefined });
check(/GHE-01: PENDENTE/.test(tAepSemRiscos),
  'sem o inventário, o fator sai como fora dele - por isso quem chama TEM de passar risks');

const gerador = semComentarios(ler('components/sst/TechnicalDocsGeneratorTab.tsx'));
const preview = semComentarios(ler('components/sst/DocumentPreviewModal.tsx'));
const chamadaAep = (fonte) => {
  const i = fonte.indexOf('exportAEPDocumentPdf({');
  return i < 0 ? '' : fonte.slice(i, fonte.indexOf('})', i));
};
check(/risks/.test(chamadaAep(gerador)), 'a aba de documentos passa o inventário à AEP');
check(/risks/.test(chamadaAep(preview)), 'a pré-visualização passa o inventário à AEP');

// ===========================================================================
// 7. RELATORIO
// ===========================================================================
console.log('\n— relatório de fatores psicossociais');

const argsRel = {
  client: CLIENTE, organization: ORG, ghes: GHES, units: [UNIDADE], employees: FUNCIONARIOS,
  ergonomicAssessments: [AEP_COM_PRESENTES, { ...AEP_COM_PRESENTES, id: 'aep-x', client_id: 'cli-9', situation_name: 'Situacao de outro cliente' }],
  risks: [RISCO_RUIDO, RISCO_SOBRECARGA_G1, RISCO_SOBRECARGA_G2, RISCO_POSTURA],
};
const tRel = gerar(exportPsychosocialReportPdf, argsRel);
check(tRel.includes('Recorte da AEP'), 'o relatório se declara recorte da AEP e do PGR');
check(tRel.includes('não é um programa separado'), 'o relatório cita o Manual do GRO: não é programa separado');
check(tRel.includes('26/05/2026') && tRel.includes('1.5.3.2.1'), 'o relatório traz a vigência e o 1.5.3.2.1');
check(tRel.includes('17.4.4') && tRel.includes('17.4.7'), 'o relatório transcreve os itens 17.4.4 e 17.4.7');
check(tRel.includes('Atendimento a clientes por telefone'), 'o relatório traz a situação avaliada');
check(!tRel.includes('Situacao de outro cliente'), 'o relatório não traz AEP de outro cliente');
check(tRel.includes('4. INVENTÁRIO E PLANO DE AÇÃO'), 'o relatório tem o quadro do inventário e do plano');
check(tRel.includes('Adotar, com os trabalhadores, medida na organização do trabalho'), 'o plano traz a medida na organização do trabalho');
check(!tRel.includes('Ruído contínuo do climatizador') && !tRel.includes('Postura sentada prolongada'),
  'o plano do relatório traz só os riscos psicossociais');
check(tRel.includes('Assédio de qualquer natureza no trabalho') && tRel.includes('fora do inventário de riscos do GHE'),
  'o assédio presente e fora do inventário vira pendência no relatório');
check(!tRel.includes('Joselita') && !tRel.includes('Wanderclei'), 'o relatório não traz nome de trabalhador');
check(tRel.includes('ICP-Brasil'), 'o relatório lembra a assinatura ICP-Brasil do documento só digital');

// Mesmo numero no PGR e no relatorio.
const tPgr = gerar(exportPGRDocumentPdf, {
  client: CLIENTE, organization: ORG, ghes: GHES, units: [UNIDADE], employees: FUNCIONARIOS,
  ergonomicAssessments: [AEP_COM_PRESENTES],
  risks: [RISCO_RUIDO, RISCO_SOBRECARGA_G1, RISCO_SOBRECARGA_G2, RISCO_POSTURA],
});
const idsPsicoPgr = acoesDoPlano([RISCO_RUIDO, RISCO_SOBRECARGA_G1, RISCO_SOBRECARGA_G2, RISCO_POSTURA], GHES, () => 1)
  .filter((a) => a.risco.origin_psychosocial_factor).map((a) => a.id);
check(idsPsicoPgr.length === 2 && idsPsicoPgr.every((id) => tPgr.includes(id) && tRel.includes(id)),
  `as ações psicossociais têm o mesmo número no PGR e no relatório (${idsPsicoPgr.join(', ')})`);
// Com registros do plano: uma acao aceita (rps1) e uma sugestao (rps2). O
// PGR e o relatorio tem de dar o mesmo numero R-...k, a mesma medida, o mesmo
// prazo e a mesma faixa - esta, com a regra dos 20% do efetivo (cada GHE tem
// 1 dos 2 empregados), que so sobe se o efetivo chegar a regra.
const ACAO_ACEITA = {
  id: 'pa1', organization_id: 'org-1', client_id: 'cli-1', risk_id: 'rps1', ghe_id: 'g1', origin: 'MANUAL',
  measure: 'Redistribuir as filas de atendimento com a equipe, com teto diario por atendente',
  hierarchy: 'ADMINISTRATIVA', action_type: 'INTRODUZIR',
  responsible: 'Supervisao de atendimento', deadline: '2026-10-15', original_deadline: '2026-10-15',
  monitoring: 'Reuniao quinzenal com a equipe', measurement: 'Reavaliacao do fator na AEP',
  status: 'EM_ANDAMENTO', accepted_at: '2026-09-20T12:00:00Z',
  history: [], created_at: '2026-09-20T12:00:00Z', updated_at: '2026-09-20T12:00:00Z',
};
const SUGESTAO = {
  id: 'pa2', organization_id: 'org-1', client_id: 'cli-1', risk_id: 'rps2', ghe_id: 'g2', origin: 'INVENTARIO',
  measure: 'Adotar, com os trabalhadores, pausas negociadas no fechamento fiscal',
  hierarchy: 'ADMINISTRATIVA', action_type: 'INTRODUZIR',
  responsible: 'Quem Nao Aceitou', deadline: '2027-03-31',
  status: 'SUGERIDA', history: [], created_at: '2026-09-21T12:00:00Z', updated_at: '2026-09-21T12:00:00Z',
};
const RISCOS_DO_PLANO = [RISCO_RUIDO, RISCO_SOBRECARGA_G1, RISCO_SOBRECARGA_G2, RISCO_POSTURA];
const argsComPlano = {
  client: CLIENTE, organization: ORG, ghes: GHES, units: [UNIDADE], employees: FUNCIONARIOS,
  ergonomicAssessments: [AEP_COM_PRESENTES], risks: RISCOS_DO_PLANO, pgrActionPlan: [ACAO_ACEITA, SUGESTAO],
};
const tPgrPlano = gerar(exportPGRDocumentPdf, argsComPlano);
const tRelPlano = gerar(exportPsychosocialReportPdf, argsComPlano);
const esperadas = acoesDoPlano(
  RISCOS_DO_PLANO, GHES, (g) => FUNCIONARIOS.filter((e) => e.ghe_id === g).length,
  { acoes: [ACAO_ACEITA, SUGESTAO], efetivo: FUNCIONARIOS.length }
);
const eAceita = esperadas.find((a) => a.registro?.id === 'pa1');
const eSugestao = esperadas.find((a) => a.registro?.id === 'pa2');
check(Boolean(eAceita?.aceita) && eSugestao?.aceita === false && eSugestao?.prazoDaFaixa?.elevado === true,
  'a regra dá a acao aceita como aceita e a sugestão como não aceita, com a faixa elevada pelos 20% do efetivo');
check(Boolean(eAceita) && [tPgrPlano, tRelPlano].every((t) => t.includes(eAceita.numero) && t.includes(ACAO_ACEITA.measure) && t.includes('15/10/2026')),
  `a ação aceita sai com o mesmo número (${eAceita?.numero}), a mesma medida e o mesmo prazo no PGR e no relatório`);
check(Boolean(eSugestao) && [tPgrPlano, tRelPlano].every((t) => t.includes(eSugestao.numero) && t.includes(`Sugestão não aceita: ${SUGESTAO.measure}`)),
  `a sugestão sai com o mesmo número (${eSugestao?.numero}) e marcada como não aceita nos dois documentos`);
check([tPgrPlano, tRelPlano].every((t) => !t.includes('Quem Nao Aceitou') && !t.includes('31/03/2027')),
  'o responsável e o prazo gravados na sugestão não saem em nenhum dos dois documentos');
check(tRelPlano.includes(`a definir (faixa: ${eSugestao?.prazoDaFaixa?.rotulo}, elevada pelo nº de expostos)`)
  && tPgrPlano.includes('elevada pelo nº de expostos'),
  'a sugestão sai no relatório com o prazo "a definir" e a faixa elevada, como no PGR (o efetivo chega aos dois)');
check(tRelPlano.includes(`Ações do plano sem aceite: ${eSugestao?.numero}`),
  'a sugestão não aceita vira pendência no relatório');
// O status vem da mesma regra (com "Atrasada" se o teste rodar depois do
// prazo); a faixa "a definir" so pode aparecer uma vez - na sugestao.
check(Boolean(eAceita) && tRelPlano.includes(eAceita.status)
  && (tRelPlano.match(/a definir \(faixa:/g) || []).length === 1,
  'a ação aceita sai no relatório com a data e o status do registro, e não com a faixa');

check(tPgr.includes('Fatores psicossociais: 13/13 avaliados; presentes:'), 'a seção 7.4 do PGR resume a avaliação psicossocial');
check(tPgr.includes('fora do inventário de riscos do GHE'), 'o PGR aponta o fator presente fora do inventário');
check(tPgr.includes('Adotar, com os trabalhadores, medida na organização do trabalho'), 'o plano do PGR traz a medida na organização do trabalho');

const tPgrAepInativa = gerar(exportPGRDocumentPdf, {
  client: CLIENTE, organization: ORG, ghes: GHES, units: [UNIDADE], employees: FUNCIONARIOS,
  ergonomicAssessments: [{ ...AEP_COM_PRESENTES, status: 'INACTIVE' }],
  risks: [RISCO_SOBRECARGA_G1],
});
check(tPgrAepInativa.includes('a AEP de origem não está mais ativa'), 'o PGR aponta risco psicossocial cuja AEP foi desativada');

const tRelSemAep = gerar(exportPsychosocialReportPdf, { client: CLIENTE, organization: ORG, ghes: GHES, risks: [] });
check(tRelSemAep.includes('Nenhuma avaliação ergonômica preliminar registrada'), 'sem AEP: o relatório diz que não há avaliação');
check(tRelSemAep.includes('não afirma ausência de risco'), 'sem AEP: o relatório não afirma ausência de risco');
const tRelCompleta = gerar(exportPsychosocialReportPdf, {
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [],
  ergonomicAssessments: [{ ...AEP_BASE, psychosocial: PSICO_COMPLETA }],
});
check(tRelCompleta.includes('Nenhum fator psicossocial foi constatado como presente'),
  'avaliação completa sem presentes: o relatório diz que nada foi constatado');
const tRelIncompleta = gerar(exportPsychosocialReportPdf, {
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [],
  ergonomicAssessments: [{ ...AEP_BASE, psychosocial: { estrategias: ['OFICINA'] } }],
});
check(tRelIncompleta.includes('não afirma ausência de risco') && !tRelIncompleta.includes('Nenhum fator psicossocial foi constatado'),
  'avaliação incompleta: o relatório não afirma ausência de risco');

// ===========================================================================
// 8. FORA DO S-2240, DO LTCAT E DOS LAUDOS
// ===========================================================================
console.log('\n— fora do S-2240, do LTCAT e dos laudos');

const tLtcat = gerar(exportLTCATDocumentPdf, {
  client: CLIENTE, organization: ORG, ghes: GHES, employees: FUNCIONARIOS,
  risks: [RISCO_RUIDO, RISCO_SOBRECARGA_G1, RISCO_POSTURA, RISCO_ACIDENTE],
});
check(tLtcat.includes('Ruído contínuo do climatizador'), 'o LTCAT traz o agente físico');
check(!tLtcat.includes('Fator de risco psicossocial'), 'o LTCAT não traz fator psicossocial como agente nocivo');
check(!tLtcat.includes('Postura sentada prolongada'), 'o LTCAT não traz fator ergonômico como agente nocivo');
check(!tLtcat.includes('Queda no mesmo nível'), 'o LTCAT não traz risco de acidente como agente nocivo');

const soPsico = montarCorpoInsalubridade([RISCO_SOBRECARGA_G1], GHES);
check(soPsico.inventarioVazio === true
  && soPsico.conclusao[0].includes('NENHUM AGENTE DA NR-15 NO INVENTÁRIO')
  && !soPsico.conclusao.join(' ').includes('Não existe agente de risco registrado'),
  'insalubridade com só fator psicossocial: "nenhum agente da NR-15", e não "inventário vazio"');
const vazio = montarCorpoInsalubridade([], GHES);
check(vazio.conclusao[0].includes('INVENTÁRIO DE RISCOS VAZIO')
  && vazio.pendencias.includes('Sem inventário, nenhum agente pôde ser confrontado com os limites de tolerância dos Anexos da NR-15.'),
  'insalubridade com inventário vazio: o texto de antes, intacto');
check(montarCorpoPericulosidade([], GHES).pendencias
  .includes('Sem inventário, nenhuma atividade ou operação pôde ser confrontada com os Anexos da NR-16.'),
  'periculosidade com inventário vazio: o texto de antes, intacto');
check(!soPsico.pendencias.join(' ').includes('Sem inventário'),
  'com fatores ergonômicos no inventário, o laudo não diz "sem inventário"');
const insalMisto = montarCorpoInsalubridade([RISCO_RUIDO, RISCO_SOBRECARGA_G1, RISCO_POSTURA], GHES);
check(!JSON.stringify(insalMisto).includes('Fator de risco psicossocial') && !JSON.stringify(insalMisto).includes('Postura sentada'),
  'o laudo de insalubridade não lista fator ergonômico nem psicossocial');
check(JSON.stringify(insalMisto.linhas).includes('Ruído contínuo'), 'o laudo de insalubridade continua listando o agente físico');
const pericMisto = montarCorpoPericulosidade([RISCO_ACIDENTE, RISCO_SOBRECARGA_G1], GHES);
check(!JSON.stringify(pericMisto).includes('Fator de risco psicossocial'), 'o laudo de periculosidade não lista fator psicossocial');
const pericSoPsico = montarCorpoPericulosidade([RISCO_SOBRECARGA_G1], GHES);
check(pericSoPsico.conclusao[0].includes('NENHUM RISCO DO INVENTÁRIO ALCANÇADO PELA NR-16'),
  'periculosidade com só fator psicossocial: diz que nada é alcançado pela NR-16');

const ctx = semComentarios(ler('context/PrevSafeContext.tsx'));
const corpoS2240 = corpoDe(ctx, 'const generateS2240FromGhe = useCallback(');
const filtroS2240 = (corpoS2240.match(/const risks = environmentalRisks\.filter\([\s\S]*?\);/) || [''])[0];
check(/codigoExisteNaTabela24\(r\.risk_code_table_24\)/.test(filtroS2240),
  'o S-2240 por GHE só leva agente que existe na Tabela 24');
check(/r\.status !== 'INACTIVE'/.test(filtroS2240), 'o S-2240 por GHE não leva risco inativo');

// ===========================================================================
// 9. CONTEXTO E TELAS
// ===========================================================================
console.log('\n— contexto e telas');

const iAdd = ctx.indexOf('const addEnvironmentalRisk = useCallback(');
const iLevar = ctx.indexOf('const levarFatorAoInventario = useCallback(');
check(iAdd > 0 && iLevar > iAdd,
  'levarFatorAoInventario vem depois de addEnvironmentalRisk (antes, a dependência quebraria a tela)');
const corpoLevar = corpoDe(ctx, 'const levarFatorAoInventario = useCallback(');
check(/conferirPedidoDeInventario\(/.test(corpoLevar) && /riscoDoFator\(/.test(corpoLevar),
  'o contexto usa as regras de lib/psicossocial.ts, sem regra própria');
check((ctx.match(/\blevarFatorAoInventario,/g) || []).length >= 2, 'levarFatorAoInventario é exposto no contexto');
const corpoDel = corpoDe(ctx, 'const deleteErgonomicAssessment = useCallback(');
const iLig = corpoDel.indexOf('riscosDaOrigem(');
const iRemove = corpoDel.indexOf('prev.filter(a => a.id !== id)');
check(iLig > 0 && iRemove > iLig, 'AEP com risco nascido dela é desativada antes de chegar à remoção');

const aba = semComentarios(ler('components/sst/ErgonomicAssessmentTab.tsx'));
check(/<AepPsychosocialModal\b/.test(aba), 'a aba abre a tela dos fatores psicossociais');
check(/faltasDeInventarioPsicossocial\(/.test(aba), 'a coluna "o que falta" confere o inventário');
check(/workers_heard_date:/.test(aba) && /workers_heard_count:/.test(aba), 'a oitiva grava data e número de ouvidos');

const modal = semComentarios(ler('components/sst/AepPsychosocialModal.tsx'));
const corpoLevarTela = corpoDe(modal, 'const levar = () =>');
check(corpoLevarTela.indexOf('updateErgonomicAssessment(') >= 0
  && corpoLevarTela.indexOf('updateErgonomicAssessment(') < corpoLevarTela.indexOf('levarFatorAoInventario('),
  'a tela grava a avaliação ANTES de levar o fator ao inventário');
check(/severidade: '',\s*probabilidade: ''/.test(modal), 'a tela não sugere severidade nem probabilidade');
check(/PGR_SEVERIDADE/.test(modal) && /PGR_PROBABILIDADE_ERGONOMICO/.test(modal),
  'a tela mostra os critérios do PGR ao escolher severidade e probabilidade');
check(!/name="(nome|trabalhador)/i.test(modal) && !/employees/.test(modal), 'a tela não lê nem grava trabalhador');

const corpoRelTela = (() => {
  const i = gerador.indexOf("activeDocType === 'PSICOSSOCIAL'");
  return i < 0 ? '' : gerador.slice(i, gerador.indexOf('});', i));
})();
check(/exportPsychosocialReportPdf\(/.test(corpoRelTela) && /risks: environmentalRisks/.test(corpoRelTela),
  'a aba de documentos gera o relatório com o inventário');

// ===========================================================================
console.log(`\n${casos - falhas}/${casos} casos passaram.`);
if (falhas > 0) {
  console.log(`${falhas} falha(s).`);
  process.exit(1);
}
console.log('Fatores psicossociais: na AEP, no inventário e no plano, fora do S-2240 e dos laudos, sem dado de pessoa.');
