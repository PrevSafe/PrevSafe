'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { RequestItem, ServiceTemplate } from '@/types';
import { formatDate } from '@/lib/utils';
import { 
  CheckSquare, 
  AlertTriangle, 
  Clock, 
  Send, 
  Share2, 
  CheckCircle2, 
  Plus, 
  Building2, 
  Filter, 
  Flame, 
  Search,
  BookOpen,
  Edit2,
  Trash2
} from 'lucide-react';

export const RequestsView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    requests, 
    clients, 
    serviceOrders, 
    createRequest,
    updateRequest,
    deleteRequest,
    resolveRequest 
  } = usePrevSafe();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('OPEN');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RequestItem | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<RequestItem | null>(null);

  // Form
  const [reqForm, setReqForm] = useState(() => ({
    client_id: clients[0]?.id || '',
    service_order_id: serviceOrders[0]?.id || '',
    title: 'Envio de Quadro de Empregados e Funções',
    description: 'Solicitamos a relação atualizada dos colaboradores ativos para elaboração do PCMSO.',
    due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    priority: 'HIGH' as RequestItem['priority']
  }));

  const filteredRequests = requests.filter(r => {
    const matchesStatus = statusFilter === 'ALL' || 
      (statusFilter === 'OPEN' ? r.status === 'OPEN' || r.status === 'SENT' || r.status === 'VIEWED' : r.status === 'RESOLVED');
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.req_number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleOpenNewRequest = () => {
    setEditingRequest(null);
    setReqForm({
      client_id: clients[0]?.id || '',
      service_order_id: serviceOrders[0]?.id || '',
      title: 'Envio de Quadro de Empregados e Funções',
      description: 'Solicitamos a relação atualizada dos colaboradores ativos para elaboração do PCMSO.',
      due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      priority: 'HIGH'
    });
    setShowNewRequestModal(true);
  };

  const handleOpenEditRequest = (r: RequestItem) => {
    setEditingRequest(r);
    setReqForm({
      client_id: r.client_id,
      service_order_id: r.service_order_id || '',
      title: r.title,
      description: r.description,
      due_date: r.due_date.split('T')[0],
      priority: r.priority
    });
    setShowNewRequestModal(true);
  };

  const handleSaveRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqForm.client_id || !reqForm.title) {
      alert('Selecione um cliente e informe o título da solicitação.');
      return;
    }

    if (editingRequest) {
      updateRequest(editingRequest.id, {
        client_id: reqForm.client_id,
        service_order_id: reqForm.service_order_id || undefined,
        title: reqForm.title,
        description: reqForm.description,
        due_date: new Date(reqForm.due_date).toISOString(),
        priority: reqForm.priority
      });
      setShowNewRequestModal(false);
      setEditingRequest(null);
    } else {
      createRequest({
        client_id: reqForm.client_id,
        service_order_id: reqForm.service_order_id || undefined,
        title: reqForm.title,
        description: reqForm.description,
        due_date: new Date(reqForm.due_date).toISOString(),
        priority: reqForm.priority,
        type: 'DOCUMENT'
      });
      setShowNewRequestModal(false);
    }
  };

  const handleDeleteRequestConfirm = () => {
    if (!deletingRequest) return;
    deleteRequest(deletingRequest.id);
    setDeletingRequest(null);
  };

  const getDDayStatus = (dueDateStr: string) => {
    const now = new Date();
    const due = new Date(dueDateStr);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: 'D-0 (Vence Hoje)', color: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' };
    if (diffDays === 1) return { label: 'D-1 (Amanhã)', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' };
    if (diffDays === 3) return { label: 'D-3 (Alerta Preventivo)', color: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' };
    if (diffDays < 0) return { label: `D+${Math.abs(diffDays)} (Vencido!)`, color: 'bg-rose-600/30 text-rose-200 border border-rose-500/40 animate-pulse' };
    return { label: `Em ${diffDays} dias`, color: 'bg-slate-800 text-slate-300 border border-slate-700' };
  };

  return (
    <div id="requests-view-container" className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div id="requests-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Central de Pendências com Clientes</h1>
            <p className="text-xs text-slate-400 mt-0.5">Acompanhamento de insumos, organogramas e listas pendentes para não estourar o SLA da consultoria.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            id="btn-new-request"
            onClick={handleOpenNewRequest}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-amber-950/40 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Solicitação</span>
          </button>
        </div>
      </div>

      {/* Filter and Stats Bento Bar */}
      <div id="requests-filter-bar" className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-requests"
            type="text"
            placeholder="Buscar pendência por descrição ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setStatusFilter('OPEN')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition ${
              statusFilter === 'OPEN' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Em Aberto ({requests.filter(r => r.status === 'OPEN' || r.status === 'SENT').length})
          </button>
          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition ${
              statusFilter === 'RESOLVED' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Resolvidas ({requests.filter(r => r.status === 'RESOLVED').length})
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition ${
              statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todas ({requests.length})
          </button>
        </div>
      </div>

      {/* Requests Bento Grid */}
      <div id="requests-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRequests.map((req) => {
          const client = clients.find(c => c.id === req.client_id);
          const os = serviceOrders.find(o => o.id === req.service_order_id);
          const dday = getDDayStatus(req.due_date);

          return (
            <div 
              key={req.id} 
              id={`req-card-${req.id}`}
              className={`p-6 rounded-3xl border flex flex-col justify-between space-y-4 transition group ${
                req.status !== 'RESOLVED' 
                  ? 'bg-slate-900 border-amber-500/30 shadow-xl' 
                  : 'bg-slate-900/50 border-slate-800 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${dday.color}`}>
                    {dday.label}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border mr-1 ${
                      req.priority === 'HIGH' || req.priority === 'URGENT' 
                        ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
                        : 'text-slate-400 bg-slate-800 border-slate-700'
                    }`}>
                      {req.priority}
                    </span>
                    <button
                      onClick={() => handleOpenEditRequest(req)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
                      title="Editar Solicitação"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingRequest(req)}
                      className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition"
                      title="Excluir Solicitação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white mt-3">{req.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{req.description}</p>

                <div className="mt-4 pt-3.5 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
                  <div>Cliente: <strong className="text-slate-200">{client?.trade_name}</strong></div>
                  {os && <div>OS Vinculada: <strong className="text-indigo-300 font-mono">{os.os_number}</strong> ({os.service_name})</div>}
                  <div className="font-mono text-slate-500">Prazo: {formatDate(req.due_date)}</div>
                </div>
              </div>

              <div className="pt-3.5 border-t border-slate-800/80 flex items-center justify-between">
                {req.status !== 'RESOLVED' ? (
                  <>
                    <button
                      onClick={() => alert(`Lembrete de cobrança enviado com link direto ao WhatsApp do cliente ${client?.trade_name}!`)}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition flex items-center space-x-1"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cobrar WhatsApp</span>
                    </button>
                    <button
                      onClick={() => resolveRequest(req.id, 'Resolvido pelo operador')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-md"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Marcar Resolvida</span>
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-bold text-emerald-400 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Resolvida com Sucesso
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New / Edit Request Modal */}
      {showNewRequestModal && (
        <div id="modal-request-form" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingRequest ? 'Editar Solicitação de Pendência' : 'Nova Solicitação ao Cliente'}
              </h3>
              <button 
                onClick={() => {
                  setShowNewRequestModal(false);
                  setEditingRequest(null);
                }} 
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRequest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Cliente Contratante *</label>
                <select
                  value={reqForm.client_id}
                  onChange={(e) => setReqForm({ ...reqForm, client_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.trade_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Ordem de Serviço (Opcional)</label>
                <select
                  value={reqForm.service_order_id}
                  onChange={(e) => setReqForm({ ...reqForm, service_order_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Sem vínculo com OS</option>
                  {serviceOrders.map(o => (
                    <option key={o.id} value={o.id}>{o.os_number} - {o.service_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Título da Solicitação *</label>
                <input
                  type="text"
                  required
                  value={reqForm.title}
                  onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Descrição / Instruções para o Cliente</label>
                <textarea
                  rows={3}
                  value={reqForm.description}
                  onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Prioridade</label>
                  <select
                    value={reqForm.priority}
                    onChange={(e) => setReqForm({ ...reqForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Data Limite (Prazo)</label>
                  <input
                    type="date"
                    value={reqForm.due_date}
                    onChange={(e) => setReqForm({ ...reqForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewRequestModal(false);
                    setEditingRequest(null);
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-md"
                >
                  {editingRequest ? 'Atualizar Solicitação' : 'Salvar Solicitação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Request Modal */}
      {deletingRequest && (
        <div id="modal-delete-request" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/20 text-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Solicitação</h3>
                <p className="text-xs text-slate-400">Esta ação removerá a pendência do painel.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Tem certeza de que deseja remover a solicitação <strong className="text-white">{deletingRequest.title}</strong>?
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRequest(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteRequestConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ServiceTemplatesView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    serviceTemplates, 
    addServiceTemplate, 
    updateServiceTemplate, 
    deleteServiceTemplate 
  } = usePrevSafe();

  const [selectedTemplate, setSelectedTemplate] = useState<ServiceTemplate | null>(serviceTemplates[0] || null);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ServiceTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<ServiceTemplate | null>(null);

  const [templateForm, setTemplateForm] = useState({
    code: 'NR-XX',
    name: 'Novo Laudo Técnico Especializado',
    description: 'Serviço técnico em conformidade com as Normas Regulamentadoras.',
    default_duration_days: 15,
    default_price: 4500,
    stages_count: 5
  });

  const handleOpenNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      code: 'NR-10',
      name: 'PIE - Prontuário das Instalações Elétricas (NR-10)',
      description: 'Auditoria e memorial descritivo dos sistemas elétricos e esquemas unifilares.',
      default_duration_days: 20,
      default_price: 5800,
      stages_count: 5
    });
    setShowNewTemplateModal(true);
  };

  const handleOpenEditTemplate = (tmpl: ServiceTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateForm({
      code: tmpl.code,
      name: tmpl.name,
      description: tmpl.description,
      default_duration_days: tmpl.default_duration_days,
      default_price: tmpl.default_price,
      stages_count: tmpl.stages?.length || 5
    });
    setShowNewTemplateModal(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.code || !templateForm.name) {
      alert('Informe o código e nome do serviço.');
      return;
    }

    if (editingTemplate) {
      updateServiceTemplate(editingTemplate.id, {
        code: templateForm.code,
        name: templateForm.name,
        description: templateForm.description,
        default_duration_days: Number(templateForm.default_duration_days) || 15,
        default_price: Number(templateForm.default_price) || 0
      });
      setShowNewTemplateModal(false);
      setEditingTemplate(null);
    } else {
      const defaultStages = [
        { id: `stg-1-${Date.now()}`, service_template_id: 'new', order_index: 1, name: 'Planejamento e Coleta de Documentos', description: 'Recebimento de plantas e quadro funcional', default_days: 3, is_mandatory: true, requires_client: true, tasks: [] },
        { id: `stg-2-${Date.now()}`, service_template_id: 'new', order_index: 2, name: 'Vistoria Técnica Presencial', description: 'Inspeção de campo e registros fotográficos', default_days: 4, is_mandatory: true, requires_client: false, tasks: [] },
        { id: `stg-3-${Date.now()}`, service_template_id: 'new', order_index: 3, name: 'Consolidação e Redação Técnica', description: 'Elaboração da minuta do laudo', default_days: 5, is_mandatory: true, requires_client: false, tasks: [] },
        { id: `stg-4-${Date.now()}`, service_template_id: 'new', order_index: 4, name: 'Revisão e Homologação por Engenheiro', description: 'Assinatura técnica com ART/RRT', default_days: 3, is_mandatory: true, requires_client: false, tasks: [] }
      ];

      const created = addServiceTemplate({
        code: templateForm.code,
        name: templateForm.name,
        category: 'PROGRAMAS',
        description: templateForm.description,
        default_duration_days: Number(templateForm.default_duration_days) || 15,
        default_price: Number(templateForm.default_price) || 0,
        mandatory_documents: ['Documento de Identificação', 'Quadro de Funcionários'],
        active: true,
        stages: defaultStages
      });
      setSelectedTemplate(created);
      setShowNewTemplateModal(false);
    }
  };

  const handleDeleteTemplateConfirm = () => {
    if (!deletingTemplate) return;
    deleteServiceTemplate(deletingTemplate.id);
    setDeletingTemplate(null);
    const remaining = serviceTemplates.filter(t => t.id !== deletingTemplate.id);
    setSelectedTemplate(remaining[0] || null);
  };

  return (
    <div id="service-templates-view-container" className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div id="service-templates-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Catálogo de Serviços & NRs</h1>
            <p className="text-xs text-slate-400 mt-0.5">Modelos padronizados com as etapas de execução técnica para cada serviço de SST.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            id="btn-new-template"
            onClick={handleOpenNewTemplate}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-950/40 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Modelo de Serviço</span>
          </button>
        </div>
      </div>

      {/* Split Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Template List */}
        <div id="templates-list" className="lg:col-span-4 space-y-3">
          {serviceTemplates.map((tmpl) => {
            const isSelected = selectedTemplate?.id === tmpl.id;
            return (
              <div
                id={`template-card-${tmpl.id}`}
                key={tmpl.id}
                onClick={() => setSelectedTemplate(tmpl)}
                className={`p-5 rounded-3xl border cursor-pointer transition flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40' 
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold bg-slate-950 text-indigo-300 px-2.5 py-0.5 rounded-full border border-slate-800">
                      {tmpl.code}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-2.5">{tmpl.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{tmpl.description}</p>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>SLA Padrão: {tmpl.default_duration_days} dias</span>
                  <span className="font-bold text-emerald-400">R$ {tmpl.default_price?.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Template Details & Stages Breakdown */}
        {selectedTemplate ? (
          <div id="template-detail-pane" className="lg:col-span-8 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                    {selectedTemplate.code}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-2">{selectedTemplate.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedTemplate.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEditTemplate(selectedTemplate)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center space-x-1"
                    title="Editar Modelo"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => setDeletingTemplate(selectedTemplate)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold border border-rose-500/20 transition"
                    title="Excluir Modelo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-right pl-3 border-l border-slate-800">
                    <span className="text-lg font-bold font-mono text-emerald-400 block">
                      R$ {selectedTemplate.default_price?.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">Prazo: {selectedTemplate.default_duration_days} dias</span>
                  </div>
                </div>
              </div>

              {/* Stages Flow */}
              <div className="space-y-3 pt-4">
                <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  Fluxo das Etapas Padronizadas ({selectedTemplate.stages?.length || 0} Etapas)
                </h3>

                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {selectedTemplate.stages && selectedTemplate.stages.map((stg, idx) => (
                    <div key={stg.id || idx} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-indigo-300 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 text-[10px]">
                            {stg.order_index}
                          </span>
                          <span className="font-bold text-white">{stg.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{stg.description}</p>
                      </div>

                      <div className="text-right font-mono text-[11px] text-slate-400">
                        <div>{stg.default_days} dia(s)</div>
                        <div className="text-[10px] text-slate-500">{stg.tasks?.length || 0} tarefas</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* New / Edit Template Modal */}
      {showNewTemplateModal && (
        <div id="modal-template-form" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingTemplate ? 'Editar Modelo de Serviço' : 'Novo Modelo de Serviço SST'}
              </h3>
              <button 
                onClick={() => {
                  setShowNewTemplateModal(false);
                  setEditingTemplate(null);
                }} 
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Código / NR *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: NR-12"
                    value={templateForm.code}
                    onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white uppercase font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Nome do Serviço *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Laudo de Segurança em Máquinas"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Descrição / Escopo Técnico</label>
                <textarea
                  rows={3}
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">SLA Padrão (Dias)</label>
                  <input
                    type="number"
                    value={templateForm.default_duration_days}
                    onChange={(e) => setTemplateForm({ ...templateForm, default_duration_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Preço Sugerido (R$)</label>
                  <input
                    type="number"
                    value={templateForm.default_price}
                    onChange={(e) => setTemplateForm({ ...templateForm, default_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewTemplateModal(false);
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                >
                  {editingTemplate ? 'Atualizar Modelo' : 'Salvar Modelo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Template Modal */}
      {deletingTemplate && (
        <div id="modal-delete-template" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/20 text-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Modelo de Serviço</h3>
                <p className="text-xs text-slate-400">Esta ação removerá o modelo de serviço do catálogo.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Tem certeza de que deseja remover o modelo <strong className="text-white">{deletingTemplate.name}</strong> ({deletingTemplate.code})?
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTemplate(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteTemplateConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
