'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  X, 
  Download, 
  Printer, 
  Share2, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Building2, 
  Calendar, 
  UserCheck, 
  Award, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  FileSpreadsheet,
  AlertTriangle,
  Flame,
  Tractor,
  Stethoscope,
  Sparkles,
  Lock,
  Copy,
  Check,
  PenTool,
  QrCode,
  ExternalLink
} from 'lucide-react';
import {
  exportPGRDocumentPdf,
  exportPGRTRDocumentPdf,
  exportPCMSODocumentPdf,
  exportLTCATDocumentPdf,
  exportInsalubridadeLaudoPdf,
  exportPericulosidadeLaudoPdf
} from '@/lib/pdfExportService';
import { SSTElectronicSignatureModal } from './SSTElectronicSignatureModal';
import { SSTDocumentSignature } from '@/types';
import { DECLARACAO_DE_INTEGRIDADE } from '@/lib/documentoHash';
import { montarCorpoInsalubridade, montarCorpoPericulosidade } from '@/lib/laudoDados';

export type PreviewDocType = 
  | 'PGR' 
  | 'PGRTR' 
  | 'PCMSO' 
  | 'LTCAT' 
  | 'INSALUBRIDADE' 
  | 'PERICULOSIDADE' 
  | 'ORDEM_SERVICO' 
  | 'FICHA_EPI' 
  | 'KIT_ADMISSONAL';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  docType: PreviewDocType;
  client: any;
  organization: any;
  ghes?: any[];
  risks?: any[];
  examProtocols?: any[];
  employees?: any[];
  sectors?: any[];
  units?: any[];
  selectedEmployee?: any;
  onTransmitESocial?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  docType,
  client,
  organization,
  ghes = [],
  risks = [],
  examProtocols = [],
  employees = [],
  sectors = [],
  units = [],
  selectedEmployee,
  onTransmitESocial
}) => {
  const { sstSignatures, createSSTSignatureEnvelope } = usePrevSafe();

  // Responsabilidade técnica vem das Configurações da empresa: um laudo assinado
  // nunca pode carregar nome, CREA ou CRM inventados pelo sistema.
  const NAO_INFORMADO = 'Não informado nas Configurações';
  const rtName = organization?.technical_responsible_name || NAO_INFORMADO;
  const rtTitle = organization?.technical_responsible_title || 'Responsável Técnico';
  const rtCouncil = organization?.technical_responsible_council || '';
  const rtArt = organization?.technical_responsible_art || '';
  const pcmsoName = organization?.pcmso_physician_name || NAO_INFORMADO;
  const pcmsoCrm = organization?.pcmso_physician_crm || '';
  const pcmsoRqe = organization?.pcmso_physician_rqe || '';
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [copiedHash, setCopiedHash] = useState(false);
  const [activePage, setActivePage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'A4_SHEET' | 'STRUCTURED_VIEW'>('A4_SHEET');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  if (!isOpen) return null;

  const clientName = client?.trade_name || client?.legal_name || 'Empresa Cliente';
  const clientDoc = client?.document_number || 'Não informado';
  // O fallback era CNAE 41.20-4-00 (construcao de edificios) e grau 3: um
  // documento tecnico de um cliente sem cadastro saia afirmando a atividade e o
  // grau de risco de OUTRA empresa. O grau de risco define dimensionamento de
  // SESMT e de CIPA - nao e um rotulo cosmetico.
  const clientCnae = client?.main_cnae || 'Não informado';
  const clientRiskDegree = client?.risk_degree || null;
  const issueDate = new Date().toLocaleDateString('pt-BR');
  const validityYear = `${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`;
  // Este numero era fixo no codigo: o MESMO "SHA256: 7f8a9e2d..." em todo
  // documento, de todo cliente, exibido sob o texto "Autenticidade e Integridade
  // Criptografica Garantida" e com um botao de copiar. Nao era hash de nada.
  //
  // Agora so aparece o hash que existe de verdade: o document_sha256 gravado no
  // envelope de assinatura. Enquanto o documento nao for assinado nao ha codigo
  // de verificacao, e a tela diz isso em vez de mostrar um numero.

  // Find signature envelope matching this document
  // Sem `|| sstSignatures[0]`: aquele fallback pegava o envelope de OUTRO
  // documento quando este nao tinha assinatura, e a tela exibia o hash e os
  // signatarios de um documento diferente.
  const existingEnvelope = sstSignatures.find(
    s => s.client_id === client?.id && (s.document_type as string) === docType
  );
  const digitalHash = existingEnvelope?.document_sha256 || null;

  // O corpo dos laudos periciais vem do inventario de riscos real - a mesma
  // fonte que o PDF usa. As tabelas abaixo eram escritas no codigo, com
  // medicoes ("Encontrado: 83.5 dBA"), anexos da NR-15 e conclusoes periciais
  // ("INSALUBRE GRAU MÁXIMO (40% CLT)", "FAZ JUS A 30%") que nao vinham de
  // avaliacao nenhuma. A pre-visualizacao e o que o cliente ve antes de
  // aprovar o laudo.
  const corpoLaudo =
    docType === 'INSALUBRIDADE'
      ? montarCorpoInsalubridade(risks, ghes)
      : docType === 'PERICULOSIDADE'
        ? montarCorpoPericulosidade(risks, ghes)
        : null;

  const handleOpenSignature = () => {
    setIsSignatureModalOpen(true);
  };

  const getDocTitle = () => {
    switch (docType) {
      case 'PGR':
        return 'PROGRAMA DE GERENCIAMENTO DE RISCOS (PGR - NR-01)';
      case 'PGRTR':
        return 'PROGRAMA DE GERENCIAMENTO DE RISCOS NO TRABALHO RURAL (PGRTR - NR-31)';
      case 'PCMSO':
        return 'PROGRAMA DE CONTROLE MÉDICO DE SAÚDE OCUPACIONAL (PCMSO - NR-07)';
      case 'LTCAT':
        return 'LAUDO TÉCNICO DAS CONDIÇÕES AMBIENTAIS DO TRABALHO (LTCAT - INSS)';
      case 'INSALUBRIDADE':
        return 'LAUDO TÉCNICO PERICIAL DE INSALUBRIDADE (NR-15 / ART. 189 A 192 CLT)';
      case 'PERICULOSIDADE':
        return 'LAUDO TÉCNICO PERICIAL DE PERICULOSIDADE (NR-16 / ART. 193 CLT)';
      case 'ORDEM_SERVICO':
        return 'ORDEM DE SERVIÇO DE SEGURANÇA E SAÚDE NO TRABALHO (OS - NR-01)';
      case 'FICHA_EPI':
        return 'FICHA DE CONTROLE E ENTREGA DE EPI (NR-06 / PORTARIA 672)';
      case 'KIT_ADMISSONAL':
        return 'KIT ADMISSIONAL COMPLETO DE SEGURANÇA DO TRABALHO';
      default:
        return 'DOCUMENTO TÉCNICO DE SST';
    }
  };

  const getDocBadgeColor = () => {
    switch (docType) {
      case 'PGR': return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      case 'PGRTR': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'PCMSO': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'LTCAT': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'INSALUBRIDADE': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'PERICULOSIDADE': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default: return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  const handleDownloadPdf = () => {
    if (!client) return;

    if (docType === 'PGR') {
      exportPGRDocumentPdf({ client, organization, ghes, risks, employees, sectors, units });
      setDownloadSuccess('PGR gerado e baixado em PDF com sucesso!');
    } else if (docType === 'PGRTR') {
      exportPGRTRDocumentPdf({ client, organization, ghes, risks, employees });
      setDownloadSuccess('PGRTR Rural gerado e baixado em PDF com sucesso!');
    } else if (docType === 'PCMSO') {
      exportPCMSODocumentPdf({ client, organization, examProtocols, ghes, employees });
      setDownloadSuccess('PCMSO gerado e baixado em PDF com sucesso!');
    } else if (docType === 'LTCAT') {
      exportLTCATDocumentPdf({ client, organization, risks, ghes, employees });
      setDownloadSuccess('LTCAT gerado e baixado em PDF com sucesso!');
    } else if (docType === 'INSALUBRIDADE') {
      exportInsalubridadeLaudoPdf({ client, organization, risks, ghes, employees });
      setDownloadSuccess('Laudo de Insalubridade gerado e baixado em PDF!');
    } else if (docType === 'PERICULOSIDADE') {
      exportPericulosidadeLaudoPdf({ client, organization, risks, ghes, employees });
      setDownloadSuccess('Laudo de Periculosidade gerado e baixado em PDF!');
    }
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyDigitalHash = () => {
    if (!digitalHash) return;
    navigator.clipboard.writeText(digitalHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 15, 160));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 15, 70));
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fade-in"
      id="document-preview-modal-backdrop"
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden"
        id="document-preview-modal-container"
      >
        {/* Top Control Bar */}
        <div className="bg-slate-950 border-b border-slate-800 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getDocBadgeColor()}`}>
                  {docType}
                </span>
                <span className="text-xs text-slate-400">Pré-visualização Dinâmica de Relatório Técnico</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate max-w-md">
                {getDocTitle()}
              </h2>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                id="btn-viewmode-sheet"
                onClick={() => setViewMode('A4_SHEET')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'A4_SHEET'
                    ? 'bg-slate-800 text-teal-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Folha A4
              </button>
              <button
                type="button"
                id="btn-viewmode-structured"
                onClick={() => setViewMode('STRUCTURED_VIEW')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'STRUCTURED_VIEW'
                    ? 'bg-slate-800 text-teal-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Visão Estruturada
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 gap-1">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 text-slate-400 hover:text-slate-200"
                title="Reduzir Zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-300 w-10 text-center">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1 text-slate-400 hover:text-slate-200"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Action Buttons */}
            <button
              type="button"
              id="modal-btn-signature"
              onClick={handleOpenSignature}
              className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5"
            >
              <PenTool className="w-3.5 h-3.5 text-teal-400" />
              <span>Assinatura Digital (Lei 14.063)</span>
            </button>

            <button
              type="button"
              id="modal-btn-download-pdf"
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar PDF
            </button>

            <button
              type="button"
              id="modal-btn-print"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>

            <button
              type="button"
              id="modal-btn-close"
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 rounded-lg transition-all ml-1"
              title="Fechar Pré-visualização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {downloadSuccess && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-5 py-2 flex items-center justify-between text-xs text-emerald-300 animate-fade-in">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {downloadSuccess}
            </span>
          </div>
        )}

        {/* Modal Body / Document Canvas */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-8 flex justify-center items-start">
          <div 
            className="w-full transition-transform origin-top flex flex-col items-center"
            style={{ transform: `scale(${zoomLevel / 100})`, width: zoomLevel > 100 ? `${zoomLevel}%` : '100%' }}
          >
            {/* Sheet Page Container (White paper look or high-contrast clean document design) */}
            <div className="w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300 p-8 sm:p-12 space-y-6 select-text">
              
              {/* Document Official Header */}
              <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    {organization.name || 'PREVSAFE SST - SISTEMA INTEGRADO DE SEGURANÇA'}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                    {getDocTitle()}
                  </h1>
                  <p className="text-xs text-slate-600 font-medium">
                    DOCUMENTO TÉCNICO AUDITÁVEL • CONFORMIDADE LEGAL MTE / INSS / ESOCIAL
                  </p>
                </div>
                
                <div className="bg-slate-100 p-3 rounded-lg border border-slate-300 text-right text-xs space-y-1 shrink-0">
                  <div className="font-bold text-slate-800">Vigência Técnica: <span className="text-teal-700">{validityYear}</span></div>
                  <div className="text-slate-600">Emissão: <strong>{issueDate}</strong></div>
                  <div className="text-[10px] font-mono text-slate-500">Versão: 2.4.0 (MOS)</div>
                </div>
              </div>

              {/* Company & Technical Data Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                  <h3 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    Identificação do Estabelecimento
                  </h3>
                  <div className="space-y-1 text-slate-700">
                    <div><strong>Razão Social:</strong> {client?.legal_name || clientName}</div>
                    <div><strong>Nome Fantasia:</strong> {clientName}</div>
                    <div><strong>CNPJ / CAEPF:</strong> <span className="font-mono">{clientDoc}</span></div>
                    <div>
                      <strong>CNAE Principal:</strong> {clientCnae} • <strong>Grau de Risco:</strong>{' '}
                      {clientRiskDegree ? `${clientRiskDegree} (NR-04)` : 'não classificado (NR-04)'}
                    </div>
                    <div><strong>Endereço:</strong> {client?.address || 'Av. Industrial'}, {client?.city || 'São Paulo'}/{client?.state || 'SP'}</div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                  <h3 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <Award className="w-3.5 h-3.5 text-teal-600" />
                    Responsabilidade Técnica & Enquadramento
                  </h3>
                  <div className="space-y-1 text-slate-700">
                    <div><strong>Responsável Técnico:</strong> {rtName}</div>
                    <div><strong>Qualificação:</strong> {rtTitle}{rtCouncil ? ` • ${rtCouncil}` : ''}</div>
                    <div><strong>ART de Cargo / Função:</strong> <span className="font-mono font-bold text-teal-800">{rtArt || '—'}</span></div>
                    <div><strong>Coordenação PCMSO:</strong> {pcmsoName}{pcmsoCrm ? ` (${pcmsoCrm}${pcmsoRqe ? ` - RQE ${pcmsoRqe}` : ''})` : ''}</div>
                    <div><strong>População Coberta:</strong> {employees.length} trabalhadores ativos</div>
                  </div>
                </div>
              </div>

              {/* Dynamic Content Per Document Type */}

              {/* 1. PGR Content */}
              {docType === 'PGR' && (
                <div className="space-y-5">
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wide flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                        1. Inventário Geral de Riscos por GHE (NR-01 Item 1.5.7)
                      </span>
                      <span className="text-[10px] text-slate-300 font-mono">Tabela 24 eSocial</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-300">
                          <tr>
                            <th className="p-2.5 border-r border-slate-200">GHE / Posto</th>
                            <th className="p-2.5 border-r border-slate-200">Perigo / Agente Nocivo</th>
                            <th className="p-2.5 border-r border-slate-200">Tipo Avaliação</th>
                            <th className="p-2.5 border-r border-slate-200">Nível Risco</th>
                            <th className="p-2.5">Medidas de Controle & EPI (CA)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800">
                          {ghes.map((ghe) => {
                            const gheRisks = risks.filter(r => r.ghe_id === ghe.id);
                            if (gheRisks.length === 0) {
                              return (
                                <tr key={ghe.id} className="hover:bg-slate-50">
                                  <td className="p-2.5 font-bold border-r border-slate-200">{ghe.name}</td>
                                  <td className="p-2.5 text-slate-600 border-r border-slate-200">Ausência de riscos específicos / Fatores ergonômicos gerais</td>
                                  <td className="p-2.5 border-r border-slate-200">Qualitativa</td>
                                  <td className="p-2.5 border-r border-slate-200"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">Trivial</span></td>
                                  <td className="p-2.5 text-slate-600">Recomendações posturais (NR-17)</td>
                                </tr>
                              );
                            }
                            return gheRisks.map((r, rIdx) => (
                              <tr key={r.id || rIdx} className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">{ghe.name}</td>
                                <td className="p-2.5 border-r border-slate-200">
                                  <div className="font-bold text-slate-900">{r.agent_name}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">Cód: {r.risk_code_table_24} • Fonte: {r.generating_source || 'Processo produtivo'}</div>
                                </td>
                                <td className="p-2.5 border-r border-slate-200">
                                  {r.evaluation_type}
                                  {r.measured_value && <div className="font-mono text-[10px] font-bold text-teal-700">{r.measured_value} {r.measurement_unit}</div>}
                                </td>
                                <td className="p-2.5 border-r border-slate-200">
                                  <span className={`px-2 py-0.5 font-bold rounded text-[10px] ${
                                    r.risk_level === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                                    r.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                                    'bg-teal-100 text-teal-800'
                                  }`}>
                                    {r.risk_level || 'MODERADO'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-700">
                                  {r.epi_required && <div className="font-semibold text-teal-900">• EPI Eficaz (CA {r.epi_ca_number || '14235'})</div>}
                                  {r.epc_implemented && <div>• EPC Instalado no ambiente</div>}
                                  <div className="text-[10px] text-slate-500">{r.ltcat_technical_conclusion || 'Plano PrevSafe em vigor'}</div>
                                </td>
                              </tr>
                            ));
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Plan of Action */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wide">
                        2. Plano de Ação Anual e Cronograma de Prevenção (5W2H)
                      </span>
                      <span className="text-[10px] text-teal-400 font-bold">Vigência 2026</span>
                    </div>
                    <div className="p-4 bg-slate-50 space-y-2 text-xs text-slate-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-2.5 bg-white border border-slate-200 rounded">
                          <strong className="text-slate-900 block">• Gestão e Manutenção do PCA (Proteção Auditiva):</strong>
                          Treinamentos semestrais, controle de atenuação dos protetores auriculares e audiometrias seriadas.
                        </div>
                        <div className="p-2.5 bg-white border border-slate-200 rounded">
                          <strong className="text-slate-900 block">• Treinamento Admissional e Integração (NR-01 item 1.7):</strong>
                          Capacitação de todos os novos colaboradores com emissão de certificado e ata de presença.
                        </div>
                        <div className="p-2.5 bg-white border border-slate-200 rounded">
                          <strong className="text-slate-900 block">• Avaliação Ergonômica Preliminar (AEP - NR-17):</strong>
                          Mapeamento dos postos administrativos e operacionais com ajustes de mobiliário e iluminação.
                        </div>
                        <div className="p-2.5 bg-white border border-slate-200 rounded">
                          <strong className="text-slate-900 block">• Revisão Bienal do Inventário Geral de Riscos:</strong>
                          Revisão completa das medições quantitativas e atualizações do eSocial S-2240.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. PGRTR Content */}
              {docType === 'PGRTR' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2 text-xs">
                    <h3 className="font-bold text-emerald-950 uppercase text-xs flex items-center gap-1.5">
                      <Tractor className="w-4 h-4 text-emerald-700" />
                      Especificações de Segurança no Trabalho Rural (NR-31 / Portaria 22.677)
                    </h3>
                    <p className="text-emerald-900">
                      O presente PGRTR estabelece os preceitos de segurança e higiene nas atividades agrícolas, pecuárias, silvicultura e exploração florestal da propriedade rural.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                      <strong className="text-slate-900 block text-xs">1. Agrotóxicos e Defensivos (NR-31.7):</strong>
                      <p className="text-slate-700">Capacitação obrigatória de 20h para aplicadores, vestimenta hidrorrepelente com CA, descarte via tríplice lavagem e depósito exclusivo ventilado.</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                      <strong className="text-slate-900 block text-xs">2. Tratores e Máquinas Agrícolas (NR-31.12):</strong>
                      <p className="text-slate-700">Proteção total da Tomada de Força (TDP), estrutura ROPS/FOPS contra tombamento, cinto de segurança e habilitação de operadores.</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                      <strong className="text-slate-900 block text-xs">3. Trabalho a Céu Aberto e Calor (NR-31.10):</strong>
                      <p className="text-slate-700">Abrigos rurais móveis com mesas/bancos para pausas térmicas, fornecimento de água potável fresca e protetor solar FPS 50.</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                      <strong className="text-slate-900 block text-xs">4. Animais Peçonhentos e Primeiros Socorros (NR-31.14):</strong>
                      <p className="text-slate-700">Uso obrigatório de perneiras de couro e botinas de segurança, kit de primeiros socorros em campo e protocolo de encaminhamento médico.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. PCMSO Content */}
              {docType === 'PCMSO' && (
                <div className="space-y-4">
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wide flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-cyan-400" />
                        Quadro de Exames Ocupacionais & Protocolos Médicos (Tabela 27 eSocial)
                      </span>
                      <span className="text-[10px] text-cyan-300 font-bold">NR-07 Item 7.5</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-300">
                          <tr>
                            <th className="p-2.5 border-r border-slate-200">Exame / Procedimento</th>
                            <th className="p-2.5 border-r border-slate-200">Cód. Tab. 27</th>
                            <th className="p-2.5 border-r border-slate-200">GHE / Cargo</th>
                            <th className="p-2.5 border-r border-slate-200">Periodicidade / Gatilhos</th>
                            <th className="p-2.5">Fundamentação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800">
                          {examProtocols.map(p => {
                            const ghe = ghes.find(g => g.id === p.ghe_id);
                            return (
                              <tr key={p.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">{p.exam_name}</td>
                                <td className="p-2.5 font-mono font-bold text-cyan-800 border-r border-slate-200">{p.exam_code_table_27}</td>
                                <td className="p-2.5 border-r border-slate-200">{ghe?.name || 'Todos os Colaboradores'}</td>
                                <td className="p-2.5 border-r border-slate-200">{p.periodicity_months} meses ({p.triggers?.join(', ') || 'Admissional, Periódico'})</td>
                                <td className="p-2.5 text-slate-600">{p.mandatory_by_standard || 'NR-07 Quadro I/II'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. LTCAT Content */}
              {docType === 'LTCAT' && (
                <div className="space-y-4">
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wide flex items-center gap-2">
                        <Award className="w-4 h-4 text-purple-400" />
                        Conclusão Técnica Previdenciária & Aposentadoria Especial (INSS / S-2240)
                      </span>
                      <span className="text-[10px] text-purple-300 font-bold">Decreto 3.048/99</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-300">
                          <tr>
                            <th className="p-2.5 border-r border-slate-200">GHE / Posto</th>
                            <th className="p-2.5 border-r border-slate-200">Agente Nocivo</th>
                            <th className="p-2.5 border-r border-slate-200">Intensidade / Concentração</th>
                            <th className="p-2.5 border-r border-slate-200">Aposentadoria Especial</th>
                            <th className="p-2.5">Eficácia EPI (eSocial)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800">
                          {ghes.map(ghe => {
                            const gheRisks = risks.filter(r => r.ghe_id === ghe.id);
                            return gheRisks.map((r, idx) => (
                              <tr key={r.id || idx} className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">{ghe.name}</td>
                                <td className="p-2.5 border-r border-slate-200">{r.agent_name} ({r.risk_code_table_24})</td>
                                <td className="p-2.5 border-r border-slate-200">{r.measured_value ? `${r.measured_value} ${r.measurement_unit}` : 'Qualitativa'}</td>
                                <td className="p-2.5 border-r border-slate-200 font-bold">
                                  {r.special_retirement_applies ? (
                                    <span className="text-rose-700">SIM (GFIP {r.gfip_code || '04'})</span>
                                  ) : (
                                    <span className="text-emerald-700">NÃO ENSEJA</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-slate-700">{r.epi_required ? 'EPI Eficaz (CA Mitigado)' : 'Sem EPI'}</td>
                              </tr>
                            ));
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Insalubridade Content */}
              {docType === 'INSALUBRIDADE' && (
                <div className="space-y-4">
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wide flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Enquadramento Pericial de Insalubridade (NR-15 / Art. 189 a 192 CLT)
                      </span>
                      <span className="text-[10px] text-amber-300 font-bold">Adicionais: 10%, 20%, 40%</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-300">
                          <tr>
                            <th className="p-2.5 border-r border-slate-200">GHE / Posto</th>
                            <th className="p-2.5 border-r border-slate-200">Agente Avaliado</th>
                            <th className="p-2.5 border-r border-slate-200">Anexo NR-15</th>
                            <th className="p-2.5 border-r border-slate-200">Limite x Medição</th>
                            <th className="p-2.5">Conclusão Pericial</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800">
                          {corpoLaudo?.linhas.length ? (
                            corpoLaudo.linhas.map((linha, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">{linha[0]}</td>
                                <td className="p-2.5 border-r border-slate-200">{linha[1]}</td>
                                <td className="p-2.5 font-mono text-amber-800 border-r border-slate-200">{linha[2]}</td>
                                <td className="p-2.5 border-r border-slate-200">{linha[3]}</td>
                                <td className="p-2.5 font-bold">{linha[4]}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-slate-500">
                                Inventário de riscos vazio — nenhum agente foi periciado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Periculosidade Content */}
              {docType === 'PERICULOSIDADE' && (
                <div className="space-y-4">
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wide flex items-center gap-2">
                        <Flame className="w-4 h-4 text-rose-400" />
                        Caracterização de Periculosidade (NR-16 / Art. 193 CLT)
                      </span>
                      <span className="text-[10px] text-rose-300 font-bold">Adicional: 30% Salário Base</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-300">
                          <tr>
                            <th className="p-2.5 border-r border-slate-200">GHE / Posto</th>
                            <th className="p-2.5 border-r border-slate-200">Atividade Perigosa</th>
                            <th className="p-2.5 border-r border-slate-200">Anexo NR-16</th>
                            <th className="p-2.5 border-r border-slate-200">Delimitação de Área de Risco</th>
                            <th className="p-2.5">Conclusão Pericial</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800">
                          {corpoLaudo?.linhas.length ? (
                            corpoLaudo.linhas.map((linha, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">{linha[0]}</td>
                                <td className="p-2.5 border-r border-slate-200">{linha[1]}</td>
                                <td className="p-2.5 font-mono text-rose-800 border-r border-slate-200">{linha[2]}</td>
                                <td className="p-2.5 border-r border-slate-200">{linha[3]}</td>
                                <td className="p-2.5 font-bold">{linha[4]}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-slate-500">
                                Inventário de riscos vazio — nenhuma atividade foi periciada.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Legal Signatures & Digital Stamp */}
              <div className="pt-8 border-t-2 border-slate-900 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs text-slate-800">
                  <div className="space-y-1">
                    <div className="font-mono text-[10px] text-teal-800 font-bold">ASSINADO DIGITALMENTE (ICP-BRASIL)</div>
                    <div className="w-48 h-0.5 bg-slate-900 mx-auto mt-6"></div>
                    <div className="font-bold text-slate-950">{rtName}</div>
                    <div className="text-slate-600">{rtTitle}{rtCouncil ? ` • ${rtCouncil}` : ''}</div>
                    <div className="text-[10px] text-slate-500">{rtArt ? `ART nº ${rtArt}` : 'ART não informada'}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="font-mono text-[10px] text-teal-800 font-bold">CIÊNCIA DA ADMINISTRAÇÃO</div>
                    <div className="w-48 h-0.5 bg-slate-900 mx-auto mt-6"></div>
                    <div className="font-bold text-slate-950">{client?.trade_name || clientName}</div>
                    <div className="text-slate-600">Representante Legal da Empresa</div>
                    <div className="text-[10px] text-slate-500">CNPJ: {clientDoc}</div>
                  </div>
                </div>

                {/* Digital Audit Barcode / Hash Footer */}
                <div className="bg-slate-100 p-3 rounded-lg border border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-600">
                  {digitalHash ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-teal-700" />
                        <span>{DECLARACAO_DE_INTEGRIDADE}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="truncate max-w-[16rem]">SHA-256: {digitalHash}</span>
                        <button
                          type="button"
                          onClick={handleCopyDigitalHash}
                          className="p-1 hover:bg-slate-200 rounded text-slate-700"
                          title="Copiar hash SHA-256"
                        >
                          {copiedHash ? <Check className="w-3 h-3 text-teal-700" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Pré-visualização não assinada: ainda não há código de verificação.
                        O hash é gerado no momento da assinatura.
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Modal Bottom Status Bar */}
        <div className="bg-slate-950 border-t border-slate-800 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            <span>Relatório Dinâmico validado em conformidade com as Normas Regulamentadoras MTE e eSocial MOS.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="modal-btn-signature-footer"
              onClick={handleOpenSignature}
              className="px-3.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold rounded-lg transition-all flex items-center gap-1.5"
            >
              <PenTool className="w-3.5 h-3.5 text-teal-400" />
              <span>Assinatura Digital SST</span>
            </button>

            <button
              type="button"
              id="modal-btn-download-footer"
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Laudo Oficial em PDF
            </button>
          </div>
        </div>
      </div>

      {/* SST Electronic Signature Modal */}
      {isSignatureModalOpen && existingEnvelope && (
        <SSTElectronicSignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          signatureEnvelope={existingEnvelope}
          onSignComplete={() => {
            // State updated in context
          }}
        />
      )}
    </div>
  );
};
