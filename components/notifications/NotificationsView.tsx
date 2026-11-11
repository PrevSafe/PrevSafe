'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Notification } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { 
  BellRing, 
  MessageSquare, 
  Mail, 
  Phone, 
  Send, 
  CheckCircle2, 
  Clock, 
  Search, 
  RefreshCw, 
  Share2, 
  Sparkles,
  Star
} from 'lucide-react';
import { shareViaChannel } from '@/lib/shareLinks';

export const NotificationsView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    notifications = [], 
    clients = [], 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    runDailyJobSimulation, 
    sendCommunication 
  } = usePrevSafe();

  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSimulateSend, setShowSimulateSend] = useState(false);

  // Manual message form
  const [targetClientId, setTargetClientId] = useState(clients?.[0]?.id || '');
  const [msgChannel, setMsgChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');

  const filteredNotifications = (notifications || []).filter(n => {
    if (!n) return false;
    const matchesChannel = channelFilter === 'ALL' || n.channel === channelFilter;
    const matchesSearch = (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.message || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  const handleSendManual = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === targetClientId);
    const res = shareViaChannel(msgChannel, {
      phone: client?.whatsapp || client?.phone,
      email: client?.email,
      subject: msgTitle,
      message: msgBody,
      recipientName: client?.trade_name || client?.legal_name,
    });

    if (!res.success) {
      alert(res.message);
      return;
    }

    sendCommunication({
      client_id: targetClientId,
      channel: msgChannel,
      direction: 'OUTBOUND',
      subject: msgTitle,
      content: msgBody
    });
    setShowSimulateSend(false);
    alert(res.message);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-superficie border border-borda rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center text-teal-800">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-tinta">Central Multicanal de Notificações</h1>
            <p className="text-xs text-tinta-2 mt-0.5">Disparos transacionais de WhatsApp, E-mail e SMS, automações de SLA e lembretes aos clientes.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSimulateSend(true)}
            className="bg-marca-escura px-4 py-2.5 text-white rounded-2xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
          >
            <Send className="w-4 h-4" />
            <span>Novo Disparo Manual</span>
          </button>
        </div>
      </div>

      {/* Filter and Job Runner Bento Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-superficie p-4 rounded-3xl border border-borda shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-tinta-2 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar histórico de mensagens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-fundo border border-borda rounded-2xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setChannelFilter('ALL')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition ${
              channelFilter === 'ALL' ? 'bg-teal-700 text-white shadow-md' : 'bg-fundo text-tinta hover:text-tinta border border-borda'
            }`}
          >
            Todos ({notifications.length})
          </button>
          <button
            onClick={() => setChannelFilter('WHATSAPP')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition ${
              channelFilter === 'WHATSAPP' ? 'bg-marca-escura text-white shadow-md' : 'bg-fundo text-tinta hover:text-tinta border border-borda'
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setChannelFilter('EMAIL')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition ${
              channelFilter === 'EMAIL' ? 'bg-teal-700 text-white shadow-md' : 'bg-fundo text-tinta hover:text-tinta border border-borda'
            }`}
          >
            E-mail
          </button>
        </div>
      </div>

      {/* Notifications Bento List */}
      <div className="bg-superficie rounded-3xl border border-borda shadow-sm overflow-hidden divide-y divide-borda">
        {filteredNotifications.map((n) => (
          <div 
            key={n.id} 
            className={`p-5 flex items-start justify-between gap-4 transition ${
              n.status === 'UNREAD' ? 'bg-teal-500/5' : 'hover:bg-superficie-2'
            }`}
          >
            <div className="flex items-start space-x-3.5">
              <div className={`p-3 rounded-2xl flex-shrink-0 ${
                n.channel === 'WHATSAPP' ? 'bg-marca-suave text-marca-escura border border-marca-borda' :
                n.channel === 'EMAIL' ? 'bg-teal-500/10 text-teal-800 border border-teal-500/20' : 'bg-teal-500/10 text-teal-800 border border-teal-500/20'
              }`}>
                {n.channel === 'WHATSAPP' ? <MessageSquare className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-tinta">{n.title}</span>
                  <span className="text-[10px] font-mono font-bold bg-fundo text-tinta px-2 py-0.5 rounded-full border border-borda">
                    {n.channel}
                  </span>
                  {n.status === 'UNREAD' && (
                    <span className="w-2 h-2 rounded-full bg-marca animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-tinta max-w-2xl">{n.message}</p>
                <div className="text-[11px] text-tinta-2 font-mono">
                  Enviado em: {formatDateTime(n.sent_at)}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {n.status === 'UNREAD' && (
                <button
                  onClick={() => markNotificationAsRead(n.id)}
                  className="text-xs text-teal-700 hover:text-teal-700 font-medium transition"
                >
                  Marcar como lida
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Manual Send Modal */}
      {showSimulateSend && (
        <div className="fixed inset-0 bg-fundo backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-superficie rounded-3xl max-w-md w-full p-6 shadow-sm border border-borda text-tinta">
            <div className="flex items-center justify-between border-b border-borda pb-3 mb-4">
              <h3 className="text-sm font-bold text-tinta">Disparo de Notificação Multicanal</h3>
              <button onClick={() => setShowSimulateSend(false)} className="text-tinta-2 hover:text-tinta">✕</button>
            </div>

            <form onSubmit={handleSendManual} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-tinta mb-1">Cliente Destinatário</label>
                <select
                  value={targetClientId}
                  onChange={(e) => setTargetClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-fundo border border-borda rounded-xl text-xs text-tinta focus:outline-none focus:border-teal-500"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.trade_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-tinta mb-1">Canal de Envio</label>
                <select
                  value={msgChannel}
                  onChange={(e) => setMsgChannel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-fundo border border-borda rounded-xl text-xs text-tinta focus:outline-none focus:border-teal-500"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">E-mail</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-tinta mb-1">Assunto / Título *</label>
                <input
                  type="text"
                  required
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-fundo border border-borda rounded-xl text-xs text-tinta focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-tinta mb-1">Corpo da Mensagem *</label>
                <textarea
                  rows={3}
                  required
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  className="w-full px-3 py-2 bg-fundo border border-borda rounded-xl text-xs text-tinta focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-borda">
                <button
                  type="button"
                  onClick={() => setShowSimulateSend(false)}
                  className="px-4 py-2 bg-superficie-2 text-tinta rounded-xl font-semibold hover:bg-superficie-3"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-marca-escura hover:opacity-90 text-white rounded-xl font-bold shadow-md"
                >
                  Disparar Agora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const EvaluationsView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    evaluations = [], 
    clients = [], 
    serviceOrders = [] 
  } = usePrevSafe();

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-superficie border border-borda rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-800">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-tinta">Avaliações de Clientes & NPS</h1>
            <p className="text-xs text-tinta-2 mt-0.5">Pesquisas de satisfação pós-entrega de laudos, critérios de 1 a 5 e oportunidades de renovação contratual.</p>
          </div>
        </div>
      </div>

      {/* Grid of Evaluations in Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {evaluations.map((ev) => {
          const client = clients.find(c => c.id === ev.client_id);
          const os = serviceOrders.find(o => o.id === ev.service_order_id);

          return (
            <div key={ev.id} className="bg-superficie p-6 rounded-3xl border border-borda shadow-sm space-y-4 flex flex-col justify-between hover:border-borda transition">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-bold text-tinta">{ev.service_title}</span>
                    <div className="text-xs text-tinta-2 mt-0.5">{client?.trade_name}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-marca-escura font-mono">
                      NPS {ev.nps_score}/10
                    </span>
                    <div className="text-xs text-amber-700">
                      {'★'.repeat(ev.overall_score)}
                    </div>
                  </div>
                </div>

                {/* Criteria detail */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-fundo p-3.5 rounded-2xl border border-borda mt-3 text-tinta">
                  <div>Qualidade Técnica: <strong className="text-tinta">{ev.quality_score}/5</strong></div>
                  <div>Pontualidade: <strong className="text-tinta">{ev.deadline_score}/5</strong></div>
                  <div>Atendimento: <strong className="text-tinta">{ev.service_score}/5</strong></div>
                  <div>Comunicação: <strong className="text-tinta">{ev.communication_score}/5</strong></div>
                </div>

                <p className="text-xs text-tinta italic mt-3">
                  &ldquo;{ev.comment}&rdquo;
                </p>
              </div>

              <div className="pt-3.5 border-t border-borda flex items-center justify-between text-[11px] text-tinta-2">
                <span className="font-mono text-tinta-2">{formatDate(ev.created_at)}</span>
                <span className="text-marca-escura font-semibold bg-marca-suave border border-marca-borda px-2.5 py-0.5 rounded-full">
                  Cliente Promotor
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
