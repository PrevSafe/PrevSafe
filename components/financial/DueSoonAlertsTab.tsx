'use client';

import React, { useState, useMemo } from 'react';
import { FinancialTransaction } from '@/types';
import { 
  AlertTriangle, 
  Clock, 
  AlertCircle, 
  Send, 
  Check, 
  Calendar, 
  Building, 
  User, 
  Sparkles, 
  RefreshCw, 
  BellRing, 
  CheckCircle2,
  DollarSign
} from 'lucide-react';

interface DueSoonAlertsTabProps {
  transactions: FinancialTransaction[];
  onTriggerAlertScan: (daysAhead?: number) => { dueSoonCount: number; overdueCount: number };
  onOpenReminderModal: (tx: FinancialTransaction) => void;
  onOpenSettlementModal: (tx: FinancialTransaction) => void;
  onMarkAsPaidOrReceived: (id: string) => void;
}

export const DueSoonAlertsTab: React.FC<DueSoonAlertsTabProps> = ({
  transactions,
  onTriggerAlertScan,
  onOpenReminderModal,
  onOpenSettlementModal,
  onMarkAsPaidOrReceived
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'DUE_SOON'>('ALL');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

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

  // Group transactions by urgency
  const categorized = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue: (FinancialTransaction & { diffDays: number })[] = [];
    const dueToday: (FinancialTransaction & { diffDays: number })[] = [];
    const dueSoon: (FinancialTransaction & { diffDays: number })[] = [];

    transactions.forEach(t => {
      if (t.status === 'PAID') return;
      const due = new Date(t.due_date);
      due.setHours(0, 0, 0, 0);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        overdue.push({ ...t, diffDays });
      } else if (diffDays === 0) {
        dueToday.push({ ...t, diffDays });
      } else if (diffDays <= 5) {
        dueSoon.push({ ...t, diffDays });
      }
    });

    return {
      overdue: overdue.sort((a, b) => a.diffDays - b.diffDays),
      dueToday,
      dueSoon: dueSoon.sort((a, b) => a.diffDays - b.diffDays)
    };
  }, [transactions]);

  const allAlertItems = useMemo(() => {
    let items = [
      ...categorized.overdue.map(i => ({ ...i, alertCategory: 'OVERDUE' as const })),
      ...categorized.dueToday.map(i => ({ ...i, alertCategory: 'TODAY' as const })),
      ...categorized.dueSoon.map(i => ({ ...i, alertCategory: 'DUE_SOON' as const })),
    ];

    if (filterType === 'OVERDUE') return items.filter(i => i.alertCategory === 'OVERDUE');
    if (filterType === 'TODAY') return items.filter(i => i.alertCategory === 'TODAY');
    if (filterType === 'DUE_SOON') return items.filter(i => i.alertCategory === 'DUE_SOON');

    return items;
  }, [categorized, filterType]);

  const totalOverdueAmount = categorized.overdue.reduce((acc, curr) => acc + curr.final_amount, 0);
  const totalDueTodayAmount = categorized.dueToday.reduce((acc, curr) => acc + curr.final_amount, 0);
  const totalDueSoonAmount = categorized.dueSoon.reduce((acc, curr) => acc + curr.final_amount, 0);

  const handleRunScan = () => {
    setIsScanning(true);
    setScanResult(null);
    setTimeout(() => {
      const res = onTriggerAlertScan(5);
      setScanResult(`Varredura concluída: ${res.overdueCount} títulos vencidos e ${res.dueSoonCount} a vencer notificados no painel!`);
      setIsScanning(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Automated Scan Trigger */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 rounded-2xl border border-amber-500/30 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-800">
              <BellRing className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-tinta">Central de Alertas de Vencimento Próximo e Cobrança</h3>
          </div>
          <p className="text-xs text-tinta-2 max-w-2xl">
            Monitoramento preditivo de fluxo de caixa para Segurança e Saúde no Trabalho. Identifica títulos a vencer nos próximos 5 dias ou já em atraso, permitindo o disparo de notificações amigáveis via WhatsApp e E-mail.
          </p>
          {scanResult && (
            <div className="mt-2 text-xs text-marca-escura font-semibold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{scanResult}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleRunScan}
            disabled={isScanning}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-lg shadow-amber-950/40 flex items-center space-x-2 transition active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Executando Varredura...' : 'Executar Varredura & Disparar Alertas'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Vencidos (Atraso) */}
        <div 
          onClick={() => setFilterType(filterType === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterType === 'OVERDUE'
              ? 'bg-rose-50 border-rose-500 text-tinta'
              : 'bg-superficie border-borda hover:border-rose-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Em Atraso (Vencidos)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-800">
              {categorized.overdue.length} títulos
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-700">{formatCurrency(totalOverdueAmount)}</div>
          <p className="text-[11px] text-tinta-2 mt-1">Requer cobrança ativa imediata</p>
        </div>

        {/* Vencem Hoje */}
        <div 
          onClick={() => setFilterType(filterType === 'TODAY' ? 'ALL' : 'TODAY')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterType === 'TODAY'
              ? 'bg-amber-50 border-amber-500 text-tinta'
              : 'bg-superficie border-borda hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Vencendo Hoje</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800">
              {categorized.dueToday.length} títulos
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{formatCurrency(totalDueTodayAmount)}</div>
          <p className="text-[11px] text-tinta-2 mt-1">Compensação bancária esperada hoje</p>
        </div>

        {/* Vencimento Próximo (1 a 5 dias) */}
        <div 
          onClick={() => setFilterType(filterType === 'DUE_SOON' ? 'ALL' : 'DUE_SOON')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterType === 'DUE_SOON'
              ? 'bg-blue-50 border-blue-500 text-tinta'
              : 'bg-superficie border-borda hover:border-blue-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Próximos 5 Dias</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-700">
              {categorized.dueSoon.length} títulos
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-700">{formatCurrency(totalDueSoonAmount)}</div>
          <p className="text-[11px] text-tinta-2 mt-1">Ideal para envio preventivo de lembrete</p>
        </div>
      </div>

      {/* Filter Tabs Pills */}
      <div className="flex items-center space-x-2 border-b border-borda pb-2 text-xs">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition ${
            filterType === 'ALL'
              ? 'bg-superficie-2 text-tinta border border-borda'
              : 'text-tinta-2 hover:text-tinta'
          }`}
        >
          Todos os Alertas ({allAlertItems.length})
        </button>
        <button
          onClick={() => setFilterType('OVERDUE')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition ${
            filterType === 'OVERDUE'
              ? 'bg-rose-500/20 text-rose-800 border border-rose-500/40'
              : 'text-tinta-2 hover:text-rose-700'
          }`}
        >
          Vencidos ({categorized.overdue.length})
        </button>
        <button
          onClick={() => setFilterType('TODAY')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition ${
            filterType === 'TODAY'
              ? 'bg-amber-500/20 text-amber-800 border border-amber-500/40'
              : 'text-tinta-2 hover:text-amber-700'
          }`}
        >
          Hoje ({categorized.dueToday.length})
        </button>
        <button
          onClick={() => setFilterType('DUE_SOON')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition ${
            filterType === 'DUE_SOON'
              ? 'bg-blue-500/20 text-blue-700 border border-blue-500/40'
              : 'text-tinta-2 hover:text-blue-700'
          }`}
        >
          Próximos 5 dias ({categorized.dueSoon.length})
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {allAlertItems.length === 0 ? (
          <div className="p-8 bg-superficie rounded-2xl border border-borda text-center text-tinta-2">
            <CheckCircle2 className="w-8 h-8 text-marca-escura mx-auto mb-2" />
            <p className="text-xs">Nenhum título pendente com vencimento crítico no filtro selecionado.</p>
          </div>
        ) : (
          allAlertItems.map((item) => {
            const isOverdue = item.alertCategory === 'OVERDUE';
            const isToday = item.alertCategory === 'TODAY';
            const isDueSoon = item.alertCategory === 'DUE_SOON';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                  isOverdue
                    ? 'bg-rose-50 border-rose-500/30 hover:border-rose-500/60'
                    : isToday
                    ? 'bg-amber-50 border-amber-500/30 hover:border-amber-500/60'
                    : 'bg-superficie border-borda hover:border-borda'
                }`}
              >
                {/* Left Info */}
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                    isOverdue
                      ? 'bg-rose-500/20 text-rose-800'
                      : isToday
                      ? 'bg-amber-500/20 text-amber-800'
                      : 'bg-blue-500/20 text-blue-700'
                  }`}>
                    {isOverdue ? <AlertTriangle className="w-5 h-5" /> : isToday ? <Clock className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isOverdue
                          ? 'bg-rose-500/20 text-rose-800'
                          : isToday
                          ? 'bg-amber-500/20 text-amber-800'
                          : 'bg-blue-500/20 text-blue-700'
                      }`}>
                        {isOverdue
                          ? `Atrasado há ${Math.abs(item.diffDays)} dia(s)`
                          : isToday
                          ? 'Vence Hoje!'
                          : `Vence em ${item.diffDays} dia(s)`}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-superficie-2 text-tinta font-mono">
                        {item.type === 'RECEIVABLE' ? 'Receita a Receber' : 'Despesa a Pagar'}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-tinta">{item.title}</div>

                    <div className="text-xs text-tinta-2 flex items-center space-x-3">
                      <span className="flex items-center space-x-1">
                        {item.type === 'RECEIVABLE' ? (
                          <Building className="w-3.5 h-3.5 text-blue-700" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-rose-700" />
                        )}
                        <span>{item.client_name || item.supplier_name || 'PrevSafe'}</span>
                      </span>
                      <span>•</span>
                      <span>Vencimento: <strong className="text-tinta">{formatDate(item.due_date)}</strong></span>
                      {item.document_number && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{item.document_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Amount & Actions */}
                <div className="flex items-center justify-between md:justify-end space-x-4 border-t md:border-t-0 pt-3 md:pt-0 border-borda">
                  <div className="text-left md:text-right">
                    <div className={`font-mono font-bold text-base ${
                      item.type === 'RECEIVABLE' ? 'text-marca-escura' : 'text-rose-700'
                    }`}>
                      {item.type === 'RECEIVABLE' ? '+' : '-'} {formatCurrency(item.final_amount)}
                    </div>
                    <div className="text-[10px] text-tinta-2">
                      {item.category_name}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Send Reminder button */}
                    <button
                      onClick={() => onOpenReminderModal(item)}
                      className="px-3 py-1.5 rounded-xl bg-superficie-2 hover:bg-marca-suave hover:text-marca-escura text-tinta-2 text-xs font-semibold flex items-center space-x-1.5 border border-borda transition"
                      title="Enviar Lembrete via WhatsApp / E-mail"
                    >
                      <Send className="w-3.5 h-3.5 text-marca-escura" />
                      <span>Lembrete</span>
                    </button>

                    {/* Fast Mark as Paid / Settle */}
                    <button
                      onClick={() => onOpenSettlementModal(item)}
                      className="px-3 py-1.5 rounded-xl bg-marca hover:bg-marca-escura text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-950/40 transition"
                      title="Confirmar Baixa / Quitação"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{item.type === 'RECEIVABLE' ? 'Recebido' : 'Pago'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
