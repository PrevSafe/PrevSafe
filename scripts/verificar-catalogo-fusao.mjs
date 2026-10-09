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
 *   1. acrescentar o que falta, e so da listagem: curado que o usuario
 *      excluiu nao volta;
 *   2. trocar pela versao do codigo o item da listagem que o usuario nunca
 *      editou (created_at === updated_at) - e so ele: o editado, o desativado
 *      e o reativado ficam como estao, e curado e item do usuario nao mudam.
 *      E assim que a correcao de um limite chega a quem ja gravou o catalogo;
 *   3. ser idempotente e nao gerar laco de sincronizacao: o que ela acrescenta
 *      ou troca sobe uma vez, e no carregamento seguinte - com as chaves na
 *      ordem do jsonb - nada mais muda;
 *   4. respeitar a semantica de list() do contexto (undefined = nao mexer).
 *
 * Por causa da fusao, item do sistema nao se exclui, se desativa - excluido,
 * ele voltaria na carga seguinte. E item da listagem nao traz severidade nem
 * probabilidade: o risco aplicado a partir dele nasce sem classificacao, e
 * nunca com um MEDIO que ninguem avaliou.
 *
 * Tambem prova o "Restaurar padrao" (so os itens do sistema voltam ao codigo;
 * os do usuario ficam), os campos de classificacao do formulario ("nao
 * informado" nao grava nada, a edicao grava so o que mudou) e o aviso do item
 * da listagem que repete um curado.
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
  fundirItensDaListagem, catalogoAoCarregar, itemNuncaEditado, ehItemDoSistema, ehItemDaListagem, itemAtivo,
  itemNovoDoUsuario, atualizarItemDoCatalogo, excluirOuDesativarItem, restaurarItensDoSistema, textoDaDuplicidade,
  indiceDoSeletor, buscarNoSeletor, grupoDoItem, LIMITE_DO_SELETOR, camposDoRiscoAPartirDoCatalogo, itensDoCatalogoDoRisco,
  CLASSIFICACAO_NAO_INFORMADA, classificacaoParaFormulario, valoresDaClassificacao, mudancasDaClassificacao,
  conflitoGfipAposentadoria, enquadramentoDoItem, OPCOES_DE_GFIP, GRAUS_DE_INSALUBRIDADE
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

/**
 * O registro como o servidor o devolve: o jsonb do Postgres guarda as chaves
 * por tamanho e depois em ordem binaria, e o JSON descarta undefined. E nessa
 * forma que o item gravado chega a fusao em toda carga.
 */
function comoJsonb(v) {
  const ordenar = (x) => {
    if (Array.isArray(x)) return x.map(ordenar);
    if (!x || typeof x !== 'object') return x;
    const chaves = Object.keys(x).sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(chaves.map((k) => [k, ordenar(x[k])]));
  };
  return ordenar(JSON.parse(JSON.stringify(v)));
}

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
console.log('\n— fusão: acrescenta o que falta');
{
  const antiga = [U1, C1, C2];
  const fundida = fundirItensDaListagem(antiga, LISTAGEM);
  check(mesmoConjunto(ids(fundida), [U1.id, C1.id, C2.id, L1.id, L2.id, L3.id]) && fundida.length === 6,
    'organização com o catálogo antigo recebe os itens da listagem');
  check(fundida[0] === U1 && fundida[1] === C1 && fundida[2] === C2,
    'os itens que já estavam ficam como estavam, na mesma ordem, e os novos vão ao fim');

  const editado = { ...L2, name: 'Ácido sulfúrico (névoa)', status: 'INACTIVE', updated_at: AGORA };
  const comEditado = fundirItensDaListagem([C1, editado], LISTAGEM);
  check(comEditado.filter((i) => i.id === L2.id).length === 1 && comEditado.find((i) => i.id === L2.id) === editado,
    'item da listagem editado pelo usuário vence: não é sobrescrito nem duplicado');
  check(comEditado.find((i) => i.id === L2.id).status === 'INACTIVE',
    'item da listagem desativado continua desativado depois da fusão');

  const semC1 = fundirItensDaListagem([C2, U1], INICIAL);
  check(!ids(semC1).includes(C1.id),
    'curado excluído pelo usuário não volta, mesmo que o catálogo inicial inteiro seja passado como listagem');
  check(ids(semC1).filter((id) => id.startsWith('risk-lst-')).length === 3, 'e os da listagem entram');

  const vazia = fundirItensDaListagem([], LISTAGEM);
  check(mesmoConjunto(ids(vazia), ids(LISTAGEM)), 'coleção esvaziada de propósito recebe só a listagem, sem curado');

  const repetida = fundirItensDaListagem([C1], [L1, { ...L1 }, L2]);
  check(repetida.filter((i) => i.id === L1.id).length === 1, 'id repetido na listagem entra uma vez só');

  const semOrigem = { ...L3, catalog_source: undefined };
  check(ids(fundirItensDaListagem([C1], [semOrigem])).includes(L3.id),
    'item da listagem sem catalog_source, mas com id risk-lst-, é reconhecido');
  check(!ids(fundirItensDaListagem([], [{ ...L1, id: 'risk-lst-x', catalog_source: 'CURADO' }])).includes('risk-lst-x'),
    'item marcado como curado não entra pela fusão, qualquer que seja o id');

  const uma = fundirItensDaListagem([U1, C1], LISTAGEM);
  const duas = fundirItensDaListagem(uma, LISTAGEM);
  check(duas === uma, 'idempotente: fundir de novo devolve a mesma lista');
  const completa = [C1, C2, ...LISTAGEM];
  check(fundirItensDaListagem(completa, LISTAGEM) === completa,
    'nada a acrescentar devolve a mesma referência (o estado não muda à toa)');
}

// A correcao do sistema chega a quem ja gravou o catalogo: o item da listagem
// nunca editado (created_at === updated_at) e trocado pela versao do codigo.
console.log('\n— fusão: troca o item da listagem nunca editado, e só ele');
{
  // Como o servidor tem o item hoje: gravado antes da correcao, ativo e com o
  // limite antigo, com as duas datas iguais.
  const L1antigo = comoJsonb({ ...L1, tolerance_limit_value: 100, tolerance_limit_reference: '100 ppm' });
  const L3antigo = comoJsonb(L3);
  // A versao do codigo: L1 com o limite corrigido; L3 desativado por repetir C1.
  const L3dup = { ...L3, status: 'INACTIVE', duplicate_of_id: C1.id };
  const CODIGO = [L1, L2, L3dup];

  check(itemNuncaEditado(L1antigo) && !itemNuncaEditado({ ...L1, updated_at: AGORA }),
    'nunca editado = as duas datas presentes e iguais');
  check(!itemNuncaEditado({ ...L1, created_at: undefined, updated_at: undefined }) && !itemNuncaEditado({ ...L1, created_at: '', updated_at: '' }),
    'sem as datas não dá para saber: não conta como nunca editado');

  const gravado = [U1, C1, L1antigo, L2, L3antigo];
  const fundida = fundirItensDaListagem(gravado, CODIGO);
  check(fundida[2] === L1 && fundida[2].tolerance_limit_value === 78,
    'troca o não editado: o item da listagem gravado com o limite antigo recebe o limite corrigido, no mesmo lugar');
  check(fundida[4] === L3dup && fundida[4].status === 'INACTIVE' && fundida[4].duplicate_of_id === C1.id,
    'o item que o código desativa por repetir um curado chega desativado a quem o tinha ativo e nunca o editou');
  check(fundida.length === gravado.length && new Set(ids(fundida)).size === fundida.length,
    'a troca não duplica nem acrescenta: mesmo tamanho, ids únicos');
  check(fundida[0] === U1 && fundida[1] === C1 && fundida[3] === L2, 'os demais itens ficam como estavam, pela referência');
  check(fundirItensDaListagem(fundida, CODIGO) === fundida, 'idempotente depois da troca: fundir de novo não muda nada');

  // Preserva o editado: editado, desativado e reativado pela tela mudam updated_at.
  const L1editado = { ...L1antigo, name: 'Estireno (meu texto)', updated_at: AGORA };
  const comEditado = fundirItensDaListagem([C1, L1editado], CODIGO);
  check(comEditado.find((i) => i.id === L1.id) === L1editado,
    'preserva o editado: o item da listagem com edição do usuário não recebe a correção');
  const desativado = excluirOuDesativarItem([L3antigo], L3.id, AGORA)[0];
  check(fundirItensDaListagem([desativado], CODIGO)[0] === desativado,
    'preserva o desativado pela tela, mesmo que o código mude o item');
  const reativado = atualizarItemDoCatalogo([L3dup], L3.id, { status: 'ACTIVE' }, AGORA)[0];
  const aposReativar = fundirItensDaListagem([reativado], CODIGO)[0];
  check(aposReativar === reativado && aposReativar.status === 'ACTIVE',
    'preserva o reativado: o item repetido que o usuário reativou não volta a ser desativado');
  const semDatas = { ...L1antigo, created_at: undefined, updated_at: undefined };
  check(fundirItensDaListagem([semDatas], CODIGO)[0] === semDatas, 'item gravado sem as datas fica como está');

  // Nao troca curado: o curado gravado, com as datas iguais e texto antigo, fica.
  const C1antigo = comoJsonb({ ...C1, name: 'Curado 1 (texto antigo)', created_at: DATA, updated_at: DATA });
  const comCurado = fundirItensDaListagem([C1antigo, U1], [C1, C2, ...CODIGO]);
  check(comCurado[0] === C1antigo && comCurado[1] === U1,
    'não troca curado nem item do usuário, nem quando o catálogo inicial inteiro é passado como listagem');
  check(!ids(comCurado).includes(C2.id), 'e o curado ausente continua sem voltar');
  const curadoComIdDeListagem = { ...L1antigo, catalog_source: 'CURADO' };
  check(fundirItensDaListagem([curadoComIdDeListagem], CODIGO)[0] === curadoComIdDeListagem,
    'item gravado como curado não é trocado, qualquer que seja o id');

  // Igual ao codigo, mas com as chaves na ordem do jsonb: nao e troca.
  const servidorIgual = [comoJsonb(C1), comoJsonb(L1), comoJsonb(L2), comoJsonb(L3dup)];
  check(fundirItensDaListagem(servidorIgual, CODIGO) === servidorIgual,
    'item igual ao do código, com as chaves na ordem do jsonb e sem os undefined, não é trocado: a mesma lista');
}

// ===========================================================================
// 2. CARREGAMENTO: a list() do contexto + a fusao
// ===========================================================================
console.log('\n— carregamento: semântica de list() e sincronização');
const ctxBruto = ler('context/PrevSafeContext.tsx');
const ctxFonte = semComentarios(ctxBruto);
const viewFonte = semComentarios(ler('components/sst/OccupationalRisksCatalogView.tsx'));
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

  // A correcao do codigo sobe uma vez, e a carga seguinte - que devolve o
  // item com as chaves na ordem do jsonb - nao troca de novo.
  const L1corrigido = { ...L1, tolerance_limit_value: 20, tolerance_limit_reference: '20 ppm' };
  const L2dup = { ...L2, status: 'INACTIVE', duplicate_of_id: C2.id };
  const CODIGO = [L1corrigido, L2dup, L3];
  const L3editado = comoJsonb({ ...L3, name: 'Queda de altura (andaime)', updated_at: AGORA });
  const servidorA = [comoJsonb(C1), comoJsonb(U1), comoJsonb(L1), comoJsonb(L2), L3editado];
  const cargaA = catalogoAoCarregar(criarList(true, MATERIALIZADA)(servidorA, INICIAL, CHAVE), CODIGO);
  const envA = envio(servidorA, cargaA);
  check(mesmoConjunto(ids(envA.rows), [L1.id, L2.id]) && envA.deletedIds.length === 0,
    'a correção sobe como alteração dos itens nunca editados, e só deles: o editado não é reenviado');
  const servidorB = servidorA.map((r) => {
    const enviado = envA.rows.find((e) => e.id === r.id);
    return enviado ? comoJsonb(enviado) : r;
  });
  const cargaB = catalogoAoCarregar(criarList(true, MATERIALIZADA)(servidorB, INICIAL, CHAVE), CODIGO);
  check(cargaB === servidorB, 'na carga seguinte o servidor já tem a versão do código: a mesma lista, nada trocado');
  const envB = envio(servidorB, cargaB);
  check(envB.rows.length === 0 && envB.deletedIds.length === 0, 'e não há envio: a correção não vira laço de sincronização');
  check(cargaB.find((r) => r.id === L2.id).status === 'INACTIVE' && cargaB.find((r) => r.id === L3.id).name === 'Queda de altura (andaime)',
    'o repetido ficou desativado no servidor, e o editado continua com a edição do usuário');
}

// Forma do defeito no contexto.
{
  const aplicar = corpoDe(ctxFonte, 'const applySnapshot = useCallback(');
  check(aplicar.length > 0, 'achou applySnapshot no contexto');
  check(/apply\(setOccupationalRisksCatalog,\s*catalogoAoCarregar\(\s*list<OccupationalRiskCatalogItem>\(parsed\.occupationalRisksCatalog,\s*INITIAL_OCCUPATIONAL_RISKS_CATALOG,\s*'occupationalRisksCatalog'\),\s*RISCOS_DA_LISTAGEM\s*\)\)/.test(aplicar),
    'o carregamento passa o catálogo pela fusão com a listagem, depois da list()');
  check(!/apply\(setOccupationalRisksCatalog,\s*list\(/.test(aplicar), 'nenhum carregamento do catálogo pula a fusão');
  const usos = (ctxFonte.match(/(catalogoAoCarregar|fundirItensDaListagem|acrescentarItensDaListagem)\(/g) || []).length;
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
}

// ===========================================================================
// 3b. RESTAURAR PADRAO: so os itens do sistema
// ===========================================================================
console.log('\n— restaurar padrão: os itens do sistema voltam ao código, os do usuário ficam');
{
  const L2dup = { ...L2, status: 'INACTIVE', duplicate_of_id: C1.id };
  const SISTEMA = [C1, C2, L1, L2dup, L3];
  const U2 = { ...U1, id: 'risk-cat-1759000000001-cd34', name: 'Outro do usuário', status: 'INACTIVE', updated_at: AGORA };
  const C1editado = { ...C1, name: 'Curado 1 (editado)', updated_at: AGORA };
  const L1desativado = { ...L1, status: 'INACTIVE', updated_at: AGORA };
  const L2reativado = { ...L2dup, status: 'ACTIVE', updated_at: AGORA };
  const obsoleto = listado('velho', { name: 'Item que o sistema não traz mais' });
  // C2 foi excluido quando ainda dava para excluir curado.
  const atual = [U2, U1, C1editado, L1desativado, L2reativado, L3, obsoleto];
  const restaurada = restaurarItensDoSistema(atual, SISTEMA);

  check(restaurada[0] === U2 && restaurada[1] === U1,
    'os itens criados pelo usuário ficam intocados, pela referência, na ordem em que estavam e no topo');
  check(restaurada.find((i) => i.id === U2.id).status === 'INACTIVE', 'item do usuário desativado continua desativado');
  check(restaurada.find((i) => i.id === C1.id) === C1, 'a edição feita no curado é desfeita: volta a versão do código');
  check(restaurada.find((i) => i.id === L1.id) === L1 && itemAtivo(restaurada.find((i) => i.id === L1.id)),
    'a desativação feita no item da listagem é desfeita');
  check(restaurada.find((i) => i.id === C2.id) === C2, 'o curado excluído volta');
  check(restaurada.find((i) => i.id === L2.id) === L2dup && !itemAtivo(restaurada.find((i) => i.id === L2.id)),
    'o item que o código traz inativo por repetir um curado volta inativo, mesmo reativado pelo usuário');
  check(!ids(restaurada).includes(obsoleto.id), 'item do sistema que o código não traz mais sai');
  check(restaurada.length === 2 + SISTEMA.length && new Set(ids(restaurada)).size === restaurada.length,
    'sem duplicar: os do usuário mais os do sistema, ids únicos');
  const semMarca = { ...C1editado, is_system_default: false, catalog_source: undefined };
  check(restaurarItensDoSistema([semMarca], SISTEMA).filter((i) => i.id === C1.id).length === 1,
    'item gravado com id do sistema, mesmo sem a marca, é trocado pelo do sistema: não fica em dobro');
  const jaRestaurada = restaurarItensDoSistema(restaurada, SISTEMA);
  check(jaRestaurada === restaurada, 'nada a restaurar devolve a mesma lista');
  check(fundirItensDaListagem(restaurada, SISTEMA) === restaurada,
    'depois de restaurar, a fusão da carga não muda nada: os itens do sistema já são os do código');

  const ini = Array.isArray(INITIAL_OCCUPATIONAL_RISKS_CATALOG) ? INITIAL_OCCUPATIONAL_RISKS_CATALOG : [];
  const real = restaurarItensDoSistema([U1, ...ini.slice(1).map((i) => ({ ...i, status: 'INACTIVE', updated_at: AGORA }))], ini);
  check(real[0] === U1 && real.length === ini.length + 1 && real.slice(1).every((item, i) => item === ini[i]),
    `com o catálogo real: o do usuário fica e os ${ini.length} do sistema voltam exatamente como o código os traz`);

  const restaurar = corpoDe(ctxFonte, 'const resetOccupationalRisksCatalogToDefault = useCallback(');
  check(/setOccupationalRisksCatalog\(prev => restaurarItensDoSistema\(prev, INITIAL_OCCUPATIONAL_RISKS_CATALOG\)\)/.test(restaurar),
    'o contexto restaura pelo restaurarItensDoSistema, sobre o catálogo em memória');
  check(!/setOccupationalRisksCatalog\(\s*INITIAL_OCCUPATIONAL_RISKS_CATALOG\s*\)/.test(ctxFonte),
    'nenhum ponto do contexto troca o catálogo inteiro pelo inicial (o que apagava os itens do usuário)');

  const telaRestaurar = corpoDe(viewFonte, 'const handleRestaurarPadrao = () => {');
  const textoDaConfirmacao = (telaRestaurar.match(/confirm\(([\s\S]*?)\);\n/) || [])[1] || '';
  check(/criado\(s\) aqui não mudam/.test(textoDaConfirmacao) && !/removid|apagad/i.test(textoDaConfirmacao),
    'a confirmação diz que os itens criados aqui não mudam, e não promete removê-los');
  check(/edições e desativações/.test(textoDaConfirmacao) && /excluídos voltam/.test(textoDaConfirmacao)
    && /repetem um curado continuam inativos/.test(textoDaConfirmacao),
  'e diz o que muda nos do sistema: edições e desativações desfeitas, curado excluído de volta, repetido inativo');
  check(/resetOccupationalRisksCatalogToDefault\(\)/.test(telaRestaurar), 'e só restaura depois da confirmação');
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
  const antiga = fundirItensDaListagem(curadosIni, lst);
  check(mesmoConjunto(ids(antiga), ids(ini)), 'organização com só os curados fica, depois da fusão, com o catálogo inicial inteiro');
  check(fundirItensDaListagem(ini, lst) === ini, 'o catálogo inicial já fundido não muda');

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
  const editadosNoCodigo = lst.filter((i) => !itemNuncaEditado(i));
  check(editadosNoCodigo.length === 0,
    `todo item da listagem do código nasce com created_at === updated_at, e a fusão pode levar a correção seguinte${editadosNoCodigo.length ? `: ${ids(editadosNoCodigo).slice(0, 3).join(', ')}` : ''}`);
  // Quem gravou a listagem antes das correcoes: tudo ativo, sem o curado que
  // repete e com as datas iguais. Depois da fusao, tem a versao do codigo.
  const gravadaAntes = [...ini.filter((i) => !ehItemDaListagem(i)), ...lst.map((i) => {
    const antes = { ...i, status: 'ACTIVE' };
    delete antes.duplicate_of_id;
    return comoJsonb(antes);
  })];
  const atualizada = fundirItensDaListagem(gravadaAntes, lst);
  const mesmoConteudo = (a, b) => JSON.stringify(comoJsonb(a)) === JSON.stringify(comoJsonb(b));
  check(atualizada.length === ini.length
    && atualizada.every((item, i) => (ehItemDaListagem(item) ? mesmoConteudo(item, ini[i]) : item === gravadaAntes[i])),
  `quem gravou a listagem antes das correções fica com a versão do código dos ${lst.length} itens, e os curados ficam`);
  check(fundirItensDaListagem(atualizada, lst) === atualizada, 'e a carga seguinte não muda mais nada');
  const repetidos = lst.filter((i) => i.duplicate_of_id);
  check(repetidos.every((i) => !itemAtivo(atualizada.find((a) => a.id === i.id))),
    `os ${repetidos.length} itens que repetem um curado chegam inativos a quem os tinha ativos`);
  const semCurado = repetidos.filter((i) => !/^Mesmo risco que «.+»$/.test(textoDaDuplicidade(i, (id) => ini.find((x) => x.id === id)) || ''));
  check(semCurado.length === 0,
    `todo item repetido acha o curado no catálogo inicial e mostra o nome dele${semCurado.length ? `: ${ids(semCurado).slice(0, 3).join(', ')}` : ''}`);

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
// 7. CLASSIFICACAO E ENQUADRAMENTO NO FORMULARIO E NA FICHA
// ===========================================================================
console.log('\n— classificação no formulário: "não informado" não grava nada');
{
  const CAMPOS = Object.keys(CLASSIFICACAO_NAO_INFORMADA);
  const ini = Array.isArray(INITIAL_OCCUPATIONAL_RISKS_CATALOG) ? INITIAL_OCCUPATIONAL_RISKS_CATALOG : [];
  const R01 = ini.find((i) => i.id === 'risk-cat-01');
  check(CAMPOS.length === 9 && CAMPOS.every((c) => CLASSIFICACAO_NAO_INFORMADA[c] === ''),
    'os nove campos de classificação começam em "Não informado"');
  const vazios = valoresDaClassificacao(CLASSIFICACAO_NAO_INFORMADA);
  check(CAMPOS.every((c) => vazios[c] === undefined),
    'formulário em "Não informado" não grava nada: nem severidade 3, nem GFIP 00, nem false');

  const preenchido = valoresDaClassificacao({ ...CLASSIFICACAO_NAO_INFORMADA, default_severity: '4', default_probability: '2',
    gfip_code_suggested: '00', special_retirement_eligible: 'NAO', insalubridade_applicable: 'SIM',
    insalubridade_degree_suggested: '40%', insalubridade_legal_basis: '  NR-15 Anexo nº 13  ', periculosidade_applicable: 'NAO' });
  check(preenchido.default_severity === 4 && preenchido.default_probability === 2 && preenchido.gfip_code_suggested === '00'
    && preenchido.special_retirement_eligible === false && preenchido.insalubridade_applicable === true
    && preenchido.insalubridade_degree_suggested === '40%' && preenchido.insalubridade_legal_basis === 'NR-15 Anexo nº 13'
    && preenchido.periculosidade_applicable === false,
  'o que o usuário escolhe é gravado como escolheu: 4, 2, "00", "Não", "Sim", 40%, base sem espaços');
  const naoSeAplica = valoresDaClassificacao({ ...CLASSIFICACAO_NAO_INFORMADA, insalubridade_applicable: 'NAO',
    insalubridade_degree_suggested: '20%', insalubridade_legal_basis: 'NR-15', periculosidade_applicable: 'NAO', periculosidade_legal_basis: 'NR-16' });
  check(naoSeAplica.insalubridade_applicable === false && naoSeAplica.insalubridade_degree_suggested === undefined
    && naoSeAplica.insalubridade_legal_basis === undefined && naoSeAplica.periculosidade_legal_basis === undefined,
  'insalubridade e periculosidade marcadas "Não" não levam grau nem base legal');
  const grauSemAplica = valoresDaClassificacao({ ...CLASSIFICACAO_NAO_INFORMADA, insalubridade_degree_suggested: '20%' });
  check(grauSemAplica.insalubridade_degree_suggested === '20%' && grauSemAplica.insalubridade_applicable === undefined,
    'com o "aplica?" não informado, o grau que o item traz fica: "não informado" não apaga');

  check(CAMPOS.every((c) => classificacaoParaFormulario(L1)[c] === ''), 'item da listagem abre o formulário todo em "Não informado"');
  const doR01 = classificacaoParaFormulario(R01);
  check(doR01.default_severity === '3' && doR01.gfip_code_suggested === '04' && doR01.special_retirement_eligible === 'SIM'
    && doR01.insalubridade_degree_suggested === '20%' && doR01.periculosidade_applicable === 'NAO',
  'o curado abre com o que tem gravado (Ruído: S3, GFIP 04, aposentadoria Sim, 20%, periculosidade Não)');
  const foraDoDominio = { ...L1, default_severity: 0, default_probability: '3', gfip_code_suggested: '09', insalubridade_degree_suggested: '15%' };
  const formFora = classificacaoParaFormulario(foraDoDominio);
  check(formFora.default_severity === '' && formFora.default_probability === '' && formFora.gfip_code_suggested === ''
    && formFora.insalubridade_degree_suggested === '', 'valor gravado fora do domínio abre como "Não informado"');
  const perdidos = ini.filter((item) => {
    const v = valoresDaClassificacao(classificacaoParaFormulario(item));
    return CAMPOS.some((c) => (v[c] ?? null) !== (item[c] === '' ? null : item[c] ?? null));
  });
  check(perdidos.length === 0,
    `abrir e salvar sem mexer devolve a classificação de todos os ${ini.length} itens do catálogo inicial${perdidos.length ? `: ${ids(perdidos).slice(0, 3).join(', ')}` : ''}`);

  // Edicao: so o que o usuario mudou.
  const abrir = (item) => classificacaoParaFormulario(item);
  check(Object.keys(mudancasDaClassificacao(R01, abrir(R01), abrir(R01))).length === 0, 'edição sem mudar a classificação não grava nenhum campo dela');
  check(Object.keys(mudancasDaClassificacao(foraDoDominio, abrir(foraDoDominio), abrir(foraDoDominio))).length === 0,
    'e não apaga o valor gravado que o formulário não sabe mostrar');
  const soSeveridade = mudancasDaClassificacao(R01, abrir(R01), { ...abrir(R01), default_severity: '4' });
  check(JSON.stringify(soSeveridade) === JSON.stringify({ default_severity: 4 }), 'mudar a severidade grava só a severidade');
  const limpou = mudancasDaClassificacao(R01, abrir(R01), { ...abrir(R01), gfip_code_suggested: '' });
  check(Object.keys(limpou).join() === 'gfip_code_suggested' && limpou.gfip_code_suggested === undefined,
    'voltar o GFIP a "Não informado" tira o valor do item, sem pôr "00" no lugar');
  const tirouInsalubridade = mudancasDaClassificacao(R01, abrir(R01), { ...abrir(R01), insalubridade_applicable: 'NAO' });
  check(tirouInsalubridade.insalubridade_applicable === false && 'insalubridade_degree_suggested' in tirouInsalubridade
    && tirouInsalubridade.insalubridade_degree_suggested === undefined && tirouInsalubridade.insalubridade_legal_basis === undefined
    && Object.keys(tirouInsalubridade).length === 3,
  'marcar insalubridade "Não" regrava o grau e a base com ela (saem), e nada mais');
  const naListagem = mudancasDaClassificacao(L1, abrir(L1), { ...abrir(L1), gfip_code_suggested: '04', special_retirement_eligible: 'SIM' });
  check(JSON.stringify(naListagem) === JSON.stringify({ gfip_code_suggested: '04', special_retirement_eligible: true }),
    'no item da listagem, escolher GFIP e aposentadoria grava só os dois');
  const vaiEVolta = mudancasDaClassificacao(R01, abrir(R01), { ...abrir(R01), insalubridade_applicable: 'SIM' });
  check(Object.keys(vaiEVolta).length === 0, 'marcar e desmarcar até voltar ao que estava não grava nada');

  // GFIP x aposentadoria especial, pelos rotulos do proprio GFIP.
  check(!!conflitoGfipAposentadoria({ gfip_code_suggested: '04', special_retirement_eligible: false })
    && !!conflitoGfipAposentadoria({ gfip_code_suggested: '01', special_retirement_eligible: true })
    && !!conflitoGfipAposentadoria({ gfip_code_suggested: '00', special_retirement_eligible: true }),
  'GFIP que enseja com aposentadoria "Não", ou 00/01 com "Sim": contradição apontada');
  check(conflitoGfipAposentadoria({ gfip_code_suggested: '04', special_retirement_eligible: true }) === null
    && conflitoGfipAposentadoria({ gfip_code_suggested: '04' }) === null
    && conflitoGfipAposentadoria({ special_retirement_eligible: false }) === null,
  'GFIP e aposentadoria coerentes, ou um deles não informado: sem contradição');
  const contraditorios = ini.filter((i) => conflitoGfipAposentadoria(i));
  check(contraditorios.length === 0, `nenhum item do catálogo inicial se contradiz${contraditorios.length ? `: ${ids(contraditorios).join(', ')}` : ''}`);

  // Rotulos reaproveitados, e nao inventados.
  const abaGhe = ler('components/sst/GHERiskInventoryTab.tsx');
  const semRotulo = OPCOES_DE_GFIP.filter((o) => !abaGhe.includes(`<option value="${o.valor}">${o.rotulo}</option>`));
  check(OPCOES_DE_GFIP.length === 5 && semRotulo.length === 0,
    `os rótulos de GFIP 00 a 04 são os do formulário de risco do GHE${semRotulo.length ? `: ${semRotulo.map((o) => o.valor).join(', ')}` : ''}`);
  const laudo = ler('lib/laudoDados.ts');
  check(GRAUS_DE_INSALUBRIDADE.length === 3
    && GRAUS_DE_INSALUBRIDADE.every((g) => laudo.includes(g.rotulo.replace(/^Grau /, '')) && g.rotulo.includes(`(${g.valor})`)),
  'os graus 10%, 20% e 40% com os nomes que o laudo de insalubridade usa');

  // Ficha: so o que o item tem.
  check(enquadramentoDoItem(L1).length === 0, 'item da listagem sem classificação: a ficha não ganha nenhuma linha');
  const ficha = enquadramentoDoItem(R01);
  const linha = (rotulo) => ficha.find((l) => l.rotulo === rotulo);
  check(linha('Classificação sugerida')?.valor === `S3 × P3 = 9 · ${classificarRisco(3, 3).rotulo}`,
    'a ficha do curado mostra a classificação pela matriz do modelo');
  check(linha('GFIP sugerido')?.valor === OPCOES_DE_GFIP.find((o) => o.valor === '04').rotulo
    && linha('Aposentadoria especial')?.valor === 'Sim', 'e o GFIP com o rótulo do formulário, e a aposentadoria especial');
  check(linha('Insalubridade')?.valor === 'Sim · Grau médio (20%)' && /NR-15/.test(linha('Insalubridade')?.detalhe || '')
    && linha('Periculosidade')?.valor === 'Não', 'e a insalubridade com grau e base legal, e a periculosidade');
  check(enquadramentoDoItem({ ...L1, default_severity: 2 }).map((l) => l.valor).join() === 'S2 (sem probabilidade)',
    'só a severidade: aparece, sem classificação inventada');
  const fichas = ini.flatMap((i) => enquadramentoDoItem(i));
  check(fichas.every((l) => l.valor && !FACHADA.test(l.valor) && !FACHADA.test(l.detalhe || '')),
    'nenhuma linha da ficha fica vazia ou com "undefined"');

  // A tela: o formulario e a ficha usam as funcoes, e nada de padrao fixo.
  const corpoDoSalvar = corpoDe(viewFonte, 'const handleSaveRisk = (e: React.FormEvent) => {');
  const criacao = (corpoDoSalvar.match(/if \(!editingItem\) \{([\s\S]*?)\n    \}\n/) || [])[1] || '';
  const preenchidos = (criacao.match(/const preenchidos[^=]*= \{([\s\S]*?)\n      \};/) || [])[1] || '';
  const novo = (criacao.match(/const novo[^=]*= \{([\s\S]*?)\n      \};/) || [])[1] || '';
  check(/\.\.\.valoresClassificacao/.test(preenchidos) && /if \(valor !== undefined\)/.test(criacao) && !/valoresClassificacao|default_|gfip|insalubridade|periculosidade|special_retirement/.test(novo),
    'item novo leva a classificação só pelo filtro do que foi preenchido');
  check(/const valoresClassificacao = valoresDaClassificacao\(form\)/.test(corpoDoSalvar)
    && /mudancasDaClassificacao\(editingItem, formInicial, form\)/.test(corpoDoSalvar)
    && /Object\.assign\(mudancas, mudancasClassificacao\)/.test(corpoDoSalvar),
  'a edição grava da classificação só o que mudou, pelo mudancasDaClassificacao');
  check(/conflitoGfipAposentadoria\(/.test(corpoDoSalvar) && /if \(conflito\) \{\s*alert\(conflito\);\s*return;/.test(corpoDoSalvar),
    'GFIP e aposentadoria contraditórios não são salvos');
  // No item (3, '00', false) e no formulario ('3', 'NAO'): as duas formas do padrao fixo.
  check(!/(default_severity|default_probability)\s*:\s*'?\d/.test(viewFonte) && !/gfip_code_suggested\s*:\s*'0/.test(viewFonte)
    && !/(special_retirement_eligible|insalubridade_applicable|periculosidade_applicable)\s*:\s*(true|false|'SIM'|'NAO')/.test(viewFonte)
    && !/insalubridade_degree_suggested\s*:\s*'\d/.test(viewFonte),
  'a tela não tem severidade, probabilidade, GFIP nem enquadramento fixos, nem no item nem no formulário');
  check(/FORMULARIO_VAZIO: FormularioDoRisco = \{[^}]*?\.\.\.CLASSIFICACAO_NAO_INFORMADA\s*\};/.test(viewFonte),
    'o formulário vazio começa com a classificação em "Não informado"');
  check(/\.\.\.classificacaoParaFormulario\(item\)/.test(viewFonte), 'a edição abre com a classificação gravada no item');
  const semControle = CAMPOS.filter((c) => !new RegExp(`value=\\{(form\\.[a-z_]+ === 'NAO' \\? '' : )?form\\.${c}\\}`).test(viewFonte));
  check(semControle.length === 0, `cada campo de classificação tem controle no formulário${semControle.length ? `: falta ${semControle.join(', ')}` : ''}`);
  const naoInformado = (viewFonte.match(/<option value="">Não informado<\/option>/g) || []).length;
  check(naoInformado >= 7, `as sete listas da classificação começam em "Não informado" (${naoInformado})`);
  check(/const enquadramento = enquadramentoDoItem\(item\)/.test(viewFonte) && /\{enquadramento\.map\(/.test(viewFonte),
    'a ficha do item mostra a classificação e o enquadramento que ele tem');
}

// ===========================================================================
// 8. ITEM DA LISTAGEM QUE REPETE UM CURADO
// ===========================================================================
console.log('\n— item que repete um curado');
{
  const repetido = { ...L1, status: 'INACTIVE', duplicate_of_id: C1.id };
  const achar = (lista) => (id) => lista.find((i) => i.id === id);
  check(textoDaDuplicidade(repetido, achar([C1, repetido])) === `Mesmo risco que «${C1.name}»`, 'com o curado na lista: "Mesmo risco que «nome do curado»"');
  check(textoDaDuplicidade(repetido, achar([repetido])) === 'Repete um item curado', 'sem o curado na lista: "Repete um item curado"');
  check(textoDaDuplicidade(L1, achar([C1, L1])) === null && textoDaDuplicidade({ ...L1, duplicate_of_id: '  ' }, achar([C1])) === null,
    'item que não repete nada: nenhum aviso');
  check(/const duplicidade = textoDaDuplicidade\(item, id => itemPorId\.get\(id\)\)/.test(viewFonte) && /\{duplicidade &&/.test(viewFonte)
    && /\{duplicidade\}/.test(viewFonte), 'a ficha mostra o aviso, achando o curado pelo id no catálogo');
  check(/const itemPorId = useMemo\(\(\) => new Map\(catalogo\.map\(item => \[item\.id, item\]\)\), \[catalogo\]\)/.test(viewFonte),
    'o curado é achado num mapa montado uma vez por catálogo, e não numa busca por cartão');
}

// ===========================================================================
console.log(`\n${casos - falhas}/${casos} casos OK`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S)`);
  process.exit(1);
}
console.log('Catálogo: a listagem entra sem sobrescrever nem ressuscitar, item do sistema se desativa, e o risco aplicado não ganha classificação inventada.');
