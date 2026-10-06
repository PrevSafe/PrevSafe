'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  FileCode2, 
  FileText, 
  Download, 
  Copy, 
  Check,
  Layers,
  Send, 
  CheckCircle2, 
  Building2,
  Printer,
  Eye,
  FileCheck,
  Stethoscope,
  Activity,
  ShieldAlert,
  Info,
  Flame,
  AlertTriangle,
  Tractor,
  FileSpreadsheet,
  Brain
} from 'lucide-react';
import {
  exportPGRDocumentPdf,
  exportPGRTRDocumentPdf,
  exportPCMSODocumentPdf,
  exportLTCATDocumentPdf,
  exportAEPDocumentPdf,
  exportPsychosocialReportPdf,
  exportInsalubridadeLaudoPdf,
  exportPericulosidadeLaudoPdf
} from '@/lib/pdfExportService';
import { prepararFotosDaAEP } from '@/lib/imagensParaPdf';
import { DocumentPreviewModal, PreviewDocType } from '@/lib/../components/sst/DocumentPreviewModal';
import { montarCorpoInsalubridade, montarCorpoPericulosidade } from '@/lib/laudoDados';
import { PcmsoResumo } from './PcmsoResumo';
import { avaliacaoIniciada, faltasPsicossociais, resumoPsicossocial } from '@/lib/psicossocial';
import { acoesDoPlano, dataBR } from '@/lib/planoDeAcao';
import { classificarRisco } from '@/lib/classificacaoDeRisco';
import { dataDeHoje } from '@/lib/datas';

interface TechnicalDocsGeneratorTabProps {
  selectedClientId: string;
}

export const TechnicalDocsGeneratorTab: React.FC<TechnicalDocsGeneratorTabProps> = ({ selectedClientId }) => {
  const {
    organization,
    clients,
    units,
    contractedOrganizations,
    machinesEquipment,
    chemicalProducts,
    trainingRequirements,
    ergonomicAssessments,
    technicalProfessionals,
    technicalResponsibilities,
    hierarchySectors,
    hierarchyJobs,
    ghes,
    environmentalRisks,
    examProtocols,
    employees,
    catRecords,
    workAbsences,
    esocialEvents,
    pgrActionPlan = [],
    generateESocialXmlPreview,
    transmitESocialEvent,
    examResults = [],
    acessoAResultadosDeExame
  } = usePrevSafe();


  const [activeDocType, setActiveDocType] = useState<'PGR' | 'PGRTR' | 'PCMSO' | 'LTCAT' | 'AEP' | 'PSICOSSOCIAL' | 'INSALUBRIDADE' | 'PERICULOSIDADE' | 'XML_ESOCIAL'>('PGR');
  const [selectedXmlEventId, setSelectedXmlEventId] = useState<string>(esocialEvents[0]?.id || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDocType, setPreviewDocType] = useState<PreviewDocType>('PGR');

  const clientObj = clients.find(c => c.id === selectedClientId) || clients[0];
  const clientUnits = units.filter(u => !selectedClientId || u.client_id === selectedClientId);
  const clientContratadas = contractedOrganizations.filter(
    o => !selectedClientId || o.client_id === selectedClientId
  );
  const clientMaquinas = machinesEquipment.filter(
    m => !selectedClientId || m.client_id === selectedClientId
  );
  const clientQuimicos = chemicalProducts.filter(
    q => !selectedClientId || q.client_id === selectedClientId
  );
  const clientMatriz = trainingRequirements.filter(
    t => !selectedClientId || t.client_id === selectedClientId
  );
  const clientAeps = ergonomicAssessments.filter(
    a => !selectedClientId || a.client_id === selectedClientId
  );
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
  const rtWithCouncil = rtCouncil ? `${rtName} (${rtCouncil})` : rtName;

  // Plano de acao: a regra e o recorte do PGR (lib/planoDeAcao.ts,
  // acoesDoPlano), com o mesmo numero R-... e a mesma ordem do documento.
  // Havia aqui uma TERCEIRA copia da regra, com criterio proprio (risco alto
  // ou sem EPC eficaz), prazo pela faixa e o responsavel tecnico como
  // responsavel de toda acao: a tela mostrava um plano e o PDF imprimia
  // outro. O recorte repete o de exportPGRDocumentPdf, que recebe clientGhes,
  // environmentalRisks e clientEmployees.
  const idDoClienteDoPlano = clientObj?.id || '';
  const ghesDoPlano = clientGhes.filter(g => !g.client_id || g.client_id === idDoClienteDoPlano);
  const idsDeGheDoPlano = new Set(ghesDoPlano.map(g => g.id));
  // O recorte do PGR: risco de GHE do cliente, ou com o proprio client_id.
  // Serve tambem ao PGRTR e ao LTCAT da tela, que liam environmentalRisks
  // inteiro - os riscos de TODOS os clientes.
  const riscosDoCliente = environmentalRisks.filter(
    r => idsDeGheDoPlano.has(r.ghe_id) || r.client_id === idDoClienteDoPlano
  );
  const actionPlanRows = acoesDoPlano(
    riscosDoCliente,
    ghesDoPlano,
    (gheId: string) => clientEmployees.filter(e => e.ghe_id === gheId).length,
    { acoes: pgrActionPlan, efetivo: clientEmployees.length }
  );
  const emissao = dataBR(dataDeHoje());

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
    // Dizia "assinado com certificado A1 e transmitido ao eSocial" sempre, e
    // ignorava a resposta. O sistema nao assina nem transmite: o contexto
    // valida o XML e deixa o evento pronto para envio pelo canal oficial.
    const r = transmitESocialEvent(selectedEvent.id);
    setSuccessToast(
      r?.success
        ? `Evento ${selectedEvent.event_type} (${selectedEvent.event_number}) validado e pronto para envio. ` +
          'O PrevSafe ainda não transmite: envie pelo canal oficial e registre o recibo.'
        : `Evento ${selectedEvent.event_type} (${selectedEvent.event_number}) não validado: ${r?.error || 'erro desconhecido'}`
    );
    setTimeout(() => setSuccessToast(null), 8000);
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
        units: clientUnits,
        contractedOrganizations: clientContratadas,
        machinesEquipment: clientMaquinas,
        chemicalProducts: clientQuimicos,
        trainingRequirements: clientMatriz,
        jobs: clientJobs,
        ergonomicAssessments: clientAeps,
        technicalProfessionals,
        technicalResponsibilities,
        pgrActionPlan
      });
      setSuccessToast('PDF do PGR (NR-01) gerado com sucesso!');
    } else if (activeDocType === 'PGRTR') {
      exportPGRTRDocumentPdf({
        client: clientObj,
        organization,
        ghes: clientGhes,
        // O PGRTR nao recorta por cliente (ao contrario do PGR): com
        // environmentalRisks inteiro, saiam riscos de outros clientes.
        risks: riscosDoCliente,
        employees: clientEmployees,
        technicalProfessionals,
        technicalResponsibilities
      });
      setSuccessToast('PDF do PGRTR (NR-31 Rural) gerado com sucesso!');
    } else if (activeDocType === 'PCMSO') {
      exportPCMSODocumentPdf({
        client: clientObj,
        organization,
        examProtocols,
        ghes: clientGhes,
        risks: environmentalRisks,
        employees: clientEmployees,
        units,
        sectors: hierarchySectors,
        jobs: hierarchyJobs,
        catRecords,
        trainingRequirements,
        technicalProfessionals,
        technicalResponsibilities,
        // Alinea "c" do relatorio analitico: so com o papel Saude. Sem ele o
        // PDF diz que a alinea e restrita, em vez de "nenhum anormal".
        examResults: acessoAResultadosDeExame ? examResults : null
      });
      setSuccessToast('PDF do PCMSO (NR-07) gerado com sucesso!');
    } else if (activeDocType === 'LTCAT') {
      exportLTCATDocumentPdf({
        client: clientObj,
        organization,
        risks: environmentalRisks,
        ghes: clientGhes,
        employees: clientEmployees,
        technicalProfessionals,
        technicalResponsibilities
      });
      setSuccessToast('PDF do LTCAT Previdenciário (INSS) gerado com sucesso!');
    } else if (activeDocType === 'AEP') {
      // As fotos sao baixadas e conferidas (hash) antes de gerar: o gerador de
      // PDF e sincrono e o armazenamento nao.
      setSuccessToast('Conferindo as fotografias da AEP…');
      prepararFotosDaAEP(clientAeps)
        .then((imagensDasEvidencias) => {
          exportAEPDocumentPdf({
            client: clientObj,
            organization,
            ergonomicAssessments: clientAeps,
            ghes: clientGhes,
            risks: environmentalRisks,
            jobs: hierarchyJobs,
            units,
            technicalProfessionals,
            technicalResponsibilities,
            imagensDasEvidencias
          });
          setSuccessToast('PDF da AEP (NR-17) gerado com sucesso!');
          setTimeout(() => setSuccessToast(null), 4000);
        })
        .catch((erro: any) => {
          setSuccessToast(`Não foi possível gerar a AEP: ${erro?.message || 'erro desconhecido'}`);
        });
    } else if (activeDocType === 'PSICOSSOCIAL') {
      exportPsychosocialReportPdf({
        client: clientObj,
        organization,
        ergonomicAssessments: clientAeps,
        ghes: clientGhes,
        risks: environmentalRisks,
        employees: clientEmployees,
        jobs: hierarchyJobs,
        units,
        technicalProfessionals,
        technicalResponsibilities,
        // As acoes tem de ser as mesmas do PGR, com o mesmo numero.
        pgrActionPlan
      });
      setSuccessToast('PDF do relatório de fatores psicossociais gerado com sucesso!');
    } else if (activeDocType === 'INSALUBRIDADE') {
      exportInsalubridadeLaudoPdf({
        client: clientObj,
        organization,
        risks: environmentalRisks,
        ghes: clientGhes,
        employees: clientEmployees,
        technicalProfessionals,
        technicalResponsibilities
      });
      setSuccessToast('PDF do Laudo de Insalubridade (NR-15) gerado com sucesso!');
    } else if (activeDocType === 'PERICULOSIDADE') {
      exportPericulosidadeLaudoPdf({
        client: clientObj,
        organization,
        risks: environmentalRisks,
        ghes: clientGhes,
        employees: clientEmployees,
        technicalProfessionals,
        technicalResponsibilities
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
            id="doc-aep-btn"
            onClick={() => setActiveDocType('AEP')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeDocType === 'AEP'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            5. AEP (NR-17)
          </button>

          <button
            type="button"
            id="doc-psicossocial-btn"
            onClick={() => setActiveDocType('PSICOSSOCIAL')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeDocType === 'PSICOSSOCIAL'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Brain className="w-4 h-4" />
            5.1 Fatores Psicossociais
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
            6. Laudo Insalubridade (NR-15)
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
            7. Laudo Periculosidade (NR-16)
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
            8. XMLs eSocial (MOS)
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeDocType !== 'XML_ESOCIAL' && (
            <>
              {activeDocType !== 'PSICOSSOCIAL' && (
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
              )}

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
          {/* Prometia "100% de consistencia tecnica, juridica e fiscal". O
              documento e tao bom quanto o cadastro: o que falta sai como
              pendencia, e nao preenchido. */}
          <p className="text-slate-400">
            Todos os documentos (<strong>PGR, PGRTR, PCMSO, LTCAT, Laudo de Insalubridade NR-15, Laudo de Periculosidade NR-16, Kit Admissional e XMLs do eSocial</strong>) são gerados a partir da hierarquia, dos inventários de riscos por GHE, dos exames e dos dados cadastrais. O que não estiver cadastrado sai como pendência no documento — nada é preenchido por padrão.
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
                Empresa: <strong className="text-slate-200">{clientObj?.trade_name || clientObj?.legal_name || 'Cliente não selecionado'}</strong> • CNPJ: <span className="font-mono">{clientObj?.document_number || 'Não informado'}</span>
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-1">
              {/* Era "Vigencia: 2026 / 2027", escrito no codigo. A data e a da emissao. */}
              <div>Emissão: <span className="text-teal-400 font-semibold">{emissao}</span></div>
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
                <span className="font-bold text-teal-400">{clientEmployees.length} trabalhador(es) cadastrado(s)</span>
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
                      {gheEmps.length} expostos • {ghe.work_schedule_description || 'jornada não informada'}
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
                              {/* Dizia "EPC Eficaz" so por estar implantado. A eficacia
                                  e a afericao registrada no plano de acao. */}
                              {r.epc_implemented && <div className="text-slate-300">EPC implantado</div>}
                              {r.epc_effective && <div className="text-emerald-300">EPC eficaz (aferido)</div>}
                              {r.epi_required && r.epis?.[0] && (
                                <div className="text-teal-300 font-mono text-[10px]">EPI CA {r.epis[0].ca_number}</div>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {/* Era `|| 3`: risco sem classificacao aparecia 3 x 3 = 9. */}
                              {(() => {
                                const c = classificarRisco(r.severity, r.probability);
                                return c ? (
                                  <span className="px-1.5 py-0.5 bg-slate-800 rounded font-semibold text-slate-200 whitespace-nowrap">
                                    {c.severidade} x {c.probabilidade} = {c.score} · {c.rotulo}
                                  </span>
                                ) : (
                                  <span className="text-amber-300 font-semibold">não classificado</span>
                                );
                              })()}
                            </td>
                            <td className="py-2 px-3 text-slate-300 font-medium">
                              {/* Sem conclusao do LTCAT, dizia "Manter controles e
                                  monitoramento periodico" de qualquer risco. Agora e a
                                  situacao do risco no plano, a mesma do PDF. */}
                              {(() => {
                                const linhas = actionPlanRows.filter(l => l.risco?.id === r.id);
                                if (linhas.length === 0 || linhas.every(l => !l.registro)) {
                                  return <span className="text-amber-300">sem ação no plano</span>;
                                }
                                return linhas.map(l => (
                                  <div key={l.numero} className="whitespace-nowrap">
                                    <span className="font-mono text-[10px] text-slate-200">{l.numero}</span>{' '}
                                    <span className={l.atrasada ? 'text-rose-300' : l.aceita ? 'text-slate-300' : 'text-amber-300'}>
                                      {l.aceita ? l.status : 'sugestão não aceita'}
                                    </span>
                                  </div>
                                ));
                              })()}
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
              3. Plano de Ação (seção 8 do PGR)
            </h3>
            <p className="text-[11px] text-slate-400">
              O mesmo quadro do PDF. Ações se cadastram, aceitam e acompanham na aba 2.1 (Plano de Ação): sugestão
              não aceita sai como pendência.
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Nº</th>
                    <th className="py-2.5 px-3">Medida</th>
                    <th className="py-2.5 px-3">GHE</th>
                    <th className="py-2.5 px-3">Responsável</th>
                    <th className="py-2.5 px-3">Prazo</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {actionPlanRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 px-3 text-center text-slate-500">
                        Sem riscos no inventário deste cliente, não há plano de ação: o plano nasce do inventário.
                      </td>
                    </tr>
                  ) : actionPlanRows.map(row => {
                    const pendente = !row.aceita || row.faltas.length > 0;
                    return (
                      <tr key={row.numero} className="hover:bg-slate-900/40 align-top">
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-200 whitespace-nowrap">{row.numero}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-100">{row.medida}</span>
                          <div className="text-[10px] text-slate-500">{row.hierarquia} · {row.tipo}</div>
                          {row.faltas.length > 0 && (
                            <div className="text-[10px] text-amber-300 mt-0.5">{row.faltas.join('; ')}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{row.gheNome}</td>
                        <td className="py-2.5 px-3">
                          {row.responsavel || <span className="text-amber-300">a definir</span>}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {row.prazo
                            ? <span className={row.atrasada ? 'text-rose-300 font-semibold' : 'text-teal-400'}>{dataBR(row.prazo)}</span>
                            : <span className="text-amber-300">a definir</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            row.atrasada
                              ? 'bg-rose-500/20 text-rose-300'
                              : pendente
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {row.status}
                          </span>
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
                Propriedade Rural: <strong className="text-slate-200">{clientObj?.trade_name || clientObj?.legal_name || 'Cliente não selecionado'}</strong> • CNPJ/CAEPF: <span className="font-mono">{clientObj?.document_number || 'Não informado'}</span>
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-1">
              <div>Emissão: <span className="text-emerald-400 font-semibold">{emissao}</span></div>
              <div>Norma: <span className="text-slate-200 font-bold">NR-31 (Portaria 22.677)</span></div>
            </div>
          </div>

          {/* Eram quatro quadros fixos de "requisitos" (20 horas de capacitacao,
              soro antiofidico, garrafas termicas...), iguais para toda
              propriedade e com itens da NR-31 citados de memoria. O PDF ja
              tinha trocado isso pelo inventario real e por uma ressalva de
              escopo; a tela repete o PDF (exportPGRTRDocumentPdf). */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Tractor className="w-4 h-4 text-emerald-400" />
              Inventário de Riscos do Estabelecimento Rural
            </h3>

            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">GHE / Frente de trabalho</th>
                    <th className="py-2.5 px-3">Perigo / Agente de risco</th>
                    <th className="py-2.5 px-3">Medidas de controle registradas</th>
                    <th className="py-2.5 px-3">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {riscosDoCliente.filter(r => r.status !== 'INACTIVE').length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 px-3 text-center text-amber-300">
                        Inventário de riscos vazio: não há agente de risco cadastrado para este estabelecimento.
                        Levante os perigos antes de emitir o PGRTR.
                      </td>
                    </tr>
                  ) : riscosDoCliente.filter(r => r.status !== 'INACTIVE').map(r => {
                    const ghe = clientGhes.find(g => g.id === r.ghe_id);
                    const controles = [
                      r.epc_implemented ? `EPC: ${r.epc_description?.trim() || 'sem descrição'}` : '',
                      r.epi_required ? 'EPI exigido' : ''
                    ].filter(Boolean);
                    return (
                      <tr key={r.id} className="align-top">
                        <td className="py-2.5 px-3 text-slate-400">
                          {[ghe?.code, ghe?.name].filter(Boolean).join(' — ') || 'GHE não vinculado'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-100">{r.agent_name || 'Agente não identificado'}</span>
                          <div className="text-[10px] text-slate-500">Fonte: {r.generating_source?.trim() || 'não informada'}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          {controles.length > 0 ? controles.join(' · ') : <span className="text-amber-300">Nenhuma medida de controle registrada</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {r.epc_implemented && r.epc_effective
                            ? <span className="text-emerald-300">Controle implantado e avaliado como eficaz</span>
                            : r.epc_implemented
                              ? <span className="text-slate-300">Controle implantado, eficácia não confirmada</span>
                              : <span className="text-amber-300">Pendente — sem controle coletivo registrado</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-amber-200/80">
              Escopo deste documento: o inventário acima reproduz os riscos registrados no sistema. A verificação
              específica dos itens 31.7 (agrotóxicos), 31.10 (trabalho a céu aberto), 31.12 (máquinas, implementos e
              tomada de força) e 31.14 (agentes biológicos e animais peçonhentos) da NR-31 depende de inspeção em campo
              e não está registrada neste sistema — a ausência de apontamento não significa conformidade.
            </p>
          </div>
        </div>
      )}

      {/* VIEW 3: PCMSO (NR-07) */}
      {activeDocType === 'PCMSO' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl" id="pcmso-doc-view">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-start gap-4">
            <div>
              <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 text-xs font-bold rounded">
                PROGRAMA DE CONTROLE MÉDICO DE SAÚDE OCUPACIONAL (PCMSO — NR-07)
              </span>
              <h2 className="text-lg font-bold text-slate-100 mt-2">
                Exames por GHE, a partir do inventário do PGR
              </h2>
              <p className="text-xs text-slate-400 max-w-[46rem]">
                O PDF traz o programa inteiro: diretrizes, base legal, vedações, riscos e agravos, exames e prazos,
                Anexos da NR-07, atividades críticas, ASO, prontuário e sigilo, relatório analítico e checklist.
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-1 shrink-0">
              <div>Base: <span className="text-cyan-400 font-semibold">NR-07, subitem 7.5.1</span></div>
              <div>Validade: <span className="text-slate-200">a NR-07 não fixa</span></div>
            </div>
          </div>
          <PcmsoResumo
            tema="escuro"
            client={clientObj}
            ghes={clientGhes}
            risks={environmentalRisks}
            examProtocols={examProtocols}
            employees={clientEmployees}
            trainingRequirements={trainingRequirements}
            jobs={hierarchyJobs}
          />
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
              {/* Era "Codigo 04 (25 Anos)" para todo cliente. Os codigos sao os
                  informados no inventario deste cliente. */}
              <div>
                Enquadramento GFIP:{' '}
                <span className="text-purple-400 font-bold">
                  {(() => {
                    const codigos = Array.from(new Set(
                      riscosDoCliente.filter(r => r.special_retirement_applies && r.gfip_code).map(r => r.gfip_code)
                    )).sort();
                    return codigos.length > 0 ? codigos.join(', ') : 'nenhum código informado';
                  })()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-300">
            <p>
              O presente Laudo Técnico tem por objetivo analisar a exposição habitual e permanente a agentes nocivos químicos, físicos, biológicos ou associação de agentes prejudiciais à saúde ou à integridade física do trabalhador, para fins de concessão de aposentadoria especial.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-slate-100 text-sm">Resumo dos Agentes Caracterizados para Aposentadoria Especial:</h4>
              {/* Listava environmentalRisks inteiro (riscos de TODOS os clientes)
                  e dava "25 Anos" a todo codigo que nao fosse 02 ou 03 - inclusive
                  risco sem codigo informado. */}
              <div className="space-y-2">
                {riscosDoCliente.filter(r => r.special_retirement_applies).length === 0 && (
                  <p className="text-slate-500">Nenhum agente do inventário deste cliente está marcado para aposentadoria especial.</p>
                )}
                {riscosDoCliente.filter(r => r.special_retirement_applies).map(r => (
                  <div key={r.id} className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-purple-300">{r.agent_name}</span>
                      {r.risk_code_table_24 && (
                        <span className="ml-2 font-mono text-[11px] text-teal-400">Tab. 24: {r.risk_code_table_24}</span>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {r.generating_source || 'Fonte não informada'} • Medição:{' '}
                        {r.measured_value
                          ? `${r.measured_value} ${r.measurement_unit || ''}`
                          : r.evaluation_type === 'QUANTITATIVA' ? 'pendente' : 'avaliação qualitativa'}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-purple-600 text-slate-950 font-bold rounded text-[10px] shrink-0">
                      {r.gfip_code === '02'
                        ? 'Aposentadoria Especial 15 Anos (GFIP 02)'
                        : r.gfip_code === '03'
                          ? 'Aposentadoria Especial 20 Anos (GFIP 03)'
                          : r.gfip_code === '04'
                            ? 'Aposentadoria Especial 25 Anos (GFIP 04)'
                            : `Código GFIP ${r.gfip_code || 'não informado'}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: AEP (NR-17) */}
      {activeDocType === 'AEP' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl" id="aep-doc-view">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
            <div>
              <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 text-xs font-bold rounded">
                AVALIAÇÃO ERGONÔMICA PRELIMINAR (AEP - NR-17, ITEM 17.3)
              </span>
              <h2 className="text-lg font-bold text-slate-100 mt-2">
                Situações de trabalho avaliadas, aspecto por aspecto
              </h2>
              <p className="text-xs text-slate-400">
                Responsável técnico: <strong className="text-slate-200">{rtWithCouncil}</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-1">
              <div>Registro obrigatório: <span className="text-teal-400 font-semibold">subitem 17.3.1.2.1</span></div>
              <div>Integra o inventário: <span className="text-slate-200 font-bold">item 17.3.5</span></div>
            </div>
          </div>

          {clientAeps.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-200">
              Nenhuma situação de trabalho avaliada. Cadastre em <strong>Engenharia SST &gt; 13. Avaliação
              Ergonômica</strong>. O item 17.2.1 aplica a NR-17 a todas as situações de trabalho: não cabe
              declarar que não há o que avaliar.
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Situação de trabalho</th>
                    <th className="py-3 px-4">Abordagem</th>
                    <th className="py-3 px-4">Aspectos inadequados</th>
                    <th className="py-3 px-4">Medidas (17.4.3.1)</th>
                    <th className="py-3 px-4">AET (17.3.2)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {clientAeps.map((a: any) => {
                    const inadequados = Object.values(a.aspects || {})
                      .filter((x: any) => x?.conclusao === 'INADEQUADO').length;
                    const gatilhos = (a.aet_triggers || []).length;
                    return (
                      <tr key={a.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-bold text-slate-100">{a.situation_name || 'Sem nome'}</td>
                        <td className="py-3 px-4 text-slate-300">{a.approach || 'PENDENTE'}</td>
                        <td className="py-3 px-4 font-mono text-amber-400">{inadequados}</td>
                        <td className="py-3 px-4 text-slate-300">{(a.prevention_measures || []).join(', ') || '—'}</td>
                        <td className="py-3 px-4 text-slate-300">
                          {a.aet_report_date ? 'Realizada' : gatilhos > 0 ? 'Gatilho observado' : 'Não exigível'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            O PDF traz uma página por situação, com a conclusão de cada um dos seis aspectos, o que se
            observou, as medidas de prevenção, a oitiva dos trabalhadores e o quadro de assinaturas.
          </p>
        </div>
      )}

      {/* VIEW 5.1: FATORES PSICOSSOCIAIS (recorte da AEP e do PGR) */}
      {activeDocType === 'PSICOSSOCIAL' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl" id="psicossocial-doc-view">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-start gap-4">
            <div>
              <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 text-xs font-bold rounded">
                FATORES DE RISCO PSICOSSOCIAIS RELACIONADOS AO TRABALHO
              </span>
              <h2 className="text-lg font-bold text-slate-100 mt-2">
                Recorte da AEP e do inventário e plano de ação do PGR
              </h2>
              <p className="text-xs text-slate-400 max-w-[46rem]">
                Não traz avaliação própria: cada linha sai dos mesmos registros da AEP e do PGR. A avaliação se
                faz em Engenharia SST &gt; 13. Avaliação Ergonômica, no botão de fatores psicossociais de cada situação.
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-1 shrink-0">
              <div>Base: <span className="text-teal-400 font-semibold">NR-01, 1.5.3.2.1</span></div>
              <div>Integra o inventário: <span className="text-slate-200 font-bold">NR-17, 17.3.5</span></div>
            </div>
          </div>

          {clientAeps.filter((a: any) => a?.status !== 'INACTIVE').length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-200">
              Nenhuma situação de trabalho avaliada. Os fatores psicossociais são avaliados na AEP, obrigatória
              em todas as situações de trabalho (item 17.2.1 da NR-17).
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Situação de trabalho</th>
                    <th className="py-3 px-4">Fatores avaliados</th>
                    <th className="py-3 px-4">Presentes</th>
                    <th className="py-3 px-4">O que falta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {clientAeps.filter((a: any) => a?.status !== 'INACTIVE').map((a: any) => {
                    const psico = resumoPsicossocial(a);
                    const faltas = faltasPsicossociais(a);
                    return (
                      <tr key={a.id} className="hover:bg-slate-900/40 align-top">
                        <td className="py-3 px-4 font-bold text-slate-100">{a.situation_name || 'Sem nome'}</td>
                        <td className="py-3 px-4">
                          {avaliacaoIniciada(a) ? `${psico.avaliados}/${psico.total}` : <span className="text-amber-400">Não avaliados</span>}
                        </td>
                        <td className="py-3 px-4 text-rose-300">{psico.presentes.join(', ') || '—'}</td>
                        <td className="py-3 px-4 text-amber-400">
                          {faltas.length === 0 ? <span className="text-emerald-400">Completa</span> : faltas.map((f) => f.curto).join('; ')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            O PDF traz a base normativa, o que a avaliação não é, o quadro de fatores de cada situação, os riscos
            psicossociais do inventário com as ações do plano do PGR — mesma numeração — e as pendências.
          </p>
        </div>
      )}

      {/* VIEW 6: LAUDO DE INSALUBRIDADE (NR-15) */}
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
                      {/* Dizia "Certificado: ICP-Brasil A1 (SERPRO)": o sistema nao assina nem transmite. */}
                      Status: <strong className="text-slate-200">{selectedEvent.status}</strong> • Envio: pelo canal oficial do eSocial (o PrevSafe ainda não assina nem transmite)
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
                        Validar para envio
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
        contractedOrganizations={clientContratadas}
        machinesEquipment={clientMaquinas}
        chemicalProducts={clientQuimicos}
        trainingRequirements={clientMatriz}
        jobs={clientJobs}
        ergonomicAssessments={clientAeps}
        sectors={clientSectors}
        units={clientUnits}
        onTransmitESocial={handleTransmitSelectedEvent}
      />
    </div>
  );
};

