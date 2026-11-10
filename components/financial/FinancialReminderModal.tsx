'use client';

import React, { useState } from 'react';
import { FinancialTransaction, ChannelType } from '@/types';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { shareViaChannel } from '@/lib/shareLinks';
import { 
  Send, 
  X, 
  MessageSquare, 
  Mail, 
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
  const { clients = [] } = usePrevSafe();
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setErrorMessage(null);
    const client = transaction.client_id ? clients.find(c => c.id === transaction.client_id) : undefined;

    const res = shareViaChannel(channel, {
      phone: client?.whatsapp || client?.phone,
      email: client?.email,
      subject: `Lembrete de vencimento - ${transaction.title}`,
      message: defaultMessage,
      recipientName,
    });

    if (!res.success) {
      setErrorMessage(res.message);
      return;
    }

    setIsSending(true);
    onSend(transaction.id, channel);
    setIsSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-fundo backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-superficie border border-borda w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-borda bg-marca-suave flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-marca-escura text-white flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-tinta">
                Enviar Notificação & Lembrete de Vencimento
              </h3>
              <p className="text-[11px] text-tinta-2">
                Comunicação automatizada amigável via canais integrados
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-tinta-2 hover:text-tinta p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Card Summary */}
          <div className="p-3.5 bg-fundo rounded-xl border border-borda space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-tinta-2">Destinatário:</span>
              <span className="font-bold text-tinta flex items-center space-x-1">
                <Building className="w-3.5 h-3.5 text-blue-700" />
                <span>{recipientName}</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-tinta-2">Título:</span>
              <span className="text-tinta font-medium truncate max-w-[240px]">{transaction.title}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-borda">
              <span className="text-tinta-2">Vencimento / Valor:</span>
              <span className="font-mono text-marca-escura font-bold">
                {formatDate(transaction.due_date)} • {formatCurrency(transaction.final_amount)}
              </span>
            </div>
          </div>

          {/* Channel selector */}
          <div>
            <label className="block text-tinta font-medium mb-1.5">Canal de Envio Preferencial</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel('WHATSAPP')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                  channel === 'WHATSAPP'
                    ? 'bg-marca-suave border-marca-escura text-marca-escura font-bold'
                    : 'bg-fundo border-borda text-tinta-2 hover:border-borda'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-marca-escura" />
                <span className="text-[11px]">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('EMAIL')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                  channel === 'EMAIL'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-700 font-bold'
                    : 'bg-fundo border-borda text-tinta-2 hover:border-borda'
                }`}
              >
                <Mail className="w-4 h-4 text-blue-700" />
                <span className="text-[11px]">E-mail</span>
              </button>

            </div>
          </div>

          {/* Preview of Message */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-tinta font-medium flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-marca-escura" />
                <span>Prévia da Mensagem Gerada</span>
              </label>
              <span className="text-[10px] text-tinta-2">Modelo Oficial PrevSafe</span>
            </div>
            <div className="p-3 bg-fundo rounded-xl border border-borda text-[11px] text-tinta font-sans leading-relaxed whitespace-pre-wrap">
              {defaultMessage}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-[11px]">
              {errorMessage}
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-borda flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-superficie-2 hover:bg-superficie-3 text-tinta font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSending}
              onClick={handleSend}
              className="px-4 py-2 rounded-xl bg-marca hover:bg-marca-escura text-white font-semibold shadow-lg shadow-emerald-950/40 flex items-center space-x-1.5 transition active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Abrindo...' : 'Abrir mensagem'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
