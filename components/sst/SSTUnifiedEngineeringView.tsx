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
import { CartaoMetrica } from '@/components/dashboards/CartaoMetrica';
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

/**
 * As 15 abas do modulo. Eram 15 blocos <button> escritos a mao, cada um com a
 * sua copia das mesmas classes, dentro de um scroller horizontal -- quem nao
 * arrastava a faixa nao sabia que existiam abas depois da 6. Aqui viram dados:
 * a faixa passa a quebrar linha, e mudar a aparencia e mudar um lugar so.
 * Os ids dos botoes sao os mesmos de antes, porque o menu lateral e a paleta
 * de comandos apontam para eles.
 */
const ABAS = [
  { chave: 'HIERARCHY', id: 'main-tab-hierarchy-btn', icone: Building2, num: '1', nome: 'Hierarquia', nota: 'Unidade / Setor / Cargo' },
  { chave: 'GHE_RISKS', id: 'main-tab-ghe-risks-btn', icone: ShieldAlert, num: '2', nome: 'GHE & Inventário de Riscos', nota: 'PGR / LTCAT' },
  { chave: 'ACTION_PLAN', id: 'main-tab-action-plan-btn', icone: ClipboardList, num: '2.1', nome: 'Plano de Ação', nota: 'PGR, NR-01 1.5.5' },
  { chave: 'EXAMS_PCMSO', id: 'main-tab-exams-pcmso-btn', icone: Stethoscope, num: '3', nome: 'Aplicação de Exames', nota: 'PCMSO & ASO' },
  { chave: 'EMPLOYEES', id: 'main-tab-employees-btn', icone: Users, num: '4', nome: 'Trabalhadores', nota: 'Cadastro & histórico' },
  { chave: 'WORK_ORDERS_OS', id: 'main-tab-work-orders-os-btn', icone: FileText, num: '5', nome: 'Ordens de Serviço', nota: 'NR-01 & CLT' },
  { chave: 'DOCS_XML', id: 'main-tab-docs-xml-btn', icone: FileCode2, num: '6', nome: 'Documentos & XMLs', nota: 'eSocial' },
  { chave: 'INTEGRATION_TRAINING', id: 'main-tab-integration-training-btn', icone: GraduationCap, num: '7', nome: 'Treinamentos de Integração', nota: 'NR-01' },
  { chave: 'SIGNATURES', id: 'main-tab-signatures-btn', icone: PenTool, num: '8', nome: 'Assinaturas Digitais', nota: 'Lei 14.063' },
  { chave: 'CONTRACTED', id: 'main-tab-contracted-btn', icone: Handshake, num: '9', nome: 'Contratadas', nota: 'NR-01, 1.5.8' },
  { chave: 'MACHINES', id: 'main-tab-machines-btn', icone: Cog, num: '10', nome: 'Máquinas', nota: 'NR-12, NR-13, NR-11' },
  { chave: 'CHEMICALS', id: 'main-tab-chemicals-btn', icone: FlaskConical, num: '11', nome: 'Produtos Químicos', nota: 'NR-26' },
  { chave: 'TRAINING_MATRIX', id: 'main-tab-training-matrix-btn', icone: GraduationCap, num: '12', nome: 'Matriz de Capacitação', nota: 'NR-01, 1.7' },
  { chave: 'ERGONOMICS', id: 'main-tab-ergonomics-btn', icone: Activity, num: '13', nome: 'Avaliação Ergonômica', nota: 'NR-17' },
  { chave: 'TECHNICAL_RESPONSIBILITY', id: 'main-tab-technical-responsibility-btn', icone: BadgeCheck, num: '14', nome: 'Responsabilidade Técnica', nota: 'NR-07, 7.4.1' },
] as const;

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

  const clienteAtual = clients.find(c => c.id === selectedClientId);
  const nomeDoCliente = clienteAtual?.trade_name || clienteAtual?.legal_name || 'nenhuma empresa selecionada';

  return (
    <div className="space-y-5" id="sst-unified-workspace">
      {/* Cabecalho de pagina no formato do shell claro: tarja, titulo,
          subtitulo e acoes a direita. Antes era um cartao-banner que empilhava
          selo, paragrafo longo, seletor de cliente e seis mini-cartoes cinza
          dentro da mesma moldura -- o titulo da tela ficava no meio do bloco. */}
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div className="min-w-0">
          <div className="text-[10.5px] font-bold tracking-[0.11em] text-tinta-3">
            ENGENHARIA &amp; HIGIENE OCUPACIONAL
          </div>
          <h1 className="font-titulo text-[26px] font-bold tracking-[-0.4px] text-tinta mt-1.5 mb-1 text-balance">
            Engenharia SST &amp; Eventos eSocial
          </h1>
          <p className="text-[13px] text-tinta-2 max-w-2xl">
            {nomeDoCliente} · hierarquia, inventário de riscos, exames, trabalhadores
            e os XMLs do eSocial (S-2210, S-2220, S-2240).
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          <div className="min-w-0">
            <label htmlFor="sst-client-selector" className="block text-[10px] font-bold tracking-[0.08em] text-tinta-3 mb-1">
              EMPRESA
            </label>
            <select
              id="sst-client-selector"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="h-[38px] w-full sm:w-64 rounded-[9px] border border-borda bg-superficie px-3 text-[13px] font-semibold text-tinta focus:outline-none focus:border-marca-escura transition"
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
              className="h-[38px] inline-flex items-center gap-1.5 rounded-[9px] border border-borda bg-superficie px-3.5 text-[13px] font-semibold text-tinta hover:bg-superficie-2 transition"
            >
              Painel de transmissão eSocial
              <ArrowRight className="w-[15px] h-[15px]" />
            </button>
          )}
        </div>
      </div>

      {/* Numeros da empresa em uso, no cartao do shell claro. */}
      <section className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        <CartaoMetrica icone={Building2} tom="teal" valor={clientSectors.length} rotulo="Setores" nota={`${clientJobs.length} cargos CBO`} onClick={() => setActiveTab('HIERARCHY')} />
        <CartaoMetrica icone={ShieldAlert} tom="ambar" valor={clientGhes.length} rotulo="GHEs" nota={`${clientRisks.length} riscos NR-01/NR-15`} onClick={() => setActiveTab('GHE_RISKS')} />
        <CartaoMetrica icone={Stethoscope} tom="teal" valor={clientExamProtocols.length} rotulo="Exames do PCMSO" nota="Tabela 27 do eSocial" onClick={() => setActiveTab('EXAMS_PCMSO')} />
        <CartaoMetrica icone={Users} tom="marca" valor={clientEmployees.length} rotulo="Trabalhadores ativos" nota="Matrícula & ficha de EPI" onClick={() => setActiveTab('EMPLOYEES')} />
        <CartaoMetrica icone={Briefcase} tom="neutro" valor={clientWorkOrders.length} rotulo="OS emitidas" nota={`${clientTrainings.length} treinamentos NR`} onClick={() => setActiveTab('WORK_ORDERS_OS')} />
        <CartaoMetrica icone={FileCode2} tom="marca" valor={clientEvents.length} rotulo="XMLs do eSocial" nota="S-2210, S-2220, S-2240" onClick={() => setActiveTab('DOCS_XML')} />
      </section>

      {/* Etapas. Quebram linha em vez de rolar na horizontal: com o scroller,
          as abas 7 a 14 ficavam fora da tela sem nada indicando que existiam. */}
      <nav className="flex flex-wrap gap-2 border-t border-borda pt-4" aria-label="Etapas da engenharia SST">
        {ABAS.map(aba => {
          const Icone = aba.icone;
          const ativa = activeTab === aba.chave;
          return (
            <button
              key={aba.chave}
              type="button"
              id={aba.id}
              aria-current={ativa ? 'page' : undefined}
              onClick={() => setActiveTab(aba.chave)}
              title={`${aba.num}. ${aba.nome} (${aba.nota})`}
              className={`flex items-center gap-2 rounded-[9px] border px-3 py-2 text-left transition ${
                ativa
                  ? 'bg-marca-suave border-marca-borda text-tinta'
                  : 'bg-superficie border-borda text-tinta-2 hover:bg-superficie-2 hover:text-tinta'
              }`}
            >
              <span className={`text-[10px] font-mono font-bold w-7 text-center shrink-0 ${ativa ? 'text-marca-escura' : 'text-tinta-3'}`}>
                {aba.num}
              </span>
              <Icone className={`w-4 h-4 shrink-0 ${ativa ? 'text-marca-escura' : 'text-tinta-3'}`} />
              <span className="min-w-0">
                <span className={`block text-[13px] leading-tight ${ativa ? 'font-semibold' : 'font-medium'}`}>{aba.nome}</span>
                <span className="block text-[10px] uppercase tracking-wider text-tinta-3 leading-tight mt-0.5">{aba.nota}</span>
              </span>
            </button>
          );
        })}
      </nav>

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
