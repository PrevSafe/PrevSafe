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

export const NotificationsView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    notifications, 
    clients, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    runDailyJobSimulation, 
    sendCommunication 
  } = usePrevSafe();

  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSimulateSend, setShowSimulateSend] = useState(false);

  // Manual message form
  const [targetClientId, setTargetClientId] = useState(clients[0]?.id || '');
  const [msgChannel, setMsgChannel] = useState<'WHATSAPP' | 'EMAIL' | 'SMS'>('WHATSAPP');
  const [msgTitle, setMsgTitle] = useState('Alerta de Vencimento de Exames Periódicos (PCMSO)');
  const [msgBody, setMsgBody] = useState('Prezados, informamos que 12 colaboradores estão com exame periódico a vencer em 15 dias. Acesse o portal para agendamento.');

  const filteredNotifications = notifications.filter(n => {
    const matchesChannel = channelFilter === 'ALL' || n.channel === channelFilter;
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  const handleSendManual = (e: React.FormEvent) => {
    e.preventDefault();
    sendCommunication({
      client_id: targetClientId,
      channel: msgChannel,
      direction: 'OUTBOUND',
      subject: msgTitle,
      content: msgBody
    });
    setShowSimulateSend(false);
    alert(`Mensagem transmitida com sucesso através do canal ${msgChannel}!`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Central Multicanal de Notificações</h1>
            <p className="text-xs text-slate-400 mt-0.5">Disparos transacionais de WhatsApp, E-mail e SMS, automações de SLA e lembretes aos clientes.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSimulateSend(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition flex items-center space-x-1.5"
          >
            <Send className="w-4 h-4" />
            <span>Novo Disparo Manual</span>
          </button>
        </div>
      </div>

      {/* Filter and Job Runner Bento Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar histórico de mensagens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setChannelFilter('ALL')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition ${
              channelFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todos ({notifications.length})
          </button>
          <button
            onClick={() => setChannelFilter('WHATSAPP')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition ${
              channelFilter === 'WHATSAPP' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setChannelFilter('EMAIL')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition ${
              channelFilter === 'EMAIL' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            E-mail
          </button>
        </div>
      </div>

      {/* Notifications Bento List */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden divide-y divide-slate-800/80">
        {filteredNotifications.map((n) => (
          <div 
            key={n.id} 
            className={`p-5 flex items-start justify-between gap-4 transition ${
              n.status === 'UNREAD' ? 'bg-indigo-500/5' : 'hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-start space-x-3.5">
              <div className={`p-3 rounded-2xl flex-shrink-0 ${
                n.channel === 'WHATSAPP' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                n.channel === 'EMAIL' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              }`}>
                {n.channel === 'WHATSAPP' ? <MessageSquare className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-white">{n.title}</span>
                  <span className="text-[10px] font-mono font-bold bg-slate-950 text-slate-300 px-2 py-0.5 rounded-full border border-slate-800">
                    {n.channel}
                  </span>
                  {n.status === 'UNREAD' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-slate-300 max-w-2xl">{n.message}</p>
                <div className="text-[11px] text-slate-500 font-mono">
                  Enviado em: {formatDateTime(n.sent_at)}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {n.status === 'UNREAD' && (
                <button
                  onClick={() => markNotificationAsRead(n.id)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white">Disparo de Notificação Multicanal</h3>
              <button onClick={() => setShowSimulateSend(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSendManual} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Cliente Destinatário</label>
                <select
                  value={targetClientId}
                  onChange={(e) => setTargetClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.trade_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Canal de Envio</label>
                <select
                  value={msgChannel}
                  onChange={(e) => setMsgChannel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="WHATSAPP">WhatsApp Direto</option>
                  <option value="EMAIL">E-mail Corporativo</option>
                  <option value="SMS">SMS Urgente</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Assunto / Título *</label>
                <input
                  type="text"
                  required
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Corpo da Mensagem *</label>
                <textarea
                  rows={3}
                  required
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSimulateSend(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md"
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
  const { evaluations, clients, serviceOrders } = usePrevSafe();

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Avaliações de Clientes & NPS</h1>
            <p className="text-xs text-slate-400 mt-0.5">Pesquisas de satisfação pós-entrega de laudos, critérios de 1 a 5 e oportunidades de renovação contratual.</p>
          </div>
        </div>
      </div>

      {/* Grid of Evaluations in Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {evaluations.map((ev) => {
          const client = clients.find(c => c.id === ev.client_id);
          const os = serviceOrders.find(o => o.id === ev.service_order_id);

          return (
            <div key={ev.id} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between hover:border-slate-700 transition">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-bold text-white">{ev.service_title}</span>
                    <div className="text-xs text-slate-400 mt-0.5">{client?.trade_name}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-emerald-400 font-mono">
                      NPS {ev.nps_score}/10
                    </span>
                    <div className="text-xs text-amber-400">
                      {'★'.repeat(ev.overall_score)}
                    </div>
                  </div>
                </div>

                {/* Criteria detail */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 mt-3 text-slate-300">
                  <div>Qualidade Técnica: <strong className="text-white">{ev.quality_score}/5</strong></div>
                  <div>Pontualidade: <strong className="text-white">{ev.deadline_score}/5</strong></div>
                  <div>Atendimento: <strong className="text-white">{ev.service_score}/5</strong></div>
                  <div>Comunicação: <strong className="text-white">{ev.communication_score}/5</strong></div>
                </div>

                <p className="text-xs text-slate-300 italic mt-3">
                  &ldquo;{ev.comment}&rdquo;
                </p>
              </div>

              <div className="pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-slate-500">{formatDate(ev.created_at)}</span>
                <span className="text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
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
