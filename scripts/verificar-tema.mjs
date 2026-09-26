/**
 * Verificacao do tema das telas do sistema.
 *
 *   node scripts/verificar-tema.mjs
 *
 * POR QUE ESTE SCRIPT EXISTE
 *
 * O catalogo de riscos ocupacionais foi convertido para o tema escuro por
 * substituicao mecanica e chegou ao usuario com campo branco e fonte branca.
 * A substituicao produziu quatro defeitos que nenhum teste pegava:
 *
 *   1. `bg-amber-500/15/70` — opacidade dupla. A classe nao existe em
 *      Tailwind, e descartada na compilacao, e o elemento fica SEM FUNDO.
 *      Foi assim que o painel branco apareceu.
 *   2. controle de formulario sem `bg-` e sem `text-`: herda o padrao do
 *      navegador, que e o branco no branco que o usuario viu.
 *   3. anel e borda claros sobre fundo escuro, invisiveis.
 *   4. `hover:text-X` igual a cor de origem, que nao muda nada.
 *
 * E PROTEGE O CAMINHO CONTRARIO
 *
 * Nem tudo que e branco esta errado. Ficha de EPI, documento do acidente e
 * quadro de assinatura sao PAPEL: impressos ou fotografados. Escurece-los
 * estragaria o documento, e e o que uma proxima conversao mecanica faria.
 *
 * Por isso cada regiao clara e declarada no proprio codigo, entre
 * `TEMA-CLARO-INICIO: <motivo>` e `TEMA-CLARO-FIM`, e este script confere que
 * ela CONTINUA clara. Marcador sem motivo, sem fechamento ou sem nada claro
 * dentro tambem falha: marcador que apodrece deixa de proteger.
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

/**
 * Classes de tema claro.
 *
 * As fronteiras de palavra importam: sem elas, `bg-slate-50` casa dentro de
 * `bg-slate-500` e o inventario enche de falso positivo.
 */
const CLARAS = new RegExp(
  '\\b(?:bg-white|bg-gray-\\d+|text-gray-\\d+|border-gray-\\d+|divide-gray-\\d+'
  + '|bg-slate-(?:50|100|200)|border-slate-(?:100|200|300)|divide-slate-(?:100|200)'
  + '|ring-[a-z]+-(?:100|200)|bg-[a-z]+-50|text-black'
  + '|text-(?:slate|gray|zinc|neutral)-(?:700|800|900))\\b',
  'g'
);

/** Opacidade dupla: a classe nao existe e o elemento perde o estilo. */
const OPACIDADE_DUPLA = /\b[a-z-]+-\d{2,3}\/\d{1,3}\/\d{1,3}\b/g;

/** Hover que repete a cor de origem. */
const HOVER_INUTIL = /text-(slate-\d+) hover:text-\1\b/g;

const MARCA_INICIO = /TEMA-CLARO-INICIO:?\s*([^*}\n]*)/;
const MARCA_FIM = /TEMA-CLARO-FIM/;

/**
 * Telas conferidas. Sao as do modulo de Engenharia SST, que e onde a
 * conversao passou e onde estao os documentos em papel.
 */
const TELAS = [
  'components/sst/OccupationalRisksCatalogView.tsx',
  'components/sst/SeletorTabela24.tsx',
  'components/sst/SeletorTabela27.tsx',
  'components/sst/AccidentIncidentReportView.tsx',
  'components/sst/EPIManagementTab.tsx',
  'components/sst/SSTElectronicSignatureModal.tsx',
  'components/sst/HierarchyTab.tsx',
  'components/sst/GHERiskInventoryTab.tsx',
  'components/sst/ContractedOrganizationsTab.tsx',
  'components/sst/MachinesEquipmentTab.tsx',
  'components/sst/ChemicalProductsTab.tsx',
  'components/sst/TrainingMatrixTab.tsx',
  'components/sst/ErgonomicAssessmentTab.tsx'
];

/**
 * Arquivo que e documento do comeco ao fim, e nao interface.
 *
 * O DocumentPreviewModal desenha a previa do PGR, do PCMSO e dos laudos como
 * folha: o branco ali e o papel, nao um descuido.
 */
const ARQUIVOS_DE_DOCUMENTO = {
  'components/sst/DocumentPreviewModal.tsx':
    'previa dos documentos tecnicos desenhada como folha de papel'
};

/** Divide o arquivo em linhas de interface e linhas de regiao clara declarada. */
function separarRegioes(fonte, rel) {
  const linhas = fonte.split('\n');
  const interface_ = [];
  const claras = [];
  const problemas = [];
  let dentro = false;
  let motivo = '';
  let abertaEm = 0;

  linhas.forEach((linha, i) => {
    const numero = i + 1;
    const inicio = linha.match(MARCA_INICIO);
    if (inicio) {
      if (dentro) {
        problemas.push(`marcador aberto na linha ${numero} sem fechar o da linha ${abertaEm}`);
      }
      dentro = true;
      abertaEm = numero;
      motivo = inicio[1].trim().replace(/\s*(\*\/|\}).*$/, '').trim();
      if (!motivo) {
        problemas.push(`marcador da linha ${numero} nao diz por que a regiao e clara`);
      }
      claras.push({ numero, linha, motivo, marcador: true });
      return;
    }
    if (MARCA_FIM.test(linha)) {
      if (!dentro) {
        problemas.push(`TEMA-CLARO-FIM na linha ${numero} sem abertura`);
      }
      dentro = false;
      return;
    }
    (dentro ? claras : interface_).push({ numero, linha, motivo });
  });

  if (dentro) {
    problemas.push(`marcador aberto na linha ${abertaEm} nunca foi fechado`);
  }
  return { interface_, claras, problemas, rel };
}

console.log('--- regioes claras declaradas no codigo ---');

const regioesPorArquivo = new Map();
for (const rel of TELAS) {
  const fonte = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  const r = separarRegioes(fonte, rel);
  regioesPorArquivo.set(rel, { fonte, ...r });
  const nome = rel.split('/').pop();
  if (r.problemas.length > 0) {
    check(false, `${nome}: ${r.problemas.join('; ')}`);
  }
}

// Toda regiao declarada tem de continuar clara. Se alguem escurecer a ficha de
// EPI, o documento impresso vira papel preto e o marcador fica mentindo.
for (const [rel, r] of regioesPorArquivo) {
  const temMarcador = r.claras.some((l) => l.marcador);
  if (!temMarcador) continue;
  const nome = rel.split('/').pop();
  const corpo = r.claras.filter((l) => !l.marcador).map((l) => l.linha).join('\n');
  // O fundo branco e o que faz a regiao ser papel. Exigir apenas "alguma
  // classe clara" deixava passar o escurecimento do container, porque as
  // classes internas continuavam claras.
  const fundos = corpo.match(/\bbg-white\b/g) || [];
  const achadas = corpo.match(CLARAS) || [];
  check(
    fundos.length > 0,
    `${nome}: a regiao declarada continua em fundo branco (${fundos.length} bg-white, ${achadas.length} classes claras) — ${
      r.claras.find((l) => l.marcador)?.motivo || 'sem motivo'
    }`
  );
}

console.log('\n--- interface: tema escuro, sem classe clara solta ---');

for (const [rel, r] of regioesPorArquivo) {
  const nome = rel.split('/').pop();
  const corpo = r.interface_.map((l) => l.linha).join('\n');

  const claras = corpo.match(CLARAS) || [];
  check(
    claras.length === 0,
    `${nome}: nenhuma classe clara fora de regiao declarada${
      claras.length ? `: ${[...new Set(claras)].join(', ')}` : ''
    }`
  );
}

console.log('\n--- opacidade dupla: a classe nao existe e o fundo some ---');

for (const [rel, r] of regioesPorArquivo) {
  const nome = rel.split('/').pop();
  const dobradas = r.fonte.match(OPACIDADE_DUPLA) || [];
  check(
    dobradas.length === 0,
    `${nome}: nenhuma classe com opacidade dupla${
      dobradas.length ? `: ${[...new Set(dobradas)].join(', ')}` : ''
    }`
  );
}

/**
 * className de cada input, select e textarea do trecho.
 *
 * A busca parte da TAG porque o `=>` das arrow functions em JSX quebra
 * qualquer regex que tente ir da tag ate o className com `[^>]*`: o primeiro
 * `>` encontrado costuma ser o da seta, e nao o fim da tag. Entao le-se uma
 * janela a partir da tag, ate a proxima tag de formulario ou 800 caracteres.
 */
function classesDosControles(trecho) {
  const fora = [];
  const tags = [...trecho.matchAll(/<(input|select|textarea)\b/g)];
  tags.forEach((t, i) => {
    const inicio = t.index;
    const fim = i + 1 < tags.length ? Math.min(tags[i + 1].index, inicio + 800) : inicio + 800;
    const janela = trecho.slice(inicio, fim);
    const m = janela.match(/className=(?:"([^"]*)"|\{`([^`]*)`\})/);
    if (!m) return;
    // Checkbox e radio sao pintados por `accent-`, nao por fundo e texto.
    if (/type="(checkbox|radio)"/.test(janela)) return;
    fora.push({ tag: t[1], cls: (m[1] || m[2] || '').replace(/\s+/g, ' ') });
  });
  return fora;
}

console.log('\n--- controles de formulario: fundo e cor de texto proprios ---');

for (const [rel, r] of regioesPorArquivo) {
  const nome = rel.split('/').pop();
  // Regiao clara fica de fora: campo dentro de documento impresso e branco.
  const corpo = r.interface_.map((l) => l.linha).join('\n');
  const controles = classesDosControles(corpo);
  if (controles.length === 0) continue;

  const semFundo = controles.filter((c) => !/(^| )bg-/.test(c.cls));
  const semTexto = controles.filter((c) => !/(^| )text-(?:white|[a-z]+-(?:100|200|300|400))/.test(c.cls));
  check(
    semFundo.length === 0,
    `${nome}: os ${controles.length} controles tem fundo proprio${
      semFundo.length ? ` — ${semFundo.length} sem: ${semFundo.map((c) => c.tag).join(', ')}` : ''
    }`
  );
  check(
    semTexto.length === 0,
    `${nome}: os ${controles.length} controles tem cor de texto propria${
      semTexto.length ? ` — ${semTexto.length} sem: ${semTexto.map((c) => c.tag).join(', ')}` : ''
    }`
  );
}

console.log('\n--- hover que nao muda nada ---');

for (const [rel, r] of regioesPorArquivo) {
  const nome = rel.split('/').pop();
  const inuteis = r.fonte.match(HOVER_INUTIL) || [];
  check(
    inuteis.length === 0,
    `${nome}: nenhum hover que repete a propria cor${
      inuteis.length ? `: ${[...new Set(inuteis)].join(', ')}` : ''
    }`
  );
}

console.log('\n--- arquivos que sao documento, e nao interface ---');

for (const [rel, motivo] of Object.entries(ARQUIVOS_DE_DOCUMENTO)) {
  const fonte = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  const nome = rel.split('/').pop();
  const claras = fonte.match(CLARAS) || [];
  check(claras.length > 0, `${nome}: continua claro (${claras.length} classes) — ${motivo}`);
  const dobradas = fonte.match(OPACIDADE_DUPLA) || [];
  check(dobradas.length === 0, `${nome}: nenhuma classe com opacidade dupla`);
}

console.log(
  falhas === 0
    ? `\nTODOS OS TESTES PASSARAM (${casos} casos)`
    : `\n${falhas} FALHA(S) em ${casos} casos`
);
process.exitCode = falhas === 0 ? 0 : 1;
