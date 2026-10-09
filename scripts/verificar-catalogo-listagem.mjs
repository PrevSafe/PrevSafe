/**
 * Verificacao do catalogo de riscos importado da listagem do usuario.
 *
 *   node scripts/verificar-catalogo-listagem.mjs
 *
 * O QUE ESTA SENDO PROVADO
 *
 * lib/catalogoDeRiscosDaListagem.ts e gerado por
 * scripts/gerar-catalogo-da-listagem.mjs a partir de
 * docs/fontes/listagem-de-riscos.txt. O limite de tolerancia de cada item vai
 * para o PGR do cliente, entao nao basta o arquivo "parecer certo":
 *
 *   1. As 910 linhas de risco da fonte foram lidas, e cada uma virou um item
 *      ou foi deduplicada com motivo. Nenhum item sem linha na fonte.
 *   2. O arquivo gravado e o que a fonte gera hoje (regenera e compara).
 *   3. Todo codigo existe na Tabela 24; 09.01.001 so na ausencia de agente
 *      nocivo; os demais codigos ficam como a fonte traz.
 *   4. Nenhum limite 0: 0 na fonte e "sem valor fixo" e vira campo ausente.
 *      Limites, teto e casas decimais conferem com a fonte linha a linha, e o
 *      texto do limite e o de textoDoLimite.
 *   5. Ids unicos e derivados do nome, nunca da posicao.
 *   6. As correcoes da fonte foram aplicadas; nenhum campo descritivo
 *      inventado; grupos conforme a fonte e a decisao do usuario.
 *   7. Pontos conferidos contra a fonte, a mao.
 *   8. O gerador falha alto - com a linha - no que nao entende.
 *   9. As 22 duplicatas de itens curados saem INACTIVE com duplicate_of_id de
 *      um curado que existe; nenhuma outra linha sai inativa.
 *  10. Conferencia com a NR-15: cada item conferido bate com a linha que cita
 *      no texto oficial guardado em docs/fontes/ (limite na unidade, valor
 *      teto, grau -> adicional, fonte no texto do limite); cada correcao pela
 *      NR-15 acha na norma o valor que aplicou; nenhum item nao conferido traz
 *      insalubridade nem cita a norma; nenhum quantitativo com o nome exato de
 *      um agente do Quadro n. 1 ficou de fora.
 *  11. Os criterios vem do texto da norma, nao de memoria: grau -> adicional
 *      (NR-15, 15.2), nivel de acao = metade do limite (NR-09, 9.6.1 b) e os
 *      niveis de acao da vibracao (NR-09, Anexo I).
 *
 * A NORMA E LIDA AQUI POR UM CAMINHO PROPRIO. O gerador nao le a norma: ele
 * so aplica as listas que a conferencia montou. Este verificador le
 * docs/fontes/nr15-anexo11.txt sozinho e acha as colunas do Quadro n. 1 pela
 * posicao das palavras do CABECALHO do proprio Quadro ("Valor teto",
 * "p/pele", "ppm*", "mg/m3*"): cada "+" ou numero vai para a coluna mais
 * proxima. Se a extracao ou as listas do gerador estiverem erradas, a
 * comparacao com o texto acusa.
 *
 * COMO O TESTE PROCURA O DEFEITO
 *
 * Nos DADOS, pela forma: o modulo compilado e carregado, e cada item e
 * confrontado com a linha da fonte, relida aqui por um caminho proprio (o
 * nome do item como prefixo da linha, e os numeros pela posicao na linha) -
 * nao pelo gerador. Se o gerador errasse e o arquivo fosse regenerado com o
 * erro, a comparacao do item 2 passaria; estas nao.
 *
 * Cada checagem e provada por mutacao: o autoteste reintroduz o defeito numa
 * COPIA dos dados (limite 0, codigo inexistente, id por posicao, correcao
 * desfeita...) e exige que a checagem acuse. Se nao acusar, a checagem nao
 * prova nada e o resultado e INCONCLUSIVO. Depois confere, por sha256, que os
 * dados e os arquivos ficaram byte a byte como estavam.
 *
 * Saida: 0 tudo passou, 1 houve falha, 2 INCONCLUSIVO.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..'
);
const TMP = path.join(RAIZ, '.tmp-catalogo-listagem-verificacao');

function inconclusivo(motivo, detalhe) {
  console.log('\nINCONCLUSIVO — a verificação não pôde ser executada.');
  console.log(`motivo: ${motivo}`);
  if (detalhe) console.log(String(detalhe).split('\n').slice(0, 20).join('\n'));
  process.exit(2);
}

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

const REL = {
  fonte: 'docs/fontes/listagem-de-riscos.txt',
  gerado: 'lib/catalogoDeRiscosDaListagem.ts',
  curados: 'lib/occupationalRisksCatalogData.ts',
  tabela24: 'lib/tabela24.ts',
  limites: 'lib/limitesDoCatalogo.ts',
  gerador: 'scripts/gerar-catalogo-da-listagem.mjs',
  anexo11: 'docs/fontes/nr15-anexo11.txt',
  trechos15: 'docs/fontes/nr15-trechos.txt',
  nr09: 'docs/fontes/nr09-nivel-de-acao.txt',
};
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const sha = (txt) => createHash('sha256').update(txt).digest('hex');
const hashDosArquivos = () => Object.values(REL).map((rel) => sha(fs.readFileSync(path.join(RAIZ, rel)))).join(':');
const HASH_INICIAL_DOS_ARQUIVOS = hashDosArquivos();

// ---------------------------------------------------------------------------
// Compilacao
// ---------------------------------------------------------------------------
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
const NOSSOS = [REL.gerado, REL.curados, REL.tabela24, REL.limites];
fs.writeFileSync(
  path.join(TMP, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      outDir: TMP,
      module: 'commonjs',
      target: 'es2020',
      moduleResolution: 'node',
      esModuleInterop: true,
      skipLibCheck: true,
      baseUrl: RAIZ,
      paths: { '@/*': ['./*'] },
    },
    files: NOSSOS.map((rel) => path.join(RAIZ, rel)),
  })
);

// O tsc emite mesmo com erro de tipo. Erro nos arquivos do catalogo e FALHA;
// erro so em outro arquivo (o tree e compartilhado) nao invalida estes dados.
let saidaTsc = '';
try {
  execFileSync('npx', ['tsc', '-p', path.join(TMP, 'tsconfig.json')], { stdio: 'pipe', shell: true, cwd: RAIZ });
} catch (e) {
  saidaTsc = `${e.stdout?.toString() || ''}${e.stderr?.toString() || ''}`;
  if (!saidaTsc.trim()) inconclusivo('npx tsc falhou', e.message);
}
const errosDeTipo = saidaTsc.split('\n').filter((l) => /error TS/.test(l));
const errosNossos = errosDeTipo.filter((l) => NOSSOS.some((rel) => l.replace(/\\/g, '/').includes(rel)));

for (const dir of [path.join(TMP, 'lib'), TMP]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const alvo = path.join(dir, f);
    fs.writeFileSync(alvo, fs.readFileSync(alvo, 'utf8').replace(/require\("@\/lib\/([^"]+)"\)/g, 'require("./$1")'));
  }
}
fs.writeFileSync(path.join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const require_ = createRequire(path.join(RAIZ, 'scripts', 'x.cjs'));
const achar = (n) => [path.join(TMP, 'lib', n), path.join(TMP, n)].find((p) => fs.existsSync(p));

let listagem, dados, t24, limites, gerador;
try {
  listagem = require_(achar('catalogoDeRiscosDaListagem.js'));
  dados = require_(achar('occupationalRisksCatalogData.js'));
  t24 = require_(achar('tabela24.js'));
  limites = require_(achar('limitesDoCatalogo.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', `${e.message}\n${errosDeTipo.join('\n')}`);
}
try {
  gerador = await import(pathToFileURL(path.join(RAIZ, REL.gerador)).href);
} catch (e) {
  inconclusivo('não foi possível carregar o gerador', e.message);
}

console.log('--- compilação ---');
check(errosNossos.length === 0, `os arquivos do catálogo compilam sem erro de tipo${errosNossos.length ? `:\n  ${errosNossos.slice(0, 5).join('\n  ')}` : ''}`);
if (errosDeTipo.length > errosNossos.length) {
  console.log(`aviso: ${errosDeTipo.length - errosNossos.length} erro(s) de tipo em outros arquivos do tree, fora deste teste`);
}

// ---------------------------------------------------------------------------
// O que a fonte diz, relido aqui por um caminho proprio
// ---------------------------------------------------------------------------
const LINHAS_ESPERADAS = 910;
const AUS = t24.CODIGO_AUSENCIA_DE_RISCO;
const DATA = '2026-10-08T00:00:00Z';
const TEXTO_T24 = ler(REL.tabela24);
const TEXTO_CURADOS = ler(REL.curados);

const GRUPO_ESPERADO = {
  'Químico': 'QUÍMICO',
  'Físico': 'FÍSICO',
  'Biológico': 'BIOLÓGICO',
  'Ergonômico': 'ERGONÔMICO',
  'Acidentes': 'ACIDENTES',
};
// Decisao do usuario em 08/10/2026.
const INESPECIFICOS_DECIDIDOS = {
  'Ausência de agente nocivo ou de atividades previstas no Anexo IV do Decreto 3.048/1999': 'AUSÊNCIA_RISCO',
  'Mineração subterrânea cujas atividades sejam exercidas afastadas das frentes de produção': 'FÍSICO',
  'Trabalhos em atividades permanentes no subsolo de minerações subterrâneas em frente de produção': 'FÍSICO',
  'Trabalho com Manipulação de Alimentos': 'BIOLÓGICO',
};
const CORRECOES_ESPERADAS = [
  ['Agentes biológicos (bactérias, vírus, fungos e outros)', 'group', 'FÍSICO', 'BIOLÓGICO'],
  ['Acidente de trânsito', 'propagation_paths', 'Acidente de trânsito', ''],
  ['Acidente de trânsito', 'standard_unit', 'Acidente de trânsito', ''],
];
const MEIOS_VALIDOS = new Set(['', 'Ar e contato', 'Ar', 'Contato']);
const UNIDADES_VALIDAS = new Set(['ppm', 'mg/m³', 'm/s²', 'm/s1,75', 'Milisievert (mSv)', '°C', 'dB(A)', 'dB(C)']);
/** Os unicos campos que um item da listagem pode ter: o que ela diz, e nada descritivo. */
const CAMPOS_PERMITIDOS = new Set([
  'id', 'name', 'group', 'propagation_paths', 'evaluation_type', 'recommended_epis', 'suggested_exams_pcmso',
  'catalog_source', 'is_system_default', 'status', 'created_at', 'updated_at', 'standard_unit', 'code_table_24',
  'esocial_enquadramento_nota', 'tolerance_limit_value', 'tolerance_limit_reference', 'tolerance_limit_is_ceiling',
  'action_level_value', 'action_level_reference', 'measurement_decimal_places', 'effect_classification',
  // Duplicata de curado e insalubridade conferida na NR-15 (checagens proprias abaixo).
  'duplicate_of_id', 'insalubridade_applicable', 'insalubridade_degree_suggested', 'insalubridade_legal_basis',
]);

// Decisao do usuario em 09/10/2026: linhas que repetem um curado no mesmo
// nivel de detalhe. Copia propria, nao a do gerador.
const DUPLICATAS_ESPERADAS = {
  'Ruído impulsivo ou de impacto': 'risk-cat-02',
  'Trabalhos com exposição ao calor nos termos da NR-15, da Portaria 3.214/1978': 'risk-cat-03',
  'Vibrações localizadas (mão-braço)': 'risk-cat-05',
  'Radiações não ionizantes': 'risk-cat-06',
  'Frio': 'risk-cat-07',
  'Fumos metálicos': 'risk-cat-08',
  'Óleos e Graxas Minerais (Hidrocarbonetos Aromáticos)': 'risk-cat-12',
  'Microrganismos Patogênicos': 'risk-cat-13',
  'Agentes biológicos (bactérias, vírus, fungos e outros)': 'risk-cat-13',
  'Trabalhos em estabelecimentos de saúde com contato com pacientes portadores de doenças infectocontagiosas ou com manuseio de materiais contaminados': 'risk-cat-13',
  'Trabalhos em galerias, fossas e tranques de esgoto': 'risk-cat-14',
  'Levantamento e transporte manual de cargas ou volumes': 'risk-cat-15',
  'Trabalho em posturas incômodas ou pouco confortáveis por longos períodos': 'risk-cat-16',
  'Exigência de posturas inadequadas': 'risk-cat-16',
  'Frequente execução de movimentos repetitivos': 'risk-cat-17',
  'Trabalho em Altura': 'risk-cat-18',
  'Queda com diferença de nível': 'risk-cat-18',
  'Máquinas e equipamentos sem proteção': 'risk-cat-19',
  'Condições ou procedimentos que possam provocar contato com eletricidade': 'risk-cat-20',
  'Trabalho em Espaço Confinado': 'risk-cat-21',
  'Projeção de partículas': 'risk-cat-23',
  'Ausência de agente nocivo ou de atividades previstas no Anexo IV do Decreto 3.048/1999': 'risk-cat-25',
};

// Correcoes pela NR-15 conferidas a mao no Quadro n. 1: [nome, campo, o que a
// fonte traz, o que a norma diz]. O nivel de acao e a metade do limite.
const CORRECOES_NR15_ESPERADAS = [
  ['1,1-Dicloro-1-nitroetano', 'tolerance_limit_is_ceiling', false, true],
  ['Ácido clorídrico (cloreto de hidrogênio, gás clorídrico)', 'tolerance_limit_is_ceiling', false, true],
  ['Ácido crômico (névoa)', 'tolerance_limit_value', 0, 0.04],
  ['Ácido crômico (névoa)', 'action_level_value', 0, 0.02],
  ['Ácido fluorídrico', 'tolerance_limit_value', 2, 1.5],
  ['Ácido fluorídrico', 'action_level_value', 1, 0.75],
  ['Ácido metanoico (ácido fórmico)', 'tolerance_limit_value', 1.5, 7],
  ['Ácido metanoico (ácido fórmico)', 'action_level_value', 0.75, 3.5],
  ['Álcool n-butílico (n-butanol)', 'tolerance_limit_is_ceiling', false, true],
  ['Cloreto de vinila (cloroetílico)', 'tolerance_limit_is_ceiling', false, true],
  ['Demeton (Systox)', 'tolerance_limit_value', 0.1, 0.08],
  ['Demeton (Systox)', 'action_level_value', 0.05, 0.04],
  ['Diborano', 'tolerance_limit_value', 0.1, 0.08],
  ['Diborano', 'action_level_value', 0.05, 0.04],
  ['Diclorodifluormetano', 'tolerance_limit_is_ceiling', false, true],
  ['Dióxido de nitrogênio', 'tolerance_limit_is_ceiling', false, true],
  ['Formaldeído (formol ou Aldeído fórmico)', 'tolerance_limit_is_ceiling', false, true],
  ['Monometil hidrazina (metil hidrazina)', 'tolerance_limit_is_ceiling', false, true],
  ['n-Butilamina', 'tolerance_limit_is_ceiling', false, true],
  ['Pentaborano', 'tolerance_limit_value', 0, 0.008],
  ['Pentaborano', 'action_level_value', 0, 0.004],
];
const FONTE_A11 = 'NR-15, Anexo 11';
const FONTE_A8 = 'NR-15, Anexo 8';
const CAMPOS_DE_INSALUBRIDADE = ['insalubridade_applicable', 'insalubridade_degree_suggested', 'insalubridade_legal_basis'];

const tem = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const achatar = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const normalizado = (s) => achatar(s).replace(/\s+/g, '');
const slug = (s) => achatar(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const numero = (t) => Number(String(t).replace(/,/g, ''));

const linhasDaFonte = (fonte) => fonte.split(/\r?\n/)
  .map((t, i) => ({ t, n: i + 1 }))
  .filter(({ t }) => t.trim() && !t.startsWith('#'));

const RE_GRUPO_APOS_NOME = /^ ?(Químico|Físico|Biológico|Ergonômico|Acidentes|Inespecífico) /;

/** Cada linha da fonte com o(s) item(ns) ou deduplicada(s) cujo nome a inicia. */
const memo = new WeakMap();
function casarLinhas(ctx) {
  if (memo.has(ctx)) return memo.get(ctx);
  const alvos = [
    ...ctx.listagem.map((item) => ({ nome: item.name, alvo: item, item })),
    ...ctx.deduplicadas.map((d) => ({ nome: d.nome, alvo: d })),
  ];
  const r = linhasDaFonte(ctx.fonte).map(({ t, n }) => ({
    t, n, casados: alvos.filter((a) => t.startsWith(a.nome) && RE_GRUPO_APOS_NOME.test(t.slice(a.nome.length))),
  }));
  memo.set(ctx, r);
  return r;
}

/** Os campos da linha pela posicao, depois do nome. */
function camposDaLinha(t, nome) {
  const resto = t.slice(nome.length);
  const a = resto.match(/ (Qualitativo|Quantitativo) (\S+) (Sim|Não) (\S+) \S+ \S+ (?:(\d+) )?\d+ (Não Aplica|Leve|Moderado) (?:Sim|Não) /);
  if (!a) return null;
  return {
    grupo: resto.match(RE_GRUPO_APOS_NOME)[1],
    lt: numero(a[2]),
    teto: a[3] === 'Sim',
    na: numero(a[4]),
    casas: a[5] === undefined ? null : Number(a[5]),
    efeito: a[6],
    codigo: resto.match(/ (\d{2}\.\d{2}\.\d{3}) - \S.*$/)?.[1] || '',
  };
}

/** Para cada linha que virou item: [item, campos da linha]. */
function itensComLinha(ctx) {
  return casarLinhas(ctx).filter((l) => l.casados.length === 1 && l.casados[0].item)
    .map((l) => [l.casados[0].item, camposDaLinha(l.t, l.casados[0].nome), l]);
}

/** Casas decimais que o numero pede: 0.75 -> 2. */
const casasDe = (n) => {
  if (typeof n !== 'number') return 0;
  let k = 0;
  while (k < 10 && Math.round(n * 10 ** k) / 10 ** k !== n) k++;
  return k;
};

const CAMPO_DA_FONTE = { tolerance_limit_value: 'lt', action_level_value: 'na', tolerance_limit_is_ceiling: 'teto' };

/**
 * O que o item deve trazer: o que a linha da fonte diz, com as correcoes pela
 * NR-15 que ESTE verificador espera por cima. Casas sobem so onde houve
 * correcao e o valor corrigido pede mais.
 */
function esperadoDoItem(nome, f) {
  const e = { lt: f.lt, na: f.na, teto: f.teto, casas: f.casas };
  const corr = CORRECOES_NR15_ESPERADAS.filter(([n]) => n === nome);
  for (const [, campo, , norma] of corr) e[CAMPO_DA_FONTE[campo]] = norma;
  if (corr.length && e.casas !== null) e.casas = Math.max(e.casas, casasDe(e.lt), casasDe(e.na));
  return e;
}

// ---------------------------------------------------------------------------
// A norma, lida aqui por um caminho proprio
// ---------------------------------------------------------------------------

/** "0,016" -> 0.016; "-" e "_" (sem valor) -> null. */
const numeroDaNorma = (t) => (/^\d+(?:,\d+)?$/.test(t) ? Number(t.replace(',', '.')) : null);
const GRAUS = new Set(['máximo', 'médio', 'mínimo']);

/**
 * Colunas do Quadro n. 1 pelas palavras do cabecalho do proprio Quadro: o
 * centro de "Valor" (teto) e de "p/pele", e onde terminam "ppm*" e "mg/m3*"
 * (os numeros sao alinhados a direita). O "\f" de quebra de pagina sai antes
 * de medir.
 */
function colunasDoQuadro(linhas) {
  const iTab = linhas.findIndex((l) => l.includes('TABELA DE LIMITES DE TOLER'));
  const iPrim = linhas.findIndex((l, k) => k > iTab && /^\s*Acetaldeído\s{3,}/.test(l));
  if (iTab < 0 || iPrim < 0) return null;
  const cab = linhas.slice(iTab, iPrim);
  const pos = (palavra) => {
    for (const l of cab) {
      const k = l.indexOf(palavra);
      if (k >= 0) return [k, k + palavra.length];
    }
    return null;
  };
  const [valor, pele, ppm, mg] = ['Valor', 'p/pele', 'ppm*', 'mg/m3*'].map(pos);
  if (!valor || !pele || !ppm || !mg) return null;
  return { teto: (valor[0] + valor[1] - 1) / 2, pele: (pele[0] + pele[1] - 1) / 2, ppmFim: ppm[1], mgFim: mg[1] };
}

/** Uma linha do Quadro: nome e colunas. null quando nao e linha de agente com valores. */
function linhaDoQuadro(l, col) {
  const s = l.replace(/^\f/, '');
  const m = s.match(/^\s*(\S(?:.*?\S)?)(?=\s{3,}|$)/);
  if (!m) return null;
  const ini = m[0].length;
  const r = { nome: m[1], teto: false, pele: false, ppm: null, mg: null, grau: null };
  for (const t of s.slice(ini).matchAll(/\S+/g)) {
    const a = ini + t.index;
    const b = a + t[0].length;
    if (t[0] === '+') {
      if (Math.abs(a - col.teto) < Math.abs(a - col.pele)) r.teto = true;
      else r.pele = true;
    } else if (GRAUS.has(t[0])) {
      r.grau = t[0];
    } else if (numeroDaNorma(t[0]) !== null) {
      if (Math.abs(b - col.ppmFim) < Math.abs(b - col.mgFim)) r.ppm = numeroDaNorma(t[0]);
      else r.mg = numeroDaNorma(t[0]);
    } else if (!/^[-_]$/.test(t[0])) {
      return null;
    }
  }
  return r.grau || r.ppm !== null || r.mg !== null ? r : null;
}

/** Quadro n. 1 lido: linhas (numeradas como no arquivo) e colunas. */
const memoQuadro = new Map();
function quadro(texto) {
  if (memoQuadro.has(texto)) return memoQuadro.get(texto);
  const linhas = texto.split(/\r?\n/);
  const col = colunasDoQuadro(linhas.map((l) => l.replace(/^\f/, '')));
  const r = { linhas, col };
  memoQuadro.set(texto, r);
  return r;
}

/** As linhas de agente do Quadro cujo nome e exatamente este. */
function acharNoQuadro(texto, agente) {
  const { linhas, col } = quadro(texto);
  if (!col) return [];
  return linhas.map((l, k) => ({ r: linhaDoQuadro(l, col), n: k + 1 })).filter(({ r }) => r && r.nome === agente);
}

/**
 * Nomes que identificam o agente: o nome todo, o nome sem parenteses e cada
 * sinonimo entre parenteses (separados por "ou" ou virgula), sem acento,
 * caixa e pontuacao. O "(1)" de nota de rodape da norma nao e nome.
 */
const nomesDe = (nome) => new Set(
  [nome, ...nome.split(/[()]|\s+ou\s+|,\s+(?=[^\d\s])/)]
    .map((p) => achatar(p).replace(/[^a-z0-9]/g, ''))
    .filter((p) => p && !/^\d+$/.test(p))
);

/** Remissoes "X (vide Y)" do Quadro: nome de X -> nome de Y. */
function remissoesDoQuadro(texto) {
  const linhas = texto.split(/\r?\n/).map((l) => l.replace(/^\f/, '').trim());
  const r = [];
  linhas.forEach((l, k) => {
    // A remissao pode quebrar a linha: "Cloreto de fenila (vide cloro" + "benzeno)".
    const junto = /\(vide [^)]*$/.test(l) ? `${l} ${(linhas[k + 1] || '').split(/\s{3,}/)[0]}` : l;
    const m = junto.match(/^(.*?)\s*\(vide\s+(.*?)\)?(?:\s{3,}|$)/);
    if (m) r.push([achatar(m[1]).replace(/[^a-z0-9]/g, ''), achatar(m[2]).replace(/[^a-z0-9]/g, '')]);
  });
  return r;
}

/** Mesmo agente: algum nome do item e nome do agente, direto ou por remissao do Quadro. */
function mesmoAgente(nomeDoItem, agente, remissoes) {
  const doItem = nomesDe(nomeDoItem);
  const doAgente = nomesDe(agente);
  if ([...doItem].some((n) => doAgente.has(n))) return true;
  return remissoes.some(([de, para]) => doItem.has(de) && doAgente.has(para));
}

/** NR-15, 15.2.1 a 15.2.3, lido do texto: grau -> adicional. */
function adicionalPeloTexto(trechos) {
  const r = {};
  for (const m of trechos.replace(/\s+/g, ' ').matchAll(/15\.2\.[123] (\d+)% \([^)]*\), para insalubridade de grau (máximo|médio|mínimo)/g)) {
    r[m[2]] = `${m[1]}%`;
  }
  return r;
}

// ---------------------------------------------------------------------------
// Checagens. Cada uma devolve a lista de problemas; vazia = passou.
// ---------------------------------------------------------------------------

function linhasLidas(ctx) {
  const n = linhasDaFonte(ctx.fonte).length;
  const p = [];
  if (n !== LINHAS_ESPERADAS) p.push(`a fonte tem ${n} linhas de risco, e não ${LINHAS_ESPERADAS}`);
  if (ctx.total !== n) p.push(`TOTAL_DE_LINHAS_DA_LISTAGEM = ${ctx.total}, mas a fonte tem ${n}`);
  return p;
}

function contabilidade(ctx) {
  const p = [];
  const casadas = casarLinhas(ctx);
  for (const l of casadas) {
    if (l.casados.length === 0) p.push(`linha ${l.n} não virou item nem foi deduplicada: ${l.t.slice(0, 70)}`);
    if (l.casados.length > 1) p.push(`linha ${l.n} casa com ${l.casados.length} itens`);
    if (l.casados.length === 1 && !camposDaLinha(l.t, l.casados[0].nome)) p.push(`linha ${l.n} não foi relida: ${l.t.slice(0, 70)}`);
  }
  const usados = new Map();
  casadas.forEach((l) => l.casados.forEach((c) => usados.set(c.alvo, (usados.get(c.alvo) || 0) + 1)));
  for (const i of ctx.listagem) if (usados.get(i) !== 1) p.push(`item "${i.name}" corresponde a ${usados.get(i) || 0} linhas da fonte`);
  for (const d of ctx.deduplicadas) if (usados.get(d) !== 1) p.push(`deduplicada "${d.nome}" corresponde a ${usados.get(d) || 0} linhas da fonte`);
  if (ctx.listagem.length + ctx.deduplicadas.length !== casadas.length) {
    p.push(`${ctx.listagem.length} itens + ${ctx.deduplicadas.length} deduplicadas ≠ ${casadas.length} linhas`);
  }
  return p;
}

function emDia(ctx) {
  let ts;
  try {
    ts = gerador.gerar({ fonte: ctx.fonte, tabela24: TEXTO_T24, curados: TEXTO_CURADOS }).ts;
  } catch (e) {
    return [`a fonte não gera: ${e.message.split('\n')[0]}`];
  }
  const gravado = ctx.arquivo.replace(/\r\n/g, '\n');
  if (ts === gravado) return [];
  const a = ts.split('\n');
  const b = gravado.split('\n');
  const i = a.findIndex((l, k) => l !== b[k]);
  return [`${REL.gerado} difere do que a fonte gera hoje (linha ${i + 1}): regenere`];
}

function cabecalho(ctx) {
  return ctx.arquivo.includes('NAO EDITE A MAO. Regenere com node scripts/gerar-catalogo-da-listagem.mjs')
    ? [] : ['o arquivo gerado não traz o aviso "NAO EDITE A MAO. Regenere com node scripts/gerar-catalogo-da-listagem.mjs"'];
}

function codigosExistem(ctx) {
  return ctx.listagem.filter((i) => tem(i, 'code_table_24'))
    .filter((i) => typeof i.code_table_24 !== 'string' || !/^\d{2}\.\d{2}\.\d{3}$/.test(i.code_table_24) || !t24.codigoExisteNaTabela24(i.code_table_24))
    .map((i) => `${i.name}: código "${i.code_table_24}" não existe na Tabela 24`);
}

function ausenciaSo(ctx) {
  const p = [];
  for (const i of ctx.inicial) {
    if (i.code_table_24 === AUS && i.group !== 'AUSÊNCIA_RISCO') p.push(`${i.name} (${i.group}) traz ${AUS}`);
    if (i.code_table_24 !== AUS && i.group === 'AUSÊNCIA_RISCO') p.push(`${i.name} é ausência de risco sem ${AUS}`);
  }
  const comAus = ctx.listagem.filter((i) => i.code_table_24 === AUS);
  if (comAus.length !== 1 || comAus[0].name !== t24.TABELA_24[AUS].nome) {
    p.push(`na listagem, ${AUS} está em ${comAus.length} item(ns): ${comAus.map((i) => i.name).join('; ').slice(0, 120)}`);
  }
  return p;
}

function notaDaAusencia(ctx) {
  const p = [];
  const deveriamTer = new Set();
  for (const [item, f] of itensComLinha(ctx)) {
    if (f?.codigo !== AUS || item.group === 'AUSÊNCIA_RISCO') continue;
    deveriamTer.add(item);
    if (tem(item, 'code_table_24')) p.push(`${item.name}: a fonte trazia ${AUS} e o item ficou com "${item.code_table_24}"`);
    if (!String(item.esocial_enquadramento_nota || '').includes(AUS)) p.push(`${item.name}: ${AUS} retirado sem a nota que explica`);
  }
  for (const i of ctx.listagem) {
    if (!deveriamTer.has(i) && tem(i, 'esocial_enquadramento_nota')) p.push(`${i.name}: nota de enquadramento sem ${AUS} na fonte`);
  }
  if (deveriamTer.size === 0) p.push(`nenhuma linha da fonte com ${AUS} fora da ausência foi encontrada`);
  return p;
}

function codigosPreservados(ctx) {
  const p = [];
  for (const [item, f] of itensComLinha(ctx)) {
    if (!f || f.codigo === AUS) continue;
    if (f.codigo && item.code_table_24 !== f.codigo) p.push(`${item.name}: a fonte traz ${f.codigo}, o item "${item.code_table_24 ?? ''}"`);
    if (!f.codigo && tem(item, 'code_table_24')) p.push(`${item.name}: a fonte não traz código, o item "${item.code_table_24}"`);
  }
  return p;
}

function limitesNuncaZero(ctx) {
  const p = [];
  for (const i of ctx.listagem) {
    for (const k of ['tolerance_limit_value', 'action_level_value', 'measurement_decimal_places']) {
      if (!tem(i, k)) continue;
      const minimo = k === 'measurement_decimal_places' ? 0 : Number.MIN_VALUE;
      if (typeof i[k] !== 'number' || !Number.isFinite(i[k]) || i[k] < minimo) p.push(`${i.name}: ${k} = ${JSON.stringify(i[k])}`);
    }
    for (const [texto, valor] of [['tolerance_limit_reference', 'tolerance_limit_value'], ['action_level_reference', 'action_level_value']]) {
      if (!tem(i, texto)) continue;
      if (!tem(i, valor)) p.push(`${i.name}: ${texto} sem ${valor}`);
      if (/^\s*0(?:[.,]0*)?(?:\s|$)/.test(String(i[texto]))) p.push(`${i.name}: ${texto} = "${i[texto]}"`);
    }
    if (tem(i, 'tolerance_limit_is_ceiling') && !(i.tolerance_limit_value > 0)) p.push(`${i.name}: valor teto sem limite`);
  }
  return p;
}

// A fonte, com as correcoes pela NR-15 que este verificador espera por cima
// (esperadoDoItem); a checagem correcoesPelaNr15 prova cada uma na norma.
function limitesDaFonte(ctx) {
  const p = [];
  for (const [item, f] of itensComLinha(ctx)) {
    if (!f) continue;
    const e = esperadoDoItem(item.name, f);
    const confere = (campo, esperado) => {
      if (esperado > 0 ? item[campo] !== esperado : tem(item, campo)) {
        p.push(`${item.name}: ${campo} ${JSON.stringify(item[campo])}, a fonte (com as correções pela NR-15) traz ${esperado}`);
      }
    };
    confere('tolerance_limit_value', e.lt);
    confere('action_level_value', e.na);
    if (e.teto !== (item.tolerance_limit_is_ceiling === true)) p.push(`${item.name}: teto ${item.tolerance_limit_is_ceiling}, esperado ${e.teto} (fonte "${f.teto ? 'Sim' : 'Não'}")`);
    if (e.casas === null ? tem(item, 'measurement_decimal_places') : item.measurement_decimal_places !== e.casas) {
      p.push(`${item.name}: casas ${item.measurement_decimal_places}, esperado ${e.casas} (fonte ${f.casas})`);
    }
  }
  return p;
}

function textoConfere(ctx) {
  const p = [];
  const fonteDe = new Map(ctx.conferidos.map((c) => [c.nome, c.fonte]));
  for (const i of ctx.listagem) {
    const lt = tem(i, 'tolerance_limit_value')
      ? limites.textoDoLimite(i.tolerance_limit_value, i.standard_unit, i.tolerance_limit_is_ceiling === true, fonteDe.get(i.name))
      : undefined;
    const na = tem(i, 'action_level_value') ? limites.textoDoLimite(i.action_level_value, i.standard_unit) : undefined;
    if (i.tolerance_limit_reference !== lt) p.push(`${i.name}: "${i.tolerance_limit_reference}" ≠ textoDoLimite "${lt}"`);
    if (i.action_level_reference !== na) p.push(`${i.name}: "${i.action_level_reference}" ≠ textoDoLimite "${na}"`);
  }
  return p;
}

function idsUnicos(ctx) {
  const p = [];
  const vistos = new Map();
  for (const i of ctx.inicial) {
    if (vistos.has(i.id)) p.push(`id ${i.id} repetido: "${vistos.get(i.id)}" e "${i.name}"`);
    vistos.set(i.id, i.name);
  }
  for (const i of ctx.listagem) if (!/^risk-lst-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(i.id)) p.push(`id fora da forma: ${i.id}`);
  return p;
}

function idPeloNome(ctx) {
  return ctx.listagem.filter((i) => i.id !== `risk-lst-${slug(i.name)}`).map((i) => `${i.name}: id ${i.id}, e não risk-lst-${slug(i.name)}`);
}

function correcoes(ctx) {
  const p = [];
  if (ctx.correcoes.length !== CORRECOES_ESPERADAS.length) p.push(`CORRECOES_DA_LISTAGEM tem ${ctx.correcoes.length} entradas`);
  for (const [nome, campo, de, para] of CORRECOES_ESPERADAS) {
    const c = ctx.correcoes.find((x) => x.nome === nome && x.campo === campo);
    if (!c || c.de !== de || c.para !== para || !String(c.motivo || '').trim()) p.push(`correção ausente ou incompleta: ${nome} / ${campo}`);
    const item = ctx.listagem.find((i) => i.name === nome);
    if (!item) { p.push(`item "${nome}" não existe`); continue; }
    const atual = campo === 'standard_unit' ? (tem(item, campo) ? item[campo] : '') : item[campo];
    if (atual !== para) p.push(`${nome}: ${campo} = "${atual}", a correção diz "${para}"`);
  }
  return p;
}

function meiosEUnidades(ctx) {
  const p = [];
  for (const i of ctx.listagem) {
    if (!MEIOS_VALIDOS.has(i.propagation_paths)) p.push(`${i.name}: meio "${i.propagation_paths}"`);
    if (tem(i, 'standard_unit') && !UNIDADES_VALIDAS.has(i.standard_unit)) p.push(`${i.name}: unidade "${i.standard_unit}"`);
  }
  return p;
}

function semDescritivo(ctx) {
  const p = [];
  for (const i of ctx.listagem) {
    const extras = Object.keys(i).filter((k) => !CAMPOS_PERMITIDOS.has(k));
    if (extras.length) p.push(`${i.name}: traz ${extras.join(', ')}, que a listagem não diz`);
    if (!Array.isArray(i.recommended_epis) || i.recommended_epis.length) p.push(`${i.name}: EPI sugerido`);
    if (!Array.isArray(i.suggested_exams_pcmso) || i.suggested_exams_pcmso.length) p.push(`${i.name}: exame sugerido`);
    if (i.catalog_source !== 'LISTAGEM') p.push(`${i.name}: catalog_source ${i.catalog_source}`);
    // ACTIVE ou INACTIVE: qual deve ser e a checagem das duplicatas que diz.
    if (i.is_system_default !== true || !['ACTIVE', 'INACTIVE'].includes(i.status)) p.push(`${i.name}: is_system_default/status`);
    if (i.created_at !== DATA || i.updated_at !== DATA) p.push(`${i.name}: datas ${i.created_at} / ${i.updated_at}`);
    if (!['QUALITATIVA', 'QUANTITATIVA'].includes(i.evaluation_type)) p.push(`${i.name}: avaliação ${i.evaluation_type}`);
  }
  return p;
}

function grupos(ctx) {
  const p = [];
  if (JSON.stringify(ctx.inespecificos) !== JSON.stringify(INESPECIFICOS_DECIDIDOS)) p.push('GRUPO_DOS_INESPECIFICOS não é o decidido pelo usuário');
  for (const [item, f] of itensComLinha(ctx)) {
    if (!f) continue;
    let esperado = f.grupo === 'Inespecífico' ? INESPECIFICOS_DECIDIDOS[item.name] : GRUPO_ESPERADO[f.grupo];
    const c = CORRECOES_ESPERADAS.find(([nome, campo]) => nome === item.name && campo === 'group');
    if (c) esperado = c[3];
    if (item.group !== esperado) p.push(`${item.name}: grupo ${item.group}, esperado ${esperado} (fonte "${f.grupo}")`);
  }
  return p;
}

function efeito(ctx) {
  const p = [];
  for (const [item, f] of itensComLinha(ctx)) {
    if (!f) continue;
    if (f.efeito === 'Não Aplica' ? tem(item, 'effect_classification') : item.effect_classification !== f.efeito) {
      p.push(`${item.name}: efeito ${JSON.stringify(item.effect_classification)}, a fonte "${f.efeito}"`);
    }
  }
  return p;
}

function curados(ctx) {
  const p = [];
  if (ctx.curados.length !== 25) p.push(`${ctx.curados.length} itens curados, e não 25`);
  ctx.curados.filter((c) => c.catalog_source !== 'CURADO').forEach((c) => p.push(`${c.name}: catalog_source ${c.catalog_source}`));
  if (JSON.stringify(ctx.inicial) !== JSON.stringify([...ctx.curados, ...ctx.listagem])) {
    p.push('INITIAL_OCCUPATIONAL_RISKS_CATALOG não é [...curados, ...listagem]');
  }
  return p;
}

function deduplicadas(ctx) {
  const p = [];
  const porId = new Map(ctx.curados.map((c) => [c.id, c]));
  for (const d of ctx.deduplicadas) {
    const c = porId.get(d.id_curado);
    if (!c || normalizado(c.name) !== normalizado(d.nome)) p.push(`"${d.nome}" deduplicada contra ${d.id_curado}, que não tem o mesmo nome`);
    if (!String(d.motivo || '').trim()) p.push(`"${d.nome}" deduplicada sem motivo`);
  }
  const nomesCurados = new Set(ctx.curados.map((c) => normalizado(c.name)));
  ctx.listagem.filter((i) => nomesCurados.has(normalizado(i.name))).forEach((i) => p.push(`"${i.name}" repete um item curado e foi gerado`));
  return p;
}

const emOrdem = (o) => JSON.stringify(Object.entries(o || {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

function duplicatasDeCurados(ctx) {
  const p = [];
  if (emOrdem(ctx.duplicatasMapa) !== emOrdem(DUPLICATAS_ESPERADAS)) p.push('DUPLICATAS_DE_CURADOS não é a decisão do usuário (22 linhas)');
  const idsCurados = new Set(ctx.curados.map((c) => c.id));
  for (const [nome, id] of Object.entries(DUPLICATAS_ESPERADAS)) {
    const i = ctx.listagem.find((x) => x.name === nome);
    if (!i) { p.push(`"${nome}" não está no catálogo`); continue; }
    if (i.status !== 'INACTIVE') p.push(`${nome}: status ${i.status}, e não INACTIVE`);
    if (i.duplicate_of_id !== id) p.push(`${nome}: duplicate_of_id ${JSON.stringify(i.duplicate_of_id)}, e não ${id}`);
    if (!idsCurados.has(i.duplicate_of_id)) p.push(`${nome}: aponta para ${JSON.stringify(i.duplicate_of_id)}, que não é item curado`);
  }
  for (const i of ctx.listagem) {
    if (tem(DUPLICATAS_ESPERADAS, i.name)) continue;
    if (i.status !== 'ACTIVE') p.push(`${i.name}: status ${i.status} sem ser duplicata de curado`);
    if (tem(i, 'duplicate_of_id')) p.push(`${i.name}: duplicate_of_id sem ser duplicata de curado`);
  }
  // Contrato com a carga: item que ninguem editou tem created_at === updated_at.
  for (const i of ctx.listagem) if (i.created_at !== i.updated_at) p.push(`${i.name}: created_at ${i.created_at} ≠ updated_at ${i.updated_at}`);
  return p;
}

function conferidosNoAnexo11(ctx) {
  const p = [];
  const { linhas, col } = quadro(ctx.anexo11);
  if (!col) return [`o cabeçalho do Quadro n. 1 não foi achado em ${REL.anexo11}`];
  const adicional = adicionalPeloTexto(ctx.trechos15);
  const remissoes = remissoesDoQuadro(ctx.anexo11);
  const lista = ctx.conferidos.filter((c) => c.fonte === FONTE_A11);
  if (lista.length < 100) p.push(`só ${lista.length} itens conferidos no Anexo 11`);
  for (const c of lista) {
    const i = ctx.listagem.find((x) => x.name === c.nome);
    if (!i) { p.push(`"${c.nome}" não está no catálogo`); continue; }
    const r = linhaDoQuadro(linhas[c.linha - 1] || '', col);
    if (!r || r.nome !== c.agente) { p.push(`${c.nome}: a linha ${c.linha} de ${REL.anexo11} não é a do agente "${c.agente}"`); continue; }
    if (!mesmoAgente(c.nome, c.agente, remissoes)) p.push(`${c.nome}: nenhum nome do item é o do agente "${c.agente}" do Quadro`);
    const daNorma = i.standard_unit === 'ppm' ? r.ppm : i.standard_unit === 'mg/m³' ? r.mg : undefined;
    if (daNorma === undefined) p.push(`${c.nome}: a unidade ${i.standard_unit} não é coluna do Quadro`);
    else if (i.tolerance_limit_value !== daNorma) p.push(`${c.nome}: limite ${i.tolerance_limit_value} ${i.standard_unit}, a norma diz ${daNorma} (linha ${c.linha})`);
    if ((i.tolerance_limit_is_ceiling === true) !== r.teto) p.push(`${c.nome}: valor teto ${i.tolerance_limit_is_ceiling === true}, a norma ${r.teto} (linha ${c.linha})`);
    if (r.grau !== c.grau) p.push(`${c.nome}: grau "${c.grau}", a norma diz "${r.grau}" (linha ${c.linha})`);
    if (i.insalubridade_applicable !== true || !adicional[r.grau] || i.insalubridade_degree_suggested !== adicional[r.grau] || i.insalubridade_legal_basis !== FONTE_A11) {
      p.push(`${c.nome}: insalubridade ${i.insalubridade_applicable}/${i.insalubridade_degree_suggested}/${i.insalubridade_legal_basis}, a norma dá grau ${r.grau} = ${adicional[r.grau]}`);
    }
    if (!String(i.tolerance_limit_reference || '').endsWith(`${FONTE_A11})`)) p.push(`${c.nome}: o texto do limite não cita ${FONTE_A11}: "${i.tolerance_limit_reference}"`);
  }
  return p;
}

function naoConferidos(ctx) {
  const p = [];
  const conferidos = new Set(ctx.conferidos.map((c) => c.nome));
  for (const i of ctx.listagem) {
    if (conferidos.has(i.name)) continue;
    const extras = CAMPOS_DE_INSALUBRIDADE.filter((k) => tem(i, k));
    if (extras.length) p.push(`${i.name}: traz ${extras.join(', ')} sem ter sido conferido na norma`);
    if (/NR-\d/.test(String(i.tolerance_limit_reference || ''))) p.push(`${i.name}: o texto do limite cita norma sem conferência: "${i.tolerance_limit_reference}"`);
  }
  // Completude: quantitativo cujo nome INTEIRO e o de um agente do Quadro, com
  // valor na unidade do item, tem de ter sido conferido.
  const { linhas, col } = quadro(ctx.anexo11);
  if (!col) return [...p, `o cabeçalho do Quadro n. 1 não foi achado em ${REL.anexo11}`];
  const porNome = new Map();
  for (const l of linhas) {
    const r = linhaDoQuadro(l, col);
    if (r) porNome.set(achatar(r.nome.replace(/\(1\)$/, '')).replace(/[^a-z0-9]/g, ''), r);
  }
  for (const i of ctx.listagem) {
    if (conferidos.has(i.name) || i.evaluation_type !== 'QUANTITATIVA') continue;
    const r = porNome.get(achatar(i.name).replace(/[^a-z0-9]/g, ''));
    const v = r ? (i.standard_unit === 'ppm' ? r.ppm : i.standard_unit === 'mg/m³' ? r.mg : null) : null;
    if (v !== null) p.push(`${i.name}: tem o nome de um agente do Quadro n. 1 (${v} ${i.standard_unit}) e não foi conferido`);
  }
  return p;
}

function correcoesPelaNr15(ctx) {
  const p = [];
  const { linhas, col } = quadro(ctx.anexo11);
  if (!col) return [`o cabeçalho do Quadro n. 1 não foi achado em ${REL.anexo11}`];
  const remissoes = remissoesDoQuadro(ctx.anexo11);
  if (ctx.correcoesNr15.length !== CORRECOES_NR15_ESPERADAS.length) {
    p.push(`CORRECOES_PELA_NR15 tem ${ctx.correcoesNr15.length} entradas, e não ${CORRECOES_NR15_ESPERADAS.length}`);
  }
  const fonteDe = new Map(itensComLinha(ctx).map(([i, f]) => [i.name, f]));
  for (const [nome, campo, listagem, norma] of CORRECOES_NR15_ESPERADAS) {
    const c = ctx.correcoesNr15.find((x) => x.nome === nome && x.campo === campo);
    if (!c || c.listagem !== listagem || c.norma !== norma || !String(c.anexo || '').trim()) {
      p.push(`correção ausente ou diferente: ${nome} / ${campo}`);
      continue;
    }
    const i = ctx.listagem.find((x) => x.name === nome);
    const f = fonteDe.get(nome);
    if (!i || !f) { p.push(`"${nome}" sem item ou sem linha na fonte`); continue; }
    if (f[CAMPO_DA_FONTE[campo]] !== listagem) p.push(`${nome}: a fonte traz ${f[CAMPO_DA_FONTE[campo]]} em ${campo}, a correção diz ${listagem}`);
    const atual = campo === 'tolerance_limit_is_ceiling' ? i[campo] === true : i[campo];
    if (atual !== norma) p.push(`${nome}: ${campo} = ${JSON.stringify(i[campo])}, a norma diz ${norma}`);
    if (campo === 'action_level_value') {
      const lt = CORRECOES_NR15_ESPERADAS.find(([n, k]) => n === nome && k === 'tolerance_limit_value');
      if (!lt || norma !== lt[3] / 2) p.push(`${nome}: nível de ação corrigido ${norma} não é a metade do limite corrigido`);
      continue;
    }
    const r = linhaDoQuadro(linhas[c.linha - 1] || '', col);
    if (!r || !mesmoAgente(nome, r.nome, remissoes)) { p.push(`${nome}: a linha ${c.linha} citada não é a do agente`); continue; }
    const daNorma = campo === 'tolerance_limit_is_ceiling' ? r.teto : i.standard_unit === 'ppm' ? r.ppm : r.mg;
    if (daNorma !== norma) p.push(`${nome}: a linha ${c.linha} da norma diz ${daNorma}, a correção ${norma}`);
  }
  return p;
}

function casasDecimais(ctx) {
  const p = [];
  for (const i of ctx.listagem) {
    if (!tem(i, 'measurement_decimal_places')) continue;
    const pedidas = Math.max(casasDe(i.tolerance_limit_value), casasDe(i.action_level_value));
    if (i.measurement_decimal_places < pedidas) p.push(`${i.name}: ${i.measurement_decimal_places} casa(s), o limite ou o nível de ação pedem ${pedidas}`);
  }
  return p;
}

function vibracao(ctx) {
  const p = [];
  const linhas = ctx.trechos15.split(/\r?\n/);
  const ini = linhas.findIndex((l) => /ANEXO Nº 8\s*$/.test(l));
  const fim = linhas.findIndex((l, k) => k > ini && /ANEXO Nº 9\s*$/.test(l));
  if (ini < 0 || fim < 0) return [`o Anexo 8 não foi achado em ${REL.trechos15}`];
  const grau = linhas.slice(ini, fim).join(' ').replace(/\s+/g, ' ').match(/caracterizadas como insalubres em grau (máximo|médio|mínimo)/)?.[1];
  const adicional = adicionalPeloTexto(ctx.trechos15);
  const nr09 = ctx.nr09.replace(/\s+/g, ' ');
  const vmb = nr09.match(/nível de ação para a avaliação da exposição ocupacional diária à vibração em mãos e braços corresponde a um valor de aceleração resultante de exposição normalizada \(aren\) de (\d+(?:,\d+)?) ?m\/s2/)?.[1];
  const vci = nr09.match(/nível de ação para a avaliação da exposição ocupacional diária à vibração de corpo inteiro corresponde a um valor da aceleração resultante de exposição normalizada \(aren\) de (\d+(?:,\d+)?) ?m\/s2, ou ao valor da dose de vibração resultante \(VDVR\) de (\d+(?:,\d+)?) ?m\/s1,75/);
  const naDaNr09 = { 'VMB: aren': vmb, 'VCI: aren': vci?.[1], 'VCI: VDVR': vci?.[2] };
  const lista = ctx.conferidos.filter((c) => c.fonte === FONTE_A8);
  if (lista.length !== 3) p.push(`${lista.length} itens de vibração conferidos, e não 3`);
  for (const c of lista) {
    const i = ctx.listagem.find((x) => x.name === c.nome);
    if (!i) { p.push(`"${c.nome}" não está no catálogo`); continue; }
    if (c.linha <= ini + 1 || c.linha > fim) p.push(`${c.nome}: a linha ${c.linha} está fora do Anexo 8 em ${REL.trechos15}`);
    const m = (linhas[c.linha - 1] || '').match(/de (\d+(?:,\d+)?) ?m\/s(2|1,75)\b/);
    const unidade = m ? { 2: 'm/s²', '1,75': 'm/s1,75' }[m[2]] : undefined;
    if (!m || numeroDaNorma(m[1]) !== i.tolerance_limit_value || unidade !== i.standard_unit) {
      p.push(`${c.nome}: limite ${i.tolerance_limit_value} ${i.standard_unit}, a linha ${c.linha} da norma diz "${m ? m[0] : '(nada)'}"`);
    }
    const na = naDaNr09[c.agente];
    if (!na || numeroDaNorma(na) !== i.action_level_value) p.push(`${c.nome}: nível de ação ${i.action_level_value}, o Anexo I da NR-09 diz ${na}`);
    if (!grau || c.grau !== grau || i.insalubridade_applicable !== true || i.insalubridade_degree_suggested !== adicional[grau] || i.insalubridade_legal_basis !== FONTE_A8) {
      p.push(`${c.nome}: insalubridade ${i.insalubridade_degree_suggested}/${i.insalubridade_legal_basis}, o Anexo 8 dá grau ${grau} = ${adicional[grau]}`);
    }
    if (!String(i.tolerance_limit_reference || '').endsWith(`${FONTE_A8})`)) p.push(`${c.nome}: o texto do limite não cita ${FONTE_A8}`);
  }
  return p;
}

const VERSAO_NR15 = 'Portaria MTE n. 2.021, de 03/12/2025';
const VERSAO_NR09 = 'Portaria MTE n. 105, de 29/01/2026';

function criteriosDaNorma(ctx) {
  const p = [];
  const adicional = adicionalPeloTexto(ctx.trechos15);
  if (emOrdem(adicional) !== emOrdem({ 'máximo': '40%', 'médio': '20%', 'mínimo': '10%' })) p.push(`NR-15, itens 15.2.1 a 15.2.3, lidos como ${JSON.stringify(adicional)}`);
  if (!ctx.nr09.replace(/\s+/g, ' ').includes('b) como nível de ação para agentes químicos, a metade dos limites de tolerância;')) {
    p.push(`${REL.nr09} não traz o item 9.6.1 b) (nível de ação = metade do limite)`);
  }
  for (const c of ctx.conferidos.filter((x) => x.fonte === FONTE_A11)) {
    const i = ctx.listagem.find((x) => x.name === c.nome);
    if (i && i.action_level_value !== i.tolerance_limit_value / 2) p.push(`${c.nome}: nível de ação ${i.action_level_value}, a metade do limite é ${i.tolerance_limit_value / 2}`);
  }
  for (const [rel, texto, versao] of [[REL.anexo11, ctx.anexo11, VERSAO_NR15], [REL.trechos15, ctx.trechos15, VERSAO_NR15], [REL.nr09, ctx.nr09, VERSAO_NR09]]) {
    const url = /^# URL: https:\/\/www\.gov\.br\/trabalho-e-emprego\/\S+\.pdf\s*$/m.test(texto);
    if (!url || !texto.includes(versao) || !/Baixado em \d{2}\/\d{2}\/\d{4}/.test(texto)) p.push(`${rel}: cabeçalho sem a URL do MTE, a data do download ou a versão (${versao})`);
  }
  return p;
}

// Lidos a mao no PDF da NR-15: [agente como o Quadro escreve, ppm, mg/m3, teto, pele, grau].
const PONTOS_NA_NORMA = [
  ['Estireno', 78, 328, false, false, 'médio'],
  ['2,4 Diisocianato de tolueno (TDI)', 0.016, 0.11, true, false, 'máximo'],
  ['Ácido fluorídrico', 2.5, 1.5, false, false, 'máximo'],
  ['Ácido fórmico', 4, 7, false, false, 'médio'],
  ['Pentaborano', 0.004, 0.008, false, false, 'máximo'],
  ['Formaldeído (formol)', 1.6, 2.3, true, false, 'máximo'],
  ['Acetona', 780, 1870, false, false, 'mínimo'],
  ['Tolueno (toluol)', 78, 290, false, true, 'médio'],
  ['Álcool n-butílico', 40, 115, true, true, 'máximo'],
  ['Negro de fumo(1)', null, 3.5, false, false, 'máximo'],
  ['Sulfato de dimetila', 0.08, 0.4, true, true, 'máximo'],
];
// E como ficam no catalogo: [nome, texto do limite, adicional].
const PONTOS_NO_CATALOGO = [
  ['Ácido fluorídrico', '1,5 mg/m³ (NR-15, Anexo 11)', '40%'],
  ['Diisocianato de tolueno (TDI)', '0,016 ppm (valor teto; NR-15, Anexo 11)', '40%'],
  ['Acetona (propanona)', '1.870 mg/m³ (NR-15, Anexo 11)', '10%'],
  ['Pentaborano', '0,008 mg/m³ (NR-15, Anexo 11)', '40%'],
  ['Formaldeído (formol ou Aldeído fórmico)', '2,3 mg/m³ (valor teto; NR-15, Anexo 11)', '40%'],
  ['Xileno (xilol)', '340 mg/m³ (NR-15, Anexo 11)', '20%'],
  ['Vibrações localizadas (mão-braço)', '5 m/s² (NR-15, Anexo 8)', '20%'],
];

function pontosNaNorma(ctx) {
  const p = [];
  for (const [agente, ppm, mg, teto, pele, grau] of PONTOS_NA_NORMA) {
    const achados = acharNoQuadro(ctx.anexo11, agente);
    if (achados.length !== 1) { p.push(`"${agente}" aparece ${achados.length} vez(es) no Quadro n. 1`); continue; }
    const { r, n } = achados[0];
    Object.entries({ ppm, mg, teto, pele, grau }).filter(([k, v]) => r[k] !== v)
      .forEach(([k, v]) => p.push(`${agente} (linha ${n}): ${k} lido ${JSON.stringify(r[k])}, o PDF diz ${JSON.stringify(v)}`));
  }
  for (const [nome, texto, adicional] of PONTOS_NO_CATALOGO) {
    const i = ctx.listagem.find((x) => x.name === nome);
    if (!i) { p.push(`"${nome}" não está no catálogo`); continue; }
    if (i.tolerance_limit_reference !== texto) p.push(`${nome}: "${i.tolerance_limit_reference}", e não "${texto}"`);
    if (i.insalubridade_degree_suggested !== adicional) p.push(`${nome}: adicional ${i.insalubridade_degree_suggested}, e não ${adicional}`);
  }
  return p;
}

// Pontos conferidos contra a fonte, a mao.
const PONTOS = [
  ['Estireno (vinilbenzeno)', { standard_unit: 'ppm', tolerance_limit_value: 78, tolerance_limit_reference: '78 ppm (NR-15, Anexo 11)', action_level_value: 39, action_level_reference: '39 ppm', insalubridade_degree_suggested: '20%' }, ['tolerance_limit_is_ceiling']],
  ['Diisocianato de tolueno (TDI)', { standard_unit: 'ppm', tolerance_limit_value: 0.016, tolerance_limit_reference: '0,016 ppm (valor teto; NR-15, Anexo 11)', tolerance_limit_is_ceiling: true, action_level_value: 0.008, action_level_reference: '0,008 ppm' }, []],
  ['1,1,1 Tricloroetano (Metilclorofórmio)', { standard_unit: 'mg/m³', tolerance_limit_value: 1480, tolerance_limit_reference: '1.480 mg/m³ (NR-15, Anexo 11)', action_level_value: 740, action_level_reference: '740 mg/m³' }, ['tolerance_limit_is_ceiling']],
  ['Cádmio e seus compostos tóxicos', { standard_unit: 'mg/m³', tolerance_limit_value: 0.039, tolerance_limit_reference: '0,039 mg/m³', action_level_value: 0.019, action_level_reference: '0,019 mg/m³', code_table_24: '01.06.001' }, ['insalubridade_degree_suggested']],
  ['Vibração de corpo inteiro (Valor da Dose de Vibração Resultante - VDVR)', { standard_unit: 'm/s1,75', tolerance_limit_value: 21, tolerance_limit_reference: '21 m/s1,75 (NR-15, Anexo 8)', action_level_value: 9.1, action_level_reference: '9,1 m/s1,75' }, []],
  ['Ácido fluorídrico', { standard_unit: 'mg/m³', tolerance_limit_value: 1.5, action_level_value: 0.75, measurement_decimal_places: 2, insalubridade_degree_suggested: '40%' }, ['tolerance_limit_is_ceiling']],
  ['Frio', { status: 'INACTIVE', duplicate_of_id: 'risk-cat-07' }, ['tolerance_limit_value']],
  ['Radiações ionizantes', { standard_unit: 'Milisievert (mSv)', tolerance_limit_value: 20, tolerance_limit_reference: '20 Milisievert (mSv)', action_level_value: 10, action_level_reference: '10 Milisievert (mSv)', code_table_24: '02.01.006' }, []],
  ['Sílica livre cristalizada - poeira respirável', { standard_unit: 'mg/m³', evaluation_type: 'QUANTITATIVA', code_table_24: '01.18.001' }, ['tolerance_limit_value', 'tolerance_limit_reference', 'action_level_value', 'action_level_reference']],
];
const ponto = ([nome, esperado, ausentes]) => (ctx) => {
  const i = ctx.listagem.find((x) => x.name === nome);
  if (!i) return [`"${nome}" não está no catálogo`];
  return [
    ...Object.entries(esperado).filter(([k, v]) => i[k] !== v).map(([k, v]) => `${k} = ${JSON.stringify(i[k])}, a fonte diz ${JSON.stringify(v)}`),
    ...ausentes.filter((k) => tem(i, k)).map((k) => `${k} = ${JSON.stringify(i[k])}, deveria estar ausente`),
  ];
};

// ---------------------------------------------------------------------------
// Mutacoes: o defeito reintroduzido numa copia dos dados.
// ---------------------------------------------------------------------------
const item = (ctx, nome) => {
  const i = ctx.listagem.find((x) => x.name === nome);
  if (!i) throw new Error(`mutação: item "${nome}" não existe`);
  return i;
};
const mudar = (nome, fn) => (ctx) => fn(item(ctx, nome), ctx);
const tirarDaListagem = (ctx, alvo) => {
  ctx.listagem.splice(ctx.listagem.indexOf(alvo), 1);
  ctx.inicial.splice(ctx.inicial.indexOf(alvo), 1);
};
const linhaDe = (fonte, prefixo) => fonte.split(/\r?\n/).find((t) => t.startsWith(prefixo));

const VERIFICACOES = [
  ['as 910 linhas de risco da fonte foram lidas', linhasLidas, [
    ['uma linha a mais na fonte', (c) => { c.fonte += `\n${linhaDe(c.fonte, 'Iodo ')}\n`; }],
    ['TOTAL_DE_LINHAS_DA_LISTAGEM errado', (c) => { c.total = 909; }],
  ]],
  ['cada linha virou exatamente um item ou uma deduplicada, e nenhum item existe sem linha', contabilidade, [
    ['um item some', (c) => tirarDaListagem(c, item(c, 'Iodo'))],
    ['um item inventado', (c) => { const x = { ...item(c, 'Iodo'), id: 'risk-lst-inventado', name: 'Agente inventado' }; c.listagem.push(x); c.inicial.push(x); }],
    ['uma deduplicada some', (c) => { c.deduplicadas.pop(); }],
  ]],
  ['o arquivo gravado é o que a fonte gera hoje (regenerado e comparado)', emDia, [
    ['a fonte muda um limite', (c) => { c.fonte = c.fonte.replace('Quantitativo 78.00 Não 39.00', 'Quantitativo 77.00 Não 39.00'); }],
    ['o arquivo é editado à mão', (c) => { c.arquivo = c.arquivo.replace("'ppm', 'QUANTITATIVA', 78, 0, 39,", "'ppm', 'QUANTITATIVA', 77, 0, 39,"); }],
  ]],
  ['o arquivo gerado avisa que não se edita à mão', cabecalho, [
    ['sem o aviso', (c) => { c.arquivo = c.arquivo.replace('NAO EDITE A MAO.', ''); }],
  ]],
  ['todo código da listagem existe na Tabela 24', codigosExistem, [
    ['código no buraco da numeração', mudar('Iodo', (i) => { i.code_table_24 = '01.19.020'; })],
    ['código vazio gravado como campo', mudar('Frio', (i) => { i.code_table_24 = ''; })],
  ]],
  [`${AUS} só na ausência de agente nocivo`, ausenciaSo, [
    [`${AUS} num risco de acidente`, mudar('Queda de mesmo nível', (i) => { i.code_table_24 = AUS; })],
    [`ausência sem ${AUS}`, mudar('Ausência de agente nocivo ou de atividades previstas no Anexo IV do Decreto 3.048/1999', (i) => { delete i.code_table_24; })],
  ]],
  [`${AUS} retirado das demais linhas, com a nota que explica`, notaDaAusencia, [
    ['retirado sem nota', mudar('Trabalho em Altura', (i) => { delete i.esocial_enquadramento_nota; })],
    ['nota onde a fonte não tinha 09', mudar('Iodo', (i) => { i.esocial_enquadramento_nota = 'x'; })],
  ]],
  ['os demais códigos ficam como a fonte traz', codigosPreservados, [
    ['código da fonte perdido', mudar('Defensivos agrícolas', (i) => { delete i.code_table_24; })],
    ['código inventado', mudar('Dimetilamina', (i) => { i.code_table_24 = '01.19.023'; })],
  ]],
  ['nenhum limite 0, nem texto de limite 0', limitesNuncaZero, [
    ['limite 0 gravado', mudar('Sílica livre cristalizada - poeira respirável', (i) => { i.tolerance_limit_value = 0; i.tolerance_limit_reference = '0 mg/m³'; })],
    ['campo de nível de ação presente e vazio', mudar('Iodo', (i) => { i.action_level_value = undefined; })],
    ['texto "0,0" sem número', mudar('Frio', (i) => { i.tolerance_limit_reference = '0,0 °C'; })],
  ]],
  ['limites, teto e casas decimais conferem com a fonte, linha a linha', limitesDaFonte, [
    ['limite trocado', mudar('Cádmio e seus compostos tóxicos', (i) => { i.tolerance_limit_value = 0.39; })],
    ['teto perdido', mudar('Diisocianato de tolueno (TDI)', (i) => { delete i.tolerance_limit_is_ceiling; })],
    ['nível de ação perdido', mudar('Acrilonitrila', (i) => { delete i.action_level_value; })],
    ['casas decimais trocadas', mudar('Estireno (vinilbenzeno)', (i) => { i.measurement_decimal_places = 3; })],
  ]],
  ['o texto de todo limite é o de textoDoLimite', textoConfere, [
    ['texto com outra unidade', mudar('Estireno (vinilbenzeno)', (i) => { i.tolerance_limit_reference = '78 mg/m³'; })],
    // Inverte a marca, em vez de gravar um texto fixo: assim a mutacao muda o
    // dado mesmo quando o defeito real ja tirou a marca.
    ['marca de teto invertida no texto', mudar('Diisocianato de tolueno (TDI)', (i) => {
      const t = String(i.tolerance_limit_reference);
      i.tolerance_limit_reference = t.includes(' (valor teto)') ? t.replace(' (valor teto)', '') : `${t} (valor teto)`;
    })],
  ]],
  ['ids únicos no catálogo inteiro', idsUnicos, [
    ['id repetido', (c) => { c.listagem[1].id = c.listagem[0].id; }],
    ['id repetindo um curado', (c) => { c.listagem[0].id = c.curados[0].id; }],
  ]],
  ['id derivado do nome, não da posição', idPeloNome, [
    ['ids por posição', (c) => { c.listagem.forEach((i, k) => { i.id = `risk-lst-${String(k).padStart(4, '0')}`; }); }],
  ]],
  ['correções da fonte aplicadas e registradas', correcoes, [
    ['grupo de volta a FÍSICO', mudar('Agentes biológicos (bactérias, vírus, fungos e outros)', (i) => { i.group = 'FÍSICO'; })],
    ['meio de volta ao nome', mudar('Acidente de trânsito', (i) => { i.propagation_paths = 'Acidente de trânsito'; })],
    ['correção sem registro', (c) => { c.correcoes.pop(); }],
  ]],
  ['meio de propagação e unidade normalizados', meiosEUnidades, [
    ['caixa da fonte', mudar('Iodo', (i) => { i.propagation_paths = 'Ar e Contato'; })],
    ['unidade sem normalizar', mudar('Cádmio e seus compostos tóxicos', (i) => { i.standard_unit = 'mg/m3'; })],
  ]],
  ['nenhum campo descritivo inventado; origem LISTAGEM', semDescritivo, [
    ['fonte geradora inventada', mudar('Iodo', (i) => { i.generating_sources = 'Indústria química'; })],
    ['severidade inventada', mudar('Iodo', (i) => { i.default_severity = 3; })],
    ['EPI sugerido', mudar('Iodo', (i) => { i.recommended_epis.push({ name: 'Respirador' }); })],
    ['origem trocada', mudar('Iodo', (i) => { i.catalog_source = 'CURADO'; })],
  ]],
  ['grupo conforme a fonte e a decisão do usuário sobre os Inespecíficos', grupos, [
    ['grupo trocado', mudar('Arsênio e seus compostos', (i) => { i.group = 'FÍSICO'; })],
    ['inespecífico mal mapeado', mudar('Trabalho com Manipulação de Alimentos', (i) => { i.group = 'AUSÊNCIA_RISCO'; })],
    ['mapa dos inespecíficos alterado', (c) => { c.inespecificos['Trabalho com Manipulação de Alimentos'] = 'ACIDENTES'; }],
  ]],
  ['classificação do efeito conforme a fonte (só Leve e Moderado)', efeito, [
    ['efeito perdido', mudar('Risco de corte e perfurações', (i) => { delete i.effect_classification; })],
    ['"Não Aplica" gravado', mudar('Iodo', (i) => { i.effect_classification = 'Não Aplica'; })],
  ]],
  ['os 25 curados marcados CURADO e o catálogo inicial = curados + listagem', curados, [
    ['curado sem origem', (c) => { delete c.curados[0].catalog_source; }],
    ['listagem fora do catálogo inicial', (c) => { c.inicial.splice(c.curados.length); }],
  ]],
  ['deduplicação só por nome igual, com motivo, e nenhuma duplicata gerada', deduplicadas, [
    ['duplicata gerada', (c) => { const x = { ...c.listagem[0], id: 'risk-lst-x', name: 'Ruído Contínuo ou  Intermitente' }; c.listagem.push(x); }],
    ['deduplicada contra outro curado', (c) => { c.deduplicadas[0].id_curado = 'risk-cat-02'; }],
    ['deduplicada sem motivo', (c) => { c.deduplicadas[0].motivo = ' '; }],
  ]],
  ['as 22 duplicatas de curados saem INACTIVE apontando para um curado que existe; as demais, ACTIVE', duplicatasDeCurados, [
    ['uma duplicata reativada', mudar('Frio', (i) => { i.status = 'ACTIVE'; })],
    ['duplicata sem o id do curado', mudar('Projeção de partículas', (i) => { delete i.duplicate_of_id; })],
    ['duplicata apontando para outro curado', mudar('Trabalho em Altura', (i) => { i.duplicate_of_id = 'risk-cat-19'; })],
    ['o curado apontado não existe', (c) => { c.curados = c.curados.filter((x) => x.id !== 'risk-cat-23'); }],
    ['Fumos metálicos específico desativado', mudar('Fumos metálicos (Cobre)', (i) => { i.status = 'INACTIVE'; i.duplicate_of_id = 'risk-cat-08'; })],
    ['outra linha desativada', mudar('Iodo', (i) => { i.status = 'INACTIVE'; })],
    ['mapa das duplicatas alterado', (c) => { c.duplicatasMapa.Iodo = 'risk-cat-08'; }],
    ['item com updated_at diferente de created_at', mudar('Frio', (i) => { i.updated_at = '2026-10-09T00:00:00Z'; })],
  ]],
  ['cada item conferido no Anexo 11 bate com a linha que cita no texto da norma', conferidosNoAnexo11, [
    ['limite do conferido trocado', mudar('Xileno (xilol)', (i) => { i.tolerance_limit_value = 350; })],
    ['valor teto da norma perdido', mudar('Ácido clorídrico (cloreto de hidrogênio, gás clorídrico)', (i) => { delete i.tolerance_limit_is_ceiling; })],
    ['adicional trocado', mudar('Acetona (propanona)', (i) => { i.insalubridade_degree_suggested = '20%'; })],
    ['base legal trocada', mudar('Fenol', (i) => { i.insalubridade_legal_basis = 'NR-15, Anexo 13'; })],
    ['insalubridade perdida', mudar('Fenol', (i) => { delete i.insalubridade_applicable; })],
    ['texto do limite sem a fonte', mudar('Estireno (vinilbenzeno)', (i) => { i.tolerance_limit_reference = '78 ppm'; })],
    ['linha citada errada', (c) => { c.conferidos.find((x) => x.nome === 'Fenol').linha += 2; }],
    // Mesmo limite (78 ppm) e mesmo grau: so a identidade do agente acusa.
    ['conferido contra agente de outro nome', (c) => { Object.assign(c.conferidos.find((x) => x.nome === 'Estireno (vinilbenzeno)'), { agente: 'Etilbenzeno', linha: 397 }); }],
  ]],
  ['nenhum item não conferido traz insalubridade ou cita a norma; nenhum agente do Quadro ficou de fora', naoConferidos, [
    ['adicional num item não conferido', mudar('Cádmio e seus compostos tóxicos', (i) => { i.insalubridade_degree_suggested = '40%'; })],
    ['norma citada num item não conferido', mudar('Cádmio e seus compostos tóxicos', (i) => { i.tolerance_limit_reference = '0,039 mg/m³ (NR-15, Anexo 11)'; })],
    ['conferido tirado da lista', (c) => { c.conferidos = c.conferidos.filter((x) => x.nome !== 'Fenol'); }],
    // Sem lista e sem os campos: so a completude acusa.
    ['agente do Quadro esquecido por inteiro', (c) => {
      c.conferidos = c.conferidos.filter((x) => x.nome !== 'Fenol');
      const i = item(c, 'Fenol');
      CAMPOS_DE_INSALUBRIDADE.forEach((k) => delete i[k]);
      i.tolerance_limit_reference = '15 mg/m³';
    }],
  ]],
  ['correções pela NR-15: a fonte trazia o valor, a linha citada da norma diz o corrigido, o item o traz', correcoesPelaNr15, [
    ['limite corrigido desfeito', mudar('Ácido fluorídrico', (i) => { i.tolerance_limit_value = 2; })],
    ['teto corrigido desfeito', mudar('Formaldeído (formol ou Aldeído fórmico)', (i) => { delete i.tolerance_limit_is_ceiling; })],
    ['nível de ação corrigido desfeito', mudar('Pentaborano', (i) => { delete i.action_level_value; })],
    ['correção citando outra linha', (c) => { c.correcoesNr15.find((x) => x.nome === 'Diborano' && x.linha).linha -= 2; }],
    ['correção sem registro', (c) => { c.correcoesNr15.pop(); }],
    ['a norma não diz o valor corrigido', (c) => { c.anexo11 = c.anexo11.replace(/(Diborano\s+0,08\s+)0,08/, '$10,09'); }],
  ]],
  ['casas decimais cobrem o limite e o nível de ação', casasDecimais, [
    ['casas abaixo do limite corrigido', mudar('Pentaborano', (i) => { i.measurement_decimal_places = 1; })],
  ]],
  ['vibração conferida no Anexo 8 da NR-15 e nível de ação no Anexo I da NR-09', vibracao, [
    ['VMB com outro limite', mudar('Vibrações localizadas (mão-braço)', (i) => { i.tolerance_limit_value = 4; })],
    ['nível de ação do VDVR fora da NR-09', mudar('Vibração de corpo inteiro (Valor da Dose de Vibração Resultante - VDVR)', (i) => { i.action_level_value = 10.5; })],
    ['linha citada fora do Anexo 8', (c) => { c.conferidos.find((x) => x.fonte === FONTE_A8).linha = 5; }],
    ['adicional da vibração trocado', mudar('Vibração de corpo inteiro (aceleração resultante de exposição normalizada - aren)', (i) => { i.insalubridade_degree_suggested = '40%'; })],
  ]],
  ['critérios lidos da norma: grau -> adicional (NR-15, 15.2) e nível de ação = metade do limite (NR-09, 9.6.1 b)', criteriosDaNorma, [
    ['NR-09 sem o critério da metade', (c) => { c.nr09 = c.nr09.replace('a metade dos limites de tolerância', 'um terço dos limites de tolerância'); }],
    ['grau -> adicional adulterado no texto', (c) => { c.trechos15 = c.trechos15.replace('15.2.2 20%', '15.2.2 25%'); }],
    ['nível de ação fora da metade', mudar('Acetona (propanona)', (i) => { i.action_level_value = 900; })],
    ['fonte sem a URL do MTE', (c) => { c.anexo11 = c.anexo11.replace('# URL: https://www.gov.br/', '# URL: https://exemplo.com/'); }],
  ]],
  ['pontos conferidos à mão no PDF da NR-15, relidos no texto guardado', pontosNaNorma, [
    // Espacos de coluna (3+): o cabecalho do arquivo tambem cita "Estireno 78 328".
    ['valor da norma adulterado no texto', (c) => { c.anexo11 = c.anexo11.replace(/(Estireno {3,}78 {3,})328/, '$1329'); }],
    // Mesma largura: o "+" so muda de coluna.
    ['"+" do Formaldeído movido de teto para pele', (c) => { c.anexo11 = c.anexo11.replace(/(Formaldeído \(formol\)\s+)\+( {18})/, '$1$2+'); }],
    ['adicional no catálogo trocado', mudar('Acetona (propanona)', (i) => { i.insalubridade_degree_suggested = '20%'; })],
  ]],
  ...PONTOS.map((pt) => [
    `ponto conferido: ${pt[0].slice(0, 50)}`,
    ponto(pt),
    [
      ...Object.keys(pt[1]).slice(0, 2).map((k) => [`${k} trocado`, mudar(pt[0], (i) => { i[k] = typeof i[k] === 'number' ? i[k] * 10 : `${i[k]}x`; })]),
      ...pt[2].slice(0, 1).map((k) => [`${k} presente`, mudar(pt[0], (i) => { i[k] = k.endsWith('ceiling') ? true : 1; })]),
    ],
  ]),
];

// ---------------------------------------------------------------------------
// Execucao
// ---------------------------------------------------------------------------
const CTX = {
  fonte: ler(REL.fonte),
  arquivo: ler(REL.gerado),
  listagem: listagem.RISCOS_DA_LISTAGEM,
  curados: dados.RISCOS_CURADOS,
  inicial: dados.INITIAL_OCCUPATIONAL_RISKS_CATALOG,
  deduplicadas: listagem.LINHAS_DEDUPLICADAS_DA_LISTAGEM,
  correcoes: listagem.CORRECOES_DA_LISTAGEM,
  inespecificos: listagem.GRUPO_DOS_INESPECIFICOS,
  total: listagem.TOTAL_DE_LINHAS_DA_LISTAGEM,
  duplicatasMapa: listagem.DUPLICATAS_DE_CURADOS,
  conferidos: listagem.CONFERIDOS_NA_NR15,
  correcoesNr15: listagem.CORRECOES_PELA_NR15,
  anexo11: ler(REL.anexo11),
  trechos15: ler(REL.trechos15),
  nr09: ler(REL.nr09),
};
if (!CTX.duplicatasMapa || !Array.isArray(CTX.conferidos) || !Array.isArray(CTX.correcoesNr15)) {
  inconclusivo('o módulo compilado não exporta DUPLICATAS_DE_CURADOS, CONFERIDOS_NA_NR15 e CORRECOES_PELA_NR15');
}
if (!Array.isArray(CTX.listagem) || !Array.isArray(CTX.curados) || !Array.isArray(CTX.inicial)) {
  inconclusivo('os módulos compilados não exportam RISCOS_DA_LISTAGEM, RISCOS_CURADOS e INITIAL_OCCUPATIONAL_RISKS_CATALOG');
}
const fotografia = (ctx) => sha(JSON.stringify(ctx, (k, v) => (v === undefined ? '__undefined__' : v)));
const FOTO_INICIAL = fotografia(CTX);

console.log(`\n--- o catálogo da listagem (${CTX.listagem.length} itens, ${CTX.deduplicadas.length} deduplicada(s), ${CTX.curados.length} curados) ---`);
const FALHOU_NOS_DADOS = new Set();
for (const [descricao, fn] of VERIFICACOES) {
  const problemas = fn(CTX);
  if (problemas.length) FALHOU_NOS_DADOS.add(descricao);
  check(problemas.length === 0, `${descricao}${problemas.length ? `:\n      ${problemas.slice(0, 6).join('\n      ')}${problemas.length > 6 ? `\n      … e mais ${problemas.length - 6}` : ''}` : ''}`);
}
{
  const retiradas = CTX.listagem.filter((i) => i.esocial_enquadramento_nota).length;
  console.log(`      (${AUS} retirado de ${retiradas} itens; ${CTX.listagem.filter((i) => i.code_table_24).length} itens com código)`);
}

console.log('\n--- o gerador falha alto, com a linha, no que não entende ---');
{
  const base = CTX.fonte;
  const trocar = (prefixo, fn) => {
    const original = linhaDe(base, prefixo);
    if (!original) inconclusivo(`linha "${prefixo}" não encontrada na fonte`);
    const nova = fn(original);
    return { fonte: base.replace(original, nova), linha: nova };
  };
  const CASOS = [
    ['unidade desconhecida', trocar('Estireno (vinilbenzeno) ', (l) => l.replace(' ppm Quantitativo', ' ppb Quantitativo'))],
    ['meio desconhecido', trocar('Iodo ', (l) => l.replace(' Ar e contato ', ' Água '))],
    ['código que não existe na Tabela 24', trocar('Estireno (vinilbenzeno) ', (l) => l.replace('01.03.002 - ', '01.19.020 - '))],
    ['linha truncada', trocar('Arsênio e seus compostos ', (l) => l.replace(/ Sim Sim Sim 01\.01\.001 - .*$/, ''))],
    ['faixa mínima diferente de 0', trocar('Estireno (vinilbenzeno) ', (l) => l.replace('39.00 0 0 2 12', '39.00 1 0 2 12'))],
    ['valor teto sem limite', trocar('Arsênio e seus compostos ', (l) => l.replace('Qualitativo 0 Não 0', 'Qualitativo 0 Sim 0'))],
    ['grupo Inespecífico com nome não mapeado', trocar('Bactérias ', (l) => l.replace(' Biológico ', ' Inespecífico '))],
    ['correção que não encontra o que corrigir', trocar('Agentes biológicos (bactérias, vírus, fungos e outros) ', (l) => l.replace(' Físico ', ' Biológico '))],
    ['ausência sem o código 09.01.001', trocar('Ausência de agente nocivo ou de atividades previstas no Anexo IV do Decreto 3.048/1999 ', (l) => l.replace(/ 09\.01\.001 - .*$/, ''))],
    ['linha repetida (dois itens com o mesmo id)', { fonte: `${base}\n${linhaDe(base, 'Iodo ')}\n`, linha: linhaDe(base, 'Iodo ') }],
    ['correção pela NR-15 que não acha o valor da listagem', trocar('Ácido fluorídrico ', (l) => l.replace('Quantitativo 2.0 Não 1.0', 'Quantitativo 2.5 Não 1.25'))],
    ['item conferido com nível de ação fora da metade do limite', trocar('Estireno (vinilbenzeno) ', (l) => l.replace('Quantitativo 78.00 Não 39.00', 'Quantitativo 78.00 Não 40.00'))],
  ];
  const gerarCom = (fonte) => gerador.gerar({ fonte, tabela24: TEXTO_T24, curados: TEXTO_CURADOS });
  let geraLimpo = true;
  try { gerarCom(base); } catch { geraLimpo = false; }
  check(geraLimpo, 'a fonte de verdade gera sem erro');
  for (const [nome, { fonte, linha }] of CASOS) {
    let erro = null;
    try { gerarCom(fonte); } catch (e) { erro = e; }
    check(erro !== null && erro.message.includes(linha), `${nome}: a geração para e mostra a linha${erro ? '' : ' (NÃO parou)'}`);
  }
  // Nome das listas do gerador que sumiu da fonte: a geracao para e mostra o
  // nome exato, em vez de desativar ou conferir outra coisa em silencio.
  const CASOS_POR_NOME = [
    ['duplicata de curado cujo nome sumiu da fonte', 'Projeção de partículas ', 'Projeção de partículas volantes ', '"Projeção de partículas"'],
    ['item conferido cujo nome sumiu da fonte', 'Fenol ', 'Fenóis ', '"Fenol"'],
  ];
  for (const [nome, prefixo, novo, esperado] of CASOS_POR_NOME) {
    const { fonte } = trocar(prefixo, (l) => l.replace(prefixo, novo));
    let erro = null;
    try { gerarCom(fonte); } catch (e) { erro = e; }
    check(erro !== null && erro.message.includes(esperado), `${nome}: a geração para e mostra ${esperado}${erro ? `` : ' (NÃO parou)'}`);
  }
}

console.log('\n--- textoDoLimite: igual com 3 argumentos, cita a fonte com 4 ---');
{
  const CASOS_DO_TEXTO = [
    [[78, 'ppm'], '78 ppm'],
    [[0.016, 'ppm', true], '0,016 ppm (valor teto)'],
    [[1480, 'mg/m3'], '1.480 mg/m³'],
    [[78, 'ppm', false, 'NR-15, Anexo 11'], '78 ppm (NR-15, Anexo 11)'],
    [[0.016, 'ppm', true, 'NR-15, Anexo 11'], '0,016 ppm (valor teto; NR-15, Anexo 11)'],
    [[0, 'ppm', false, 'NR-15, Anexo 11'], undefined],
  ];
  const testarTexto = (f) => CASOS_DO_TEXTO.filter(([args, esperado]) => f(...args) !== esperado)
    .map(([args, esperado]) => `${JSON.stringify(args)} -> ${JSON.stringify(f(...args))}, e não ${JSON.stringify(esperado)}`);
  const problemas = testarTexto(limites.textoDoLimite);
  check(problemas.length === 0, `textoDoLimite com e sem fonte${problemas.length ? `:\n      ${problemas.join('\n      ')}` : ''}`);
  // Mutacao: a mesma bateria tem de acusar uma funcao com o defeito.
  const DEFEITOS = [
    ['ignora a fonte', (v, u, t) => limites.textoDoLimite(v, u, t)],
    ['fonte em parêntese separado do teto', (v, u, t, f) => { const s = limites.textoDoLimite(v, u, t); return s && f ? `${s} (${f})` : s; }],
    ['cita uma fonte sem ser pedida', (v, u, t, f) => limites.textoDoLimite(v, u, t, f || 'NR-15')],
  ];
  if (problemas.length === 0) {
    for (const [nome, f] of DEFEITOS) if (testarTexto(f).length === 0) inconclusivo(`a bateria de textoDoLimite não acusou: ${nome}`);
  }
}

console.log('\n--- autoteste: cada checagem acusa o defeito reintroduzido numa cópia ---');
{
  let mutacoes = 0;
  for (const [descricao, fn, lista] of VERIFICACOES) {
    if (!lista.length) inconclusivo(`a checagem "${descricao}" não tem mutação que a prove`);
    // A checagem que ja acusou um defeito nos dados reais ja provou que acusa;
    // e la a mutacao pode nao mudar nada (o defeito ja esta la), o que daria
    // um INCONCLUSIVO falso por cima de uma FALHA verdadeira.
    if (FALHOU_NOS_DADOS.has(descricao)) continue;
    for (const [nome, aplicar] of lista) {
      const copia = structuredClone(CTX);
      try {
        aplicar(copia);
      } catch (e) {
        inconclusivo(`a mutação "${nome}" de "${descricao}" não pôde ser aplicada`, e.message);
      }
      if (fotografia(copia) === FOTO_INICIAL) inconclusivo(`a mutação "${nome}" de "${descricao}" não mudou nada`);
      if (fn(copia).length === 0) inconclusivo(`a checagem "${descricao}" não acusou o defeito reintroduzido: ${nome}`);
      mutacoes++;
    }
  }
  const provadas = VERIFICACOES.length - FALHOU_NOS_DADOS.size;
  check(
    true,
    `as ${provadas} checagens que passaram acusam as ${mutacoes} mutações` +
      (FALHOU_NOS_DADOS.size ? ` (${FALHOU_NOS_DADOS.size} já acusaram defeito nos dados reais)` : '')
  );
  check(fotografia(CTX) === FOTO_INICIAL, 'os dados verificados ficaram byte a byte como estavam (sha256)');
  check(hashDosArquivos() === HASH_INICIAL_DOS_ARQUIVOS, 'a fonte, o gerador e os arquivos do catálogo ficaram byte a byte como estavam (sha256)');
}

console.log(
  falhas === 0 ? `\nTODOS OS TESTES PASSARAM (${casos} casos)` : `\n${falhas} FALHA(S) em ${casos} casos`
);
process.exitCode = falhas === 0 ? 0 : 1;
