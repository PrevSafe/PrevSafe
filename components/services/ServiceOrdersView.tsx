'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { ServiceOrder, ServiceStage, PriorityLevel } from '@/types';
import { formatDate } from '@/lib/utils';
import { 
  Briefcase, 
  Clock, 
  PauseCircle, 
  PlayCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  FileText, 
  Calendar, 
  User, 
  CheckSquare, 
  FolderKanban, 
  History, 
  AlertOctagon, 
  Star, 
  Share2, 
  HardHat, 
  ChevronRight, 
  RotateCcw,
  Sparkles,
  Plus,
  Lock,
  Search,
  Filter,
  Edit2,
  Trash2,
  Check,
  X,
  Building2,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ServiceOrdersView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    serviceOrders, 
    clients, 
    contracts, 
    requests, 
    documents,
    serviceTemplates,
    createServiceOrderManual,
    updateServiceOrder,
    deleteServiceOrder,
    addTaskToStage,
    deleteTaskFromStage,
    completeStage, 
    updateTaskStatus, 
    toggleSlaPause, 
    deliverServiceOrder, 
    clientAcceptService, 
    clientRequestRework, 
    createRequest
  } = usePrevSafe();

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');

  // Active OS and Tab
  const [selectedOSId, setSelectedOSId] = useState<string>(serviceOrders[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'STAGES' | 'TASKS' | 'REQUESTS' | 'DOCS' | 'HISTORY'>('STAGES');

  // Modals
  const [showNewOSModal, setShowNewOSModal] = useState(false);
  const [showEditOSModal, setShowEditOSModal] = useState(false);
  const [showDeleteOSModal, setShowDeleteOSModal] = useState(false);
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [showSlaPauseModal, setShowSlaPauseModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);

  // Forms state (using state initializers to avoid impure render calls)
  const [osForm, setOsForm] = useState(() => ({
    client_id: clients[0]?.id || '',
    service_template_id: serviceTemplates[0]?.id || '',
    title: 'Elaboração do PGR 2026 e Inventário de Riscos',
    priority: 'HIGH' as PriorityLevel,
    due_date: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
    technical_responsible_name: 'Eng. Eduardo Vasconcelos',
    notes: ''
  }));

  const [editOsForm, setEditOsForm] = useState(() => ({
    title: '',
    priority: 'HIGH' as PriorityLevel,
    due_date: '',
    technical_responsible_name: '',
    manager_name: '',
    description: ''
  }));

  const [taskForm, setTaskForm] = useState({
    stage_id: '',
    name: 'Realizar medição quantitativa de ruído (dosimetria)',
    description: 'Conforme NHO-01 da Fundacentro com dosímetro calibrado',
    is_mandatory: true
  });

  const [slaReason, setSlaReason] = useState('Aguardando envio do quadro funcional e mapa de layout da contratante (RN006).');
  const [reworkReason, setReworkReason] = useState('Ajustar GHE de soldagem na tabela de ruído do PGR.');
  const [requestTitle, setRequestTitle] = useState('Envio de Lista Atualizada de Colaboradores e Funções');
  const [requestPriority, setRequestPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');

  // Filtered OS list
  const filteredServiceOrders = serviceOrders.filter(os => {
    const osClient = clients.find(c => c.id === os.client_id);
    const matchesSearch = 
      os.os_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (osClient?.trade_name.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (os.technical_responsible_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const isDelayed = os.status !== 'COMPLETED' && new Date(os.due_date) < new Date();

    const matchesStatus = 
      statusFilter === 'ALL' ||
      (statusFilter === 'OVERDUE' && isDelayed) ||
      (statusFilter === 'PAUSED' && os.sla_is_paused) ||
      os.status === statusFilter;

    const matchesPriority = priorityFilter === 'ALL' || os.priority === priorityFilter;
    const matchesClient = clientFilter === 'ALL' || os.client_id === clientFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesClient;
  });

  const selectedOS = serviceOrders.find(o => o.id === selectedOSId) || filteredServiceOrders[0] || serviceOrders[0];
  const selectedClient = selectedOS ? clients.find(c => c.id === selectedOS.client_id) : null;
  const selectedContract = selectedOS ? contracts.find(c => c.id === selectedOS.contract_id) : null;
  const osRequests = selectedOS ? requests.filter(r => r.service_order_id === selectedOS.id) : [];
  const osDocs = selectedOS ? documents.filter(d => d.service_order_id === selectedOS.id) : [];

  // Metrics summary
  const totalCount = serviceOrders.length;
  const inProgressCount = serviceOrders.filter(o => o.status === 'IN_PROGRESS').length;
  const waitingAcceptanceCount = serviceOrders.filter(o => o.status === 'WAITING_ACCEPTANCE').length;
  const completedCount = serviceOrders.filter(o => o.status === 'COMPLETED' || o.status === 'ACCEPTED').length;
  const pausedCount = serviceOrders.filter(o => o.sla_is_paused).length;

  // Handlers
  const handleOpenNewOS = () => {
    setOsForm({
      client_id: clients[0]?.id || '',
      service_template_id: serviceTemplates[0]?.id || '',
      title: 'Elaboração do PGR 2026 e Inventário de Riscos',
      priority: 'HIGH',
      due_date: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
      technical_responsible_name: 'Eng. Eduardo Vasconcelos',
      notes: ''
    });
    setShowNewOSModal(true);
  };

  const handleCreateOSSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!osForm.client_id || !osForm.title) {
      alert('Por favor, selecione um cliente e informe o título da OS.');
      return;
    }

    const created = createServiceOrderManual({
      client_id: osForm.client_id,
      service_template_id: osForm.service_template_id,
      title: osForm.title,
      priority: osForm.priority,
      due_date: new Date(osForm.due_date).toISOString().split('T')[0],
      technical_responsible_name: osForm.technical_responsible_name
    });

    setSelectedOSId(created.id);
    setShowNewOSModal(false);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

  const handleOpenEditOS = () => {
    if (!selectedOS) return;
    setEditOsForm({
      title: selectedOS.title,
      priority: selectedOS.priority,
      due_date: selectedOS.due_date.split('T')[0],
      technical_responsible_name: selectedOS.technical_responsible_name || 'Eng. Eduardo Vasconcelos',
      manager_name: selectedOS.manager_name || 'Mariana Siqueira',
      description: selectedOS.description || ''
    });
    setShowEditOSModal(true);
  };

  const handleEditOSSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOS) return;

    updateServiceOrder(selectedOS.id, {
      title: editOsForm.title,
      priority: editOsForm.priority,
      due_date: editOsForm.due_date,
      technical_responsible_name: editOsForm.technical_responsible_name,
      manager_name: editOsForm.manager_name,
      description: editOsForm.description
    });

    setShowEditOSModal(false);
  };

  const handleDeleteOSConfirm = () => {
    if (!selectedOS) return;
    deleteServiceOrder(selectedOS.id);
    setShowDeleteOSModal(false);
    const remaining = serviceOrders.filter(o => o.id !== selectedOS.id);
    if (remaining.length > 0) {
      setSelectedOSId(remaining[0].id);
    }
  };

  const handleOpenAddTask = (stageId?: string) => {
    if (!selectedOS) return;
    const targetStage = stageId || selectedOS.stages[0]?.id || '';
    setTaskForm({
      stage_id: targetStage,
      name: 'Realizar medição quantitativa de ruído (dosimetria)',
      description: 'Conforme NHO-01 da Fundacentro com dosímetro calibrado',
      is_mandatory: true
    });
    setShowNewTaskModal(true);
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOS || !taskForm.stage_id || !taskForm.name) return;

    addTaskToStage(selectedOS.id, taskForm.stage_id, taskForm.name, taskForm.description);
    setShowNewTaskModal(false);
  };

  const handleToggleSla = () => {
    if (!selectedOS) return;
    if (selectedOS.sla_is_paused) {
      toggleSlaPause(selectedOS.id);
    } else {
      setShowSlaPauseModal(true);
    }
  };

  const handleConfirmSlaPause = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOS) return;
    toggleSlaPause(selectedOS.id, slaReason);
    setShowSlaPauseModal(false);
  };

  const handleDeliver = () => {
    if (!selectedOS) return;
    const res = deliverServiceOrder(selectedOS.id);
    if (res.success) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      alert(`📦 Ordem de Serviço ${selectedOS.os_number} entregue ao cliente!\nStatus atualizado para "WAITING_ACCEPTANCE". O cliente foi notificado para aceite formal.`);
    } else if (res.error) {
      alert(`Atenção: ${res.error}`);
    }
  };

  const handleAccept = () => {
    if (!selectedOS) return;
    clientAcceptService(selectedOS.id, 'Aceite formal emitido pelo cliente.');
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
    alert(`🎉 Aceite formal registrado com sucesso!\nOS ${selectedOS.os_number} CONCLUÍDA. Ciclo de qualidade e faturamento liberados.`);
  };

  const handleRework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOS) return;
    clientRequestRework(selectedOS.id, reworkReason);
    setShowReworkModal(false);
    alert(`⚠️ Retrabalho registrado na OS ${selectedOS.os_number}. Etapa de revisão técnica reaberta para ajustes.`);
  };

  const handleCreateNewRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOS) return;
    createRequest({
      client_id: selectedOS.client_id,
      service_order_id: selectedOS.id,
      stage_id: selectedOS.stages[0]?.id,
      title: requestTitle,
      type: 'DOCUMENT',
      description: 'Documento mandatório para prosseguimento do laudo técnico.',
      due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      priority: requestPriority
    });
    setShowNewRequestModal(false);
  };

  return (
    <div id="service-orders-view-container" className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div id="os-header-card" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Gestão Operacional de Ordens de Serviço (OS)</h1>
            <p className="text-xs text-slate-400 mt-0.5">Execução técnica, controle de etapas sequenciais, SLA pausável e entregas com aceite formal.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            id="btn-nav-field-pwa"
            onClick={() => onNavigate('technician-field')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-semibold shadow-sm transition flex items-center space-x-1.5"
          >
            <HardHat className="w-4 h-4 text-amber-400" />
            <span>App de Campo PWA</span>
          </button>
          
          <button 
            id="btn-new-service-order"
            onClick={handleOpenNewOS}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Ordem de Serviço</span>
          </button>
        </div>
      </div>

      {/* KPI Counters Bar */}
      <div id="os-kpi-bar" className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de OS</div>
          <div className="text-xl font-bold text-white mt-1">{totalCount}</div>
        </div>
        <div className="p-3.5 bg-slate-900/90 border border-indigo-500/20 rounded-2xl">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Em Execução</div>
          <div className="text-xl font-bold text-indigo-300 mt-1">{inProgressCount}</div>
        </div>
        <div className="p-3.5 bg-slate-900/90 border border-purple-500/20 rounded-2xl">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Aguardando Aceite</div>
          <div className="text-xl font-bold text-purple-300 mt-1">{waitingAcceptanceCount}</div>
        </div>
        <div className="p-3.5 bg-slate-900/90 border border-amber-500/20 rounded-2xl">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">SLA Pausado</div>
          <div className="text-xl font-bold text-amber-300 mt-1">{pausedCount}</div>
        </div>
        <div className="p-3.5 bg-slate-900/90 border border-emerald-500/20 rounded-2xl">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Concluídas</div>
          <div className="text-xl font-bold text-emerald-300 mt-1">{completedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div id="os-filter-bar" className="p-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-os"
            type="text"
            placeholder="Buscar por OS, cliente, laudo ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            id="select-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Status: Todos</option>
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="WAITING_ACCEPTANCE">Aguardando Aceite</option>
            <option value="COMPLETED">Concluídas</option>
            <option value="REWORK">Em Retrabalho</option>
            <option value="PAUSED">SLA Pausado</option>
            <option value="OVERDUE">Atrasadas</option>
          </select>

          <select
            id="select-priority-filter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Prioridade: Todas</option>
            <option value="URGENT">Urgente</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Média</option>
            <option value="LOW">Baixa</option>
          </select>

          <select
            id="select-client-filter"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Cliente: Todos</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.trade_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: OS Selector & OS Detail Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: OS List */}
        <div id="os-list-column" className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400 tracking-wider px-1">
            <span>Ordens ({filteredServiceOrders.length})</span>
            {filteredServiceOrders.length !== serviceOrders.length && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setPriorityFilter('ALL');
                  setClientFilter('ALL');
                }}
                className="text-[10px] text-indigo-400 hover:underline lowercase font-normal"
              >
                limpar filtros
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
            {filteredServiceOrders.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800 text-xs text-slate-400">
                Nenhuma Ordem de Serviço encontrada com os filtros selecionados.
              </div>
            ) : (
              filteredServiceOrders.map((os) => {
                const osClient = clients.find(c => c.id === os.client_id);
                const isSelected = selectedOS?.id === os.id;
                const isDelayed = os.status !== 'COMPLETED' && new Date(os.due_date) < new Date();

                return (
                  <div
                    key={os.id}
                    id={`os-card-${os.id}`}
                    onClick={() => setSelectedOSId(os.id)}
                    className={`p-4 rounded-3xl border cursor-pointer transition flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40' 
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-indigo-300">{os.os_number}</span>
                            {os.sla_is_paused && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center">
                                <PauseCircle className="w-3 h-3 mr-0.5" /> SLA Pausado
                              </span>
                            )}
                            {isDelayed && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center">
                                Atrasada
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-100 mt-2">{osClient?.trade_name}</div>
                          <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{os.title || os.service_name}</div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          os.status === 'ACCEPTED' || os.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          os.status === 'WAITING_ACCEPTANCE' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          os.status === 'IN_PROGRESS' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                          os.status === 'REWORK' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {os.status}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Progresso ({os.stages.filter(s => s.status === 'COMPLETED').length}/{os.stages.length} etapas)</span>
                        <span className="font-bold font-mono text-slate-200">{os.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            os.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`} 
                          style={{ width: `${os.progress}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected OS Workspace */}
        {selectedOS ? (
          <div id="os-workspace-card" className="lg:col-span-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between">
            {/* Top OS Summary Bar & Actions */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-bold text-indigo-300">{selectedOS.os_number}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-300 font-medium">{selectedClient?.trade_name} (CNPJ {selectedClient?.document_number})</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">{selectedOS.title || selectedOS.service_name}</h2>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                    <span>Responsável: <strong className="text-slate-200">{selectedOS.technical_responsible_name || 'Eng. Eduardo Vasconcelos'}</strong></span>
                    <span>•</span>
                    <span>Prazo: <strong className="font-mono text-slate-200">{formatDate(selectedOS.due_date)}</strong></span>
                    <span>•</span>
                    <span>Prioridade: <span className="font-bold text-indigo-300">{selectedOS.priority}</span></span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="btn-edit-os"
                    onClick={handleOpenEditOS}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
                    title="Editar Ordem de Serviço"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    id="btn-delete-os"
                    onClick={() => setShowDeleteOSModal(true)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold border border-rose-500/20 transition"
                    title="Excluir Ordem de Serviço"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    id="btn-toggle-sla"
                    onClick={handleToggleSla}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1 border ${
                      selectedOS.sla_is_paused 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                    title="RN006: Pausar/Retomar SLA"
                  >
                    {selectedOS.sla_is_paused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                    <span>{selectedOS.sla_is_paused ? 'Retomar SLA' : 'Pausar SLA'}</span>
                  </button>

                  {selectedOS.status === 'IN_PROGRESS' && (
                    <button
                      id="btn-deliver-os"
                      onClick={handleDeliver}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-950/40 transition flex items-center space-x-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Realizar Entrega Técnica (RN007)</span>
                    </button>
                  )}

                  {selectedOS.status === 'WAITING_ACCEPTANCE' && (
                    <div className="flex space-x-2">
                      <button
                        id="btn-request-rework"
                        onClick={() => setShowReworkModal(true)}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-xl border border-rose-500/30 transition flex items-center space-x-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Solicitar Ajuste / Retrabalho</span>
                      </button>
                      <button
                        id="btn-confirm-accept"
                        onClick={handleAccept}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition flex items-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmar Aceite Formal (RN008)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SLA Paused Notice */}
              {selectedOS.sla_is_paused && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-200 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>SLA Pausado (RN006):</strong> {selectedOS.sla_pause_reason || 'Aguardando retorno documental do cliente.'} (O tempo não está contando para o prazo da consultoria).
                  </span>
                </div>
              )}

              {/* Workspace Subtabs */}
              <div className="flex space-x-1 border-b border-slate-800 pt-2 -mb-6">
                {[
                  { id: 'STAGES', label: `Etapas (${selectedOS.stages.length})`, icon: Calendar },
                  { id: 'TASKS', label: 'Tarefas & Vistorias', icon: CheckSquare },
                  { id: 'REQUESTS', label: `Pendências (${osRequests.length})`, icon: AlertOctagon },
                  { id: 'DOCS', label: `Documentos (${osDocs.length})`, icon: FileText },
                  { id: 'HISTORY', label: 'Auditoria', icon: History },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`tab-os-${tab.id.toLowerCase()}`}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`pb-3 px-3 text-xs font-semibold transition border-b-2 flex items-center space-x-1.5 ${
                        isActive 
                          ? 'border-emerald-400 text-emerald-400 font-bold' 
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Body Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              {/* TAB 1: STAGES OF THE WORKFLOW */}
              {activeTab === 'STAGES' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Cronograma de Etapas Técnicas</h3>
                      <p className="text-xs text-slate-400">Fluxo sequencial com regras de dependência (RN004) e validação de pendências críticas (RN005).</p>
                    </div>
                    <button
                      id="btn-add-task-to-stage"
                      onClick={() => handleOpenAddTask()}
                      className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Tarefa</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedOS.stages.map((stage) => {
                      const isCompleted = stage.status === 'COMPLETED';
                      const isInProgress = stage.status === 'IN_PROGRESS';
                      const isWaitingClient = stage.status === 'WAITING_CLIENT';

                      return (
                        <div 
                          key={stage.id} 
                          id={`stage-card-${stage.id}`}
                          className={`p-4 rounded-2xl border transition ${
                            isInProgress ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm' :
                            isCompleted ? 'bg-emerald-500/5 border-emerald-500/20' :
                            isWaitingClient ? 'bg-amber-500/10 border-amber-500/30' :
                            'bg-slate-950/40 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-mono font-bold bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-indigo-300">
                                  Etapa {stage.order_index + 1}
                                </span>
                                <h4 className="text-xs font-bold text-slate-100">{stage.name}</h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  isCompleted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  isInProgress ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                  isWaitingClient ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {stage.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">{stage.description}</p>
                              <div className="text-[11px] text-slate-500 flex items-center space-x-3 pt-1">
                                <span>Responsável: <strong className="text-slate-300">{stage.assigned_name || selectedOS.technical_responsible_name}</strong></span>
                                <span>•</span>
                                <span>Tarefas: <strong className="text-slate-300">{stage.tasks.filter(t => t.status === 'COMPLETED').length}/{stage.tasks.length}</strong></span>
                              </div>
                            </div>

                            {/* Stage Status Actions */}
                            <div className="flex items-center space-x-2">
                              {!isCompleted && (
                                <button
                                  id={`btn-complete-stage-${stage.id}`}
                                  onClick={() => {
                                    const res = completeStage(selectedOS.id, stage.id);
                                    if (!res.success && res.error) {
                                      alert(res.error);
                                    } else {
                                      confetti({ particleCount: 30, spread: 45 });
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center space-x-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Concluir Etapa</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenAddTask(stage.id)}
                                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                                title="Adicionar tarefa nesta etapa"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Embedded Tasks for this stage */}
                          {stage.tasks.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Tarefas Técnicas da Etapa:</span>
                              {stage.tasks.map((task) => (
                                <div key={task.id} className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`chk-task-${task.id}`}
                                      checked={task.status === 'COMPLETED'}
                                      onChange={(e) => updateTaskStatus(selectedOS.id, stage.id, task.id, e.target.checked ? 'COMPLETED' : 'IN_PROGRESS')}
                                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                    />
                                    <label htmlFor={`chk-task-${task.id}`} className={task.status === 'COMPLETED' ? 'line-through text-slate-500 cursor-pointer' : 'font-medium text-slate-200 cursor-pointer'}>
                                      {task.name}
                                    </label>
                                    {task.is_mandatory && (
                                      <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded">Obrigatória</span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      Prazo: {formatDate(task.due_date)}
                                    </span>
                                    <button
                                      onClick={() => deleteTaskFromStage(selectedOS.id, stage.id, task.id)}
                                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                                      title="Excluir Tarefa"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: TASKS & FIELD CHECKLISTS */}
              {activeTab === 'TASKS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Tarefas Operacionais Consolidadas</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenAddTask()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nova Tarefa</span>
                      </button>
                      <button 
                        onClick={() => onNavigate('technician-field')}
                        className="text-xs text-indigo-400 font-semibold hover:underline"
                      >
                        Abrir no App de Campo PWA →
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {selectedOS.stages.flatMap(s => s.tasks.map(t => ({ ...t, stageName: s.name, stageId: s.id }))).map((task) => (
                      <div key={task.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={task.status === 'COMPLETED'}
                            onChange={(e) => updateTaskStatus(selectedOS.id, task.stageId, task.id, e.target.checked ? 'COMPLETED' : 'IN_PROGRESS')}
                            className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <div className={`font-bold ${task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-100'}`}>{task.name}</div>
                            <div className="text-[11px] text-slate-400">Etapa: {task.stageName} • Resp: {task.assigned_name || selectedOS.technical_responsible_name}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            task.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {task.status}
                          </span>
                          <button
                            onClick={() => deleteTaskFromStage(selectedOS.id, task.stageId, task.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: REQUESTS / CENTRAL DE PENDÊNCIAS */}
              {activeTab === 'REQUESTS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Pendências Documentais com o Cliente</h3>
                      <p className="text-xs text-slate-400">Solicitações de insumos, organogramas e listas necessárias para a elaboração do laudo.</p>
                    </div>
                    <button
                      id="btn-new-request-os"
                      onClick={() => setShowNewRequestModal(true)}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nova Pendência</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {osRequests.length === 0 ? (
                      <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-xs text-slate-500">
                        Nenhuma pendência em aberto para esta OS.
                      </div>
                    ) : (
                      osRequests.map((req) => (
                        <div key={req.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-xs text-slate-100">{req.title}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                req.priority === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                Prioridade {req.priority}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">{req.description}</p>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Prazo Cliente: {formatDate(req.due_date)}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => alert(`Mensagem de cobrança automática enviada ao WhatsApp do cliente para a pendência "${req.title}".`)}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition flex items-center space-x-1"
                            >
                              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Cobrar via WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: DOCUMENTS REPOSITORY */}
              {activeTab === 'DOCS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Laudos e Documentos Finais Emitidos</h3>
                      <p className="text-xs text-slate-400">Versionamento formal, relatórios técnicos e ARTs vinculadas.</p>
                    </div>
                    <button
                      onClick={() => onNavigate('documents')}
                      className="text-xs text-emerald-400 font-semibold hover:underline"
                    >
                      Ir para Repositório Completo →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {osDocs.length === 0 ? (
                      <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-xs text-slate-500">
                        Nenhum laudo ou documento técnico publicado ainda para esta OS.
                      </div>
                    ) : (
                      osDocs.map((doc) => (
                        <div key={doc.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-100 text-sm">{doc.name}</div>
                              <div className="text-slate-400">{doc.document_type} • Versão {doc.current_version}.0 • {doc.doc_number}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-1">Status: {doc.status} • {doc.is_client_released ? 'Liberado para o Cliente' : 'Interno'}</div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => alert(`Iniciando download do laudo "${doc.name}" com assinatura digital ICP-Brasil.`)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl transition"
                            >
                              Download PDF
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: HISTORY & AUDIT LOGS */}
              {activeTab === 'HISTORY' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white">Trilha de Auditoria da OS</h3>
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2.5 font-mono text-xs text-slate-400">
                    <div>• [{formatDate(selectedOS.created_at)}] Ordem de Serviço {selectedOS.os_number} aberta no sistema com {selectedOS.stages.length} etapas técnicas.</div>
                    {selectedOS.sla_is_paused && (
                      <div className="text-amber-400">• [{formatDate(selectedOS.updated_at)}] SLA Pausado: {selectedOS.sla_pause_reason}</div>
                    )}
                    {selectedOS.status === 'WAITING_ACCEPTANCE' && (
                      <div className="text-purple-400">• [{formatDate(selectedOS.updated_at)}] Entrega Técnica realizada. Aguardando validação do cliente.</div>
                    )}
                    {selectedOS.status === 'COMPLETED' && (
                      <div className="text-emerald-400">• [{formatDate(selectedOS.updated_at)}] Aceite formal emitido pelo cliente. OS Concluída com sucesso.</div>
                    )}
                    {selectedOS.status === 'REWORK' && (
                      <div className="text-rose-400">• [{formatDate(selectedOS.updated_at)}] Apontamento de retrabalho registrado. Etapa reaberta.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Modal: New Service Order (Create) */}
      {showNewOSModal && (
        <div id="modal-new-os" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Nova Ordem de Serviço (OS)</h3>
                  <p className="text-xs text-slate-400">Geração manual ou via catálogo de serviços</p>
                </div>
              </div>
              <button onClick={() => setShowNewOSModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateOSSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Cliente *</label>
                <select
                  required
                  value={osForm.client_id}
                  onChange={(e) => setOsForm({ ...osForm, client_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.trade_name} ({c.document_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Modelo / Template de Serviço *</label>
                <select
                  value={osForm.service_template_id}
                  onChange={(e) => {
                    const tmpl = serviceTemplates.find(t => t.id === e.target.value);
                    setOsForm({ 
                      ...osForm, 
                      service_template_id: e.target.value,
                      title: tmpl ? `Elaboração do ${tmpl.name} 2026` : osForm.title 
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {serviceTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category}) - {t.default_duration_days} dias</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Título da Ordem de Serviço *</label>
                <input
                  type="text"
                  required
                  value={osForm.title}
                  onChange={(e) => setOsForm({ ...osForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Prioridade</label>
                  <select
                    value={osForm.priority}
                    onChange={(e) => setOsForm({ ...osForm, priority: e.target.value as PriorityLevel })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Prazo de Entrega *</label>
                  <input
                    type="date"
                    required
                    value={osForm.due_date}
                    onChange={(e) => setOsForm({ ...osForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Responsável Técnico</label>
                <input
                  type="text"
                  value={osForm.technical_responsible_name}
                  onChange={(e) => setOsForm({ ...osForm, technical_responsible_name: e.target.value })}
                  placeholder="Ex: Eng. Eduardo Vasconcelos"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewOSModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md"
                >
                  Criar Ordem de Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Service Order (Update) */}
      {showEditOSModal && selectedOS && (
        <div id="modal-edit-os" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar OS: {selectedOS.os_number}</h3>
                  <p className="text-xs text-slate-400">Atualização de metadados e responsáveis</p>
                </div>
              </div>
              <button onClick={() => setShowEditOSModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleEditOSSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Título da OS</label>
                <input
                  type="text"
                  required
                  value={editOsForm.title}
                  onChange={(e) => setEditOsForm({ ...editOsForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Prioridade</label>
                  <select
                    value={editOsForm.priority}
                    onChange={(e) => setEditOsForm({ ...editOsForm, priority: e.target.value as PriorityLevel })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Prazo de Entrega</label>
                  <input
                    type="date"
                    required
                    value={editOsForm.due_date}
                    onChange={(e) => setEditOsForm({ ...editOsForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Responsável Técnico</label>
                  <input
                    type="text"
                    value={editOsForm.technical_responsible_name}
                    onChange={(e) => setEditOsForm({ ...editOsForm, technical_responsible_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Gestor do Contrato</label>
                  <input
                    type="text"
                    value={editOsForm.manager_name}
                    onChange={(e) => setEditOsForm({ ...editOsForm, manager_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Descrição / Escopo Técnico</label>
                <textarea
                  rows={3}
                  value={editOsForm.description}
                  onChange={(e) => setEditOsForm({ ...editOsForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditOSModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Service Order (Delete) */}
      {showDeleteOSModal && selectedOS && (
        <div id="modal-delete-os" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/20 text-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Ordem de Serviço</h3>
                <p className="text-xs text-slate-400">Esta ação removerá a OS e todas as etapas vinculadas.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Tem certeza de que deseja remover a Ordem de Serviço <strong className="text-white">{selectedOS.os_number}</strong> ({selectedOS.title})?
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteOSModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteOSConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Task to Stage */}
      {showNewTaskModal && selectedOS && (
        <div id="modal-new-task" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white">Adicionar Tarefa na Etapa</h3>
              <button onClick={() => setShowNewTaskModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddTaskSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Etapa Vinculada</label>
                <select
                  value={taskForm.stage_id}
                  onChange={(e) => setTaskForm({ ...taskForm, stage_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {selectedOS.stages.map((stg, idx) => (
                    <option key={stg.id} value={stg.id}>Etapa {idx + 1}: {stg.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nome da Tarefa *</label>
                <input
                  type="text"
                  required
                  value={taskForm.name}
                  onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Descrição / Instrução Técnica</label>
                <textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-task-mandatory"
                  checked={taskForm.is_mandatory}
                  onChange={(e) => setTaskForm({ ...taskForm, is_mandatory: e.target.checked })}
                  className="rounded border-slate-800 bg-slate-950 text-emerald-600 focus:ring-0"
                />
                <label htmlFor="chk-task-mandatory" className="text-slate-300 cursor-pointer">
                  Tarefa mandatória para conclusão da etapa (RN004)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                >
                  Adicionar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pause SLA */}
      {showSlaPauseModal && selectedOS && (
        <div id="modal-pause-sla" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-500/30 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <h3 className="text-sm font-bold text-amber-400 flex items-center space-x-1.5">
                <PauseCircle className="w-4 h-4" />
                <span>Pausar Contagem de SLA (RN006)</span>
              </h3>
              <button onClick={() => setShowSlaPauseModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <form onSubmit={handleConfirmSlaPause} className="space-y-3.5 text-xs">
              <p className="text-slate-300">
                A contagem de dias úteis da OS será congelada. Informe a justificativa da pendência do cliente:
              </p>
              <textarea
                rows={3}
                required
                value={slaReason}
                onChange={(e) => setSlaReason(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSlaPauseModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold shadow-md"
                >
                  Confirmar Pausa de SLA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rework */}
      {showReworkModal && selectedOS && (
        <div id="modal-rework-os" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <h3 className="text-sm font-bold text-white">Solicitar Retrabalho / Ajuste Técnico (RN009)</h3>
              <button onClick={() => setShowReworkModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <form onSubmit={handleRework} className="space-y-3.5 text-xs">
              <p className="text-slate-400">
                Descreva os apontamentos e ajustes solicitados pelo cliente ou revisor:
              </p>
              <textarea
                rows={3}
                required
                value={reworkReason}
                onChange={(e) => setReworkReason(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
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
                  Registrar Retrabalho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Request */}
      {showNewRequestModal && selectedOS && (
        <div id="modal-new-request-os" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <h3 className="text-sm font-bold text-white">Criar Nova Pendência para o Cliente</h3>
              <button onClick={() => setShowNewRequestModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <form onSubmit={handleCreateNewRequest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Título da Pendência *</label>
                <input
                  type="text"
                  required
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Prioridade</label>
                <select
                  value={requestPriority}
                  onChange={(e) => setRequestPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta (Bloqueia etapa conforme RN005)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold shadow-md"
                >
                  Criar Pendência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
