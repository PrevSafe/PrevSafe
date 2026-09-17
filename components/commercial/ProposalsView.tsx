'use client';

import React, { useState, useMemo } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Proposal, ProposalItem, ServiceTemplate, Client } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { shareViaChannel } from '@/lib/shareLinks';
import { 
  FileSpreadsheet, 
  Plus, 
  CheckCircle2, 
  Send, 
  Share2, 
  DollarSign, 
  FileText,
  Edit2,
  Trash2,
  AlertTriangle,
  Search,
  Percent,
  RotateCcw,
  Copy,
  Tag,
  BookOpen,
  Layers,
  Sparkles,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BuilderProposalItem extends ProposalItem {
  discount_type?: 'FIXED' | 'PERCENT';
  discount_value?: number;
  is_custom?: boolean;
}

let itemSeqCounter = 1000;
const generateUniqueItemId = (prefix = 'item') => {
  itemSeqCounter += 1;
  return `${prefix}-${itemSeqCounter}`;
};

export const ProposalsView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    proposals = [], 
    clients = [], 
    serviceTemplates = [], 
    createProposal, 
    updateProposal,
    deleteProposal,
    sendProposal, 
    approveProposal, 
    rejectProposal,
    currentProfile,
    organization
  } = usePrevSafe();

  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(proposals?.[0] || null);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [deletingProposal, setDeletingProposal] = useState<Proposal | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  // Proposal Builder State
  const [builderClientId, setBuilderClientId] = useState(clients?.[0]?.id || '');
  const [builderTitle, setBuilderTitle] = useState('Proposta de Gestão SST e Laudos Regulamentares');
  const [builderValidityDays, setBuilderValidityDays] = useState(30);
  const [builderNotes, setBuilderNotes] = useState('Condição padrão: Pagamento em parcelas vinculadas à entrega dos laudos técnicos.');
  
  // Catalog Search & Filter in Builder
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<string>('ALL');

  // Selected Items Grid State
  const [builderItems, setBuilderItems] = useState<BuilderProposalItem[]>([
    {
      id: 'item-1',
      proposal_id: 'prop-draft',
      service_template_id: 'tmpl-pgr-01',
      service_name: 'PGR — Programa de Gerenciamento de Riscos (NR-01)',
      description: 'Inventário de Riscos Ocupacionais + Plano de Ação 5W2H conforme Portaria SEPRT 6.730 da NR-01 com levantamento de GHEs.',
      quantity: 1,
      unit_price: 6500,
      original_price: 6500,
      discount_type: 'PERCENT',
      discount_value: 0,
      discount: 0,
      total: 6500
    },
    {
      id: 'item-2',
      proposal_id: 'prop-draft',
      service_template_id: 'tmpl-pcmso-01',
      service_name: 'PCMSO — Programa de Controle Médico de Saúde Ocupacional (NR-07)',
      description: 'Planejamento médico, definição do cronograma de exames clínicos, complementares e audiometrias ocupacionais.',
      quantity: 1,
      unit_price: 5200,
      original_price: 5200,
      discount_type: 'FIXED',
      discount_value: 500,
      discount: 500,
      total: 4700
    }
  ]);

  // Global Proposal Discount State
  const [globalDiscountType, setGlobalDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(200);

  // Financial Calculations
  const grossSubtotal = useMemo(() => {
    return builderItems.reduce((acc, it) => acc + (Number(it.unit_price || 0) * Number(it.quantity || 1)), 0);
  }, [builderItems]);

  const itemsTotalDiscount = useMemo(() => {
    return builderItems.reduce((acc, it) => acc + (Number(it.discount || 0)), 0);
  }, [builderItems]);

  const subtotalAfterItemDiscounts = Math.max(0, grossSubtotal - itemsTotalDiscount);

  const calculatedGlobalDiscount = useMemo(() => {
    if (!globalDiscountValue || globalDiscountValue <= 0) return 0;
    if (globalDiscountType === 'PERCENT') {
      return (subtotalAfterItemDiscounts * Math.min(100, globalDiscountValue)) / 100;
    }
    return Math.min(subtotalAfterItemDiscounts, globalDiscountValue);
  }, [globalDiscountType, globalDiscountValue, subtotalAfterItemDiscounts]);

  const totalDiscount = itemsTotalDiscount + calculatedGlobalDiscount;
  const netTotal = Math.max(0, grossSubtotal - totalDiscount);
  const totalSavingsPercentage = grossSubtotal > 0 ? ((totalDiscount / grossSubtotal) * 100).toFixed(1) : '0';

  // Filtered NR Catalog
  const filteredCatalog = useMemo(() => {
    return serviceTemplates.filter(t => {
      const matchesCategory = catalogCategory === 'ALL' || t.category === catalogCategory;
      const matchesSearch = !catalogSearch.trim() || 
        t.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        t.code.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [serviceTemplates, catalogCategory, catalogSearch]);

  const handleOpenNewProposal = () => {
    setEditingProposal(null);
    setBuilderClientId(clients[0]?.id || '');
    setBuilderTitle('Proposta de Gestão SST e Laudos Regulamentares');
    setBuilderValidityDays(30);
    setCatalogSearch('');
    setCatalogCategory('ALL');
    
    // Default initial selected items from catalog
    const initialTmpl1 = serviceTemplates[0];
    const initialTmpl2 = serviceTemplates[1] || serviceTemplates[0];

    const initialItems: BuilderProposalItem[] = [];
    if (initialTmpl1) {
      initialItems.push({
        id: generateUniqueItemId('item-init'),
        proposal_id: 'prop-draft',
        service_template_id: initialTmpl1.id,
        service_name: initialTmpl1.name,
        description: initialTmpl1.description,
        quantity: 1,
        unit_price: initialTmpl1.default_price,
        original_price: initialTmpl1.default_price,
        discount_type: 'PERCENT',
        discount_value: 0,
        discount: 0,
        total: initialTmpl1.default_price
      });
    }
    if (initialTmpl2 && initialTmpl2.id !== initialTmpl1?.id) {
      initialItems.push({
        id: generateUniqueItemId('item-init'),
        proposal_id: 'prop-draft',
        service_template_id: initialTmpl2.id,
        service_name: initialTmpl2.name,
        description: initialTmpl2.description,
        quantity: 1,
        unit_price: initialTmpl2.default_price,
        original_price: initialTmpl2.default_price,
        discount_type: 'PERCENT',
        discount_value: 0,
        discount: 0,
        total: initialTmpl2.default_price
      });
    }

    setBuilderItems(initialItems);
    setGlobalDiscountType('FIXED');
    setGlobalDiscountValue(0);
    setBuilderNotes('Condição padrão de pagamento em parcelas mensais.');
    setShowBuilderModal(true);
  };

  const handleOpenEditProposal = (prop: Proposal) => {
    setEditingProposal(prop);
    setBuilderClientId(prop.client_id);
    setBuilderTitle(prop.title);
    setBuilderValidityDays(30);
    setCatalogSearch('');
    setCatalogCategory('ALL');

    const formattedItems: BuilderProposalItem[] = prop.items.map((it, idx) => {
      const tmpl = serviceTemplates.find(t => t.id === it.service_template_id);
      const originalPrice = it.original_price || tmpl?.default_price || it.unit_price;
      const itemDisc = it.discount || 0;
      const itemDiscVal = it.discount_value !== undefined ? it.discount_value : itemDisc;
      const itemDiscType = it.discount_type || 'FIXED';
      const calculatedTotal = (it.unit_price * it.quantity) - itemDisc;

      return {
        ...it,
        id: it.id || generateUniqueItemId(`item-edit-${idx}`),
        original_price: originalPrice,
        discount_type: itemDiscType,
        discount_value: itemDiscVal,
        discount: itemDisc,
        total: Math.max(0, calculatedTotal)
      };
    });

    setBuilderItems(formattedItems);
    setGlobalDiscountType('FIXED');
    setGlobalDiscountValue(Math.max(0, (prop.discount || 0) - formattedItems.reduce((acc, it) => acc + (it.discount || 0), 0)));
    setBuilderNotes(prop.description || '');
    setShowBuilderModal(true);
  };

  // Add Item from NR Catalog
  const handleAddItemFromCatalog = (tmpl: ServiceTemplate) => {
    const newItem: BuilderProposalItem = {
      id: generateUniqueItemId(`item-${tmpl.id}`),
      proposal_id: editingProposal ? editingProposal.id : 'prop-draft',
      service_template_id: tmpl.id,
      service_name: tmpl.name,
      description: tmpl.description,
      quantity: 1,
      unit_price: tmpl.default_price,
      original_price: tmpl.default_price,
      discount_type: 'PERCENT',
      discount_value: 0,
      discount: 0,
      total: tmpl.default_price
    };

    setBuilderItems(prev => [...prev, newItem]);
  };

  // Add Custom / Off-catalog Item
  const handleAddCustomItem = () => {
    const newItem: BuilderProposalItem = {
      id: generateUniqueItemId('item-custom'),
      proposal_id: editingProposal ? editingProposal.id : 'prop-draft',
      service_template_id: 'tmpl-custom',
      service_name: 'Consultoria / Laudo Técnico Especializado de SST',
      description: 'Serviço técnico especializado customizado conforme necessidade específica do cliente.',
      quantity: 1,
      unit_price: 3500,
      original_price: 3500,
      discount_type: 'PERCENT',
      discount_value: 0,
      discount: 0,
      total: 3500,
      is_custom: true
    };

    setBuilderItems(prev => [...prev, newItem]);
  };

  // Update item field directly
  const handleUpdateItemField = (index: number, field: keyof BuilderProposalItem, value: any) => {
    setBuilderItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'unit_price') {
        item.unit_price = Number(value) >= 0 ? Number(value) : 0;
      } else if (field === 'quantity') {
        item.quantity = Number(value) >= 1 ? Number(value) : 1;
      } else if (field === 'description') {
        item.description = String(value);
      } else if (field === 'service_name') {
        item.service_name = String(value);
      } else if (field === 'discount_type') {
        item.discount_type = value as 'FIXED' | 'PERCENT';
      } else if (field === 'discount_value') {
        item.discount_value = Number(value) >= 0 ? Number(value) : 0;
      }

      // Recalculate discount & total for this row
      const subtotalRow = (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
      let discAmount = 0;
      if (item.discount_type === 'PERCENT') {
        const pct = Math.min(100, Math.max(0, Number(item.discount_value) || 0));
        discAmount = (subtotalRow * pct) / 100;
      } else {
        discAmount = Math.min(subtotalRow, Math.max(0, Number(item.discount_value) || 0));
      }
      item.discount = discAmount;
      item.total = Math.max(0, subtotalRow - discAmount);

      updated[index] = item;
      return updated;
    });
  };

  // Quick item discount preset
  const handleSetQuickItemDiscount = (index: number, percent: number) => {
    setBuilderItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.discount_type = 'PERCENT';
      item.discount_value = percent;
      const subtotalRow = (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
      const discAmount = (subtotalRow * percent) / 100;
      item.discount = discAmount;
      item.total = Math.max(0, subtotalRow - discAmount);
      updated[index] = item;
      return updated;
    });
  };

  // Restore catalog defaults for item
  const handleResetItemToCatalog = (index: number) => {
    const item = builderItems[index];
    const tmpl = serviceTemplates.find(t => t.id === item.service_template_id);
    if (!tmpl) return;

    setBuilderItems(prev => {
      const updated = [...prev];
      const qty = updated[index].quantity || 1;
      updated[index] = {
        ...updated[index],
        service_name: tmpl.name,
        description: tmpl.description,
        unit_price: tmpl.default_price,
        original_price: tmpl.default_price,
        discount_type: 'PERCENT',
        discount_value: 0,
        discount: 0,
        total: tmpl.default_price * qty
      };
      return updated;
    });
  };

  // Duplicate item row
  const handleDuplicateItem = (index: number) => {
    const item = builderItems[index];
    const duplicated: BuilderProposalItem = {
      ...item,
      id: generateUniqueItemId('item-dup'),
      service_name: `${item.service_name} (Cópia)`
    };
    setBuilderItems(prev => [...prev.slice(0, index + 1), duplicated, ...prev.slice(index + 1)]);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setBuilderItems(prev => prev.filter((_, i) => i !== index));
  };

  // Apply batch percentage discount to all selected items
  const handleApplyBatchDiscountToAllItems = (percent: number) => {
    setBuilderItems(prev => prev.map(item => {
      const subtotalRow = (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
      const discAmount = (subtotalRow * percent) / 100;
      return {
        ...item,
        discount_type: 'PERCENT',
        discount_value: percent,
        discount: discAmount,
        total: Math.max(0, subtotalRow - discAmount)
      };
    }));
  };

  const handleSaveProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderClientId || builderItems.length === 0) {
      alert('Selecione um cliente e inclua ao menos um serviço no escopo.');
      return;
    }

    const validDate = new Date();
    validDate.setDate(validDate.getDate() + Number(builderValidityDays || 30));

    const finalItems: ProposalItem[] = builderItems.map((it, idx) => ({
      id: it.id || generateUniqueItemId(`prop-item-${idx}`),
      proposal_id: editingProposal ? editingProposal.id : 'prop-draft',
      service_template_id: it.service_template_id,
      service_name: it.service_name,
      description: it.description,
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      original_price: it.original_price || it.unit_price,
      discount_type: it.discount_type || 'FIXED',
      discount_value: it.discount_value || 0,
      discount: Number(it.discount) || 0,
      total: Math.max(0, ((Number(it.unit_price) || 0) * (Number(it.quantity) || 1)) - (Number(it.discount) || 0))
    }));

    if (editingProposal) {
      updateProposal(editingProposal.id, {
        client_id: builderClientId,
        title: builderTitle,
        description: builderNotes,
        items: finalItems,
        subtotal: grossSubtotal,
        discount: totalDiscount,
        total: netTotal,
        valid_until: validDate.toISOString()
      });
      setShowBuilderModal(false);
      setEditingProposal(null);
    } else {
      const newProp = createProposal({
        client_id: builderClientId,
        title: builderTitle,
        description: builderNotes,
        items: finalItems,
        discount: totalDiscount,
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

  const buildProposalMessage = (prop: Proposal, client?: Client) => {
    const greeting = client?.trade_name || client?.legal_name || 'Prezados';
    return [
      `Olá, ${greeting}!`,
      '',
      `Segue nossa proposta comercial ${prop.proposal_number} — ${prop.title}.`,
      `Valor total: ${formatCurrency(prop.total)}`,
      `Validade: ${formatDate(prop.valid_until)}`,
      '',
      `Qualquer dúvida estou à disposição.`,
      `${currentProfile.full_name} — ${organization.name}`,
    ].join('\n');
  };

  const handleSendProposal = (prop: Proposal, channel: 'WHATSAPP' | 'EMAIL') => {
    const client = clients.find(c => c.id === prop.client_id);
    const res = shareViaChannel(channel, {
      phone: client?.whatsapp || client?.phone,
      email: client?.email,
      subject: `Proposta ${prop.proposal_number} - ${prop.title}`,
      message: buildProposalMessage(prop, client),
      recipientName: client?.trade_name || client?.legal_name,
    });

    if (!res.success) {
      alert(res.message);
      return;
    }

    sendProposal(prop.id, channel);
    setShowSendModal(false);
    alert(res.message);
  };

  const handleApprove = (prop: Proposal) => {
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
            <h1 className="text-xl font-bold tracking-tight text-white">Propostas Comerciais SST & Catálogo de NRs</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Elaboração técnica com seleção em grid de NRs, edição completa de valores/descrições e motor de descontos (RN001).
            </p>
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
                  <div className="min-w-0 flex-1 pr-2">
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
                    <div className="text-sm font-semibold text-white mt-2 truncate">{client?.trade_name}</div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">{prop.title}</div>
                  </div>
                  <div className="text-right font-mono flex-shrink-0">
                    <span className="text-sm font-bold text-emerald-400 block">
                      R$ {prop.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {prop.discount > 0 && (
                      <span className="text-[10px] text-rose-400 block font-medium">
                        Desc: -R$ {prop.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
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
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-4 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 font-mono text-xs text-slate-400">
                    <span>Proposta Nº</span>
                    <span className="font-bold text-slate-200">{selectedProposal.proposal_number}</span>
                    <span>•</span>
                    <span>{formatDate(selectedProposal.created_at)}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1 break-words">{selectedProposal.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cliente: <strong className="text-slate-200">{clients.find(c => c.id === selectedProposal.client_id)?.trade_name}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleOpenEditProposal(selectedProposal)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center space-x-1"
                    title="Editar Proposta, Preços e Descrições de NRs"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Editar / Descontos</span>
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
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                    Serviços e Laudos Regulamentares ({selectedProposal.items.length})
                  </span>
                  <span className="text-[11px] text-slate-400">Escopos e Valores Customizados</span>
                </div>
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase bg-slate-900/60">
                      <tr>
                        <th className="py-3 px-3.5">Serviço Técnico / NR</th>
                        <th className="py-3 px-3.5 text-center">Qtd</th>
                        <th className="py-3 px-3.5 text-right">Unitário</th>
                        <th className="py-3 px-3.5 text-right">Desconto</th>
                        <th className="py-3 px-3.5 text-right">Total Líquido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedProposal.items.map((item, idx) => {
                        const itemDisc = item.discount || 0;
                        const hasDiscount = itemDisc > 0;

                        return (
                          <tr key={idx} className="hover:bg-slate-800/30 transition">
                            <td className="py-3.5 px-3.5">
                              <div className="font-bold text-slate-100">{item.service_name}</div>
                              <div className="text-[11px] text-slate-400 mt-1 whitespace-pre-line leading-relaxed">
                                {item.description}
                              </div>
                            </td>
                            <td className="py-3.5 px-3.5 text-center font-mono text-slate-300">
                              {item.quantity}
                            </td>
                            <td className="py-3.5 px-3.5 text-right font-mono text-slate-300">
                              R$ {item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-3.5 text-right font-mono">
                              {hasDiscount ? (
                                <span className="text-rose-400 text-[11px] font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                  - R$ {itemDisc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3.5 text-right font-mono font-bold text-emerald-400">
                              R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary Bento Box */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal Bruto (Soma dos Serviços):</span>
                  <span className="font-mono text-slate-200">
                    R$ {selectedProposal.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {selectedProposal.discount > 0 && (
                  <div className="flex justify-between text-rose-400 font-medium">
                    <span>Desconto Total Concedido:</span>
                    <span className="font-mono">
                      - R$ {selectedProposal.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                  <span>Valor Total da Proposta:</span>
                  <span className="font-mono text-emerald-400">
                    R$ {selectedProposal.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 leading-relaxed">
                  <strong className="text-slate-300">Observações & Faturamento:</strong> {selectedProposal.description || 'Condição padrão.'}
                </div>
                <div className="text-[11px] text-slate-500">
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
                  <span>Enviar ao Cliente (WhatsApp / E-mail)</span>
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

      {/* Builder / Edit Modal with Interactive NR Catalog Grid & Item Price/Description/Discount Customization */}
      {showBuilderModal && (
        <div id="modal-proposal-builder" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-900 rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-800 max-h-[92vh] overflow-y-auto text-slate-100 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingProposal ? 'Editar Proposta & Escopos de NRs' : 'Novo Orçamento & Proposta Comercial SST'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Selecione serviços do Catálogo de NRs, altere valores unitários, personalize descrições e aplique descontos.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowBuilderModal(false);
                  setEditingProposal(null);
                }} 
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProposal} className="space-y-6 text-xs">
              {/* Client & Proposal Info */}
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
                  <label className="block font-semibold text-slate-300 mb-1">Título da Proposta Comercial *</label>
                  <input
                    type="text"
                    required
                    value={builderTitle}
                    onChange={(e) => setBuilderTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Ex: Proposta de Gestão Integrada de SST e Laudos Técnicos 2026"
                  />
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION 1: CATÁLOGO DE SERVIÇOS & NRs (GRID INTERATIVO DE SELEÇÃO) */}
              {/* ========================================================================= */}
              <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-slate-200 text-xs">
                      Catálogo de Serviços de Normas Regulamentadoras (NRs)
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                      {filteredCatalog.length} disponíveis
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-[11px] font-semibold transition flex items-center self-start sm:self-auto space-x-1"
                  >
                    <Plus className="w-3 h-3 text-indigo-400" />
                    <span>+ Adicionar Item Personalizado / Avulso</span>
                  </button>
                </div>

                {/* Filters & Search in Catalog */}
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Pesquisar por NR (ex: NR-01, NR-10, NR-35, CIPA, LTCAT, Laudo, Treinamento)..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1 w-full sm:w-auto">
                    {[
                      { key: 'ALL', label: 'Todos' },
                      { key: 'PROGRAMAS', label: 'Programas' },
                      { key: 'LAUDOS', label: 'Laudos' },
                      { key: 'TREINAMENTOS', label: 'Treinamentos' },
                      { key: 'CONSULTORIA', label: 'Consultoria / CIPA' }
                    ].map(cat => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setCatalogCategory(cat.key)}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-medium transition ${
                          catalogCategory === cat.key
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* NR Catalog Selection Grid Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {filteredCatalog.map(tmpl => {
                    const isAlreadyAdded = builderItems.some(it => it.service_template_id === tmpl.id);

                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => handleAddItemFromCatalog(tmpl)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between group ${
                          isAlreadyAdded 
                            ? 'bg-emerald-950/20 border-emerald-500/40 hover:bg-emerald-950/30' 
                            : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {tmpl.code}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                              <Clock className="w-2.5 h-2.5" />
                              {tmpl.default_duration_days}d
                            </span>
                          </div>
                          <h4 className="font-bold text-white text-[11px] mt-1.5 line-clamp-1 group-hover:text-indigo-300 transition">
                            {tmpl.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                            {tmpl.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
                          <span className="font-mono text-[11px] font-bold text-emerald-400">
                            R$ {tmpl.default_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-400 flex items-center space-x-1 group-hover:translate-x-0.5 transition">
                            <span>{isAlreadyAdded ? '+ Incluir Outro' : '+ Selecionar'}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION 2: GRID DE SERVIÇOS SELECIONADOS (EDIÇÃO DE VALORES E DESCRIÇÕES) */}
              {/* ========================================================================= */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <label className="block font-bold text-slate-200 text-xs">
                      Itens do Orçamento Selecionados do Grid ({builderItems.length})
                    </label>
                  </div>

                  {/* Batch Discount Quick Helpers */}
                  {builderItems.length > 0 && (
                    <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-medium">Aplicar Desconto em Todos:</span>
                      {[0, 5, 10, 15, 20].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleApplyBatchDiscountToAllItems(pct)}
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-indigo-600 text-slate-300 hover:text-white text-[10px] font-mono border border-slate-800 transition"
                          title={`Aplicar ${pct}% de desconto em todos os itens`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {builderItems.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 text-slate-400">
                    <p className="text-xs">Nenhum serviço selecionado ainda. Clique em um dos serviços do Catálogo de NRs acima para incluir.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {builderItems.map((item, idx) => {
                      const itemGross = (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
                      const hasDiscount = (Number(item.discount) || 0) > 0;

                      return (
                        <div
                          key={item.id || idx}
                          className="p-4 bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-3 transition w-full overflow-hidden"
                        >
                          {/* Top Row: Service Name & Actions (Clean responsive containment) */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={item.service_name}
                                onChange={(e) => handleUpdateItemField(idx, 'service_name', e.target.value)}
                                className="w-full min-w-0 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500 truncate"
                                placeholder="Nome do Serviço / Norma Regulamentadora"
                              />
                            </div>

                            <div className="flex items-center space-x-1.5 flex-shrink-0 self-end sm:self-auto">
                              {!item.is_custom && item.service_template_id !== 'tmpl-custom' && (
                                <button
                                  type="button"
                                  onClick={() => handleResetItemToCatalog(idx)}
                                  className="p-1.5 px-2 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition text-[10px] flex items-center space-x-1 border border-slate-800"
                                  title="Restaurar preço e descrição original do catálogo"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span className="hidden sm:inline">Restaurar Padrão</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDuplicateItem(idx)}
                                className="p-1.5 px-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition text-[10px] flex items-center space-x-1 border border-slate-800"
                                title="Duplicar Item"
                              >
                                <Copy className="w-3 h-3" />
                                <span className="hidden sm:inline">Duplicar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl text-[11px] font-bold transition flex items-center space-x-1"
                                title="Remover do Orçamento"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                <span>Remover</span>
                              </button>
                            </div>
                          </div>

                          {/* Middle Row: Editable Description */}
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                              Descrição do Escopo Técnico & Metodologia (Totalmente Editável):
                            </label>
                            <textarea
                              rows={2}
                              value={item.description}
                              onChange={(e) => handleUpdateItemField(idx, 'description', e.target.value)}
                              className="w-full min-w-0 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                              placeholder="Detalhes do escopo técnico, metodologia aplicada, locais vistoriados, portarias e entregáveis deste laudo/treinamento..."
                            />
                          </div>

                          {/* Bottom Row: Values, Quantities, Discounts & Net Total in High-Contrast Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                            {/* Quantity */}
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                                Quantidade (Un/GHEs)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemField(idx, 'quantity', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white text-center focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            {/* Unit Price */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-semibold text-slate-400">
                                  Preço Unitário (R$)
                                </label>
                                {item.original_price && item.original_price !== item.unit_price && (
                                  <span className="text-[9px] text-slate-500 line-through font-mono">
                                    R${item.original_price}
                                  </span>
                                )}
                              </div>
                              <input
                                type="number"
                                min="0"
                                step="10"
                                value={item.unit_price}
                                onChange={(e) => handleUpdateItemField(idx, 'unit_price', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white font-bold focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            {/* Item Discount Controls */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-semibold text-slate-400">
                                  Desconto do Item
                                </label>
                                <div className="flex items-center bg-slate-950 rounded border border-slate-800 p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemField(idx, 'discount_type', 'PERCENT')}
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                      item.discount_type === 'PERCENT' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    %
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemField(idx, 'discount_type', 'FIXED')}
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                      item.discount_type === 'FIXED' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    R$
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.discount_value || 0}
                                  onChange={(e) => handleUpdateItemField(idx, 'discount_value', e.target.value)}
                                  className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-rose-300 focus:outline-none focus:border-rose-500"
                                />
                              </div>
                              {/* Quick discount chips */}
                              <div className="flex items-center gap-1 mt-1">
                                {[0, 5, 10, 15, 20].map(pct => (
                                  <button
                                    key={pct}
                                    type="button"
                                    onClick={() => handleSetQuickItemDiscount(idx, pct)}
                                    className="px-1 py-0.5 bg-slate-950 hover:bg-slate-800 text-[9px] font-mono text-slate-400 hover:text-slate-200 rounded border border-slate-800/80"
                                  >
                                    {pct}%
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Net Row Total */}
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col justify-between text-right">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-400">Total Líquido:</span>
                                {hasDiscount && (
                                  <span className="text-rose-400 font-mono text-[9px]">
                                    -R${item.discount?.toFixed(0)}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-sm font-bold text-emerald-300">
                                R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* SECTION 3: DESCONTO GLOBAL DA PROPOSTA & CONDIÇÕES DE PAGAMENTO */}
              {/* ========================================================================= */}
              <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Global Discount */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-300 text-xs">Desconto Global Adicional</label>
                      <div className="flex items-center bg-slate-900 rounded border border-slate-800 p-0.5">
                        <button
                          type="button"
                          onClick={() => setGlobalDiscountType('FIXED')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            globalDiscountType === 'FIXED' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          R$ Fixo
                        </button>
                        <button
                          type="button"
                          onClick={() => setGlobalDiscountType('PERCENT')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            globalDiscountType === 'PERCENT' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          % Geral
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={globalDiscountValue}
                        onChange={(e) => setGlobalDiscountValue(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-rose-300 focus:outline-none focus:border-indigo-500"
                        placeholder="0"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Aplicado sobre o saldo após descontos unitários.
                    </span>
                  </div>

                  {/* Validity Days */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1 text-xs">
                      Validade da Proposta (Dias)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={builderValidityDays}
                      onChange={(e) => setBuilderValidityDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Padrão comercial: 30 dias corridos.
                    </span>
                  </div>

                  {/* Payment Notes */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1 text-xs">
                      Condições de Faturamento & Observações
                    </label>
                    <textarea
                      rows={2}
                      value={builderNotes}
                      onChange={(e) => setBuilderNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      placeholder="Ex: Pagamento 50% na contratação e 50% na emissão do relatório final..."
                    />
                  </div>
                </div>

                {/* Final Summary Bento Box */}
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Subtotal Bruto</span>
                    <span className="font-mono text-slate-200 font-bold text-sm">
                      R$ {grossSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-rose-400 block">Descontos Totais</span>
                    <span className="font-mono text-rose-400 font-bold text-sm">
                      - R$ {totalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block">Economia Cliente</span>
                    <span className="font-mono text-indigo-300 font-bold text-sm">
                      {totalSavingsPercentage}%
                    </span>
                  </div>

                  <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-right">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Total Final Líquido</span>
                    <span className="font-mono text-base font-bold text-emerald-300">
                      R$ {netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowBuilderModal(false);
                    setEditingProposal(null);
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProposal ? 'Atualizar Proposta Comercial' : 'Salvar Proposta Comercial'}</span>
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
                onClick={() => handleSendProposal(selectedProposal, 'WHATSAPP')}
                className="w-full p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-left flex items-center justify-between text-xs font-semibold text-emerald-200 transition"
              >
                <div>
                  <div className="font-bold text-white">📱 Abrir no WhatsApp</div>
                  <div className="text-[10px] text-emerald-400">Abre o WhatsApp com a mensagem pronta para você enviar</div>
                </div>
                <Send className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                onClick={() => handleSendProposal(selectedProposal, 'EMAIL')}
                className="w-full p-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-2xl text-left flex items-center justify-between text-xs font-semibold text-indigo-200 transition"
              >
                <div>
                  <div className="font-bold text-white">✉️ Abrir no E-mail</div>
                  <div className="text-[10px] text-indigo-400">Abre seu programa de e-mail com a mensagem pronta</div>
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
