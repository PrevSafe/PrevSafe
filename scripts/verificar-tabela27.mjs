/**
 * Verificacao da Tabela 27 do eSocial - Procedimentos Diagnosticos.
 *
 *   node scripts/verificar-tabela27.mjs
 *
 * O QUE ESTA SENDO PROVADO
 *
 * O codigo do exame era digitado a mao, e os SEIS protocolos que acompanhavam
 * o sistema tinham TODOS o codigo errado - carregavam codigos de agentes
 * quimicos e de anticorpos no lugar de exames:
 *
 *   0295 rotulado "Audiometria Tonal"   -> 0295 e Avaliacao clinica ocupacional
 *   0411 rotulado "Radiografia OIT"     -> 0411 e Clorofenol
 *   0281 rotulado "Espirometria"        -> 0281 e Audiometria tonal ocupacional
 *   0040 rotulado "Hemograma"           -> 0040 e 2-naftilamina
 *   0210 rotulado "Eletrocardiograma"   -> 0210 e Anticoagulante lupico
 *   0008 rotulado "Avaliacao Clinica"   -> 0008 e 1,2-gliceril dinitrato
 *
 * Um codigo errado no S-2220 declara ao governo um procedimento que nao foi
 * realizado, e o que foi feito deixa de constar.
 *
 * Este teste confere a integridade da transcricao (formato, duplicatas,
 * amostras contra o PDF), a busca, e que os protocolos semeados usam codigos
 * que existem e batem com a denominacao oficial.
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
const TMP = path.join(RAIZ, '.tmp-t27-verificacao');

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
      skipLibCheck: true,
      baseUrl: RAIZ,
      paths: { '@/*': ['./*'] },
    },
    files: [path.join(RAIZ, 'lib/tabela27.ts')],
  })
);

try {
  execFileSync('npx', ['tsc', '-p', TSCONFIG], { stdio: 'pipe', shell: true, cwd: RAIZ });
} catch (e) {
  inconclusivo('npx tsc falhou ao compilar lib/tabela27.ts', e.stdout?.toString() || e.message);
}

// Com UM só arquivo de origem o tsc emite plano; com vários, preserva a raiz
// comum e cria <TMP>/lib. Aceita os dois em vez de supor um.
const CANDIDATOS = [path.join(TMP, 'lib', 'tabela27.js'), path.join(TMP, 'tabela27.js')];
const COMPILADO = CANDIDATOS.find((p) => fs.existsSync(p));
if (!COMPILADO) {
  inconclusivo('o tsc não emitiu tabela27.js', CANDIDATOS.join('\n'));
}

fs.writeFileSync(path.join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const require_ = createRequire(import.meta.url);
let t27;
try {
  t27 = require_(COMPILADO);
} catch (e) {
  inconclusivo('não foi possível carregar o módulo compilado', e.message);
}

const {
  TABELA_27,
  TOTAL_PROCEDIMENTOS_TABELA_27,
  consultarProcedimento,
  codigoExisteNaTabela27,
  normalizarCodigoTabela27,
  buscarProcedimentos,
  PROCEDIMENTOS_FREQUENTES_PCMSO,
} = t27;

if (!TABELA_27) inconclusivo('lib/tabela27.ts não exportou TABELA_27');

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

// ---------------------------------------------------------------------------
// 1. Integridade da transcrição
// ---------------------------------------------------------------------------
console.log('--- integridade da transcrição ---');

const codigos = Object.keys(TABELA_27);
check(
  TOTAL_PROCEDIMENTOS_TABELA_27 === 1436,
  `a tabela tem 1436 procedimentos (achou ${TOTAL_PROCEDIMENTOS_TABELA_27})`
);

const foraDoFormato = codigos.filter((c) => !/^\d{4}$/.test(c));
check(
  foraDoFormato.length === 0,
  `todo código tem 4 dígitos${foraDoFormato.length ? `: ${foraDoFormato.slice(0, 5).join(', ')}` : ''}`
);

const semNome = codigos.filter((c) => !TABELA_27[c] || !TABELA_27[c].trim());
check(semNome.length === 0, `todo código tem denominação${semNome.length ? `: ${semNome.join(', ')}` : ''}`);

// Nome repetido é legítimo na tabela oficial (ex.: Campylobacter aparece duas
// vezes, com códigos diferentes), então não é falha — mas vale saber quantos.
const porNome = new Map();
codigos.forEach((c) => porNome.set(TABELA_27[c], (porNome.get(TABELA_27[c]) || 0) + 1));
const repetidos = [...porNome.entries()].filter(([, n]) => n > 1);
console.log(`     (${repetidos.length} denominação(ões) aparecem com mais de um código, como no PDF)`);

// ---------------------------------------------------------------------------
// 2. Amostras conferidas contra o PDF, linha a linha
// ---------------------------------------------------------------------------
console.log('\n--- amostras conferidas contra o PDF oficial ---');

const AMOSTRAS = [
  ['0001', '1,1-dicloro-2,2-bis (P-clorofeniletileno)'],
  ['0008', '1,2-gliceril dinitrato'],
  ['0040', '2-naftilamina'],
  ['0210', 'Anticoagulante lúpico'],
  ['0234', 'Hepatite B - HBsAG'],
  ['0281', 'Audiometria tonal ocupacional'],
  ['0295', 'Avaliação clínica ocupacional (anamnese e exame físico)'],
  ['0296', 'Avaliação da acuidade visual'],
  ['0300', 'Avaliação psicossocial'],
  ['0411', 'Clorofenol'],
  ['0530', 'ECG (Eletrocardiograma) convencional de até 12 derivações'],
  ['0536', 'EEG (Eletroencefalograma) de rotina'],
  ['0658', 'Glicemia'],
  ['0693', 'Hemograma com contagem de plaquetas ou frações (eritrograma, leucograma, plaquetas)'],
  ['1057', 'Prova de função pulmonar completa (ou espirometria)'],
  ['1078', 'Radiografia de tórax (PA) Padrão OIT (o mais recente), com dois leitores habilitados'],
  ['1415', 'Radiografia de tórax (PA) Padrão OIT (o mais recente), com pelo menos um leitor habilitado'],
  ['1397', 'α-naftol'],
  ['1398', '11-desoxicorticosterona'],
  ['1432', 'Exame oftalmológico com avaliação de retina e/ou cristalino'],
  ['9999', 'Outros procedimentos diagnósticos não descritos anteriormente'],
];

for (const [codigo, nome] of AMOSTRAS) {
  check(TABELA_27[codigo] === nome, `${codigo} = ${nome.slice(0, 60)}${nome.length > 60 ? '…' : ''}`);
}

// Códigos que o PDF NÃO traz (buracos reais na numeração oficial).
console.log('\n--- buracos da numeração oficial ---');
for (const ausente of ['0269', '0596', '0805', '0885', '1106', '0000', '1500']) {
  check(!TABELA_27[ausente], `${ausente} não existe na tabela (como no PDF)`);
}

// ---------------------------------------------------------------------------
// 3. Normalização
// ---------------------------------------------------------------------------
console.log('\n--- normalização do código ---');
check(normalizarCodigoTabela27('295') === '0295', 'completa zeros à esquerda: "295" → 0295');
check(normalizarCodigoTabela27('0295') === '0295', 'mantém o que já está certo');
check(
  normalizarCodigoTabela27('0295 - Avaliação clínica ocupacional') === '0295',
  'corta na separação: "0295 - Avaliação..." → 0295'
);
check(normalizarCodigoTabela27('0295 – Avaliação') === '0295', 'corta no travessão também');
check(normalizarCodigoTabela27('') === '', 'vazio devolve vazio, não inventa código');
check(normalizarCodigoTabela27(undefined) === '', 'undefined devolve vazio');
check(normalizarCodigoTabela27('abc') === '', 'texto sem dígito devolve vazio');

// ---------------------------------------------------------------------------
// 4. Consulta
// ---------------------------------------------------------------------------
console.log('\n--- consulta ---');
check(
  consultarProcedimento('281')?.nome === 'Audiometria tonal ocupacional',
  'consulta aceita código sem zeros à esquerda'
);
check(consultarProcedimento('0000') === null, 'código inexistente devolve null, não um palpite');
check(consultarProcedimento('') === null, 'código vazio devolve null');
check(codigoExisteNaTabela27('0295') === true, 'codigoExisteNaTabela27 confirma um que existe');
check(codigoExisteNaTabela27('0000') === false, 'e recusa um que não existe');

// ---------------------------------------------------------------------------
// 5. Busca
// ---------------------------------------------------------------------------
console.log('\n--- busca ---');
{
  const r = buscarProcedimentos('audiometria');
  check(r.length >= 4, `"audiometria" encontra os exames de audiometria (${r.length})`);
  check(
    r.some((p) => p.codigo === '0281'),
    'inclui 0281, a audiometria tonal ocupacional (a do PCMSO)'
  );

  const semAcento = buscarProcedimentos('avaliacao clinica ocupacional');
  check(
    semAcento.some((p) => p.codigo === '0295'),
    'busca sem acento encontra "Avaliação clínica ocupacional"'
  );

  const porCodigo = buscarProcedimentos('0295');
  check(porCodigo[0]?.codigo === '0295', 'busca por código exato traz o código primeiro');

  const espiro = buscarProcedimentos('espirometria');
  check(
    espiro.some((p) => p.codigo === '1057'),
    'busca por "espirometria" encontra 1057 (prova de função pulmonar)'
  );

  check(buscarProcedimentos('').length === 0, 'termo vazio não devolve a tabela inteira');
  check(
    buscarProcedimentos('zzzznaoexiste').length === 0,
    'termo sem correspondência devolve lista vazia, não uma aproximação'
  );
}

// ---------------------------------------------------------------------------
// 6. Lista de exames frequentes
// ---------------------------------------------------------------------------
console.log('\n--- atalho de exames comuns em PCMSO ---');
{
  const invalidos = PROCEDIMENTOS_FREQUENTES_PCMSO.filter((c) => !TABELA_27[c]);
  check(
    invalidos.length === 0,
    `todo código do atalho existe na tabela${invalidos.length ? `: ${invalidos.join(', ')}` : ''}`
  );
  const repetidosAtalho = PROCEDIMENTOS_FREQUENTES_PCMSO.filter(
    (c, i) => PROCEDIMENTOS_FREQUENTES_PCMSO.indexOf(c) !== i
  );
  check(repetidosAtalho.length === 0, 'sem código repetido no atalho');
}

// ---------------------------------------------------------------------------
// 7. Os protocolos que acompanham o sistema
// ---------------------------------------------------------------------------
console.log('\n--- protocolos semeados ---');
{
  const seed = fs.readFileSync(path.join(RAIZ, 'lib/seedData.ts'), 'utf8');
  const bloco = seed.slice(
    seed.indexOf('export const INITIAL_EXAM_PROTOCOLS'),
    seed.indexOf('export const INITIAL_EXAM_PROTOCOLS') + 6000
  );

  const encontrados = [...bloco.matchAll(/exam_code_table_27:\s*'(\d+)',\s*\n\s*exam_name:\s*'([^']+)'/g)];
  check(encontrados.length === 6, `os 6 protocolos modelo foram lidos (${encontrados.length})`);

  for (const [, codigo, nome] of encontrados) {
    const oficial = TABELA_27[codigo];
    check(!!oficial, `${codigo} existe na Tabela 27`);
    check(
      oficial === nome,
      `${codigo}: o nome cadastrado é a denominação oficial${oficial === nome ? '' : ` (cadastrado "${nome}", oficial "${oficial}")`}`
    );
  }

  // Os códigos antigos, que estavam errados, não podem ter voltado com o
  // rótulo errado junto.
  const ERRADOS = [
    ['0295', 'Audiometria'],
    ['0411', 'Radiografia'],
    ['0281', 'Espirometria'],
    ['0040', 'Hemograma'],
    ['0210', 'Eletrocardiograma'],
    ['0008', 'Avaliação Clínica'],
  ];
  for (const [codigo, rotuloErrado] of ERRADOS) {
    const casou = encontrados.some(
      ([, c, n]) => c === codigo && n.toLowerCase().includes(rotuloErrado.toLowerCase())
    );
    check(!casou, `${codigo} não voltou rotulado como "${rotuloErrado}"`);
  }
}

console.log(
  falhas === 0 ? `\nTODOS OS TESTES PASSARAM (${casos} casos)` : `\n${falhas} FALHA(S) em ${casos} casos`
);
process.exitCode = falhas === 0 ? 0 : 1;
