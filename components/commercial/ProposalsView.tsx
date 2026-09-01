'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Proposal, ProposalItem } from '@/types';
import { formatDate } from '@/lib/utils';
import { 
  FileSpreadsheet, 
  Plus, 
  CheckCircle2, 
  Send, 
  Eye, 
  Sparkles, 
  Copy, 
  ArrowRight, 
  Share2, 
  Building2, 
  DollarSign, 
  Calendar,
  AlertCircle,
  FileText,
  Edit2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ProposalsView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    proposals, 
    clients, 
    serviceTemplates, 
    createProposal, 
    updateProposal,
    deleteProposal,
    sendProposal, 
    approveProposal, 
    rejectProposal,
    currentProfile 
  } = usePrevSafe();

  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(proposals[0] || null);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [deletingProposal, setDeletingProposal] = useState<Proposal | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  // Proposal Builder State
  const [builderClientId, setBuilderClientId] = useState(clients[0]?.id || '');
  const [builderTitle, setBuilderTitle] = useState('Proposta de Gestão SST e Laudos Regulamentares');
  const [builderValidityDays, setBuilderValidityDays] = useState(30);
  const [builderItems, setBuilderItems] = useState<ProposalItem[]>([
    {
      id: 'item-1',
      proposal_id: 'prop-draft',
      service_template_id: serviceTemplates[0]?.id || 'tmpl-pgr-01',
      service_name: 'PGR - Programa de Gerenciamento de Riscos (NR-01)',
      description: 'Inventário de Riscos Ocupacionais + Plano de Ação 5W2H conforme Portaria SEPRT 6.730',
      quantity: 1,
      unit_price: 6500,
      total: 6500
    },
    {
      id: 'item-2',
      proposal_id: 'prop-draft',
      service_template_id: serviceTemplates[1]?.id || 'tmpl-pcmso-01',
      service_name: 'PCMSO - Programa de Controle Médico de Saúde Ocupacional (NR-07)',
      description: 'Planejamento médico, definição de exames clínicos, complementares e audiometrias',
      quantity: 1,
      unit_price: 5200,
      total: 5200
    }
  ]);
  const [builderDiscount, setBuilderDiscount] = useState(700);
  const [builderNotes, setBuilderNotes] = useState('Condição especial de pagamento em 3 parcelas mensais.');

  // Calculation
  const subtotal = builderItems.reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);
  const total = Math.max(0, subtotal - builderDiscount);

  const handleOpenNewProposal = () => {
    setEditingProposal(null);
    setBuilderClientId(clients[0]?.id || '');
    setBuilderTitle('Proposta de Gestão SST e Laudos Regulamentares');
    setBuilderValidityDays(30);
    setBuilderItems([
      {
        id: 'item-1',
        proposal_id: 'prop-draft',
        service_template_id: serviceTemplates[0]?.id || 'tmpl-pgr-01',
        service_name: serviceTemplates[0]?.name || 'PGR - Programa de Gerenciamento de Riscos (NR-01)',
        description: 'Inventário de Riscos Ocupacionais + Plano de Ação 5W2H',
        quantity: 1,
        unit_price: serviceTemplates[0]?.default_price || 6500,
        total: serviceTemplates[0]?.default_price || 6500
      }
    ]);
    setBuilderDiscount(0);
    setBuilderNotes('Condição padrão de pagamento.');
    setShowBuilderModal(true);
  };

  const handleOpenEditProposal = (prop: Proposal) => {
    setEditingProposal(prop);
    setBuilderClientId(prop.client_id);
    setBuilderTitle(prop.title);
    setBuilderValidityDays(30);
    setBuilderItems([...prop.items]);
    setBuilderDiscount(prop.discount);
    setBuilderNotes(prop.description || '');
    setShowBuilderModal(true);
  };

  const handleAddItem = (tmplId: string) => {
    const tmpl = serviceTemplates.find(t => t.id === tmplId);
    if (!tmpl) return;

    const newItem: ProposalItem = {
      id: `item-${builderItems.length + 1}-${tmpl.id}`,
      proposal_id: editingProposal ? editingProposal.id : 'prop-draft',
      service_template_id: tmpl.id,
      service_name: tmpl.name,
      description: tmpl.description,
      quantity: 1,
      unit_price: tmpl.default_price,
      total: tmpl.default_price
    };

    setBuilderItems([...builderItems, newItem]);
  };

  const handleRemoveItem = (idx: number) => {
    setBuilderItems(builderItems.filter((_, i) => i !== idx));
  };

  const handleSaveProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderClientId || builderItems.length === 0) {
      alert('Selecione um cliente e inclua ao menos um serviço no escopo.');
      return;
    }

    const validDate = new Date();
    validDate.setDate(validDate.getDate() + Number(builderValidityDays || 30));

    if (editingProposal) {
      updateProposal(editingProposal.id, {
        client_id: builderClientId,
        title: builderTitle,
        description: builderNotes,
        items: builderItems.map(it => ({
          ...it,
          total: it.unit_price * it.quantity
        })),
        discount: Number(builderDiscount) || 0,
        valid_until: validDate.toISOString()
      });
      setShowBuilderModal(false);
      setEditingProposal(null);
    } else {
      const newProp = createProposal({
        client_id: builderClientId,
        title: builderTitle,
        description: builderNotes,
        items: builderItems.map(it => ({
          service_template_id: it.service_template_id,
          service_name: it.service_name,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total: it.unit_price * it.quantity
        })),
        discount: Number(builderDiscount) || 0,
        valid_until: validDate.toISOString()
      });

      setSelectedProposal(newProp);
      setShowBuilderModal(false);
    }
  };

  const handleDeleteProposalConfirm = () => {
    if (!deletingProposal) return;
    deleteProposal(deletingProposal.id);
    setDeletingProposal(null);
    const remaining = proposals.filter(p => p.id !== deletingProposal.id);
    setSelectedProposal(remaining[0] || null);
  };

  const handleSendViaWhatsApp = (prop: Proposal) => {
    sendProposal(prop.id, 'WHATSAPP');
    setShowSendModal(false);
    alert(`Link da Proposta ${prop.proposal_number} enviado via WhatsApp do cliente! Status alterado para SENT.`);
  };

  const handleApprove = (prop: Proposal) => {
    // RN001: Aprovação gera contrato automaticamente
    approveProposal(prop.id);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    alert(`🎉 Proposta ${prop.proposal_number} APROVADA com sucesso!\nContrato comercial vinculado gerado e pronto para assinatura.`);
    onNavigate('contracts');
  };

  return (
    <div id="proposals-view-container" className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div id="proposals-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Propostas Comerciais SST</h1>
            <p className="text-xs text-slate-400 mt-0.5">Elaboração técnica com NRs, cálculo automático de SLA e conversão direta em contratos (RN001).</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            id="btn-create-proposal"
            onClick={handleOpenNewProposal}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova Proposta</span>
          </button>
        </div>
      </div>

      {/* Main Split View in Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* List of Proposals */}
        <div id="proposals-list" className="lg:col-span-5 space-y-3">
          {proposals.map((prop) => {
            const client = clients.find(c => c.id === prop.client_id);
            const isSelected = selectedProposal?.id === prop.id;

            return (
              <div
                id={`proposal-card-${prop.id}`}
                key={prop.id}
                onClick={() => setSelectedProposal(prop)}
                className={`p-5 rounded-3xl border cursor-pointer transition flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40' 
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-200">{prop.proposal_number}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        prop.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        prop.status === 'SENT' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        prop.status === 'VIEWED' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        prop.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {prop.status}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white mt-2">{client?.trade_name}</div>
                    <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{prop.title}</div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-sm font-bold text-emerald-400 block">
                      R$ {prop.total.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Validade: {formatDate(prop.valid_until)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Proposal Preview / Action Pane */}
        {selectedProposal ? (
          <div id="proposal-detail-pane" className="lg:col-span-7 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center space-x-2 font-mono text-xs text-slate-400">
                    <span>Proposta Nº</span>
                    <span className="font-bold text-slate-200">{selectedProposal.proposal_number}</span>
                    <span>•</span>
                    <span>{formatDate(selectedProposal.created_at)}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">{selectedProposal.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cliente: <strong className="text-slate-200">{clients.find(c => c.id === selectedProposal.client_id)?.trade_name}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEditProposal(selectedProposal)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center space-x-1"
                    title="Editar Proposta"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => setDeletingProposal(selectedProposal)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold border border-rose-500/20 transition"
                    title="Excluir Proposta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    selectedProposal.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    selectedProposal.status === 'SENT' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {selectedProposal.status}
                  </span>
                </div>
              </div>

              {/* Scope Items Table */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Itens de Escopo Técnico</span>
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase">
                      <tr>
                        <th className="py-3 px-3.5">Serviço Técnico</th>
                        <th className="py-3 px-3.5">SLA Estimado</th>
                        <th className="py-3 px-3.5 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedProposal.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-3.5">
                            <div className="font-bold text-slate-100">{item.service_name}</div>
                            <div className="text-[11px] text-slate-400">{item.description}</div>
                          </td>
                          <td className="py-3.5 px-3.5 font-mono text-slate-300">15 dias úteis</td>
                          <td className="py-3.5 px-3.5 text-right font-mono font-bold text-emerald-400">
                            R$ {item.total.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary Bento Box */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal Bruto:</span>
                  <span className="font-mono text-slate-200">R$ {selectedProposal.subtotal.toLocaleString('pt-BR')}</span>
                </div>
                {selectedProposal.discount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-medium">
                    <span>Desconto Comercial:</span>
                    <span className="font-mono">- R$ {selectedProposal.discount.toLocaleString('pt-BR')}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                  <span>Valor Total da Proposta:</span>
                  <span className="font-mono text-emerald-400">R$ {selectedProposal.total.toLocaleString('pt-BR')}</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  Validade da Proposta: Até {formatDate(selectedProposal.valid_until)}
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap gap-2 justify-between items-center">
              <div className="flex space-x-2">
                <button
                  id="btn-send-proposal"
                  onClick={() => setShowSendModal(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Enviar ao Cliente (WA/Email)</span>
                </button>
              </div>

              {selectedProposal.status !== 'APPROVED' && (
                <div className="flex space-x-2">
                  <button
                    id="btn-reject-proposal"
                    onClick={() => rejectProposal(selectedProposal.id, 'Preço acima do orçamento')}
                    className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-xl border border-rose-500/30 transition"
                  >
                    Recusar
                  </button>
                  <button
                    id="btn-approve-proposal"
                    onClick={() => handleApprove(selectedProposal)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aprovar & Gerar Contrato (RN001)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Builder / Edit Modal */}
      {showBuilderModal && (
        <div id="modal-proposal-builder" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingProposal ? 'Editar Proposta Comercial' : 'Novo Orçamento / Proposta Comercial SST'}
                </h3>
                <p className="text-xs text-slate-400">Selecione o cliente e os pacotes técnicos de NRs</p>
              </div>
              <button 
                onClick={() => {
                  setShowBuilderModal(false);
                  setEditingProposal(null);
                }} 
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProposal} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Cliente Contratante *</label>
                  <select
                    value={builderClientId}
                    onChange={(e) => setBuilderClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.trade_name} ({c.document_number})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Título da Proposta</label>
                  <input
                    type="text"
                    value={builderTitle}
                    onChange={(e) => setBuilderTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Add Template Quick Selector */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="block font-bold text-slate-300 mb-2">Adicionar Serviços do Catálogo de NRs:</span>
                <div className="flex flex-wrap gap-2">
                  {serviceTemplates.map(tmpl => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleAddItem(tmpl.id)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-emerald-500/10 border border-slate-800 hover:border-emerald-500/30 rounded-xl text-slate-300 text-[11px] font-medium transition flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>{tmpl.code} - R${tmpl.default_price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List in Builder */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-300">Itens Selecionados ({builderItems.length})</label>
                {builderItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-bold text-white">{item.service_name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{item.description}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        R$ {item.total.toLocaleString('pt-BR')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-400 hover:text-rose-300 text-xs font-bold"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Discount and Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Desconto Comercial (R$)</label>
                  <input
                    type="number"
                    value={builderDiscount}
                    onChange={(e) => setBuilderDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Validade da Proposta (Dias)</label>
                  <input
                    type="number"
                    value={builderValidityDays}
                    onChange={(e) => setBuilderValidityDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-right">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block">Total Final</span>
                  <span className="text-base font-mono font-bold text-emerald-300">R$ {total.toLocaleString('pt-BR')}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowBuilderModal(false);
                    setEditingProposal(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  {editingProposal ? 'Atualizar Proposta' : 'Salvar Proposta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Proposal Modal */}
      {deletingProposal && (
        <div id="modal-delete-proposal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/20 text-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Proposta</h3>
                <p className="text-xs text-slate-400">Esta ação removerá a proposta comercial do sistema.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Tem certeza de que deseja remover a proposta <strong className="text-white">{deletingProposal.proposal_number}</strong> ({deletingProposal.title})?
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProposal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteProposalConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multichannel Send Modal */}
      {showSendModal && selectedProposal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <h3 className="text-sm font-bold text-white">Enviar Proposta ao Cliente</h3>
              <button onClick={() => setShowSendModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Escolha o canal de transmissão direta para a diretoria/RH da empresa contratante:
            </p>
            <div className="space-y-2.5">
              <button
                onClick={() => handleSendViaWhatsApp(selectedProposal)}
                className="w-full p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-left flex items-center justify-between text-xs font-semibold text-emerald-200 transition"
              >
                <div>
                  <div className="font-bold text-white">📱 Enviar via WhatsApp Direto</div>
                  <div className="text-[10px] text-emerald-400">Mensagem instantânea com link de visualização</div>
                </div>
                <Send className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                onClick={() => {
                  sendProposal(selectedProposal.id, 'EMAIL');
                  setShowSendModal(false);
                  alert('E-mail institucional com proposta PDF anexa enviado com sucesso!');
                }}
                className="w-full p-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-2xl text-left flex items-center justify-between text-xs font-semibold text-indigo-200 transition"
              >
                <div>
                  <div className="font-bold text-white">✉️ Enviar via E-mail Formal</div>
                  <div className="text-[10px] text-indigo-400">Disparo automático para os contatos cadastrados</div>
                </div>
                <Send className="w-4 h-4 text-indigo-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
