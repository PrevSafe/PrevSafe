/**
 * Verificacao ponta a ponta do grau de risco pelo caminho que o usuario usa:
 * digitar o CNPJ e deixar o sistema preencher sozinho.
 *
 *   node scripts/verificar-cnpj-grau.mjs
 *   node scripts/verificar-cnpj-grau.mjs 12.483.776/0001-99 2
 *
 * O teste de tabela (verificar-nr4.mjs) prova que o Anexo I esta correto, mas
 * nao prova que o CNAE certo chega ate ele. Este aqui consulta a Receita pela
 * BrasilAPI - a mesma chamada de lib/companyLookup.ts -, pega o cnae_fiscal da
 * resposta e o submete a mesma funcao de consulta. E a unica forma de pegar um
 * erro que esteja entre a Receita e a tabela, como um CNAE truncado ou
 * reformatado no meio do caminho.
 *
 * Nao escreve nada: so le a API publica. Nenhum cadastro e criado.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TMP = '.tmp-cnpj-verificacao';
fs.rmSync(TMP, { recursive: true, force: true });
execFileSync(
  'npx',
  ['tsc', 'lib/nr4AnexoI.ts', '--outDir', TMP, '--module', 'esnext', '--target', 'es2020', '--moduleResolution', 'bundler'],
  { stdio: 'pipe', shell: true }
);
fs.renameSync(`${TMP}/nr4AnexoI.js`, `${TMP}/nr4AnexoI.mjs`);

const { consultarGrauDeRisco, formatarClasse } = await import(
  pathToFileURL(path.resolve(TMP, 'nr4AnexoI.mjs')).href
);

// CNPJ + grau esperado conferido no Anexo I. O primeiro e o caso relatado.
const CASOS = process.argv[2]
  ? [[process.argv[2], process.argv[3] ? Number(process.argv[3]) : null]]
  : [['12.483.776/0001-99', 2]];

let falhas = 0;
let pulados = 0;

for (const [cnpj, esperado] of CASOS) {
  const digitos = cnpj.replace(/\D/g, '');
  process.stdout.write(`\nCNPJ ${cnpj}\n`);

  let dados;
  try {
    // A BrasilAPI recusa chamadas sem User-Agent de navegador (403).
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digitos}`, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      pulados++;
      console.log(`  NAO VERIFICADO: a Receita respondeu ${res.status}.`);
      continue;
    }
    dados = await res.json();
  } catch (e) {
    pulados++;
    console.log(`  NAO VERIFICADO: nao foi possivel consultar (${e.message}).`);
    continue;
  }

  // Exatamente o que lib/companyLookup.ts faz com a resposta.
  const rawCnae = String(dados.cnae_fiscal || '');
  const consulta = consultarGrauDeRisco(rawCnae);

  console.log(`  razao social : ${dados.razao_social}`);
  console.log(`  cnae_fiscal  : ${rawCnae} (${dados.cnae_fiscal_descricao || '-'})`);
  console.log(`  classe NR-04 : ${consulta.classe ? formatarClasse(consulta.classe) : '-'}`);
  console.log(`  denominacao  : ${consulta.denominacao || '-'}`);
  console.log(`  grau apurado : ${consulta.grau ?? 'nao classificado'}`);

  if (esperado === null) {
    console.log('  (sem grau esperado informado - apenas exibindo)');
    continue;
  }

  if (consulta.grau === esperado) {
    console.log(`  OK: grau ${esperado}, conforme o Anexo I.`);
  } else {
    falhas++;
    console.log(`  FALHA: esperado grau ${esperado}, apurado ${consulta.grau ?? 'null'}.`);
  }
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} FALHA(S)`);
process.exitCode = falhas === 0 ? 0 : 1;
