'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { SSTWorkOrderOS } from '@/types';
import { 
  FileCheck2, 
  Plus, 
  Search, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  Eye, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  HardHat, 
  Layers, 
  Sparkles, 
  Users, 
  Building2, 
  ScrollText,
  FileSignature
} from 'lucide-react';
import { 
  exportWorkOrderOSPDF, 
  exportBatchWorkOrdersOSPDF, 
  exportWorkOrdersOSExcel 
} from '@/lib/pdfExportService';

interface WorkOrdersOSTabProps {
  selectedClientId: string;
}

export const WorkOrdersOSTab: React.FC<WorkOrdersOSTabProps> = ({ selectedClientId }) => {
  const {
    clients,
    employees,
    workOrdersOS,
    addWorkOrderOS,
    updateWorkOrderOS,
    deleteWorkOrderOS,
    generateWorkOrderForEmployee,
    generateBatchWorkOrders
  } = usePrevSafe();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSignature, setFilterSignature] = useState<string>('ALL');
  const [selectedOSForView, setSelectedOSForView] = useState<SSTWorkOrderOS | null>(null);
  const [selectedOSIds, setSelectedOSIds] = useState<string[]>([]);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);

  const selectedClient = clients.find(c => c.id === selectedClientId) || clients[0];
  const clientEmployees = employees.filter(e => !selectedClientId || e.client_id === selectedClientId);
  const clientWorkOrders = workOrdersOS.filter(os => !selectedClientId || os.client_id === selectedClientId);

  const filteredWorkOrders = clientWorkOrders.filter(os => {
    if (filterSignature !== 'ALL' && os.signature_status !== filterSignature) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        os.employee_name.toLowerCase().includes(q) ||
        os.employee_cpf.includes(q) ||
        os.os_code.toLowerCase().includes(q) ||
        os.job_title.toLowerCase().includes(q) ||
        os.sector_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handle Mass Generation of OS for all or missing employees
  const handleGenerateAllMissingOS = () => {
    setIsGeneratingBatch(true);
    const existingEmployeeIdsWithOS = new Set(clientWorkOrders.map(os => os.employee_id));
    const targetEmployees = clientEmployees.filter(e => !existingEmployeeIdsWithOS.has(e.id));

    if (targetEmployees.length === 0) {
      // If everyone has OS, regenerate for all
      generateBatchWorkOrders(clientEmployees.map(e => e.id));
    } else {
      generateBatchWorkOrders(targetEmployees.map(e => e.id));
    }
    setIsGeneratingBatch(false);
  };

  // Select all checkboxes
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOSIds(filteredWorkOrders.map(os => os.id));
    } else {
      setSelectedOSIds([]);
    }
  };

  // Handle batch PDF export
  const handleExportSelectedBatchPDF = () => {
    const selectedOrders = clientWorkOrders.filter(os => selectedOSIds.includes(os.id));
    if (selectedOrders.length === 0) {
      exportBatchWorkOrdersOSPDF(clientWorkOrders, selectedClient || clients[0]);
    } else {
      exportBatchWorkOrdersOSPDF(selectedOrders, selectedClient || clients[0]);
    }
  };

  // Handle Excel export
  const handleExportExcel = () => {
    const selectedOrders = selectedOSIds.length > 0
      ? clientWorkOrders.filter(os => selectedOSIds.includes(os.id))
      : clientWorkOrders;
    exportWorkOrdersOSExcel(selectedOrders, selectedClient?.trade_name || 'Empresa');
  };

  return (
    <div className="space-y-6" id="work-orders-os-tab">
      {/* Top Bar Actions & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="os-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por colaborador, CPF, OS ou cargo..."
              className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 w-72"
            />
          </div>

          <select
            value={filterSignature}
            onChange={(e) => setFilterSignature(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">Todos os Status de Assinatura</option>
            <option value="SIGNED_ELECTRONIC">Assinado Eletronicamente</option>
            <option value="SIGNED_PHYSICAL">Assinado Físico</option>
            <option value="PENDING">Pendente de Assinatura</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-slate-700"
            title="Exportar planilha Excel de Ordens de Serviço"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Exportar Excel
          </button>

          <button
            type="button"
            onClick={handleExportSelectedBatchPDF}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-teal-500/30 shadow-sm"
            title="Exportar PDF em lote de todas as Ordens de Serviço"
          >
            <Download className="w-3.5 h-3.5" />
            {selectedOSIds.length > 0 ? `Exportar ${selectedOSIds.length} OSs (PDF)` : 'Exportar Lote PDF'}
          </button>

          <button
            type="button"
            id="generate-mass-os-btn"
            onClick={handleGenerateAllMissingOS}
            disabled={isGeneratingBatch}
            className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Gerar OS em Massa (NR-01)
          </button>
        </div>
      </div>

      {/* Regulatory Context Banner */}
      <div className="bg-slate-900/60 border border-teal-500/20 rounded-xl p-4 flex items-start gap-3">
        <ScrollText className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-slate-100 flex items-center gap-2">
            <span>Base Legal: Norma Regulamentadora NR-01 (item 1.4.1) e Artigos 157 e 158 da CLT:</span>
            <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 text-[10px] rounded font-mono">
              Obrigação Patronal
            </span>
          </p>
          <p className="text-slate-400">
            Cabe ao empregador informar aos trabalhadores os riscos ocupacionais existentes nos locais de trabalho, as medidas de prevenção adotadas, os resultados dos exames médicos e os procedimentos de emergência. A inobservância das instruções emitidas constitui ato faltoso do empregado.
          </p>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg" id="work-orders-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={filteredWorkOrders.length > 0 && selectedOSIds.length === filteredWorkOrders.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-700 text-teal-500 focus:ring-teal-500"
                  />
                </th>
                <th className="py-3 px-4">Código OS / Versão</th>
                <th className="py-3 px-4">Colaborador / CPF</th>
                <th className="py-3 px-4">Cargo / Setor</th>
                <th className="py-3 px-4">Riscos Identificados</th>
                <th className="py-3 px-4">EPIs Obrigatórios</th>
                <th className="py-3 px-4 text-center">Assinatura / Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredWorkOrders.map((os) => {
                const isSelected = selectedOSIds.includes(os.id);

                return (
                  <tr key={os.id} className={`hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-teal-500/5' : ''}`}>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOSIds(prev => [...prev, os.id]);
                          } else {
                            setSelectedOSIds(prev => prev.filter(id => id !== os.id));
                          }
                        }}
                        className="rounded border-slate-700 text-teal-500 focus:ring-teal-500"
                      />
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-teal-300">{os.os_code}</div>
                      <div className="text-[10px] text-slate-500">v.{os.version} • {os.created_at.split('T')[0]}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-100">{os.employee_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">CPF: {os.employee_cpf} • Matr: {os.employee_registration}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-semibold">{os.job_title}</div>
                      <div className="text-[10px] text-slate-400">{os.sector_name} (CBO {os.cbo})</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded text-[10px] font-medium">
                        {os.occupational_risks.length} riscos mapeados
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded text-[10px] font-medium">
                        {os.mandatory_epis.length} EPIs normativos
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        os.signature_status === 'SIGNED_ELECTRONIC' || os.signature_status === 'SIGNED_PHYSICAL'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {os.signature_status === 'SIGNED_ELECTRONIC' ? 'Assinatura Digital' : os.signature_status === 'SIGNED_PHYSICAL' ? 'Assinado Físico' : 'Pendente de Assinatura'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedOSForView(os)}
                          className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors"
                          title="Visualizar Ordem de Serviço Completa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => exportWorkOrderOSPDF(os, selectedClient || clients[0])}
                          className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors"
                          title="Exportar OS em PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            exportWorkOrderOSPDF(os, selectedClient || clients[0]);
                            window.print();
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                          title="Imprimir Ordem de Serviço"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteWorkOrderOS(os.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                          title="Excluir OS"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredWorkOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    Nenhuma Ordem de Serviço encontrada. Clique em "Gerar OS em Massa" para gerar automaticamente para todos os trabalhadores com base em seus cargos e GHEs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Work Order Modal */}
      {selectedOSForView && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Ordem de Serviço de Segurança do Trabalho (NR-01 / Art. 157 CLT)
                  </h3>
                  <p className="text-xs font-mono text-teal-400 font-semibold">
                    {selectedOSForView.os_code} • {selectedOSForView.employee_name} ({selectedOSForView.job_title})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportWorkOrderOSPDF(selectedOSForView, selectedClient || clients[0])}
                  className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportWorkOrderOSPDF(selectedOSForView, selectedClient || clients[0]);
                    window.print();
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg flex items-center gap-1.5 border border-slate-700"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOSForView(null)}
                  className="text-slate-400 hover:text-slate-200 text-base font-bold p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* OS Content Preview */}
            <div className="space-y-4 text-xs">
              {/* Header Details */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Colaborador</span>
                  <span className="font-bold text-slate-100">{selectedOSForView.employee_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">CPF / Matrícula</span>
                  <span className="font-mono text-slate-200">{selectedOSForView.employee_cpf} • {selectedOSForView.employee_registration}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Cargo & CBO</span>
                  <span className="text-slate-200">{selectedOSForView.job_title} ({selectedOSForView.cbo})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Setor / GHE</span>
                  <span className="text-slate-200">{selectedOSForView.sector_name} • {selectedOSForView.ghe_name}</span>
                </div>
              </div>

              {/* 1. Activities */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 inline-flex items-center justify-center text-[10px]">1</span>
                  Descrição das Atividades e Funções do Cargo:
                </h4>
                <ul className="list-disc list-inside bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-slate-400 space-y-1 text-[11px]">
                  {selectedOSForView.activities_description.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>

              {/* 2. Risks */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 inline-flex items-center justify-center text-[10px]">2</span>
                  Inventário de Riscos Ocupacionais (PGR / NR-01):
                </h4>
                <div className="bg-slate-950 rounded-lg border border-slate-800/80 overflow-hidden">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[9px] border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Grupo / Categoria</th>
                        <th className="py-2 px-3">Agente Nocivo</th>
                        <th className="py-2 px-3">Fonte Geradora</th>
                        <th className="py-2 px-3">Possíveis Danos à Saúde</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedOSForView.occupational_risks.map((risk, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3 font-semibold text-teal-400">{risk.category}</td>
                          <td className="py-2 px-3 text-slate-200">{risk.agent}</td>
                          <td className="py-2 px-3 text-slate-400">{risk.source}</td>
                          <td className="py-2 px-3 text-slate-400">{risk.possible_harm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Mandatory EPIs */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 inline-flex items-center justify-center text-[10px]">3</span>
                  Equipamentos de Proteção Individual (EPI) Obrigatórios:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedOSForView.mandatory_epis.map((epi, i) => (
                    <div key={i} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 flex items-start gap-2">
                      <HardHat className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-200 text-[11px]">{epi.name}</div>
                        <div className="text-[10px] text-teal-400 font-mono">CA: {epi.ca}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{epi.instructions}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Preventive Measures & Prohibitions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 inline-flex items-center justify-center text-[10px]">4</span>
                    Medidas Preventivas:
                  </h4>
                  <ul className="list-disc list-inside bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-slate-400 space-y-1 text-[11px]">
                    {selectedOSForView.preventive_measures.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 inline-flex items-center justify-center text-[10px]">5</span>
                    Proibições e Atos Inseguros:
                  </h4>
                  <ul className="list-disc list-inside bg-slate-950 p-3 rounded-lg border border-rose-500/20 text-slate-400 space-y-1 text-[11px]">
                    {selectedOSForView.prohibitions.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Legal Declaration */}
              <div className="p-3 bg-slate-950 rounded-xl border border-teal-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-300 text-xs flex items-center gap-1.5">
                    <FileSignature className="w-4 h-4" />
                    Declaração de Ciência e Termo de Compromisso (Art. 158 CLT):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      updateWorkOrderOS(selectedOSForView.id, {
                        signature_status: 'SIGNED_ELECTRONIC',
                        signed_at: new Date().toISOString()
                      });
                      setSelectedOSForView({
                        ...selectedOSForView,
                        signature_status: 'SIGNED_ELECTRONIC',
                        signed_at: new Date().toISOString()
                      });
                    }}
                    className="px-2.5 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 text-[10px] font-bold rounded"
                  >
                    Assinar Digitalmente
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  "Declaro que recebi cópia desta Ordem de Serviço, fui devidamente orientado e treinado sobre os riscos de minhas atividades e me comprometo a cumprir integralmente todas as normas de segurança e medicina do trabalho, sob pena de incorrer em ato faltoso nos termos da legislação vigente."
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedOSForView(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
