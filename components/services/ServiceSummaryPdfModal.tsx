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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fundo backdrop-blur-sm animate-in fade-in">
      <div className="bg-superficie border border-borda rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-borda flex items-center justify-between bg-superficie">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-marca-suave text-marca-escura border border-marca-borda">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-tinta">Exportação de Resumo de Ordens de Serviço em PDF</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-marca-suave text-marca-escura border border-marca-borda uppercase">
                  PDF Vetorial Oficial
                </span>
              </div>
              <p className="text-xs text-tinta-2">
                Gere dossiês técnicos detalhados e relatórios consolidados de entregas SST.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportPdf}
              disabled={targetOrders.length === 0}
              className="bg-marca-escura px-4 py-2 text-white rounded-2xl text-xs font-bold transition shadow-sm flex items-center space-x-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo PDF ({targetOrders.length})</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-tinta-2 hover:text-tinta rounded-xl hover:bg-superficie-2 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Mode Switcher */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-tinta uppercase tracking-wider">Tipo de Relatório</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('BATCH')}
                className={`p-4 rounded-2xl border text-left transition flex items-start space-x-3 ${
                  mode === 'BATCH'
                    ? 'bg-marca-suave border-marca-borda text-tinta'
                    : 'bg-fundo border-borda text-tinta-2 hover:text-tinta'
                }`}
              >
                <div className={`p-2 rounded-xl ${mode === 'BATCH' ? 'bg-marca-suave text-marca-escura' : 'bg-superficie-2 text-tinta-2'}`}>
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Relatório Consolidado (Tabela Geral)</div>
                  <div className="text-xs text-tinta-2 mt-0.5">Visão geral de todas as O.S. ativas, progresso, responsáveis e prazos SLA.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('SINGLE')}
                className={`p-4 rounded-2xl border text-left transition flex items-start space-x-3 ${
                  mode === 'SINGLE'
                    ? 'bg-marca-suave border-marca-borda text-tinta'
                    : 'bg-fundo border-borda text-tinta-2 hover:text-tinta'
                }`}
              >
                <div className={`p-2 rounded-xl ${mode === 'SINGLE' ? 'bg-marca-suave text-marca-escura' : 'bg-superficie-2 text-tinta-2'}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Dossiê Técnico Detalhado (O.S. Única)</div>
                  <div className="text-xs text-tinta-2 mt-0.5">Cronograma de etapas, sub-tarefas, status e termos de aceite formal para assinatura.</div>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Options based on Mode */}
          {mode === 'SINGLE' ? (
            <div className="space-y-3 bg-fundo p-4 rounded-2xl border border-borda">
              <label className="text-xs font-semibold text-tinta uppercase tracking-wider">Selecione a Ordem de Serviço</label>
              <select
                value={selectedOSId}
                onChange={(e) => setSelectedOSId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-superficie border border-borda rounded-2xl text-xs text-tinta focus:outline-none focus:border-marca-escura"
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
                  <div className="mt-3 p-4 bg-superficie rounded-xl border border-borda space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-marca-escura">{sel.os_number}</span>
                      <span className="px-2 py-0.5 rounded-full bg-superficie-2 text-tinta font-mono text-[10px]">{sel.status}</span>
                    </div>
                    <div className="text-tinta font-medium">{sel.title}</div>
                    <div className="text-tinta-2 flex flex-wrap gap-4 pt-1">
                      <span>Cliente: <strong className="text-tinta">{client?.trade_name}</strong></span>
                      <span>Responsável: <strong className="text-tinta">{sel.technical_responsible_name || 'N/A'}</strong></span>
                      <span>Prazo: <strong className="text-tinta">{formatDate(sel.due_date)}</strong></span>
                      <span>Etapas: <strong className="text-tinta">{sel.stages?.length || 0}</strong></span>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-4 bg-fundo p-4 rounded-2xl border border-borda">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-tinta uppercase tracking-wider">Filtrar Ordens de Serviço</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs text-marca-escura hover:text-marca-escura font-medium"
                  >
                    {selectedIds.length === filteredOrders.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                  <span className="text-xs text-tinta-2">|</span>
                  <span className="text-xs text-tinta-2">{selectedIds.length} de {filteredOrders.length} selecionadas</span>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-tinta-2 mb-1 block">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-superficie border border-borda rounded-xl text-xs text-tinta"
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
                  <label className="text-[11px] text-tinta-2 mb-1 block">Cliente</label>
                  <select
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-superficie border border-borda rounded-xl text-xs text-tinta"
                  >
                    <option value="ALL">Todos os Clientes</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.trade_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-tinta-2 mb-1 block">Prioridade</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-superficie border border-borda rounded-xl text-xs text-tinta"
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
                          ? 'bg-marca-suave border-marca-borda text-tinta' 
                          : 'bg-superficie border-borda text-tinta-2'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOrderSelection(os.id)}
                        className="w-4 h-4 rounded text-marca-escura focus:ring-marca-escura border-borda bg-superficie-2"
                      />
                      <div className="flex-1 truncate">
                        <span className="font-bold font-mono text-marca-escura">{os.os_number}</span>{' '}
                        <span className="text-tinta">{os.title}</span>{' '}
                        <span className="text-tinta-2">({client?.trade_name})</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-superficie-2 text-tinta">
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
