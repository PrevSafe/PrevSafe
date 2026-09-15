'use client';

import React, { useState, useMemo } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  FinancialTransaction, 
  FinancialTransactionType, 
  FinancialTransactionStatus, 
  FinancialCategoryKey, 
  FinancialPaymentMethod,
  FinancialReconciliationStatus,
  ChannelType
} from '@/types';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Filter,
  Plus,
  Search,
  FileText,
  CreditCard,
  Building,
  User,
  Trash2,
  Edit,
  Check,
  Send,
  Download,
  Share2,
  RefreshCw,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  Sparkles,
  QrCode,
  FileSignature,
  Briefcase,
  Activity,
  AlertCircle,
  Copy,
  Printer,
  ChevronRight,
  ShieldCheck,
  SlidersHorizontal,
  X,
  BellRing,
  CheckCheck,
  FileCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ReconciliationTab } from './ReconciliationTab';
import { DueSoonAlertsTab } from './DueSoonAlertsTab';
import { FinancialReconciliationModal } from './FinancialReconciliationModal';
import { FinancialReminderModal } from './FinancialReminderModal';

interface FinancialViewProps {
  onNavigate?: (view: string) => void;
}

export const FinancialView: React.FC<FinancialViewProps> = ({ onNavigate }) => {
  const { 
    transactions = [], 
    cashFlowSummary, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction, 
    settleTransaction,
    markTransactionAsPaidOrReceived,
    reconcileTransaction,
    unreconcileTransaction,
    batchReconcileTransactions,
    generateDueSoonFinancialAlerts,
    sendFinancialReminder,
    generateReceivableFromContract,
    generateReceivableFromServiceOrder,
    contracts = [], 
    serviceOrders = [], 
    clients = [], 
    currentProfile
  } = usePrevSafe();

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'receivables' | 'payables' | 'reconciliation' | 'alerts' | 'dre' | 'billing'>('overview');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reconciliationFilter, setReconciliationFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<'30' | '60' | '90' | 'ALL'>('ALL');

  // Modals state
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [txTypeToCreate, setTxTypeToCreate] = useState<FinancialTransactionType>('RECEIVABLE');
  const [selectedTxForSettlement, setSelectedTxForSettlement] = useState<FinancialTransaction | null>(null);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<FinancialTransaction | null>(null);
  const [selectedTxForReconciliation, setSelectedTxForReconciliation] = useState<FinancialTransaction | null>(null);
  const [selectedTxForReminder, setSelectedTxForReminder] = useState<FinancialTransaction | null>(null);
  const [editingTx, setEditingTx] = useState<FinancialTransaction | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Settlement Form State
  const [settlementDate, setSettlementDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [settlementMethod, setSettlementMethod] = useState<FinancialPaymentMethod>('PIX');
  const [settlementDiscount, setSettlementDiscount] = useState<number>(0);
  const [settlementInterest, setSettlementInterest] = useState<number>(0);
  const [settlementNotes, setSettlementNotes] = useState<string>('');

  // New Transaction Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newCategory, setNewCategory] = useState<FinancialCategoryKey>('MENSALIDADE_SST');
  const [newAmount, setNewAmount] = useState<number | ''>('');
  const [newDueDate, setNewDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newPaymentMethod, setNewPaymentMethod] = useState<FinancialPaymentMethod>('BOLETO');
  const [newDocNumber, setNewDocNumber] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const showNotification = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  // Helper formatting
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const [y, m, d] = dateStr.split('T')[0].split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return dateStr;
    }
  };

  // Filtered lists
  const receivables = useMemo(() => {
    return transactions.filter(t => t.type === 'RECEIVABLE');
  }, [transactions]);

  const payables = useMemo(() => {
    return transactions.filter(t => t.type === 'PAYABLE');
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let list = transactions;

    if (activeTab === 'receivables') {
      list = list.filter(t => t.type === 'RECEIVABLE');
    } else if (activeTab === 'payables') {
      list = list.filter(t => t.type === 'PAYABLE');
    }

    if (statusFilter !== 'ALL') {
      list = list.filter(t => t.status === statusFilter);
    }

    if (categoryFilter !== 'ALL') {
      list = list.filter(t => t.category === categoryFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(t => 
        t.title.toLowerCase().includes(term) ||
        (t.client_name && t.client_name.toLowerCase().includes(term)) ||
        (t.supplier_name && t.supplier_name.toLowerCase().includes(term)) ||
        (t.document_number && t.document_number.toLowerCase().includes(term)) ||
        t.category_name.toLowerCase().includes(term)
      );
    }

    return list.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  }, [transactions, activeTab, statusFilter, categoryFilter, searchTerm]);

  // Cash flow chart data (Daily / Monthly Projection)
  const cashFlowTimelineData = useMemo(() => {
    return [
      { mes: 'Mai/26', entradas: 32400, saidas: 18200, saldo: 42100 },
      { mes: 'Jun/26', entradas: 36800, saidas: 19500, saldo: 46200 },
      { mes: 'Jul/26', entradas: 41200, saidas: 21400, saldo: 48500 },
      { 
        mes: 'Ago/26 (Atual)', 
        entradas: cashFlowSummary.total_receivable_month, 
        saidas: cashFlowSummary.total_payable_month, 
        saldo: cashFlowSummary.current_balance 
      },
      { 
        mes: 'Set/26 (Proj.)', 
        entradas: cashFlowSummary.total_receivable_month * 1.08, 
        saidas: cashFlowSummary.total_payable_month * 1.02, 
        saldo: cashFlowSummary.projected_balance_30d 
      },
      { 
        mes: 'Out/26 (Proj.)', 
        entradas: cashFlowSummary.total_receivable_month * 1.15, 
        saidas: cashFlowSummary.total_payable_month * 1.05, 
        saldo: cashFlowSummary.projected_balance_60d 
      },
    ];
  }, [cashFlowSummary]);

  // Category Distribution Data
  const revenueByCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    receivables.forEach(r => {
      map[r.category_name] = (map[r.category_name] || 0) + r.final_amount;
    });
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];
    return Object.entries(map).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length]
    }));
  }, [receivables]);

  const expenseByCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    payables.forEach(p => {
      map[p.category_name] = (map[p.category_name] || 0) + p.final_amount;
    });
    const colors = ['#ef4444', '#f97316', '#eab308', '#6366f1', '#14b8a6', '#a855f7'];
    return Object.entries(map).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length]
    }));
  }, [payables]);

  // Handlers
  const handleOpenNewModal = (type: FinancialTransactionType) => {
    setTxTypeToCreate(type);
    setNewTitle('');
    setNewDescription('');
    setNewClientId(clients[0]?.id || '');
    setNewSupplierName('');
    setNewCategory(type === 'RECEIVABLE' ? 'MENSALIDADE_SST' : 'HONORARIOS_MEDICOS');
    setNewAmount('');
    setNewDueDate(new Date().toISOString().split('T')[0]);
    setNewPaymentMethod(type === 'RECEIVABLE' ? 'BOLETO' : 'PIX');
    setNewDocNumber('');
    setNewNotes('');
    setIsNewTxModalOpen(true);
  };

  const handleSaveNewTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount || Number(newAmount) <= 0) {
      alert('Preencha o título e um valor válido.');
      return;
    }

    const selectedClient = clients.find(c => c.id === newClientId);

    let catName = 'Outros Serviços SST';
    if (newCategory === 'MENSALIDADE_SST') catName = 'Mensalidade de Gestão SST';
    else if (newCategory === 'ELABORACAO_PGR_PCMSO') catName = 'Elaboração PGR / PCMSO';
    else if (newCategory === 'LAUDOS_LTCAT_INSALUBRIDADE') catName = 'Laudos Técnicos (LTCAT / Insalubridade)';
    else if (newCategory === 'EXAMES_CLINICOS_ASO') catName = 'Exames Médicos & ASO';
    else if (newCategory === 'TREINAMENTOS_NR') catName = 'Treinamentos de NRs';
    else if (newCategory === 'EVENTOS_ESOCIAL_SST') catName = 'Transmissão eSocial SST';
    else if (newCategory === 'HONORARIOS_MEDICOS') catName = 'Honorários Médicos (PCMSO)';
    else if (newCategory === 'HONORARIOS_ENGENHARIA_TECNICO') catName = 'Honorários Engenharia & Técnicos';
    else if (newCategory === 'CLINICAS_LABORATORIOS_PARCEIROS') catName = 'Clínicas & Laboratórios Credenciados';
    else if (newCategory === 'CALIBRACAO_EQUIPAMENTOS') catName = 'Calibração de Equipamentos SST';
    else if (newCategory === 'SOFTWARES_LICENCAS') catName = 'Softwares, Nuvem & Licenças';
    else if (newCategory === 'ALUGUEL_INSTALACOES') catName = 'Aluguel & Infraestrutura Física';
    else if (newCategory === 'IMPOSTOS_TRIBUTOS') catName = 'Impostos & Tributos';
    else if (newCategory === 'MARKETING_COMERCIAL') catName = 'Marketing & Comercial';
    else if (newCategory === 'DESPESAS_ADMINISTRATIVAS') catName = 'Despesas Administrativas';

    addTransaction({
      type: txTypeToCreate,
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      client_id: txTypeToCreate === 'RECEIVABLE' ? newClientId : undefined,
      client_name: txTypeToCreate === 'RECEIVABLE' ? (selectedClient?.trade_name || selectedClient?.legal_name || 'Cliente PrevSafe') : undefined,
      supplier_name: txTypeToCreate === 'PAYABLE' ? newSupplierName.trim() : undefined,
      category: newCategory,
      category_name: catName,
      amount: Number(newAmount),
      discount: 0,
      fine_interest: 0,
      final_amount: Number(newAmount),
      due_date: newDueDate,
      payment_method: newPaymentMethod,
      document_number: newDocNumber.trim() || undefined,
      notes: newNotes.trim() || undefined,
      status: 'PENDING'
    });

    setIsNewTxModalOpen(false);
    showNotification(`✅ Lançamento financeiro "${newTitle}" criado com sucesso!`);
  };

  const handleOpenSettlement = (tx: FinancialTransaction) => {
    setSelectedTxForSettlement(tx);
    setSettlementDate(new Date().toISOString().split('T')[0]);
    setSettlementMethod(tx.payment_method || 'PIX');
    setSettlementDiscount(tx.discount || 0);
    setSettlementInterest(tx.fine_interest || 0);
    setSettlementNotes('');
  };

  const handleConfirmSettlement = () => {
    if (!selectedTxForSettlement) return;

    settleTransaction(selectedTxForSettlement.id, {
      payment_date: settlementDate,
      payment_method: settlementMethod,
      discount: Number(settlementDiscount) || 0,
      fine_interest: Number(settlementInterest) || 0,
      notes: settlementNotes.trim() || undefined
    });

    showNotification(`💰 Título "${selectedTxForSettlement.title}" liquidado com sucesso!`);
    setSelectedTxForSettlement(null);
  };

  const handleBatchContractBilling = () => {
    let count = 0;
    const refMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    contracts.forEach(contract => {
      // Check if already billed this month
      const alreadyBilled = transactions.some(
        t => t.contract_id === contract.id && t.title.includes(refMonth)
      );

      if (!alreadyBilled && contract.status === 'ACTIVE') {
        generateReceivableFromContract(contract.id, refMonth);
        count++;
      }
    });

    if (count > 0) {
      showNotification(`🚀 Faturamento em lote concluído! ${count} faturas de contratos (MRR) geradas.`);
    } else {
      showNotification(`ℹ️ Todos os contratos ativos já possuem faturamento emitido para este mês.`);
    }
  };

  const copyPixToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionSuccessMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-950/95 border border-emerald-500/80 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center space-x-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{actionSuccessMessage}</span>
        </div>
      )}

      {/* Header & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Gestão Financeira & Fluxo de Caixa</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  PrevSafe Finance
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Contas a pagar, contas a receber, DRE gerencial de SST e conciliação de contratos (MRR).
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenNewModal('RECEIVABLE')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 flex items-center space-x-1.5 transition active:scale-95 touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Receita</span>
          </button>
          <button
            onClick={() => handleOpenNewModal('PAYABLE')}
            className="px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/40 flex items-center space-x-1.5 transition active:scale-95 touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Despesa</span>
          </button>
          <button
            onClick={handleBatchContractBilling}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 touch-manipulation"
            title="Gera cobranças de mensalidade de todos os contratos SST ativos"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Faturar Contratos (MRR)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Saldo Atual */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Saldo em Caixa</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-lg font-bold text-emerald-400 tracking-tight">
              {formatCurrency(cashFlowSummary.current_balance)}
            </div>
            <div className="mt-0.5 flex items-center space-x-1 text-[10px] text-slate-400">
              <span className="text-emerald-400 font-semibold flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +14.2%
              </span>
              <span>vs. ant.</span>
            </div>
          </div>
        </div>

        {/* A Receber no Mês */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 relative overflow-hidden group hover:border-blue-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">A Receber (Mês)</span>
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-lg font-bold text-blue-400 tracking-tight">
              {formatCurrency(cashFlowSummary.total_receivable_month)}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400 truncate">
              Realizado: <span className="text-emerald-400 font-medium">{formatCurrency(cashFlowSummary.received_month)}</span>
            </div>
          </div>
        </div>

        {/* A Pagar no Mês */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 relative overflow-hidden group hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">A Pagar (Mês)</span>
            <div className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-lg font-bold text-rose-400 tracking-tight">
              {formatCurrency(cashFlowSummary.total_payable_month)}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400 truncate">
              Quitado: <span className="text-slate-300 font-medium">{formatCurrency(cashFlowSummary.paid_month)}</span>
            </div>
          </div>
        </div>

        {/* Status de Conciliação Bancária */}
        <div 
          onClick={() => setActiveTab('reconciliation')}
          className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 hover:border-emerald-500/60 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Conciliação</span>
            <div className="w-6 h-6 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-lg font-bold text-teal-400 tracking-tight flex items-center space-x-1.5">
              <span>{cashFlowSummary.reconciled_count || 0}</span>
              <span className="text-xs text-slate-500 font-normal">/ {transactions.length} auditados</span>
            </div>
            <div className="mt-0.5 text-[10px] text-amber-400/90 truncate">
              {cashFlowSummary.pending_reconciliation_count || 0} pendentes de extrato
            </div>
          </div>
        </div>

        {/* Alertas de Vencimento Próximo */}
        <div 
          onClick={() => setActiveTab('alerts')}
          className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 hover:border-amber-500/60 transition cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Alertas Vencimento</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <BellRing className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-lg font-bold text-amber-400 tracking-tight flex items-center space-x-1.5">
              <span>{cashFlowSummary.due_soon_count || 0}</span>
              <span className="text-xs text-slate-400 font-normal">a vencer (5d)</span>
            </div>
            <div className="mt-0.5 text-[10px] text-rose-400 truncate font-semibold">
              {cashFlowSummary.overdue_count || 0} títulos em atraso
            </div>
          </div>
        </div>

        {/* Inadimplência & Atrasos */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Inadimplência</span>
            <div className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-lg font-bold text-rose-400 tracking-tight">
              {cashFlowSummary.default_rate_percent}%
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400 truncate">
              Vencidos: <span className="text-rose-300 font-semibold">{formatCurrency(cashFlowSummary.overdue_receivables)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Fluxo de Caixa & Gráficos</span>
          </button>

          <button
            onClick={() => setActiveTab('receivables')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'receivables'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Contas a Receber ({receivables.length})</span>
            {cashFlowSummary.overdue_receivables > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('payables')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'payables'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>Contas a Pagar ({payables.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'reconciliation'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Conciliação Bancária ({cashFlowSummary.pending_reconciliation_count || 0} pendentes)</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BellRing className="w-4 h-4 text-amber-400" />
            <span>Alertas de Vencimento ({ (cashFlowSummary.due_soon_count || 0) + (cashFlowSummary.overdue_count || 0) })</span>
          </button>

          <button
            onClick={() => setActiveTab('dre')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'dre'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
            <span>DRE Gerencial SST</span>
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'billing'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileSignature className="w-4 h-4" />
            <span>Faturamento de Contratos & OS</span>
          </button>
        </div>

        {/* Global Filter Search Bar (for lists) */}
        {(activeTab === 'receivables' || activeTab === 'payables' || activeTab === 'overview') && (
          <div className="flex items-center space-x-2">
            <div className="relative min-w-[180px] sm:min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por cliente, título, doc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/60"
            >
              <option value="ALL">Status: Todos</option>
              <option value="PENDING">Pendentes / A Vencer</option>
              <option value="OVERDUE">Vencidos (Atraso)</option>
              <option value="PAID">Liquidados / Pagos</option>
            </select>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VISÃO GERAL / FLUXO DE CAIXA */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Chart Card */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Evolução do Fluxo de Caixa (Realizado vs. Projetado)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Histórico de entradas/saídas e projeção de liquidez para os próximos períodos de SST.
                </p>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-slate-300">Entradas (Receitas)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-sm bg-rose-500" />
                  <span className="text-slate-300">Saídas (Custos/Despesas)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-sm bg-cyan-400" />
                  <span className="text-slate-300">Saldo Caixa</span>
                </div>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowTimelineData}>
                  <defs>
                    <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  />
                  <Area type="monotone" dataKey="entradas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEntradas)" name="Receitas" />
                  <Area type="monotone" dataKey="saidas" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorSaidas)" name="Despesas" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Receitas por Linha de Serviço */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
              <h4 className="text-sm font-bold text-white mb-1 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Origem das Receitas por Serviço SST</span>
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Composição do faturamento entre programas regulatórios, exames e mensalidades.
              </p>

              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {revenueByCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Total']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                {revenueByCategoryData.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-[11px]">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300 truncate">{item.name}:</span>
                    <span className="font-semibold text-white">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Despesas por Categoria */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
              <h4 className="text-sm font-bold text-white mb-1 flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span>Distribuição de Custos Operacionais & Despesas</span>
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Honorários médicos, clínicas credenciadas, metrologia RBC e infraestrutura.
              </p>

              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {expenseByCategoryData.map((entry, index) => (
                        <Cell key={`cell-exp-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Total']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                {expenseByCategoryData.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-[11px]">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300 truncate">{item.name}:</span>
                    <span className="font-semibold text-white">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Action Matrix for SST Financial Workflows */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer" onClick={() => setActiveTab('receivables')}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">Contas a Receber</span>
                <ChevronRight className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs text-slate-400">
                {receivables.filter(r => r.status === 'PENDING').length} títulos pendentes e {receivables.filter(r => r.status === 'OVERDUE').length} em atraso.
              </p>
              <div className="mt-3 text-sm font-bold text-emerald-400">
                {formatCurrency(receivables.reduce((acc, curr) => curr.status !== 'PAID' ? acc + curr.final_amount : acc, 0))} a liquidar
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 transition cursor-pointer" onClick={() => setActiveTab('payables')}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">Contas a Pagar</span>
                <ChevronRight className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-xs text-slate-400">
                Honorários médicos, laudos credenciados e custos fixos operacionais.
              </p>
              <div className="mt-3 text-sm font-bold text-rose-400">
                {formatCurrency(payables.reduce((acc, curr) => curr.status !== 'PAID' ? acc + curr.final_amount : acc, 0))} a pagar
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 transition cursor-pointer" onClick={() => setActiveTab('dre')}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">Margem de Lucro SST</span>
                <ChevronRight className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-xs text-slate-400">
                DRE Gerencial detalhado com apuração de margem por contrato.
              </p>
              <div className="mt-3 text-sm font-bold text-purple-300">
                Margem Operacional ~48.5%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2 & 3: CONTAS A RECEBER / CONTAS A PAGAR */}
      {/* ========================================================================= */}
      {(activeTab === 'receivables' || activeTab === 'payables') && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-300">
                Exibindo {filteredTransactions.length} lançamentos de {activeTab === 'receivables' ? 'Contas a Receber' : 'Contas a Pagar'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleOpenNewModal(activeTab === 'receivables' ? 'RECEIVABLE' : 'PAYABLE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center space-x-1.5 transition ${
                  activeTab === 'receivables' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{activeTab === 'receivables' ? 'Novo Título a Receber' : 'Novo Título a Pagar'}</span>
              </button>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Status / Baixa</th>
                    <th className="py-3.5 px-4">Conciliação</th>
                    <th className="py-3.5 px-4">Título / Descrição</th>
                    <th className="py-3.5 px-4">{activeTab === 'receivables' ? 'Cliente' : 'Fornecedor / Credenciado'}</th>
                    <th className="py-3.5 px-4">Categoria SST</th>
                    <th className="py-3.5 px-4">Vencimento</th>
                    <th className="py-3.5 px-4 text-right">Valor Final</th>
                    <th className="py-3.5 px-4 text-center">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-500">
                        Nenhum lançamento encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isPaid = tx.status === 'PAID';
                      const isOverdue = tx.status === 'OVERDUE';
                      const isPending = tx.status === 'PENDING';
                      const reconStatus = tx.reconciliation_status || 'PENDING_RECONCILIATION';

                      return (
                        <tr 
                          key={tx.id} 
                          className="hover:bg-slate-800/40 transition group"
                        >
                          {/* Status Badge & Quick Toggle */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              {isPaid && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 w-fit">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>{tx.type === 'RECEIVABLE' ? 'Recebido' : 'Pago'}</span>
                                </span>
                              )}
                              {isOverdue && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 w-fit">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  <span>Vencido</span>
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 w-fit">
                                  <Clock className="w-3 h-3 text-blue-400" />
                                  <span>A Vencer</span>
                                </span>
                              )}

                              {/* Quick Mark toggle */}
                              <button
                                onClick={() => {
                                  if (!isPaid) {
                                    markTransactionAsPaidOrReceived(tx.id, { auto_reconcile: true });
                                    showNotification(`✅ Título "${tx.title}" marcado como ${tx.type === 'RECEIVABLE' ? 'RECEBIDO' : 'PAGO'} e conciliado!`);
                                  } else {
                                    updateTransaction(tx.id, {
                                      status: 'PENDING',
                                      payment_date: undefined,
                                      reconciliation_status: 'PENDING_RECONCILIATION',
                                      reconciled_at: undefined,
                                      reconciled_by: undefined
                                    });
                                    showNotification(`↩️ Título "${tx.title}" reaberto como PENDENTE.`);
                                  }
                                }}
                                className={`text-[9px] font-medium underline transition text-left ${
                                  isPaid ? 'text-slate-500 hover:text-amber-400' : 'text-emerald-400 hover:text-emerald-300'
                                }`}
                              >
                                {isPaid ? 'Reabrir pendência' : `Marcar como ${tx.type === 'RECEIVABLE' ? 'recebido' : 'pago'}`}
                              </button>
                            </div>
                          </td>

                          {/* Conciliação Bancária Status */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {reconStatus === 'RECONCILED' && (
                              <button
                                onClick={() => setSelectedTxForReconciliation(tx)}
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 transition"
                                title="Conciliado com extrato. Clique para ver detalhes"
                              >
                                <CheckCheck className="w-3 h-3 text-teal-400" />
                                <span>Conciliado</span>
                              </button>
                            )}
                            {reconStatus === 'PENDING_RECONCILIATION' && (
                              <button
                                onClick={() => setSelectedTxForReconciliation(tx)}
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition"
                                title="Pendente de conciliação bancária. Clique para conciliar"
                              >
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>Pendente</span>
                              </button>
                            )}
                            {reconStatus === 'DISCREPANCY' && (
                              <button
                                onClick={() => setSelectedTxForReconciliation(tx)}
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition"
                                title="Divergência de valor identificada no extrato"
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                <span>Divergência</span>
                              </button>
                            )}
                            {reconStatus === 'UNRECONCILED' && (
                              <button
                                onClick={() => setSelectedTxForReconciliation(tx)}
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 transition"
                              >
                                <span>Não conciliado</span>
                              </button>
                            )}
                            {tx.reconciled_at && (
                              <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                Ref: {tx.reconciliation_ref || 'OK'}
                              </div>
                            )}
                          </td>

                          {/* Title & Document */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-100 max-w-[260px] truncate" title={tx.title}>
                              {tx.title}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                              {tx.document_number && (
                                <span className="font-mono bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                                  {tx.document_number}
                                </span>
                              )}
                              {tx.payment_method && (
                                <span>{tx.payment_method}</span>
                              )}
                            </div>
                          </td>

                          {/* Client or Supplier */}
                          <td className="py-3 px-4 text-slate-300 max-w-[180px] truncate">
                            {activeTab === 'receivables' ? (
                              <div className="flex items-center space-x-1.5" title={tx.client_name}>
                                <Building className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span>{tx.client_name || 'Cliente Geral'}</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1.5" title={tx.supplier_name}>
                                <User className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span>{tx.supplier_name || 'Fornecedor PrevSafe'}</span>
                              </div>
                            )}
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4 text-slate-300">
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
                              {tx.category_name}
                            </span>
                          </td>

                          {/* Due Date */}
                          <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                            <div className="flex items-center space-x-1 font-mono text-[11px]">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>{formatDate(tx.due_date)}</span>
                            </div>
                            {tx.payment_date && (
                              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                                Pago em: {formatDate(tx.payment_date)}
                              </div>
                            )}
                          </td>

                          {/* Final Amount */}
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            <div className={`font-bold font-mono text-sm ${
                              tx.type === 'RECEIVABLE' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {tx.type === 'RECEIVABLE' ? '+' : '-'} {formatCurrency(tx.final_amount)}
                            </div>
                            {tx.discount ? (
                              <div className="text-[10px] text-slate-500">Desc: -{formatCurrency(tx.discount)}</div>
                            ) : null}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* Baixar Detalhada */}
                              {!isPaid && (
                                <button
                                  onClick={() => handleOpenSettlement(tx)}
                                  className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white transition"
                                  title="Liquidação Detalhada (Juros/Desconto)"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Conciliação Modal */}
                              <button
                                onClick={() => setSelectedTxForReconciliation(tx)}
                                className="p-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600 text-teal-300 hover:text-white transition"
                                title="Conciliar com Extrato Bancário"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </button>

                              {/* Lembrete de Cobrança / Notificação */}
                              {tx.type === 'RECEIVABLE' && !isPaid && (
                                <button
                                  onClick={() => setSelectedTxForReminder(tx)}
                                  className="p-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white transition"
                                  title="Enviar Lembrete de Vencimento (WhatsApp / Email)"
                                >
                                  <BellRing className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Recibo / Fatura */}
                              {tx.type === 'RECEIVABLE' && (
                                <button
                                  onClick={() => setSelectedTxForReceipt(tx)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                  title="Visualizar Recibo / Fatura Timbrada"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Excluir */}
                              <button
                                onClick={() => {
                                  if (confirm(`Deseja realmente excluir o lançamento "${tx.title}"?`)) {
                                    deleteTransaction(tx.id);
                                    showNotification('Lançamento removido do financeiro.');
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950 hover:text-rose-400 text-slate-500 transition"
                                title="Excluir Lançamento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: CONCILIAÇÃO BANCÁRIA */}
      {/* ========================================================================= */}
      {activeTab === 'reconciliation' && (
        <ReconciliationTab
          transactions={transactions}
          onOpenReconcileModal={(tx) => setSelectedTxForReconciliation(tx)}
          onQuickReconcile={(id) => {
            reconcileTransaction(id);
            showNotification('✅ Título conciliado com sucesso com extrato bancário!');
          }}
          onBatchReconcile={(ids) => {
            const count = batchReconcileTransactions(ids);
            showNotification(`🚀 ${count} títulos conciliados em lote com sucesso!`);
          }}
          onUnreconcile={(id, reason) => {
            unreconcileTransaction(id, reason);
            showNotification('↩️ Conciliação estornada.');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB: ALERTAS DE VENCIMENTO PRÓXIMO */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <DueSoonAlertsTab
          transactions={transactions}
          onTriggerAlertScan={(days) => {
            const res = generateDueSoonFinancialAlerts();
            return { dueSoonCount: res.dueSoonCount, overdueCount: res.overdueCount };
          }}
          onOpenReminderModal={(tx) => setSelectedTxForReminder(tx)}
          onOpenSettlementModal={(tx) => handleOpenSettlement(tx)}
          onMarkAsPaidOrReceived={(id) => {
            markTransactionAsPaidOrReceived(id, { auto_reconcile: true });
            showNotification('💰 Título liquidado e conciliado com sucesso!');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DRE GERENCIAL DE SST */}
      {/* ========================================================================= */}
      {activeTab === 'dre' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <PieChartIcon className="w-5 h-5 text-purple-400" />
                  <span>Demonstrativo do Resultado do Exercício (DRE Gerencial SST)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Visão contábil e de rentabilidade para consultoria de Segurança e Medicina do Trabalho.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir DRE</span>
                </button>
              </div>
            </div>

            {/* DRE Structured Table */}
            <div className="space-y-3 font-sans text-xs sm:text-sm">
              {/* (+) Receita Bruta */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between font-bold text-white">
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-mono">(+)</span>
                  <span>RECEITA OPERACIONAL BRUTA DE SST</span>
                </div>
                <span className="font-mono text-emerald-400 text-base">{formatCurrency(cashFlowSummary.total_receivable_month * 1.05)}</span>
              </div>

              <div className="pl-6 pr-4 space-y-1.5 text-xs text-slate-400 border-l-2 border-emerald-500/30 my-2">
                <div className="flex justify-between">
                  <span>• Mensalidades de Gestão SST & eSocial (MRR):</span>
                  <span className="text-slate-200 font-mono">{formatCurrency(cashFlowSummary.total_receivable_month * 0.45)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Elaboração e Renovação de Programas (PGR / PCMSO / AET):</span>
                  <span className="text-slate-200 font-mono">{formatCurrency(cashFlowSummary.total_receivable_month * 0.30)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Laudos Técnicos Ambientais (LTCAT / Insalubridade / Periculosidade):</span>
                  <span className="text-slate-200 font-mono">{formatCurrency(cashFlowSummary.total_receivable_month * 0.15)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Treinamentos Normativos (NR-35, NR-33, NR-10, CIPA):</span>
                  <span className="text-slate-200 font-mono">{formatCurrency(cashFlowSummary.total_receivable_month * 0.10)}</span>
                </div>
              </div>

              {/* (-) Deduções */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-300 font-semibold">
                <div className="flex items-center space-x-2">
                  <span className="text-rose-400 font-mono">(-)</span>
                  <span>Deduções da Receita Bruta (Impostos & Descontos Incondicionais)</span>
                </div>
                <span className="font-mono text-rose-400">{formatCurrency(cashFlowSummary.total_receivable_month * 0.08)}</span>
              </div>

              {/* (=) Receita Líquida */}
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between font-bold text-white">
                <div className="flex items-center space-x-2">
                  <span className="text-cyan-400 font-mono">(=)</span>
                  <span>RECEITA OPERACIONAL LÍQUIDA</span>
                </div>
                <span className="font-mono text-cyan-400 text-base">{formatCurrency(cashFlowSummary.total_receivable_month * 0.97)}</span>
              </div>

              {/* (-) Custos Diretos SST */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-300 font-semibold">
                <div className="flex items-center space-x-2">
                  <span className="text-rose-400 font-mono">(-)</span>
                  <span>CUSTOS DIRETOS DOS SERVIÇOS DE SST (CPV)</span>
                </div>
                <span className="font-mono text-rose-400">{formatCurrency(cashFlowSummary.total_payable_month * 0.55)}</span>
              </div>

              <div className="pl-6 pr-4 space-y-1.5 text-xs text-slate-400 border-l-2 border-rose-500/30 my-2">
                <div className="flex justify-between">
                  <span>• Honorários Médicos (Médico Coordenador & Examinadores PCMSO):</span>
                  <span className="text-slate-200 font-mono">{formatCurrency(cashFlowSummary.total_payable_month * 0.25)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Clínicas Credenciadas & Exames Complementares (Audiometria/Lab):</span>
                  <span className="text-slate-200 font-mono">{formatCurrency(cashFlowSummary.total_payable_month * 0.18)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Calibração RBC de Aparelhos de Medição (Ruído/Luz/Vibração):</span>
                  <span className="text-slate-200 font-mono">{formatCurrency(cashFlowSummary.total_payable_month * 0.08)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Honorários de Engenharia e Peritos de Campo:</span>
                  <span className="text-slate-200 font-mono">{formatCurrency(cashFlowSummary.total_payable_month * 0.04)}</span>
                </div>
              </div>

              {/* (=) Margem de Contribuição */}
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between font-bold text-white">
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-mono">(=)</span>
                  <span>MARGEM DE CONTRIBUIÇÃO BRUTA</span>
                </div>
                <span className="font-mono text-emerald-400 text-base">{formatCurrency(cashFlowSummary.total_receivable_month * 0.97 - cashFlowSummary.total_payable_month * 0.55)}</span>
              </div>

              {/* (-) Despesas Fixas & Administrativas */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-300 font-semibold">
                <div className="flex items-center space-x-2">
                  <span className="text-rose-400 font-mono">(-)</span>
                  <span>DESPESAS OPERACIONAIS FIXAS & ADMINISTRATIVAS</span>
                </div>
                <span className="font-mono text-rose-400">{formatCurrency(cashFlowSummary.total_payable_month * 0.45)}</span>
              </div>

              <div className="pl-6 pr-4 space-y-1.5 text-xs text-slate-400 border-l-2 border-amber-500/30 my-2">
                <div className="flex justify-between">
                  <span>• Software SaaS, Servidores Nuvem & Assinaturas Digitais eSocial:</span>
                  <span className="text-slate-200 font-mono">{formatCurrency(890)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Aluguel, Condomínio e Instalações Sede Consultoria:</span>
                  <span className="text-slate-200 font-mono">{formatCurrency(4200)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• Impostos Simples Nacional / ISSQN:</span>
                  <span className="text-slate-200 font-mono">{formatCurrency(2940)}</span>
                </div>
              </div>

              {/* (=) Lucro Operacional Líquido */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/50 flex items-center justify-between font-bold text-white shadow-lg">
                <div>
                  <div className="text-sm font-bold text-emerald-300 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>LUCRO LÍQUIDO OPERACIONAL (EBITDA GERENCIAL)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal">Resultado disponível para reinvestimento ou distribuição</span>
                </div>
                <span className="font-mono text-xl text-emerald-400">
                  {formatCurrency((cashFlowSummary.total_receivable_month * 0.97) - cashFlowSummary.total_payable_month)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FATURAMENTO DE CONTRATOS & ORDENS DE SERVIÇO */}
      {/* ========================================================================= */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Contracts Section */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <FileSignature className="w-4 h-4 text-blue-400" />
                  <span>Contratos Ativos & Recorrência (MRR)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Dispare faturamentos mensais com 1 clique para gerar boletos e títulos a receber.
                </p>
              </div>

              <button
                onClick={handleBatchContractBilling}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-blue-950/40 transition active:scale-95 touch-manipulation"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Gerar Faturamento do Mês</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contracts.map(contract => {
                const clientObj = clients.find(c => c.id === contract.client_id);
                const clientName = clientObj?.trade_name || clientObj?.legal_name || 'Cliente PrevSafe';
                return (
                  <div key={contract.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                        <span>{contract.contract_number}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px]">
                          {contract.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate" title={contract.title}>
                        {contract.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                        <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{clientName}</span>
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Valor do Contrato</span>
                        <div className="font-bold text-sm text-emerald-400 font-mono">
                          {formatCurrency(contract.total_value)}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const tx = generateReceivableFromContract(contract.id);
                          if (tx) showNotification(`Fatura avulsa gerada para o contrato ${contract.contract_number}!`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                      >
                        Emitir Fatura
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Service Orders Ready to Bill */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <span>Ordens de Serviço Concluídas (Prontas para Faturamento)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Converta serviços entregues e laudos homologados em cobranças imediatas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviceOrders.map(os => {
                const clientObj = clients.find(c => c.id === os.client_id);
                const clientName = clientObj?.trade_name || clientObj?.legal_name || 'Cliente PrevSafe';
                return (
                  <div key={os.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                        <span>{os.os_number}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 text-[10px]">
                          {os.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate" title={os.title}>
                        {os.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                        <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{clientName}</span>
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Serviço Técnico</span>
                        <div className="font-bold text-sm text-emerald-400 font-mono">
                          {formatCurrency(3500)}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const tx = generateReceivableFromServiceOrder(os.id);
                          if (tx) showNotification(`Recebível gerado com sucesso a partir da OS ${os.os_number}!`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-semibold transition"
                      >
                        Faturar OS
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO LANÇAMENTO (RECEITA OU DESPESA) */}
      {/* ========================================================================= */}
      {isNewTxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`p-4 border-b border-slate-800 flex items-center justify-between ${
              txTypeToCreate === 'RECEIVABLE' ? 'bg-emerald-950/40' : 'bg-rose-950/40'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  txTypeToCreate === 'RECEIVABLE' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {txTypeToCreate === 'RECEIVABLE' ? 'Novo Título a Receber (Receita SST)' : 'Novo Título a Pagar (Despesa / Custo)'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Preencha os dados do documento e condições financeiras</p>
                </div>
              </div>
              <button onClick={() => setIsNewTxModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewTransaction} className="p-5 space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Título do Lançamento *</label>
                <input
                  type="text"
                  required
                  placeholder={txTypeToCreate === 'RECEIVABLE' ? 'Ex: Mensalidade SST S-2240 e Gestão de Riscos' : 'Ex: Honorários Médicos Dr. Roberto - PCMSO'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Client or Supplier */}
              {txTypeToCreate === 'RECEIVABLE' ? (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Cliente Vinculado</label>
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.trade_name || c.legal_name} ({c.document_number})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Fornecedor / Profissional Credenciado *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Laboratório MedLab, Dr. Roberto Silva CRM/SP..."
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Categoria SST</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as FinancialCategoryKey)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {txTypeToCreate === 'RECEIVABLE' ? (
                      <>
                        <option value="MENSALIDADE_SST">Mensalidade de Gestão SST</option>
                        <option value="ELABORACAO_PGR_PCMSO">Elaboração PGR / PCMSO</option>
                        <option value="LAUDOS_LTCAT_INSALUBRIDADE">Laudos Técnicos (LTCAT / Insalubridade)</option>
                        <option value="EXAMES_CLINICOS_ASO">Exames Médicos & ASO</option>
                        <option value="TREINAMENTOS_NR">Treinamentos de NRs</option>
                        <option value="EVENTOS_ESOCIAL_SST">Transmissão eSocial SST</option>
                        <option value="OUTRAS_RECEITAS">Outras Receitas</option>
                      </>
                    ) : (
                      <>
                        <option value="HONORARIOS_MEDICOS">Honorários Médicos (PCMSO)</option>
                        <option value="HONORARIOS_ENGENHARIA_TECNICO">Honorários Engenharia & Técnicos</option>
                        <option value="CLINICAS_LABORATORIOS_PARCEIROS">Clínicas & Laboratórios Credenciados</option>
                        <option value="CALIBRACAO_EQUIPAMENTOS">Calibração de Equipamentos SST</option>
                        <option value="SOFTWARES_LICENCAS">Softwares, Nuvem & Licenças</option>
                        <option value="ALUGUEL_INSTALACOES">Aluguel & Infraestrutura Física</option>
                        <option value="IMPOSTOS_TRIBUTOS">Impostos & Tributos</option>
                        <option value="DESPESAS_ADMINISTRATIVAS">Despesas Administrativas</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Due Date & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Forma de Pagamento</label>
                  <select
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value as FinancialPaymentMethod)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="PIX">PIX (Chave / QR Code)</option>
                    <option value="TRANSFERENCIA">Transferência / TED</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="DINHEIRO">Dinheiro / Espécie</option>
                  </select>
                </div>
              </div>

              {/* Document Number & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Número do Documento (NF/Recibo)</label>
                  <input
                    type="text"
                    placeholder="Ex: NF-e 2026/0512"
                    value={newDocNumber}
                    onChange={(e) => setNewDocNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Observações Internas</label>
                  <input
                    type="text"
                    placeholder="Observações adicionais..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewTxModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-white font-semibold shadow-lg transition ${
                    txTypeToCreate === 'RECEIVABLE' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                  }`}
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BAIXA / LIQUIDAÇÃO DE TÍTULO */}
      {/* ========================================================================= */}
      {selectedTxForSettlement && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 bg-emerald-950/40 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Confirmar Baixa / Liquidação</h3>
                  <p className="text-[11px] text-slate-400">Registrar pagamento efetivo no fluxo de caixa</p>
                </div>
              </div>
              <button onClick={() => setSelectedTxForSettlement(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Título</div>
                <div className="font-bold text-sm text-white mt-0.5">{selectedTxForSettlement.title}</div>
                <div className="mt-2 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Valor Original:</span>
                  <span className="text-slate-200 font-bold">{formatCurrency(selectedTxForSettlement.amount)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Data do Pagamento *</label>
                  <input
                    type="date"
                    required
                    value={settlementDate}
                    onChange={(e) => setSettlementDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Meio de Pagamento</label>
                  <select
                    value={settlementMethod}
                    onChange={(e) => setSettlementMethod(e.target.value as FinancialPaymentMethod)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto Compensado</option>
                    <option value="TRANSFERENCIA">Transferência / TED</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="DINHEIRO">Dinheiro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Desconto Concedido (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settlementDiscount}
                    onChange={(e) => setSettlementDiscount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Juros / Multa (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settlementInterest}
                    onChange={(e) => setSettlementInterest(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notas de Conciliação / Autenticação</label>
                <input
                  type="text"
                  placeholder="Ex: Comprovante TED Itaú Autenticação 988412..."
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Total Summary */}
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300">Valor Final a Baixar:</span>
                <span className="font-mono text-base font-bold text-emerald-400">
                  {formatCurrency(selectedTxForSettlement.amount - settlementDiscount + settlementInterest)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedTxForSettlement(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSettlement}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-950/40 transition"
                >
                  Confirmar Baixa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECIBO & FATURA TIMBRADA PREVSAFE */}
      {/* ========================================================================= */}
      {selectedTxForReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold text-white">Comprovante / Recibo de Prestação de Serviços SST</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                  title="Imprimir"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setSelectedTxForReceipt(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Timbrated Content */}
            <div className="p-6 space-y-5 bg-slate-950/90 font-sans text-xs">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="text-base font-bold text-white tracking-tight">PrevSafe Consultoria & Engenharia SST</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">CNPJ: 12.345.678/0001-90 • CREA/SP: 988421</div>
                  <div className="text-slate-400 text-[11px]">Av. Paulista, 1000 - Bela Vista, São Paulo - SP</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-emerald-400">{selectedTxForReceipt.document_number || 'FAT-2026-0091'}</div>
                  <div className="text-[10px] text-slate-400">Emissão: {formatDate(selectedTxForReceipt.created_at)}</div>
                  <div className="text-[10px] text-slate-400">Vencimento: {formatDate(selectedTxForReceipt.due_date)}</div>
                </div>
              </div>

              {/* Client Info */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Tomador dos Serviços (Cliente)</div>
                <div className="font-bold text-sm text-white">{selectedTxForReceipt.client_name}</div>
                <div className="text-slate-400 text-[11px]">Unidade / Contrato: Gestão Integrada de Segurança e Saúde Ocupacional</div>
              </div>

              {/* Service Description */}
              <div className="space-y-2">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Detalhamento dos Serviços SST</div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-100">{selectedTxForReceipt.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{selectedTxForReceipt.description || selectedTxForReceipt.category_name}</div>
                  </div>
                  <div className="font-bold font-mono text-sm text-emerald-400">
                    {formatCurrency(selectedTxForReceipt.final_amount)}
                  </div>
                </div>
              </div>

              {/* PIX Payment / Barcode Area */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center p-1 shrink-0">
                  <QrCode className="w-16 h-16 text-slate-900" />
                </div>
                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <div className="text-xs font-bold text-white flex items-center justify-center sm:justify-start space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pagamento Instantâneo via PIX</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-[320px]">
                    {selectedTxForReceipt.barcode_or_pix || '00020126580014br.gov.bcb.pix0136prevsafe-financeiro@prevsafe.com.br'}
                  </p>
                  <button
                    onClick={() => copyPixToClipboard(selectedTxForReceipt.barcode_or_pix || 'prevsafe-financeiro@prevsafe.com.br')}
                    className="mt-1 px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[11px] font-semibold flex items-center space-x-1.5 transition mx-auto sm:mx-0"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedPix ? 'Chave Copiada!' : 'Copiar Chave Pix / Código'}</span>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 text-center">
                Documento emitido eletronicamente pela plataforma PrevSafe SST. Válido para prestação de contas fiscais e contratuais.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Modal */}
      {selectedTxForReconciliation && (
        <FinancialReconciliationModal
          transaction={selectedTxForReconciliation}
          currentOperatorName={currentProfile?.full_name ? `${currentProfile.full_name} (${currentProfile.role})` : 'PrevSafe Gestão'}
          onClose={() => setSelectedTxForReconciliation(null)}
          onReconcile={(id, options) => {
            reconcileTransaction(id, options);
            showNotification(`✅ Conciliação bancária do título confirmada! (Ref: ${options.reconciliation_ref || 'OK'})`);
            setSelectedTxForReconciliation(null);
          }}
          onUnreconcile={(id, reason) => {
            unreconcileTransaction(id, reason);
            showNotification('↩️ Conciliação estornada.');
            setSelectedTxForReconciliation(null);
          }}
        />
      )}

      {/* Due Reminder Modal */}
      {selectedTxForReminder && (
        <FinancialReminderModal
          transaction={selectedTxForReminder}
          onClose={() => setSelectedTxForReminder(null)}
          onSend={(id, channel) => {
            sendFinancialReminder(id, channel);
            showNotification(`📲 Lembrete de vencimento enviado com sucesso via ${channel}!`);
            setSelectedTxForReminder(null);
          }}
        />
      )}
    </div>
  );
};
