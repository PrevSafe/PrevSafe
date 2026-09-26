/**
 * Verificacao do catalogo de riscos ocupacionais.
 *
 *   node scripts/verificar-catalogo-riscos.mjs
 *
 * O QUE ESTA SENDO PROVADO
 *
 * 1. Codigo da Tabela 24. Os 25 agentes do catalogo tinham TODOS o codigo
 *    errado, porque o sistema tratava a Tabela 24 como a classificacao do PGR
 *    (01=fisico, 02=quimico). Ela nao e: 01 e QUIMICOS e 02 e FISICOS.
 *    "Ruido" estava com 01.01.001, que e Arsenio.
 *
 *    E 15 dos 25 nao devem ter codigo nenhum: risco ergonomico, de acidente,
 *    frio e radiacao nao-ionizante entram no PGR pela NR-01 mas nao constam do
 *    Anexo IV do Decreto 3.048/1999.
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

const {
  formatoDoCodigoTabela24,
  codigosDuplicados,
  GRUPOS_TABELA_24,
  TABELA_24,
  TOTAL_AGENTES_TABELA_24,
  consultarAgente,
  codigoExisteNaTabela24,
  buscarAgentes,
  CODIGO_AUSENCIA_DE_RISCO,
} = t24;
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
console.log('--- integridade da transcrição ---');
check(TOTAL_AGENTES_TABELA_24 === 92, `a tabela tem 92 agentes (achou ${TOTAL_AGENTES_TABELA_24})`);

{
  const codigos = Object.keys(TABELA_24);
  const foraDoFormato = codigos.filter((c) => !/^\d{2}\.\d{2}\.\d{3}$/.test(c));
  check(foraDoFormato.length === 0, `todo código tem a forma NN.NN.NNN${foraDoFormato.length ? `: ${foraDoFormato.join(', ')}` : ''}`);

  const semNome = codigos.filter((c) => !TABELA_24[c]?.nome?.trim());
  check(semNome.length === 0, 'todo agente tem denominação');

  const semGrupo = codigos.filter((c) => !GRUPOS_TABELA_24[c.slice(0, 2)]);
  check(semGrupo.length === 0, 'todo código pertence a um grupo declarado');
}

console.log('\n--- os grupos são os do PDF, não os do PGR ---');
// Este e o erro que originou tudo: o sistema assumia a classificacao do PGR.
check(GRUPOS_TABELA_24['01'] === 'Químicos', '01 é QUÍMICOS (não "Físico")');
check(GRUPOS_TABELA_24['02'] === 'Físicos', '02 é FÍSICOS (não "Químico")');
check(GRUPOS_TABELA_24['03'] === 'Biológicos', '03 é Biológicos');
check(/Associação/i.test(GRUPOS_TABELA_24['04']), '04 é Associação de agentes (não "Ergonômico")');
check(/Outros/i.test(GRUPOS_TABELA_24['05']), '05 é Outros agentes (não "Acidentes")');
check(/Ausência/i.test(GRUPOS_TABELA_24['09']), '09 é Ausência de agentes');
check(!Object.values(GRUPOS_TABELA_24).some((g) => /ergon/i.test(g)), 'não existe grupo ergonômico');
check(!Object.values(GRUPOS_TABELA_24).some((g) => /acidente/i.test(g)), 'não existe grupo de acidentes');

console.log('\n--- amostras conferidas contra o PDF ---');
const AMOSTRAS = [
  ['01.01.001', 'Arsênio e seus compostos'],
  ['01.02.001', 'Asbestos (ou amianto)'],
  ['01.08.001', 'Chumbo e seus compostos tóxicos'],
  ['01.14.001', 'Manganês e seus compostos'],
  ['01.17.001', 'Petróleo, xisto betuminoso, gás natural e seus derivados'],
  ['01.18.001', 'Sílica livre'],
  ['01.19.041', '3-poxipro-pano'],
  ['02.01.001', 'Ruído'],
  ['02.01.002', 'Vibrações localizadas (mão-braço)'],
  ['02.01.006', 'Radiações ionizantes'],
  ['03.01.005', 'Trabalhos em galerias, fossas e tranques de esgoto'],
  ['03.01.007', 'Coleta e industrialização do lixo'],
  ['04.01.002', 'Trabalhos em atividades permanentes no subsolo de minerações subterrâneas em frente de produção'],
  ['09.01.001', 'Ausência de agente nocivo ou de atividades previstas no Anexo IV do Decreto 3.048/1999'],
];
for (const [codigo, nome] of AMOSTRAS) {
  check(TABELA_24[codigo]?.nome === nome, `${codigo} = ${nome.slice(0, 55)}${nome.length > 55 ? '…' : ''}`);
}
check(
  TABELA_24['02.01.014']?.nome?.startsWith('Trabalhos com exposição ao calor'),
  '02.01.014 é a exposição ao calor (o catálogo usava esse código para fumos metálicos)'
);

console.log('\n--- buracos da numeração oficial ---');
for (const ausente of ['01.19.020', '01.19.037', '01.01.002', '02.01.019', '06.01.001']) {
  check(!TABELA_24[ausente], `${ausente} não existe na tabela (como no PDF)`);
}

console.log('\n--- formato e consulta ---');
check(formatoDoCodigoTabela24('02.01.001').valido, 'aceita 02.01.001');
check(formatoDoCodigoTabela24('0201001').codigo === '02.01.001', 'normaliza sem pontos');
check(
  formatoDoCodigoTabela24('02.01.001 - Ruído').codigo === '02.01.001',
  'ignora o sufixo descritivo'
);
check(formatoDoCodigoTabela24('02.01.001').grupo === 'Físicos', 'identifica o grupo pelo prefixo');
check(!formatoDoCodigoTabela24('1.1.1').valido, 'recusa 1.1.1 (dígitos de menos)');
check(!formatoDoCodigoTabela24('ruído').valido, 'recusa texto');
check(!formatoDoCodigoTabela24('').valido, 'recusa vazio');
check(!formatoDoCodigoTabela24('99.01.001').valido, 'recusa grupo inexistente (99)');
check(formatoDoCodigoTabela24('').codigo === '', 'inválido devolve código vazio, não um palpite');

check(consultarAgente('02.01.001')?.nome === 'Ruído', 'consulta devolve o agente');
check(consultarAgente('0201001')?.codigo === '02.01.001', 'consulta aceita sem pontos');
check(consultarAgente('06.01.001') === null, 'código de grupo inexistente devolve null');
check(consultarAgente('01.19.020') === null, 'buraco da numeração devolve null, não um vizinho');
check(codigoExisteNaTabela24('01.18.001') === true, 'confirma um que existe');
check(codigoExisteNaTabela24('') === false, 'vazio não "existe"');
check(CODIGO_AUSENCIA_DE_RISCO === '09.01.001', 'a ausência de agente é 09.01.001');

console.log('\n--- busca ---');
{
  const r = buscarAgentes('ruído');
  check(r[0]?.codigo === '02.01.001', 'busca por "ruído" traz 02.01.001 primeiro');
  check(
    buscarAgentes('ruido').some((a) => a.codigo === '02.01.001'),
    'busca sem acento também encontra'
  );
  check(
    buscarAgentes('silica').some((a) => a.codigo === '01.18.001'),
    'encontra sílica livre sem acento'
  );
  check(buscarAgentes('02.01.001')[0]?.codigo === '02.01.001', 'busca por código exato');
  check(buscarAgentes('').length === 0, 'termo vazio não devolve a tabela inteira');
  check(
    buscarAgentes('zzzznaoexiste').length === 0,
    'termo sem correspondência devolve vazio, não uma aproximação'
  );
  check(
    buscarAgentes('ergonômico').length === 0,
    'não existe agente ergonômico na Tabela 24'
  );
}

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

  const itens = [...fonte.matchAll(/code_table_24: '([^']*)',\s*\n\s*name: '([^']+)'/g)].map(
    ([, code_table_24, name]) => ({ code_table_24, name })
  );
  check(itens.length === 25, `os 25 agentes do catálogo foram lidos (${itens.length})`);

  const comCodigo = itens.filter((i) => i.code_table_24);
  const semCodigo = itens.filter((i) => !i.code_table_24);
  check(comCodigo.length === 10, `10 agentes com código do Anexo IV (${comCodigo.length})`);
  check(semCodigo.length === 15, `15 sem código — risco do PGR fora do Anexo IV (${semCodigo.length})`);

  const inexistentes = comCodigo.filter((i) => !codigoExisteNaTabela24(i.code_table_24));
  check(
    inexistentes.length === 0,
    `todo código preenchido existe na Tabela 24${
      inexistentes.length ? `: ${inexistentes.map((i) => `${i.code_table_24} (${i.name})`).join('; ')}` : ''
    }`
  );

  console.log('\n--- o enquadramento de cada agente ---');
  const ESPERADO = [
    ['Ruído Contínuo ou Intermitente', '02.01.001'],
    ['Ruído de Impacto', '02.01.001'],
    ['Calor e Sobrecarga Térmica (IBUTG)', '02.01.014'],
    ['Vibrações de Corpo Inteiro (VCI)', '02.01.003'],
    ['Vibrações de Mãos e Braços (VMB)', '02.01.002'],
    ['Poeiras Minerais / Sílica Livre Cristalizada (Quartzo)', '01.18.001'],
    ['Óleos Minerais e Graxas Derivadas de Petróleo', '01.17.001'],
    ['Microorganismos Patogênicos (Vírus, Bactérias, Fungos em Saúde)', '03.01.001'],
    ['Contato com Esgotos, Galerias e Resíduos Urbanos', '03.01.005'],
    ['Ausência de Fatores de Risco Físicos, Químicos ou Biológicos Nocivos', '09.01.001'],
  ];
  for (const [nome, codigo] of ESPERADO) {
    const item = itens.find((i) => i.name === nome);
    check(item?.code_table_24 === codigo, `"${nome.slice(0, 44)}…" → ${codigo}`);
  }

  console.log('\n--- os que NÃO podem ter código ---');
  // Se algum destes ganhar um codigo, alguem voltou a tratar a Tabela 24 como
  // se fosse o inventario do PGR.
  const SEM_AGENTE = [
    'Radiações Não-Ionizantes (UV / Infravermelho de Solda e Laser)',
    'Frio e Câmaras Frigoríficas',
    'Ácidos e Álcalis Cáusticos (Ácido Sulfúrico, Clorídrico, Soda Cáustica)',
    'Levantamento, Transporte e Descarga Manual de Cargas Pesadas',
    'Exigência de Posturas Incômodas, Estáticas ou Forçadas por Longos Períodos',
    'Movimentos Repetitivos de Membros Superiores (Digitação, Montagem)',
    'Risco de Queda com Diferença de Nível / Trabalho em Altura (NR-35)',
    'Máquinas e Equipamentos sem Proteção Móvel ou Fixa (NR-12)',
    'Eletricidade / Choque Elétrico e Arco Voltaico (NR-10)',
    'Espaço Confinado / Asfixia e Atmosferas Perigosas (NR-33)',
    'Incêndio e Explosão / Inflamáveis e Combustíveis (NR-20)',
    'Projeção de Fragmentos, Partículas Volantes e Respingo de Líquidos',
    'Atropelamento e Colisão por Empilhadeiras e Veículos Industriais (NR-11)',
  ];
  for (const nome of SEM_AGENTE) {
    const item = itens.find((i) => i.name === nome);
    check(item && !item.code_table_24, `"${nome.slice(0, 44)}…" sem código`);
  }

  // Cada um sem codigo precisa EXPLICAR por que, senao parece cadastro
  // incompleto.
  const notas = [...fonte.matchAll(/esocial_enquadramento_nota: '/g)];
  check(notas.length >= 15, `${notas.length} agentes trazem a nota de enquadramento`);

  console.log('\n--- os códigos que estavam errados ---');
  // "Ruido" com 01.01.001 (Arsenio) foi o caso que revelou o problema.
  const ruido = itens.find((i) => i.name === 'Ruído Contínuo ou Intermitente');
  check(ruido?.code_table_24 !== '01.01.001', 'Ruído não está mais com 01.01.001 (Arsênio)');
  const silica = itens.find((i) => /Sílica Livre/.test(i.name));
  check(silica?.code_table_24 !== '02.01.001', 'Sílica não está mais com 02.01.001 (Ruído)');
  const fumos = itens.find((i) => /Fumos Metálicos/.test(i.name));
  check(
    fumos?.code_table_24 !== '02.01.014',
    'Fumos metálicos não está mais com 02.01.014 (exposição ao calor)'
  );
  const queda = itens.find((i) => /Queda com Diferença de Nível/.test(i.name));
  const ausencia = itens.find((i) => /Ausência de Fatores de Risco/.test(i.name));
  check(
    queda?.code_table_24 !== ausencia?.code_table_24,
    'queda em altura e ausência de risco não compartilham mais o código'
  );

  // Exames: continuam conferidos contra a Tabela 27.
  console.log('\n--- exames sugeridos (Tabela 27) ---');
  const exames = [...fonte.matchAll(/exam_code: '(\d+)', exam_name: '([^']*)'/g)];
  check(exames.length > 0, `${exames.length} exames sugeridos no catálogo`);
  const examesRuins = exames.filter(([, c]) => !TABELA_27[c]);
  check(
    examesRuins.length === 0,
    `todo código de exame existe na Tabela 27${
      examesRuins.length ? `: ${[...new Set(examesRuins.map(([, c]) => c))].join(', ')}` : ''
    }`
  );
  const nomeDiverge = exames.filter(([, c, n]) => TABELA_27[c] && TABELA_27[c] !== n.replace(/\\'/g, "'"));
  check(nomeDiverge.length === 0, 'todo exame usa a denominação oficial da Tabela 27');
  check(
    exames.some(([, c, n]) => c === '0281' && /Audiometria tonal ocupacional/.test(n)),
    '0281 continua sendo a audiometria tonal ocupacional'
  );
}

console.log(
  falhas === 0 ? `\nTODOS OS TESTES PASSARAM (${casos} casos)` : `\n${falhas} FALHA(S) em ${casos} casos`
);
process.exitCode = falhas === 0 ? 0 : 1;
