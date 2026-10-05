'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { SSTWorkOrderOS, SSTWorkOrderSignatureMethod, RiscoDaOrdemDeServico } from '@/types';
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Search,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Printer,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ShieldCheck,
  Building2,
  HardHat,
  UserCheck,
  Fingerprint,
  Camera,
  X,
  FileDown,
  Info,
  Clock,
  RefreshCw
} from 'lucide-react';
import {
  exportWorkOrderOSPDF,
  exportBatchWorkOrdersOSPDF,
  exportWorkOrdersOSExcel
} from '@/lib/pdfExportService';
import { formatDate } from '@/lib/utils';
import { dataDoRegistro } from '@/lib/datas';

interface WorkOrderOSTabProps {
  selectedClientId: string;
}

/** Rotulo do metodo gravado na OS; a tela dizia "Biometria" para qualquer um. */
const METODO_DA_ASSINATURA: Record<SSTWorkOrderSignatureMethod, string> = {
  PHYSICAL_MANUAL: 'assinatura manual',
  DIGITAL_BIOMETRIC: 'assinatura eletrônica com biometria facial',
  ELECTRONIC_TOKEN: 'assinatura eletrônica por token'
};

const COR_DA_CATEGORIA: Record<string, string> = {
  'Físico': 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  'Químico': 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  'Biológico': 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  'Ergonômico': 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  'Psicossocial': 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  'Acidentes': 'bg-orange-500/10 text-orange-300 border-orange-500/30'
};

/** "Ausencia de risco" registrada no inventario: nao tem fonte, avaliacao nem medida. */
const ehAusenciaDeRisco = (r: RiscoDaOrdemDeServico) =>
  /^aus[êe]ncia/i.test(r.categoria || '') && !r.fonte && !r.danos && !r.avaliacao && !r.epc && !(r.epis || []).length;

/** Um dado do risco, ou o aviso de que o inventario nao o registra - nunca um texto no lugar. */
const CampoDoRisco: React.FC<{ rotulo: string; valor?: string; vazio: string }> = ({ rotulo, valor, vazio }) => (
  <div>
    <dt className="text-slate-500">{rotulo}</dt>
    <dd className={valor ? 'text-slate-200' : 'text-slate-500 italic'}>{valor || vazio}</dd>
  </div>
);

/** Lista gravada na OS, ou o aviso de que ela esta vazia. */
const ListaDaOS: React.FC<{ itens?: string[]; vazio: string }> = ({ itens, vazio }) => {
  const validos = (itens || []).filter(Boolean);
  return validos.length > 0 ? (
    <ul className="list-disc list-inside text-slate-300 space-y-0.5">
      {validos.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  ) : (
    <p className="text-slate-500 italic">{vazio}</p>
  );
};

/** Data em que a OS foi assinada, no dia de Brasilia. Sem a data, diz isso: a de emissao nao e a da assinatura. */
const diaDaAssinatura = (os: SSTWorkOrderOS) => dataDoRegistro(os.signed_at) || 'data não registrada';

export const WorkOrderOSTab: React.FC<WorkOrderOSTabProps> = ({ selectedClientId }) => {
  const {
    organization,
    clients,
    employees,
    units,
    hierarchySectors,
    hierarchyJobs,
    ghes,
    workOrdersOS,
    addWorkOrderOS,
    updateWorkOrderOS,
    deleteWorkOrderOS,
    generateWorkOrderOSForEmployee,
    generateBatchWorkOrdersOS,
    atualizarOSComOInventario,
    signWorkOrderOS
  } = usePrevSafe();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterGhe, setFilterGhe] = useState<string>('ALL');
  const [filterSignature, setFilterSignature] = useState<string>('ALL');
  const [selectedOSIds, setSelectedOSIds] = useState<string[]>([]);

  // Modals
  const [viewingOS, setViewingOS] = useState<SSTWorkOrderOS | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signingOS, setSigningOS] = useState<SSTWorkOrderOS | null>(null);
  const [signatureMethod, setSignatureMethod] = useState<SSTWorkOrderSignatureMethod>('DIGITAL_BIOMETRIC');
  const [isSimulatingBiometry, setIsSimulatingBiometry] = useState(false);
  const [selectedEmployeeToGenerate, setSelectedEmployeeToGenerate] = useState<string>('');
  // Resultado da ultima atualizacao com o inventario, com a mensagem do
  // contexto. noModal: aparece dentro do modal, e nao sobre a lista.
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string; noModal: boolean } | null>(null);

  const activeClient = clients.find(c => c.id === selectedClientId) || clients[0];
  const clientWorkOrders = workOrdersOS.filter(os => !selectedClientId || os.client_id === selectedClientId);

  const filteredOS = clientWorkOrders.filter(os => {
    const matchesSearch =
      os.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.employee_cpf.includes(searchTerm) ||
      os.os_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.employee_job_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGhe = filterGhe === 'ALL' || os.employee_ghe_name === filterGhe || os.employee_ghe_id === filterGhe;
    const matchesSignature =
      filterSignature === 'ALL' ||
      (filterSignature === 'SIGNED' && os.employee_signed) ||
      (filterSignature === 'PENDING' && !os.employee_signed);
    return matchesSearch && matchesGhe && matchesSignature;
  });

  const totalCount = clientWorkOrders.length;
  const signedCount = clientWorkOrders.filter(o => o.employee_signed).length;
  const pendingCount = totalCount - signedCount;
  const uniqueGhes = Array.from(new Set(clientWorkOrders.map(o => o.employee_ghe_name).filter(Boolean)));
  // So com um cliente escolhido: sem ele, clientWorkOrders traz a OS de todos.
  const naoAssinadasDoCliente = selectedClientId ? clientWorkOrders.filter(o => !o.employee_signed) : [];
  const nomeDoCliente = clients.find(c => c.id === selectedClientId)?.trade_name
    || clients.find(c => c.id === selectedClientId)?.legal_name
    || 'este cliente';

  const handleSelectAll = () => {
    if (selectedOSIds.length === filteredOS.length) {
      setSelectedOSIds([]);
    } else {
      setSelectedOSIds(filteredOS.map(o => o.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedOSIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleGenerateIndividual = () => {
    if (!selectedEmployeeToGenerate) {
      alert('Selecione um funcionário.');
      return;
    }
    try {
      const created = generateWorkOrderOSForEmployee(selectedEmployeeToGenerate);
      setIsCreateModalOpen(false);
      setSelectedEmployeeToGenerate('');
      setViewingOS(created);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar Ordem de Serviço.');
    }
  };

  const handleGenerateAllForClient = () => {
    const clientEmployees = employees.filter(e => !selectedClientId || e.client_id === selectedClientId);
    if (clientEmployees.length === 0) {
      alert('Nenhum colaborador encontrado para esta empresa.');
      return;
    }
    const res = generateBatchWorkOrdersOS(clientEmployees.map(e => e.id));
    alert(`Sucesso! ${res.count} Ordens de Serviço (NR-01) geradas automaticamente com base no PGR e GHE.`);
  };

  const handleExportSelectedPDF = () => {
    const targetOS = selectedOSIds.length > 0
      ? clientWorkOrders.filter(o => selectedOSIds.includes(o.id))
      : filteredOS;

    if (targetOS.length === 0) {
      alert('Nenhuma OS selecionada para exportar.');
      return;
    }

    if (targetOS.length === 1) {
      exportWorkOrderOSPDF(targetOS[0], organization);
    } else {
      exportBatchWorkOrdersOSPDF(targetOS, organization);
    }
  };

  const handleExportExcel = () => {
    const targetOS = selectedOSIds.length > 0
      ? clientWorkOrders.filter(o => selectedOSIds.includes(o.id))
      : filteredOS;
    if (targetOS.length === 0) {
      alert('Nenhuma OS para exportar.');
      return;
    }
    exportWorkOrdersOSExcel(targetOS);
  };

  /**
   * Refaz a OS com o inventario, o plano de acao e o cadastro de hoje
   * (lib/ordemDeServico.ts). A OS assinada nao muda: o trabalhador deu ciencia
   * daquele texto. Sai uma revisao nova, que ele precisa assinar de novo - por
   * isso a confirmacao antes.
   */
  const handleAtualizarComInventario = (os: SSTWorkOrderOS) => {
    if (os.employee_signed) {
      const proxima = String((Number(os.revision) || 1) + 1).padStart(2, '0');
      const ok = confirm(
        `A ${os.os_code} já foi assinada por ${os.employee_name} (${diaDaAssinatura(os)}).\n\n` +
        `O texto assinado não será alterado. Será criada a revisão ${proxima}, com os riscos e as medidas ` +
        `do inventário de hoje, e ela precisará ser assinada de novo pelo trabalhador.\n\n` +
        `Criar a revisão ${proxima}?`
      );
      if (!ok) return;
    }
    const res = atualizarOSComOInventario(os.id);
    setAviso({ tipo: res.ok ? 'ok' : 'erro', texto: res.mensagem, noModal: viewingOS?.id === os.id });
    if (res.ok && res.os) {
      // A OS nao assinada e substituida (id novo): sai da selecao, e o modal
      // aberto passa a mostrar a versao refeita.
      setSelectedOSIds(prev => prev.filter(id => id !== os.id));
      if (viewingOS?.id === os.id) setViewingOS(res.os);
    }
  };

  /** Refaz em lote as OS nao assinadas do cliente, como as geradas vazias pelo gerador antigo. */
  const handleAtualizarNaoAssinadas = () => {
    if (!selectedClientId) {
      alert('Selecione um cliente para atualizar as OS dele.');
      return;
    }
    const alvo = naoAssinadasDoCliente;
    if (alvo.length === 0) {
      setAviso({ tipo: 'ok', texto: `Nenhuma OS não assinada de ${nomeDoCliente} para atualizar.`, noModal: false });
      return;
    }
    const ok = confirm(
      `Atualizar ${alvo.length} OS não assinada(s) de ${nomeDoCliente} com o inventário de riscos, ` +
      `o plano de ação e o cadastro de hoje?\n\n` +
      `O conteúdo atual dessas OS será substituído, com o mesmo código e a mesma revisão. ` +
      `As OS já assinadas não serão alteradas.`
    );
    if (!ok) return;
    let atualizadas = 0;
    let comPendencia = 0;
    const falhas: string[] = [];
    alvo.forEach(os => {
      const res = atualizarOSComOInventario(os.id);
      if (res.ok) {
        atualizadas++;
        if ((res.os?.pendencias?.length || 0) > 0) comPendencia++;
      } else {
        falhas.push(res.mensagem);
      }
    });
    setSelectedOSIds([]);
    setAviso({
      tipo: falhas.length > 0 ? 'erro' : 'ok',
      texto: [
        `${atualizadas} OS atualizada(s) com o inventário.`,
        comPendencia > 0 ? `${comPendencia} delas ainda tem pendência(s) no cadastro: veja o selo na lista e abra a OS para saber o que falta.` : '',
        falhas.length > 0 ? `Não atualizadas (${falhas.length}):\n${falhas.join('\n')}` : ''
      ].filter(Boolean).join('\n'),
      noModal: false
    });
  };

  // Ao fechar o modal, o aviso dado nele passa para a lista, que ja mostra a OS refeita.
  const fecharVisualizacao = () => {
    setViewingOS(null);
    setAviso(a => (a ? { ...a, noModal: false } : a));
  };

  // OS gravada depois de risks_detail existir: o conteudo saiu de lib/ordemDeServico.ts.
  const osComDetalhe = !!viewingOS?.risks_detail;
  const atividadesDaOS = viewingOS
    ? viewingOS.job_description || (viewingOS.routine_activities || []).filter(Boolean).join('; ')
    : '';
  const temPendenciaNaOS = (viewingOS?.pendencias?.length || 0) > 0;
  const estabelecimentoDaOS = viewingOS
    ? [viewingOS.employee_unit, viewingOS.establishment_address].filter(v => v && v !== 'Não informado').join(' - ')
    : '';

  const handleSignConfirm = () => {
    if (!signingOS) return;
    setIsSimulatingBiometry(true);
    setTimeout(() => {
      // Gravava a foto de um banco de imagens como foto da biometria e um hash
      // aleatorio por cima do hash do conteudo: prova de assinatura fabricada.
      // Nao ha captura biometrica aqui; o hash e o do contexto, sobre a OS.
      signWorkOrderOS(signingOS.id, { method: signatureMethod });
      setIsSimulatingBiometry(false);
      setIsSignModalOpen(false);
      setSigningOS(null);
    }, 900);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Ordens de Serviço</p>
            <p className="text-2xl font-black text-slate-100 mt-1">{totalCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">NR-01 item 1.4.1</p>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assinadas / Biometria</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{signedCount}</p>
            <p className="text-[11px] text-emerald-500/80 mt-0.5">
              {totalCount > 0 ? `${((signedCount / totalCount) * 100).toFixed(0)}% com validade jurídica` : '0%'}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pendentes de Assinatura</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</p>
            <p className="text-[11px] text-amber-500/80 mt-0.5">Aguardando termo / coleta</p>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Empresa Selecionada</p>
            <p className="text-sm font-bold text-slate-200 mt-1 truncate max-w-[150px]">
              {activeClient?.trade_name || activeClient?.legal_name || 'Geral'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">CNPJ: {activeClient?.document_number || 'S/N'}</p>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por colaborador, CPF, função ou código OS..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <select
            value={filterGhe}
            onChange={e => setFilterGhe(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todos os GHEs</option>
            {uniqueGhes.map(ghe => (
              <option key={ghe} value={ghe}>{ghe}</option>
            ))}
          </select>

          <select
            value={filterSignature}
            onChange={e => setFilterSignature(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Status Assinatura (Todos)</option>
            <option value="SIGNED">Assinadas ✓</option>
            <option value="PENDING">Pendentes ⏳</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleGenerateAllForClient}
            className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
            title="Gera automaticamente as Ordens de Serviço de todos os funcionários com base nas funções, GHE e riscos do PGR"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Gerar OS em Lote (PGR)
          </button>

          <button
            onClick={handleAtualizarNaoAssinadas}
            disabled={!selectedClientId}
            className="px-3 py-2 bg-sky-600/20 hover:bg-sky-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            title={selectedClientId
              ? 'Refaz as OS ainda não assinadas deste cliente com o inventário de riscos, o plano de ação e o cadastro de hoje. As assinadas não mudam.'
              : 'Selecione um cliente para atualizar as OS dele.'}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar OS não assinadas deste cliente{selectedClientId ? ` (${naoAssinadasDoCliente.length})` : ''}
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova OS
          </button>

          <button
            onClick={handleExportSelectedPDF}
            className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            title="Exportar PDF oficial da(s) OS selecionada(s)"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF {selectedOSIds.length > 0 ? `(${selectedOSIds.length})` : 'Geral'}
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            title="Exportar dados para Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Excel
          </button>
        </div>
      </div>

      {/* Resultado da atualizacao com o inventario */}
      {aviso && !aviso.noModal && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
            aviso.tipo === 'ok'
              ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
              : 'bg-rose-950/30 border-rose-900/50 text-rose-300'
          }`}
        >
          <span className="whitespace-pre-line">{aviso.texto}</span>
          <button onClick={() => setAviso(null)} className="text-slate-400 hover:text-slate-200 shrink-0" title="Fechar aviso">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedOSIds.length === filteredOS.length && filteredOS.length > 0}
                    onChange={handleSelectAll}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                </th>
                <th className="py-3 px-3">Código OS / Emissão</th>
                <th className="py-3 px-3">Colaborador (CPF)</th>
                <th className="py-3 px-3">Função / CBO & Setor</th>
                <th className="py-3 px-3">GHE & Riscos</th>
                <th className="py-3 px-3">EPIs Obrigatórios</th>
                <th className="py-3 px-3">Status Assinatura</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {filteredOS.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">Nenhuma Ordem de Serviço encontrada.</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Clique em &quot;Gerar OS em Lote (PGR)&quot; ou &quot;Nova OS&quot; para emitir ordens de serviço conformes com a NR-01.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOS.map(os => {
                  const isSelected = selectedOSIds.includes(os.id);
                  // OS nova: os riscos do detalhe, menos a linha de "ausencia de
                  // risco". OS antiga: a soma das listas por categoria.
                  const totalRisks = os.risks_detail
                    ? os.risks_detail.filter(r => !ehAusenciaDeRisco(r)).length
                    : (os.physical_risks?.length || 0) +
                      (os.chemical_risks?.length || 0) +
                      (os.biological_risks?.length || 0) +
                      (os.ergonomic_risks?.length || 0) +
                      (os.accident_mechanical_risks?.length || 0);
                  const totalPendencias = os.pendencias?.length || 0;

                  return (
                    <tr
                      key={os.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(os.id)}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-indigo-400">{os.os_code}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatDate(os.issue_date)} (Rev {os.revision})
                        </div>
                        {totalPendencias > 0 && (
                          <button
                            onClick={() => setViewingOS(os)}
                            className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors"
                            title={os.pendencias?.join('\n')}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {totalPendencias} pendência(s)
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-100">{os.employee_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">CPF: {os.employee_cpf}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200">{os.employee_job_title}</div>
                        <div className="text-[11px] text-slate-400">
                          {os.employee_sector} {os.employee_cbo ? `• CBO ${os.employee_cbo}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-semibold mb-1">
                          {os.employee_ghe_name || 'GHE não atribuído'}
                        </span>
                        <div className="text-[11px] text-slate-400">
                          {totalRisks} agente(s) mapeado(s)
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-[11px] text-slate-300 max-w-[160px] truncate" title={os.mandatory_epis?.map(e => `${e.epi_name} (CA ${e.ca_number})`).join(', ')}>
                          {os.mandatory_epis && os.mandatory_epis.length > 0 ? (
                            <span>{os.mandatory_epis.length} EPI(s) com C.A.</span>
                          ) : (
                            <span className="text-slate-500">Nenhum EPI definido</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {os.employee_signed ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Assinado ({diaDaAssinatura(os)})
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSigningOS(os);
                              setIsSignModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors"
                          >
                            <Fingerprint className="w-3 h-3" />
                            Coletar Assinatura
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingOS(os)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Visualizar Detalhes da OS"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => exportWorkOrderOSPDF(os, organization)}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded-lg transition-colors"
                            title="Baixar PDF Oficial NR-01"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleAtualizarComInventario(os)}
                            className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 rounded-lg transition-colors"
                            title={os.employee_signed
                              ? 'Atualizar com o inventário: cria uma revisão nova, a assinar (a assinada não muda)'
                              : 'Atualizar com o inventário'}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Excluir Ordem de Serviço ${os.os_code} de ${os.employee_name}?`)) {
                                deleteWorkOrderOS(os.id);
                              }
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Excluir OS"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* ================= MODAL: VIEW WORK ORDER ================= */}
      {viewingOS && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Ordem de Serviço de Segurança e Saúde (NR-01) - {viewingOS.os_code}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {viewingOS.employee_name} • CPF: {viewingOS.employee_cpf} • {viewingOS.employee_job_title}
                  </p>
                </div>
              </div>
              <button
                onClick={fecharVisualizacao}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
              {aviso?.noModal && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                    aviso.tipo === 'ok'
                      ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-900/50 text-rose-300'
                  }`}
                >
                  <span className="whitespace-pre-line">{aviso.texto}</span>
                  <button onClick={() => setAviso(null)} className="text-slate-400 hover:text-slate-200 shrink-0" title="Fechar aviso">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Pendencias em destaque: a OS nao deve ser entregue assim */}
              {temPendenciaNaOS && (
                <div className="p-4 bg-amber-950/30 border border-amber-600/50 rounded-xl space-y-2">
                  <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Pendências — resolva antes de entregar esta OS ao trabalhador
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-amber-100/90">
                    {viewingOS.pendencias?.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                  <p className="text-[11px] text-amber-400/80">
                    Depois de corrigir o cadastro, use &quot;Atualizar com o inventário&quot; para refazer a OS.
                  </p>
                </div>
              )}

              {/* OS gravada antes de risks_detail: sem o detalhe do inventario nem as pendencias */}
              {!osComDetalhe && (
                <div className="p-3 bg-slate-950/60 border border-slate-700 rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-sky-400" />
                  <span>
                    OS gerada antes da regra atual: não traz o detalhe dos riscos do inventário (fonte, danos,
                    avaliação e medidas) nem a lista de pendências. Use &quot;Atualizar com o inventário&quot; para refazê-la
                    {viewingOS.employee_signed ? ' (como já está assinada, será criada uma revisão nova, a assinar).' : '.'}
                  </span>
                </div>
              )}

              {/* Employer & Employee Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Dados do Empregador</h4>
                  <p><span className="text-slate-400">Empresa:</span> <strong className="text-slate-200">{viewingOS.employer_name || 'Não informado'}</strong></p>
                  <p><span className="text-slate-400">CNPJ:</span> <span className="font-mono text-slate-200">{viewingOS.employer_document || 'Não informado'}</span></p>
                  <p><span className="text-slate-400">CNAE / Grau de Risco:</span> {viewingOS.employer_cnae || 'Não informado'} (Grau {viewingOS.employer_risk_grade || 'não informado'})</p>
                  <p><span className="text-slate-400">Estabelecimento:</span> {estabelecimentoDaOS || 'Não informado'}</p>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Dados do Trabalhador</h4>
                  <p><span className="text-slate-400">Nome:</span> <strong className="text-slate-200">{viewingOS.employee_name}</strong></p>
                  <p><span className="text-slate-400">CPF:</span> <span className="font-mono text-slate-200">{viewingOS.employee_cpf || 'Não informado'}</span></p>
                  <p><span className="text-slate-400">Cargo / CBO:</span> {viewingOS.employee_job_title || 'Não informado'} (CBO: {viewingOS.employee_cbo || 'não informado'})</p>
                  <p><span className="text-slate-400">Setor / GHE:</span> {viewingOS.employee_sector || 'Não informado'} | {viewingOS.employee_ghe_name || 'GHE não atribuído'}</p>
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 text-indigo-400">
                  <Layers className="w-3.5 h-3.5" />
                  1. Atividades do Cargo
                </h4>
                <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg text-slate-300 leading-relaxed">
                  {atividadesDaOS || (
                    <span className="text-slate-500 italic">
                      Não informado{temPendenciaNaOS ? ' (ver as pendências acima)' : ''}.
                    </span>
                  )}
                </div>
              </div>

              {/* Risks Inventory */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 text-indigo-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  2. Riscos Ocupacionais do Inventário (NR-01, 1.4.1, &quot;b&quot;, I e IV)
                </h4>
                {viewingOS.risks_detail ? (
                  viewingOS.risks_detail.length > 0 ? (
                    <div className="space-y-2">
                      {viewingOS.risks_detail.map((r, i) => (
                        <div key={i} className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${COR_DA_CATEGORIA[r.categoria] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                              {r.categoria}
                            </span>
                            <strong className="text-slate-100">{r.agente}</strong>
                          </div>
                          {!ehAusenciaDeRisco(r) && (
                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                              <CampoDoRisco rotulo="Fonte geradora" valor={r.fonte} vazio="Não registrada no inventário" />
                              <CampoDoRisco rotulo="Possíveis danos" valor={r.danos} vazio="Não registrados no inventário" />
                              <CampoDoRisco rotulo="Avaliação ambiental" valor={r.avaliacao} vazio="Não registrada no inventário" />
                              <CampoDoRisco
                                rotulo="Medidas de proteção (EPC/EPI)"
                                valor={[r.epc ? `EPC: ${r.epc}` : '', r.epis?.length ? `EPI: ${r.epis.join('; ')}` : ''].filter(Boolean).join(' • ')}
                                vazio="Nenhuma registrada no inventário"
                              />
                            </dl>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg text-slate-500 italic">
                      Nenhum risco do inventário nesta OS{temPendenciaNaOS ? ' (ver as pendências acima)' : ''}.
                    </p>
                  )
                ) : (
                  // OS antiga: as listas por categoria, como foram gravadas.
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                      <p className="font-bold text-blue-400 mb-1">Riscos Físicos:</p>
                      <ListaDaOS itens={viewingOS.physical_risks} vazio="Nenhum registrado nesta OS." />
                    </div>
                    <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                      <p className="font-bold text-rose-400 mb-1">Riscos Químicos & Biológicos:</p>
                      <ListaDaOS itens={[...(viewingOS.chemical_risks || []), ...(viewingOS.biological_risks || [])]} vazio="Nenhum registrado nesta OS." />
                    </div>
                    <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                      <p className="font-bold text-amber-400 mb-1">Riscos Ergonômicos:</p>
                      <ListaDaOS itens={viewingOS.ergonomic_risks} vazio="Nenhum registrado nesta OS." />
                    </div>
                    <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                      <p className="font-bold text-orange-400 mb-1">Riscos de Acidentes / Mecânicos:</p>
                      <ListaDaOS itens={viewingOS.accident_mechanical_risks} vazio="Nenhum registrado nesta OS." />
                    </div>
                  </div>
                )}
              </div>

              {/* Medidas de prevencao adotadas: EPC, medidas administrativas e EPI */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 text-indigo-400">
                  <HardHat className="w-3.5 h-3.5" />
                  3. Medidas de Prevenção Adotadas (NR-01, 1.4.1, &quot;b&quot;, II)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                    <p className="font-bold text-sky-400 mb-1">Proteção coletiva (EPC)</p>
                    <ListaDaOS
                      itens={viewingOS.collective_protections_epc}
                      vazio={osComDetalhe
                        ? 'Nenhuma medida de proteção coletiva implantada no inventário ou concluída no plano de ação.'
                        : 'Nenhuma registrada nesta OS.'}
                    />
                  </div>
                  <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                    {/* Na OS antiga eram boas praticas genericas, nao medidas adotadas */}
                    <p className="font-bold text-sky-400 mb-1">
                      {osComDetalhe ? 'Medidas administrativas e de organização do trabalho' : 'Procedimentos registrados nesta OS'}
                    </p>
                    <ListaDaOS
                      itens={viewingOS.safe_work_procedures}
                      vazio={osComDetalhe ? 'Nenhuma medida administrativa concluída no plano de ação.' : 'Não informado.'}
                    />
                  </div>
                </div>
                <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                  <p className="font-bold text-sky-400 mb-1">Proteção individual (EPI, NR-06)</p>
                  {viewingOS.mandatory_epis && viewingOS.mandatory_epis.length > 0 ? (
                    <div className="divide-y divide-slate-800">
                      {viewingOS.mandatory_epis.map((epi, idx) => (
                        <div key={idx} className="py-2 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <strong className="text-slate-200">{epi.epi_name}</strong>
                            <span className="ml-2 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-mono">
                              CA {epi.ca_number || 'não informado'}
                            </span>
                          </div>
                          {epi.usage_recommendation && (
                            <span className="text-slate-400 text-[11px]">{epi.usage_recommendation}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">
                      {osComDetalhe ? 'Nenhum EPI definido no inventário de riscos.' : 'Nenhum EPI registrado nesta OS.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Emergencia: os procedimentos do estabelecimento */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 text-indigo-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  4. Em Caso de Acidente ou Emergência (NR-01, 1.4.1, &quot;e&quot;)
                </h4>
                <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-lg">
                  <ListaDaOS
                    itens={viewingOS.emergency_accident_conduct}
                    vazio={temPendenciaNaOS ? 'Não informado (ver as pendências acima).' : 'Não informado.'}
                  />
                </div>
              </div>

              {/* Obrigacoes e, so quando houver, proibicoes do posto */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 text-indigo-400">
                  <UserCheck className="w-3.5 h-3.5" />
                  5. Obrigações do Trabalhador
                </h4>
                <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                  <ListaDaOS itens={viewingOS.mandatory_employee_obligations} vazio="Não informado." />
                </div>
                {(viewingOS.prohibitions_unsafe_acts?.length || 0) > 0 && (
                  <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg">
                    <p className="font-bold text-rose-300 mb-1">Proibições expressas e atos inseguros:</p>
                    <ListaDaOS itens={viewingOS.prohibitions_unsafe_acts} vazio="" />
                  </div>
                )}
              </div>

              {/* Ato faltoso: o texto gravado na OS */}
              {viewingOS.disciplinary_sanctions_text && (
                <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg text-rose-300">
                  <p className="font-bold mb-1">Ato faltoso (CLT, art. 158):</p>
                  <p className="text-[11px] leading-relaxed">{viewingOS.disciplinary_sanctions_text}</p>
                </div>
              )}

              {/* Legal Framework & Signatures */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-slate-400 text-[11px]">Amparo Legal:</p>
                  <p className="font-semibold text-slate-200 text-[11px]">{viewingOS.legal_framework || 'Não informado'}</p>
                </div>
                <div className="text-right">
                  {viewingOS.employee_signed ? (
                    <>
                      <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Assinado em {diaDaAssinatura(viewingOS)}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {METODO_DA_ASSINATURA[viewingOS.signature_method] || 'método não registrado'}
                      </p>
                    </>
                  ) : (
                    <div className="text-amber-400 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Assinatura Pendente
                    </div>
                  )}
                  {viewingOS.signature_hash && (
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-[240px]">
                      Hash: {viewingOS.signature_hash}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={fecharVisualizacao}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => handleAtualizarComInventario(viewingOS)}
                  className="px-4 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  title={viewingOS.employee_signed
                    ? 'A OS assinada não muda: será criada uma revisão nova, a assinar'
                    : 'Refaz esta OS com o inventário de riscos, o plano de ação e o cadastro de hoje'}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar com o inventário
                </button>

                {!viewingOS.employee_signed && (
                  <button
                    onClick={() => {
                      setSigningOS(viewingOS);
                      setIsSignModalOpen(true);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    Coletar Assinatura / Biometria
                  </button>
                )}

                <button
                  onClick={() => exportWorkOrderOSPDF(viewingOS, organization)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir PDF Oficial
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE / GENERATE SINGLE OS ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-[32rem] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Gerar Nova Ordem de Serviço (NR-01)
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Selecione o Colaborador:</label>
                <select
                  value={selectedEmployeeToGenerate}
                  onChange={e => setSelectedEmployeeToGenerate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Selecione um colaborador --</option>
                  {employees
                    .filter(e => !selectedClientId || e.client_id === selectedClientId)
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} (CPF: {emp.cpf}) - {emp.job_title} ({emp.sector_name})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  O sistema irá cruzar automaticamente o GHE do colaborador com os riscos mapeados no PGR e a relação de EPIs.
                </p>
              </div>

              <div className="p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-xl text-indigo-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  Conteúdo da OS (NR-01, 1.4.1, &quot;c&quot;)
                </div>
                {/* O texto antigo prometia "proibicoes do Art. 158" e diretrizes de emergencia que eram fixas; hoje tudo sai do cadastro. */}
                <p className="text-[11px] text-indigo-200/80">
                  A OS traz os riscos do inventário do GHE do trabalhador, as medidas de prevenção adotadas, os procedimentos
                  de emergência do estabelecimento e as obrigações do trabalhador (NR-01, 1.4.2). O que faltar no cadastro
                  aparece como pendência, e não como texto padrão.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateIndividual}
                disabled={!selectedEmployeeToGenerate}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Gerar Ordem de Serviço
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: COLLECT SIGNATURE / BIOMETRICS ================= */}
      {isSignModalOpen && signingOS && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-[28rem] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-emerald-400" />
                Coleta de Assinatura - {signingOS.os_code}
              </h3>
              <button
                onClick={() => {
                  setIsSignModalOpen(false);
                  setSigningOS(null);
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <p className="text-slate-400 text-[11px]">Colaborador:</p>
                <p className="font-bold text-slate-100 text-sm">{signingOS.employee_name}</p>
                <p className="font-mono text-slate-400 text-xs">CPF: {signingOS.employee_cpf}</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Método de Assinatura Legal:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignatureMethod('DIGITAL_BIOMETRIC')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      signatureMethod === 'DIGITAL_BIOMETRIC'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Camera className="w-4 h-4 mb-1.5" />
                    Biometria Facial (IA)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignatureMethod('PHYSICAL_MANUAL')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      signatureMethod === 'PHYSICAL_MANUAL'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 mb-1.5" />
                    Assinatura Manual
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                Ao confirmar, o sistema registrará data, hora e hash SHA-256 de integridade criptográfica conforme a Portaria MTP nº 672/2021.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsSignModalOpen(false);
                  setSigningOS(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>

              <button
                onClick={handleSignConfirm}
                disabled={isSimulatingBiometry}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {isSimulatingBiometry ? (
                  <>Validando Biometria...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Registrar Assinatura
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const WorkOrdersOSTab = WorkOrderOSTab;
