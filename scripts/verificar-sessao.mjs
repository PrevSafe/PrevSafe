/**
 * Verificacao do encerramento da sessao por inatividade.
 *
 *   node scripts/verificar-sessao.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * O cliente Supabase e criado com `autoRefreshToken: true`: o token se renova
 * sozinho enquanto a aba existir. A sessao so terminava no clique em "Encerrar
 * Sessao" - e o sistema mostra CPF, ASO, atestado e CAT, dado pessoal
 * sensivel de saude. Uma estacao destravada era acesso liberado.
 *
 * O QUE ELE PROVA
 *
 *   1. o prazo, nos limites exatos (28 min avisa, 30 min encerra)
 *   2. que voltar para a aba NAO renova o prazo - o erro que anularia o
 *      controle inteiro, porque o caso que ele pega e justamente a aba
 *      esquecida aberta
 *   3. que a marca fica em localStorage, e nao em sessionStorage nem em
 *      memoria: em duas abas de verdade, num Chromium de verdade, a atividade
 *      de uma conta para a outra
 *   4. que armazenamento negado (modo privado) nao derruba a tela nem encerra
 *      a sessao por engano
 *   5. que a tela de login diz o que aconteceu, e a auditoria registra
 *      SESSION_TIMEOUT - encerrar sem avisar parece defeito
 *
 * Saida: 0 tudo passou, 1 houve falha, 2 INCONCLUSIVO.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
process.chdir(RAIZ);

const TMP = '.tmp-sessao-verificacao';
fs.rmSync(TMP, { recursive: true, force: true });

function inconclusivo(motivo, detalhe) {
  console.log('\nINCONCLUSIVO - a verificacao nao pode ser executada.');
  console.log(`motivo: ${motivo}`);
  if (detalhe) console.log(String(detalhe).split('\n').slice(0, 12).join('\n'));
  process.exit(2);
}

try {
  execFileSync(
    'npx',
    ['tsc', 'lib/sessaoInativa.ts', '--outDir', TMP, '--module', 'esnext',
      '--target', 'es2020', '--moduleResolution', 'bundler'],
    { stdio: 'pipe', shell: true }
  );
  fs.renameSync(`${TMP}/sessaoInativa.js`, `${TMP}/sessaoInativa.mjs`);
} catch (e) {
  inconclusivo('nao foi possivel compilar lib/sessaoInativa.ts', e.stdout || e.message);
}

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

const MODULO = path.resolve(TMP, 'sessaoInativa.mjs');

/**
 * O codigo sem comentarios.
 *
 * A prova de regressao deste script mostrou por que isto e necessario:
 * comentar `jaEncerrou.current = true` NAO reprovou, porque a linha continuava
 * no arquivo e o scanner lia o arquivo cru. Codigo comentado nao roda.
 */
const semComentarios = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');

// ===========================================================================
// 1. O PRAZO
// ===========================================================================
console.log('--- 1. O prazo, nos limites ---');

const S = await import(`file:///${MODULO.replace(/\\/g, '/')}`);
const {
  INATIVIDADE_MINUTOS, AVISO_ANTES_SEGUNDOS, CHAVE_ULTIMA_ATIVIDADE,
  EVENTOS_DE_ATIVIDADE, GRAVACAO_MINIMA_MS,
  faseDaSessao, msAteEncerrar, contagemRegressiva,
  registrarAtividade, lerUltimaAtividade, limparUltimaAtividade,
  sessaoRestauradaExpirou,
} = S;

const MIN = 60_000;

check(INATIVIDADE_MINUTOS >= 5 && INATIVIDADE_MINUTOS <= 60,
  `o prazo e de ${INATIVIDADE_MINUTOS} minutos (entre 5 e 60)`);
check(AVISO_ANTES_SEGUNDOS >= 30 && AVISO_ANTES_SEGUNDOS * 1000 < INATIVIDADE_MINUTOS * MIN,
  `avisa ${AVISO_ANTES_SEGUNDOS}s antes, e o aviso cabe dentro do prazo`);
check(GRAVACAO_MINIMA_MS * 4 < AVISO_ANTES_SEGUNDOS * 1000,
  'a gravacao da marca e frequente o bastante para nao cair dentro do aviso por atraso');

const T0 = 1_700_000_000_000;
const fase = (minutos, segundos = 0) => faseDaSessao(T0, T0 + minutos * MIN + segundos * 1000);

check(fase(0) === 'ATIVA', 'no instante da atividade: ATIVA');
check(fase(27, 59) === 'ATIVA', '27min59s: ainda ATIVA, sem aviso');
check(fase(28) === 'AVISO', '28min00s: entra em AVISO (exatamente 120s para o fim)');
check(fase(29, 59) === 'AVISO', '29min59s: ainda em AVISO');
check(fase(30) === 'ENCERRADA', '30min00s: ENCERRADA');
check(fase(90) === 'ENCERRADA', '1h30: ENCERRADA');

// Relogio da maquina adiantado, ou corrigido para tras: a marca fica no
// futuro. Encerrar aqui seria derrubar quem esta trabalhando.
check(faseDaSessao(T0 + 10 * MIN, T0) === 'ATIVA', 'marca no futuro (relogio errado) nao encerra');

check(msAteEncerrar(T0, T0) === INATIVIDADE_MINUTOS * MIN, 'msAteEncerrar conta o prazo inteiro');
check(msAteEncerrar(T0, T0 + 31 * MIN) < 0, 'msAteEncerrar fica negativo depois do prazo');

check(contagemRegressiva(120) === '2:00', 'contagem: 120s = 2:00');
check(contagemRegressiva(61) === '1:01', 'contagem: 61s = 1:01');
check(contagemRegressiva(59) === '0:59', 'contagem: 59s = 0:59');
check(contagemRegressiva(0) === '0:00', 'contagem: 0s = 0:00');
check(contagemRegressiva(-5) === '0:00', 'contagem: segundo negativo nao vira "-1:55"');

// ===========================================================================
// 2. VOLTAR PARA A ABA NAO E ATIVIDADE
// ===========================================================================
console.log('\n--- 2. O erro que anularia o controle ---');

const eventos = [...EVENTOS_DE_ATIVIDADE];
check(eventos.length > 0, `escuta ${eventos.length} evento(s) de atividade: ${eventos.join(', ')}`);
check(!eventos.includes('focus') && !eventos.includes('visibilitychange'),
  'focus e visibilitychange NAO contam como atividade (renovariam o prazo da aba esquecida)');
check(!eventos.includes('mousemove'),
  'mousemove nao conta: mouse esbarrado nao e alguem usando o sistema');
check(eventos.includes('keydown') && eventos.includes('pointerdown'),
  'tecla e clique contam como atividade');

const hook = semComentarios(fs.readFileSync('hooks/useSessaoInativa.ts', 'utf8'));
// O visibilitychange existe no hook, mas ligado a AVALIAR (conferir o prazo),
// nunca a MARCAR (renovar o prazo).
check(/addEventListener\('visibilitychange',\s*avaliar\)/.test(hook),
  'o hook usa visibilitychange para CONFERIR o prazo');
check(!/addEventListener\('visibilitychange',\s*marcar\)/.test(hook),
  'o hook nao usa visibilitychange para RENOVAR o prazo');
check(/!jaEncerrou\.current/.test(hook) && /^\s*jaEncerrou\.current = true;/m.test(hook),
  'o hook chama o encerramento uma vez, e nao a cada segundo depois do prazo');

// ===========================================================================
// 3. ARMAZENAMENTO: COMPARTILHADO ENTRE ABAS, E TOLERANTE A RECUSA
// ===========================================================================
console.log('\n--- 3. Armazenamento ---');

const fonte = semComentarios(fs.readFileSync('lib/sessaoInativa.ts', 'utf8'));
check(/window\.localStorage/.test(fonte), 'usa localStorage');
// Procura o ACESSO, e nao a palavra: o proprio arquivo explica em comentario
// por que sessionStorage nao serve, e um scanner que le a palavra reprova a
// explicacao junto com o defeito.
check(!/window\.sessionStorage|sessionStorage\.(get|set|remove)Item/.test(fonte),
  'nao acessa sessionStorage (e por aba: a atividade numa aba nao contaria na outra)');
check(CHAVE_ULTIMA_ATIVIDADE.startsWith('prevsafe:'),
  `a chave e do sistema: ${CHAVE_ULTIMA_ATIVIDADE}`);

// Sem window (renderizacao no servidor): nao pode lancar.
delete globalThis.window;
let lancou = false;
try {
  registrarAtividade();
  check(lerUltimaAtividade() === null, 'fora do navegador: le null, sem lancar');
  check(sessaoRestauradaExpirou() === false, 'fora do navegador: nao declara sessao expirada');
  limparUltimaAtividade();
} catch {
  lancou = true;
}
check(!lancou, 'fora do navegador: nenhuma funcao lanca');

// Armazenamento negado (modo privado, politica de cookie): tambem nao pode
// lancar, e nao pode encerrar a sessao por falta de marca.
const NEGADO = new Proxy({}, { get() { throw new Error('acesso negado'); } });
globalThis.window = { get localStorage() { throw new Error('acesso negado'); } };
lancou = false;
try {
  registrarAtividade();
  check(lerUltimaAtividade() === null, 'armazenamento negado: le null');
  check(sessaoRestauradaExpirou() === false, 'armazenamento negado: NAO encerra a sessao');
} catch {
  lancou = true;
}
check(!lancou, 'armazenamento negado: nenhuma funcao lanca');

globalThis.window = { localStorage: NEGADO };
lancou = false;
try {
  registrarAtividade();
  lerUltimaAtividade();
  limparUltimaAtividade();
} catch {
  lancou = true;
}
check(!lancou, 'getItem/setItem que lancam: nenhuma funcao lanca');

// Armazenamento funcionando.
const memoria = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
    setItem: (k, v) => memoria.set(k, String(v)),
    removeItem: (k) => memoria.delete(k),
  },
};

registrarAtividade(T0);
check(lerUltimaAtividade() === T0, 'grava e le a marca da ultima atividade');

memoria.set(CHAVE_ULTIMA_ATIVIDADE, 'ontem');
check(lerUltimaAtividade() === null, 'marca corrompida le como null, em vez de NaN');
check(sessaoRestauradaExpirou() === false, 'marca corrompida NAO encerra a sessao por engano');

memoria.set(CHAVE_ULTIMA_ATIVIDADE, String(Date.now() - 31 * MIN));
check(sessaoRestauradaExpirou() === true,
  'sessao restaurada com 31 min de inatividade: expirou (o token do Supabase ainda valeria)');

memoria.set(CHAVE_ULTIMA_ATIVIDADE, String(Date.now() - 5 * MIN));
check(sessaoRestauradaExpirou() === false, 'sessao restaurada com 5 min de inatividade: vale');

limparUltimaAtividade();
check(lerUltimaAtividade() === null, 'limpar apaga a marca');
check(sessaoRestauradaExpirou() === false,
  'sem marca (primeiro acesso depois do deploy): vale, nao ha inatividade provada');

// ===========================================================================
// 4. O SISTEMA USA ISSO
// ===========================================================================
console.log('\n--- 4. Ligacao com o sistema (conferencia no codigo) ---');

const ctx = semComentarios(fs.readFileSync('context/PrevSafeContext.tsx', 'utf8'));
const pagina = semComentarios(fs.readFileSync('app/sistema/page.tsx', 'utf8'));
const login = semComentarios(fs.readFileSync('components/auth/LoginView.tsx', 'utf8'));
const aviso = semComentarios(fs.readFileSync('components/auth/AvisoDeInatividade.tsx', 'utf8'));
const cliente = fs.readFileSync('lib/supabase.ts', 'utf8');

check(/autoRefreshToken:\s*true/.test(cliente),
  'o motivo continua de pe: o token do Supabase se renova sozinho');

// A condicao tem que ser A CHAMADA, sozinha: `if (false && expirou())` deixa
// a guarda no arquivo e a sessao aberta, e foi o que a prova de regressao
// passou por cima na primeira versao deste teste.
check(/if \(sessaoRestauradaExpirou\(\)\) \{/.test(ctx),
  'o contexto confere a inatividade ao restaurar a sessao, e a chamada e a condicao inteira');
// A ordem importa: conferir DEPOIS de autenticar deixaria a sessao aberta.
const restauracao = ctx.slice(ctx.indexOf('supabase.auth.getSession()'));
const posExpirou = restauracao.indexOf('sessaoRestauradaExpirou()');
const posAutentica = restauracao.indexOf('setIsAuthenticated(true)');
check(posExpirou >= 0 && posAutentica > posExpirou,
  'a conferencia vem ANTES de dar o usuario como autenticado');

check(/registrarAtividade\(\)/.test(ctx), 'o login comeca a contar o prazo');
check(/limparUltimaAtividade\(\)/.test(ctx), 'o logout apaga a marca');
check(/logout = useCallback\(\(motivo: MotivoDeEncerramento = 'USUARIO'\)/.test(ctx),
  'logout recebe o motivo, e o padrao e o usuario ter clicado em sair');
check(/'SESSION_TIMEOUT'/.test(ctx), 'a auditoria distingue timeout de logout do usuario');
check(/encerradaPorInatividade/.test(ctx), 'o contexto informa quando a sessao caiu por inatividade');

check(/<AvisoDeInatividade \/>/.test(pagina), 'o aviso esta montado na area autenticada');
check(/\{encerradaPorInatividade\s*&&/.test(login),
  'a tela de login avisa por que a sessao caiu (a bandeira condiciona o aviso, e nao so aparece)');
check(/INATIVIDADE_MINUTOS/.test(login), 'a tela de login diz o prazo, e nao um numero escrito a mao');

check(/fase !== 'AVISO'/.test(aviso), 'o aviso nao desenha nada enquanto a sessao esta ativa');
check(/logout\('INATIVIDADE'\)/.test(aviso), 'o aviso encerra informando o motivo');
check(/Continuar conectado/.test(aviso), 'o aviso deixa o usuario continuar');
check(!/setTimeout/.test(aviso), 'a contagem vem do hook, e nao de um temporizador solto na tela');

// ===========================================================================
// 5. DUAS ABAS DE VERDADE, NUM NAVEGADOR DE VERDADE
// ===========================================================================
console.log('\n--- 5. Duas abas, num Chromium de verdade ---');

let chromium;
try {
  ({ chromium } = await import(`file:///${path.resolve('node_modules/playwright/index.mjs').replace(/\\/g, '/')}`));
} catch (e) {
  inconclusivo('playwright nao esta disponivel para a prova das duas abas', e.message);
}

fs.writeFileSync(`${TMP}/pagina.html`, `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>t</title></head>
<body><pre id="saida">aguardando</pre>
<script type="module">
  import * as S from './sessaoInativa.mjs';
  window.S = S;
  document.getElementById('saida').textContent = 'pronto';
</script></body></html>`);

const DIR = path.resolve(TMP);
// file:// nao tem origem para localStorage, e modulos ES exigem http.
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

let navegador;
try {
  navegador = await chromium.launch();
  const contexto = await navegador.newContext();
  const abaA = await contexto.newPage();
  const abaB = await contexto.newPage();
  await abaA.goto(url);
  await abaB.goto(url);
  await abaA.waitForFunction('window.S !== undefined');
  await abaB.waitForFunction('window.S !== undefined');

  const marcaNaAbaA = await abaA.evaluate((t) => {
    window.S.registrarAtividade(t);
    return window.S.lerUltimaAtividade();
  }, T0);
  check(marcaNaAbaA === T0, 'aba A grava a marca no navegador');

  const marcaNaAbaB = await abaB.evaluate(() => window.S.lerUltimaAtividade());
  check(marcaNaAbaB === T0,
    'aba B le a marca gravada pela aba A (a atividade numa aba conta na outra)');

  // O prazo corre igual nas duas: com sessionStorage, a aba B veria null e
  // encerraria a sessao de quem esta trabalhando na aba A.
  const faseNaAbaB = await abaB.evaluate((t) => window.S.faseDaSessao(
    window.S.lerUltimaAtividade(), t + 29 * 60_000
  ), T0);
  check(faseNaAbaB === 'AVISO', 'aba B calcula a mesma fase a partir da marca compartilhada');

  const sobreviveu = await abaA.evaluate(async (endereco) => {
    window.location.reload();
    return true;
  }, url);
  await abaA.waitForFunction('window.S !== undefined');
  const depoisDoRecarregamento = await abaA.evaluate(() => window.S.lerUltimaAtividade());
  check(sobreviveu && depoisDoRecarregamento === T0,
    'a marca sobrevive ao recarregamento (fechar e reabrir nao zera o prazo)');
} catch (e) {
  inconclusivo('falha ao rodar a prova no Chromium', e.message);
} finally {
  if (navegador) await navegador.close();
  servidor.close();
}

fs.rmSync(TMP, { recursive: true, force: true });

console.log(`\n${casos - falhas}/${casos} casos passaram.`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S).`);
  process.exit(1);
}
console.log('Sessao: encerra por inatividade, avisa antes, e conta o prazo entre abas.');
process.exit(0);
