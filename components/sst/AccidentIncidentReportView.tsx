'use client';

import React, { useState, useMemo } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { dataDeHoje } from '@/lib/datas';
import { 
  SSTAccidentIncidentRecord, 
  AccidentWitness, 
  AccidentAttachment, 
  ActionPlanItem5W2H, 
  FiveWhysAnalysis, 
  IshikawaFactors,
  Employee
} from '@/types';
import {
  AlertOctagon,
  AlertTriangle,
  FileText,
  Plus,
  Search,
  Filter,
  Printer,
  Download,
  Upload,
  Image as ImageIcon,
  FileCode,
  Users,
  Eye,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Paperclip,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  Activity,
  Award,
  AlertCircle,
  HardHat
} from 'lucide-react';

interface AccidentIncidentReportViewProps {
  selectedClientId?: string;
}

export const AccidentIncidentReportView: React.FC<AccidentIncidentReportViewProps> = ({ selectedClientId }) => {
  const {
    clients,
    employees,
    catRecords,
    ghes,
    hierarchySectors,
    accidentsIncidents,
    addAccidentIncident,
    updateAccidentIncident,
    deleteAccidentIncident,
    addWitnessToAccident,
    deleteWitnessFromAccident,
    addAttachmentToAccident,
    deleteAttachmentFromAccident,
    addActionPlanItem,
    updateActionPlanItem,
    deleteActionPlanItem,
    populateAccidentFromCat
  } = usePrevSafe();

  const [activeSubTab, setActiveSubTab] = useState<'DASHBOARD' | 'LIST' | 'FORM'>('DASHBOARD');
  const [selectedIncidentForPrint, setSelectedIncidentForPrint] = useState<SSTAccidentIncidentRecord | null>(null);
  const [selectedIncidentForEdit, setSelectedIncidentForEdit] = useState<SSTAccidentIncidentRecord | null>(null);

  // Filters
  const [filterClient, setFilterClient] = useState<string>(selectedClientId || '');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // NBR 14280 Parameters for TF and TG
  const [workedHoursEstimate, setWorkedHoursEstimate] = useState<number>(200000); // Horas Homem Trabalhadas no período

  // Form State for New/Edit
  const [selectedCatIdToImport, setSelectedCatIdToImport] = useState<string>('');
  const [formData, setFormData] = useState<Partial<SSTAccidentIncidentRecord>>({
    client_id: selectedClientId || clients[0]?.id || '',
    occurrence_type: 'TYPICAL_ACCIDENT',
    classification: 'ACCIDENT_WITH_ABSENCE',
    severity_level: 'MEDIUM',
    occurrence_date: dataDeHoje(),
    occurrence_time: '10:00',
    title: '',
    detailed_description: '',
    exact_location: '',
    body_part_affected: 'Mãos e Dedos',
    causing_agent: 'Máquinas e Equipamentos em Movimento',
    days_absent: 0,
    days_debited: 0,
    investigation_status: 'OPEN',
    immediate_actions_taken: '',
    ishikawa: {
      method: '',
      machine: '',
      material: '',
      manpower: '',
      environment: '',
      measurement: ''
    },
    five_whys: {
      why_1: '',
      why_2: '',
      why_3: '',
      why_4: '',
      why_5: '',
      root_cause: ''
    },
    personal_insecurity_factor: '',
    unsafe_condition_environment: '',
    investigation_lead_name: '',
    cipa_member_name: 'Representante Eleito CIPA Gestão 2026',
    witnesses: [],
    attachments: [],
    action_plan_5w2h: []
  });

  // Active client sync
  React.useEffect(() => {
    if (selectedClientId) {
      setFilterClient(selectedClientId);
      if (!selectedIncidentForEdit) {
        setFormData(prev => ({ ...prev, client_id: selectedClientId }));
      }
    }
  }, [selectedClientId, selectedIncidentForEdit]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return accidentsIncidents.filter(rec => {
      if (filterClient && rec.client_id !== filterClient) return false;
      if (filterType !== 'ALL' && rec.occurrence_type !== filterType) return false;
      if (filterClass !== 'ALL' && rec.classification !== filterClass) return false;
      if (filterStatus !== 'ALL' && rec.investigation_status !== filterStatus) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTitle = rec.title?.toLowerCase().includes(term);
        const matchEmp = rec.employee_name?.toLowerCase().includes(term);
        const matchCode = rec.code?.toLowerCase().includes(term);
        const matchDesc = rec.detailed_description?.toLowerCase().includes(term);
        if (!matchTitle && !matchEmp && !matchCode && !matchDesc) return false;
      }
      return true;
    });
  }, [accidentsIncidents, filterClient, filterType, filterClass, filterStatus, searchTerm]);

  // Statistics & NBR 14280 Calculation
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const withAbsence = filteredRecords.filter(r => r.classification === 'ACCIDENT_WITH_ABSENCE').length;
    const withoutAbsence = filteredRecords.filter(r => r.classification === 'ACCIDENT_WITHOUT_ABSENCE').length;
    const nearMisses = filteredRecords.filter(r => r.classification === 'NEAR_MISS').length;
    const occupationalDiseases = filteredRecords.filter(r => r.occurrence_type === 'OCCUPATIONAL_DISEASE').length;
    const inTransit = filteredRecords.filter(r => r.occurrence_type === 'COMMUTE_TRANSIT_ACCIDENT').length;

    const totalDaysLost = filteredRecords.reduce((acc, r) => acc + (r.days_absent || 0), 0);
    const totalDaysDebited = filteredRecords.reduce((acc, r) => acc + (r.days_debited || 0), 0);

    // NBR 14280 Formulas:
    // TF = (Nº de Acidentes com Afastamento * 1.000.000) / HHT
    const HHT = workedHoursEstimate > 0 ? workedHoursEstimate : 200000;
    const frequencyRate = parseFloat(((withAbsence * 1000000) / HHT).toFixed(2));
    // TG = ((Dias Perdidos + Dias Debitados) * 1.000.000) / HHT
    const severityRate = parseFloat((((totalDaysLost + totalDaysDebited) * 1000000) / HHT).toFixed(2));

    // Action plan stats
    const allActions = filteredRecords.flatMap(r => r.action_plan_5w2h || r.action_plan || []);
    const actionsCompleted = allActions.filter(a => a.status === 'CONCLUIDO' || a.status === 'EFICACIA_VALIDADA' || (a.status as string) === 'COMPLETED').length;
    const actionsInProgress = allActions.filter(a => a.status === 'EM_ANDAMENTO' || (a.status as string) === 'IN_PROGRESS').length;
    const actionsPending = allActions.filter(a => a.status === 'PENDENTE' || (a.status as string) === 'PENDING').length;

    // Body parts breakdown
    const bodyPartsCount: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const part = r.body_part_affected || 'Não Especificada';
      bodyPartsCount[part] = (bodyPartsCount[part] || 0) + 1;
    });

    // Causing agents breakdown
    const agentsCount: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const agent = r.causing_agent || 'Outros';
      agentsCount[agent] = (agentsCount[agent] || 0) + 1;
    });

    return {
      total,
      withAbsence,
      withoutAbsence,
      nearMisses,
      occupationalDiseases,
      inTransit,
      totalDaysLost,
      totalDaysDebited,
      frequencyRate,
      severityRate,
      allActionsCount: allActions.length,
      actionsCompleted,
      actionsInProgress,
      actionsPending,
      bodyPartsCount,
      agentsCount
    };
  }, [filteredRecords, workedHoursEstimate]);

  // Handle CAT Import
  const handleImportCAT = (catId: string) => {
    if (!catId) return;
    const catData = populateAccidentFromCat(catId);
    if (catData) {
      setFormData(prev => ({
        ...prev,
        ...catData,
        code: `RIAA-${new Date().getFullYear()}-${String(accidentsIncidents.length + 1).padStart(3, '0')}`
      }));
    }
  };

  // Handle Employee selection in Form
  const handleSelectEmployee = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const ghe = ghes.find(g => g.id === emp.ghe_id);
    const client = clients.find(c => c.id === emp.client_id);

    setFormData(prev => ({
      ...prev,
      employee_id: emp.id,
      employee_name: emp.name,
      employee_cpf: emp.cpf,
      employee_registration: emp.registration_number,
      employee_job_title: emp.job_title,
      employee_sector: emp.sector_name,
      employee_ghe_name: ghe?.name || '',
      client_id: emp.client_id,
      client_name: client?.trade_name || client?.legal_name || prev.client_name
    }));
  };

  // Witness Helper State
  const [witnessTemp, setWitnessTemp] = useState<{
    is_employee: boolean;
    employee_id: string;
    witness_name: string;
    witness_document: string;
    witness_role: string;
    witness_phone: string;
    witness_statement: string;
  }>({
    is_employee: true,
    employee_id: '',
    witness_name: '',
    witness_document: '',
    witness_role: '',
    witness_phone: '',
    witness_statement: ''
  });

  const handleAddWitnessToForm = () => {
    if (!witnessTemp.witness_name && !witnessTemp.employee_id) return;
    let name = witnessTemp.witness_name;
    let doc = witnessTemp.witness_document;
    let role = witnessTemp.witness_role;
    let empId = witnessTemp.employee_id;

    if (witnessTemp.is_employee && empId) {
      const emp = employees.find(e => e.id === empId);
      if (emp) {
        name = emp.name;
        doc = emp.cpf;
        role = `${emp.job_title} (${emp.sector_name})`;
      }
    }

    const newWitness: AccidentWitness = {
      id: `wit-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      is_company_employee: witnessTemp.is_employee,
      employee_id: empId || undefined,
      witness_name: name,
      witness_document: doc,
      witness_job_title: role,
      witness_phone: witnessTemp.witness_phone,
      statement_text: witnessTemp.witness_statement,
      statement_date: dataDeHoje()
    };

    setFormData(prev => ({
      ...prev,
      witnesses: [...(prev.witnesses || []), newWitness]
    }));

    setWitnessTemp({
      is_employee: true,
      employee_id: '',
      witness_name: '',
      witness_document: '',
      witness_role: '',
      witness_phone: '',
      witness_statement: ''
    });
  };

  const handleRemoveWitnessFromForm = (wId: string) => {
    setFormData(prev => ({
      ...prev,
      witnesses: (prev.witnesses || []).filter(w => w.id !== wId)
    }));
  };

  // Attachment Helper State
  const [attachmentTemp, setAttachmentTemp] = useState<{
    title: string;
    file_type: 'IMAGE' | 'PDF' | 'DOCUMENT';
    category: 'LOCAL_PHOTO' | 'MEDICAL_REPORT' | 'POLICE_REPORT' | 'EQUIPMENT_PHOTO' | 'OTHER';
    url: string;
    description: string;
  }>({
    title: '',
    file_type: 'IMAGE',
    category: 'LOCAL_PHOTO',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=60',
    description: ''
  });

  const handleAddAttachmentToForm = () => {
    if (!attachmentTemp.title) return;
    const newAtt: AccidentAttachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      title: attachmentTemp.title,
      file_type: attachmentTemp.file_type,
      category: attachmentTemp.category,
      file_url: attachmentTemp.url || (attachmentTemp.file_type === 'IMAGE' ? 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=60' : 'https://example.com/document.pdf'),
      file_name: `${attachmentTemp.title.toLowerCase().replace(/\s+/g, '_')}.${attachmentTemp.file_type === 'PDF' ? 'pdf' : 'jpg'}`,
      uploaded_at: new Date().toISOString(),
      description: attachmentTemp.description
    };

    setFormData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAtt]
    }));

    setAttachmentTemp({
      title: '',
      file_type: 'IMAGE',
      category: 'LOCAL_PHOTO',
      url: '',
      description: ''
    });
  };

  const handleRemoveAttachmentFromForm = (attId: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(a => a.id !== attId)
    }));
  };

  // 5W2H Action Plan Helper State
  const [actionPlanTemp, setActionPlanTemp] = useState<Omit<ActionPlanItem5W2H, 'id'>>({
    what: '',
    why: '',
    where: '',
    when_deadline: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    who_responsible: '',
    how: '',
    how_much_cost: 0,
    status: 'PENDING'
  });

  const handleAddActionPlanToForm = () => {
    if (!actionPlanTemp.what || !actionPlanTemp.who_responsible) return;
    const newItem: ActionPlanItem5W2H = {
      ...actionPlanTemp,
      id: `5w2h-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`
    };

    setFormData(prev => ({
      ...prev,
      action_plan_5w2h: [...(prev.action_plan_5w2h || []), newItem]
    }));

    setActionPlanTemp({
      what: '',
      why: '',
      where: '',
      when_deadline: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      who_responsible: '',
      how: '',
      how_much_cost: 0,
      status: 'PENDING'
    });
  };

  const handleRemoveActionPlanFromForm = (actId: string) => {
    setFormData(prev => ({
      ...prev,
      action_plan_5w2h: (prev.action_plan_5w2h || []).filter(a => a.id !== actId)
    }));
  };

  // Save / Update Incident
  const handleSaveIncident = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === formData.client_id);
    const clientName = client?.trade_name || client?.legal_name || 'Empresa Cliente';
    const code = formData.code || `RIAA-${new Date().getFullYear()}-${String(accidentsIncidents.length + 1).padStart(3, '0')}`;

    if (selectedIncidentForEdit) {
      updateAccidentIncident(selectedIncidentForEdit.id, {
        ...formData,
        client_name: clientName,
        code
      });
    } else {
      addAccidentIncident({
        ...(formData as any),
        client_name: clientName,
        code: code,
        investigation_status: formData.investigation_status || 'OPEN'
      });
    }

    // Reset and go to list
    setSelectedIncidentForEdit(null);
    setActiveSubTab('LIST');
  };

  const handleStartEdit = (record: SSTAccidentIncidentRecord) => {
    setSelectedIncidentForEdit(record);
    setFormData({ ...record });
    setActiveSubTab('FORM');
  };

  const handleStartNew = () => {
    setSelectedIncidentForEdit(null);
    setSelectedCatIdToImport('');
    setFormData({
      client_id: filterClient || clients[0]?.id || '',
      occurrence_type: 'TYPICAL_ACCIDENT',
      classification: 'ACCIDENT_WITH_ABSENCE',
      severity_level: 'MEDIUM',
      occurrence_date: dataDeHoje(),
      occurrence_time: '10:00',
      title: '',
      detailed_description: '',
      exact_location: '',
      body_part_affected: 'Mãos e Dedos',
      causing_agent: 'Máquinas e Equipamentos em Movimento',
      days_absent: 0,
      days_debited: 0,
      investigation_status: 'OPEN',
      immediate_actions_taken: '',
      ishikawa: {
        method: '',
        machine: '',
        material: '',
        manpower: '',
        environment: '',
        measurement: ''
      },
      five_whys: {
        why_1: '',
        why_2: '',
        why_3: '',
        why_4: '',
        why_5: '',
        root_cause: ''
      },
      personal_insecurity_factor: '',
      unsafe_condition_environment: '',
      investigation_lead_name: '',
      cipa_member_name: 'Representante CIPA Gestão 2026',
      witnesses: [],
      attachments: [],
      action_plan_5w2h: []
    });
    setActiveSubTab('FORM');
  };

  // Trigger print document
  const handlePrintDocument = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="accident-incident-management-container">
      {/* Sub Header & Navigation */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-100">
                Relatório de Acidentes & Cadastro de Incidentes
              </h2>
              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-mono text-[11px] font-bold rounded">
                NR-01 • NR-04 • NR-05 • NBR 14280
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Investigação técnica com Causa Raiz (Ishikawa/5W2H), fotos, depoimento de testemunhas, integração com CAT e relatórios oficiais para impressão.
            </p>
          </div>
        </div>

        {/* Sub Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="subtab-accident-dashboard-btn"
            onClick={() => setActiveSubTab('DASHBOARD')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'DASHBOARD'
                ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            Dashboard & Indicadores (TF/TG)
          </button>

          <button
            type="button"
            id="subtab-accident-list-btn"
            onClick={() => setActiveSubTab('LIST')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'LIST'
                ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Registros & Ocorrências ({filteredRecords.length})
          </button>

          <button
            type="button"
            id="subtab-accident-new-btn"
            onClick={handleStartNew}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'FORM'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-emerald-300 hover:text-white bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-900/60'
            }`}
          >
            <Plus className="w-4 h-4" />
            Nova Ocorrência / Investigação
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DASHBOARD VIEW (ESTATÍSTICAS & NBR 14280) */}
      {/* ========================================================================= */}
      {activeSubTab === 'DASHBOARD' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase">
                <span>Total Ocorrências</span>
                <AlertOctagon className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 mt-2">{stats.total}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">no período selecionado</div>
            </div>

            <div className="bg-slate-900 border border-rose-900/40 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-rose-400 text-[11px] font-bold uppercase">
                <span>C/ Afastamento</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-300 mt-2">{stats.withAbsence}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{stats.totalDaysLost} dias perdidos</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase">
                <span>S/ Afastamento</span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 mt-2">{stats.withoutAbsence}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Primeiros Socorros</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase">
                <span>Quase-Acidentes</span>
                <HelpCircle className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-black text-sky-300 mt-2">{stats.nearMisses}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Near-misses relatados</div>
            </div>

            {/* NBR 14280: TF */}
            <div className="bg-slate-900 border border-teal-900/50 p-4 rounded-2xl bg-gradient-to-br from-teal-950/30 to-slate-900">
              <div className="flex items-center justify-between text-teal-400 text-[11px] font-bold uppercase">
                <span>Taxa Frequência (TF)</span>
                <Activity className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-black text-teal-300 mt-2">{stats.frequencyRate}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">NBR 14280 / 1M HHT</div>
            </div>

            {/* NBR 14280: TG */}
            <div className="bg-slate-900 border border-indigo-900/50 p-4 rounded-2xl bg-gradient-to-br from-indigo-950/30 to-slate-900">
              <div className="flex items-center justify-between text-indigo-400 text-[11px] font-bold uppercase">
                <span>Taxa Gravidade (TG)</span>
                <Award className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-indigo-300 mt-2">{stats.severityRate}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">NBR 14280 / 1M HHT</div>
            </div>
          </div>

          {/* Configuration for HHT & Filter Context */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-teal-400" />
              <div>
                <span className="text-xs font-bold text-slate-200">Horas-Homem Trabalhadas (HHT) para Base de Cálculo NBR 14280:</span>
                <p className="text-[11px] text-slate-400">Utilizado na fórmula de Taxa de Frequência (TF = (Nº Acidentes C/ Afastamento * 10⁶) / HHT) e Gravidade (TG = (Dias Perdidos + Debitados * 10⁶) / HHT).</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={workedHoursEstimate}
                onChange={(e) => setWorkedHoursEstimate(Number(e.target.value) || 1)}
                className="w-36 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-teal-300 focus:outline-none focus:border-teal-500 text-right"
              />
              <span className="text-xs text-slate-400 font-semibold">horas</span>
            </div>
          </div>

          {/* Charts & Distributions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Body Parts Affected */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-slate-200">Distribuição por Parte do Corpo</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400 font-bold">{Object.keys(stats.bodyPartsCount).length} categorias</span>
              </div>

              <div className="space-y-3">
                {Object.entries(stats.bodyPartsCount).length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Nenhum dado registrado.</p>
                ) : (
                  Object.entries(stats.bodyPartsCount).map(([part, count]) => {
                    const percent = Math.round((count / (stats.total || 1)) * 100);
                    return (
                      <div key={part} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300">{part}</span>
                          <span className="text-rose-400 font-mono font-bold">{count} ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-rose-500 to-amber-500 h-2 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Causing Agents */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-200">Agentes Causadores Principais</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400 font-bold">Tabela eSocial</span>
              </div>

              <div className="space-y-3">
                {Object.entries(stats.agentsCount).length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Nenhum dado registrado.</p>
                ) : (
                  Object.entries(stats.agentsCount).map(([agent, count]) => {
                    const percent = Math.round((count / (stats.total || 1)) * 100);
                    return (
                      <div key={agent} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300 truncate max-w-[200px]" title={agent}>{agent}</span>
                          <span className="text-amber-400 font-mono font-bold">{count} ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 h-2 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 5W2H Action Plan Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-200">Planos de Ação 5W2H (NR-01)</h3>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">{stats.allActionsCount} ações</span>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-200">Ações Concluídas / Eficazes</span>
                  </div>
                  <span className="text-sm font-black text-emerald-300 font-mono">{stats.actionsCompleted}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-200">Ações em Andamento</span>
                  </div>
                  <span className="text-sm font-black text-amber-300 font-mono">{stats.actionsInProgress}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-semibold text-slate-300">Ações Pendentes</span>
                  </div>
                  <span className="text-sm font-black text-rose-300 font-mono">{stats.actionsPending}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. LIST VIEW (FILTROS & CARDS DE OCORRÊNCIAS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'LIST' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Empresa / Cliente:</label>
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-rose-500"
              >
                <option value="">Todas as Empresas</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tipo de Evento:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="TYPICAL_ACCIDENT">Acidente Típico</option>
                <option value="COMMUTE_TRANSIT_ACCIDENT">Acidente de Trajeto</option>
                <option value="OCCUPATIONAL_DISEASE">Doença Ocupacional</option>
                <option value="NEAR_MISS">Quase-Acidente (Near-Miss)</option>
                <option value="HAZARDOUS_CONDITION">Condição Perigosa</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Classificação:</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">Todas as Classificações</option>
                <option value="ACCIDENT_WITH_ABSENCE">Com Afastamento</option>
                <option value="ACCIDENT_WITHOUT_ABSENCE">Sem Afastamento</option>
                <option value="NEAR_MISS">Quase-Acidente</option>
                <option value="FATAL">Fatal</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Status Investigação:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">Todos os Status</option>
                <option value="OPEN">Aberta</option>
                <option value="INVESTIGATING">Em Investigação</option>
                <option value="ACTION_PLAN">Plano de Ação</option>
                <option value="COMPLETED">Concluída</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Busca Textual:</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Nome, código, descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 gap-4">
            {filteredRecords.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <AlertOctagon className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-300">Nenhuma ocorrência encontrada</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Não existem registros correspondentes aos filtros selecionados. Clique em "Nova Ocorrência / Investigação" para cadastrar.
                </p>
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Primeira Ocorrência
                </button>
              </div>
            ) : (
              filteredRecords.map(record => {
                const isWithAbsence = record.classification === 'ACCIDENT_WITH_ABSENCE';
                const hasCat = !!record.linked_cat_id;
                const witnessCount = record.witnesses?.length || 0;
                const attachmentCount = record.attachments?.length || 0;
                const actionPlanCount = record.action_plan_5w2h?.length || 0;

                return (
                  <div
                    key={record.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-5 shadow-lg space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 bg-slate-800 text-rose-300 font-mono font-bold text-xs rounded-lg border border-slate-700">
                            {record.code}
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isWithAbsence
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {isWithAbsence ? 'Com Afastamento' : 'Sem Afastamento / Quase-Acidente'}
                          </span>

                          <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 text-[11px] font-semibold rounded-full">
                            {record.occurrence_type === 'TYPICAL_ACCIDENT' && 'Acidente Típico'}
                            {record.occurrence_type === 'COMMUTE_TRANSIT_ACCIDENT' && 'Acidente de Trajeto'}
                            {record.occurrence_type === 'OCCUPATIONAL_DISEASE' && 'Doença Ocupacional'}
                            {record.occurrence_type === 'NEAR_MISS' && 'Quase-Acidente (Near-Miss)'}
                            {record.occurrence_type === 'HAZARDOUS_CONDITION' && 'Condição Perigosa'}
                          </span>

                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            record.investigation_status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                            record.investigation_status === 'ACTION_PLAN' ? 'bg-indigo-500/20 text-indigo-300' :
                            record.investigation_status === 'INVESTIGATING' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {record.investigation_status === 'COMPLETED' ? 'Concluída' :
                             record.investigation_status === 'ACTION_PLAN' ? 'Plano de Ação' :
                             record.investigation_status === 'INVESTIGATING' ? 'Em Investigação' : 'Aberta'}
                          </span>

                          {hasCat && (
                            <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 text-[10px] font-semibold rounded flex items-center gap-1 border border-teal-500/30">
                              <FileCheck2 className="w-3 h-3" /> CAT S-2210 Vinculada
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-extrabold text-slate-100">
                          {record.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1 font-semibold text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-teal-400" />
                            {record.client_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {record.occurrence_date} às {record.occurrence_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            Trabalhador: <strong className="text-slate-200">{record.employee_name || 'N/A'}</strong> ({record.employee_job_title || 'Cargo não informado'})
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedIncidentForPrint(record)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-400" />
                          Relatório PDF / Impressão
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(record)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-700"
                          title="Editar Investigação"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Deseja realmente excluir a ocorrência ${record.code}?`)) {
                              deleteAccidentIncident(record.id);
                            }
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-xl transition-colors border border-slate-700"
                          title="Excluir Ocorrência"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px]">Local da Ocorrência:</span>
                        <span className="text-slate-200 font-medium">{record.exact_location || 'Não especificado'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px]">Parte do Corpo / Lesão:</span>
                        <span className="text-rose-300 font-medium">{record.body_part_affected || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px]">Agente Causador:</span>
                        <span className="text-amber-300 font-medium truncate block" title={record.causing_agent}>{record.causing_agent || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px]">Afastamento / Dias:</span>
                        <span className="text-slate-200 font-medium">
                          {record.days_absent || 0} dias perdidos | {record.days_debited || 0} debitados
                        </span>
                      </div>
                    </div>

                    {/* Detailed Description */}
                    <div className="text-xs text-slate-300 bg-slate-950/30 p-3 rounded-xl border border-slate-800/50">
                      <strong className="text-slate-400 block mb-1">Descrição Circunstanciada:</strong>
                      <p className="line-clamp-2">{record.detailed_description}</p>
                    </div>

                    {/* Footer Badges for Witnesses, Attachments, and 5W2H */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
                          <Users className="w-3.5 h-3.5 text-teal-400" />
                          {witnessCount} Testemunha(s)
                        </span>

                        <span className="flex items-center gap-1 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
                          <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                          {attachmentCount} Evidência(s) / Fotos / PDF
                        </span>

                        <span className="flex items-center gap-1 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          {actionPlanCount} Ação(ões) 5W2H
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        Responsável Técnico: <span className="text-slate-300 font-semibold">{record.investigation_lead_name || 'SESMT'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FORM VIEW (CADASTRO / EDIÇÃO COMPLETA) */}
      {/* ========================================================================= */}
      {activeSubTab === 'FORM' && (
        <form onSubmit={handleSaveIncident} className="space-y-6" id="accident-form">
          {/* CAT Import Banner */}
          <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-teal-950/30 border border-rose-500/30 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Importar Dados de CAT Aberta (eSocial S-2210)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Preenchimento inteligente de colaborador, local, horário, lesão e CID-10.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={selectedCatIdToImport}
                onChange={(e) => setSelectedCatIdToImport(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="">Selecione uma CAT cadastrada para auto-preencher...</option>
                {catRecords.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    CAT {cat.receipt_number || cat.cat_number || cat.id} - {cat.worker_name || cat.employee_name || 'Colaborador'} ({cat.accident_date}) - {cat.body_part_name || cat.affected_body_part || 'Lesão'}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleImportCAT(selectedCatIdToImport)}
                disabled={!selectedCatIdToImport}
                className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Puxar Dados da CAT
              </button>
            </div>
          </div>

          {/* Section 1: Informações Gerais & Trabalhador */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Building2 className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-bold text-slate-100">1. Identificação da Empresa e do Acidentado</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Empresa / Cliente *</label>
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => {
                    const c = clients.find(cl => cl.id === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      client_id: e.target.value,
                      client_name: c?.trade_name || c?.legal_name || ''
                    }));
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-rose-500"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.trade_name || c.legal_name} ({c.document_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Trabalhador Acidentado / Envolvido</label>
                <select
                  value={formData.employee_id || ''}
                  onChange={(e) => handleSelectEmployee(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="">Selecione da lista de funcionários...</option>
                  {employees
                    .filter(e => !formData.client_id || e.client_id === formData.client_id)
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} - CPF: {emp.cpf} ({emp.job_title})</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cargo / Função & Setor</label>
                <input
                  type="text"
                  placeholder="Ex: Operador de Caldeira - Produção"
                  value={`${formData.employee_job_title || ''} ${formData.employee_sector ? `(${formData.employee_sector})` : ''}`}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_job_title: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Características da Ocorrência */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-slate-100">2. Características do Acidente / Incidente</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Título / Resumo da Ocorrência *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prensamento de falange distal em prensa hidráulica"
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipo de Evento</label>
                <select
                  value={formData.occurrence_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, occurrence_type: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="TYPICAL_ACCIDENT">Acidente Típico de Trabalho</option>
                  <option value="COMMUTE_TRANSIT_ACCIDENT">Acidente de Trajeto (In Itinere)</option>
                  <option value="OCCUPATIONAL_DISEASE">Doença Ocupacional / Profissional</option>
                  <option value="NEAR_MISS">Quase-Acidente (Near-Miss)</option>
                  <option value="ENVIRONMENTAL_INCIDENT">Incidente Ambiental</option>
                  <option value="HAZARDOUS_CONDITION">Condição Perigosa Identificada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Classificação Legal</label>
                <select
                  value={formData.classification}
                  onChange={(e) => setFormData(prev => ({ ...prev, classification: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="ACCIDENT_WITH_ABSENCE">Acidente COM Afastamento (Típico)</option>
                  <option value="ACCIDENT_WITHOUT_ABSENCE">Acidente SEM Afastamento</option>
                  <option value="NEAR_MISS">Quase-Acidente (Sem Lesão)</option>
                  <option value="FIRST_AID_ONLY">Apenas Primeiros Socorros</option>
                  <option value="FATAL">Acidente Fatal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Grau de Severidade</label>
                <select
                  value={formData.severity_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, severity_level: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="LOW">Baixa (Leve)</option>
                  <option value="MEDIUM">Média (Moderada)</option>
                  <option value="HIGH">Alta (Grave)</option>
                  <option value="CRITICAL">Crítica (Severa)</option>
                  <option value="CATASTROPHIC">Catastrófica (Fatal / Múltiplos)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Data da Ocorrência *</label>
                <input
                  type="date"
                  required
                  value={formData.occurrence_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, occurrence_date: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Hora da Ocorrência *</label>
                <input
                  type="time"
                  required
                  value={formData.occurrence_time || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, occurrence_time: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Dias Perdidos (Afastamento)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.days_absent || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, days_absent: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Dias Debitados (NBR 14280)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.days_debited || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, days_debited: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Local Exato / Posto</label>
                <input
                  type="text"
                  placeholder="Ex: Galpão de Usinagem, Máquina Torno CNC 04"
                  value={formData.exact_location || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, exact_location: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Parte do Corpo Atingida</label>
                <input
                  type="text"
                  placeholder="Ex: Mão direita, Dedo indicador"
                  value={formData.body_part_affected || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, body_part_affected: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Agente Causador da Lesão</label>
                <input
                  type="text"
                  placeholder="Ex: Engrenagem motora sem proteção NR-12"
                  value={formData.causing_agent || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, causing_agent: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Descrição Circunstanciada dos Fatos *</label>
              <textarea
                required
                rows={3}
                placeholder="Descreva detalhadamente como aconteceu o evento, o que o operador estava fazendo, condições imediatas do ambiente e materiais..."
                value={formData.detailed_description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, detailed_description: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Section 3: Testemunhas & Depoimentos */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-100">3. Relato de Testemunhas Presenciais (Oitivas)</h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Opção de selecionar funcionário da empresa ou terceiros.
              </span>
            </div>

            {/* Testemunhas já adicionadas */}
            <div className="space-y-2">
              {(formData.witnesses || []).length === 0 ? (
                <p className="text-xs text-slate-500 italic">Nenhuma testemunha cadastrada nesta ocorrência.</p>
              ) : (
                formData.witnesses?.map((w, idx) => (
                  <div key={w.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">{idx + 1}. {w.witness_name}</span>
                        <span className="px-2 py-0.5 bg-slate-800 text-sky-300 text-[10px] rounded font-semibold">
                          {w.is_company_employee ? 'Funcionário da Empresa' : 'Terceiro / Externo'}
                        </span>
                        {w.witness_job_title && (
                          <span className="text-xs text-slate-400">({w.witness_job_title})</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                        "{w.statement_text}"
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveWitnessFromForm(w.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Remover testemunha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Inserir Nova Testemunha */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Adicionar Testemunha:</span>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="witness_type"
                      checked={witnessTemp.is_employee}
                      onChange={() => setWitnessTemp(prev => ({ ...prev, is_employee: true }))}
                    />
                    Funcionário Cadastrado
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="witness_type"
                      checked={!witnessTemp.is_employee}
                      onChange={() => setWitnessTemp(prev => ({ ...prev, is_employee: false }))}
                    />
                    Pessoa Externa / Terceiro
                  </label>
                </div>
              </div>

              {witnessTemp.is_employee ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Selecionar Trabalhador:</label>
                    <select
                      value={witnessTemp.employee_id}
                      onChange={(e) => {
                        const emp = employees.find(em => em.id === e.target.value);
                        setWitnessTemp(prev => ({
                          ...prev,
                          employee_id: e.target.value,
                          witness_name: emp?.name || '',
                          witness_document: emp?.cpf || '',
                          witness_role: `${emp?.job_title} (${emp?.sector_name})`
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                    >
                      <option value="">Selecione o funcionário...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.job_title} - {emp.sector_name})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Telefone / Contato:</label>
                    <input
                      type="text"
                      placeholder="(XX) 9XXXX-XXXX"
                      value={witnessTemp.witness_phone}
                      onChange={(e) => setWitnessTemp(prev => ({ ...prev, witness_phone: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Nome Completo:</label>
                    <input
                      type="text"
                      placeholder="Nome da testemunha"
                      value={witnessTemp.witness_name}
                      onChange={(e) => setWitnessTemp(prev => ({ ...prev, witness_name: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">CPF / RG:</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={witnessTemp.witness_document}
                      onChange={(e) => setWitnessTemp(prev => ({ ...prev, witness_document: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Profissão / Empresa:</label>
                    <input
                      type="text"
                      placeholder="Ex: Motorista - Transportadora ABC"
                      value={witnessTemp.witness_role}
                      onChange={(e) => setWitnessTemp(prev => ({ ...prev, witness_role: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Depoimento / O que a testemunha presenciou:</label>
                <textarea
                  rows={2}
                  placeholder="Relato textual das declarações colhidas..."
                  value={witnessTemp.witness_statement}
                  onChange={(e) => setWitnessTemp(prev => ({ ...prev, witness_statement: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddWitnessToForm}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Testemunha
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Evidências Fotográficas e Arquivos em PDF */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">4. Evidências Fotográficas & Documentos PDF</h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Fotos do local, laudos médicos, boletim de ocorrência e perícias.
              </span>
            </div>

            {/* Attachments List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(formData.attachments || []).map(att => (
                <div key={att.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 relative group space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 truncate">{att.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachmentFromForm(att.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {att.file_type === 'IMAGE' ? (
                    <div className="h-28 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 relative">
                      <img src={att.file_url} alt={att.title} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-[10px] text-amber-300 font-mono rounded">
                        FOTO
                      </span>
                    </div>
                  ) : (
                    <div className="h-28 bg-slate-900 rounded-lg border border-slate-800 flex flex-col items-center justify-center p-3 text-center space-y-1">
                      <FileCode className="w-8 h-8 text-rose-400" />
                      <span className="text-[11px] text-slate-300 font-mono truncate max-w-full">{att.file_name}</span>
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] rounded font-bold">
                        DOCUMENTO PDF
                      </span>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 line-clamp-1">{att.description || 'Sem descrição adicional'}</p>
                </div>
              ))}
            </div>

            {/* Inserir Anexo / Foto */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 block">Inserir Nova Evidência / Arquivo:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Título do Anexo *</label>
                  <input
                    type="text"
                    placeholder="Ex: Foto do sensor de segurança desativado"
                    value={attachmentTemp.title}
                    onChange={(e) => setAttachmentTemp(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Tipo de Arquivo</label>
                  <select
                    value={attachmentTemp.file_type}
                    onChange={(e) => setAttachmentTemp(prev => ({ ...prev, file_type: e.target.value as any }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  >
                    <option value="IMAGE">Foto / Imagem (JPG, PNG)</option>
                    <option value="PDF">Arquivo em PDF (Laudo, B.O.)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Categoria da Evidência</label>
                  <select
                    value={attachmentTemp.category}
                    onChange={(e) => setAttachmentTemp(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  >
                    <option value="LOCAL_PHOTO">Foto do Local do Acidente</option>
                    <option value="EQUIPMENT_PHOTO">Foto da Máquina / EPI</option>
                    <option value="MEDICAL_REPORT">Laudo / Atestado Médico</option>
                    <option value="POLICE_REPORT">Boletim de Ocorrência (B.O.)</option>
                    <option value="OTHER">Outros Documentos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">URL da Imagem / Arquivo (ou upload simulado)</label>
                <input
                  type="text"
                  placeholder="https://... ou caminho do arquivo"
                  value={attachmentTemp.url}
                  onChange={(e) => setAttachmentTemp(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddAttachmentToForm}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Evidência
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: Metodologia de Análise Causal (Ishikawa & 5 Porquês) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">5. Análise de Causa Raiz (Ishikawa 6M & 5 Porquês)</h3>
            </div>

            {/* Ishikawa 6M */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-indigo-300 block">Diagrama de Espinha de Peixe (Ishikawa 6M):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">1. Método (Procedimento)</label>
                  <input
                    type="text"
                    placeholder="Ex: Ausência de procedimento operacional padrão (POP)"
                    value={formData.ishikawa?.method || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, ishikawa: { ...prev.ishikawa, method: e.target.value } }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">2. Máquina / Equipamento</label>
                  <input
                    type="text"
                    placeholder="Ex: Sensor de intertravamento NR-12 com defeito"
                    value={formData.ishikawa?.machine || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, ishikawa: { ...prev.ishikawa, machine: e.target.value } }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">3. Material / Insumo</label>
                  <input
                    type="text"
                    placeholder="Ex: Peça metálica com rebarbas cortantes"
                    value={formData.ishikawa?.material || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, ishikawa: { ...prev.ishikawa, material: e.target.value } }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">4. Mão de Obra (Fator Humano)</label>
                  <input
                    type="text"
                    placeholder="Ex: Falta de reciclagem de treinamento específico"
                    value={formData.ishikawa?.manpower || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, ishikawa: { ...prev.ishikawa, manpower: e.target.value } }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">5. Meio Ambiente (Posto)</label>
                  <input
                    type="text"
                    placeholder="Ex: Piso escorregadio com presença de óleo"
                    value={formData.ishikawa?.environment || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, ishikawa: { ...prev.ishikawa, environment: e.target.value } }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">6. Medida (Monitoramento)</label>
                  <input
                    type="text"
                    placeholder="Ex: Falha na checagem diária de segurança (Checklist)"
                    value={formData.ishikawa?.measurement || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, ishikawa: { ...prev.ishikawa, measurement: e.target.value } }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* 5 Whys */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <span className="text-xs font-bold text-teal-300 block">Técnica dos 5 Porquês (Five Whys):</span>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold font-mono text-teal-400 w-16">1º Por quê?</span>
                  <input
                    type="text"
                    placeholder="Por que ocorreu o evento?"
                    value={formData.five_whys?.why_1 || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, five_whys: { ...prev.five_whys, why_1: e.target.value } }))}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold font-mono text-teal-400 w-16">2º Por quê?</span>
                  <input
                    type="text"
                    placeholder="Por que o fato anterior ocorreu?"
                    value={formData.five_whys?.why_2 || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, five_whys: { ...prev.five_whys, why_2: e.target.value } }))}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold font-mono text-teal-400 w-16">3º Por quê?</span>
                  <input
                    type="text"
                    placeholder="Por quê?"
                    value={formData.five_whys?.why_3 || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, five_whys: { ...prev.five_whys, why_3: e.target.value } }))}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold font-mono text-teal-400 w-16">4º Por quê?</span>
                  <input
                    type="text"
                    placeholder="Por quê?"
                    value={formData.five_whys?.why_4 || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, five_whys: { ...prev.five_whys, why_4: e.target.value } }))}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold font-mono text-teal-400 w-16">5º Por quê?</span>
                  <input
                    type="text"
                    placeholder="Causa Fundamental / Raiz..."
                    value={formData.five_whys?.why_5 || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, five_whys: { ...prev.five_whys, why_5: e.target.value } }))}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: Plano de Ação 5W2H (NR-01 item 1.5.5) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">6. Plano de Ação Preventivo / Corretivo 5W2H</h3>
              </div>
              <span className="text-[11px] text-emerald-400 font-bold">NR-01 item 1.5.5 & CIPA</span>
            </div>

            {/* Tabela de Ações Existentes */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                    <th className="py-2 px-3">O Que (What)</th>
                    <th className="py-2 px-3">Por Que (Why)</th>
                    <th className="py-2 px-3">Quem (Who)</th>
                    <th className="py-2 px-3">Prazo (When)</th>
                    <th className="py-2 px-3">Custo (R$)</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {(formData.action_plan_5w2h || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-500 italic">
                        Nenhuma ação cadastrada no plano 5W2H.
                      </td>
                    </tr>
                  ) : (
                    formData.action_plan_5w2h?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-950/40">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{item.what}</td>
                        <td className="py-2.5 px-3 text-slate-400">{item.why}</td>
                        <td className="py-2.5 px-3 text-teal-300 font-semibold">{item.who_responsible}</td>
                        <td className="py-2.5 px-3 font-mono">{item.when_deadline}</td>
                        <td className="py-2.5 px-3 font-mono">R$ {item.how_much_cost || 0}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                            item.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveActionPlanFromForm(item.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Inserir Nova Ação 5W2H */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 block">Cadastrar Nova Ação 5W2H:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-1">O que será feito (What) *</label>
                  <input
                    type="text"
                    placeholder="Ex: Instalação de cortina de luz e relé de segurança na prensa"
                    value={actionPlanTemp.what}
                    onChange={(e) => setActionPlanTemp(prev => ({ ...prev, what: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Por que será feito (Why)</label>
                  <input
                    type="text"
                    placeholder="Ex: Eliminar ponto de prensamento NR-12"
                    value={actionPlanTemp.why}
                    onChange={(e) => setActionPlanTemp(prev => ({ ...prev, why: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Quem executará (Who) *</label>
                  <input
                    type="text"
                    placeholder="Ex: Eng. Roberto (Manutenção)"
                    value={actionPlanTemp.who_responsible}
                    onChange={(e) => setActionPlanTemp(prev => ({ ...prev, who_responsible: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Prazo Limite (When)</label>
                  <input
                    type="date"
                    value={actionPlanTemp.when_deadline}
                    onChange={(e) => setActionPlanTemp(prev => ({ ...prev, when_deadline: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Como será feito (How)</label>
                  <input
                    type="text"
                    placeholder="Ex: Contratação de integradora certificada"
                    value={actionPlanTemp.how}
                    onChange={(e) => setActionPlanTemp(prev => ({ ...prev, how: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Custo Estimado (R$)</label>
                  <input
                    type="number"
                    value={actionPlanTemp.how_much_cost || 0}
                    onChange={(e) => setActionPlanTemp(prev => ({ ...prev, how_much_cost: Number(e.target.value) }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddActionPlanToForm}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Ação ao Plano
                </button>
              </div>
            </div>
          </div>

          {/* Section 7: Finalização & Responsáveis */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-slate-100">7. Equipe de Investigação & Conclusão Técnica</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Líder Técnico da Investigação (SESMT)</label>
                <input
                  type="text"
                  value={formData.investigation_lead_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, investigation_lead_name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Representante da CIPA (NR-05)</label>
                <input
                  type="text"
                  value={formData.cipa_member_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, cipa_member_name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Status da Investigação</label>
                <select
                  value={formData.investigation_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, investigation_status: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="OPEN">Aberta (Em Coleta de Informações)</option>
                  <option value="INVESTIGATING">Em Investigação Ativa</option>
                  <option value="ACTION_PLAN">Plano de Ação em Implementação</option>
                  <option value="COMPLETED">Concluída & Aprovada</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setActiveSubTab('LIST')}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {selectedIncidentForEdit ? 'Atualizar Investigação' : 'Salvar Relatório de Acidente'}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TEMA-CLARO-INICIO: documento oficial do acidente, impresso em papel */}
      {/* 4. MODAL / VISUALIZAÇÃO DE DOCUMENTO OFICIAL PARA IMPRESSÃO / PDF */}
      {/* ========================================================================= */}
      {selectedIncidentForPrint && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full p-8 space-y-6 shadow-2xl print:shadow-none print:max-w-none print:w-full print:rounded-none print:p-0">
            {/* Print action header (hidden on physical print) */}
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Modelo Oficial de Relatório de Investigação de Acidente (RIAA)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Printer className="w-4 h-4" /> Imprimir / Salvar em PDF
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIncidentForPrint(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body (Standard A4 Format) */}
            <div className="space-y-6 text-xs text-slate-800 leading-relaxed print:text-black">
              {/* Document Header */}
              <div className="border-2 border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-base font-black uppercase tracking-wide text-slate-950">
                    RELATÓRIO DE INVESTIGAÇÃO E ANÁLISE DE ACIDENTE DE TRABALHO (RIAA)
                  </h1>
                  <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                    Conforme NR-01 (GRO/PGR), NR-04 (SESMT), NR-05 (CIPA) e NBR 14280
                  </p>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="block font-black text-rose-700">{selectedIncidentForPrint.code}</span>
                  <span className="text-[11px] text-slate-600">Emissão: {new Date().toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {/* 1. Dados da Empresa e Trabalhador */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] uppercase border-b border-slate-300">
                  1. Identificação da Empresa e do Acidentado
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px]">Empresa Empregadora:</span>
                    <strong className="text-slate-900">{selectedIncidentForPrint.client_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px]">Trabalhador Envolvido:</span>
                    <strong className="text-slate-900">{selectedIncidentForPrint.employee_name || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px]">Cargo / CBO & Setor:</span>
                    <span>{selectedIncidentForPrint.employee_job_title} ({selectedIncidentForPrint.employee_sector})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px]">CAT Vinculada:</span>
                    <span>{selectedIncidentForPrint.linked_cat_number || 'Não vinculada'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Dados do Evento */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] uppercase border-b border-slate-300">
                  2. Dados Circunstanciados da Ocorrência
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-200">
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px]">Data e Hora:</span>
                    <strong>{selectedIncidentForPrint.occurrence_date} às {selectedIncidentForPrint.occurrence_time}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px]">Classificação:</span>
                    <strong>{selectedIncidentForPrint.classification === 'ACCIDENT_WITH_ABSENCE' ? 'Com Afastamento' : 'Sem Afastamento'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px]">Parte do Corpo Atingida:</span>
                    <strong>{selectedIncidentForPrint.body_part_affected}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px]">Dias Perdidos / Debitados:</span>
                    <span>{selectedIncidentForPrint.days_absent} perdidos / {selectedIncidentForPrint.days_debited} debitados</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50">
                  <span className="text-slate-500 font-semibold block text-[10px] mb-1">Descrição do Acidente:</span>
                  <p className="text-xs text-slate-800">{selectedIncidentForPrint.detailed_description}</p>
                </div>
              </div>

              {/* 3. Depoimento de Testemunhas */}
              {(selectedIncidentForPrint.witnesses || []).length > 0 && (
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] uppercase border-b border-slate-300">
                    3. Depoimento das Testemunhas Presenciais
                  </div>
                  <div className="p-3 space-y-2">
                    {selectedIncidentForPrint.witnesses?.map((w, i) => (
                      <div key={w.id} className="text-xs">
                        <strong>{i + 1}. {w.witness_name}</strong> ({w.witness_job_title || 'Testemunha'}) - Doc: {w.witness_document || 'N/A'}:
                        <p className="italic text-slate-700 mt-0.5">"{w.statement_text}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Análise Causal (Ishikawa & 5 Porquês) */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] uppercase border-b border-slate-300">
                  4. Análise de Causa Raiz (Ishikawa 6M & 5 Porquês)
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 border-b border-slate-200">
                  <div><strong>Método:</strong> {selectedIncidentForPrint.ishikawa?.method || '-'}</div>
                  <div><strong>Máquina:</strong> {selectedIncidentForPrint.ishikawa?.machine || '-'}</div>
                  <div><strong>Material:</strong> {selectedIncidentForPrint.ishikawa?.material || '-'}</div>
                  <div><strong>Mão de Obra:</strong> {selectedIncidentForPrint.ishikawa?.manpower || '-'}</div>
                  <div><strong>Meio Ambiente:</strong> {selectedIncidentForPrint.ishikawa?.environment || '-'}</div>
                  <div><strong>Medida:</strong> {selectedIncidentForPrint.ishikawa?.measurement || '-'}</div>
                </div>
                {selectedIncidentForPrint.five_whys?.why_5 && (
                  <div className="p-3 bg-rose-50">
                    <span className="text-[10px] text-rose-800 font-bold uppercase block">Causa Fundamental Identificada:</span>
                    <strong className="text-xs text-rose-900">{selectedIncidentForPrint.five_whys.why_5}</strong>
                  </div>
                )}
              </div>

              {/* 5. Plano de Ação 5W2H */}
              {(selectedIncidentForPrint.action_plan_5w2h || []).length > 0 && (
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] uppercase border-b border-slate-300">
                    5. Plano de Ação Corretivo e Preventivo (5W2H - NR-01)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-300 text-slate-700">
                          <th className="p-2">O Que</th>
                          <th className="p-2">Por Que</th>
                          <th className="p-2">Quem</th>
                          <th className="p-2">Prazo</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedIncidentForPrint.action_plan_5w2h?.map((act) => (
                          <tr key={act.id}>
                            <td className="p-2 font-semibold">{act.what}</td>
                            <td className="p-2">{act.why}</td>
                            <td className="p-2 font-semibold">{act.who_responsible}</td>
                            <td className="p-2 font-mono">{act.when_deadline}</td>
                            <td className="p-2">{act.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6. Assinaturas Formais de Encerramento */}
              <div className="pt-8 grid grid-cols-3 gap-6 text-center text-[11px]">
                <div className="border-t border-slate-400 pt-2 space-y-0.5">
                  <strong>{selectedIncidentForPrint.investigation_lead_name || 'SESMT / TST'}</strong>
                  <span className="block text-slate-600">Líder Técnico de SST</span>
                </div>

                <div className="border-t border-slate-400 pt-2 space-y-0.5">
                  <strong>{selectedIncidentForPrint.cipa_member_name || 'Membro CIPA'}</strong>
                  <span className="block text-slate-600">Representante CIPA (NR-05)</span>
                </div>

                <div className="border-t border-slate-400 pt-2 space-y-0.5">
                  <strong>Gestão da Empresa</strong>
                  <span className="block text-slate-600">Diretoria / Gestor da Área</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* TEMA-CLARO-FIM */}
    </div>
  );
};

