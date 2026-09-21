/**
 * Verificacao da coleta de localizacao da vistoria de campo.
 *
 *   node scripts/verificar-geolocalizacao.mjs
 *
 * Roda num Chromium de verdade: navigator.geolocation so existe no navegador,
 * entao sem navegador nao ha prova. Confere que a coordenada e a precisao vem
 * do aparelho, e - o que mais importa - que permissao negada NAO vira
 * coordenada aproximada.
 *
 * Contexto: as coordenadas da vistoria eram a constante -22.2472, -43.7011 com
 * precisao "± 4.2 metros" escrita a mao, e o botao de atualizar sorteava um
 * deslocamento em volta desse ponto. Esse valor ia para o relatorio assinado.
 *
 * Saida: 0 tudo passou, 1 houve falha, 2 INCONCLUSIVO.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
process.chdir(RAIZ);

const TMP = '.tmp-geo-verificacao';
import fsBase from 'node:fs';
fsBase.rmSync(TMP, { recursive: true, force: true });

try {
  execFileSync(
    'npx',
    ['tsc', 'lib/geolocalizacao.ts', '--outDir', TMP, '--module', 'esnext', '--target', 'es2020', '--moduleResolution', 'bundler'],
    { stdio: 'pipe', shell: true }
  );
  fsBase.renameSync(`${TMP}/geolocalizacao.js`, `${TMP}/geolocalizacao.mjs`);
} catch (e) {
  console.log('\nINCONCLUSIVO - nao foi possivel compilar lib/geolocalizacao.ts');
  console.log(String(e.stdout || e.message).split('\n').slice(0, 10).join('\n'));
  process.exit(2);
}

fsBase.writeFileSync(`${TMP}/pagina.html`, `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>t</title></head>
<body><pre id="saida">aguardando</pre>
<script type="module">
  import { obterLocalizacao, consultarPermissaoLocalizacao, descreverPrecisao, formatarCoordenada } from './geolocalizacao.mjs';
  window.obterLocalizacao = obterLocalizacao;
  window.consultarPermissaoLocalizacao = consultarPermissaoLocalizacao;
  window.descreverPrecisao = descreverPrecisao;
  window.formatarCoordenada = formatarCoordenada;
  document.getElementById('saida').textContent = 'pronto';
</script></body></html>`);

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///C:/PrevSafe/node_modules/playwright/index.mjs';

const DIR = path.resolve(TMP);

// Servidor local: file:// nao permite modulos ES nem geolocalizacao.
const servidor = http.createServer((req, res) => {
  const nome = (req.url || '/').split('?')[0].replace(/^\//, '') || 'pagina.html';
  const alvo = path.join(DIR, nome);
  if (!fs.existsSync(alvo)) {
    res.writeHead(404);
    res.end('nao encontrado');
    return;
  }
  res.writeHead(200, {
    'Content-Type': nome.endsWith('.mjs') ? 'text/javascript' : 'text/html; charset=utf-8',
  });
  res.end(fs.readFileSync(alvo));
});
await new Promise((r) => servidor.listen(0, r));
const url = `http://localhost:${servidor.address().port}/pagina.html`;

let falhas = 0;
const check = (ok, msg) => {
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

const navegador = await chromium.launch();

// ---------------------------------------------------------------------------
// 1. Permissao concedida, posicao disponivel
// ---------------------------------------------------------------------------
console.log('--- permissao concedida ---');
{
  const ctx = await navegador.newContext({
    permissions: ['geolocation'],
    geolocation: { latitude: -12.2664, longitude: -38.9663, accuracy: 12 },
  });
  const p = await ctx.newPage();
  await p.goto(url);
  const r = await p.evaluate(() => window.obterLocalizacao());

  check(r.status === 'OBTIDA', `status = ${r.status}`);
  check(r.localizacao !== null, 'devolveu uma localizacao');
  check(
    Math.abs(r.localizacao.latitude - -12.2664) < 0.0001 &&
      Math.abs(r.localizacao.longitude - -38.9663) < 0.0001,
    `coordenada bate com a do aparelho: ${r.localizacao.latitude}, ${r.localizacao.longitude}`
  );
  check(
    r.localizacao.precisaoMetros === 12,
    `precisao vem do aparelho: ${r.localizacao.precisaoMetros} m (nao um texto fixo)`
  );
  check(
    !Number.isNaN(Date.parse(r.localizacao.obtidaEm)),
    `momento do fixo e uma data valida: ${r.localizacao.obtidaEm}`
  );

  const fmt = await p.evaluate((l) => window.formatarCoordenada(l), r.localizacao);
  check(fmt === '-12.266400, -38.966300', `formatacao para o documento: ${fmt}`);

  // Uma segunda leitura, em outro ponto, tem que acompanhar.
  await ctx.setGeolocation({ latitude: -23.5505, longitude: -46.6333, accuracy: 850 });
  const r2 = await p.evaluate(() => window.obterLocalizacao());
  check(
    Math.abs(r2.localizacao.latitude - -23.5505) < 0.0001,
    'segunda leitura acompanha o deslocamento real do aparelho'
  );
  const desc = await p.evaluate((m) => window.descreverPrecisao(m), r2.localizacao.precisaoMetros);
  check(
    /aproximada/.test(desc),
    `precisao ruim e declarada como aproximada: "${desc}"`
  );

  await ctx.close();
}

// ---------------------------------------------------------------------------
// 2. Permissao negada
// ---------------------------------------------------------------------------
console.log('\n--- permissao negada ---');
{
  const ctx = await navegador.newContext();
  await ctx.clearPermissions();
  const p = await ctx.newPage();
  await p.goto(url);
  const r = await p.evaluate(() => window.obterLocalizacao({ timeoutMs: 4000 }));

  check(r.localizacao === null, 'NAO devolveu coordenada');
  check(
    ['PERMISSAO_NEGADA', 'INDISPONIVEL', 'TEMPO_ESGOTADO'].includes(r.status),
    `status informa o motivo: ${r.status}`
  );
  check(
    typeof r.mensagem === 'string' && r.mensagem.length > 20,
    `mensagem explica o que fazer: "${r.mensagem.slice(0, 60)}..."`
  );
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 3. Consulta de permissao nao dispara pedido
// ---------------------------------------------------------------------------
console.log('\n--- consulta de permissao ---');
{
  const ctx = await navegador.newContext({
    permissions: ['geolocation'],
    geolocation: { latitude: -12.2664, longitude: -38.9663, accuracy: 10 },
  });
  const p = await ctx.newPage();
  await p.goto(url);
  const estado = await p.evaluate(() => window.consultarPermissaoLocalizacao());
  check(estado === 'concedida', `permissao concedida reconhecida: ${estado}`);
  await ctx.close();
}

await navegador.close();
servidor.close();

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} FALHA(S)`);
fsBase.rmSync(TMP, { recursive: true, force: true });
process.exitCode = falhas === 0 ? 0 : 1;
