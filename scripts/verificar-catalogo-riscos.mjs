/**
 * Verificacao do catalogo de riscos ocupacionais.
 *
 *   node scripts/verificar-catalogo-riscos.mjs
 *
 * O QUE ESTA SENDO PROVADO
 *
 * 1. Codigo da Tabela 24: formato e unicidade. O catalogo tinha 05.01.001 em
 *    DOIS itens opostos - "Risco de Queda em Altura" e "Ausencia de Fatores de
 *    Risco" -, e o segundo ainda estava no grupo 05 (acidentes) em vez do
 *    grupo de ausencia de risco.
 *
 * 2. Codigo dos exames sugeridos: os 13 codigos distintos que o catalogo usava
 *    estavam TODOS errados - apontavam para agentes quimicos e anticorpos.
 *    0281 e 0295 estavam inclusive TROCADOS entre si.
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
const TMP = path.join(RAIZ, '.tmp-catalogo-verificacao');

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
    files: [path.join(RAIZ, 'lib/tabela24.ts'), path.join(RAIZ, 'lib/tabela27.ts')],
  })
);

try {
  execFileSync('npx', ['tsc', '-p', TSCONFIG], { stdio: 'pipe', shell: true, cwd: RAIZ });
} catch (e) {
  inconclusivo('npx tsc falhou', e.stdout?.toString() || e.message);
}

const achar = (nome) =>
  [path.join(TMP, 'lib', nome), path.join(TMP, nome)].find((p) => fs.existsSync(p));

const CAMINHO_T24 = achar('tabela24.js');
const CAMINHO_T27 = achar('tabela27.js');
if (!CAMINHO_T24 || !CAMINHO_T27) inconclusivo('o tsc não emitiu os módulos');

fs.writeFileSync(path.join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const require_ = createRequire(import.meta.url);
let t24;
let t27;
try {
  t24 = require_(CAMINHO_T24);
  t27 = require_(CAMINHO_T27);
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}

const { formatoDoCodigoTabela24, codigosDuplicados, GRUPOS_TABELA_24 } = t24;
const { TABELA_27 } = t27;

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

// ---------------------------------------------------------------------------
// 1. Formato do código da Tabela 24
// ---------------------------------------------------------------------------
console.log('--- formato do código da Tabela 24 ---');
check(formatoDoCodigoTabela24('01.01.001').valido, 'aceita 01.01.001');
check(formatoDoCodigoTabela24('0101001').codigo === '01.01.001', 'normaliza sem pontos → 01.01.001');
check(
  formatoDoCodigoTabela24('01.01.001 - Ruído contínuo').codigo === '01.01.001',
  'ignora o sufixo descritivo'
);
check(formatoDoCodigoTabela24('01.01.001').grupo === 'Físico', 'identifica o grupo pelo prefixo');
check(formatoDoCodigoTabela24('09.01.001').grupo === 'Ausência de fator de risco', 'grupo 09 reconhecido');
check(!formatoDoCodigoTabela24('1.1.1').valido, 'recusa 1.1.1 (dígitos de menos)');
check(!formatoDoCodigoTabela24('audiometria').valido, 'recusa texto');
check(!formatoDoCodigoTabela24('').valido, 'recusa vazio');
check(!formatoDoCodigoTabela24(undefined).valido, 'recusa undefined');
check(!formatoDoCodigoTabela24('99.01.001').valido, 'recusa grupo inexistente (99)');
check(
  formatoDoCodigoTabela24('').codigo === '',
  'inválido devolve código vazio, não um palpite'
);
check(Object.keys(GRUPOS_TABELA_24).length === 6, 'os 6 grupos estão declarados');

// ---------------------------------------------------------------------------
// 2. Duplicatas
// ---------------------------------------------------------------------------
console.log('\n--- detecção de código repetido ---');
{
  const dupes = codigosDuplicados([
    { code_table_24: '01.01.001', name: 'Ruído' },
    { code_table_24: '01.01.001', name: 'Calor' },
    { code_table_24: '02.01.001', name: 'Poeira' },
  ]);
  check(dupes.length === 1 && dupes[0].codigo === '01.01.001', 'encontra o código repetido');
  check(dupes[0].nomes.length === 2, 'e diz em quais agentes ele está');
  check(
    codigosDuplicados([{ code_table_24: '01.01.001', name: 'Ruído' }]).length === 0,
    'sem repetição, não acusa nada'
  );
}

// ---------------------------------------------------------------------------
// 3. O catálogo que acompanha o sistema
// ---------------------------------------------------------------------------
console.log('\n--- catálogo de riscos do sistema ---');
{
  const fonte = fs.readFileSync(path.join(RAIZ, 'lib/occupationalRisksCatalogData.ts'), 'utf8');

  const itens = [...fonte.matchAll(/code_table_24: '([^']+)',\s*\n\s*name: '([^']+)'/g)].map(
    ([, code_table_24, name]) => ({ code_table_24, name })
  );
  check(itens.length === 25, `os 25 agentes do catálogo foram lidos (${itens.length})`);

  const foraDoFormato = itens.filter((i) => !formatoDoCodigoTabela24(i.code_table_24).valido);
  check(
    foraDoFormato.length === 0,
    `todo código tem a forma NN.NN.NNN com grupo válido${
      foraDoFormato.length ? `: ${foraDoFormato.map((i) => i.code_table_24).join(', ')}` : ''
    }`
  );

  const dupes = codigosDuplicados(itens);
  check(
    dupes.length === 0,
    `nenhum código repetido${dupes.length ? `: ${dupes.map((d) => `${d.codigo} (${d.nomes.join(' / ')})`).join('; ')}` : ''}`
  );

  // A ausência de risco não pode voltar para o grupo 05 nem para o código do
  // risco de queda.
  const ausencia = itens.find((i) => /Ausência de Fatores de Risco/i.test(i.name));
  check(!!ausencia, 'o item de ausência de fator de risco existe');
  check(
    ausencia?.code_table_24?.startsWith('09.'),
    `a ausência de risco está no grupo 09, não no 05 (está em ${ausencia?.code_table_24})`
  );

  // Códigos de exame: todos têm de existir na Tabela 27 e com o nome oficial.
  const exames = [...fonte.matchAll(/exam_code: '(\d+)', exam_name: '([^']*)'/g)];
  check(exames.length > 0, `${exames.length} exames sugeridos no catálogo`);

  const inexistentes = exames.filter(([, c]) => !TABELA_27[c]);
  check(
    inexistentes.length === 0,
    `todo código de exame existe na Tabela 27${
      inexistentes.length ? `: ${[...new Set(inexistentes.map(([, c]) => c))].join(', ')}` : ''
    }`
  );

  const nomeDiverge = exames.filter(([, c, n]) => TABELA_27[c] && TABELA_27[c] !== n.replace(/\\'/g, "'"));
  check(
    nomeDiverge.length === 0,
    `todo exame usa a denominação oficial${
      nomeDiverge.length ? `: ${nomeDiverge.slice(0, 3).map(([, c, n]) => `${c}="${n}"`).join('; ')}` : ''
    }`
  );

  // Os 13 códigos que estavam errados não podem voltar com o rótulo de antes.
  console.log('\n--- os códigos que estavam trocados ---');
  const TROCADOS = [
    ['0008', /Avalia|Cl[íi]nic/i, 'Avaliação Clínica'],
    ['0040', /Hemograma/i, 'Hemograma'],
    ['0042', /Glicemia/i, 'Glicemia'],
    ['0112', /Acuidade|Psicossocial|Oftalmol/i, 'Acuidade / Psicossocial'],
    ['0210', /Eletrocardiograma|ECG/i, 'ECG'],
    ['0215', /Eletroencefalograma|EEG/i, 'EEG'],
    ['0281', /Espirometria/i, 'Espirometria'],
    ['0295', /Audiometria/i, 'Audiometria'],
    ['0310', /Sorologia/i, 'Sorologias'],
    ['0312', /Leptospirose/i, 'Leptospirose'],
    ['0411', /Radiografia/i, 'Radiografia'],
    ['0415', /Radiografia|Osteomuscular/i, 'Radiografia de Coluna'],
    ['0514', /Hip[úu]rico/i, 'Ácido Hipúrico'],
  ];
  for (const [codigo, regex, rotulo] of TROCADOS) {
    const voltou = exames.some(([, c, n]) => c === codigo && regex.test(n));
    check(!voltou, `${codigo} não voltou rotulado como "${rotulo}"`);
  }

  // E os dois que estavam trocados entre si precisam estar no lugar certo.
  check(
    exames.some(([, c, n]) => c === '0281' && /Audiometria tonal ocupacional/.test(n)),
    '0281 agora é a audiometria tonal ocupacional (era a espirometria)'
  );
  check(
    exames.some(([, c, n]) => c === '0295' && /Avaliação clínica ocupacional/.test(n)),
    '0295 agora é a avaliação clínica ocupacional (era a audiometria)'
  );
}

console.log(
  falhas === 0 ? `\nTODOS OS TESTES PASSARAM (${casos} casos)` : `\n${falhas} FALHA(S) em ${casos} casos`
);
process.exitCode = falhas === 0 ? 0 : 1;
