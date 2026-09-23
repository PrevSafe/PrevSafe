'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { SSTGroupHomogeneousExposure, SSTEnvironmentalRisk, RiskCategoryType, OccupationalRiskCatalogItem } from '@/types';
import { SeletorTabela27 } from './SeletorTabela27';
import { consultarProcedimento, codigoExisteNaTabela27 } from '@/lib/tabela27';
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
    units
  } = usePrevSafe();

  const clientGhes = ghes.filter(g => !selectedClientId || g.client_id === selectedClientId);
  const [selectedGheId, setSelectedGheId] = useState<string>(clientGhes[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Search & Apply from Global Catalog Modal State
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogGroupFilter, setCatalogGroupFilter] = useState('ALL');
  const [selectedCatalogRiskIds, setSelectedCatalogRiskIds] = useState<string[]>([]);
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
    exam_name: 'Audiometria Tonal Ocupacional',
    exam_code_table_27: '0295',
    periodicity_months: 12,
    triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'],
    mandatory_by_standard: 'NR-07',
    preparation_instructions: 'Repouso auditivo de no mínimo 14 horas prévias ao exame.',
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
    work_schedule_description: 'Jornada regular: 44h semanais, 07:00 às 17:00 com 1h intervalo',
    environment_description: 'Galpão industrial fechado, piso nivelado, ventilação natural e exaustão mecânica'
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
    health_effects: string;
    evaluation_type: 'QUALITATIVA' | 'QUANTITATIVA';
    measurement_unit: string;
    measured_value: string;
    tolerance_limit: string;
    action_level: string;
    measurement_methodology: string;
    severity: 1 | 2 | 3 | 4 | 5;
    probability: 1 | 2 | 3 | 4 | 5;
    epc_implemented: boolean;
    epc_description: string;
    epi_required: boolean;
    ca_number_input: string;
    epi_name_input: string;
    special_retirement_applies: boolean;
    gfip_code: '00' | '01' | '02' | '03' | '04';
    ltcat_technical_conclusion: string;
    insalubridade_applies: boolean;
    insalubridade_degree: '10%' | '20%' | '40%';
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
    health_effects: '',
    evaluation_type: 'QUALITATIVA',
    measurement_unit: '',
    measured_value: '',
    tolerance_limit: '',
    action_level: '',
    measurement_methodology: '',
    severity: 0 as any,
    probability: 0 as any,
    epc_implemented: false,
    epc_description: '',
    epi_required: false,
    ca_number_input: '',
    epi_name_input: '',
    special_retirement_applies: false,
    gfip_code: '00',
    ltcat_technical_conclusion: '',
    insalubridade_applies: false,
    insalubridade_degree: '20%',
    periculosidade_applies: false
  });

  const [generatedS2240Success, setGeneratedS2240Success] = useState<string | null>(null);

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
        work_schedule_description: ghe.work_schedule_description || '44h semanais',
        environment_description: ghe.environment_description || ''
      });
    } else {
      setEditingGhe(null);
      setGheForm({
        code: `GHE-${String(clientGhes.length + 1).padStart(2, '0')}`,
        name: '',
        description: '',
        sector_ids: hierarchySectors.slice(0, 1).map(s => s.id),
        job_ids: hierarchyJobs.slice(0, 2).map(j => j.id),
        work_schedule_description: 'Jornada regular: 44h semanais, 07:00 às 17:00 com 1h intervalo',
        environment_description: 'Galpão industrial fechado, piso nivelado, iluminação adequada conforme NR-17'
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
    const expostos = employees.filter(emp => emp.client_id === selectedClientId).length;

    const created = addGhe({
      client_id: selectedClientId,
      // Era 'unit-01' fixo, um id que pode nao existir para este cliente.
      client_unit_id: unidadeDoCliente?.id || '',
      ...gheForm,
      // Era `|| 5`: um GHE sem colaborador cadastrado nascia dizendo que havia
      // 5 expostos. Zero e a resposta correta.
      total_exposed_workers: expostos
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
        propagation_path: risk.propagation_path || 'Aérea',
        health_effects: risk.health_effects || '',
        evaluation_type: risk.evaluation_type,
        measurement_unit: risk.measurement_unit || '',
        measured_value: risk.measured_value || '',
        tolerance_limit: risk.tolerance_limit || '',
        action_level: risk.action_level || '',
        measurement_methodology: risk.measurement_methodology || '',
        severity: risk.severity || 3,
        probability: risk.probability || 3,
        epc_implemented: risk.epc_implemented,
        epc_description: risk.epc_description || '',
        epi_required: risk.epi_required,
        ca_number_input: risk.epis?.[0]?.ca_number || '',
        epi_name_input: risk.epis?.[0]?.epi_name || '',
        special_retirement_applies: risk.special_retirement_applies,
        gfip_code: risk.gfip_code || '00',
        ltcat_technical_conclusion: risk.ltcat_technical_conclusion || '',
        insalubridade_applies: risk.insalubridade_applies,
        insalubridade_degree: risk.insalubridade_degree || '20%',
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
        health_effects: '',
        evaluation_type: 'QUALITATIVA',
        measurement_unit: '',
        measured_value: '',
        tolerance_limit: '',
        action_level: '',
        measurement_methodology: '',
        // 0 = ainda nao classificado. Com 3 e 3 o risco ja nascia "MEDIO",
        // uma classificacao que nenhum profissional tinha feito.
        severity: 0 as any,
        probability: 0 as any,
        epc_implemented: false,
        epc_description: '',
        epi_required: false,
        ca_number_input: '',
        epi_name_input: '',
        special_retirement_applies: false,
        gfip_code: '00',
        ltcat_technical_conclusion: '',
        insalubridade_applies: false,
        insalubridade_degree: '20%',
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
    if (!riskForm.severity || !riskForm.probability) {
      alert(
        'Classifique a severidade e a probabilidade.\n\n' +
        'A classificação do risco (severidade x probabilidade) define a ordem ' +
        'de prioridade do Plano de Ação e não pode ser atribuída pelo sistema.'
      );
      return;
    }

    const riskScore = riskForm.severity * riskForm.probability;
    let risk_level: 'MUITO_BAIXO' | 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
    if (riskScore <= 3) risk_level = 'MUITO_BAIXO';
    else if (riskScore <= 8) risk_level = 'BAIXO';
    else if (riskScore <= 14) risk_level = 'MEDIO';
    else if (riskScore <= 20) risk_level = 'ALTO';
    else risk_level = 'CRITICO';

    const epis = riskForm.epi_required && riskForm.ca_number_input ? [
      {
        ca_number: riskForm.ca_number_input,
        epi_name: riskForm.epi_name_input || '',
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
      }
    ] : [];

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
      health_effects: riskForm.health_effects,
      evaluation_type: riskForm.evaluation_type,
      measured_value: riskForm.measured_value || undefined,
      measurement_unit: riskForm.measurement_unit || undefined,
      tolerance_limit: riskForm.tolerance_limit || undefined,
      action_level: riskForm.action_level || undefined,
      measurement_methodology: riskForm.measurement_methodology || undefined,
      probability: riskForm.probability,
      severity: riskForm.severity,
      risk_level,
      epc_implemented: riskForm.epc_implemented,
      epc_description: riskForm.epc_description || undefined,
      // Implantado e eficaz sao coisas diferentes: a NR-01 exige o
      // acompanhamento da EFICACIA das medidas (subitem 1.5.5.3). Copiar um
      // no outro dava por aferida uma eficacia que ninguem mediu.
      epc_effective: false,
      epi_required: riskForm.epi_required,
      epis,
      special_retirement_applies: riskForm.special_retirement_applies,
      gfip_code: riskForm.gfip_code,
      ltcat_technical_conclusion: riskForm.ltcat_technical_conclusion,
      insalubridade_applies: riskForm.insalubridade_applies,
      insalubridade_degree: riskForm.insalubridade_degree,
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
    const evt = generateS2240FromGhe(activeGhe.id);
    if (evt) {
      setGeneratedS2240Success(`Evento S-2240 (${evt.event_number}) gerado com sucesso para ${activeGhe.name}! Pronto para transmissão.`);
      setTimeout(() => setGeneratedS2240Success(null), 5000);
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
                        <p className="text-[11px] text-slate-400 line-clamp-2">{ghe.description || 'Ambiente fabril com riscos físicos e químicos mapeados.'}</p>
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
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold font-mono rounded">
                              Tabela 24: {risk.risk_code_table_24}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-semibold rounded">
                              {risk.risk_category}
                            </span>
                            <span className="text-xs font-bold text-slate-100">{risk.agent_name}</span>
                          </div>
                          <p className="text-xs text-slate-400">
                            <strong>Fonte Geradora:</strong> {risk.generating_source}
                          </p>
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

                        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-500 block font-semibold">Matriz de Risco</span>
                          <span className="font-bold text-amber-400">{risk.risk_level}</span>
                          <span className="text-[10px] text-slate-400 block">P{risk.probability} x S{risk.severity}</span>
                        </div>

                        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-500 block font-semibold">EPI / EPC</span>
                          <span className="text-slate-200 block text-[11px]">
                            {risk.epi_required ? `EPI: CA ${risk.epis?.[0]?.ca_number || 'Sim'}` : 'EPI: Não'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            EPC: {risk.epc_implemented ? 'Ativo' : 'Não'}
                          </span>
                        </div>

                        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-500 block font-semibold">LTCAT / GFIP</span>
                          <span className="font-mono text-slate-200 block text-[11px]">GFIP: {risk.gfip_code || '00'}</span>
                          <span className="text-[10px] text-emerald-400 block font-semibold">
                            {risk.special_retirement_applies ? 'Aposentadoria Especial' : 'Sem Aposentadoria'}
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
              <div className="grid grid-cols-3 gap-3">
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

              {/* Quantification & Limits */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-teal-400" />
                  Avaliação e Métricas de Exposição
                </h4>
                <div className="grid grid-cols-4 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Nº do C.A. do EPI</label>
                    <input
                      type="text"
                      placeholder="14235"
                      value={riskForm.ca_number_input}
                      onChange={(e) => setRiskForm({ ...riskForm, ca_number_input: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Descrição do EPI</label>
                    <input
                      type="text"
                      placeholder="Protetor Auricular tipo Plug"
                      value={riskForm.epi_name_input}
                      onChange={(e) => setRiskForm({ ...riskForm, epi_name_input: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Special Enquadramentos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Código GFIP (SEFIP / eSocial)</label>
                  <select
                    value={riskForm.gfip_code}
                    onChange={(e) => setRiskForm({ ...riskForm, gfip_code: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                  >
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
                    placeholder="Filtrar por agente (ex: ruído, poeira), código eSocial (ex: 01.01.001), danos..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-4">
                  <select
                    value={catalogGroupFilter}
                    onChange={(e) => setCatalogGroupFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">Todos os Grupos (1 a 5)</option>
                    <option value="FÍSICO">Físicos (Grupo 1)</option>
                    <option value="QUÍMICO">Químicos (Grupo 2)</option>
                    <option value="BIOLÓGICO">Biológicos (Grupo 3)</option>
                    <option value="ERGONÔMICO">Ergonômicos (Grupo 4)</option>
                    <option value="ACIDENTE">Acidentes (Grupo 5)</option>
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
                      {hierarchyJobs.map(job => {
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
                      {hierarchySectors.map(sec => {
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
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">
                    Selecione os Agentes Nocivos do Catálogo ({selectedCatalogRiskIds.length} selecionados):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const visible = occupationalRisksCatalog.filter(r => {
                        const matchGroup = catalogGroupFilter === 'ALL' || r.group === catalogGroupFilter;
                        const matchSearch = r.name.toLowerCase().includes(catalogSearch.toLowerCase()) || r.code_table_24.includes(catalogSearch);
                        return matchGroup && matchSearch;
                      });
                      if (selectedCatalogRiskIds.length === visible.length) {
                        setSelectedCatalogRiskIds([]);
                      } else {
                        setSelectedCatalogRiskIds(visible.map(r => r.id));
                      }
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Alternar Selecionar Todos Visíveis
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-800 rounded-xl p-2 bg-slate-950">
                  {occupationalRisksCatalog
                    .filter(r => {
                      const matchGroup = catalogGroupFilter === 'ALL' || r.group === catalogGroupFilter;
                      const matchSearch = r.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                                          r.code_table_24.includes(catalogSearch) ||
                                          r.health_effects.toLowerCase().includes(catalogSearch.toLowerCase());
                      return matchGroup && matchSearch;
                    })
                    .map(item => {
                      const checked = selectedCatalogRiskIds.includes(item.id);
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

                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                                {item.code_table_24}
                              </span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                {item.group}
                              </span>
                              <span className="text-slate-100 font-bold text-xs">
                                {item.name}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              <strong>Efeitos:</strong> {item.health_effects}
                            </p>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                              {item.tolerance_limit_reference && (
                                <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                  LT: {item.tolerance_limit_reference}
                                </span>
                              )}
                              {item.suggested_exams_pcmso.length > 0 && (
                                <span className="text-blue-400 flex items-center gap-1">
                                  <Stethoscope className="w-3 h-3" />
                                  Exames PCMSO: {item.suggested_exams_pcmso.map(e => e.exam_name).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
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

              {/* Feedback Alert */}
              {catalogFeedback && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300 font-medium animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>{catalogFeedback.message}</span>
                </div>
              )}
            </div>

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
                      {hierarchyJobs.map(job => {
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
