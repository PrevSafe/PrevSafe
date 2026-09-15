'use client';

import React, { useState, useMemo } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { ServiceOrder } from '@/types';
import { 
  FileText, 
  Download, 
  Printer, 
  X, 
  CheckCircle2, 
  Filter, 
  Layers, 
  Eye, 
  Briefcase,
  Building2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { exportServiceOrdersSummaryPdf, exportSingleServiceOrderPdf } from '@/lib/pdfExportService';
import { formatDate } from '@/lib/utils';

interface ServiceSummaryPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedOS?: ServiceOrder | null;
}

export const ServiceSummaryPdfModal: React.FC<ServiceSummaryPdfModalProps> = ({
  isOpen,
  onClose,
  initialSelectedOS
}) => {
  const { serviceOrders, organization, clients, profiles } = usePrevSafe();

  const [mode, setMode] = useState<'SINGLE' | 'BATCH'>(initialSelectedOS ? 'SINGLE' : 'BATCH');
  const [selectedOSId, setSelectedOSId] = useState<string>(
    initialSelectedOS?.id || serviceOrders[0]?.id || ''
  );

  // Filters for batch mode
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Specific selected IDs in batch
  const [selectedIds, setSelectedIds] = useState<string[]>(
    serviceOrders.map(o => o.id)
  );

  // Filtered OS list
  const filteredOrders = useMemo(() => {
    return serviceOrders.filter(os => {
      if (statusFilter !== 'ALL' && os.status !== statusFilter) return false;
      if (clientFilter !== 'ALL' && os.client_id !== clientFilter) return false;
      if (priorityFilter !== 'ALL' && os.priority !== priorityFilter) return false;
      return true;
    });
  }, [serviceOrders, statusFilter, clientFilter, priorityFilter]);

  // Target orders for export
  const targetOrders = useMemo(() => {
    if (mode === 'SINGLE') {
      const single = serviceOrders.find(o => o.id === selectedOSId);
      return single ? [single] : [];
    }
    return filteredOrders.filter(o => selectedIds.includes(o.id));
  }, [mode, selectedOSId, serviceOrders, filteredOrders, selectedIds]);

  const handleExportPdf = () => {
    if (mode === 'SINGLE') {
      const single = targetOrders[0];
      if (!single) return;
      const client = clients.find(c => c.id === single.client_id);
      exportSingleServiceOrderPdf({
        organization,
        client,
        serviceOrder: single,
        profiles
      });
    } else {
      if (targetOrders.length === 0) {
        alert('Selecione ao menos uma Ordem de Serviço para exportar.');
        return;
      }
      exportServiceOrdersSummaryPdf({
        organization,
        clients,
        serviceOrders: targetOrders,
        profiles
      });
    }
    onClose();
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOrders.map(o => o.id));
    }
  };

  const toggleOrderSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Exportação de Resumo de Ordens de Serviço em PDF</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 uppercase">
                  PDF Vetorial Oficial
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gere dossiês técnicos detalhados e relatórios consolidados de entregas SST.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportPdf}
              disabled={targetOrders.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-950/40 flex items-center space-x-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo PDF ({targetOrders.length})</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Mode Switcher */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Tipo de Relatório</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('BATCH')}
                className={`p-4 rounded-2xl border text-left transition flex items-start space-x-3 ${
                  mode === 'BATCH'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-xl ${mode === 'BATCH' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Relatório Consolidado (Tabela Geral)</div>
                  <div className="text-xs text-slate-400 mt-0.5">Visão geral de todas as O.S. ativas, progresso, responsáveis e prazos SLA.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('SINGLE')}
                className={`p-4 rounded-2xl border text-left transition flex items-start space-x-3 ${
                  mode === 'SINGLE'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-xl ${mode === 'SINGLE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Dossiê Técnico Detalhado (O.S. Única)</div>
                  <div className="text-xs text-slate-400 mt-0.5">Cronograma de etapas, sub-tarefas, status e termos de aceite formal para assinatura.</div>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Options based on Mode */}
          {mode === 'SINGLE' ? (
            <div className="space-y-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Selecione a Ordem de Serviço</label>
              <select
                value={selectedOSId}
                onChange={(e) => setSelectedOSId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {serviceOrders.map(os => {
                  const client = clients.find(c => c.id === os.client_id);
                  return (
                    <option key={os.id} value={os.id}>
                      {os.os_number || 'OS'} - {os.title} ({client?.trade_name || 'Cliente'}) - {os.status}
                    </option>
                  );
                })}
              </select>

              {/* Selected OS Details Preview Card */}
              {(() => {
                const sel = serviceOrders.find(o => o.id === selectedOSId);
                const client = clients.find(c => c.id === sel?.client_id);
                if (!sel) return null;
                return (
                  <div className="mt-3 p-4 bg-slate-900 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">{sel.os_number}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">{sel.status}</span>
                    </div>
                    <div className="text-white font-medium">{sel.title}</div>
                    <div className="text-slate-400 flex flex-wrap gap-4 pt-1">
                      <span>Cliente: <strong className="text-slate-300">{client?.trade_name}</strong></span>
                      <span>Responsável: <strong className="text-slate-300">{sel.technical_responsible_name || 'N/A'}</strong></span>
                      <span>Prazo: <strong className="text-slate-300">{formatDate(sel.due_date)}</strong></span>
                      <span>Etapas: <strong className="text-slate-300">{sel.stages?.length || 0}</strong></span>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Filtrar Ordens de Serviço</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    {selectedIds.length === filteredOrders.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                  <span className="text-xs text-slate-500">|</span>
                  <span className="text-xs text-slate-400">{selectedIds.length} de {filteredOrders.length} selecionadas</span>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="ALL">Todos os Status</option>
                    <option value="IN_PROGRESS">Em Andamento</option>
                    <option value="WAITING_ACCEPTANCE">Aguardando Aceite</option>
                    <option value="COMPLETED">Concluídas</option>
                    <option value="REWORK">Em Retrabalho</option>
                    <option value="SCHEDULED">Agendadas</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Cliente</label>
                  <select
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="ALL">Todos os Clientes</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.trade_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Prioridade</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="ALL">Todas as Prioridades</option>
                    <option value="URGENT">Urgente</option>
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">Média</option>
                    <option value="LOW">Baixa</option>
                  </select>
                </div>
              </div>

              {/* Checkbox List */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 pt-2">
                {filteredOrders.map(os => {
                  const client = clients.find(c => c.id === os.client_id);
                  const isChecked = selectedIds.includes(os.id);
                  return (
                    <label
                      key={os.id}
                      className={`flex items-center space-x-3 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        isChecked 
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-white' 
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOrderSelection(os.id)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-700 bg-slate-800"
                      />
                      <div className="flex-1 truncate">
                        <span className="font-bold font-mono text-emerald-300">{os.os_number}</span>{' '}
                        <span className="text-white">{os.title}</span>{' '}
                        <span className="text-slate-400">({client?.trade_name})</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300">
                        {os.status}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
