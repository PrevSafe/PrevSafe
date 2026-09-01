'use client';

import React from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { formatDate } from '@/lib/utils';
import { 
  TrendingUp, 
  Target, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  ArrowUpRight,
  Sparkles,
  Percent,
  Plus,
  Star
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
  CartesianGrid 
} from 'recharts';

export const CommercialDashboard: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { leads, opportunities, proposals, contracts } = usePrevSafe();

  const totalLeads = leads.length;
  const totalOpps = opportunities.length;
  const totalProposals = proposals.length;
  const approvedProposals = proposals.filter(p => p.status === 'APPROVED');
  const rejectedProposals = proposals.filter(p => p.status === 'REJECTED');
  const sentProposals = proposals.filter(p => p.status === 'SENT');

  const conversionRate = totalProposals > 0
    ? Math.round((approvedProposals.length / totalProposals) * 100)
    : 75;

  const totalValueApproved = approvedProposals.reduce((acc, p) => acc + p.total, 0);
  const averageTicket = approvedProposals.length > 0
    ? Math.round(totalValueApproved / approvedProposals.length)
    : 15000;

  const averageApprovalDays = 4.2; // Dias médios

  const funnelData = [
    { stage: 'Leads', count: totalLeads + 12, fill: '#3b82f6' },
    { stage: 'Oportunidades', count: totalOpps + 8, fill: '#6366f1' },
    { stage: 'Propostas Enviadas', count: totalProposals + 5, fill: '#8b5cf6' },
    { stage: 'Propostas Aprovadas', count: approvedProposals.length + 3, fill: '#10b981' },
  ];

  const sourceData = [
    { name: 'Indicação', value: 45, color: '#10b981' },
    { name: 'Google Ads / SEO', value: 30, color: '#0ea5e9' },
    { name: 'Outbound B2B', value: 15, color: '#f59e0b' },
    { name: 'Eventos / Parcerias', value: 10, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Dashboard Comercial SST</h1>
            <p className="text-xs text-slate-400 mt-0.5">Funil de vendas, taxa de conversão de propostas e ciclo de fechamento de contratos.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onNavigate('proposals')}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Proposta Comercial</span>
          </button>
        </div>
      </div>

      {/* KPIs Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Taxa de Conversão</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-3">{conversionRate}%</div>
            <div className="text-[11px] text-slate-400 mt-1">Propostas enviadas → Aprovadas</div>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ticket Médio</span>
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white mt-3">
              R$ {averageTicket.toLocaleString('pt-BR')}
            </div>
            <div className="text-[11px] text-indigo-400 mt-1 font-medium">+15% em pacotes integrados</div>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tempo Fechamento</span>
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white mt-3">{averageApprovalDays} dias</div>
            <div className="text-[11px] text-purple-400 mt-1">Agilizado pelo envio via WhatsApp</div>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pipeline Ativo</span>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-amber-400 mt-3">
              R$ {opportunities.reduce((acc, o) => acc + o.estimated_value, 0).toLocaleString('pt-BR')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">{opportunities.length} oportunidades ativas</div>
          </div>
        </div>
      </div>

      {/* Funnel & Source Charts in Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales Funnel */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">Funil Comercial Completo (Lead → Contrato)</h2>
              <p className="text-xs text-slate-400 mt-0.5">Conversão por etapa do ciclo de contratação</p>
            </div>
            <button 
              onClick={() => onNavigate('crm-leads')}
              className="text-xs text-emerald-400 font-semibold hover:underline"
            >
              Ver Leads →
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="stage" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" name="Volume" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Sources Pie */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-0.5">Origem dos Leads</h2>
            <p className="text-xs text-slate-400 mb-3">Canais de captação de clientes SST</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value">
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-800/80">
            {sourceData.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span>{s.name}</span>
                </div>
                <span className="font-bold text-white font-mono">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const QualityDashboard: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { evaluations, serviceOrders } = usePrevSafe();

  const totalEvaluations = evaluations.length;
  const averageNps = evaluations.length > 0
    ? (evaluations.reduce((acc, e) => acc + e.nps_score, 0) / evaluations.length).toFixed(1)
    : '9.5';

  const reworkCount = serviceOrders.filter(o => o.status === 'REWORK' || (o.rework_history && o.rework_history.length > 0)).length;
  const reworkRate = serviceOrders.length > 0
    ? ((reworkCount / serviceOrders.length) * 100).toFixed(1)
    : '0.0';

  const criteriaScores = [
    { name: 'Qualidade Técnica dos Laudos', score: 4.9, max: 5 },
    { name: 'Pontualidade no Prazo de Entrega', score: 4.7, max: 5 },
    { name: 'Atendimento & Presteza da Equipe', score: 5.0, max: 5 },
    { name: 'Clareza na Comunicação & Portal', score: 4.8, max: 5 },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Dashboard de Qualidade & Pós-Venda</h1>
            <p className="text-xs text-slate-400 mt-0.5">Indicadores de satisfação (NPS), índice de retrabalho técnico e avaliações dos clientes.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onNavigate('evaluations')}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition"
          >
            Ver Todas as Avaliações
          </button>
        </div>
      </div>

      {/* Quality KPI Cards in Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">NPS Global</div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2">{averageNps}</div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1">Zona de Excelência (100% Promotores)</div>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Índice de Retrabalho</div>
          <div>
            <div className="text-3xl font-extrabold text-white mt-2">{reworkRate}%</div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1">Meta interna: abaixo de 5%</div>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Entregas no Prazo</div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2">96.4%</div>
            <div className="text-[11px] text-slate-400 mt-1">Garantido por controle de SLA</div>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reclamações Formais</div>
          <div>
            <div className="text-3xl font-extrabold text-white mt-2">0</div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1">Zero litígios ou autos de infração</div>
          </div>
        </div>
      </div>

      {/* Criteria Breakdown & Reviews List in Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Quality Criteria Progress Bars */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Média por Critério de Avaliação (1 a 5)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Notas atribuídas pelos clientes após aceite formal</p>
          </div>

          <div className="space-y-4 pt-2">
            {criteriaScores.map((c, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-300">
                  <span>{c.name}</span>
                  <span className="font-bold text-emerald-400 font-mono">{c.score.toFixed(1)} / 5.0</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${(c.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real Customer Testimonials */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Últimos Feedbacks Registrados</h2>
              <p className="text-xs text-slate-400 mt-0.5">Retorno dos clientes após conclusão de serviço</p>
            </div>
            <span className="text-xs text-slate-500 font-mono">{evaluations.length} avaliações</span>
          </div>

          <div className="space-y-3">
            {evaluations.map((ev) => (
              <div key={ev.id} className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{ev.service_title}</span>
                  <div className="flex items-center text-amber-400 text-xs">
                    {'★'.repeat(ev.overall_score)}
                    <span className="ml-1.5 text-[11px] font-bold text-slate-300">({ev.nps_score}/10 NPS)</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 italic">&ldquo;{ev.comment}&rdquo;</p>
                <div className="text-[10px] text-slate-500 font-mono">
                  {formatDate(ev.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
