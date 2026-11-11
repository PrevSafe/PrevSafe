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
    <div className="fixed inset-0 z-50 bg-fundo backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-superficie border border-borda w-full max-w-lg rounded-2xl shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`p-4 border-b border-borda flex items-center justify-between ${
          isAlreadyReconciled ? 'bg-marca-suave' : 'bg-teal-50'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isAlreadyReconciled ? 'bg-marca-escura text-white' : 'bg-teal-700 text-white'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-tinta">
                {isAlreadyReconciled ? 'Conciliação Bancária Confirmada' : 'Realizar Conciliação Bancária'}
              </h3>
              <p className="text-[11px] text-tinta-2">
                Auditoria de extrato bancário, NSU e conferência de fluxo
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-tinta-2 hover:text-tinta p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Summary */}
        <form onSubmit={handleConfirm} className="p-5 space-y-4 text-xs">
          <div className="p-3.5 bg-fundo rounded-xl border border-borda space-y-2">
            <div className="flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                transaction.type === 'RECEIVABLE' ? 'bg-marca-suave text-marca-escura' : 'bg-rose-500/20 text-rose-800'
              }`}>
                {transaction.type === 'RECEIVABLE' ? 'Receita a Receber' : 'Despesa a Pagar'}
              </span>
              <span className="text-[11px] text-tinta-2 font-mono">
                Vencimento: {formatDate(transaction.due_date)}
              </span>
            </div>
            
            <div className="font-bold text-sm text-tinta">{transaction.title}</div>
            
            <div className="text-tinta-2 text-xs flex items-center justify-between pt-1 border-t border-borda">
              <span>{transaction.client_name || transaction.supplier_name || 'PrevSafe'}</span>
              <span className={`font-mono font-bold text-sm ${
                transaction.type === 'RECEIVABLE' ? 'text-marca-escura' : 'text-rose-700'
              }`}>
                {formatCurrency(transaction.final_amount)}
              </span>
            </div>
          </div>

          {/* Current Status Badge */}
          {isAlreadyReconciled && !isUnreconcileMode && (
            <div className="p-3 rounded-xl bg-marca-suave border border-marca-borda space-y-1 text-[11px]">
              <div className="flex items-center space-x-1.5 text-marca-escura font-semibold">
                <Check className="w-4 h-4" />
                <span>Registro conciliado com o extrato da conta!</span>
              </div>
              <div className="text-tinta-2">
                Conciliado por: <span className="text-tinta">{transaction.reconciled_by || 'não registrado'}</span>
              </div>
              <div className="text-tinta-2">
                Data de Conciliação: <span className="text-tinta">{formatDate(transaction.reconciled_at)}</span>
              </div>
              <div className="text-tinta-2 font-mono">
                Código NSU/Ref: <span className="text-marca-escura">{transaction.reconciliation_ref || '-'}</span>
              </div>
            </div>
          )}

          {!isUnreconcileMode ? (
            <>
              {/* Reference / NSU Input */}
              <div>
                <label className="block text-tinta font-medium mb-1">
                  Código de Autenticação Bancária / NSU / Extrato *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: NSU-849201, EXT-2026-0814 ou Autenticação PIX"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value)}
                  className="w-full bg-fundo border border-borda rounded-xl px-3 py-2 text-tinta focus:outline-none focus:border-marca-escura font-mono"
                />
              </div>

              {/* Operator */}
              <div>
                <label className="block text-tinta font-medium mb-1">
                  Responsável pela Conferência
                </label>
                <input
                  type="text"
                  required
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full bg-fundo border border-borda rounded-xl px-3 py-2 text-tinta focus:outline-none focus:border-marca-escura"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-tinta font-medium mb-1">
                  Notas / Observações de Auditoria
                </label>
                <input
                  type="text"
                  placeholder="Ex: Conferido extrato Santander C/C 45019-2 com crédito compensado."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-fundo border border-borda rounded-xl px-3 py-2 text-tinta placeholder-tinta-3 focus:outline-none focus:border-marca-escura"
                />
              </div>
            </>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center space-x-1.5 text-amber-700 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Confirmar Estorno de Conciliação</span>
              </div>
              <p className="text-tinta-2 text-[11px]">
                O título retornará ao status de &quot;Pendente de Conciliação&quot; para reavaliação.
              </p>
              <div>
                <label className="block text-tinta font-medium mb-1">Motivo do Estorno *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lançamento duplicado no extrato ou divergência de centavos"
                  value={unreconcileReason}
                  onChange={(e) => setUnreconcileReason(e.target.value)}
                  className="w-full bg-fundo border border-borda rounded-xl px-3 py-2 text-tinta focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-borda flex items-center justify-between">
            {isAlreadyReconciled && !isUnreconcileMode ? (
              <button
                type="button"
                onClick={() => setIsUnreconcileMode(true)}
                className="px-3 py-1.5 rounded-xl bg-superficie-2 hover:bg-amber-50 text-amber-700 text-xs font-semibold flex items-center space-x-1 transition"
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
                className="px-4 py-2 rounded-xl bg-superficie-2 hover:bg-superficie-3 text-tinta font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl text-tinta font-semibold shadow-lg transition ${
                  isUnreconcileMode 
                    ? 'bg-amber-600 hover:bg-amber-500' 
                    : 'bg-marca hover:bg-marca-escura'
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
