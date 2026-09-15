'use client';

import React, { useState } from 'react';
import { FinancialTransaction } from '@/types';
import { 
  ShieldCheck, 
  X, 
  Check, 
  FileCheck, 
  Building, 
  Calendar, 
  DollarSign, 
  RotateCcw,
  AlertCircle
} from 'lucide-react';

interface FinancialReconciliationModalProps {
  transaction: FinancialTransaction;
  onClose: () => void;
  onReconcile: (id: string, options: {
    reconciled_by?: string;
    reconciliation_ref?: string;
    reconciliation_notes?: string;
  }) => void;
  onUnreconcile?: (id: string, reason: string) => void;
  currentOperatorName: string;
}

export const FinancialReconciliationModal: React.FC<FinancialReconciliationModalProps> = ({
  transaction,
  onClose,
  onReconcile,
  onUnreconcile,
  currentOperatorName
}) => {
  const isAlreadyReconciled = transaction.reconciliation_status === 'RECONCILED';
  
  const [operator, setOperator] = useState(transaction.reconciled_by || currentOperatorName);
  const [refCode, setRefCode] = useState(
    () => transaction.reconciliation_ref || `NSU-${transaction.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '849201'}`
  );
  const [notes, setNotes] = useState(transaction.reconciliation_notes || '');
  const [unreconcileReason, setUnreconcileReason] = useState('');
  const [isUnreconcileMode, setIsUnreconcileMode] = useState(false);

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

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUnreconcileMode) {
      if (onUnreconcile) {
        onUnreconcile(transaction.id, unreconcileReason.trim() || 'Estorno solicitado pelo operador');
      }
      onClose();
      return;
    }

    onReconcile(transaction.id, {
      reconciled_by: operator.trim() || currentOperatorName,
      reconciliation_ref: refCode.trim(),
      reconciliation_notes: notes.trim() || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`p-4 border-b border-slate-800 flex items-center justify-between ${
          isAlreadyReconciled ? 'bg-emerald-950/40' : 'bg-blue-950/40'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isAlreadyReconciled ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isAlreadyReconciled ? 'Conciliação Bancária Confirmada' : 'Realizar Conciliação Bancária'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Auditoria de extrato bancário, NSU e conferência de fluxo
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Summary */}
        <form onSubmit={handleConfirm} className="p-5 space-y-4 text-xs">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                transaction.type === 'RECEIVABLE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {transaction.type === 'RECEIVABLE' ? 'Receita a Receber' : 'Despesa a Pagar'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Vencimento: {formatDate(transaction.due_date)}
              </span>
            </div>
            
            <div className="font-bold text-sm text-white">{transaction.title}</div>
            
            <div className="text-slate-400 text-xs flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span>{transaction.client_name || transaction.supplier_name || 'PrevSafe'}</span>
              <span className={`font-mono font-bold text-sm ${
                transaction.type === 'RECEIVABLE' ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatCurrency(transaction.final_amount)}
              </span>
            </div>
          </div>

          {/* Current Status Badge */}
          {isAlreadyReconciled && !isUnreconcileMode && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1 text-[11px]">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <Check className="w-4 h-4" />
                <span>Registro conciliado com o extrato da conta!</span>
              </div>
              <div className="text-slate-400">
                Conciliado por: <span className="text-slate-200">{transaction.reconciled_by || 'Operador'}</span>
              </div>
              <div className="text-slate-400">
                Data de Conciliação: <span className="text-slate-200">{formatDate(transaction.reconciled_at)}</span>
              </div>
              <div className="text-slate-400 font-mono">
                Código NSU/Ref: <span className="text-emerald-300">{transaction.reconciliation_ref || '-'}</span>
              </div>
            </div>
          )}

          {!isUnreconcileMode ? (
            <>
              {/* Reference / NSU Input */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Código de Autenticação Bancária / NSU / Extrato *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: NSU-849201, EXT-2026-0814 ou Autenticação PIX"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Operator */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Responsável pela Conferência
                </label>
                <input
                  type="text"
                  required
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Notas / Observações de Auditoria
                </label>
                <input
                  type="text"
                  placeholder="Ex: Conferido extrato Santander C/C 45019-2 com crédito compensado."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2">
              <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Confirmar Estorno de Conciliação</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                O título retornará ao status de &quot;Pendente de Conciliação&quot; para reavaliação.
              </p>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Motivo do Estorno *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lançamento duplicado no extrato ou divergência de centavos"
                  value={unreconcileReason}
                  onChange={(e) => setUnreconcileReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            {isAlreadyReconciled && !isUnreconcileMode ? (
              <button
                type="button"
                onClick={() => setIsUnreconcileMode(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-950/60 text-amber-400 text-xs font-semibold flex items-center space-x-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Estornar Conciliação</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl text-white font-semibold shadow-lg transition ${
                  isUnreconcileMode 
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/40' 
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                }`}
              >
                {isUnreconcileMode ? 'Confirmar Estorno' : (isAlreadyReconciled ? 'Atualizar Dados' : 'Confirmar Conciliação')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
