'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  FileCode2, 
  FileText, 
  Download, 
  Copy, 
  Check, 
  ShieldCheck, 
  Layers, 
  Send, 
  CheckCircle2, 
  Building2, 
  Sparkles,
  Printer,
  Eye,
  FileCheck,
  Stethoscope,
  ShieldAlert,
  Info,
  Flame,
  AlertTriangle,
  Tractor,
  FileSpreadsheet
} from 'lucide-react';
import {
  exportPGRDocumentPdf,
  exportPGRTRDocumentPdf,
  exportPCMSODocumentPdf,
  exportLTCATDocumentPdf,
  exportInsalubridadeLaudoPdf,
  exportPericulosidadeLaudoPdf
} from '@/lib/pdfExportService';
import { DocumentPreviewModal, PreviewDocType } from '@/lib/../components/sst/DocumentPreviewModal';
import { montarCorpoInsalubridade, montarCorpoPericulosidade } from '@/lib/laudoDados';

interface TechnicalDocsGeneratorTabProps {
  selectedClientId: string;
}

export const TechnicalDocsGeneratorTab: React.FC<TechnicalDocsGeneratorTabProps> = ({ selectedClientId }) => {
  const {
    organization,
    clients,
    units,
    hierarchySectors,
    hierarchyJobs,
    ghes,
    environmentalRisks,
    examProtocols,
    employees,
    catRecords,
    workAbsences,
    esocialEvents,
    generateESocialXmlPreview,
    transmitESocialEvent
  } = usePrevSafe();


  const [activeDocType, setActiveDocType] = useState<'PGR' | 'PGRTR' | 'PCMSO' | 'LTCAT' | 'INSALUBRIDADE' | 'PERICULOSIDADE' | 'XML_ESOCIAL'>('PGR');
  const [selectedXmlEventId, setSelectedXmlEventId] = useState<string>(esocialEvents[0]?.id || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDocType, setPreviewDocType] = useState<PreviewDocType>('PGR');

  const clientObj = clients.find(c => c.id === selectedClientId) || clients[0];
  const clientUnits = units.filter(u => !selectedClientId || u.client_id === selectedClientId);
  const clientSectors = hierarchySectors.filter(s => !selectedClientId || s.client_id === selectedClientId);
  const clientJobs = hierarchyJobs.filter(j => !selectedClientId || j.client_id === selectedClientId);
  const clientGhes = ghes.filter(g => !selectedClientId || g.client_id === selectedClientId);
  const clientRisks = environmentalRisks.filter(r => clientGhes.some(g => g.id === r.ghe_id));

  // As tabelas de enquadramento dos laudos vinham escritas no codigo, com
  // medicoes ("Encontrado: 83.5 dBA") e conclusoes periciais
  // ("INSALUBRE GRAU MÁXIMO (40% - Súmula 448 TST)") que nao saiam de
  // avaliacao nenhuma. Agora vem do inventario, pela mesma funcao do PDF.
  const corpoInsalubridade = montarCorpoInsalubridade(clientRisks, clientGhes);
  const corpoPericulosidade = montarCorpoPericulosidade(clientRisks, clientGhes);
  const clientEmployees = employees.filter(e => !selectedClientId || e.client_id === selectedClientId);

  // Mesma fonte de verdade do preview/PDF: Configurações > Responsabilidade Técnica.
  const NAO_INFORMADO = 'Não informado nas Configurações';
  const rtName = organization?.technical_responsible_name || NAO_INFORMADO;
  const rtCouncil = organization?.technical_responsible_council || '';
  const rtArt = organization?.technical_responsible_art || '';
  const pcmsoName = organization?.pcmso_physician_name || NAO_INFORMADO;
  const pcmsoCrm = organization?.pcmso_physician_crm || '';
  const pcmsoRqe = organization?.pcmso_physician_rqe || '';
  const rtWithCouncil = rtCouncil ? `${rtName} (${rtCouncil})` : rtName;

  // Plano de ação 5W2H derivado do inventário real de riscos: entra no plano todo risco
  // alto/crítico ou com controle coletivo ausente/ineficaz. Sem riscos cadastrados, o
  // quadro fica vazio em vez de exibir ações fictícias.
  const actionPlanRows = clientRisks
    .filter(r =>
      r.risk_level === 'ALTO' ||
      // 'CRITICO' e o rotulo antigo; o modelo usa 'MUITO_ALTO'. Os dois
      // aparecem porque ha riscos gravados antes da mudanca.
      r.risk_level === 'MUITO_ALTO' ||
      r.risk_level === 'CRITICO' ||
      !r.epc_implemented ||
      !r.epc_effective
    )
    .map(r => {
      const ghe = clientGhes.find(g => g.id === r.ghe_id);
      const isCritical = r.risk_level === 'MUITO_ALTO' || r.risk_level === 'CRITICO' || r.risk_level === 'ALTO';
      return {
        id: r.id,
        action: !r.epc_implemented
          ? `Implantar medida de controle coletivo para ${r.agent_name}`
          : !r.epc_effective
            ? `Revisar eficácia do controle coletivo de ${r.agent_name}`
            : `Reavaliar exposição e controles de ${r.agent_name}`,
        target: ghe?.name || 'GHE não vinculado',
        deadline: isCritical ? 'Imediato (risco alto/crítico)' : 'Próximo ciclo anual',
        statusLabel: r.epc_implemented && r.epc_effective ? 'Em monitoramento' : 'Pendente',
        isPending: !(r.epc_implemented && r.epc_effective)
      };
    });

  const selectedEvent = esocialEvents.find(e => e.id === selectedXmlEventId) || esocialEvents[0];
  const xmlPayload = selectedEvent ? (selectedEvent.xml_content || generateESocialXmlPreview(selectedEvent)) : '<esocial>Nenhum evento selecionado</esocial>';

  const handleCopyXml = () => {
    navigator.clipboard.writeText(xmlPayload);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadXml = () => {
    if (!selectedEvent) return;
    const blob = new Blob([xmlPayload], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedEvent.event_type}_${selectedEvent.worker_cpf.replace(/\D/g, '')}_${selectedEvent.event_number}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessToast(`XML ${selectedEvent.event_type} baixado com sucesso!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleTransmitSelectedEvent = () => {
    if (!selectedEvent) return;
    transmitESocialEvent(selectedEvent.id);
    setSuccessToast(`Evento ${selectedEvent.event_type} (${selectedEvent.event_number}) assinado com certificado A1 e transmitido ao eSocial!`);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const handlePrintDoc = () => {
    window.print();
  };

  const handleDownloadActivePdf = () => {
    if (!clientObj) return;

    if (activeDocType === 'PGR') {
      exportPGRDocumentPdf({
        client: clientObj,
        organization,
        ghes: clientGhes,
        risks: environmentalRisks,
        employees: clientEmployees,
        sectors: clientSectors,
        units: clientUnits
      });
      setSuccessToast('PDF do PGR (NR-01) gerado com sucesso!');
    } else if (activeDocType === 'PGRTR') {
      exportPGRTRDocumentPdf({
        client: clientObj,
        organization,
        ghes: clientGhes,
        risks: environmentalRisks,
        employees: clientEmployees
      });
      setSuccessToast('PDF do PGRTR (NR-31 Rural) gerado com sucesso!');
    } else if (activeDocType === 'PCMSO') {
      exportPCMSODocumentPdf({
        client: clientObj,
        organization,
        examProtocols,
        ghes: clientGhes,
        employees: clientEmployees
      });
      setSuccessToast('PDF do PCMSO (NR-07) gerado com sucesso!');
    } else if (activeDocType === 'LTCAT') {
      exportLTCATDocumentPdf({
        client: clientObj,
        organization,
        risks: environmentalRisks,
        ghes: clientGhes,
        employees: clientEmployees
      });
      setSuccessToast('PDF do LTCAT Previdenciário (INSS) gerado com sucesso!');
    } else if (activeDocType === 'INSALUBRIDADE') {
      exportInsalubridadeLaudoPdf({
        client: clientObj,
        organization,
        risks: environmentalRisks,
        ghes: clientGhes,
        employees: clientEmployees
      });
      setSuccessToast('PDF do Laudo de Insalubridade (NR-15) gerado com sucesso!');
    } else if (activeDocType === 'PERICULOSIDADE') {
      exportPericulosidadeLaudoPdf({
        client: clientObj,
        organization,
        risks: environmentalRisks,
        ghes: clientGhes,
        employees: clientEmployees
      });
      setSuccessToast('PDF do Laudo de Periculosidade (NR-16) gerado com sucesso!');
    }
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="space-y-6" id="technical-docs-tab-container">
      {/* Top Banner Alert */}
      {successToast && (
        <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center justify-between text-xs text-teal-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <span className="text-[11px] bg-teal-500 text-slate-950 font-bold px-2 py-1 rounded">Processado</span>
        </div>
      )}

      {/* Document Selector Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            id="doc-pgr-btn"
            onClick={() => setActiveDocType('PGR')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeDocType === 'PGR'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            1. PGR (NR-01)
          </button>

          <button
            type="button"
            id="doc-pgrtr-btn"
            onClick={() => setActiveDocType('PGRTR')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeDocType === 'PGRTR'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Tractor className="w-4 h-4" />
            2. PGRTR Rural (NR-31)
          </button>

          <button
            type="button"
            id="doc-pcmso-btn"
            onClick={() => setActiveDocType('PCMSO')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeDocType === 'PCMSO'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            3. PCMSO (NR-07)
          </button>

          <button
            type="button"
            id="doc-ltcat-btn"
            onClick={() => setActiveDocType('LTCAT')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeDocType === 'LTCAT'
                ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            4. LTCAT (INSS)
          </button>

          <button
            type="button"
            id="doc-insalubridade-btn"
            onClick={() => setActiveDocType('INSALUBRIDADE')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeDocType === 'INSALUBRIDADE'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            5. Laudo Insalubridade (NR-15)
          </button>

          <button
            type="button"
            id="doc-periculosidade-btn"
            onClick={() => setActiveDocType('PERICULOSIDADE')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeDocType === 'PERICULOSIDADE'
                ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Flame className="w-4 h-4" />
            6. Laudo Periculosidade (NR-16)
          </button>

          <button
            type="button"
            id="doc-xml-btn"
            onClick={() => setActiveDocType('XML_ESOCIAL')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeDocType === 'XML_ESOCIAL'
                ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            7. XMLs eSocial (MOS)
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeDocType !== 'XML_ESOCIAL' && (
            <>
              <button
                type="button"
                id="btn-preview-modal-open"
                onClick={() => {
                  setPreviewDocType(activeDocType as PreviewDocType);
                  setIsPreviewModalOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-teal-500/30 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                title="Abrir Pré-visualização Dinâmica do Laudo em formato Folha A4 com zoom e validação técnica"
              >
                <Eye className="w-4 h-4" />
                Pré-visualizar Documento
              </button>

              <button
                type="button"
                id="btn-download-pdf-doc"
                onClick={handleDownloadActivePdf}
                className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-teal-500/20"
                title="Baixar Laudo Técnico Completo em PDF formatado conforme Normas Regulamentadoras"
              >
                <Download className="w-4 h-4" />
                Baixar Laudo em PDF
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handlePrintDoc}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
            title="Imprimir visualização formatada"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Info Banner for eSocial technical compliance */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-slate-100">
            Geração Automatizada com Alimentação Cruzada e Laudos Técnicos Completos:
          </p>
          <p className="text-slate-400">
            Todos os documentos (<strong>PGR, PGRTR, PCMSO, LTCAT, Laudo de Insalubridade NR-15, Laudo de Periculosidade NR-16, Kit Admissional e XMLs do eSocial</strong>) são gerados em tempo real a partir do preenchimento da hierarquia, dos inventários de riscos por GHE, exames e dados cadastrais, garantindo 100% de consistência técnica, jurídica e fiscal.
          </p>
        </div>
      </div>

      {/* VIEW 1: PGR (NR-01) */}
      {activeDocType === 'PGR' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl" id="pgr-doc-view">
          {/* Header */}
          <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
            <div>
              <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 text-xs font-bold rounded">
                PROGRAMA DE GERENCIAMENTO DE RISCOS (PGR - NR-01)
              </span>
              <h2 className="text-lg font-bold text-slate-100 mt-2">
                Inventário Geral de Riscos Ocupacionais & Plano de Ação (GRO / PGR)
              </h2>
              <p className="text-xs text-slate-400">
                Empresa: <strong className="text-slate-200">{clientObj?.trade_name || clientObj?.legal_name || 'Empresa Cliente'}</strong> • CNPJ: <span className="font-mono">{clientObj?.document_number || 'Não informado'}</span>
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-1">
              <div>Vigência: <span className="text-teal-400 font-semibold">2026 / 2027</span></div>
              <div>Grau de Risco: <span className="text-slate-200 font-bold">
                {clientObj?.risk_degree ? `${clientObj.risk_degree} (NR-04)` : 'não classificado'}
              </span></div>
              <div>CNAE: <span className="text-slate-200 font-mono">{clientObj?.main_cnae || 'não informado'}</span></div>
            </div>
          </div>

          {/* Section 1: Units and Hierarchy */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              1. Estrutura Organizacional & Estabelecimentos Avaliados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 font-semibold block text-[10px]">Unidades Operacionais:</span>
                <span className="font-bold text-slate-100">{clientUnits.length} estabelecimentos</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 font-semibold block text-[10px]">Setores & Postos de Trabalho:</span>
                <span className="font-bold text-slate-100">{clientSectors.length} setores ({clientJobs.length} cargos CBO)</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 font-semibold block text-[10px]">População Exposta:</span>
                <span className="font-bold text-teal-400">{clientEmployees.length} colaboradores ativos</span>
              </div>
            </div>
          </div>

          {/* Section 2: Risk Inventory by GHE */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-teal-400" />
              2. Inventário de Riscos Ocupacionais por GHE (Grupos Homogêneos)
            </h3>

            {clientGhes.map((ghe) => {
              const risks = environmentalRisks.filter(r => r.ghe_id === ghe.id);
              const gheEmps = clientEmployees.filter(e => e.ghe_id === ghe.id);

              return (
                <div key={ghe.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-teal-400">{ghe.code}</span>
                      <h4 className="font-bold text-slate-100 text-sm">{ghe.name}</h4>
                      <p className="text-[11px] text-slate-400">{ghe.description}</p>
                    </div>
                    <span className="text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-slate-300">
                      {gheEmps.length} expostos • {ghe.work_schedule_description || 'Jornada 44h/semana'}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] text-slate-300">
                      <thead className="text-slate-400 uppercase text-[9px] border-b border-slate-800 bg-slate-900/50">
                        <tr>
                          <th className="py-2 px-3">Agente / Fator de Risco</th>
                          <th className="py-2 px-3">Fonte Geradora</th>
                          <th className="py-2 px-3">Tipo Avaliação / Medição</th>
                          <th className="py-2 px-3">Medidas de Controle (EPC/EPI)</th>
                          <th className="py-2 px-3">Severidade x Prob.</th>
                          <th className="py-2 px-3">Plano de Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {risks.map(r => (
                          <tr key={r.id} className="hover:bg-slate-900/40">
                            <td className="py-2 px-3">
                              <span className="font-semibold text-slate-100">{r.agent_name}</span>
                              <div className="font-mono text-[9px] text-teal-400">Tab. 24: {r.risk_code_table_24}</div>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{r.generating_source}</td>
                            <td className="py-2 px-3">
                              {r.evaluation_type} {r.measured_value ? `(${r.measured_value} ${r.measurement_unit})` : ''}
                            </td>
                            <td className="py-2 px-3">
                              {r.epc_implemented && <div className="text-slate-300">EPC Eficaz</div>}
                              {r.epi_required && r.epis?.[0] && (
                                <div className="text-teal-300 font-mono text-[10px]">EPI CA {r.epis[0].ca_number}</div>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 bg-slate-800 rounded font-semibold text-slate-200">
                                {r.severity || 3} x {r.probability || 3} = {(r.severity || 3) * (r.probability || 3)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-300 font-medium">
                              {r.ltcat_technical_conclusion || 'Manter controles e monitoramento periódico'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Plan */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-400" />
              3. Plano de Ação Anual (Cronograma 5W2H)
            </h3>
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Ação Proposta (O que fazer)</th>
                    <th className="py-2.5 px-3">GHE Alvo</th>
                    <th className="py-2.5 px-3">Responsável</th>
                    <th className="py-2.5 px-3">Prazo</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {actionPlanRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 px-3 text-center text-slate-500">
                        Nenhuma ação pendente. O plano 5W2H é montado a partir do inventário de riscos
                        (riscos altos/críticos ou sem controle coletivo eficaz).
                      </td>
                    </tr>
                  ) : actionPlanRows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-100">{row.action}</td>
                      <td className="py-2.5 px-3 text-slate-400">{row.target}</td>
                      <td className="py-2.5 px-3">{rtName}</td>
                      <td className="py-2.5 px-3 text-teal-400">{row.deadline}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${row.isPending ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {row.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: PGRTR (NR-31) */}
      {activeDocType === 'PGRTR' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl" id="pgrtr-doc-view">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
            <div>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded">
                PROGRAMA DE GERENCIAMENTO DE RISCOS NO TRABALHO RURAL (PGRTR - NR-31)
              </span>
              <h2 className="text-lg font-bold text-slate-100 mt-2">
                Gestão de Segurança, Saúde e Meio Ambiente de Trabalho Rural
              </h2>
              <p className="text-xs text-slate-400">
                Propriedade Rural: <strong className="text-slate-200">{clientObj?.trade_name || clientObj?.legal_name || 'Fazenda / Agroindústria'}</strong> • CNPJ/CAEPF: <span className="font-mono">{clientObj?.document_number || 'Não informado'}</span>
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-1">
              <div>Vigência Rural: <span className="text-emerald-400 font-semibold">2026</span></div>
              <div>Norma: <span className="text-slate-200 font-bold">NR-31 (Portaria 22.677)</span></div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Tractor className="w-4 h-4 text-emerald-400" />
              Requisitos Específicos do Meio Rural e Agropecuário
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Agrotóxicos, Adjuvantes e Produtos Afins (NR-31.7)
                </span>
                <p className="text-slate-300">
                  Capacitação obrigatória de 20 horas para aplicadores, vestimentas hidrorrepelentes higienizadas pelo empregador, descarte de embalagens vazias com tríplice lavagem e guarda em depósito exclusivo.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-400 flex items-center gap-2">
                  <Tractor className="w-4 h-4" />
                  Máquinas, Implementos e Tratores Agrícolas (NR-31.12)
                </span>
                <p className="text-slate-300">
                  Proteção completa da Tomada de Força (TDP) e eixos cardãs, estruturas de proteção contra tombamento (ROPS/EPCC), cinto de segurança e manutenção preventiva periódica.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Animais Peçonhentos e Biológicos (NR-31.14)
                </span>
                <p className="text-slate-300">
                  Fornecimento e uso obrigatório de perneiras de couro/PVC, botas de segurança, kit de primeiros socorros em campo e protocolo de encaminhamento com soro antiofídico.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Condições Sanitárias e de Conforto no Campo (NR-31.20)
                </span>
                <p className="text-slate-300">
                  Instalações sanitárias móveis ou fixas separadas por sexo, água potável fresca disponível em garrafas térmicas e locais protegidos para refeições e pausas térmicas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PCMSO (NR-07) */}
      {activeDocType === 'PCMSO' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl" id="pcmso-doc-view">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
            <div>
              <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 text-xs font-bold rounded">
                PROGRAMA DE CONTROLE MÉDICO DE SAÚDE OCUPACIONAL (PCMSO - NR-07)
              </span>
              <h2 className="text-lg font-bold text-slate-100 mt-2">
                Planejamento de Saúde Ocupacional & Protocolos de Exames (ASO / eSocial S-2220)
              </h2>
              <p className="text-xs text-slate-400">
                Médico Coordenador do PCMSO: <strong className="text-slate-200">{pcmsoName}{pcmsoCrm ? ` (${pcmsoCrm}${pcmsoRqe ? ` - RQE ${pcmsoRqe}` : ''})` : ''}</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-1">
              <div>Vigência do Programa: <span className="text-cyan-400 font-semibold">12 Meses</span></div>
              <div>Exames Catalogados: <span className="text-slate-200 font-bold">{examProtocols.length} protocolos</span></div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-cyan-400" />
              Matriz de Monitoramento Biológico e Exames Clínicos por GHE
            </h3>

            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Procedimento Diagnóstico</th>
                    <th className="py-3 px-4">Tabela 27 eSocial</th>
                    <th className="py-3 px-4">GHE Aplicado</th>
                    <th className="py-3 px-4">Periodicidade</th>
                    <th className="py-3 px-4">Diretriz NR-07</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {examProtocols.map(p => {
                    const ghe = ghes.find(g => g.id === p.ghe_id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-bold text-slate-100">{p.exam_name}</td>
                        <td className="py-3 px-4 font-mono text-cyan-400 font-bold">{p.exam_code_table_27}</td>
                        <td className="py-3 px-4 text-slate-300">{ghe?.name || 'Geral'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded font-semibold text-[11px]">
                            {p.periodicity_months} meses ({p.triggers?.join(', ') || 'Periódico'})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {p.mandatory_by_standard || 'NR-07'} • {p.preparation_instructions || 'Conforme protocolo clínico'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: LTCAT */}
      {activeDocType === 'LTCAT' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl" id="ltcat-doc-view">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
            <div>
              <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold rounded">
                LAUDO TÉCNICO DE CONDIÇÕES AMBIENTAIS DO TRABALHO (LTCAT - INSS)
              </span>
              <h2 className="text-lg font-bold text-slate-100 mt-2">
                Caracterização para Aposentadoria Especial & eSocial S-2240
              </h2>
              <p className="text-xs text-slate-400">
                Engenheiro de Segurança do Trabalho: <strong className="text-slate-200">{rtWithCouncil}{rtArt ? ` - ART ${rtArt}` : ''}</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-1">
              <div>Artigo 58 da Lei nº 8.213/91</div>
              <div>Enquadramento GFIP: <span className="text-purple-400 font-bold">Código 04 (25 Anos)</span></div>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-300">
            <p>
              O presente Laudo Técnico tem por objetivo analisar a exposição habitual e permanente a agentes nocivos químicos, físicos, biológicos ou associação de agentes prejudiciais à saúde ou à integridade física do trabalhador, para fins de concessão de aposentadoria especial.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-slate-100 text-sm">Resumo dos Agentes Caracterizados para Aposentadoria Especial:</h4>
              <div className="space-y-2">
                {environmentalRisks.filter(r => r.special_retirement_applies).map(r => (
                  <div key={r.id} className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="font-bold text-purple-300">{r.agent_name}</span>
                      <span className="ml-2 font-mono text-[11px] text-teal-400">Tab. 24: {r.risk_code_table_24}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{r.generating_source} • Medição: {r.measured_value} {r.measurement_unit}</p>
                    </div>
                    <span className="px-2 py-1 bg-purple-600 text-slate-950 font-bold rounded text-[10px]">
                      {r.gfip_code === '02' ? 'Aposentadoria Especial 15 Anos' : r.gfip_code === '03' ? 'Aposentadoria Especial 20 Anos' : 'Aposentadoria Especial 25 Anos'} (GFIP {r.gfip_code})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: LAUDO DE INSALUBRIDADE (NR-15) */}
      {activeDocType === 'INSALUBRIDADE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl" id="insalubridade-doc-view">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
            <div>
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded">
                LAUDO TÉCNICO PERICIAL DE INSALUBRIDADE (NR-15 / ART. 189 A 192 CLT)
              </span>
              <h2 className="text-lg font-bold text-slate-100 mt-2">
                Avaliação de Limites de Tolerância & Adicionais Trabalhistas (10%, 20% e 40%)
              </h2>
              <p className="text-xs text-slate-400">
                Perito Técnico Responsável: <strong className="text-slate-200">{rtWithCouncil}</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-1">
              <div>Legislação: <span className="text-amber-400 font-semibold">Art. 189 a 192 CLT</span></div>
              <div>Base de Cálculo: <span className="text-slate-200 font-bold">Salário Mínimo Vigente</span></div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">GHE / Posto de Trabalho</th>
                  <th className="py-3 px-4">Agente Nocivo Avaliado</th>
                  <th className="py-3 px-4">Anexo NR-15</th>
                  <th className="py-3 px-4">Limite de Tolerância x Medição</th>
                  <th className="py-3 px-4">Conclusão Técnica / Adicional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {corpoInsalubridade.linhas.length ? (
                  corpoInsalubridade.linhas.map((linha, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-bold text-slate-100">{linha[0]}</td>
                      <td className="py-3 px-4 text-slate-300">{linha[1]}</td>
                      <td className="py-3 px-4 font-mono text-amber-400">{linha[2]}</td>
                      <td className="py-3 px-4">{linha[3]}</td>
                      <td className="py-3 px-4 font-semibold">{linha[4]}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 px-4 text-center text-slate-500">
                      Inventário de riscos vazio — nenhum agente foi periciado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 6: LAUDO DE PERICULOSIDADE (NR-16) */}
      {activeDocType === 'PERICULOSIDADE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl" id="periculosidade-doc-view">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
            <div>
              <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 text-xs font-bold rounded">
                LAUDO TÉCNICO PERICIAL DE PERICULOSIDADE (NR-16 / ART. 193 DA CLT)
              </span>
              <h2 className="text-lg font-bold text-slate-100 mt-2">
                Atividades e Operações Perigosas com Adicional de 30% sobre o Salário Base
              </h2>
              <p className="text-xs text-slate-400">
                Perito Técnico: <strong className="text-slate-200">{rtWithCouncil}{rtArt ? ` / ART ${rtArt}` : ''}</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-1">
              <div>Adicional: <span className="text-rose-400 font-bold text-sm">30% sobre salário-base</span></div>
              <div>Fundamentação: <span className="text-slate-200 font-bold">Art. 193 da CLT</span></div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">GHE / Função Avaliada</th>
                  <th className="py-3 px-4">Atividade / Operação Executada</th>
                  <th className="py-3 px-4">Anexo NR-16</th>
                  <th className="py-3 px-4">Delimitação de Área de Risco</th>
                  <th className="py-3 px-4">Conclusão Pericial / Adicional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {corpoPericulosidade.linhas.length ? (
                  corpoPericulosidade.linhas.map((linha, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-bold text-slate-100">{linha[0]}</td>
                      <td className="py-3 px-4 text-slate-300">{linha[1]}</td>
                      <td className="py-3 px-4 font-mono text-rose-400">{linha[2]}</td>
                      <td className="py-3 px-4">{linha[3]}</td>
                      <td className="py-3 px-4 font-semibold">{linha[4]}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 px-4 text-center text-slate-500">
                      Inventário de riscos vazio — nenhuma atividade foi periciada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 7: XML ESOCIAL INSPECTOR */}
      {activeDocType === 'XML_ESOCIAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="xml-inspector-view">
          {/* Events Sidebar */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-blue-400" />
              Eventos Gerados ({esocialEvents.length})
            </h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {esocialEvents.map((evt) => {
                const isSelected = selectedXmlEventId === evt.id;

                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedXmlEventId(evt.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500/40 text-slate-100'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-400">{evt.event_type}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{evt.event_number}</span>
                    </div>
                    <h4 className="font-bold text-xs mt-1 truncate text-slate-100">{evt.worker_name}</h4>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                      <span className="font-mono">CPF: {evt.worker_cpf}</span>
                      <span className={`font-semibold ${evt.status === 'SUCCESS' ? 'text-emerald-400' : 'text-amber-300'}`}>
                        {evt.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* XML Viewer & Actions */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            {selectedEvent ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono text-xs font-bold rounded">
                        {selectedEvent.event_type}
                      </span>
                      <h3 className="font-bold text-slate-100 text-sm">
                        {selectedEvent.worker_name} (Matrícula: {selectedEvent.worker_registration})
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Status: <strong className="text-slate-200">{selectedEvent.status}</strong> • Certificado: ICP-Brasil A1 (SERPRO)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyXml}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-teal-400" /> : <Copy className="w-4 h-4" />}
                      {copiedCode ? 'Copiado!' : 'Copiar XML'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadXml}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      Baixar .xml
                    </button>
                    {selectedEvent.status !== 'SUCCESS' && (
                      <button
                        type="button"
                        onClick={handleTransmitSelectedEvent}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-md"
                      >
                        <Send className="w-4 h-4" />
                        Transmitir ao eSocial
                      </button>
                    )}
                  </div>
                </div>

                {/* XML Code Box */}
                <div className="relative">
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800/90 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-[500px] leading-relaxed select-all">
                    <code>{xmlPayload}</code>
                  </pre>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                Selecione um evento eSocial para inspecionar as TAGs XML.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Dynamic Preview Modal */}
      <DocumentPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        docType={previewDocType}
        client={clientObj}
        organization={organization}
        ghes={clientGhes}
        risks={environmentalRisks}
        examProtocols={examProtocols}
        employees={clientEmployees}
        sectors={clientSectors}
        units={clientUnits}
        onTransmitESocial={handleTransmitSelectedEvent}
      />
    </div>
  );
};

