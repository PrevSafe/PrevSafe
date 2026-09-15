'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Stethoscope, 
  FileText, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  X 
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface SSTDeadlineAlertBannerProps {
  onNavigate?: (view: string) => void;
}

export const SSTDeadlineAlertBanner: React.FC<SSTDeadlineAlertBannerProps> = ({ onNavigate }) => {
  const { 
    employees = [], 
    serviceOrders = [], 
    clients = [], 
    esocialConfig, 
    checkSSTDeadlinesAndNotify 
  } = usePrevSafe();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Compute live SST deadline stats
  const now = new Date();
  const examWarningDays = esocialConfig?.sla_exam_warning_days || 30;
  const docWarningDays = esocialConfig?.sla_document_warning_days || 15;

  const urgentExams = (employees || []).filter(emp => {
    if (!emp) return false;
    const examDate = emp.next_aso_date || emp.periodic_exam_due_date;
    if (!examDate) return false;
    const dueDate = new Date(examDate);
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= examWarningDays;
  });

  const urgentDocs = (serviceOrders || []).filter(os => {
    if (!os || os.status === 'COMPLETED' || os.status === 'CANCELLED' || !os.due_date) return false;
    const dueDate = new Date(os.due_date);
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= docWarningDays;
  });

  const totalUrgent = urgentExams.length + urgentDocs.length;

  if (totalUrgent === 0 || isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20 flex-shrink-0 animate-pulse">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Monitor de Prazos SST eSocial (SLA Ativo)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {totalUrgent} alertas de vencimento
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Exames periódicos (S-2220) em <strong>{examWarningDays} dias</strong> e laudos técnicos (PGR/PCMSO) em <strong>{docWarningDays} dias</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-2xl text-xs font-semibold border border-slate-700 transition flex items-center space-x-1.5"
          >
            <span>{isExpanded ? 'Recolher Alertas' : 'Ver Detalhes'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate('esocial_events')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-indigo-950/40 flex items-center space-x-1.5"
            >
              <span>Gerar S-2220 / Eventos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition"
            title="Dispensar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Breakdown */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-in fade-in">
          {/* Urgent Exams (S-2220) */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 flex items-center space-x-1.5">
                <Stethoscope className="w-4 h-4 text-amber-400" />
                <span>Exames ASO a Vencer / Vencidos ({urgentExams.length})</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Evento S-2220</span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {urgentExams.map(emp => {
                const client = clients.find(c => c.id === emp.client_id);
                const examDate = emp.next_aso_date || emp.periodic_exam_due_date;
                const isOverdue = examDate ? new Date(examDate) < now : false;
                return (
                  <div key={emp.id} className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-100">{emp.name}</div>
                      <div className="text-[10px] text-slate-400">{client?.trade_name || 'Cliente'} • {emp.job_title || emp.role_title}</div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                        isOverdue ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {isOverdue ? 'VENCIDO' : 'VENCE EM BREVE'}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {examDate ? formatDate(examDate) : '-'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Urgent Technical Documents (PGR/PCMSO) */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-300 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Laudos e Documentos Técnicos no SLA ({urgentDocs.length})</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">PGR / PCMSO</span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {urgentDocs.map(os => {
                const client = clients.find(c => c.id === os.client_id);
                const isOverdue = new Date(os.due_date) < now;
                return (
                  <div key={os.id} className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-100 font-mono">{os.os_number} - {os.title}</div>
                      <div className="text-[10px] text-slate-400">{client?.trade_name || 'Cliente'} • {os.technical_responsible_name}</div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                        isOverdue ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {isOverdue ? 'SLA ESTOURADO' : 'PRÓXIMO DO SLA'}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(os.due_date)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
