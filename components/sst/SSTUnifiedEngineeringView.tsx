'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  ShieldCheck, 
  Layers, 
  Building2, 
  Briefcase, 
  Users, 
  Stethoscope, 
  AlertOctagon, 
  FileCode2, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  HardHat, 
  HeartPulse, 
  FileText, 
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  GraduationCap
} from 'lucide-react';
import { HierarchyTab } from './HierarchyTab';
import { GHERiskInventoryTab } from './GHERiskInventoryTab';
import { ExamPCMSOTab } from './ExamPCMSOTab';
import { protocolosDoCliente } from '@/lib/protocolosDeExame';
import { EmployeesTab } from './EmployeesTab';
import { WorkOrderOSTab } from './WorkOrderOSTab';
import { TechnicalDocsGeneratorTab } from './TechnicalDocsGeneratorTab';
import { IntegrationTrainingTab } from './IntegrationTrainingTab';
import { SSTSignaturesManagementTab } from './SSTSignaturesManagementTab';
import { ContractedOrganizationsTab } from './ContractedOrganizationsTab';
import { MachinesEquipmentTab } from './MachinesEquipmentTab';
import { ChemicalProductsTab } from './ChemicalProductsTab';
import { TrainingMatrixTab } from './TrainingMatrixTab';
import { ErgonomicAssessmentTab } from './ErgonomicAssessmentTab';
import { TechnicalResponsibilityTab } from './TechnicalResponsibilityTab';
import { PlanoDeAcaoTab } from './PlanoDeAcaoTab';
import { PenTool, Handshake, Cog, FlaskConical, Activity, BadgeCheck, ClipboardList } from 'lucide-react';

interface SSTUnifiedEngineeringViewProps {
  onNavigate?: (view: string) => void;
  initialTab?: 'HIERARCHY' | 'GHE_RISKS' | 'ACTION_PLAN' | 'EXAMS_PCMSO' | 'EMPLOYEES' | 'WORK_ORDERS_OS' | 'DOCS_XML' | 'INTEGRATION_TRAINING' | 'SIGNATURES' | 'CONTRACTED' | 'MACHINES' | 'CHEMICALS' | 'TRAINING_MATRIX' | 'ERGONOMICS' | 'TECHNICAL_RESPONSIBILITY';
}

export const SSTUnifiedEngineeringView: React.FC<SSTUnifiedEngineeringViewProps> = ({ onNavigate, initialTab }) => {
  const {
    clients = [],
    units = [],
    hierarchySectors = [],
    hierarchyJobs = [],
    ghes = [],
    environmentalRisks = [],
    examProtocols = [],
    employees = [],
    esocialEvents = [],
    workOrdersOS = [],
    integrationTrainings = []
  } = usePrevSafe();

  const [selectedClientId, setSelectedClientId] = useState<string>(clients?.[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'HIERARCHY' | 'GHE_RISKS' | 'ACTION_PLAN' | 'EXAMS_PCMSO' | 'EMPLOYEES' | 'WORK_ORDERS_OS' | 'DOCS_XML' | 'INTEGRATION_TRAINING' | 'SIGNATURES' | 'CONTRACTED' | 'MACHINES' | 'CHEMICALS' | 'TRAINING_MATRIX' | 'ERGONOMICS' | 'TECHNICAL_RESPONSIBILITY'>(initialTab || 'HIERARCHY');

  // Sync when initialTab prop updates from external navigation
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const selectedClient = (clients || []).find(c => c.id === selectedClientId) || clients?.[0];

  // Stats calculation
  const clientUnits = (units || []).filter(u => !selectedClientId || u.client_id === selectedClientId);
  const clientSectors = (hierarchySectors || []).filter(s => !selectedClientId || s.client_id === selectedClientId);
  const clientJobs = (hierarchyJobs || []).filter(j => !selectedClientId || j.client_id === selectedClientId);
  const clientGhes = (ghes || []).filter(g => !selectedClientId || g.client_id === selectedClientId);
  const clientRisks = (environmentalRisks || []).filter(r => clientGhes.some(g => g.id === r.ghe_id));
  // Mesma regra da lista da aba 3: o card contava os protocolos de TODOS os
  // clientes, e a lista abaixo dele contava so os de um.
  const clientExamProtocols = protocolosDoCliente(examProtocols || [], ghes || [], selectedClientId);
  const clientEmployees = (employees || []).filter(e => !selectedClientId || e.client_id === selectedClientId);
  const clientWorkOrders = (workOrdersOS || []).filter(o => !selectedClientId || o.client_id === selectedClientId);
  const clientTrainings = (integrationTrainings || []).filter(t => !selectedClientId || t.client_id === selectedClientId);
  const clientEvents = (esocialEvents || []).filter(e => !selectedClientId || e.client_id === selectedClientId);

  return (
    <div className="space-y-6" id="sst-unified-workspace">
      {/* Top Header Card */}
      <div className="bg-superficie border border-borda rounded-2xl p-6 relative overflow-hidden shadow-sm">

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-teal-500/20 text-teal-800 font-bold text-xs rounded-full border border-teal-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Módulo Integrado SST & eSocial (PGR • PCMSO • LTCAT • S-2210/2220/2240)
              </span>
              <span className="px-2 py-0.5 bg-marca-suave text-marca-escura text-[11px] font-mono font-semibold rounded">
                MOS e leiaute S-1.3
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-tinta tracking-tight">
              Engenharia SST & Eventos eSocial
            </h1>

            <p className="text-xs sm:text-sm text-tinta-2 max-w-2xl">
              Central unificada para criação da hierarquia (Unidade/Setor/Cargo), inventário de riscos ambientais (PGR/LTCAT), aplicação de exames (PCMSO/ASO), cadastro de trabalhadores e emissão de CATs/Afastamentos com geração automática de XMLs do eSocial.
            </p>
          </div>

          {/* Client context switch & quick links */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3">
            <div className="w-full sm:w-auto">
              <label className="block text-[11px] font-semibold text-tinta-2 mb-1">
                Empresa / Cliente Selecionado:
              </label>
              <select
                id="sst-client-selector"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full sm:w-64 bg-fundo border border-borda rounded-xl px-3.5 py-2 text-xs font-semibold text-teal-700 focus:outline-none focus:border-teal-500 shadow-inner"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.trade_name || c.legal_name} ({c.document_number})
                  </option>
                ))}
              </select>
            </div>

            {onNavigate && (
              <button
                type="button"
                id="nav-to-esocial-robot-btn"
                onClick={() => onNavigate('esocial')}
                className="text-xs text-teal-700 hover:text-teal-700 font-semibold flex items-center gap-1 transition-colors"
              >
                Ir para o Painel de Transmissão & Robô eSocial
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Stats Counter Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6 pt-5 border-t border-borda">
          <div className="bg-fundo p-3 rounded-xl border border-borda">
            <div className="flex items-center justify-between text-tinta-2 text-[10px] uppercase font-bold">
              <span>Hierarquia</span>
              <Building2 className="w-3.5 h-3.5 text-teal-700" />
            </div>
            <div className="text-lg font-black text-tinta mt-1">{clientSectors.length} setores</div>
            <div className="text-[10px] text-tinta-2">{clientJobs.length} cargos CBO</div>
          </div>

          <div className="bg-fundo p-3 rounded-xl border border-borda">
            <div className="flex items-center justify-between text-tinta-2 text-[10px] uppercase font-bold">
              <span>GHEs & Riscos</span>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <div className="text-lg font-black text-tinta mt-1">{clientGhes.length} GHEs</div>
            <div className="text-[10px] text-tinta-2">{clientRisks.length} riscos NR-01/NR-15</div>
          </div>

          <div className="bg-fundo p-3 rounded-xl border border-borda">
            <div className="flex items-center justify-between text-tinta-2 text-[10px] uppercase font-bold">
              <span>PCMSO & Exames</span>
              <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
            </div>
            <div className="text-lg font-black text-tinta mt-1">{clientExamProtocols.length} exames</div>
            <div className="text-[10px] text-tinta-2">Tabela 27 eSocial</div>
          </div>

          <div className="bg-fundo p-3 rounded-xl border border-borda">
            <div className="flex items-center justify-between text-tinta-2 text-[10px] uppercase font-bold">
              <span>Trabalhadores</span>
              <Users className="w-3.5 h-3.5 text-teal-700" />
            </div>
            <div className="text-lg font-black text-tinta mt-1">{clientEmployees.length} ativos</div>
            <div className="text-[10px] text-tinta-2">Matrícula & Ficha EPI</div>
          </div>

          <div className="bg-fundo p-3 rounded-xl border border-borda">
            <div className="flex items-center justify-between text-tinta-2 text-[10px] uppercase font-bold">
              <span>OS & Treinamentos</span>
              <Briefcase className="w-3.5 h-3.5 text-teal-700" />
            </div>
            <div className="text-lg font-black text-tinta mt-1">{clientWorkOrders.length} OS emitidas</div>
            <div className="text-[10px] text-tinta-2">{clientTrainings.length} treinamentos NR</div>
          </div>

          <div className="bg-fundo p-3 rounded-xl border border-borda">
            <div className="flex items-center justify-between text-tinta-2 text-[10px] uppercase font-bold">
              <span>Eventos eSocial</span>
              <FileCode2 className="w-3.5 h-3.5 text-marca-escura" />
            </div>
            <div className="text-lg font-black text-marca-escura mt-1">{clientEvents.length} XMLs</div>
            <div className="text-[10px] text-tinta-2">S-2210, 2220, 2240</div>
          </div>
        </div>
      </div>

      {/* Main Unified Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-borda pb-2 overflow-x-auto">
        <button
          type="button"
          id="main-tab-hierarchy-btn"
          onClick={() => setActiveTab('HIERARCHY')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'HIERARCHY'
              ? 'bg-marca-escura text-white shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <Building2 className="w-4 h-4" />
          1. Hierarquia (Unidade/Setor/Cargo)
        </button>

        <button
          type="button"
          id="main-tab-ghe-risks-btn"
          onClick={() => setActiveTab('GHE_RISKS')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'GHE_RISKS'
              ? 'bg-marca-escura text-white shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          2. GHE & Inventário de Riscos (PGR/LTCAT)
        </button>

        {/* 2.1, e nao 3: o plano e a continuacao do inventario no PGR, e as
            outras abas sao citadas pelo numero em mensagens do sistema (ex.:
            "aba 2" em lib/ghesDoCargo.ts). */}
        <button
          type="button"
          id="main-tab-action-plan-btn"
          onClick={() => setActiveTab('ACTION_PLAN')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'ACTION_PLAN'
              ? 'bg-marca-escura text-white shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          2.1 Plano de Ação (PGR, NR-01 1.5.5)
        </button>

        <button
          type="button"
          id="main-tab-exams-pcmso-btn"
          onClick={() => setActiveTab('EXAMS_PCMSO')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'EXAMS_PCMSO'
              ? 'bg-marca-escura text-white shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          3. Aplicação de Exames (PCMSO & ASO)
        </button>

        <button
          type="button"
          id="main-tab-employees-btn"
          onClick={() => setActiveTab('EMPLOYEES')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'EMPLOYEES'
              ? 'bg-marca-escura text-white shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <Users className="w-4 h-4" />
          4. Trabalhadores & Histórico
        </button>

        <button
          type="button"
          id="main-tab-work-orders-os-btn"
          onClick={() => setActiveTab('WORK_ORDERS_OS')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'WORK_ORDERS_OS'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <FileText className="w-4 h-4" />
          5. Ordens de Serviço (NR-01 & CLT)
        </button>

        <button
          type="button"
          id="main-tab-docs-xml-btn"
          onClick={() => setActiveTab('DOCS_XML')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'DOCS_XML'
              ? 'bg-marca text-slate-950 shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          6. Documentos & XMLs eSocial
        </button>

        <button
          type="button"
          id="main-tab-integration-training-btn"
          onClick={() => setActiveTab('INTEGRATION_TRAINING')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'INTEGRATION_TRAINING'
              ? 'bg-marca-escura text-white shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          7. Treinamentos de Integração (NR-01)
        </button>

        <button
          type="button"
          id="main-tab-signatures-btn"
          onClick={() => setActiveTab('SIGNATURES')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'SIGNATURES'
              ? 'bg-marca-escura text-white shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <PenTool className="w-4 h-4" />
          8. Assinaturas Digitais & Aceite (Lei 14.063)
        </button>

        <button
          type="button"
          id="main-tab-contracted-btn"
          onClick={() => setActiveTab('CONTRACTED')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'CONTRACTED'
              ? 'bg-marca-escura text-white shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <Handshake className="w-4 h-4" />
          9. Contratadas (NR-01, 1.5.8)
        </button>

        <button
          type="button"
          id="main-tab-machines-btn"
          onClick={() => setActiveTab('MACHINES')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'MACHINES'
              ? 'bg-marca-escura text-white shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <Cog className="w-4 h-4" />
          10. Máquinas (NR-12, NR-13, NR-11)
        </button>

        <button
          type="button"
          id="main-tab-chemicals-btn"
          onClick={() => setActiveTab('CHEMICALS')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'CHEMICALS'
              ? 'bg-marca-escura text-white shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          11. Produtos Químicos (NR-26)
        </button>

        <button
          type="button"
          id="main-tab-training-matrix-btn"
          onClick={() => setActiveTab('TRAINING_MATRIX')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'TRAINING_MATRIX'
              ? 'bg-marca-escura text-white shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          12. Matriz de Capacitação (NR-01, 1.7)
        </button>

        <button
          type="button"
          id="main-tab-ergonomics-btn"
          onClick={() => setActiveTab('ERGONOMICS')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'ERGONOMICS'
              ? 'bg-marca-escura text-white shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <Activity className="w-4 h-4" />
          13. Avaliação Ergonômica (NR-17)
        </button>

        <button
          type="button"
          id="main-tab-technical-responsibility-btn"
          onClick={() => setActiveTab('TECHNICAL_RESPONSIBILITY')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'TECHNICAL_RESPONSIBILITY'
              ? 'bg-marca-escura text-white shadow-sm'
              : 'text-tinta-2 hover:text-tinta hover:bg-superficie'
          }`}
        >
          <BadgeCheck className="w-4 h-4" />
          14. Responsabilidade Técnica (NR-07, 7.4.1)
        </button>
      </div>

      {/* Render Active View Tab */}
      <div className="transition-all animate-in fade-in duration-200" id="sst-tab-content-area">
        {activeTab === 'TECHNICAL_RESPONSIBILITY' && (
          <TechnicalResponsibilityTab selectedClientId={selectedClientId} />
        )}
        {activeTab === 'HIERARCHY' && (
          <HierarchyTab selectedClientId={selectedClientId} />
        )}
        {activeTab === 'GHE_RISKS' && (
          <GHERiskInventoryTab selectedClientId={selectedClientId} />
        )}
        {activeTab === 'ACTION_PLAN' && (
          <PlanoDeAcaoTab selectedClientId={selectedClientId} />
        )}
        {activeTab === 'EXAMS_PCMSO' && (
          <ExamPCMSOTab selectedClientId={selectedClientId} />
        )}
        {activeTab === 'EMPLOYEES' && (
          <EmployeesTab selectedClientId={selectedClientId} />
        )}
        {activeTab === 'WORK_ORDERS_OS' && (
          <WorkOrderOSTab selectedClientId={selectedClientId} />
        )}
        {activeTab === 'DOCS_XML' && (
          <TechnicalDocsGeneratorTab selectedClientId={selectedClientId} />
        )}
        {activeTab === 'INTEGRATION_TRAINING' && (
          <IntegrationTrainingTab selectedClientId={selectedClientId} />
        )}
        {activeTab === 'SIGNATURES' && (
          <SSTSignaturesManagementTab selectedClientId={selectedClientId} />
        )}
        {activeTab === 'CONTRACTED' && (
          <ContractedOrganizationsTab selectedClientId={selectedClientId} />
        )}
        {activeTab === 'MACHINES' && (
          <MachinesEquipmentTab selectedClientId={selectedClientId} />
        )}
        {activeTab === 'CHEMICALS' && (
          <ChemicalProductsTab selectedClientId={selectedClientId} />
        )}
        {activeTab === 'TRAINING_MATRIX' && (
          <TrainingMatrixTab selectedClientId={selectedClientId} />
        )}
        {activeTab === 'ERGONOMICS' && (
          <ErgonomicAssessmentTab selectedClientId={selectedClientId} />
        )}
      </div>
    </div>
  );
};
