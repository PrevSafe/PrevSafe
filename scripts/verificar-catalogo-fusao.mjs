/**
 * Verificacao da fusao do catalogo de riscos e dos seus consumidores.
 *
 *   node scripts/verificar-catalogo-fusao.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * O catalogo passou de 25 itens curados para cerca de 935, com a listagem de
 * riscos do usuario. Ele e colecao sincronizada, e quem ja usava o sistema tem
 * os 25 gravados no servidor e no cache: sem fusao, os itens novos nunca
 * apareceriam. A fusao (lib/catalogoDeRiscos.ts) tem de:
 *
 *   1. acrescentar SO o que falta, e so da listagem: item editado pelo usuario
 *      fica como esta, e curado que ele excluiu nao volta;
 *   2. ser idempotente e nao gerar laco de sincronizacao: o que ela acrescenta
 *      sobe uma vez, e no carregamento seguinte nada mais se acrescenta;
 *   3. respeitar a semantica de list() do contexto (undefined = nao mexer).
 *
 * Por causa da fusao, item do sistema nao se exclui, se desativa - excluido,
 * ele voltaria na carga seguinte. E item da listagem nao traz severidade nem
 * probabilidade: o risco aplicado a partir dele nasce sem classificacao, e
 * nunca com um MEDIO que ninguem avaliou.
 *
 * O teste roda as funcoes compiladas, a list() do proprio contexto (extraida
 * do fonte e transpilada) e o envioPermitido da sincronizacao. No fonte da
 * tela e do contexto, procura a forma do defeito no codigo, sem comentarios.
 *
 * Saida: 0 tudo passou, 1 houve falha, 2 INCONCLUSIVO.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..'
);
const TMP = path.join(RAIZ, '.tmp-catalogo-fusao-verificacao');

function inconclusivo(motivo, detalhe) {
  console.log('\nINCONCLUSIVO — a verificação não pôde ser executada.');
  console.log(`motivo: ${motivo}`);
  if (detalhe) console.log(String(detalhe).split('\n').slice(0, 20).join('\n'));
  process.exit(2);
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
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
    files: [
      path.join(RAIZ, 'lib/catalogoDeRiscos.ts'),
      path.join(RAIZ, 'lib/planoDeAcao.ts'),
      path.join(RAIZ, 'lib/acessoPorPapel.ts'),
      path.join(RAIZ, 'lib/occupationalRisksCatalogData.ts'),
    ],
  })
);

try {
  execFileSync('npx', ['tsc', '-p', path.join(TMP, 'tsconfig.json')], {
    stdio: 'pipe', shell: true, cwd: RAIZ
  });
} catch (e) {
  inconclusivo('npx tsc falhou', e.stdout?.toString() || e.message);
}

for (const dir of [path.join(TMP, 'lib'), TMP]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const alvo = path.join(dir, f);
    fs.writeFileSync(
      alvo,
      fs.readFileSync(alvo, 'utf8').replace(/require\("@\/lib\/([^"]+)"\)/g, 'require("./$1")')
    );
  }
}
fs.writeFileSync(path.join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const require_ = createRequire(path.join(RAIZ, 'scripts', 'x.cjs'));
const achar = (n) => [path.join(TMP, 'lib', n), path.join(TMP, n)].find((p) => fs.existsSync(p));

let cat, plano, acesso, dados, listagemMod, classif;
try {
  cat = require_(achar('catalogoDeRiscos.js'));
  plano = require_(achar('planoDeAcao.js'));
  acesso = require_(achar('acessoPorPapel.js'));
  dados = require_(achar('occupationalRisksCatalogData.js'));
  listagemMod = require_(achar('catalogoDeRiscosDaListagem.js'));
  classif = require_(achar('classificacaoDeRisco.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}

const {
  acrescentarItensDaListagem, catalogoAoCarregar, ehItemDoSistema, ehItemDaListagem, itemAtivo,
  itemNovoDoUsuario, atualizarItemDoCatalogo, excluirOuDesativarItem, indiceDoSeletor, buscarNoSeletor,
  grupoDoItem, LIMITE_DO_SELETOR, camposDoRiscoAPartirDoCatalogo, itensDoCatalogoDoRisco
} = cat;
const { sugestoesDoCatalogo, acoesDoPlano } = plano;
const { envioPermitido } = acesso;
const { INITIAL_OCCUPATIONAL_RISKS_CATALOG } = dados;
const { RISCOS_DA_LISTAGEM } = listagemMod;
const { classificarRisco } = classif;

let casos = 0;
let falhas = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

/** Texto sem comentarios: a varredura procura a forma do defeito, nao a prosa. */
const semComentarios = (txt) => txt
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');

/** Trecho de uma declaracao do contexto ate a proxima do mesmo nivel. */
function corpoDe(fonte, inicio) {
  const i = fonte.indexOf(inicio);
  if (i < 0) return '';
  const resto = fonte.slice(i + inicio.length);
  const proximo = resto.search(/\n(export (async )?function |  const [A-Za-z0-9_]+ = (useCallback|useMemo)\(|  const [A-Za-z0-9_]+ = \(|  useEffect\()/);
  return inicio + (proximo < 0 ? resto : resto.slice(0, proximo));
}

const ids = (lista) => (lista || []).map((i) => i.id);
const mesmoConjunto = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// ===========================================================================
// Massa
// ===========================================================================
const DATA = '2026-01-01T00:00:00Z';
const AGORA = '2026-10-08T12:00:00.000Z';
const curado = (n, extra = {}) => ({
  id: `risk-cat-0${n}`, name: `Curado ${n}`, group: 'FÍSICO', evaluation_type: 'QUANTITATIVA',
  propagation_paths: 'Aérea (ondas sonoras)', generating_sources: 'Compressores', health_effects: 'PAIR',
  recommended_epcs: 'Enclausuramento', recommended_epis: [{ name: 'Protetor tipo concha', ca_example: '' }],
  suggested_exams_pcmso: [], default_severity: 3, default_probability: 3, catalog_source: 'CURADO',
  is_system_default: true, status: 'ACTIVE', created_at: DATA, updated_at: DATA, ...extra,
});
const listado = (slug, extra = {}) => ({
  id: `risk-lst-${slug}`, name: `Listado ${slug}`, group: 'QUÍMICO', evaluation_type: 'QUANTITATIVA',
  propagation_paths: 'Ar e contato', standard_unit: 'ppm', tolerance_limit_value: 78,
  tolerance_limit_reference: '78 ppm', action_level_value: 39, action_level_reference: '39 ppm',
  code_table_24: '01.03.002', recommended_epis: [], suggested_exams_pcmso: [], catalog_source: 'LISTAGEM',
  is_system_default: true, status: 'ACTIVE', created_at: DATA, updated_at: DATA, ...extra,
});
const C1 = curado(1);
const C2 = curado(2);
const L1 = listado('estireno');
const L2 = listado('acido-sulfurico', { name: 'Ácido sulfúrico', code_table_24: undefined });
const L3 = listado('queda', { name: 'Queda de altura', group: 'ACIDENTES', propagation_paths: '', standard_unit: undefined,
  tolerance_limit_value: undefined, tolerance_limit_reference: undefined, action_level_value: undefined,
  action_level_reference: undefined, code_table_24: undefined, evaluation_type: 'QUALITATIVA' });
const U1 = { id: 'risk-cat-1759000000000-ab12', name: 'Risco do usuário', group: 'ERGONÔMICO', evaluation_type: 'QUALITATIVA',
  propagation_paths: 'Biomecânica', recommended_epis: [], suggested_exams_pcmso: [], is_custom: true,
  status: 'ACTIVE', created_at: DATA, updated_at: DATA };
const LISTAGEM = [L1, L2, L3];
const INICIAL = [C1, C2, ...LISTAGEM];
const CHAVE = 'occupationalRisksCatalog';

// ===========================================================================
// 1. FUSAO
// ===========================================================================
console.log('\n— fusão: acrescenta só o que falta');
{
  const antiga = [U1, C1, C2];
  const fundida = acrescentarItensDaListagem(antiga, LISTAGEM);
  check(mesmoConjunto(ids(fundida), [U1.id, C1.id, C2.id, L1.id, L2.id, L3.id]) && fundida.length === 6,
    'organização com o catálogo antigo recebe os itens da listagem');
  check(fundida[0] === U1 && fundida[1] === C1 && fundida[2] === C2,
    'os itens que já estavam ficam como estavam, na mesma ordem, e os novos vão ao fim');

  const editado = { ...L2, name: 'Ácido sulfúrico (névoa)', status: 'INACTIVE', updated_at: AGORA };
  const comEditado = acrescentarItensDaListagem([C1, editado], LISTAGEM);
  check(comEditado.filter((i) => i.id === L2.id).length === 1 && comEditado.find((i) => i.id === L2.id) === editado,
    'item da listagem editado pelo usuário vence: não é sobrescrito nem duplicado');
  check(comEditado.find((i) => i.id === L2.id).status === 'INACTIVE',
    'item da listagem desativado continua desativado depois da fusão');

  const semC1 = acrescentarItensDaListagem([C2, U1], INICIAL);
  check(!ids(semC1).includes(C1.id),
    'curado excluído pelo usuário não volta, mesmo que o catálogo inicial inteiro seja passado como listagem');
  check(ids(semC1).filter((id) => id.startsWith('risk-lst-')).length === 3, 'e os da listagem entram');

  const vazia = acrescentarItensDaListagem([], LISTAGEM);
  check(mesmoConjunto(ids(vazia), ids(LISTAGEM)), 'coleção esvaziada de propósito recebe só a listagem, sem curado');

  const repetida = acrescentarItensDaListagem([C1], [L1, { ...L1 }, L2]);
  check(repetida.filter((i) => i.id === L1.id).length === 1, 'id repetido na listagem entra uma vez só');

  const semOrigem = { ...L3, catalog_source: undefined };
  check(ids(acrescentarItensDaListagem([C1], [semOrigem])).includes(L3.id),
    'item da listagem sem catalog_source, mas com id risk-lst-, é reconhecido');
  check(!ids(acrescentarItensDaListagem([], [{ ...L1, id: 'risk-lst-x', catalog_source: 'CURADO' }])).includes('risk-lst-x'),
    'item marcado como curado não entra pela fusão, qualquer que seja o id');

  const uma = acrescentarItensDaListagem([U1, C1], LISTAGEM);
  const duas = acrescentarItensDaListagem(uma, LISTAGEM);
  check(duas === uma, 'idempotente: fundir de novo devolve a mesma lista');
  const completa = [C1, C2, ...LISTAGEM];
  check(acrescentarItensDaListagem(completa, LISTAGEM) === completa,
    'nada a acrescentar devolve a mesma referência (o estado não muda à toa)');
}

// ===========================================================================
// 2. CARREGAMENTO: a list() do contexto + a fusao
// ===========================================================================
console.log('\n— carregamento: semântica de list() e sincronização');
const ctxBruto = ler('context/PrevSafeContext.tsx');
const ctxFonte = semComentarios(ctxBruto);
let criarList = null;
{
  const inicio = ctxBruto.indexOf('const list = <T,>(');
  const fim = inicio < 0 ? -1 : ctxBruto.indexOf('\n    const apply = ', inicio);
  if (inicio < 0 || fim < 0) inconclusivo('não achei a list() de applySnapshot no contexto');
  const trecho = ctxBruto.slice(inicio, fim);
  let ts;
  try {
    ts = require_('typescript');
  } catch (e) {
    inconclusivo('não foi possível carregar o typescript para transpilar a list()', e.message);
  }
  const js = ts.transpileModule(
    `export function criarList(authoritative: boolean, materialized?: Set<string>) {\n${trecho}\n  return list;\n}\n`,
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.Preserve }, fileName: 'list.tsx' }
  ).outputText;
  const mod = { exports: {} };
  new Function('exports', 'module', js)(mod.exports, mod);
  criarList = mod.exports.criarList;
  if (typeof criarList !== 'function') inconclusivo('a list() extraída do contexto não virou função');
}
const carregar = (valor, authoritative, materialized) =>
  catalogoAoCarregar(criarList(authoritative, materialized)(valor, INICIAL, CHAVE), LISTAGEM);
const ADMIN = { papel: 'ADMIN', clienteId: null };
const sombraDe = (linhas) => new Map(linhas.map((r) => [String(r.id), JSON.stringify(r)]));
const emMemoriaDe = (linhas) => new Map(linhas.map((r) => [String(r.id), { registro: r, json: JSON.stringify(r) }]));
const envio = (servidor, memoria) => envioPermitido(ADMIN, CHAVE, sombraDe(servidor), emMemoriaDe(memoria));
const MATERIALIZADA = new Set([CHAVE]);
{
  check(carregar([], false) === undefined, 'cache com catálogo vazio: undefined, não mexe no que está em memória');
  check(carregar(undefined, false) === undefined, 'cache sem o catálogo: undefined');
  check(catalogoAoCarregar(undefined, LISTAGEM) === undefined, 'a fusão não troca undefined por uma lista');
  const doCache = carregar([U1, C1, C2], false);
  check(mesmoConjunto(ids(doCache), [U1.id, C1.id, C2.id, ...ids(LISTAGEM)]), 'cache antigo, com os curados: recebe a listagem');

  check(carregar(undefined, true, new Set()) === INICIAL,
    'coleção que nunca existiu no servidor: o catálogo inicial, que já traz a listagem, sem nada a acrescentar');
  const esvaziada = carregar(undefined, true, MATERIALIZADA);
  check(mesmoConjunto(ids(esvaziada), ids(LISTAGEM)),
    'coleção esvaziada no servidor: os curados não voltam, os da listagem (que ninguém excluiu) entram');

  // Organizacao antiga: servidor com curados e um do usuario.
  const servidor = [C1, C2, U1];
  const carga1 = carregar(servidor, true, MATERIALIZADA);
  check(mesmoConjunto(ids(carga1), [...ids(servidor), ...ids(LISTAGEM)]), 'servidor com o catálogo antigo: recebe a listagem');
  const env1 = envio(servidor, carga1);
  check(mesmoConjunto(ids(env1.rows), ids(LISTAGEM)) && env1.deletedIds.length === 0,
    'o envio seguinte sobe exatamente os itens acrescentados, e não apaga nada');
  const servidor2 = [...servidor, ...env1.rows];
  const carga2 = carregar(servidor2, true, MATERIALIZADA);
  check(carga2 === servidor2, 'no carregamento seguinte nada se acrescenta');
  const env2 = envio(servidor2, carga2);
  check(env2.rows.length === 0 && env2.deletedIds.length === 0, 'e não há envio: sem laço de sincronização');

  // Desativar sobe como alteracao, e a carga seguinte nao reativa.
  const desativado = excluirOuDesativarItem(carga2, L1.id, AGORA);
  const env3 = envio(servidor2, desativado);
  check(env3.rows.length === 1 && env3.rows[0].id === L1.id && env3.rows[0].status === 'INACTIVE' && env3.deletedIds.length === 0,
    'desativar o item da listagem sobe como alteração, sem exclusão');
  const servidor3 = servidor2.map((r) => (r.id === L1.id ? env3.rows[0] : r));
  const carga3 = carregar(servidor3, true, MATERIALIZADA);
  check(carga3.find((r) => r.id === L1.id)?.status === 'INACTIVE', 'a carga seguinte não reativa o item desativado');

  // Por que desativa: excluir de fato o traria de volta.
  const excluidoDeFato = carga2.filter((r) => r.id !== L1.id);
  const env4 = envio(servidor2, excluidoDeFato);
  const servidor4 = servidor2.filter((r) => !env4.deletedIds.includes(r.id));
  check(carregar(servidor4, true, MATERIALIZADA).find((r) => r.id === L1.id)?.status === 'ACTIVE',
    'excluir de fato um item da listagem o traria de volta, ativo, na carga seguinte (por isso se desativa)');

  const comUsuarioExcluido = excluirOuDesativarItem(carga2, U1.id, AGORA);
  const env5 = envio(servidor2, comUsuarioExcluido);
  check(env5.deletedIds.length === 1 && env5.deletedIds[0] === U1.id, 'item do usuário excluído sai do servidor');
}

// Forma do defeito no contexto.
{
  const aplicar = corpoDe(ctxFonte, 'const applySnapshot = useCallback(');
  check(aplicar.length > 0, 'achou applySnapshot no contexto');
  check(/apply\(setOccupationalRisksCatalog,\s*catalogoAoCarregar\(\s*list<OccupationalRiskCatalogItem>\(parsed\.occupationalRisksCatalog,\s*INITIAL_OCCUPATIONAL_RISKS_CATALOG,\s*'occupationalRisksCatalog'\),\s*RISCOS_DA_LISTAGEM\s*\)\)/.test(aplicar),
    'o carregamento passa o catálogo pela fusão com a listagem, depois da list()');
  check(!/apply\(setOccupationalRisksCatalog,\s*list\(/.test(aplicar), 'nenhum carregamento do catálogo pula a fusão');
  const usos = (ctxFonte.match(/(catalogoAoCarregar|acrescentarItensDaListagem)\(/g) || []).length;
  check(usos === 1 && /catalogoAoCarregar\(/.test(aplicar),
    'a fusão roda só no carregamento: nenhum efeito sobre o catálogo a reaplica (laço de envio)');
  const efeitos = ctxFonte.split(/\n  useEffect\(/).slice(1);
  check(!efeitos.some((e) => /setOccupationalRisksCatalog\(/.test(e.split(/\n  \}, \[/)[0])),
    'nenhum useEffect grava o catálogo');
}

// ===========================================================================
// 3. EXCLUSAO VIRA DESATIVACAO
// ===========================================================================
console.log('\n— item do sistema se desativa; o do usuário se exclui');
{
  const lista = [U1, C1, ...LISTAGEM];
  const semL1 = excluirOuDesativarItem(lista, L1.id, AGORA);
  check(semL1.length === lista.length && semL1.find((i) => i.id === L1.id).status === 'INACTIVE'
    && semL1.find((i) => i.id === L1.id).updated_at === AGORA, 'item da listagem: fica, com status INACTIVE');
  check(excluirOuDesativarItem(lista, C1.id, AGORA).find((i) => i.id === C1.id)?.status === 'INACTIVE',
    'item curado: também se desativa');
  check(!ids(excluirOuDesativarItem(lista, U1.id, AGORA)).includes(U1.id), 'item do usuário: excluído de fato');
  const semMarca = { ...L2, is_system_default: false };
  check(excluirOuDesativarItem([semMarca], L2.id, AGORA)[0]?.status === 'INACTIVE',
    'a origem da listagem basta: sem a marca is_system_default, continua se desativando');
  check(excluirOuDesativarItem(lista, 'inexistente', AGORA) === lista, 'id inexistente: nada muda');
  check(excluirOuDesativarItem(semL1, L1.id, AGORA) === semL1, 'desativar o já desativado: nada muda');
  check(ehItemDoSistema(C1) && ehItemDoSistema(L1) && !ehItemDoSistema(U1), 'curado e listado são do sistema; o do usuário, não');

  const alterada = atualizarItemDoCatalogo(lista, L1.id,
    { name: 'Estireno', is_system_default: false, catalog_source: undefined, id: 'outro' }, AGORA);
  const l1 = alterada.find((i) => i.name === 'Estireno');
  check(!!l1 && l1.id === L1.id && l1.is_system_default === true && l1.catalog_source === 'LISTAGEM' && l1.updated_at === AGORA,
    'a edição muda o conteúdo, mas não o id, a origem nem a marca do sistema');
  const doUsuario = atualizarItemDoCatalogo(lista, U1.id, { is_system_default: true, catalog_source: 'LISTAGEM' }, AGORA)
    .find((i) => i.id === U1.id);
  check(!doUsuario.is_system_default && !doUsuario.catalog_source, 'item do usuário não vira do sistema pela edição');
  const reativado = atualizarItemDoCatalogo(semL1, L1.id, { status: 'ACTIVE' }, AGORA).find((i) => i.id === L1.id);
  check(reativado.status === 'ACTIVE', 'reativar pela edição de status');

  const copia = itemNovoDoUsuario({ ...L1, id: undefined, created_at: undefined, updated_at: undefined }, 'risk-cat-novo', AGORA);
  check(copia.is_system_default === false && !('catalog_source' in copia) && copia.id === 'risk-cat-novo',
    'item novo copiado de um do sistema nasce do usuário');
  check(!ids(excluirOuDesativarItem([copia], copia.id, AGORA)).includes(copia.id), 'e pode ser excluído');

  const excluir = corpoDe(ctxFonte, 'const deleteOccupationalRiskCatalogItem = useCallback(');
  check(/setOccupationalRisksCatalog\(prev => excluirOuDesativarItem\(prev, id,/.test(excluir),
    'o contexto exclui pelo excluirOuDesativarItem');
  check(!/setOccupationalRisksCatalog\(\s*\(?prev\)?\s*=>\s*prev\.filter\(/.test(ctxFonte),
    'nenhum ponto do contexto tira item do catálogo com filter direto');
  const atualizar = corpoDe(ctxFonte, 'const updateOccupationalRiskCatalogItem = useCallback(');
  check(/atualizarItemDoCatalogo\(prev, id, updates,/.test(atualizar) && !/\.\.\.updates/.test(atualizar),
    'a alteração passa pelo atualizarItemDoCatalogo, e não por um spread direto');
  check(/itemNovoDoUsuario\(data,/.test(corpoDe(ctxFonte, 'const addOccupationalRiskCatalogItem = useCallback(')),
    'item novo passa pelo itemNovoDoUsuario');
  check(/setOccupationalRisksCatalog\(INITIAL_OCCUPATIONAL_RISKS_CATALOG\)/.test(
    corpoDe(ctxFonte, 'const resetOccupationalRisksCatalogToDefault = useCallback(')),
  'restaurar o padrão continua voltando ao catálogo inicial');
}

// ===========================================================================
// 4. DO CATALOGO AO INVENTARIO
// ===========================================================================
console.log('\n— risco aplicado a partir de item da listagem');
const FACHADA = /undefined|null|NaN|N\/A|\(\s*\)/;
const textosComFachada = (campos) => Object.entries(campos)
  .filter(([, v]) => typeof v === 'string' && FACHADA.test(v)).map(([k]) => k);
{
  const r1 = camposDoRiscoAPartirDoCatalogo(L1);
  check(r1.severity === undefined && r1.probability === undefined && r1.risk_level === undefined,
    'sem severidade, probabilidade nem nível: nada inventado');
  check(classificarRisco(r1.severity, r1.probability) === null, 'o risco fica "não classificado" pela matriz do modelo');
  check(r1.generating_source === '' && r1.health_effects === '', 'fonte geradora e efeito à saúde vazios, sem texto de fachada');
  check(r1.propagation_path === 'Ar e contato' && r1.measurement_unit === 'ppm', 'leva o meio de propagação e a unidade da listagem');
  check(r1.tolerance_limit === '78 ppm' && r1.action_level === '39 ppm', 'leva o limite de tolerância e o nível de ação em texto');
  check(r1.risk_code_table_24 === '01.03.002' && /\(01\.03\.002\)/.test(r1.ltcat_technical_conclusion),
    'leva o código da Tabela 24, também à conclusão do LTCAT');
  check(r1.special_retirement_applies === undefined && r1.gfip_code === undefined
    && r1.insalubridade_applies === undefined && r1.periculosidade_applies === undefined,
  'enquadramento não declarado fica sem valor, e não "não se aplica" nem GFIP 00');
  check(r1.epi_required === false && Array.isArray(r1.epis) && r1.epis.length === 0 && r1.measured_value === '',
    'sem EPI recomendado e sem medição "0"');
  check(textosComFachada(r1).length === 0, `nenhum campo de texto com "undefined", "N/A" ou parêntese vazio${textosComFachada(r1).length ? `: ${textosComFachada(r1).join(', ')}` : ''}`);

  const r3 = camposDoRiscoAPartirDoCatalogo(L3);
  check(r3.propagation_path === '' && r3.risk_code_table_24 === '' && r3.tolerance_limit === undefined,
    'item sem meio, código e limite: os campos ficam vazios, sem "Aérea" no lugar');
  check(!/\(/.test(r3.ltcat_technical_conclusion) && textosComFachada(r3).length === 0,
    'sem código, a conclusão do LTCAT não leva parêntese vazio nem "(undefined)"');

  const ajustado = camposDoRiscoAPartirDoCatalogo(L1, { severity: 4, probability: 3 });
  check(ajustado.severity === 4 && ajustado.probability === 3 && ajustado.risk_level === classificarRisco(4, 3).nivel,
    'severidade e probabilidade de quem aplica classificam pela matriz do modelo');
  const meia = camposDoRiscoAPartirDoCatalogo(L1, { severity: 4 });
  check(meia.severity === undefined && meia.risk_level === undefined,
    'só a severidade, sem probabilidade: continua não classificado (nada pela metade)');
  const invalido = camposDoRiscoAPartirDoCatalogo({ ...L1, default_severity: 0, default_probability: 7 });
  check(invalido.severity === undefined && invalido.probability === undefined, 'gradação fora de 1 a 5 não vira classificação');
  const rc = camposDoRiscoAPartirDoCatalogo(C1);
  check(rc.severity === 3 && rc.probability === 3 && rc.risk_level === classificarRisco(3, 3).nivel,
    'item curado com gradação padrão continua classificado pela matriz');
  check(rc.epis.length === 1 && rc.epis[0].ca_number === '' && rc.epis.every((e) => !e.is_effective && !e.complies_with_nr06),
    'EPI recomendado entra sem CA inventado e sem as condições de eficácia atestadas');

  const risco = { id: 'r-l1', client_id: 'c1', ghe_id: 'g1', ...r1, epc_implemented: false, epc_effective: false };
  check(sugestoesDoCatalogo(risco, L1, null).length === 0, 'item da listagem não gera sugestão vazia no plano de ação');
  const linhas = acoesDoPlano([risco], [{ id: 'g1', code: 'GHE-01', name: 'Produção', client_id: 'c1' }], () => 3,
    { acoes: [], efetivo: 10, hoje: '2026-10-08' });
  check(linhas.length === 1 && linhas[0].classificado === null && linhas[0].prazoDaFaixa === null && linhas[0].prazo === '',
    'no plano do PGR o risco sai sem classificação e sem prazo inventado');

  const ativos = itensDoCatalogoDoRisco([{ ...C1, status: 'INACTIVE' }, L1, { ...L1, id: 'risk-lst-2' }],
    { agent_name: L1.name, risk_code_table_24: L1.code_table_24 });
  check(ids(ativos).join() === `${L1.id},risk-lst-2`, 'o item de origem de um risco é procurado só entre os ativos');
  check(itensDoCatalogoDoRisco([{ ...C1, status: 'INACTIVE' }], { agent_name: C1.name, risk_code_table_24: '' }).length === 0,
    'item desativado não sugere ação para risco que veio dele');

  const aplicar = corpoDe(ctxFonte, 'const applyRisksToTargets = useCallback(');
  check(aplicar.length > 0, 'achou applyRisksToTargets');
  check(/\.filter\(itemAtivo\)/.test(aplicar), 'a aplicação deixa de fora o item desativado');
  check(/\.\.\.camposDoRiscoAPartirDoCatalogo\(catRisk, payload\.custom_risk_data\)/.test(aplicar),
    'o risco leva os campos do item pela função única');
  check(!/default_(severity|probability)/.test(aplicar), 'a aplicação não lê a gradação padrão por fora da função');
  check(!/\|\|\s*'(MEDIO|MÉDIO)'/.test(ctxFonte) && !/\|\|\s*'A[ée]rea'/.test(ctxFonte),
    'nenhum nível MEDIO nem via "Aérea" no lugar do que falta');
  check(!/targetGhe\.description\s*\|\|/.test(ctxFonte), 'a descrição do GHE não vira fonte geradora');
  check(!/preparation_instructions:\s*'/.test(aplicar), 'o protocolo de exame aplicado não nasce com instrução de preparo fixa');
  const sugerir = corpoDe(ctxFonte, 'const sugerirAcoesParaRiscosSemPlano = useCallback(');
  check(/itensDoCatalogoDoRisco\(occupationalRisksCatalog, r\)/.test(sugerir) && !/occupationalRisksCatalog\.find\(/.test(sugerir),
    'sugerir ações procura o item de origem só entre os ativos');
}

// ===========================================================================
// 5. SELETOR DO INVENTARIO
// ===========================================================================
console.log('\n— seletor do catálogo no inventário');
{
  const inativo = listado('desativado', { name: 'Item desativado', status: 'INACTIVE' });
  const semAcento = listado('fisico', { name: 'Vibração de corpo inteiro', group: 'FISICO', code_table_24: '02.01.004' });
  const indice = indiceDoSeletor([C1, ...LISTAGEM, inativo, semAcento]);
  check(!indice.some((e) => e.item.id === inativo.id), 'item desativado não entra no seletor');
  const nomes = (r) => r.map((i) => i.name);
  check(nomes(buscarNoSeletor(indice, 'acido sulfurico', 'ALL')).includes('Ácido sulfúrico'), 'busca sem acento acha o nome acentuado');
  check(nomes(buscarNoSeletor(indice, 'ÁCIDO  SULF', 'ALL')).includes('Ácido sulfúrico'), 'maiúsculas, acento e espaço a mais não atrapalham');
  check(ids(buscarNoSeletor(indice, '01.03.002', 'ALL')).includes(L1.id), 'busca pelo código como escrito');
  check(ids(buscarNoSeletor(indice, '0103002', 'ALL')).includes(L1.id), 'busca pelo código só com os dígitos');
  check(ids(buscarNoSeletor(indice, 'vibracao', 'FISICO')).includes(semAcento.id),
    'o filtro de grupo acha o grupo gravado sem acento');
  check(ids(buscarNoSeletor(indice, '', 'ACIDENTE')).join() === L3.id, 'o filtro "Acidentes" acha o grupo ACIDENTES (plural)');
  check(grupoDoItem('FÍSICO') === 'FISICO' && grupoDoItem('QUIMICO') === 'QUIMICO' && grupoDoItem('AUSÊNCIA_RISCO') === 'AUSENCIA',
    'o grupo do item vale com e sem acento');
  check(buscarNoSeletor(indice, 'sulfurico', 'QUIMICO').length === 1 && buscarNoSeletor(indice, 'sulfurico', 'FISICO').length === 0,
    'busca e grupo se combinam');
  check(nomes(buscarNoSeletor(indice, 'queda', 'ALL'))[0] === 'Queda de altura', 'nome que começa pelo termo vem primeiro');
  check(LIMITE_DO_SELETOR === 50, 'o seletor desenha no máximo 50 itens de uma vez');

  // Perto de mil itens: o indice se monta uma vez, e a busca por tecla e rapida.
  const mil = Array.from({ length: 1000 }, (_, i) => listado(`n${i}`, { name: `Agente químico número ${i}`, code_table_24: `01.${String(i % 99).padStart(2, '0')}.001` }));
  const indiceGrande = indiceDoSeletor(mil);
  const t0 = process.hrtime.bigint();
  for (let k = 0; k < 200; k++) buscarNoSeletor(indiceGrande, `quimico numero ${k}`, 'ALL');
  const msPorBusca = Number(process.hrtime.bigint() - t0) / 1e6 / 200;
  check(msPorBusca < 20, `busca em 1000 itens: ${msPorBusca.toFixed(2)} ms por tecla`);

  const aba = semComentarios(ler('components/sst/GHERiskInventoryTab.tsx'));
  check(/useMemo\(\(\) => indiceDoSeletor\(occupationalRisksCatalog\), \[occupationalRisksCatalog\]\)/.test(aba),
    'a tela monta o índice uma vez por catálogo');
  check(/useDeferredValue\(catalogSearch\)/.test(aba) && /buscarNoSeletor\(indiceDoCatalogo, buscaNoCatalogo,/.test(aba),
    'a busca roda sobre o valor adiado: a digitação não espera a lista');
  check(/achadosNoCatalogo\.slice\(0, LIMITE_DO_SELETOR\)/.test(aba) && /\{exibidosDoCatalogo\.map\(/.test(aba),
    'a lista desenha só os primeiros itens');
  check(!/occupationalRisksCatalog\s*\.(filter|map)\(/.test(aba) && !/\{achadosNoCatalogo\.map\(/.test(aba),
    'nenhuma lista da tela desenha o catálogo inteiro');
  check(/achadosNoCatalogo\.length > exibidosDoCatalogo\.length/.test(aba), 'avisa quando há mais itens do que os desenhados');
  check(!/\{item\.health_effects\}/.test(aba) && !/\{item\.code_table_24\}/.test(aba),
    'campo vazio do item não aparece como rótulo seguido de nada');
}

// ===========================================================================
// 6. DADOS REAIS: a listagem gerada e o catalogo inicial
// ===========================================================================
console.log('\n— dados reais: listagem e catálogo inicial');
{
  const lst = Array.isArray(RISCOS_DA_LISTAGEM) ? RISCOS_DA_LISTAGEM : [];
  const ini = Array.isArray(INITIAL_OCCUPATIONAL_RISKS_CATALOG) ? INITIAL_OCCUPATIONAL_RISKS_CATALOG : [];
  check(lst.length > 0, `a listagem tem itens (${lst.length})`);
  const foraDaRegra = lst.filter((i) => !ehItemDaListagem(i) || !ehItemDoSistema(i) || !String(i.id).startsWith('risk-lst-'));
  check(foraDaRegra.length === 0,
    `todo item da listagem é reconhecido pela fusão e é do sistema${foraDaRegra.length ? `: ${ids(foraDaRegra).slice(0, 3).join(', ')}` : ''}`);
  check(new Set(ids(lst)).size === lst.length, 'os ids da listagem são únicos');
  const curadosIni = ini.filter((i) => !ehItemDaListagem(i));
  check(curadosIni.length > 0 && curadosIni.every(ehItemDoSistema), `os curados do catálogo inicial são do sistema (${curadosIni.length})`);
  check(ids(lst).every((id) => ids(ini).includes(id)), 'o catálogo inicial traz a listagem inteira');
  const antiga = acrescentarItensDaListagem(curadosIni, lst);
  check(mesmoConjunto(ids(antiga), ids(ini)), 'organização com só os curados fica, depois da fusão, com o catálogo inicial inteiro');
  check(acrescentarItensDaListagem(ini, lst) === ini, 'o catálogo inicial já fundido não muda');

  const classificados = lst.filter((i) => classificarRisco(camposDoRiscoAPartirDoCatalogo(i).severity, camposDoRiscoAPartirDoCatalogo(i).probability));
  check(classificados.length === 0, 'nenhum risco aplicado a partir da listagem nasce classificado');
  const comFachada = lst.filter((i) => textosComFachada(camposDoRiscoAPartirDoCatalogo(i)).length > 0);
  check(comFachada.length === 0,
    `nenhum risco aplicado a partir da listagem leva texto de fachada${comFachada.length ? `: ${ids(comFachada).slice(0, 3).join(', ')}` : ''}`);
  const viaPerdida = lst.filter((i) => camposDoRiscoAPartirDoCatalogo(i).propagation_path !== String(i.propagation_paths || '').trim());
  check(viaPerdida.length === 0, 'o meio de propagação da listagem chega ao risco como está');

  const indice = indiceDoSeletor(ini);
  check(indice.length === ini.filter(itemAtivo).length, `o seletor oferece os ${indice.length} itens ativos do catálogo inicial`);
  const semGrupo = indice.filter((e) => !e.grupo);
  check(semGrupo.length === 0,
    `todo item ativo cai num grupo do filtro${semGrupo.length ? `: ${semGrupo.slice(0, 3).map((e) => e.item.group).join(', ')}` : ''}`);
  const acentuado = lst.find((i) => itemAtivo(i) && /[áéíóúâêôãõç]/i.test(i.name));
  if (acentuado) {
    const termo = acentuado.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().slice(0, 30);
    check(ids(buscarNoSeletor(indice, termo, 'ALL')).includes(acentuado.id), `"${termo}" acha "${acentuado.name.slice(0, 30)}"`);
  }
  const comCodigo = lst.find((i) => itemAtivo(i) && i.code_table_24);
  if (comCodigo) {
    check(ids(buscarNoSeletor(indice, comCodigo.code_table_24, 'ALL')).includes(comCodigo.id)
      && ids(buscarNoSeletor(indice, comCodigo.code_table_24.replace(/\D/g, ''), 'ALL')).includes(comCodigo.id),
    `o código ${comCodigo.code_table_24} acha o item, com e sem pontos`);
  }
}

// ===========================================================================
console.log(`\n${casos - falhas}/${casos} casos OK`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S)`);
  process.exit(1);
}
console.log('Catálogo: a listagem entra sem sobrescrever nem ressuscitar, item do sistema se desativa, e o risco aplicado não ganha classificação inventada.');
