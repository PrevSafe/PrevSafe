// Verifica os quadros de dimensionamento de CIPA contra casos conferidos um a
// um no texto oficial, e prova que as funcoes NAO estimam quando falta dado.
/**
 * Verificacao dos quadros de dimensionamento da CIPA.
 *
 *   node scripts/verificar-nr5.mjs
 *
 * Compila lib/nr5Quadros.ts, lib/cipaQuadrosSetoriais.ts e lib/cipaService.ts
 * para uma pasta temporaria e confere:
 *   - o Quadro I da NR-05 (grau de risco x faixa de empregados), celula a
 *     celula, contra o PDF oficial;
 *   - o Quadro 2 da NR-31 (CIPATR) e o Quadro III da NR-22 (CIPAMIN);
 *   - a regra de NUNCA estimar: sem grau de risco ou sem numero de empregados,
 *     o resultado e 'NAO_DIMENSIONADO' e nao um numero;
 *   - que calculateCipaDimensioning nao tem mais default de grau 3 / 100
 *     empregados nem adivinhacao de argumentos.
 *
 * Saida: 0 tudo passou, 1 houve falha, 2 INCONCLUSIVO (nao deu para verificar).
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const TMP = path.join(RAIZ, '.tmp-nr5-verificacao');

function inconclusivo(motivo, detalhe) {
  console.log('\nINCONCLUSIVO — a verificação não pôde ser executada.');
  console.log(`motivo: ${motivo}`);
  if (detalhe) console.log(String(detalhe).split('\n').slice(0, 20).join('\n'));
  process.exit(2);
}

// Blocos que nao puderam ser executados. Um teste que pula metade dos casos e
// mesmo assim anuncia "TODOS OS TESTES PASSARAM" e pior que nenhum teste: da
// confianca que nao foi conquistada.
const pulados = [];

fs.rmSync(TMP, { recursive: true, force: true });

try {
  execFileSync(
    'npx',
    [
      'tsc',
      'lib/nr5Quadros.ts',
      'lib/cipaQuadrosSetoriais.ts',
      '--outDir',
      TMP,
      '--module',
      'commonjs',
      '--target',
      'es2020',
      '--moduleResolution',
      'node',
      '--skipLibCheck',
    ],
    { stdio: 'pipe', shell: true, cwd: RAIZ }
  );
} catch (e) {
  inconclusivo('npx tsc falhou ao compilar os quadros', e.stdout?.toString() || e.message);
}

fs.writeFileSync(path.join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const require_ = createRequire(import.meta.url);
let nr5;
let setoriais;
try {
  nr5 = require_(path.join(TMP, 'nr5Quadros.js'));
  setoriais = require_(path.join(TMP, 'cipaQuadrosSetoriais.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}

const { consultarQuadroI, NR5_QUADRO_I, NR5_FAIXAS_QUADRO_I, NR5_CARGA_HORARIA_TREINAMENTO } = nr5;
const { consultarQuadroCipatr, consultarQuadroCipamin } = setoriais;

if (typeof consultarQuadroI !== 'function' || !NR5_QUADRO_I) {
  inconclusivo('lib/nr5Quadros.ts não exportou consultarQuadroI/NR5_QUADRO_I');
}

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

// ---------------------------------------------------------------------------
// 1. Integridade estrutural do Quadro I
// ---------------------------------------------------------------------------
console.log('--- integridade estrutural do Quadro I da NR-05 ---');
check(NR5_FAIXAS_QUADRO_I.length === 13, `o Quadro I tem 13 faixas impressas (achou ${NR5_FAIXAS_QUADRO_I.length})`);
for (const g of [1, 2, 3, 4]) {
  const l = NR5_QUADRO_I[g];
  check(
    l.efetivos.length === 13 && l.suplentes.length === 13,
    `grau ${g}: 13 valores de efetivos e 13 de suplentes`
  );
  const efetivosPreenchidos = l.efetivos.filter((v) => v !== null);
  const crescente = efetivosPreenchidos.every((v, i) => i === 0 || v >= efetivosPreenchidos[i - 1]);
  check(crescente, `grau ${g}: efetivos não decrescem ao longo das faixas`);
}
// faixas contiguas, sem buraco nem sobreposicao
let contiguas = true;
for (let i = 1; i < NR5_FAIXAS_QUADRO_I.length; i++) {
  if (NR5_FAIXAS_QUADRO_I[i].min !== NR5_FAIXAS_QUADRO_I[i - 1].max + 1) contiguas = false;
}
check(contiguas, 'faixas do Quadro I são contíguas (sem buraco entre 2.000 e 3.500, como na tabela antiga)');

// ---------------------------------------------------------------------------
// 2. Casos lidos um a um do Quadro I oficial (PDF NR05atualizada2023, pág. 11)
//    [grau, empregados, efetivos esperados, suplentes esperados, descrição]
// ---------------------------------------------------------------------------
console.log('\n--- Quadro I da NR-05: casos conferidos no texto oficial ---');
const CASOS_QUADRO_I = [
  // Grau 1 — primeira coluna preenchida é 81 a 100
  [1, 81, 1, 1, 'GR1, faixa 81 a 100'],
  [1, 100, 1, 1, 'GR1, limite superior de 81 a 100'],
  [1, 300, 1, 1, 'GR1, faixa 141 a 300'],
  [1, 301, 2, 2, 'GR1, faixa 301 a 500'],
  [1, 1000, 4, 3, 'GR1, faixa 501 a 1000'],
  [1, 2500, 5, 4, 'GR1, faixa 1001 a 2500'],
  [1, 5000, 6, 5, 'GR1, faixa 2501 a 5000'],
  [1, 10000, 8, 6, 'GR1, faixa 5001 a 10.000'],
  // Grau 2 — primeira coluna preenchida é 51 a 80
  [2, 51, 1, 1, 'GR2, faixa 51 a 80'],
  [2, 101, 2, 1, 'GR2, faixa 101 a 120'],
  [2, 141, 3, 2, 'GR2, faixa 141 a 300'],
  [2, 500, 4, 3, 'GR2, faixa 301 a 500'],
  [2, 1000, 5, 4, 'GR2, faixa 501 a 1000'],
  [2, 5000, 8, 6, 'GR2, faixa 2501 a 5000'],
  [2, 10000, 10, 8, 'GR2, faixa 5001 a 10.000'],
  // Grau 3 — primeira coluna preenchida é 20 a 29
  [3, 20, 1, 1, 'GR3, faixa 20 a 29'],
  [3, 30, 1, 1, 'GR3, faixa 30 a 50'],
  [3, 51, 2, 1, 'GR3, faixa 51 a 80'],
  [3, 100, 2, 1, 'GR3, faixa 81 a 100'],
  [3, 120, 2, 1, 'GR3, faixa 101 a 120'],
  [3, 140, 3, 2, 'GR3, faixa 121 a 140'],
  [3, 300, 4, 2, 'GR3, faixa 141 a 300'],
  [3, 500, 5, 4, 'GR3, faixa 301 a 500'],
  [3, 1000, 6, 4, 'GR3, faixa 501 a 1000'],
  [3, 2500, 8, 6, 'GR3, faixa 1001 a 2500'],
  [3, 5000, 10, 8, 'GR3, faixa 2501 a 5000'],
  [3, 10000, 12, 8, 'GR3, faixa 5001 a 10.000'],
  // Grau 4
  [4, 20, 1, 1, 'GR4, faixa 20 a 29'],
  [4, 30, 2, 1, 'GR4, faixa 30 a 50'],
  [4, 51, 3, 2, 'GR4, faixa 51 a 80'],
  [4, 100, 3, 2, 'GR4, faixa 81 a 100'],
  [4, 120, 4, 2, 'GR4, faixa 101 a 120'],
  [4, 140, 4, 2, 'GR4, faixa 121 a 140'],
  [4, 300, 4, 3, 'GR4, faixa 141 a 300'],
  [4, 500, 5, 4, 'GR4, faixa 301 a 500'],
  [4, 1000, 6, 5, 'GR4, faixa 501 a 1000'],
  [4, 2500, 9, 7, 'GR4, faixa 1001 a 2500'],
  [4, 5000, 11, 8, 'GR4, faixa 2501 a 5000'],
  [4, 10000, 13, 10, 'GR4, faixa 5001 a 10.000'],
];

for (const [grau, emp, ef, sup, desc] of CASOS_QUADRO_I) {
  const r = consultarQuadroI(grau, emp);
  const ok = r.status === 'CIPA' && r.efetivos === ef && r.suplentes === sup;
  check(ok, `GR${grau} / ${String(emp).padStart(5)} empregados -> ${r.efetivos}ef ${r.suplentes}sup (esperado ${ef}ef ${sup}sup) · ${desc}`);
}

// ---------------------------------------------------------------------------
// 3. Celulas EM BRANCO do quadro oficial: não é CIPA, é representante (5.4.13)
// ---------------------------------------------------------------------------
console.log('\n--- células em branco do Quadro I -> representante da NR-05 (item 5.4.13) ---');
const SEM_ENQUADRAMENTO = [
  [1, 19, 'GR1 com 19 empregados'],
  [1, 80, 'GR1 com 80 empregados (coluna 51 a 80 em branco no grau 1)'],
  [2, 50, 'GR2 com 50 empregados (coluna 30 a 50 em branco no grau 2)'],
  [3, 19, 'GR3 com 19 empregados (coluna 0 a 19 em branco em todos os graus)'],
  [4, 19, 'GR4 com 19 empregados'],
  [4, 0, 'GR4 sem empregados'],
];
for (const [grau, emp, desc] of SEM_ENQUADRAMENTO) {
  const r = consultarQuadroI(grau, emp);
  const ok = r.status === 'REPRESENTANTE_NR05' && r.efetivos === null && r.suplentes === null;
  check(ok, `GR${grau} / ${emp} -> ${r.status}, efetivos ${r.efetivos} · ${desc}`);
}

// ---------------------------------------------------------------------------
// 4. NÃO PODE ESTIMAR
// ---------------------------------------------------------------------------
console.log('\n--- não pode estimar ---');
const SEM_DADO = [
  [null, 100, 'grau de risco null'],
  [undefined, 100, 'grau de risco undefined'],
  [0, 100, 'grau de risco 0 (inválido)'],
  [5, 100, 'grau de risco 5 (inválido)'],
  ['3', 100, 'grau de risco como string (não é 1|2|3|4)'],
  [3, null, 'número de empregados null'],
  [3, undefined, 'número de empregados undefined'],
  [3, NaN, 'número de empregados NaN'],
  [3, -10, 'número de empregados negativo'],
];
for (const [grau, emp, desc] of SEM_DADO) {
  const r = consultarQuadroI(grau, emp);
  const ok = r.status === 'NAO_DIMENSIONADO' && r.efetivos === null && r.suplentes === null;
  check(ok, `${desc} -> ${r.status}, efetivos ${r.efetivos} (não estimou)`);
  if (ok) {
    check(
      typeof r.fundamentacao === 'string' && r.fundamentacao.length > 20,
      `${desc} -> a resposta explica ao usuário o que informar`
    );
  }
}

// ---------------------------------------------------------------------------
// 5. Carga horária do treinamento — NR-05, item 5.7.4
// ---------------------------------------------------------------------------
console.log('\n--- carga horária do treinamento (item 5.7.4) ---');
for (const [grau, horas] of [[1, 8], [2, 12], [3, 16], [4, 20]]) {
  check(NR5_CARGA_HORARIA_TREINAMENTO[grau] === horas, `grau ${grau} -> ${horas}h`);
}

// ---------------------------------------------------------------------------
// 6. CIPATR — Quadro 2 da NR-31 (não usa grau de risco)
// ---------------------------------------------------------------------------
console.log('\n--- CIPATR: Quadro 2 da NR-31 ---');
const CASOS_CIPATR = [
  [20, 1, 'faixa 20 a 35'],
  [35, 1, 'limite superior de 20 a 35'],
  [36, 2, 'faixa 36 a 70'],
  [71, 3, 'faixa 71 a 100'],
  [101, 4, 'faixa 101 a 500'],
  [501, 5, 'faixa 501 a 1000'],
  [1001, 6, 'faixa acima de 1000'],
  [50000, 6, 'muito acima de 1000 continua na última faixa'],
];
for (const [emp, membros, desc] of CASOS_CIPATR) {
  const r = consultarQuadroCipatr(emp);
  const ok =
    r.status === 'CIPA' && r.titularesEmpregados === membros && r.titularesEmpregador === membros;
  check(ok, `${String(emp).padStart(5)} trabalhadores -> ${r.titularesEmpregados} representantes de cada parte (esperado ${membros}) · ${desc}`);
}
{
  const r = consultarQuadroCipatr(100);
  check(r.suplentesEmpregados === null, 'CIPATR: o Quadro 2 não tem coluna de suplentes -> suplentes null (não inventou)');
}
{
  const r = consultarQuadroCipatr(19);
  check(r.status === 'REPRESENTANTE_NR05', 'CIPATR: 19 trabalhadores não se enquadram (obrigatória a partir de 20, item 31.5.2)');
}
{
  const r = consultarQuadroCipatr(null);
  check(r.status === 'NAO_DIMENSIONADO' && r.titularesEmpregados === null, 'CIPATR sem número de trabalhadores -> não dimensionado');
}

// ---------------------------------------------------------------------------
// 7. CIPAMIN — Quadro III da NR-22 (não usa grau de risco)
// ---------------------------------------------------------------------------
console.log('\n--- CIPAMIN: Quadro III da NR-22 ---');
const CASOS_CIPAMIN = [
  [15, 1, 1, 'faixa 15 a 30'],
  [31, 2, 1, 'faixa 31 a 50'],
  [51, 3, 1, 'faixa 51 a 100'],
  [101, 4, 1, 'faixa 101 a 250'],
  [251, 5, 2, 'faixa 251 a 500'],
  [501, 6, 2, 'faixa 501 a 1.000'],
  [1001, 9, 3, 'faixa 1.001 a 2.500'],
  [2501, 12, 4, 'faixa 2.501 a 5.000'],
];
for (const [emp, tit, sup, desc] of CASOS_CIPAMIN) {
  const r = consultarQuadroCipamin(emp);
  const ok = r.status === 'CIPA' && r.titularesEmpregados === tit && r.suplentesEmpregados === sup;
  check(ok, `${String(emp).padStart(5)} empregados -> ${r.titularesEmpregados}tit ${r.suplentesEmpregados}sup (esperado ${tit}/${sup}) · ${desc}`);
}
{
  const r = consultarQuadroCipamin(3000);
  check(
    r.titularesEmpregador === 1 && r.suplentesEmpregador === 1,
    'CIPAMIN: representação do empregador é 1 titular + 1 suplente em todas as faixas'
  );
}
{
  // 5.500 = 5.000 + 1 grupo de 500 -> 12+4 titulares, 4+2 suplentes
  const r = consultarQuadroCipamin(5500);
  check(
    r.titularesEmpregados === 16 && r.suplentesEmpregados === 6 && r.titularesEmpregador === 1,
    `CIPAMIN 5.500 -> ${r.titularesEmpregados}tit ${r.suplentesEmpregados}sup dos empregados (esperado 16/6) e empregador sem acréscimo ("---" no quadro)`
  );
}
{
  const r = consultarQuadroCipamin(14);
  check(r.status === 'REPRESENTANTE_NR05', 'CIPAMIN: 14 empregados não se enquadram no Quadro III (item 22.36.3.2)');
}
{
  const r = consultarQuadroCipamin(undefined);
  check(r.status === 'NAO_DIMENSIONADO' && r.titularesEmpregados === null, 'CIPAMIN sem número de empregados -> não dimensionado');
}

// ---------------------------------------------------------------------------
// 8. calculateCipaDimensioning: sem defaults, sem adivinhação de argumentos
// ---------------------------------------------------------------------------
console.log('\n--- calculateCipaDimensioning: sem default de grau 3 / 100 empregados ---');
let servico;
// O alias '@/...' so funciona via tsconfig; --paths nao e aceito na linha de
// comando. Por isso geramos um tsconfig temporario.
const TSCONFIG = path.join(RAIZ, '.tmp-nr5-tsconfig.json');
try {
  fs.writeFileSync(
    TSCONFIG,
    JSON.stringify({
      compilerOptions: {
        outDir: TMP,
        module: 'commonjs',
        target: 'es2020',
        moduleResolution: 'node',
        skipLibCheck: true,
        esModuleInterop: true,
        baseUrl: '.',
        paths: { '@/*': ['./*'] },
      },
      files: ['lib/cipaService.ts'],
    })
  );
  process.on('exit', () => fs.rmSync(TSCONFIG, { force: true }));
  execFileSync('npx', ['tsc', '-p', path.basename(TSCONFIG)], {
    stdio: 'pipe',
    shell: true,
    cwd: RAIZ,
  });
  // O tsc emite require('@/lib/...') literal: o alias so existe para o
  // empacotador. Reescrevemos para caminho relativo antes de carregar.
  const emitido = path.join(TMP, 'lib', 'cipaService.js');
  const js = fs.readFileSync(emitido, 'utf8').replace(/require\((["'])@\/([^"']+)\1\)/g, 'require("../$2")');
  fs.writeFileSync(emitido, js);
  servico = require_(emitido);
} catch (e) {
  pulados.push('testes de calculateCipaDimensioning (falha ao compilar lib/cipaService.ts)');
  console.log('AVISO: não foi possível compilar lib/cipaService.ts isoladamente.');
  console.log(String(e.stdout || e.message).split('\n').slice(0, 8).join('\n'));
}

if (servico && typeof servico.calculateCipaDimensioning === 'function') {
  const f = servico.calculateCipaDimensioning;

  // Assinatura única: (grau, empregados, norma)
  const d = f(3, 100, 'NR-05');
  check(
    d.dimensioning_status === 'DIMENSIONADO' && d.titulares_employees === 2 && d.suplentes_employees === 1,
    `NR-05 GR3 com 100 empregados -> ${d.titulares_employees}tit ${d.suplentes_employees}sup (esperado 2/1 pelo Quadro I)`
  );
  check(d.training_hours_required === 16, `NR-05 GR3 -> treinamento de ${d.training_hours_required}h (esperado 16h)`);

  const semGrau = f(null, 100, 'NR-05');
  check(
    semGrau.dimensioning_status === 'NAO_DIMENSIONADO' && semGrau.titulares_employees === 0,
    'sem grau de risco -> NAO_DIMENSIONADO (não assume grau 3)'
  );
  check(
    semGrau.dimensioning_message.length > 20,
    'sem grau de risco -> mensagem explica o que informar'
  );

  const semEmp = f(3, null, 'NR-05');
  check(
    semEmp.dimensioning_status === 'NAO_DIMENSIONADO' && semEmp.titulares_employees === 0,
    'sem número de empregados -> NAO_DIMENSIONADO (não assume 100)'
  );

  const semNada = f(undefined, undefined, 'NR-05');
  check(
    semNada.dimensioning_status === 'NAO_DIMENSIONADO' && semNada.total_members === 0,
    'sem nenhum dado -> NAO_DIMENSIONADO com 0 membros'
  );

  // Ordem trocada nao pode mais "funcionar por acaso"
  const trocado = f('NR-05', 3, 100);
  check(
    trocado.dimensioning_status === 'NAO_DIMENSIONADO',
    'argumentos na ordem antiga (norma, grau, empregados) -> NAO_DIMENSIONADO, falha visível em vez de silenciosa'
  );

  // Construção usa o mesmo Quadro I da NR-05, não o limiar inventado de 70
  const obra = f(3, 60, 'NR-18.17');
  check(
    obra.dimensioning_status === 'DIMENSIONADO' && obra.titulares_employees === 2,
    `NR-18.17 GR3 com 60 trabalhadores -> ${obra.titulares_employees}tit (esperado 2 pelo Quadro I; a regra dos 70 não existe na norma vigente)`
  );

  // Setoriais roteiam para o quadro próprio
  const rural = f(3, 100, 'NR-31.7');
  check(
    rural.titulares_employees === 3 && rural.training_hours_required === 20,
    `NR-31.7 com 100 trabalhadores -> ${rural.titulares_employees} representantes, ${rural.training_hours_required}h (esperado 3 e 20h)`
  );
  const mina = f(1, 300, 'NR-22.36');
  check(
    mina.titulares_employees === 5 && mina.titulares_employer === 1,
    `NR-22.36 com 300 empregados -> ${mina.titulares_employees}tit dos empregados e ${mina.titulares_employer} do empregador (esperado 5 e 1)`
  );
  check(
    f(4, 300, 'NR-22.36').titulares_employees === mina.titulares_employees,
    'CIPAMIN não muda com o grau de risco (o Quadro III não usa grau)'
  );
} else {
  pulados.push('calculateCipaDimensioning (funcao nao encontrada no modulo)');
  console.log('AVISO: calculateCipaDimensioning não verificada.');
}

// ---------------------------------------------------------------------------
console.log(`\n${casos} caso(s) verificado(s).`);
if (casos === 0) inconclusivo('nenhum caso foi executado');
if (falhas > 0) {
  console.log(`${falhas} FALHA(S)`);
  process.exit(1);
}

if (pulados.length > 0) {
  console.log(`\nINCONCLUSIVO — ${casos} caso(s) passaram, mas estes blocos NÃO foram verificados:`);
  pulados.forEach((b) => console.log(`  - ${b}`));
  process.exit(2);
}

console.log('TODOS OS TESTES PASSARAM');
process.exit(0);
