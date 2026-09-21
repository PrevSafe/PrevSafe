/**
 * Verificacao do SHA-256 de lib/documentoHash.ts.
 *
 *   node scripts/verificar-hash.mjs
 *
 * Um hash que ninguem conferiu e tao pouco confiavel quanto o numero aleatorio
 * que ele substitui. Este script confere tres coisas:
 *
 *   1. os vetores oficiais do NIST (FIPS 180-4)
 *   2. concordancia com node:crypto em 500 entradas aleatorias, incluindo
 *      acentos, emoji e tamanhos em volta das fronteiras de bloco (55/56/63/64
 *      bytes), que e onde implementacao de padding costuma errar
 *   3. que a serializacao canonica e deterministica: mesma informacao em ordem
 *      diferente produz o mesmo hash, e qualquer alteracao produz outro
 */
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TMP = '.tmp-hash-verificacao';
fs.rmSync(TMP, { recursive: true, force: true });
execFileSync(
  'npx',
  ['tsc', 'lib/documentoHash.ts', '--outDir', TMP, '--module', 'esnext', '--target', 'es2020', '--moduleResolution', 'bundler'],
  { stdio: 'pipe', shell: true }
);
fs.renameSync(`${TMP}/documentoHash.js`, `${TMP}/documentoHash.mjs`);

const { sha256Hex, conteudoCanonico, hashDoDocumento, hashDaAssinatura } = await import(
  pathToFileURL(path.resolve(TMP, 'documentoHash.mjs')).href
);

let falhas = 0;
const check = (ok, msg) => { if (!ok) falhas++; console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`); };
const nodeSha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

// ---------- 1. Vetores oficiais do NIST ----------
console.log('--- vetores do NIST (FIPS 180-4) ---');
const VETORES = [
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  ['abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
   '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'],
  ['abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu',
   'cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1'],
];
for (const [entrada, esperado] of VETORES) {
  const obtido = sha256Hex(entrada);
  check(obtido === esperado, `"${entrada.slice(0, 24)}${entrada.length > 24 ? '...' : ''}" (${entrada.length} chars)`);
  if (obtido !== esperado) console.log(`       esperado ${esperado}\n       obtido   ${obtido}`);
}

// 1 milhao de 'a' — o quarto vetor do NIST, que exercita muitos blocos
const milhao = 'a'.repeat(1000000);
check(
  sha256Hex(milhao) === 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
  'um milhao de caracteres "a"'
);

// ---------- 2. Concordancia com node:crypto ----------
console.log('\n--- concordancia com node:crypto ---');
let divergencias = 0;

// Fronteiras de bloco: 55/56 e 63/64 bytes sao onde o padding costuma quebrar.
for (let n = 0; n <= 130; n++) {
  const entrada = 'x'.repeat(n);
  if (sha256Hex(entrada) !== nodeSha(entrada)) divergencias++;
}
check(divergencias === 0, `todos os tamanhos de 0 a 130 bytes (${divergencias} divergencias)`);

divergencias = 0;
const ACENTOS = ['ação', 'Serviços de Segurança e Saúde', 'PGR — NR-01 · ª º ç ã õ', '🛡️ emoji', 'ĀāĒēĪī', '中文字符'];
for (const entrada of ACENTOS) {
  if (sha256Hex(entrada) !== nodeSha(entrada)) {
    divergencias++;
    console.log(`       divergiu em: ${entrada}`);
  }
}
check(divergencias === 0, `acentos, emoji e multibyte (${ACENTOS.length} casos)`);

divergencias = 0;
for (let i = 0; i < 500; i++) {
  const entrada = randomBytes(Math.floor(Math.random() * 400)).toString('base64');
  if (sha256Hex(entrada) !== nodeSha(entrada)) divergencias++;
}
check(divergencias === 0, `500 entradas aleatorias (${divergencias} divergencias)`);

// ---------- 3. Serializacao canonica ----------
console.log('\n--- serializacao canonica ---');

const docA = { numero: 'PGR-2026-001', cliente: 'FISIOMED', itens: [1, 2, 3], grau: 2 };
const docB = { grau: 2, itens: [1, 2, 3], cliente: 'FISIOMED', numero: 'PGR-2026-001' };
check(hashDoDocumento(docA) === hashDoDocumento(docB), 'ordem das chaves nao altera o hash');

const docC = { ...docA, grau: 3 };
check(hashDoDocumento(docA) !== hashDoDocumento(docC), 'alterar o grau de risco altera o hash');

const docD = { ...docA, itens: [1, 3, 2] };
check(hashDoDocumento(docA) !== hashDoDocumento(docD), 'ordem dos itens (que e conteudo) altera o hash');

check(
  conteudoCanonico({ b: 1, a: undefined, c: null }) === '{"b":1,"c":null}',
  'undefined e descartado, null e preservado'
);

check(
  hashDoDocumento(docA).length === 64 && /^[0-9a-f]{64}$/.test(hashDoDocumento(docA)),
  'hash tem 64 caracteres hexadecimais'
);

// Prova negativa: o hash antigo era aleatorio, entao duas chamadas davam
// valores diferentes. O novo tem que ser estavel.
check(hashDoDocumento(docA) === hashDoDocumento(docA), 'mesma entrada, mesmo hash (nao e aleatorio)');

const assinatura = {
  documentoHash: hashDoDocumento(docA),
  signerName: 'Maria Oliveira',
  signerDocument: '123.456.789-01',
  signerEmail: 'maria@exemplo.com.br',
  signedAt: '2026-09-21T14:30:00.000Z',
};
check(
  hashDaAssinatura(assinatura) !== hashDaAssinatura({ ...assinatura, signerName: 'Outro Nome' }),
  'trocar o signatario altera o hash da assinatura'
);
check(
  hashDaAssinatura(assinatura) !== hashDaAssinatura({ ...assinatura, signedAt: '2026-09-21T14:31:00.000Z' }),
  'trocar o momento altera o hash da assinatura'
);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} FALHA(S)`);
process.exitCode = falhas === 0 ? 0 : 1;
