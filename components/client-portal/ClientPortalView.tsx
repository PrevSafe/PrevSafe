'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { formatDate, formatCurrency } from '@/lib/utils';
import { 
  Building2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Download, 
  Star, 
  AlertCircle, 
  RotateCcw, 
  ShieldCheck, 
  Send, 
  Calendar, 
  Plus, 
  Search, 
  Eye, 
  MessageSquare, 
  HelpCircle, 
  Paperclip, 
  Trash2, 
  Edit3, 
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  Award,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RequestItem, Evaluation, Document as DocumentType } from '@/types';

export const ClientPortalView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    clients, 
    contracts, 
    serviceOrders, 
    documents, 
    requests, 
    evaluations,
    clientAcceptService, 
    clientRequestRework, 
    submitEvaluation, 
    resolveRequest,
    createRequest,
    deleteRequest
  } = usePrevSafe();

  // Active client selector state
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || 'cli-001');
  const currentClient = clients.find(c => c.id === selectedClientId) || clients[0] || {
    id: 'cli-001',
    trade_name: 'Metalúrgica Valença',
    legal_name: 'Metalúrgica Valença Indústria e Comércio S/A',
    document_number: '12.345.678/0001-90',
    employee_count: 85,
    risk_degree: 3,
    address: 'Av. das Indústrias, 1500 - Distrito Industrial',
    city: 'Valença',
    state: 'RJ',
    email: 'marcelo.silva@valenca.com.br',
    phone: '(24) 2453-9900'
  };

  // Active portal tab
  const [activeTab, setActiveTab] = useState<'OS' | 'DOCS' | 'REQUESTS' | 'CONTRACTS' | 'EVALUATIONS'>('OS');

  // Filtered data for active client
  const clientContracts = contracts.filter(c => c.client_id === currentClient.id);
  const clientOS = serviceOrders.filter(o => o.client_id === currentClient.id);
  const clientDocs = documents.filter(d => d.client_id === currentClient.id && d.is_client_released);
  const clientRequests = requests.filter(r => r.client_id === currentClient.id);
  const clientEvals = evaluations.filter(e => e.client_id === currentClient.id);

  const [selectedOS, setSelectedOS] = useState(clientOS[0] || null);

  // Modals state
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showDocPreviewModal, setShowDocPreviewModal] = useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState<DocumentType | null>(null);
  const [selectedRequestToResolve, setSelectedRequestToResolve] = useState<RequestItem | null>(null);

  // Acceptance & Feedback Form states
  const [acceptorName, setAcceptorName] = useState('Dr. Marcelo Silva');
  const [acceptorRole, setAcceptorRole] = useState('Diretor Administrativo / RH');
  const [acceptorCpf, setAcceptorCpf] = useState('123.456.789-00');
  const [reworkComment, setReworkComment] = useState('Solicitamos revisar a descrição do setor de usinagem e os EPIs recomendados para ruído intermitente.');

  // NPS Form states
  const [evalOSId, setEvalOSId] = useState<string>(selectedOS?.id || clientOS[0]?.id || '');
  const [npsScore, setNpsScore] = useState(10);
  const [techScore, setTechScore] = useState(5);
  const [puncScore, setPuncScore] = useState(5);
  const [servScore, setServScore] = useState(5);
  const [clarScore, setClarScore] = useState(5);
  const [evalComment, setEvalComment] = useState('Excelente consultoria técnica! Entrega pontual e laudo completo para o eSocial.');

  // New Request Form states (Client creating a request)
  const [reqTitle, setReqTitle] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [reqType, setReqType] = useState<RequestItem['type']>('INFORMATION');
  const [reqPriority, setReqPriority] = useState<RequestItem['priority']>('MEDIUM');

  // Resolve Request Form states (Client answering a pending request)
  const [resolveNotes, setResolveNotes] = useState('');
  const [attachedFileName, setAttachedFileName] = useState('');

  // Search & Filter in Docs
  const [docSearch, setDocSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');

  // Sync selectedOS when client changes
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const osList = serviceOrders.filter(o => o.client_id === clientId);
    setSelectedOS(osList[0] || null);
  };

  // Action Handlers
  const handleConfirmAccept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOS) return;

    clientAcceptService(selectedOS.id, `Aceite formal emitido por ${acceptorName} (CPF ${acceptorCpf} - ${acceptorRole}).`);
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    setShowAcceptModal(false);
    setEvalOSId(selectedOS.id);
    setShowFeedbackModal(true); // Propose NPS right after
  };

  const handleConfirmRework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOS) return;

    clientRequestRework(selectedOS.id, reworkComment);
    setShowReworkModal(false);
    alert('Sua solicitação de ajuste foi enviada para a equipe de engenharia da PrevSafe. Uma tarefa de revisão técnica foi aberta.');
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    const osTarget = serviceOrders.find(o => o.id === evalOSId) || selectedOS;

    submitEvaluation({
      client_id: currentClient.id,
      service_order_id: osTarget ? osTarget.id : (clientOS[0]?.id || 'os-001'),
      service_title: osTarget ? osTarget.service_name : 'Consultoria Técnica SST',
      overall_score: Math.round((techScore + puncScore + servScore + clarScore) / 4),
      quality_score: techScore,
      deadline_score: puncScore,
      service_score: servScore,
      communication_score: clarScore,
      nps_score: npsScore,
      comment: evalComment
    });

    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    setShowFeedbackModal(false);
    alert('Muito obrigado por sua avaliação! Sua opinião ajuda a manter a excelência técnica da PrevSafe.');
  };

  const handleCreateNewRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim()) return;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);

    createRequest({
      client_id: currentClient.id,
      service_order_id: selectedOS?.id,
      title: reqTitle,
      description: reqDescription,
      type: reqType,
      priority: reqPriority,
      due_date: dueDate.toISOString().split('T')[0]
    });

    setReqTitle('');
    setReqDescription('');
    setShowNewRequestModal(false);
    alert('Sua solicitação foi registrada no suporte PrevSafe com número de protocolo oficial!');
  };

  const handleResolvePendingRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequestToResolve) return;

    const note = attachedFileName 
      ? `Arquivo enviado: "${attachedFileName}". Notas: ${resolveNotes || 'Arquivo anexado conforme solicitado.'}`
      : (resolveNotes || 'Pendência respondida pelo cliente.');

    resolveRequest(selectedRequestToResolve.id, note);
    setShowResolveModal(false);
    setSelectedRequestToResolve(null);
    setResolveNotes('');
    setAttachedFileName('');
    alert('Pendência marcada como resolvida com sucesso!');
  };

  // Filtered documents
  const filteredDocs = clientDocs.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(docSearch.toLowerCase()) || 
                          d.doc_number.toLowerCase().includes(docSearch.toLowerCase());
    const matchesType = docTypeFilter === 'ALL' || d.document_type === docTypeFilter;
    return matchesSearch && matchesType;
  });

  const openRequestsCount = clientRequests.filter(r => r.status === 'OPEN').length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bento Card with Client Selector */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-3xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>Portal do Cliente SST • Área Segura de Autoatendimento</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{currentClient.trade_name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Grau de Risco {currentClient.risk_degree}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {currentClient.employee_count} Colaboradores
            </span>
          </div>
          <p className="text-xs text-slate-400">
            CNPJ: <span className="font-mono text-slate-300">{currentClient.document_number}</span> • {currentClient.address} • {currentClient.city}/{currentClient.state}
          </p>
        </div>

        {/* Client Switcher Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Empresa Autenticada:</span>
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="bg-slate-900 text-white text-xs font-bold rounded-xl border border-slate-800 px-3 py-1.5 focus:outline-none focus:border-indigo-500 mt-1 cursor-pointer"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.trade_name} ({c.document_number})
                </option>
              ))}
            </select>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden sm:block" />
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <span className="text-[11px] text-slate-300 leading-tight">eSocial S-2240<br/><span className="text-emerald-400 font-normal">Sincronizado</span></span>
          </div>
        </div>
      </div>

      {/* Metric Quick Stats Bento Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setActiveTab('OS')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === 'OS' ? 'bg-indigo-950/40 border-indigo-500/40' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Ordens de Serviço</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{clientOS.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {clientOS.filter(o => o.status === 'WAITING_ACCEPTANCE').length} aguardando aceite
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('DOCS')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === 'DOCS' ? 'bg-indigo-950/40 border-indigo-500/40' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Laudos Liberados</span>
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{clientDocs.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Com assinatura & ART</div>
        </div>

        <div 
          onClick={() => setActiveTab('REQUESTS')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === 'REQUESTS' ? 'bg-indigo-950/40 border-indigo-500/40' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Pendências Abertas</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{openRequestsCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {openRequestsCount > 0 ? 'Ação necessária' : 'Tudo em dia'}
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('EVALUATIONS')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === 'EVALUATIONS' ? 'bg-indigo-950/40 border-indigo-500/40' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>NPS & Avaliações</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {clientEvals.length > 0 ? (clientEvals.reduce((acc, curr) => acc + curr.nps_score, 0) / clientEvals.length).toFixed(1) : '10.0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{clientEvals.length} avaliação(ões)</div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex overflow-x-auto bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('OS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'OS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Ordens de Serviço ({clientOS.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DOCS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'DOCS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Laudos & Documentos ({clientDocs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('REQUESTS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'REQUESTS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Pendências & Chamados ({clientRequests.length})</span>
          {openRequestsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full">
              {openRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('CONTRACTS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'CONTRACTS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Contratos & Vigência ({clientContracts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EVALUATIONS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'EVALUATIONS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Pesquisa de Satisfação & NPS ({clientEvals.length})</span>
        </button>
      </div>

      {/* ==================== TAB 1: ORDENS DE SERVIÇO & ACEITE ==================== */}
      {activeTab === 'OS' && (
        <div className="space-y-6">
          {/* OS Selector Pills if multiple */}
          {clientOS.length > 1 && (
            <div className="flex flex-wrap gap-2 items-center bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold mr-1">Selecione o Laudo / Serviço:</span>
              {clientOS.map(os => (
                <button
                  key={os.id}
                  onClick={() => setSelectedOS(os)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 border ${
                    selectedOS?.id === os.id
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="font-mono">{os.os_number}</span>
                  <span>- {os.service_name}</span>
                  {os.status === 'WAITING_ACCEPTANCE' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedOS ? (
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-slate-950 text-indigo-300 border border-slate-800 px-2.5 py-0.5 rounded-full">
                      {selectedOS.os_number}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      selectedOS.status === 'ACCEPTED' || selectedOS.status === 'COMPLETED' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      selectedOS.status === 'WAITING_ACCEPTANCE' || selectedOS.status === 'DELIVERED' 
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/20 animate-pulse' :
                      selectedOS.status === 'REWORK'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {selectedOS.status === 'WAITING_ACCEPTANCE' || selectedOS.status === 'DELIVERED' 
                        ? 'AGUARDANDO SEU ACEITE FORMAL' 
                        : selectedOS.status === 'ACCEPTED' || selectedOS.status === 'COMPLETED'
                        ? 'CONCLUÍDO E APROVADO'
                        : selectedOS.status === 'REWORK'
                        ? 'EM AJUSTE / REWORK'
                        : 'EM ANDAMENTO'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-2">{selectedOS.service_name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Responsável Técnico: <strong className="text-slate-300">{selectedOS.technical_responsible_name}</strong> • Prazo Previsto: <span className="font-mono text-slate-300">{formatDate(selectedOS.due_date)}</span>
                  </p>
                </div>

                {/* Client Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {(selectedOS.status === 'WAITING_ACCEPTANCE' || selectedOS.status === 'DELIVERED') && (
                    <>
                      <button
                        onClick={() => setShowReworkModal(true)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-2xl transition flex items-center space-x-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                        <span>Solicitar Ajuste Técnico</span>
                      </button>
                      <button
                        onClick={() => setShowAcceptModal(true)}
                        className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-950/40 transition flex items-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Dar Aceite Formal no Laudo</span>
                      </button>
                    </>
                  )}

                  {(selectedOS.status === 'ACCEPTED' || selectedOS.status === 'COMPLETED') && (
                    <button
                      onClick={() => {
                        setEvalOSId(selectedOS.id);
                        setShowFeedbackModal(true);
                      }}
                      className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-2xl transition flex items-center space-x-1.5"
                    >
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>Avaliar Atendimento</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Andamento da Elaboração Técnica</span>
                  <span className="font-mono text-emerald-400">{selectedOS.progress}% Concluído</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${selectedOS.progress}%` }} 
                  />
                </div>
              </div>

              {/* Stages List in Bento Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cronograma de Etapas do Laudo</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {selectedOS.stages.map((stage, idx) => (
                    <div key={stage.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500">Etapa 0{idx + 1}</span>
                        {stage.status === 'COMPLETED' ? (
                          <span className="flex items-center space-x-1 text-emerald-400 text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Concluída</span>
                          </span>
                        ) : stage.status === 'IN_PROGRESS' ? (
                          <span className="flex items-center space-x-1 text-blue-400 text-[11px] font-bold">
                            <Clock className="w-3.5 h-3.5 animate-spin" />
                            <span>Em Execução</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Pendente</span>
                        )}
                      </div>
                      <h4 className="font-bold text-white text-xs">{stage.name}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{stage.description}</p>
                      
                      {stage.tasks && stage.tasks.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
                          {stage.tasks.filter(t => t.status === 'COMPLETED').length} de {stage.tasks.length} entregáveis concluídos
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-semibold text-white">Nenhuma Ordem de Serviço cadastrada para esta empresa</p>
              <p className="text-xs mt-1">Quando a PrevSafe iniciar um serviço, ele aparecerá aqui com acompanhamento em tempo real.</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: LAUDOS & DOCUMENTOS ==================== */}
      {activeTab === 'DOCS' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Laudos Técnicos e Documentos Emitidos</h2>
                <p className="text-xs text-slate-400 mt-0.5">Arquivos oficiais com ART assinada e prontos para fiscalizações e eSocial.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar laudo ou documento..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <select
                  value={docTypeFilter}
                  onChange={(e) => setDocTypeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Todos os Tipos</option>
                  <option value="PGR">PGR</option>
                  <option value="PCMSO">PCMSO</option>
                  <option value="LTCAT">LTCAT</option>
                  <option value="AET">AET</option>
                  <option value="RELATÓRIO">Relatórios de Campo</option>
                  <option value="CERTIFICADO">Certificados</option>
                </select>
              </div>
            </div>

            {filteredDocs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col justify-between text-xs hover:border-slate-700 transition gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex-shrink-0 mt-0.5">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] font-bold text-indigo-300 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                              {doc.doc_number}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {doc.document_type}
                            </span>
                          </div>
                          <div className="font-bold text-white text-xs mt-1.5">{doc.name}</div>
                          <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                            Versão {doc.current_version}.0 • Liberado para download
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                      <span className="text-[11px] text-slate-500">
                        {formatDate(doc.created_at)} • {doc.uploaded_by_name}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedDocPreview(doc);
                            setShowDocPreviewModal(true);
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl font-semibold transition flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Detalhes</span>
                        </button>
                        <button
                          onClick={() => alert(`Baixando cópia oficial do laudo ${doc.name} com certificado digital e ART vinculada.`)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition flex items-center space-x-1 shadow-md shadow-emerald-950/30"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                Nenhum documento encontrado com os filtros selecionados.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: PENDÊNCIAS & CHAMADOS (CRUD) ==================== */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Central de Pendências & Solicitações</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Envie documentos solicitados pela engenharia ou abra novos chamados para nossa equipe.
                </p>
              </div>

              <button
                onClick={() => setShowNewRequestModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl shadow-lg transition flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Abrir Novo Chamado</span>
              </button>
            </div>

            {clientRequests.length > 0 ? (
              <div className="space-y-3">
                {clientRequests.map((req) => (
                  <div 
                    key={req.id} 
                    className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs ${
                      req.status === 'OPEN' 
                        ? 'bg-amber-500/5 border-amber-500/30' 
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                          {req.req_number}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          req.status === 'OPEN'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {req.status === 'OPEN' ? 'PENDENTE / ABERTO' : 'RESOLVIDO'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          {req.type}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-xs">{req.title}</h4>
                      <p className="text-slate-300 text-xs">{req.description}</p>
                      
                      {req.resolution_notes && (
                        <div className="mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-[11px]">
                          <strong>Resolução:</strong> {req.resolution_notes}
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500 pt-1">
                        Prazo Limite: <span className="font-mono text-slate-400">{formatDate(req.due_date)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end md:self-center flex-shrink-0">
                      {req.status === 'OPEN' && (
                        <button
                          onClick={() => {
                            setSelectedRequestToResolve(req);
                            setShowResolveModal(true);
                          }}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition flex items-center space-x-1 shadow-md"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar / Resolver</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Deseja remover a solicitação ${req.req_number}?`)) {
                            deleteRequest(req.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition"
                        title="Excluir Chamado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                Nenhuma pendência ou chamado aberto no momento.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 4: CONTRATOS & VIGÊNCIA ==================== */}
      {activeTab === 'CONTRACTS' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
            <div>
              <h2 className="text-base font-bold text-white">Contratos de Prestação de Serviços SST</h2>
              <p className="text-xs text-slate-400 mt-0.5">Gestão de vigência, cobertura de programas e termos de responsabilidade técnica.</p>
            </div>

            {clientContracts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clientContracts.map((contract) => (
                  <div key={contract.id} className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4 text-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-indigo-300 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                            {contract.contract_number}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            VIGENTE
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-sm mt-2">{contract.title}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold font-mono text-sm block">
                          {formatCurrency(contract.total_value)}
                        </span>
                        <span className="text-[10px] text-slate-500">{contract.recurrence || 'MENSAL'}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5 text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vigência:</span>
                        <span className="font-mono text-white">{formatDate(contract.start_date)} até {formatDate(contract.end_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Assinatura Digital:</span>
                        <span className="text-emerald-400 font-semibold">
                          {contract.signatures && contract.signatures.length > 0 
                            ? `Assinado por ${contract.signatures[0].signer_name}` 
                            : 'Assinado ICP-Brasil'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => alert(`Baixando cópia do contrato ${contract.contract_number} em PDF.`)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition flex items-center justify-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Cópia do Contrato (PDF)</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                Nenhum contrato ativo cadastrado para este cliente.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 5: AVALIAÇÕES & NPS (CRUD) ==================== */}
      {activeTab === 'EVALUATIONS' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Pesquisas de Satisfação & Histórico de NPS</h2>
                <p className="text-xs text-slate-400 mt-0.5">Sua avaliação direta sobre a qualidade do atendimento e elaboração técnica da PrevSafe.</p>
              </div>

              <button
                onClick={() => {
                  setEvalOSId(clientOS[0]?.id || 'os-001');
                  setShowFeedbackModal(true);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-2xl shadow-lg transition flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <Star className="w-4 h-4 fill-slate-950" />
                <span>+ Enviar Nova Avaliação</span>
              </button>
            </div>

            {clientEvals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clientEvals.map((ev) => (
                  <div key={ev.id} className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3.5 text-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-xs">{ev.service_title}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">{formatDate(ev.created_at)}</span>
                      </div>
                      <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-black text-sm rounded-xl">
                        NPS {ev.nps_score}/10
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div><span className="text-slate-400">Qualidade:</span> <strong className="text-white">{ev.quality_score}/5</strong></div>
                      <div><span className="text-slate-400">Pontualidade:</span> <strong className="text-white">{ev.deadline_score}/5</strong></div>
                      <div><span className="text-slate-400">Atendimento:</span> <strong className="text-white">{ev.service_score}/5</strong></div>
                      <div><span className="text-slate-400">Comunicação:</span> <strong className="text-white">{ev.communication_score}/5</strong></div>
                    </div>

                    {ev.comment && (
                      <p className="text-xs text-slate-300 italic bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
                        &ldquo;{ev.comment}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                Nenhuma avaliação registrada ainda. Clique em &ldquo;+ Enviar Nova Avaliação&rdquo; para avaliar o serviço da PrevSafe.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL: TERMO DE ACEITE TÉCNICO FORMAL (RN008) ==================== */}
      {showAcceptModal && selectedOS && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Termo de Aceite Técnico Formal</h3>
              </div>
              <button onClick={() => setShowAcceptModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleConfirmAccept} className="space-y-3.5 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Ao confirmar o aceite, sua empresa atesta o recebimento integral do documento <strong className="text-white">{selectedOS.service_name}</strong>, validando as informações técnicas e liberando a conclusão formal do serviço.
              </p>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nome do Responsável pelo Aceite *</label>
                <input
                  type="text"
                  required
                  value={acceptorName}
                  onChange={(e) => setAcceptorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">CPF do Responsável *</label>
                <input
                  type="text"
                  required
                  value={acceptorCpf}
                  onChange={(e) => setAcceptorCpf(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Cargo / Função *</label>
                <input
                  type="text"
                  required
                  value={acceptorRole}
                  onChange={(e) => setAcceptorRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-[11px] text-emerald-300 space-y-1">
                <div>• Carimbo digital de data/hora registrado nos Audit Logs</div>
                <div>• Conclusão automática da Ordem de Serviço (RN008)</div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar e Assinar Aceite</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: SOLICITAR AJUSTE / REWORK (RN009) ==================== */}
      {showReworkModal && selectedOS && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">Solicitar Revisão / Ajuste Técnico</h3>
              <button onClick={() => setShowReworkModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleConfirmRework} className="space-y-3.5 text-xs">
              <p className="text-slate-300">
                Por favor, especifique detalhadamente quais pontos ou dados técnicos necessitam de revisão pela nossa equipe:
              </p>
              <textarea
                rows={3}
                required
                value={reworkComment}
                onChange={(e) => setReworkComment(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReworkModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-md"
                >
                  Enviar para Engenharia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: PESQUISA DE SATISFAÇÃO & NPS (RN010) ==================== */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h3 className="text-base font-bold text-white">Pesquisa de Satisfação & NPS</h3>
              </div>
              <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSendFeedback} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Serviço Avaliado:</label>
                <select
                  value={evalOSId}
                  onChange={(e) => setEvalOSId(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {clientOS.map(os => (
                    <option key={os.id} value={os.id}>{os.os_number} - {os.service_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-white mb-2">
                  Em uma escala de 0 a 10, quanto você recomendaria a PrevSafe para outra empresa? (NPS)
                </label>
                <div className="flex justify-between gap-1 mt-2">
                  {[0,1,2,3,4,5,6,7,8,9,10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNpsScore(num)}
                      className={`w-8 h-8 rounded-xl font-mono font-bold text-xs transition ${
                        npsScore === num 
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-md' 
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-300">Qualidade Técnica dos Laudos:</span>
                  <select value={techScore} onChange={(e) => setTechScore(Number(e.target.value))} className="p-1.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white">
                    <option value={5}>5 - Excelente</option>
                    <option value={4}>4 - Bom</option>
                    <option value={3}>3 - Regular</option>
                    <option value={2}>2 - Ruim</option>
                  </select>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-300">Pontualidade no Prazo de Entrega:</span>
                  <select value={puncScore} onChange={(e) => setPuncScore(Number(e.target.value))} className="p-1.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white">
                    <option value={5}>5 - No prazo acordado</option>
                    <option value={4}>4 - Pequeno atraso justificado</option>
                    <option value={2}>2 - Atraso</option>
                  </select>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-300">Atendimento da Equipe Técnica:</span>
                  <select value={servScore} onChange={(e) => setServScore(Number(e.target.value))} className="p-1.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white">
                    <option value={5}>5 - Muito prestativo e cordial</option>
                    <option value={4}>4 - Bom atendimento</option>
                  </select>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-300">Clareza na Comunicação:</span>
                  <select value={clarScore} onChange={(e) => setClarScore(Number(e.target.value))} className="p-1.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white">
                    <option value={5}>5 - Muito clara</option>
                    <option value={4}>4 - Adequada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Comentários ou Sugestões:</label>
                <textarea
                  rows={2}
                  value={evalComment}
                  onChange={(e) => setEvalComment(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md"
                >
                  Enviar Avaliação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ABRIR NOVO CHAMADO PELO CLIENTE ==================== */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">Abrir Nova Solicitação / Dúvida</h3>
              <button onClick={() => setShowNewRequestModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleCreateNewRequest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Tipo de Solicitação *</label>
                <select
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value as RequestItem['type'])}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="INFORMATION">Dúvida Técnica sobre Normas / EPIs</option>
                  <option value="DOCUMENT">Envio Voluntário de Arquivo / Lista</option>
                  <option value="SCHEDULING">Agendamento de Vistoria / Treinamento</option>
                  <option value="CORRECTION">Solicitação de Correção / Retificação</option>
                  <option value="OTHER">Outros Assuntos / Cadastro</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Título da Solicitação *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dúvida sobre enquadramento NR-15 ruído"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Descrição Detalhada *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explique detalhadamente o que você precisa..."
                  value={reqDescription}
                  onChange={(e) => setReqDescription(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Prioridade</label>
                <select
                  value={reqPriority}
                  onChange={(e) => setReqPriority(e.target.value as RequestItem['priority'])}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                >
                  Registrar Chamado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: RESOLVER PENDÊNCIA / ENVIAR ARQUIVO ==================== */}
      {showResolveModal && selectedRequestToResolve && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">Responder Pendência Técnica</h3>
              <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleResolvePendingRequest} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-mono text-indigo-400 font-bold">{selectedRequestToResolve.req_number}</span>
                <h4 className="font-bold text-white mt-1">{selectedRequestToResolve.title}</h4>
                <p className="text-slate-400 text-xs mt-1">{selectedRequestToResolve.description}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Anexar Arquivo / Comprovante (Simulação)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Nome do arquivo (ex: lista_colaboradores_2026.xlsx)"
                    value={attachedFileName}
                    onChange={(e) => setAttachedFileName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setAttachedFileName('ficha_epi_assinada_setor_usinagem.pdf')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-[11px]"
                  >
                    Exemplo
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Notas / Observações para a Engenharia</label>
                <textarea
                  rows={3}
                  placeholder="Informações adicionais para a PrevSafe..."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md"
                >
                  Enviar e Concluir Pendência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: PRÉVIA DETALHADA DO LAUDO ==================== */}
      {showDocPreviewModal && selectedDocPreview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Ficha Técnica do Documento</h3>
              </div>
              <button onClick={() => setShowDocPreviewModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs font-bold text-indigo-300">{selectedDocPreview.doc_number}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {selectedDocPreview.status}
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm">{selectedDocPreview.name}</h4>
                <p className="text-slate-400 text-xs">
                  Tipo: <strong>{selectedDocPreview.document_type}</strong> • Versão Oficial: <strong>{selectedDocPreview.current_version}.0</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Emitido Por</span>
                  <strong className="text-white">{selectedDocPreview.uploaded_by_name}</strong>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Data de Emissão</span>
                  <strong className="text-white font-mono">{formatDate(selectedDocPreview.created_at)}</strong>
                </div>
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-[11px] space-y-1">
                <div>✓ Anotação de Responsabilidade Técnica (ART/CREA) assinada digitalmente.</div>
                <div>✓ Conformidade com a Portaria MTP nº 672/2021 e layout S-2240 eSocial.</div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDocPreviewModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert(`Iniciando download do laudo oficial ${selectedDocPreview.name}...`);
                    setShowDocPreviewModal(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Arquivo PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
