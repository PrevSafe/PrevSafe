'use client';

import React, { useState, useMemo } from 'react';
import { 
  FinancialTransaction, 
  FinancialReconciliationStatus, 
  FinancialTransactionType 
} from '@/types';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  CheckCheck, 
  RotateCcw, 
  Building, 
  User, 
  Calendar, 
  FileText, 
  Sparkles, 
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface ReconciliationTabProps {
  transactions: FinancialTransaction[];
  onOpenReconcileModal: (tx: FinancialTransaction) => void;
  onQuickReconcile: (id: string) => void;
  onBatchReconcile: (ids: string[]) => void;
  onUnreconcile: (id: string, reason?: string) => void;
}

export const ReconciliationTab: React.FC<ReconciliationTabProps> = ({
  transactions,
  onOpenReconcileModal,
  onQuickReconcile,
  onBatchReconcile,
  onUnreconcile
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (statusFilter !== 'ALL') {
        const currentStatus = t.reconciliation_status || 'PENDING_RECONCILIATION';
        if (currentStatus !== statusFilter) return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(term);
        const matchesClient = t.client_name?.toLowerCase().includes(term);
        const matchesSupplier = t.supplier_name?.toLowerCase().includes(term);
        const matchesRef = t.reconciliation_ref?.toLowerCase().includes(term);
        const matchesDoc = t.document_number?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesClient && !matchesSupplier && !matchesRef && !matchesDoc) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  }, [transactions, typeFilter, statusFilter, searchTerm]);

  // Statistics
  const reconciledCount = transactions.filter(t => t.reconciliation_status === 'RECONCILED').length;
  const pendingCount = transactions.filter(t => (t.reconciliation_status || 'PENDING_RECONCILIATION') === 'PENDING_RECONCILIATION').length;
  const totalAmountReconciled = transactions
    .filter(t => t.reconciliation_status === 'RECONCILED')
    .reduce((sum, t) => sum + t.final_amount, 0);
  const totalAmountPending = transactions
    .filter(t => (t.reconciliation_status || 'PENDING_RECONCILIATION') !== 'RECONCILED')
    .reduce((sum, t) => sum + t.final_amount, 0);
  const reconciliationRate = transactions.length > 0
    ? ((reconciledCount / transactions.length) * 100).toFixed(1)
    : '0';

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(t => t.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleExecuteBatch = () => {
    if (selectedIds.length === 0) return;
    onBatchReconcile(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taxa de Conciliação */}
        <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Taxa de Conciliação</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">{reconciliationRate}%</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {reconciledCount} de {transactions.length} títulos auditados
          </p>
        </div>

        {/* Total Conciliado */}
        <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Já Conciliado</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-400">{formatCurrency(totalAmountReconciled)}</div>
          <p className="text-[11px] text-slate-400 mt-1">Extrato bancário e NSU validados</p>
        </div>

        {/* Pendente de Conciliação */}
        <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Pendente de Conferência</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">{formatCurrency(totalAmountPending)}</div>
          <p className="text-[11px] text-slate-400 mt-1">{pendingCount} títulos aguardando extrato</p>
        </div>

        {/* Ação Rápida em Lote */}
        <div className="p-4 bg-gradient-to-br from-slate-900 to-emerald-950/40 rounded-2xl border border-emerald-500/30 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Conciliação Rápida</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Selecione múltiplos registros para validar quitação com 1 clique.
            </p>
          </div>
          <button
            onClick={handleExecuteBatch}
            disabled={selectedIds.length === 0}
            className={`mt-2 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
              selectedIds.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCheck className="w-4 h-4" />
            <span>Conciliar Selecionados ({selectedIds.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por NSU, cliente, título, doc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500/60"
          >
            <option value="ALL">Status: Todos</option>
            <option value="PENDING_RECONCILIATION">Pendentes de Conciliação</option>
            <option value="RECONCILED">Conciliados (Validados)</option>
            <option value="DISCREPANCY">Com Divergência</option>
            <option value="UNRECONCILED">Não Conciliados</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500/60"
          >
            <option value="ALL">Tipo: Receitas & Despesas</option>
            <option value="RECEIVABLE">Apenas Receitas (Contas a Receber)</option>
            <option value="PAYABLE">Apenas Despesas (Contas a Pagar)</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 text-slate-400">
          <span>{filtered.length} registro(s) exibido(s)</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={handleSelectAll}
                    className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                  />
                </th>
                <th className="py-3 px-4">Status de Conciliação</th>
                <th className="py-3 px-4">Título / Lançamento</th>
                <th className="py-3 px-4">Cliente / Favorecido</th>
                <th className="py-3 px-4">Vencimento / Quitação</th>
                <th className="py-3 px-4">Autenticação / NSU</th>
                <th className="py-3 px-4 text-right">Valor Final</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    Nenhum título localizado com os critérios de conciliação selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const isReconciled = tx.reconciliation_status === 'RECONCILED';
                  const isSelected = selectedIds.includes(tx.id);

                  return (
                    <tr 
                      key={tx.id} 
                      className={`hover:bg-slate-800/40 transition group ${
                        isSelected ? 'bg-emerald-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(tx.id)}
                          className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                        />
                      </td>

                      {/* Reconciliation Status Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isReconciled ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Conciliado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Pendente Conciliação</span>
                          </span>
                        )}
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100 max-w-[260px] truncate" title={tx.title}>
                          {tx.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                            {tx.type === 'RECEIVABLE' ? 'Receita (+)' : 'Despesa (-)'}
                          </span>
                          {tx.document_number && (
                            <span className="font-mono text-slate-400">{tx.document_number}</span>
                          )}
                        </div>
                      </td>

                      {/* Client or Supplier */}
                      <td className="py-3 px-4 text-slate-300 max-w-[180px] truncate">
                        <div className="flex items-center space-x-1.5">
                          {tx.type === 'RECEIVABLE' ? (
                            <Building className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          )}
                          <span>{tx.client_name || tx.supplier_name || 'PrevSafe'}</span>
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                        <div className="font-mono">{formatDate(tx.due_date)}</div>
                        {tx.payment_date && (
                          <div className="text-[10px] text-emerald-400 font-mono">
                            Pago: {formatDate(tx.payment_date)}
                          </div>
                        )}
                      </td>

                      {/* NSU / Reference */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                        {tx.reconciliation_ref ? (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                            {tx.reconciliation_ref}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Sem NSU</span>
                        )}
                        {tx.reconciled_by && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {tx.reconciled_by}
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
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {!isReconciled ? (
                            <button
                              onClick={() => onQuickReconcile(tx.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-semibold transition flex items-center space-x-1"
                              title="Conciliar Rápido (1 Clique)"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Conciliar</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onOpenReconcileModal(tx)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center space-x-1"
                              title="Ver Detalhes da Auditoria"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Auditoria</span>
                            </button>
                          )}

                          <button
                            onClick={() => onOpenReconcileModal(tx)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            title="Editar Dados de Conciliação"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
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
  );
};
