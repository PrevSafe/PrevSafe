'use client';

import React, { useState } from 'react';
import { FinancialTransaction, ChannelType } from '@/types';
import { 
  Send, 
  X, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  CheckCircle2, 
  Building, 
  Clock, 
  DollarSign, 
  Sparkles 
} from 'lucide-react';

interface FinancialReminderModalProps {
  transaction: FinancialTransaction;
  onClose: () => void;
  onSend: (id: string, channel: ChannelType) => void;
}

export const FinancialReminderModal: React.FC<FinancialReminderModalProps> = ({
  transaction,
  onClose,
  onSend
}) => {
  const [channel, setChannel] = useState<ChannelType>('WHATSAPP');
  const [isSending, setIsSending] = useState(false);

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

  const recipientName = transaction.type === 'RECEIVABLE'
    ? (transaction.client_name || 'Cliente PrevSafe')
    : (transaction.supplier_name || 'Fornecedor Credenciado');

  const defaultMessage = transaction.type === 'RECEIVABLE'
    ? `Olá, equipe ${recipientName}! Lembramos que o faturamento de serviços de SST "${transaction.title}" no valor de ${formatCurrency(transaction.final_amount)} possui vencimento programado para ${formatDate(transaction.due_date)}. Qualquer dúvida ou para envio do comprovante, estamos à total disposição!`
    : `Prezado(a) ${recipientName}, informamos que o pagamento referente a "${transaction.title}" no valor de ${formatCurrency(transaction.final_amount)} está com quitação agendada para ${formatDate(transaction.due_date)}.`;

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      onSend(transaction.id, channel);
      setIsSending(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-emerald-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Enviar Notificação & Lembrete de Vencimento
              </h3>
              <p className="text-[11px] text-slate-400">
                Comunicação automatizada amigável via canais integrados
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Card Summary */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Destinatário:</span>
              <span className="font-bold text-white flex items-center space-x-1">
                <Building className="w-3.5 h-3.5 text-blue-400" />
                <span>{recipientName}</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Título:</span>
              <span className="text-slate-200 font-medium truncate max-w-[240px]">{transaction.title}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
              <span className="text-slate-400">Vencimento / Valor:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {formatDate(transaction.due_date)} • {formatCurrency(transaction.final_amount)}
              </span>
            </div>
          </div>

          {/* Channel selector */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Canal de Envio Preferencial</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel('WHATSAPP')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                  channel === 'WHATSAPP'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px]">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('EMAIL')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                  channel === 'EMAIL'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Mail className="w-4 h-4 text-blue-400" />
                <span className="text-[11px]">E-mail</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('SMS')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                  channel === 'SMS'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Smartphone className="w-4 h-4 text-purple-400" />
                <span className="text-[11px]">SMS</span>
              </button>
            </div>
          </div>

          {/* Preview of Message */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-medium flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Prévia da Mensagem Gerada</span>
              </label>
              <span className="text-[10px] text-slate-500">Modelo Oficial PrevSafe</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
              {defaultMessage}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSending}
              onClick={handleSend}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-950/40 flex items-center space-x-1.5 transition active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Disparando...' : 'Disparar Lembrete'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
