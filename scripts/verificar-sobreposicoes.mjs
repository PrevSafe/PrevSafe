/**
 * Verificacao das sobreposicoes fixas no canto da tela.
 *
 *   node scripts/verificar-sobreposicoes.mjs
 *
 * POR QUE ESTE SCRIPT EXISTE
 *
 * O balao de atalhos ficava `fixed bottom-5 right-5` e cobria, em TODA tela do
 * sistema, o pe da barra de rolagem e o conteudo do canto inferior direito -
 * inclusive a barra horizontal das tabelas largas, que e onde ela fica. O
 * usuario reportou; nenhum teste podia pegar, porque o defeito nao e de dado
 * nem de cor: e um elemento ancorado num canto que pertence a quem rola a
 * pagina.
 *
 * A REGRA
 *
 * Elemento `fixed` ancorado no canto inferior direito - tem `bottom-` e
 * `right-`, nao tem `left-` (nao atravessa a tela) e nao e `inset-0` (nao e
 * modal) - precisa ser declarado no codigo, na linha anterior, assim:
 *
 *     CANTO-FLUTUANTE: <por que pode ficar ali>
 *
 * Nao e proibicao: aviso que sai no primeiro clique pode ocupar o canto por
 * alguns segundos. O que nao pode e um elemento PERMANENTE aparecer ali sem
 * ninguem ter pensado em quem estava rolando a pagina.
 *
 * Saida: 0 tudo passou, 1 houve falha.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let casos = 0;
let falhas = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

/** Todo .tsx de app/ e components/. */
function arquivos(dir, saida = []) {
  for (const nome of fs.readdirSync(dir)) {
    const alvo = path.join(dir, nome);
    const info = fs.statSync(alvo);
    if (info.isDirectory()) arquivos(alvo, saida);
    else if (nome.endsWith('.tsx')) saida.push(alvo);
  }
  return saida;
}

const MARCA = /CANTO-FLUTUANTE:\s*([^*}\n]*)/;

/**
 * Ancorado no canto inferior direito?
 *
 * `left-` derruba a suspeita porque o elemento atravessa a tela (a barra de
 * navegacao do celular e `bottom-0 left-0 right-0`), e `inset-0` porque modal
 * cobre tudo de proposito.
 */
function ancoradoNoCanto(classes) {
  if (!/\bfixed\b/.test(classes)) return false;
  if (/\binset-0\b/.test(classes)) return false;
  if (/(^|\s|:)left-/.test(classes)) return false;
  return /(^|\s|:)bottom-/.test(classes) && /(^|\s|:)right-/.test(classes);
}

console.log('--- Nada fixo no canto de quem rola a pagina ---');

const alvos = [
  ...arquivos(path.join(RAIZ, 'app')),
  ...arquivos(path.join(RAIZ, 'components')),
];

const encontrados = [];
for (const arquivo of alvos) {
  const texto = fs.readFileSync(arquivo, 'utf8');
  const linhas = texto.split('\n');
  for (const m of texto.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const classes = (m[1] || m[2] || '').replace(/\s+/g, ' ');
    if (!ancoradoNoCanto(classes)) continue;
    const linha = texto.slice(0, m.index).split('\n').length;
    // A declaracao fica nas linhas imediatamente acima, junto do elemento.
    const acima = linhas.slice(Math.max(0, linha - 5), linha).join('\n');
    encontrados.push({
      arquivo: path.relative(RAIZ, arquivo).replace(/\\/g, '/'),
      linha,
      declarado: MARCA.exec(acima),
    });
  }
}

const semDeclaracao = encontrados.filter((e) => !e.declarado);
check(
  semDeclaracao.length === 0,
  semDeclaracao.length === 0
    ? `${encontrados.length} sobreposicao(oes) no canto, todas declaradas`
    : `sobreposicao no canto sem CANTO-FLUTUANTE: ${semDeclaracao
        .map((e) => `${e.arquivo}:${e.linha}`).join(', ')}`
);

// Marcador sem motivo nao protege ninguem: vira carimbo.
for (const achado of encontrados.filter((e) => e.declarado)) {
  const motivo = (achado.declarado[1] || '').trim();
  check(
    motivo.length >= 12,
    `${achado.arquivo}:${achado.linha} declara por que pode ficar no canto ("${motivo.slice(0, 48)}")`
  );
}

// O caso que originou tudo, nomeado: a area do sistema nao volta a ter um
// balao permanente no canto.
const sistema = fs.readFileSync(path.join(RAIZ, 'app/sistema/page.tsx'), 'utf8');
check(!/fixed bottom-5 right-5/.test(sistema),
  'a tela do sistema nao tem balao fixo no canto inferior direito');
check(!/Atalhos:/.test(sistema),
  'o balao de atalhos nao voltou para a area de conteudo');

// E o que ele fazia continua ao alcance, sem cobrir nada.
const navbar = fs.readFileSync(path.join(RAIZ, 'components/layout/Navbar.tsx'), 'utf8');
const pagina = sistema;
check(/onClick=\{onOpenShortcutsHelp\}/.test(navbar),
  'a barra superior tem o botao que abre os atalhos');
check(/onOpenShortcutsHelp\(\); setShowMoreMenu\(false\);/.test(navbar),
  'e o menu "Mais" continua com a mesma opcao, para quem esta em tela estreita');
check(/onOpenShortcutsHelp=\{\(\) => setIsShortcutsHelpOpen\(true\)\}/.test(pagina),
  'a pagina liga o botao a janela de atalhos');

console.log(`\n${casos - falhas}/${casos} casos passaram.`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S).`);
  process.exit(1);
}
console.log('Sobreposicoes: o canto de quem rola a pagina esta livre.');
process.exit(0);
