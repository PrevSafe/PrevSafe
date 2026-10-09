'use client';

import React, { useState, useMemo, useEffect, useCallback, useDeferredValue } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import {
  OccupationalRiskCatalogItem,
  OccupationalRiskEPISuggestion,
  OccupationalRiskExamSuggestion,
  RiskCategoryType
} from '@/types';
import { SeletorTabela27 } from './SeletorTabela27';
import { consultarProcedimento, codigoExisteNaTabela27 } from '@/lib/tabela27';
import {
  formatoDoCodigoTabela24,
  codigosDuplicados,
  consultarAgente,
  codigoExisteNaTabela24,
  CODIGO_AUSENCIA_DE_RISCO
} from '@/lib/tabela24';
import { textoDoLimite, normalizarUnidade } from '@/lib/limitesDoCatalogo';
import {
  ehItemDoSistema,
  ehItemDaListagem,
  itemAtivo,
  grupoDoItem as grupoDoSeletor,
  type GrupoDoSeletor,
  textoDaDuplicidade,
  CLASSIFICACAO_NAO_INFORMADA,
  classificacaoParaFormulario,
  valoresDaClassificacao,
  mudancasDaClassificacao,
  conflitoGfipAposentadoria,
  enquadramentoDoItem,
  OPCOES_DE_GFIP,
  GRAUS_DE_INSALUBRIDADE,
  type ClassificacaoNoFormulario
} from '@/lib/catalogoDeRiscos';
import { classificarRisco } from '@/lib/classificacaoDeRisco';
import { PGR_SEVERIDADE } from '@/lib/pgrModelo';
import { SeletorTabela24 } from './SeletorTabela24';
import {
  SITUACOES_OPERACIONAIS,
  type SituacaoOperacional
} from '@/lib/situacaoOperacional';
import {
  ShieldAlert,
  Plus,
  Trash2,
  Edit3,
  Search,
  CheckCircle2,
  RotateCcw,
  Layers,
  HardHat,
  Stethoscope,
  Building2,
  Briefcase,
  ArrowUpRight,
  X,
  CheckSquare,
  Square,
  Activity,
  Sliders,
  Flame,
  Zap,
  Power,
  PowerOff,
  Info
} from 'lucide-react';

interface OccupationalRisksCatalogViewProps {
  onNavigate?: (view: string) => void;
}

// ---------------------------------------------------------------------------
// Volume
// ---------------------------------------------------------------------------

/**
 * Quantos itens a lista desenha por vez. O catalogo passou de 25 para ~935
 * itens, e desenhar todos os cartoes a cada tecla da busca travava a tela.
 */
const TAMANHO_DA_PAGINA = 50;
/** Resultados que a busca do modal de aplicacao mostra de uma vez. */
const LIMITE_DA_BUSCA_NO_MODAL = 30;
/** Riscos selecionados que aparecem como etiqueta no modal. */
const LIMITE_DE_ETIQUETAS = 40;
/**
 * A partir de quantos riscos a aplicacao em lote pede confirmacao. Com
 * "Selecionar todos" sobre centenas de itens, um clique criaria centenas de
 * riscos em cada GHE de destino.
 */
const LOTE_GRANDE = 20;

// ---------------------------------------------------------------------------
// Grupo, origem e situacao do item
// ---------------------------------------------------------------------------

type GrupoDoPgr = 'FÍSICO' | 'QUÍMICO' | 'BIOLÓGICO' | 'ERGONÔMICO' | 'ACIDENTES' | 'OUTROS';
type OrigemDoItem = 'CURADO' | 'LISTAGEM' | 'USUARIO';
type FiltroDeSituacao = 'ACTIVE' | 'INACTIVE' | 'ALL';

/**
 * Texto para busca: sem acento e minusculo. NFKD, e nao NFD, para que o "3"
 * digitado ache o "³" da unidade: a listagem escreve "mg/m³" e quem busca
 * digita "mg/m3".
 */
const paraBusca = (t: unknown) =>
  String(t ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Termos da busca. Todos precisam aparecer: "ruido impacto" acha "Ruído de Impacto". */
const termosDaBusca = (busca: string) => paraBusca(busca).split(/\s+/).filter(Boolean);

const CARTAO_DO_GRUPO: Record<GrupoDoSeletor, GrupoDoPgr> = {
  FISICO: 'FÍSICO',
  QUIMICO: 'QUÍMICO',
  BIOLOGICO: 'BIOLÓGICO',
  ERGONOMICO: 'ERGONÔMICO',
  ACIDENTE: 'ACIDENTES',
  AUSENCIA: 'OUTROS'
};

/**
 * Grupo do PGR com grafia unica, pela mesma regra do seletor do inventario
 * (lib/catalogoDeRiscos.ts). O tipo aceita 'FISICO' e 'FÍSICO', e o filtro e
 * o formulario antigos usavam 'ACIDENTE' enquanto os itens gravam
 * 'ACIDENTES': o filtro de acidentes nao achava nada, e o risco de acidente
 * criado pelo formulario ficava fora do cartao do grupo. Ausencia de risco e
 * grupo desconhecido ("Inespecifico" da listagem) caem em OUTROS, para nao
 * sumir da contagem.
 */
function grupoDoItem(group: string | undefined): GrupoDoPgr {
  const g = grupoDoSeletor(group);
  return g ? CARTAO_DO_GRUPO[g] : 'OUTROS';
}

/**
 * De onde veio o item. A regra e a do contexto (lib/catalogoDeRiscos.ts): e
 * ela que decide se excluir apaga ou desativa, e a tela nao pode prometer uma
 * coisa e o contexto fazer outra.
 */
function origemDoItem(item: OccupationalRiskCatalogItem): OrigemDoItem {
  if (ehItemDaListagem(item)) return 'LISTAGEM';
  if (ehItemDoSistema(item)) return 'CURADO';
  return 'USUARIO';
}

/** Item desativado nao entra em selecao nem aplicacao. Sem status gravado, esta ativo. */
const estaAtivo = (item: OccupationalRiskCatalogItem) => itemAtivo(item);

// ---------------------------------------------------------------------------
// Campo ausente
// ---------------------------------------------------------------------------

/**
 * Textos que o formulario antigo gravava no lugar do dado ausente. Na tela
 * pareciam informacao ("Fonte não especificada" como fonte geradora, "EPI
 * Adequado" como EPI recomendado), e de la iam para o risco aplicado ao GHE e
 * para o plano de acao, que sugeria a medida "Não especificado". Aqui contam
 * como vazio, e saem do item quando ele e salvo de novo.
 */
const TEXTOS_DE_FACHADA = new Set(['fonte nao especificada', 'nao especificado', 'epi adequado']);
const ehFachada = (v: unknown) => typeof v === 'string' && TEXTOS_DE_FACHADA.has(paraBusca(v).trim());

/** O texto, ou '' quando ausente, vazio ou de fachada. Nunca "undefined". */
const textoUtil = (v: unknown): string => {
  if (typeof v !== 'string') return '';
  const t = v.trim();
  return t && !ehFachada(t) ? t : '';
};

const episUteis = (item: OccupationalRiskCatalogItem): OccupationalRiskEPISuggestion[] =>
  (Array.isArray(item.recommended_epis) ? item.recommended_epis : []).filter(e => !!textoUtil(e?.name));

/**
 * Limite e nivel de acao como o inventario os recebe. O texto gravado vem
 * primeiro, porque e ele que vai para o risco aplicado; o numero so e
 * formatado quando o texto falta, e pela mesma funcao que gera o texto dos
 * itens da listagem - assim os dois nunca dizem coisas diferentes.
 */
const limiteDoItem = (item: OccupationalRiskCatalogItem) =>
  textoUtil(item.tolerance_limit_reference) ||
  textoDoLimite(item.tolerance_limit_value, item.standard_unit, item.tolerance_limit_is_ceiling) ||
  '';
const nivelDeAcaoDoItem = (item: OccupationalRiskCatalogItem) =>
  textoUtil(item.action_level_reference) || textoDoLimite(item.action_level_value, item.standard_unit) || '';

// A mesma precedencia que applyRisksToTargets (context) e sugestoesDoCatalogo
// (lib/planoDeAcao.ts) usam: o que a tela mostra e o que o risco aplicado leva.
const meioDoItem = (item: OccupationalRiskCatalogItem) =>
  textoUtil(item.suggested_medium) || textoUtil(item.propagation_paths);
const fonteDoItem = (item: OccupationalRiskCatalogItem) =>
  textoUtil(item.suggested_source) || textoUtil(item.generating_sources);
const controleDoItem = (item: OccupationalRiskCatalogItem) =>
  textoUtil(item.recommended_epcs) || textoUtil(item.suggested_controls_summary);

/** Tudo em que a busca procura, ja sem acento. Calculado uma vez por item, e nao a cada tecla. */
function textoDeBusca(item: OccupationalRiskCatalogItem): string {
  const codigo = String(item.code_table_24 || '');
  return paraBusca(
    [
      item.name,
      codigo,
      // "0103002" tambem acha 01.03.002.
      codigo.replace(/\D/g, ''),
      consultarAgente(codigo)?.nome,
      item.standard_unit,
      item.health_effects,
      item.regulatory_norm_reference,
      fonteDoItem(item),
      meioDoItem(item),
      item.esocial_enquadramento_nota
    ]
      .filter(Boolean)
      .join(' \u0001 ')
  );
}

// ---------------------------------------------------------------------------
// Formulario
// ---------------------------------------------------------------------------

interface ExameDoFormulario {
  codigo: string;
  nome: string;
  periodicidade_meses: number;
}

/**
 * Os campos de classificacao (severidade, probabilidade, GFIP, aposentadoria
 * especial, insalubridade e periculosidade) vem de ClassificacaoNoFormulario,
 * com o nome do campo do item: a regra de "nao informado nao grava" e de
 * "edicao grava so o que mudou" esta em lib/catalogoDeRiscos.ts.
 */
interface FormularioDoRisco extends ClassificacaoNoFormulario {
  risk_code_table_24: string;
  agent_name: string;
  group: RiskCategoryType;
  evaluation_type_standard: 'QUALITATIVA' | 'QUANTITATIVA';
  measurement_unit_standard: string;
  /** Limite em numero, como digitado ("0,016"). */
  tolerance_limit_number: string;
  tolerance_limit_is_ceiling: boolean;
  /** Texto do limite, que so vale quando nao ha numero. */
  tolerance_limit_nr15: string;
  action_level_number: string;
  action_level_nr09: string;
  harmful_effects: string;
  regulatory_norm_reference: string;
  /** Meio de propagacao. */
  propagation: string;
  suggested_source: string;
  suggested_controls_summary: string;
  suggested_epis_text: string;
  /**
   * Exames sugeridos, escolhidos da Tabela 27. Era um campo de texto no
   * formato "Nome [Codigo] - 12m", e o parser caia em '0295' sempre que o
   * codigo nao vinha entre colchetes - 0295 e Avaliacao clinica, entao
   * qualquer exame digitado sem codigo virava avaliacao clinica.
   */
  suggested_exams: ExameDoFormulario[];
}

/**
 * Formulario vazio. Vinha pre-preenchido com um agente de ruido completo:
 * limite de 85 dB(A), medicao sugerida de 84,0 e os CAs 14235 e 29745 -
 * numeros que seriam copiados para dentro de riscos reais de clientes. E o
 * "Novo risco" ainda abria com unidade dB(A), norma "NR-01 / NR-09" e meio
 * "AR" ja escritos, que eram gravados se ninguem apagasse.
 */
const FORMULARIO_VAZIO: FormularioDoRisco = {
  risk_code_table_24: '',
  agent_name: '',
  group: 'FÍSICO',
  evaluation_type_standard: 'QUANTITATIVA',
  measurement_unit_standard: '',
  tolerance_limit_number: '',
  tolerance_limit_is_ceiling: false,
  tolerance_limit_nr15: '',
  action_level_number: '',
  action_level_nr09: '',
  harmful_effects: '',
  regulatory_norm_reference: '',
  propagation: '',
  suggested_source: '',
  suggested_controls_summary: '',
  suggested_epis_text: '',
  suggested_exams: [],
  // Tudo em "Nao informado". O formulario antigo gravava severidade 3,
  // probabilidade 3, GFIP '00' e "nao se aplica" sem campo na tela.
  ...CLASSIFICACAO_NAO_INFORMADA
};

const GRUPOS_DO_FORMULARIO: Array<{ valor: RiskCategoryType; rotulo: string }> = [
  { valor: 'FÍSICO', rotulo: 'Físico (Grupo 1 - Verde)' },
  { valor: 'QUÍMICO', rotulo: 'Químico (Grupo 2 - Vermelho)' },
  { valor: 'BIOLÓGICO', rotulo: 'Biológico (Grupo 3 - Marrom)' },
  { valor: 'ERGONÔMICO', rotulo: 'Ergonômico (Grupo 4 - Amarelo)' },
  { valor: 'ACIDENTES', rotulo: 'Acidente / Mecânico (Grupo 5 - Azul)' },
  { valor: 'AUSÊNCIA_RISCO', rotulo: 'Ausência de risco' }
];

/** Grupo com a grafia que o formulario oferece, para o select nao mostrar uma opcao e guardar outra. */
function grupoParaFormulario(group: RiskCategoryType): RiskCategoryType {
  const g = grupoDoItem(group);
  return g === 'OUTROS' ? group : g;
}

/** 0.016 -> "0,016". Zero e ausente ficam vazios: zero nao e limite (lib/limitesDoCatalogo.ts). */
const numeroParaCampo = (v: number | undefined) =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? String(v).replace('.', ',') : '';

/**
 * Numero digitado no limite ou no nivel de acao. Aceita virgula ou ponto
 * decimal, mas nao separador de milhar: "1.480" seria 1,48 ou 1480, e o
 * campo nao adivinha. Zero tambem nao e aceito: quando o agente nao tem
 * valor fixo, o numero fica vazio e o texto explica.
 */
function lerNumero(t: string): number | undefined | 'INVALIDO' {
  const s = (t || '').trim();
  if (!s) return undefined;
  if (!/^\d+([.,]\d+)?$/.test(s)) return 'INVALIDO';
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 'INVALIDO';
}

/** Texto opcional: vazio vira undefined, nunca ''. */
const opcional = (t: string | undefined) => {
  const v = (t || '').trim();
  return v || undefined;
};

function formularioDoItem(item: OccupationalRiskCatalogItem): FormularioDoRisco {
  return {
    risk_code_table_24: item.code_table_24 || '',
    agent_name: item.name || '',
    group: grupoParaFormulario(item.group),
    evaluation_type_standard: item.evaluation_type === 'QUALITATIVA' ? 'QUALITATIVA' : 'QUANTITATIVA',
    measurement_unit_standard: item.standard_unit || '',
    tolerance_limit_number: numeroParaCampo(item.tolerance_limit_value),
    tolerance_limit_is_ceiling: !!item.tolerance_limit_is_ceiling,
    tolerance_limit_nr15: textoUtil(item.tolerance_limit_reference),
    action_level_number: numeroParaCampo(item.action_level_value),
    action_level_nr09: textoUtil(item.action_level_reference),
    harmful_effects: textoUtil(item.health_effects),
    regulatory_norm_reference: textoUtil(item.regulatory_norm_reference),
    propagation: meioDoItem(item),
    suggested_source: fonteDoItem(item),
    suggested_controls_summary: controleDoItem(item),
    // "(CA undefined)" quando o EPI nao tinha CA de exemplo.
    suggested_epis_text: episUteis(item)
      .map(e => (e.ca_example ? `${e.name} (CA ${e.ca_example})` : e.name))
      .join(', '),
    suggested_exams: (item.suggested_exams_pcmso || []).map(ex => ({
      codigo: ex.exam_code || '',
      nome: consultarProcedimento(ex.exam_code)?.nome || ex.exam_name || '',
      periodicidade_meses: ex.periodicity_months || 12
    })),
    ...classificacaoParaFormulario(item)
  };
}

/**
 * EPIs do campo de texto. O EPI que ja estava no item e reconhecido pelo
 * nome e mantem o tipo de protecao e a atenuacao: reler o texto apagava os
 * dois, e o "Protetor auditivo ... 16 dB NRRsf" do catalogo perdia a atenuacao
 * so porque o item foi salvo.
 */
function lerEpis(texto: string, anteriores: OccupationalRiskEPISuggestion[] = []): OccupationalRiskEPISuggestion[] {
  return texto
    .split(',')
    .map(parte => parte.trim())
    .filter(Boolean)
    .map(parte => {
      const caMatch = parte.match(/CA\s*(\d+)/i);
      const ca = caMatch ? caMatch[1] : undefined;
      const nome = parte.replace(/\(\s*CA\s*\d+\s*\)/i, '').trim() || (ca ? `CA ${ca}` : '');
      const anterior = anteriores.find(e => paraBusca(e?.name).trim() === paraBusca(nome).trim());
      return {
        name: nome,
        // Sem CA de fachada: o padrao era '12345', um numero de CA que nao
        // existe. Ele seria copiado para o risco real do cliente e de la
        // para o campo epi_ca_numbers do S-2240.
        ca_example: ca,
        protection_type: anterior?.protection_type || 'Proteção Individual',
        attenuation: anterior?.attenuation
      };
    })
    .filter(e => !!e.name);
}

/**
 * Os exames vem escolhidos da Tabela 27: codigo e nome oficiais, sem parser
 * de texto. O parser antigo caia em exam_code '0295' quando o codigo nao vinha
 * entre colchetes - e 0295 e Avaliacao clinica ocupacional, entao
 * "Audiometria" digitada sem codigo era gravada como avaliacao clinica.
 *
 * O exame que ja estava no item mantem os gatilhos e a norma: salvar o item
 * trocava todos por admissional/periodico/demissional e tirava, por exemplo,
 * a mudanca de risco da audiometria.
 */
function montarExames(
  lista: ExameDoFormulario[],
  anteriores: OccupationalRiskExamSuggestion[] = []
): OccupationalRiskExamSuggestion[] {
  return lista.map(ex => {
    const anterior = anteriores.find(a => a.exam_code === ex.codigo);
    return {
      exam_code: ex.codigo,
      exam_name: consultarProcedimento(ex.codigo)?.nome || ex.nome,
      periodicity_months: ex.periodicidade_meses || 12,
      triggers: anterior?.triggers?.length
        ? anterior.triggers
        : (['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'] as OccupationalRiskExamSuggestion['triggers']),
      mandatory_standard: anterior?.mandatory_standard || 'NR-07'
    };
  });
}

const vazio = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const mesmoValor = (a: unknown, b: unknown) =>
  (vazio(a) && vazio(b)) || JSON.stringify(a) === JSON.stringify(b);

/** "A", "B" e "C" e mais 4 - a lista de nomes nao cresce com o catalogo. */
function nomesResumidos(nomes: string[], maximo = 3): string {
  const mostrados = nomes.slice(0, maximo).map(n => `"${n}"`);
  const resto = nomes.length - mostrados.length;
  return resto > 0 ? `${mostrados.join(', ')} e mais ${resto}` : mostrados.join(', ');
}

// ---------------------------------------------------------------------------
// Aparencia
// ---------------------------------------------------------------------------

const CARTOES_DE_GRUPO: Array<{
  grupo: Exclude<GrupoDoPgr, 'OUTROS'>;
  rotulo: string;
  exemplo: string;
  Icone: React.ComponentType<{ className?: string }>;
  marcado: string;
  desmarcado: string;
  texto: string;
  icone: string;
}> = [
  {
    grupo: 'FÍSICO', rotulo: 'Físicos · grupo 1', exemplo: 'Ruído, calor, vibrações', Icone: Activity,
    marcado: 'border-amber-500 bg-amber-500/25 shadow-sm ring-2 ring-amber-500/40',
    desmarcado: 'border-slate-800 hover:border-amber-500/30 hover:bg-amber-500/10',
    texto: 'text-amber-300', icone: 'text-amber-400'
  },
  {
    grupo: 'QUÍMICO', rotulo: 'Químicos · grupo 2', exemplo: 'Poeiras, vapores, fumos', Icone: Flame,
    marcado: 'border-rose-500 bg-rose-500/25 shadow-sm ring-2 ring-rose-500/40',
    desmarcado: 'border-slate-800 hover:border-rose-500/30 hover:bg-rose-500/10',
    texto: 'text-rose-300', icone: 'text-rose-400'
  },
  {
    grupo: 'BIOLÓGICO', rotulo: 'Biológicos · grupo 3', exemplo: 'Vírus, bactérias, fungos', Icone: ShieldAlert,
    marcado: 'border-emerald-500 bg-emerald-500/25 shadow-sm ring-2 ring-emerald-500/40',
    desmarcado: 'border-slate-800 hover:border-emerald-500/30 hover:bg-emerald-500/10',
    texto: 'text-emerald-300', icone: 'text-emerald-400'
  },
  {
    grupo: 'ERGONÔMICO', rotulo: 'Ergonômicos · grupo 4', exemplo: 'Postura, carga, repetição', Icone: Sliders,
    marcado: 'border-purple-500 bg-purple-500/25 shadow-sm ring-2 ring-purple-500/40',
    desmarcado: 'border-slate-800 hover:border-purple-500/30 hover:bg-purple-500/10',
    texto: 'text-purple-300', icone: 'text-purple-400'
  },
  {
    grupo: 'ACIDENTES', rotulo: 'Acidentes · grupo 5', exemplo: 'Queda, choque, máquinas', Icone: Zap,
    marcado: 'border-sky-500 bg-sky-500/25 shadow-sm ring-2 ring-sky-500/40',
    desmarcado: 'border-slate-800 hover:border-sky-500/30 hover:bg-sky-500/10',
    texto: 'text-sky-300', icone: 'text-sky-400'
  }
];

const getGroupBadgeColor = (group: string | undefined) => {
  switch (grupoDoItem(group)) {
    case 'FÍSICO': return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'QUÍMICO': return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    case 'BIOLÓGICO': return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'ERGONÔMICO': return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    case 'ACIDENTES': return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    default: return 'bg-slate-950 text-slate-300 border-slate-800';
  }
};

const SELO_DA_ORIGEM: Record<OrigemDoItem, { rotulo: string; classe: string; ajuda: string }> = {
  CURADO: {
    rotulo: 'Curado',
    classe: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    ajuda: 'Item do sistema escrito e conferido, com fontes, efeitos, EPI e exames sugeridos.'
  },
  LISTAGEM: {
    rotulo: 'Listagem importada',
    classe: 'bg-slate-800 text-slate-300 border-slate-700',
    ajuda: 'Item do sistema importado da listagem de riscos: traz nome, grupo, meio de propagação, unidade, avaliação, limites e código. Os campos descritivos ficam vazios até alguém preenchê-los.'
  },
  USUARIO: {
    rotulo: 'Criado aqui',
    classe: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    ajuda: 'Item criado neste catálogo pelo usuário.'
  }
};

export const OccupationalRisksCatalogView: React.FC<OccupationalRisksCatalogViewProps> = ({ onNavigate }) => {
  const {
    occupationalRisksCatalog,
    addOccupationalRiskCatalogItem,
    updateOccupationalRiskCatalogItem,
    deleteOccupationalRiskCatalogItem,
    resetOccupationalRisksCatalogToDefault,
    clients,
    ghes,
    hierarchySectors,
    hierarchyJobs,
    applyRisksToTargets
  } = usePrevSafe();

  const catalogo = useMemo(() => occupationalRisksCatalog || [], [occupationalRisksCatalog]);
  // O curado que um item da listagem repete (duplicate_of_id) e achado por id
  // a cada cartao: um mapa por catalogo, e nao uma busca na lista por cartao.
  const itemPorId = useMemo(() => new Map(catalogo.map(item => [item.id, item])), [catalogo]);

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  // A lista filtra pela busca ADIADA: o campo responde a cada tecla e a
  // filtragem dos ~935 itens acontece quando o React tiver folga.
  const buscaAdiada = useDeferredValue(searchTerm);
  const [selectedGroup, setSelectedGroup] = useState<'ALL' | GrupoDoPgr>('ALL');
  const [evaluationTypeFilter, setEvaluationTypeFilter] = useState<string>('ALL');
  const [originFilter, setOriginFilter] = useState<'ALL' | OrigemDoItem>('ALL');
  // Ativos por padrao: item desativado nao e oferecido para aplicacao, e
  // mostra-lo misturado aos ativos so atrapalha.
  const [statusFilter, setStatusFilter] = useState<FiltroDeSituacao>('ACTIVE');
  const [quantosMostrar, setQuantosMostrar] = useState(TAMANHO_DA_PAGINA);

  // Modal State for Add / Edit Risk
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OccupationalRiskCatalogItem | null>(null);
  const [form, setForm] = useState<FormularioDoRisco>(FORMULARIO_VAZIO);
  // O formulario como foi aberto. Ao salvar uma edicao so se grava o que o
  // usuario mudou: o resto do item fica como estava.
  const [formInicial, setFormInicial] = useState<FormularioDoRisco>(FORMULARIO_VAZIO);

  // Modal State for Apply to Clients / GHE / Hierarchy
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedRiskIdsToApply, setSelectedRiskIdsToApply] = useState<string[]>([]);
  const [buscaNoModal, setBuscaNoModal] = useState('');
  const buscaNoModalAdiada = useDeferredValue(buscaNoModal);
  const [applyClientId, setApplyClientId] = useState<string>(clients[0]?.id || '');
  const [applyTargetMode, setApplyTargetMode] = useState<'GHE' | 'JOB' | 'SECTOR_TREE'>('GHE');
  const [selectedTargetGheIds, setSelectedTargetGheIds] = useState<string[]>([]);
  const [selectedTargetJobIds, setSelectedTargetJobIds] = useState<string[]>([]);
  const [selectedTargetSectorIds, setSelectedTargetSectorIds] = useState<string[]>([]);
  const [includeSuggestedExams, setIncludeSuggestedExams] = useState(true);
  // Situacao operacional do risco aplicado. Sem ela, todo risco vindo do
  // catalogo nasce com a alinea "b" do subitem 1.5.7.3.2 em aberto e o PGR
  // aponta pendencia para cada um.
  const [situacaoAplicada, setSituacaoAplicada] = useState<SituacaoOperacional[]>(['ROTINEIRA']);
  const [situacaoNota, setSituacaoNota] = useState('');
  const [applyFeedback, setApplyFeedback] = useState<{ count: number; examsCount: number; message: string } | null>(null);

  // -------------------------------------------------------------------------
  // Busca e filtros
  // -------------------------------------------------------------------------

  const indiceDeBusca = useMemo(() => {
    const mapa = new Map<string, string>();
    catalogo.forEach(item => mapa.set(item.id, textoDeBusca(item)));
    return mapa;
  }, [catalogo]);

  const casaComBusca = useCallback((item: OccupationalRiskCatalogItem, termos: string[]) => {
    if (termos.length === 0) return true;
    const indice = indiceDeBusca.get(item.id) || '';
    return termos.every(t => indice.includes(t));
  }, [indiceDeBusca]);

  // Todos os filtros menos o de grupo. E a base dos contadores dos cartoes:
  // o numero no cartao e o que a lista mostra ao clicar nele.
  const filtradosSemGrupo = useMemo(() => {
    const termos = termosDaBusca(buscaAdiada);
    return catalogo.filter(item => {
      if (statusFilter === 'ACTIVE' && !estaAtivo(item)) return false;
      if (statusFilter === 'INACTIVE' && estaAtivo(item)) return false;
      if (originFilter !== 'ALL' && origemDoItem(item) !== originFilter) return false;
      if (evaluationTypeFilter !== 'ALL' && item.evaluation_type !== evaluationTypeFilter) return false;
      return casaComBusca(item, termos);
    });
  }, [catalogo, casaComBusca, buscaAdiada, statusFilter, originFilter, evaluationTypeFilter]);

  const filteredRisks = useMemo(
    () => (selectedGroup === 'ALL' ? filtradosSemGrupo : filtradosSemGrupo.filter(item => grupoDoItem(item.group) === selectedGroup)),
    [filtradosSemGrupo, selectedGroup]
  );

  const groupStats = useMemo(() => {
    const stats: Record<GrupoDoPgr, number> = {
      'FÍSICO': 0,
      'QUÍMICO': 0,
      'BIOLÓGICO': 0,
      'ERGONÔMICO': 0,
      'ACIDENTES': 0,
      'OUTROS': 0
    };
    filtradosSemGrupo.forEach(r => { stats[grupoDoItem(r.group)]++; });
    return stats;
  }, [filtradosSemGrupo]);

  const totais = useMemo(() => {
    const t = { total: catalogo.length, ativos: 0, inativos: 0, CURADO: 0, LISTAGEM: 0, USUARIO: 0 };
    catalogo.forEach(item => {
      if (estaAtivo(item)) t.ativos++; else t.inativos++;
      t[origemDoItem(item)]++;
    });
    return t;
  }, [catalogo]);

  // Filtro novo, pagina nova: "mostrar mais" vale para a lista que esta na tela.
  useEffect(() => {
    setQuantosMostrar(TAMANHO_DA_PAGINA);
  }, [buscaAdiada, selectedGroup, evaluationTypeFilter, originFilter, statusFilter]);

  const visiveis = filteredRisks.slice(0, quantosMostrar);
  const restantes = filteredRisks.length - visiveis.length;

  const filtrosAlterados =
    searchTerm !== '' || selectedGroup !== 'ALL' || evaluationTypeFilter !== 'ALL' ||
    originFilter !== 'ALL' || statusFilter !== 'ACTIVE';

  const limparFiltros = () => {
    setSearchTerm('');
    setSelectedGroup('ALL');
    setEvaluationTypeFilter('ALL');
    setOriginFilter('ALL');
    setStatusFilter('ACTIVE');
  };

  // -------------------------------------------------------------------------
  // Selecao para aplicar
  // -------------------------------------------------------------------------

  const selecionados = useMemo(() => new Set(selectedRiskIdsToApply), [selectedRiskIdsToApply]);

  // Item desativado ou excluido sai da selecao: nao se aplica a um GHE o que
  // nao esta mais disponivel no catalogo.
  useEffect(() => {
    const ativos = new Set(catalogo.filter(estaAtivo).map(r => r.id));
    setSelectedRiskIdsToApply(prev => {
      const restam = prev.filter(id => ativos.has(id));
      return restam.length === prev.length ? prev : restam;
    });
  }, [catalogo]);

  const riscosSelecionados = useMemo(
    () => catalogo.filter(r => selecionados.has(r.id) && estaAtivo(r)),
    [catalogo, selecionados]
  );

  const selecionaveisFiltrados = useMemo(() => filteredRisks.filter(estaAtivo), [filteredRisks]);
  const todosFiltradosSelecionados =
    selecionaveisFiltrados.length > 0 && selecionaveisFiltrados.every(r => selecionados.has(r.id));

  const toggleSelectAllRisks = () => {
    const ids = new Set(selecionaveisFiltrados.map(r => r.id));
    if (todosFiltradosSelecionados) {
      setSelectedRiskIdsToApply(prev => prev.filter(id => !ids.has(id)));
    } else {
      setSelectedRiskIdsToApply(prev => [...prev, ...[...ids].filter(id => !prev.includes(id))]);
    }
  };

  const toggleSelectRisk = (item: OccupationalRiskCatalogItem) => {
    if (!estaAtivo(item)) return;
    setSelectedRiskIdsToApply(prev =>
      prev.includes(item.id) ? prev.filter(rId => rId !== item.id) : [...prev, item.id]
    );
  };

  const resultadosNoModal = useMemo(() => {
    const termos = termosDaBusca(buscaNoModalAdiada);
    if (termos.length === 0) return { itens: [] as OccupationalRiskCatalogItem[], total: 0, buscou: false };
    const achados = catalogo.filter(r => estaAtivo(r) && casaComBusca(r, termos));
    return { itens: achados.slice(0, LIMITE_DA_BUSCA_NO_MODAL), total: achados.length, buscou: true };
  }, [catalogo, casaComBusca, buscaNoModalAdiada]);

  /**
   * Codigos da Tabela 24 usados por mais de um agente ATIVO, com os nomes.
   *
   * Fica de fora o 09.01.001: ele declara a AUSENCIA de agente nocivo, e na
   * listagem e o codigo de 49 riscos ergonomicos e de acidente. Repeti-lo e o
   * esperado, e o selo apareceria em quase todos eles. O caso que o aviso
   * existe para mostrar continua: ruido continuo e ruido de impacto, ambos
   * 02.01.001.
   */
  const codigosRepetidos = useMemo(() => {
    const mapa = new Map<string, string[]>();
    codigosDuplicados(
      catalogo.filter(
        r => estaAtivo(r) && formatoDoCodigoTabela24(r.code_table_24).codigo !== CODIGO_AUSENCIA_DE_RISCO
      )
    ).forEach(d => mapa.set(d.codigo, d.nomes));
    return mapa;
  }, [catalogo]);

  // -------------------------------------------------------------------------
  // Formulario
  // -------------------------------------------------------------------------

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setForm(FORMULARIO_VAZIO);
    setFormInicial(FORMULARIO_VAZIO);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: OccupationalRiskCatalogItem) => {
    const carregado = formularioDoItem(item);
    setEditingItem(item);
    setForm(carregado);
    setFormInicial(carregado);
    setIsModalOpen(true);
  };

  const unidadeDoFormulario = normalizarUnidade(form.measurement_unit_standard);
  const limiteDoFormulario = lerNumero(form.tolerance_limit_number);
  const nivelDoFormulario = lerNumero(form.action_level_number);
  // A mesma matriz que o risco aplicado usa (camposDoRiscoAPartirDoCatalogo):
  // com um so dos dois, o risco nasce nao classificado.
  const classificacaoNoFormulario = classificarRisco(Number(form.default_severity), Number(form.default_probability));
  const soUmaGradacao = !classificacaoNoFormulario && (!!form.default_severity || !!form.default_probability);

  const handleSaveRisk = (e: React.FormEvent) => {
    e.preventDefault();

    // Antes: `return` em silencio. O usuario clicava em salvar, nada acontecia
    // e nenhuma mensagem aparecia.
    const nome = form.agent_name.trim();
    if (!nome) {
      alert('Informe o nome do agente de risco.');
      return;
    }
    if (limiteDoFormulario === 'INVALIDO' || nivelDoFormulario === 'INVALIDO') {
      alert(
        `${limiteDoFormulario === 'INVALIDO' ? 'Limite de tolerância' : 'Nível de ação'}: informe um número ` +
        'maior que zero, com vírgula ou ponto decimal e sem separador de milhar (ex.: 0,016 ou 1480).\n\n' +
        'Quando o agente não tem valor fixo - calor, ruído de impacto, sílica -, deixe o número vazio e ' +
        'descreva o limite no texto.'
      );
      return;
    }

    // Codigo VAZIO e valido: o risco entra no PGR sem ser agente nocivo do
    // Anexo IV. So se confere o que foi preenchido.
    const codigoInformado = (form.risk_code_table_24 || '').trim();
    if (codigoInformado && !codigoExisteNaTabela24(codigoInformado)) {
      alert(
        formatoDoCodigoTabela24(codigoInformado).motivo ||
        `O código ${codigoInformado} não consta na Tabela 24. Escolha o agente na lista, ou ` +
        'deixe vazio se este risco não enseja aposentadoria especial.'
      );
      return;
    }

    // Repetir um codigo nao e necessariamente erro - "Ruido continuo" e "Ruido
    // de impacto" sao dois agentes do PGR e um unico codigo (02.01.001). Por
    // isso avisa e deixa decidir, em vez de bloquear.
    //
    // Com centenas de itens o aviso so vale quando o codigo foi ESCOLHIDO
    // agora: salvar a edicao de um item que ja tinha o codigo perguntava a
    // mesma coisa toda vez. Nao conta item desativado, nem o 09.01.001, que e
    // o codigo da ausencia de agente nocivo e se repete por natureza.
    const codigoNormalizado = formatoDoCodigoTabela24(codigoInformado).codigo;
    const codigoEscolhidoAgora =
      !editingItem || formatoDoCodigoTabela24(editingItem.code_table_24).codigo !== codigoNormalizado;
    if (codigoNormalizado && codigoEscolhidoAgora && codigoNormalizado !== CODIGO_AUSENCIA_DE_RISCO) {
      const jaUsadoEm = catalogo.filter(
        r =>
          r.id !== editingItem?.id &&
          estaAtivo(r) &&
          formatoDoCodigoTabela24(r.code_table_24).codigo === codigoNormalizado
      );
      if (jaUsadoEm.length > 0) {
        const segue = confirm(
          `O código ${codigoNormalizado} já está em ${nomesResumidos(jaUsadoEm.map(r => r.name))}.\n\n` +
          'Isso é correto quando dois agentes do PGR têm o mesmo enquadramento no Anexo IV ' +
          '(por exemplo ruído contínuo e ruído de impacto, ambos 02.01.001). Se for o mesmo ' +
          'agente, edite o item que já existe em vez de criar outro.\n\nDeseja continuar?'
        );
        if (!segue) return;
      }
    }

    const examesInvalidos = form.suggested_exams.filter(ex => !codigoExisteNaTabela27(ex.codigo));
    if (examesInvalidos.length > 0) {
      alert(`${examesInvalidos.length} exame(s) sugerido(s) com código fora da Tabela 27.`);
      return;
    }

    // Classificacao e enquadramento: "Nao informado" vira undefined e nao e
    // gravado; na edicao, so o que o usuario mudou (lib/catalogoDeRiscos.ts).
    const valoresClassificacao = valoresDaClassificacao(form);
    const mudancasClassificacao = editingItem ? mudancasDaClassificacao(editingItem, formInicial, form) : {};
    // GFIP e aposentadoria que se contradizem pelos rotulos do proprio GFIP. Na
    // edicao so se confere quando um dos dois mudou: item que ja vinha assim
    // nao trava a correcao de outro campo.
    const mexeuNoEnquadramento =
      !editingItem ||
      form.gfip_code_suggested !== formInicial.gfip_code_suggested ||
      form.special_retirement_eligible !== formInicial.special_retirement_eligible;
    const conflito = mexeuNoEnquadramento
      ? conflitoGfipAposentadoria(editingItem ? { ...editingItem, ...mudancasClassificacao } : valoresClassificacao)
      : null;
    if (conflito) {
      alert(conflito);
      return;
    }

    // Com numero, o texto sai de textoDoLimite - a mesma funcao que escreve o
    // texto dos itens da listagem -, para numero e texto nao divergirem. Sem
    // numero, vale o texto digitado.
    const unidade = unidadeDoFormulario;
    const limite = limiteDoFormulario;
    const nivel = nivelDoFormulario;
    const textoDoLimiteSalvo =
      limite !== undefined ? textoDoLimite(limite, unidade, form.tolerance_limit_is_ceiling) : opcional(form.tolerance_limit_nr15);
    const textoDoNivelSalvo = nivel !== undefined ? textoDoLimite(nivel, unidade) : opcional(form.action_level_nr09);

    if (!editingItem) {
      // Item novo leva so o que foi preenchido. Antes ia com severidade 3,
      // probabilidade 3, GFIP '00', "sem aposentadoria especial", "sem
      // insalubridade", medicao sugerida 0 e os textos de fachada - nenhum
      // deles informado por ninguem, e todos copiados para o risco do cliente
      // quando o item era aplicado a um GHE.
      const novo: Omit<OccupationalRiskCatalogItem, 'id' | 'created_at' | 'updated_at'> = {
        name: nome,
        group: form.group,
        evaluation_type: form.evaluation_type_standard,
        // Campo obrigatorio no tipo: sem meio informado, fica vazio.
        propagation_paths: opcional(form.propagation) || '',
        recommended_epis: lerEpis(form.suggested_epis_text),
        suggested_exams_pcmso: montarExames(form.suggested_exams),
        status: 'ACTIVE',
        is_custom: true
      };
      const preenchidos: Partial<OccupationalRiskCatalogItem> = {
        code_table_24: codigoNormalizado || undefined,
        standard_unit: unidade,
        tolerance_limit_value: limite,
        tolerance_limit_is_ceiling: form.tolerance_limit_is_ceiling || undefined,
        tolerance_limit_reference: textoDoLimiteSalvo,
        action_level_value: nivel,
        action_level_reference: textoDoNivelSalvo,
        health_effects: opcional(form.harmful_effects),
        regulatory_norm_reference: opcional(form.regulatory_norm_reference),
        generating_sources: opcional(form.suggested_source),
        recommended_epcs: opcional(form.suggested_controls_summary),
        ...valoresClassificacao
      };
      Object.entries(preenchidos).forEach(([campo, valor]) => {
        if (valor !== undefined) (novo as any)[campo] = valor;
      });
      addOccupationalRiskCatalogItem(novo);
      setIsModalOpen(false);
      return;
    }

    // Edicao: grava so o que mudou. O payload antigo era o item inteiro
    // reescrito - severidade 3, probabilidade 3, GFIP '00', aposentadoria
    // especial, insalubridade e periculosidade em false, status ACTIVE - e
    // editar o nome do "Ruído Contínuo" curado apagava o GFIP 04 e a
    // insalubridade de 20% dele, e reativava item desativado.
    const item = editingItem;
    const mudancas: Partial<OccupationalRiskCatalogItem> = {};
    const escrever = <K extends keyof OccupationalRiskCatalogItem>(campo: K, valor: OccupationalRiskCatalogItem[K]) => {
      if (!mesmoValor(item[campo], valor)) mudancas[campo] = valor;
    };
    const mudou = (...campos: Array<keyof FormularioDoRisco>) =>
      campos.some(c => JSON.stringify(form[c]) !== JSON.stringify(formInicial[c]));
    // Texto de fachada que o formulario antigo gravou sai mesmo sem o campo
    // ter sido tocado: ele nunca foi dado.
    const limparFachada = <K extends keyof OccupationalRiskCatalogItem>(campo: K, semValor?: OccupationalRiskCatalogItem[K]) => {
      if (ehFachada(item[campo])) mudancas[campo] = semValor;
    };

    if (mudou('risk_code_table_24')) escrever('code_table_24', codigoNormalizado || undefined);
    if (mudou('agent_name')) escrever('name', nome);
    if (mudou('group')) escrever('group', form.group);
    if (mudou('evaluation_type_standard')) escrever('evaluation_type', form.evaluation_type_standard);
    if (mudou('measurement_unit_standard')) escrever('standard_unit', unidade);

    // A unidade entra no texto gerado: mudou a unidade, o texto e refeito.
    if (mudou('measurement_unit_standard', 'tolerance_limit_number', 'tolerance_limit_is_ceiling', 'tolerance_limit_nr15')) {
      escrever('tolerance_limit_value', limite);
      escrever(
        'tolerance_limit_is_ceiling',
        form.tolerance_limit_is_ceiling ? true : item.tolerance_limit_is_ceiling === false ? false : undefined
      );
      escrever('tolerance_limit_reference', textoDoLimiteSalvo);
    }
    if (mudou('measurement_unit_standard', 'action_level_number', 'action_level_nr09')) {
      escrever('action_level_value', nivel);
      escrever('action_level_reference', textoDoNivelSalvo);
    }

    if (mudou('harmful_effects')) escrever('health_effects', opcional(form.harmful_effects));
    else limparFachada('health_effects');
    if (mudou('regulatory_norm_reference')) escrever('regulatory_norm_reference', opcional(form.regulatory_norm_reference));

    // Meio, fonte e controle tem dois campos no item (o do catalogo e o
    // "sugerido" do formulario antigo). O valor editado vai para o principal
    // e, se o item ja usava o segundo, para ele tambem - senao o valor velho
    // continuaria valendo, porque o contexto le o sugerido primeiro.
    if (mudou('propagation')) {
      escrever('propagation_paths', opcional(form.propagation) || '');
      if (item.suggested_medium !== undefined) escrever('suggested_medium', opcional(form.propagation));
    } else {
      limparFachada('propagation_paths', '');
      limparFachada('suggested_medium');
    }
    if (mudou('suggested_source')) {
      escrever('generating_sources', opcional(form.suggested_source));
      if (item.suggested_source !== undefined) escrever('suggested_source', opcional(form.suggested_source));
    } else {
      limparFachada('generating_sources');
      limparFachada('suggested_source');
    }
    if (mudou('suggested_controls_summary')) {
      escrever('recommended_epcs', opcional(form.suggested_controls_summary));
      if (item.suggested_controls_summary !== undefined) {
        escrever('suggested_controls_summary', opcional(form.suggested_controls_summary));
      }
    } else {
      limparFachada('recommended_epcs');
      limparFachada('suggested_controls_summary');
    }

    if (mudou('suggested_epis_text')) {
      escrever('recommended_epis', lerEpis(form.suggested_epis_text, item.recommended_epis || []));
    } else if ((item.recommended_epis || []).length !== episUteis(item).length) {
      // O "EPI Adequado" sem CA que o formulario antigo punha quando nao
      // havia EPI nenhum.
      mudancas.recommended_epis = episUteis(item);
    }
    if (mudou('suggested_exams')) {
      escrever('suggested_exams_pcmso', montarExames(form.suggested_exams, item.suggested_exams_pcmso || []));
    }

    // O formulario antigo gravava medicao sugerida 0 em todo item criado nele,
    // sem campo na tela para isso. O contexto a copia como valor medido "0"
    // para o risco aplicado. Nao e medicao: sai.
    if (item.suggested_measured_value === 0) mudancas.suggested_measured_value = undefined;

    Object.assign(mudancas, mudancasClassificacao);

    if (Object.keys(mudancas).length > 0) {
      updateOccupationalRiskCatalogItem(item.id, mudancas);
    }
    setIsModalOpen(false);
  };

  // -------------------------------------------------------------------------
  // Situacao do item e restauracao
  // -------------------------------------------------------------------------

  const handleAlternarSituacao = (item: OccupationalRiskCatalogItem) => {
    updateOccupationalRiskCatalogItem(item.id, { status: estaAtivo(item) ? 'INACTIVE' : 'ACTIVE' });
  };

  const handleExcluir = (item: OccupationalRiskCatalogItem) => {
    // Item do sistema nao chega aqui (o botao nem aparece): o contexto o
    // desativaria em vez de excluir, e o da listagem a fusao do carregamento
    // traria de volta. Prometer "excluir" seria falso.
    if (ehItemDoSistema(item)) return;
    const segue = confirm(
      `Excluir "${item.name}" do catálogo?\n\n` +
      'Este item foi criado aqui, e a exclusão não pode ser desfeita. Para só tirá-lo das ' +
      'listas, use Desativar.\n\nOs riscos já aplicados a GHEs a partir dele não mudam.'
    );
    if (segue) deleteOccupationalRiskCatalogItem(item.id);
  };

  const handleRestaurarPadrao = () => {
    // O que o contexto faz (restaurarItensDoSistema, lib/catalogoDeRiscos.ts):
    // so os itens do sistema voltam a versao do codigo. Antes o catalogo
    // inteiro era trocado e os itens criados aqui sumiam; o texto tem de dizer
    // exatamente o que muda e o que fica.
    const criadosAqui = totais.USUARIO;
    const segue = confirm(
      'Restaurar os itens do sistema?\n\n' +
      'Os itens curados e os da listagem voltam à versão do sistema: as edições e desativações ' +
      'feitas neles são desfeitas, e os curados que tinham sido excluídos voltam. Os itens da ' +
      'listagem que repetem um curado continuam inativos, como vêm do sistema.\n\n' +
      (criadosAqui > 0
        ? `Os ${criadosAqui} item(ns) criado(s) aqui não mudam.`
        : 'Os itens criados aqui não mudam.') +
      '\n\nOs riscos já aplicados aos GHEs não mudam.'
    );
    if (segue) resetOccupationalRisksCatalogToDefault();
  };

  // -------------------------------------------------------------------------
  // Aplicacao a GHE / cargo / setor
  // -------------------------------------------------------------------------

  const handleOpenApplyModal = (singleRiskId?: string) => {
    if (singleRiskId) {
      setSelectedRiskIdsToApply([singleRiskId]);
    }
    // Sem selecao o modal abre vazio, com a busca. Antes ele marcava sozinho
    // os dois primeiros itens da lista, que o usuario nao tinha escolhido.
    const client = clients.find(c => c.id === applyClientId) || clients[0];
    if (client) {
      const clientGhes = ghes.filter(g => g.client_id === client.id);
      setSelectedTargetGheIds(clientGhes.map(g => g.id));
    }
    setBuscaNoModal('');
    setApplyFeedback(null);
    setIsApplyModalOpen(true);
  };

  const handleExecuteApply = () => {
    const ids = riscosSelecionados.filter(estaAtivo).map(r => r.id);
    if (ids.length === 0) {
      alert('Selecione ao menos um risco ativo do catálogo para aplicar.');
      return;
    }
    if (situacaoAplicada.length === 0) {
      alert(
        'Informe a situação operacional dos riscos que serão aplicados.\n\n' +
        'Rotineira (R), não rotineira (NR) ou emergência (E) — alínea "b" do ' +
        'subitem 1.5.7.3.2 da NR-01.'
      );
      return;
    }
    if (
      ids.length >= LOTE_GRANDE &&
      !confirm(
        `Aplicar ${ids.length} riscos de uma vez?\n\n` +
        'Cada um vira um risco no inventário de cada GHE de destino' +
        (includeSuggestedExams ? ', com os exames sugeridos' : '') +
        '. Confira a seleção antes de continuar.'
      )
    ) {
      return;
    }

    const result = applyRisksToTargets({
      client_id: applyClientId,
      risk_catalog_ids: ids,
      target_mode: applyTargetMode,
      target_ghe_ids: selectedTargetGheIds,
      target_job_ids: selectedTargetJobIds,
      target_sector_ids: selectedTargetSectorIds,
      include_suggested_exams: includeSuggestedExams,
      custom_risk_data: {
        operational_situation: situacaoAplicada,
        operational_situation_note: situacaoNota.trim() || undefined
      }
    });

    setApplyFeedback({
      count: result.created_risks_count,
      examsCount: result.created_exams_count,
      message: result.message
    });
  };

  const clientGhesForModal = ghes.filter(g => g.client_id === applyClientId);
  const clientJobsForModal = hierarchyJobs.filter(j => hierarchySectors.some(s => s.id === j.sector_id && s.client_id === applyClientId));
  const clientSectorsForModal = hierarchySectors.filter(s => s.client_id === applyClientId);
  const selecionadosSemExame = riscosSelecionados.filter(r => (r.suggested_exams_pcmso || []).length === 0).length;

  // -------------------------------------------------------------------------
  // Cartao do item
  // -------------------------------------------------------------------------

  const renderItem = (item: OccupationalRiskCatalogItem) => {
    const ativo = estaAtivo(item);
    const origem = origemDoItem(item);
    // A mesma regra que o contexto usa para decidir entre excluir e desativar.
    const doSistema = ehItemDoSistema(item);
    const isSelected = ativo && selecionados.has(item.id);
    const codigoBruto = String(item.code_table_24 || '').trim();
    const codigo = formatoDoCodigoTabela24(codigoBruto).codigo;
    const agenteOficial = consultarAgente(codigoBruto);
    const ausencia = codigo === CODIGO_AUSENCIA_DE_RISCO;
    const repetidoCom = ativo && codigo ? codigosRepetidos.get(codigo) : undefined;
    const limite = limiteDoItem(item);
    const nivel = nivelDeAcaoDoItem(item);
    const meio = meioDoItem(item);
    const fonte = fonteDoItem(item);
    const unidade = textoUtil(item.standard_unit);
    const efeito = textoUtil(item.health_effects);
    const norma = textoUtil(item.regulatory_norm_reference);
    const classificacaoDoEfeito = textoUtil(item.effect_classification);
    const epis = episUteis(item);
    const exames = item.suggested_exams_pcmso || [];
    // Uma linha discreta no lugar de tres caixas vazias: diz o que falta
    // sem fingir que ha conteudo.
    const naoInformados = [
      !efeito && 'danos à saúde',
      !fonte && 'fonte geradora',
      !controleDoItem(item) && 'medidas de controle'
    ].filter(Boolean) as string[];
    const temDetalhes = !!(unidade || limite || nivel || meio || fonte || classificacaoDoEfeito);
    // So o que o item tem: os da listagem nao trazem nenhum destes campos.
    const enquadramento = enquadramentoDoItem(item);
    const duplicidade = textoDaDuplicidade(item, id => itemPorId.get(id));

    return (
      <div
        key={item.id}
        className={`p-5 transition-colors hover:bg-slate-800/60 ${
          isSelected ? 'bg-indigo-500/20 border-l-4 border-l-indigo-600' : ''
        } ${ativo ? '' : 'opacity-60'}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          {/* Checkbox + Main Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              onClick={() => toggleSelectRisk(item)}
              disabled={!ativo}
              className="mt-1 flex-shrink-0 text-slate-400 hover:text-indigo-400 disabled:cursor-not-allowed disabled:hover:text-slate-400"
              title={
                !ativo
                  ? 'Item inativo: reative para aplicar'
                  : isSelected ? 'Desmarcar risco' : 'Selecionar risco para aplicar'
              }
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-indigo-400" />
              ) : (
                <Square className={`w-5 h-5 ${ativo ? 'text-slate-300' : 'text-slate-600'}`} />
              )}
            </button>

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getGroupBadgeColor(item.group)}`}>
                  {String(item.group || 'sem grupo').replace(/_/g, ' ')}
                </span>
                {/* Sem codigo e o estado NORMAL para risco
                    ergonomico e de acidente: eles entram no PGR mas
                    nao constam do Anexo IV. Por isso o selo e neutro,
                    nao um alerta. O 09.01.001 diz a mesma coisa com
                    codigo: ausencia de agente nocivo. */}
                {codigoBruto ? (
                  <span
                    className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-800"
                    title={agenteOficial?.nome}
                  >
                    eSocial {codigo || codigoBruto}
                    {ausencia && <span className="font-sans font-medium text-slate-400"> · ausência de agente nocivo</span>}
                  </span>
                ) : (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-950 text-slate-500 border border-slate-800"
                    title="Risco do PGR sem agente nocivo correspondente no Anexo IV do Decreto 3.048/1999. Não é declarado no S-2240."
                  >
                    sem agente do Anexo IV
                  </span>
                )}
                {/* Codigo preenchido que NAO existe na tabela e erro
                    de verdade: era assim que "Ruído" carregava
                    01.01.001, que é Arsênio. */}
                {!!codigoBruto && !agenteOficial && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30"
                    title={formatoDoCodigoTabela24(codigoBruto).motivo || 'Este código não consta na Tabela 24.'}
                  >
                    código inexistente
                  </span>
                )}
                {repetidoCom && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    title={`Mesmo enquadramento de: ${repetidoCom.join('; ')}`}
                  >
                    enquadramento compartilhado
                  </span>
                )}
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${SELO_DA_ORIGEM[origem].classe}`}
                  title={SELO_DA_ORIGEM[origem].ajuda}
                >
                  {SELO_DA_ORIGEM[origem].rotulo}
                </span>
                {!ativo && (
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded border bg-slate-950 text-slate-400 border-slate-700"
                    title="Desativado: não aparece para seleção nem é aplicado a GHEs. Os riscos já aplicados não mudam."
                  >
                    Inativo
                  </span>
                )}
                {norma && (
                  <span className="text-xs font-semibold text-slate-400">
                    Ref: {norma}
                  </span>
                )}
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  item.evaluation_type === 'QUANTITATIVA'
                    ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  Avaliação {item.evaluation_type}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-100">
                {item.name}
              </h3>

              {/* Item da listagem que repete um curado: vem desativado do
                  sistema, e a ficha diz qual curado ja representa o risco. */}
              {duplicidade && (
                <p
                  className="text-[11px] font-semibold text-amber-300"
                  title="Item da listagem que repete um item curado. Vem desativado para o seletor não oferecer o mesmo risco duas vezes; pode ser reativado."
                >
                  {duplicidade}
                </p>
              )}

              {/* Denominação oficial do agente, quando difere do nome
                  usado no catálogo: é ela que vale no S-2240. */}
              {agenteOficial && !ausencia && paraBusca(agenteOficial.nome).trim() !== paraBusca(item.name).trim() && (
                <p className="text-xs text-slate-500">
                  Agente no eSocial:{' '}
                  <span className="text-slate-300">
                    {agenteOficial.nome}
                  </span>
                </p>
              )}

              {/* Por que não há código, ou qual escolher quando há
                  mais de um candidato. Na listagem a nota é a mesma em
                  dezenas de itens (o 09.01.001 retirado): vai discreta, para
                  a caixa de alerta não perder o sentido. */}
              {textoUtil(item.esocial_enquadramento_nota) && (
                origem === 'LISTAGEM' ? (
                  <p className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-400">Enquadramento no eSocial:</span>{' '}
                    {item.esocial_enquadramento_nota}
                  </p>
                ) : (
                  <p className="text-xs text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded p-2">
                    <span className="font-semibold">Enquadramento no eSocial:</span>{' '}
                    {item.esocial_enquadramento_nota}
                  </p>
                )
              )}

              {efeito && (
                <p className="text-sm text-slate-400">
                  <span className="font-semibold text-slate-300">Danos Prováveis à Saúde:</span> {efeito}
                </p>
              )}

              {/* Characterization Details Grid */}
              {temDetalhes && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 text-xs">
                  {unidade && (
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="font-semibold text-slate-500 block">Unidade:</span>
                      <span className="font-medium text-slate-200">{unidade}</span>
                    </div>
                  )}

                  {limite && (
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="font-semibold text-slate-500 flex items-center gap-1.5 flex-wrap">
                        Limite de tolerância:
                        {item.tolerance_limit_is_ceiling && (
                          <span
                            className="px-1.5 py-px rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            title="Valor teto: não pode ser ultrapassado em momento algum da jornada."
                          >
                            valor teto
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-slate-200">{limite}</span>
                    </div>
                  )}

                  {nivel && (
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="font-semibold text-slate-500 block">Nível de ação:</span>
                      <span className="font-medium text-slate-200">{nivel}</span>
                    </div>
                  )}

                  {meio && (
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="font-semibold text-slate-500 block">Meio de propagação:</span>
                      <span className="font-medium text-slate-200">{meio}</span>
                    </div>
                  )}

                  {fonte && (
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="font-semibold text-slate-500 block">Fonte Típica:</span>
                      <span className="font-medium text-slate-200 truncate block" title={fonte}>
                        {fonte}
                      </span>
                    </div>
                  )}

                  {classificacaoDoEfeito && (
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="font-semibold text-slate-500 block">Classificação do efeito:</span>
                      <span className="font-medium text-slate-200">{classificacaoDoEfeito}</span>
                    </div>
                  )}
                </div>
              )}

              {enquadramento.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  {enquadramento.map(linha => (
                    <div key={linha.rotulo} className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="font-semibold text-slate-500 block">{linha.rotulo}:</span>
                      <span className="font-medium text-slate-200">{linha.valor}</span>
                      {linha.detalhe && (
                        <span className="text-[11px] text-slate-400 block mt-0.5">{linha.detalhe}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {naoInformados.length > 0 && (
                <p className="text-[11px] text-slate-500">
                  Não informado: {naoInformados.join(', ')}.
                </p>
              )}

              {/* Suggested EPIs & PCMSO Exams tags */}
              {(epis.length > 0 || exames.length > 0) && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {epis.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                        <HardHat className="w-3.5 h-3.5" /> EPIs Sugeridos:
                      </span>
                      {epis.map((epi, idx) => (
                        <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {epi.name}{epi.ca_example ? ` (CA ${epi.ca_example})` : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {exames.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-blue-300 flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5" /> Exames PCMSO (Tab 27):
                      </span>
                      {exames.map((ex, idx) => (
                        <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          {ex.exam_name} [{ex.exam_code}] ({ex.periodicity_months}m)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions on this item */}
          <div className="flex items-center gap-1.5 self-end lg:self-start flex-shrink-0">
            <button
              id={`btn-apply-single-risk-${item.id}`}
              onClick={() => handleOpenApplyModal(item.id)}
              disabled={!ativo}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={ativo ? 'Aplicar este risco a um GHE ou Árvore de Cargos' : 'Item inativo: reative para aplicar'}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Aplicar
            </button>

            <button
              id={`btn-edit-risk-${item.id}`}
              onClick={() => handleOpenEditModal(item)}
              className="p-1.5 text-slate-500 hover:text-emerald-300 hover:bg-emerald-500/15 rounded-lg border border-slate-800 transition-colors"
              title="Editar caracterização do risco"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              id={`btn-toggle-status-risk-${item.id}`}
              onClick={() => handleAlternarSituacao(item)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                ativo
                  ? 'text-slate-400 border-slate-800 hover:text-amber-300 hover:bg-amber-500/15'
                  : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/20'
              }`}
              title={
                ativo
                  ? 'Desativar: o item sai das listas de seleção e não é aplicado a GHEs. Os riscos já aplicados não mudam, e o item pode ser reativado.'
                  : 'Reativar: o item volta a poder ser selecionado e aplicado.'
              }
            >
              {ativo ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
              {ativo ? 'Desativar' : 'Reativar'}
            </button>

            {/* Exclusao so para item criado aqui. Item do sistema o contexto
                desativa em vez de excluir (lib/catalogoDeRiscos.ts); um botao
                "excluir" nele seria uma promessa falsa. */}
            {!doSistema && (
              <button
                id={`btn-delete-risk-${item.id}`}
                onClick={() => handleExcluir(item)}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-lg border border-slate-800 transition-colors"
                title="Excluir este item criado aqui (não pode ser desfeito)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const origemDoItemEmEdicao = editingItem ? origemDoItem(editingItem) : null;

  return (
    <div id="occupational-risks-catalog-view" className="space-y-6 pb-12">
      {/* Header with Stats & Actions */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Tabela 24 do eSocial & NR-01/09/15/17
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                {totais.ativos} ativos{totais.inativos > 0 ? ` · ${totais.inativos} inativos` : ''}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-950 text-slate-400 border border-slate-800">
                {totais.CURADO} curados · {totais.LISTAGEM} da listagem · {totais.USUARIO} criados aqui
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-emerald-400" />
              Catálogo Global de Riscos Ocupacionais
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl mt-1">
              Agentes de risco para o inventário do PGR. Os itens curados trazem fonte geradora, danos à saúde,
              EPI e exames sugeridos; os importados da listagem trazem nome, grupo, meio de propagação, unidade,
              limites e código da Tabela 24, com os campos descritivos por preencher. Qualquer item ativo pode ser
              aplicado a um GHE, cargo ou árvore de setores.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-reset-catalog-defaults"
              onClick={handleRestaurarPadrao}
              title="Volta os itens do sistema (curados e da listagem) à versão do sistema, desfazendo edições e desativações. Os itens criados aqui não mudam. Pede confirmação."
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar padrão
            </button>

            <button
              id="btn-apply-selected-risks"
              onClick={() => handleOpenApplyModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
              {riscosSelecionados.length > 0
                ? `Aplicar Selecionados (${riscosSelecionados.length}) em GHE / Cargos`
                : 'Aplicar em GHE / Cargos'}
            </button>

            <button
              id="btn-add-catalog-risk"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Risco no Catálogo
            </button>
          </div>
        </div>

        {/* Group Cards Overview — contam o que passa pelos demais filtros */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800">
          {CARTOES_DE_GRUPO.map(({ grupo, rotulo, exemplo, Icone, marcado, desmarcado, texto, icone }) => (
            <button
              key={grupo}
              onClick={() => setSelectedGroup(selectedGroup === grupo ? 'ALL' : grupo)}
              className={`p-3 rounded-lg border text-left transition-all ${selectedGroup === grupo ? marcado : desmarcado}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wide ${texto}`}>{rotulo}</span>
                <Icone className={`w-4 h-4 ${icone}`} />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-slate-100">{groupStats[grupo]}</span>
                <span className="text-xs text-slate-500">agentes</span>
              </div>
              <span className={`text-[11px] block mt-0.5 ${texto}`}>{exemplo}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters Bar & Quick Search */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-occupational-risks"
            type="text"
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-950 text-slate-100 placeholder-slate-500 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Buscar por nome, código da Tabela 24 (ex.: 02.01.001), unidade (ex.: ppm, mg/m3), efeito, norma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            id="select-filter-group"
            className="px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-950 text-slate-100 placeholder-slate-500"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value as 'ALL' | GrupoDoPgr)}
          >
            <option value="ALL">Todos os Grupos</option>
            <option value="FÍSICO">Físicos (Grupo 1)</option>
            <option value="QUÍMICO">Químicos (Grupo 2)</option>
            <option value="BIOLÓGICO">Biológicos (Grupo 3)</option>
            <option value="ERGONÔMICO">Ergonômicos (Grupo 4)</option>
            <option value="ACIDENTES">Acidentes / Mecânicos (Grupo 5)</option>
            {(groupStats['OUTROS'] > 0 || selectedGroup === 'OUTROS') && (
              <option value="OUTROS">Outros / ausência de risco ({groupStats['OUTROS']})</option>
            )}
          </select>

          <select
            id="select-filter-eval-type"
            className="px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-950 text-slate-100 placeholder-slate-500"
            value={evaluationTypeFilter}
            onChange={(e) => setEvaluationTypeFilter(e.target.value)}
          >
            <option value="ALL">Todas as Avaliações</option>
            <option value="QUANTITATIVA">Quantitativa (com limites)</option>
            <option value="QUALITATIVA">Qualitativa (inspeção)</option>
          </select>

          <select
            id="select-filter-origin"
            className="px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-950 text-slate-100 placeholder-slate-500"
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value as 'ALL' | OrigemDoItem)}
          >
            <option value="ALL">Todas as origens</option>
            <option value="CURADO">Curados ({totais.CURADO})</option>
            <option value="LISTAGEM">Listagem importada ({totais.LISTAGEM})</option>
            <option value="USUARIO">Criados pelo usuário ({totais.USUARIO})</option>
          </select>

          <select
            id="select-filter-status"
            className="px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-950 text-slate-100 placeholder-slate-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FiltroDeSituacao)}
          >
            <option value="ACTIVE">Ativos ({totais.ativos})</option>
            <option value="INACTIVE">Inativos ({totais.inativos})</option>
            <option value="ALL">Ativos e inativos ({totais.total})</option>
          </select>

          <button
            id="btn-toggle-select-all"
            onClick={toggleSelectAllRisks}
            disabled={selecionaveisFiltrados.length === 0}
            className="px-3 py-2 text-xs font-semibold text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800/60 flex items-center gap-1.5 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            title="Seleciona os itens ativos que passam pelos filtros, inclusive os que ainda não foram carregados na lista"
          >
            {todosFiltradosSelecionados ? (
              <>
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                Desmarcar os {selecionaveisFiltrados.length} filtrados
              </>
            ) : (
              <>
                <Square className="w-4 h-4 text-slate-400" />
                Selecionar os {selecionaveisFiltrados.length} filtrados
              </>
            )}
          </button>

          {filtrosAlterados && (
            <button
              onClick={limparFiltros}
              className="px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15 rounded-lg"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Risks Table / Cards List */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-200">
              Inventário de Riscos Catalogados ({filteredRisks.length})
            </h2>
            {selectedGroup !== 'ALL' && (
              <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getGroupBadgeColor(selectedGroup)}`}>
                Filtrado: {selectedGroup}
              </span>
            )}
            {searchTerm !== buscaAdiada && (
              <span className="text-[11px] text-slate-500">buscando…</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{riscosSelecionados.length} item(ns) selecionado(s) para aplicação</span>
            {riscosSelecionados.length > 0 && (
              <button
                onClick={() => setSelectedRiskIdsToApply([])}
                className="font-semibold text-slate-400 hover:text-rose-300"
              >
                Limpar seleção
              </button>
            )}
          </div>
        </div>

        {filteredRisks.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-300">Nenhum risco encontrado para os filtros aplicados</p>
            <p className="text-sm text-slate-500 mt-1">
              {statusFilter === 'ACTIVE' && totais.inativos > 0
                ? 'A lista mostra só os itens ativos. Experimente incluir os inativos, limpar a busca ou cadastrar um novo agente.'
                : 'Experimente limpar a busca ou adicionar um novo agente nocivo ao catálogo.'}
            </p>
            <button
              onClick={limparFiltros}
              className="mt-4 px-4 py-2 text-xs font-semibold text-emerald-300 bg-emerald-500/15 rounded-lg hover:bg-emerald-500/20"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-800">
              {visiveis.map(renderItem)}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Mostrando {visiveis.length} de {filteredRisks.length}
                {restantes > 0 ? '. Refine pela busca ou pelos filtros, ou carregue mais.' : '.'}
              </span>
              {restantes > 0 && (
                <button
                  id="btn-show-more-risks"
                  onClick={() => setQuantosMostrar(n => n + TAMANHO_DA_PAGINA)}
                  className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  Mostrar mais {Math.min(TAMANHO_DA_PAGINA, restantes)}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Add / Edit Risk in Catalog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 w-full max-w-3xl my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-slate-100">
                  {editingItem ? 'Editar Caracterização do Risco Ocupacional' : 'Cadastrar Novo Risco no Catálogo'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRisk} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {origemDoItemEmEdicao === 'LISTAGEM' && (
                <p className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>
                    Item importado da listagem de riscos. Ela traz nome, grupo, meio de propagação, unidade,
                    avaliação, limites e código; fonte geradora, danos à saúde, medidas de controle, EPI e exames
                    vieram vazios. Preencha o que souber — o que ficar vazio continua como não informado.
                  </span>
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Era texto livre e obrigatorio. Os dois estavam errados: o
                    codigo precisa vir da tabela, e VAZIO e resposta valida -
                    risco ergonomico e de acidente nao constam do Anexo IV. */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Agente nocivo (Tabela 24 do eSocial)
                  </label>
                  <SeletorTabela24
                    codigo={form.risk_code_table_24}
                    onSelecionar={(a) => setForm({ ...form, risk_code_table_24: a.codigo })}
                    onLimpar={() => setForm({ ...form, risk_code_table_24: '' })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Grupo de Risco *
                  </label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-950 text-slate-100 placeholder-slate-500"
                    value={form.group}
                    onChange={(e) => setForm({ ...form, group: e.target.value as RiskCategoryType })}
                  >
                    {GRUPOS_DO_FORMULARIO.map(g => (
                      <option key={g.valor} value={g.valor}>{g.rotulo}</option>
                    ))}
                    {!GRUPOS_DO_FORMULARIO.some(g => g.valor === form.group) && (
                      <option value={form.group}>{String(form.group)}</option>
                    )}
                  </select>
                </div>

                {/* Opcional: os itens da listagem nao trazem norma, e exigi-la
                    obrigava a inventar uma para salvar qualquer correcao. */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Norma de referência
                  </label>
                  <input
                    type="text"
                    className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                    placeholder="Ex: NR-15 Anexo 1 / NR-09"
                    value={form.regulatory_norm_reference}
                    onChange={(e) => setForm({ ...form, regulatory_norm_reference: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Nome do Agente Nocivo / Fator de Risco *
                </label>
                <input
                  type="text"
                  className="bg-slate-950 w-full px-3 py-2 text-sm font-semibold border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                  required
                  placeholder="Ex: Ruído Contínuo ou Intermitente"
                  value={form.agent_name}
                  onChange={(e) => setForm({ ...form, agent_name: e.target.value })}
                />
              </div>

              {/* Opcional pelo mesmo motivo da norma. Vazio, o risco aplicado
                  chega ao GHE sem o campo, e o PGR o aponta como pendente. */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Danos Prováveis à Saúde (Efeitos Nocivos)
                </label>
                <textarea
                  className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                  rows={2}
                  placeholder="Ex: Perda auditiva induzida por ruído ocupacional (PAIR), zumbido, estresse, fadiga."
                  value={form.harmful_effects}
                  onChange={(e) => setForm({ ...form, harmful_effects: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Tipo de Avaliação *
                  </label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-950 text-slate-100 placeholder-slate-500"
                    value={form.evaluation_type_standard}
                    onChange={(e) => setForm({ ...form, evaluation_type_standard: e.target.value as 'QUALITATIVA' | 'QUANTITATIVA' })}
                  >
                    <option value="QUANTITATIVA">Quantitativa (Medição instrumental)</option>
                    <option value="QUALITATIVA">Qualitativa (Inspeção visual / checklist)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Unidade de Medição
                  </label>
                  <input
                    type="text"
                    className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                    placeholder="Ex: dB(A), ppm, mg/m³, m/s²"
                    value={form.measurement_unit_standard}
                    onChange={(e) => setForm({ ...form, measurement_unit_standard: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Meio de Propagação
                  </label>
                  <input
                    type="text"
                    className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                    placeholder="Ex: Ar, contato, ar e contato"
                    value={form.propagation}
                    onChange={(e) => setForm({ ...form, propagation: e.target.value })}
                  />
                </div>
              </div>

              {/* Limite e nivel de acao em numero e em texto. Com numero, o
                  texto que vai para o inventario e gerado dele, com a unidade
                  acima; sem numero (limite que depende de tabela, como calor e
                  ruido de impacto), vale o texto digitado. */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase">
                    Limite de Tolerância
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      className="bg-slate-900 w-28 px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                      inputMode="decimal"
                      placeholder="Número"
                      value={form.tolerance_limit_number}
                      onChange={(e) => setForm({ ...form, tolerance_limit_number: e.target.value })}
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.tolerance_limit_is_ceiling}
                        onChange={(e) => setForm({ ...form, tolerance_limit_is_ceiling: e.target.checked })}
                        className="rounded border-slate-700 text-rose-400 focus:ring-rose-500"
                      />
                      Valor teto
                    </label>
                  </div>
                  {limiteDoFormulario !== undefined ? (
                    <p className="text-[11px] text-slate-400">
                      {limiteDoFormulario === 'INVALIDO' ? (
                        <span className="text-rose-300">Número inválido: use vírgula ou ponto decimal, sem separador de milhar, e maior que zero.</span>
                      ) : (
                        <>
                          Texto no inventário:{' '}
                          <span className="font-semibold text-slate-200">
                            {textoDoLimite(limiteDoFormulario, unidadeDoFormulario, form.tolerance_limit_is_ceiling)}
                          </span>
                        </>
                      )}
                    </p>
                  ) : (
                    <input
                      type="text"
                      className="bg-slate-900 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                      placeholder="Sem número: descreva. Ex: Quadro 1 do Anexo 3 da NR-15"
                      value={form.tolerance_limit_nr15}
                      onChange={(e) => setForm({ ...form, tolerance_limit_nr15: e.target.value })}
                    />
                  )}
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase">
                    Nível de Ação (NR-09)
                  </label>
                  <input
                    type="text"
                    className="bg-slate-900 w-28 px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                    inputMode="decimal"
                    placeholder="Número"
                    value={form.action_level_number}
                    onChange={(e) => setForm({ ...form, action_level_number: e.target.value })}
                  />
                  {nivelDoFormulario !== undefined ? (
                    <p className="text-[11px] text-slate-400">
                      {nivelDoFormulario === 'INVALIDO' ? (
                        <span className="text-rose-300">Número inválido: use vírgula ou ponto decimal, sem separador de milhar, e maior que zero.</span>
                      ) : (
                        <>
                          Texto no inventário:{' '}
                          <span className="font-semibold text-slate-200">
                            {textoDoLimite(nivelDoFormulario, unidadeDoFormulario)}
                          </span>
                        </>
                      )}
                    </p>
                  ) : (
                    <input
                      type="text"
                      className="bg-slate-900 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                      placeholder="Sem número: descreva. Ex: limite menos 1,0 °C"
                      value={form.action_level_nr09}
                      onChange={(e) => setForm({ ...form, action_level_nr09: e.target.value })}
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Fonte Geradora Típica / Atividade
                </label>
                <input
                  type="text"
                  className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                  placeholder="Ex: Operação de maquinários rotativos, caldeiras, prensas"
                  value={form.suggested_source}
                  onChange={(e) => setForm({ ...form, suggested_source: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  EPIs Sugeridos (com CA) - Separados por vírgula
                </label>
                <input
                  type="text"
                  className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                  placeholder="Ex: Protetor Auditivo tipo Plug (CA 14235), Óculos de Proteção (CA 27500)"
                  value={form.suggested_epis_text}
                  onChange={(e) => setForm({ ...form, suggested_epis_text: e.target.value })}
                />
              </div>

              {/* Era um campo de texto no formato "Nome [Código] - 12m", e o
                  próprio exemplo ensinava códigos errados: [0295] rotulado
                  como Audiometria (0295 é Avaliação clínica) e [0296] como
                  Espirometria (0296 é Acuidade visual). Agora o exame é
                  escolhido da Tabela 27. */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-xs font-bold text-slate-300 uppercase">
                    Exames PCMSO sugeridos ({form.suggested_exams.length})
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        suggested_exams: [
                          ...form.suggested_exams,
                          { codigo: '', nome: '', periodicidade_meses: 12 },
                        ],
                      })
                    }
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Adicionar exame
                  </button>
                </div>

                {form.suggested_exams.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Nenhum exame sugerido. São recomendações que acompanham o agente ao ser
                    aplicado a um GHE — quais exames o trabalhador de fato realiza é decisão do
                    médico coordenador do PCMSO.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.suggested_exams.map((ex, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <SeletorTabela27
                            compacto
                            codigo={ex.codigo}
                            placeholder="Busque o exame na Tabela 27..."
                            onSelecionar={p => {
                              const lista = [...form.suggested_exams];
                              lista[i] = { ...lista[i], codigo: p.codigo, nome: p.nome };
                              setForm({ ...form, suggested_exams: lista });
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            className="w-14 px-2 py-1.5 text-[11px] bg-slate-950 text-slate-100 border border-slate-700 rounded-lg text-center"
                            min={1}
                            value={ex.periodicidade_meses}
                            onChange={e => {
                              const lista = [...form.suggested_exams];
                              lista[i] = {
                                ...lista[i],
                                periodicidade_meses: Number(e.target.value) || 12,
                              };
                              setForm({ ...form, suggested_exams: lista });
                            }}
                          />
                          <span className="text-[10px] text-slate-500">meses</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              suggested_exams: form.suggested_exams.filter((_, j) => j !== i),
                            })
                          }
                          className="text-slate-400 hover:text-rose-500 shrink-0"
                          title="Remover exame"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Medidas de Controle Recomendadas
                </label>
                <input
                  type="text"
                  className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                  placeholder="Ex: Enclausuramento acústico, EPC exaustão mecânica e pausas térmicas"
                  value={form.suggested_controls_summary}
                  onChange={(e) => setForm({ ...form, suggested_controls_summary: e.target.value })}
                />
              </div>

              {/* Classificacao e enquadramento. Tudo abre em "Nao informado",
                  e "Nao informado" nao grava nada (lib/catalogoDeRiscos.ts):
                  o formulario antigo gravava severidade 3, probabilidade 3,
                  GFIP '00' e "nao se aplica" sem campo na tela, e o risco
                  aplicado nascia classificado e enquadrado por ninguem. */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase">
                    Classificação e enquadramento sugeridos
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Vão para o risco quando o item é aplicado a um GHE. O que ficar em &quot;Não informado&quot; não
                    é gravado: o risco aplicado nasce sem o campo, e o inventário mostra a pendência.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Severidade (S)</label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-900 text-slate-100"
                      value={form.default_severity}
                      onChange={(e) => setForm({ ...form, default_severity: e.target.value as FormularioDoRisco['default_severity'] })}
                    >
                      <option value="">Não informado</option>
                      {PGR_SEVERIDADE.map(l => (
                        <option key={l[0]} value={l[0]}>S{l[0]} — {l[1]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Probabilidade (P)</label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-900 text-slate-100"
                      value={form.default_probability}
                      onChange={(e) => setForm({ ...form, default_probability: e.target.value as FormularioDoRisco['default_probability'] })}
                    >
                      <option value="">Não informado</option>
                      {['1', '2', '3', '4', '5'].map(n => (
                        <option key={n} value={n}>P{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {classificacaoNoFormulario ? (
                  <p className="text-[11px] text-slate-400">
                    Matriz do modelo (seção 5.6):{' '}
                    <span className="font-semibold text-slate-200">
                      S{classificacaoNoFormulario.severidade} × P{classificacaoNoFormulario.probabilidade} ={' '}
                      {classificacaoNoFormulario.score} · {classificacaoNoFormulario.rotulo}
                    </span>
                  </p>
                ) : soUmaGradacao ? (
                  <p className="text-[11px] text-amber-300">
                    Com só um dos dois, o risco aplicado nasce não classificado: a matriz precisa de severidade e
                    probabilidade.
                  </p>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Código GFIP</label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-900 text-slate-100"
                      value={form.gfip_code_suggested}
                      onChange={(e) => setForm({ ...form, gfip_code_suggested: e.target.value as FormularioDoRisco['gfip_code_suggested'] })}
                    >
                      <option value="">Não informado</option>
                      {OPCOES_DE_GFIP.map(o => (
                        <option key={o.valor} value={o.valor}>{o.rotulo}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Aposentadoria especial</label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-900 text-slate-100"
                      value={form.special_retirement_eligible}
                      onChange={(e) => setForm({ ...form, special_retirement_eligible: e.target.value as FormularioDoRisco['special_retirement_eligible'] })}
                    >
                      <option value="">Não informado</option>
                      <option value="SIM">Sim</option>
                      <option value="NAO">Não</option>
                    </select>
                  </div>
                </div>

                {/* Grau e base legal nao valem com "Nao": ficam travados e
                    vazios na tela, e nao sao gravados. Voltando a "Sim", o que
                    estava no formulario reaparece. */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Insalubridade</label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-900 text-slate-100"
                      value={form.insalubridade_applicable}
                      onChange={(e) => setForm({ ...form, insalubridade_applicable: e.target.value as FormularioDoRisco['insalubridade_applicable'] })}
                    >
                      <option value="">Não informado</option>
                      <option value="SIM">Sim, se aplica</option>
                      <option value="NAO">Não se aplica</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Grau</label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-900 text-slate-100 disabled:opacity-50"
                      disabled={form.insalubridade_applicable === 'NAO'}
                      value={form.insalubridade_applicable === 'NAO' ? '' : form.insalubridade_degree_suggested}
                      onChange={(e) => setForm({ ...form, insalubridade_degree_suggested: e.target.value as FormularioDoRisco['insalubridade_degree_suggested'] })}
                    >
                      <option value="">Não informado</option>
                      {GRAUS_DE_INSALUBRIDADE.map(g => (
                        <option key={g.valor} value={g.valor}>{g.rotulo}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Base legal</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-900 text-slate-100 placeholder-slate-500 disabled:opacity-50"
                      disabled={form.insalubridade_applicable === 'NAO'}
                      placeholder="Ex: NR-15 Anexo nº 1"
                      value={form.insalubridade_applicable === 'NAO' ? '' : form.insalubridade_legal_basis}
                      onChange={(e) => setForm({ ...form, insalubridade_legal_basis: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Periculosidade</label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-900 text-slate-100"
                      value={form.periculosidade_applicable}
                      onChange={(e) => setForm({ ...form, periculosidade_applicable: e.target.value as FormularioDoRisco['periculosidade_applicable'] })}
                    >
                      <option value="">Não informado</option>
                      <option value="SIM">Sim, se aplica</option>
                      <option value="NAO">Não se aplica</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Base legal</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-900 text-slate-100 placeholder-slate-500 disabled:opacity-50"
                      disabled={form.periculosidade_applicable === 'NAO'}
                      placeholder="Ex: NR-16 Anexo nº 4"
                      value={form.periculosidade_applicable === 'NAO' ? '' : form.periculosidade_legal_basis}
                      onChange={(e) => setForm({ ...form, periculosidade_legal_basis: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  {editingItem ? 'Salvar Alterações' : 'Cadastrar no Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Apply Selected Risks to Client GHE / Jobs / Sector Tree */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 w-full max-w-2xl my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-indigo-500/15">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-100">
                  Aplicar Riscos Ocupacionais a GHEs ou Árvore de Cargos
                </h3>
              </div>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Riscos selecionados, e busca para incluir outros. Com ~935
                  itens, o modal desenha no maximo LIMITE_DE_ETIQUETAS
                  etiquetas e LIMITE_DA_BUSCA_NO_MODAL resultados; item
                  inativo nao aparece na busca. */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300 uppercase">
                    Riscos Selecionados para Aplicação ({riscosSelecionados.length}):
                  </span>
                  {riscosSelecionados.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedRiskIdsToApply([])}
                      className="text-[11px] font-semibold text-slate-400 hover:text-rose-300"
                    >
                      Limpar seleção
                    </button>
                  )}
                </div>

                {riscosSelecionados.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Nenhum risco selecionado. Busque abaixo para incluir.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {riscosSelecionados.slice(0, LIMITE_DE_ETIQUETAS).map(r => (
                      <span key={r.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-medium">
                        {r.name}{r.code_table_24 ? ` (${r.code_table_24})` : ''}
                        <button
                          type="button"
                          onClick={() => toggleSelectRisk(r)}
                          className="text-slate-500 hover:text-rose-300"
                          title="Tirar da seleção"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {riscosSelecionados.length > LIMITE_DE_ETIQUETAS && (
                      <span className="text-xs px-1 py-0.5 text-slate-500">
                        e mais {riscosSelecionados.length - LIMITE_DE_ETIQUETAS}
                      </span>
                    )}
                  </div>
                )}

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Incluir risco: busque por nome, código da Tabela 24 ou unidade..."
                    value={buscaNoModal}
                    onChange={(e) => setBuscaNoModal(e.target.value)}
                  />
                </div>

                {resultadosNoModal.buscou && (
                  resultadosNoModal.total === 0 ? (
                    <p className="text-[11px] text-slate-500">Nenhum item ativo encontrado.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-lg p-1.5 space-y-0.5">
                      {resultadosNoModal.itens.map(r => {
                        const marcado = selecionados.has(r.id);
                        return (
                          <label key={r.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-800/60 rounded cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={() => toggleSelectRisk(r)}
                              className="rounded border-slate-700 text-indigo-400 focus:ring-indigo-500"
                            />
                            <span className="font-semibold text-slate-200 min-w-0 truncate">{r.name}</span>
                            {r.code_table_24 && (
                              <span className="text-slate-500 font-mono text-[11px] flex-shrink-0">{r.code_table_24}</span>
                            )}
                            <span className={`ml-auto flex-shrink-0 px-1.5 py-px rounded text-[10px] font-bold border ${getGroupBadgeColor(r.group)}`}>
                              {String(r.group || '').replace(/_/g, ' ')}
                            </span>
                          </label>
                        );
                      })}
                      {resultadosNoModal.total > resultadosNoModal.itens.length && (
                        <p className="text-[11px] text-slate-500 px-1.5 py-1">
                          Mostrando {resultadosNoModal.itens.length} de {resultadosNoModal.total}. Refine a busca para ver os demais.
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Target Client */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Empresa / Cliente de Destino *
                </label>
                <select
                  className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-950 text-slate-100 placeholder-slate-500"
                  value={applyClientId}
                  onChange={(e) => {
                    setApplyClientId(e.target.value);
                    const newClientGhes = ghes.filter(g => g.client_id === e.target.value);
                    setSelectedTargetGheIds(newClientGhes.map(g => g.id));
                  }}
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.trade_name || c.legal_name} ({c.document_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Modo de Aplicação de Destino *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setApplyTargetMode('GHE')}
                    className={`p-3 rounded-lg border text-left text-xs font-bold transition-all ${
                      applyTargetMode === 'GHE'
                        ? 'border-indigo-600 bg-indigo-500/15 text-indigo-300 ring-2 ring-indigo-500/40'
                        : 'border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <Layers className="w-4 h-4 mb-1 text-indigo-400" />
                    Vários / Específico GHE
                  </button>

                  <button
                    type="button"
                    onClick={() => setApplyTargetMode('JOB')}
                    className={`p-3 rounded-lg border text-left text-xs font-bold transition-all ${
                      applyTargetMode === 'JOB'
                        ? 'border-indigo-600 bg-indigo-500/15 text-indigo-300 ring-2 ring-indigo-500/40'
                        : 'border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 mb-1 text-indigo-400" />
                    Cargos Específicos
                  </button>

                  <button
                    type="button"
                    onClick={() => setApplyTargetMode('SECTOR_TREE')}
                    className={`p-3 rounded-lg border text-left text-xs font-bold transition-all ${
                      applyTargetMode === 'SECTOR_TREE'
                        ? 'border-indigo-600 bg-indigo-500/15 text-indigo-300 ring-2 ring-indigo-500/40'
                        : 'border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mb-1 text-indigo-400" />
                    Árvore de Setores / Áreas
                  </button>
                </div>
              </div>

              {/* Target Selection Lists */}
              {applyTargetMode === 'GHE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Selecione os GHEs de Destino ({selectedTargetGheIds.length} selecionados):
                  </label>
                  {clientGhesForModal.length === 0 ? (
                    <p className="text-xs text-amber-300 p-3 bg-amber-500/15 rounded-lg">
                      Nenhum GHE cadastrado para este cliente. Cadastre ou vincule um GHE antes de aplicar.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-800 rounded-lg p-2">
                      {clientGhesForModal.map(g => {
                        const checked = selectedTargetGheIds.includes(g.id);
                        return (
                          <label key={g.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-800/60 rounded cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setSelectedTargetGheIds(prev => prev.filter(id => id !== g.id));
                                } else {
                                  setSelectedTargetGheIds(prev => [...prev, g.id]);
                                }
                              }}
                              className="rounded border-slate-700 text-indigo-400 focus:ring-indigo-500"
                            />
                            <span className="font-semibold text-slate-200">{g.name}</span>
                            <span className="text-slate-500 font-mono text-[11px]">({g.code})</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {applyTargetMode === 'JOB' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Selecione os Cargos de Destino ({selectedTargetJobIds.length} selecionados):
                  </label>
                  {clientJobsForModal.length === 0 ? (
                    <p className="text-xs text-amber-300 p-3 bg-amber-500/15 rounded-lg">
                      Nenhum cargo cadastrado na hierarquia desta empresa.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-800 rounded-lg p-2">
                      {clientJobsForModal.map(job => {
                        const checked = selectedTargetJobIds.includes(job.id);
                        return (
                          <label key={job.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-800/60 rounded cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setSelectedTargetJobIds(prev => prev.filter(id => id !== job.id));
                                } else {
                                  setSelectedTargetJobIds(prev => [...prev, job.id]);
                                }
                              }}
                              className="rounded border-slate-700 text-indigo-400 focus:ring-indigo-500"
                            />
                            <span className="font-semibold text-slate-200">{job.name}</span>
                            <span className="text-slate-500 text-[11px]">CBO: {job.cbo || 'N/A'}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {applyTargetMode === 'SECTOR_TREE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Selecione os Setores / Árvore da Empresa:
                  </label>
                  {clientSectorsForModal.length === 0 ? (
                    <p className="text-xs text-amber-300 p-3 bg-amber-500/15 rounded-lg">
                      Nenhum setor cadastrado na estrutura hierárquica.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-800 rounded-lg p-2">
                      {clientSectorsForModal.map(sec => {
                        const checked = selectedTargetSectorIds.includes(sec.id);
                        return (
                          <label key={sec.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-800/60 rounded cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setSelectedTargetSectorIds(prev => prev.filter(id => id !== sec.id));
                                } else {
                                  setSelectedTargetSectorIds(prev => [...prev, sec.id]);
                                }
                              }}
                              className="rounded border-slate-700 text-indigo-400 focus:ring-indigo-500"
                            />
                            <span className="font-semibold text-slate-200">{sec.name}</span>
                            <span className="text-slate-500 text-[11px]">({sec.code})</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Situacao operacional — alinea "b" do subitem 1.5.7.3.2 */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <div>
                  <span className="font-bold text-slate-200 text-xs block">
                    Situação operacional destes riscos <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Vale para todos os riscos desta aplicação. Um risco que também exista na
                    manutenção ou na limpeza pode ser ajustado depois, no próprio GHE.
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SITUACOES_OPERACIONAIS.map((op) => {
                    const marcada = situacaoAplicada.includes(op.valor);
                    return (
                      <button
                        key={op.valor}
                        type="button"
                        title={op.ajuda}
                        onClick={() =>
                          setSituacaoAplicada(
                            marcada
                              ? situacaoAplicada.filter((v) => v !== op.valor)
                              : [...situacaoAplicada, op.valor]
                          )
                        }
                        className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                          marcada
                            ? 'bg-teal-500/15 border-teal-500/50 text-teal-200'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="block text-xs font-bold">
                          {op.sigla} — {op.rotulo}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {(situacaoAplicada.includes('NAO_ROTINEIRA') ||
                  situacaoAplicada.includes('EMERGENCIA')) && (
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                    placeholder="Qual a circunstância? Ex.: limpeza e ajuste; parada programada"
                    value={situacaoNota}
                    onChange={(e) => setSituacaoNota(e.target.value)}
                  />
                )}
              </div>

              {/* Include PCMSO Exams Checkbox */}
              <div className="p-3 bg-blue-500/15 border border-blue-500/30 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSuggestedExams}
                    onChange={(e) => setIncludeSuggestedExams(e.target.checked)}
                    className="rounded border-blue-500/30 text-blue-400 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-blue-300 block">
                      Vincular automaticamente os exames PCMSO sugeridos (Tabela 27)
                    </span>
                    <span className="text-blue-300">
                      Gera os protocolos com os exames sugeridos no catálogo para os GHEs de destino.
                      {selecionadosSemExame > 0 &&
                        ` ${selecionadosSemExame} dos riscos selecionados não têm exame sugerido e não geram protocolo.`}
                    </span>
                  </div>
                </label>
              </div>

              {/* Result Feedback */}
              {applyFeedback && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-xs text-emerald-300 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold">{applyFeedback.message}</span>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteApply}
                  disabled={riscosSelecionados.length === 0}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Confirmar Aplicação em Lote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
