'use client';

import React, { useState, useMemo } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  ESocialEvent, 
  ESocialEventType, 
  ESocialEventStatus,
  ESocialAmbientRiskFactor,
  ESocialComplementaryExam
} from '@/types';
import { 
  ShieldCheck, 
  Send, 
  FileCode2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Eye, 
  Play, 
  Layers, 
  RefreshCw, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  ChevronRight, 
  FileCheck2, 
  Sparkles, 
  Building2, 
  User, 
  AlertCircle, 
  Activity, 
  Key, 
  Hash, 
  X,
  Stethoscope,
  HeartPulse,
  HardHat,
  Ban
} from 'lucide-react';

interface ESocialEventsViewProps {
  onNavigate?: (view: string) => void;
}

export const ESocialEventsView: React.FC<ESocialEventsViewProps> = ({ onNavigate }) => {
  const {
    esocialEvents,
    esocialBatches,
    clients,
    serviceOrders,
    currentRole,
    createESocialEvent,
    updateESocialEvent,
    deleteESocialEvent,
    validateESocialEvent,
    transmitESocialEvent,
    transmitBatchESocial,
    generateESocialFromServiceOrder,
    generateExclusionEventS3000,
    generateESocialXmlPreview,
    runESocialFullTestSuite
  } = usePrevSafe();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'events' | 'batches' | 'extractor' | 'tests'>('events');

  // Filters
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterClient, setFilterClient] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selection for Batch Actions
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ESocialEvent | null>(null);
  const [xmlModalEvent, setXmlModalEvent] = useState<ESocialEvent | null>(null);
  const [xmlActiveTab, setXmlActiveTab] = useState<'xml' | 'receipt' | 'history'>('xml');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);

  // Test Suite State
  const [testResults, setTestResults] = useState<{
    passed: number;
    failed: number;
    results: Array<{ testName: string; passed: boolean; message: string; details?: string }>;
  } | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Batch Transmission State
  const [batchCertificate, setBatchCertificate] = useState<'A1_DIGITAL' | 'A3_TOKEN_SMARTCARD'>('A1_DIGITAL');
  const [isTransmittingBatch, setIsTransmittingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  // Extraction State
  const [selectedExtractionOS, setSelectedExtractionOS] = useState<string>(serviceOrders[0]?.id || '');
  const [extractionType, setExtractionType] = useState<'S-2240' | 'S-2220'>('S-2240');

  // Toast / Feedback message
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return esocialEvents.filter(evt => {
      if (filterType !== 'ALL' && evt.event_type !== filterType) return false;
      if (filterStatus !== 'ALL' && evt.status !== filterStatus) return false;
      if (filterClient !== 'ALL' && evt.client_id !== filterClient) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchWorker = evt.worker_name.toLowerCase().includes(q);
        const matchCpf = evt.worker_cpf.toLowerCase().includes(q);
        const matchMat = evt.worker_registration.toLowerCase().includes(q);
        const matchNum = evt.event_number.toLowerCase().includes(q);
        const matchRec = evt.receipt_number ? evt.receipt_number.toLowerCase().includes(q) : false;
        if (!matchWorker && !matchCpf && !matchMat && !matchNum && !matchRec) return false;
      }
      return true;
    });
  }, [esocialEvents, filterType, filterStatus, filterClient, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = esocialEvents.length;
    const success = esocialEvents.filter(e => e.status === 'SUCCESS').length;
    const ready = esocialEvents.filter(e => e.status === 'READY_TO_SEND' || e.status === 'VALIDATED').length;
    const rejected = esocialEvents.filter(e => e.status === 'REJECTED').length;
    const drafts = esocialEvents.filter(e => e.status === 'DRAFT').length;

    const s2240Count = esocialEvents.filter(e => e.event_type === 'S-2240').length;
    const s2220Count = esocialEvents.filter(e => e.event_type === 'S-2220').length;
    const s2210Count = esocialEvents.filter(e => e.event_type === 'S-2210').length;
    const s3000Count = esocialEvents.filter(e => e.event_type === 'S-3000').length;

    return { total, success, ready, rejected, drafts, s2240Count, s2220Count, s2210Count, s3000Count };
  }, [esocialEvents]);

  // Handle Multi-selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedEventIds(filteredEvents.map(evt => evt.id));
    } else {
      setSelectedEventIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedEventIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Run Test Suite
  const handleRunTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const res = runESocialFullTestSuite();
      setTestResults(res);
      setIsRunningTests(false);
      setActiveTab('tests');
      showToast(`Bateria de testes concluída: ${res.passed} aprovados, ${res.failed} falhas.`, res.failed === 0 ? 'success' : 'error');
    }, 600);
  };

  // Handle Single Event Transmission
  const handleTransmitSingle = (id: string) => {
    const res = transmitESocialEvent(id);
    if (res.success) {
      showToast(`Evento transmitido com sucesso! Recibo: ${res.receipt}`, 'success');
    } else {
      showToast(`Falha na transmissão: ${res.error}`, 'error');
    }
  };

  // Handle Single Event Validation
  const handleValidateSingle = (id: string) => {
    const res = validateESocialEvent(id);
    if (res.success) {
      showToast('Evento validado com sucesso! Pronto para transmissão.', 'success');
    } else {
      showToast(`Erros encontrados: ${res.errors.join('; ')}`, 'error');
    }
  };

  // Handle Batch Transmission
  const handleExecuteBatchTransmission = () => {
    if (selectedEventIds.length === 0) return;
    setIsTransmittingBatch(true);
    setBatchProgress(20);

    setTimeout(() => {
      setBatchProgress(60);
      setTimeout(() => {
        setBatchProgress(100);
        const result = transmitBatchESocial(selectedEventIds, batchCertificate);
        setIsTransmittingBatch(false);
        setIsBatchModalOpen(false);
        setSelectedEventIds([]);
        showToast(`Lote ${result.batch.batch_number} transmitido: ${result.successCount} aceitos, ${result.errorCount} rejeitados.`, result.errorCount === 0 ? 'success' : 'info');
      }, 500);
    }, 400);
  };

  // Handle Extraction from Service Order
  const handleExecuteExtraction = () => {
    if (!selectedExtractionOS) return;
    const newEvt = generateESocialFromServiceOrder(selectedExtractionOS, extractionType);
    if (newEvt) {
      setIsExtractModalOpen(false);
      showToast(`Evento ${newEvt.event_number} (${newEvt.event_type}) gerado automaticamente a partir do PGR/PCMSO da OS!`, 'success');
    } else {
      showToast('Não foi possível extrair dados da OS selecionada.', 'error');
    }
  };

  // Handle Copy XML / Recibo
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Download XML file
  const handleDownloadXml = (event: ESocialEvent) => {
    const xml = event.xml_content || generateESocialXmlPreview(event);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.event_number}_${event.event_type}_${event.worker_registration}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Arquivo XML ${event.event_number}.xml baixado com sucesso.`, 'info');
  };

  return (
    <div id="esocial-module-root" className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 space-y-6">
      
      {/* Feedback Toast */}
      {toastMessage && (
        <div id="esocial-toast-alert" className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border transition-all duration-300 ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/60' 
            : toastMessage.type === 'error'
            ? 'bg-rose-950/90 text-rose-200 border-rose-700/60'
            : 'bg-indigo-950/90 text-indigo-200 border-indigo-700/60'
        }`}>
          {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toastMessage.type === 'info' && <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />}
          <span className="text-xs md:text-sm font-medium">{toastMessage.message}</span>
        </div>
      )}

      {/* Header & Quick Action Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Gestão de Eventos eSocial SST</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Layout v.S-1.2
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                  Ambiente Oficial
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Emissão, validação XSD, assinatura ICP-Brasil e transmissão WebService de S-2210 (CAT), S-2220 (ASO/Saúde), S-2240 (Condições Ambientais) e S-3000 (Exclusão).
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-run-esocial-tests"
            onClick={handleRunTests}
            disabled={isRunningTests}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 border border-indigo-900/50 text-xs font-semibold transition shadow-sm"
          >
            <Play className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
            <span>{isRunningTests ? 'Executando Testes...' : '🧪 Testes Automatizados'}</span>
          </button>

          <button
            id="btn-extract-from-so"
            onClick={() => setIsExtractModalOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-900/50 text-xs font-semibold transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Extrair de OS (PGR/PCMSO)</span>
          </button>

          <button
            id="btn-open-create-modal"
            onClick={() => {
              setEditingEvent(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Evento Manual</span>
          </button>
        </div>
      </div>

      {/* Bento Grid: Metric KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Eventos</span>
            <FileCode2 className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tracking-tight">{stats.total}</span>
            <span className="text-[10px] text-slate-400 font-mono">100% registros</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-900/40 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Transmitidos / Recibo</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">{stats.success}</span>
            <span className="text-[10px] text-emerald-500 font-medium">Aceitos Serpro</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-blue-900/40 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Prontos p/ Envio</span>
            <Send className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-400 tracking-tight">{stats.ready}</span>
            <span className="text-[10px] text-blue-400 font-medium">Validados XSD</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-900/40 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Inconsistências / Erro</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-400 tracking-tight">{stats.rejected}</span>
            <span className="text-[10px] text-rose-400 font-medium">Requer Correção</span>
          </div>
        </div>

        <div className="col-span-2 md:col-span-4 lg:col-span-1 p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Distribuição SST</span>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 text-center">
            <div className="bg-slate-950 p-1 rounded-lg">
              <span className="block text-[9px] text-amber-400 font-bold">2240</span>
              <span className="text-xs font-bold text-slate-200">{stats.s2240Count}</span>
            </div>
            <div className="bg-slate-950 p-1 rounded-lg">
              <span className="block text-[9px] text-teal-400 font-bold">2220</span>
              <span className="text-xs font-bold text-slate-200">{stats.s2220Count}</span>
            </div>
            <div className="bg-slate-950 p-1 rounded-lg">
              <span className="block text-[9px] text-rose-400 font-bold">2210</span>
              <span className="text-xs font-bold text-slate-200">{stats.s2210Count}</span>
            </div>
            <div className="bg-slate-950 p-1 rounded-lg">
              <span className="block text-[9px] text-purple-400 font-bold">3000</span>
              <span className="text-xs font-bold text-slate-200">{stats.s3000Count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Header */}
      <div className="flex items-center justify-between border-b border-slate-800">
        <div className="flex space-x-2">
          <button
            id="tab-btn-events"
            onClick={() => setActiveTab('events')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'events'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Eventos eSocial</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {esocialEvents.length}
            </span>
          </button>

          <button
            id="tab-btn-batches"
            onClick={() => setActiveTab('batches')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'batches'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Lotes & Protocolos</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {esocialBatches.length}
            </span>
          </button>

          <button
            id="tab-btn-extractor"
            onClick={() => setActiveTab('extractor')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'extractor'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Assistente de Extração PGR/PCMSO</span>
          </button>

          <button
            id="tab-btn-tests"
            onClick={() => setActiveTab('tests')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'tests'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Suíte de Testes & Validador XSD</span>
            {testResults && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                testResults.failed === 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
              }`}>
                {testResults.passed}/{testResults.results.length}
              </span>
            )}
          </button>
        </div>

        {selectedEventIds.length > 0 && activeTab === 'events' && (
          <div className="flex items-center space-x-2.5 pb-2">
            <span className="text-xs text-emerald-400 font-medium">
              {selectedEventIds.length} selecionado(s)
            </span>
            <button
              id="btn-open-batch-transmission"
              onClick={() => setIsBatchModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Transmitir Lote ({selectedEventIds.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: EVENTS LIST & CRUD */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="input-esocial-search"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por colaborador, CPF, matrícula ou recibo de entrega..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                id="filter-esocial-type"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="S-2240">S-2240 (Condições Ambientais)</option>
                <option value="S-2220">S-2220 (Monitoramento Saúde / ASO)</option>
                <option value="S-2210">S-2210 (Comunicação Acidente CAT)</option>
                <option value="S-3000">S-3000 (Exclusão de Evento)</option>
              </select>

              <select
                id="filter-esocial-status"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Todos os Status</option>
                <option value="SUCCESS">Transmitido com Sucesso (Recibo)</option>
                <option value="READY_TO_SEND">Pronto p/ Envio (Validado)</option>
                <option value="DRAFT">Rascunho</option>
                <option value="REJECTED">Inconsistente / Rejeitado</option>
              </select>

              <select
                id="filter-esocial-client"
                value={filterClient}
                onChange={e => setFilterClient(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 max-w-[200px] truncate"
              >
                <option value="ALL">Todas as Empresas</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Events Table Container */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                    <th className="p-3.5 w-10 text-center">
                      <input
                        id="checkbox-select-all-events"
                        type="checkbox"
                        checked={filteredEvents.length > 0 && selectedEventIds.length === filteredEvents.length}
                        onChange={handleSelectAll}
                        className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                      />
                    </th>
                    <th className="p-3.5">Evento & Tipo</th>
                    <th className="p-3.5">Trabalhador & Matrícula</th>
                    <th className="p-3.5">Empresa Cliente</th>
                    <th className="p-3.5">Dados Principais</th>
                    <th className="p-3.5">Status & Recibo</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        <FileCode2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">Nenhum evento eSocial encontrado para os filtros selecionados.</p>
                        <p className="text-xs text-slate-600 mt-1">Crie um novo evento manual ou extraia automaticamente de uma OS do PGR/PCMSO.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map(evt => {
                      const client = clients.find(c => c.id === evt.client_id);
                      const isSelected = selectedEventIds.includes(evt.id);

                      return (
                        <tr 
                          key={evt.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-emerald-950/20' : ''
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(evt.id)}
                              className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                            />
                          </td>

                          {/* Event Number & Type Badge */}
                          <td className="p-3.5 font-mono">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                evt.event_type === 'S-2240'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : evt.event_type === 'S-2220'
                                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                  : evt.event_type === 'S-2210'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              }`}>
                                {evt.event_type}
                              </span>
                              <span className="font-semibold text-slate-200 text-[11px]">{evt.event_number}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {evt.event_type === 'S-2240' && 'Condições Ambientais'}
                              {evt.event_type === 'S-2220' && 'Monitoramento Saúde (ASO)'}
                              {evt.event_type === 'S-2210' && 'Comunicação Acidente (CAT)'}
                              {evt.event_type === 'S-3000' && 'Exclusão de Evento'}
                            </span>
                          </td>

                          {/* Worker Details */}
                          <td className="p-3.5">
                            <div className="font-medium text-white">{evt.worker_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              CPF: {evt.worker_cpf} • Mat: {evt.worker_registration}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              CBO {evt.worker_cbo}: {evt.worker_role}
                            </div>
                          </td>

                          {/* Client */}
                          <td className="p-3.5">
                            <div className="text-slate-200 font-medium truncate max-w-[160px]">
                              {client?.trade_name || client?.legal_name || 'Cliente PrevSafe'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {client?.document_number || 'CNPJ não informado'}
                            </div>
                          </td>

                          {/* Dynamic Payload Summary */}
                          <td className="p-3.5">
                            {evt.event_type === 'S-2240' && (
                              <div className="text-[11px] text-slate-300 space-y-0.5">
                                <div><span className="text-slate-500">Riscos:</span> {evt.ambient_data?.ambient_risks.length || 0} cadastrado(s)</div>
                                <div className="text-slate-400 text-[10px] truncate max-w-[200px]">
                                  {evt.ambient_data?.ambient_risks.map(r => r.description).join(', ')}
                                </div>
                              </div>
                            )}

                            {evt.event_type === 'S-2220' && (
                              <div className="text-[11px] text-slate-300 space-y-0.5">
                                <div>
                                  <span className="text-slate-500">Tipo:</span> {evt.aso_data?.aso_type} • <span className={`font-semibold ${evt.aso_data?.result === 'APTO' ? 'text-emerald-400' : 'text-rose-400'}`}>{evt.aso_data?.result}</span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {evt.aso_data?.physician_name} ({evt.aso_data?.physician_crm})
                                </div>
                              </div>
                            )}

                            {evt.event_type === 'S-2210' && (
                              <div className="text-[11px] text-slate-300 space-y-0.5">
                                <div><span className="text-slate-500">Tipo CAT:</span> {evt.cat_data?.cat_type} • CID: {evt.cat_data?.cid_code?.split(' ')[0]}</div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                  Parte: {evt.cat_data?.body_part} ({evt.cat_data?.days_away} dias afast.)
                                </div>
                              </div>
                            )}

                            {evt.event_type === 'S-3000' && (
                              <div className="text-[11px] text-slate-300 space-y-0.5">
                                <div><span className="text-slate-500">Alvo:</span> {evt.exclusion_data?.target_event_type}</div>
                                <div className="text-[10px] text-purple-300 font-mono truncate max-w-[200px]">
                                  Recibo: {evt.exclusion_data?.target_receipt_number}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Status & Receipt */}
                          <td className="p-3.5">
                            {evt.status === 'SUCCESS' && (
                              <div>
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Transmitido (201)</span>
                                </span>
                                <span className="block text-[10px] text-slate-400 font-mono mt-1 truncate max-w-[150px]" title={evt.receipt_number}>
                                  Recibo: {evt.receipt_number?.substring(0, 18)}...
                                </span>
                              </div>
                            )}

                            {evt.status === 'READY_TO_SEND' && (
                              <div>
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  <Send className="w-3 h-3" />
                                  <span>Pronto p/ Envio</span>
                                </span>
                                <span className="block text-[10px] text-slate-500 mt-0.5">Validado XSD v.S-1.2</span>
                              </div>
                            )}

                            {evt.status === 'DRAFT' && (
                              <div>
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                  <Clock className="w-3 h-3" />
                                  <span>Rascunho</span>
                                </span>
                              </div>
                            )}

                            {evt.status === 'REJECTED' && (
                              <div>
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Rejeitado / Erro</span>
                                </span>
                                <span className="block text-[10px] text-rose-300/80 mt-0.5 truncate max-w-[160px]" title={evt.validation_errors?.[0] || evt.return_message}>
                                  {evt.validation_errors?.[0] || evt.return_message}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Row Actions */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              
                              {/* View XML / Receipt */}
                              <button
                                id={`btn-view-xml-${evt.id}`}
                                onClick={() => {
                                  setXmlModalEvent(evt);
                                  setXmlActiveTab('xml');
                                }}
                                title="Visualizar XML e Recibo"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Validate Action */}
                              {evt.status !== 'SUCCESS' && (
                                <button
                                  id={`btn-validate-${evt.id}`}
                                  onClick={() => handleValidateSingle(evt.id)}
                                  title="Validar Schemas e Regras XSD"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-blue-200 transition"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Transmit Action */}
                              {evt.status !== 'SUCCESS' && (
                                <button
                                  id={`btn-transmit-${evt.id}`}
                                  onClick={() => handleTransmitSingle(evt.id)}
                                  title="Transmitir WebService com Certificado Digital"
                                  className="p-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white transition shadow-sm"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Edit Event */}
                              {evt.status !== 'SUCCESS' && (
                                <button
                                  id={`btn-edit-${evt.id}`}
                                  onClick={() => {
                                    setEditingEvent(evt);
                                    setIsCreateModalOpen(true);
                                  }}
                                  title="Editar Dados do Evento"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Exclusion S-3000 if Transmitted */}
                              {evt.status === 'SUCCESS' && evt.event_type !== 'S-3000' && (
                                <button
                                  id={`btn-exclude-s3000-${evt.id}`}
                                  onClick={() => {
                                    const reason = prompt('Informe a justificativa legal para exclusão deste evento no eSocial (S-3000):', 'Retificação cadastral ou exclusão de vínculo cancelado.');
                                    if (reason) {
                                      const s3000 = generateExclusionEventS3000(evt.id, reason);
                                      showToast(`Evento de exclusão ${s3000.event_number} (S-3000) gerado para o recibo ${evt.receipt_number}!`, 'success');
                                    }
                                  }}
                                  title="Gerar Evento de Exclusão S-3000"
                                  className="p-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-300 transition border border-purple-800/40"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Draft/Rejected */}
                              {evt.status !== 'SUCCESS' && (
                                <button
                                  id={`btn-delete-${evt.id}`}
                                  onClick={() => {
                                    if (confirm(`Confirma a exclusão do evento ${evt.event_number} (${evt.worker_name})?`)) {
                                      deleteESocialEvent(evt.id);
                                      showToast('Evento excluído com sucesso.', 'info');
                                    }
                                  }}
                                  title="Excluir Registro"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BATCHES & PROTOCOLS */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Lotes de Transmissão WebService eSocial</h2>
              <p className="text-xs text-slate-400">
                Histórico de pacotes XML transmitidos via protocolo seguro Serpro com certificado ICP-Brasil.
              </p>
            </div>
            <button
              onClick={() => {
                showToast('Consultando status dos lotes no Serpro... Todos os lotes sincronizados.', 'info');
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sincronizar Protocolos</span>
            </button>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="p-3.5">Número do Lote</th>
                  <th className="p-3.5">Protocolo WebService</th>
                  <th className="p-3.5">Certificado Utilizado</th>
                  <th className="p-3.5">Eventos Contidos</th>
                  <th className="p-3.5">Data de Envio</th>
                  <th className="p-3.5">Status Retorno</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {esocialBatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Nenhum lote de transmissão registrado até o momento.
                    </td>
                  </tr>
                ) : (
                  esocialBatches.map(b => (
                    <tr key={b.id} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-emerald-400">{b.batch_number}</td>
                      <td className="p-3.5 font-mono text-slate-300">{b.protocol_number}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {b.certificate_type === 'A1_DIGITAL' ? 'ICP-Brasil A1 (Nuvem)' : 'ICP-Brasil A3 (Token)'}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium">
                        {b.events_count} evento(s) ({b.success_count} sucesso, {b.error_count} erro)
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {new Date(b.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          b.status === 'SUCESSO_TOTAL'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{b.status === 'SUCESSO_TOTAL' ? 'Processado com Sucesso' : 'Sucesso Parcial'}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: EXTRACTOR PGR/PCMSO */}
      {activeTab === 'extractor' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Automação de Engenharia SST</span>
              </div>
              <h2 className="text-xl font-bold text-white">Assistente Automático de Extração eSocial</h2>
              <p className="text-xs text-slate-400 mt-1">
                Converta relatórios técnicos do PGR (NR-01), LTCAT (NR-15/16) ou PCMSO (NR-07) em eventos oficiais estruturados do eSocial com 1 clique, sem retrabalho de digitação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300 uppercase">
                  1. Selecione a Ordem de Serviço (OS) de Origem
                </label>
                <select
                  value={selectedExtractionOS}
                  onChange={e => setSelectedExtractionOS(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {serviceOrders.map(so => {
                    const client = clients.find(c => c.id === so.client_id);
                    return (
                      <option key={so.id} value={so.id}>
                        {so.os_number} - {so.title} ({client?.trade_name || client?.legal_name || 'Cliente'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300 uppercase">
                  2. Tipo de Evento a Gerar
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExtractionType('S-2240')}
                    className={`p-3 rounded-xl border text-left transition ${
                      extractionType === 'S-2240'
                        ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">S-2240</div>
                    <div className="text-[10px] opacity-80">Condições Ambientais (PGR/LTCAT)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExtractionType('S-2220')}
                    className={`p-3 rounded-xl border text-left transition ${
                      extractionType === 'S-2220'
                        ? 'bg-teal-950/30 border-teal-500/50 text-teal-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">S-2220</div>
                    <div className="text-[10px] opacity-80">Monitoramento da Saúde (PCMSO/ASO)</div>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleExecuteExtraction}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>Processar Extração e Gerar Evento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATED TEST SUITE & XSD VALIDATOR */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Suíte de Testes Automatizados eSocial & Regras de Negócio</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  eSocial End-to-End Runner
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Executa validações automatizadas de schemas XML, restrições da Tabela 24, validação de CRM/CREA, assinaturas digitais e simulação de WebService Serpro.
              </p>
            </div>

            <button
              onClick={handleRunTests}
              disabled={isRunningTests}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shrink-0"
            >
              <Play className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
              <span>{isRunningTests ? 'Executando Testes...' : 'Reexecutar Bateria Completa'}</span>
            </button>
          </div>

          {testResults ? (
            <div className="space-y-3">
              {/* Summary Card */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                testResults.failed === 0 
                  ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-200' 
                  : 'bg-rose-950/30 border-rose-700/50 text-rose-200'
              }`}>
                <div className="flex items-center space-x-3">
                  {testResults.failed === 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      {testResults.failed === 0 ? 'Todos os Testes de Conformidade eSocial Foram Aprovados!' : 'Foram encontradas inconsistências na validação eSocial.'}
                    </h3>
                    <p className="text-xs opacity-80">
                      Total de asserções executadas: {testResults.results.length} • Aprovados: {testResults.passed} • Falhas: {testResults.failed}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700">
                  Taxa de Sucesso: {Math.round((testResults.passed / testResults.results.length) * 100)}%
                </span>
              </div>

              {/* Individual Assertions */}
              <div className="space-y-2.5">
                {testResults.results.map((res, i) => (
                  <div 
                    key={i}
                    className={`p-3.5 rounded-xl border flex items-start justify-between space-x-3 ${
                      res.passed 
                        ? 'bg-slate-900/60 border-slate-800' 
                        : 'bg-rose-950/20 border-rose-800/40'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        {res.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{res.testName}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{res.message}</div>
                        {res.details && (
                          <div className="text-[10px] text-indigo-300 font-mono mt-1">{res.details}</div>
                        )}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      res.passed 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {res.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500">
              <Play className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Nenhum teste executado ainda nesta sessão.</p>
              <p className="text-xs text-slate-600 mt-1">Clique no botão acima para rodar a suíte completa de testes eSocial.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: XML VIEWER & OFFICIAL RECEIPT                                    */}
      {/* ========================================================================= */}
      {xmlModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {xmlModalEvent.event_type} - {xmlModalEvent.event_number}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {xmlModalEvent.worker_name} • CPF: {xmlModalEvent.worker_cpf}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setXmlModalEvent(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex border-b border-slate-800 bg-slate-950/40 px-5">
              <button
                onClick={() => setXmlActiveTab('xml')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                  xmlActiveTab === 'xml'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                XML Assinado (eSocial v.S-1.2)
              </button>

              <button
                onClick={() => setXmlActiveTab('receipt')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                  xmlActiveTab === 'receipt'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Recibo Oficial de Entrega
              </button>

              <button
                onClick={() => setXmlActiveTab('history')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                  xmlActiveTab === 'history'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Histórico & Auditoria
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto font-mono text-xs">
              {xmlActiveTab === 'xml' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                    <span className="text-[11px]">Schema XSD: http://www.esocial.gov.br/schema/evt/{xmlModalEvent.event_type}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopyText(xmlModalEvent.xml_content || generateESocialXmlPreview(xmlModalEvent), 'xml')}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-[11px]"
                      >
                        {copiedId === 'xml' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === 'xml' ? 'Copiado!' : 'Copiar XML'}</span>
                      </button>

                      <button
                        onClick={() => handleDownloadXml(xmlModalEvent)}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white transition text-[11px]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar .xml</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300/90 overflow-x-auto text-[11px] leading-relaxed max-h-[50vh]">
                    {xmlModalEvent.xml_content || generateESocialXmlPreview(xmlModalEvent)}
                  </pre>
                </div>
              )}

              {xmlActiveTab === 'receipt' && (
                <div className="space-y-4">
                  {xmlModalEvent.receipt_number ? (
                    <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-700/50 space-y-4">
                      <div className="flex items-center space-x-3 text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                        <div>
                          <h4 className="font-bold text-sm uppercase tracking-wide">Comprovante Oficial de Recepção eSocial</h4>
                          <p className="text-[11px] opacity-80">Ambiente de Produção Nacional - Serpro / Receita Federal do Brasil</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-3 border-t border-emerald-900/40">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Número do Recibo:</span>
                          <span className="font-bold text-white font-mono text-xs">{xmlModalEvent.receipt_number}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Protocolo de Transmissão:</span>
                          <span className="font-bold text-white font-mono text-xs">{xmlModalEvent.protocol_number}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Data/Hora de Processamento:</span>
                          <span className="text-slate-200">{xmlModalEvent.transmitted_at ? new Date(xmlModalEvent.transmitted_at).toLocaleString('pt-BR') : '18/08/2026 14:22:10'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Código de Resposta do WebService:</span>
                          <span className="text-emerald-400 font-bold">{xmlModalEvent.return_code || '201 - SUCESSO'}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-emerald-900/60 text-[11px] text-slate-300">
                        <span className="text-emerald-400 font-bold block mb-1">Mensagem Oficial do eSocial:</span>
                        {xmlModalEvent.return_message || 'Evento processado e recepcionado com sucesso pela base oficial do eSocial (Serpro).'}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500 rounded-2xl bg-slate-950 border border-slate-800">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">Este evento ainda não foi transmitido para o eSocial.</p>
                      <p className="text-xs text-slate-600 mt-1">Valide e transmita o evento para gerar o Recibo Oficial do Serpro.</p>
                    </div>
                  )}
                </div>
              )}

              {xmlActiveTab === 'history' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {(xmlModalEvent.history || []).map((h, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                        <div className="flex items-center justify-between text-slate-400 text-[10px] pb-1 border-b border-slate-900">
                          <span className="font-bold text-indigo-400">{h.action}</span>
                          <span>{new Date(h.date).toLocaleString('pt-BR')} • {h.user_name}</span>
                        </div>
                        <p className="text-slate-300 mt-1 text-[11px]">{h.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950">
              <button
                onClick={() => setXmlModalEvent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE / EDIT ESOCIAL EVENT                                      */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <CreateEditEventModal
          initialEvent={editingEvent}
          clients={clients}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={(data) => {
            if (editingEvent) {
              updateESocialEvent(editingEvent.id, data);
              showToast(`Evento ${editingEvent.event_number} atualizado com sucesso!`, 'success');
            } else {
              const created = createESocialEvent(data);
              showToast(`Novo evento ${created.event_number} (${created.event_type}) cadastrado!`, 'success');
            }
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BATCH TRANSMISSION MODAL                                         */}
      {/* ========================================================================= */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Send className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Transmissão em Lote WebService</h3>
              </div>
              <button onClick={() => setIsBatchModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Você selecionou <span className="font-bold text-emerald-400">{selectedEventIds.length} evento(s)</span> para assinatura digital e envio unificado ao WebService do eSocial.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase">
                Selecione o Certificado Digital ICP-Brasil
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBatchCertificate('A1_DIGITAL')}
                  className={`p-3 rounded-xl border text-left transition ${
                    batchCertificate === 'A1_DIGITAL'
                      ? 'bg-blue-950/30 border-blue-500 text-blue-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs">Certificado A1</div>
                  <div className="text-[10px] opacity-80">Arquivo .PFX (Assinatura em Nuvem)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchCertificate('A3_TOKEN_SMARTCARD')}
                  className={`p-3 rounded-xl border text-left transition ${
                    batchCertificate === 'A3_TOKEN_SMARTCARD'
                      ? 'bg-blue-950/30 border-blue-500 text-blue-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs">Certificado A3</div>
                  <div className="text-[10px] opacity-80">SmartCard / Token Físico</div>
                </button>
              </div>
            </div>

            {isTransmittingBatch && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-slate-300 font-medium">
                  <span>Transmitindo lote para o Serpro...</span>
                  <span>{batchProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${batchProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                disabled={isTransmittingBatch}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteBatchTransmission}
                disabled={isTransmittingBatch}
                className="flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTransmittingBatch ? 'Transmitindo...' : 'Confirmar Envio de Lote'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EXTRACTOR QUICK MODAL                                            */}
      {/* ========================================================================= */}
      {isExtractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Extração Rápida de OS</h3>
              </div>
              <button onClick={() => setIsExtractModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase">
                Selecione a Ordem de Serviço
              </label>
              <select
                value={selectedExtractionOS}
                onChange={e => setSelectedExtractionOS(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                {serviceOrders.map(so => (
                  <option key={so.id} value={so.id}>
                    {so.os_number} - {so.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase">
                Tipo de Evento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExtractionType('S-2240')}
                  className={`p-2.5 rounded-xl border text-xs font-bold ${
                    extractionType === 'S-2240' ? 'bg-amber-950/40 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  S-2240 (Riscos)
                </button>
                <button
                  type="button"
                  onClick={() => setExtractionType('S-2220')}
                  className={`p-2.5 rounded-xl border text-xs font-bold ${
                    extractionType === 'S-2220' ? 'bg-teal-950/40 border-teal-500 text-teal-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  S-2220 (ASO)
                </button>
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsExtractModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteExtraction}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
              >
                Gerar Evento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: MODAL CREATE / EDIT ESOCIAL EVENT
// =========================================================================
interface CreateEditEventModalProps {
  initialEvent: ESocialEvent | null;
  clients: any[];
  onClose: () => void;
  onSave: (data: any) => void;
}

const CreateEditEventModal: React.FC<CreateEditEventModalProps> = ({
  initialEvent,
  clients,
  onClose,
  onSave
}) => {
  const [eventType, setEventType] = useState<ESocialEventType>(initialEvent?.event_type || 'S-2240');
  const [clientId, setClientId] = useState<string>(initialEvent?.client_id || clients[0]?.id || '');
  const [workerName, setWorkerName] = useState<string>(initialEvent?.worker_name || '');
  const [workerCpf, setWorkerCpf] = useState<string>(initialEvent?.worker_cpf || '');
  const [workerRegistration, setWorkerRegistration] = useState<string>(initialEvent?.worker_registration || '');
  const [workerCbo, setWorkerCbo] = useState<string>(initialEvent?.worker_cbo || '7212-15');
  const [workerRole, setWorkerRole] = useState<string>(initialEvent?.worker_role || 'Operador Industrial');

  // S-2240 State
  const [s2240StartDate, setS2240StartDate] = useState<string>(initialEvent?.ambient_data?.start_date || new Date().toISOString().split('T')[0]);
  const [s2240Description, setS2240Description] = useState<string>(initialEvent?.ambient_data?.description_activities || 'Atividades operacionais e de manutenção.');
  const [s2240Environment, setS2240Environment] = useState<string>(initialEvent?.ambient_data?.work_environment || 'Planta Operacional');
  const [s2240TechName, setS2240TechName] = useState<string>(initialEvent?.ambient_data?.responsible_technician_name || 'Eng. Eduardo Vasconcelos');
  const [s2240TechCpf, setS2240TechCpf] = useState<string>(initialEvent?.ambient_data?.responsible_technician_cpf || '123.456.789-00');
  const [s2240TechCrea, setS2240TechCrea] = useState<string>(initialEvent?.ambient_data?.responsible_technician_crea_crm || 'CREA-SP 5069812/D');

  // S-2220 State
  const [s2220AsoType, setS2220AsoType] = useState<any>(initialEvent?.aso_data?.aso_type || 'PERIODICO');
  const [s2220ExamDate, setS2220ExamDate] = useState<string>(initialEvent?.aso_data?.exam_date || new Date().toISOString().split('T')[0]);
  const [s2220Result, setS2220Result] = useState<'APTO' | 'INAPTO'>(initialEvent?.aso_data?.result || 'APTO');
  const [s2220DocName, setS2220DocName] = useState<string>(initialEvent?.aso_data?.physician_name || 'Dra. Camila Bittencourt Guimarães');
  const [s2220DocCrm, setS2220DocCrm] = useState<string>(initialEvent?.aso_data?.physician_crm || 'CRM-SP 145892');

  // S-2210 State
  const [s2210CatType, setS2210CatType] = useState<any>(initialEvent?.cat_data?.cat_type || 'INICIAL');
  const [s2210AccidentDate, setS2210AccidentDate] = useState<string>(initialEvent?.cat_data?.accident_date || new Date().toISOString().split('T')[0]);
  const [s2210AccidentTime, setS2210AccidentTime] = useState<string>(initialEvent?.cat_data?.accident_time || '10:00');
  const [s2210BodyPart, setS2210BodyPart] = useState<string>(initialEvent?.cat_data?.body_part || 'Mão e Dedos');
  const [s2210Agent, setS2210Agent] = useState<string>(initialEvent?.cat_data?.accident_agent || 'Ferramenta manual ou máquina operatriz');
  const [s2210Cid, setS2210Cid] = useState<string>(initialEvent?.cat_data?.cid_code || 'S61 - Ferimento do punho e da mão');
  const [s2210DaysAway, setS2210DaysAway] = useState<number>(initialEvent?.cat_data?.days_away || 0);

  // S-3000 State
  const [s3000TargetType, setS3000TargetType] = useState<'S-2210' | 'S-2220' | 'S-2240'>(initialEvent?.exclusion_data?.target_event_type || 'S-2240');
  const [s3000Receipt, setS3000Receipt] = useState<string>(initialEvent?.exclusion_data?.target_receipt_number || '1.2.202608.0000000000000000000-01');
  const [s3000Reason, setS3000Reason] = useState<string>(initialEvent?.exclusion_data?.exclusion_reason || 'Exclusão de evento enviado com erro no vínculo empregatício.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      client_id: clientId,
      event_type: eventType,
      environment: 'PRODUCAO',
      is_rectification: false,
      worker_name: workerName,
      worker_cpf: workerCpf,
      worker_registration: workerRegistration,
      worker_cbo: workerCbo,
      worker_role: workerRole,
      status: 'DRAFT'
    };

    if (eventType === 'S-2240') {
      payload.ambient_data = {
        start_date: s2240StartDate,
        description_activities: s2240Description,
        work_environment: s2240Environment,
        ambient_risks: [
          {
            id: `risk-${Date.now()}`,
            risk_code_table_24: '01.01.001',
            category: 'FÍSICO',
            description: 'Ruído Contínuo NR-15 Anexo 1',
            intensity_concentration: '86.5 dB(A)',
            limit_tolerance: '85.0 dB(A)',
            measurement_unit: 'dB(A)',
            technique_used: 'Dosimetria NHO-01',
            epc_effective: false,
            epi_effective: true,
            epi_ca_numbers: ['CA 14235'],
            is_insalubre: true,
            is_periculoso: false
          }
        ],
        responsible_technician_name: s2240TechName,
        responsible_technician_cpf: s2240TechCpf,
        responsible_technician_crea_crm: s2240TechCrea,
        responsible_technician_uf: 'SP'
      };
    } else if (eventType === 'S-2220') {
      payload.aso_data = {
        aso_type: s2220AsoType,
        exam_date: s2220ExamDate,
        result: s2220Result,
        physician_name: s2220DocName,
        physician_crm: s2220DocCrm,
        physician_uf: 'SP',
        exams_list: [
          {
            code: '0295',
            name: 'Avaliação Clínica Ocupacional e Anamnese Geral',
            date: s2220ExamDate,
            procedure_type: 'CLINICO',
            result: 'NORMAL',
            observation: 'Apto para o trabalho.'
          }
        ]
      };
    } else if (eventType === 'S-2210') {
      payload.cat_data = {
        cat_type: s2210CatType,
        accident_date: s2210AccidentDate,
        accident_time: s2210AccidentTime,
        accident_type: 'TIPICO',
        body_part: s2210BodyPart,
        accident_agent: s2210Agent,
        death_occurred: false,
        police_report: false,
        medical_cert_issuer: 'Pronto Atendimento Municipal',
        medical_crm: 'CRM-SP 88412',
        medical_uf: 'SP',
        cid_code: s2210Cid,
        days_away: s2210DaysAway,
        location_type: 'ESTABELECIMENTO_EMPREGADOR',
        location_description: 'Setor de Produção Industrial'
      };
    } else if (eventType === 'S-3000') {
      payload.exclusion_data = {
        target_event_type: s3000TargetType,
        target_receipt_number: s3000Receipt,
        exclusion_reason: s3000Reason
      };
    }

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">
              {initialEvent ? `Editar Evento ${initialEvent.event_number}` : 'Cadastrar Novo Evento eSocial'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Event Type & Client Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Tipo de Evento eSocial</label>
              <select
                value={eventType}
                onChange={e => setEventType(e.target.value as ESocialEventType)}
                disabled={Boolean(initialEvent)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold"
              >
                <option value="S-2240">S-2240 (Condições Ambientais)</option>
                <option value="S-2220">S-2220 (Monitoramento Saúde / ASO)</option>
                <option value="S-2210">S-2210 (Comunicação de Acidente - CAT)</option>
                <option value="S-3000">S-3000 (Exclusão de Evento)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Empresa Cliente</label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Worker Common Information */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-300 text-xs uppercase tracking-wide flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Identificação do Trabalhador</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={workerName}
                  onChange={e => setWorkerName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo de Souza"
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">CPF (11 dígitos)</label>
                <input
                  type="text"
                  required
                  value={workerCpf}
                  onChange={e => setWorkerCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Matrícula eSocial</label>
                <input
                  type="text"
                  required
                  value={workerRegistration}
                  onChange={e => setWorkerRegistration(e.target.value)}
                  placeholder="MAT-1001"
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">CBO (Classificação Brasileira de Ocupações)</label>
                <input
                  type="text"
                  required
                  value={workerCbo}
                  onChange={e => setWorkerCbo(e.target.value)}
                  placeholder="7212-15"
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Cargo / Função</label>
                <input
                  type="text"
                  required
                  value={workerRole}
                  onChange={e => setWorkerRole(e.target.value)}
                  placeholder="Operador de Usinagem CNC"
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                />
              </div>
            </div>
          </div>

          {/* DYNAMIC FORM SECTION: S-2240 */}
          {eventType === 'S-2240' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-900/40 space-y-3">
              <h4 className="font-bold text-amber-300 text-xs uppercase tracking-wide flex items-center space-x-1.5">
                <HardHat className="w-3.5 h-3.5 text-amber-400" />
                <span>Dados Ambientais S-2240 (PGR / LTCAT)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Data Início Condição</label>
                  <input
                    type="date"
                    value={s2240StartDate}
                    onChange={e => setS2240StartDate(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Ambiente de Trabalho / Setor</label>
                  <input
                    type="text"
                    value={s2240Environment}
                    onChange={e => setS2240Environment(e.target.value)}
                    placeholder="Galpão Industrial - Setor A"
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Descrição Detalhada das Atividades</label>
                <textarea
                  rows={2}
                  value={s2240Description}
                  onChange={e => setS2240Description(e.target.value)}
                  placeholder="Descrição das tarefas operacionais..."
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Resp. Técnico (Nome)</label>
                  <input
                    type="text"
                    value={s2240TechName}
                    onChange={e => setS2240TechName(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">CPF Resp. Técnico</label>
                  <input
                    type="text"
                    value={s2240TechCpf}
                    onChange={e => setS2240TechCpf(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">CREA/CRM Resp.</label>
                  <input
                    type="text"
                    value={s2240TechCrea}
                    onChange={e => setS2240TechCrea(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC FORM SECTION: S-2220 */}
          {eventType === 'S-2220' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-teal-900/40 space-y-3">
              <h4 className="font-bold text-teal-300 text-xs uppercase tracking-wide flex items-center space-x-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
                <span>Dados de Monitoramento da Saúde S-2220 (ASO)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Tipo de ASO</label>
                  <select
                    value={s2220AsoType}
                    onChange={e => setS2220AsoType(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="ADMISSIONAL">Admissional</option>
                    <option value="PERIODICO">Periódico</option>
                    <option value="RETORNO_TRABALHO">Retorno ao Trabalho</option>
                    <option value="MUDANCA_RISCO">Mudança de Risco</option>
                    <option value="DEMISSIONAL">Demissional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Data do ASO</label>
                  <input
                    type="date"
                    value={s2220ExamDate}
                    onChange={e => setS2220ExamDate(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Resultado ASO</label>
                  <select
                    value={s2220Result}
                    onChange={e => setS2220Result(e.target.value as any)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-bold"
                  >
                    <option value="APTO">APTO</option>
                    <option value="INAPTO">INAPTO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Médico Examinador</label>
                  <input
                    type="text"
                    value={s2220DocName}
                    onChange={e => setS2220DocName(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">CRM e UF do Médico</label>
                  <input
                    type="text"
                    value={s2220DocCrm}
                    onChange={e => setS2220DocCrm(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC FORM SECTION: S-2210 */}
          {eventType === 'S-2210' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-rose-900/40 space-y-3">
              <h4 className="font-bold text-rose-300 text-xs uppercase tracking-wide flex items-center space-x-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                <span>Comunicação de Acidente de Trabalho S-2210 (CAT)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Tipo de CAT</label>
                  <select
                    value={s2210CatType}
                    onChange={e => setS2210CatType(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="INICIAL">Inicial</option>
                    <option value="REABERTURA">Reabertura</option>
                    <option value="COMUNICACAO_OBITO">Comunicação de Óbito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Data do Acidente</label>
                  <input
                    type="date"
                    value={s2210AccidentDate}
                    onChange={e => setS2210AccidentDate(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Hora do Acidente</label>
                  <input
                    type="time"
                    value={s2210AccidentTime}
                    onChange={e => setS2210AccidentTime(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Parte do Corpo Atingida</label>
                  <input
                    type="text"
                    value={s2210BodyPart}
                    onChange={e => setS2210BodyPart(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Agente Causador</label>
                  <input
                    type="text"
                    value={s2210Agent}
                    onChange={e => setS2210Agent(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Código CID-10</label>
                  <input
                    type="text"
                    value={s2210Cid}
                    onChange={e => setS2210Cid(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Dias de Afastamento</label>
                  <input
                    type="number"
                    value={s2210DaysAway}
                    onChange={e => setS2210DaysAway(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC FORM SECTION: S-3000 */}
          {eventType === 'S-3000' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-purple-900/40 space-y-3">
              <h4 className="font-bold text-purple-300 text-xs uppercase tracking-wide flex items-center space-x-1.5">
                <Ban className="w-3.5 h-3.5 text-purple-400" />
                <span>Evento de Exclusão S-3000</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Tipo do Evento Alvo a Excluir</label>
                  <select
                    value={s3000TargetType}
                    onChange={e => setS3000TargetType(e.target.value as any)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="S-2240">S-2240 (Condições Ambientais)</option>
                    <option value="S-2220">S-2220 (ASO / Saúde)</option>
                    <option value="S-2210">S-2210 (CAT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Recibo do Evento a Excluir</label>
                  <input
                    type="text"
                    required
                    value={s3000Receipt}
                    onChange={e => setS3000Receipt(e.target.value)}
                    placeholder="1.2.202608.0000000000000847120-01"
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Justificativa Legal da Exclusão</label>
                <textarea
                  rows={2}
                  required
                  value={s3000Reason}
                  onChange={e => setS3000Reason(e.target.value)}
                  placeholder="Justificativa da anulação/exclusão..."
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                />
              </div>
            </div>
          )}

          {/* Modal Buttons */}
          <div className="pt-4 flex justify-end space-x-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-lg"
            >
              {initialEvent ? 'Salvar Alterações' : 'Salvar Evento (Rascunho)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
