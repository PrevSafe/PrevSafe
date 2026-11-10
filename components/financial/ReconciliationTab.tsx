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
        <div className="p-4 bg-superficie rounded-2xl border border-borda relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-tinta-2">Taxa de Conciliação</span>
            <div className="w-8 h-8 rounded-lg bg-marca-suave border border-marca-escura flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-marca-escura" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-marca-escura">{reconciliationRate}%</div>
          <p className="text-[11px] text-tinta-2 mt-1">
            {reconciledCount} de {transactions.length} títulos auditados
          </p>
        </div>

        {/* Total Conciliado */}
        <div className="p-4 bg-superficie rounded-2xl border border-borda relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-tinta-2">Total Já Conciliado</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-teal-700">{formatCurrency(totalAmountReconciled)}</div>
          <p className="text-[11px] text-tinta-2 mt-1">Extrato bancário e NSU validados</p>
        </div>

        {/* Pendente de Conciliação */}
        <div className="p-4 bg-superficie rounded-2xl border border-borda relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-tinta-2">Pendente de Conferência</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-700" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{formatCurrency(totalAmountPending)}</div>
          <p className="text-[11px] text-tinta-2 mt-1">{pendingCount} títulos aguardando extrato</p>
        </div>

        {/* Ação Rápida em Lote */}
        <div className="bg-superficie p-4 rounded-2xl border border-borda flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-marca-escura flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-marca-escura" />
              <span>Conciliação Rápida</span>
            </div>
            <p className="text-[11px] text-tinta-2 mt-1">
              Selecione múltiplos registros para validar quitação com 1 clique.
            </p>
          </div>
          <button
            onClick={handleExecuteBatch}
            disabled={selectedIds.length === 0}
            className={`mt-2 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
              selectedIds.length > 0
                ? 'bg-marca hover:bg-marca-escura text-white shadow-sm'
                : 'bg-superficie-2 text-tinta-2 cursor-not-allowed'
            }`}
          >
            <CheckCheck className="w-4 h-4" />
            <span>Conciliar Selecionados ({selectedIds.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-superficie rounded-2xl border border-borda flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-tinta-2 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por NSU, cliente, título, doc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-fundo border border-borda rounded-xl pl-8 pr-3 py-2 text-tinta placeholder-tinta-3 focus:outline-none focus:border-marca-escura"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-fundo border border-borda rounded-xl px-3 py-2 text-tinta focus:outline-none focus:border-marca-escura"
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
            className="bg-fundo border border-borda rounded-xl px-3 py-2 text-tinta focus:outline-none focus:border-marca-escura"
          >
            <option value="ALL">Tipo: Receitas & Despesas</option>
            <option value="RECEIVABLE">Apenas Receitas (Contas a Receber)</option>
            <option value="PAYABLE">Apenas Despesas (Contas a Pagar)</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 text-tinta-2">
          <span>{filtered.length} registro(s) exibido(s)</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-superficie rounded-2xl border border-borda overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-borda bg-fundo text-[11px] font-bold text-tinta-2 uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={handleSelectAll}
                    className="rounded bg-fundo border-borda text-marca-escura focus:ring-0"
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
            <tbody className="divide-y divide-borda text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-tinta-2">
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
                      className={`hover:bg-superficie-2 transition group ${
                        isSelected ? 'bg-marca-suave' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(tx.id)}
                          className="rounded bg-fundo border-borda text-marca-escura focus:ring-0"
                        />
                      </td>

                      {/* Reconciliation Status Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isReconciled ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-marca-suave text-marca-escura border border-marca-escura">
                            <CheckCircle2 className="w-3.5 h-3.5 text-marca-escura" />
                            <span>Conciliado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-800 border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Pendente Conciliação</span>
                          </span>
                        )}
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-tinta max-w-[260px] truncate" title={tx.title}>
                          {tx.title}
                        </div>
                        <div className="text-[11px] text-tinta-2 flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-superficie-2 text-tinta font-mono">
                            {tx.type === 'RECEIVABLE' ? 'Receita (+)' : 'Despesa (-)'}
                          </span>
                          {tx.document_number && (
                            <span className="font-mono text-tinta-2">{tx.document_number}</span>
                          )}
                        </div>
                      </td>

                      {/* Client or Supplier */}
                      <td className="py-3 px-4 text-tinta max-w-[180px] truncate">
                        <div className="flex items-center space-x-1.5">
                          {tx.type === 'RECEIVABLE' ? (
                            <Building className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                          )}
                          <span>{tx.client_name || tx.supplier_name || 'PrevSafe'}</span>
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-tinta">
                        <div className="font-mono">{formatDate(tx.due_date)}</div>
                        {tx.payment_date && (
                          <div className="text-[10px] text-marca-escura font-mono">
                            Pago: {formatDate(tx.payment_date)}
                          </div>
                        )}
                      </td>

                      {/* NSU / Reference */}
                      <td className="py-3 px-4 whitespace-nowrap text-tinta font-mono text-[11px]">
                        {tx.reconciliation_ref ? (
                          <span className="px-2 py-0.5 rounded bg-superficie-2 text-marca-escura border border-borda">
                            {tx.reconciliation_ref}
                          </span>
                        ) : (
                          <span className="text-tinta-2 italic">Sem NSU</span>
                        )}
                        {tx.reconciled_by && (
                          <div className="text-[10px] text-tinta-2 truncate max-w-[120px]">
                            {tx.reconciled_by}
                          </div>
                        )}
                      </td>

                      {/* Final Amount */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className={`font-bold font-mono text-sm ${
                          tx.type === 'RECEIVABLE' ? 'text-marca-escura' : 'text-rose-700'
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
                              className="px-2.5 py-1 rounded-lg bg-marca-suave hover:bg-marca-escura text-white hover:text-white font-semibold transition flex items-center space-x-1"
                              title="Conciliar Rápido (1 Clique)"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Conciliar</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onOpenReconcileModal(tx)}
                              className="px-2.5 py-1 rounded-lg bg-superficie-2 hover:bg-superficie-3 text-tinta hover:text-tinta transition flex items-center space-x-1"
                              title="Ver Detalhes da Auditoria"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Auditoria</span>
                            </button>
                          )}

                          <button
                            onClick={() => onOpenReconcileModal(tx)}
                            className="p-1.5 rounded-lg bg-superficie-2 hover:bg-superficie-3 text-tinta-2 hover:text-tinta transition"
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
