'use client';

import React, { useState, useMemo } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { OccupationalRiskCatalogItem, RiskCategoryType } from '@/types';
import { SeletorTabela27 } from './SeletorTabela27';
import { consultarProcedimento, codigoExisteNaTabela27 } from '@/lib/tabela27';
import { formatoDoCodigoTabela24, codigosDuplicados, consultarAgente, codigoExisteNaTabela24 } from '@/lib/tabela24';
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
  Filter, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Layers, 
  HardHat, 
  Stethoscope, 
  BookOpen, 
  Eye, 
  Building2, 
  Briefcase, 
  ChevronRight,
  ArrowUpRight,
  X,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Activity,
  Sliders,
  Flame,
  Zap,
  HelpCircle
} from 'lucide-react';

interface OccupationalRisksCatalogViewProps {
  onNavigate?: (view: string) => void;
}

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

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [evaluationTypeFilter, setEvaluationTypeFilter] = useState<string>('ALL');

  // Modal State for Add / Edit Risk
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OccupationalRiskCatalogItem | null>(null);
  const [form, setForm] = useState<{
    risk_code_table_24: string;
    agent_name: string;
    group: RiskCategoryType;
    evaluation_type_standard: 'QUALITATIVA' | 'QUANTITATIVA';
    measurement_unit_standard?: string;
    tolerance_limit_nr15?: string;
    action_level_nr09?: string;
    harmful_effects: string;
    regulatory_norm_reference: string;
    suggested_medium?: string;
    suggested_source?: string;
    suggested_controls_summary?: string;
    suggested_measured_value?: number;
    suggested_epis_text: string;
    /**
     * Exames sugeridos, escolhidos da Tabela 27. Era um campo de texto no
     * formato "Nome [Codigo] - 12m", e o parser caia em '0295' sempre que o
     * codigo nao vinha entre colchetes - 0295 e Avaliacao clinica, entao
     * qualquer exame digitado sem codigo virava avaliacao clinica.
     */
    suggested_exams: Array<{ codigo: string; nome: string; periodicidade_meses: number }>;
    description?: string;
  }>({
    // Vazio. Vinha pre-preenchido com um agente de ruido completo: limite de
    // 85 dB(A), medicao sugerida de 84,0 e os CAs 14235 e 29745 - numeros que
    // seriam copiados para dentro de riscos reais de clientes.
    risk_code_table_24: '',
    agent_name: '',
    group: 'FÍSICO',
    evaluation_type_standard: 'QUANTITATIVA',
    measurement_unit_standard: '',
    tolerance_limit_nr15: '',
    action_level_nr09: '',
    harmful_effects: '',
    regulatory_norm_reference: '',
    suggested_medium: 'AR',
    suggested_source: '',
    suggested_controls_summary: '',
    suggested_measured_value: 0,
    suggested_epis_text: '',
    suggested_exams: [],
    description: ''
  });

  // Modal State for Apply to Clients / GHE / Hierarchy
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedRiskIdsToApply, setSelectedRiskIdsToApply] = useState<string[]>([]);
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

  // Filtered risks list
  const filteredRisks = useMemo(() => {
    return occupationalRisksCatalog.filter(item => {
      // Busca sem acento e tolerante a campo vazio. `code_table_24` e
      // `regulatory_norm_reference` sao opcionais: risco ergonomico e de
      // acidente nao tem codigo no Anexo IV. Chamar .toLowerCase() neles
      // direto derrubava a tela a cada tecla.
      const semAcento = (t: any) =>
        String(t ?? '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
      const busca = semAcento(searchTerm);
      const matchSearch =
        busca === '' ||
        [
          item.name,
          item.code_table_24,
          item.health_effects,
          item.regulatory_norm_reference,
          item.suggested_source,
          item.esocial_enquadramento_nota
        ].some((campo) => semAcento(campo).includes(busca));

      const matchGroup = selectedGroup === 'ALL' || item.group === selectedGroup;
      const matchEval = evaluationTypeFilter === 'ALL' || item.evaluation_type === evaluationTypeFilter;

      return matchSearch && matchGroup && matchEval;
    });
  }, [occupationalRisksCatalog, searchTerm, selectedGroup, evaluationTypeFilter]);

  // Statistics
  const groupStats = useMemo(() => {
    const stats: Record<string, number> = {
      'FÍSICO': 0,
      'QUÍMICO': 0,
      'BIOLÓGICO': 0,
      'ERGONÔMICO': 0,
      'ACIDENTES': 0
    };
    occupationalRisksCatalog.forEach(r => {
      if (stats[r.group] !== undefined) stats[r.group]++;
    });
    return stats;
  }, [occupationalRisksCatalog]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setForm({
      risk_code_table_24: '',
      agent_name: '',
      group: 'FÍSICO',
      evaluation_type_standard: 'QUANTITATIVA',
      measurement_unit_standard: 'dB(A)',
      tolerance_limit_nr15: '',
      action_level_nr09: '',
      harmful_effects: '',
      regulatory_norm_reference: 'NR-01 / NR-09',
      suggested_medium: 'AR',
      suggested_source: '',
      suggested_controls_summary: '',
      suggested_measured_value: 0,
      suggested_epis_text: '',
      suggested_exams: [],
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: OccupationalRiskCatalogItem) => {
    setEditingItem(item);
    const episText = item.recommended_epis.map(e => `${e.name} (CA ${e.ca_example})`).join(', ');
    const examsText = item.suggested_exams_pcmso.map(e => `${e.exam_name} [${e.exam_code}] - ${e.periodicity_months}m`).join(', ');
    
    setForm({
      risk_code_table_24: item.code_table_24,
      agent_name: item.name,
      group: item.group,
      evaluation_type_standard: item.evaluation_type,
      measurement_unit_standard: item.standard_unit || '',
      tolerance_limit_nr15: item.tolerance_limit_reference || '',
      action_level_nr09: item.action_level_reference || '',
      harmful_effects: item.health_effects,
      regulatory_norm_reference: item.regulatory_norm_reference,
      suggested_medium: item.suggested_medium || 'AR',
      suggested_source: item.suggested_source || '',
      suggested_controls_summary: item.suggested_controls_summary || '',
      suggested_measured_value: item.suggested_measured_value || 0,
      suggested_epis_text: episText,
      suggested_exams: (item.suggested_exams_pcmso || []).map(ex => ({
        codigo: ex.exam_code || '',
        nome: consultarProcedimento(ex.exam_code)?.nome || ex.exam_name || '',
        periodicidade_meses: ex.periodicity_months || 12,
      })),
      description: item.description || ''
    });
    setIsModalOpen(true);
  };

  /** Códigos da Tabela 24 usados por mais de um agente, com os nomes. */
  const codigosRepetidos = useMemo(() => {
    const mapa = new Map<string, string[]>();
    codigosDuplicados(occupationalRisksCatalog).forEach(d => mapa.set(d.codigo, d.nomes));
    return mapa;
  }, [occupationalRisksCatalog]);

  const handleSaveRisk = (e: React.FormEvent) => {
    e.preventDefault();

    // Antes: `return` em silencio. O usuario clicava em salvar, nada acontecia
    // e nenhuma mensagem aparecia.
    if (!form.agent_name.trim()) {
      alert('Informe o nome do agente de risco.');
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
    if (codigoInformado) {
      const jaUsado = occupationalRisksCatalog.find(
        r => r.code_table_24 === codigoInformado && r.id !== editingItem?.id
      );
      if (jaUsado) {
        const segue = confirm(
          `O código ${codigoInformado} já está em "${jaUsado.name}".\n\n` +
          'Isso é correto quando dois agentes do PGR têm o mesmo enquadramento no Anexo IV ' +
          '(por exemplo ruído contínuo e ruído de impacto, ambos 02.01.001).\n\nDeseja continuar?'
        );
        if (!segue) return;
      }
    }
    const examesInvalidos = form.suggested_exams.filter(ex => !codigoExisteNaTabela27(ex.codigo));
    if (examesInvalidos.length > 0) {
      alert(`${examesInvalidos.length} exame(s) sugerido(s) com código fora da Tabela 27.`);
      return;
    }

    // Parse EPIs
    const episParsed = form.suggested_epis_text
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const caMatch = part.match(/CA\s*(\d+)/i);
        const name = part.replace(/\(CA\s*\d+\)/i, '').trim();
        return {
          name: name || 'Equipamento de Proteção Individual',
          // Sem CA de fachada: o padrao era '12345', um numero de CA que nao
          // existe. Ele seria copiado para o risco real do cliente e de la
          // para o campo epi_ca_numbers do S-2240.
          ca_example: caMatch ? caMatch[1] : undefined,
          protection_type: 'Proteção Individual'
        };
      });

    // Os exames vem escolhidos da Tabela 27: codigo e nome oficiais, sem
    // parser de texto. O parser antigo caia em exam_code '0295' quando o
    // codigo nao vinha entre colchetes - e 0295 e Avaliacao clinica
    // ocupacional, entao "Audiometria" digitada sem codigo era gravada como
    // avaliacao clinica.
    const examsParsed = form.suggested_exams.map(ex => ({
      exam_code: ex.codigo,
      exam_name: consultarProcedimento(ex.codigo)?.nome || ex.nome,
      periodicity_months: ex.periodicidade_meses || 12,
      triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'] as Array<'ADMISSIONAL' | 'PERIODICO' | 'RETORNO_TRABALHO' | 'MUDANCA_RISCO' | 'DEMISSIONAL'>,
      mandatory_standard: 'NR-07' as const
    }));

    const payload = {
      code_table_24: (form.risk_code_table_24 || '').trim() || undefined,
      name: form.agent_name,
      group: form.group,
      evaluation_type: form.evaluation_type_standard,
      standard_unit: form.measurement_unit_standard || undefined,
      tolerance_limit_reference: form.tolerance_limit_nr15 || undefined,
      action_level_reference: form.action_level_nr09 || undefined,
      health_effects: form.harmful_effects,
      regulatory_norm_reference: form.regulatory_norm_reference,
      suggested_medium: form.suggested_medium,
      suggested_source: form.suggested_source,
      suggested_controls_summary: form.suggested_controls_summary,
      suggested_measured_value: form.suggested_measured_value,
      recommended_epis: episParsed.length > 0 ? episParsed : [
        { name: 'EPI Adequado', ca_example: undefined, protection_type: 'Proteção Individual' }
      ],
      suggested_exams_pcmso: examsParsed,
      description: form.description,
      generating_sources: form.suggested_source || 'Fonte não especificada',
      propagation_paths: form.suggested_medium || 'Não especificado',
      recommended_epcs: form.suggested_controls_summary || 'Não especificado',
      default_severity: 3 as const,
      default_probability: 3 as const,
      special_retirement_eligible: false,
      gfip_code_suggested: '00' as const,
      insalubridade_applicable: false,
      periculosidade_applicable: false,
      status: 'ACTIVE' as const,
      is_custom: true
    };

    if (editingItem) {
      updateOccupationalRiskCatalogItem(editingItem.id, payload);
    } else {
      addOccupationalRiskCatalogItem(payload);
    }

    setIsModalOpen(false);
  };

  const handleOpenApplyModal = (singleRiskId?: string) => {
    if (singleRiskId) {
      setSelectedRiskIdsToApply([singleRiskId]);
    } else if (selectedRiskIdsToApply.length === 0) {
      // Default to the first 3 if none selected
      setSelectedRiskIdsToApply(filteredRisks.slice(0, 2).map(r => r.id));
    }
    const client = clients.find(c => c.id === applyClientId) || clients[0];
    if (client) {
      const clientGhes = ghes.filter(g => g.client_id === client.id);
      setSelectedTargetGheIds(clientGhes.map(g => g.id));
    }
    setApplyFeedback(null);
    setIsApplyModalOpen(true);
  };

  const handleExecuteApply = () => {
    if (selectedRiskIdsToApply.length === 0) {
      alert('Selecione ao menos um risco do catálogo para aplicar.');
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

    const result = applyRisksToTargets({
      client_id: applyClientId,
      risk_catalog_ids: selectedRiskIdsToApply,
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

  const toggleSelectAllRisks = () => {
    if (selectedRiskIdsToApply.length === filteredRisks.length) {
      setSelectedRiskIdsToApply([]);
    } else {
      setSelectedRiskIdsToApply(filteredRisks.map(r => r.id));
    }
  };

  const toggleSelectRisk = (id: string) => {
    if (selectedRiskIdsToApply.includes(id)) {
      setSelectedRiskIdsToApply(prev => prev.filter(rId => rId !== id));
    } else {
      setSelectedRiskIdsToApply(prev => [...prev, id]);
    }
  };

  const getGroupBadgeColor = (group: RiskCategoryType) => {
    switch (group) {
      case 'FÍSICO': return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'QUÍMICO': return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'BIOLÓGICO': return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'ERGONÔMICO': return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'ACIDENTES': return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      default: return 'bg-slate-950 text-slate-300 border-slate-800';
    }
  };

  const clientGhesForModal = ghes.filter(g => g.client_id === applyClientId);
  const clientJobsForModal = hierarchyJobs.filter(j => hierarchySectors.some(s => s.id === j.sector_id && s.client_id === applyClientId));
  const clientSectorsForModal = hierarchySectors.filter(s => s.client_id === applyClientId);

  return (
    <div id="occupational-risks-catalog-view" className="space-y-6 pb-12">
      {/* Header with Stats & Actions */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Tabela 24 do eSocial Oficial & NR-01/09/15/17
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                {occupationalRisksCatalog.length} agentes catalogados
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-emerald-400" />
              Catálogo Global de Riscos Ocupacionais
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl mt-1">
              Base oficial padronizada para caracterização de agentes nocivos, limites de tolerância (NR-15), níveis de ação (NR-09), EPIs sugeridos com CA e exames PCMSO (Tabela 27). Permite aplicação direta a qualquer GHE, cargo ou árvore de cargos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-reset-catalog-defaults"
              onClick={resetOccupationalRisksCatalogToDefault}
              title="Restaurar lista oficial padronizada de riscos eSocial"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Padrão
            </button>

            {selectedRiskIdsToApply.length > 0 && (
              <button
                id="btn-apply-selected-risks"
                onClick={() => handleOpenApplyModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                <ArrowUpRight className="w-4 h-4" />
                Aplicar Selecionados ({selectedRiskIdsToApply.length}) em GHE / Cargos
              </button>
            )}

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

        {/* Group Cards Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800">
          <button
            onClick={() => setSelectedGroup(selectedGroup === 'FÍSICO' ? 'ALL' : 'FÍSICO')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedGroup === 'FÍSICO' 
                ? 'border-amber-500 bg-amber-500/25 shadow-sm ring-2 ring-amber-500/40' 
                : 'border-slate-800 hover:border-amber-500/30 hover:bg-amber-500/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">Físicos (01)</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-100">{groupStats['FÍSICO']}</span>
              <span className="text-xs text-slate-500">agentes</span>
            </div>
            <span className="text-[11px] text-amber-300 block mt-0.5">Ruído, calor, vibrações</span>
          </button>

          <button
            onClick={() => setSelectedGroup(selectedGroup === 'QUÍMICO' ? 'ALL' : 'QUÍMICO')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedGroup === 'QUÍMICO' 
                ? 'border-rose-500 bg-rose-500/25 shadow-sm ring-2 ring-rose-500/40' 
                : 'border-slate-800 hover:border-rose-500/30 hover:bg-rose-500/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wide">Químicos (02)</span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-100">{groupStats['QUÍMICO']}</span>
              <span className="text-xs text-slate-500">agentes</span>
            </div>
            <span className="text-[11px] text-rose-300 block mt-0.5">Poeiras, vapores, fumos</span>
          </button>

          <button
            onClick={() => setSelectedGroup(selectedGroup === 'BIOLÓGICO' ? 'ALL' : 'BIOLÓGICO')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedGroup === 'BIOLÓGICO' 
                ? 'border-emerald-500 bg-emerald-500/25 shadow-sm ring-2 ring-emerald-500/40' 
                : 'border-slate-800 hover:border-emerald-500/30 hover:bg-emerald-500/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">Biológicos (03)</span>
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-100">{groupStats['BIOLÓGICO']}</span>
              <span className="text-xs text-slate-500">agentes</span>
            </div>
            <span className="text-[11px] text-emerald-300 block mt-0.5">Vírus, bactérias, fungos</span>
          </button>

          <button
            onClick={() => setSelectedGroup(selectedGroup === 'ERGONÔMICO' ? 'ALL' : 'ERGONÔMICO')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedGroup === 'ERGONÔMICO' 
                ? 'border-purple-500 bg-purple-500/25 shadow-sm ring-2 ring-purple-500/40' 
                : 'border-slate-800 hover:border-purple-500/30 hover:bg-purple-500/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">Ergonômicos (04)</span>
              <Sliders className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-100">{groupStats['ERGONÔMICO']}</span>
              <span className="text-xs text-slate-500">agentes</span>
            </div>
            <span className="text-[11px] text-purple-300 block mt-0.5">Postura, carga, repetição</span>
          </button>

          <button
            onClick={() => setSelectedGroup(selectedGroup === 'ACIDENTES' ? 'ALL' : 'ACIDENTES')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedGroup === 'ACIDENTES' 
                ? 'border-sky-500 bg-sky-500/25 shadow-sm ring-2 ring-sky-500/40' 
                : 'border-slate-800 hover:border-sky-500/30 hover:bg-sky-500/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-300 uppercase tracking-wide">Acidentes (05)</span>
              <Zap className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-100">{groupStats['ACIDENTES']}</span>
              <span className="text-xs text-slate-500">agentes</span>
            </div>
            <span className="text-[11px] text-sky-300 block mt-0.5">Queda, choque, máquinas</span>
          </button>
        </div>
      </div>

      {/* Filters Bar & Quick Search */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex-1 w-full relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-search-occupational-risks"
              type="text"
              placeholder="Buscar por agente, código eSocial (ex: 01.01.001), efeito nocivo, norma regulamentadora..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-950 text-slate-100 placeholder-slate-500 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              id="select-filter-group"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-950 text-slate-100 placeholder-slate-500"
            >
              <option value="ALL">Todos os Grupos</option>
              <option value="FÍSICO">Físicos (Grupo 1)</option>
              <option value="QUÍMICO">Químicos (Grupo 2)</option>
              <option value="BIOLÓGICO">Biológicos (Grupo 3)</option>
              <option value="ERGONÔMICO">Ergonômicos (Grupo 4)</option>
              <option value="ACIDENTE">Acidentes / Mecânicos (Grupo 5)</option>
            </select>

            <select
              id="select-filter-eval-type"
              value={evaluationTypeFilter}
              onChange={(e) => setEvaluationTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-950 text-slate-100 placeholder-slate-500"
            >
              <option value="ALL">Todas as Avaliações</option>
              <option value="QUANTITATIVA">Quantitativa (com limites)</option>
              <option value="QUALITATIVA">Qualitativa (inspeção)</option>
            </select>

            <button
              id="btn-toggle-select-all"
              onClick={toggleSelectAllRisks}
              className="px-3 py-2 text-xs font-semibold text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800/60 flex items-center gap-1.5 whitespace-nowrap"
            >
              {selectedRiskIdsToApply.length === filteredRisks.length && filteredRisks.length > 0 ? (
                <>
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  Desmarcar Todos
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  Selecionar Todos ({filteredRisks.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Risks Table / Cards List */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-200">
              Inventário de Riscos Catalogados ({filteredRisks.length})
            </h2>
            {selectedGroup !== 'ALL' && (
              <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getGroupBadgeColor(selectedGroup as RiskCategoryType)}`}>
                Filtrado: {selectedGroup}
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500">
            {selectedRiskIdsToApply.length} item(ns) selecionado(s) para aplicação
          </div>
        </div>

        {filteredRisks.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-300">Nenhum risco encontrado para os filtros aplicados</p>
            <p className="text-sm text-slate-500 mt-1">Experimente limpar a busca ou adicionar um novo agente nocivo ao catálogo.</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedGroup('ALL'); setEvaluationTypeFilter('ALL'); }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-emerald-300 bg-emerald-500/15 rounded-lg hover:bg-emerald-500/20"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredRisks.map((item) => {
              const isSelected = selectedRiskIdsToApply.includes(item.id);
              return (
                <div 
                  key={item.id} 
                  className={`p-5 transition-colors hover:bg-slate-800/60 ${
                    isSelected ? 'bg-indigo-500/20 border-l-4 border-l-indigo-600' : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Checkbox + Main Info */}
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() => toggleSelectRisk(item.id)}
                        className="mt-1 flex-shrink-0 text-slate-400 hover:text-indigo-400"
                        title={isSelected ? 'Desmarcar risco' : 'Selecionar risco para aplicar'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-indigo-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>

                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getGroupBadgeColor(item.group)}`}>
                            {item.group}
                          </span>
                          {/* Sem codigo e o estado NORMAL para risco
                              ergonomico e de acidente: eles entram no PGR mas
                              nao constam do Anexo IV. Por isso o selo e neutro,
                              nao um alerta. */}
                          {item.code_table_24 ? (
                            <span
                              className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-800"
                              title={consultarAgente(item.code_table_24)?.nome}
                            >
                              eSocial {item.code_table_24}
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
                          {!!item.code_table_24 && !codigoExisteNaTabela24(item.code_table_24) && (
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              title={formatoDoCodigoTabela24(item.code_table_24).motivo || 'Este código não consta na Tabela 24.'}
                            >
                              código inexistente
                            </span>
                          )}
                          {!!item.code_table_24 && codigosRepetidos.has(item.code_table_24) && (
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              title={`Mesmo enquadramento de: ${codigosRepetidos.get(item.code_table_24)?.join('; ')}`}
                            >
                              enquadramento compartilhado
                            </span>
                          )}
                          <span className="text-xs font-semibold text-slate-400">
                            Ref: {item.regulatory_norm_reference}
                          </span>
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

                        {/* Denominação oficial do agente, quando difere do nome
                            usado no catálogo: é ela que vale no S-2240. */}
                        {!!item.code_table_24 && consultarAgente(item.code_table_24)?.nome !== item.name && (
                          <p className="text-xs text-slate-500">
                            Agente no eSocial:{' '}
                            <span className="text-slate-300">
                              {consultarAgente(item.code_table_24)?.nome}
                            </span>
                          </p>
                        )}

                        {/* Por que não há código, ou qual escolher quando há
                            mais de um candidato. */}
                        {item.esocial_enquadramento_nota && (
                          <p className="text-xs text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded p-2">
                            <span className="font-semibold">Enquadramento no eSocial:</span>{' '}
                            {item.esocial_enquadramento_nota}
                          </p>
                        )}

                        <p className="text-sm text-slate-400">
                          <span className="font-semibold text-slate-300">Danos Prováveis à Saúde:</span> {item.health_effects}
                        </p>

                        {/* Characterization Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 text-xs">
                          {item.tolerance_limit_reference && (
                            <div className="p-2 rounded bg-slate-950 border border-slate-800">
                              <span className="font-semibold text-slate-500 block">Limite Tolerância (NR-15):</span>
                              <span className="font-medium text-slate-200">{item.tolerance_limit_reference}</span>
                            </div>
                          )}

                          {item.action_level_reference && (
                            <div className="p-2 rounded bg-slate-950 border border-slate-800">
                              <span className="font-semibold text-slate-500 block">Nível de Ação (NR-09):</span>
                              <span className="font-medium text-slate-200">{item.action_level_reference}</span>
                            </div>
                          )}

                          {item.suggested_medium && (
                            <div className="p-2 rounded bg-slate-950 border border-slate-800">
                              <span className="font-semibold text-slate-500 block">Meio Propagação:</span>
                              <span className="font-medium text-slate-200">{item.suggested_medium}</span>
                            </div>
                          )}

                          {item.suggested_source && (
                            <div className="p-2 rounded bg-slate-950 border border-slate-800">
                              <span className="font-semibold text-slate-500 block">Fonte Típica:</span>
                              <span className="font-medium text-slate-200 truncate block" title={item.suggested_source}>
                                {item.suggested_source}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Suggested EPIs & PCMSO Exams tags */}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          {item.recommended_epis.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                                <HardHat className="w-3.5 h-3.5" /> EPIs Sugeridos:
                              </span>
                              {item.recommended_epis.map((epi, idx) => (
                                <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  {epi.name} (CA {epi.ca_example})
                                </span>
                              ))}
                            </div>
                          )}

                          {item.suggested_exams_pcmso.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-blue-300 flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5" /> Exames PCMSO (Tab 27):
                              </span>
                              {item.suggested_exams_pcmso.map((ex, idx) => (
                                <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                  {ex.exam_name} [{ex.exam_code}] ({ex.periodicity_months}m)
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions on this item */}
                    <div className="flex items-center gap-1.5 self-end lg:self-start flex-shrink-0">
                      <button
                        id={`btn-apply-single-risk-${item.id}`}
                        onClick={() => handleOpenApplyModal(item.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/30 transition-colors"
                        title="Aplicar este risco a um GHE ou Árvore de Cargos"
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
                        id={`btn-delete-risk-${item.id}`}
                        onClick={() => {
                          if (confirm(`Excluir o risco "${item.name}" do catálogo?`)) {
                            deleteOccupationalRiskCatalogItem(item.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-lg border border-slate-800 transition-colors"
                        title="Excluir risco do catálogo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
                  {editingItem ? 'Editar Caracterização do Risco Ocupacional' : 'Cadastrar Novo Risco no Catálogo Oficial'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRisk} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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
                    value={form.group}
                    onChange={(e) => setForm({ ...form, group: e.target.value as RiskCategoryType })}
                    className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-950 text-slate-100 placeholder-slate-500"
                  >
                    <option value="FÍSICO">Físico (Grupo 1 - Verde/Laranja)</option>
                    <option value="QUÍMICO">Químico (Grupo 2 - Vermelho)</option>
                    <option value="BIOLÓGICO">Biológico (Grupo 3 - Marrom)</option>
                    <option value="ERGONÔMICO">Ergonômico (Grupo 4 - Amarelo)</option>
                    <option value="ACIDENTE">Acidente / Mecânico (Grupo 5 - Azul)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Norma Regulamentadora *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: NR-15 Anexo 1 / NR-09"
                    value={form.regulatory_norm_reference}
                    onChange={(e) => setForm({ ...form, regulatory_norm_reference: e.target.value })}
                    className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Nome do Agente Nocivo / Fator de Risco *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ruído Contínuo ou Intermitente"
                  value={form.agent_name}
                  onChange={(e) => setForm({ ...form, agent_name: e.target.value })}
                  className="bg-slate-950 w-full px-3 py-2 text-sm font-semibold border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Danos Prováveis à Saúde (Efeitos Nocivos) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ex: Perda auditiva induzida por ruído ocupacional (PAIR), zumbido, estresse, fadiga."
                  value={form.harmful_effects}
                  onChange={(e) => setForm({ ...form, harmful_effects: e.target.value })}
                  className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Tipo de Avaliação *
                  </label>
                  <select
                    value={form.evaluation_type_standard}
                    onChange={(e) => setForm({ ...form, evaluation_type_standard: e.target.value as 'QUALITATIVA' | 'QUANTITATIVA' })}
                    className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-950 text-slate-100 placeholder-slate-500"
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
                    placeholder="Ex: dB(A), ppm, mg/m³, m/s²"
                    value={form.measurement_unit_standard}
                    onChange={(e) => setForm({ ...form, measurement_unit_standard: e.target.value })}
                    className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Meio de Propagação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: AR, Contato Dérmico, Solo"
                    value={form.suggested_medium}
                    onChange={(e) => setForm({ ...form, suggested_medium: e.target.value })}
                    className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Limite de Tolerância (NR-15)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 85.0 dB(A) para 8 horas"
                    value={form.tolerance_limit_nr15}
                    onChange={(e) => setForm({ ...form, tolerance_limit_nr15: e.target.value })}
                    className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Nível de Ação (NR-09)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 80.0 dB(A) (dose 50%)"
                    value={form.action_level_nr09}
                    onChange={(e) => setForm({ ...form, action_level_nr09: e.target.value })}
                    className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Fonte Geradora Típica / Atividade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Operação de maquinários rotativos, caldeiras, prensas"
                  value={form.suggested_source}
                  onChange={(e) => setForm({ ...form, suggested_source: e.target.value })}
                  className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  EPIs Sugeridos (com CA) - Separados por vírgula
                </label>
                <input
                  type="text"
                  placeholder="Ex: Protetor Auditivo tipo Plug (CA 14235), Óculos de Proteção (CA 27500)"
                  value={form.suggested_epis_text}
                  onChange={(e) => setForm({ ...form, suggested_epis_text: e.target.value })}
                  className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
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
                            className="w-14 px-2 py-1.5 text-[11px] bg-slate-950 text-slate-100 border border-slate-700 rounded-lg text-center"
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
                  placeholder="Ex: Enclausuramento acústico, EPC exaustão mecânica e pausas térmicas"
                  value={form.suggested_controls_summary}
                  onChange={(e) => setForm({ ...form, suggested_controls_summary: e.target.value })}
                  className="bg-slate-950 w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder-slate-500"
                />
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
              {/* Selected Risks Summary */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                  Riscos Selecionados para Aplicação ({selectedRiskIdsToApply.length}):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {occupationalRisksCatalog.filter(r => selectedRiskIdsToApply.includes(r.id)).map(r => (
                    <span key={r.id} className="text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-medium">
                      {r.name} ({r.code_table_24})
                    </span>
                  ))}
                </div>
              </div>

              {/* Target Client */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Empresa / Cliente de Destino *
                </label>
                <select
                  value={applyClientId}
                  onChange={(e) => {
                    setApplyClientId(e.target.value);
                    const newClientGhes = ghes.filter(g => g.client_id === e.target.value);
                    setSelectedTargetGheIds(newClientGhes.map(g => g.id));
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-950 text-slate-100 placeholder-slate-500"
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
                      Nenhum GHE cadastrado para este cliente. Os riscos serão criados com base nas atividades da empresa.
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
                      Nenhum cargo específico cadastrado na hierarquia desta empresa. O risco será vinculado ao GHE principal.
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
                    placeholder="Qual a circunstância? Ex.: limpeza e ajuste; parada programada"
                    value={situacaoNota}
                    onChange={(e) => setSituacaoNota(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-teal-500"
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
                      Gera automaticamente os protocolos de exames complementares (audiometria, espirometria, acuidade, etc.) para os GHEs de destino.
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
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5"
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
