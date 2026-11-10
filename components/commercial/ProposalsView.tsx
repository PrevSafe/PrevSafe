'use client';

import React, { useState, useMemo } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Proposal, ProposalItem, ServiceTemplate, Client, PlanoDePagamento } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { shareViaChannel } from '@/lib/shareLinks';
import { cronogramaDoPlano, descreverPlano, faltasDoPlano, planoInformado, planoVazio } from '@/lib/planoDePagamento';
import { exportProposalPdf } from '@/lib/propostaPdf';
import { dataDeHoje, dataDoRegistro, diaDoRegistro } from '@/lib/datas';
import { PlanoDePagamentoEditor } from './PlanoDePagamentoEditor';
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
  Check,
  Download,
  Printer
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
    createContractFromProposal,
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
  // Sem cliente pre-selecionado: com dados reais, o primeiro da lista virava o
  // cliente de uma proposta que o usuario nao percebeu que era de outro.
  const [builderClientId, setBuilderClientId] = useState('');
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderValidityDays, setBuilderValidityDays] = useState(30);
  const [builderNotes, setBuilderNotes] = useState('');
  // Condicao de pagamento (lib/planoDePagamento.ts): vira a clausula 7 do contrato.
  const [builderPlano, setBuilderPlano] = useState<PlanoDePagamento>(planoVazio());
  
  // Catalog Search & Filter in Builder
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<string>('ALL');

  // Selected Items Grid State
  // Comeca vazio. Antes nascia com PGR a R$ 6.500, PCMSO a R$ 5.200 com R$ 500
  // de desconto e mais R$ 200 de desconto geral - valores de exemplo que
  // podiam ir para uma proposta real.
  const [builderItems, setBuilderItems] = useState<BuilderProposalItem[]>([]);

  // Global Proposal Discount State
  const [globalDiscountType, setGlobalDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);

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

  // Proposta nova abre vazia: cliente, titulo, servicos e condicoes sao
  // escolhidos por quem faz a proposta. Antes abria com o primeiro cliente da
  // lista, os dois primeiros servicos do catalogo e "Condicao padrao de
  // pagamento em parcelas mensais" - nada disso tinha sido combinado.
  const handleOpenNewProposal = () => {
    setEditingProposal(null);
    setBuilderClientId('');
    setBuilderTitle('');
    setBuilderValidityDays(30);
    setCatalogSearch('');
    setCatalogCategory('ALL');
    setBuilderItems([]);
    setGlobalDiscountType('FIXED');
    setGlobalDiscountValue(0);
    setBuilderNotes('');
    setBuilderPlano(planoVazio());
    setShowBuilderModal(true);
  };

  /** Dias que faltam ate a validade gravada: editar nao estende a proposta. */
  const diasAteAValidade = (validade: string) => {
    const fim = diaDoRegistro(validade);
    const hoje = dataDeHoje();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fim)) return 30;
    const dias = Math.round((Date.parse(`${fim}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 86400000);
    return Math.max(1, dias);
  };

  const handleOpenEditProposal = (prop: Proposal) => {
    setEditingProposal(prop);
    setBuilderClientId(prop.client_id);
    setBuilderTitle(prop.title);
    setBuilderValidityDays(diasAteAValidade(prop.valid_until));
    setCatalogSearch('');
    setCatalogCategory('ALL');
    setBuilderPlano(planoInformado(prop.payment_plan) ? JSON.parse(JSON.stringify(prop.payment_plan)) : planoVazio());

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
    if (!builderClientId || builderItems.length === 0 || !builderTitle.trim()) {
      alert('Selecione o cliente, dê um título à proposta e inclua ao menos um serviço no escopo.');
      return;
    }

    // Plano incompleto pode ser salvo (e rascunho), mas sem surpresa: o PDF e
    // o contrato nao o tratam como condicao combinada enquanto faltar algo.
    const plano = planoInformado(builderPlano) ? builderPlano : undefined;
    if (plano) {
      const faltas = faltasDoPlano(plano, netTotal);
      if (faltas.length > 0 && !confirm(
        `As condições de pagamento estão incompletas:\n\n• ${faltas.join('\n• ')}\n\n` +
        'Enquanto isso, o PDF da proposta e o contrato saem com a forma de pagamento em aberto. Salvar assim mesmo?'
      )) return;
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
        payment_plan: plano,
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
        payment_plan: plano,
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
      // So a condicao completa vai na mensagem: incompleta seria prometer o
      // que ainda nao foi definido.
      ...(planoInformado(prop.payment_plan) && faltasDoPlano(prop.payment_plan, prop.total).length === 0
        ? ['Forma de pagamento:', ...descreverPlano(prop.payment_plan).map((l) => `• ${l}`)]
        : []),
      `Validade: ${dataDoRegistro(prop.valid_until)}`,
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
    // Aprovar sem condicao de pagamento e permitido, mas o contrato nasce com a
    // clausula 7 em aberto - quem aprova fica sabendo antes.
    const faltasDoPagamento = faltasDoPlano(prop.payment_plan, prop.total);
    if (faltasDoPagamento.length > 0 && !confirm(
      `${planoInformado(prop.payment_plan) ? 'As condições de pagamento desta proposta estão incompletas' : 'Esta proposta não tem condições de pagamento'}.\n\n` +
      'O contrato será gerado com a forma de pagamento em aberto (Cláusula 7ª) e precisará do plano antes da assinatura. Aprovar assim mesmo?'
    )) return;

    approveProposal(prop.id);

    // O botao promete "Aprovar & Gerar Contrato" e o aviso dizia que o contrato
    // tinha sido gerado, mas nada chamava createContractFromProposal: a tela de
    // Contratos abria sem contrato nenhum, e criar um do zero vinha em branco.
    let contrato;
    try {
      contrato = createContractFromProposal(prop.id);
    } catch (err: any) {
      alert(
        `A proposta ${prop.proposal_number} foi aprovada, mas o contrato nao pode ser gerado.\n\n` +
        `${err?.message || 'Erro desconhecido'}\n\nGere o contrato manualmente na tela de Contratos.`
      );
      onNavigate('contracts');
      return;
    }

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    alert(
      `Proposta ${prop.proposal_number} aprovada.\n\n` +
      `Contrato ${contrato.contract_number} gerado com os dados da proposta ` +
      `(${formatCurrency(prop.total)}) e com a minuta preenchida, pronto para revisao e assinatura.`
    );
    onNavigate('contracts');
  };

  return (
    <div id="proposals-view-container" className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div id="proposals-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-superficie border border-borda rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center text-teal-800">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-tinta">Propostas Comerciais SST & Catálogo de NRs</h1>
            <p className="text-xs text-tinta-2 mt-0.5">
              Elaboração técnica com seleção em grid de NRs, edição completa de valores/descrições e motor de descontos (RN001).
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            id="btn-create-proposal"
            onClick={handleOpenNewProposal}
            className="bg-marca-escura px-4 py-2.5 text-white rounded-2xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
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
                    ? 'bg-superficie border-borda shadow-sm ring-1 ring-teal-500/40' 
                    : 'bg-superficie border-borda hover:border-borda hover:bg-superficie'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-tinta">{prop.proposal_number}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        prop.status === 'APPROVED' ? 'bg-marca-suave text-marca-escura border-marca-escura' :
                        prop.status === 'SENT' ? 'bg-teal-500/10 text-teal-800 border-teal-500/20' :
                        prop.status === 'VIEWED' ? 'bg-teal-500/10 text-teal-800 border-teal-500/20' :
                        prop.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-700 border-rose-500/20' : 'bg-superficie-2 text-tinta border-borda'
                      }`}>
                        {prop.status}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-tinta mt-2 truncate">{client?.trade_name}</div>
                    <div className="text-xs text-tinta-2 truncate mt-0.5">{prop.title}</div>
                  </div>
                  <div className="text-right font-mono flex-shrink-0">
                    <span className="text-sm font-bold text-marca-escura block">
                      R$ {prop.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {prop.discount > 0 && (
                      <span className="text-[10px] text-rose-700 block font-medium">
                        Desc: -R$ {prop.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    <span className="text-[10px] text-tinta-2 mt-1 block">
                      Validade: {dataDoRegistro(prop.valid_until)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Proposal Preview / Action Pane */}
        {selectedProposal ? (
          <div id="proposal-detail-pane" className="lg:col-span-7 bg-superficie p-6 rounded-3xl border border-borda shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-borda pb-4 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 font-mono text-xs text-tinta-2">
                    <span>Proposta Nº</span>
                    <span className="font-bold text-tinta">{selectedProposal.proposal_number}</span>
                    <span>•</span>
                    <span>{dataDoRegistro(selectedProposal.created_at)}</span>
                  </div>
                  <h2 className="text-lg font-bold text-tinta mt-1 break-words">{selectedProposal.title}</h2>
                  <p className="text-xs text-tinta-2 mt-0.5">
                    Cliente: <strong className="text-tinta">{clients.find(c => c.id === selectedProposal.client_id)?.trade_name}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleOpenEditProposal(selectedProposal)}
                    className="p-2 bg-superficie-2 hover:bg-superficie-3 text-tinta rounded-xl text-xs font-semibold border border-borda transition flex items-center space-x-1"
                    title="Editar Proposta, Preços e Descrições de NRs"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-teal-700" />
                    <span>Editar / Descontos</span>
                  </button>
                  <button
                    onClick={() => setDeletingProposal(selectedProposal)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 rounded-xl text-xs font-semibold border border-rose-500/20 transition"
                    title="Excluir Proposta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    selectedProposal.status === 'APPROVED' ? 'bg-marca-suave text-marca-escura border-marca-escura' :
                    selectedProposal.status === 'SENT' ? 'bg-teal-500/10 text-teal-800 border-teal-500/20' : 'bg-superficie-2 text-tinta border-borda'
                  }`}>
                    {selectedProposal.status}
                  </span>
                </div>
              </div>

              {/* Scope Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-tinta-2 tracking-wider">
                    Serviços e Laudos Regulamentares ({selectedProposal.items.length})
                  </span>
                  <span className="text-[11px] text-tinta-2">Escopos e Valores Customizados</span>
                </div>
                <div className="border border-borda rounded-2xl overflow-x-auto bg-fundo">
                  <table className="w-full text-left text-xs">
                    <thead className="text-tinta-2 font-semibold border-b border-borda text-[11px] uppercase bg-superficie">
                      <tr>
                        <th className="py-3 px-3.5">Serviço Técnico / NR</th>
                        <th className="py-3 px-3.5 text-center">Qtd</th>
                        <th className="py-3 px-3.5 text-right">Unitário</th>
                        <th className="py-3 px-3.5 text-right">Desconto</th>
                        <th className="py-3 px-3.5 text-right">Total Líquido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borda">
                      {selectedProposal.items.map((item, idx) => {
                        const itemDisc = item.discount || 0;
                        const hasDiscount = itemDisc > 0;

                        return (
                          <tr key={idx} className="hover:bg-superficie-2 transition">
                            <td className="py-3.5 px-3.5">
                              <div className="font-bold text-tinta">{item.service_name}</div>
                              <div className="text-[11px] text-tinta-2 mt-1 whitespace-pre-line leading-relaxed">
                                {item.description}
                              </div>
                            </td>
                            <td className="py-3.5 px-3.5 text-center font-mono text-tinta">
                              {item.quantity}
                            </td>
                            <td className="py-3.5 px-3.5 text-right font-mono text-tinta">
                              R$ {item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-3.5 text-right font-mono">
                              {hasDiscount ? (
                                <span className="text-rose-700 text-[11px] font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                  - R$ {itemDisc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-tinta-2 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3.5 text-right font-mono font-bold text-marca-escura">
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
              <div className="bg-fundo p-4 rounded-2xl border border-borda space-y-2 text-xs">
                <div className="flex justify-between text-tinta-2">
                  <span>Subtotal Bruto (Soma dos Serviços):</span>
                  <span className="font-mono text-tinta">
                    R$ {selectedProposal.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {selectedProposal.discount > 0 && (
                  <div className="flex justify-between text-rose-700 font-medium">
                    <span>Desconto Total Concedido:</span>
                    <span className="font-mono">
                      - R$ {selectedProposal.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-tinta pt-2 border-t border-borda">
                  <span>Valor Total da Proposta:</span>
                  <span className="font-mono text-marca-escura">
                    R$ {selectedProposal.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {/* Era "Condicao padrao." quando nao havia observacao: uma
                    condicao que ninguem definiu. */}
                <div className="text-[11px] text-tinta-2 pt-2 border-t border-borda leading-relaxed space-y-0.5">
                  <strong className="text-tinta block">Forma de pagamento:</strong>
                  {!planoInformado(selectedProposal.payment_plan) ? (
                    <span className="text-amber-700">Não definida. Edite a proposta para incluir as condições de pagamento.</span>
                  ) : faltasDoPlano(selectedProposal.payment_plan, selectedProposal.total).length > 0 ? (
                    <span className="text-amber-700">
                      Em definição: {faltasDoPlano(selectedProposal.payment_plan, selectedProposal.total)[0]}
                    </span>
                  ) : (
                    <>
                      {descreverPlano(selectedProposal.payment_plan).map((linha, i) => (
                        <span key={i} className="block text-tinta">{String.fromCharCode(97 + i)}) {linha}</span>
                      ))}
                      {selectedProposal.payment_plan?.observacoes?.trim() && (
                        <span className="block">Condição acordada: {selectedProposal.payment_plan.observacoes.trim()}</span>
                      )}
                      <span className="block text-tinta-2">{cronogramaDoPlano(selectedProposal.payment_plan).length} parcela(s) no cronograma.</span>
                    </>
                  )}
                </div>
                {selectedProposal.description?.trim() && (
                  <div className="text-[11px] text-tinta-2 leading-relaxed">
                    <strong className="text-tinta">Observações:</strong> {selectedProposal.description}
                  </div>
                )}
                <div className="text-[11px] text-tinta-2">
                  Validade da Proposta: Até {dataDoRegistro(selectedProposal.valid_until)}
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-4 border-t border-borda flex flex-wrap gap-2 justify-between items-center">
              <div className="flex flex-wrap gap-2">
                <button
                  id="btn-send-proposal"
                  onClick={() => setShowSendModal(true)}
                  className="bg-teal-700 px-3.5 py-2 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Enviar ao Cliente (WhatsApp / E-mail)</span>
                </button>
                {(['baixar', 'imprimir'] as const).map((acao) => (
                  <button
                    key={acao}
                    id={`btn-proposal-${acao}`}
                    onClick={() => {
                      try {
                        const r = exportProposalPdf({
                          proposal: selectedProposal,
                          client: clients.find(c => c.id === selectedProposal.client_id) || null,
                          organization,
                          acao
                        });
                        if (!r.ok && r.mensagem) alert(r.mensagem);
                      } catch (err: any) {
                        alert(`Não foi possível gerar o PDF da proposta.\n\n${err?.message || 'Erro desconhecido'}`);
                      }
                    }}
                    className="px-3.5 py-2 bg-superficie-2 hover:bg-superficie-3 text-tinta text-xs font-semibold rounded-xl border border-borda transition flex items-center space-x-1.5"
                  >
                    {acao === 'baixar' ? <Download className="w-3.5 h-3.5" /> : <Printer className="w-3.5 h-3.5" />}
                    <span>{acao === 'baixar' ? 'Baixar PDF' : 'Imprimir'}</span>
                  </button>
                ))}
              </div>

              {selectedProposal.status !== 'APPROVED' && (
                <div className="flex space-x-2">
                  <button
                    id="btn-reject-proposal"
                    onClick={() => {
                      // Era o motivo fixo "Preco acima do orcamento", gravado em
                      // toda recusa. O motivo e o que o cliente disse.
                      const motivo = window.prompt(`Motivo da recusa da proposta ${selectedProposal.proposal_number} (opcional):`, '');
                      if (motivo === null) return;
                      rejectProposal(selectedProposal.id, motivo.trim() || undefined);
                    }}
                    className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 text-xs font-semibold rounded-xl border border-rose-500/30 transition"
                  >
                    Recusar
                  </button>
                  <button
                    id="btn-approve-proposal"
                    onClick={() => handleApprove(selectedProposal)}
                    className="bg-marca-escura px-4 py-2 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
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
        <div id="modal-proposal-builder" className="fixed inset-0 bg-fundo backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-superficie rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-sm border border-borda max-h-[92vh] overflow-y-auto text-tinta space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-borda pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center justify-center text-teal-800">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-tinta">
                    {editingProposal ? 'Editar Proposta & Escopos de NRs' : 'Novo Orçamento & Proposta Comercial SST'}
                  </h3>
                  <p className="text-xs text-tinta-2">
                    Selecione serviços do Catálogo de NRs, altere valores unitários, personalize descrições e aplique descontos.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowBuilderModal(false);
                  setEditingProposal(null);
                }} 
                className="p-1.5 text-tinta-2 hover:text-tinta hover:bg-superficie-2 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProposal} className="space-y-6 text-xs">
              {/* Client & Proposal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-tinta mb-1">Cliente Contratante *</label>
                  <select
                    value={builderClientId}
                    onChange={(e) => setBuilderClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-fundo border border-borda rounded-xl text-xs text-tinta focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Selecione o cliente</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.trade_name} ({c.document_number})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-tinta mb-1">Título da Proposta Comercial *</label>
                  <input
                    type="text"
                    required
                    value={builderTitle}
                    onChange={(e) => setBuilderTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-fundo border border-borda rounded-xl text-xs text-tinta focus:outline-none focus:border-teal-500"
                    placeholder="Ex: Proposta de Gestão Integrada de SST e Laudos Técnicos 2026"
                  />
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION 1: CATÁLOGO DE SERVIÇOS & NRs (GRID INTERATIVO DE SELEÇÃO) */}
              {/* ========================================================================= */}
              <div className="p-4 bg-fundo rounded-2xl border border-borda space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-marca-escura" />
                    <span className="font-bold text-tinta text-xs">
                      Catálogo de Serviços de Normas Regulamentadoras (NRs)
                    </span>
                    <span className="text-[10px] text-tinta-2 bg-superficie-2 px-2 py-0.5 rounded-full">
                      {filteredCatalog.length} disponíveis
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 border border-teal-500/30 rounded-xl text-[11px] font-semibold transition flex items-center self-start sm:self-auto space-x-1"
                  >
                    <Plus className="w-3 h-3 text-teal-700" />
                    <span>+ Adicionar Item Personalizado / Avulso</span>
                  </button>
                </div>

                {/* Filters & Search in Catalog */}
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="w-3.5 h-3.5 text-tinta-2 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Pesquisar por NR (ex: NR-01, NR-10, NR-35, CIPA, LTCAT, Laudo, Treinamento)..."
                      className="w-full pl-9 pr-3 py-2 bg-superficie border border-borda rounded-xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500"
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
                            ? 'bg-teal-700 text-white font-bold'
                            : 'bg-superficie text-tinta-2 hover:text-tinta border border-borda'
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
                            ? 'bg-marca-suave border-marca-escura hover:bg-marca-suave' 
                            : 'bg-superficie border-borda hover:border-teal-500/50 hover:bg-superficie'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-800 border border-teal-500/20">
                              {tmpl.code}
                            </span>
                            <span className="text-[10px] text-tinta-2 flex items-center gap-1 font-mono">
                              <Clock className="w-2.5 h-2.5" />
                              {tmpl.default_duration_days}d
                            </span>
                          </div>
                          <h4 className="font-bold text-tinta text-[11px] mt-1.5 line-clamp-1 group-hover:text-teal-700 transition">
                            {tmpl.name}
                          </h4>
                          <p className="text-[10px] text-tinta-2 line-clamp-2 mt-0.5">
                            {tmpl.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-borda">
                          <span className="font-mono text-[11px] font-bold text-marca-escura">
                            R$ {tmpl.default_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-semibold text-teal-700 flex items-center space-x-1 group-hover:translate-x-0.5 transition">
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
                    <Layers className="w-4 h-4 text-teal-700" />
                    <label className="block font-bold text-tinta text-xs">
                      Itens do Orçamento Selecionados do Grid ({builderItems.length})
                    </label>
                  </div>

                  {/* Batch Discount Quick Helpers */}
                  {builderItems.length > 0 && (
                    <div className="flex items-center gap-1.5 self-start sm:self-auto bg-fundo px-2.5 py-1 rounded-xl border border-borda">
                      <span className="text-[10px] text-tinta-2 font-medium">Aplicar Desconto em Todos:</span>
                      {[0, 5, 10, 15, 20].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleApplyBatchDiscountToAllItems(pct)}
                          className="px-2 py-0.5 rounded bg-superficie hover:bg-teal-700 text-white hover:text-white text-[10px] font-mono border border-borda transition"
                          title={`Aplicar ${pct}% de desconto em todos os itens`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {builderItems.length === 0 ? (
                  <div className="p-8 text-center bg-fundo rounded-2xl border border-dashed border-borda text-tinta-2">
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
                          className="p-4 bg-fundo border border-borda hover:border-borda rounded-2xl space-y-3 transition w-full overflow-hidden"
                        >
                          {/* Top Row: Service Name & Actions (Clean responsive containment) */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="w-6 h-6 rounded-lg bg-superficie-2 text-tinta flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={item.service_name}
                                onChange={(e) => handleUpdateItemField(idx, 'service_name', e.target.value)}
                                className="w-full min-w-0 px-3 py-1.5 bg-superficie border border-borda rounded-xl text-xs font-bold text-tinta focus:outline-none focus:border-teal-500 truncate"
                                placeholder="Nome do Serviço / Norma Regulamentadora"
                              />
                            </div>

                            <div className="flex items-center space-x-1.5 flex-shrink-0 self-end sm:self-auto">
                              {!item.is_custom && item.service_template_id !== 'tmpl-custom' && (
                                <button
                                  type="button"
                                  onClick={() => handleResetItemToCatalog(idx)}
                                  className="p-1.5 px-2 text-tinta-2 hover:text-teal-700 hover:bg-superficie-2 rounded-lg transition text-[10px] flex items-center space-x-1 border border-borda"
                                  title="Restaurar preço e descrição original do catálogo"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span className="hidden sm:inline">Restaurar Padrão</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDuplicateItem(idx)}
                                className="p-1.5 px-2 text-tinta-2 hover:text-tinta hover:bg-superficie-2 rounded-lg transition text-[10px] flex items-center space-x-1 border border-borda"
                                title="Duplicar Item"
                              >
                                <Copy className="w-3 h-3" />
                                <span className="hidden sm:inline">Duplicar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 hover:text-rose-800 border border-rose-500/30 rounded-xl text-[11px] font-bold transition flex items-center space-x-1"
                                title="Remover do Orçamento"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                                <span>Remover</span>
                              </button>
                            </div>
                          </div>

                          {/* Middle Row: Editable Description */}
                          <div>
                            <label className="block text-[10px] font-semibold text-tinta-2 mb-1">
                              Descrição do Escopo Técnico & Metodologia (Totalmente Editável):
                            </label>
                            <textarea
                              rows={2}
                              value={item.description}
                              onChange={(e) => handleUpdateItemField(idx, 'description', e.target.value)}
                              className="w-full min-w-0 px-3 py-2 bg-superficie border border-borda rounded-xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500 leading-relaxed"
                              placeholder="Detalhes do escopo técnico, metodologia aplicada, locais vistoriados, portarias e entregáveis deste laudo/treinamento..."
                            />
                          </div>

                          {/* Bottom Row: Values, Quantities, Discounts & Net Total in High-Contrast Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-3 bg-superficie rounded-xl border border-borda">
                            {/* Quantity */}
                            <div>
                              <label className="block text-[10px] font-semibold text-tinta-2 mb-1">
                                Quantidade (Un/GHEs)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemField(idx, 'quantity', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-fundo border border-borda rounded-lg text-xs font-mono text-tinta text-center focus:outline-none focus:border-teal-500"
                              />
                            </div>

                            {/* Unit Price */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-semibold text-tinta-2">
                                  Preço Unitário (R$)
                                </label>
                                {item.original_price && item.original_price !== item.unit_price && (
                                  <span className="text-[9px] text-tinta-2 line-through font-mono">
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
                                className="w-full px-2.5 py-1.5 bg-fundo border border-borda rounded-lg text-xs font-mono text-tinta font-bold focus:outline-none focus:border-teal-500"
                              />
                            </div>

                            {/* Item Discount Controls */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-semibold text-tinta-2">
                                  Desconto do Item
                                </label>
                                <div className="flex items-center bg-fundo rounded border border-borda p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemField(idx, 'discount_type', 'PERCENT')}
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                      item.discount_type === 'PERCENT' ? 'bg-teal-700 text-white' : 'text-tinta hover:text-tinta'
                                    }`}
                                  >
                                    %
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemField(idx, 'discount_type', 'FIXED')}
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                      item.discount_type === 'FIXED' ? 'bg-teal-700 text-white' : 'text-tinta hover:text-tinta'
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
                                  className="w-full px-2 py-1.5 bg-fundo border border-borda rounded-lg text-xs font-mono text-rose-700 focus:outline-none focus:border-rose-500"
                                />
                              </div>
                              {/* Quick discount chips */}
                              <div className="flex items-center gap-1 mt-1">
                                {[0, 5, 10, 15, 20].map(pct => (
                                  <button
                                    key={pct}
                                    type="button"
                                    onClick={() => handleSetQuickItemDiscount(idx, pct)}
                                    className="px-1 py-0.5 bg-fundo hover:bg-superficie-2 text-[9px] font-mono text-tinta-2 hover:text-tinta rounded border border-borda"
                                  >
                                    {pct}%
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Net Row Total */}
                            <div className="p-2 bg-marca-suave border border-marca-escura rounded-xl flex flex-col justify-between text-right">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-tinta-2">Total Líquido:</span>
                                {hasDiscount && (
                                  <span className="text-rose-700 font-mono text-[9px]">
                                    -R${item.discount?.toFixed(0)}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-sm font-bold text-marca-escura">
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
              <div className="p-4 bg-fundo rounded-2xl border border-borda space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Global Discount */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-tinta text-xs">Desconto Global Adicional</label>
                      <div className="flex items-center bg-superficie rounded border border-borda p-0.5">
                        <button
                          type="button"
                          onClick={() => setGlobalDiscountType('FIXED')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            globalDiscountType === 'FIXED' ? 'bg-teal-700 text-white' : 'text-tinta'
                          }`}
                        >
                          R$ Fixo
                        </button>
                        <button
                          type="button"
                          onClick={() => setGlobalDiscountType('PERCENT')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            globalDiscountType === 'PERCENT' ? 'bg-teal-700 text-white' : 'text-tinta'
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
                        className="w-full px-3 py-2 bg-superficie border border-borda rounded-xl text-xs font-mono text-rose-700 focus:outline-none focus:border-teal-500"
                        placeholder="0"
                      />
                    </div>
                    <span className="text-[10px] text-tinta-2 mt-1 block">
                      Aplicado sobre o saldo após descontos unitários.
                    </span>
                  </div>

                  {/* Validity Days */}
                  <div>
                    <label className="block font-semibold text-tinta mb-1 text-xs">
                      Validade da Proposta (Dias)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={builderValidityDays}
                      onChange={(e) => setBuilderValidityDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-superficie border border-borda rounded-xl text-xs font-mono text-tinta focus:outline-none focus:border-teal-500"
                    />
                    <span className="text-[10px] text-tinta-2 mt-1 block">
                      Padrão comercial: 30 dias corridos.
                    </span>
                  </div>

                  {/* Observacoes. A forma de pagamento tem secao propria abaixo:
                      aqui ela era texto livre, que o contrato nao lia. */}
                  <div>
                    <label className="block font-semibold text-tinta mb-1 text-xs">
                      Observações da proposta
                    </label>
                    <textarea
                      rows={2}
                      value={builderNotes}
                      onChange={(e) => setBuilderNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-superficie border border-borda rounded-xl text-xs text-tinta focus:outline-none focus:border-teal-500"
                    />
                    <span className="text-[10px] text-tinta-2 mt-1 block">
                      Escopo, premissas ou exclusões. A forma de pagamento vai em Condições de pagamento, abaixo do total.
                    </span>
                  </div>
                </div>

                {/* Final Summary Bento Box */}
                <div className="p-4 bg-superficie rounded-2xl border border-borda grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-tinta-2 block">Subtotal Bruto</span>
                    <span className="font-mono text-tinta font-bold text-sm">
                      R$ {grossSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-rose-700 block">Descontos Totais</span>
                    <span className="font-mono text-rose-700 font-bold text-sm">
                      - R$ {totalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-teal-700 block">Economia Cliente</span>
                    <span className="font-mono text-teal-700 font-bold text-sm">
                      {totalSavingsPercentage}%
                    </span>
                  </div>

                  <div className="p-2.5 bg-marca-suave rounded-xl border border-marca-escura text-right">
                    <span className="text-[10px] uppercase font-bold text-marca-escura block">Total Final Líquido</span>
                    <span className="font-mono text-base font-bold text-marca-escura">
                      R$ {netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Condicoes de pagamento: distribuem o total liquido acima */}
              <div className="p-4 bg-fundo rounded-2xl border border-borda">
                <PlanoDePagamentoEditor plano={builderPlano} onChange={setBuilderPlano} total={netTotal} />
              </div>

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-borda">
                <button
                  type="button"
                  onClick={() => {
                    setShowBuilderModal(false);
                    setEditingProposal(null);
                  }}
                  className="px-4 py-2.5 bg-superficie-2 hover:bg-superficie-3 text-tinta rounded-xl text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-marca-escura px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
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
        <div id="modal-delete-proposal" className="fixed inset-0 bg-fundo backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-superficie rounded-3xl max-w-md w-full p-6 shadow-sm border border-rose-200 text-tinta space-y-4">
            <div className="flex items-center space-x-3 text-rose-700">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-tinta">Excluir Proposta</h3>
                <p className="text-xs text-tinta-2">Esta ação removerá a proposta comercial do sistema.</p>
              </div>
            </div>

            <p className="text-xs text-tinta">
              Tem certeza de que deseja remover a proposta <strong className="text-tinta">{deletingProposal.proposal_number}</strong> ({deletingProposal.title})?
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProposal(null)}
                className="px-4 py-2 bg-superficie-2 hover:bg-superficie-3 text-tinta rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteProposalConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multichannel Send Modal */}
      {showSendModal && selectedProposal && (
        <div className="fixed inset-0 bg-fundo backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-superficie rounded-3xl max-w-md w-full p-6 shadow-sm border border-borda text-tinta">
            <div className="flex items-center justify-between border-b border-borda pb-3 mb-3">
              <h3 className="text-sm font-bold text-tinta">Enviar Proposta ao Cliente</h3>
              <button onClick={() => setShowSendModal(false)} className="text-tinta-2 hover:text-tinta">✕</button>
            </div>
            <p className="text-xs text-tinta-2 mb-4">
              Escolha o canal de transmissão direta para a diretoria/RH da empresa contratante:
            </p>
            <div className="space-y-2.5">
              <button
                onClick={() => handleSendProposal(selectedProposal, 'WHATSAPP')}
                className="w-full p-4 bg-marca-suave hover:bg-marca-suave border border-marca-escura rounded-2xl text-left flex items-center justify-between text-xs font-semibold text-marca-escura transition"
              >
                <div>
                  <div className="font-bold text-tinta">📱 Abrir no WhatsApp</div>
                  <div className="text-[10px] text-marca-escura">Abre o WhatsApp com a mensagem pronta para você enviar</div>
                </div>
                <Send className="w-4 h-4 text-marca-escura" />
              </button>

              <button
                onClick={() => handleSendProposal(selectedProposal, 'EMAIL')}
                className="w-full p-4 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-2xl text-left flex items-center justify-between text-xs font-semibold text-teal-800 transition"
              >
                <div>
                  <div className="font-bold text-tinta">✉️ Abrir no E-mail</div>
                  <div className="text-[10px] text-teal-700">Abre seu programa de e-mail com a mensagem pronta</div>
                </div>
                <Send className="w-4 h-4 text-teal-700" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
