'use client';

import React, { useState, useMemo } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  ESocialEvent, 
  ESocialEventType, 
  ESocialReportOptions 
} from '@/types';
import { 
  FileText, 
  Download, 
  Printer, 
  X, 
  CheckCircle2, 
  Filter, 
  Layers, 
  Eye, 
  Settings, 
  Check, 
  Sparkles,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { generateESocialReportHtml, printESocialReport } from '@/lib/esocialPdfGenerator';
import { exportESocialEventLogsPdf } from '@/lib/pdfExportService';

interface ESocialPdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedEvent?: ESocialEvent | null;
}

export const ESocialPdfReportModal: React.FC<ESocialPdfReportModalProps> = ({
  isOpen,
  onClose,
  initialSelectedEvent
}) => {
  const { esocialEvents, organization, clients } = usePrevSafe();

  // Mode: SINGLE event or BATCH dossier
  const [reportMode, setReportMode] = useState<'SINGLE' | 'BATCH'>(initialSelectedEvent ? 'SINGLE' : 'BATCH');
  const [selectedSingleEventId, setSelectedSingleEventId] = useState<string>(
    initialSelectedEvent?.id || esocialEvents[0]?.id || ''
  );

  // Filters for batch mode
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterClient, setFilterClient] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Specific selected IDs in batch
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>(
    esocialEvents.map(e => e.id)
  );

  // Report Content Options
  const [includeXmlPreview, setIncludeXmlPreview] = useState(false);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeErrors, setIncludeErrors] = useState(true);

  // Filtered Events for Batch Mode
  const filteredEvents = useMemo(() => {
    return esocialEvents.filter(event => {
      const matchType = filterType === 'ALL' || event.event_type === filterType;
      const matchClient = filterClient === 'ALL' || event.client_id === filterClient;
      const matchStatus = filterStatus === 'ALL' || event.status === filterStatus;
      return matchType && matchClient && matchStatus;
    });
  }, [esocialEvents, filterType, filterClient, filterStatus]);

  // Events that will actually be printed
  const targetEvents = useMemo(() => {
    if (reportMode === 'SINGLE') {
      const single = esocialEvents.find(e => e.id === selectedSingleEventId);
      return single ? [single] : [];
    }
    return filteredEvents.filter(e => batchSelectedIds.includes(e.id));
  }, [reportMode, selectedSingleEventId, esocialEvents, filteredEvents, batchSelectedIds]);

  const reportOptions: ESocialReportOptions = useMemo(() => ({
    mode: reportMode,
    includeXmlPreview,
    includeSignatures,
    includeValidationErrors: includeErrors,
    includeQrCode: true
  }), [reportMode, includeXmlPreview, includeSignatures, includeErrors]);

  // Preview HTML
  const previewHtml = useMemo(() => {
    if (targetEvents.length === 0) return '<div style="padding: 40px; text-align: center; color: #94a3b8;">Nenhum evento selecionado para o relatório.</div>';
    return generateESocialReportHtml(targetEvents, reportOptions, organization, clients);
  }, [targetEvents, reportOptions, organization, clients]);

  const handlePrint = () => {
    if (targetEvents.length === 0) {
      alert('Selecione ao menos 1 evento para exportar.');
      return;
    }
    printESocialReport(targetEvents, reportOptions, organization, clients);
  };

  const handleDownloadDirectPdf = () => {
    if (targetEvents.length === 0) {
      alert('Selecione ao menos 1 evento para exportar.');
      return;
    }
    exportESocialEventLogsPdf({
      organization,
      clients,
      events: targetEvents,
      filterType: reportMode === 'SINGLE' ? targetEvents[0]?.event_type : filterType,
      filterStatus: filterStatus
    });
  };

  const toggleSelectAllBatch = () => {
    if (batchSelectedIds.length === filteredEvents.length) {
      setBatchSelectedIds([]);
    } else {
      setBatchSelectedIds(filteredEvents.map(e => e.id));
    }
  };

  const toggleEventSelection = (id: string) => {
    setBatchSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Exportação e Emissão de Relatórios em PDF - eSocial SST</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 uppercase">
                  S-2210 • S-2220 • S-2230 • S-2240
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Geração de espelhos individuais e dossiês em massa para conferência antes do envio ao governo.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleDownloadDirectPdf}
              disabled={targetEvents.length === 0}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-950/40 flex items-center space-x-1.5 disabled:opacity-50"
              title="Baixar arquivo .PDF gerado vetorialmente pelo jsPDF"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo PDF ({targetEvents.length})</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={targetEvents.length === 0}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-indigo-950/40 flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Visualizar / Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body (Config Left + Preview Right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Panel: Options & Filters (Span 4) */}
          <div className="lg:col-span-4 border-r border-slate-800 p-5 overflow-y-auto space-y-5 bg-slate-950/40">
            {/* Mode Switcher */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Modo de Exportação</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReportMode('SINGLE')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    reportMode === 'SINGLE'
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">Individual (Espelho)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">1 evento selecionado</div>
                </button>

                <button
                  type="button"
                  onClick={() => setReportMode('BATCH')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    reportMode === 'BATCH'
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">Em Massa (Dossiê)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Múltiplos eventos / Lote</div>
                </button>
              </div>
            </div>

            {/* If Single: Event Selector */}
            {reportMode === 'SINGLE' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Selecionar Evento para Espelho</label>
                <select
                  value={selectedSingleEventId}
                  onChange={(e) => setSelectedSingleEventId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {esocialEvents.map(evt => (
                    <option key={evt.id} value={evt.id}>
                      [{evt.event_type}] {evt.event_number} - {evt.worker_name} ({evt.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* If Batch: Filters & Event Multi-Select */}
            {reportMode === 'BATCH' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300">Filtros do Dossiê</span>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400">Tipo de Evento</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="ALL">Todos os Tipos (S-2210, S-2220, S-2230, S-2240)</option>
                        <option value="S-2210">S-2210 (CAT - Acidentes de Trabalho)</option>
                        <option value="S-2220">S-2220 (ASO - Saúde / Exames)</option>
                        <option value="S-2230">S-2230 (Afastamentos Temporários)</option>
                        <option value="S-2240">S-2240 (Condições Ambientais / Riscos)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400">Empresa / Cliente</label>
                      <select
                        value={filterClient}
                        onChange={(e) => setFilterClient(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="ALL">Todas as Empresas Clientes</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400">Situação</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="ALL">Todos os Status</option>
                        <option value="READY_TO_SEND">Prontos / Validados</option>
                        <option value="SUCCESS">Aceitos (Sucesso com Recibo)</option>
                        <option value="REJECTED">Rejeitados / Inconsistentes</option>
                        <option value="DRAFT">Rascunhos</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Batch Item List with checkboxes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Eventos ({filteredEvents.length})
                    </span>
                    <button
                      type="button"
                      onClick={toggleSelectAllBatch}
                      className="text-indigo-400 hover:text-indigo-300 text-[11px] font-medium"
                    >
                      {batchSelectedIds.length === filteredEvents.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                  </div>

                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {filteredEvents.map(evt => {
                      const isChecked = batchSelectedIds.includes(evt.id);
                      return (
                        <label
                          key={evt.id}
                          className={`flex items-center space-x-2.5 p-2 rounded-xl border text-xs cursor-pointer transition ${
                            isChecked 
                              ? 'bg-indigo-950/30 border-indigo-500/40 text-white' 
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleEventSelection(evt.id)}
                            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-800"
                          />
                          <div className="flex-1 truncate">
                            <span className="font-bold font-mono text-indigo-300">[{evt.event_type}]</span>{' '}
                            <span>{evt.worker_name}</span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            evt.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300' :
                            evt.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {evt.status}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Document Composition Options */}
            <div className="space-y-2.5 pt-3 border-t border-slate-800 text-xs">
              <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Opções do Documento</span>
              
              <label className="flex items-center space-x-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-800"
                />
                <span>Incluir campos de assinatura e carimbo SST</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeErrors}
                  onChange={(e) => setIncludeErrors(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-800"
                />
                <span>Destacar inconsistências e apontamentos</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeXmlPreview}
                  onChange={(e) => setIncludeXmlPreview(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-800"
                />
                <span>Incluir anexo com XML completo</span>
              </label>
            </div>
          </div>

          {/* Right Panel: Live Document Preview (Span 8) */}
          <div className="lg:col-span-8 bg-slate-950 p-4 overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs">
              <div className="flex items-center space-x-2 text-slate-400">
                <Eye className="w-4 h-4 text-indigo-400" />
                <span>Pré-visualização do Relatório Oficial (Layout A4)</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">
                {targetEvents.length} {targetEvents.length === 1 ? 'evento carregado' : 'eventos no dossiê'}
              </span>
            </div>

            <div className="flex-1 mt-3 bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
              <iframe
                title="Preview eSocial PDF"
                srcDoc={previewHtml}
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
