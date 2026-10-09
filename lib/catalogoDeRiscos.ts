/**
 * Regras do catalogo de riscos que valem fora da tela do catalogo: a fusao da
 * listagem no carregamento, a exclusao que vira desativacao, a restauracao do
 * padrao, a busca do seletor do inventario e o que um item do catalogo leva
 * ao risco do GHE. E as da classificacao do item na tela, que o verificador
 * prova sem montar o React.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * O catalogo passou de 25 itens curados para cerca de 935, com a listagem de
 * riscos do usuario (lib/catalogoDeRiscosDaListagem.ts). Ele e colecao
 * sincronizada - cada item e uma linha em prevsafe_records - e a organizacao
 * que ja usava o sistema tem os 25 gravados no servidor e no cache. O
 * carregamento entrega o que esta gravado, entao os itens novos nunca
 * apareceriam para ela. A fusao os acrescenta.
 *
 * E pela mesma razao uma correcao do sistema num item da listagem (limite da
 * NR-15, grau de insalubridade, item desativado por repetir um curado) nunca
 * chegaria a quem ja gravou o catalogo. Por isso a fusao tambem troca pela
 * versao do codigo o item da listagem que o usuario nunca editou - e so ele.
 *
 * Fusao e exclusao andam juntas: se um item do sistema pudesse ser excluido, a
 * fusao o traria de volta no carregamento seguinte. Por isso item do sistema
 * se DESATIVA, e so o criado pelo usuario se exclui de fato.
 *
 * E os itens da listagem chegam so com o que a listagem traz: sem fonte
 * geradora, efeito a saude, EPC, severidade ou probabilidade. O risco aplicado
 * a partir deles nasce com esses campos vazios - o inventario mostra "nao
 * classificado" e o PGR aponta a pendencia - em vez de um valor que ninguem
 * avaliou.
 */
import type { OccupationalRiskCatalogItem, SSTEnvironmentalRisk } from '@/types';
import { classificarRisco } from '@/lib/classificacaoDeRisco';

type Item = OccupationalRiskCatalogItem;

const texto = (v: unknown): string => String(v ?? '').trim();

// ---------------------------------------------------------------------------
// Origem e estado do item
// ---------------------------------------------------------------------------

/** Prefixo dos ids gerados para os itens da listagem. */
export const PREFIXO_DA_LISTAGEM = 'risk-lst-';

/**
 * Veio com o sistema - curado ou da listagem - e nao de um cadastro do
 * usuario. A origem tambem conta, e nao so a marca: um item da listagem que
 * perdesse `is_system_default` numa edicao passaria a ser excluivel, e a fusao
 * o traria de volta.
 */
export function ehItemDoSistema(item: Partial<Item> | null | undefined): boolean {
  if (!item) return false;
  return item.is_system_default === true
    || item.catalog_source === 'CURADO'
    || item.catalog_source === 'LISTAGEM';
}

/** Item importado da listagem do usuario. */
export function ehItemDaListagem(item: Partial<Item> | null | undefined): boolean {
  if (!item?.id) return false;
  if (item.catalog_source) return item.catalog_source === 'LISTAGEM';
  return String(item.id).startsWith(PREFIXO_DA_LISTAGEM);
}

/** Pode aparecer no seletor e ser aplicado. Sem status gravado (versao antiga), esta ativo. */
export function itemAtivo(item: Partial<Item> | null | undefined): boolean {
  return !!item && item.status !== 'INACTIVE';
}

// ---------------------------------------------------------------------------
// Fusao no carregamento
// ---------------------------------------------------------------------------

/**
 * O item gravado nunca foi editado: tem as duas datas, e elas sao iguais. O
 * gerador da listagem grava created_at === updated_at, e toda alteracao pela
 * tela - inclusive desativar e reativar - passa por atualizarItemDoCatalogo
 * ou excluirOuDesativarItem, que mudam updated_at. Sem as datas nao da para
 * saber, e na duvida o item gravado fica: sobrescrever a edicao do usuario e
 * pior que deixar de receber uma correcao.
 */
export function itemNuncaEditado(item: Partial<Item> | null | undefined): boolean {
  const criado = texto(item?.created_at);
  return !!criado && criado === texto(item?.updated_at);
}

/**
 * O item como o servidor o devolve: chaves em ordem e sem as de valor
 * undefined. O jsonb do Postgres reordena as chaves e o JSON descarta
 * undefined; comparar o JSON.stringify direto acharia diferenca em todo item
 * da listagem a cada carga, e a fusao os trocaria - e os reenviaria - sempre.
 */
function conteudoCanonico(v: unknown): string {
  return JSON.stringify(v, (_chave, valor) => {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return valor;
    const ordenado: Record<string, unknown> = {};
    for (const k of Object.keys(valor).sort()) ordenado[k] = (valor as Record<string, unknown>)[k];
    return ordenado;
  });
}

/**
 * O catalogo carregado, com a listagem do codigo fundida nele.
 *
 *  - Item da listagem que falta entra no fim.
 *  - Item da listagem que o usuario nunca editou (itemNuncaEditado) e trocado
 *    pela versao do codigo, no mesmo lugar: e assim que a correcao de um
 *    limite ou o item desativado por repetir um curado chegam a quem ja tinha
 *    o catalogo gravado.
 *  - Item editado fica como esta: a edicao do usuario vence, e a desativacao
 *    e a reativacao tambem.
 *  - So itens da listagem, dos dois lados. Curado nao e trocado nem volta: se
 *    falta, e porque o usuario o excluiu quando ainda dava para excluir, e foi
 *    de proposito. Por isso a origem e conferida aqui, e nao so no chamador.
 *  - Nada a mudar devolve a MESMA lista, e fundir o resultado de novo nao muda
 *    nada: o item trocado fica igual ao do codigo, e igual nao se troca.
 */
export function fundirItensDaListagem(carregado: Item[], listagem: Item[]): Item[] {
  const lista = Array.isArray(carregado) ? carregado : [];
  const doCodigo = new Map<string, Item>();
  for (const item of Array.isArray(listagem) ? listagem : []) {
    if (!ehItemDaListagem(item)) continue;
    const id = String(item.id);
    // Id repetido na propria listagem entra uma vez so.
    if (!doCodigo.has(id)) doCodigo.set(id, item);
  }

  const presentes = new Set<string>();
  let trocou = false;
  const fundida = lista.map((gravado) => {
    const id = String(gravado?.id ?? '');
    presentes.add(id);
    const atual = doCodigo.get(id);
    if (!atual || atual === gravado) return gravado;
    if (!ehItemDaListagem(gravado) || !itemNuncaEditado(gravado)) return gravado;
    if (conteudoCanonico(gravado) === conteudoCanonico(atual)) return gravado;
    trocou = true;
    return atual;
  });

  const faltam = [...doCodigo.values()].filter((item) => !presentes.has(String(item.id)));
  if (!trocou && faltam.length === 0) return lista;
  return [...(trocou ? fundida : lista), ...faltam];
}

/**
 * A fusao no carregamento, com a semantica de `list()` do contexto
 * (applySnapshot): `undefined` e "nao mexer no que esta em memoria" e continua
 * `undefined`. Fundir um `[]` no lugar dele trocaria o catalogo inteiro da
 * tela so pela listagem - o cache vazio ou ausente apagaria os curados e os do
 * usuario.
 */
export function catalogoAoCarregar(carregado: Item[] | undefined, listagem: Item[]): Item[] | undefined {
  return carregado === undefined ? undefined : fundirItensDaListagem(carregado, listagem);
}

/**
 * "Restaurar padrao": os itens do sistema voltam a versao do codigo, e os
 * criados pelo usuario ficam como estao. Trocava o catalogo inteiro pelo
 * inicial, e um clique apagava todos os itens criados pelo usuario.
 *
 *  - Item do sistema volta como o codigo o traz: edicoes e desativacoes feitas
 *    na tela se desfazem, o curado excluido (quando ainda dava para excluir)
 *    volta, e o item da listagem que repete um curado continua inativo, porque
 *    e assim que o codigo o traz.
 *  - Item do usuario fica intocado, na ordem em que estava, antes dos do
 *    sistema - o item novo entra no topo da lista, e continua la.
 *  - Item do sistema que o codigo nao traz mais sai: a restauracao e para o
 *    padrao de hoje, como ja era ao trocar pelo catalogo inicial.
 *  - Id do sistema e do sistema, mesmo num item gravado sem a marca: se o
 *    item ficasse como "do usuario", haveria dois itens com o mesmo id.
 *  - Nada a mudar devolve a MESMA lista.
 */
export function restaurarItensDoSistema(atual: Item[], sistema: Item[]): Item[] {
  const lista = Array.isArray(atual) ? atual : [];
  const padrao: Item[] = [];
  const idsDoSistema = new Set<string>();
  for (const item of Array.isArray(sistema) ? sistema : []) {
    const id = String(item?.id ?? '');
    if (!id || idsDoSistema.has(id)) continue;
    idsDoSistema.add(id);
    padrao.push(item);
  }
  const doUsuario = lista.filter((item) => !ehItemDoSistema(item) && !idsDoSistema.has(String(item?.id ?? '')));
  const restaurada = [...doUsuario, ...padrao];
  const igual = restaurada.length === lista.length && restaurada.every((item, i) => item === lista[i]);
  return igual ? lista : restaurada;
}

/**
 * O aviso do item da listagem que repete um curado. Sem o curado na lista
 * (excluido quando ainda dava para excluir), nao ha nome a mostrar - e um id
 * na tela nao diria nada a ninguem.
 */
export function textoDaDuplicidade(
  item: Partial<Item> | null | undefined,
  acharItem: (id: string) => Partial<Item> | null | undefined
): string | null {
  const id = texto(item?.duplicate_of_id);
  if (!id) return null;
  const nome = texto(acharItem(id)?.name);
  return nome ? `Mesmo risco que «${nome}»` : 'Repete um item curado';
}

// ---------------------------------------------------------------------------
// Inclusao, alteracao e exclusao
// ---------------------------------------------------------------------------

/**
 * Item novo pela tela e sempre do usuario. Copiado de um item do sistema para
 * personaliza-lo, levaria junto a marca e a origem, e o item do usuario so
 * poderia ser desativado, nunca excluido.
 */
export function itemNovoDoUsuario(
  data: Omit<Item, 'id' | 'created_at' | 'updated_at'>,
  id: string,
  agora: string
): Item {
  const novo: Item = { ...(data as Item), is_system_default: false, id, created_at: agora, updated_at: agora };
  delete novo.catalog_source;
  return novo;
}

/**
 * Aplica a alteracao sem mexer no que identifica o item: id, origem e marca do
 * sistema. Um item do sistema que deixasse de se-lo pela edicao poderia ser
 * excluido, e a fusao o recriaria por cima da exclusao.
 */
export function atualizarItemDoCatalogo(lista: Item[], id: string, alteracao: Partial<Item>, agora: string): Item[] {
  return lista.map((item) => {
    if (item?.id !== id) return item;
    const atualizado: Item = { ...item, ...alteracao, id: item.id, created_at: item.created_at, updated_at: agora };
    if ('is_system_default' in item) atualizado.is_system_default = item.is_system_default;
    else delete atualizado.is_system_default;
    if ('catalog_source' in item) atualizado.catalog_source = item.catalog_source;
    else delete atualizado.catalog_source;
    return atualizado;
  });
}

/**
 * Exclui o item do usuario; o do sistema e desativado (status INACTIVE). Item
 * desativado sai do seletor e da aplicacao, mas continua na colecao: e isso
 * que impede a fusao de recria-lo, e permite reativa-lo depois.
 */
export function excluirOuDesativarItem(lista: Item[], id: string, agora: string): Item[] {
  const alvo = lista.find((item) => item?.id === id);
  if (!alvo) return lista;
  if (!ehItemDoSistema(alvo)) return lista.filter((item) => item?.id !== id);
  if (alvo.status === 'INACTIVE') return lista;
  return lista.map((item) => (item?.id === id ? { ...item, status: 'INACTIVE' as const, updated_at: agora } : item));
}

// ---------------------------------------------------------------------------
// Busca do seletor do inventario
// ---------------------------------------------------------------------------

/** Quantos itens o seletor desenha de uma vez. O resto pede busca mais precisa. */
export const LIMITE_DO_SELETOR = 50;

export type GrupoDoSeletor = 'FISICO' | 'QUIMICO' | 'BIOLOGICO' | 'ERGONOMICO' | 'ACIDENTE' | 'AUSENCIA';

export const GRUPOS_DO_SELETOR: Array<{ chave: GrupoDoSeletor; rotulo: string }> = [
  { chave: 'FISICO', rotulo: 'Físicos (Grupo 1)' },
  { chave: 'QUIMICO', rotulo: 'Químicos (Grupo 2)' },
  { chave: 'BIOLOGICO', rotulo: 'Biológicos (Grupo 3)' },
  { chave: 'ERGONOMICO', rotulo: 'Ergonômicos (Grupo 4)' },
  { chave: 'ACIDENTE', rotulo: 'Acidentes (Grupo 5)' },
  { chave: 'AUSENCIA', rotulo: 'Ausência de fator de risco' }
];

/** Minusculas, sem acento e com um espaco so entre as palavras. */
export function normalizarParaBusca(v: unknown): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * O grupo do item, com e sem acento e no singular ou no plural. O filtro da
 * tela comparava o texto exato: a opcao "ACIDENTE" nunca casava com o grupo
 * "ACIDENTES", e o grupo gravado sem acento sumia de todos os filtros.
 */
export function grupoDoItem(grupo: unknown): GrupoDoSeletor | null {
  const g = normalizarParaBusca(grupo);
  if (g.startsWith('fisic')) return 'FISICO';
  if (g.startsWith('quimic')) return 'QUIMICO';
  if (g.startsWith('biolog')) return 'BIOLOGICO';
  if (g.startsWith('ergonom')) return 'ERGONOMICO';
  if (g.startsWith('acident')) return 'ACIDENTE';
  if (g.startsWith('ausencia')) return 'AUSENCIA';
  return null;
}

export interface EntradaDoSeletor {
  item: Item;
  grupo: GrupoDoSeletor | null;
  /** Nome normalizado. */
  nome: string;
  /** Nome, codigo como escrito e codigo so com os digitos. */
  texto: string;
}

/**
 * O indice do seletor: so itens ativos, com o texto de busca ja normalizado.
 * Monta-se uma vez por catalogo, e nao a cada tecla.
 */
export function indiceDoSeletor(catalogo: Item[]): EntradaDoSeletor[] {
  return (Array.isArray(catalogo) ? catalogo : []).filter(itemAtivo).map((item) => {
    const nome = normalizarParaBusca(item.name);
    const codigo = texto(item.code_table_24).toLowerCase();
    return {
      item,
      grupo: grupoDoItem(item.group),
      nome,
      texto: [nome, codigo, codigo.replace(/\D/g, '')].filter(Boolean).join(' ')
    };
  });
}

/**
 * Itens do indice que casam com o termo e o grupo. Cada palavra do termo tem
 * de aparecer no nome ou no codigo ("acido sulf" acha "Ácido sulfúrico";
 * "01.18" e "0118" acham 01.18.001). Nome que comeca pelo termo vem primeiro;
 * o resto, na ordem do catalogo.
 */
export function buscarNoSeletor(
  indice: EntradaDoSeletor[],
  termo: string,
  grupo: GrupoDoSeletor | 'ALL'
): Item[] {
  const t = normalizarParaBusca(termo);
  const palavras = t ? t.split(' ') : [];
  const achados = indice.filter((e) =>
    (grupo === 'ALL' || e.grupo === grupo) && palavras.every((p) => e.texto.includes(p)));
  if (!t) return achados.map((e) => e.item);
  const primeiro = achados.filter((e) => e.nome.startsWith(t));
  const depois = achados.filter((e) => !e.nome.startsWith(t));
  return [...primeiro, ...depois].map((e) => e.item);
}

// ---------------------------------------------------------------------------
// Do catalogo ao inventario
// ---------------------------------------------------------------------------

type Gradacao = 1 | 2 | 3 | 4 | 5;

/** 1 a 5, ou nada. Nunca um valor medio no lugar do que falta. */
const gradacaoOuNada = (v: unknown): Gradacao | undefined =>
  v === 1 || v === 2 || v === 3 || v === 4 || v === 5 ? v : undefined;

/** O que o item do catalogo leva ao risco; o resto (ids, GHE, EPC, datas) e de quem aplica. */
export type CamposDoCatalogoNoRisco = Pick<SSTEnvironmentalRisk,
  | 'risk_category' | 'agent_name' | 'risk_code_table_24' | 'generating_source' | 'propagation_path'
  | 'health_effects' | 'evaluation_type' | 'measured_value' | 'severity' | 'probability' | 'risk_level'
  | 'epi_required' | 'epis' | 'special_retirement_applies' | 'gfip_code' | 'ltcat_technical_conclusion'
  | 'insalubridade_applies' | 'periculosidade_applies'
> & Partial<Pick<SSTEnvironmentalRisk,
  | 'measurement_unit' | 'tolerance_limit' | 'action_level' | 'insalubridade_degree'
  | 'insalubridade_legal_basis' | 'periculosidade_legal_basis'
>>;

/**
 * Os campos do risco do inventario que vem do item do catalogo.
 *
 * Campo que o item nao tem fica vazio no risco. Severidade, probabilidade e
 * nivel so existem quando ha gradacao de 1 a 5 (do ajuste de quem aplica, ou
 * a padrao do item curado); sem elas o risco nasce "nao classificado" e o PGR
 * aponta a pendencia, porque a classificacao define a prioridade e o prazo do
 * plano de acao. O nivel caia em MEDIO quando faltava a gradacao.
 *
 * Enquadramento (aposentadoria especial, GFIP, insalubridade, periculosidade)
 * que o item nao declara fica sem valor, e nao "nao se aplica": e o estado
 * "nao informado" que o inventario ja mostra. Os tipos de SSTEnvironmentalRisk
 * declaram esses campos obrigatorios, mas o projeto compila sem strictNullChecks
 * e o resto do sistema ja os le como opcionais.
 */
export function camposDoRiscoAPartirDoCatalogo(
  item: Item,
  ajustes: Partial<SSTEnvironmentalRisk> = {}
): CamposDoCatalogoNoRisco {
  const severidade = gradacaoOuNada(ajustes.severity) ?? gradacaoOuNada(item.default_severity);
  const probabilidade = gradacaoOuNada(ajustes.probability) ?? gradacaoOuNada(item.default_probability);
  // A matriz do modelo (secao 5.6), a mesma da aba do GHE e do PGR.
  const classificacao = classificarRisco(severidade, probabilidade);
  const codigo = texto(item.code_table_24);

  return {
    risk_category: item.group,
    agent_name: item.name,
    risk_code_table_24: codigo,
    // Caia na descricao do GHE e, sem ela, em "Atividades operacionais no
    // ambiente de trabalho"; a via de propagacao caia em "Aerea". Fonte e via
    // sao fatos do local: sem elas o campo fica vazio e o PGR diz "nao informada".
    generating_source: texto(item.suggested_source) || texto(item.generating_sources),
    propagation_path: texto(item.suggested_medium) || texto(item.propagation_paths),
    health_effects: texto(item.health_effects),
    evaluation_type: item.evaluation_type,
    measurement_unit: texto(item.standard_unit) || undefined,
    tolerance_limit: texto(item.tolerance_limit_reference) || undefined,
    action_level: texto(item.action_level_reference) || undefined,
    // `?? 0` gravava a string "0" como se fosse medicao, e a unidade
    // padrao do catalogo ia junto: "0 dB(A)" num risco ergonomico.
    // Sem valor sugerido, o campo fica vazio ate alguem medir.
    measured_value:
      ajustes.measured_value ||
      (item.suggested_measured_value != null ? String(item.suggested_measured_value) : ''),
    severity: classificacao ? classificacao.severidade : undefined,
    probability: classificacao ? classificacao.probabilidade : undefined,
    risk_level: ajustes.risk_level || (classificacao ? classificacao.nivel : undefined),
    special_retirement_applies: item.special_retirement_eligible,
    gfip_code: item.gfip_code_suggested,
    // Dizia "Exposicao ... CARACTERIZADA conforme criterios tecnicos e
    // legais" no instante em que o risco era aplicado a partir do
    // catalogo - antes de qualquer avaliacao. Caracterizar exposicao e a
    // conclusao do LTCAT, nao o ponto de partida dele. Sem codigo da
    // Tabela 24, o parentese saia "(undefined)".
    ltcat_technical_conclusion:
      `Agente ${texto(item.name)}${codigo ? ` (${codigo})` : ''} incluído no inventário a partir do ` +
      'catálogo. Avaliação de exposição pendente: a caracterização para fins de LTCAT e ' +
      'aposentadoria especial depende da avaliação no local.',
    insalubridade_applies: item.insalubridade_applicable,
    insalubridade_degree: item.insalubridade_degree_suggested,
    insalubridade_legal_basis: item.insalubridade_legal_basis,
    periculosidade_applies: item.periculosidade_applicable,
    periculosidade_legal_basis: item.periculosidade_legal_basis,
    epi_required: (Array.isArray(item.recommended_epis) ? item.recommended_epis : []).length > 0,
    // O catalogo traz EPIs RECOMENDADOS, com CA de exemplo. Ao virar
    // registro do cliente, nada disso esta verificado:
    //
    //   - ca_number caia em '12345' quando o catalogo nao tinha exemplo.
    //     Esse numero ia para epi_ca_numbers do S-2240.
    //   - is_effective, complies_with_nr06, uninterrupted_use,
    //     periodic_replacement e hygienic_conditions eram gravados todos
    //     como `true`. Sao exatamente as condicoes que o eSocial exige
    //     que o empregador ATESTE para que o EPI neutralize a exposicao,
    //     e delas depende o enquadramento de aposentadoria especial.
    //     Nenhuma delas foi verificada no momento em que o risco e
    //     copiado de um catalogo.
    //
    // Ficam em branco e em false ate alguem conferir no local.
    epis: (Array.isArray(item.recommended_epis) ? item.recommended_epis : []).map((epi) => ({
      epi_name: epi.name,
      ca_number: epi.ca_example || '',
      attenuation_factor: epi.attenuation,
      is_effective: false,
      complies_with_nr06: false,
      uninterrupted_use: false,
      periodic_replacement: false,
      hygienic_conditions: false
    }))
  };
}

/**
 * Os itens do catalogo de onde um risco do inventario pode ter vindo: mesmo
 * nome e mesmo codigo, so os ativos. O risco nao guarda o id do item, e com a
 * listagem o mesmo agente pode estar duas vezes (curado e listado); quem chama
 * fica com o primeiro que tiver recomendacao.
 */
export function itensDoCatalogoDoRisco(
  catalogo: Item[],
  risco: Pick<SSTEnvironmentalRisk, 'agent_name' | 'risk_code_table_24'>
): Item[] {
  const nome = texto(risco?.agent_name);
  const codigo = texto(risco?.risk_code_table_24);
  if (!nome) return [];
  return (Array.isArray(catalogo) ? catalogo : []).filter((item) =>
    itemAtivo(item) && texto(item.name) === nome && texto(item.code_table_24) === codigo);
}

// ---------------------------------------------------------------------------
// Classificacao e enquadramento do item (formulario e ficha da tela)
// ---------------------------------------------------------------------------
//
// Ficam aqui, e nao na tela, para o verificador provar a regra sem montar o
// React: "nao informado" nao grava nada - nem severidade 3, nem GFIP '00',
// nem false -, e a edicao grava so o que o usuario mudou. O formulario antigo
// gravava os tres padroes em todo item, e eles seguiam para o risco do cliente
// quando o item era aplicado a um GHE.

type SimNao = '' | 'SIM' | 'NAO';
type GradacaoNoCampo = '' | '1' | '2' | '3' | '4' | '5';
type Gfip = NonNullable<Item['gfip_code_suggested']>;
type GrauDeInsalubridade = NonNullable<Item['insalubridade_degree_suggested']>;

/** Os campos de classificacao no formulario. '' e "Nao informado". */
export interface ClassificacaoNoFormulario {
  default_severity: GradacaoNoCampo;
  default_probability: GradacaoNoCampo;
  gfip_code_suggested: '' | Gfip;
  special_retirement_eligible: SimNao;
  insalubridade_applicable: SimNao;
  insalubridade_degree_suggested: '' | GrauDeInsalubridade;
  insalubridade_legal_basis: string;
  periculosidade_applicable: SimNao;
  periculosidade_legal_basis: string;
}

export type CampoDaClassificacao = keyof ClassificacaoNoFormulario;

export const CLASSIFICACAO_NAO_INFORMADA: ClassificacaoNoFormulario = {
  default_severity: '',
  default_probability: '',
  gfip_code_suggested: '',
  special_retirement_eligible: '',
  insalubridade_applicable: '',
  insalubridade_degree_suggested: '',
  insalubridade_legal_basis: '',
  periculosidade_applicable: '',
  periculosidade_legal_basis: ''
};

/**
 * Os codigos de GFIP com os rotulos do formulario de risco do GHE
 * (components/sst/GHERiskInventoryTab.tsx), os mesmos do comentario de
 * gfip_code em types/index.ts. Copiados, e nao reescritos: o mesmo codigo nao
 * pode dizer uma coisa no catalogo e outra no inventario.
 */
export const OPCOES_DE_GFIP: Array<{ valor: Gfip; rotulo: string }> = [
  { valor: '00', rotulo: '00 - Sem exposição a agente nocivo' },
  { valor: '01', rotulo: '01 - Não enseja aposentadoria especial' },
  { valor: '02', rotulo: '02 - Enseja aposentadoria especial (15 anos)' },
  { valor: '03', rotulo: '03 - Enseja aposentadoria especial (20 anos)' },
  { valor: '04', rotulo: '04 - Enseja aposentadoria especial (25 anos)' }
];

/** Pelos rotulos acima: 02, 03 e 04 ensejam aposentadoria especial; 00 e 01, nao. */
export const GFIP_QUE_ENSEJA_APOSENTADORIA: Gfip[] = ['02', '03', '04'];

/**
 * Os graus do item 15.2 da NR-15 (docs/fontes/nr15-trechos.txt: 40% maximo,
 * 20% medio, 10% minimo), escritos como a conclusao do laudo de insalubridade
 * os escreve (lib/laudoDados.ts).
 */
export const GRAUS_DE_INSALUBRIDADE: Array<{ valor: GrauDeInsalubridade; rotulo: string }> = [
  { valor: '10%', rotulo: 'Grau mínimo (10%)' },
  { valor: '20%', rotulo: 'Grau médio (20%)' },
  { valor: '40%', rotulo: 'Grau máximo (40%)' }
];

const ehGfip = (v: unknown): v is Gfip => OPCOES_DE_GFIP.some((o) => o.valor === v);
const ehGrauDeInsalubridade = (v: unknown): v is GrauDeInsalubridade =>
  GRAUS_DE_INSALUBRIDADE.some((g) => g.valor === v);

const simNaoDoItem = (v: unknown): SimNao => (v === true ? 'SIM' : v === false ? 'NAO' : '');
const booleanoDoCampo = (v: SimNao): boolean | undefined => (v === 'SIM' ? true : v === 'NAO' ? false : undefined);

/** O que o item tem gravado, nos campos do formulario. Valor fora do dominio abre como "Nao informado". */
export function classificacaoParaFormulario(item: Partial<Item> | null | undefined): ClassificacaoNoFormulario {
  const severidade = gradacaoOuNada(item?.default_severity);
  const probabilidade = gradacaoOuNada(item?.default_probability);
  const gfip = item?.gfip_code_suggested;
  const grau = item?.insalubridade_degree_suggested;
  return {
    default_severity: severidade ? (String(severidade) as GradacaoNoCampo) : '',
    default_probability: probabilidade ? (String(probabilidade) as GradacaoNoCampo) : '',
    gfip_code_suggested: ehGfip(gfip) ? gfip : '',
    special_retirement_eligible: simNaoDoItem(item?.special_retirement_eligible),
    insalubridade_applicable: simNaoDoItem(item?.insalubridade_applicable),
    insalubridade_degree_suggested: ehGrauDeInsalubridade(grau) ? grau : '',
    insalubridade_legal_basis: texto(item?.insalubridade_legal_basis),
    periculosidade_applicable: simNaoDoItem(item?.periculosidade_applicable),
    periculosidade_legal_basis: texto(item?.periculosidade_legal_basis)
  };
}

/**
 * Os valores que o formulario grava. "Nao informado" vira undefined, e campo
 * undefined nao entra no item novo nem sobrescreve nada na edicao.
 *
 * Grau e base legal nao acompanham a insalubridade marcada "Nao", nem a base
 * da periculosidade a periculosidade marcada "Nao": "nao se aplica, grau 20%"
 * diria duas coisas ao mesmo tempo, e o grau iria para o risco aplicado. Com
 * o "aplica?" nao informado eles ficam - o item da listagem pode trazer o grau
 * da NR-15 sem que ninguem tenha marcado o resto, e "nao informado" nao apaga.
 */
export function valoresDaClassificacao(
  form: ClassificacaoNoFormulario
): { [K in CampoDaClassificacao]: Item[K] | undefined } {
  const insalubre = form.insalubridade_applicable !== 'NAO';
  const perigoso = form.periculosidade_applicable !== 'NAO';
  return {
    default_severity: gradacaoOuNada(Number(form.default_severity)),
    default_probability: gradacaoOuNada(Number(form.default_probability)),
    gfip_code_suggested: ehGfip(form.gfip_code_suggested) ? form.gfip_code_suggested : undefined,
    special_retirement_eligible: booleanoDoCampo(form.special_retirement_eligible),
    insalubridade_applicable: booleanoDoCampo(form.insalubridade_applicable),
    insalubridade_degree_suggested:
      insalubre && ehGrauDeInsalubridade(form.insalubridade_degree_suggested) ? form.insalubridade_degree_suggested : undefined,
    insalubridade_legal_basis: insalubre ? texto(form.insalubridade_legal_basis) || undefined : undefined,
    periculosidade_applicable: booleanoDoCampo(form.periculosidade_applicable),
    periculosidade_legal_basis: perigoso ? texto(form.periculosidade_legal_basis) || undefined : undefined
  };
}

/**
 * Campos que se gravam juntos. Mudou o "aplica?", o grau e a base sao
 * regravados com ele - senao "nao se aplica" ficaria gravado ao lado do grau
 * de antes.
 */
const GRUPOS_DA_CLASSIFICACAO: CampoDaClassificacao[][] = [
  ['default_severity'],
  ['default_probability'],
  ['gfip_code_suggested'],
  ['special_retirement_eligible'],
  ['insalubridade_applicable', 'insalubridade_degree_suggested', 'insalubridade_legal_basis'],
  ['periculosidade_applicable', 'periculosidade_legal_basis']
];

const semValor = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/**
 * O que a edicao grava: so os campos que o usuario mudou no formulario, e
 * deles so os que ficam diferentes do item. Campo que volta a "Nao
 * informado" sai como undefined - a chave vai, e o valor some do item.
 */
export function mudancasDaClassificacao(
  item: Partial<Item>,
  inicial: ClassificacaoNoFormulario,
  form: ClassificacaoNoFormulario
): Partial<Item> {
  const valores = valoresDaClassificacao(form);
  const mudancas: Partial<Item> = {};
  for (const grupo of GRUPOS_DA_CLASSIFICACAO) {
    if (!grupo.some((campo) => form[campo] !== inicial[campo])) continue;
    for (const campo of grupo) {
      const antes = item?.[campo];
      const depois = valores[campo];
      if ((semValor(antes) && semValor(depois)) || antes === depois) continue;
      (mudancas as Record<string, unknown>)[campo] = depois;
    }
  }
  return mudancas;
}

/**
 * GFIP e aposentadoria especial que se contradizem pelos proprios rotulos:
 * "04 - Enseja aposentadoria especial" com aposentadoria "Nao", ou 00/01 com
 * "Sim". Os dois seguem para o risco aplicado e de la para o LTCAT e o PPP.
 * Sem um dos dois, nao ha o que confrontar.
 */
export function conflitoGfipAposentadoria(
  valores: Pick<Partial<Item>, 'gfip_code_suggested' | 'special_retirement_eligible'>
): string | null {
  const gfip = valores?.gfip_code_suggested;
  const aposentadoria = valores?.special_retirement_eligible;
  if (!ehGfip(gfip) || typeof aposentadoria !== 'boolean') return null;
  const enseja = GFIP_QUE_ENSEJA_APOSENTADORIA.includes(gfip);
  if (enseja === aposentadoria) return null;
  const rotulo = OPCOES_DE_GFIP.find((o) => o.valor === gfip)?.rotulo;
  return `O código GFIP "${rotulo}" contradiz a aposentadoria especial marcada como ` +
    `"${aposentadoria ? 'Sim' : 'Não'}". Corrija um dos dois, ou deixe um deles como não informado.`;
}

export interface LinhaDoEnquadramento {
  rotulo: string;
  valor: string;
  /** Base legal, quando ha. */
  detalhe?: string;
}

/**
 * Classificacao e enquadramento como a ficha do item os mostra: so o que o
 * item tem. Campo ausente nao vira linha - os itens da listagem nao trazem
 * nenhum deles, e quase mil fichas com "nao informado" em seis linhas so
 * esconderiam o que importa.
 */
export function enquadramentoDoItem(item: Partial<Item> | null | undefined): LinhaDoEnquadramento[] {
  if (!item) return [];
  const linhas: LinhaDoEnquadramento[] = [];
  const severidade = gradacaoOuNada(item.default_severity);
  const probabilidade = gradacaoOuNada(item.default_probability);
  const classificacao = classificarRisco(severidade, probabilidade);
  if (classificacao) {
    linhas.push({
      rotulo: 'Classificação sugerida',
      valor: `S${classificacao.severidade} × P${classificacao.probabilidade} = ${classificacao.score} · ${classificacao.rotulo}`
    });
  } else if (severidade) {
    linhas.push({ rotulo: 'Severidade sugerida', valor: `S${severidade} (sem probabilidade)` });
  } else if (probabilidade) {
    linhas.push({ rotulo: 'Probabilidade sugerida', valor: `P${probabilidade} (sem severidade)` });
  }

  const gfip = OPCOES_DE_GFIP.find((o) => o.valor === item.gfip_code_suggested);
  if (gfip) linhas.push({ rotulo: 'GFIP sugerido', valor: gfip.rotulo });

  if (typeof item.special_retirement_eligible === 'boolean') {
    linhas.push({ rotulo: 'Aposentadoria especial', valor: item.special_retirement_eligible ? 'Sim' : 'Não' });
  }

  const grau = GRAUS_DE_INSALUBRIDADE.find((g) => g.valor === item.insalubridade_degree_suggested);
  const insalubridade = linhaDeAdicional('Insalubridade', item.insalubridade_applicable, grau?.rotulo, item.insalubridade_legal_basis);
  if (insalubridade) linhas.push(insalubridade);
  const periculosidade = linhaDeAdicional('Periculosidade', item.periculosidade_applicable, undefined, item.periculosidade_legal_basis);
  if (periculosidade) linhas.push(periculosidade);
  return linhas;
}

/**
 * "Sim · Grau medio (20%)", com a base legal a parte. So a base, sem o "aplica?"
 * nem o grau, vira o proprio valor: um rotulo seguido de nada nao diz nada.
 */
function linhaDeAdicional(
  rotulo: string,
  aplica: unknown,
  grau: string | undefined,
  base: unknown
): LinhaDoEnquadramento | null {
  const valor = [aplica === true ? 'Sim' : aplica === false ? 'Não' : '', grau || ''].filter(Boolean).join(' · ');
  const detalhe = texto(base);
  if (!valor && !detalhe) return null;
  if (!valor) return { rotulo, valor: detalhe };
  return detalhe ? { rotulo, valor, detalhe } : { rotulo, valor };
}
