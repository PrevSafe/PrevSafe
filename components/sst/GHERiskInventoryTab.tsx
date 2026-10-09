'use client';

import React, { useDeferredValue, useMemo, useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { SSTGroupHomogeneousExposure, SSTEnvironmentalRisk, RiskCategoryType, OccupationalRiskCatalogItem } from '@/types';
import {
  GRUPOS_DO_SELETOR,
  LIMITE_DO_SELETOR,
  buscarNoSeletor,
  indiceDoSeletor,
  type GrupoDoSeletor
} from '@/lib/catalogoDeRiscos';
import { SeletorTabela27 } from './SeletorTabela27';
import { consultarProcedimento, codigoExisteNaTabela27 } from '@/lib/tabela27';
import { classificarRisco } from '@/lib/classificacaoDeRisco';
import { acaoAceita, estaAtrasada } from '@/lib/planoDeAcao';
import { dataDeHoje } from '@/lib/datas';
import { ehRiscoPsicossocial } from '@/lib/psicossocial';
import {
  PGR_SEVERIDADE,
  PGR_SEVERIDADE_CABECALHO,
  PGR_PROBABILIDADE_REGRAS,
  PGR_PROBABILIDADE_REFERENCIAS,
  PGR_PROBABILIDADE_FISICO_QUIMICO,
  PGR_PROBABILIDADE_BIOLOGICO,
  PGR_PROBABILIDADE_ACIDENTE,
  PGR_PROBABILIDADE_ERGONOMICO
} from '@/lib/pgrModelo';
import {
  SITUACOES_OPERACIONAIS,
  normalizarSituacoes,
  type SituacaoOperacional
} from '@/lib/situacaoOperacional';
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Zap, 
  Eye, 
  FileCode2, 
  HardHat, 
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  ArrowUpRight,
  Stethoscope,
  Building2,
  Briefcase,
  CheckSquare,
  Square,
  Sliders,
  Filter,
  X
} from 'lucide-react';

interface GHERiskInventoryTabProps {
  selectedClientId: string;
}

// ---------------------------------------------------------------------------
// Escalas de severidade e probabilidade do MODELO de PGR (secoes 5.4 e 5.5)
//
// As linhas vem de lib/pgrModelo.ts, as mesmas que o PDF imprime; os
// cabecalhos das colunas repetem os das tabelas do PDF. O formulario nao
// tinha os dois campos: risco novo nunca salvava, e ao editar o risco sem
// classificacao ganhava S3 x P3 - um "Medio" que ninguem avaliou.
// ---------------------------------------------------------------------------

type GrupoDaEscala = 'FISICO_QUIMICO' | 'BIOLOGICO' | 'ACIDENTE' | 'ERGONOMICO';

const semAcento = (s: string) =>
  String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

/** Qual tabela de probabilidade vale para o tipo de perigo. null: o modelo nao gradua. */
function grupoDaEscala(categoria: string, psicossocial: boolean): GrupoDaEscala | null {
  if (psicossocial) return 'ERGONOMICO';
  const c = semAcento(categoria);
  if (c.startsWith('FISIC') || c.startsWith('QUIMIC')) return 'FISICO_QUIMICO';
  if (c.startsWith('BIOLOG')) return 'BIOLOGICO';
  if (c.startsWith('ACIDENT')) return 'ACIDENTE';
  if (c.startsWith('ERGONOM')) return 'ERGONOMICO';
  return null;
}

const ESCALA_DE_PROBABILIDADE: Record<GrupoDaEscala, { titulo: string; colunas: string[]; linhas: string[][] }> = {
  FISICO_QUIMICO: {
    titulo: 'Agentes físicos e químicos (NA = nível de ação; LEO = limite de exposição)',
    colunas: ['Critério quantitativo', 'Critério qualitativo (item 9.4.1 da NR-09)'],
    linhas: PGR_PROBABILIDADE_FISICO_QUIMICO
  },
  BIOLOGICO: {
    titulo: 'Agentes biológicos',
    colunas: ['Critério'],
    linhas: PGR_PROBABILIDADE_BIOLOGICO
  },
  ACIDENTE: {
    titulo: 'Acidentes (exposição ao perigo + eficácia, subitem 1.5.4.4.5.4)',
    colunas: ['Exposição', 'Medidas existentes'],
    linhas: PGR_PROBABILIDADE_ACIDENTE
  },
  ERGONOMICO: {
    titulo: 'Fatores ergonômicos e psicossociais (exigências = duração x intensidade + eficácia, subitem 1.5.4.4.5.3)',
    colunas: ['Duração da exigência', 'Intensidade', 'Medidas existentes'],
    linhas: PGR_PROBABILIDADE_ERGONOMICO
  }
};

/** Coluna da tabela de severidade (secao 5.4) para o tipo de perigo. */
const COLUNA_DA_SEVERIDADE: Record<GrupoDaEscala, { indice: number; rotulo: string }> = {
  FISICO_QUIMICO: { indice: 3, rotulo: 'Físicos, químicos e biológicos' },
  BIOLOGICO: { indice: 3, rotulo: 'Físicos, químicos e biológicos' },
  ACIDENTE: { indice: 2, rotulo: 'Acidentes' },
  ERGONOMICO: { indice: 4, rotulo: 'Ergonômicos e psicossociais' }
};

/** 1 a 5, ou 0 (nao classificado). Nunca um valor "medio" no lugar do que falta. */
const gradacao = (v: unknown): number => {
  const n = Number(v);
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5 ? n : 0;
};

/** Os codigos 02, 03 e 04 do select de GFIP desta tela sao os que ensejam aposentadoria especial. */
const GFIP_QUE_ENSEJA = ['02', '03', '04'];

export const GHERiskInventoryTab: React.FC<GHERiskInventoryTabProps> = ({ selectedClientId }) => {
  const {
    ghes,
    environmentalRisks,
    hierarchySectors,
    hierarchyJobs,
    employees,
    occupationalRisksCatalog = [],
    addGhe,
    updateGhe,
    deleteGhe,
    addEnvironmentalRisk,
    updateEnvironmentalRisk,
    deleteEnvironmentalRisk,
    generateS2240FromGhe,
    applyRisksToTargets,
    applyExamsToTargets,
    units,
    pgrActionPlan = []
  } = usePrevSafe();

  const hoje = dataDeHoje();

  /**
   * A situacao do risco no plano de acao do PGR (lib/planoDeAcao.ts). Risco
   * sem acao aceita sai no PGR como pendencia; o selo avisa aqui, onde o
   * risco e cadastrado, em vez de so no documento.
   */
  const situacaoNoPlano = (riskId: string) => {
    const doRisco = pgrActionPlan.filter((a) => a?.risk_id === riskId && a.status !== 'DESCARTADA');
    const aceitas = doRisco.filter(acaoAceita);
    return {
      total: doRisco.length,
      aceitas: aceitas.length,
      sugeridas: doRisco.filter((a) => a.status === 'SUGERIDA').length,
      atrasadas: aceitas.filter((a) => estaAtrasada(a, hoje)).length
    };
  };

  const clientGhes = ghes.filter(g => !selectedClientId || g.client_id === selectedClientId);
  // As listas de cargos mostravam `hierarchyJobs` inteiro: davam para marcar o
  // "Recepcionista" de OUTRA empresa, identico ao deste cliente. E o mesmo
  // defeito que ja tinha sido corrigido no select de GHE desta tela.
  const clientJobs = hierarchyJobs.filter(
    j => (!selectedClientId || j.client_id === selectedClientId) && j.status !== 'INACTIVE'
  );
  const clientSectors = hierarchySectors.filter(
    sec => (!selectedClientId || sec.client_id === selectedClientId) && sec.status !== 'INACTIVE'
  );
  const [selectedGheId, setSelectedGheId] = useState<string>(clientGhes[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Search & Apply from Global Catalog Modal State
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogGroupFilter, setCatalogGroupFilter] = useState<GrupoDoSeletor | 'ALL'>('ALL');
  const [selectedCatalogRiskIds, setSelectedCatalogRiskIds] = useState<string[]>([]);

  // O catalogo tem perto de mil itens. O indice (so os ativos, com nome e
  // codigo ja sem acento) se monta uma vez por catalogo, e nao a cada tecla;
  // a busca roda sobre o valor adiado, entao a digitacao nao espera a lista; e
  // so os primeiros LIMITE_DO_SELETOR itens sao desenhados - desenhar todos
  // era o que travava o modal.
  const indiceDoCatalogo = useMemo(() => indiceDoSeletor(occupationalRisksCatalog), [occupationalRisksCatalog]);
  const buscaNoCatalogo = useDeferredValue(catalogSearch);
  const achadosNoCatalogo = useMemo(
    () => buscarNoSeletor(indiceDoCatalogo, buscaNoCatalogo, catalogGroupFilter),
    [indiceDoCatalogo, buscaNoCatalogo, catalogGroupFilter]
  );
  const exibidosDoCatalogo = achadosNoCatalogo.slice(0, LIMITE_DO_SELETOR);
  const buscaPendente = buscaNoCatalogo !== catalogSearch;
  const ativosPorGrupo = useMemo(() => {
    const contagem = new Map<GrupoDoSeletor, number>();
    indiceDoCatalogo.forEach((e) => {
      if (e.grupo) contagem.set(e.grupo, (contagem.get(e.grupo) || 0) + 1);
    });
    return contagem;
  }, [indiceDoCatalogo]);
  // Os marcados continuam marcados quando a busca muda e eles saem da lista:
  // ficam a vista aqui, com o nome, para poder desmarcar.
  const marcadosNoCatalogo = useMemo(() => {
    const porId = new Map(indiceDoCatalogo.map((e) => [e.item.id, e.item]));
    return selectedCatalogRiskIds
      .map((id) => porId.get(id))
      .filter((item): item is OccupationalRiskCatalogItem => !!item);
  }, [indiceDoCatalogo, selectedCatalogRiskIds]);
  const [catalogTargetMode, setCatalogTargetMode] = useState<'CURRENT_GHE' | 'MULTI_GHE' | 'JOB' | 'SECTOR_TREE'>('CURRENT_GHE');
  const [catalogSelectedGheIds, setCatalogSelectedGheIds] = useState<string[]>([]);
  const [catalogSelectedJobIds, setCatalogSelectedJobIds] = useState<string[]>([]);
  const [catalogSelectedSectorIds, setCatalogSelectedSectorIds] = useState<string[]>([]);
  const [catalogIncludeExams, setCatalogIncludeExams] = useState(true);
  const [catalogFeedback, setCatalogFeedback] = useState<{ count: number; examsCount: number; message: string } | null>(null);

  // Apply Multi-Target Exam Protocol Modal State
  const [isMultiExamModalOpen, setIsMultiExamModalOpen] = useState(false);
  const [multiExamForm, setMultiExamForm] = useState<{
    exam_name: string;
    exam_code_table_27: string;
    periodicity_months: number;
    triggers: Array<'ADMISSIONAL' | 'PERIODICO' | 'RETORNO_TRABALHO' | 'MUDANCA_RISCO' | 'DEMISSIONAL'>;
    mandatory_by_standard: 'NR-07' | 'NR-11' | 'NR-15' | 'NR-35' | 'NR-33' | 'NR-10' | 'CRITERIO_MEDICO';
    preparation_instructions: string;
    target_mode: 'ALL_GHES' | 'MULTI_GHE' | 'CURRENT_GHE' | 'JOB' | 'SECTOR_TREE';
    target_ghe_ids: string[];
    target_job_ids: string[];
    target_sector_ids: string[];
  }>({
    // O mesmo estado vazio de handleOpenMultiExamModal. Aqui ainda morava
    // "Audiometria" com o codigo 0295 (avaliacao clinica) e uma instrucao de
    // preparo que nenhum medico escreveu.
    exam_name: '',
    exam_code_table_27: '',
    periodicity_months: 12,
    triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'],
    mandatory_by_standard: 'NR-07',
    preparation_instructions: '',
    target_mode: 'MULTI_GHE',
    target_ghe_ids: [],
    target_job_ids: [],
    target_sector_ids: []
  });
  const [multiExamFeedback, setMultiExamFeedback] = useState<string | null>(null);

  // GHE Modal
  const [isGheModalOpen, setIsGheModalOpen] = useState(false);
  const [editingGhe, setEditingGhe] = useState<SSTGroupHomogeneousExposure | null>(null);
  const [gheForm, setGheForm] = useState<{
    code: string;
    name: string;
    description: string;
    sector_ids: string[];
    job_ids: string[];
    work_schedule_description: string;
    environment_description: string;
  }>({
    code: '',
    name: '',
    description: '',
    sector_ids: [],
    job_ids: [],
    // Jornada e ambiente vinham escritos ("44h semanais", "galpao industrial
    // fechado... exaustao mecanica") e iam para o PGR e o LTCAT como descricao
    // do local. So quem foi la descreve.
    work_schedule_description: '',
    environment_description: ''
  });

  // Risk Modal
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<SSTEnvironmentalRisk | null>(null);
  const [riskForm, setRiskForm] = useState<{
    risk_category: RiskCategoryType;
    agent_name: string;
    risk_code_table_24: string;
    generating_source: string;
    propagation_path: string;
    operational_situation: SituacaoOperacional[];
    operational_situation_note: string;
    health_effects: string;
    evaluation_type: 'QUALITATIVA' | 'QUANTITATIVA';
    measurement_unit: string;
    measured_value: string;
    tolerance_limit: string;
    action_level: string;
    measurement_methodology: string;
    /** 1 a 5; 0 = ainda nao classificado. */
    severity: number;
    probability: number;
    epc_implemented: boolean;
    epc_description: string;
    epi_required: boolean;
    ca_number_input: string;
    epi_name_input: string;
    special_retirement_applies: boolean;
    /** '' = nao informado: '00' afirmaria "sem exposicao a agente nocivo". */
    gfip_code: '' | '00' | '01' | '02' | '03' | '04';
    ltcat_technical_conclusion: string;
    insalubridade_applies: boolean;
    insalubridade_degree: '' | '10%' | '20%' | '40%';
    periculosidade_applies: boolean;
  }>({
    // Segunda copia do mesmo risco pre-preenchido, aqui no estado inicial.
    // Ver o comentario em handleOpenRiskModal: o inventario e a base do PGR,
    // do LTCAT, do PPP e do enquadramento de insalubridade, e nenhuma linha
    // dele pode nascer preenchida por padrao.
    risk_category: 'FÍSICO',
    agent_name: '',
    risk_code_table_24: '',
    generating_source: '',
    propagation_path: '',
    operational_situation: [],
    operational_situation_note: '',
    health_effects: '',
    evaluation_type: 'QUALITATIVA',
    measurement_unit: '',
    measured_value: '',
    tolerance_limit: '',
    action_level: '',
    measurement_methodology: '',
    severity: 0,
    probability: 0,
    epc_implemented: false,
    epc_description: '',
    epi_required: false,
    ca_number_input: '',
    epi_name_input: '',
    special_retirement_applies: false,
    gfip_code: '',
    ltcat_technical_conclusion: '',
    insalubridade_applies: false,
    insalubridade_degree: '',
    periculosidade_applies: false
  });

  const [generatedS2240Success, setGeneratedS2240Success] = useState<string | null>(null);
  // O motivo de NAO ter gerado. Antes o clique nao produzia nada.
  const [generatedS2240Erro, setGeneratedS2240Erro] = useState<string | null>(null);

  // A eficacia aferida pelo plano de acao so continua valendo para o MESMO
  // EPC, ainda implantado. Uma regra so para o salvar e para o texto de
  // leitura do formulario: os dois tem de dizer a mesma coisa.
  const eficaciaDoEpcPreservada =
    !!editingRisk
    && !!editingRisk.epc_effective
    && !!editingRisk.epc_implemented
    && riskForm.epc_implemented
    && (riskForm.epc_description || '').trim() === (editingRisk.epc_description || '').trim();

  const activeGhe = clientGhes.find(g => g.id === selectedGheId) || clientGhes[0];
  const gheRisks = environmentalRisks.filter(r => r.ghe_id === activeGhe?.id);
  
  const filteredRisks = gheRisks.filter(r => {
    if (filterCategory !== 'ALL' && r.risk_category !== filterCategory) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return r.agent_name.toLowerCase().includes(q) || 
             r.risk_code_table_24.includes(q) ||
             r.generating_source.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOpenGheModal = (ghe?: SSTGroupHomogeneousExposure) => {
    if (ghe) {
      setEditingGhe(ghe);
      setGheForm({
        code: ghe.code,
        name: ghe.name,
        description: ghe.description || '',
        sector_ids: ghe.sector_ids || [],
        job_ids: ghe.job_ids || [],
        // Era `|| '44h semanais'`: GHE sem jornada ganhava uma ao ser editado.
        work_schedule_description: ghe.work_schedule_description || '',
        environment_description: ghe.environment_description || ''
      });
    } else {
      setEditingGhe(null);
      setGheForm({
        code: `GHE-${String(clientGhes.length + 1).padStart(2, '0')}`,
        name: '',
        description: '',
        sector_ids: [],
        // Nascia com os dois primeiros cargos da lista inteira ja
        // marcados - de qualquer cliente. Vinculo de cargo a GHE define quem
        // recebe risco e exame: nao se marca por conta propria.
        job_ids: [],
        // Nascia com jornada de 44h e "galpao industrial fechado... iluminacao
        // adequada conforme NR-17": uma conformidade declarada sem avaliacao.
        work_schedule_description: '',
        environment_description: ''
      });
    }
    setIsGheModalOpen(true);
  };

  const handleSaveGhe = (e: React.FormEvent) => {
    e.preventDefault();

    // Antes dava `return` em silencio: o usuario clicava em salvar, o modal
    // ficava aberto, nada acontecia e nenhuma mensagem aparecia.
    if (!gheForm.name.trim()) {
      alert('Informe o nome do GHE (ex.: "Produção — Soldagem").');
      return;
    }
    if (!gheForm.code.trim()) {
      alert('Informe o código do GHE (ex.: "GHE-01").');
      return;
    }

    if (editingGhe) {
      updateGhe(editingGhe.id, gheForm);
      setIsGheModalOpen(false);
      return;
    }

    // Sem cliente selecionado o GHE nascia com client_id vazio e sumia de
    // todos os filtros por cliente - inclusive o da tela de exames, que e onde
    // ele precisa aparecer.
    if (!selectedClientId) {
      alert('Selecione o cliente no topo da tela antes de criar o GHE.');
      return;
    }

    const unidadeDoCliente = units.find(u => u.client_id === selectedClientId);

    const created = addGhe({
      client_id: selectedClientId,
      // Era 'unit-01' fixo, um id que pode nao existir para este cliente.
      client_unit_id: unidadeDoCliente?.id || '',
      ...gheForm,
      // Era `|| 5`, e depois o efetivo INTEIRO do cliente: um GHE recem-criado
      // nao tem ninguem vinculado. Os expostos se contam pelos trabalhadores
      // com este ghe_id, como no PGR (expostosDoGhe); aqui nasce com zero.
      total_exposed_workers: 0
    });
    setSelectedGheId(created.id);
    setIsGheModalOpen(false);
  };

  const handleOpenRiskModal = (risk?: SSTEnvironmentalRisk) => {
    if (risk) {
      setEditingRisk(risk);
      setRiskForm({
        risk_category: risk.risk_category,
        agent_name: risk.agent_name,
        risk_code_table_24: risk.risk_code_table_24,
        generating_source: risk.generating_source,
        // Era `|| 'Aérea'`: risco sem via de propagacao ganhava uma ao ser editado.
        propagation_path: risk.propagation_path || '',
        operational_situation: normalizarSituacoes(risk.operational_situation),
        operational_situation_note: risk.operational_situation_note || '',
        health_effects: risk.health_effects || '',
        evaluation_type: risk.evaluation_type,
        measurement_unit: risk.measurement_unit || '',
        measured_value: risk.measured_value || '',
        tolerance_limit: risk.tolerance_limit || '',
        action_level: risk.action_level || '',
        measurement_methodology: risk.measurement_methodology || '',
        // Era `|| 3`: o risco sem classificacao virava S3 x P3, "Medio", ao
        // abrir para editar - e salvava assim. Sem S ou P o campo fica vazio e
        // o salvar exige a classificacao.
        severity: gradacao(risk.severity),
        probability: gradacao(risk.probability),
        epc_implemented: risk.epc_implemented,
        epc_description: risk.epc_description || '',
        epi_required: risk.epi_required,
        ca_number_input: risk.epis?.[0]?.ca_number || '',
        epi_name_input: risk.epis?.[0]?.epi_name || '',
        special_retirement_applies: risk.special_retirement_applies,
        // `|| '00'` afirmava "sem exposicao a agente nocivo"; `|| '20%'`, o
        // grau de insalubridade. Sem valor gravado, fica sem valor.
        gfip_code: risk.gfip_code || '',
        ltcat_technical_conclusion: risk.ltcat_technical_conclusion || '',
        insalubridade_applies: risk.insalubridade_applies,
        insalubridade_degree: risk.insalubridade_degree || '',
        periculosidade_applies: risk.periculosidade_applies
      });
    } else {
      setEditingRisk(null);
      // O formulario de NOVO RISCO abria com um risco inteiro ja preenchido:
      // ruido continuo de 84,5 dB(A) medido com dosimetro NHO-01, limite de
      // tolerancia, nivel de acao, enclausuramento acustico de compressores e
      // o EPI CA 14235. Quem clicasse em salvar sem trocar campo nenhum
      // gravava, no inventario de riscos daquele cliente, uma medicao que
      // ninguem fez - e o inventario e a base do PGR, do LTCAT, do PPP e do
      // enquadramento de insalubridade. Nasce vazio.
      setRiskForm({
        risk_category: 'FÍSICO',
        agent_name: '',
        risk_code_table_24: '',
        generating_source: '',
        propagation_path: '',
        operational_situation: [],
        operational_situation_note: '',
        health_effects: '',
        evaluation_type: 'QUALITATIVA',
        measurement_unit: '',
        measured_value: '',
        tolerance_limit: '',
        action_level: '',
        measurement_methodology: '',
        // 0 = ainda nao classificado. Com 3 e 3 o risco ja nascia "MEDIO",
        // uma classificacao que nenhum profissional tinha feito.
        severity: 0,
        probability: 0,
        epc_implemented: false,
        epc_description: '',
        epi_required: false,
        ca_number_input: '',
        epi_name_input: '',
        special_retirement_applies: false,
        // '00' afirmava "sem exposicao a agente nocivo" antes de qualquer avaliacao.
        gfip_code: '',
        ltcat_technical_conclusion: '',
        insalubridade_applies: false,
        insalubridade_degree: '',
        periculosidade_applies: false
      });
    }
    setIsRiskModalOpen(true);
  };

  const handleSaveRisk = (e: React.FormEvent) => {
    e.preventDefault();

    // Dava `return` em silencio: o modal ficava aberto e nada acontecia.
    if (!activeGhe) {
      alert('Selecione o GHE antes de cadastrar o risco.');
      return;
    }
    if (!riskForm.agent_name.trim()) {
      alert('Informe o perigo / agente de risco.');
      return;
    }
    // A Tabela 24 so vale para os agentes do Anexo IV do Decreto 3.048/1999.
    // Risco ergonomico e de acidente entram no inventario do PGR e NAO tem
    // codigo - por isso o campo deixou de ser obrigatorio.
    // Alinea "b" do subitem 1.5.7.3.2: o inventario tem de dizer em que
    // situacao o perigo existe. O mesmo perigo tem probabilidade diferente na
    // operacao e na manutencao, e a nao rotineira costuma ser a pior.
    if (riskForm.operational_situation.length === 0) {
      alert(
        'Informe a situação operacional do risco.\n\n' +
        'Rotineira (R), não rotineira (NR — manutenção, limpeza, setup, parada) ' +
        'ou emergência (E). É a alínea "b" do subitem 1.5.7.3.2 da NR-01 e sem ' +
        'ela o registro do inventário fica incompleto no PGR.'
      );
      return;
    }
    if (!riskForm.severity || !riskForm.probability) {
      alert(
        'Classifique a severidade e a probabilidade.\n\n' +
        'A classificação do risco (severidade x probabilidade) define a ordem ' +
        'de prioridade do Plano de Ação e não pode ser atribuída pelo sistema.'
      );
      return;
    }

    // A classificacao vem da matriz do modelo de PGR (secao 5.6), nao de uma
    // formula desta tela. Havia duas formulas no sistema e elas divergiam:
    // score 20 saia "ALTO" aqui e "CRITICO" no catalogo de riscos, quando no
    // modelo 20 e MUITO ALTO - nivel em que a atividade nao se inicia ou e
    // interrompida ate a reducao do risco.
    const classificacao = classificarRisco(riskForm.severity, riskForm.probability);
    if (!classificacao) {
      alert('Não foi possível classificar o risco: confira a severidade e a probabilidade.');
      return;
    }
    const risk_level = classificacao.nivel;

    // EPI. Ao EDITAR, a lista era refeita do zero com o primeiro EPI e as
    // cinco condicoes em false: os demais EPIs do risco (o catalogo grava
    // varios) sumiam, e EPI do catalogo sem CA era apagado a cada correcao de
    // outro campo. Agora o mesmo EPI fica como estava; EPI novo, ou com outro
    // CA, entra com as condicoes nao verificadas.
    const caDoForm = riskForm.ca_number_input.trim();
    const nomeDoForm = riskForm.epi_name_input.trim();
    const episAnteriores = editingRisk?.epis || [];
    const primeiroAnterior = episAnteriores[0];
    const mesmoEpi =
      !!primeiroAnterior
      && (primeiroAnterior.ca_number || '').trim() === caDoForm
      && (primeiroAnterior.epi_name || '').trim() === nomeDoForm;
    const mesmoCa = !!primeiroAnterior && !!caDoForm && (primeiroAnterior.ca_number || '').trim() === caDoForm;
    // EPI novo so se grava com CA (a regra que ja existia). Antes ele sumia em
    // silencio e o risco ficava "EPI exigido" sem EPI nenhum.
    if (riskForm.epi_required && !caDoForm && !mesmoEpi) {
      alert('Informe o número do C.A. do EPI exigido, ou desmarque "EPI exigido".');
      return;
    }

    const epis = !riskForm.epi_required
      ? []
      : mesmoEpi
        ? episAnteriores
        : mesmoCa
          // Mesmo CA, nome corrigido: e o mesmo EPI, e o que foi verificado nele vale.
          ? [{ ...primeiroAnterior, epi_name: nomeDoForm }, ...episAnteriores.slice(1)]
          : caDoForm ? [
      {
        ca_number: caDoForm,
        epi_name: nomeDoForm,
        // AS CINCO CONDICOES VINHAM `true`, SEM CAMPO NENHUM NA TELA.
        //
        // Sao elas que decidem se a exposicao conta para APOSENTADORIA
        // ESPECIAL: havendo EPI comprovadamente eficaz, o periodo deixa de
        // contar. Afirma-las sem que ninguem tivesse verificado o uso
        // ininterrupto, a troca periodica e as condicoes de higienizacao
        // retirava o direito do trabalhador por preenchimento automatico.
        //
        // Comecam false: o responsavel tecnico declara cada uma quando
        // verificar. Falso aqui significa "nao verificado", e a exposicao
        // continua contando - que e o lado seguro do erro.
        is_effective: false,
        complies_with_nr06: false,
        uninterrupted_use: false,
        periodic_replacement: false,
        hygienic_conditions: false
      },
      ...episAnteriores.slice(1)
    ] : [];

    // O select de GFIP desta tela diz quais codigos ensejam aposentadoria
    // especial (02, 03 e 04). O campo special_retirement_applies nao tinha
    // entrada no formulario e ficava false em todo risco manual, mesmo com
    // GFIP 04 - o card dizia "Sem Aposentadoria" e o LTCAT nao o listava.
    // Sem GFIP informado, fica o que estava.
    const aposentadoriaEspecial = riskForm.gfip_code
      ? GFIP_QUE_ENSEJA.includes(riskForm.gfip_code)
      : riskForm.special_retirement_applies;

    const riskPayload = {
      client_id: activeGhe.client_id,
      // 'unit-01' e um id que pode nao existir para este cliente.
      client_unit_id: activeGhe.client_unit_id || '',
      ghe_id: activeGhe.id,
      risk_category: riskForm.risk_category,
      risk_code_table_24: riskForm.risk_code_table_24,
      agent_name: riskForm.agent_name,
      generating_source: riskForm.generating_source,
      propagation_path: riskForm.propagation_path,
      operational_situation: riskForm.operational_situation,
      operational_situation_note: riskForm.operational_situation_note.trim() || undefined,
      health_effects: riskForm.health_effects,
      evaluation_type: riskForm.evaluation_type,
      measured_value: riskForm.measured_value || undefined,
      measurement_unit: riskForm.measurement_unit || undefined,
      tolerance_limit: riskForm.tolerance_limit || undefined,
      action_level: riskForm.action_level || undefined,
      measurement_methodology: riskForm.measurement_methodology || undefined,
      probability: classificacao.probabilidade,
      severity: classificacao.severidade,
      risk_level,
      epc_implemented: riskForm.epc_implemented,
      epc_description: riskForm.epc_description || undefined,
      // Implantado e eficaz sao coisas diferentes: a NR-01 exige o
      // acompanhamento da EFICACIA das medidas (subitem 1.5.5.3). Copiar um
      // no outro dava por aferida uma eficacia que ninguem mediu.
      //
      // A eficacia e registrada pelo plano de acao: e a afericao gravada la
      // que marca o EPC como eficaz (lib/planoDeAcao.ts, efeitoNoRisco). Este
      // formulario gravava false sempre, inclusive ao EDITAR, e apagava a
      // eficacia aferida a cada correcao de outro campo. Fica a anterior
      // enquanto o EPC continuar implantado e for o mesmo; EPC novo, trocado
      // ou retirado volta a "nao verificado".
      epc_effective: eficaciaDoEpcPreservada,
      epi_required: riskForm.epi_required,
      epis,
      special_retirement_applies: aposentadoriaEspecial,
      gfip_code: riskForm.gfip_code || undefined,
      ltcat_technical_conclusion: riskForm.ltcat_technical_conclusion,
      insalubridade_applies: riskForm.insalubridade_applies,
      insalubridade_degree: riskForm.insalubridade_degree || undefined,
      periculosidade_applies: riskForm.periculosidade_applies,
      status: 'ACTIVE' as const
    };

    if (editingRisk) {
      updateEnvironmentalRisk(editingRisk.id, riskPayload);
    } else {
      addEnvironmentalRisk(riskPayload);
    }
    setIsRiskModalOpen(false);
  };

  const handleOpenCatalogModal = () => {
    setSelectedCatalogRiskIds([]);
    setCatalogSearch('');
    setCatalogGroupFilter('ALL');
    setCatalogTargetMode('CURRENT_GHE');
    setCatalogSelectedGheIds(activeGhe ? [activeGhe.id] : clientGhes.map(g => g.id));
    setCatalogSelectedJobIds([]);
    setCatalogSelectedSectorIds([]);
    setCatalogFeedback(null);
    setIsCatalogModalOpen(true);
  };

  const handleExecuteCatalogApply = () => {
    if (selectedCatalogRiskIds.length === 0) return;

    let targetGheIdsToUse = catalogSelectedGheIds;
    if (catalogTargetMode === 'CURRENT_GHE' && activeGhe) {
      targetGheIdsToUse = [activeGhe.id];
    }

    const res = applyRisksToTargets({
      client_id: selectedClientId || activeGhe?.client_id,
      risk_catalog_ids: selectedCatalogRiskIds,
      target_mode: (catalogTargetMode === 'CURRENT_GHE' || catalogTargetMode === 'MULTI_GHE') ? 'GHE' : catalogTargetMode,
      target_ghe_ids: targetGheIdsToUse,
      target_job_ids: catalogSelectedJobIds,
      target_sector_ids: catalogSelectedSectorIds,
      include_suggested_exams: catalogIncludeExams
    });

    setCatalogFeedback({
      count: res.created_risks_count,
      examsCount: res.created_exams_count,
      message: res.message
    });
  };

  const handleOpenMultiExamModal = () => {
    // Vinha pre-preenchido com "Audiometria Tonal Ocupacional" e codigo 0295,
    // que e Avaliacao clinica ocupacional. Quem nao trocasse aplicava
    // audiometria com o codigo da consulta clinica.
    setMultiExamForm({
      exam_name: '',
      exam_code_table_27: '',
      periodicity_months: 12,
      triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'],
      mandatory_by_standard: 'NR-07',
      preparation_instructions: '',
      target_mode: 'MULTI_GHE',
      target_ghe_ids: clientGhes.map(g => g.id),
      target_job_ids: [],
      target_sector_ids: []
    });
    setMultiExamFeedback(null);
    setIsMultiExamModalOpen(true);
  };

  const handleExecuteMultiExamApply = (e: React.FormEvent) => {
    e.preventDefault();

    // Tambem dava `return` em silencio.
    if (!multiExamForm.exam_code_table_27) {
      alert('Escolha o exame na Tabela 27 do eSocial.');
      return;
    }
    if (!codigoExisteNaTabela27(multiExamForm.exam_code_table_27)) {
      alert(
        `O código ${multiExamForm.exam_code_table_27} não consta na Tabela 27. ` +
        'Escolha o procedimento na lista.'
      );
      return;
    }
    if (clientGhes.length === 0) {
      alert(
        'Este cliente ainda não tem nenhum GHE. Crie o GHE primeiro, no botão "Novo GHE" ' +
        'desta mesma tela — o exame é aplicado a um GHE.'
      );
      return;
    }

    const res = applyExamsToTargets({
      client_id: selectedClientId || activeGhe?.client_id,
      exam_catalog_items: [{
        exam_name: multiExamForm.exam_name,
        exam_code_table_27: multiExamForm.exam_code_table_27,
        periodicity_months: multiExamForm.periodicity_months,
        triggers: multiExamForm.triggers,
        mandatory_by_standard: multiExamForm.mandatory_by_standard,
        preparation_instructions: multiExamForm.preparation_instructions
      }],
      target_ghe_ids: multiExamForm.target_mode === 'CURRENT_GHE' && activeGhe
        ? [activeGhe.id]
        : (multiExamForm.target_mode === 'ALL_GHES' ? clientGhes.map(g => g.id) : multiExamForm.target_ghe_ids),
      target_job_ids: multiExamForm.target_job_ids
    });

    setMultiExamFeedback(res.message);
  };

  const handleGenerateS2240 = () => {
    if (!activeGhe) return;
    // Sem evento, o botao nao fazia NADA: nem gerava, nem dizia por que.
    setGeneratedS2240Erro(null);
    const { evento, motivo } = generateS2240FromGhe(activeGhe.id);
    if (evento) {
      setGeneratedS2240Success(
        `Evento S-2240 (${evento.event_number}) gerado para ${activeGhe.name}, com a exposição de `
        + `${evento.worker_name}. Campos conferidos; não validado contra o XSD, não assinado e não transmitido.`
      );
      setTimeout(() => setGeneratedS2240Success(null), 6000);
    } else {
      setGeneratedS2240Erro(motivo);
    }
  };

  return (
    <div className="space-y-6" id="ghe-risk-inventory-tab-container">
      {/* Top Banner Alert for S-2240 */}
      {generatedS2240Success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold">{generatedS2240Success}</span>
          </div>
          <span className="text-[11px] bg-emerald-500 text-slate-950 font-bold px-2 py-1 rounded">S-2240 Gerado</span>
        </div>
      )}

      {generatedS2240Erro && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start justify-between gap-3 text-xs text-amber-200 animate-in fade-in">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="font-semibold">{generatedS2240Erro}</span>
          </div>
          <button
            type="button"
            onClick={() => setGeneratedS2240Erro(null)}
            className="text-amber-300/70 hover:text-amber-200 font-bold shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Main Split Layout: Left GHE List, Right Risk Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: GHE Selector and Management (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-400" />
                  GHE / Grupos de Exposição ({clientGhes.length})
                </h3>
                <p className="text-[11px] text-slate-400">Homogeneidade de riscos para PGR e LTCAT</p>
              </div>
              <button
                type="button"
                id="create-ghe-btn"
                onClick={() => handleOpenGheModal()}
                className="px-2.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo GHE
              </button>
            </div>

            {/* Quick Bulk Actions for GHE / Jobs */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                id="sidebar-btn-search-catalog"
                onClick={handleOpenCatalogModal}
                className="px-2 py-2 bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-200 border border-indigo-700/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                title="Buscar no catálogo global da Tabela 24 do eSocial e aplicar em lote"
              >
                <Search className="w-3.5 h-3.5 text-indigo-400" />
                <span>Buscar Riscos</span>
              </button>
              <button
                type="button"
                id="sidebar-btn-multi-exam"
                onClick={handleOpenMultiExamModal}
                className="px-2 py-2 bg-blue-950/70 hover:bg-blue-900/90 text-blue-200 border border-blue-700/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                title="Aplicar exames clínicos e complementares a múltiplos GHEs ou cargos"
              >
                <Stethoscope className="w-3.5 h-3.5 text-blue-400" />
                <span>Aplicar Exame</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {clientGhes.map((ghe) => {
                const isSelected = ghe.id === activeGhe?.id;
                const riskCount = environmentalRisks.filter(r => r.ghe_id === ghe.id).length;

                return (
                  <div
                    key={ghe.id}
                    id={`ghe-card-${ghe.id}`}
                    onClick={() => setSelectedGheId(ghe.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500/40 text-slate-100 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {ghe.code}
                          </span>
                          <span className="font-bold text-xs">{ghe.name}</span>
                        </div>
                        {/* Sem descricao, dizia "Ambiente fabril com riscos fisicos e
                            quimicos mapeados" - de qualquer GHE, mapeado ou nao. */}
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {ghe.description || <span className="italic text-slate-500">Sem descrição</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenGheModal(ghe); }}
                          className="p-1 text-slate-400 hover:text-teal-400 rounded"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteGhe(ghe.id); }}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                      <span>Riscos caracterizados: <strong className="text-teal-400">{riskCount}</strong></span>
                      <span className="flex items-center gap-1">
                        Ver Inventário <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Active GHE Detailed Risk Inventory (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeGhe ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
              {/* Header GHE Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-teal-500 text-slate-950 font-bold text-xs font-mono rounded">
                      {activeGhe.code}
                    </span>
                    <h3 className="font-bold text-base text-slate-100">{activeGhe.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{activeGhe.description}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    id="btn-search-catalog-header"
                    onClick={handleOpenCatalogModal}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                    title="Buscar no catálogo oficial de riscos (Tabela 24) e aplicar"
                  >
                    <Search className="w-4 h-4" />
                    Buscar no Catálogo
                  </button>
                  <button
                    type="button"
                    id="btn-multi-exam-header"
                    onClick={handleOpenMultiExamModal}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                    title="Aplicar exames a este ou múltiplos GHEs/Cargos"
                  >
                    <Stethoscope className="w-4 h-4" />
                    Aplicar Exame
                  </button>
                  <button
                    type="button"
                    id="gen-s2240-btn"
                    onClick={handleGenerateS2240}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <FileCode2 className="w-4 h-4" />
                    Gerar S-2240
                  </button>
                  <button
                    type="button"
                    id="add-risk-btn"
                    onClick={() => handleOpenRiskModal()}
                    className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Caracterizar Manual
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
                  {['ALL', 'FÍSICO', 'QUÍMICO', 'BIOLÓGICO', 'ERGONÔMICO', 'ACIDENTES'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilterCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        filterCategory === cat
                          ? 'bg-teal-500 text-slate-950'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar agente, código ou fonte..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Risk Cards List */}
              <div className="space-y-3" id="risk-inventory-list">
                {filteredRisks.length === 0 ? (
                  <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-slate-800/80 p-6 space-y-2">
                    <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-300">Nenhum risco ambiental caracterizado para este GHE</p>
                    <p className="text-xs text-slate-500">Clique em &ldquo;Caracterizar Risco&rdquo; para adicionar ruído, calor, produtos químicos ou agentes de acidentes.</p>
                  </div>
                ) : (
                  filteredRisks.map((risk) => (
                    <div
                      key={risk.id}
                      id={`risk-card-${risk.id}`}
                      className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 space-y-3 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Ergonomico e acidente nao tem codigo na Tabela 24: o selo
                                saia "Tabela 24:" vazio. */}
                            {risk.risk_code_table_24 && (
                              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold font-mono rounded">
                                Tabela 24: {risk.risk_code_table_24}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-semibold rounded">
                              {risk.risk_category}
                            </span>
                            <span className="text-xs font-bold text-slate-100">{risk.agent_name}</span>
                          </div>
                          <p className="text-xs text-slate-400">
                            <strong>Fonte Geradora:</strong> {risk.generating_source}
                          </p>
                          {(() => {
                            const plano = situacaoNoPlano(risk.id);
                            return (
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5" title="Situação do risco no plano de ação do PGR (aba 2.1)">
                                {plano.total === 0 ? (
                                  <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold rounded">
                                    sem ação no plano
                                  </span>
                                ) : (
                                  <>
                                    {plano.aceitas > 0 && (
                                      <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold rounded">
                                        {plano.aceitas} ação(ões) aceita(s)
                                      </span>
                                    )}
                                    {plano.sugeridas > 0 && (
                                      <span className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold rounded">
                                        {plano.sugeridas} sugestão(ões)
                                      </span>
                                    )}
                                    {plano.atrasadas > 0 && (
                                      <span className="px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-semibold rounded">
                                        {plano.atrasadas} atrasada(s)
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenRiskModal(risk)}
                            className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEnvironmentalRisk(risk.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Metrics & Controls Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-500 block font-semibold">Avaliação</span>
                          <span className="font-bold text-slate-200">{risk.evaluation_type}</span>
                          {risk.measured_value && (
                            <span className="text-[11px] text-teal-400 block font-mono">
                              {risk.measured_value} {risk.measurement_unit}
                            </span>
                          )}
                        </div>

                        {(() => {
                          // A classificacao sai da matriz do modelo, e nao do
                          // risk_level gravado: sem S ou P, "nao classificado".
                          const c = classificarRisco(risk.severity, risk.probability);
                          return (
                            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                              <span className="text-[10px] text-slate-500 block font-semibold">Matriz de Risco</span>
                              {c ? (
                                <>
                                  <span className="font-bold text-amber-400">{c.rotulo}</span>
                                  <span className="text-[10px] text-slate-400 block">
                                    S{c.severidade} × P{c.probabilidade} = {c.score}
                                  </span>
                                </>
                              ) : (
                                <span className="font-bold text-amber-300 block text-[11px]">não classificado</span>
                              )}
                            </div>
                          );
                        })()}

                        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-500 block font-semibold">EPI / EPC</span>
                          <span className="text-slate-200 block text-[11px]">
                            {/* `|| 'Sim'` saia como "CA Sim". */}
                            {risk.epi_required
                              ? `EPI: CA ${risk.epis?.[0]?.ca_number || 'não informado'}`
                              : 'EPI: Não'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {/* "Ativo" nao dizia se a eficacia foi aferida. */}
                            EPC: {risk.epc_implemented
                              ? (risk.epc_effective ? 'implantado, eficaz (aferido)' : 'implantado')
                              : 'Não'}
                          </span>
                        </div>

                        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-500 block font-semibold">LTCAT / GFIP</span>
                          {/* `|| '00'` dizia "sem exposicao" de risco sem codigo informado,
                              e "Sem Aposentadoria" saia para todo risco sem o campo. */}
                          <span className="font-mono text-slate-200 block text-[11px]">
                            GFIP: {risk.gfip_code || <span className="font-sans text-amber-300">não informado</span>}
                          </span>
                          <span className="text-[10px] block font-semibold">
                            {risk.special_retirement_applies || GFIP_QUE_ENSEJA.includes(risk.gfip_code || '')
                              ? <span className="text-rose-300">Aposentadoria especial</span>
                              : risk.gfip_code
                                ? <span className="text-emerald-400">Sem aposentadoria especial</span>
                                : <span className="text-amber-300">enquadramento não informado</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              Selecione ou crie um GHE para visualizar e gerenciar seu inventário de riscos.
            </div>
          )}
        </div>
      </div>

      {/* GHE Modal */}
      {isGheModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-400" />
                {editingGhe ? 'Editar Grupo de Exposição (GHE)' : 'Cadastrar Novo GHE'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsGheModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGhe} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-400 font-semibold mb-1">Código GHE</label>
                  <input
                    type="text"
                    required
                    placeholder="GHE-01"
                    value={gheForm.code}
                    onChange={(e) => setGheForm({ ...gheForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Nome do GHE</label>
                  <input
                    type="text"
                    required
                    placeholder="GHE 01 - Soldadores e Mecânicos"
                    value={gheForm.name}
                    onChange={(e) => setGheForm({ ...gheForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descrição do Grupo e Atividades</label>
                <textarea
                  rows={2}
                  value={gheForm.description}
                  onChange={(e) => setGheForm({ ...gheForm, description: e.target.value })}
                  placeholder="Descreva as tarefas e postos de trabalho..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descrição do Ambiente Físico (PGR/LTCAT)</label>
                <textarea
                  rows={2}
                  value={gheForm.environment_description}
                  onChange={(e) => setGheForm({ ...gheForm, environment_description: e.target.value })}
                  placeholder="Estrutura, piso, ventilação, iluminação..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Jornada de Trabalho e Escala</label>
                <input
                  type="text"
                  value={gheForm.work_schedule_description}
                  onChange={(e) => setGheForm({ ...gheForm, work_schedule_description: e.target.value })}
                  placeholder="Ex.: 44h semanais, 07:00 às 17:00, 1h de intervalo"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGheModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md"
                >
                  Salvar GHE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Risk Characterization Modal */}
      {isRiskModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-teal-400" />
                {editingRisk ? 'Editar Caracterização do Risco' : 'Caracterizar Novo Fator de Risco (PGR / S-2240)'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsRiskModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRisk} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Categoria do Risco</label>
                  <select
                    value={riskForm.risk_category}
                    onChange={(e) => setRiskForm({ ...riskForm, risk_category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500 font-bold"
                  >
                    <option value="FÍSICO">Físico</option>
                    <option value="QUÍMICO">Químico</option>
                    <option value="BIOLÓGICO">Biológico</option>
                    <option value="ERGONÔMICO">Ergonômico</option>
                    <option value="ACIDENTES">Acidentes / Mecânicos</option>
                    <option value="AUSÊNCIA_RISCO">Ausência de Risco</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Código Tabela 24 eSocial</label>
                  <input
                    type="text"
                    required
                    placeholder="01.01.001"
                    value={riskForm.risk_code_table_24}
                    onChange={(e) => setRiskForm({ ...riskForm, risk_code_table_24: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nome do Agente Nocivo</label>
                  <input
                    type="text"
                    required
                    value={riskForm.agent_name}
                    onChange={(e) => setRiskForm({ ...riskForm, agent_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Fonte Geradora do Risco</label>
                <input
                  type="text"
                  required
                  value={riskForm.generating_source}
                  onChange={(e) => setRiskForm({ ...riskForm, generating_source: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Situacao operacional — alinea "b" do subitem 1.5.7.3.2 */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div>
                  <h4 className="font-bold text-slate-200 text-xs">
                    Situação Operacional <span className="text-rose-400">*</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Em que situações este perigo existe. Marque todas que se aplicam — a
                    probabilidade costuma ser diferente em cada uma (alínea &quot;b&quot; do
                    subitem 1.5.7.3.2 da NR-01).
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SITUACOES_OPERACIONAIS.map((op) => {
                    const marcada = riskForm.operational_situation.includes(op.valor);
                    return (
                      <button
                        key={op.valor}
                        type="button"
                        title={op.ajuda}
                        onClick={() =>
                          setRiskForm({
                            ...riskForm,
                            operational_situation: marcada
                              ? riskForm.operational_situation.filter((v) => v !== op.valor)
                              : [...riskForm.operational_situation, op.valor]
                          })
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
                        <span className="block text-[10px] leading-tight mt-0.5 opacity-80">
                          {op.ajuda}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {(riskForm.operational_situation.includes('NAO_ROTINEIRA') ||
                  riskForm.operational_situation.includes('EMERGENCIA')) && (
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 text-xs">
                      Qual a circunstância?
                    </label>
                    <input
                      type="text"
                      placeholder="Ex.: limpeza e ajuste; parada programada; abandono de área"
                      value={riskForm.operational_situation_note}
                      onChange={(e) =>
                        setRiskForm({ ...riskForm, operational_situation_note: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}
              </div>

              {/* Quantification & Limits */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-teal-400" />
                  Avaliação e Métricas de Exposição
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Tipo de Avaliação</label>
                    <select
                      value={riskForm.evaluation_type}
                      onChange={(e) => setRiskForm({ ...riskForm, evaluation_type: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    >
                      <option value="QUALITATIVA">Qualitativa</option>
                      <option value="QUANTITATIVA">Quantitativa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Valor Medido</label>
                    <input
                      type="text"
                      placeholder="84.5"
                      value={riskForm.measured_value}
                      onChange={(e) => setRiskForm({ ...riskForm, measured_value: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Unidade de Medida</label>
                    <input
                      type="text"
                      placeholder="dB(A)"
                      value={riskForm.measurement_unit}
                      onChange={(e) => setRiskForm({ ...riskForm, measurement_unit: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Limite Tolerância</label>
                    <input
                      type="text"
                      placeholder="85.0"
                      value={riskForm.tolerance_limit}
                      onChange={(e) => setRiskForm({ ...riskForm, tolerance_limit: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* EPI and Control measures */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <HardHat className="w-4 h-4 text-teal-400" />
                  Medidas de Proteção e EPIs (eSocial)
                </h4>
                {/* EPC: implantado e qual. A eficacia nao se marca aqui: quem a
                    sustenta e a afericao registrada no plano de acao. */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={riskForm.epc_implemented}
                      onChange={(e) => setRiskForm({ ...riskForm, epc_implemented: e.target.checked })}
                      className="rounded border-slate-700 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-slate-200 font-semibold">EPC implantado no local</span>
                  </label>
                  {riskForm.epc_implemented && (
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Descrição do EPC</label>
                      <input
                        type="text"
                        placeholder="Qual proteção coletiva existe no local"
                        value={riskForm.epc_description}
                        onChange={(e) => setRiskForm({ ...riskForm, epc_description: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                      />
                    </div>
                  )}
                  <p className={`text-[11px] ${eficaciaDoEpcPreservada ? 'text-emerald-300' : 'text-amber-300'}`}>
                    Eficácia do EPC:{' '}
                    {eficaciaDoEpcPreservada
                      ? 'verificada pelo plano de ação'
                      : 'não verificada — registre a aferição no plano de ação'}
                    {!eficaciaDoEpcPreservada && editingRisk?.epc_effective && (
                      <span className="text-slate-400">
                        {' '}(o EPC foi alterado ou retirado: a aferição anterior não vale para ele)
                      </span>
                    )}
                  </p>
                </div>
                {/* "EPI exigido" nao tinha campo: so o risco vindo do catalogo
                    tinha EPI, e o CA digitado aqui era descartado em silencio. */}
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={riskForm.epi_required}
                      onChange={(e) => setRiskForm({ ...riskForm, epi_required: e.target.checked })}
                      className="rounded border-slate-700 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-slate-200 font-semibold">EPI exigido para este risco</span>
                  </label>
                  {riskForm.epi_required ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">
                            Nº do C.A. do EPI <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Número do certificado de aprovação"
                            value={riskForm.ca_number_input}
                            onChange={(e) => setRiskForm({ ...riskForm, ca_number_input: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Descrição do EPI</label>
                          <input
                            type="text"
                            placeholder="Ex.: protetor auditivo tipo plugue"
                            value={riskForm.epi_name_input}
                            onChange={(e) => setRiskForm({ ...riskForm, epi_name_input: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        As condições de eficácia do EPI (uso ininterrupto, troca periódica, higienização) começam como
                        não verificadas: o EPI não neutraliza a exposição até alguém declará-las.
                        {(editingRisk?.epis || []).length > 1 &&
                          ` Este risco tem mais ${(editingRisk?.epis || []).length - 1} EPI(s) registrado(s), que são mantidos.`}
                      </p>
                    </>
                  ) : (
                    (editingRisk?.epis || []).length > 0 && (
                      <p className="text-[11px] text-amber-300">
                        Desmarcado, os {(editingRisk?.epis || []).length} EPI(s) registrados neste risco saem ao salvar.
                      </p>
                    )
                  )}
                </div>
              </div>

              {/* Classificacao do risco: secoes 5.4 a 5.6 do modelo de PGR */}
              {(() => {
                const psicossocial = !!editingRisk && ehRiscoPsicossocial(editingRisk);
                const grupo = grupoDaEscala(riskForm.risk_category, psicossocial);
                const escala = grupo ? ESCALA_DE_PROBABILIDADE[grupo] : null;
                const colunaS = grupo ? COLUNA_DA_SEVERIDADE[grupo] : null;
                const linhaS = PGR_SEVERIDADE.find((l) => Number(l[0]) === riskForm.severity);
                const linhaP = escala?.linhas.find((l) => Number(l[0]) === riskForm.probability);
                const resultado = classificarRisco(riskForm.severity, riskForm.probability);
                // Fisico ou quimico: a opcao mostra o criterio do tipo de avaliacao do risco.
                const rotuloDaProbabilidade = (l: string[]) => {
                  if (grupo === 'FISICO_QUIMICO') return riskForm.evaluation_type === 'QUANTITATIVA' ? l[1] : l[2];
                  if (grupo === 'ERGONOMICO') return `${l[1]}; intensidade ${String(l[2]).toLowerCase()}`;
                  return l[1];
                };
                return (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div>
                      <h4 className="font-bold text-slate-200 text-xs">
                        Classificação do Risco <span className="text-rose-400">*</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Escalas do modelo de PGR (seções 5.4 e 5.5). A classificação define a prioridade e o prazo do
                        plano de ação: o sistema não a atribui.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <label className="block text-slate-400 font-semibold mb-1">Severidade (S)</label>
                        <select
                          value={riskForm.severity}
                          onChange={(e) => setRiskForm({ ...riskForm, severity: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                        >
                          <option value={0}>Selecione</option>
                          {PGR_SEVERIDADE.map((l) => (
                            <option key={l[0]} value={Number(l[0])}>
                              S{l[0]} — {l[1]}
                            </option>
                          ))}
                        </select>
                        {linhaS ? (
                          <div className="text-[11px] text-slate-300 mt-1 space-y-0.5 break-words">
                            {colunaS ? (
                              <p>
                                <span className="text-slate-500">{colunaS.rotulo}:</span> {linhaS[colunaS.indice]}
                              </p>
                            ) : (
                              <>
                                <p><span className="text-slate-500">Acidentes:</span> {linhaS[2]}</p>
                                <p><span className="text-slate-500">Físicos, químicos e biológicos:</span> {linhaS[3]}</p>
                                <p><span className="text-slate-500">Ergonômicos e psicossociais:</span> {linhaS[4]}</p>
                              </>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 mt-1">{PGR_SEVERIDADE_CABECALHO}</p>
                        )}
                      </div>

                      <div className="min-w-0">
                        <label className="block text-slate-400 font-semibold mb-1">Probabilidade (P)</label>
                        <select
                          value={riskForm.probability}
                          onChange={(e) => setRiskForm({ ...riskForm, probability: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                        >
                          <option value={0}>Selecione</option>
                          {escala
                            ? escala.linhas.map((l) => (
                                <option key={l[0]} value={Number(l[0])}>
                                  P{l[0]} — {rotuloDaProbabilidade(l)}
                                </option>
                              ))
                            : [1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>P{n}</option>
                              ))}
                        </select>
                        {escala ? (
                          <>
                            <p className="text-[10px] text-slate-500 mt-1">Tabela: {escala.titulo}</p>
                            {linhaP && (
                              <div className="text-[11px] text-slate-300 mt-1 space-y-0.5 break-words">
                                {escala.colunas.map((col, i) => (
                                  <p key={col}>
                                    <span className="text-slate-500">{col}:</span> {linhaP[i + 1]}
                                  </p>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-[11px] text-amber-300 mt-1">
                            O modelo não tem escala de probabilidade para esta categoria (seção 5.5). Escolha a
                            categoria do perigo para usar a tabela correspondente.
                          </p>
                        )}
                      </div>
                    </div>

                    <details className="text-[11px] text-slate-400">
                      <summary className="cursor-pointer text-slate-300 font-semibold">
                        Regras comuns da probabilidade (seção 5.5)
                      </summary>
                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        {PGR_PROBABILIDADE_REGRAS.map((r) => (
                          <li key={r} className="break-words">{r}</li>
                        ))}
                      </ul>
                      {grupo === 'FISICO_QUIMICO' && (
                        <p className="mt-1 break-words">{PGR_PROBABILIDADE_REFERENCIAS}</p>
                      )}
                    </details>

                    {resultado ? (
                      <div className="p-2.5 rounded-lg border border-teal-500/30 bg-teal-500/5 text-[11px] space-y-0.5">
                        <p className="text-slate-100 font-bold">
                          {resultado.rotulo} — S{resultado.severidade} × P{resultado.probabilidade} = {resultado.score}
                          <span className="text-slate-400 font-normal"> · {resultado.classificacao}</span>
                        </p>
                        <p className="text-slate-300"><span className="text-slate-500">Prazo:</span> {resultado.prazo}</p>
                        <p className="text-slate-400 break-words">{resultado.decisao}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-300">
                        Não classificado: escolha a severidade e a probabilidade (matriz da seção 5.6).
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Special Enquadramentos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Código GFIP (SEFIP / eSocial)</label>
                  <select
                    value={riskForm.gfip_code}
                    onChange={(e) => setRiskForm({ ...riskForm, gfip_code: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                  >
                    <option value="">Não informado</option>
                    <option value="00">00 - Sem exposição a agente nocivo</option>
                    <option value="01">01 - Não enseja aposentadoria especial</option>
                    <option value="02">02 - Enseja aposentadoria especial (15 anos)</option>
                    <option value="03">03 - Enseja aposentadoria especial (20 anos)</option>
                    <option value="04">04 - Enseja aposentadoria especial (25 anos)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Conclusão Técnica LTCAT</label>
                  <input
                    type="text"
                    value={riskForm.ltcat_technical_conclusion}
                    onChange={(e) => setRiskForm({ ...riskForm, ltcat_technical_conclusion: e.target.value })}
                    placeholder="Conclusão da exposição..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRiskModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md"
                >
                  Salvar Caracterização
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Search & Apply from Global Catalog (Tabela 24 eSocial) */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-6">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    Buscar Riscos no Catálogo Global (Tabela 24)
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      eSocial & NRs
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Selecione riscos padronizados para aplicar em lote ao GHE atual, múltiplos GHEs ou árvore de cargos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Search & Filter bar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-8 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Buscar por nome do agente (ex: ruído, acido sulfurico) ou código (ex: 01.18.001)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-4">
                  {/* O valor e a chave do grupo, e nao o texto gravado: a opcao
                      "ACIDENTE" nunca casava com o grupo "ACIDENTES", e grupo
                      gravado sem acento sumia de todo filtro. */}
                  <select
                    value={catalogGroupFilter}
                    onChange={(e) => setCatalogGroupFilter(e.target.value as GrupoDoSeletor | 'ALL')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">Todos os grupos ({indiceDoCatalogo.length})</option>
                    {GRUPOS_DO_SELETOR
                      .filter((g) => (ativosPorGrupo.get(g.chave) || 0) > 0 || g.chave === catalogGroupFilter)
                      .map((g) => (
                        <option key={g.chave} value={g.chave}>
                          {g.rotulo} ({ativosPorGrupo.get(g.chave) || 0})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Target Mode Selector */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    Onde aplicar os riscos selecionados?
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Empresa: <strong className="text-teal-400">{activeGhe?.name ? 'Empresa do GHE' : 'Cliente selecionado'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatalogTargetMode('CURRENT_GHE')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      catalogTargetMode === 'CURRENT_GHE'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 font-bold ring-1 ring-indigo-500'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <span className="block font-semibold">GHE Atual</span>
                    <span className="text-[10px] text-slate-500 truncate block">{activeGhe?.name || 'N/A'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCatalogTargetMode('MULTI_GHE');
                      if (catalogSelectedGheIds.length === 0) {
                        setCatalogSelectedGheIds(clientGhes.map(g => g.id));
                      }
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      catalogTargetMode === 'MULTI_GHE'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 font-bold ring-1 ring-indigo-500'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <span className="block font-semibold">Vários GHEs</span>
                    <span className="text-[10px] text-slate-500">{clientGhes.length} GHEs disponíveis</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatalogTargetMode('JOB')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      catalogTargetMode === 'JOB'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 font-bold ring-1 ring-indigo-500'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <span className="block font-semibold">Cargo Específico</span>
                    <span className="text-[10px] text-slate-500">Mapeamento direto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatalogTargetMode('SECTOR_TREE')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      catalogTargetMode === 'SECTOR_TREE'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 font-bold ring-1 ring-indigo-500'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <span className="block font-semibold">Árvore de Setores</span>
                    <span className="text-[10px] text-slate-500">Hierarquia completa</span>
                  </button>
                </div>

                {/* Sub-selectors depending on target mode */}
                {catalogTargetMode === 'MULTI_GHE' && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block">Marque os GHEs que receberão os riscos:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {clientGhes.map(g => {
                        const isChecked = catalogSelectedGheIds.includes(g.id);
                        return (
                          <label key={g.id} className="flex items-center gap-2 p-1.5 bg-slate-900 rounded border border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setCatalogSelectedGheIds(prev => prev.filter(id => id !== g.id));
                                } else {
                                  setCatalogSelectedGheIds(prev => [...prev, g.id]);
                                }
                              }}
                              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-slate-200 font-semibold truncate">{g.name}</span>
                            <span className="text-slate-500 font-mono text-[10px]">({g.code})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {catalogTargetMode === 'JOB' && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block">Marque os cargos que receberão os riscos:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {clientJobs.map(job => {
                        const isChecked = catalogSelectedJobIds.includes(job.id);
                        return (
                          <label key={job.id} className="flex items-center gap-2 p-1.5 bg-slate-900 rounded border border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setCatalogSelectedJobIds(prev => prev.filter(id => id !== job.id));
                                } else {
                                  setCatalogSelectedJobIds(prev => [...prev, job.id]);
                                }
                              }}
                              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-slate-200 font-semibold truncate">{job.name}</span>
                            <span className="text-slate-500 text-[10px]">CBO: {job.cbo || 'N/A'}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {catalogTargetMode === 'SECTOR_TREE' && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block">Marque os setores da árvore hierárquica:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {clientSectors.map(sec => {
                        const isChecked = catalogSelectedSectorIds.includes(sec.id);
                        return (
                          <label key={sec.id} className="flex items-center gap-2 p-1.5 bg-slate-900 rounded border border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setCatalogSelectedSectorIds(prev => prev.filter(id => id !== sec.id));
                                } else {
                                  setCatalogSelectedSectorIds(prev => [...prev, sec.id]);
                                }
                              }}
                              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-slate-200 font-semibold truncate">{sec.name}</span>
                            <span className="text-slate-500 text-[10px]">({sec.code})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* List of Catalog Risks to Pick */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="font-bold text-slate-200">
                    Selecione os agentes do catálogo ({selectedCatalogRiskIds.length} selecionado(s)):
                  </span>
                  {/* Alterna so os itens desenhados, e soma a selecao em vez de
                      troca-la. "Todos os visiveis" marcava a lista filtrada
                      inteira: com o catalogo grande, centenas de agentes que
                      ninguem viu iriam ao inventario. */}
                  <button
                    type="button"
                    disabled={exibidosDoCatalogo.length === 0}
                    onClick={() => {
                      const ids = exibidosDoCatalogo.map(r => r.id);
                      const todosMarcados = ids.every(id => selectedCatalogRiskIds.includes(id));
                      setSelectedCatalogRiskIds(prev => (todosMarcados
                        ? prev.filter(id => !ids.includes(id))
                        : [...prev, ...ids.filter(id => !prev.includes(id))]));
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 disabled:opacity-50 font-semibold"
                  >
                    Marcar ou desmarcar os {exibidosDoCatalogo.length} exibidos
                  </button>
                </div>

                {marcadosNoCatalogo.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {marcadosNoCatalogo.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedCatalogRiskIds(prev => prev.filter(id => id !== item.id))}
                        title="Desmarcar"
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 hover:text-white text-[10px] font-semibold"
                      >
                        <span className="truncate max-w-[220px]">{item.name}</span>
                        <X className="w-3 h-3 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className={`space-y-2 max-h-64 overflow-y-auto border border-slate-800 rounded-xl p-2 bg-slate-950 transition-opacity ${
                    buscaPendente ? 'opacity-60' : ''
                  }`}
                >
                  {exibidosDoCatalogo.length === 0 && (
                    <p className="p-3 text-[11px] text-slate-400">
                      {indiceDoCatalogo.length === 0
                        ? 'Nenhum risco ativo no catálogo.'
                        : 'Nenhum risco ativo do catálogo com esse nome ou código neste grupo.'}
                    </p>
                  )}
                  {exibidosDoCatalogo.map(item => {
                    const checked = selectedCatalogRiskIds.includes(item.id);
                    // Item da listagem vem sem codigo, efeitos, exames e
                    // gradacao: o que falta nao aparece, em vez de um rotulo
                    // seguido de nada.
                    const codigo = (item.code_table_24 || '').trim();
                    const efeitos = (item.health_effects || '').trim();
                    const exames = Array.isArray(item.suggested_exams_pcmso) ? item.suggested_exams_pcmso : [];
                    const semGradacao = !classificarRisco(item.default_severity, item.default_probability);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (checked) {
                            setSelectedCatalogRiskIds(prev => prev.filter(id => id !== item.id));
                          } else {
                            setSelectedCatalogRiskIds(prev => [...prev, item.id]);
                          }
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                          checked
                            ? 'bg-indigo-950/50 border-indigo-500/70 shadow-sm'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="mt-0.5">
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {codigo && (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                                {codigo}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {item.group}
                            </span>
                            <span className="text-slate-100 font-bold text-xs">
                              {item.name}
                            </span>
                          </div>

                          {efeitos && (
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              <strong>Efeitos:</strong> {efeitos}
                            </p>
                          )}

                          <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400 pt-0.5">
                            {item.tolerance_limit_reference && (
                              <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                LT: {item.tolerance_limit_reference}
                              </span>
                            )}
                            {item.action_level_reference && (
                              <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                NA: {item.action_level_reference}
                              </span>
                            )}
                            {semGradacao && (
                              <span className="text-amber-300">
                                sem severidade e probabilidade: o risco entra não classificado
                              </span>
                            )}
                            {exames.length > 0 && (
                              <span className="text-blue-400 flex items-center gap-1">
                                <Stethoscope className="w-3 h-3" />
                                Exames PCMSO: {exames.map(e => e.exam_name).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {achadosNoCatalogo.length > exibidosDoCatalogo.length && (
                  <p className="text-[11px] text-amber-300">
                    Mostrando {exibidosDoCatalogo.length} de {achadosNoCatalogo.length} riscos. Refine a busca pelo
                    nome ou pelo código, ou escolha um grupo, para ver os demais.
                  </p>
                )}
              </div>

              {/* Include PCMSO Exams checkbox */}
              <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catalogIncludeExams}
                    onChange={(e) => setCatalogIncludeExams(e.target.checked)}
                    className="rounded border-slate-700 text-blue-500 focus:ring-blue-400"
                  />
                  <div>
                    <span className="font-bold text-blue-200 block text-xs">
                      Gerar automaticamente protocolos de exames PCMSO (Tabela 27)
                    </span>
                    <span className="text-[11px] text-blue-400">
                      Cria os protocolos de audiometria, exames complementares e radiológicos vinculados aos GHEs de destino.
                    </span>
                  </div>
                </label>
              </div>

            </div>

            {/* A mensagem de applyRisksToTargets diz o que foi aplicado, as
                sugestoes que entraram no plano de acao e o que ficou de fora.
                Ficava no fim do corpo rolavel, abaixo da lista do catalogo:
                quem clicava em aplicar nao a via. Fora da rolagem ela aparece
                inteira, e em ambar quando nada foi aplicado. */}
            {catalogFeedback && (
              <div
                className={`mx-4 sm:mx-6 my-3 shrink-0 p-3 rounded-xl border flex items-start gap-2 text-xs font-medium animate-in fade-in ${
                  catalogFeedback.count > 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}
              >
                {catalogFeedback.count > 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                )}
                <span className="min-w-0 break-words whitespace-pre-line">{catalogFeedback.message}</span>
              </div>
            )}

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
              <span className="text-xs text-slate-400">
                {selectedCatalogRiskIds.length} risco(s) selecionado(s)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCatalogModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCatalogApply}
                  disabled={selectedCatalogRiskIds.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-md flex items-center gap-1.5"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Aplicar Riscos em Lote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Apply Exam to Multiple GHEs or Jobs */}
      {isMultiExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Aplicar Exame Ocupacional a Múltiplos GHEs ou Cargos
                  </h3>
                  <p className="text-xs text-slate-400">
                    Vincule um exame clínico ou complementar (PCMSO / NR-07) a vários grupos de exposição ou cargos de uma vez.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMultiExamModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteMultiExamApply} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
              {/* Presets */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Exames Ocupacionais Frequentes (Tabela 27 do eSocial):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Os OITO atalhos tinham o código errado. Cada um apontava
                      para outro procedimento, ou para um agente químico:
                        0295 -> Avaliação clínica    (rotulado "Audiometria")
                        0296 -> Acuidade visual      (rotulado "Espirometria")
                        0297 -> Estereopsia          (rotulado "Acuidade Visual")
                        0005 -> 1,2-ciclo-hexanediol (rotulado "ECG")
                        0006 -> 1,2-dibromo-3-cloropropano (rotulado "EEG")
                        0298 -> Visão de cores       (rotulado "Raio-X OIT")
                        0501 -> Dietilditiofosfato   (rotulado "Psicossocial")
                        0294 -> Ênfase urogenital    (rotulado "Clínico Geral")
                      Conferidos contra lib/tabela27.ts. */}
                  {[
                    { name: 'Audiometria tonal ocupacional', code: '0281', standard: 'NR-07' as const, months: 12 },
                    { name: 'Prova de função pulmonar completa (ou espirometria)', code: '1057', standard: 'NR-07' as const, months: 12 },
                    { name: 'Avaliação da acuidade visual', code: '0296', standard: 'NR-35' as const, months: 12 },
                    { name: 'ECG (Eletrocardiograma) convencional de até 12 derivações', code: '0530', standard: 'NR-35' as const, months: 12 },
                    { name: 'EEG (Eletroencefalograma) de rotina', code: '0536', standard: 'NR-33' as const, months: 12 },
                    { name: 'Radiografia de tórax (PA) Padrão OIT (o mais recente), com dois leitores habilitados', code: '1078', standard: 'NR-15' as const, months: 12 },
                    { name: 'Avaliação psicossocial', code: '0300', standard: 'NR-35' as const, months: 12 },
                    { name: 'Avaliação clínica ocupacional (anamnese e exame físico)', code: '0295', standard: 'NR-07' as const, months: 12 }
                  ].map((preset) => (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => setMultiExamForm({
                        ...multiExamForm,
                        exam_name: preset.name,
                        exam_code_table_27: preset.code,
                        mandatory_by_standard: preset.standard,
                        periodicity_months: preset.months
                      })}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        multiExamForm.exam_code_table_27 === preset.code
                          ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
                          : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <span className="block font-semibold truncate">{preset.name}</span>
                      <span className="text-[10px] text-slate-500">Cód {preset.code} ({preset.standard})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome e codigo eram dois campos livres. Agora sao um so, e o
                  codigo vem da Tabela 27 junto da denominacao oficial. */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Exame a aplicar (Tabela 27 do eSocial) *
                </label>
                <SeletorTabela27
                  codigo={multiExamForm.exam_code_table_27}
                  onSelecionar={(p) =>
                    setMultiExamForm({
                      ...multiExamForm,
                      exam_code_table_27: p.codigo,
                      exam_name: p.nome
                    })
                  }
                  onLimpar={() =>
                    setMultiExamForm({ ...multiExamForm, exam_code_table_27: '', exam_name: '' })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Periodicidade (Meses)</label>
                  <select
                    value={multiExamForm.periodicity_months}
                    onChange={(e) => setMultiExamForm({ ...multiExamForm, periodicity_months: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  >
                    <option value={6}>A cada 6 meses (Semestral)</option>
                    <option value={12}>A cada 12 meses (Anual)</option>
                    <option value={24}>A cada 24 meses (Bienal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Exigência Regulamentar</label>
                  <select
                    value={multiExamForm.mandatory_by_standard}
                    onChange={(e) => setMultiExamForm({ ...multiExamForm, mandatory_by_standard: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  >
                    <option value="NR-07">NR-07 (PCMSO Padrão)</option>
                    <option value="NR-15">NR-15 (Atividades Insalubres)</option>
                    <option value="NR-35">NR-35 (Trabalho em Altura)</option>
                    <option value="NR-33">NR-33 (Espaço Confinado)</option>
                    <option value="NR-10">NR-10 (Instalações Elétricas)</option>
                    <option value="CRITERIO_MEDICO">Critério Médico Coordenador</option>
                  </select>
                </div>
              </div>

              {/* Target Mode Selector */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <span className="font-bold text-slate-200 block">
                  Destino da Aplicação do Exame:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMultiExamForm({
                        ...multiExamForm,
                        target_mode: 'ALL_GHES',
                        target_ghe_ids: clientGhes.map(g => g.id)
                      });
                    }}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      multiExamForm.target_mode === 'ALL_GHES'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
                        : 'border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <span className="block font-semibold">Todos os GHEs</span>
                    <span className="text-[10px] text-slate-500">{clientGhes.length} GHEs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMultiExamForm({ ...multiExamForm, target_mode: 'MULTI_GHE' })}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      multiExamForm.target_mode === 'MULTI_GHE'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
                        : 'border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <span className="block font-semibold">GHEs Específicos</span>
                    <span className="text-[10px] text-slate-500">Seleção múltipla</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMultiExamForm({ ...multiExamForm, target_mode: 'JOB' })}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      multiExamForm.target_mode === 'JOB'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
                        : 'border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <span className="block font-semibold">Cargos / Funções</span>
                    <span className="text-[10px] text-slate-500">Por cargo da hierarquia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMultiExamForm({ ...multiExamForm, target_mode: 'CURRENT_GHE' })}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      multiExamForm.target_mode === 'CURRENT_GHE'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-bold'
                        : 'border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <span className="block font-semibold">Apenas GHE Atual</span>
                    <span className="text-[10px] text-slate-500">{activeGhe?.name || 'N/A'}</span>
                  </button>
                </div>

                {multiExamForm.target_mode === 'MULTI_GHE' && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block">Marque os GHEs que receberão este exame:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {clientGhes.map(g => {
                        const checked = multiExamForm.target_ghe_ids.includes(g.id);
                        return (
                          <label key={g.id} className="flex items-center gap-2 p-1.5 bg-slate-900 rounded border border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setMultiExamForm({
                                    ...multiExamForm,
                                    target_ghe_ids: multiExamForm.target_ghe_ids.filter(id => id !== g.id)
                                  });
                                } else {
                                  setMultiExamForm({
                                    ...multiExamForm,
                                    target_ghe_ids: [...multiExamForm.target_ghe_ids, g.id]
                                  });
                                }
                              }}
                              className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-200 font-semibold truncate">{g.name}</span>
                            <span className="text-slate-500 font-mono text-[10px]">({g.code})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {multiExamForm.target_mode === 'JOB' && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block">Marque os cargos que receberão este exame:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {clientJobs.map(job => {
                        const checked = multiExamForm.target_job_ids.includes(job.id);
                        return (
                          <label key={job.id} className="flex items-center gap-2 p-1.5 bg-slate-900 rounded border border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setMultiExamForm({
                                    ...multiExamForm,
                                    target_job_ids: multiExamForm.target_job_ids.filter(id => id !== job.id)
                                  });
                                } else {
                                  setMultiExamForm({
                                    ...multiExamForm,
                                    target_job_ids: [...multiExamForm.target_job_ids, job.id]
                                  });
                                }
                              }}
                              className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-200 font-semibold truncate">{job.name}</span>
                            <span className="text-slate-500 text-[10px]">CBO: {job.cbo || 'N/A'}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Instruções de Preparo ao Trabalhador</label>
                <input
                  type="text"
                  value={multiExamForm.preparation_instructions}
                  onChange={(e) => setMultiExamForm({ ...multiExamForm, preparation_instructions: e.target.value })}
                  placeholder="Ex: Jejum de 8h, repouso acústico de 14h..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              {/* Feedback */}
              {multiExamFeedback && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>{multiExamFeedback}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMultiExamModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md flex items-center gap-1.5"
                >
                  <Stethoscope className="w-4 h-4" />
                  Confirmar Aplicação de Exame
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
