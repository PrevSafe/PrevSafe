'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  HardHat, 
  ShieldCheck, 
  Building2, 
  Sparkles, 
  Package, 
  UserCheck, 
  Camera, 
  Search, 
  FileCheck2,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { EPIManagementTab } from './EPIManagementTab';

interface EPIManagementViewProps {
  onNavigate?: (view: string) => void;
}

export const EPIManagementView: React.FC<EPIManagementViewProps> = ({ onNavigate }) => {
  const { clients = [], epiCatalog = [], epiDeliveries = [], employees = [] } = usePrevSafe();
  const [selectedClientId, setSelectedClientId] = useState<string>(clients?.[0]?.id || '');

  const selectedClient = (clients || []).find(c => c.id === selectedClientId) || clients?.[0];

  const totalCatalog = (epiCatalog || []).length;
  const clientDeliveries = (epiDeliveries || []).filter(d => {
    const emp = (employees || []).find(e => e.id === d.employee_id);
    return !selectedClientId || (emp && emp.client_id === selectedClientId);
  });
  const biometricSigned = clientDeliveries.filter(d => d.biometric_photo_data_url || d.signature_data_url).length;

  return (
    <div className="space-y-6" id="epi-management-workspace">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 font-bold text-xs rounded-full border border-amber-500/30 flex items-center gap-1.5">
                <HardHat className="w-3.5 h-3.5" />
                Norma Regulamentadora NR-06 & CLT Art. 166/167
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-semibold rounded">
                Biometria Facial & Assinatura Eletrônica (Portaria 3.214)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Gestão de EPI & Biometria (NR-06)
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Controle completo do catálogo de EPIs com Certificado de Aprovação (CA), fichas de entrega individuais, termo de responsabilidade, captura de foto/biometria facial na entrega e histórico de substituições.
            </p>
          </div>

          {/* Client context switch */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3">
            <div className="w-full sm:w-auto">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Empresa / Cliente Selecionado:
              </label>
              <select
                id="epi-client-selector"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full sm:w-64 bg-slate-800 border border-slate-700 text-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              >
                <option value="">Todos os Clientes</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.legal_name || client.trade_name} ({client.document_number})
                  </option>
                ))}
              </select>
            </div>

            {selectedClient && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                  {selectedClient.trade_name || selectedClient.legal_name}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-400 font-mono">Grau {selectedClient.risk_degree || 2}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick KPI Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40">
            <span className="text-[11px] font-medium text-slate-400 block">Itens no Catálogo</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-slate-100">{totalCatalog}</span>
              <span className="text-[10px] text-slate-500">modelos com CA</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40">
            <span className="text-[11px] font-medium text-slate-400 block">Entregas Registradas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-amber-400">{clientDeliveries.length}</span>
              <span className="text-[10px] text-slate-500">fichas</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40">
            <span className="text-[11px] font-medium text-slate-400 block">Validação Biométrica / Assinadas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-emerald-400">{biometricSigned}</span>
              <span className="text-[10px] text-emerald-500/80">100% auditável</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40">
            <span className="text-[11px] font-medium text-slate-400 block">Conformidade NR-06</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-teal-300">Portaria 3.214</span>
              <span className="text-[10px] text-teal-400">Válido</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="transition-all duration-200">
        <EPIManagementTab selectedClientId={selectedClientId} />
      </div>
    </div>
  );
};
