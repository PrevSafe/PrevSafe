'use client';

import React, { useState, useMemo } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  CipaRegulatoryNorm, 
  CipaProcessStatus, 
  CipaManagementProcess, 
  CipaCandidate, 
  CipaEmployerAppointee, 
  CipaElectoralCommissionMember, 
  CipaMeetingRecord 
} from '@/types';
import { CIPA_NORMS_CATALOG, calculateCipaDimensioning, generateLegalCipaTimeline } from '@/lib/cipaService';
import { printOrExportCipaDocument, CipaDocumentType } from '@/lib/cipaPdfExportService';
import { CipaVotingModal } from './CipaVotingModal';
import { 
  ShieldCheck, 
  Calendar, 
  Users, 
  Award, 
  FileText, 
  Vote, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Printer, 
  Plus, 
  Download, 
  Building2, 
  UserCheck, 
  FileCheck, 
  Sparkles, 
  Layers, 
  Scale, 
  Lock, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Search,
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';

export const CipaManagementView: React.FC = () => {
  const { 
    cipaProcesses = [], 
    addCipaProcess, 
    updateCipaProcess, 
    deleteCipaProcess,
    addElectoralCommissionMember,
    updateElectoralCommissionMember,
    deleteElectoralCommissionMember,
    addEmployerAppointee,
    updateEmployerAppointee,
    deleteEmployerAppointee,
    registerCipaCandidate,
    updateCipaCandidate,
    deleteCipaCandidate,
    castCipaVote,
    calculateAndFinalizeScrutiny,
    addCipaMeeting,
    updateCipaMeeting,
    deleteCipaMeeting,
    clients = [],
    employees = []
  } = usePrevSafe();

  // Active Process Selection
  const [selectedProcessId, setSelectedProcessId] = useState<string>(cipaProcesses?.[0]?.id || '');
  const [selectedNormFilter, setSelectedNormFilter] = useState<CipaRegulatoryNorm | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'COMMISSION_EMPLOYER' | 'CANDIDATES' | 'VOTING' | 'SCRUTINY' | 'MEETINGS' | 'DOCUMENTS'>('TIMELINE');

  // Modals & Sub-states
  const [isVotingModalOpen, setIsVotingModalOpen] = useState<boolean>(false);
  const [isNewProcessModalOpen, setIsNewProcessModalOpen] = useState<boolean>(false);
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState<boolean>(false);
  const [isAddCommissionModalOpen, setIsAddCommissionModalOpen] = useState<boolean>(false);
  const [isAddAppointeeModalOpen, setIsAddAppointeeModalOpen] = useState<boolean>(false);
  const [isAddMeetingModalOpen, setIsAddMeetingModalOpen] = useState<boolean>(false);

  // New Candidate Form State
  const [candName, setCandName] = useState('');
  const [candCpf, setCandCpf] = useState('');
  const [candDept, setCandDept] = useState('');
  const [candJob, setCandJob] = useState('');
  const [candNumber, setCandNumber] = useState('');
  const [candProposal, setCandProposal] = useState('');
  const [candSeniority, setCandSeniority] = useState(12);
  const [candAge, setCandAge] = useState(30);

  // New Commission Member Form State
  const [commName, setCommName] = useState('');
  const [commCpf, setCommCpf] = useState('');
  const [commRole, setCommRole] = useState<'PRESIDENT' | 'SECRETARY' | 'MEMBER'>('MEMBER');
  const [commParty, setCommParty] = useState<'EMPLOYER' | 'EMPLOYEE'>('EMPLOYEE');
  const [commDept, setCommDept] = useState('');

  // New Appointee Form State
  const [appoName, setAppoName] = useState('');
  const [appoCpf, setAppoCpf] = useState('');
  const [appoRole, setAppoRole] = useState<'PRESIDENT' | 'TITULAR' | 'SUPLENTE'>('TITULAR');
  const [appoJob, setAppoJob] = useState('');
  const [appoDept, setAppoDept] = useState('');

  // New Meeting Form State
  const [meetTitle, setMeetTitle] = useState('');
  const [meetDate, setMeetDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetType, setMeetType] = useState<'ORDINARY' | 'EXTRAORDINARY'>('ORDINARY');
  const [meetAgenda, setMeetAgenda] = useState('');

  // New Process Modal Form State
  const [newProcClientId, setNewProcClientId] = useState(clients?.[0]?.id || '');
  const [newProcNorm, setNewProcNorm] = useState<CipaRegulatoryNorm>('NR-05');
  const [newProcYear, setNewProcYear] = useState('2026/2027');
  const [newProcCnae, setNewProcCnae] = useState('41.20-4');
  const [newProcRisk, setNewProcRisk] = useState<1 | 2 | 3 | 4>(3);
  const [newProcTotalEmp, setNewProcTotalEmp] = useState(120);

  // Filter processes
  const filteredProcesses = useMemo(() => {
    return (cipaProcesses || []).filter(p => {
      if (selectedNormFilter !== 'ALL' && p.norm !== selectedNormFilter) return false;
      return true;
    });
  }, [cipaProcesses, selectedNormFilter]);

  const currentProcess: CipaManagementProcess | undefined = useMemo(() => {
    return (cipaProcesses || []).find(p => p.id === selectedProcessId) || filteredProcesses[0] || cipaProcesses?.[0];
  }, [cipaProcesses, selectedProcessId, filteredProcesses]);

  const normInfo = currentProcess ? CIPA_NORMS_CATALOG[currentProcess.norm] : CIPA_NORMS_CATALOG['NR-05'];

  const [selectedMeetingForView, setSelectedMeetingForView] = useState<CipaMeetingRecord | null>(null);

  // Handle New Process Creation with Dimensioning
  const handleCreateProcess = (e: React.FormEvent) => {
    e.preventDefault();
    const client = (clients || []).find(c => c.id === newProcClientId) || clients?.[0];
    const dim = calculateCipaDimensioning(newProcRisk, newProcTotalEmp, newProcNorm);
    const today = new Date().toISOString().split('T')[0];
    const timeline = generateLegalCipaTimeline(today, newProcNorm);
    const clientName = client?.trade_name || client?.legal_name || 'Empresa Parceira';

    const created = addCipaProcess({
      client_id: client?.id || 'client-default',
      client_name: clientName,
      norm: newProcNorm,
      status: 'CONVOCATION_PUBLISHED',
      mandate_year: newProcYear,
      cnae: newProcCnae,
      risk_grade: newProcRisk,
      total_employees: newProcTotalEmp,
      total_eligible_voters: newProcTotalEmp,
      total_votes_cast: 0,
      quorum_percentage: 0,
      dimensioning: dim,
      timeline,
      electoral_commission: [
        {
          id: 'ecm-1',
          name: 'Carlos Mendes',
          cpf: '111.222.333-44',
          role: 'PRESIDENT',
          represented_party: 'EMPLOYER',
          department: 'SESMT'
        },
        {
          id: 'ecm-2',
          name: 'Renata Souza',
          cpf: '222.333.444-55',
          role: 'SECRETARY',
          represented_party: 'EMPLOYEE',
          department: 'Recursos Humanos'
        }
      ],
      employer_appointees: [
        {
          id: 'app-1',
          name: 'Marcelo Pires',
          cpf: '333.444.555-66',
          role: 'PRESIDENT',
          job_title: 'Gerente Operacional',
          department: 'Diretoria',
          is_president: true,
          training_completed: false,
          training_hours: 0
        }
      ],
      candidates: [],
      audit_votes: [],
      meetings: [
        {
          id: 'meet-1',
          meeting_number: 1,
          type: 'ORDINARY',
          date: timeline.inauguration_date,
          title: 'Reunião de Posse e Instalação da CIPA',
          agenda_topics: ['Instalação da comissão', 'Apresentação do calendário', 'Módulo Lei 14.457/2022'],
          attendees_count: (dim.effective_members_employee || 2) + (dim.effective_members_employer || 2),
          ata_document_sha256: 'a1b2c3d4e5f6',
          is_signed_by_all: true
        }
      ],
      generated_documents: []
    });

    setSelectedProcessId(created.id);
    setIsNewProcessModalOpen(false);
  };

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProcess) return;
    registerCipaCandidate(currentProcess.id, {
      name: candName,
      cpf: candCpf,
      department: candDept,
      job_title: candJob,
      candidacy_number: candNumber || `${(currentProcess.candidates?.length || 0) + 10}`,
      proposals: candProposal,
      registration_date: new Date().toISOString().split('T')[0],
      is_eligible: true,
      has_stability_protection: true,
      tiebreaker_seniority_months: Number(candSeniority),
      tiebreaker_age_years: Number(candAge)
    });

    setCandName('');
    setCandCpf('');
    setCandDept('');
    setCandJob('');
    setCandNumber('');
    setCandProposal('');
    setIsAddCandidateModalOpen(false);
  };

  const handleAddCommissionMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProcess) return;
    addElectoralCommissionMember(currentProcess.id, {
      name: commName,
      cpf: commCpf,
      role: commRole,
      represented_party: commParty,
      department: commDept
    });
    setCommName('');
    setCommCpf('');
    setCommDept('');
    setIsAddCommissionModalOpen(false);
  };

  const handleAddAppointee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProcess) return;
    addEmployerAppointee(currentProcess.id, {
      name: appoName,
      cpf: appoCpf,
      role: appoRole,
      job_title: appoJob,
      department: appoDept,
      is_president: appoRole === 'PRESIDENT',
      training_completed: true,
      training_hours: currentProcess.dimensioning?.training_hours_required || 16
    });
    setAppoName('');
    setAppoCpf('');
    setAppoJob('');
    setAppoDept('');
    setIsAddAppointeeModalOpen(false);
  };

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProcess) return;
    const effectiveEmp = currentProcess.dimensioning?.effective_members_employee || 2;
    const effectivePat = currentProcess.dimensioning?.effective_members_employer || 2;
    addCipaMeeting(currentProcess.id, {
      meeting_number: (currentProcess.meetings?.length || 0) + 1,
      type: meetType,
      date: meetDate,
      title: meetTitle,
      agenda_topics: meetAgenda.split('\n').map(t => t.trim()).filter(t => t.length > 0),
      attendees_count: effectiveEmp + effectivePat
    });
    setMeetTitle('');
    setMeetAgenda('');
    setIsAddMeetingModalOpen(false);
  };

  const handlePrintDocument = (docType: CipaDocumentType, customParams?: { candidateId?: string; meetingId?: string; certificateRecipient?: string }) => {
    if (!currentProcess) return;
    printOrExportCipaDocument(currentProcess, docType, customParams);
  };

  const handlePrintMeetingAta = (meetingId: string) => {
    if (!currentProcess) return;
    printOrExportCipaDocument(currentProcess, 'MEETING_ATA', { meetingId });
  };

  const handleCastVoteWrapper = (voteData: {
    candidate_id: string;
    voter_cpf: string;
    verification_method: any;
    facial_confidence?: number;
    ip_address?: string;
  }) => {
    if (!currentProcess) {
      return { success: false, message: 'Nenhum processo selecionado.' };
    }
    return castCipaVote(currentProcess.id, voteData);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Selector */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 text-white shadow-xl border border-teal-800/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 rounded-full bg-teal-500/20 border border-teal-400/40 px-3 py-1 text-xs font-bold text-teal-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Módulo Legal de CIPA &amp; Eleições Digitais
              </span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300">
                Lei nº 14.457/2022 (Combate ao Assédio)
              </span>
              <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-xs font-semibold text-blue-300">
                LGPD &amp; Votação Auditável SHA-256
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Gestão Integral da CIPA &amp; Normas Setoriais
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Controle completo do processo eleitoral, dimensionamento automático pelo Quadro I, cronogramas regulamentares, escrutínio digital seguro, apuração com desempate legal e emissão instantânea de Atas em PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsNewProcessModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-900/40 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Novo Processo CIPA
            </button>
            <button
              onClick={() => setIsVotingModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/40 transition active:scale-95"
            >
              <Vote className="h-4 w-4" />
              Cabine de Votação
            </button>
          </div>
        </div>

        {/* Norm Filter Buttons */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-teal-400" />
            Norma Regulamentadora:
          </span>
          {(['ALL', 'NR-05', 'NR-31.7', 'NR-22.36', 'NR-18.17', 'NR-30', 'NR-32'] as const).map((normKey) => (
            <button
              key={normKey}
              onClick={() => setSelectedNormFilter(normKey)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedNormFilter === normKey
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/50'
              }`}
            >
              {normKey === 'ALL' ? 'Todas as Normas' : normKey}
            </button>
          ))}
        </div>
      </div>

      {/* Process Selection Pill Selector */}
      {filteredProcesses.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Processos Ativos:</span>
          {filteredProcesses.map(proc => (
            <button
              key={proc.id}
              onClick={() => setSelectedProcessId(proc.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition border ${
                currentProcess?.id === proc.id
                  ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-sm ring-1 ring-teal-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-teal-600" />
              <span>{proc.client_name}</span>
              <span className="rounded bg-teal-200/60 px-1.5 py-0.2 text-[10px] font-bold text-teal-800">
                {proc.norm}
              </span>
              <span className="text-[11px] text-slate-400">{proc.mandate_year}</span>
            </button>
          ))}
        </div>
      )}

      {currentProcess ? (
        <>
          {/* Key Metrics KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status & Norm */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Norma &amp; Mandato</span>
                <span className="rounded-md bg-teal-50 px-2 py-0.5 font-bold text-teal-700 text-[11px] border border-teal-100">
                  {currentProcess.norm}
                </span>
              </div>
              <div className="text-lg font-bold text-slate-900 truncate">
                Gestão {currentProcess.mandate_year}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {currentProcess.status === 'INAUGURATION_COMPLETED' ? 'Comissão Empossada' :
                 currentProcess.status === 'VOTING_IN_PROGRESS' ? 'Votação Aberta' :
                 currentProcess.status === 'SCRUTINY_COMPLETED' ? 'Apuração Finalizada' : 'Em Andamento'}
              </div>
            </div>

            {/* Electoral Quorum */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Quórum Eleitoral (Mín. 50%)</span>
                <Vote className="h-4 w-4 text-teal-600" />
              </div>
              <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>{currentProcess.quorum_percentage}%</span>
                <span className="text-xs font-normal text-slate-500">
                  ({currentProcess.total_votes_cast}/{currentProcess.total_eligible_voters} votos)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    currentProcess.quorum_percentage >= 50 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(currentProcess.quorum_percentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Dimensioning Summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Dimensionamento Quadro I</span>
                <Users className="h-4 w-4 text-teal-600" />
              </div>
              <div className="text-lg font-bold text-slate-900">
                {currentProcess.dimensioning.effective_members_employee + currentProcess.dimensioning.effective_members_employer} Titulares
              </div>
              <div className="text-xs text-slate-500">
                +{currentProcess.dimensioning.substitute_members_employee + currentProcess.dimensioning.substitute_members_employer} Suplentes (Grau {currentProcess.risk_grade})
              </div>
            </div>

            {/* Mandatory Training */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Treinamento Obrigatório</span>
                <Award className="h-4 w-4 text-teal-600" />
              </div>
              <div className="text-lg font-bold text-slate-900">
                {currentProcess.dimensioning.training_hours_required} Horas
              </div>
              <div className="text-xs text-teal-700 font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Inclui Módulo Lei 14.457/2022
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-slate-200 bg-white rounded-t-xl px-2">
            <div className="flex flex-wrap items-center gap-1 -mb-px">
              {[
                { id: 'TIMELINE', label: '1. Cronograma & Edital', icon: Calendar },
                { id: 'COMMISSION_EMPLOYER', label: '2. Comissão & Indicados', icon: Users },
                { id: 'CANDIDATES', label: '3. Candidatos & Estabilidade', icon: UserCheck },
                { id: 'VOTING', label: '4. Urna Digital & Auditoria', icon: Vote },
                { id: 'SCRUTINY', label: '5. Apuração & Desempate', icon: Scale },
                { id: 'MEETINGS', label: '6. Reuniões & Atas', icon: FileCheck },
                { id: 'DOCUMENTS', label: '7. Documentos & PDFs', icon: Printer },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
                      isActive
                        ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab 1: Timeline & Convocation Notice */}
          {activeTab === 'TIMELINE' && (
            <div className="space-y-6">
              {/* Timeline Visual Cards */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Cronograma Oficial de Prazos Legais - {normInfo.title}
                    </h3>
                    <p className="text-xs text-slate-550 mt-0.5">
                      Prazos regulamentares calculados automaticamente com base no item 5.5 da NR-05 / legislação aplicável.
                    </p>
                  </div>
                  <button
                    onClick={() => handlePrintDocument('CONVOCATION_NOTICE')}
                    className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 transition"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Imprimir Edital de Convocação
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-teal-700 uppercase">Etapa 1 • Edital</span>
                      <Calendar className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      {currentProcess.timeline.edital_publication_date}
                    </div>
                    <p className="text-xs text-slate-500">
                      Publicação do Edital de Convocação (Mínimo de 45 dias antes do fim do mandato).
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-teal-700 uppercase">Etapa 2 • Inscrições</span>
                      <Users className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      {currentProcess.timeline.candidacy_start_date} a {currentProcess.timeline.candidacy_end_date}
                    </div>
                    <p className="text-xs text-slate-500">
                      Período de Inscrição dos Empregados (Mínimo obrigatório de 15 dias corridos).
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-teal-700 uppercase">Etapa 3 • Eleição</span>
                      <Vote className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      {currentProcess.timeline.voting_start_date} a {currentProcess.timeline.voting_end_date}
                    </div>
                    <p className="text-xs text-slate-500">
                      Votação Secreta Online / Urna Híbrida (Mínimo de 30 dias antes do fim do mandato).
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-teal-700 uppercase">Etapa 4 • Posse</span>
                      <Award className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      {currentProcess.timeline.inauguration_date}
                    </div>
                    <p className="text-xs text-slate-500">
                      Cerimônia de Posse após capacitação de {currentProcess.dimensioning.training_hours_required}h.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Commission & Employer Appointees */}
          {activeTab === 'COMMISSION_EMPLOYER' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Electoral Commission */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Comissão Eleitoral</h3>
                    <p className="text-xs text-slate-500">Organização e condução do escrutínio</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrintDocument('COMMISSION_CONSTITUTION')}
                      className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 transition"
                      title="Imprimir Ata de Constituição"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsAddCommissionModalOpen(true)}
                      className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {currentProcess.electoral_commission.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">{m.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.role === 'PRESIDENT' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {m.role === 'PRESIDENT' ? 'Presidente' : m.role === 'SECRETARY' ? 'Secretário' : 'Membro'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          CPF: {m.cpf} • {m.represented_party === 'EMPLOYER' ? 'Empregador' : 'Empregados'} • {m.department}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteElectoralCommissionMember(currentProcess.id, m.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employer Appointees */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Representantes Indicados do Empregador</h3>
                    <p className="text-xs text-slate-500">Presidente da CIPA e membros da bancada patronal</p>
                  </div>
                  <button
                    onClick={() => setIsAddAppointeeModalOpen(true)}
                    className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar
                  </button>
                </div>

                <div className="space-y-2.5">
                  {currentProcess.employer_appointees.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">{a.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.is_president ? 'bg-amber-100 text-amber-900 font-black' : 'bg-teal-100 text-teal-800'
                          }`}>
                            {a.is_president ? '★ Presidente da CIPA' : a.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {a.job_title} ({a.department}) • Treinamento: {a.training_completed ? `Concluído (${a.training_hours}h)` : 'Pendente'}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteEmployerAppointee(currentProcess.id, a.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Candidates & Stability Protection */}
          {activeTab === 'CANDIDATES' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Candidatos Inscritos dos Empregados ({currentProcess.candidates.length})
                    </h3>
                    <p className="text-xs text-slate-550 mt-0.5">
                      Garantia de estabilidade provisória no emprego desde o registro da candidatura até 1 ano após o mandato (Art. 10, II, "a" do ADCT).
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handlePrintDocument('CANDIDATE_LIST')}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Printer className="h-3.5 w-3.5" /> Relação de Inscritos
                    </button>
                    <button
                      onClick={() => setIsAddCandidateModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 transition"
                    >
                      <Plus className="h-4 w-4" /> Nova Candidatura
                    </button>
                  </div>
                </div>

                {/* Candidate Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold">
                        <th className="p-3">Nº</th>
                        <th className="p-3">Nome do Candidato</th>
                        <th className="p-3">Cargo / Setor</th>
                        <th className="p-3">Data Inscrição</th>
                        <th className="p-3">Estabilidade Provisória</th>
                        <th className="p-3">Votos</th>
                        <th className="p-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentProcess.candidates.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/60">
                          <td className="p-3 font-bold text-slate-900">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-white text-xs">
                              {c.candidacy_number}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{c.name}</div>
                            <div className="text-[11px] text-slate-400">CPF: {c.cpf}</div>
                          </td>
                          <td className="p-3">
                            <div>{c.job_title}</div>
                            <div className="text-[11px] text-slate-400">{c.department}</div>
                          </td>
                          <td className="p-3 text-slate-600">{c.registration_date}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              <ShieldCheck className="h-3 w-3" /> Protegido Art. 10 ADCT
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-900 text-sm">
                            {c.votes_received}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => deleteCipaCandidate(currentProcess.id, c.id)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Voting & LGPD Cryptographic Audit */}
          {activeTab === 'VOTING' && (
            <div className="space-y-6">
              {/* Top Action Box */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-teal-950">
                    Urna Eletrônica de Votação Secreta CIPA
                  </h3>
                  <p className="text-xs text-teal-800 mt-1 max-w-2xl">
                    Votação rápida, acessível e segura. Validação por biometria facial, token corporativo ou SSO com anonimização total dos votos via algoritmo criptográfico SHA-256 e emissão de comprovante.
                  </p>
                </div>
                <button
                  onClick={() => setIsVotingModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition shrink-0"
                >
                  <Vote className="h-4 w-4" />
                  Abrir Cabine de Votação
                </button>
              </div>

              {/* Cryptographic Audit Trail of Votes */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Trilha de Auditoria Criptográfica de Votos ({currentProcess.audit_votes.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Registros anônimos auditáveis em conformidade com a LGPD e item 5.5.4 da NR-05
                    </p>
                  </div>
                  <span className="text-xs font-mono text-teal-700 bg-teal-50 px-2.5 py-1 rounded border border-teal-100">
                    SHA-256 HASH VERIFIED
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-sans font-semibold">
                        <th className="p-2.5">Hash do Voto Anônimo</th>
                        <th className="p-2.5">Eleitor (Mascarado)</th>
                        <th className="p-2.5">Método de Validação</th>
                        <th className="p-2.5">Timestamp</th>
                        <th className="p-2.5">Comprovante Emitido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {currentProcess.audit_votes.map(v => (
                        <tr key={v.id}>
                          <td className="p-2.5 text-slate-700 font-bold truncate max-w-xs">
                            {v.anonymous_vote_hash}
                          </td>
                          <td className="p-2.5 text-slate-600">{v.voter_cpf_masked}</td>
                          <td className="p-2.5 font-sans">
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                              {v.verification_method}
                              {v.facial_biometric_confidence && ` (${v.facial_biometric_confidence}%)`}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500">{new Date(v.casted_at).toLocaleTimeString()}</td>
                          <td className="p-2.5 text-teal-700 font-bold">{v.audit_proof_receipt}</td>
                        </tr>
                      ))}
                      {currentProcess.audit_votes.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400 font-sans">
                            Nenhum voto computado ainda. Clique em "Abrir Cabine de Votação" para iniciar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Scrutiny & Legal Tiebreaker */}
          {activeTab === 'SCRUTINY' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Apuração dos Votos e Classificação Legal dos Eleitos
                    </h3>
                    <p className="text-xs text-slate-550 mt-0.5">
                      Critérios automáticos de desempate da NR-05: maior tempo de serviço no estabelecimento e maior idade.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => calculateAndFinalizeScrutiny(currentProcess.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 transition"
                    >
                      <Scale className="h-3.5 w-3.5" /> Executar Apuração Oficial
                    </button>
                    <button
                      onClick={() => handlePrintDocument('ELECTION_SCRUTINY_ATA')}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Printer className="h-3.5 w-3.5" /> Imprimir Ata de Eleição
                    </button>
                  </div>
                </div>

                {/* Classification Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                        <th className="p-3">Posição</th>
                        <th className="p-3">Candidato</th>
                        <th className="p-3">Votos</th>
                        <th className="p-3">Cargo Eleito</th>
                        <th className="p-3">Critérios de Desempate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentProcess.candidates.map((c, idx) => (
                        <tr key={c.id} className={idx === 0 ? 'bg-emerald-50/50 font-medium' : ''}>
                          <td className="p-3 font-bold text-slate-800">
                            {idx + 1}º Lugar
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{c.name}</div>
                            <div className="text-[11px] text-slate-400">{c.job_title} ({c.department})</div>
                          </td>
                          <td className="p-3 font-black text-sm text-teal-700">
                            {c.votes_received}
                          </td>
                          <td className="p-3">
                            {c.elected_role === 'VICE_PRESIDENT' && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                                ★ Vice-Presidente da CIPA
                              </span>
                            )}
                            {c.elected_role === 'TITULAR' && (
                              <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800">
                                Membro Titular
                              </span>
                            )}
                            {c.elected_role === 'SUPLENTE' && (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                                Membro Suplente
                              </span>
                            )}
                            {(!c.elected_role || c.elected_role === 'NOT_ELECTED') && (
                              <span className="text-slate-400 text-xs">Não eleito</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            Tempo de Casa: {c.tiebreaker_seniority_months} meses • Idade: {c.tiebreaker_age_years} anos
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Ordinary Meetings Calendar & Atas */}
          {activeTab === 'MEETINGS' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Calendário Anual de Reuniões Ordinárias (NR-05 Item 5.6.1)
                    </h3>
                    <p className="text-xs text-slate-550 mt-0.5">
                      Reuniões mensais obrigatórias com registro de Atas e plano de trabalho de prevenção de acidentes.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handlePrintDocument('ANNUAL_MEETING_CALENDAR')}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Printer className="h-3.5 w-3.5" /> Calendário Anual
                    </button>
                    <button
                      onClick={() => setIsAddMeetingModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 transition"
                    >
                      <Plus className="h-4 w-4" /> Registrar Reunião
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(currentProcess.meetings || []).map(m => (
                    <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5 flex flex-col justify-between hover:border-teal-300 transition">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-teal-700 uppercase">
                            {m.type === 'ORDINARY' ? `${m.meeting_number || 1}ª Reunião Ordinária` : 'Reunião Extraordinária'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">{m.date}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-800">{m.title}</div>
                        <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                          {(m.agenda_topics || []).map((t, idx) => (
                            <li key={idx} className="truncate">{t}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {m.is_signed_by_all ? 'Ata Assinada' : 'Ata Registrada'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedMeetingForView(m)}
                            className="text-slate-600 hover:text-slate-900 font-medium underline"
                          >
                            Detalhes
                          </button>
                          <button
                            onClick={() => handlePrintMeetingAta(m.id)}
                            className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded border border-teal-200"
                          >
                            <Printer className="h-3 w-3" /> Imprimir Ata
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!currentProcess.meetings || currentProcess.meetings.length === 0) && (
                    <div className="col-span-full py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                      <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <div className="text-sm font-bold text-slate-700">Nenhuma reunião registrada ainda</div>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Clique no botão acima "Registrar Reunião" para documentar as reuniões mensais ordinárias ou extraordinárias da CIPA.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 7: Legal Document Hub & PDF Exports */}
          {activeTab === 'DOCUMENTS' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Central de Emissão de Documentos &amp; Atas Regulamentares (PDF)
                  </h3>
                  <p className="text-xs text-slate-550 mt-1">
                    Gere, visualize e exporte todos os documentos exigidos pela legislação trabalhista e fiscalização do MTE com QR Code de autenticidade e validade jurídica.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: 'CONVOCATION_NOTICE', title: 'Edital de Convocação', subtitle: 'Publicação oficial do processo eleitoral' },
                    { id: 'COMMISSION_CONSTITUTION', title: 'Ata de Constituição da Comissão', subtitle: 'Comissão eleitoral paritária' },
                    { id: 'CANDIDATE_LIST', title: 'Relação Oficial de Candidatos', subtitle: 'Homologação e estabilidade provisória' },
                    { id: 'ELECTION_SCRUTINY_ATA', title: 'Ata de Eleição e Apuração', subtitle: 'Resultado final e desempate legal' },
                    { id: 'INAUGURATION_ATA', title: 'Ata de Instalação e Posse', subtitle: 'Início oficial do mandato da CIPA' },
                    { id: 'ANNUAL_MEETING_CALENDAR', title: 'Calendário Anual de Reuniões', subtitle: 'Cronograma ordinário mensal' },
                    { id: 'TRAINING_CERTIFICATES', title: 'Certificados de Capacitação', subtitle: `Curso de ${currentProcess.dimensioning?.training_hours_required || 16}h + Lei 14.457/2022` },
                  ].map(doc => (
                    <div key={doc.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 flex flex-col justify-between hover:border-teal-400 transition">
                      <div>
                        <div className="flex items-center gap-2 text-teal-700">
                          <FileText className="h-5 w-5" />
                          <h4 className="font-bold text-slate-900 text-sm">{doc.title}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{doc.subtitle}</p>
                      </div>

                      <button
                        onClick={() => handlePrintDocument(doc.id as CipaDocumentType)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-teal-50 hover:border-teal-400 hover:text-teal-800 transition shadow-sm"
                      >
                        <Printer className="h-3.5 w-3.5 text-teal-600" />
                        Imprimir / Exportar PDF
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          Nenhum processo da CIPA cadastrado. Clique no botão acima para criar o primeiro processo.
        </div>
      )}

      {/* Online Voting Modal */}
      {currentProcess && (
        <CipaVotingModal
          process={currentProcess}
          isOpen={isVotingModalOpen}
          onClose={() => setIsVotingModalOpen(false)}
          onCastVote={handleCastVoteWrapper}
        />
      )}

      {/* New CIPA Process Modal */}
      {isNewProcessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5 text-xs text-slate-700">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Novo Processo Eleitoral CIPA</h3>
              <button onClick={() => setIsNewProcessModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateProcess} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Empresa / Cliente</label>
                <select
                  value={newProcClientId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setNewProcClientId(selectedId);
                    const found = (clients || []).find(c => c.id === selectedId);
                    if (found) {
                      if (found.main_cnae) setNewProcCnae(found.main_cnae);
                      if (found.risk_degree) setNewProcRisk(found.risk_degree as any);
                      if (found.employee_count) setNewProcTotalEmp(found.employee_count);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500 font-medium"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.trade_name || c.legal_name} (CNAE: {c.main_cnae || 'Geral'} • Grau {c.risk_degree || 3} • {c.employee_count || 50} func.)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Norma Regulamentadora</label>
                  <select
                    value={newProcNorm}
                    onChange={(e) => setNewProcNorm(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500 font-bold text-teal-800"
                  >
                    <option value="NR-05">NR-05 - Geral (CIPA)</option>
                    <option value="NR-31.7">NR-31.7 - Rural (CIPATR)</option>
                    <option value="NR-22.36">NR-22.36 - Mineração (CIPAMIN)</option>
                    <option value="NR-18.17">NR-18 - Construção Civil</option>
                    <option value="NR-30">NR-30 - Aquaviário</option>
                    <option value="NR-32">NR-32 - Estabelecimentos de Saúde</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Ano / Gestão</label>
                  <input
                    type="text"
                    value={newProcYear}
                    onChange={(e) => setNewProcYear(e.target.value)}
                    placeholder="2026/2027"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">CNAE Principal</label>
                  <input
                    type="text"
                    value={newProcCnae}
                    onChange={(e) => setNewProcCnae(e.target.value)}
                    placeholder="41.20-4"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Grau de Risco (1 a 4)</label>
                  <select
                    value={newProcRisk}
                    onChange={(e) => setNewProcRisk(Number(e.target.value) as any)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500 font-bold"
                  >
                    <option value={1}>Grau 1 (8h Treinamento)</option>
                    <option value={2}>Grau 2 (12h Treinamento)</option>
                    <option value={3}>Grau 3 (16h Treinamento)</option>
                    <option value={4}>Grau 4 (20h Treinamento)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Nº Funcionários</label>
                  <input
                    type="number"
                    value={newProcTotalEmp}
                    onChange={(e) => setNewProcTotalEmp(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500 font-bold"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-teal-50 p-3 text-teal-900 text-[11px] leading-relaxed">
                <strong>Dimensionamento Automático:</strong> O sistema calculará o número de membros titulares e suplentes, as datas legais e o treinamento obrigatório conforme o Quadro I da norma selecionada.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewProcessModalOpen(false)}
                  className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700"
                >
                  Criar Processo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {isAddCandidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4 text-xs text-slate-700">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Inscrição de Candidato da CIPA</h3>
              <button onClick={() => setIsAddCandidateModalOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleAddCandidate} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">CPF</label>
                  <input
                    type="text"
                    required
                    value={candCpf}
                    onChange={(e) => setCandCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Nº Candidatura</label>
                  <input
                    type="text"
                    required
                    value={candNumber}
                    onChange={(e) => setCandNumber(e.target.value)}
                    placeholder="Ex: 15"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500 font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Cargo / Função</label>
                  <input
                    type="text"
                    required
                    value={candJob}
                    onChange={(e) => setCandJob(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Departamento</label>
                  <input
                    type="text"
                    required
                    value={candDept}
                    onChange={(e) => setCandDept(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Tempo de Empresa (Meses - Desempate)</label>
                  <input
                    type="number"
                    value={candSeniority}
                    onChange={(e) => setCandSeniority(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Idade (Anos - Desempate)</label>
                  <input
                    type="number"
                    value={candAge}
                    onChange={(e) => setCandAge(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Propostas e Ideias do Candidato</label>
                <textarea
                  rows={2}
                  value={candProposal}
                  onChange={(e) => setCandProposal(e.target.value)}
                  placeholder="Ex: Melhorias na ergonomia do setor e campanhas da SIPAT..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddCandidateModalOpen(false)}
                  className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700"
                >
                  Homologar Candidatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Commission Member Modal */}
      {isAddCommissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 text-xs text-slate-700">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Adicionar Membro da Comissão Eleitoral</h3>
              <button onClick={() => setIsAddCommissionModalOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleAddCommissionMember} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={commName}
                  onChange={(e) => setCommName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">CPF</label>
                  <input
                    type="text"
                    required
                    value={commCpf}
                    onChange={(e) => setCommCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Função na Comissão</label>
                  <select
                    value={commRole}
                    onChange={(e) => setCommRole(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500 font-bold"
                  >
                    <option value="PRESIDENT">Presidente da Comissão</option>
                    <option value="SECRETARY">Secretário</option>
                    <option value="MEMBER">Membro Efetivo</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Representação</label>
                  <select
                    value={commParty}
                    onChange={(e) => setCommParty(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  >
                    <option value="EMPLOYER">Indicado pelo Empregador</option>
                    <option value="EMPLOYEE">Representante dos Empregados</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Departamento</label>
                  <input
                    type="text"
                    required
                    value={commDept}
                    onChange={(e) => setCommDept(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddCommissionModalOpen(false)}
                  className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700"
                >
                  Salvar Membro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Appointee Modal */}
      {isAddAppointeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 text-xs text-slate-700">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Novo Indicado pelo Empregador</h3>
              <button onClick={() => setIsAddAppointeeModalOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleAddAppointee} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={appoName}
                  onChange={(e) => setAppoName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">CPF</label>
                  <input
                    type="text"
                    required
                    value={appoCpf}
                    onChange={(e) => setAppoCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Cargo na CIPA</label>
                  <select
                    value={appoRole}
                    onChange={(e) => setAppoRole(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500 font-bold text-teal-800"
                  >
                    <option value="PRESIDENT">Presidente da CIPA (Obrigatório)</option>
                    <option value="TITULAR">Membro Titular do Empregador</option>
                    <option value="SUPLENTE">Membro Suplente do Empregador</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Cargo na Empresa</label>
                  <input
                    type="text"
                    required
                    value={appoJob}
                    onChange={(e) => setAppoJob(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Departamento</label>
                  <input
                    type="text"
                    required
                    value={appoDept}
                    onChange={(e) => setAppoDept(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddAppointeeModalOpen(false)}
                  className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700"
                >
                  Salvar Indicado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Meeting Modal */}
      {isAddMeetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 text-xs text-slate-700">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Registrar Reunião da CIPA</h3>
              <button onClick={() => setIsAddMeetingModalOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleAddMeeting} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Título da Reunião / Pauta Principal</label>
                <input
                  type="text"
                  required
                  value={meetTitle}
                  onChange={(e) => setMeetTitle(e.target.value)}
                  placeholder="Ex: Análise das Condições de Trabalho e Mapa de Riscos"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Tipo de Reunião</label>
                  <select
                    value={meetType}
                    onChange={(e) => setMeetType(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  >
                    <option value="ORDINARY">Ordinária (Mensal)</option>
                    <option value="EXTRAORDINARY">Extraordinária (Acidente Grave / Risco)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Data da Reunião</label>
                  <input
                    type="date"
                    required
                    value={meetDate}
                    onChange={(e) => setMeetDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Tópicos da Pauta (um por linha)</label>
                <textarea
                  rows={3}
                  value={meetAgenda}
                  onChange={(e) => setMeetAgenda(e.target.value)}
                  placeholder="Avaliação dos riscos ambientais&#10;Ações de combate ao assédio (Lei 14.457/2022)&#10;Inspeção de extintores e EPIs"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-teal-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddMeetingModalOpen(false)}
                  className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700"
                >
                  Registrar Reunião
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Meeting & Ata Details Modal */}
      {selectedMeetingForView && currentProcess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 text-xs text-slate-700">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[11px] font-bold text-teal-700 uppercase">
                  {selectedMeetingForView.type === 'ORDINARY'
                    ? `${selectedMeetingForView.meeting_number || 1}ª Reunião Ordinária`
                    : 'Reunião Extraordinária'}
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedMeetingForView.title}</h3>
              </div>
              <button onClick={() => setSelectedMeetingForView(null)} className="text-slate-400 hover:text-slate-600 font-bold text-base">✕</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium">Data Realizada:</span>
                  <div className="font-bold text-slate-800">{selectedMeetingForView.date}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Status da Ata:</span>
                  <div className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Assinada Digitalmente
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1.5">Pauta &amp; Assuntos Tratados:</h4>
                <ul className="space-y-1 bg-slate-50/70 p-3 rounded-xl border border-slate-200 list-disc list-inside">
                  {(selectedMeetingForView.agenda_topics || []).map((topic, idx) => (
                    <li key={idx} className="text-slate-700 font-medium">{topic}</li>
                  ))}
                  {(!selectedMeetingForView.agenda_topics || selectedMeetingForView.agenda_topics.length === 0) && (
                    <li className="text-slate-400 italic">Nenhum tópico registrado</li>
                  )}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1.5">Membros Presentes / Bancadas:</h4>
                <div className="text-[11px] text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <div>• <strong>Bancada do Empregador:</strong> {(currentProcess.employer_appointees || []).map(a => a.name).join(', ') || 'Representantes patronais'}</div>
                  <div>• <strong>Bancada dos Empregados:</strong> {(currentProcess.candidates || []).filter(c => c.elected_role && c.elected_role !== 'NOT_ELECTED').map(c => c.name).join(', ') || 'Representantes eleitos'}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  deleteCipaMeeting(currentProcess.id, selectedMeetingForView.id);
                  setSelectedMeetingForView(null);
                }}
                className="text-red-600 hover:text-red-800 font-semibold text-xs"
              >
                Excluir Registro
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMeetingForView(null)}
                  className="rounded-lg border px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintMeetingAta(selectedMeetingForView.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700"
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimir Ata Oficial (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
