'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { formatDate } from '@/lib/utils';
import { 
  Users, 
  FileSpreadsheet, 
  FileSignature, 
  Briefcase, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  Star,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Activity,
  Layers,
  ArrowRight,
  Download,
  Printer
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line,
  CartesianGrid
} from 'recharts';
import { SSTDeadlineAlertBanner } from '@/components/esocial/SSTDeadlineAlertBanner';
import { ServiceSummaryPdfModal } from '@/components/services/ServiceSummaryPdfModal';
import { exportESocialEventLogsPdf } from '@/lib/pdfExportService';

export const ExecutiveDashboard: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    clients = [], 
    proposals = [], 
    contracts = [], 
    serviceOrders = [], 
    requests = [], 
    evaluations = [], 
    esocialEvents = [], 
    esocialConfig, 
    organization, 
    profiles = [], 
    transactions = [] 
  } = usePrevSafe();
  const [showPdfModal, setShowPdfModal] = useState(false);

  const activeClientsCount = (clients || []).filter(c => c?.status === 'ACTIVE').length;
  const openProposalsCount = (proposals || []).filter(p => p?.status === 'DRAFT' || p?.status === 'SENT' || p?.status === 'NEGOTIATION').length;
  const approvedProposalsCount = (proposals || []).filter(p => p?.status === 'APPROVED').length;
  const activeContractsCount = (contracts || []).filter(c => c?.status === 'ACTIVE' || c?.status === 'SIGNED').length;
  const inProgressOSCount = (serviceOrders || []).filter(o => o?.status === 'IN_PROGRESS' || o?.status === 'READY' || o?.status === 'SCHEDULED').length;
  
  // eSocial Status Calculations
  const esocialPendingCount = (esocialEvents || []).filter(e => e?.status === 'READY_TO_SEND' || e?.status === 'DRAFT' || e?.status === 'VALIDATED').length;
  const esocialProcessingCount = (esocialEvents || []).filter(e => e?.status === 'PROCESSING').length;
  const esocialAcceptedCount = (esocialEvents || []).filter(e => e?.status === 'SUCCESS').length;
  const esocialErrorCount = (esocialEvents || []).filter(e => e?.status === 'REJECTED').length;

  const s2210Count = (esocialEvents || []).filter(e => e?.event_type === 'S-2210').length;
  const s2220Count = (esocialEvents || []).filter(e => e?.event_type === 'S-2220').length;
  const s2230Count = (esocialEvents || []).filter(e => e?.event_type === 'S-2230').length;
  const s2240Count = (esocialEvents || []).filter(e => e?.event_type === 'S-2240').length;

  const delayedOSCount = (serviceOrders || []).filter(o => {
    if (!o || o.status === 'COMPLETED' || o.status === 'CANCELLED') return false;
    return new Date(o.due_date) < new Date();
  }).length;

  const openRequestsCount = (requests || []).filter(r => r?.status === 'OPEN').length;
  const totalContractedValue = (contracts || []).reduce((acc, c) => acc + (c?.total_value || 0), 0);
  // Recebido = contas a receber efetivamente baixadas no financeiro (nunca estimado sobre o contratado).
  const totalReceivedValue = (transactions || [])
    .filter(t => t?.type === 'RECEIVABLE' && t?.status === 'PAID')
    .reduce((acc, t) => acc + (t?.final_amount || t?.amount || 0), 0);

  const averageNps = (evaluations || []).length > 0
    ? ((evaluations || []).reduce((acc, e) => acc + (e?.nps_score || 0), 0) / evaluations.length).toFixed(1)
    : '—';

  const averageSatisfaction = (evaluations || []).length > 0
    ? ((evaluations || []).reduce((acc, e) => acc + (e?.overall_score || 0), 0) / evaluations.length).toFixed(1)
    : '—';

  const osStatusData = [
    { name: 'Em Execução', value: inProgressOSCount, fill: '#6366f1' },
    { name: 'Aguard. Aceite', value: (serviceOrders || []).filter(o => o?.status === 'WAITING_ACCEPTANCE').length, fill: '#a855f7' },
    { name: 'Concluídas', value: (serviceOrders || []).filter(o => o?.status === 'ACCEPTED' || o?.status === 'COMPLETED').length, fill: '#10b981' },
    { name: 'Atrasadas', value: delayedOSCount, fill: '#f43f5e' },
    { name: 'Retrabalho', value: (serviceOrders || []).filter(o => o?.status === 'REWORK').length, fill: '#f59e0b' },
  ];

  // Serviços mais demandados: contagem real de OS por tipo/serviço contratado.
  const SERVICE_TYPE_COLORS = ['#10b981', '#6366f1', '#0ea5e9', '#f59e0b', '#ec4899', '#a855f7'];
  const serviceTypeCounts = (serviceOrders || []).reduce<Record<string, number>>((acc, os) => {
    const key = os?.service_name || os?.title || 'Não classificado';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const serviceTypeData = Object.entries(serviceTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count], idx) => ({ name, count, color: SERVICE_TYPE_COLORS[idx % SERVICE_TYPE_COLORS.length] }));
  const serviceTypeMax = serviceTypeData.reduce((max, item) => Math.max(max, item.count), 0) || 1;

  // Evolução real dos últimos 6 meses: contratos assinados no mês x recebimentos baixados no mês.
  const monthlyRevenueData = Array.from({ length: 6 }, (_, i) => {
    const ref = new Date();
    ref.setDate(1);
    ref.setMonth(ref.getMonth() - (5 - i));
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const inMonth = (value?: string) => {
      if (!value) return false;
      const d = new Date(value);
      return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
    };
    const contratada = (contracts || [])
      .filter(c => inMonth(c?.signed_at || c?.start_date || c?.created_at))
      .reduce((acc, c) => acc + (c?.total_value || 0), 0);
    const faturada = (transactions || [])
      .filter(t => t?.type === 'RECEIVABLE' && t?.status === 'PAID' && inMonth(t?.payment_date || t?.due_date))
      .reduce((acc, t) => acc + (t?.final_amount || t?.amount || 0), 0);
    return {
      month: ref.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      contratada,
      faturada
    };
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Alertas Automáticos de Prazos SST (Exames S-2220 e Laudos PGR/PCMSO conforme SLA) */}
      <SSTDeadlineAlertBanner onNavigate={onNavigate} />

      {/* Header Bento Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Painel Executivo</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Visão Integrada SST</h1>
          <p className="text-xs text-slate-400 mt-0.5">Gestão de ponta a ponta dos serviços contratados, SLA e entregas técnicas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            id="btn-exec-export-os-summary-pdf"
            onClick={() => setShowPdfModal(true)}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            title="Exportar Resumo Consolidado de Serviços em PDF"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar Resumo de Serviços (PDF)</span>
          </button>

          <button 
            onClick={() => onNavigate('service-orders')}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition flex items-center space-x-2"
          >
            <span>Gerenciar Ordens de Serviço</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bento Grid - Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Active Clients */}
        <div 
          onClick={() => onNavigate('crm-clients')}
          className="bg-slate-900 p-5 rounded-3xl border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 cursor-pointer transition shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clientes Ativos</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white tracking-tight">{activeClientsCount}</div>
            <div className="text-[11px] text-emerald-400 flex items-center mt-1.5 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> 100% Retenção Anual
            </div>
          </div>
        </div>

        {/* Proposals */}
        <div 
          onClick={() => onNavigate('proposals')}
          className="bg-slate-900 p-5 rounded-3xl border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/80 cursor-pointer transition shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Propostas Abertas</span>
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white tracking-tight">{openProposalsCount}</div>
            <div className="text-[11px] text-indigo-300 mt-1.5 font-medium">
              {approvedProposalsCount} aprovadas no ciclo
            </div>
          </div>
        </div>

        {/* Active Contracts */}
        <div 
          onClick={() => onNavigate('contracts')}
          className="bg-slate-900 p-5 rounded-3xl border border-slate-800 hover:border-violet-500/50 hover:bg-slate-900/80 cursor-pointer transition shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contratos Vigentes</span>
            <div className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <FileSignature className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white tracking-tight">{activeContractsCount}</div>
            <div className="text-[11px] text-violet-300 mt-1.5 font-medium font-mono">
              R$ {totalContractedValue.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Active OS */}
        <div 
          onClick={() => onNavigate('service-orders')}
          className="bg-slate-900 p-5 rounded-3xl border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900/80 cursor-pointer transition shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">OS em Execução</span>
            <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white tracking-tight">{inProgressOSCount}</div>
            <div className="text-[11px] mt-1.5 font-medium">
              {delayedOSCount > 0 ? (
                <span className="text-rose-400 font-semibold">{delayedOSCount} com alerta de prazo</span>
              ) : (
                <span className="text-emerald-400">100% no prazo SLA</span>
              )}
            </div>
          </div>
        </div>

        {/* Customer NPS */}
        <div 
          onClick={() => onNavigate('evaluations')}
          className="bg-slate-900 p-5 rounded-3xl border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/80 cursor-pointer transition shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">NPS / Satisfação</span>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white tracking-tight">{averageNps} <span className="text-sm font-normal text-slate-400">/ 10</span></div>
            <div className="text-[11px] text-amber-400 mt-1.5 font-medium">
              Nota Média {averageSatisfaction} ★
            </div>
          </div>
        </div>
      </div>

      {/* Critical Action Banner if any delay or open pendencies */}
      {(delayedOSCount > 0 || openRequestsCount > 0) && (
        <div className="p-5 bg-amber-950/30 border border-amber-500/30 rounded-3xl flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Atenção Gerencial Necessária</div>
              <p className="text-xs text-slate-300 mt-0.5">
                Existem <strong>{openRequestsCount} pendências em aberto com clientes</strong> e <strong>{delayedOSCount} serviço(s) próximo(s) do limite de SLA</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => onNavigate('requests')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-bold transition shadow-lg"
            >
              Resolver Pendências
            </button>
          </div>
        </div>
      )}

      {/* Card de Visualização Rápida: Status de Transmissão do eSocial */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">Status de Envio eSocial (SST Oficial)</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                  esocialConfig.environment === 'PRODUCAO' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  Ambiente {esocialConfig.environment === 'PRODUCAO' ? 'Produção' : 'Homologação'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-300 bg-slate-800 border border-slate-700">
                  Certificado A1 {esocialConfig.certificate.status === 'VALID' ? '✅ Válido' : '⚠️ Pendente'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Monitoramento dos eventos de SST: S-2210 (CAT), S-2220 (ASO), S-2230 (Afastamento) e S-2240 (Riscos Ambientais).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-exec-export-esocial-logs-pdf"
              onClick={() => {
                exportESocialEventLogsPdf({
                  organization,
                  clients,
                  events: esocialEvents
                });
              }}
              className="px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
              title="Exportar Relatório e Log Completo de Transmissões eSocial em PDF"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Exportar Logs eSocial (PDF)</span>
            </button>

            <button
              onClick={() => onNavigate('esocial_config')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-semibold border border-slate-700 transition flex items-center space-x-1.5"
            >
              <span>Configurações & Certificado</span>
            </button>
            <button
              onClick={() => onNavigate('esocial_events')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-indigo-950/40 flex items-center space-x-2"
            >
              <span>Painel de Eventos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Status Cards com Links Diretos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {/* Pendentes */}
          <div 
            onClick={() => onNavigate('esocial_events')}
            className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-950 cursor-pointer transition flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pendentes de Envio</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 group-hover:animate-ping" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-400 font-mono">{esocialPendingCount}</span>
              <span className="text-[11px] text-amber-300/80 group-hover:text-amber-300 font-medium flex items-center">
                Transmitir lote <ArrowRight className="w-3 h-3 ml-1" />
              </span>
            </div>
          </div>

          {/* Em Processamento */}
          <div 
            onClick={() => onNavigate('esocial_events')}
            className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-950 cursor-pointer transition flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Em Processamento</span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-blue-400 font-mono">{esocialProcessingCount}</span>
              <span className="text-[11px] text-blue-300/80 group-hover:text-blue-300 font-medium flex items-center">
                Consultar Serpro <ArrowRight className="w-3 h-3 ml-1" />
              </span>
            </div>
          </div>

          {/* Aceitos */}
          <div 
            onClick={() => onNavigate('esocial_events')}
            className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-950 cursor-pointer transition flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aceitos pelo Governo</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-400 font-mono">{esocialAcceptedCount}</span>
              <span className="text-[11px] text-emerald-300/80 group-hover:text-emerald-300 font-medium flex items-center">
                Ver recibos <ArrowRight className="w-3 h-3 ml-1" />
              </span>
            </div>
          </div>

          {/* Erro / Rejeitados */}
          <div 
            onClick={() => onNavigate('esocial_events')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between group ${
              esocialErrorCount > 0 
                ? 'bg-rose-950/30 border-rose-500/50 hover:bg-rose-950/50 shadow-lg shadow-rose-950/40' 
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${esocialErrorCount > 0 ? 'text-rose-300' : 'text-slate-400'}`}>
                Com Erro / Rejeitados
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${esocialErrorCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`} />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${esocialErrorCount > 0 ? 'text-rose-400 font-extrabold' : 'text-slate-500'}`}>
                {esocialErrorCount}
              </span>
              {esocialErrorCount > 0 ? (
                <span className="text-[11px] text-rose-300 font-bold flex items-center bg-rose-500/20 px-2 py-0.5 rounded-lg border border-rose-500/30">
                  Corrigir Imediatamente <ArrowRight className="w-3 h-3 ml-1" />
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">Sem erros ativos</span>
              )}
            </div>
          </div>
        </div>

        {/* Mini Breakdown por Tipo de Evento de SST */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/60 text-xs">
          <div className="flex items-center justify-between bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/40">
            <span className="text-slate-400 font-medium">S-2210 (CAT):</span>
            <span className="font-mono font-bold text-white">{s2210Count} eventos</span>
          </div>
          <div className="flex items-center justify-between bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/40">
            <span className="text-slate-400 font-medium">S-2220 (ASO):</span>
            <span className="font-mono font-bold text-white">{s2220Count} eventos</span>
          </div>
          <div className="flex items-center justify-between bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/40">
            <span className="text-slate-400 font-medium">S-2230 (Afastam.):</span>
            <span className="font-mono font-bold text-white">{s2230Count} eventos</span>
          </div>
          <div className="flex items-center justify-between bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/40">
            <span className="text-slate-400 font-medium">S-2240 (Riscos):</span>
            <span className="font-mono font-bold text-white">{s2240Count} eventos</span>
          </div>
        </div>
      </div>

      {/* Bento Grid - Main Section (Revenue + OS Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Revenue Progress Chart - Span 7 */}
        <div className="lg:col-span-7 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Evolução de Receita Contratada x Faturada (R$)</h2>
              <p className="text-xs text-slate-400">Acompanhamento financeiro dos contratos de SST</p>
            </div>
            <button
              onClick={() => onNavigate('financial')}
              className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center space-x-1 transition"
            >
              <span>Ver Fluxo de Caixa</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                <Tooltip 
                  formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="contratada" name="Contratada" fill="#6366f1" radius={[8, 8, 0, 0]} />
                <Bar dataKey="faturada" name="Faturada / Recebida" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Services Status & Funnel - Span 5 */}
        <div className="lg:col-span-5 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Distribuição das Ordens de Serviço</h2>
              <p className="text-xs text-slate-400">Status em tempo real das entregas técnicas</p>
            </div>
            <button 
              onClick={() => onNavigate('service-orders')}
              className="text-xs text-indigo-400 font-semibold hover:underline"
            >
              Ver Todas
            </button>
          </div>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={osStatusData} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={90} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="value" name="Quantidade de OS" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bento Grid - Bottom Row (Demanded Services + Monitor Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Catálogo mais demandado - Span 4 */}
        <div className="lg:col-span-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white">Serviços Mais Demandados (NRs)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Distribuição por norma técnica</p>
          </div>
          <div className="space-y-3.5 pt-1">
            {serviceTypeData.length === 0 && (
              <p className="text-xs text-slate-500 py-6 text-center">
                Nenhuma ordem de serviço aberta ainda. O ranking é montado a partir das OS emitidas.
              </p>
            )}
            {serviceTypeData.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-300">
                  <span>{item.name}</span>
                  <span className="font-semibold text-white">{item.count} contratos</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full rounded-full" 
                    style={{ width: `${(item.count / serviceTypeMax) * 100}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Service Orders Monitor - Span 8 */}
        <div className="lg:col-span-8 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Monitor de Serviços Ativos (Fluxo Master)</h2>
              <p className="text-xs text-slate-400 mt-0.5">Acompanhamento das OS em andamento e seus responsáveis</p>
            </div>
            <button 
              onClick={() => onNavigate('service-orders')}
              className="text-xs text-emerald-400 font-semibold hover:underline"
            >
              Abrir Painel de OS
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-3">Cliente / Serviço</th>
                  <th className="py-3 px-3">Responsável</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Progresso</th>
                  <th className="py-3 px-3 text-right">Prazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {serviceOrders.slice(0, 5).map((os) => {
                  const client = clients.find(c => c.id === os.client_id);
                  return (
                    <tr key={os.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-3 font-mono font-bold text-indigo-300">{os.os_number}</td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-100">{client?.trade_name || 'Cliente'}</div>
                        <div className="text-[11px] text-slate-400">{os.service_name}</div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-300">{os.technical_responsible_name}</td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          os.status === 'IN_PROGRESS' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                          os.status === 'WAITING_ACCEPTANCE' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          os.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          os.status === 'WAITING_CLIENT' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          os.status === 'REWORK' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {os.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div 
                              className={`h-full rounded-full ${
                                os.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                              }`} 
                              style={{ width: `${os.progress}%` }} 
                            />
                          </div>
                          <span className="font-mono text-[11px] font-medium text-slate-300">{os.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-400">
                        {formatDate(os.due_date)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Exportação de Resumo de Serviços em PDF */}
      <ServiceSummaryPdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
      />
    </div>
  );
};
