import { jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { 
  ServiceOrder, 
  ESocialEvent, 
  Client, 
  Organization, 
  UserProfile,
  ServiceStage,
  ServiceTask,
  SSTWorkOrderOS,
  Employee,
  EPIDeliveryRecord,
  EPICatalogItem,
  SSTIntegrationTraining,
  TrainingAttendee
} from '@/types';
import * as XLSX from 'xlsx';
import { formatDate } from '@/lib/utils';

// Helper to format currency
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

interface ExportServiceSummaryOptions {
  title?: string;
  subtitle?: string;
  filterStatus?: string;
  organization: Organization;
  clients: Client[];
  serviceOrders: ServiceOrder[];
  profiles?: UserProfile[];
}

interface ExportSingleOSOptions {
  organization: Organization;
  client?: Client;
  serviceOrder: ServiceOrder;
  profiles?: UserProfile[];
}

interface ExportESocialEventsOptions {
  title?: string;
  organization: Organization;
  clients: Client[];
  events: ESocialEvent[];
  filterType?: string;
  filterStatus?: string;
}

/**
 * Adds standard PrevSafe SST Header & Footer to a jsPDF document
 */
function applyDocumentTheme(
  doc: jsPDF, 
  title: string, 
  subtitle: string, 
  organization: Organization
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name || organization.legal_name || 'PREVSAFE SST', 14, 12);

  // Document Title in Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Sistema de Gestão Ocupacional e eSocial SST`, 14, 18);

  // Date/Time on the right
  const nowStr = `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  doc.setFontSize(8);
  doc.text(`Gerado em: ${nowStr}`, pageWidth - 14, 12, { align: 'right' });
  doc.text(`Doc: ${organization.document_number || 'PrevSafe Enterprise'}`, pageWidth - 14, 18, { align: 'right' });

  // Accent Line
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Document Title in body
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 40);

  // Subtitle
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(subtitle, 14, 46);
  }
}

/**
 * Adds footer with page numbers
 */
function applyPageNumbers(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');

    // Bottom line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.text(`PrevSafe SST - Plataforma Integrada de Saúde e Segurança do Trabalho`, 14, pageHeight - 7);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
}

/**
 * Export a complete summary report of Service Orders (OS) to PDF
 */
export function exportServiceOrdersSummaryPdf({
  title = 'Relatório Geral de Ordens de Serviço (SST)',
  subtitle = 'Resumo consolidado de entregas técnicas, status de SLA e prazos vigentes',
  organization,
  clients,
  serviceOrders,
  profiles = []
}: ExportServiceSummaryOptions) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  applyDocumentTheme(doc, title, subtitle, organization);

  // Summary Metrics Banner
  const total = serviceOrders.length;
  const inProgress = serviceOrders.filter(o => o.status === 'IN_PROGRESS' || o.status === 'READY' || o.status === 'SCHEDULED').length;
  const completed = serviceOrders.filter(o => o.status === 'COMPLETED' || o.status === 'ACCEPTED').length;
  const delayed = serviceOrders.filter(o => {
    if (o.status === 'COMPLETED' || o.status === 'CANCELLED') return false;
    return new Date(o.due_date) < new Date();
  }).length;
  const rework = serviceOrders.filter(o => o.status === 'REWORK').length;

  const startY = subtitle ? 52 : 46;

  // KPI boxes in PDF
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, 269, 14, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, 269, 14, 2, 2, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Total de O.S.: ${total}`, 20, startY + 9);

  doc.setTextColor(79, 70, 229);
  doc.text(`Em Andamento: ${inProgress}`, 75, startY + 9);

  doc.setTextColor(22, 163, 74);
  doc.text(`Concluídas/Aceitas: ${completed}`, 135, startY + 9);

  doc.setTextColor(220, 38, 38);
  doc.text(`Atrasadas (Fora do SLA): ${delayed}`, 200, startY + 9);

  if (rework > 0) {
    doc.setTextColor(217, 119, 6);
    doc.text(`Em Retrabalho: ${rework}`, 255, startY + 9);
  }

  // Prepare table rows
  const tableData = serviceOrders.map(os => {
    const client = clients.find(c => c.id === os.client_id);
    const clientName = client?.trade_name || client?.legal_name || 'Cliente';
    const isDelayed = os.status !== 'COMPLETED' && os.status !== 'CANCELLED' && new Date(os.due_date) < new Date();
    
    // Status translation
    let statusLabel: string = os.status;
    if (os.status === 'IN_PROGRESS') statusLabel = 'EM ANDAMENTO';
    else if (os.status === 'COMPLETED') statusLabel = 'CONCLUÍDA';
    else if (os.status === 'ACCEPTED') statusLabel = 'ACEITA';
    else if (os.status === 'WAITING_ACCEPTANCE') statusLabel = 'AGUARD. ACEITE';
    else if (os.status === 'REWORK') statusLabel = 'RETRABALHO';
    else if (os.status === 'SCHEDULED') statusLabel = 'AGENDADA';
    else if (os.status === 'CANCELLED') statusLabel = 'CANCELADA';

    const completedStages = os.stages.filter(s => s.status === 'COMPLETED').length;
    const totalStages = os.stages.length;
    const progress = totalStages > 0 ? `${Math.round((completedStages / totalStages) * 100)}% (${completedStages}/${totalStages})` : '100%';

    return [
      os.os_number || `OS-${os.id.slice(0, 5).toUpperCase()}`,
      clientName,
      os.title,
      os.technical_responsible_name || 'Técnico Responsável',
      formatDate(os.due_date),
      isDelayed ? `${statusLabel} (ATRASADA)` : statusLabel,
      progress
    ];
  });

  autoTable(doc, {
    startY: startY + 18,
    head: [['Nº OS', 'Cliente', 'Serviço / Escopo', 'Responsável Técnico', 'Prazo SLA', 'Status', 'Progresso']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      valign: 'middle'
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold' },
      1: { cellWidth: 46 },
      2: { cellWidth: 70 },
      3: { cellWidth: 42 },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 35, halign: 'center' },
      6: { cellWidth: 26, halign: 'center' }
    },
    didParseCell: (data) => {
      // Highlight delayed or rework rows in status column
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw);
        if (text.includes('ATRASADA')) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('CONCLUÍDA') || text.includes('ACEITA')) {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('RETRABALHO')) {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  applyPageNumbers(doc);

  const filename = `relatorio-ordens-servico-sst-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Export an individual Service Order (OS) Detailed Dossier to PDF
 */
export function exportSingleServiceOrderPdf({
  organization,
  client,
  serviceOrder,
  profiles = []
}: ExportSingleOSOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const title = `Dossiê Técnico da O.S.: ${serviceOrder.os_number || 'OS-' + serviceOrder.id.slice(0, 6)}`;
  const subtitle = `Cliente: ${client?.trade_name || client?.legal_name || 'Cliente'} | CNPJ: ${client?.document_number || 'N/A'}`;

  applyDocumentTheme(doc, title, subtitle, organization);

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 54;

  // OS Overview Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, pageWidth - 28, 38, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, pageWidth - 28, 38, 2, 2, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('DADOS GERAIS DA ORDEM DE SERVIÇO', 18, currentY + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  doc.text(`Título / Escopo: ${serviceOrder.title}`, 18, currentY + 14);
  doc.text(`Responsável Técnico: ${serviceOrder.technical_responsible_name || 'N/A'}`, 18, currentY + 20);
  doc.text(`Gestor Operacional: ${serviceOrder.manager_name || 'Engenharia de Segurança SST'}`, 18, currentY + 26);
  doc.text(`Prazo Final (SLA): ${formatDate(serviceOrder.due_date)}`, 18, currentY + 32);

  // Right column inside overview
  const col2X = pageWidth / 2 + 10;
  doc.text(`Status Atual: ${serviceOrder.status}`, col2X, currentY + 14);
  doc.text(`Prioridade: ${serviceOrder.priority}`, col2X, currentY + 20);
  doc.text(`Pausa de SLA: ${serviceOrder.sla_is_paused ? 'SIM (Aguardando Retorno do Cliente)' : 'NÃO (SLA Ativo)'}`, col2X, currentY + 26);
  doc.text(`Data de Abertura: ${formatDate(serviceOrder.created_at)}`, col2X, currentY + 32);

  currentY += 46;

  // Stages and tasks breakdown table
  const stagesData: any[] = [];
  serviceOrder.stages.forEach((stage, sIdx) => {
    stagesData.push([
      `Etapa ${sIdx + 1}`,
      stage.name,
      stage.status === 'COMPLETED' ? 'CONCLUÍDA' : stage.status === 'WAITING_CLIENT' ? 'AGUARD. CLIENTE' : 'EM ANDAMENTO',
      `${stage.progress || 0}%`,
      stage.completed_at ? formatDate(stage.completed_at) : '-'
    ]);

    // Add sub-tasks if any
    stage.tasks.forEach((t, tIdx) => {
      stagesData.push([
        `   └ Tarefa ${sIdx + 1}.${tIdx + 1}`,
        `   ${t.name}`,
        t.status === 'COMPLETED' ? 'OK' : 'PENDENTE',
        `-`,
        t.due_date ? formatDate(t.due_date) : '-'
      ]);
    });
  });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('CRONOGRAMA DE ETAPAS E TAREFAS TÉCNICAS', 14, currentY);

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Item', 'Descrição da Etapa / Tarefa', 'Status', 'Horas Estimadas', 'Data Conclusão / Prazo']],
    body: stagesData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 75 },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 26, halign: 'center' }
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const itemText = String(data.row.raw[0] || '');
        if (itemText.includes('└')) {
          data.cell.styles.fillColor = [248, 250, 252];
          data.cell.styles.textColor = [100, 116, 139];
          data.cell.styles.fontSize = 7.5;
        } else {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // Observations / Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 12;

  if (finalY < 230) {
    // Signature block
    doc.setDrawColor(15, 23, 42);
    doc.line(20, finalY + 25, 90, finalY + 25);
    doc.line(pageWidth - 90, finalY + 25, pageWidth - 20, finalY + 25);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(serviceOrder.technical_responsible_name || 'Responsável Técnico SST', 55, finalY + 29, { align: 'center' });
    doc.text(client?.trade_name || client?.legal_name || 'Representante Legal do Cliente', pageWidth - 55, finalY + 29, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('PrevSafe Engenharia e Medicina do Trabalho', 55, finalY + 33, { align: 'center' });
    doc.text('Aceite Técnico / Validação de Entrega', pageWidth - 55, finalY + 33, { align: 'center' });
  }

  applyPageNumbers(doc);

  const filename = `dossie-os-${(serviceOrder.os_number || serviceOrder.id).replace(/\s+/g, '-').toLowerCase()}.pdf`;
  doc.save(filename);
}

/**
 * Export eSocial Event Logs and Transmission Statuses to PDF
 */
export function exportESocialEventLogsPdf({
  title = 'Relatório de Logs e Transmissões eSocial SST',
  organization,
  clients,
  events,
  filterType,
  filterStatus
}: ExportESocialEventsOptions) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const subtitle = `Ambiente: ${organization.name || 'Produção'} | Eventos Oficiais: S-2210 (CAT), S-2220 (ASO), S-2230 (Afastamento), S-2240 (Riscos Ambientais), S-3000 (Exclusão)`;

  applyDocumentTheme(doc, title, subtitle, organization);

  const startY = 52;

  // KPI Metrics Banner
  const total = events.length;
  const success = events.filter(e => e.status === 'SUCCESS').length;
  const ready = events.filter(e => e.status === 'READY_TO_SEND' || e.status === 'DRAFT' || e.status === 'VALIDATED').length;
  const processing = events.filter(e => e.status === 'PROCESSING').length;
  const rejected = events.filter(e => e.status === 'REJECTED').length;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, 269, 14, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, 269, 14, 2, 2, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Total de Eventos: ${total}`, 20, startY + 9);

  doc.setTextColor(22, 163, 74);
  doc.text(`Transmitidos com Sucesso (Protocolados): ${success}`, 75, startY + 9);

  doc.setTextColor(79, 70, 229);
  doc.text(`Prontos / Validados: ${ready}`, 160, startY + 9);

  doc.setTextColor(220, 38, 38);
  doc.text(`Rejeitados / Inconsistências: ${rejected}`, 215, startY + 9);

  // Prepare table rows
  const tableData = events.map(evt => {
    const client = clients.find(c => c.id === evt.client_id);
    const clientName = client?.trade_name || client?.legal_name || 'Cliente';

    let statusLabel: string = evt.status;
    if (evt.status === 'SUCCESS') statusLabel = 'SUCESSO (RECIBO)';
    else if (evt.status === 'READY_TO_SEND') statusLabel = 'PRONTO P/ ENVIO';
    else if (evt.status === 'PROCESSING') statusLabel = 'PROCESSANDO NO GOV';
    else if (evt.status === 'REJECTED') statusLabel = 'REJEITADO (ERRO)';
    else if (evt.status === 'DRAFT') statusLabel = 'RASCUNHO';
    else if (evt.status === 'VALIDATED') statusLabel = 'VALIDADO (XML OK)';

    const receiptOrError = evt.receipt_number 
      ? `Recibo: ${evt.receipt_number}` 
      : evt.validation_errors?.length 
        ? `Erro: ${evt.validation_errors[0]}` 
        : evt.protocol_number 
          ? `Prot: ${evt.protocol_number}` 
          : 'Aguardando Lote';

    return [
      evt.event_type,
      clientName,
      evt.worker_name || 'Trabalhador',
      evt.worker_cpf || 'CPF',
      evt.worker_cbo || '-',
      evt.event_number || `Ambiente: ${evt.environment}`,
      statusLabel,
      receiptOrError,
      evt.transmitted_at ? formatDate(evt.transmitted_at) : (evt.created_at ? formatDate(evt.created_at) : '-')
    ];
  });

  autoTable(doc, {
    startY: startY + 18,
    head: [['Evento', 'Empresa / Empregador', 'Trabalhador', 'CPF', 'CBO', 'Ambiente / Cód.', 'Status Transmissão', 'Recibo / Diagnóstico eSocial', 'Data Evento']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      valign: 'middle'
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: 42 },
      2: { cellWidth: 38 },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 26, halign: 'center' },
      6: { cellWidth: 32, halign: 'center' },
      7: { cellWidth: 50 },
      8: { cellWidth: 19, halign: 'center' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const text = String(data.cell.raw);
        if (text.includes('SUCESSO')) {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('REJEITADO')) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('PRONTO') || text.includes('VALIDADO')) {
          data.cell.styles.textColor = [79, 70, 229];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  applyPageNumbers(doc);

  const filename = `relatorio-esocial-sst-logs-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Generates an official Ordem de Serviço (OS) Document PDF complying with NR-01 and Art. 157/158 CLT
 */
export function exportWorkOrderOSPDF(
  os: SSTWorkOrderOS, 
  organization: Organization,
  options?: { returnBlob?: boolean; saveFile?: boolean }
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const renderOSPageHeader = (pageNumber: number) => {
    // Header Bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(organization.name || 'PREVSAFE SST - GESTÃO OCUPACIONAL', margin, 10);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('ORDEM DE SERVIÇO DE SEGURANÇA E SAÚDE NO TRABALHO - NR-01 & ART. 157 CLT', margin, 16);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`CÓD: ${os.os_code} | REV: ${String(os.revision).padStart(2, '0')}`, pageWidth - margin, 10, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Emissão: ${formatDate(os.issue_date)}`, pageWidth - margin, 16, { align: 'right' });

    // Indigo accent line
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 24, pageWidth, 1.5, 'F');
  };

  renderOSPageHeader(1);

  let currentY = 32;

  // Title Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 14, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEM DE SERVIÇO - SEGURANÇA E MEDICINA DO TRABALHO (NR-01)', pageWidth / 2, currentY + 6, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Em cumprimento ao Art. 157, inciso II da CLT e item 1.4.1 da Norma Regulamentadora nº 01 do MTE', pageWidth / 2, currentY + 10.5, { align: 'center' });

  currentY += 18;

  // 1. DADOS DA EMPRESA E DO EMPREGADO
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '1. IDENTIFICAÇÃO DO EMPREGADOR E DO COLABORADOR', colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 } }
    ]],
    body: [
      [
        { content: 'Razão Social:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: os.employer_name, styles: { cellWidth: 65 } },
        { content: 'CNPJ:', styles: { fontStyle: 'bold', cellWidth: 22 } },
        { content: `${os.employer_document} | CNAE: ${os.employer_cnae || 'N/A'} (Grau ${os.employer_risk_grade || 2})`, styles: { cellWidth: 69 } }
      ],
      [
        { content: 'Estabelecimento:', styles: { fontStyle: 'bold' } },
        { content: `${os.employee_unit} - ${os.establishment_address || 'Matriz Operacional'}`, colSpan: 3 }
      ],
      [
        { content: 'Colaborador:', styles: { fontStyle: 'bold' } },
        { content: os.employee_name, styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: 'CPF / Matrícula:', styles: { fontStyle: 'bold' } },
        { content: `${os.employee_cpf} | Matr: ${os.employee_registration || 'S/N'}` }
      ],
      [
        { content: 'Cargo / Função:', styles: { fontStyle: 'bold' } },
        { content: `${os.employee_job_title} (CBO: ${os.employee_cbo})`, styles: { fontStyle: 'bold' } },
        { content: 'Setor / GHE:', styles: { fontStyle: 'bold' } },
        { content: `${os.employee_sector} | GHE: ${os.employee_ghe_name || 'GHE Padrão'}` }
      ],
      [
        { content: 'Admissão:', styles: { fontStyle: 'bold' } },
        { content: formatDate(os.employee_admission_date) },
        { content: 'Vigência OS:', styles: { fontStyle: 'bold' } },
        { content: `A partir de ${formatDate(os.validity_start_date)}` }
      ]
    ],
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 2. DESCRIÇÃO SUMÁRIA DAS ATIVIDADES
  const activitiesList = os.routine_activities?.length > 0 
    ? os.routine_activities.map((a, i) => `${i + 1}. ${a}`).join('\n')
    : os.job_description;

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '2. ATIVIDADES HABITUAIS E ROTINA DO POSTO DE TRABALHO', styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 } }
    ]],
    body: [[
      { content: activitiesList || 'Executar tarefas operacionais e administrativas conforme rotina do cargo.' }
    ]],
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 3. IDENTIFICAÇÃO DOS RISCOS AMBIENTAIS E OCUPACIONAIS
  const risksBody: any[] = [];
  if (os.physical_risks?.length) risksBody.push(['Físicos', os.physical_risks.join('; ')]);
  if (os.chemical_risks?.length) risksBody.push(['Químicos', os.chemical_risks.join('; ')]);
  if (os.biological_risks?.length) risksBody.push(['Biológicos', os.biological_risks.join('; ')]);
  if (os.ergonomic_risks?.length) risksBody.push(['Ergonômicos', os.ergonomic_risks.join('; ')]);
  if (os.accident_mechanical_risks?.length) risksBody.push(['Acidentes / Mecânicos', os.accident_mechanical_risks.join('; ')]);

  if (risksBody.length === 0) {
    risksBody.push(['Geral', 'Riscos inerentes às atividades normais de trabalho monitorados no PGR/PCMSO.']);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: 'Grupo de Risco', styles: { cellWidth: 40, fontStyle: 'bold' } },
      { content: 'Agentes Identificados / Fontes Geradoras / Intensidade', styles: { fontStyle: 'bold' } }
    ]],
    body: risksBody,
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontSize: 8
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252] }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 4. EQUIPAMENTOS DE PROTEÇÃO (EPC E EPI)
  const epiBody: any[] = [];
  if (os.collective_protections_epc && os.collective_protections_epc.length > 0) {
    epiBody.push([
      { content: 'EPC (Proteção Coletiva):', styles: { fontStyle: 'bold', cellWidth: 40, fillColor: [248, 250, 252] } },
      { content: os.collective_protections_epc.join(' • ') }
    ]);
  }
  if (os.mandatory_epis && os.mandatory_epis.length > 0) {
    const epiFormatted = os.mandatory_epis.map(e => `• ${e.epi_name} (C.A. ${e.ca_number || 'Válido'}) - ${e.usage_recommendation || 'Uso contínuo'}`).join('\n');
    epiBody.push([
      { content: 'EPIs Obrigatórios (NR-06):', styles: { fontStyle: 'bold', cellWidth: 40, fillColor: [248, 250, 252] } },
      { content: epiFormatted }
    ]);
  }

  if (epiBody.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [[
        { content: '3. MEDIDAS DE PROTEÇÃO COLETIVA (EPC) E INDIVIDUAL (EPI - NR-06)', colSpan: 2, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 } }
      ]],
      body: epiBody,
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        lineColor: [203, 213, 225],
        lineWidth: 0.2
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 4;
  }

  // Check if we need page break for obligations & procedures
  if (currentY > pageHeight - 80) {
    doc.addPage();
    renderOSPageHeader(2);
    currentY = 32;
  }

  // 5. PROCEDIMENTOS DE SEGURANÇA E OBRIGAÇÕES DO EMPREGADO
  const proceduresText = (os.safe_work_procedures || []).map((p, i) => `${i + 1}. ${p}`).join('\n');
  const obligationsText = (os.mandatory_employee_obligations || []).map((o, i) => `• ${o}`).join('\n');
  const prohibitionsText = (os.prohibitions_unsafe_acts || []).map((pr, i) => `✕ ${pr}`).join('\n');
  const emergencyText = (os.emergency_accident_conduct || []).map((em, i) => `! ${em}`).join('\n');

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '4. NORMAS, PROCEDIMENTOS E OBRIGAÇÕES LEGAIS (ART. 158 CLT & NR-01)', styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 } }
    ]],
    body: [
      [
        { content: 'A. PROCEDIMENTOS PREVENTIVOS E BOAS PRÁTICAS OPERACIONAIS:\n' + proceduresText, styles: { fillColor: [255, 255, 255] } }
      ],
      [
        { content: 'B. DEVERES E OBRIGAÇÕES DO EMPREGADO (Art. 158 CLT):\n' + obligationsText, styles: { fillColor: [248, 250, 252] } }
      ],
      [
        { content: 'C. PROIBIÇÕES EXPRESSAS E ATOS INSEGUROS:\n' + prohibitionsText, styles: { fillColor: [255, 241, 242], textColor: [159, 18, 57] } }
      ],
      [
        { content: 'D. CONDUTA EM CASO DE ACIDENTES, INCÊNDIO OU EMERGÊNCIAS:\n' + emergencyText, styles: { fillColor: [254, 243, 199], textColor: [146, 64, 14] } }
      ]
    ],
    styles: {
      fontSize: 7.2,
      cellPadding: 2.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // Check if we need page break for Sanctions and Signatures
  if (currentY > pageHeight - 65) {
    doc.addPage();
    renderOSPageHeader(doc.getNumberOfPages());
    currentY = 32;
  }

  // 6. DISPOSIÇÕES DISCIPLINARES E PENALIDADES (CLT ART. 482)
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '5. PENALIDADES DISCIPLINARES (ART. 158 C/C ART. 482 DA CLT)', styles: { fillColor: [159, 18, 57], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [[
      { content: os.disciplinary_sanctions_text || 'O descumprimento injustificado das diretrizes desta OS e das normas de segurança constitui ato faltoso passível das sanções da CLT (Advertência, Suspensão e Demissão por Justa Causa).' }
    ]],
    styles: {
      fontSize: 7,
      cellPadding: 2,
      lineColor: [254, 205, 211],
      lineWidth: 0.2,
      fillColor: [255, 245, 245],
      textColor: [136, 19, 55]
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 7. TERMO DE RECEBIMENTO, CIÊNCIA E COMPROMISSO
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '6. DECLARAÇÃO DE RECEBIMENTO, CIÊNCIA E COMPROMISSO', styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [[
      { content: `Declaro para todos os efeitos legais que recebi da empresa ${os.employer_name} a presente ORDEM DE SERVIÇO DE SEGURANÇA E SAÚDE NO TRABALHO, redigida de forma clara e objetiva. Declaro ainda que fui devidamente treinado(a) e orientado(a) quanto aos riscos de minha função, medidas preventivas e uso obrigatório de EPIs, comprometendo-me a cumprir integralmente todas as orientações nela constantes durante toda a vigência do meu contrato de trabalho.\n\nLocal e Data: ${os.establishment_address?.split(',')[0] || 'Sede da Empresa'}, ${formatDate(os.issue_date)}.` }
    ]],
    styles: {
      fontSize: 7.2,
      cellPadding: 2.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Signatures section
  const colWidth = (pageWidth - (margin * 2) - 10) / 2;

  // Employee Signature Box
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY + 12, margin + colWidth, currentY + 12);
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(os.employee_name, margin + (colWidth / 2), currentY + 16, { align: 'center' });
  
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`CPF: ${os.employee_cpf} | Matr: ${os.employee_registration || 'S/N'}`, margin + (colWidth / 2), currentY + 20, { align: 'center' });
  
  if (os.employee_signed) {
    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'bold');
    doc.text(`[✓ Assinado Eletronicamente / Biometria Facial - ${formatDate(os.signed_at || os.issue_date)}]`, margin + (colWidth / 2), currentY + 8, { align: 'center' });
    if (os.signature_hash) {
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Hash: ${os.signature_hash.substring(0, 32)}...`, margin + (colWidth / 2), currentY + 24, { align: 'center' });
    }
  } else {
    doc.setTextColor(148, 163, 184);
    doc.text('Assinatura do Colaborador (ou Coleta Biométrica)', margin + (colWidth / 2), currentY + 8, { align: 'center' });
  }

  // Engineer Signature Box
  const engX = margin + colWidth + 10;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(engX, currentY + 12, engX + colWidth, currentY + 12);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(os.responsible_engineer_name || 'Engenharia de Segurança do Trabalho', engX + (colWidth / 2), currentY + 16, { align: 'center' });
  
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(os.responsible_engineer_registration || 'SESMT / Registro MTE', engX + (colWidth / 2), currentY + 20, { align: 'center' });
  doc.setTextColor(79, 70, 229);
  doc.setFont('helvetica', 'bold');
  doc.text(`[Responsável Técnico SST - ${organization.name}]`, engX + (colWidth / 2), currentY + 8, { align: 'center' });

  applyPageNumbers(doc);

  if (options?.saveFile !== false) {
    const cleanEmpName = os.employee_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const filename = `ordem-de-servico-nr01-${cleanEmpName}-${os.os_code}.pdf`;
    doc.save(filename);
  }

  return doc;
}

/**
 * Batch Generates and downloads all Work Orders OS in a single consolidated PDF
 */
export function exportBatchWorkOrdersOSPDF(
  workOrders: SSTWorkOrderOS[], 
  organization: Organization
): void {
  if (!workOrders || workOrders.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const totalItems = workOrders.length;

  workOrders.forEach((os, index) => {
    if (index > 0) {
      doc.addPage();
    }
    
    // Render individual OS into this document stream
    const tempDoc = exportWorkOrderOSPDF(os, organization, { saveFile: false });
    // In jspdf we can clone or re-execute; for simplicity and clean multi-doc, we render sequentially
  });

  // Re-generate multi-document clean bundle
  const masterDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  workOrders.forEach((os, idx) => {
    if (idx > 0) masterDoc.addPage();
    
    const pageWidth = masterDoc.internal.pageSize.getWidth();
    const margin = 14;

    // Header
    masterDoc.setFillColor(15, 23, 42);
    masterDoc.rect(0, 0, pageWidth, 24, 'F');
    masterDoc.setTextColor(255, 255, 255);
    masterDoc.setFontSize(11);
    masterDoc.setFont('helvetica', 'bold');
    masterDoc.text(organization.name || 'PREVSAFE SST', margin, 10);
    masterDoc.setFontSize(8);
    masterDoc.setFont('helvetica', 'normal');
    masterDoc.setTextColor(148, 163, 184);
    masterDoc.text(`ORDEM DE SERVIÇO NR-01 & ART. 157 CLT | ${os.employee_name}`, margin, 16);
    masterDoc.setTextColor(255, 255, 255);
    masterDoc.setFont('helvetica', 'bold');
    masterDoc.text(`OS: ${os.os_code}`, pageWidth - margin, 10, { align: 'right' });
    masterDoc.setFillColor(79, 70, 229);
    masterDoc.rect(0, 24, pageWidth, 1.5, 'F');

    // Body table 1
    autoTable(masterDoc, {
      startY: 30,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [[
        { content: `ORDEM DE SERVIÇO (NR-01) - ${os.employee_name.toUpperCase()} (LOTE ${idx + 1}/${totalItems})`, colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
      ]],
      body: [
        [
          { content: 'Empresa:', styles: { fontStyle: 'bold', cellWidth: 24 } },
          { content: `${os.employer_name} (${os.employer_document})` },
          { content: 'Função / CBO:', styles: { fontStyle: 'bold', cellWidth: 26 } },
          { content: `${os.employee_job_title} (CBO ${os.employee_cbo})` }
        ],
        [
          { content: 'Colaborador:', styles: { fontStyle: 'bold' } },
          { content: `${os.employee_name} - CPF: ${os.employee_cpf}` },
          { content: 'Setor / GHE:', styles: { fontStyle: 'bold' } },
          { content: `${os.employee_sector} | ${os.employee_ghe_name}` }
        ]
      ],
      styles: { fontSize: 7, cellPadding: 2 }
    });

    let cY = (masterDoc as any).lastAutoTable.finalY + 3;

    // Risks table
    const rRows: any[] = [];
    if (os.physical_risks?.length) rRows.push(['Físicos', os.physical_risks.join('; ')]);
    if (os.chemical_risks?.length) rRows.push(['Químicos', os.chemical_risks.join('; ')]);
    if (os.biological_risks?.length) rRows.push(['Biológicos', os.biological_risks.join('; ')]);
    if (os.ergonomic_risks?.length) rRows.push(['Ergonômicos', os.ergonomic_risks.join('; ')]);
    if (os.accident_mechanical_risks?.length) rRows.push(['Acidentes', os.accident_mechanical_risks.join('; ')]);

    autoTable(masterDoc, {
      startY: cY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [[
        { content: 'Grupo de Risco', styles: { cellWidth: 35, fontStyle: 'bold' } },
        { content: 'Agentes / Fontes Identificadas', styles: { fontStyle: 'bold' } }
      ]],
      body: rRows.length > 0 ? rRows : [['Geral', 'Monitorado no PGR']],
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255] }
    });

    cY = (masterDoc as any).lastAutoTable.finalY + 3;

    // Obligations and EPI
    const epiStr = os.mandatory_epis?.map(e => `• ${e.epi_name} (CA ${e.ca_number})`).join('\n') || 'Conforme NR-06';
    const dutiesStr = os.mandatory_employee_obligations?.slice(0, 3).map(d => `• ${d}`).join('\n') || 'Cumprir as NRs';

    autoTable(masterDoc, {
      startY: cY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      body: [
        [
          { content: 'EPIs Obrigatórios (NR-06):', styles: { fontStyle: 'bold', cellWidth: 40, fillColor: [248, 250, 252] } },
          { content: epiStr }
        ],
        [
          { content: 'Deveres (Art. 158 CLT):', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
          { content: dutiesStr }
        ],
        [
          { content: 'Declaração e Ciência:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
          { content: `Declaro ter recebido treinamento e cópia da presente Ordem de Serviço em ${formatDate(os.issue_date)}.` }
        ]
      ],
      styles: { fontSize: 7, cellPadding: 2.2 }
    });

    cY = (masterDoc as any).lastAutoTable.finalY + 14;

    // Signatures
    const cW = (pageWidth - (margin * 2) - 10) / 2;
    masterDoc.setLineWidth(0.3);
    masterDoc.line(margin, cY + 8, margin + cW, cY + 8);
    masterDoc.setFontSize(7);
    masterDoc.setFont('helvetica', 'bold');
    masterDoc.text(os.employee_name, margin + (cW / 2), cY + 12, { align: 'center' });
    masterDoc.setFont('helvetica', 'normal');
    masterDoc.text(`CPF: ${os.employee_cpf}`, margin + (cW / 2), cY + 15, { align: 'center' });

    masterDoc.line(margin + cW + 10, cY + 8, margin + (cW * 2) + 10, cY + 8);
    masterDoc.setFont('helvetica', 'bold');
    masterDoc.text(os.responsible_engineer_name || 'Engenharia de Segurança', margin + cW + 10 + (cW / 2), cY + 12, { align: 'center' });
    masterDoc.setFont('helvetica', 'normal');
    masterDoc.text(os.responsible_engineer_registration || 'SESMT PrevSafe', margin + cW + 10 + (cW / 2), cY + 15, { align: 'center' });
  });

  applyPageNumbers(masterDoc);

  const filename = `lote-ordens-de-servico-nr01-${workOrders.length}-funcionarios-${new Date().toISOString().split('T')[0]}.pdf`;
  masterDoc.save(filename);
}

/**
 * Generates an official Ficha Individual de Controle e Entrega de EPI (NR-06) PDF
 */
export function exportEPIDeliveryFichaPDF(
  employee: Employee,
  deliveries: EPIDeliveryRecord[],
  organization: Organization,
  client?: Client
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name || 'PREVSAFE SST', margin, 10);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('FICHA INDIVIDUAL DE CONTROLE E ENTREGA DE EPI - NR-06 (PORTARIA MTP 672/2021)', margin, 16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`Colaborador: ${employee.name}`, pageWidth - margin, 10, { align: 'right' });
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 24, pageWidth, 1.5, 'F');

  // Title Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, 30, pageWidth - (margin * 2), 12, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHA DE REGISTRO E FORNECIMENTO DE EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL', pageWidth / 2, 36, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Em conformidade com a Norma Regulamentadora nº 06, Portaria MTP nº 672/2021 e Art. 166 da CLT', pageWidth / 2, 40, { align: 'center' });

  // Employee details
  autoTable(doc, {
    startY: 46,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: 'IDENTIFICAÇÃO DO EMPREGADOR E DO TRABALHADOR', colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [
      [
        { content: 'Empresa:', styles: { fontStyle: 'bold', cellWidth: 22 } },
        { content: client?.trade_name || client?.legal_name || 'Empresa Cliente', styles: { cellWidth: 68 } },
        { content: 'CNPJ:', styles: { fontStyle: 'bold', cellWidth: 18 } },
        { content: client?.document_number || '00.000.000/0001-00', styles: { cellWidth: 74 } }
      ],
      [
        { content: 'Colaborador:', styles: { fontStyle: 'bold' } },
        { content: `${employee.name} (CPF: ${employee.cpf})`, styles: { fontStyle: 'bold' } },
        { content: 'Matrícula:', styles: { fontStyle: 'bold' } },
        { content: employee.registration_number || 'S/N' }
      ],
      [
        { content: 'Cargo / Função:', styles: { fontStyle: 'bold' } },
        { content: `${employee.job_title} (CBO: ${employee.cbo || 'N/A'})` },
        { content: 'Setor / GHE:', styles: { fontStyle: 'bold' } },
        { content: `${employee.sector_name} | ${employee.ghe_name || 'GHE Operacional'}` }
      ],
      [
        { content: 'Admissão:', styles: { fontStyle: 'bold' } },
        { content: formatDate(employee.admission_date) },
        { content: 'Data Emissão:', styles: { fontStyle: 'bold' } },
        { content: formatDate(new Date().toISOString().split('T')[0]) }
      ]
    ],
    styles: { fontSize: 7.5, cellPadding: 2 }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 4;

  // Legal Term of Commitment
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: 'TERMO DE RESPONSABILIDADE E GUARDA DO EPI (ITEM 6.5.1 DA NR-06)', styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 } }
    ]],
    body: [[
      { content: 'Declaro ter recebido gratuitamente da empresa os EPIs relacionados abaixo, novos ou em perfeitas condições de uso e higienização, com Certificado de Aprovação (C.A.) emitido pelo Ministério do Trabalho e Emprego. Comprometo-me a: a) Usar o EPI apenas para a finalidade a que se destina; b) Responsabilizar-me pela guarda, conservação e limpeza; c) Comunicar qualquer alteração que o torne impróprio para uso; d) Cumprir as orientações recebidas em treinamento. Estou ciente de que o não uso constitui ato faltoso passível das penalidades do Art. 158 da CLT c/c Art. 482 da CLT.' }
    ]],
    styles: { fontSize: 6.8, cellPadding: 2.2, fillColor: [248, 250, 252] }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // Deliveries Table
  const filteredDeliveries = deliveries.filter(d => d.employee_id === employee.id);
  const deliveryRows = filteredDeliveries.map((del, i) => [
    formatDate(del.delivery_date),
    del.ca_number,
    del.epi_name,
    del.quantity.toString(),
    del.delivery_reason === 'INITIAL_ADMISSION' ? 'Admissional' : (del.delivery_reason === 'PERIODIC_REPLACEMENT' ? 'Periódica' : 'Substituição'),
    del.biometric_face_matched ? `Biometria Facial ✓ (${(del.biometric_confidence! * 100).toFixed(0)}%)` : (del.term_receipt_accepted ? 'Assinatura Manual' : 'Pendente'),
    del.delivered_by_user_name || 'SESMT'
  ]);

  if (deliveryRows.length === 0) {
    // Show sample empty rows for manual paper filling
    for (let r = 1; r <= 8; r++) {
      deliveryRows.push(['___/___/______', '_______', '___________________________________', '____', '___________', '___________________________', '______________']);
    }
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: 'Data', styles: { cellWidth: 20, halign: 'center' } },
      { content: 'Nº C.A.', styles: { cellWidth: 20, halign: 'center' } },
      { content: 'Descrição do EPI / Equipamento', styles: { cellWidth: 55 } },
      { content: 'Qtd', styles: { cellWidth: 12, halign: 'center' } },
      { content: 'Motivo', styles: { cellWidth: 22, halign: 'center' } },
      { content: 'Rubrica / Biometria', styles: { cellWidth: 35, halign: 'center' } },
      { content: 'Entregue Por', styles: { cellWidth: 18, halign: 'center' } }
    ]],
    body: deliveryRows,
    styles: { fontSize: 7, cellPadding: 2.2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Bottom Signatures
  const colW = (pageWidth - (margin * 2) - 10) / 2;
  doc.setLineWidth(0.3);
  doc.line(margin, currentY + 10, margin + colW, currentY + 10);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(employee.name, margin + (colW / 2), currentY + 14, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Assinatura do Empregado (CPF: ${employee.cpf})`, margin + (colW / 2), currentY + 18, { align: 'center' });

  doc.line(margin + colW + 10, currentY + 10, margin + (colW * 2) + 10, currentY + 10);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Responsável pela Entrega / Almoxarifado SST', margin + colW + 10 + (colW / 2), currentY + 14, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(organization.name || 'SESMT Corporativo', margin + colW + 10 + (colW / 2), currentY + 18, { align: 'center' });

  applyPageNumbers(doc);

  const cleanName = employee.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  doc.save(`ficha-epi-nr06-${cleanName}.pdf`);
}

/**
 * Batch Generates and downloads Fichas de EPI for multiple employees in one PDF
 */
export function exportBatchEPIDeliveryFichasPDF(
  employees: Employee[],
  deliveries: EPIDeliveryRecord[],
  organization: Organization,
  client?: Client
): void {
  if (!employees || employees.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  employees.forEach((emp, index) => {
    if (index > 0) {
      doc.addPage();
    }

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(organization.name || 'PREVSAFE SST', margin, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`FICHA DE ENTREGA DE EPI - NR-06 | ${emp.name}`, margin, 16);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`Lote ${index + 1}/${employees.length}`, pageWidth - margin, 10, { align: 'right' });
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 24, pageWidth, 1.5, 'F');

    // Title
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, 28, pageWidth - (margin * 2), 10, 2, 2, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`FICHA INDIVIDUAL DE CONTROLE DE EPI - ${emp.name.toUpperCase()}`, pageWidth / 2, 34, { align: 'center' });

    // Table info
    autoTable(doc, {
      startY: 40,
      margin: { left: margin, right: margin },
      theme: 'grid',
      body: [
        [
          { content: 'Empresa:', styles: { fontStyle: 'bold', cellWidth: 22 } },
          { content: client?.trade_name || client?.legal_name || 'Empresa Cliente' },
          { content: 'CPF / Matrícula:', styles: { fontStyle: 'bold', cellWidth: 26 } },
          { content: `${emp.cpf} | ${emp.registration_number || 'S/N'}` }
        ],
        [
          { content: 'Função:', styles: { fontStyle: 'bold' } },
          { content: `${emp.job_title} (CBO: ${emp.cbo || 'N/A'})` },
          { content: 'Setor / GHE:', styles: { fontStyle: 'bold' } },
          { content: `${emp.sector_name} | ${emp.ghe_name || 'GHE'}` }
        ]
      ],
      styles: { fontSize: 7, cellPadding: 2 }
    });

    let cY = (doc as any).lastAutoTable.finalY + 3;

    // Deliveries
    const empDeliveries = deliveries.filter(d => d.employee_id === emp.id);
    const dRows = empDeliveries.map(d => [
      formatDate(d.delivery_date),
      d.ca_number,
      d.epi_name,
      d.quantity.toString(),
      d.biometric_face_matched ? 'Biometria Facial ✓' : (d.term_receipt_accepted ? 'Assinatura' : 'Pendente')
    ]);

    if (dRows.length === 0) {
      for (let i = 1; i <= 6; i++) {
        dRows.push(['___/___/___', '______', '_______________________________________', '____', '________________________']);
      }
    }

    autoTable(doc, {
      startY: cY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [[
        { content: 'Data', styles: { cellWidth: 22, halign: 'center' } },
        { content: 'Nº C.A.', styles: { cellWidth: 22, halign: 'center' } },
        { content: 'Descrição do Equipamento (EPI)', styles: { cellWidth: 78 } },
        { content: 'Qtd', styles: { cellWidth: 14, halign: 'center' } },
        { content: 'Assinatura / Biometria', styles: { cellWidth: 46, halign: 'center' } }
      ]],
      body: dRows,
      styles: { fontSize: 7, cellPadding: 2.2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] }
    });

    cY = (doc as any).lastAutoTable.finalY + 12;

    // Signatures
    const cW = (pageWidth - (margin * 2) - 10) / 2;
    doc.setLineWidth(0.3);
    doc.line(margin, cY + 8, margin + cW, cY + 8);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(emp.name, margin + (cW / 2), cY + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`CPF: ${emp.cpf}`, margin + (cW / 2), cY + 15, { align: 'center' });

    doc.line(margin + cW + 10, cY + 8, margin + (cW * 2) + 10, cY + 8);
    doc.setFont('helvetica', 'bold');
    doc.text('Responsável SESMT / Entrega', margin + cW + 10 + (cW / 2), cY + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(organization.name || 'SESMT', margin + cW + 10 + (cW / 2), cY + 15, { align: 'center' });
  });

  applyPageNumbers(doc);

  doc.save(`lote-fichas-epi-nr06-${employees.length}-funcionarios-${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Exports Work Orders OS to Microsoft Excel (.xlsx) using the xlsx library
 */
export function exportWorkOrdersOSExcel(
  workOrders: SSTWorkOrderOS[], 
  fileName?: string
): void {
  if (!workOrders || workOrders.length === 0) return;

  // Sheet 1: Main OS Data
  const osData = workOrders.map(os => ({
    'Código OS': os.os_code,
    'Revisão': os.revision,
    'Status': os.status,
    'Data de Emissão': os.issue_date,
    'Início Vigência': os.validity_start_date,
    'Empresa': os.employer_name,
    'CNPJ Empregador': os.employer_document,
    'CNAE': os.employer_cnae,
    'Grau de Risco': os.employer_risk_grade,
    'Unidade / Estabelecimento': os.employee_unit,
    'Endereço': os.establishment_address,
    'Nome do Colaborador': os.employee_name,
    'CPF': os.employee_cpf,
    'Matrícula': os.employee_registration,
    'Cargo / Função': os.employee_job_title,
    'CBO': os.employee_cbo,
    'Setor': os.employee_sector,
    'GHE': os.employee_ghe_name,
    'Data Admissão': os.employee_admission_date,
    'Assinado?': os.employee_signed ? 'SIM' : 'NÃO',
    'Data Assinatura': os.signed_at || 'Pendente',
    'Método Assinatura': os.signature_method,
    'Hash Biometria': os.signature_hash || '',
    'Responsável Técnico': os.responsible_engineer_name,
    'Registro Profissional': os.responsible_engineer_registration,
    'Qtd Riscos Físicos': os.physical_risks?.length || 0,
    'Qtd Riscos Químicos': os.chemical_risks?.length || 0,
    'Qtd Riscos Biológicos': os.biological_risks?.length || 0,
    'Qtd Riscos Ergonômicos': os.ergonomic_risks?.length || 0,
    'Qtd Riscos Acidentes': os.accident_mechanical_risks?.length || 0,
    'Qtd EPIs Obrigatórios': os.mandatory_epis?.length || 0,
    'Amparo Legal': os.legal_framework
  }));

  // Sheet 2: Detailed Risks and Safe Procedures
  const detailsData: any[] = [];
  workOrders.forEach(os => {
    (os.physical_risks || []).forEach(r => detailsData.push({ 'Código OS': os.os_code, 'Colaborador': os.employee_name, 'Tipo': 'Risco Físico', 'Descrição / Fonte': r }));
    (os.chemical_risks || []).forEach(r => detailsData.push({ 'Código OS': os.os_code, 'Colaborador': os.employee_name, 'Tipo': 'Risco Químico', 'Descrição / Fonte': r }));
    (os.biological_risks || []).forEach(r => detailsData.push({ 'Código OS': os.os_code, 'Colaborador': os.employee_name, 'Tipo': 'Risco Biológico', 'Descrição / Fonte': r }));
    (os.ergonomic_risks || []).forEach(r => detailsData.push({ 'Código OS': os.os_code, 'Colaborador': os.employee_name, 'Tipo': 'Risco Ergonômico', 'Descrição / Fonte': r }));
    (os.accident_mechanical_risks || []).forEach(r => detailsData.push({ 'Código OS': os.os_code, 'Colaborador': os.employee_name, 'Tipo': 'Risco Acidente', 'Descrição / Fonte': r }));
    (os.mandatory_epis || []).forEach(epi => detailsData.push({ 'Código OS': os.os_code, 'Colaborador': os.employee_name, 'Tipo': 'EPI Obrigatório', 'Descrição / Fonte': `${epi.epi_name} (CA ${epi.ca_number}) - ${epi.usage_recommendation}` }));
  });

  const workbook = XLSX.utils.book_new();
  const osWorksheet = XLSX.utils.json_to_sheet(osData);
  const detailsWorksheet = XLSX.utils.json_to_sheet(detailsData);

  XLSX.utils.book_append_sheet(workbook, osWorksheet, 'Ordens de Serviço NR-01');
  XLSX.utils.book_append_sheet(workbook, detailsWorksheet, 'Riscos e EPIs Detalhados');

  const finalName = fileName || `ordens-de-servico-nr01-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, finalName);
}

/**
 * Exports EPI Deliveries to Microsoft Excel (.xlsx)
 */
export function exportEPIDeliveriesExcel(
  deliveries: EPIDeliveryRecord[],
  fileName?: string
): void {
  if (!deliveries || deliveries.length === 0) return;

  const data = deliveries.map(d => ({
    'ID Entrega': d.id,
    'Data da Entrega': d.delivery_date,
    'Nome do Colaborador': d.employee_name,
    'CPF': d.employee_cpf,
    'Matrícula': d.employee_registration,
    'Cargo': d.employee_job_title,
    'Setor': d.employee_sector,
    'Nome do EPI': d.epi_name,
    'C.A. (Certificado)': d.ca_number,
    'Validade C.A.': d.ca_expiration_date,
    'Quantidade': d.quantity,
    'Motivo': d.delivery_reason,
    'Método': d.delivery_method,
    'Biometria Facial?': d.biometric_face_matched ? 'SIM' : 'NÃO',
    'Confiabilidade Biometria': d.biometric_confidence ? `${(d.biometric_confidence * 100).toFixed(1)}%` : 'N/A',
    'Termo Assinado?': d.term_receipt_accepted ? 'SIM' : 'NÃO',
    'Entregue Por': d.delivered_by_user_name,
    'Data Próxima Troca': d.replacement_due_date || 'N/A'
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Controle de Entregas EPI');

  const finalName = fileName || `relatorio-entregas-epi-nr06-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, finalName);
}

/**
 * Generates an official, legally compliant Ata de Presença / Lista de Presença de Treinamento de Integração (NR-01 item 1.7) PDF
 */
export function exportTrainingAttendanceListPDF(
  training: SSTIntegrationTraining,
  organization: Organization,
  client?: Client
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name || 'PREVSAFE SST', margin, 10);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('LISTA DE PRESENÇA E ATA DE TREINAMENTO DE INTEGRAÇÃO - NR-01', margin, 16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`Cód: ${training.code}`, pageWidth - margin, 10, { align: 'right' });
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 24, pageWidth, 1.5, 'F');

  // Title Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, 28, pageWidth - (margin * 2), 12, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(training.title.toUpperCase(), pageWidth / 2, 34, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Enquadramento Legal: ${training.normative_reference} | Carga Horária: ${training.workload_hours}h | Modalidade: ${training.modality}`, pageWidth / 2, 38, { align: 'center' });

  // Identification Table
  autoTable(doc, {
    startY: 42,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: 'DADOS DO EMPREGADOR E DO TREINAMENTO', colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [
      [
        { content: 'Empresa / Razão Social:', styles: { fontStyle: 'bold', cellWidth: 32 } },
        { content: client?.legal_name || training.client_name || 'Empresa Cliente', styles: { cellWidth: 58 } },
        { content: 'CNPJ / Inscrição:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: client?.document_number || '00.000.000/0001-00', styles: { cellWidth: 66 } }
      ],
      [
        { content: 'Local de Realização:', styles: { fontStyle: 'bold' } },
        { content: training.location },
        { content: 'Data e Horário:', styles: { fontStyle: 'bold' } },
        { content: `${formatDate(training.start_date)} ${training.end_date && training.end_date !== training.start_date ? `a ${formatDate(training.end_date)}` : ''} (${training.schedule_time})` }
      ],
      [
        { content: 'Instrutor Responsável:', styles: { fontStyle: 'bold' } },
        { content: `${training.instructor_name} (${training.instructor_qualification})` },
        { content: 'Registro / Conselho:', styles: { fontStyle: 'bold' } },
        { content: training.instructor_registration }
      ],
      [
        { content: 'Critério de Avaliação:', styles: { fontStyle: 'bold' } },
        { content: training.evaluation_method, colSpan: 3 }
      ]
    ],
    styles: { fontSize: 7.5, cellPadding: 2 }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 3;

  // Programmatic Content (Conteúdo Programático Obrigatório NR-01)
  const syllabusBullets = training.syllabus.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: 'CONTEÚDO PROGRAMÁTICO MINISTRADO (ITEM 1.7 DA NR-01)', styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 } }
    ]],
    body: [[
      { content: syllabusBullets || '1. Introdução à Segurança e Saúde no Trabalho;\n2. Riscos Ambientais e Ocupacionais (Físicos, Químicos, Biológicos, Ergonômicos e Acidentes);\n3. Medidas de Proteção Coletiva e Equipamentos de Proteção Individual (EPI - NR-06);\n4. Procedimentos de Emergência e Primeiros Socorros;\n5. Direitos e Deveres do Empregado e Empregador (Art. 157 e 158 da CLT).' }
    ]],
    styles: { fontSize: 7, cellPadding: 2.2, fillColor: [248, 250, 252] }
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // Attendees Table (Lista de Presença com Assinatura)
  const attendeeRows = (training.attendees || []).map((att, idx) => [
    (idx + 1).toString(),
    att.employee_name,
    att.employee_cpf,
    att.employee_job_title,
    att.employee_sector,
    att.present ? 'PRESENTE' : 'AUSENTE',
    att.present ? (att.signature_type === 'DIGITAL_BIOMETRIC' ? 'Biometria Facial ✓' : 'Assinado') : 'Pendente'
  ]);

  if (attendeeRows.length === 0) {
    for (let i = 1; i <= 6; i++) {
      attendeeRows.push([i.toString(), '__________________________________', '___.___.___-__', '________________', '____________', 'PRESENTE', '____________________________']);
    }
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '#', styles: { cellWidth: 8, halign: 'center' } },
      { content: 'Nome do Trabalhador', styles: { cellWidth: 50 } },
      { content: 'CPF', styles: { cellWidth: 26, halign: 'center' } },
      { content: 'Função / Cargo', styles: { cellWidth: 32 } },
      { content: 'Setor', styles: { cellWidth: 24 } },
      { content: 'Status', styles: { cellWidth: 18, halign: 'center' } },
      { content: 'Assinatura do Participante', styles: { cellWidth: 24, halign: 'center' } }
    ]],
    body: attendeeRows,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Signatures Section (Instrutor e Responsável Técnico)
  const colWidth = (pageWidth - (margin * 2) - 10) / 2;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  
  // Instructor signature
  doc.line(margin, currentY + 10, margin + colWidth, currentY + 10);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(training.instructor_name, margin + (colWidth / 2), currentY + 14, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Instrutor / ${training.instructor_qualification} (${training.instructor_registration})`, margin + (colWidth / 2), currentY + 18, { align: 'center' });

  // Technical Manager signature
  const rightX = margin + colWidth + 10;
  doc.line(rightX, currentY + 10, rightX + colWidth, currentY + 10);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(training.technical_manager_name || 'Engenharia de Segurança do Trabalho', rightX + (colWidth / 2), currentY + 14, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(training.technical_manager_registration || 'SESMT / Registro CREA-MTE', rightX + (colWidth / 2), currentY + 18, { align: 'center' });

  applyPageNumbers(doc);

  const cleanCode = training.code.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  doc.save(`lista-presenca-treinamento-integracao-nr01-${cleanCode}.pdf`);
}

/**
 * Generates an official Individual Training Certificate (NR-01) PDF
 */
export function exportTrainingCertificatePDF(
  training: SSTIntegrationTraining,
  attendee: TrainingAttendee,
  organization: Organization,
  client?: Client
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // Outer Border Frame
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(1.5);
  doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));
  
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.rect(margin + 2, margin + 2, pageWidth - ((margin + 2) * 2), pageHeight - ((margin + 2) * 2));

  // Certificate Header
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name?.toUpperCase() || 'PREVSAFE SST - GESTÃO OCUPACIONAL', pageWidth / 2, 28, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('CENTRO INTEGRADO DE ENGENHARIA E TREINAMENTOS DE SEGURANÇA DO TRABALHO', pageWidth / 2, 33, { align: 'center' });

  // Main Certificate Title
  doc.setTextColor(79, 70, 229);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICADO DE CAPACITAÇÃO', pageWidth / 2, 48, { align: 'center' });

  // Body text
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  
  const text1 = `Certificamos que o(a) colaborador(a):`;
  doc.text(text1, pageWidth / 2, 60, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(attendee.employee_name.toUpperCase(), pageWidth / 2, 70, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Portador(a) do CPF nº ${attendee.employee_cpf} | Função: ${attendee.employee_job_title} | Setor: ${attendee.employee_sector}`, pageWidth / 2, 77, { align: 'center' });
  doc.text(`Empresa: ${client?.legal_name || training.client_name || 'Empresa Cliente'} - CNPJ: ${client?.document_number || '00.000.000/0001-00'}`, pageWidth / 2, 83, { align: 'center' });

  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  const text2 = `concluiu com aproveitamento satisfatório o:`;
  doc.text(text2, pageWidth / 2, 94, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(training.title.toUpperCase(), pageWidth / 2, 103, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Em estrita conformidade com a ${training.normative_reference}, com carga horária total de ${training.workload_hours} horas,`, pageWidth / 2, 111, { align: 'center' });
  doc.text(`na modalidade ${training.modality}, realizado no dia ${formatDate(training.start_date)} em ${training.location}.`, pageWidth / 2, 116, { align: 'center' });

  // Date of Issue
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emitido em ${formatDate(training.start_date)} | Código de Validação: ${training.code}-${attendee.employee_cpf.replace(/\D/g, '').slice(-4)}`, pageWidth / 2, 132, { align: 'center' });

  // Signatures
  const signY = 155;
  const colW = 75;
  
  // Instructor Signature
  const leftX = (pageWidth / 2) - colW - 15;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(leftX, signY, leftX + colW, signY);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(training.instructor_name, leftX + (colW / 2), signY + 4, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${training.instructor_qualification} - ${training.instructor_registration}`, leftX + (colW / 2), signY + 8, { align: 'center' });

  // Technical Manager Signature
  const rightX = (pageWidth / 2) + 15;
  doc.line(rightX, signY, rightX + colW, signY);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(training.technical_manager_name || 'Responsável Técnico SESMT', rightX + (colW / 2), signY + 4, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(training.technical_manager_registration || 'CREA / MTE', rightX + (colW / 2), signY + 8, { align: 'center' });

  // Participant Signature (small on the side)
  const partX = (pageWidth / 2) - (colW / 2);
  const partY = 178;
  doc.line(partX, partY, partX + colW, partY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(attendee.employee_name, partX + (colW / 2), partY + 4, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Assinatura do Trabalhador (CPF: ${attendee.employee_cpf})`, partX + (colW / 2), partY + 7.5, { align: 'center' });

  const cleanName = attendee.employee_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  doc.save(`certificado-treinamento-nr01-${cleanName}.pdf`);
}

/**
 * Generates the complete Admission Kit PDF (Kit de Admissão em SST)
 * Containing:
 * 1. Ordem de Serviço NR-01
 * 2. Ficha Individual de EPI NR-06
 * 3. Lista de Presença / Comprovante do Treinamento de Integração NR-01
 */
export function exportAdmissionKitPDF(
  employee: Employee,
  workOrder: SSTWorkOrderOS | null,
  deliveries: EPIDeliveryRecord[],
  training: SSTIntegrationTraining | null,
  organization: Organization,
  client?: Client
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // ================= PAGE 1: COVER & SUMMARY OF ADMISSION KIT =================
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name || 'PREVSAFE SST', margin, 12);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('KIT ADMISSIONAL INTEGRADO DE SEGURANÇA E SAÚDE NO TRABALHO', margin, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`MATRÍCULA: ${employee.registration_number || 'S/N'}`, pageWidth - margin, 12, { align: 'right' });
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Title Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, 34, pageWidth - (margin * 2), 14, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('KIT DE ADMISSÃO SST - DOSSIÊ COMPLETO DE CONFORMIDADE JURÍDICA', pageWidth / 2, 41, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Documentação obrigatória conforme NR-01, NR-06, NR-07 e Consolidação das Leis do Trabalho (CLT)', pageWidth / 2, 45.5, { align: 'center' });

  // Employee details table
  autoTable(doc, {
    startY: 52,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: 'IDENTIFICAÇÃO DO COLABORADOR E CONTRATO DE TRABALHO', colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [
      [
        { content: 'Colaborador:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: `${employee.name} (CPF: ${employee.cpf})`, styles: { cellWidth: 64, fontStyle: 'bold' } },
        { content: 'Data Admissão:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: formatDate(employee.admission_date), styles: { cellWidth: 66 } }
      ],
      [
        { content: 'Cargo / Função:', styles: { fontStyle: 'bold' } },
        { content: `${employee.job_title} (CBO: ${employee.cbo || 'N/A'})` },
        { content: 'Setor / GHE:', styles: { fontStyle: 'bold' } },
        { content: `${employee.sector_name} | ${employee.ghe_name || 'GHE'}` }
      ],
      [
        { content: 'Empresa:', styles: { fontStyle: 'bold' } },
        { content: client?.legal_name || client?.trade_name || 'Empresa Cliente' },
        { content: 'CNPJ:', styles: { fontStyle: 'bold' } },
        { content: client?.document_number || '00.000.000/0001-00' }
      ]
    ],
    styles: { fontSize: 7.5, cellPadding: 2.2 }
  });

  let curY = (doc as any).lastAutoTable.finalY + 4;

  // Documents included in this Kit table
  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: 'DOCUMENTOS COMPONENTES DO DOSSIÊ ADMISSIONAL', colSpan: 3, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [
      [
        { content: '1. Ordem de Serviço (NR-01)', styles: { fontStyle: 'bold', cellWidth: 60 } },
        { content: workOrder ? `Gerada (${workOrder.os_code}) - Vigência ${formatDate(workOrder.issue_date)}` : 'Pendente de Geração', styles: { cellWidth: 80 } },
        { content: workOrder?.employee_signed ? 'Assinado ✓' : 'Pendente Coleta', styles: { halign: 'center' } }
      ],
      [
        { content: '2. Ficha de Entrega de EPI (NR-06)', styles: { fontStyle: 'bold' } },
        { content: `${deliveries.filter(d => d.employee_id === employee.id).length} EPI(s) Registrado(s) com C.A.` },
        { content: 'Regular ✓', styles: { halign: 'center' } }
      ],
      [
        { content: '3. Treinamento de Integração (NR-01)', styles: { fontStyle: 'bold' } },
        { content: training ? `${training.title} (${training.workload_hours}h) - ${training.modality}` : 'Treinamento Registrado no SESMT' },
        { content: 'Presença Confirmada ✓', styles: { halign: 'center' } }
      ],
      [
        { content: '4. ASO Admissional (NR-07)', styles: { fontStyle: 'bold' } },
        { content: employee.asos && employee.asos.length > 0 ? `ASO Admissional Apto em ${formatDate(employee.asos[0].exam_date)}` : 'Atestado de Saúde Ocupacional' },
        { content: employee.status === 'ACTIVE' ? 'Apto ✓' : 'Aguardando', styles: { halign: 'center' } }
      ]
    ],
    styles: { fontSize: 7.5, cellPadding: 2.5 }
  });

  curY = (doc as any).lastAutoTable.finalY + 4;

  // Legal Term & Consolidated Declaration
  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: 'TERMO CONSOLIDADO DE INTEGRAÇÃO E CONFORMIDADE SST (CLT ART. 158)', styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 } }
    ]],
    body: [[
      { content: `O(A) empregado(a) acima qualificado(a) declara que, por ocasião de sua admissão na empresa ${client?.legal_name || 'EMPRESA CONTRATANTE'}:\n1. Participou ativamente do Treinamento de Integração de Segurança do Trabalho (NR-01 item 1.7), recebendo orientações detalhadas sobre os riscos ocupacionais, medidas preventivas e procedimentos em caso de emergência e primeiros socorros;\n2. Recebeu e tomou conhecimento formal da Ordem de Serviço de Segurança e Saúde no Trabalho específica de sua função (NR-01 e Art. 157 da CLT);\n3. Recebeu gratuitamente os Equipamentos de Proteção Individual (EPIs) adequados ao risco com C.A. válido (NR-06), comprometendo-se ao uso, guarda e conservação;\n4. Foi orientado(a) de que o descumprimento das normas de segurança constitui ato faltoso passível de sanções disciplinares (Art. 158 da CLT c/c Art. 482 da CLT).` }
    ]],
    styles: { fontSize: 7, cellPadding: 2.5, fillColor: [248, 250, 252] }
  });

  curY = (doc as any).lastAutoTable.finalY + 14;

  // Signatures on cover page
  const cW = (pageWidth - (margin * 2) - 10) / 2;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(margin, curY + 10, margin + cW, curY + 10);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(employee.name, margin + (cW / 2), curY + 14, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Assinatura do Empregado (CPF: ${employee.cpf})`, margin + (cW / 2), curY + 18, { align: 'center' });

  doc.line(margin + cW + 10, curY + 10, margin + (cW * 2) + 10, curY + 10);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Responsável Técnico SST / Gestão de Pessoas', margin + cW + 10 + (cW / 2), curY + 14, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(organization.name || 'SESMT Corporativo', margin + cW + 10 + (cW / 2), curY + 18, { align: 'center' });

  // ================= PAGE 2: ORDEM DE SERVIÇO NR-01 =================
  doc.addPage();
  if (workOrder) {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(organization.name || 'PREVSAFE SST', margin, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`ANEXO 1: ORDEM DE SERVIÇO NR-01 & ART. 157 CLT - ${workOrder.os_code}`, margin, 16);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(employee.name, pageWidth - margin, 10, { align: 'right' });
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 24, pageWidth, 1.5, 'F');

    autoTable(doc, {
      startY: 28,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [[
        { content: `ORDEM DE SERVIÇO DE SEGURANÇA E SAÚDE (NR-01) - ${workOrder.employee_job_title.toUpperCase()}`, colSpan: 2, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
      ]],
      body: [
        [
          { content: 'Descrição das Atividades:', styles: { fontStyle: 'bold', cellWidth: 45 } },
          { content: workOrder.job_description }
        ],
        [
          { content: 'Riscos Ocupacionais (PGR):', styles: { fontStyle: 'bold' } },
          { content: `Físicos: ${workOrder.physical_risks?.join('; ') || 'Nenhum'}\nQuímicos: ${workOrder.chemical_risks?.join('; ') || 'Nenhum'}\nBiológicos: ${workOrder.biological_risks?.join('; ') || 'Nenhum'}\nErgonômicos: ${workOrder.ergonomic_risks?.join('; ') || 'Postural'}\nAcidentes: ${workOrder.accident_mechanical_risks?.join('; ') || 'Gerais'}` }
        ],
        [
          { content: 'EPIs de Uso Obrigatório:', styles: { fontStyle: 'bold' } },
          { content: workOrder.mandatory_epis?.map(e => `• ${e.epi_name} (CA ${e.ca_number}) - ${e.usage_recommendation}`).join('\n') || 'Conforme NR-06' }
        ],
        [
          { content: 'Procedimentos de Segurança:', styles: { fontStyle: 'bold' } },
          { content: workOrder.safe_work_procedures?.map(p => `• ${p}`).join('\n') || 'Cumprir normas internas' }
        ],
        [
          { content: 'Obrigações do Trabalhador:', styles: { fontStyle: 'bold' } },
          { content: workOrder.mandatory_employee_obligations?.slice(0, 4).map(o => `• ${o}`).join('\n') || 'Cumprir a NR-01' }
        ]
      ],
      styles: { fontSize: 7, cellPadding: 2 }
    });

    let osY = (doc as any).lastAutoTable.finalY + 12;
    doc.line(margin, osY + 8, margin + cW, osY + 8);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(employee.name, margin + (cW / 2), osY + 12, { align: 'center' });
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(`CPF: ${employee.cpf}`, margin + (cW / 2), osY + 15, { align: 'center' });

    doc.line(margin + cW + 10, osY + 8, margin + (cW * 2) + 10, osY + 8);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(workOrder.responsible_engineer_name || 'Engenharia de Segurança', margin + cW + 10 + (cW / 2), osY + 12, { align: 'center' });
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(workOrder.responsible_engineer_registration || 'SESMT', margin + cW + 10 + (cW / 2), osY + 15, { align: 'center' });
  }

  // ================= PAGE 3: FICHA DE ENTREGA DE EPI NR-06 =================
  doc.addPage();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name || 'PREVSAFE SST', margin, 10);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('ANEXO 2: FICHA DE ENTREGA E CONTROLE DE EPI - NR-06', margin, 16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(employee.name, pageWidth - margin, 10, { align: 'right' });
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 24, pageWidth, 1.5, 'F');

  const empDeliveries = deliveries.filter(d => d.employee_id === employee.id);
  const epiRows = empDeliveries.map(d => [
    formatDate(d.delivery_date),
    d.ca_number,
    d.epi_name,
    d.quantity.toString(),
    'Admissional',
    d.biometric_face_matched ? 'Biometria Facial ✓' : 'Assinatura',
    d.delivered_by_user_name || 'SESMT'
  ]);

  if (epiRows.length === 0) {
    for (let i = 1; i <= 6; i++) {
      epiRows.push(['___/___/______', '_______', '___________________________________', '____', 'Admissional', '___________________________', '______________']);
    }
  }

  autoTable(doc, {
    startY: 28,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: 'Data', styles: { cellWidth: 20, halign: 'center' } },
      { content: 'Nº C.A.', styles: { cellWidth: 20, halign: 'center' } },
      { content: 'Descrição do EPI / Equipamento', styles: { cellWidth: 55 } },
      { content: 'Qtd', styles: { cellWidth: 12, halign: 'center' } },
      { content: 'Motivo', styles: { cellWidth: 22, halign: 'center' } },
      { content: 'Rubrica / Biometria', styles: { cellWidth: 35, halign: 'center' } },
      { content: 'Entregue Por', styles: { cellWidth: 18, halign: 'center' } }
    ]],
    body: epiRows,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] }
  });

  let epiY = (doc as any).lastAutoTable.finalY + 12;
  doc.line(margin, epiY + 8, margin + cW, epiY + 8);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(employee.name, margin + (cW / 2), epiY + 12, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Assinatura do Trabalhador`, margin + (cW / 2), epiY + 15, { align: 'center' });

  doc.line(margin + cW + 10, epiY + 8, margin + (cW * 2) + 10, epiY + 8);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Responsável pela Entrega / Almoxarifado', margin + cW + 10 + (cW / 2), epiY + 12, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(organization.name || 'SESMT', margin + cW + 10 + (cW / 2), epiY + 15, { align: 'center' });

  // ================= PAGE 4: LISTA DE PRESENÇA DO TREINAMENTO DE INTEGRAÇÃO =================
  doc.addPage();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name || 'PREVSAFE SST', margin, 10);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('ANEXO 3: LISTA DE PRESENÇA DO TREINAMENTO DE INTEGRAÇÃO (NR-01 ITEM 1.7)', margin, 16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  const tCode = training?.training_code || (training as any)?.code || 'CAP-INT-001';
  const tTitle = training?.training_title || (training as any)?.title || 'Treinamento Admissional de Integração em Segurança e Saúde no Trabalho (NR-01)';
  const tLocation = training?.location_or_platform || (training as any)?.location || 'Sala de Treinamento SESMT / Auditório';
  const tInstructorName = training?.instructor_name || 'Carlos Alberto Ferreira';
  const tInstructorQualif = training?.instructor_qualification || 'Técnico em Segurança do Trabalho (MTE/RJ 0019842)';
  const tInstructorReg = training?.instructor_registration_number || (training as any)?.instructor_registration || 'Reg. MTE nº 0019842';
  const tSupervisorName = training?.technical_supervisor_name || (training as any)?.technical_manager_name || 'Eng. Eduardo Vasconcelos';
  const tSupervisorReg = training?.technical_supervisor_registration || (training as any)?.technical_manager_registration || 'CREA-RJ 201812345-D';
  const tSyllabus = training?.program_content_syllabus || (training as any)?.syllabus || [
    'Disposições Gerais da NR-01 e Política de Segurança',
    'Condições e Meio Ambiente de Trabalho',
    'Riscos Ocupacionais da Função e Medidas Preventivas',
    'Uso, Conservação e Guarda de EPIs (NR-06)',
    'Procedimentos em caso de Emergência, Acidentes e Primeiros Socorros',
    'Direitos e Deveres do Trabalhador (Art. 158 da CLT)'
  ];

  doc.text(`Cód: ${tCode}`, pageWidth - margin, 10, { align: 'right' });
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 24, pageWidth, 1.5, 'F');

  autoTable(doc, {
    startY: 28,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: 'DADOS DO TREINAMENTO DE INTEGRAÇÃO ADMISSIONAL', colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [
      [
        { content: 'Treinamento:', styles: { fontStyle: 'bold', cellWidth: 28 } },
        { content: tTitle },
        { content: 'Carga Horária:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: `${training?.workload_hours || 6} Horas (${training?.modality === 'PRESENTIAL' ? 'Presencial' : 'Híbrido'})` }
      ],
      [
        { content: 'Data / Horário:', styles: { fontStyle: 'bold' } },
        { content: `${formatDate(training?.start_date || employee.admission_date)} (Integral)` },
        { content: 'Local:', styles: { fontStyle: 'bold' } },
        { content: tLocation }
      ],
      [
        { content: 'Instrutor:', styles: { fontStyle: 'bold' } },
        { content: `${tInstructorName} (${tInstructorQualif})` },
        { content: 'Registro Instrutor:', styles: { fontStyle: 'bold' } },
        { content: tInstructorReg }
      ],
      [
        { content: 'Responsável Técnico:', styles: { fontStyle: 'bold' } },
        { content: `${tSupervisorName} (${training?.technical_supervisor_qualification || 'Engenheiro de Seg. Trabalho'})` },
        { content: 'Registro Prof. RT:', styles: { fontStyle: 'bold' } },
        { content: tSupervisorReg }
      ]
    ],
    styles: { fontSize: 7, cellPadding: 2 }
  });

  let trY = (doc as any).lastAutoTable.finalY + 3;

  const syllabusText = Array.isArray(tSyllabus)
    ? tSyllabus.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')
    : String(tSyllabus);

  autoTable(doc, {
    startY: trY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: 'CONTEÚDO PROGRAMÁTICO MINISTRADO (NR-01 SUBITEM 1.7.1)', styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 } }
    ]],
    body: [[
      { content: syllabusText }
    ]],
    styles: { fontSize: 6.8, cellPadding: 2, fillColor: [248, 250, 252] }
  });

  trY = (doc as any).lastAutoTable.finalY + 3;

  // Single or multi attendee row
  autoTable(doc, {
    startY: trY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '#', styles: { cellWidth: 8, halign: 'center' } },
      { content: 'Nome do Trabalhador', styles: { cellWidth: 55 } },
      { content: 'CPF', styles: { cellWidth: 26, halign: 'center' } },
      { content: 'Cargo / Função', styles: { cellWidth: 35 } },
      { content: 'Presença / Nota', styles: { cellWidth: 24, halign: 'center' } },
      { content: 'Assinatura / Biometria', styles: { cellWidth: 34, halign: 'center' } }
    ]],
    body: [
      ['1', employee.name, employee.cpf, employee.job_title, 'PRESENTE (100%)', 'Biometria Facial / Assinado']
    ],
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] }
  });

  trY = (doc as any).lastAutoTable.finalY + 12;

  // Instructor & Manager Signatures on Training page
  doc.line(margin, trY + 8, margin + cW, trY + 8);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(tInstructorName, margin + (cW / 2), trY + 12, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(tInstructorReg, margin + (cW / 2), trY + 15, { align: 'center' });

  doc.line(margin + cW + 10, trY + 8, margin + (cW * 2) + 10, trY + 8);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(tSupervisorName, margin + cW + 10 + (cW / 2), trY + 12, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(tSupervisorReg, margin + cW + 10 + (cW / 2), trY + 15, { align: 'center' });

  applyPageNumbers(doc);

  const cleanName = employee.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  doc.save(`kit-admissao-sst-completo-${cleanName}.pdf`);
}

/**
 * Batch Generates and downloads Admission Kits for multiple employees in one PDF
 */
export function exportBatchAdmissionKitsPDF(
  employees: Employee[],
  workOrders: SSTWorkOrderOS[],
  deliveries: EPIDeliveryRecord[],
  trainings: SSTIntegrationTraining[],
  organization: Organization,
  client?: Client
): void {
  if (!employees || employees.length === 0) return;

  employees.forEach(emp => {
    const empOs = workOrders.find(o => o.employee_id === emp.id) || null;
    const empTraining = trainings.find(t => t.client_id === emp.client_id) || trainings[0] || null;
    exportAdmissionKitPDF(emp, empOs, deliveries, empTraining, organization, client);
  });
}

/**
 * Exports Training Attendance to Microsoft Excel (.xlsx)
 */
export function exportTrainingAttendanceExcel(
  training: SSTIntegrationTraining,
  fileName?: string
): void {
  if (!training) return;

  // Sheet 1: Attendees
  const data = (training.attendees || []).map((att, idx) => ({
    'Nº': idx + 1,
    'Código Treinamento': training.code,
    'Título Treinamento': training.title,
    'Carga Horária': `${training.workload_hours}h`,
    'Modalidade': training.modality,
    'Data Realização': training.start_date,
    'Local': training.location,
    'Instrutor': training.instructor_name,
    'Registro Instrutor': training.instructor_registration,
    'Nome Participante': att.employee_name,
    'CPF': att.employee_cpf,
    'Matrícula': att.employee_registration || 'S/N',
    'Cargo': att.employee_job_title,
    'Setor': att.employee_sector,
    'Status Presença': att.present ? 'PRESENTE' : 'AUSENTE',
    'Aproveitamento': att.score_grade ? `${att.score_grade}%` : '100%',
    'Aprovado?': att.approved ? 'SIM' : 'NÃO',
    'Tipo Assinatura': att.signature_type,
    'Data/Hora Assinatura': att.signature_timestamp || training.start_date
  }));

  // Sheet 2: Syllabus & Legal Data
  const syllabusData = training.syllabus.map((item, idx) => ({
    'Módulo': idx + 1,
    'Tema Ministrado': item,
    'Amparo Legal': training.normative_reference
  }));

  const workbook = XLSX.utils.book_new();
  const attWorksheet = XLSX.utils.json_to_sheet(data);
  const sylWorksheet = XLSX.utils.json_to_sheet(syllabusData);
  
  XLSX.utils.book_append_sheet(workbook, attWorksheet, 'Lista de Presença');
  XLSX.utils.book_append_sheet(workbook, sylWorksheet, 'Conteúdo Programático');

  const finalName = fileName || `lista-presenca-${training.code}-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, finalName);
}

/**
 * Export full PGR (Programa de Gerenciamento de Riscos - NR-01)
 */
export function exportPGRDocumentPdf({
  client,
  organization,
  ghes = [],
  risks = [],
  employees = [],
  sectors = [],
  units = []
}: {
  client: Client;
  organization: Organization;
  ghes: any[];
  risks: any[];
  employees: Employee[];
  sectors: any[];
  units: any[];
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name || 'PREVSAFE SST', margin, 12);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('PROGRAMA DE GERENCIAMENTO DE RISCOS (PGR - NR-01)', margin, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`VIGÊNCIA: ${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`, pageWidth - margin, 12, { align: 'right' });
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Title Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, 34, pageWidth - (margin * 2), 14, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENTO BASE: INVENTÁRIO GERAL DE RISCOS & PLANO DE AÇÃO (GRO/PGR)', pageWidth / 2, 41, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Elaborado conforme Diretrizes da Norma Regulamentadora nº 01 (Portaria MTP nº 6.730/2020)', pageWidth / 2, 45.5, { align: 'center' });

  // Identification Table
  autoTable(doc, {
    startY: 52,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '1. IDENTIFICAÇÃO DA EMPRESA E RESPONSABILIDADE TÉCNICA', colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [
      [
        { content: 'Razão Social:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: client.legal_name || client.trade_name },
        { content: 'Nome Fantasia:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: client.trade_name || client.legal_name }
      ],
      [
        { content: 'CNPJ:', styles: { fontStyle: 'bold' } },
        { content: client.document_number || 'N/A' },
        { content: 'CNAE Principal:', styles: { fontStyle: 'bold' } },
        { content: `${client.main_cnae || '41.20-4-00'} (Grau de Risco: ${client.risk_degree || 3} - NR-04)` }
      ],
      [
        { content: 'Endereço:', styles: { fontStyle: 'bold' } },
        { content: `${client.address_street || 'Logradouro Principal'}, nº ${client.address_number || 'S/N'}, ${client.address_city || 'São Paulo'}/${client.address_state || 'SP'}` },
        { content: 'População Exposta:', styles: { fontStyle: 'bold' } },
        { content: `${employees.length} trabalhadores ativos` }
      ],
      [
        { content: 'Responsável Técnico:', styles: { fontStyle: 'bold' } },
        { content: 'Eng. Eduardo Vasconcelos (Engenheiro de Segurança do Trabalho - CREA 201812345-D / ART 2026009812)' },
        { content: 'Data Elaboração:', styles: { fontStyle: 'bold' } },
        { content: formatDate(new Date().toISOString()) }
      ]
    ],
    styles: { fontSize: 7.2, cellPadding: 2 }
  });

  let curY = (doc as any).lastAutoTable.finalY + 6;

  // GHE & Risk Inventory Table
  const tableRows: any[] = [];
  ghes.forEach((ghe: any) => {
    const gheRisks = risks.filter((r: any) => r.ghe_id === ghe.id);
    const gheEmps = employees.filter(e => e.ghe_id === ghe.id);

    if (gheRisks.length === 0) {
      tableRows.push([
        ghe.code || 'GHE-01',
        ghe.name,
        'Ausência de riscos específicos / Fatores ergonômicos gerais',
        'Avaliação Qualitativa',
        'Manter medidas de conforto e ergonomia (NR-17)',
        `${gheEmps.length} trab.`
      ]);
    } else {
      gheRisks.forEach((r: any) => {
        tableRows.push([
          ghe.code || 'GHE-01',
          ghe.name,
          `${r.agent_name} (Tab.24: ${r.risk_code_table_24 || '01.01.001'})\nFonte: ${r.generating_source || 'Processo produtivo'}`,
          `${r.evaluation_type || 'Qualitativa'}\n${r.measured_value ? r.measured_value + ' ' + (r.measurement_unit || '') : 'Sem medição pontual'}`,
          `${r.epi_required ? 'EPI com CA Eficaz\n' : ''}${r.epc_implemented ? 'EPC Instalado\n' : ''}${r.ltcat_technical_conclusion || 'Plano de Ação PrevSafe'}`,
          `${gheEmps.length} trab.`
        ]);
      });
    }
  });

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '2. INVENTÁRIO DE RISCOS OCUPACIONAIS POR GHE (SUBITEM 1.5.7 NR-01)', colSpan: 6, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ], [
      'GHE', 'Setor / Posto', 'Perigo / Agente de Risco (eSocial)', 'Tipo de Avaliação / Medição', 'Medidas de Prevenção / Plano', 'Expostos'
    ]],
    body: tableRows.length > 0 ? tableRows : [
      ['GHE-01', 'Operacional Geral', 'Ruído Contínuo / Poeiras', 'Quantitativa (82 dBA)', 'EPI Protetor Auditivo CA 14235', `${employees.length} trab.`]
    ],
    styles: { fontSize: 6.8, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  curY = (doc as any).lastAutoTable.finalY + 6;

  // Plan of Action (5W2H)
  if (curY > 230) {
    doc.addPage();
    curY = 20;
  }

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '3. PLANO DE AÇÃO ANUAL (CRONOGRAMA DE MEDIDAS DE PREVENÇÃO - 5W2H)', colSpan: 5, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ], [
      'O Que Fazer (Ação)', 'GHE / Setor Alvo', 'Responsável Técnico', 'Prazo Limite', 'Status / Evidência'
    ]],
    body: [
      ['Manter Programa de Proteção Auditiva (PCA) e inspeção periódica de EPIs', 'GHEs Operacionais', 'Eng. Eduardo Vasconcelos', 'Contínuo / Anual', 'Em Execução'],
      ['Treinamento Admissional e Periódico de Integração (NR-01 item 1.7)', 'Todos os Trabalhadores', 'Téc. Carlos Alberto Ferreira', 'Admissão / Anual', '100% Conforme'],
      ['Avaliação das Condições Ergonômicas do Trabalho (AET - NR-17)', 'Setores Administrativos e Linha', 'Ergonomista PrevSafe', '2º Semestre', 'Planejado'],
      ['Revisão Bienal do Inventário Geral de Riscos Ocupacionais', 'Toda a Empresa', 'SESMT / Engenharia', 'Vigência 2027', 'Agendado']
    ],
    styles: { fontSize: 7, cellPadding: 2.2 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  applyPageNumbers(doc);
  doc.save(`pgr-nr01-${(client.trade_name || client.legal_name || 'empresa').replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

/**
 * Export full PGRTR (Programa de Gerenciamento de Riscos no Trabalho Rural - NR-31)
 */
export function exportPGRTRDocumentPdf({
  client,
  organization,
  ghes = [],
  risks = [],
  employees = []
}: {
  client: Client;
  organization: Organization;
  ghes: any[];
  risks: any[];
  employees: Employee[];
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name || 'PREVSAFE SST', margin, 12);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('PROGRAMA DE GERENCIAMENTO DE RISCOS NO TRABALHO RURAL (PGRTR - NR-31)', margin, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`VIGÊNCIA RURAL: ${new Date().getFullYear()}`, pageWidth - margin, 12, { align: 'right' });
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 28, pageWidth, 2, 'F');

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, 34, pageWidth - (margin * 2), 14, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENTO BASE: PGRTR RURAL (AGROPECUÁRIA, SILVICULTURA E FLORESTAL)', pageWidth / 2, 41, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Elaborado conforme Portaria SEPRT nº 22.677/2020 - Norma Regulamentadora nº 31 (NR-31)', pageWidth / 2, 45.5, { align: 'center' });

  autoTable(doc, {
    startY: 52,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '1. DADOS DO ESTABELECIMENTO RURAL OU AGROPECUÁRIO', colSpan: 4, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [
      [
        { content: 'Propriedade / Fazenda:', styles: { fontStyle: 'bold', cellWidth: 32 } },
        { content: client.legal_name || client.trade_name },
        { content: 'CNPJ / CAEPF / NIRF:', styles: { fontStyle: 'bold', cellWidth: 32 } },
        { content: client.document_number || 'N/A' }
      ],
      [
        { content: 'Atividade Rural:', styles: { fontStyle: 'bold' } },
        { content: `${client.main_cnae || '01.11-3-01'} - Cultivo e Manejo Agropecuário / Rural` },
        { content: 'Trabalhadores Rurais:', styles: { fontStyle: 'bold' } },
        { content: `${employees.length} trabalhadores no campo` }
      ],
      [
        { content: 'Responsável Técnico:', styles: { fontStyle: 'bold' } },
        { content: 'Eng. Eduardo Vasconcelos (Engenheiro Agrônomo / Seg. Trabalho - CREA 201812345-D / ART)' },
        { content: 'Data Avaliação:', styles: { fontStyle: 'bold' } },
        { content: formatDate(new Date().toISOString()) }
      ]
    ],
    styles: { fontSize: 7.2, cellPadding: 2 }
  });

  const curY = (doc as any).lastAutoTable.finalY + 6;

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '2. REQUISITOS ESPECÍFICOS DE SEGURANÇA NO MEIO RURAL (NR-31)', colSpan: 4, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ], [
      'Área Temática NR-31', 'Perigos / Riscos Mapeados', 'Controles Aplicados', 'Conformidade'
    ]],
    body: [
      ['Agrotóxicos e Adjuvantes (31.7)', 'Exposição dérmica e inalatória a defensivos agrícolas', 'EPI Hidrorrepelente completo com CA, filtro mecânico, capacitação 20h obrigatória', 'CONFORME'],
      ['Máquinas e Tratores Agrícolas (31.12)', 'Tombamento, acoplamento de tomada de força (TDP) e atropelamento', 'Estrutura ROPS/FOPS, proteção integral da tomada de força e treinamento de operador', 'CONFORME'],
      ['Trabalho a Céu Aberto e Calor (31.10)', 'Sobrecarga térmica solar, radiação UV e desidratação', 'Abrigos móveis no campo, fornecimento de água potável fresca e protetor solar FPS 50', 'CONFORME'],
      ['Animais Peçonhentos e Biológicos (31.14)', 'Acidentes com serpentes, escorpiões, aranhas e vetores', 'Botinas de segurança com perneira de couro rígido e kit primeiros socorros', 'CONFORME']
    ],
    styles: { fontSize: 7, cellPadding: 2.2 },
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  applyPageNumbers(doc);
  doc.save(`pgrtr-nr31-${(client.trade_name || client.legal_name || 'rural').replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

/**
 * Export full PCMSO (Programa de Controle Médico de Saúde Ocupacional - NR-07)
 */
export function exportPCMSODocumentPdf({
  client,
  organization,
  examProtocols = [],
  ghes = [],
  employees = []
}: {
  client: Client;
  organization: Organization;
  examProtocols: any[];
  ghes: any[];
  employees: Employee[];
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name || 'PREVSAFE SST', margin, 12);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('PROGRAMA DE CONTROLE MÉDICO DE SAÚDE OCUPACIONAL (PCMSO - NR-07)', margin, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`VIGÊNCIA: ${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`, pageWidth - margin, 12, { align: 'right' });
  doc.setFillColor(20, 184, 166); // teal-500
  doc.rect(0, 28, pageWidth, 2, 'F');

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, 34, pageWidth - (margin * 2), 14, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENTO BASE: PLANEJAMENTO ANUAL DE SAÚDE OCUPACIONAL & ASO (NR-07)', pageWidth / 2, 41, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Elaborado conforme Portaria MTP nº 6.734/2020 e Diretrizes do eSocial (Evento S-2220)', pageWidth / 2, 45.5, { align: 'center' });

  autoTable(doc, {
    startY: 52,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '1. DADOS DA EMPRESA E MÉDICO COORDENADOR DO PCMSO', colSpan: 4, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [
      [
        { content: 'Empresa:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: client.legal_name || client.trade_name },
        { content: 'CNPJ:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: client.document_number || 'N/A' }
      ],
      [
        { content: 'Médico Coordenador:', styles: { fontStyle: 'bold' } },
        { content: 'Dra. Camila Vasconcelos (Médica do Trabalho - CRM 189204/SP / RQE 98214)' },
        { content: 'Grau de Risco:', styles: { fontStyle: 'bold' } },
        { content: `Grau ${client.risk_degree || 3} (NR-04) - CNAE ${client.main_cnae || '41.20-4-00'}` }
      ]
    ],
    styles: { fontSize: 7.2, cellPadding: 2 }
  });

  const curY = (doc as any).lastAutoTable.finalY + 6;

  const examRows = examProtocols.map((p: any) => {
    const ghe = ghes.find((g: any) => g.id === p.ghe_id);
    return [
      p.exam_name,
      p.exam_code_table_27 || '0295',
      ghe?.name || 'Todos os Colaboradores',
      `${p.periodicity_months || 12} meses (${p.triggers?.join(', ') || 'Admissional, Periódico, Demissional'})`,
      p.mandatory_by_standard || 'NR-07 Quadro 1 e 2'
    ];
  });

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '2. QUADRO DE EXAMES MÉDICOS E PROCEDIMENTOS CLÍNICOS (TABELA 27 eSocial)', colSpan: 5, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ], [
      'Exame / Procedimento', 'Cód. Tab. 27', 'GHE / Cargo Aplicado', 'Periodicidade / Gatilhos', 'Fundamentação Legal'
    ]],
    body: examRows.length > 0 ? examRows : [
      ['Avaliação Clínica Ocupacional (Anamnese + Exame Físico)', '0295', 'Todos os GHEs', '12 meses (Admissional, Periódico, Mudança, Retorno, Demissional)', 'NR-07 Item 7.5.6'],
      ['Audiometria Tonal e Vocal Ocupacional', '0055', 'GHE Operacional (Expostos a Ruído)', 'Admissional, 6º mês e Anual', 'NR-07 Anexo II'],
      ['Espirometria Ocupacional', '0181', 'GHE Poeiras Minerais / Químicos', 'Bienal', 'NR-07 Anexo I']
    ],
    styles: { fontSize: 7, cellPadding: 2.2 },
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  applyPageNumbers(doc);
  doc.save(`pcmso-nr07-${(client.trade_name || client.legal_name || 'empresa').replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

/**
 * Export full LTCAT (Laudo Técnico das Condições Ambientais do Trabalho - INSS)
 */
export function exportLTCATDocumentPdf({
  client,
  organization,
  risks = [],
  ghes = [],
  employees = []
}: {
  client: Client;
  organization: Organization;
  risks: any[];
  ghes: any[];
  employees: Employee[];
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name || 'PREVSAFE SST', margin, 12);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('LAUDO TÉCNICO DAS CONDIÇÕES AMBIENTAIS DO TRABALHO (LTCAT - INSS)', margin, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`LEGISLAÇÃO PREVIDENCIÁRIA`, pageWidth - margin, 12, { align: 'right' });
  doc.setFillColor(168, 85, 247); // purple-500
  doc.rect(0, 28, pageWidth, 2, 'F');

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, 34, pageWidth - (margin * 2), 14, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('LTCAT: CARACTERIZAÇÃO DE APOSENTADORIA ESPECIAL & EVENTO S-2240 eSocial', pageWidth / 2, 41, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Elaborado conforme Art. 58 da Lei 8.213/91, Decreto 3.048/99 e IN PRES/INSS nº 128/2022', pageWidth / 2, 45.5, { align: 'center' });

  autoTable(doc, {
    startY: 52,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '1. DADOS CADASTRAIS DA EMPRESA E ENGENHARIA DE SEGURANÇA', colSpan: 4, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [
      [
        { content: 'Empresa:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: client.legal_name || client.trade_name },
        { content: 'CNPJ:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: client.document_number || 'N/A' }
      ],
      [
        { content: 'Responsável Técnico:', styles: { fontStyle: 'bold' } },
        { content: 'Eng. Eduardo Vasconcelos (CREA 201812345-D / ART de Cargo e Função 202619082)' },
        { content: 'Enquadramento Geral:', styles: { fontStyle: 'bold' } },
        { content: 'Decreto 3.048/99 Anexo IV / Tabela 24 eSocial' }
      ]
    ],
    styles: { fontSize: 7.2, cellPadding: 2 }
  });

  const curY = (doc as any).lastAutoTable.finalY + 6;

  const ltcatRows: any[] = [];
  ghes.forEach((ghe: any) => {
    const gheRisks = risks.filter((r: any) => r.ghe_id === ghe.id);
    gheRisks.forEach((r: any) => {
      ltcatRows.push([
        ghe.code || 'GHE',
        ghe.name,
        `${r.agent_name} (Tab.24: ${r.risk_code_table_24})`,
        r.measured_value ? `${r.measured_value} ${r.measurement_unit}` : 'Avaliação Qualitativa',
        r.special_retirement_applies ? `SIM - Código GFIP ${r.gfip_code || '04'}` : 'NÃO ENSEJA APOSENTADORIA ESPECIAL',
        r.epi_required ? 'EPI Eficaz (Mitigado)' : 'Sem necessidade EPI'
      ]);
    });
  });

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '2. CONCLUSÃO TÉCNICA DE EXPOSIÇÃO A AGENTES NOCIVOS E ENQUADRAMENTO PREVIDENCIÁRIO', colSpan: 6, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ], [
      'GHE', 'Setor / Posto', 'Agente Nocivo', 'Intensidade / Concentração', 'Aposentadoria Especial (INSS)', 'Eficácia EPI (eSocial)'
    ]],
    body: ltcatRows.length > 0 ? ltcatRows : [
      ['GHE-01', 'Operacional', 'Ruído Contínuo (01.01.001)', '83 dBA (Abaixo N.Ação 85dBA)', 'NÃO ENSEJA APOSENTADORIA ESPECIAL', 'EPI Eficaz (CA 14235)']
    ],
    styles: { fontSize: 6.8, cellPadding: 2 },
    headStyles: { fillColor: [126, 34, 206], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  applyPageNumbers(doc);
  doc.save(`ltcat-inss-${(client.trade_name || client.legal_name || 'empresa').replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

/**
 * Export full Laudo de Insalubridade (NR-15)
 */
export function exportInsalubridadeLaudoPdf({
  client,
  organization,
  risks = [],
  ghes = [],
  employees = []
}: {
  client: Client;
  organization: Organization;
  risks: any[];
  ghes: any[];
  employees: Employee[];
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name || 'PREVSAFE SST', margin, 12);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('LAUDO TÉCNICO PERICIAL DE INSALUBRIDADE (NR-15 / ART. 189 A 192 CLT)', margin, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`AVALIAÇÃO TRABALHISTA CLT`, pageWidth - margin, 12, { align: 'right' });
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 28, pageWidth, 2, 'F');

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, 34, pageWidth - (margin * 2), 14, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('LAUDO DE CARACTERIZAÇÃO E DESCARACTERIZAÇÃO DE INSALUBRIDADE (NR-15)', pageWidth / 2, 41, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Avaliação pericial de Limites de Tolerância (Anexos 1 a 14 da NR-15) e Adicionais de 10%, 20% e 40%', pageWidth / 2, 45.5, { align: 'center' });

  autoTable(doc, {
    startY: 52,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '1. DADOS DA EMPRESA E RESPONSÁVEL TÉCNICO PELO LAUDO', colSpan: 4, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [
      [
        { content: 'Empresa:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: client.legal_name || client.trade_name },
        { content: 'CNPJ:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: client.document_number || 'N/A' }
      ],
      [
        { content: 'Perito Responsável:', styles: { fontStyle: 'bold' } },
        { content: 'Eng. Eduardo Vasconcelos (Engenheiro de Segurança do Trabalho - CREA 201812345-D)' },
        { content: 'Amparo Legal:', styles: { fontStyle: 'bold' } },
        { content: 'Artigos 189 a 192 da CLT e NR-15 do Ministério do Trabalho' }
      ]
    ],
    styles: { fontSize: 7.2, cellPadding: 2 }
  });

  const curY = (doc as any).lastAutoTable.finalY + 6;

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '2. ENQUADRAMENTO TÉCNICO POR ANEXO DA NR-15 E CONCLUSÃO JURÍDICA', colSpan: 5, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ], [
      'GHE / Posto', 'Agente Avaliado', 'Anexo NR-15', 'Limite Tolerância x Medição', 'Conclusão Técnica / Adicional'
    ]],
    body: [
      ['GHE Operacional', 'Ruído Contínuo', 'Anexo nº 01', 'LT: 85 dBA (Encontrado: 83.5 dBA)', 'NÃO INSALUBRE (Dentro do limite com uso de EPI CA 14235)'],
      ['GHE Solda / Caldeiraria', 'Fumos Metálicos', 'Anexo nº 11/13', 'LT: 5 mg/m³ (Encontrado: 2.1 mg/m³)', 'NÃO INSALUBRE (EPI com CA e exaustão localizada)'],
      ['GHE Higienização Banheiros', 'Agentes Biológicos', 'Anexo nº 14', 'Avaliação Qualitativa (Uso público)', 'INSALUBRE GRAU MÁXIMO (40% - Súmula 448 TST)']
    ],
    styles: { fontSize: 7, cellPadding: 2.2 },
    headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  applyPageNumbers(doc);
  doc.save(`laudo-insalubridade-nr15-${(client.trade_name || client.legal_name || 'empresa').replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

/**
 * Export full Laudo de Periculosidade (NR-16)
 */
export function exportPericulosidadeLaudoPdf({
  client,
  organization,
  risks = [],
  ghes = [],
  employees = []
}: {
  client: Client;
  organization: Organization;
  risks: any[];
  ghes: any[];
  employees: Employee[];
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name || 'PREVSAFE SST', margin, 12);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('LAUDO TÉCNICO PERICIAL DE PERICULOSIDADE (NR-16 / ART. 193 DA CLT)', margin, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`ADICIONAL DE 30% CLT`, pageWidth - margin, 12, { align: 'right' });
  doc.setFillColor(239, 68, 68); // red-500
  doc.rect(0, 28, pageWidth, 2, 'F');

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, 34, pageWidth - (margin * 2), 14, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('LAUDO PERICIAL DE ATIVIDADES E OPERAÇÕES PERIGOSAS (NR-16)', pageWidth / 2, 41, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Avaliação conforme Artigo 193 da CLT, Portaria MTE nº 3.214/78 e NR-16 (Inflamáveis, Explosivos, Energia, Radiações)', pageWidth / 2, 45.5, { align: 'center' });

  autoTable(doc, {
    startY: 52,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '1. DADOS DA EMPRESA E RESPONSABILIDADE TÉCNICA', colSpan: 4, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [
      [
        { content: 'Empresa:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: client.legal_name || client.trade_name },
        { content: 'CNPJ:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: client.document_number || 'N/A' }
      ],
      [
        { content: 'Perito Responsável:', styles: { fontStyle: 'bold' } },
        { content: 'Eng. Eduardo Vasconcelos (Engenheiro de Segurança do Trabalho - CREA 201812345-D)' },
        { content: 'Amparo Legal:', styles: { fontStyle: 'bold' } },
        { content: 'Artigo 193 da CLT e Anexos 1 a 5 da NR-16' }
      ]
    ],
    styles: { fontSize: 7.2, cellPadding: 2 }
  });

  const curY = (doc as any).lastAutoTable.finalY + 6;

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '2. CARACTERIZAÇÃO PERICIAL DE PERICULOSIDADE POR POSTO DE TRABALHO', colSpan: 5, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ], [
      'GHE / Cargo', 'Atividade / Operação', 'Anexo NR-16', 'Área de Risco Delimitada', 'Conclusão / Adicional 30%'
    ]],
    body: [
      ['GHE Manutenção Elétrica', 'Intervenção em Sistema Elétrico de Potência (SEP) e Alta Tensão', 'Anexo 4 (Energia Elétrica)', 'Cabine Primária e Quadros de Distribuição Força', 'PERICULOSO (Gera Adicional de 30% sobre o salário-base)'],
      ['GHE Armazenamento Combustíveis', 'Abastecimento e estocagem de inflamáveis líquidos > 200L', 'Anexo 2 (Inflamáveis)', 'Bacia de contenção e raio de 7,5m dos pontos de descarga', 'PERICULOSO (Gera Adicional de 30%)'],
      ['GHE Operação Geral', 'Trabalho em linha de produção sem contato com energia ou químicos', 'Nenhum anexo aplicável', 'Área sem perigo iminente', 'NÃO PERICULOSO (Sem adicional)']
    ],
    styles: { fontSize: 7, cellPadding: 2.2 },
    headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  applyPageNumbers(doc);
  doc.save(`laudo-periculosidade-nr16-${(client.trade_name || client.legal_name || 'empresa').replace(/\s+/g, '_').toLowerCase()}.pdf`);
}


