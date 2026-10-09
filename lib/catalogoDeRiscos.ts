/**
 * Regras do catalogo de riscos que valem fora da tela do catalogo: a fusao da
 * listagem no carregamento, a exclusao que vira desativacao, a busca do
 * seletor do inventario e o que um item do catalogo leva ao risco do GHE.
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
 * O catalogo carregado, com os itens da listagem que faltam nele.
 *
 *  - So acrescenta. Item que ja esta (pelo id) fica como esta: a edicao do
 *    usuario vence, e a desativacao tambem.
 *  - So itens da listagem. Curado ausente nao volta: so falta porque o usuario
 *    o excluiu, quando ainda dava para excluir, e foi de proposito. Por isso a
 *    origem e conferida aqui, e nao so no chamador.
 *  - Nada a acrescentar devolve a MESMA lista, e fundir o resultado de novo
 *    nao acrescenta nada.
 */
export function acrescentarItensDaListagem(carregado: Item[], listagem: Item[]): Item[] {
  const lista = Array.isArray(carregado) ? carregado : [];
  const presentes = new Set(lista.map((item) => String(item?.id ?? '')));
  const faltam: Item[] = [];
  for (const item of Array.isArray(listagem) ? listagem : []) {
    if (!ehItemDaListagem(item)) continue;
    const id = String(item.id);
    if (presentes.has(id)) continue;
    // Id repetido na propria listagem entra uma vez so.
    presentes.add(id);
    faltam.push(item);
  }
  return faltam.length === 0 ? lista : [...lista, ...faltam];
}

/**
 * A fusao no carregamento, com a semantica de `list()` do contexto
 * (applySnapshot): `undefined` e "nao mexer no que esta em memoria" e continua
 * `undefined`. Fundir um `[]` no lugar dele trocaria o catalogo inteiro da
 * tela so pela listagem - o cache vazio ou ausente apagaria os curados e os do
 * usuario.
 */
export function catalogoAoCarregar(carregado: Item[] | undefined, listagem: Item[]): Item[] | undefined {
  return carregado === undefined ? undefined : acrescentarItensDaListagem(carregado, listagem);
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
