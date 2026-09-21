/**
 * Verificacao do dimensionamento do SESMT (Anexo II da NR-04).
 *
 *   node scripts/verificar-sesmt.mjs
 *
 * Confere celula a celula contra o Anexo II oficial, prova que a funcao NAO
 * estima quando falta dado, e cobre a regra de acrescimo acima de 5.000
 * empregados - que e nota da propria norma (grupos de 4.000, fracao acima de
 * 2.000 contando como grupo inteiro), nao extrapolacao nossa.
 *
 * Contexto: a tabela anterior era digitada a mao, sem fonte, sem teste, com a
 * faixa 2.001-5.000 fundida no grau 1 e uma extrapolacao inventada por blocos
 * de 2.000. Um erro aqui vira SESMT mal dimensionado - a empresa contrata
 * profissional a menos e responde perante a fiscalizacao.
 *
 * Saida: 0 tudo passou, 1 houve falha, 2 INCONCLUSIVO (nao deu para verificar).
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..'
);
const TMP = path.join(RAIZ, '.tmp-sesmt-verificacao');
const TSCONFIG = path.join(RAIZ, 'tsconfig.verificar-sesmt.json');
const require_ = createRequire(import.meta.url);

const pulados = [];

function inconclusivo(motivo, detalhe) {
  console.log('\nINCONCLUSIVO — a verificação não pôde ser executada.');
  console.log(`motivo: ${motivo}`);
  if (detalhe) console.log(String(detalhe).split('\n').slice(0, 20).join('\n'));
  limpar();
  process.exit(2);
}

function limpar() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.rmSync(TSCONFIG, { force: true });
}

limpar();

let nr4;
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
      files: ['lib/nr4.ts'],
    })
  );
  execFileSync('npx', ['tsc', '-p', path.basename(TSCONFIG)], {
    stdio: 'pipe',
    shell: true,
    cwd: RAIZ,
  });

  // Todos os fontes estao em lib/, entao o tsc usa lib/ como raiz e emite os
  // .js direto em TMP, sem subpasta. O tsc tambem emite require('@/lib/...')
  // literal: o alias so existe para o empacotador, e o node nao o resolve.
  for (const arquivo of fs.readdirSync(TMP)) {
    if (!arquivo.endsWith('.js')) continue;
    const alvo = path.join(TMP, arquivo);
    const js = fs
      .readFileSync(alvo, 'utf8')
      .replace(/require\((["'])@\/lib\/([^"']+)\1\)/g, 'require("./$2")');
    fs.writeFileSync(alvo, js);
  }

  nr4 = require_(path.join(TMP, 'nr4.js'));
} catch (e) {
  inconclusivo('nao foi possivel compilar lib/nr4.ts', e.stdout || e.message);
}

const { calculateSesmtDimensioning } = nr4;
if (typeof calculateSesmtDimensioning !== 'function') {
  inconclusivo('calculateSesmtDimensioning nao foi exportada por lib/nr4.ts');
}

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

const equipe = (r) =>
  `${r.tecnicoSeguranca}tec ${r.engenheiroSeguranca}eng ${r.auxiliarEnfermagem}aux ${r.enfermeiroTrabalho}enf ${r.medicoTrabalho}med`;

// ---------------------------------------------------------------------------
// 1. Dispensa: abaixo do piso de cada grau, o Anexo II nao enquadra.
// ---------------------------------------------------------------------------
console.log('--- dispensa de SESMT proprio ---');
const DISPENSAS = [
  [1, 500, 'grau 1 com 500 empregados'],
  [2, 500, 'grau 2 com 500 empregados'],
  [3, 100, 'grau 3 com 100 empregados'],
  [4, 49, 'grau 4 com 49 empregados'],
  [4, 1, 'grau 4 com 1 empregado'],
];
for (const [grau, n, descricao] of DISPENSAS) {
  const r = calculateSesmtDimensioning(grau, n);
  const semEquipe =
    r.tecnicoSeguranca === 0 &&
    r.engenheiroSeguranca === 0 &&
    r.auxiliarEnfermagem === 0 &&
    r.enfermeiroTrabalho === 0 &&
    r.medicoTrabalho === 0;
  check(semEquipe && r.status !== 'OBRIGATORIO', `${descricao} -> dispensado (${equipe(r)})`);
}

// ---------------------------------------------------------------------------
// 2. Celulas lidas uma a uma no Anexo II.
//    [grau, empregados, tec, eng, aux, enf, med, descricao]
// ---------------------------------------------------------------------------
console.log('\n--- celulas do Anexo II ---');
const CELULAS = [
  // Grau 4: a unica coluna que comeca em 50 empregados.
  [4, 50, 1, 0, 0, 0, 0, 'grau 4, 50 a 100'],
  [4, 100, 1, 0, 0, 0, 0, 'grau 4, limite superior da faixa 50-100'],
  // 2 tecnicos, nao 1: a coluna do grau 4 progride 1, 2, 3, 4, 5 ao longo
  // das faixas. Escrevi 1 aqui de cabeca na primeira versao deste teste e o
  // teste pegou - que e para isso que ele existe.
  [4, 101, 2, 1, 0, 0, 1, 'grau 4, 101 a 250'],

  // Grau 3: comeca em 101.
  [3, 101, 1, 0, 0, 0, 0, 'grau 3, 101 a 250'],
  [3, 250, 1, 0, 0, 0, 0, 'grau 3, limite superior da faixa 101-250'],
  [3, 251, 2, 0, 0, 0, 0, 'grau 3, 251 a 500'],

  // Grau 1 e 2: comecam em 501.
  [1, 501, 1, 0, 0, 0, 0, 'grau 1, 501 a 1.000'],
  [2, 501, 1, 0, 0, 0, 0, 'grau 2, 501 a 1.000'],
  [1, 1001, 1, 0, 0, 0, 1, 'grau 1, 1.001 a 2.000'],

  // A faixa que a tabela antiga fundia no grau 1.
  [1, 2001, 1, 1, 1, 0, 1, 'grau 1, 2.001 a 3.500 (faixa que a tabela antiga fundia)'],
  [1, 3501, 2, 1, 1, 1, 1, 'grau 1, 3.501 a 5.000 (idem)'],
  [1, 5000, 2, 1, 1, 1, 1, 'grau 1, limite da ultima faixa'],
];
for (const [grau, n, tec, eng, aux, enf, med, descricao] of CELULAS) {
  const r = calculateSesmtDimensioning(grau, n);
  const ok =
    r.tecnicoSeguranca === tec &&
    r.engenheiroSeguranca === eng &&
    r.auxiliarEnfermagem === aux &&
    r.enfermeiroTrabalho === enf &&
    r.medicoTrabalho === med;
  check(ok, `${descricao} -> ${equipe(r)} (esperado ${tec}tec ${eng}eng ${aux}aux ${enf}enf ${med}med)`);
}

// ---------------------------------------------------------------------------
// 3. Fronteiras: mudar de faixa tem que mudar a equipe.
// ---------------------------------------------------------------------------
console.log('\n--- fronteiras entre faixas ---');
const FRONTEIRAS = [
  [3, 250, 251, 'grau 3, 250 -> 251'],
  [3, 500, 501, 'grau 3, 500 -> 501'],
  [4, 100, 101, 'grau 4, 100 -> 101'],
  [1, 2000, 2001, 'grau 1, 2.000 -> 2.001'],
  [1, 3500, 3501, 'grau 1, 3.500 -> 3.501'],
];
for (const [grau, antes, depois, descricao] of FRONTEIRAS) {
  const a = equipe(calculateSesmtDimensioning(grau, antes));
  const b = equipe(calculateSesmtDimensioning(grau, depois));
  check(a !== b, `${descricao}: ${a} -> ${b}`);
}

// ---------------------------------------------------------------------------
// 4. Acima de 5.000: nota (**) do Anexo II, grupos de 4.000 com fracao acima
//    de 2.000 contando como grupo inteiro.
// ---------------------------------------------------------------------------
console.log('\n--- acrescimo acima de 5.000 (nota ** do Anexo II) ---');
const base = calculateSesmtDimensioning(3, 5000);

const semGrupo = calculateSesmtDimensioning(3, 6500); // fracao de 1.500, nao completa grupo
check(
  equipe(semGrupo) === equipe(base),
  `5.000 -> 6.500 (fracao de 1.500, abaixo de 2.000): equipe inalterada (${equipe(semGrupo)})`
);

const umGrupoPorFracao = calculateSesmtDimensioning(3, 7500); // fracao de 2.500 conta como grupo
check(
  umGrupoPorFracao.tecnicoSeguranca > base.tecnicoSeguranca,
  `5.000 -> 7.500 (fracao de 2.500, acima de 2.000): conta como um grupo (${equipe(umGrupoPorFracao)})`
);

const umGrupo = calculateSesmtDimensioning(3, 9000); // exatamente um grupo de 4.000
check(
  equipe(umGrupo) === equipe(umGrupoPorFracao),
  `9.000 (um grupo exato) da a mesma equipe que 7.500 (fracao que conta como grupo)`
);

const doisGrupos = calculateSesmtDimensioning(3, 13000);
check(
  doisGrupos.tecnicoSeguranca - base.tecnicoSeguranca ===
    2 * (umGrupo.tecnicoSeguranca - base.tecnicoSeguranca),
  `13.000 (dois grupos) acrescenta o dobro de 9.000 (${equipe(doisGrupos)})`
);

// A regra antiga extrapolava por blocos de 2.000. Se ainda fosse assim,
// 9.000 daria acrescimo de 2 blocos em vez de 1 grupo.
check(
  umGrupo.tecnicoSeguranca - base.tecnicoSeguranca ===
    doisGrupos.tecnicoSeguranca - umGrupo.tecnicoSeguranca,
  'acrescimo e linear por grupo de 4.000, nao por blocos de 2.000'
);

// ---------------------------------------------------------------------------
// 5. NUNCA estimar.
// ---------------------------------------------------------------------------
console.log('\n--- nao pode estimar ---');
const semGrau = calculateSesmtDimensioning(null, 500);
check(
  semGrau.status === 'NAO_DIMENSIONADO',
  `sem grau de risco -> ${semGrau.status} (nao assume um grau)`
);
check(
  semGrau.tecnicoSeguranca === 0 && semGrau.medicoTrabalho === 0,
  'sem grau de risco -> nenhum profissional sugerido'
);

const semContagem = calculateSesmtDimensioning(3, null);
check(
  semContagem.status === 'NAO_DIMENSIONADO',
  `sem numero de empregados -> ${semContagem.status} (nao assume uma contagem)`
);

const grauInvalido = calculateSesmtDimensioning(9, 500);
check(
  grauInvalido.status === 'NAO_DIMENSIONADO',
  `grau 9 (inexistente) -> ${grauInvalido.status}, nao cai num grau vizinho`
);

const negativo = calculateSesmtDimensioning(3, -10);
check(
  negativo.status === 'NAO_DIMENSIONADO' || negativo.tecnicoSeguranca === 0,
  'numero negativo de empregados nao gera equipe'
);

// ---------------------------------------------------------------------------
// 6. Fundamentacao citada.
// ---------------------------------------------------------------------------
console.log('\n--- fundamentacao ---');
const comEquipe = calculateSesmtDimensioning(4, 200);
check(
  typeof comEquipe.legalBasis === 'string' && /NR-04|Anexo II/i.test(comEquipe.legalBasis),
  `resultado cita a fundamentacao: "${String(comEquipe.legalBasis).slice(0, 70)}..."`
);
check(comEquipe.faixa !== null, `resultado informa a faixa aplicada: "${comEquipe.faixa}"`);

// ---------------------------------------------------------------------------
limpar();
console.log(`\n${casos} caso(s) verificado(s).`);

if (falhas > 0) {
  console.log(`${falhas} FALHA(S)`);
  process.exit(1);
}
if (pulados.length > 0) {
  console.log(`\nINCONCLUSIVO — blocos não verificados: ${pulados.join(', ')}`);
  process.exit(2);
}
console.log('TODOS OS TESTES PASSARAM');
process.exit(0);
