'use client';

import React, { useState, useMemo } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { OccupationalRiskCatalogItem, RiskCategoryType } from '@/types';
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
    suggested_exams_text: string;
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
    suggested_exams_text: '',
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
  const [applyFeedback, setApplyFeedback] = useState<{ count: number; examsCount: number; message: string } | null>(null);

  // Filtered risks list
  const filteredRisks = useMemo(() => {
    return occupationalRisksCatalog.filter(item => {
      const matchSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code_table_24.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.health_effects.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.regulatory_norm_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.suggested_source && item.suggested_source.toLowerCase().includes(searchTerm.toLowerCase()));

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
      suggested_exams_text: '',
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
      suggested_exams_text: examsText,
      description: item.description || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agent_name || !form.risk_code_table_24) return;

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
          ca_example: caMatch ? caMatch[1] : '12345',
          protection_type: 'Proteção Individual'
        };
      });

    // Parse Exams
    const examsParsed = form.suggested_exams_text
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const codeMatch = part.match(/\[(\d+)\]/);
        const name = part.replace(/\[\d+\]/g, '').replace(/-\s*\d+m/g, '').trim();
        return {
          exam_code: codeMatch ? codeMatch[1] : '0295',
          exam_name: name || 'Exame Clínico Ocupacional',
          periodicity_months: 12,
          triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'] as Array<'ADMISSIONAL' | 'PERIODICO' | 'RETORNO_TRABALHO' | 'MUDANCA_RISCO' | 'DEMISSIONAL'>,
          mandatory_standard: 'NR-07' as const
        };
      });

    const payload = {
      code_table_24: form.risk_code_table_24,
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
        { name: 'EPI Adequado', ca_example: '12345', protection_type: 'Proteção Individual' }
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
    if (selectedRiskIdsToApply.length === 0) return;

    const result = applyRisksToTargets({
      client_id: applyClientId,
      risk_catalog_ids: selectedRiskIdsToApply,
      target_mode: applyTargetMode,
      target_ghe_ids: selectedTargetGheIds,
      target_job_ids: selectedTargetJobIds,
      target_sector_ids: selectedTargetSectorIds,
      include_suggested_exams: includeSuggestedExams
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
      case 'FÍSICO': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'QUÍMICO': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'BIOLÓGICO': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ERGONÔMICO': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ACIDENTES': return 'bg-sky-50 text-sky-700 border-sky-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const clientGhesForModal = ghes.filter(g => g.client_id === applyClientId);
  const clientJobsForModal = hierarchyJobs.filter(j => hierarchySectors.some(s => s.id === j.sector_id && s.client_id === applyClientId));
  const clientSectorsForModal = hierarchySectors.filter(s => s.client_id === applyClientId);

  return (
    <div id="occupational-risks-catalog-view" className="space-y-6 pb-12">
      {/* Header with Stats & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Tabela 24 do eSocial Oficial & NR-01/09/15/17
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                {occupationalRisksCatalog.length} agentes catalogados
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-emerald-600" />
              Catálogo Global de Riscos Ocupacionais
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl mt-1">
              Base oficial padronizada para caracterização de agentes nocivos, limites de tolerância (NR-15), níveis de ação (NR-09), EPIs sugeridos com CA e exames PCMSO (Tabela 27). Permite aplicação direta a qualquer GHE, cargo ou árvore de cargos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-reset-catalog-defaults"
              onClick={resetOccupationalRisksCatalogToDefault}
              title="Restaurar lista oficial padronizada de riscos eSocial"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
          <button
            onClick={() => setSelectedGroup(selectedGroup === 'FÍSICO' ? 'ALL' : 'FÍSICO')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedGroup === 'FÍSICO' 
                ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-200' 
                : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Físicos (01)</span>
              <Activity className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-900">{groupStats['FÍSICO']}</span>
              <span className="text-xs text-slate-500">agentes</span>
            </div>
            <span className="text-[11px] text-amber-700 block mt-0.5">Ruído, calor, vibrações</span>
          </button>

          <button
            onClick={() => setSelectedGroup(selectedGroup === 'QUÍMICO' ? 'ALL' : 'QUÍMICO')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedGroup === 'QUÍMICO' 
                ? 'border-rose-500 bg-rose-50/70 shadow-sm ring-2 ring-rose-200' 
                : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">Químicos (02)</span>
              <Flame className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-900">{groupStats['QUÍMICO']}</span>
              <span className="text-xs text-slate-500">agentes</span>
            </div>
            <span className="text-[11px] text-rose-700 block mt-0.5">Poeiras, vapores, fumos</span>
          </button>

          <button
            onClick={() => setSelectedGroup(selectedGroup === 'BIOLÓGICO' ? 'ALL' : 'BIOLÓGICO')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedGroup === 'BIOLÓGICO' 
                ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-200' 
                : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Biológicos (03)</span>
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-900">{groupStats['BIOLÓGICO']}</span>
              <span className="text-xs text-slate-500">agentes</span>
            </div>
            <span className="text-[11px] text-emerald-700 block mt-0.5">Vírus, bactérias, fungos</span>
          </button>

          <button
            onClick={() => setSelectedGroup(selectedGroup === 'ERGONÔMICO' ? 'ALL' : 'ERGONÔMICO')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedGroup === 'ERGONÔMICO' 
                ? 'border-purple-500 bg-purple-50/70 shadow-sm ring-2 ring-purple-200' 
                : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-800 uppercase tracking-wide">Ergonômicos (04)</span>
              <Sliders className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-900">{groupStats['ERGONÔMICO']}</span>
              <span className="text-xs text-slate-500">agentes</span>
            </div>
            <span className="text-[11px] text-purple-700 block mt-0.5">Postura, carga, repetição</span>
          </button>

          <button
            onClick={() => setSelectedGroup(selectedGroup === 'ACIDENTES' ? 'ALL' : 'ACIDENTES')}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedGroup === 'ACIDENTES' 
                ? 'border-sky-500 bg-sky-50/70 shadow-sm ring-2 ring-sky-200' 
                : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-800 uppercase tracking-wide">Acidentes (05)</span>
              <Zap className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-900">{groupStats['ACIDENTES']}</span>
              <span className="text-xs text-slate-500">agentes</span>
            </div>
            <span className="text-[11px] text-sky-700 block mt-0.5">Queda, choque, máquinas</span>
          </button>
        </div>
      </div>

      {/* Filters Bar & Quick Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex-1 w-full relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-search-occupational-risks"
              type="text"
              placeholder="Buscar por agente, código eSocial (ex: 01.01.001), efeito nocivo, norma regulamentadora..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              id="select-filter-group"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="ALL">Todas as Avaliações</option>
              <option value="QUANTITATIVA">Quantitativa (com limites)</option>
              <option value="QUALITATIVA">Qualitativa (inspeção)</option>
            </select>

            <button
              id="btn-toggle-select-all"
              onClick={toggleSelectAllRisks}
              className="px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap"
            >
              {selectedRiskIdsToApply.length === filteredRisks.length && filteredRisks.length > 0 ? (
                <>
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">
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
            <p className="text-base font-semibold text-slate-700">Nenhum risco encontrado para os filtros aplicados</p>
            <p className="text-sm text-slate-500 mt-1">Experimente limpar a busca ou adicionar um novo agente nocivo ao catálogo.</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedGroup('ALL'); setEvaluationTypeFilter('ALL'); }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredRisks.map((item) => {
              const isSelected = selectedRiskIdsToApply.includes(item.id);
              return (
                <div 
                  key={item.id} 
                  className={`p-5 transition-colors hover:bg-slate-50/80 ${
                    isSelected ? 'bg-indigo-50/40 border-l-4 border-l-indigo-600' : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Checkbox + Main Info */}
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() => toggleSelectRisk(item.id)}
                        className="mt-1 flex-shrink-0 text-slate-400 hover:text-indigo-600"
                        title={isSelected ? 'Desmarcar risco' : 'Selecionar risco para aplicar'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>

                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getGroupBadgeColor(item.group)}`}>
                            {item.group}
                          </span>
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            eSocial {item.code_table_24}
                          </span>
                          <span className="text-xs font-semibold text-slate-600">
                            Ref: {item.regulatory_norm_reference}
                          </span>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            item.evaluation_type === 'QUANTITATIVA' 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            Avaliação {item.evaluation_type}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900">
                          {item.name}
                        </h3>

                        <p className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-700">Danos Prováveis à Saúde:</span> {item.health_effects}
                        </p>

                        {/* Characterization Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 text-xs">
                          {item.tolerance_limit_reference && (
                            <div className="p-2 rounded bg-slate-50 border border-slate-100">
                              <span className="font-semibold text-slate-500 block">Limite Tolerância (NR-15):</span>
                              <span className="font-medium text-slate-800">{item.tolerance_limit_reference}</span>
                            </div>
                          )}

                          {item.action_level_reference && (
                            <div className="p-2 rounded bg-slate-50 border border-slate-100">
                              <span className="font-semibold text-slate-500 block">Nível de Ação (NR-09):</span>
                              <span className="font-medium text-slate-800">{item.action_level_reference}</span>
                            </div>
                          )}

                          {item.suggested_medium && (
                            <div className="p-2 rounded bg-slate-50 border border-slate-100">
                              <span className="font-semibold text-slate-500 block">Meio Propagação:</span>
                              <span className="font-medium text-slate-800">{item.suggested_medium}</span>
                            </div>
                          )}

                          {item.suggested_source && (
                            <div className="p-2 rounded bg-slate-50 border border-slate-100">
                              <span className="font-semibold text-slate-500 block">Fonte Típica:</span>
                              <span className="font-medium text-slate-800 truncate block" title={item.suggested_source}>
                                {item.suggested_source}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Suggested EPIs & PCMSO Exams tags */}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          {item.recommended_epis.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                                <HardHat className="w-3.5 h-3.5" /> EPIs Sugeridos:
                              </span>
                              {item.recommended_epis.map((epi, idx) => (
                                <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                  {epi.name} (CA {epi.ca_example})
                                </span>
                              ))}
                            </div>
                          )}

                          {item.suggested_exams_pcmso.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5" /> Exames PCMSO (Tab 27):
                              </span>
                              {item.suggested_exams_pcmso.map((ex, idx) => (
                                <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                        title="Aplicar este risco a um GHE ou Árvore de Cargos"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Aplicar
                      </button>

                      <button
                        id={`btn-edit-risk-${item.id}`}
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
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
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
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
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {editingItem ? 'Editar Caracterização do Risco Ocupacional' : 'Cadastrar Novo Risco no Catálogo Oficial'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRisk} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Código eSocial (Tabela 24) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 01.01.001"
                    value={form.risk_code_table_24}
                    onChange={(e) => setForm({ ...form, risk_code_table_24: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Grupo de Risco *
                  </label>
                  <select
                    value={form.group}
                    onChange={(e) => setForm({ ...form, group: e.target.value as RiskCategoryType })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="FÍSICO">Físico (Grupo 1 - Verde/Laranja)</option>
                    <option value="QUÍMICO">Químico (Grupo 2 - Vermelho)</option>
                    <option value="BIOLÓGICO">Biológico (Grupo 3 - Marrom)</option>
                    <option value="ERGONÔMICO">Ergonômico (Grupo 4 - Amarelo)</option>
                    <option value="ACIDENTE">Acidente / Mecânico (Grupo 5 - Azul)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Norma Regulamentadora *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: NR-15 Anexo 1 / NR-09"
                    value={form.regulatory_norm_reference}
                    onChange={(e) => setForm({ ...form, regulatory_norm_reference: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nome do Agente Nocivo / Fator de Risco *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ruído Contínuo ou Intermitente"
                  value={form.agent_name}
                  onChange={(e) => setForm({ ...form, agent_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Danos Prováveis à Saúde (Efeitos Nocivos) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ex: Perda auditiva induzida por ruído ocupacional (PAIR), zumbido, estresse, fadiga."
                  value={form.harmful_effects}
                  onChange={(e) => setForm({ ...form, harmful_effects: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tipo de Avaliação *
                  </label>
                  <select
                    value={form.evaluation_type_standard}
                    onChange={(e) => setForm({ ...form, evaluation_type_standard: e.target.value as 'QUALITATIVA' | 'QUANTITATIVA' })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="QUANTITATIVA">Quantitativa (Medição instrumental)</option>
                    <option value="QUALITATIVA">Qualitativa (Inspeção visual / checklist)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Unidade de Medição
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: dB(A), ppm, mg/m³, m/s²"
                    value={form.measurement_unit_standard}
                    onChange={(e) => setForm({ ...form, measurement_unit_standard: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Meio de Propagação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: AR, Contato Dérmico, Solo"
                    value={form.suggested_medium}
                    onChange={(e) => setForm({ ...form, suggested_medium: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Limite de Tolerância (NR-15)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 85.0 dB(A) para 8 horas"
                    value={form.tolerance_limit_nr15}
                    onChange={(e) => setForm({ ...form, tolerance_limit_nr15: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nível de Ação (NR-09)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 80.0 dB(A) (dose 50%)"
                    value={form.action_level_nr09}
                    onChange={(e) => setForm({ ...form, action_level_nr09: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Fonte Geradora Típica / Atividade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Operação de maquinários rotativos, caldeiras, prensas"
                  value={form.suggested_source}
                  onChange={(e) => setForm({ ...form, suggested_source: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  EPIs Sugeridos (com CA) - Separados por vírgula
                </label>
                <input
                  type="text"
                  placeholder="Ex: Protetor Auditivo tipo Plug (CA 14235), Óculos de Proteção (CA 27500)"
                  value={form.suggested_epis_text}
                  onChange={(e) => setForm({ ...form, suggested_epis_text: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Exames PCMSO Sugeridos (Tabela 27) - Formato: Nome [Código] - Periodicidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Audiometria Tonal Ocupacional [0295] - 12m, Espirometria [0296] - 12m"
                  value={form.suggested_exams_text}
                  onChange={(e) => setForm({ ...form, suggested_exams_text: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Medidas de Controle Recomendadas
                </label>
                <input
                  type="text"
                  placeholder="Ex: Enclausuramento acústico, EPC exaustão mecânica e pausas térmicas"
                  value={form.suggested_controls_summary}
                  onChange={(e) => setForm({ ...form, suggested_controls_summary: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
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
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-indigo-50">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  Aplicar Riscos Ocupacionais a GHEs ou Árvore de Cargos
                </h3>
              </div>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Selected Risks Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs font-bold text-slate-700 uppercase block mb-1.5">
                  Riscos Selecionados para Aplicação ({selectedRiskIdsToApply.length}):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {occupationalRisksCatalog.filter(r => selectedRiskIdsToApply.includes(r.id)).map(r => (
                    <span key={r.id} className="text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-medium">
                      {r.name} ({r.code_table_24})
                    </span>
                  ))}
                </div>
              </div>

              {/* Target Client */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Empresa / Cliente de Destino *
                </label>
                <select
                  value={applyClientId}
                  onChange={(e) => {
                    setApplyClientId(e.target.value);
                    const newClientGhes = ghes.filter(g => g.client_id === e.target.value);
                    setSelectedTargetGheIds(newClientGhes.map(g => g.id));
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Modo de Aplicação de Destino *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setApplyTargetMode('GHE')}
                    className={`p-3 rounded-lg border text-left text-xs font-bold transition-all ${
                      applyTargetMode === 'GHE'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Layers className="w-4 h-4 mb-1 text-indigo-600" />
                    Vários / Específico GHE
                  </button>

                  <button
                    type="button"
                    onClick={() => setApplyTargetMode('JOB')}
                    className={`p-3 rounded-lg border text-left text-xs font-bold transition-all ${
                      applyTargetMode === 'JOB'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 mb-1 text-indigo-600" />
                    Cargos Específicos
                  </button>

                  <button
                    type="button"
                    onClick={() => setApplyTargetMode('SECTOR_TREE')}
                    className={`p-3 rounded-lg border text-left text-xs font-bold transition-all ${
                      applyTargetMode === 'SECTOR_TREE'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mb-1 text-indigo-600" />
                    Árvore de Setores / Áreas
                  </button>
                </div>
              </div>

              {/* Target Selection Lists */}
              {applyTargetMode === 'GHE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Selecione os GHEs de Destino ({selectedTargetGheIds.length} selecionados):
                  </label>
                  {clientGhesForModal.length === 0 ? (
                    <p className="text-xs text-amber-700 p-3 bg-amber-50 rounded-lg">
                      Nenhum GHE cadastrado para este cliente. Os riscos serão criados com base nas atividades da empresa.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                      {clientGhesForModal.map(g => {
                        const checked = selectedTargetGheIds.includes(g.id);
                        return (
                          <label key={g.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs">
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
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-semibold text-slate-800">{g.name}</span>
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
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Selecione os Cargos de Destino ({selectedTargetJobIds.length} selecionados):
                  </label>
                  {clientJobsForModal.length === 0 ? (
                    <p className="text-xs text-amber-700 p-3 bg-amber-50 rounded-lg">
                      Nenhum cargo específico cadastrado na hierarquia desta empresa. O risco será vinculado ao GHE principal.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                      {clientJobsForModal.map(job => {
                        const checked = selectedTargetJobIds.includes(job.id);
                        return (
                          <label key={job.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs">
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
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-semibold text-slate-800">{job.name}</span>
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
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Selecione os Setores / Árvore da Empresa:
                  </label>
                  {clientSectorsForModal.length === 0 ? (
                    <p className="text-xs text-amber-700 p-3 bg-amber-50 rounded-lg">
                      Nenhum setor cadastrado na estrutura hierárquica.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                      {clientSectorsForModal.map(sec => {
                        const checked = selectedTargetSectorIds.includes(sec.id);
                        return (
                          <label key={sec.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs">
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
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-semibold text-slate-800">{sec.name}</span>
                            <span className="text-slate-500 text-[11px]">({sec.code})</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Include PCMSO Exams Checkbox */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSuggestedExams}
                    onChange={(e) => setIncludeSuggestedExams(e.target.checked)}
                    className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-blue-900 block">
                      Vincular automaticamente os exames PCMSO sugeridos (Tabela 27)
                    </span>
                    <span className="text-blue-700">
                      Gera automaticamente os protocolos de exames complementares (audiometria, espirometria, acuidade, etc.) para os GHEs de destino.
                    </span>
                  </div>
                </label>
              </div>

              {/* Result Feedback */}
              {applyFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold">{applyFeedback.message}</span>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
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
