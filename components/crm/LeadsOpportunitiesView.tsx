'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Lead, Opportunity } from '@/types';
import { formatDate } from '@/lib/utils';
import { 
  Target, 
  Plus, 
  UserPlus, 
  ArrowRight, 
  CheckCircle2, 
  DollarSign, 
  Phone, 
  Mail, 
  Building2, 
  Flame,
  Calendar,
  Sparkles,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowRightCircle
} from 'lucide-react';

export const LeadsOpportunitiesView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    leads, 
    opportunities, 
    addLead, 
    updateLead,
    deleteLead,
    convertLeadToClient, 
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    updateOpportunityStage,
    clients 
  } = usePrevSafe();

  const [activeTab, setActiveTab] = useState<'LEADS' | 'OPPORTUNITIES'>('LEADS');
  
  // Lead Modals & State
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);

  const [leadForm, setLeadForm] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    source: 'INDICAÇÃO' as Lead['source'],
    status: 'QUALIFIED' as Lead['status'],
    cnae: '',
    estimated_employees: 25,
    notes: ''
  });

  // Opportunity Modals & State
  const [showNewOppModal, setShowNewOppModal] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [deletingOpp, setDeletingOpp] = useState<Opportunity | null>(null);

  const [oppForm, setOppForm] = useState(() => ({
    client_id: '',
    title: '',
    estimated_value: 12000,
    probability: 70,
    stage: 'QUALIFICATION' as Opportunity['stage'],
    expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  }));

  // Lead handlers
  const handleOpenNewLead = () => {
    setLeadForm({
      company: '',
      name: '',
      email: '',
      phone: '',
      source: 'INDICAÇÃO',
      status: 'QUALIFIED',
      cnae: '25.11-0-00',
      estimated_employees: 25,
      notes: ''
    });
    setShowNewLeadModal(true);
  };

  const handleOpenEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadForm({
      company: lead.company,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      cnae: lead.cnae || '',
      estimated_employees: lead.estimated_employees || 20,
      notes: lead.notes || ''
    });
  };

  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.company || !leadForm.name) {
      alert('Preencha a empresa e o contato do lead.');
      return;
    }

    if (editingLead) {
      updateLead(editingLead.id, leadForm);
      setEditingLead(null);
    } else {
      addLead(leadForm);
      setShowNewLeadModal(false);
    }
  };

  const handleDeleteLeadConfirm = () => {
    if (!deletingLead) return;
    deleteLead(deletingLead.id);
    setDeletingLead(null);
  };

  const handleConvertLead = (lead: Lead) => {
    const result = convertLeadToClient(lead.id);
    alert(`Lead convertido com sucesso no Cliente "${result.client.trade_name}". Você já pode gerar a proposta.`);
    onNavigate('proposals');
  };

  // Opportunity handlers
  const handleOpenNewOpp = () => {
    setOppForm({
      client_id: clients[0]?.id || '',
      title: '',
      estimated_value: 12500,
      probability: 70,
      stage: 'QUALIFICATION',
      expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    });
    setShowNewOppModal(true);
  };

  const handleOpenEditOpp = (opp: Opportunity) => {
    setEditingOpp(opp);
    setOppForm({
      client_id: opp.client_id || clients[0]?.id || '',
      title: opp.title,
      estimated_value: opp.estimated_value,
      probability: opp.probability,
      stage: opp.stage,
      expected_close_date: opp.expected_close_date.split('T')[0]
    });
  };

  const handleSaveOpp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppForm.title) {
      alert('Informe o título da oportunidade.');
      return;
    }

    if (editingOpp) {
      updateOpportunity(editingOpp.id, oppForm);
      setEditingOpp(null);
    } else {
      addOpportunity(oppForm);
      setShowNewOppModal(false);
    }
  };

  const handleDeleteOppConfirm = () => {
    if (!deletingOpp) return;
    deleteOpportunity(deletingOpp.id);
    setDeletingOpp(null);
  };

  const stageList: { key: Opportunity['stage']; label: string }[] = [
    { key: 'QUALIFICATION', label: 'Qualificação' },
    { key: 'PROPOSAL', label: 'Proposta' },
    { key: 'NEGOTIATION', label: 'Negociação' },
    { key: 'CLOSED_WON', label: 'Fechado Ganho' },
    { key: 'CLOSED_LOST', label: 'Perdido' }
  ];

  return (
    <div id="leads-view-container" className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div id="leads-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Leads & Funil de Oportunidades</h1>
            <p className="text-xs text-slate-400 mt-0.5">Captação comercial, qualificação de demanda e conversão em clientes cadastrados.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {activeTab === 'LEADS' ? (
            <button 
              id="btn-new-lead"
              onClick={handleOpenNewLead}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Lead</span>
            </button>
          ) : (
            <button 
              id="btn-new-opportunity"
              onClick={handleOpenNewOpp}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-950/40 transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Oportunidade</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800">
        <button
          id="tab-leads"
          onClick={() => setActiveTab('LEADS')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'LEADS'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Leads Qualificados ({leads.length})</span>
        </button>
        <button
          id="tab-opportunities"
          onClick={() => setActiveTab('OPPORTUNITIES')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'OPPORTUNITIES'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Funil de Oportunidades ({opportunities.length})</span>
        </button>
      </div>

      {/* Content in Bento Cards */}
      {activeTab === 'LEADS' ? (
        <div id="leads-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {leads.map((lead) => (
            <div key={lead.id} id={`lead-card-${lead.id}`} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      {lead.status}
                    </span>
                    <h3 className="text-base font-bold text-white mt-2.5">{lead.company}</h3>
                    <p className="text-xs text-slate-400">{lead.name}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEditLead(lead)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                      title="Editar Lead"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingLead(lead)}
                      className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition"
                      title="Excluir Lead"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{lead.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Origem: <strong className="text-slate-100">{lead.source}</strong> • CNAE {lead.cnae || 'N/A'}</span>
                  </div>
                </div>

                {lead.notes && (
                  <p className="mt-3 text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 italic">
                    &ldquo;{lead.notes}&rdquo;
                  </p>
                )}
              </div>

              <div className="pt-3.5 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  {formatDate(lead.created_at)}
                </span>
                <button
                  onClick={() => handleConvertLead(lead)}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Converter em Cliente</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Opportunities Kanban/List in Bento Grid Columns */
        <div id="opportunities-kanban" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'].map((stgKey) => {
              const stageLabel = stgKey === 'QUALIFICATION' ? 'Qualificação'
                : stgKey === 'PROPOSAL' ? 'Proposta'
                : stgKey === 'NEGOTIATION' ? 'Negociação'
                : 'Fechado Ganho';

              const stageOpps = opportunities.filter(o => o.stage === stgKey);

              return (
                <div key={stgKey} className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{stageLabel}</span>
                    <span className="text-xs font-mono font-bold bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 text-emerald-400">
                      {stageOpps.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {stageOpps.length === 0 ? (
                      <div className="text-xs text-slate-600 text-center py-6">Nenhuma oportunidade nesta etapa</div>
                    ) : (
                      stageOpps.map((opp) => (
                        <div key={opp.id} id={`opp-card-${opp.id}`} className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 shadow-sm space-y-2 transition group">
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-bold text-white leading-tight">{opp.title}</span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleOpenEditOpp(opp)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                                title="Editar Oportunidade"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setDeletingOpp(opp)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded"
                                title="Excluir Oportunidade"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-400">
                              R$ {opp.estimated_value.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[10px] font-bold text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                              {opp.probability}% prob.
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/80">
                            <span>Previsão: {formatDate(opp.expected_close_date)}</span>
                            
                            {/* Quick Advance Stage Button */}
                            {stgKey !== 'CLOSED_WON' && (
                              <button
                                onClick={() => {
                                  const next = stgKey === 'QUALIFICATION' ? 'PROPOSAL' : stgKey === 'PROPOSAL' ? 'NEGOTIATION' : 'CLOSED_WON';
                                  updateOpportunityStage(opp.id, next as any);
                                }}
                                className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-0.5"
                                title="Avançar Etapa"
                              >
                                <span>Avançar</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New / Edit Lead Modal */}
      {(showNewLeadModal || editingLead) && (
        <div id="modal-lead-form" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-base font-bold text-white">{editingLead ? 'Editar Lead Comercial' : 'Cadastrar Novo Lead Comercial'}</h3>
              <button 
                onClick={() => {
                  setShowNewLeadModal(false);
                  setEditingLead(null);
                }} 
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Empresa / Razão Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Transportadora Rápido Sul Ltda"
                  value={leadForm.company}
                  onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nome do Contato *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Roberto Gomes (RH)"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="contato@empresa.com.br"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Origem do Lead</label>
                  <select
                    value={leadForm.source}
                    onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="INDICAÇÃO">Indicação de Parceiro</option>
                    <option value="WEBSITE">Site / Formulário</option>
                    <option value="WHATSAPP">WhatsApp Direto</option>
                    <option value="OUTBOUND">Prospecção Ativa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">CNAE Principal</label>
                  <input
                    type="text"
                    placeholder="Ex: 49.30-2-02"
                    value={leadForm.cnae}
                    onChange={(e) => setLeadForm({ ...leadForm, cnae: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nº Estimado de Vidas</label>
                  <input
                    type="number"
                    value={leadForm.estimated_employees}
                    onChange={(e) => setLeadForm({ ...leadForm, estimated_employees: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Observações de Demanda SST</label>
                <textarea
                  rows={2}
                  placeholder="Necessidade de PGR, renovação de PCMSO, laudo ergonômico..."
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewLeadModal(false);
                    setEditingLead(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  {editingLead ? 'Atualizar Lead' : 'Salvar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Lead Modal */}
      {deletingLead && (
        <div id="modal-delete-lead" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/20 text-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Lead</h3>
                <p className="text-xs text-slate-400">Esta ação removerá o lead do sistema.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Tem certeza de que deseja remover o lead <strong className="text-white">{deletingLead.company}</strong> ({deletingLead.name})?
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingLead(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteLeadConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Opportunity Modal */}
      {(showNewOppModal || editingOpp) && (
        <div id="modal-opp-form" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">{editingOpp ? 'Editar Oportunidade' : 'Nova Oportunidade Comercial'}</h3>
              <button 
                onClick={() => {
                  setShowNewOppModal(false);
                  setEditingOpp(null);
                }} 
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOpp} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Título da Oportunidade *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gestão SST Anual + PGR/PCMSO 2026"
                  value={oppForm.title}
                  onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Cliente Vinculado</label>
                <select
                  value={oppForm.client_id}
                  onChange={(e) => setOppForm({ ...oppForm, client_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.trade_name} ({c.document_number})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Valor Estimado (R$)</label>
                  <input
                    type="number"
                    value={oppForm.estimated_value}
                    onChange={(e) => setOppForm({ ...oppForm, estimated_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Probabilidade (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={oppForm.probability}
                    onChange={(e) => setOppForm({ ...oppForm, probability: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Etapa do Funil</label>
                  <select
                    value={oppForm.stage}
                    onChange={(e) => setOppForm({ ...oppForm, stage: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {stageList.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Previsão de Fechamento</label>
                  <input
                    type="date"
                    value={oppForm.expected_close_date}
                    onChange={(e) => setOppForm({ ...oppForm, expected_close_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewOppModal(false);
                    setEditingOpp(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  {editingOpp ? 'Atualizar Oportunidade' : 'Salvar Oportunidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Opp Modal */}
      {deletingOpp && (
        <div id="modal-delete-opp" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/20 text-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Oportunidade</h3>
                <p className="text-xs text-slate-400">Esta ação removerá a oportunidade do funil.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Tem certeza de que deseja remover a oportunidade <strong className="text-white">{deletingOpp.title}</strong>?
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingOpp(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteOppConfirm}
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
