/**
 * Verificacao das validacoes de documento brasileiro (CPF, CNPJ, PIS).
 *
 *   node scripts/verificar-validacoes.mjs
 *
 * Compila lib/validacoesBr.ts para uma pasta temporaria e confere os dois
 * digitos verificadores contra casos conhecidos: validos, digito trocado,
 * sequencias repetidas, tamanho errado, vazio, e a mesma entrada com e sem
 * pontuacao. Rode depois de qualquer alteracao na biblioteca - um erro aqui
 * deixa passar CPF invalido para o ASO, para a ficha de EPI, para a CAT e para
 * o evento do eSocial, e so aparece quando o governo rejeita ou quando o
 * documento ja foi entregue ao cliente.
 *
 * DOCUMENTOS USADOS: todos sinteticos. Os CNPJs alfanumericos e o
 * 00000000000191 sao os exemplos publicados pela propria Receita Federal no
 * pacote de referencia `codigos-cnpj.zip` (Calculo do DV do CNPJ
 * Alfanumerico). Os demais foram gerados pelo proprio algoritmo a partir de
 * bases obviamente artificiais (111444777, 123456789, ...). Nenhum documento
 * de pessoa ou empresa real aparece neste arquivo.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TMP = '.tmp-validacoes-verificacao';

let modulo;
try {
  fs.rmSync(TMP, { recursive: true, force: true });
  execFileSync(
    'npx',
    ['tsc', 'lib/validacoesBr.ts', '--outDir', TMP, '--module', 'esnext', '--target', 'es2020', '--moduleResolution', 'bundler'],
    { stdio: 'pipe', shell: true }
  );
  fs.renameSync(`${TMP}/validacoesBr.js`, `${TMP}/validacoesBr.mjs`);
  // import() resolve relativo a ESTE arquivo, nao ao diretorio de trabalho.
  modulo = await import(pathToFileURL(path.resolve(TMP, 'validacoesBr.mjs')).href);
} catch (erro) {
  console.error('INCONCLUSIVO: nao foi possivel compilar/importar lib/validacoesBr.ts.');
  console.error(String(erro && erro.message ? erro.message : erro));
  console.error('Nenhum caso foi verificado. NAO trate isto como sucesso.');
  fs.rmSync(TMP, { recursive: true, force: true });
  process.exit(2);
}

process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const {
  validarCPF, validarCNPJ, validarPIS,
  formatarCPF, formatarCNPJ, formatarPIS,
  apenasDigitos, conferirDocumento,
} = modulo;

// Se a biblioteca nao exportar tudo que as telas vao precisar, o teste nao tem
// como verificar o que foi pedido - e nao pode anunciar sucesso por isso.
const EXPORTS = {
  validarCPF, validarCNPJ, validarPIS,
  formatarCPF, formatarCNPJ, formatarPIS,
  apenasDigitos, conferirDocumento,
};
const faltando = Object.entries(EXPORTS).filter(([, f]) => typeof f !== 'function').map(([n]) => n);
if (faltando.length > 0) {
  console.error(`INCONCLUSIVO: lib/validacoesBr.ts nao exporta: ${faltando.join(', ')}.`);
  console.error('Os casos correspondentes nao puderam ser verificados.');
  process.exit(2);
}

const rotulo = (v) => (v === undefined ? 'undefined' : JSON.stringify(v));

let falhas = 0;
let total = 0;
const check = (ok, msg) => {
  total++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

// ===========================================================================
// 1. CPF
// ===========================================================================
console.log('--- CPF válidos ---');
const CPF_VALIDOS = [
  ['11144477735', 'CPF sintético clássico de documentação'],
  ['111.444.777-35', 'o mesmo, com pontuação'],
  ['12345678909', 'base 123456789'],
  ['123.456.789-09', 'o mesmo, com pontuação'],
  ['00000000191', 'base 000000001 (DV 91) — não é sequência repetida'],
  ['98765432100', 'base 987654321'],
  ['01234567890', 'base 012345678, começa com zero'],
];
for (const [cpf, desc] of CPF_VALIDOS) {
  check(validarCPF(cpf) === true, `${String(cpf).padEnd(16)} válido · ${desc}`);
}

console.log('\n--- CPF inválidos: dígito verificador errado ---');
const CPF_DV_ERRADO = [
  ['11144477736', 'último dígito trocado (35 -> 36)'],
  ['11144477745', 'primeiro DV trocado (35 -> 45)'],
  ['12345678900', 'base 123456789 com DV 00 em vez de 09'],
  ['111.444.777-36', 'dígito errado, com pontuação'],
  ['00000000192', 'base 000000001 com DV errado'],
  ['98765432101', 'base 987654321 com DV errado'],
];
for (const [cpf, desc] of CPF_DV_ERRADO) {
  check(validarCPF(cpf) === false, `${String(cpf).padEnd(16)} recusado · ${desc}`);
}

console.log('\n--- CPF inválidos: dígitos repetidos (todos fecham o cálculo do DV) ---');
for (let d = 0; d <= 9; d++) {
  const cpf = String(d).repeat(11);
  check(validarCPF(cpf) === false, `${cpf} recusado · sequência repetida`);
}

console.log('\n--- CPF inválidos: tamanho errado, vazio, lixo ---');
const CPF_LIXO = [
  ['', 'string vazia'],
  ['   ', 'só espaços'],
  ['1114447773', '10 dígitos (falta um)'],
  ['111444777350', '12 dígitos (sobra um)'],
  ['abcdefghijk', 'letras'],
  ['111.444.777-3', 'pontuado, mas com 10 dígitos'],
  [null, 'null'],
  [undefined, 'undefined'],
];
for (const [cpf, desc] of CPF_LIXO) {
  check(validarCPF(cpf) === false, `${rotulo(cpf).padEnd(16)} recusado · ${desc}`);
}

// ===========================================================================
// 2. CNPJ
// ===========================================================================
console.log('\n--- CNPJ numéricos válidos ---');
const CNPJ_VALIDOS = [
  ['00000000000191', 'exemplo oficial da Receita Federal'],
  ['00.000.000/0001-91', 'o mesmo, com pontuação'],
  ['11144477700061', 'base sintética 111444777000'],
  ['11.144.477/7000-61', 'o mesmo, com pontuação'],
  ['12345678000195', 'base sintética 123456780001'],
  ['90021382000122', 'exemplo oficial da Receita Federal'],
  ['90.021.382/0001-22', 'o mesmo, com pontuação'],
];
for (const [cnpj, desc] of CNPJ_VALIDOS) {
  check(validarCNPJ(cnpj) === true, `${String(cnpj).padEnd(20)} válido · ${desc}`);
}

console.log('\n--- CNPJ alfanuméricos válidos (em vigor desde 31/07/2026) ---');
// Casos publicados pela Receita Federal no pacote de referencia oficial.
const CNPJ_ALFA_VALIDOS = [
  ['12ABC34501DE35', 'exemplo oficial'],
  ['12.ABC.345/01DE-35', 'o mesmo, com pontuação'],
  ['1345C3A5000106', 'exemplo oficial'],
  ['R55231B3000757', 'exemplo oficial (DV 57)'],
  ['ABCDEFGHIJKL80', 'exemplo oficial, doze letras'],
];
for (const [cnpj, desc] of CNPJ_ALFA_VALIDOS) {
  check(validarCNPJ(cnpj) === true, `${String(cnpj).padEnd(20)} válido · ${desc}`);
}

console.log('\n--- CNPJ inválidos ---');
const CNPJ_INVALIDOS = [
  ['00000000000192', 'DV errado (91 -> 92)'],
  ['00000000000181', 'primeiro DV errado'],
  ['90021382000123', 'DV errado no exemplo oficial'],
  ['12ABC34501DE36', 'DV errado no alfanumérico'],
  ['ABCDEFGHIJKL81', 'DV errado (oficial: 80)'],
  ['R55231B3000700', 'DV 00 em vez de 57 — caso do manual oficial'],
  ['00000000000000', 'CNPJ zerado'],
  ['00.000.000/0000-00', 'CNPJ zerado, com pontuação'],
  ['11111111111111', 'todos os caracteres iguais'],
  ['0000000000019', '13 caracteres (falta um)'],
  ['000000000001911', '15 caracteres (sobra um)'],
  ['0000000000019L', 'letra na posição do segundo DV'],
  ['000000000001P1', 'letra na posição do primeiro DV'],
  ['0123456?789ABC', 'caractere não permitido no meio'],
  ['$0123456789ABC', 'caractere não permitido no início'],
  ["'!@#$%&*-_=+^~", 'só caracteres não permitidos'],
  ['', 'string vazia'],
  [null, 'null'],
  [undefined, 'undefined'],
];
for (const [cnpj, desc] of CNPJ_INVALIDOS) {
  check(validarCNPJ(cnpj) === false, `${rotulo(cnpj).padEnd(22)} recusado · ${desc}`);
}

console.log('\n--- CNPJ: o algoritmo alfanumérico não alterou nenhum CNPJ numérico ---');
// Para '0'-'9', ASCII menos 48 e o proprio digito: o alfanumerico e o mesmo
// calculo de sempre. Se isto falhar, a mudanca de 2026 quebrou a base legada.
check(
  validarCNPJ('00000000000191') && validarCNPJ('90021382000122') && !validarCNPJ('00000000000192'),
  'CNPJs numéricos legados continuam com o mesmo resultado de antes'
);

// ===========================================================================
// 3. PIS / PASEP / NIS / NIT
// ===========================================================================
console.log('\n--- PIS válidos ---');
const PIS_VALIDOS = [
  ['12034567899', 'base sintética 1203456789'],
  ['120.34567.89-9', 'o mesmo, com pontuação'],
  ['00000000019', 'base 0000000001'],
  ['12345678900', 'base 1234567890'],
  ['12000000004', 'base 1200000000'],
];
for (const [pis, desc] of PIS_VALIDOS) {
  check(validarPIS(pis) === true, `${String(pis).padEnd(16)} válido · ${desc}`);
}

console.log('\n--- PIS inválidos ---');
const PIS_INVALIDOS = [
  ['12034567898', 'DV errado (9 -> 8)'],
  ['12034567890', 'DV errado (9 -> 0)'],
  ['00000000018', 'DV errado'],
  ['12345678901', 'DV errado'],
  ['120.34567.89-8', 'DV errado, com pontuação'],
  ['1203456789', '10 dígitos (falta um)'],
  ['120345678990', '12 dígitos (sobra um)'],
  ['', 'string vazia'],
  ['abcdefghijk', 'letras'],
  [null, 'null'],
  [undefined, 'undefined'],
];
for (const [pis, desc] of PIS_INVALIDOS) {
  check(validarPIS(pis) === false, `${rotulo(pis).padEnd(18)} recusado · ${desc}`);
}

console.log('\n--- PIS: sequências repetidas ---');
for (let d = 0; d <= 9; d++) {
  const pis = String(d).repeat(11);
  check(validarPIS(pis) === false, `${pis} recusado · sequência repetida`);
}

// ===========================================================================
// 4. Pontuação não pode mudar o resultado
// ===========================================================================
console.log('\n--- mesma entrada, com e sem pontuação, mesmo resultado ---');
const PARES = [
  ['CPF', '11144477735', '111.444.777-35'],
  ['CPF', '11144477736', '111.444.777-36'],
  ['CPF', '12345678909', '123.456.789-09'],
  ['CNPJ', '00000000000191', '00.000.000/0001-91'],
  ['CNPJ', '00000000000192', '00.000.000/0001-92'],
  ['CNPJ', '12ABC34501DE35', '12.ABC.345/01DE-35'],
  ['CNPJ', '90021382000122', '90.021.382/0001-22'],
  ['PIS', '12034567899', '120.34567.89-9'],
  ['PIS', '12034567898', '120.34567.89-8'],
];
const VALIDADOR = { CPF: validarCPF, CNPJ: validarCNPJ, PIS: validarPIS };
for (const [tipo, cru, pontuado] of PARES) {
  const a = VALIDADOR[tipo](cru);
  const b = VALIDADOR[tipo](pontuado);
  check(a === b, `${tipo} ${cru} = ${pontuado} → ambos ${a} · pontuação não altera o resultado`);
}

// Espacos e caixa tambem nao podem alterar o resultado.
check(validarCPF(' 111.444.777-35 ') === true, 'CPF com espaços nas pontas continua válido');
check(validarCNPJ('12abc34501de35') === true, 'CNPJ alfanumérico em minúscula é normalizado e aceito');
check(validarCNPJ(' 12.ABC.345/01DE-35 ') === true, 'CNPJ alfanumérico com espaços continua válido');

// ===========================================================================
// 5. Formatação
// ===========================================================================
console.log('\n--- formatação ---');
check(formatarCPF('11144477735') === '111.444.777-35', 'formatarCPF aplica a máscara');
check(formatarCPF('111.444.777-35') === '111.444.777-35', 'formatarCPF é idempotente');
check(formatarCNPJ('00000000000191') === '00.000.000/0001-91', 'formatarCNPJ aplica a máscara');
check(formatarCNPJ('12ABC34501DE35') === '12.ABC.345/01DE-35', 'formatarCNPJ mascara o alfanumérico');
check(formatarCNPJ('12.ABC.345/01DE-35') === '12.ABC.345/01DE-35', 'formatarCNPJ é idempotente');
check(formatarPIS('12034567899') === '120.34567.89-9', 'formatarPIS aplica a máscara');
check(formatarPIS('120.34567.89-9') === '120.34567.89-9', 'formatarPIS é idempotente');

console.log('\n--- formatação NÃO pode dar aparência de documento completo ---');
check(formatarCPF('1114447') === '1114447', 'CPF incompleto volta cru, sem máscara e sem completar');
check(formatarCNPJ('0000000') === '0000000', 'CNPJ incompleto volta cru');
check(formatarPIS('1203') === '1203', 'PIS incompleto volta cru');
check(formatarCPF('') === '', 'CPF vazio volta vazio');
check(formatarCPF(null) === '', 'formatarCPF(null) devolve string vazia, não quebra');

console.log('\n--- apenasDigitos ---');
check(apenasDigitos('111.444.777-35') === '11144477735', 'apenasDigitos remove a pontuação');
check(apenasDigitos('abc123def') === '123', 'apenasDigitos descarta letras');
check(apenasDigitos('') === '', 'apenasDigitos("") = ""');
check(apenasDigitos(null) === '', 'apenasDigitos(null) = ""');
check(apenasDigitos(undefined) === '', 'apenasDigitos(undefined) = ""');

// ===========================================================================
// 6. conferirDocumento: precisa dizer POR QUE
// ===========================================================================
console.log('\n--- conferirDocumento: válidos ---');
const CONFERIR_OK = [
  ['111.444.777-35', 'CPF'],
  ['00.000.000/0001-91', 'CNPJ'],
  ['12.ABC.345/01DE-35', 'CNPJ'],
  ['120.34567.89-9', 'PIS'],
];
for (const [valor, tipo] of CONFERIR_OK) {
  const r = conferirDocumento(valor, tipo);
  check(r.valido === true && !r.motivo, `${tipo} ${String(valor).padEnd(20)} válido, sem motivo`);
}

console.log('\n--- conferirDocumento: inválidos precisam de motivo legível ---');
const CONFERIR_ERRO = [
  ['', 'CPF', /não informado/],
  ['1114447773', 'CPF', /11 dígitos/],
  ['111444777350', 'CPF', /11 dígitos/],
  ['11111111111', 'CPF', /iguais/],
  ['11144477736', 'CPF', /[Dd]ígito verificador/],
  ['', 'CNPJ', /não informado/],
  ['0000000000019', 'CNPJ', /14 caracteres/],
  ['0123456?789ABC', 'CNPJ', /apenas letras/],
  ['0000000000019L', 'CNPJ', /numéricos/],
  ['00000000000000', 'CNPJ', /iguais/],
  ['00000000000192', 'CNPJ', /[Dd]ígito verificador/],
  ['12ABC34501DE36', 'CNPJ', /[Dd]ígito verificador/],
  ['', 'PIS', /não informado/],
  ['1203456789', 'PIS', /11 dígitos/],
  ['11111111111', 'PIS', /iguais/],
  ['12034567898', 'PIS', /[Dd]ígito verificador/],
];
for (const [valor, tipo, esperado] of CONFERIR_ERRO) {
  const r = conferirDocumento(valor, tipo);
  const ok = r.valido === false && typeof r.motivo === 'string' && esperado.test(r.motivo);
  check(ok, `${tipo} ${rotulo(valor).padEnd(18)} → ${JSON.stringify(r.motivo)}`);
}

console.log('\n--- conferirDocumento: tipo desconhecido não pode passar como válido ---');
const rDesconhecido = conferirDocumento('11144477735', 'RG');
check(
  rDesconhecido.valido === false && /desconhecido/i.test(String(rDesconhecido.motivo)),
  `tipo 'RG' → ${JSON.stringify(rDesconhecido.motivo)}`
);

// ===========================================================================
// 7. Coerência entre conferirDocumento e as funções booleanas
// ===========================================================================
console.log('\n--- conferirDocumento e validarX nunca podem discordar ---');
let divergencias = 0;
const TODOS = [
  ...CPF_VALIDOS.map(([v]) => ['CPF', v]),
  ...CPF_DV_ERRADO.map(([v]) => ['CPF', v]),
  ...CNPJ_VALIDOS.map(([v]) => ['CNPJ', v]),
  ...CNPJ_ALFA_VALIDOS.map(([v]) => ['CNPJ', v]),
  ...CNPJ_INVALIDOS.map(([v]) => ['CNPJ', v]),
  ...PIS_VALIDOS.map(([v]) => ['PIS', v]),
  ...PIS_INVALIDOS.map(([v]) => ['PIS', v]),
];
for (const [tipo, valor] of TODOS) {
  if (conferirDocumento(valor, tipo).valido !== VALIDADOR[tipo](valor)) {
    divergencias++;
    console.log(`       divergência: ${tipo} ${rotulo(valor)}`);
  }
}
check(divergencias === 0, `${TODOS.length} documentos conferidos pelos dois caminhos, ${divergencias} divergência(s)`);

// ===========================================================================
// Resumo
// ===========================================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`casos verificados: ${total} · passaram: ${total - falhas} · falharam: ${falhas}`);
if (falhas === 0) {
  console.log('TODOS OS TESTES PASSARAM');
  process.exitCode = 0;
} else {
  console.log(`${falhas} FALHA(S)`);
  process.exitCode = 1;
}
