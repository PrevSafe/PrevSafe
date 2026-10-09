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
]);

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

function limitesDaFonte(ctx) {
  const p = [];
  for (const [item, f] of itensComLinha(ctx)) {
    if (!f) continue;
    const confere = (campo, daFonte) => {
      if (daFonte > 0 ? item[campo] !== daFonte : tem(item, campo)) {
        p.push(`${item.name}: ${campo} ${JSON.stringify(item[campo])}, a fonte traz ${daFonte}`);
      }
    };
    confere('tolerance_limit_value', f.lt);
    confere('action_level_value', f.na);
    if (f.teto !== (item.tolerance_limit_is_ceiling === true)) p.push(`${item.name}: teto ${item.tolerance_limit_is_ceiling}, a fonte "${f.teto ? 'Sim' : 'Não'}"`);
    if (f.casas === null ? tem(item, 'measurement_decimal_places') : item.measurement_decimal_places !== f.casas) {
      p.push(`${item.name}: casas ${item.measurement_decimal_places}, a fonte ${f.casas}`);
    }
  }
  return p;
}

function textoConfere(ctx) {
  const p = [];
  for (const i of ctx.listagem) {
    const lt = tem(i, 'tolerance_limit_value') ? limites.textoDoLimite(i.tolerance_limit_value, i.standard_unit, i.tolerance_limit_is_ceiling === true) : undefined;
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
    if (i.is_system_default !== true || i.status !== 'ACTIVE') p.push(`${i.name}: is_system_default/status`);
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

// Pontos conferidos contra a fonte, a mao.
const PONTOS = [
  ['Estireno (vinilbenzeno)', { standard_unit: 'ppm', tolerance_limit_value: 78, tolerance_limit_reference: '78 ppm', action_level_value: 39, action_level_reference: '39 ppm' }, ['tolerance_limit_is_ceiling']],
  ['Diisocianato de tolueno (TDI)', { standard_unit: 'ppm', tolerance_limit_value: 0.016, tolerance_limit_reference: '0,016 ppm (valor teto)', tolerance_limit_is_ceiling: true, action_level_value: 0.008, action_level_reference: '0,008 ppm' }, []],
  ['1,1,1 Tricloroetano (Metilclorofórmio)', { standard_unit: 'mg/m³', tolerance_limit_value: 1480, tolerance_limit_reference: '1.480 mg/m³', action_level_value: 740, action_level_reference: '740 mg/m³' }, ['tolerance_limit_is_ceiling']],
  ['Cádmio e seus compostos tóxicos', { standard_unit: 'mg/m³', tolerance_limit_value: 0.039, tolerance_limit_reference: '0,039 mg/m³', action_level_value: 0.019, action_level_reference: '0,019 mg/m³', code_table_24: '01.06.001' }, []],
  ['Vibração de corpo inteiro (Valor da Dose de Vibração Resultante - VDVR)', { standard_unit: 'm/s1,75', tolerance_limit_value: 21, tolerance_limit_reference: '21 m/s1,75', action_level_value: 9.1, action_level_reference: '9,1 m/s1,75' }, []],
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
};
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
