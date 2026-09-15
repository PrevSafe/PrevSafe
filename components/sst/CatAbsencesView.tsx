'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  AlertOctagon, 
  ShieldCheck, 
  Building2, 
  BedDouble, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Send,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { CatAndAbsenceTab } from './CatAndAbsenceTab';

interface CatAbsencesViewProps {
  onNavigate?: (view: string) => void;
}

export const CatAbsencesView: React.FC<CatAbsencesViewProps> = ({ onNavigate }) => {
  const { clients = [], catRecords = [], workAbsences = [], employees = [], esocialEvents = [] } = usePrevSafe();
  const [selectedClientId, setSelectedClientId] = useState<string>(clients?.[0]?.id || '');

  const selectedClient = (clients || []).find(c => c.id === selectedClientId) || clients?.[0];

  const clientCats = (catRecords || []).filter(c => {
    const emp = (employees || []).find(e => e.id === c.employee_id);
    return !selectedClientId || (emp && emp.client_id === selectedClientId);
  });

  const clientAbsences = (workAbsences || []).filter(a => {
    const emp = (employees || []).find(e => e.id === a.employee_id);
    return !selectedClientId || (emp && emp.client_id === selectedClientId);
  });

  const transmittedCats = clientCats.filter(c => c.esocial_status === 'TRANSMITTED' || c.esocial_receipt).length;
  const pendingCats = clientCats.length - transmittedCats;

  return (
    <div className="space-y-6" id="cat-absences-workspace">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-rose-500/10 via-red-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-rose-500/20 text-rose-300 font-bold text-xs rounded-full border border-rose-500/30 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5" />
                eSocial S-2210 & S-2230 • Lei 8.213/91 Art. 22
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-semibold rounded">
                Prazo Legal D+1 (Morte Imediata)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              CAT (S-2210) & Afastamentos Temporários (S-2230)
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Emissão e transmissão da Comunicação de Acidente de Trabalho (CAT Inicial, Reabertura e Óbito) e gestão de atestados médicos, licenças de saúde e afastamentos previdenciários.
            </p>
          </div>

          {/* Client context switch */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3">
            <div className="w-full sm:w-auto">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Empresa / Cliente Selecionado:
              </label>
              <select
                id="cat-client-selector"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full sm:w-64 bg-slate-800 border border-slate-700 text-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
              >
                <option value="">Todos os Clientes</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.corporate_reason || client.trading_name} ({client.cnpj})
                  </option>
                ))}
              </select>
            </div>

            {selectedClient && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
                <Building2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                  {selectedClient.trading_name || selectedClient.corporate_reason}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick KPI Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40">
            <span className="text-[11px] font-medium text-slate-400 block">Total de CATs Registradas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-slate-100">{clientCats.length}</span>
              <span className="text-[10px] text-slate-500">registros</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40">
            <span className="text-[11px] font-medium text-slate-400 block">Transmitidas ao eSocial</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-emerald-400">{transmittedCats}</span>
              <span className="text-[10px] text-emerald-500/80">com recibo</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40">
            <span className="text-[11px] font-medium text-slate-400 block">Afastamentos Registrados</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-rose-400">{clientAbsences.length}</span>
              <span className="text-[10px] text-slate-500">atestados/licenças</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40">
            <span className="text-[11px] font-medium text-slate-400 block">Status eSocial S-2210</span>
            <div className="flex items-baseline gap-2 mt-1">
              {pendingCats > 0 ? (
                <>
                  <span className="text-lg font-black text-amber-400">{pendingCats} pendentes</span>
                  <span className="text-[10px] text-amber-500">atenção ao prazo</span>
                </>
              ) : (
                <>
                  <span className="text-lg font-black text-emerald-400">100% Em Dia</span>
                  <span className="text-[10px] text-emerald-500">sem pendências</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="transition-all duration-200">
        <CatAndAbsenceTab selectedClientId={selectedClientId} />
      </div>
    </div>
  );
};
