'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Building2, 
  FileText, 
  Activity, 
  TrendingDown, 
  Sparkles,
  Award
} from 'lucide-react';
import { AccidentIncidentReportView } from './AccidentIncidentReportView';

interface AccidentsIncidentsViewProps {
  onNavigate?: (view: string) => void;
}

export const AccidentsIncidentsView: React.FC<AccidentsIncidentsViewProps> = ({ onNavigate }) => {
  const { clients = [], accidentsIncidents = [], employees = [] } = usePrevSafe();
  const [selectedClientId, setSelectedClientId] = useState<string>(clients?.[0]?.id || '');

  const selectedClient = (clients || []).find(c => c.id === selectedClientId) || clients?.[0];

  const clientAccidents = (accidentsIncidents || []).filter(a => {
    return !selectedClientId || a.client_id === selectedClientId;
  });

  const severeOrFatal = clientAccidents.filter(a => a.severity === 'FATAL' || a.severity === 'GRAVE' || a.severity === 'CRITICA' || (a.severity as string) === 'SEVERO').length;
  const withCat = clientAccidents.filter(a => a.linked_cat_id || (a as any).has_cat_issued || (a as any).cat_number).length;
  const openActionPlans = clientAccidents.reduce((acc, curr) => {
    const plans = curr?.action_plan_5w2h || curr?.action_plan || [];
    return acc + (plans.filter(p => p.status === 'PENDENTE' || p.status === 'EM_ANDAMENTO' || (p.status as string) === 'PENDING' || (p.status as string) === 'IN_PROGRESS')?.length || 0);
  }, 0);

  return (
    <div className="space-y-6" id="accidents-incidents-workspace">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-rose-600/10 via-amber-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-rose-500/20 text-rose-300 font-bold text-xs rounded-full border border-rose-500/30 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Investigação de Acidentes & Quase-Acidentes (NR-01.5.5)
              </span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[11px] font-mono font-semibold rounded">
                Taxas de Frequência & Gravidade (NBR 14280) • Ishikawa & 5 Porquês
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Relatórios de Acidentes & Incidentes (NR-01 / NBR 14280)
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Sistema avançado de investigação de causas raízes com Metodologia dos 5 Porquês, Diagrama de Ishikawa (6M), Plano de Ação 5W2H, cálculo de TF/TG pela NBR 14280 e integração com a CIPA e eSocial.
            </p>
          </div>

          {/* Client context switch */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3">
            <div className="w-full sm:w-auto">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Empresa / Cliente Selecionado:
              </label>
              <select
                id="accidents-client-selector"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full sm:w-64 bg-slate-800 border border-slate-700 text-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
              >
                <option value="">Todos os Clientes</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.trade_name || client.legal_name || (client as any).corporate_reason || (client as any).trading_name} ({client.cnpj})
                  </option>
                ))}
              </select>
            </div>

            {selectedClient && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
                <Building2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                  {selectedClient.trade_name || selectedClient.legal_name || (selectedClient as any).trading_name || (selectedClient as any).corporate_reason}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick KPI Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40">
            <span className="text-[11px] font-medium text-slate-400 block">Ocorrências Investigadas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-slate-100">{clientAccidents.length}</span>
              <span className="text-[10px] text-slate-500">relatórios</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40">
            <span className="text-[11px] font-medium text-slate-400 block">Casos Graves / Fatais</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-lg font-black ${severeOrFatal > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {severeOrFatal}
              </span>
              <span className="text-[10px] text-slate-500">investigação crítica</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40">
            <span className="text-[11px] font-medium text-slate-400 block">Ações 5W2H em Aberto</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-amber-400">{openActionPlans}</span>
              <span className="text-[10px] text-slate-500">medidas preventivas</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40">
            <span className="text-[11px] font-medium text-slate-400 block">Metodologia Aplicada</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-cyan-300">NBR 14280</span>
              <span className="text-[10px] text-cyan-400">TF • TG • 6M</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="transition-all duration-200">
        <AccidentIncidentReportView selectedClientId={selectedClientId} />
      </div>
    </div>
  );
};
