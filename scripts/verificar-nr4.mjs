// Verifica a tabela do Anexo I contra casos conferidos um a um no texto
// oficial, e checa a integridade estrutural (formato das chaves, graus
// válidos, ausência de estimativa).
/**
 * Verificacao da tabela do Anexo I da NR-04.
 *
 *   node scripts/verificar-nr4.mjs
 *
 * Compila lib/nr4AnexoI.ts para uma pasta temporaria e confere: formato das
 * chaves, graus validos, os casos lidos um a um do texto oficial e a regra de
 * NUNCA estimar um grau. Rode depois de qualquer alteracao na tabela - um
 * digito errado aqui vira SESMT mal dimensionado e laudo com enquadramento
 * indevido.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TMP = '.tmp-nr4-verificacao';
fs.rmSync(TMP, { recursive: true, force: true });
execFileSync('npx', ['tsc', 'lib/nr4AnexoI.ts', '--outDir', TMP, '--module', 'esnext', '--target', 'es2020', '--moduleResolution', 'bundler'], { stdio: 'pipe', shell: true });
fs.renameSync(`${TMP}/nr4AnexoI.js`, `${TMP}/nr4AnexoI.mjs`);

// import() resolve relativo a ESTE arquivo, nao ao diretorio de trabalho.
const { NR4_ANEXO_I, consultarGrauDeRisco, TOTAL_CLASSES_ANEXO_I } =
  await import(pathToFileURL(path.resolve(TMP, 'nr4AnexoI.mjs')).href);

process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

let falhas = 0;
const check = (ok, msg) => { if (!ok) falhas++; console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`); };

console.log(`Classes no Anexo I: ${TOTAL_CLASSES_ANEXO_I}\n`);

// ---------- 1. Integridade estrutural ----------
let chavesInvalidas = 0, grausInvalidos = 0, semDenominacao = 0;
for (const [classe, item] of Object.entries(NR4_ANEXO_I)) {
  if (!/^\d{5}$/.test(classe)) chavesInvalidas++;
  if (![1, 2, 3, 4].includes(item.grau)) grausInvalidos++;
  if (!item.denominacao || item.denominacao.length < 3) semDenominacao++;
}
check(chavesInvalidas === 0, `todas as chaves têm 5 dígitos (${chavesInvalidas} inválidas)`);
check(grausInvalidos === 0, `todos os graus são 1..4 (${grausInvalidos} inválidos)`);
check(semDenominacao === 0, `todas têm denominação (${semDenominacao} sem)`);

// ---------- 2. Casos conferidos no texto oficial ----------
// Cada linha foi lida diretamente do Anexo I publicado.
const CASOS = [
  // O caso que o usuário reportou
  ['8650004', 2, 'Atividades de profissionais da área de saúde (o caso reportado)'],
  ['86500',   2, 'mesma classe, informada com 5 dígitos'],
  ['86.50-0-04', 2, 'mesma classe, com pontuação'],
  // Vizinhos na mesma divisão, para provar que não é chute por divisão
  ['8610101', 3, 'atendimento hospitalar — divisão 86, mas grau 3'],
  ['8630501', 3, 'atenção ambulatorial médicos/odontólogos — grau 3'],
  ['8660700', 1, 'apoio à gestão de saúde — grau 1'],
  ['8690901', 1, 'atenção à saúde não especificada — grau 1'],
  // Extremos
  ['4110700', 1, 'incorporação imobiliária — grau 1'],
  ['2092400', 4, 'fabricação de explosivos — grau 4'],
  ['0220901', 4, 'florestas nativas — grau 4'],
  ['2511000', 4, 'fabricação de estruturas metálicas — grau 4'],
  ['2342700', 3, 'cerâmicos não-refratários estruturais — grau 3 (alterado em 2009)'],
  ['2349400', 4, 'cerâmicos não-refratários outros — grau 4'],
  ['4742300', 1, 'comércio varejista de material elétrico — grau 1'],
  ['4722902', 3, 'açougues e peixarias — grau 3'],
  ['4784900', 3, 'varejo de GLP — grau 3'],
  ['2063100', 2, 'cosméticos — grau 2 numa divisão majoritariamente 3'],
  ['3104700', 2, 'fabricação de colchões — grau 2 numa divisão 3'],
  ['7500100', 3, 'atividades veterinárias — grau 3'],
  ['8130300', 1, 'atividades paisagísticas — grau 1'],
  ['8121400', 3, 'limpeza em prédios e domicílios — grau 3'],
  ['9700500', 2, 'serviços domésticos — grau 2'],
  ['6201501', 2, 'desenvolvimento de software — grau 2'],
  ['7112000', 1, 'serviços de engenharia — grau 1'],
];

console.log('\n--- casos conferidos no texto oficial ---');
for (const [cnae, esperado, descricao] of CASOS) {
  const r = consultarGrauDeRisco(cnae);
  const ok = r.encontrado && r.grau === esperado;
  check(ok, `${String(cnae).padEnd(12)} grau ${r.grau ?? '—'} (esperado ${esperado}) · ${descricao}`);
}

// ---------- 3. Nunca estimar ----------
console.log('\n--- não pode estimar ---');
const INEXISTENTES = ['9999999', '0000000', '1234567'];
for (const c of INEXISTENTES) {
  const r = consultarGrauDeRisco(c);
  check(!r.encontrado && r.grau === null, `${c} → não encontrado, grau null (não estimou)`);
}
const vazio = consultarGrauDeRisco('');
check(!vazio.encontrado && vazio.grau === null, 'CNAE vazio → não encontrado, grau null');

// ---------- 4. Distribuição, para detectar transcrição em massa errada ----------
const dist = { 1: 0, 2: 0, 3: 0, 4: 0 };
for (const item of Object.values(NR4_ANEXO_I)) dist[item.grau]++;
console.log(`\ndistribuição: grau 1 = ${dist[1]} | grau 2 = ${dist[2]} | grau 3 = ${dist[3]} | grau 4 = ${dist[4]}`);
check(dist[1] > 50 && dist[2] > 50 && dist[3] > 200 && dist[4] > 30,
  'distribuição plausível (3 é o mais comum, 4 o mais raro)');

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} FALHA(S)`);
process.exitCode = falhas === 0 ? 0 : 1;
