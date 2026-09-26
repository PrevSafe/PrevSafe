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
  SSTExamProtocol,
  TrainingAttendee,
  Contract,
  Proposal
} from '@/types';
import * as XLSX from 'xlsx';
import { formatDate } from '@/lib/utils';
import { DECLARACAO_DE_INTEGRIDADE } from '@/lib/documentoHash';
import { ANEXOS_NR16, montarCorpoInsalubridade, montarCorpoPericulosidade } from '@/lib/laudoDados';
import type { CorpoLaudo } from '@/lib/laudoDados';
import { dataDeHoje } from '@/lib/datas';
import { formatarCPF } from '@/lib/validacoesBr';
import { exameSugeridosParaAso } from '@/lib/esocialDados';
import { VERSAO_DO_DOCUMENTO } from '@/lib/versaoDoDocumento';
import { GATILHOS_DE_TREINAMENTO_EVENTUAL, BASE_POR_EXTENSO } from '@/lib/catalogoDeTreinamentos';
import {
  NR17_ASPECTOS,
  NR17_FATORES_DA_ORGANIZACAO,
  NR17_EXIGENCIAS_A_EVITAR,
  NR17_ALTERNATIVAS_DE_PREVENCAO,
  NR17_MINIMO_DE_ALTERNATIVAS,
  NR17_REQUISITOS_DAS_PAUSAS,
  NR17_GATILHOS_DA_AET,
  NR17_ETAPAS_DA_AET,
  PARAMETROS_DE_CONFORTO,
  CONCLUSAO_POR_EXTENSO,
  ABORDAGEM_POR_EXTENSO,
  dispensadaDeElaborarAET,
  NR17_FUNDAMENTO_DA_DISPENSA
} from '@/lib/nr17';
import {
  classificarRisco,
  matrizDoModelo,
  FAIXAS_DO_MODELO,
  DECISAO_POR_NIVEL
} from '@/lib/classificacaoDeRisco';
import { calculateSesmtDimensioning } from '@/lib/nr4';
import { descreverSituacao } from '@/lib/situacaoOperacional';
import {
  PGR_NORMA_DE_REGENCIA,
  PGR_OBJETIVO,
  PGR_COMPOSICAO_DOCUMENTAL,
  PGR_ABRANGENCIA,
  PGR_BASE_LEGAL,
  PGR_TERMOS,
  PGR_RESPONSABILIDADES,
  PGR_CATEGORIAS_DE_PERIGO,
  PGR_SEVERIDADE_CABECALHO,
  PGR_SEVERIDADE,
  PGR_PROBABILIDADE_REGRAS,
  PGR_PROBABILIDADE_FISICO_QUIMICO,
  PGR_PROBABILIDADE_REFERENCIAS,
  PGR_PROBABILIDADE_BIOLOGICO,
  PGR_PROBABILIDADE_ACIDENTE,
  PGR_PROBABILIDADE_ERGONOMICO,
  PGR_REGRAS_DE_DECISAO,
  PGR_CAMPOS_DO_INVENTARIO,
  PGR_REGRAS_DO_PLANO,
  PGR_STATUS_DO_PLANO,
  PGR_HIPOTESES_DE_REVISAO,
  PGR_GUARDA,
  PGR_ANEXOS,
  PGR_CHECKLIST,
  PGR_ADVERTENCIAS
} from '@/lib/pgrModelo';

/**
 * POR QUE NAO HA SINAL DE CONFERIDO EM NENHUM TEXTO DESTE ARQUIVO
 *
 * O jsPDF escreve a string em WinAnsi. Quando ela traz UM caractere de fora
 * dessa tabela, ele troca a CODIFICACAO DA STRING INTEIRA para UTF-16BE sem
 * marcar isso no PDF - e o leitor entao desenha cada byte como um caractere.
 * "Regular" com o sinal de conferido no fim saia impresso "R e g u l a r '",
 * letra por letra, e foi assim que o Kit Admissional chegou ao cliente.
 *
 * FORA da tabela (nao usar): U+2713 e U+2714 conferido, U+2715 a U+2718 cruz,
 * U+2192 seta, U+25A0 quadrado, U+26A0 aviso, U+2514 canto de arvore, e os
 * demais simbolos acima de U+2026.
 *
 * DENTRO da tabela (pode usar): acentos, °, º, • bullet, – e — travessoes,
 * … reticencias, « » › chevrons.
 *
 * scripts/verificar-kit-admissional.mjs falha se algum dos proibidos voltar.
 */

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
  doc.text(`Doc: ${organizationDocumentLine(organization)}`, pageWidth - 14, 18, { align: 'right' });

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

    // Carimbo da versao que gerou o documento. Sem ele nao ha como saber, do
    // PDF na mao, se ele saiu de um build antigo guardado no cache do
    // navegador - foi exatamente o que aconteceu depois da primeira correcao.
    // Vai junto do texto da esquerda: centralizado colidiria com ele.
    doc.text(
      `PrevSafe SST - Plataforma Integrada de Saúde e Segurança do Trabalho  |  ${VERSAO_DO_DOCUMENTO}`,
      14, pageHeight - 7
    );
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
}

/**
 * Export a complete summary report of Service Orders (OS) to PDF
 */
// Responsabilidade tecnica dos laudos: vem sempre das Configuracoes da empresa.
// Um PDF entregue ao cliente nunca pode sair com nome/CREA/CRM inventados.
const RT_NAO_INFORMADO = 'Não informado (preencha em Configurações > Responsabilidade Técnica)';
const NAO_INFORMADO = 'Não informado';
const LINHA_PARA_PREENCHER = '____________________';
const SEM_RISCO_NO_INVENTARIO = 'Nenhum agente desta natureza no inventário de riscos (PGR)';
const LINHA_CURTA = '________';
const TIPO_DE_ESTABELECIMENTO: Record<string, string> = {
  MATRIZ: 'Matriz',
  FILIAL: 'Filial',
  OBRA: 'Obra de construção civil (CNO)',
  POSTO_SERVICO: 'Posto de trabalho externo'
};
/** Rotulos do "Tipo de Ambiente Físico" do cadastro de setor. */
const AMBIENTE_FISICO: Record<string, string> = {
  OPERACIONAL_FECHADO: 'Operacional fechado (galpão / oficina)',
  OPERACIONAL_ABERTO: 'Operacional aberto (pátio / externo)',
  ADMINISTRATIVO: 'Administrativo (escritório)',
  CANTEIRO_OBRA: 'Canteiro de obras',
  LABORATORIO: 'Laboratório',
  ESPACO_CONFINADO: 'Espaço confinado (NR-33)',
  VEICULO_TRANSPORTE: 'Veículo / transporte',
  OUTROS: 'Outros ambientes'
};
const RESULTADO_ASO: Record<string, string> = {
  APTO: 'Apto',
  INAPTO: 'Inapto',
  APTO_COM_RESTRICAO: 'Apto com restrição'
};
const TIPO_DE_ASO: Record<string, string> = {
  ADMISSIONAL: 'Admissional',
  PERIODICO: 'Periódico',
  RETORNO_TRABALHO: 'Retorno ao trabalho',
  MUDANCA_RISCO: 'Mudança de risco ocupacional',
  DEMISSIONAL: 'Demissional'
};
const RESULTADO_EXAME: Record<string, string> = {
  NORMAL: 'Normal',
  ALTERADO: 'Alterado',
  ESTAVEL: 'Estável',
  AGRAVAMENTO: 'Agravamento'
};

function technicalResponsibleLine(organization: Organization): string {
  const name = organization?.technical_responsible_name?.trim();
  if (!name) return RT_NAO_INFORMADO;
  const parts = [
    organization?.technical_responsible_title?.trim(),
    organization?.technical_responsible_council?.trim(),
    organization?.technical_responsible_art?.trim() ? `ART ${organization.technical_responsible_art.trim()}` : ''
  ].filter(Boolean);
  return parts.length > 0 ? `${name} (${parts.join(' - ')})` : name;
}

function technicalResponsibleName(organization: Organization): string {
  return organization?.technical_responsible_name?.trim() || RT_NAO_INFORMADO;
}

/** CNAE do cliente, ou aviso de pendencia. Nunca um CNAE de exemplo. */
function cnaeLine(client: Client): string {
  return client?.main_cnae?.trim() || 'CNAE NÃO INFORMADO';
}

/** Grau de risco do Anexo I da NR-04, ou aviso de pendencia. Nunca estimado. */
function riskDegreeLine(client: Client): string {
  return client?.risk_degree
    ? `Grau ${client.risk_degree} (NR-04)`
    : 'GRAU DE RISCO NÃO CLASSIFICADO';
}

/**
 * Documento do cliente (CNPJ/CPF/CAEPF/CNO), ou aviso de pendencia.
 *
 * O fallback antigo era '00.000.000/0001-00' - um CNPJ de aparencia valida que
 * nao pertence a ninguem. Num documento entregue ao cliente, um numero errado e
 * pior que um campo declaradamente vazio.
 */
function clientDocumentLine(client?: Client | null): string {
  return client?.document_number?.trim() || 'DOCUMENTO NÃO INFORMADO';
}

/** Documento da organizacao emitente, ou aviso de pendencia. */
function organizationDocumentLine(organization?: Organization | null): string {
  return organization?.document_number?.trim() || 'CNPJ NÃO INFORMADO';
}

function pcmsoPhysicianLine(organization: Organization): string {
  const name = organization?.pcmso_physician_name?.trim();
  if (!name) return RT_NAO_INFORMADO;
  const parts = [
    organization?.pcmso_physician_crm?.trim(),
    organization?.pcmso_physician_rqe?.trim() ? `RQE ${organization.pcmso_physician_rqe.trim()}` : ''
  ].filter(Boolean);
  return parts.length > 0 ? `${name} (${parts.join(' / ')})` : name;
}

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

  const filename = `relatorio-ordens-servico-sst-${dataDeHoje()}.pdf`;
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
  const subtitle = `Cliente: ${client?.trade_name || client?.legal_name || 'Cliente'} | CNPJ: ${clientDocumentLine(client)}`;

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
  doc.text(`Responsável Técnico: ${serviceOrder.technical_responsible_name?.trim() || 'NAO INFORMADO'}`, 18, currentY + 20);
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
        `   » Tarefa ${sIdx + 1}.${tIdx + 1}`,
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
        if (itemText.includes('»')) {
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

  const filename = `relatorio-esocial-sst-logs-${dataDeHoje()}.pdf`;
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
        { content: `${os.employer_document || 'DOCUMENTO NAO INFORMADO'} | CNAE: ${os.employer_cnae || 'NAO INFORMADO'} (${os.employer_risk_grade ? `Grau ${os.employer_risk_grade}` : 'GRAU DE RISCO NAO CLASSIFICADO'})`, styles: { cellWidth: 69 } }
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
  const prohibitionsText = (os.prohibitions_unsafe_acts || []).map((pr, i) => `• ${pr}`).join('\n');
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
    doc.text(`[Assinado Eletronicamente / Biometria Facial - ${formatDate(os.signed_at || os.issue_date)}]`, margin + (colWidth / 2), currentY + 8, { align: 'center' });
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
  doc.text(os.responsible_engineer_name?.trim() || 'RESPONSAVEL TECNICO NAO INFORMADO', engX + (colWidth / 2), currentY + 16, { align: 'center' });
  
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(os.responsible_engineer_registration?.trim() || 'REGISTRO PROFISSIONAL NAO INFORMADO', engX + (colWidth / 2), currentY + 20, { align: 'center' });
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

  const filename = `lote-ordens-de-servico-nr01-${workOrders.length}-funcionarios-${dataDeHoje()}.pdf`;
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
        { content: clientDocumentLine(client), styles: { cellWidth: 74 } }
      ],
      [
        { content: 'Colaborador:', styles: { fontStyle: 'bold' } },
        { content: `${employee.name} (CPF: ${employee.cpf})`, styles: { fontStyle: 'bold' } },
        { content: 'Matrícula:', styles: { fontStyle: 'bold' } },
        { content: employee.registration_number || 'S/N' }
      ],
      [
        { content: 'Cargo / Função:', styles: { fontStyle: 'bold' } },
        { content: `${employee.job_title} (CBO: ${employee.cbo || 'não informado'})` },
        { content: 'Setor / GHE:', styles: { fontStyle: 'bold' } },
        { content: `${employee.sector_name} | ${employee.ghe_name || 'GHE Operacional'}` }
      ],
      [
        { content: 'Admissão:', styles: { fontStyle: 'bold' } },
        { content: formatDate(employee.admission_date) },
        { content: 'Data Emissão:', styles: { fontStyle: 'bold' } },
        { content: formatDate(dataDeHoje()) }
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
    del.delivery_reason === 'ADMISSAO' ? 'Admissional' : (del.delivery_reason === 'PERIODICA_SUBSTITUICAO' ? 'Periódica' : 'Substituição'),
    del.biometric_face_matched ? `Biometria Facial (${(del.biometric_confidence! * 100).toFixed(0)}%)` : (del.term_receipt_accepted ? 'Assinatura Manual' : 'Pendente'),
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
          { content: `${emp.job_title} (CBO: ${emp.cbo || 'não informado'})` },
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
      d.biometric_face_matched ? 'Biometria Facial' : (d.term_receipt_accepted ? 'Assinatura' : 'Pendente')
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

  doc.save(`lote-fichas-epi-nr06-${employees.length}-funcionarios-${dataDeHoje()}.pdf`);
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

  const finalName = fileName || `ordens-de-servico-nr01-${dataDeHoje()}.xlsx`;
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
    'Cargo': d.employee_job,
    'Setor': d.employee_sector,
    'Nome do EPI': d.epi_name,
    'C.A. (Certificado)': d.ca_number,
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

  const finalName = fileName || `relatorio-entregas-epi-nr06-${dataDeHoje()}.xlsx`;
  XLSX.writeFile(workbook, finalName);
}

// SSTIntegrationTraining carries two generations of field names (see types/index.ts);
// records created by the UI use the *_title / nr_framework / program_content_* spelling.
function resolveTrainingFields(training: SSTIntegrationTraining) {
  return {
    title: training.title || training.training_title || 'Treinamento de Integração em SST',
    code: training.code || training.training_code || 'SEM-CODIGO',
    normativeReference: training.normative_reference || training.nr_framework || 'NR-01',
    location: training.location || training.location_or_platform || 'Não informado',
    scheduleTime: training.schedule_time || 'Não informado',
    syllabus: training.syllabus || training.program_content_syllabus || [],
    evaluationMethod: training.evaluation_method || training.training_evaluation_method || 'Não informado',
    instructorRegistration: training.instructor_registration || training.instructor_registration_number || 'Não informado',
    technicalManagerName: training.technical_manager_name || training.technical_supervisor_name,
    technicalManagerRegistration: training.technical_manager_registration || training.technical_supervisor_registration,
  };
}

/**
 * Generates an official, legally compliant Ata de Presença / Lista de Presença de Treinamento de Integração (NR-01 item 1.7) PDF
 */
export function exportTrainingAttendanceListPDF(
  training: SSTIntegrationTraining,
  organization: Organization,
  client?: Client
): void {
  const t = resolveTrainingFields(training);
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
  doc.text(`Cód: ${t.code}`, pageWidth - margin, 10, { align: 'right' });
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 24, pageWidth, 1.5, 'F');

  // Title Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, 28, pageWidth - (margin * 2), 12, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(t.title.toUpperCase(), pageWidth / 2, 34, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Enquadramento Legal: ${t.normativeReference} | Carga Horária: ${training.workload_hours}h | Modalidade: ${training.modality}`, pageWidth / 2, 38, { align: 'center' });

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
        { content: clientDocumentLine(client), styles: { cellWidth: 66 } }
      ],
      [
        { content: 'Local de Realização:', styles: { fontStyle: 'bold' } },
        { content: t.location },
        { content: 'Data e Horário:', styles: { fontStyle: 'bold' } },
        { content: `${formatDate(training.start_date)} ${training.end_date && training.end_date !== training.start_date ? `a ${formatDate(training.end_date)}` : ''} (${t.scheduleTime})` }
      ],
      [
        { content: 'Instrutor Responsável:', styles: { fontStyle: 'bold' } },
        { content: `${training.instructor_name} (${training.instructor_qualification})` },
        { content: 'Registro / Conselho:', styles: { fontStyle: 'bold' } },
        { content: t.instructorRegistration }
      ],
      [
        { content: 'Critério de Avaliação:', styles: { fontStyle: 'bold' } },
        { content: t.evaluationMethod, colSpan: 3 }
      ]
    ],
    styles: { fontSize: 7.5, cellPadding: 2 }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 3;

  // Programmatic Content (Conteúdo Programático Obrigatório NR-01)
  const syllabusBullets = t.syllabus.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
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
    att.present ? (att.signature_type === 'DIGITAL_BIOMETRIC' ? 'Biometria Facial' : 'Assinado') : 'Pendente'
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
  doc.text(`Instrutor / ${training.instructor_qualification} (${t.instructorRegistration})`, margin + (colWidth / 2), currentY + 18, { align: 'center' });

  // Technical Manager signature
  const rightX = margin + colWidth + 10;
  doc.line(rightX, currentY + 10, rightX + colWidth, currentY + 10);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(t.technicalManagerName || 'Engenharia de Segurança do Trabalho', rightX + (colWidth / 2), currentY + 14, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(t.technicalManagerRegistration?.trim() || 'REGISTRO PROFISSIONAL NAO INFORMADO', rightX + (colWidth / 2), currentY + 18, { align: 'center' });

  applyPageNumbers(doc);

  const cleanCode = t.code.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
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
  const t = resolveTrainingFields(training);
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
  doc.text(`Empresa: ${client?.legal_name || training.client_name || 'Empresa Cliente'} - CNPJ: ${clientDocumentLine(client)}`, pageWidth / 2, 83, { align: 'center' });

  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  const text2 = `concluiu com aproveitamento satisfatório o:`;
  doc.text(text2, pageWidth / 2, 94, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(t.title.toUpperCase(), pageWidth / 2, 103, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Em estrita conformidade com a ${t.normativeReference}, com carga horária total de ${training.workload_hours} horas,`, pageWidth / 2, 111, { align: 'center' });
  doc.text(`na modalidade ${training.modality}, realizado no dia ${formatDate(training.start_date)} em ${t.location}.`, pageWidth / 2, 116, { align: 'center' });

  // Date of Issue
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emitido em ${formatDate(training.start_date)} | Código de Validação: ${t.code}-${attendee.employee_cpf.replace(/\D/g, '').slice(-4)}`, pageWidth / 2, 132, { align: 'center' });

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
  doc.text(`${training.instructor_qualification} - ${t.instructorRegistration}`, leftX + (colW / 2), signY + 8, { align: 'center' });

  // Technical Manager Signature
  const rightX = (pageWidth / 2) + 15;
  doc.line(rightX, signY, rightX + colW, signY);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(t.technicalManagerName || 'Responsável Técnico SESMT', rightX + (colW / 2), signY + 4, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(t.technicalManagerRegistration?.trim() || 'REGISTRO PROFISSIONAL NAO INFORMADO', rightX + (colW / 2), signY + 8, { align: 'center' });

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
  client?: Client,
  /**
   * Protocolos de exame do PCMSO. Sem eles o kit nao tinha como mostrar os
   * exames aplicados ao GHE - era a queixa "nao trouxe o exame que foi
   * aplicado". Opcional para nao quebrar quem ainda chama com 6 argumentos.
   */
  examProtocols: SSTExamProtocol[] = []
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // ------------------------------------------------------------------
  // O QUE EXISTE DE FATO
  //
  // Este kit e assinado pelo trabalhador. Cada linha dele e uma afirmacao
  // perante a fiscalizacao, entao nenhuma pode vir de um valor padrao: a
  // versao anterior imprimia "Regular", "Presenca Confirmada" e "Apto"
  // fixos no codigo - o "Apto" do ASO saia de employee.status === 'ACTIVE',
  // ou seja, de o cadastro estar ativo, nao de exame medico nenhum.
  // ------------------------------------------------------------------
  const entregasDoColaborador = deliveries.filter(d => d.employee_id === employee.id);

  const participante = training?.attendees?.find(a => a.employee_id === employee.id) || null;
  const presencaConfirmada = !!participante && (
    participante.present === true ||
    participante.completed === true ||
    (participante.attendance_rate_percent ?? 0) > 0
  );

  const asoDoKit = [...(employee.aso_history || [])]
    .sort((a, b) => String(b.exam_date || '').localeCompare(String(a.exam_date || '')))[0] || null;

  // Exames que o PCMSO exige desta pessoa, vindos dos protocolos aplicados ao
  // GHE dela. E a mesma funcao que a tela usa para montar o ASO, entao o kit
  // nao pode divergir do que o sistema mostra.
  const examesPrevistos = exameSugeridosParaAso(employee, examProtocols, 'ADMISSIONAL');
  const examesRealizados = asoDoKit?.exams || [];
  const MODALIDADE: Record<string, string> = {
    PRESENCIAL: 'Presencial',
    PRESENTIAL: 'Presencial',
    SEMIPRESENCIAL: 'Semipresencial',
    HYBRID: 'Semipresencial',
    EAD: 'EaD',
    EAD_DISTANCE: 'EaD'
  };
  const modalidadeTreinamento = training ? (MODALIDADE[training.modality] || training.modality) : '';

  // O que falta. Alimenta o quadro de pendencias e o termo do Art. 158 - uma
  // clausula so entra no termo se houver registro que a sustente.
  const pendenciasDoKit: string[] = [];
  if (!workOrder) {
    pendenciasDoKit.push('Ordem de Serviço (NR-01) ainda não gerada para esta função.');
  } else if (!workOrder.employee_signed) {
    pendenciasDoKit.push('Ordem de Serviço emitida, mas sem a ciência assinada pelo trabalhador (Art. 157 da CLT).');
  }
  if (entregasDoColaborador.length === 0) {
    pendenciasDoKit.push('Nenhuma entrega de EPI registrada com número de C.A. (NR-06).');
  }
  if (!training) {
    pendenciasDoKit.push('Treinamento de integração não registrado no sistema (NR-01 item 1.7).');
  } else if (!presencaConfirmada) {
    pendenciasDoKit.push('Treinamento de integração registrado, mas sem presença confirmada deste trabalhador.');
  }
  if (!asoDoKit) {
    pendenciasDoKit.push('ASO admissional não registrado (NR-07 item 7.5.2).');
  }
  if (examesPrevistos.length === 0) {
    pendenciasDoKit.push(
      'Nenhum exame do PCMSO aplicado ao GHE desta função — aplique em Engenharia SST > GHE & Inventário de Riscos > "Aplicar Exame".'
    );
  } else if (asoDoKit && examesRealizados.length === 0) {
    pendenciasDoKit.push(
      `ASO registrado sem o lançamento dos ${examesPrevistos.length} exame(s) previstos no PCMSO — o S-2220 sai incompleto.`
    );
  }
  if (!organization?.technical_responsible_name?.trim()) {
    pendenciasDoKit.push('Responsável técnico não preenchido em Configurações > Responsabilidade Técnica.');
  }

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
        { content: `${employee.name} (CPF: ${formatarCPF(employee.cpf)})`, styles: { cellWidth: 64, fontStyle: 'bold' } },
        { content: 'Data Admissão:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: formatDate(employee.admission_date), styles: { cellWidth: 66 } }
      ],
      [
        { content: 'Cargo / Função:', styles: { fontStyle: 'bold' } },
        { content: `${employee.job_title} (CBO: ${employee.cbo || 'não informado'})` },
        { content: 'Setor / GHE:', styles: { fontStyle: 'bold' } },
        { content: employee.ghe_name
            ? (employee.ghe_name === employee.sector_name
                ? employee.sector_name
                : `${employee.sector_name} | ${employee.ghe_name}`)
            // Era `|| 'GHE'`, que imprimia a sigla como se fosse o nome de um
            // grupo. Sem GHE atribuido o PCMSO e o PGR nao se ligam ao cargo.
            : `${employee.sector_name} | GHE não atribuído` }
      ],
      [
        { content: 'Empresa:', styles: { fontStyle: 'bold' } },
        { content: client?.legal_name || client?.trade_name || 'Empresa Cliente' },
        { content: 'CNPJ:', styles: { fontStyle: 'bold' } },
        { content: clientDocumentLine(client) }
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
        // Dizia "Vigência <data>" mostrando a data de EMISSÃO. A OS saia
        // emitida hoje e o kit anunciava essa data como vigência.
        { content: workOrder
            ? `${workOrder.os_code} — emitida em ${formatDate(workOrder.issue_date)}`
            : 'Não gerada', styles: { cellWidth: 80 } },
        { content: workOrder?.employee_signed
            ? `Assinada em ${formatDate(workOrder.signed_at || workOrder.issue_date)}`
            : 'Pendente de assinatura', styles: { halign: 'center' } }
      ],
      [
        { content: '2. Ficha de Entrega de EPI (NR-06)', styles: { fontStyle: 'bold' } },
        { content: entregasDoColaborador.length > 0
            ? `${entregasDoColaborador.length} EPI(s) registrado(s) com C.A.`
            : 'Nenhuma entrega registrada' },
        // Era 'Regular' fixo - impresso também com ZERO EPIs entregues.
        { content: entregasDoColaborador.length > 0 ? 'Registrada' : 'Pendente', styles: { halign: 'center' } }
      ],
      [
        { content: '3. Treinamento de Integração (NR-01 item 1.7)', styles: { fontStyle: 'bold' } },
        { content: training
            ? `${training.training_title || training.title || 'Treinamento de Integração em SST'} (${training.workload_hours}h)${modalidadeTreinamento ? ` — ${modalidadeTreinamento}` : ''}`
            : 'Não registrado no sistema' },
        // Era 'Presença Confirmada' fixo, inclusive sem treinamento nenhum.
        { content: presencaConfirmada ? 'Presença confirmada' : 'Pendente', styles: { halign: 'center' } }
      ],
      [
        { content: '4. ASO Admissional (NR-07)', styles: { fontStyle: 'bold' } },
        { content: asoDoKit
            ? `Realizado em ${formatDate(asoDoKit.exam_date)}${asoDoKit.physician_name ? ` — ${asoDoKit.physician_name}${asoDoKit.physician_crm ? ` (CRM ${asoDoKit.physician_crm}${asoDoKit.physician_uf ? '/' + asoDoKit.physician_uf : ''})` : ''}` : ''}`
            : 'Não registrado' },
        // O 'Apto' vinha de employee.status === 'ACTIVE': cadastro ativo virava
        // aptidão médica. Agora só o resultado do ASO responde por isso.
        { content: asoDoKit ? (RESULTADO_ASO[asoDoKit.result] || asoDoKit.result) : 'Pendente', styles: { halign: 'center' } }
      ]
    ],
    styles: { fontSize: 7.5, cellPadding: 2.5 }
  });

  curY = (doc as any).lastAutoTable.finalY + 4;

  // Pendencias. Sem este quadro o kit parecia completo quando nao estava.
  if (pendenciasDoKit.length > 0) {
    autoTable(doc, {
      startY: curY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [[
        { content: 'PENDÊNCIAS — NÃO ASSINAR ESTE KIT ANTES DE RESOLVER', styles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 } }
      ]],
      body: [[
        { content: pendenciasDoKit.map(p => `• ${p}`).join('\n') }
      ]],
      styles: { fontSize: 7, cellPadding: 2.5, fillColor: [255, 251, 235], textColor: [120, 53, 15] }
    });
    curY = (doc as any).lastAutoTable.finalY + 4;
  }

  // Legal Term & Consolidated Declaration
  //
  // As quatro clausulas eram impressas SEMPRE. A de numero 3 declarava que o
  // trabalhador recebeu os EPIs - e era posta na frente dele para assinar
  // mesmo com zero entregas registradas. Cada clausula agora depende do
  // registro que a sustenta.
  const clausulasDoTermo: string[] = [];
  if (presencaConfirmada) {
    clausulasDoTermo.push('Participou do Treinamento de Integração de Segurança do Trabalho (NR-01 item 1.7), recebendo orientações sobre os riscos ocupacionais, as medidas preventivas e os procedimentos em caso de emergência e primeiros socorros;');
  }
  if (workOrder) {
    clausulasDoTermo.push('Recebeu e tomou conhecimento formal da Ordem de Serviço de Segurança e Saúde no Trabalho específica de sua função (NR-01 e Art. 157 da CLT);');
  }
  if (entregasDoColaborador.length > 0) {
    clausulasDoTermo.push('Recebeu gratuitamente os Equipamentos de Proteção Individual (EPIs) adequados ao risco, com C.A. válido (NR-06), comprometendo-se ao uso, guarda e conservação;');
  }
  clausulasDoTermo.push('Foi orientado(a) de que o descumprimento das normas de segurança constitui ato faltoso passível de sanções disciplinares (Art. 158 da CLT c/c Art. 482 da CLT).');

  const corpoDoTermo =
    `O(A) empregado(a) acima qualificado(a) declara que, por ocasião de sua admissão na empresa ${client?.legal_name || client?.trade_name || 'EMPRESA CONTRATANTE'}:\n` +
    clausulasDoTermo.map((c, i) => `${i + 1}. ${c}`).join('\n') +
    (pendenciasDoKit.length > 0
      ? '\n\nOs documentos listados no quadro de pendências ainda não têm registro no sistema e, por isso, não são declarados neste termo.'
      : '');

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: 'TERMO CONSOLIDADO DE INTEGRAÇÃO E CONFORMIDADE SST (CLT ART. 158)', styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 } }
    ]],
    body: [[
      { content: corpoDoTermo }
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
  doc.text(`Assinatura do Empregado (CPF: ${formatarCPF(employee.cpf)})`, margin + (cW / 2), curY + 18, { align: 'center' });

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
          // Os vazios caiam em 'Postural' e 'Gerais': a OS assinada pelo
          // trabalhador afirmava riscos que ninguém levantou.
          { content: [
              `Físicos: ${workOrder.physical_risks?.join('; ') || SEM_RISCO_NO_INVENTARIO}`,
              `Químicos: ${workOrder.chemical_risks?.join('; ') || SEM_RISCO_NO_INVENTARIO}`,
              `Biológicos: ${workOrder.biological_risks?.join('; ') || SEM_RISCO_NO_INVENTARIO}`,
              `Ergonômicos: ${workOrder.ergonomic_risks?.join('; ') || SEM_RISCO_NO_INVENTARIO}`,
              `Acidentes: ${workOrder.accident_mechanical_risks?.join('; ') || SEM_RISCO_NO_INVENTARIO}`
            ].join('\n') }
        ],
        [
          { content: 'EPIs de Uso Obrigatório:', styles: { fontStyle: 'bold' } },
          // 'Conforme NR-06' dizia que havia EPI obrigatório sem dizer qual.
          { content: workOrder.mandatory_epis && workOrder.mandatory_epis.length > 0
              ? workOrder.mandatory_epis.map(e => `• ${e.epi_name}${e.ca_number ? ` (CA ${e.ca_number})` : ' (C.A. não informado)'}${e.usage_recommendation ? ` - ${e.usage_recommendation}` : ''}`).join('\n')
              : 'Nenhum EPI obrigatório definido para a função no inventário de riscos.' }
        ],
        [
          { content: 'Procedimentos de Segurança:', styles: { fontStyle: 'bold' } },
          { content: workOrder.safe_work_procedures?.map(p => `• ${p}`).join('\n') || 'Não informado' }
        ],
        [
          { content: 'Obrigações do Trabalhador:', styles: { fontStyle: 'bold' } },
          { content: workOrder.mandatory_employee_obligations?.slice(0, 4).map(o => `• ${o}`).join('\n') || 'Não informado' }
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
    doc.text(`CPF: ${formatarCPF(employee.cpf)}`, margin + (cW / 2), osY + 15, { align: 'center' });

    doc.line(margin + cW + 10, osY + 8, margin + (cW * 2) + 10, osY + 8);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(workOrder.responsible_engineer_name || 'Responsável Técnico (não informado)', margin + cW + 10 + (cW / 2), osY + 12, { align: 'center' });
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(workOrder.responsible_engineer_registration || 'Registro profissional não informado', margin + cW + 10 + (cW / 2), osY + 15, { align: 'center' });
  } else {
    // Sem OS, esta pagina saia COMPLETAMENTE EM BRANCO no meio do kit, sem
    // dizer o que era nem por que estava vazia.
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(organization.name || 'PREVSAFE SST', margin, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('ANEXO 1: ORDEM DE SERVIÇO NR-01 & ART. 157 CLT', margin, 16);
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
        { content: 'ORDEM DE SERVIÇO NÃO GERADA', styles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
      ]],
      body: [[
        { content:
            `Não há Ordem de Serviço emitida para ${employee.name} (${employee.job_title}).\n\n` +
            'A OS é o documento pelo qual o trabalhador dá ciência dos riscos da função ' +
            '(NR-01 item 1.4.1 e Art. 157, II, da CLT) e não pode ser substituída por este aviso.\n\n' +
            'Gere a OS em Engenharia SST > Ordens de Serviço (NR-01) e emita o kit novamente.' }
      ]],
      styles: { fontSize: 8, cellPadding: 3, fillColor: [255, 251, 235], textColor: [120, 53, 15] }
    });
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

  const empDeliveries = entregasDoColaborador;
  const epiRows = empDeliveries.map(d => [
    formatDate(d.delivery_date),
    d.ca_number,
    d.epi_name,
    d.quantity.toString(),
    'Admissional',
    d.biometric_face_matched ? 'Biometria Facial' : 'Assinatura',
    d.delivered_by_user_name || 'SESMT'
  ]);

  if (epiRows.length === 0) {
    for (let i = 1; i <= 6; i++) {
      // Cada campo cabe na largura da sua coluna. Os tamanhos anteriores
      // estouravam e quebravam em duas linhas dentro da celula.
      epiRows.push(['__/__/____', '________', '___________________________________', '____', 'Admissional', '____________________', '_________']);
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
  // Era 'CAP-INT-001' fixo: sem treinamento, o anexo saia com um código
  // de registro que não correspondia a nada.
  const tCode = training?.training_code || (training as any)?.code || '';
  const tTitle = training?.training_title || (training as any)?.title || 'Treinamento Admissional de Integração em Segurança e Saúde no Trabalho (NR-01)';
  const tLocation = training?.location_or_platform || (training as any)?.location || '';
  const tInstructorName = training?.instructor_name || '';
  const tInstructorQualif = training?.instructor_qualification || '';
  const tInstructorReg = training?.instructor_registration_number || (training as any)?.instructor_registration || '';
  const tSupervisorName = training?.technical_supervisor_name || (training as any)?.technical_manager_name || technicalResponsibleName(organization);
  const tSupervisorReg = training?.technical_supervisor_registration || (training as any)?.technical_manager_registration || (organization?.technical_responsible_council || '');
  const tSyllabus = training?.program_content_syllabus || (training as any)?.syllabus || [
    'Disposições Gerais da NR-01 e Política de Segurança',
    'Condições e Meio Ambiente de Trabalho',
    'Riscos Ocupacionais da Função e Medidas Preventivas',
    'Uso, Conservação e Guarda de EPIs (NR-06)',
    'Procedimentos em caso de Emergência, Acidentes e Primeiros Socorros',
    'Direitos e Deveres do Trabalhador (Art. 158 da CLT)'
  ];

  doc.text(tCode ? `Cód: ${tCode}` : 'Sem registro de treinamento', pageWidth - margin, 10, { align: 'right' });
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
        // Sem treinamento registrado saia "6 Horas (Híbrido)" - carga e
        // modalidade de um curso que ninguém marcou.
        { content: training
            ? `${training.workload_hours} horas${modalidadeTreinamento ? ` (${modalidadeTreinamento})` : ''}`
            : LINHA_PARA_PREENCHER }
      ],
      [
        { content: 'Data / Horário:', styles: { fontStyle: 'bold' } },
        // A data vinha da ADMISSÃO quando nao havia treinamento, e o "(Integral)"
        // era um horário inventado.
        { content: training
            ? `${formatDate(training.start_date)}${training.schedule_time ? ` — ${training.schedule_time}` : ''}`
            : LINHA_PARA_PREENCHER },
        { content: 'Local:', styles: { fontStyle: 'bold' } },
        { content: tLocation || (training ? NAO_INFORMADO : LINHA_PARA_PREENCHER) }
      ],
      [
        { content: 'Instrutor:', styles: { fontStyle: 'bold' } },
        // Saia "()" quando o nome e a qualificação estavam vazios.
        { content: tInstructorName
            ? `${tInstructorName}${tInstructorQualif ? ` (${tInstructorQualif})` : ''}`
            : (training ? NAO_INFORMADO : LINHA_PARA_PREENCHER) },
        { content: 'Registro Instrutor:', styles: { fontStyle: 'bold' } },
        { content: tInstructorReg || (training ? NAO_INFORMADO : LINHA_PARA_PREENCHER) }
      ],
      [
        { content: 'Responsável Técnico:', styles: { fontStyle: 'bold' } },
        // A qualificação caia em 'Engenheiro de Seg. Trabalho': o documento
        // atribuía uma formação a quem quer que estivesse no campo.
        { content: tSupervisorName
            ? `${tSupervisorName}${training?.technical_supervisor_qualification ? ` (${training.technical_supervisor_qualification})` : ''}`
            : RT_NAO_INFORMADO },
        { content: 'Registro Prof. RT:', styles: { fontStyle: 'bold' } },
        { content: tSupervisorReg || NAO_INFORMADO }
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
      // "MINISTRADO" so quando ha presenca confirmada; caso contrário o
      // análogo correto e o conteúdo PREVISTO.
      { content: presencaConfirmada
          ? 'CONTEÚDO PROGRAMÁTICO MINISTRADO (NR-01 SUBITEM 1.7.1)'
          : 'CONTEÚDO PROGRAMÁTICO PREVISTO (NR-01 SUBITEM 1.7.1)', styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 } }
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
      // Era literal: 'PRESENTE (100%)' e 'Biometria Facial / Assinado' saiam
      // impressos para todo mundo, inclusive sem treinamento registrado. Sem
      // registro a linha fica em branco, para assinar na hora da aula.
      [
        '1',
        employee.name,
        formatarCPF(employee.cpf),
        employee.job_title,
        presencaConfirmada
          ? `PRESENTE${participante?.attendance_rate_percent ? ` (${participante.attendance_rate_percent}%)` : ''}`
          : '____________',
        participante?.signed
          ? (participante.signature_type === 'DIGITAL_BIOMETRIC' ? 'Biometria facial' : 'Assinado')
          : '____________________'
      ]
    ],
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] }
  });

  trY = (doc as any).lastAutoTable.finalY + 12;

  // Instructor & Manager Signatures on Training page
  doc.line(margin, trY + 8, margin + cW, trY + 8);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(tInstructorName || 'Instrutor', margin + (cW / 2), trY + 12, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(tInstructorReg || 'Registro profissional', margin + (cW / 2), trY + 15, { align: 'center' });

  doc.line(margin + cW + 10, trY + 8, margin + (cW * 2) + 10, trY + 8);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  // O nome aqui era o RT_NAO_INFORMADO inteiro, com a instrução de
  // configuração impressa embaixo da linha de assinatura.
  doc.text(
    organization?.technical_responsible_name?.trim() || 'Responsável Técnico SST',
    margin + cW + 10 + (cW / 2), trY + 12, { align: 'center' }
  );
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(tSupervisorReg || 'Registro profissional', margin + cW + 10 + (cW / 2), trY + 15, { align: 'center' });

  // ================= PAGE 5: EXAMES OCUPACIONAIS (PCMSO / ASO) =================
  //
  // O kit tinha quatro paginas e nenhuma delas mostrava exame. O usuario
  // aplicava o exame ao GHE e ele nao aparecia em lugar nenhum do dossie.
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
  doc.text('ANEXO 4: EXAMES OCUPACIONAIS DO PCMSO (NR-07) E ASO', margin, 16);
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
      { content: 'ATESTADO DE SAÚDE OCUPACIONAL (ASO)', colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [
      [
        { content: 'Tipo de ASO:', styles: { fontStyle: 'bold', cellWidth: 30 } },
        { content: asoDoKit ? (TIPO_DE_ASO[asoDoKit.aso_type] || asoDoKit.aso_type) : 'Admissional (a realizar)' },
        { content: 'Data do exame:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: asoDoKit ? formatDate(asoDoKit.exam_date) : LINHA_PARA_PREENCHER }
      ],
      [
        { content: 'Resultado:', styles: { fontStyle: 'bold' } },
        { content: asoDoKit ? (RESULTADO_ASO[asoDoKit.result] || asoDoKit.result) : LINHA_PARA_PREENCHER },
        { content: 'Válido até:', styles: { fontStyle: 'bold' } },
        { content: asoDoKit?.valid_until ? formatDate(asoDoKit.valid_until) : LINHA_PARA_PREENCHER }
      ],
      [
        { content: 'Médico examinador:', styles: { fontStyle: 'bold' } },
        { content: asoDoKit?.physician_name
            ? `${asoDoKit.physician_name}${asoDoKit.physician_crm ? ` — CRM ${asoDoKit.physician_crm}${asoDoKit.physician_uf ? '/' + asoDoKit.physician_uf : ''}` : ''}`
            : LINHA_PARA_PREENCHER },
        { content: 'Restrições:', styles: { fontStyle: 'bold' } },
        { content: asoDoKit?.restrictions_notes || (asoDoKit ? 'Nenhuma' : LINHA_PARA_PREENCHER) }
      ]
    ],
    styles: { fontSize: 7.5, cellPadding: 2.2 }
  });

  let exY = (doc as any).lastAutoTable.finalY + 4;

  // Uma linha por exame previsto no PCMSO, com o resultado quando ja lancado.
  const linhasDeExame = examesPrevistos.map((prev, i) => {
    const realizado = examesRealizados.find(
      (r: any) => r.protocol_id === prev.protocol_id || r.exam_code_table_27 === prev.exam_code_table_27
    );
    const protocolo = examProtocols.find(p => p.id === prev.protocol_id);
    return [
      String(i + 1),
      prev.exam_code_table_27,
      prev.exam_name,
      protocolo?.mandatory_by_standard || '',
      protocolo?.periodicity_months ? `${protocolo.periodicity_months} meses` : '',
      realizado ? (RESULTADO_EXAME[realizado.result] || realizado.result) : LINHA_CURTA,
      realizado?.exam_date ? formatDate(realizado.exam_date) : LINHA_CURTA
    ];
  });

  if (linhasDeExame.length > 0) {
    autoTable(doc, {
      startY: exY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [[
        { content: '#', styles: { cellWidth: 8, halign: 'center' } },
        { content: 'Cód. Tab. 27', styles: { cellWidth: 20, halign: 'center' } },
        { content: 'Procedimento diagnóstico (denominação oficial do eSocial)', styles: { cellWidth: 74 } },
        { content: 'Norma', styles: { cellWidth: 18, halign: 'center' } },
        { content: 'Periodic.', styles: { cellWidth: 18, halign: 'center' } },
        { content: 'Resultado', styles: { cellWidth: 24, halign: 'center' } },
        { content: 'Data', styles: { cellWidth: 20, halign: 'center' } }
      ]],
      body: linhasDeExame,
      styles: { fontSize: 6.8, cellPadding: 1.8 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] }
    });
  } else {
    autoTable(doc, {
      startY: exY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [[
        { content: 'NENHUM EXAME APLICADO AO GHE DESTA FUNÇÃO', styles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
      ]],
      body: [[
        { content:
            `Não há protocolo de exame do PCMSO aplicado ao GHE de ${employee.name} (${employee.job_title}).\n\n` +
            'Sem isso o ASO não tem o que listar e o evento S-2220 do eSocial sai sem os procedimentos realizados.\n\n' +
            'Aplique em: Engenharia SST > 2. GHE & Inventário de Riscos > botão "Aplicar Exame".' }
      ]],
      styles: { fontSize: 8, cellPadding: 3, fillColor: [255, 251, 235], textColor: [120, 53, 15] }
    });
  }

  exY = (doc as any).lastAutoTable.finalY + 14;

  doc.setDrawColor(100, 116, 139);
  doc.line(margin, exY + 8, margin + cW, exY + 8);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(employee.name, margin + (cW / 2), exY + 12, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Ciência do trabalhador quanto ao resultado', margin + (cW / 2), exY + 15, { align: 'center' });

  doc.line(margin + cW + 10, exY + 8, margin + (cW * 2) + 10, exY + 8);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(asoDoKit?.physician_name || 'Médico examinador', margin + cW + 10 + (cW / 2), exY + 12, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    asoDoKit?.physician_crm ? `CRM ${asoDoKit.physician_crm}${asoDoKit.physician_uf ? '/' + asoDoKit.physician_uf : ''}` : 'CRM',
    margin + cW + 10 + (cW / 2), exY + 15, { align: 'center' }
  );

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
  client?: Client,
  examProtocols: SSTExamProtocol[] = []
): void {
  if (!employees || employees.length === 0) return;

  employees.forEach(emp => {
    const empOs = workOrders.find(o => o.employee_id === emp.id) || null;
    // Era `|| trainings[0]`: sem treinamento do cliente, o kit saia com o
    // treinamento de OUTRA empresa, com instrutor e codigo de la.
    const empTraining = trainings.find(t => t.client_id === emp.client_id) || null;
    exportAdmissionKitPDF(emp, empOs, deliveries, empTraining, organization, client, examProtocols);
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

  const t = resolveTrainingFields(training);

  // Sheet 1: Attendees
  const data = (training.attendees || []).map((att, idx) => ({
    'Nº': idx + 1,
    'Código Treinamento': t.code,
    'Título Treinamento': t.title,
    'Carga Horária': `${training.workload_hours}h`,
    'Modalidade': training.modality,
    'Data Realização': training.start_date,
    'Local': t.location,
    'Instrutor': training.instructor_name,
    'Registro Instrutor': t.instructorRegistration,
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
  const syllabusData = t.syllabus.map((item, idx) => ({
    'Módulo': idx + 1,
    'Tema Ministrado': item,
    'Amparo Legal': t.normativeReference
  }));

  const workbook = XLSX.utils.book_new();
  const attWorksheet = XLSX.utils.json_to_sheet(data);
  const sylWorksheet = XLSX.utils.json_to_sheet(syllabusData);
  
  XLSX.utils.book_append_sheet(workbook, attWorksheet, 'Lista de Presença');
  XLSX.utils.book_append_sheet(workbook, sylWorksheet, 'Conteúdo Programático');

  const finalName = fileName || `lista-presenca-${t.code}-${dataDeHoje()}.xlsx`;
  XLSX.writeFile(workbook, finalName);
}

/**
 * PGR — Programa de Gerenciamento de Riscos (NR-01, item 1.5).
 *
 * Segue o "Modelo de PGR" da PrevSafe: capa, ficha do documento, controle de
 * revisoes, termo de responsabilidade e as secoes 1 a 10.
 *
 * A versao anterior tinha TRES secoes (identificacao, uma tabela de
 * inventario e uma tabela de plano de acao) e saia com uma pagina. Faltavam a
 * metodologia, os criterios de avaliacao exigidos pelo subitem 1.5.4.4.2.2, a
 * caracterizacao dos processos, as definicoes e o checklist de conformidade.
 *
 * O QUE ESTE GERADOR NAO FAZ
 *
 * Nao inventa conteudo. Area construida, produtos quimicos, cenarios de
 * emergencia, contratadas e capacitacao sao dados do estabelecimento que o
 * sistema ainda nao coleta: cada um sai como PENDENCIA nomeada, e todas
 * reaparecem no checklist da secao 10.2. Um PGR com lacuna declarada e
 * auditavel; um PGR com lacuna preenchida por exemplo e um problema.
 */
export function exportPGRDocumentPdf({
  client,
  organization,
  ghes = [],
  risks = [],
  employees = [],
  sectors = [],
  units = [],
  contractedOrganizations = [],
  machinesEquipment = [],
  chemicalProducts = [],
  trainingRequirements = [],
  jobs = [],
  ergonomicAssessments = []
}: {
  client: Client;
  organization: Organization;
  ghes: any[];
  risks: any[];
  employees: Employee[];
  sectors: any[];
  units: any[];
  contractedOrganizations?: any[];
  machinesEquipment?: any[];
  chemicalProducts?: any[];
  trainingRequirements?: any[];
  jobs?: any[];
  ergonomicAssessments?: any[];
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const util = pageWidth - margin * 2;

  // ------------------------------------------------------------------
  // Apuracao
  // ------------------------------------------------------------------
  const gheDoCliente = (ghes || []).filter((g: any) => !g?.client_id || g.client_id === client.id);
  const idsDeGhe = new Set(gheDoCliente.map((g: any) => g?.id));

  // `risks` chega com o inventario de TODOS os clientes: a tela passa
  // environmentalRisks inteiro. O plano de acao da versao anterior nao
  // filtrava, e o PGR de um cliente listava risco de outro.
  const riscosDoCliente = (risks || []).filter(
    (r: any) => idsDeGhe.has(r?.ghe_id) || r?.client_id === client.id
  );

  const expostosDoGhe = (gheId: string) =>
    (employees || []).filter((e: any) => e?.ghe_id === gheId).length;

  const emissao = dataDeHoje();
  const proximaRevisao = (() => {
    const d = new Date(`${emissao}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 24);
    return d.toISOString().slice(0, 10);
  })();

  // O estabelecimento e a unidade de emissao do PGR (subitem 1.5.3.1.1.1) e
  // guarda a caracterizacao (secao 6.1) e os campos das secoes 1.1 a 1.3.
  const unidadesDoCliente = (units || []).filter(
    (u: any) => u?.client_id === client.id && u?.status !== 'INACTIVE'
  );
  const estabelecimento = unidadesDoCliente[0] || null;

  // AEP da NR-17 (item 17.3.1): alimenta as secoes 5.3 e 7.4.
  const aepsDoCliente = (ergonomicAssessments || []).filter(
    (a: any) => a?.client_id === client.id && a?.status !== 'INACTIVE'
  );
  // Item 17.3.4: ME e EPP de graus 1 e 2, e o MEI, nao elaboram a AET. null
  // quando o porte nao foi informado - nao se presume a dispensa.
  const dispensaDeAET = dispensadaDeElaborarAET(
    client?.porte,
    (estabelecimento?.risk_degree ?? client?.risk_degree) as any
  );

  // Dimensionamento do SESMT (Anexo II da NR-04) e da CIPA (Quadro I da
  // NR-05) a partir do grau de risco e do efetivo do estabelecimento.
  const dimensionamento = client?.risk_degree
    ? calculateSesmtDimensioning(client.risk_degree, (employees || []).length)
    : null;

  const codigoDoDocumento = `PGR-${(client.document_number || 'SEM-INSCRICAO').replace(/\D/g, '') || 'SEM-INSCRICAO'}-${emissao.slice(0, 4)}-REV00`;

  // Pendencias: alimentam o checklist da secao 10.2 e o aviso da capa.
  const pendencias: Array<{ secao: string; texto: string }> = [];
  const pendente = (secao: string, texto: string) => {
    pendencias.push({ secao, texto });
    return `PENDENTE — ${texto}`;
  };

  /**
   * Requisitos que o enquadramento afasta, pela chave `norma` do checklist.
   *
   * Sem isto o checklist da 10.2 so tem dois estados, e um requisito que nao
   * se aplica ao estabelecimento sairia como "Atendido" - afirmar que foi
   * cumprido algo que nunca foi exigido.
   */
  const naoAplicaveis = new Set<string>();

  /** Data ISO + n meses, ou null se a data nao for utilizavel. */
  const somarMeses = (iso: string, meses: number): string | null => {
    if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
    const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    d.setUTCMonth(d.getUTCMonth() + meses);
    return d.toISOString().slice(0, 10);
  };

  // ------------------------------------------------------------------
  // Auxiliares de desenho
  // ------------------------------------------------------------------
  let curY = 0;

  const novaPagina = () => {
    doc.addPage();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PGR — PROGRAMA DE GERENCIAMENTO DE RISCOS', margin, 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${client.trade_name || client.legal_name || ''} · ${codigoDoDocumento}`,
      pageWidth - margin, 10, { align: 'right' }
    );
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 16, pageWidth, 1, 'F');
    doc.setTextColor(15, 23, 42);
    curY = 22;
  };

  const garantirEspaco = (mm: number) => {
    if (pageHeight - 18 - curY < mm) novaPagina();
  };

  const tabela = (opcoes: any) => {
    autoTable(doc, {
      startY: curY,
      margin: { left: margin, right: margin, top: 22 },
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.8, overflow: 'linebreak' },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      ...opcoes
    });
    curY = (doc as any).lastAutoTable.finalY + 4;
  };

  /**
   * Ha medicao de verdade?
   *
   * O catalogo gravava a string "0" quando o agente nao tinha valor sugerido,
   * e a unidade padrao do catalogo ia junto. O resultado era "0 dB(A)" num
   * risco ergonomico - um numero que ninguem mediu, na unidade errada.
   */
  const temMedicao = (r: any) => {
    const v = String(r?.measured_value ?? '').trim().replace(',', '.');
    if (v === '') return false;
    const n = Number(v);
    return !(Number.isFinite(n) && n === 0);
  };

  /** Faixa de titulo de secao, como uma linha de cabecalho que ocupa a largura. */
  const secao = (texto: string) => {
    garantirEspaco(24);
    tabela({
      head: [[{
        content: texto,
        styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, cellPadding: 2.4 }
      }]],
      body: []
    });
  };

  const paragrafo = (texto: string, tamanho = 7.2) => {
    garantirEspaco(14);
    tabela({
      body: [[{ content: texto, styles: { fontSize: tamanho, cellPadding: 2.2, fillColor: [248, 250, 252] } }]]
    });
  };

  const lista = (itens: string[], numerada = false) =>
    paragrafo(itens.map((t, i) => `${numerada ? `${i + 1}. ` : '• '}${t}`).join('\n'));

  const duasColunas = (titulo: string, linhas: Array<[string, string]>) => {
    garantirEspaco(20);
    tabela({
      head: [[{ content: titulo, colSpan: 2, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }]],
      body: linhas.map(([a, b]) => [
        { content: a, styles: { fontStyle: 'bold', cellWidth: util * 0.34 } },
        { content: b }
      ])
    });
  };

  // ==================================================================
  // CAPA
  // ==================================================================
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 46, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('ELABORADO POR', margin, 13);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(organization.name || 'PREVSAFE SST', margin, 21);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  if (organization.document_number) {
    doc.text(`CNPJ ${organization.document_number}`, margin, 27);
  }
  doc.setFontSize(8);
  doc.text(
    `Emitido em ${formatDate(emissao)}`,
    pageWidth - margin, 27, { align: 'right' }
  );
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 46, pageWidth, 3, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('PROGRAMA DE', pageWidth / 2, 78, { align: 'center' });
  doc.text('GERENCIAMENTO DE RISCOS', pageWidth / 2, 90, { align: 'center' });
  doc.setFontSize(40);
  doc.setTextColor(79, 70, 229);
  doc.text('PGR', pageWidth / 2, 108, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Gerenciamento de Riscos Ocupacionais — GRO', pageWidth / 2, 119, { align: 'center' });
  doc.text(PGR_NORMA_DE_REGENCIA, pageWidth / 2, 124.5, { align: 'center', maxWidth: util });

  // As duas tabelas passam para a pagina 2: a capa fica so com o titulo,
  // centralizado, como pediu a analise do documento.
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${client.legal_name || client.trade_name || ''}`,
    pageWidth / 2, 168, { align: 'center', maxWidth: util }
  );
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(
    (client.trade_name && client.trade_name !== client.legal_name) ? client.trade_name : '',
    pageWidth / 2, 175, { align: 'center', maxWidth: util }
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(clientDocumentLine(client), pageWidth / 2, 182, { align: 'center' });

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - 30, 192, pageWidth / 2 + 30, 192);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Revisão ${'00'} — emitido em ${formatDate(emissao)}`, pageWidth / 2, 200, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(codigoDoDocumento, pageWidth / 2, 206, { align: 'center' });
  doc.text(
    `Próxima revisão periódica: ${formatDate(proximaRevisao)}`,
    pageWidth / 2, 212, { align: 'center' }
  );

  novaPagina();
  duasColunas('ORGANIZAÇÃO E ESTABELECIMENTO', [
    ['Organização', client.legal_name || client.trade_name || NAO_INFORMADO],
    ['Estabelecimento', client.trade_name || client.legal_name || NAO_INFORMADO],
    ['Inscrição', clientDocumentLine(client)],
    ['Endereço', [client.address, client.city && `${client.city}/${client.state || ''}`]
      .filter(Boolean).join(' — ') || NAO_INFORMADO],
    ['CNAE principal', cnaeLine(client)],
    ['Grau de risco (NR-04, Anexo I)', riskDegreeLine(client)],
    ['Trabalhadores abrangidos', `${(employees || []).length} próprios`]
  ]);

  duasColunas('IDENTIFICAÇÃO DO DOCUMENTO', [
    ['Código do documento', codigoDoDocumento],
    ['Revisão', '00'],
    ['Data de emissão', formatDate(emissao)],
    ['Próxima revisão periódica', `${formatDate(proximaRevisao)} (24 meses; 36 meses com certificação SGSST válida, subitem 1.5.4.4.6.1)`],
    ['Composição (subitem 1.5.7.1)', `Inventário de riscos: ${riscosDoCliente.length} registro(s) · Plano de ação: seção 8`],
    ['Responsável técnico pela elaboração', technicalResponsibleLine(organization)]
  ]);

  // ==================================================================
  // VERSO DA CAPA — controle de revisoes e termo de responsabilidade
  // ==================================================================
  novaPagina();
  secao('CONTROLE DE REVISÕES');
  paragrafo(
    'Toda revisão indica a hipótese do subitem 1.5.4.4.6 que a motivou (seção 9.9). ' +
    'O histórico não pode ser apagado: é mantido por no mínimo 20 anos (subitem 1.5.7.3.3.1).'
  );
  tabela({
    head: [['Rev.', 'Data', 'Motivo (subitem 1.5.4.4.6)', 'Itens alterados', 'Elaborado por', 'Aprovado por']],
    body: [[
      '00',
      formatDate(emissao),
      'Elaboração inicial',
      'Documento integral',
      technicalResponsibleName(organization),
      LINHA_PARA_PREENCHER
    ]],
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 20 } }
  });

  secao('TERMO DE RESPONSABILIDADE E APROVAÇÃO');
  paragrafo(
    `A organização declara que este PGR foi elaborado sob sua responsabilidade, nos termos do ` +
    `subitem 1.5.7.2 da NR-01, que reflete as condições de trabalho existentes na data de emissão ` +
    `e que se compromete a implementar o plano de ação, manter o inventário atualizado e ` +
    `disponibilizar os documentos aos trabalhadores, aos sindicatos das categorias profissionais e ` +
    `à Inspeção do Trabalho (subitem 1.5.7.2.1).`
  );
  tabela({
    head: [['Função', 'Nome', 'Cargo / registro', 'Data', 'Assinatura']],
    body: [
      ['Responsável legal da organização',
        estabelecimento?.legal_representative?.trim() || LINHA_PARA_PREENCHER,
        LINHA_PARA_PREENCHER, LINHA_PARA_PREENCHER, ''],
      ['Responsável técnico pela elaboração', technicalResponsibleName(organization),
        organization?.technical_responsible_council?.trim() || LINHA_PARA_PREENCHER, formatDate(emissao), ''],
      ['Responsável pela implementação do PGR',
        estabelecimento?.pgr_coordinator?.trim() || LINHA_PARA_PREENCHER,
        LINHA_PARA_PREENCHER, LINHA_PARA_PREENCHER, ''],
      ['Ciência — CIPA ou nomeado NR-05', LINHA_PARA_PREENCHER, LINHA_PARA_PREENCHER, LINHA_PARA_PREENCHER, '']
    ],
    styles: { fontSize: 6.8, cellPadding: 3, overflow: 'linebreak' }
  });
  paragrafo(
    'As NR não definem um profissional específico para elaborar o PGR; a responsabilidade é da ' +
    'organização, que deve escolher profissional com competência técnica (Orientação Técnica SIT ' +
    'nº 3/2023). Documento emitido só em meio digital deve ser assinado com certificado ' +
    'ICP-Brasil (subitem 1.6.2).',
    6.8
  );

  // ==================================================================
  // 1. IDENTIFICACAO E ABRANGENCIA
  // ==================================================================
  novaPagina();
  secao('1. IDENTIFICAÇÃO DA ORGANIZAÇÃO E ABRANGÊNCIA');

  duasColunas('1.1 Organização e estabelecimento', [
    ['Razão social', client.legal_name || NAO_INFORMADO],
    ['Nome fantasia', client.trade_name || NAO_INFORMADO],
    ['CNPJ / CAEPF / CNO', clientDocumentLine(client)],
    ['Endereço completo', [client.address, client.city && `${client.city}/${client.state || ''}`]
      .filter(Boolean).join(' — ') || NAO_INFORMADO],
    ['CNAE principal', cnaeLine(client)],
    ['Grau de risco (NR-04, Anexo I)', riskDegreeLine(client)],
    ['Nº de trabalhadores próprios', String((employees || []).length)],
    ['Nº de terceirizados no local', String(estabelecimento?.outsourced_worker_count || '').trim()
      || pendente('1.1', 'Número de trabalhadores terceirizados no local não cadastrado (Hierarquia > Estabelecimentos).')],
    ['Jornada e turnos', estabelecimento?.work_shifts_description?.trim()
      || pendente('1.1', 'Jornada e turnos do estabelecimento não cadastrados (Hierarquia > Estabelecimentos).')],
    // SESMT e CIPA nao sao cadastro: sao DIMENSIONAMENTO, e o sistema ja
    // calcula os dois pelo grau de risco e pelo numero de trabalhadores
    // (Anexo II da NR-04 e Quadro I da NR-05). Diziam "não cadastrada" para
    // um dado que estava a uma chamada de funcao de distancia.
    ['SESMT (NR-04)', dimensionamento
      ? `${dimensionamento.status === 'DISPENSADO' ? 'Não obrigatório' : dimensionamento.status === 'NAO_DIMENSIONADO' ? 'Não dimensionado' : 'Obrigatório'} — ${dimensionamento.legalBasis}`
      : pendente('1.1', 'Grau de risco ou número de trabalhadores ausente: o Anexo II da NR-04 não pode ser aplicado.')],
    ['CIPA (NR-05)', dimensionamento?.cipa
      ? `${dimensionamento.cipa.efetivos !== null ? `${dimensionamento.cipa.efetivos} efetivo(s) e ${dimensionamento.cipa.suplentes} suplente(s)` : 'Não dimensionada'} — ${dimensionamento.cipa.fundamentacao}`
      : pendente('1.1', 'Grau de risco ou número de trabalhadores ausente: o Quadro I da NR-05 não pode ser aplicado.')],
    ['Certificação em SGSST', 'Não informada — o prazo de revisão adotado é o de 24 meses']
  ]);

  duasColunas('1.2 Responsáveis', [
    ['Responsável legal', estabelecimento?.legal_representative?.trim()
      || pendente('1.2', 'Responsável legal da organização não cadastrado (Hierarquia > Estabelecimentos).')],
    ['Responsável técnico pela elaboração', technicalResponsibleLine(organization)],
    ['Coordenador da implementação', estabelecimento?.pgr_coordinator?.trim()
      || pendente('1.2', 'Coordenador da implementação do PGR não cadastrado (Hierarquia > Estabelecimentos).')],
    ['Médico responsável pelo PCMSO', pcmsoPhysicianLine(organization)]
  ]);

  secao('1.3 Abrangência');
  paragrafo(PGR_ABRANGENCIA);
  tabela({
    head: [['Item', 'Preenchimento']],
    body: [
      ['Unidades / setores abrangidos',
        (sectors || []).length > 0
          ? (sectors || []).map((s: any) => s?.name).filter(Boolean).join('; ')
          : pendente('1.3', 'Nenhum setor cadastrado na hierarquia do cliente.')],
      ['Grupos de exposição (GES/GHE)',
        gheDoCliente.length > 0
          ? gheDoCliente.map((g: any) => `${g?.code || 's/ código'} — ${g?.name || 's/ nome'}`).join('; ')
          : pendente('1.3', 'Nenhum GHE cadastrado: sem GES não há inventário por grupo de exposição.')],
      ['Frentes de trabalho e locais externos', estabelecimento?.external_work_fronts?.trim()
        || pendente('1.3', 'Frentes de trabalho e locais externos não cadastrados (Hierarquia > Estabelecimentos).')],
      ['Contratadas que atuam no local', pendente('1.3', 'Relação de contratadas não cadastrada (seção 9.5).')],
      ['Exclusões', 'Nenhuma']
    ],
    columnStyles: { 0: { cellWidth: util * 0.34, fontStyle: 'bold' } }
  });

  // ==================================================================
  // 2. OBJETIVO, CAMPO DE APLICACAO E BASE LEGAL
  // ==================================================================
  novaPagina();
  secao('2. OBJETIVO, CAMPO DE APLICAÇÃO E BASE LEGAL');
  secao('2.1 Objetivo');
  paragrafo(PGR_OBJETIVO);
  secao('2.2 Composição documental');
  paragrafo(PGR_COMPOSICAO_DOCUMENTAL);
  secao('2.3 Base legal e normativa');
  tabela({
    head: [['Referência', 'Aplicação neste PGR']],
    body: PGR_BASE_LEGAL.map(([a, b]) => [a, b]),
    columnStyles: { 0: { cellWidth: util * 0.4, fontStyle: 'bold' } }
  });
  paragrafo(
    'Advertências de escopo deste modelo:\n' + PGR_ADVERTENCIAS.map((a) => `• ${a}`).join('\n'),
    6.8
  );

  // ==================================================================
  // 3. TERMOS E DEFINICOES
  // ==================================================================
  novaPagina();
  secao('3. TERMOS E DEFINIÇÕES');
  paragrafo(
    'As definições abaixo reproduzem o sentido do Anexo I da NR-01 e das NR correlatas. ' +
    'Nenhum termo deste PGR pode ter significado diferente do normativo.'
  );
  tabela({
    head: [['Termo', 'Definição adotada', 'Fonte']],
    body: PGR_TERMOS.map(([t, d, f]) => [t, d, f]),
    columnStyles: {
      0: { cellWidth: util * 0.24, fontStyle: 'bold' },
      2: { cellWidth: util * 0.18 }
    },
    styles: { fontSize: 6.4, cellPadding: 1.5, overflow: 'linebreak' }
  });

  // ==================================================================
  // 4. ESTRUTURA, RESPONSABILIDADES E INTEGRACAO
  // ==================================================================
  novaPagina();
  secao('4. ESTRUTURA, RESPONSABILIDADES E INTEGRAÇÃO');
  paragrafo(
    'A responsabilidade pelo GRO e por todas as suas etapas é da organização (subitem 1.5.3.1). ' +
    'As atribuições abaixo distribuem a execução, sem transferir essa responsabilidade.'
  );
  secao('4.1 Responsabilidades');
  tabela({
    head: [['Papel', 'Responsabilidades', 'Base']],
    body: PGR_RESPONSABILIDADES.map(([a, b, c]) => [a, b, c]),
    columnStyles: {
      0: { cellWidth: util * 0.2, fontStyle: 'bold' },
      2: { cellWidth: util * 0.18 }
    },
    styles: { fontSize: 6.4, cellPadding: 1.5, overflow: 'linebreak' }
  });

  secao('4.2 Integração com outros documentos');
  tabela({
    head: [['Documento', 'Relação com o PGR', 'Situação neste cliente']],
    body: [
      ['PCMSO (NR-07)', 'Recebe o inventário e a classificação de riscos; devolve dados de saúde',
        'Emitido pelo mesmo sistema — conferir vigência'],
      ['AEP e AET (NR-17)', 'AEP compõe o inventário; recomendações da AET entram no plano de ação',
        pendente('4.2', 'AEP da NR-17 não registrada no sistema (seções 5.3 e 7.4).')],
      ['Procedimentos de emergência e simulados', 'Parte do PGR (seção 9.4)',
        pendente('4.2', 'Procedimentos de resposta a emergências não cadastrados (seção 9.4).')],
      ['Controle de EPI e fichas de entrega (NR-06)', 'Evidência da última camada de proteção',
        'Registrado no sistema (módulo de EPI)'],
      ['Registros de treinamento (NR-01, 1.7)', 'Evidência das medidas administrativas',
        'Registrado no sistema (módulo de treinamentos)'],
      ['LTCAT e laudos de insalubridade/periculosidade', 'Fins previdenciários e de adicional; não substituem o PGR (subitem 1.5.2)',
        'Emitidos pelo mesmo sistema'],
      ['Eventos de SST do eSocial', 'Informações declaradas devem ser coerentes com o inventário',
        'Emitidos pelo mesmo sistema'],
      ['FDS dos produtos químicos (ABNT NBR 14725)', 'Base para identificar agentes químicos',
        pendente('4.2', 'Inventário de produtos químicos e FDS não cadastrados (seção 6.4).')]
    ],
    columnStyles: { 0: { cellWidth: util * 0.26, fontStyle: 'bold' } },
    styles: { fontSize: 6.6, cellPadding: 1.6, overflow: 'linebreak' }
  });

  // ==================================================================
  // 5. METODOLOGIA
  // ==================================================================
  novaPagina();
  secao('5. METODOLOGIA DO GERENCIAMENTO DE RISCOS (critérios do subitem 1.5.4.4.2.2)');
  paragrafo(
    'O nível de risco é o produto da severidade (S, 1 a 5) pela probabilidade (P, 1 a 5), com ' +
    'critérios próprios por tipo de perigo, como exige o subitem 1.5.4.4.5. Esta seção é o ' +
    'documento de critérios da organização: gradações de severidade e probabilidade, níveis de ' +
    'risco, classificação e tomada de decisão.'
  );

  secao('5.1 Levantamento preliminar de perigos e riscos');
  paragrafo(
    'Realizado antes do início das atividades ou de novas instalações, para as atividades ' +
    'existentes e em toda mudança ou introdução de processo (subitem 1.5.4.2.1). Serve para ' +
    'evitar ou eliminar perigos já no projeto e para identificar riscos evidentes, que recebem ' +
    'medida imediata. Risco evidente sem medida imediata possível é registrado no inventário e ' +
    'levado ao plano de ação (subitem 1.5.4.2.1.3).'
  );

  secao('5.2 Identificação de perigos');
  paragrafo(
    'Para cada GES, a identificação registra a descrição do perigo e das possíveis lesões ou ' +
    'agravos, as fontes ou circunstâncias e o grupo de trabalhadores sujeitos ao perigo (subitem ' +
    '1.5.4.3.1). Considera o trabalho real, não apenas o prescrito, em três situações: rotineira ' +
    '(R), não rotineira (NR) e emergência (E). Inclui perigos externos previsíveis (subitem ' +
    '1.5.4.3.2).'
  );
  tabela({
    head: [['Tipo', 'Exemplos de perigos', 'Critério de probabilidade (NR-01)']],
    body: PGR_CATEGORIAS_DE_PERIGO.map(([a, b, c]) => [a, b, c]),
    columnStyles: { 0: { cellWidth: util * 0.2, fontStyle: 'bold' } },
    styles: { fontSize: 6.6, cellPadding: 1.6, overflow: 'linebreak' }
  });

  secao('5.3 Avaliação ergonômica e fatores psicossociais (item 17.3 da NR-17)');
  paragrafo(
    'A avaliação recai sobre as condições e a organização do trabalho, e não sobre o estado de ' +
    'saúde mental dos trabalhadores. Não se usam sintomas individuais, testes de personalidade ou ' +
    'sinais biológicos como critério de risco.'
  );
  paragrafo(
    'A avaliação ergonômica preliminar — AEP — recai sobre as situações de trabalho que, em ' +
    'decorrência da natureza e do conteúdo das atividades, demandam adaptação às características ' +
    'psicofisiológicas dos trabalhadores (item 17.3.1). Ela pode ser realizada por abordagens ' +
    'qualitativas, semiquantitativas, quantitativas ou combinação dessas, conforme o risco e os ' +
    'requisitos legais (subitem 17.3.1.1), e pode ser contemplada nas etapas de identificação de ' +
    'perigos e avaliação de riscos do item 1.5.4 da NR-01 (subitem 17.3.1.2). A NR-17 não ' +
    'prescreve método, técnica ou ferramenta específicos; o registro da AEP é obrigatório ' +
    '(subitem 17.3.1.2.1), seus resultados integram o inventário (item 17.3.5) e as medidas ' +
    'decorrentes entram no plano de ação (item 17.3.6). Os empregados são ouvidos no processo ' +
    '(item 17.3.8).'
  );

  secao('5.3.1 O que a avaliação percorre');
  tabela({
    head: [['Aspecto', 'Item da NR-17', 'Abrange']],
    body: NR17_ASPECTOS.map((a) => [a.rotulo, a.fonte, a.ajuda]),
    columnStyles: {
      0: { cellWidth: util * 0.22, fontStyle: 'bold' },
      1: { cellWidth: util * 0.13, halign: 'center' }
    },
    styles: { fontSize: 6.4, cellPadding: 1.4, overflow: 'linebreak' }
  });

  secao('5.3.2 Organização do trabalho e exigências a evitar');
  paragrafo('A organização do trabalho leva em consideração (item 17.4.1):', 7);
  lista(NR17_FATORES_DA_ORGANIZACAO.map((f) => `${f.alinea}) ${f.texto}`));
  paragrafo(
    'As medidas de prevenção, a partir da AEP ou da AET, evitam que o trabalhador seja obrigado ' +
    'a efetuar de forma contínua e repetitiva (item 17.4.3):',
    7
  );
  lista(NR17_EXIGENCIAS_A_EVITAR.map((f) => `${f.alinea}) ${f.texto}`));

  secao('5.3.3 Medidas de prevenção: duas ou mais');
  paragrafo(
    `As medidas de prevenção devem incluir ${NR17_MINIMO_DE_ALTERNATIVAS} ou mais das ` +
    'alternativas do subitem 17.4.3.1. Quando não for possível adotar as das alíneas "c" e "d", ' +
    'as das alíneas "a" e "b" — pausas e alternância — tornam-se obrigatórias (subitem ' +
    '17.4.3.1.1).'
  );
  lista(NR17_ALTERNATIVAS_DE_PREVENCAO.map((f) => `${f.alinea}) ${f.texto}`));
  lista(NR17_REQUISITOS_DAS_PAUSAS);

  secao('5.3.4 Parâmetros de conforto (item 17.8)');
  tabela({
    head: [['Item', 'Parâmetro', 'Fonte']],
    body: PARAMETROS_DE_CONFORTO.map((c) => [c.item, c.parametro, c.fonte]),
    columnStyles: {
      0: { cellWidth: util * 0.17, fontStyle: 'bold' },
      2: { cellWidth: util * 0.17 }
    },
    styles: { fontSize: 6.4, cellPadding: 1.4, overflow: 'linebreak' }
  });

  secao('5.3.5 Quando a AET é devida');
  paragrafo('A Análise Ergonômica do Trabalho é realizada quando (item 17.3.2):', 7);
  lista(NR17_GATILHOS_DA_AET.map((g) => `${g.alinea}) ${g.texto}`));
  if (dispensaDeAET === true) {
    paragrafo(
      `${NR17_FUNDAMENTO_DA_DISPENSA} Esta organização se enquadra na dispensa, de modo que ` +
      'a AET é devida apenas nas situações das alíneas "c" e "d" acima.',
      6.8
    );
  } else if (dispensaDeAET === false) {
    paragrafo(
      'Esta organização não se enquadra na dispensa do item 17.3.4, de modo que a AET é ' +
      'devida em qualquer das quatro situações acima.',
      6.8
    );
  } else {
    paragrafo(
      pendente('5.3', 'Porte da organização não informado: sem ele não se sabe se incide a dispensa de elaborar a AET do item 17.3.4 da NR-17, que alcança ME e EPP de graus de risco 1 e 2 e o MEI (CRM > Clientes & Unidades).'),
      6.8
    );
  }
  paragrafo('Quando realizada, a AET abrange as etapas do item 17.3.3:', 7);
  lista(NR17_ETAPAS_DA_AET.map((e) => `${e.alinea}) ${e.texto}`));
  paragrafo(
    'O relatório da AET fica à disposição na organização pelo prazo de 20 anos (item 17.3.7).',
    6.8
  );

  secao('5.4 Gradação da severidade');
  paragrafo(PGR_SEVERIDADE_CABECALHO);
  tabela({
    head: [['S', 'Grau', 'Acidentes', 'Físicos, químicos e biológicos', 'Ergonômicos e psicossociais']],
    body: PGR_SEVERIDADE.map((l) => [...l]),
    columnStyles: { 0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: util * 0.15 } },
    styles: { fontSize: 6.2, cellPadding: 1.4, overflow: 'linebreak' }
  });

  secao('5.5 Gradação da probabilidade');
  lista(PGR_PROBABILIDADE_REGRAS, true);

  garantirEspaco(40);
  tabela({
    head: [[{ content: 'Agentes físicos e químicos (NA = nível de ação; LEO = limite de exposição)', colSpan: 3, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' } }],
      ['P', 'Critério quantitativo', 'Critério qualitativo (item 9.4.1 da NR-09)']],
    body: PGR_PROBABILIDADE_FISICO_QUIMICO.map((l) => [...l]),
    columnStyles: { 0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' } },
    styles: { fontSize: 6.4, cellPadding: 1.4, overflow: 'linebreak' }
  });
  paragrafo(PGR_PROBABILIDADE_REFERENCIAS, 6.2);

  garantirEspaco(36);
  tabela({
    head: [[{ content: 'Agentes biológicos', colSpan: 2, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' } }], ['P', 'Critério']],
    body: PGR_PROBABILIDADE_BIOLOGICO.map((l) => [...l]),
    columnStyles: { 0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' } },
    styles: { fontSize: 6.4, cellPadding: 1.4, overflow: 'linebreak' }
  });

  garantirEspaco(36);
  tabela({
    head: [[{ content: 'Acidentes (exposição ao perigo + eficácia, subitem 1.5.4.4.5.4)', colSpan: 3, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' } }],
      ['P', 'Exposição', 'Medidas existentes']],
    body: PGR_PROBABILIDADE_ACIDENTE.map((l) => [...l]),
    columnStyles: { 0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' } },
    styles: { fontSize: 6.4, cellPadding: 1.4, overflow: 'linebreak' }
  });

  garantirEspaco(40);
  tabela({
    head: [[{ content: 'Fatores ergonômicos e psicossociais (exigências = duração x intensidade + eficácia, subitem 1.5.4.4.5.3)', colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' } }],
      ['P', 'Duração da exigência', 'Intensidade', 'Medidas existentes']],
    body: PGR_PROBABILIDADE_ERGONOMICO.map((l) => [...l]),
    columnStyles: { 0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' } },
    styles: { fontSize: 6.4, cellPadding: 1.4, overflow: 'linebreak' }
  });
  paragrafo(
    'Quando a análise qualitativa não permitir decisão, realiza-se avaliação quantitativa (NR-09, ' +
    'item 9.4.2 e NHO) ou AET (NR-17, item 17.3.2).',
    6.6
  );

  // 5.6 Matriz
  garantirEspaco(50);
  secao('5.6 Matriz de risco e níveis');
  const matriz = matrizDoModelo();
  tabela({
    head: [['S \\ P', 'P1', 'P2', 'P3', 'P4', 'P5']],
    body: matriz.map((linha) => [
      { content: `S${linha.severidade}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      ...linha.celulas.map((c) => ({
        content: `${c.score} ${c.rotulo}`,
        styles: { halign: 'center' as const }
      }))
    ]),
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }
  });
  paragrafo(
    'Faixas: ' + FAIXAS_DO_MODELO.map((f) => `${f.rotulo} ${f.de}–${f.ate}`).join('; ') + '.',
    7
  );

  // 5.7 Decisao
  garantirEspaco(50);
  secao('5.7 Classificação e tomada de decisão');
  tabela({
    head: [['Nível', 'Classificação', 'Decisão', 'Prazo máximo']],
    body: (['MUITO_ALTO', 'ALTO', 'MEDIO', 'BAIXO'] as const).map((n) => {
      const d = DECISAO_POR_NIVEL[n];
      return [d.rotulo, d.classificacao, d.decisao, d.prazo];
    }),
    columnStyles: { 0: { cellWidth: util * 0.13, fontStyle: 'bold' }, 3: { cellWidth: util * 0.2 } },
    styles: { fontSize: 6.6, cellPadding: 1.6, overflow: 'linebreak' }
  });
  lista(PGR_REGRAS_DE_DECISAO);

  // ==================================================================
  // 6. CARACTERIZACAO
  // ==================================================================
  novaPagina();
  secao('6. CARACTERIZAÇÃO DO ESTABELECIMENTO, PROCESSOS E GRUPOS EXPOSTOS');
  paragrafo(
    'Esta seção atende às alíneas "a", "b" e "e" do subitem 1.5.7.3.2 e é a base de todos os ' +
    'registros do inventário.'
  );

  if (unidadesDoCliente.length > 1) {
    pendente(
      '6.1',
      `Este cliente tem ${unidadesDoCliente.length} estabelecimentos cadastrados e o PGR é emitido por estabelecimento ` +
      `(subitem 1.5.3.1.1.1). A caracterização abaixo é a de "${estabelecimento?.name || ''}"; emita um PGR para cada um.`
    );
  }

  const areas = [estabelecimento?.built_area_m2?.trim(), estabelecimento?.total_area_m2?.trim()];
  const areaTexto = areas[0] || areas[1]
    ? `${areas[0] || 'não informada'} m² construída / ${areas[1] || 'não informada'} m² total`
    : '';

  const campoDoEstabelecimento = (valor: any, oQueFalta: string) =>
    String(valor || '').trim() || pendente('6.1', oQueFalta);

  duasColunas('6.1 Estabelecimento', [
    ['Estabelecimento', estabelecimento
      ? `${estabelecimento.name}${estabelecimento.code ? ` (${estabelecimento.code})` : ''}${estabelecimento.establishment_type ? ` — ${TIPO_DE_ESTABELECIMENTO[estabelecimento.establishment_type] || estabelecimento.establishment_type}` : ''}`
      : pendente('6.1', 'Nenhum estabelecimento cadastrado em Hierarquia > Estabelecimentos: sem ele não há a que se referir a caracterização.')],
    ['Área construída / área total', areaTexto
      || pendente('6.1', 'Área construída e área total não cadastradas (Hierarquia > Estabelecimentos).')],
    ['Edificações e pavimentos', campoDoEstabelecimento(
      estabelecimento?.buildings_description,
      'Descrição das edificações e pavimentos não cadastrada (Hierarquia > Estabelecimentos).')],
    ['Utilidades', campoDoEstabelecimento(
      estabelecimento?.utilities_description,
      'Utilidades (energia, caldeira, compressores, GLP, geradores) não cadastradas (Hierarquia > Estabelecimentos).')],
    ['Entorno e perigos externos', campoDoEstabelecimento(
      estabelecimento?.external_hazards,
      'Entorno e perigos externos previsíveis não cadastrados (subitem 1.5.4.3.2, em Hierarquia > Unidades).')],
    ['Recursos de emergência', campoDoEstabelecimento(
      estabelecimento?.emergency_resources,
      'Recursos de emergência não cadastrados (extintores, hidrantes, rotas, hospital de referência).')]
  ]);

  secao('6.2 Processos e ambientes de trabalho');
  tabela({
    head: [['Setor / ambiente', 'Descrição física', 'Processo e etapas', 'Máquinas, equipamentos e produtos']],
    body: (sectors || []).length > 0
      // O cadastro do setor JA TEM estes campos (Hierarquia > Setores >
      // Editar Setor): Tipo de Ambiente Físico, Descrição do Setor e
      // Processos, Características Construtivas. O gerador não os lia e
      // imprimia PENDENTE em cima de dado preenchido.
      ? (sectors || []).map((st: any) => {
          const fisica = [
            st?.environment_type ? AMBIENTE_FISICO[st.environment_type] || st.environment_type : '',
            st?.building_features?.trim() || ''
          ].filter(Boolean).join(' — ');
          return [
            st?.name || 'Setor sem nome',
            fisica || pendente('6.2', `Características construtivas do setor "${st?.name || 's/ nome'}" não preenchidas (Hierarquia > Setores).`),
            st?.description?.trim()
              || pendente('6.2', `Descrição do setor e processos de "${st?.name || 's/ nome'}" não preenchida (Hierarquia > Setores).`),
            LINHA_PARA_PREENCHER
          ];
        })
      : [[{
          content: pendente('6.2', 'Nenhum setor cadastrado: a caracterização dos processos e ambientes (alínea "a" do subitem 1.5.7.3.2) não pode ser emitida.'),
          colSpan: 4,
          styles: { textColor: [180, 83, 9], fontStyle: 'bold' }
        }]],
    styles: { fontSize: 6.6, cellPadding: 1.6, overflow: 'linebreak' }
  });

  secao('6.3 Grupos de exposição similar (GES) e atividades');
  tabela({
    head: [['GES', 'Setor', 'Funções / cargos', 'Nº expostos', 'Jornada e turno', 'Atividades reais']],
    body: gheDoCliente.length > 0
      ? gheDoCliente.map((g: any) => {
          const doGhe = (employees || []).filter((e: any) => e?.ghe_id === g?.id);
          const cargos = [...new Set(doGhe.map((e: any) => e?.job_title).filter(Boolean))];
          return [
            g?.code || 'sem código',
            g?.sector_name || g?.name || '',
            cargos.length > 0 ? cargos.join(', ') : pendente('6.3', `Nenhum trabalhador vinculado ao GHE "${g?.name || g?.code || ''}".`),
            String(doGhe.length),
            // work_schedule_description ja existe no cadastro do GHE.
            g?.work_schedule_description?.trim()
              || pendente('6.3', `Jornada e turno do GHE "${g?.name || g?.code || ''}" não preenchidos (GHE & Inventário de Riscos).`),
            g?.environment_description?.trim()
              || pendente('6.3', `Atividades reais do GHE "${g?.name || g?.code || ''}" não descritas.`)
          ];
        })
      : [[{
          content: pendente('6.3', 'Nenhum GHE cadastrado: sem grupos de exposição não há inventário por GES.'),
          colSpan: 6,
          styles: { textColor: [180, 83, 9], fontStyle: 'bold' }
        }]],
    styles: { fontSize: 6.4, cellPadding: 1.5, overflow: 'linebreak' }
  });

  secao('6.4 Inventário de produtos químicos');
  paragrafo(
    'O produto químico utilizado no local de trabalho é classificado quanto aos perigos para a ' +
    'segurança e a saúde dos trabalhadores segundo os critérios do Sistema Globalmente ' +
    'Harmonizado - GHS (subitem 26.4.1.1 da NR-26). Para todo produto classificado como ' +
    'perigoso, o fabricante ou, na importação, o fornecedor no mercado nacional elabora e ' +
    'torna disponível a ficha com dados de segurança (subitem 26.4.3.1), e a organização ' +
    'assegura o acesso dos trabalhadores a ela (subitem 26.5.1) e os treina para compreender a ' +
    'rotulagem e a ficha e para atuar em emergência com o produto (subitem 26.5.2).'
  );

  const quimicosDoCliente = (chemicalProducts || []).filter(
    (q: any) => q?.client_id === client.id && q?.status !== 'INACTIVE'
  );

  if (quimicosDoCliente.length === 0) {
    const declarado = estabelecimento?.no_chemical_products_declared_at?.trim();
    if (declarado) {
      paragrafo(
        `A organização declarou em ${formatDate(declarado)} que nenhum produto químico é ` +
        'utilizado neste estabelecimento. Álcool 70%, hipoclorito, desinfetante e detergente são ' +
        'produtos químicos: a dispensa do subitem 26.4.2.4 alcança apenas a rotulagem preventiva ' +
        'dos saneantes notificados ou registrados na Anvisa, e não a existência do produto, sua ' +
        'classificação nem a ficha com dados de segurança.',
        7
      );
    } else {
      paragrafo(
        pendente('6.4', 'Nenhum produto químico cadastrado e nenhuma declaração de que não se utiliza produto químico (Engenharia SST > 11. Produtos Químicos). Lista vazia não é declaração de inexistência.'),
        7
      );
    }
  } else {
    const CLASSIFICACAO: Record<string, string> = {
      PERIGOSO: 'Perigoso (GHS)',
      NAO_PERIGOSO: 'Não perigoso (GHS)'
    };
    const ROTULAGEM: Record<string, string> = {
      CONFORME_GHS: 'Conforme o GHS (26.4.2.2)',
      SIMPLIFICADA: 'Simplificada (26.4.2.3)',
      DISPENSADA_SANEANTE: 'Saneante Anvisa, dispensada (26.4.2.4)',
      IRREGULAR: 'IRREGULAR'
    };
    const FDS: Record<string, string> = {
      DISPONIVEL: 'Disponível',
      SOLICITADA: 'Solicitada ao fornecedor',
      NAO_OBTIDA: 'Não obtida'
    };
    const FALTA = 'PENDENTE';

    const linhas = quimicosDoCliente.map((q: any) => {
      const faltando: string[] = [];
      const perigoso = q?.ghs_classification === 'PERIGOSO';

      if (!q?.ghs_classification) {
        faltando.push('classificação quanto aos perigos segundo o GHS (subitem 26.4.1.1)');
      }
      if (perigoso && !q?.ghs_hazard_classes?.trim()) {
        faltando.push('classes e categorias de perigo do GHS');
      }
      if (!q?.components?.trim()) {
        faltando.push('componentes com nome e número CAS');
      }

      const classificacao = [
        CLASSIFICACAO[q?.ghs_classification] || FALTA,
        q?.ghs_hazard_classes?.trim(),
        q?.ghs_signal_word?.trim()
      ].filter(Boolean).join('\n');

      // Rotulagem: a dispensa do 26.4.2.4 e so dela, e exige o registro.
      let rotulagem = ROTULAGEM[q?.labeling_status] || FALTA;
      if (!q?.labeling_status) {
        faltando.push('conferência da rotulagem preventiva no local (subitem 26.4.2)');
      }
      if (q?.labeling_status === 'DISPENSADA_SANEANTE') {
        if (q?.anvisa_registration?.trim()) {
          rotulagem += `\nAnvisa: ${q.anvisa_registration.trim()}`;
        } else {
          faltando.push('número da notificação ou do registro do saneante na Anvisa, que é o que fundamenta a dispensa do subitem 26.4.2.4');
        }
      }
      if (q?.labeling_status === 'IRREGULAR') {
        faltando.push('regularização da rotulagem preventiva (subitem 26.4.2)');
      }

      // FDS: obrigatoria para o perigoso (26.4.3.1). Para o nao perigoso, o
      // subitem 26.4.3.3 a exige quando os usos previstos derem origem a
      // riscos - juizo que o avaliador faz, e por isso aqui e nota, nao
      // pendencia.
      const partesFds: string[] = [FDS[q?.sds_status] || FALTA];
      if (q?.sds_date?.trim()) partesFds.push(`Revisão: ${formatDate(q.sds_date)}`);
      if (q?.sds_location?.trim()) {
        partesFds.push(`Acesso: ${q.sds_location.trim()}`);
      } else if (q?.sds_status === 'DISPONIVEL') {
        faltando.push('onde o trabalhador acessa a ficha com dados de segurança (subitem 26.5.1)');
      }
      if (perigoso && q?.sds_status !== 'DISPONIVEL') {
        faltando.push('ficha com dados de segurança do produto classificado como perigoso (subitem 26.4.3.1)');
      }
      if (!perigoso && q?.sds_status !== 'DISPONIVEL') {
        partesFds.push('O subitem 26.4.3.3 exige a ficha também para produto não classificado como perigoso cujos usos previstos derem origem a riscos.');
      }

      if (!q?.training_date?.trim()) {
        faltando.push('treinamento sobre rotulagem, ficha com dados de segurança, perigos e emergência (subitem 26.5.2)');
      }

      if (faltando.length > 0) {
        pendente('6.4', `Produto ${q?.name || 'sem nome'}: falta ${faltando.join('; ')}.`);
      }

      return [
        [q?.name || 'Sem nome', q?.manufacturer?.trim()].filter(Boolean).join('\n'),
        [q?.use_description?.trim(), q?.location?.trim(), q?.quantity?.trim()]
          .filter(Boolean).join('\n') || '—',
        q?.components?.trim() || FALTA,
        classificacao,
        rotulagem,
        [
          partesFds.join('. '),
          q?.training_date?.trim() ? `Treinamento: ${formatDate(q.training_date)}` : `Treinamento: ${FALTA}`
        ].join('\n')
      ];
    });

    tabela({
      head: [['Produto', 'Uso, local e quantidade', 'Componentes e CAS', 'Classificação GHS', 'Rotulagem', 'FDS e treinamento']],
      body: linhas,
      columnStyles: {
        0: { cellWidth: util * 0.14, fontStyle: 'bold' },
        1: { cellWidth: util * 0.16 },
        2: { cellWidth: util * 0.17 },
        3: { cellWidth: util * 0.15 },
        4: { cellWidth: util * 0.15 }
      },
      styles: { fontSize: 5.9, cellPadding: 1.3, overflow: 'linebreak' }
    });

    // A dispensa do saneante e so da rotulagem. Dito no documento porque e o
    // erro mais facil de cometer em clinica, escola e escritorio.
    if (quimicosDoCliente.some((q: any) => q?.labeling_status === 'DISPENSADA_SANEANTE')) {
      paragrafo(
        'Os saneantes notificados ou registrados na Anvisa estão dispensados das obrigações de ' +
        'rotulagem preventiva dos subitens 26.4.2.1, 26.4.2.1.1 e 26.4.2.2. A dispensa é apenas ' +
        'da rotulagem: a classificação do subitem 26.4.1 e a ficha com dados de segurança do ' +
        'subitem 26.4.3 continuam exigíveis.',
        6.8
      );
    }

    // Consistencia com a secao 7: produto perigoso sem agente quimico no
    // inventario e contradicao entre duas secoes do mesmo documento.
    const temPerigoso = quimicosDoCliente.some((q: any) => q?.ghs_classification === 'PERIGOSO');
    const temAgenteQuimico = riscosDoCliente.some(
      (r: any) => String(r?.risk_category || '').toUpperCase().startsWith('QU')
    );
    if (temPerigoso && !temAgenteQuimico) {
      paragrafo(
        pendente('6.4', 'Há produto classificado como perigoso pelo GHS e nenhum agente químico no inventário da seção 7. Avalie a exposição e inventarie o agente, ou registre no inventário a ausência de risco com a justificativa.'),
        6.8
      );
    }
  }

  secao('6.5 Máquinas e equipamentos com requisitos específicos');
  paragrafo(
    'Esta relação compõe a caracterização dos processos e ambientes de trabalho (alínea "a" ' +
    'do subitem 1.5.7.3.2 da NR-01): o inventário da seção 7 aponta o perigo, e esta seção diz ' +
    'em que máquina ele está e qual evidência existe. A aplicação da NR-12 considera as ' +
    'características da máquina, do processo, a apreciação de riscos e o estado da técnica ' +
    '(subitem 12.1.9), e as manutenções são registradas em livro, ficha ou sistema, com ' +
    'indicação conclusiva quanto às condições de segurança (subitem 12.11.2).'
  );

  const maquinasDoCliente = (machinesEquipment || []).filter(
    (m: any) => m?.client_id === client.id && m?.status !== 'INACTIVE'
  );

  if (maquinasDoCliente.length === 0) {
    const declarado = estabelecimento?.no_specific_machines_declared_at?.trim();
    if (declarado) {
      paragrafo(
        `A organização declarou em ${formatDate(declarado)} que nenhuma máquina ou ` +
        'equipamento deste estabelecimento tem requisito específico de NR-12, NR-13 ou NR-11. ' +
        'Vaso de pressão, caldeira e compressor de ar entram na NR-13 mesmo em atividade ' +
        'administrativa ou de saúde, e a aquisição de qualquer um deles obriga a rever esta ' +
        'seção e o inventário.',
        7
      );
    } else {
      paragrafo(
        pendente('6.5', 'Nenhuma máquina ou equipamento cadastrado e nenhuma declaração de que não há requisito específico de NR-12, NR-13 ou NR-11 (Engenharia SST > 10. Máquinas). Lista vazia não é declaração de inexistência.'),
        7
      );
    }
  } else {
    const NORMAS: Record<string, string> = {
      NR_12: 'NR-12',
      NR_13: 'NR-13',
      NR_11: 'NR-11'
    };
    const ESTADOS: Record<string, string> = {
      EM_OPERACAO: 'Em operação',
      PARADA: 'Parada',
      DESATIVADA: 'Desativada'
    };
    const FALTA = 'PENDENTE';

    const linhas = maquinasDoCliente.map((m: any) => {
      const faltando: string[] = [];
      const normas: string[] = Array.isArray(m?.applicable_norms) ? m.applicable_norms : [];
      if (normas.length === 0 && !m?.other_requirements?.trim()) {
        faltando.push('classificação das normas aplicáveis');
      }

      const rotuloNormas = [
        ...normas.map((n: string) => NORMAS[n]).filter(Boolean),
        m?.other_requirements?.trim()
      ].filter(Boolean).join('; ') || FALTA;

      // NR-12: apreciacao de riscos (12.1.9), sistemas de seguranca e o
      // registro das manutencoes (12.11.2).
      let nr12: string;
      if (normas.includes('NR_12')) {
        const apreciacao = m?.risk_appraisal_date?.trim();
        if (!apreciacao) faltando.push('apreciação de riscos da máquina (subitem 12.1.9)');
        if (!m?.safety_systems?.trim()) faltando.push('sistemas de segurança e proteções existentes');
        if (!m?.maintenance_record?.trim()) faltando.push('onde fica o registro das manutenções (subitem 12.11.2)');
        nr12 = [
          `Apreciação de riscos: ${apreciacao ? formatDate(apreciacao) : FALTA}`
          + (m?.risk_appraisal_author?.trim() ? `, ${m.risk_appraisal_author.trim()}` : ''),
          `Segurança: ${m?.safety_systems?.trim() || FALTA}`,
          `Registro de manutenções: ${m?.maintenance_record?.trim() || FALTA}`
        ].join('\n');
      } else {
        nr12 = '—';
      }

      // NR-13 e NR-11.
      const outras: string[] = [];
      if (normas.includes('NR_13')) {
        const categoria = m?.nr13_category?.trim();
        const ultima = m?.nr13_last_inspection_date?.trim();
        const proxima = m?.nr13_next_inspection_date?.trim();
        const ph = m?.nr13_professional?.trim();
        if (!categoria) faltando.push('categoria ou classe definida pelo Profissional Habilitado');
        if (!proxima) faltando.push('data da próxima inspeção de segurança, conforme o relatório do PH');
        if (!ph) faltando.push('nome e registro do Profissional Habilitado da NR-13');
        if (proxima && proxima < emissao) {
          faltando.push(`inspeção de segurança vencida em ${formatDate(proxima)}`);
        }
        outras.push(
          `NR-13 — ${categoria || FALTA}. `
          + `Última inspeção: ${ultima ? formatDate(ultima) : FALTA}. `
          + `Próxima: ${proxima ? formatDate(proxima) : FALTA}. `
          + `PH: ${ph || FALTA}`
        );
      }
      if (normas.includes('NR_11')) {
        if (!m?.nr11_operators?.trim()) faltando.push('operadores habilitados e autorizados (NR-11)');
        if (!m?.nr11_load_capacity?.trim()) faltando.push('capacidade de carga e sua sinalização (NR-11)');
        outras.push(
          `NR-11 — Carga: ${m?.nr11_load_capacity?.trim() || FALTA}. `
          + `Operadores: ${m?.nr11_operators?.trim() || FALTA}`
        );
      }

      if (faltando.length > 0) {
        pendente('6.5', `Máquina ${m?.name || 'sem nome'}${m?.tag?.trim() ? ` (${m.tag.trim()})` : ''}: falta ${faltando.join('; ')}.`);
      }

      return [
        [
          m?.name || 'Sem nome',
          m?.tag?.trim(),
          [m?.location?.trim(), ESTADOS[m?.operational_state]].filter(Boolean).join(' — ')
        ].filter(Boolean).join('\n'),
        [m?.manufacturer?.trim(), m?.manufacture_year?.trim()].filter(Boolean).join('\n') || '—',
        rotuloNormas,
        nr12,
        outras.join('\n') || '—'
      ];
    });

    tabela({
      head: [['Máquina / equipamento', 'Fabricante e ano', 'Normas', 'NR-12', 'NR-13 e NR-11']],
      body: linhas,
      columnStyles: {
        0: { cellWidth: util * 0.19, fontStyle: 'bold' },
        1: { cellWidth: util * 0.12 },
        2: { cellWidth: util * 0.10 },
        3: { cellWidth: util * 0.29 }
      },
      styles: { fontSize: 6.0, cellPadding: 1.4, overflow: 'linebreak' }
    });

    // Os prazos da NR-13 nao sao calculados aqui de proposito: o item 13.4.4
    // e seguintes os fazem variar por categoria, por SPIE (Anexo II) e por
    // SIS, de 12 a 48 meses, e quem os fixa e o Profissional Habilitado.
    if (maquinasDoCliente.some((m: any) => (m?.applicable_norms || []).includes('NR_13'))) {
      paragrafo(
        'As datas de inspeção acima são as que constam dos relatórios do Profissional ' +
        'Habilitado. Os prazos máximos da NR-13 variam com a categoria do equipamento, com a ' +
        'existência de Serviço Próprio de Inspeção de Equipamentos e com sistema instrumentado ' +
        'de segurança, e este PGR não os substitui nem os recalcula.',
        6.8
      );
    }
  }

  // ==================================================================
  // 7. INVENTARIO DE RISCOS
  // ==================================================================
  novaPagina();
  secao('7. INVENTÁRIO DE RISCOS OCUPACIONAIS');
  paragrafo(
    'Cada registro corresponde a um perigo em um GES e contém os campos abaixo. O inventário é ' +
    'mantido atualizado e seu histórico guardado por 20 anos (subitens 1.5.7.3.3 e 1.5.7.3.3.1).'
  );

  secao('7.1 Estrutura do registro');
  tabela({
    head: [['Campo', 'Conteúdo', 'Alínea do 1.5.7.3.2']],
    body: PGR_CAMPOS_DO_INVENTARIO.map(([a, b, c]) => [a, b, c]),
    columnStyles: {
      0: { cellWidth: util * 0.26, fontStyle: 'bold' },
      2: { cellWidth: util * 0.14, halign: 'center' }
    },
    styles: { fontSize: 6.4, cellPadding: 1.4, overflow: 'linebreak' }
  });

  secao('7.2 Registros do inventário');
  if (riscosDoCliente.length === 0) {
    paragrafo(
      pendente('7.2', 'Inventário vazio: nenhum agente de risco cadastrado. Sem inventário este documento não atende ao subitem 1.5.7.1 e não deve ser entregue como PGR concluído.'),
      8
    );
  } else {
    riscosDoCliente.forEach((r: any, indice: number) => {
      const ghe = gheDoCliente.find((g: any) => g?.id === r?.ghe_id);
      const classificado = classificarRisco(r?.severity, r?.probability);
      const nivel = classificado
        ? `${classificado.score} — ${classificado.rotulo} — ${classificado.classificacao}`
        : pendente('7.2', `Risco "${r?.agent_name || 's/ nome'}" sem severidade e probabilidade avaliadas: não há como classificá-lo (alínea "i").`);

      const medidas = [
        r?.epc_implemented ? `Proteção coletiva: ${r?.epc_description?.trim() || 'descrição não informada'}` : '',
        r?.epc_implemented && !r?.epc_effective ? '(eficácia ainda não verificada — subitem 1.5.5.3)' : '',
        r?.epi_required
          ? `EPI: ${(r?.epis || []).map((e: any) => `${e?.epi_name || 's/ nome'}${e?.ca_number ? ` (CA ${e.ca_number})` : ''}`).join('; ') || 'exigido, sem EPI cadastrado'}`
          : ''
      ].filter(Boolean).join('\n');

      const avaliacao = [
        r?.evaluation_type ? `Tipo: ${r.evaluation_type}` : '',
        // "0 dB(A)" nao e medicao: era o valor que o catalogo gravava quando
        // o agente nao tinha valor sugerido. Num risco ergonomico entao,
        // decibel nao significa nada.
        temMedicao(r) ? `Resultado: ${r.measured_value} ${r?.measurement_unit || ''}`.trim() : '',
        r?.measurement_methodology ? `Método: ${r.measurement_methodology}` : '',
        r?.action_level ? `NA: ${r.action_level}` : '',
        r?.tolerance_limit ? `LEO: ${r.tolerance_limit}` : ''
      ].filter(Boolean).join('\n');

      garantirEspaco(56);
      tabela({
        head: [[{
          content: `R-${ghe?.code || 'SEM-GHE'}-${String(indice + 1).padStart(2, '0')} · ${r?.agent_name || 'Perigo não identificado'}`,
          colSpan: 2,
          styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 }
        }]],
        body: [
          ['Setor / GES', `${ghe?.name || 'GHE não vinculado'}${ghe?.code ? ` (${ghe.code})` : ''}`],
          ['Situação operacional',
            descreverSituacao(r?.operational_situation, r?.operational_situation_note)
              || pendente('7.2', `Situação operacional (R, NR ou E) do risco "${r?.agent_name || ''}" não registrada — edite o risco em GHE & Inventário de Riscos (alínea "b").`)],
          ['Tipo de perigo', r?.risk_category || 'não informado'],
          ['Fonte ou circunstância', r?.generating_source?.trim() || 'não informada'],
          ['Possíveis lesões ou agravos', r?.health_effects?.trim()
            || pendente('7.2', `Possíveis lesões ou agravos do risco "${r?.agent_name || ''}" não descritos (alínea "d").`)],
          ['Nº de expostos', String(expostosDoGhe(r?.ghe_id))],
          ['Medidas implementadas', medidas || 'Nenhuma medida de controle registrada'],
          ['Caracterização da exposição', r?.propagation_path?.trim() || 'não caracterizada'],
          ['Avaliação / monitoramento', avaliacao || 'Sem avaliação registrada'],
          ['Severidade (S)', classificado ? String(classificado.severidade) : 'não avaliada'],
          ['Probabilidade (P)', classificado ? String(classificado.probabilidade) : 'não avaliada'],
          ['Nível e classificação', nivel]
        ].map(([a, b]) => [
          { content: a, styles: { fontStyle: 'bold' as const, cellWidth: util * 0.28 } },
          { content: b }
        ]),
        styles: { fontSize: 6.4, cellPadding: 1.4, overflow: 'linebreak' }
      });
    });
  }

  secao('7.3 Registro de avaliações ambientais');
  const comMedicao = riscosDoCliente.filter(temMedicao);
  tabela({
    head: [['Agente', 'GES', 'Método', 'Resultado', 'NA / LEO', 'Conclusão']],
    body: comMedicao.length > 0
      ? comMedicao.map((r: any) => {
          const ghe = gheDoCliente.find((g: any) => g?.id === r?.ghe_id);
          return [
            r?.agent_name || '',
            ghe?.code || '',
            r?.measurement_methodology?.trim() || 'não informado',
            `${r.measured_value} ${r?.measurement_unit || ''}`.trim(),
            [r?.action_level, r?.tolerance_limit].filter(Boolean).join(' / ') || 'não informados',
            r?.ltcat_technical_conclusion?.trim() || 'não informada'
          ];
        })
      : [[{
          content: 'Nenhuma avaliação quantitativa registrada no inventário deste cliente.',
          colSpan: 6
        }]],
    styles: { fontSize: 6.4, cellPadding: 1.5, overflow: 'linebreak' }
  });

  secao('7.4 Resultados da avaliação ergonômica preliminar');
  paragrafo(
    'Os resultados da AEP, e da AET quando realizada, integram este inventário (item 17.3.5 da ' +
    'NR-17). O registro da AEP é obrigatório (subitem 17.3.1.2.1) e o relatório de AET é ' +
    'guardado por 20 anos (item 17.3.7). A metodologia está na seção 5.3.'
  );

  if (aepsDoCliente.length === 0) {
    // Nao cabe declaracao de inexistencia: o item 17.3.1 obriga a AEP das
    // situacoes que demandam adaptacao, e a NR-17 se aplica a TODAS as
    // situacoes de trabalho (item 17.2.1).
    paragrafo(
      pendente('7.4', 'Nenhuma avaliação ergonômica preliminar registrada (Engenharia SST > 13. Avaliação Ergonômica). O subitem 17.3.1.2.1 exige o registro da AEP, e o item 17.2.1 aplica a NR-17 a todas as situações de trabalho.'),
      7
    );
  } else {
    const nomeDoCargoAep = (id: string) =>
      (jobs || []).find((j: any) => j?.id === id)?.name || '';
    const nomeDoGheAep = (id: string) => {
      const g = gheDoCliente.find((x: any) => x?.id === id);
      return g?.code || g?.name || '';
    };

    const linhas = aepsDoCliente.map((a: any) => {
      const faltando: string[] = [];

      const alcance = [
        ...(Array.isArray(a?.ghe_ids) ? a.ghe_ids.map(nomeDoGheAep) : []),
        ...(Array.isArray(a?.job_ids) ? a.job_ids.map(nomeDoCargoAep) : [])
      ].filter(Boolean).join('; ');
      if (!alcance) faltando.push('GHE ou cargo a que a situação corresponde');

      if (!a?.approach) {
        faltando.push('abordagem empregada: qualitativa, semiquantitativa, quantitativa ou combinação (subitem 17.3.1.1)');
      }
      if (!a?.methods?.trim()) {
        faltando.push('métodos, técnicas e ferramentas empregados');
      }
      if (!a?.assessment_date?.trim()) faltando.push('data da avaliação');
      if (!a?.assessor?.trim()) faltando.push('quem realizou a avaliação');

      // Aspecto ausente do mapa e aspecto nao avaliado.
      const aspectos = a?.aspects || {};
      const naoAvaliados = NR17_ASPECTOS.filter((asp) => !aspectos?.[asp.chave]?.conclusao);
      if (naoAvaliados.length > 0) {
        faltando.push(`conclusão dos aspectos: ${naoAvaliados.map((x) => `${x.rotulo} (${x.fonte})`).join(', ')}`);
      }
      const inadequadosSemNota = NR17_ASPECTOS.filter(
        (asp) => aspectos?.[asp.chave]?.conclusao === 'INADEQUADO'
          && !aspectos?.[asp.chave]?.observacao?.trim()
      );
      if (inadequadosSemNota.length > 0) {
        faltando.push(`o que se observou nos aspectos julgados inadequados: ${inadequadosSemNota.map((x) => x.rotulo).join(', ')}`);
      }

      const inadequados = NR17_ASPECTOS.filter(
        (asp) => aspectos?.[asp.chave]?.conclusao === 'INADEQUADO'
      );

      // Subitem 17.4.3.1: duas ou mais. E 17.4.3.1.1: sem "c" e "d", as
      // alineas "a" e "b" sao obrigatorias.
      const medidas: string[] = Array.isArray(a?.prevention_measures) ? a.prevention_measures : [];
      if (inadequados.length > 0) {
        if (medidas.length < NR17_MINIMO_DE_ALTERNATIVAS) {
          faltando.push(`ao menos ${NR17_MINIMO_DE_ALTERNATIVAS} alternativas de prevenção do subitem 17.4.3.1, e há ${medidas.length} registrada(s)`);
        }
        const temCouD = medidas.includes('c') || medidas.includes('d');
        if (!temCouD && !(medidas.includes('a') && medidas.includes('b'))) {
          faltando.push('pausas e alternância de atividades, que o subitem 17.4.3.1.1 torna obrigatórias quando não se adotam as alíneas "c" e "d"');
        }
      }

      if (!a?.workers_heard) {
        faltando.push('registro de que os empregados foram ouvidos no processo (item 17.3.8)');
      } else if (a.workers_heard === 'NAO') {
        faltando.push('a oitiva dos empregados, que o item 17.3.8 exige na AEP e na AET');
      }

      // Gatilho da AET observado exige o relatorio - ou, na dispensa do
      // 17.3.4, so os das alineas "c" e "d" o exigem (subitem 17.3.4.1).
      const gatilhos: string[] = Array.isArray(a?.aet_triggers) ? a.aet_triggers : [];
      const gatilhosQueObrigam = dispensaDeAET === true
        ? gatilhos.filter((g) => g === 'c' || g === 'd')
        : gatilhos;
      if (gatilhosQueObrigam.length > 0 && !a?.aet_report_date?.trim()) {
        faltando.push(`AET, exigida pelas alíneas "${gatilhosQueObrigam.join('", "')}" do item 17.3.2 observadas nesta situação`);
      }

      if (faltando.length > 0) {
        pendente('7.4', `AEP ${a?.situation_name || 'sem nome'}: falta ${faltando.join('; ')}.`);
      }

      const conclusoes = NR17_ASPECTOS.map((asp) => {
        const c = aspectos?.[asp.chave]?.conclusao;
        const obs = aspectos?.[asp.chave]?.observacao?.trim();
        return `${asp.rotulo}: ${c ? CONCLUSAO_POR_EXTENSO[c as keyof typeof CONCLUSAO_POR_EXTENSO] : 'PENDENTE'}`
          + (obs ? ` — ${obs}` : '');
      }).join('\n');

      const prevencao = [
        medidas.length > 0
          ? medidas.map((m) => {
            const alt = NR17_ALTERNATIVAS_DE_PREVENCAO.find((x) => x.alinea === m);
            return `${m}) ${alt ? alt.texto : ''}`;
          }).join('\n')
          : (inadequados.length > 0 ? 'PENDENTE' : 'Sem aspecto inadequado a tratar'),
        a?.prevention_description?.trim()
      ].filter(Boolean).join('\n');

      const aet = gatilhos.length === 0
        ? 'Nenhum gatilho do item 17.3.2 observado'
        : [
          `Gatilhos: ${gatilhos.map((g) => `"${g}"`).join(', ')}`,
          a?.aet_report_date?.trim()
            ? `AET de ${formatDate(a.aet_report_date)}`
              + (a?.aet_report_reference?.trim() ? ` (${a.aet_report_reference.trim()})` : '')
            : (gatilhosQueObrigam.length > 0 ? 'AET PENDENTE' : 'AET não exigível pela dispensa do item 17.3.4')
        ].join('\n');

      return [
        [
          a?.situation_name || 'Sem nome',
          alcance,
          a?.worker_count ? `${a.worker_count} trabalhador(es)` : ''
        ].filter(Boolean).join('\n'),
        [
          a?.approach ? ABORDAGEM_POR_EXTENSO[a.approach as keyof typeof ABORDAGEM_POR_EXTENSO] : 'PENDENTE',
          a?.methods?.trim(),
          a?.assessment_date?.trim() ? formatDate(a.assessment_date) : '',
          a?.assessor?.trim()
        ].filter(Boolean).join('\n'),
        conclusoes,
        prevencao,
        [
          a?.workers_heard === 'SIM'
            ? `Empregados ouvidos${a?.workers_heard_note?.trim() ? `: ${a.workers_heard_note.trim()}` : ''}`
            : a?.workers_heard === 'NAO' ? 'Empregados NÃO ouvidos' : 'PENDENTE',
          aet
        ].join('\n')
      ];
    });

    tabela({
      head: [['Situação de trabalho', 'Abordagem e autoria', 'Conclusões por aspecto', 'Prevenção (17.4.3.1)', 'Oitiva e AET']],
      body: linhas,
      columnStyles: {
        0: { cellWidth: util * 0.15, fontStyle: 'bold' },
        1: { cellWidth: util * 0.17 },
        3: { cellWidth: util * 0.20 },
        4: { cellWidth: util * 0.17 }
      },
      styles: { fontSize: 5.8, cellPadding: 1.3, overflow: 'linebreak' }
    });

    // Coerencia com o inventario: risco ergonomico sem AEP, e AEP sem risco
    // ergonomico inventariado - o item 17.3.5 liga as duas coisas.
    const temRiscoErgonomico = riscosDoCliente.some(
      (r: any) => String(r?.risk_category || '').toUpperCase().startsWith('ERGON')
    );
    if (!temRiscoErgonomico) {
      pendente('7.4', 'Há avaliação ergonômica preliminar registrada e nenhum agente ergonômico no inventário da seção 7.2. O item 17.3.5 manda os resultados da AEP integrarem o inventário de riscos do PGR: inventarie o perigo, ou registre a ausência de risco com a justificativa.');
    }

    // GHE sem AEP nenhuma: a NR-17 alcanca todas as situacoes de trabalho.
    const idsComAep = new Set(
      aepsDoCliente.flatMap((a: any) => Array.isArray(a?.ghe_ids) ? a.ghe_ids : [])
    );
    const ghesSemAep = gheDoCliente.filter((g: any) => !idsComAep.has(g?.id));
    if (ghesSemAep.length > 0) {
      pendente('7.4', `${ghesSemAep.length} GHE sem avaliação ergonômica preliminar: ${ghesSemAep.map((g: any) => g?.code || g?.name).join(', ')}. O item 17.2.1 aplica a NR-17 a todas as situações de trabalho.`);
    }
  }

  // ==================================================================
  // 8. PLANO DE ACAO
  // ==================================================================
  novaPagina();
  secao('8. PLANO DE AÇÃO');
  paragrafo(
    'O plano de ação indica as medidas a introduzir, aprimorar ou manter para cada risco ' +
    'classificado (subitem 1.5.5.2.1), com cronograma, responsáveis, forma de acompanhamento e ' +
    'aferição de resultados (subitem 1.5.5.2.2). Todo risco do inventário tem ao menos uma ação, ' +
    'inclusive os toleráveis (ação "manter").'
  );
  secao('8.1 Regras de elaboração');
  lista(PGR_REGRAS_DO_PLANO);

  secao('8.2 Quadro do plano de ação');

  // Uma acao por risco: introduzir quando nao ha controle, aprimorar quando o
  // controle existe mas a eficacia nao foi verificada, manter quando esta
  // tudo implementado e verificado. Ordenado por prioridade do modelo.
  const acoes = riscosDoCliente
    .map((r: any, i: number) => {
      const ghe = gheDoCliente.find((g: any) => g?.id === r?.ghe_id);
      const c = classificarRisco(r?.severity, r?.probability);
      const semControle = !r?.epc_implemented;
      const semEficacia = r?.epc_implemented && !r?.epc_effective;
      return {
        risco: r,
        id: `R-${ghe?.code || 'SEM-GHE'}-${String(i + 1).padStart(2, '0')}`,
        gheNome: ghe?.name || 'GHE não vinculado',
        classificado: c,
        expostos: expostosDoGhe(r?.ghe_id),
        tipo: semControle ? 'Introduzir' : semEficacia ? 'Aprimorar' : 'Manter',
        medida: semControle
          ? `Implantar medida de proteção coletiva para ${r?.agent_name || 'o perigo identificado'}`
          : semEficacia
            ? `Verificar e evidenciar a eficácia do controle coletivo de ${r?.agent_name || 'o perigo identificado'}`
            : `Manter e monitorar os controles de ${r?.agent_name || 'o perigo identificado'}`,
        hierarquia: semControle || semEficacia ? 'Proteção coletiva' : 'Manutenção dos controles'
      };
    })
    .sort((a, b) => (a.classificado?.prioridade ?? 9) - (b.classificado?.prioridade ?? 9));

  tabela({
    head: [['Nº', 'Risco / nível', 'Exp.', 'Medida · hierarquia · tipo', 'Responsável · prazo', 'Acompanhamento · aferição', 'Status']],
    body: acoes.length > 0
      ? acoes.map((a, i) => [
          `A-${String(i + 1).padStart(2, '0')}`,
          `${a.id}\n${a.classificado ? `${a.classificado.rotulo} (${a.classificado.score})` : 'não classificado'}`,
          String(a.expostos),
          `${a.medida}\n${a.hierarquia} · ${a.tipo}`,
          `${technicalResponsibleName(organization)}\n${a.classificado ? a.classificado.prazo : 'prazo depende da classificação'}`,
          'Revisão do status e das evidências do plano\nAferição: reavaliação do risco após a medida (alínea "a" do subitem 1.5.4.4.6)',
          'Não iniciada'
        ])
      : [[{
          content: pendente('8.2', 'Plano de ação vazio: sem inventário não há plano, e sem os dois não há PGR (subitem 1.5.7.1).'),
          colSpan: 7,
          styles: { textColor: [180, 83, 9], fontStyle: 'bold' }
        }]],
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: util * 0.14 },
      2: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: util * 0.1 }
    },
    styles: { fontSize: 6, cellPadding: 1.3, overflow: 'linebreak' }
  });
  paragrafo(PGR_STATUS_DO_PLANO, 6.4);

  // ==================================================================
  // 9. ACOMPANHAMENTO E GESTAO
  // ==================================================================
  novaPagina();
  secao('9. ACOMPANHAMENTO, RESPOSTA A EMERGÊNCIAS E GESTÃO DO PROGRAMA');

  secao('9.1 Acompanhamento das medidas de prevenção');
  tabela({
    head: [['Elemento', 'Forma', 'Periodicidade', 'Responsável']],
    body: [
      // Quem gere o plano de acao e o coordenador da implementacao
      // (subitens 1.5.5.2 e 1.5.5.3), nao o responsavel tecnico.
      ['Execução e continuidade das ações', 'Revisão do status e das evidências do plano', 'Mensal',
        estabelecimento?.pgr_coordinator?.trim() || technicalResponsibleName(organization)],
      ['Inspeções de locais e equipamentos', 'Checklist por setor, com registro fotográfico', 'Mensal ou conforme NR específica', technicalResponsibleName(organization)],
      ['Monitoramento ambiental', 'Reavaliação de agentes acima do NA', 'Anual ou após mudança', technicalResponsibleName(organization)],
      ['Participação dos trabalhadores e da CIPA', 'Pauta fixa nas reuniões da CIPA; inspeções conjuntas', 'Mensal',
        dimensionamento?.cipa?.efetivos
          ? `CIPA constituída conforme o Quadro I da NR-05 (${dimensionamento.cipa.efetivos} efetivo(s))`
          : dimensionamento?.cipa
            ? 'Designado da NR-05 (estabelecimento não obrigado a constituir CIPA)'
            : pendente('9.1', 'CIPA ou designado da NR-05 não dimensionado.')]
    ],
    styles: { fontSize: 6.6, cellPadding: 1.6, overflow: 'linebreak' }
  });
  paragrafo(
    'Indicadores de desempenho em SST (subitem 1.5.3.4): ações concluídas no prazo (%); riscos ' +
    'altos e muito altos abertos; taxa de frequência e gravidade de acidentes; eventos perigosos ' +
    'registrados; afastamentos por doença relacionada ao trabalho. Medida ineficaz é corrigida ' +
    '(subitem 1.5.5.3.2.1) e o risco reavaliado.',
    6.8
  );

  secao('9.2 Acompanhamento da saúde ocupacional');
  paragrafo(
    'O PCMSO é elaborado com base no inventário e na classificação de riscos deste PGR (subitem ' +
    '1.5.5.4.2). O médico responsável informa, preservado o sigilo médico, dados agregados que ' +
    'indiquem associação entre agravos e riscos, o que obriga à revisão da avaliação e a novas ' +
    'medidas (alínea "c" do subitem 1.5.5.1.1).'
  );

  secao('9.3 Análise de acidentes, doenças e eventos perigosos');
  paragrafo(
    'Toda ocorrência de acidente ou doença relacionada ao trabalho é analisada e documentada; ' +
    'eventos perigosos com potencial de consequência grave também são analisados (subitens ' +
    '1.5.5.5.1 e 1.5.5.5.1.1). A análise considera a atividade real, o ambiente, os materiais, o ' +
    'processo e a organização do trabalho, e não se limita a apontar ato inseguro do trabalhador ' +
    '(subitem 1.5.5.5.2).'
  );

  secao('9.4 Preparação e resposta a emergências (item 1.5.6)');
  paragrafo(
    'Os procedimentos de resposta a emergências são estabelecidos, implementados e mantidos de ' +
    'acordo com os riscos, as características e as circunstâncias das atividades (subitem ' +
    '1.5.6.1) e preveem, no mínimo, os meios, responsáveis e recursos necessários para os ' +
    'primeiros socorros, o encaminhamento de acidentados e o abandono dos locais afetados, e as ' +
    'medidas necessárias para emergências de grande magnitude quando aplicável (alíneas "a" e ' +
    '"b" do subitem 1.5.6.2).'
  );

  // Periodicidade e ultima realizacao andam juntas: a periodicidade e a
  // promessa (subitem 1.5.6.3) e a data e a evidencia (subitem 1.5.6.3.1).
  // A NR-01 nao fixa prazo, entao nada aqui compara a data com um prazo legal.
  const simuladosDoEstabelecimento = (() => {
    const periodicidade = estabelecimento?.emergency_drills?.trim();
    const ultimo = estabelecimento?.emergency_drill_last_date?.trim();
    if (!periodicidade && !ultimo) {
      return pendente('9.4', 'Periodicidade e evidências dos exercícios simulados não cadastradas (subitens 1.5.6.3 e 1.5.6.3.1) (Hierarquia > Estabelecimentos).');
    }
    const partes: string[] = [];
    partes.push(periodicidade
      || pendente('9.4', 'Periodicidade dos exercícios simulados não cadastrada: o subitem 1.5.6.3 exige que o próprio procedimento a defina (Hierarquia > Estabelecimentos).'));
    partes.push(ultimo
      ? `Último simulado realizado em ${formatDate(ultimo)}.`
      : pendente('9.4', 'Data do último exercício simulado não cadastrada: o subitem 1.5.6.3.1 exige evidência do exercício realizado (Hierarquia > Estabelecimentos).'));
    return partes.join(' ');
  })();

  tabela({
    head: [['Requisito', 'Definição da organização']],
    body: [
      ['Cenários de emergência (1.5.6.1)',
        estabelecimento?.emergency_scenarios?.trim()
          || pendente('9.4', 'Cenários de emergência não cadastrados (Hierarquia > Estabelecimentos).')],
      ['Primeiros socorros e encaminhamento (1.5.6.2 "a")',
        estabelecimento?.emergency_resources?.trim()
          || pendente('9.4', 'Recursos de primeiros socorros e hospital de referência não cadastrados (Hierarquia > Estabelecimentos).')],
      ['Abandono dos locais afetados (1.5.6.2 "a")',
        estabelecimento?.emergency_evacuation?.trim()
          || pendente('9.4', 'Alarme, rotas de fuga, ponto de encontro e responsáveis pelo abandono não cadastrados (Hierarquia > Estabelecimentos).')],
      ['Emergências de grande magnitude (1.5.6.2 "b")',
        estabelecimento?.emergency_large_scale?.trim()
          || pendente('9.4', 'Medidas para emergências de grande magnitude não declaradas. A alínea "b" vale quando aplicável: se não for o caso, declare por que (Hierarquia > Estabelecimentos).')],
      ['Exercícios simulados e evidências (1.5.6.3)', simuladosDoEstabelecimento]
    ],
    columnStyles: { 0: { cellWidth: util * 0.34, fontStyle: 'bold' } },
    styles: { fontSize: 6.6, cellPadding: 1.6, overflow: 'linebreak' }
  });

  secao('9.5 GRO nas relações de prestação de serviços a terceiros (item 1.5.8)');
  paragrafo(
    'O PGR da organização contratante inclui as medidas de prevenção para as organizações ' +
    'contratadas que atuem em suas dependências ou em local previamente convencionado em ' +
    'contrato, ou utiliza os programas das contratadas (subitem 1.5.8.1). Contratante e ' +
    'contratada informam-se mutuamente dos riscos ocupacionais sob sua responsabilidade que ' +
    'possam impactar as atividades da outra (subitens 1.5.8.2 e 1.5.8.3). Quando os riscos ' +
    'resultam da interação das atividades, as medidas de prevenção são definidas em conjunto, ' +
    'sob a coordenação da organização contratante (subitem 1.5.8.4).'
  );

  const contratadasDoCliente = (contractedOrganizations || []).filter(
    (o: any) => o?.client_id === client.id && o?.status !== 'INACTIVE'
  );

  if (contratadasDoCliente.length === 0) {
    // Lista vazia nao e "nao ha contratada": pode ser cadastro nao feito. So a
    // declaracao datada distingue as duas coisas, e e ela que o auditor le.
    const declarado = estabelecimento?.no_contracted_organizations_declared_at?.trim();
    if (declarado) {
      paragrafo(
        `A organização declarou em ${formatDate(declarado)} que nenhuma organização ` +
        'contratada atua neste estabelecimento nem em local previamente convencionado em ' +
        'contrato. Na contratação de terceiros, esta seção e as medidas de prevenção ' +
        'correspondentes devem ser revistas antes do início das atividades.',
        7
      );
    } else {
      paragrafo(
        pendente('9.5', 'Nenhuma organização contratada cadastrada e nenhuma declaração de que não há contratadas atuando (Engenharia SST > 9. Contratadas). Lista vazia não é declaração de inexistência.'),
        7
      );
    }
  } else {
    const LOCAIS: Record<string, string> = {
      DEPENDENCIAS: 'Nas dependências do contratante',
      LOCAL_CONVENCIONADO: 'Local convencionado em contrato',
      NAO_ATUA_NO_LOCAL: 'Não atua nas dependências nem em local convencionado'
    };
    const REGIMES: Record<string, string> = {
      PGR_DO_CONTRATANTE: 'Medidas neste PGR (1.5.8.1)',
      PROGRAMA_DA_CONTRATADA: 'Programas da contratada (1.5.8.1)',
      SOMENTE_TITULAR_OU_SOCIOS: 'Somente titular ou sócios (1.5.8.1.2)'
    };
    const FALTA = 'PENDENTE';

    const linhas = contratadasDoCliente.map((o: any) => {
      // Uma pendencia por contratada, com a lista do que falta. Uma por campo
      // encheria a 10.3 de dez linhas por contrato e esconderia o resto.
      const faltando: string[] = [];

      const local = LOCAIS[o?.work_location] || '';
      if (!local) faltando.push('onde atua (subitem 1.5.8.1)');
      const localCompleto = [local, o?.work_location_note?.trim()].filter(Boolean).join(' — ');

      const regime = REGIMES[o?.gro_regime] || '';
      if (!regime) faltando.push('regime de GRO: medidas neste PGR ou programas da contratada (subitem 1.5.8.1)');

      // Documentos da contratada: exigidos so quando se usam os programas dela.
      let documentos: string;
      if (o?.gro_regime === 'PROGRAMA_DA_CONTRATADA') {
        const inv = o?.received_inventory_date?.trim();
        const plano = o?.received_action_plan_date?.trim();
        if (!inv) faltando.push('inventário de riscos da contratada (subitem 1.5.8.1.1)');
        if (!plano) faltando.push('plano de ação da contratada (subitem 1.5.8.1.1)');
        documentos = [
          `Inventário: ${inv ? formatDate(inv) : FALTA}`,
          `Plano de ação: ${plano ? formatDate(plano) : FALTA}`
        ].join('\n');
      } else if (o?.gro_regime === 'SOMENTE_TITULAR_OU_SOCIOS') {
        const estendidas = o?.extended_measures?.trim();
        if (!estendidas) faltando.push('como as medidas deste PGR se estendem à atividade contratada (subitem 1.5.8.1.2)');
        documentos = estendidas || FALTA;
      } else if (o?.gro_regime === 'PGR_DO_CONTRATANTE') {
        documentos = 'Medidas de prevenção no inventário e no plano de ação deste PGR';
      } else {
        documentos = FALTA;
      }

      const informou = o?.informed_risks_date?.trim();
      const recebeu = o?.received_risks_date?.trim();
      if (!informou) faltando.push('registro de que os riscos do contratante foram informados à contratada (subitem 1.5.8.2)');
      if (!recebeu) faltando.push('registro dos riscos informados pela contratada (subitem 1.5.8.3)');
      const troca = [
        `Informou (1.5.8.2): ${informou ? formatDate(informou) : FALTA}`
        + (o?.informed_risks_evidence?.trim() ? ` — ${o.informed_risks_evidence.trim()}` : ''),
        `Recebeu (1.5.8.3): ${recebeu ? formatDate(recebeu) : FALTA}`
        + (o?.received_risks_evidence?.trim() ? ` — ${o.received_risks_evidence.trim()}` : '')
      ].join('\n');

      let interacao: string;
      if (o?.interaction_risks === 'SIM') {
        const conjuntas = o?.joint_measures?.trim();
        if (!conjuntas) faltando.push('medidas definidas em conjunto, sob coordenação do contratante (subitem 1.5.8.4)');
        interacao = `Há riscos de interação. ${conjuntas || FALTA}`;
      } else if (o?.interaction_risks === 'NAO') {
        interacao = 'Avaliado: sem riscos resultantes da interação das atividades';
      } else {
        faltando.push('avaliação de riscos resultantes da interação das atividades (subitem 1.5.8.4)');
        interacao = FALTA;
      }

      if (faltando.length > 0) {
        pendente('9.5', `Contratada ${o?.legal_name || 'sem nome'}: falta ${faltando.join('; ')}.`);
      }

      return [
        [o?.legal_name || 'Sem nome', o?.document_number?.trim()].filter(Boolean).join('\n'),
        [o?.contracted_service?.trim() || FALTA, localCompleto || FALTA].join('\n'),
        regime || FALTA,
        documentos,
        troca,
        interacao
      ];
    });

    tabela({
      head: [['Contratada', 'Serviço e local', 'Regime de GRO', 'Documentos e medidas', 'Troca de informações', 'Interação (1.5.8.4)']],
      body: linhas,
      columnStyles: {
        0: { cellWidth: util * 0.16, fontStyle: 'bold' },
        1: { cellWidth: util * 0.17 },
        2: { cellWidth: util * 0.14 },
        4: { cellWidth: util * 0.21 }
      },
      styles: { fontSize: 6.0, cellPadding: 1.4, overflow: 'linebreak' }
    });

    // As que atuam no local sem constar do inventario deste PGR: o subitem
    // 1.5.8.1 obriga a inclui-las de um modo ou de outro.
    const noLocalSemRegime = contratadasDoCliente.filter(
      (o: any) => (o?.work_location === 'DEPENDENCIAS' || o?.work_location === 'LOCAL_CONVENCIONADO')
        && !o?.gro_regime
    );
    if (noLocalSemRegime.length > 0) {
      paragrafo(
        `${noLocalSemRegime.length} contratada(s) atua(m) nas dependências ou em local ` +
        'convencionado sem regime de GRO definido. O subitem 1.5.8.1 não admite a omissão: ou ' +
        'as medidas de prevenção entram neste PGR, ou se utilizam os programas da contratada, ' +
        'que então deve fornecer inventário de riscos e plano de ação.',
        6.8
      );
    }
  }

  secao('9.6 Participação, consulta e comunicação (subitem 1.5.3.3)');
  paragrafo(
    'Todo trabalhador recebe, na admissão e na mudança de função com alteração de risco, ' +
    'informações sobre os riscos, os meios de prevenção, as medidas adotadas, os procedimentos ' +
    'de emergência e o direito de interromper a atividade em risco grave e iminente (itens 1.4.3 ' +
    'e 1.4.4). As ordens de serviço de SST são emitidas com ciência do trabalhador (alínea "c" do ' +
    'item 1.4.1) e ficam registradas no sistema.'
  );

  secao('9.7 Capacitação e treinamento (item 1.7)');
  paragrafo(
    'Os treinamentos exigidos pelas NR aplicáveis constam da matriz de capacitação abaixo, com ' +
    'inicial, periódico e eventual (subitem 1.7.1.2). O treinamento inicial ocorre antes de o ' +
    'trabalhador iniciar suas funções ou no prazo especificado em NR (subitem 1.7.1.2.1), e o ' +
    'periódico segue a periodicidade estabelecida na NR ou, quando esta não a estabelece, prazo ' +
    'determinado pelo empregador (subitem 1.7.1.2.2). Cada certificado contém nome e assinatura ' +
    'do trabalhador, conteúdo programático, carga horária, data, local, nome e qualificação dos ' +
    'instrutores e assinatura do responsável técnico do treinamento (subitem 1.7.1.1). O tempo ' +
    'despendido é considerado de trabalho efetivo (subitem 1.7.2).'
  );

  const matrizDoCliente = (trainingRequirements || []).filter(
    (t: any) => t?.client_id === client.id && t?.status !== 'INACTIVE'
  );

  if (matrizDoCliente.length === 0) {
    // Aqui nao ha declaracao de inexistencia possivel: o subitem 1.7.1.2.1
    // exige treinamento inicial de todo trabalhador antes de iniciar as
    // funcoes, sem excecao. Matriz vazia e sempre pendencia.
    paragrafo(
      pendente('9.7', 'Matriz de capacitação não cadastrada (Engenharia SST > 12. Matriz de Capacitação). O subitem 1.7.1.2.1 exige treinamento inicial de todo trabalhador antes de iniciar suas funções, de modo que a matriz nunca é vazia.'),
      7
    );
  } else {
    const nomeDoCargo = (id: string) =>
      (jobs || []).find((j: any) => j?.id === id)?.name || '';
    const nomeDoGhe = (id: string) =>
      gheDoCliente.find((g: any) => g?.id === id)?.code
      || gheDoCliente.find((g: any) => g?.id === id)?.name || '';

    const linhas = matrizDoCliente.map((t: any) => {
      const faltando: string[] = [];

      const alcance = [
        ...(Array.isArray(t?.job_ids) ? t.job_ids.map(nomeDoCargo) : []),
        ...(Array.isArray(t?.ghe_ids) ? t.ghe_ids.map(nomeDoGhe) : []),
        t?.audience_note?.trim()
      ].filter(Boolean).join('; ');
      if (!alcance) {
        faltando.push('a quem se aplica: cargo, GHE ou descrição do público');
      }

      if (!t?.basis) {
        faltando.push('se a carga horária e a periodicidade são fixadas na NR ou definidas pelo empregador (subitem 1.7.1.2.2)');
      }
      if (!t?.initial_hours?.trim()) {
        faltando.push('carga horária do treinamento inicial');
      }
      // Sem periodicidade nenhuma o periodico do subitem 1.7.1.2 fica sem
      // prazo - inclusive quando quem o determina e o empregador.
      if (!t?.periodic_months) {
        faltando.push('periodicidade do treinamento periódico, que a NR estabelece ou o empregador determina (subitem 1.7.1.2.2)');
      }

      if (faltando.length > 0) {
        pendente('9.7', `Treinamento ${t?.name || 'sem nome'}: falta ${faltando.join('; ')}.`);
      }

      const periodico = t?.periodic_months
        ? `A cada ${t.periodic_months} ${t.periodic_months === 1 ? 'mês' : 'meses'}`
          + (t?.periodic_hours?.trim() ? `, ${t.periodic_hours.trim()}` : '')
        : 'PENDENTE';

      return [
        t?.name || 'Sem nome',
        [t?.norm?.trim(), t?.norm_reference?.trim()].filter(Boolean).join('\n') || '—',
        alcance || 'PENDENTE',
        t?.initial_hours?.trim() || 'PENDENTE',
        periodico,
        t?.basis ? BASE_POR_EXTENSO[t.basis as keyof typeof BASE_POR_EXTENSO] : 'PENDENTE'
      ];
    });

    tabela({
      head: [['Treinamento', 'Norma e subitem', 'A quem se aplica', 'Inicial', 'Periódico', 'Carga e prazo']],
      body: linhas,
      columnStyles: {
        0: { cellWidth: util * 0.20, fontStyle: 'bold' },
        1: { cellWidth: util * 0.16 },
        3: { cellWidth: util * 0.08, halign: 'center' },
        4: { cellWidth: util * 0.14 },
        5: { cellWidth: util * 0.18 }
      },
      styles: { fontSize: 6.0, cellPadding: 1.3, overflow: 'linebreak' }
    });

    // Quem definiu a carga: a NR ou o empregador. Atribuir a NR um numero que
    // ela nao fixa e o erro classico desta secao - a NR-12 deixa a carga
    // expressamente ao empregador (alinea "c" do subitem 12.16.3).
    if (matrizDoCliente.some((t: any) => t?.basis === 'EMPREGADOR')) {
      paragrafo(
        'Nas linhas marcadas como definidas pelo empregador, a NR exige o treinamento mas não ' +
        'fixa carga horária ou periodicidade: quem as determina é a organização, e a matriz ' +
        'registra o que ela determinou (subitem 1.7.1.2.2 da NR-01).',
        6.8
      );
    }

    // Coerencia com as secoes 6.4, 6.5 e 7: o que esta cadastrado no PGR
    // pressupoe treinamento na matriz.
    const temNorma = (n: string) =>
      matrizDoCliente.some((t: any) => String(t?.norm || '').toUpperCase().replace(/[^0-9A-Z]/g, '') === n);

    const maquinasNr12 = (machinesEquipment || []).filter(
      (m: any) => m?.client_id === client.id && (m?.applicable_norms || []).includes('NR_12')
    );
    if (maquinasNr12.length > 0 && !temNorma('NR12')) {
      pendente('9.7', `Há ${maquinasNr12.length} máquina(s) com requisito de NR-12 na seção 6.5 e nenhum treinamento de NR-12 na matriz. O subitem 12.16.1 exige que a operação, manutenção e inspeção sejam feitas por trabalhador capacitado e autorizado.`);
    }

    const equipamentosNr13 = (machinesEquipment || []).filter(
      (m: any) => m?.client_id === client.id && (m?.applicable_norms || []).includes('NR_13')
    );
    if (equipamentosNr13.length > 0 && !temNorma('NR13')) {
      pendente('9.7', `Há ${equipamentosNr13.length} equipamento(s) da NR-13 na seção 6.5 e nenhum treinamento de NR-13 na matriz.`);
    }

    const quimicos = (chemicalProducts || []).filter(
      (q: any) => q?.client_id === client.id && q?.status !== 'INACTIVE'
    );
    if (quimicos.length > 0 && !temNorma('NR26')) {
      pendente('9.7', `Há ${quimicos.length} produto(s) químico(s) na seção 6.4 e nenhum treinamento de NR-26 na matriz, exigido pelo subitem 26.5.2.`);
    }

    const comEpi = riscosDoCliente.filter((r: any) => r?.epi_required);
    if (comEpi.length > 0 && !temNorma('NR06')) {
      pendente('9.7', `Há ${comEpi.length} risco(s) no inventário com EPI exigido e nenhum treinamento de NR-06 na matriz. A alínea "d" do subitem 6.6.1 obriga a orientar e treinar sobre uso adequado, guarda e conservação do EPI.`);
    }
  }

  // O eventual nao e linha da matriz: e gatilho.
  paragrafo(
    'Independentemente do treinamento periódico, o treinamento eventual ocorre nas situações do ' +
    'subitem 1.7.1.2.3, com carga horária, prazo e conteúdo que atendam à situação que o ' +
    'motivou (subitem 1.7.1.2.3.1):',
    7
  );
  lista(GATILHOS_DE_TREINAMENTO_EVENTUAL);

  secao('9.8 Prevenção e combate ao assédio sexual e às demais formas de violência (subitem 1.4.1.1)');

  // O subitem 1.4.1.1 obriga as organizacoes OBRIGADAS A CONSTITUIR CIPA nos
  // termos da NR-05, e a CIPA e dimensionada por estabelecimento (Quadro I).
  // Por isso a aplicabilidade sai do dimensionamento, e nao de uma suposicao.
  const enquadramentoCipa = dimensionamento?.cipa?.status || 'NAO_DIMENSIONADO';

  if (enquadramentoCipa === 'CIPA') {
    paragrafo(
      'A organização é obrigada a constituir CIPA neste estabelecimento ' +
      `(${dimensionamento?.cipa?.efetivos} efetivo(s) pelo Quadro I da NR-05), o que a sujeita às ` +
      'medidas do subitem 1.4.1.1 da NR-01, incluído pela Portaria MTP nº 4.219, de 20 de ' +
      'dezembro de 2022, além de outras que entenda necessárias.'
    );

    // Alinea "c": no minimo a cada 12 meses. O prazo esta na propria alinea,
    // por isso aqui se pode dizer que venceu - o que a 9.4 nao pode fazer com
    // os simulados, cuja periodicidade a NR-01 nao fixa.
    const capacitacaoAssedio = (() => {
      const acoes = estabelecimento?.harassment_training_actions?.trim();
      const ultima = estabelecimento?.harassment_training_last_date?.trim();
      if (!acoes && !ultima) {
        return pendente('9.8', 'Ações de capacitação, orientação e sensibilização sobre violência, assédio, igualdade e diversidade não cadastradas (alínea "c" do subitem 1.4.1.1) (Hierarquia > Estabelecimentos).');
      }
      const partes: string[] = [];
      if (acoes) partes.push(acoes);
      const prazo = ultima ? somarMeses(ultima, 12) : null;
      if (ultima && prazo) {
        partes.push(`Última ação em ${formatDate(ultima)}; a alínea "c" exige nova ação até ${formatDate(prazo)}.`);
        if (prazo < emissao) {
          partes.push(pendente('9.8', `Ação de capacitação sobre assédio vencida: a última foi em ${formatDate(ultima)} e o intervalo máximo de 12 meses da alínea "c" do subitem 1.4.1.1 terminou em ${formatDate(prazo)}.`));
        }
      } else {
        partes.push(pendente('9.8', 'Data da última ação de capacitação sobre assédio não cadastrada: sem ela não se comprova o intervalo máximo de 12 meses da alínea "c" (Hierarquia > Estabelecimentos).'));
      }
      return partes.join(' ');
    })();

    tabela({
      head: [['Medida do subitem 1.4.1.1', 'Como a organização atende']],
      body: [
        ['a) Regras de conduta sobre assédio sexual e outras formas de violência nas normas internas, com ampla divulgação',
          estabelecimento?.harassment_conduct_rules?.trim()
            || pendente('9.8', 'Regras de conduta sobre assédio nas normas internas e a forma de divulgação não cadastradas (alínea "a" do subitem 1.4.1.1) (Hierarquia > Estabelecimentos).')],
        ['b) Procedimentos de recebimento e acompanhamento de denúncias, apuração dos fatos e sanções administrativas, garantido o anonimato de quem denuncia',
          estabelecimento?.harassment_report_channel?.trim()
            || pendente('9.8', 'Canal e procedimento de denúncia, apuração e sanções não cadastrados (alínea "b" do subitem 1.4.1.1) (Hierarquia > Estabelecimentos).')],
        ['c) Ações de capacitação, orientação e sensibilização, no mínimo a cada 12 meses, para todos os níveis hierárquicos',
          capacitacaoAssedio]
      ],
      columnStyles: { 0: { cellWidth: util * 0.42, fontStyle: 'bold' } },
      styles: { fontSize: 6.6, cellPadding: 1.6, overflow: 'linebreak' }
    });
  } else if (enquadramentoCipa === 'REPRESENTANTE_NR05') {
    // Nao se enquadra no Quadro I: nao ha CIPA a constituir, e o subitem
    // 1.4.1.1 nao alcanca o estabelecimento. Nao e pendencia, e tambem nao e
    // requisito atendido - ver `naoAplicaveis`.
    naoAplicaveis.add('1.4.1.1');
    paragrafo(
      'O subitem 1.4.1.1 alcança as organizações obrigadas a constituir CIPA nos termos da ' +
      'NR-05. Este estabelecimento não se enquadra no Quadro I da NR-05 e nomeia representante ' +
      'da NR-05 (item 5.4.13), de modo que as medidas daquele subitem não lhe são exigíveis. ' +
      'Permanecem exigíveis o levantamento e o controle dos fatores de risco psicossociais ' +
      'relacionados ao trabalho, tratados nas seções 5.3 e 7.4 deste PGR, e a violência no ' +
      'trabalho continua a ser perigo a inventariar quando presente.'
    );
    const adotadas = [
      estabelecimento?.harassment_conduct_rules?.trim()
        && `Regras de conduta: ${estabelecimento.harassment_conduct_rules.trim()}`,
      estabelecimento?.harassment_report_channel?.trim()
        && `Canal de denúncia: ${estabelecimento.harassment_report_channel.trim()}`,
      estabelecimento?.harassment_training_actions?.trim()
        && `Capacitação: ${estabelecimento.harassment_training_actions.trim()}`
    ].filter(Boolean) as string[];
    if (adotadas.length > 0) {
      paragrafo('A organização adota, por iniciativa própria, as medidas abaixo:', 7);
      lista(adotadas);
    }
  } else {
    paragrafo(
      pendente('9.8', 'Não é possível dizer se o subitem 1.4.1.1 se aplica: ele alcança quem é obrigado a constituir CIPA, e o Quadro I da NR-05 não pôde ser aplicado. Informe o grau de risco e o efetivo do estabelecimento.'),
      7
    );
  }

  secao('9.9 Revisão da avaliação de riscos');
  paragrafo(
    `A avaliação de riscos é revista a cada 24 meses — próxima revisão periódica em ` +
    `${formatDate(proximaRevisao)} — ou 36 meses com certificação SGSST válida (subitem ` +
    `1.5.4.4.6.1), e sempre que ocorrer (subitem 1.5.4.4.6):`
  );
  lista(PGR_HIPOTESES_DE_REVISAO, true);

  secao('9.10 Registro, guarda e disponibilidade');
  lista(PGR_GUARDA);

  // ==================================================================
  // 10. ANEXOS E CHECKLIST
  // ==================================================================
  novaPagina();
  secao('10. ANEXOS E CHECKLIST DE CONFORMIDADE');

  secao('10.1 Anexos do PGR');
  tabela({
    head: [['Anexo', 'Conteúdo']],
    body: PGR_ANEXOS.map(([n, c]) => [n, c]),
    columnStyles: { 0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' } },
    styles: { fontSize: 6.8, cellPadding: 1.6, overflow: 'linebreak' }
  });

  secao('10.2 Checklist de conformidade para a fiscalização');
  const secoesComPendencia = new Set(pendencias.map((p) => p.secao));
  tabela({
    head: [['Requisito', 'NR-01', 'Onde está', 'Situação']],
    body: PGR_CHECKLIST.map((item) => {
      const naoAplicavel = naoAplicaveis.has(item.norma);
      const pendente_ = !naoAplicavel && item.secoes.some((sec) => secoesComPendencia.has(sec));
      return [
        item.requisito,
        item.norma,
        item.onde,
        {
          content: naoAplicavel ? 'Não aplicável' : pendente_ ? 'Com pendência' : 'Atendido',
          styles: naoAplicavel
            ? { textColor: [100, 116, 139] as [number, number, number] }
            : pendente_
              ? { textColor: [180, 83, 9] as [number, number, number], fontStyle: 'bold' as const }
              : {}
        }
      ];
    }),
    // Sem largura fixa na primeira coluna: com as quatro fixas, a autoTable
    // reclamava de 18 mm que nao cabiam na pagina.
    columnStyles: {
      1: { cellWidth: util * 0.17 },
      2: { cellWidth: util * 0.13 },
      3: { cellWidth: util * 0.15, halign: 'center' }
    },
    styles: { fontSize: 6.4, cellPadding: 1.5, overflow: 'linebreak' }
  });

  secao(`10.3 Pendências deste PGR (${pendencias.length})`);
  if (pendencias.length === 0) {
    paragrafo('Nenhuma pendência: todos os campos exigidos pelo modelo foram preenchidos.');
  } else {
    tabela({
      head: [['Seção', 'O que falta']],
      body: pendencias.map((p) => [p.secao, p.texto]),
      columnStyles: { 0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' } },
      styles: { fontSize: 6.4, cellPadding: 1.5, overflow: 'linebreak', textColor: [120, 53, 15] }
    });
    paragrafo(
      'O PGR vale pela implementação, não pelo papel: na fiscalização, o auditor confronta o ' +
      'inventário com o local de trabalho e o plano de ação com as evidências de execução. ' +
      'Resolva as pendências acima antes de entregar este documento como PGR concluído.',
      6.8
    );
  }

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
        { content: clientDocumentLine(client) }
      ],
      [
        { content: 'Atividade Rural:', styles: { fontStyle: 'bold' } },
        { content: `${cnaeLine(client)} - Atividade rural (NR-31)` },
        { content: 'Trabalhadores Rurais:', styles: { fontStyle: 'bold' } },
        { content: `${employees.length} trabalhadores no campo` }
      ],
      [
        { content: 'Responsável Técnico:', styles: { fontStyle: 'bold' } },
        { content: technicalResponsibleLine(organization) },
        { content: 'Data Avaliação:', styles: { fontStyle: 'bold' } },
        { content: formatDate(new Date().toISOString()) }
      ]
    ],
    styles: { fontSize: 7.2, cellPadding: 2 }
  });

  let curY = (doc as any).lastAutoTable.finalY + 6;

  // Inventario rural montado sobre os riscos reais, como no PGR urbano.
  const ruralRows: any[] = (risks || [])
    .filter((r: any) => r && r.status !== 'INACTIVE')
    .map((r: any) => {
      const ghe = (ghes || []).find((g: any) => g?.id === r?.ghe_id);
      const controles = [
        r.epc_implemented ? `EPC: ${r.epc_description?.trim() || 'sem descrição'}` : '',
        r.epi_required ? 'EPI exigido' : '',
        r.ltcat_technical_conclusion?.trim() || ''
      ].filter(Boolean);
      return [
        [ghe?.code, ghe?.name].filter(Boolean).join(' — ') || 'GHE não vinculado',
        `${r.agent_name || 'Agente não identificado'}\nFonte: ${r.generating_source?.trim() || 'não informada'}`,
        controles.length > 0 ? controles.join('\n') : 'Nenhuma medida de controle registrada',
        r.epc_implemented && r.epc_effective
          ? 'Controle implantado e avaliado como eficaz'
          : r.epc_implemented
            ? 'Controle implantado, eficácia não confirmada'
            : 'PENDENTE — sem controle coletivo registrado'
      ];
    });

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '2. INVENTÁRIO DE RISCOS DO ESTABELECIMENTO RURAL (NR-31)', colSpan: 4, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ], [
      'GHE / Frente de trabalho', 'Perigo / Agente de risco inventariado', 'Medidas de controle registradas', 'Situação'
    ]],
    // Antes saiam quatro linhas fixas declarando CONFORME em agrotoxicos,
    // maquinas, calor e animais peconhentos - para qualquer propriedade, sem
    // que nada disso tivesse sido verificado. Declarar conformidade que
    // ninguem apurou e o pior tipo de dado inventado: passa na fiscalizacao
    // ate o dia do acidente. Agora a tabela vem do inventario real.
    body: ruralRows.length > 0 ? ruralRows : [
      [{
        content:
          'INVENTÁRIO DE RISCOS VAZIO. Não há agente de risco cadastrado para este estabelecimento rural. ' +
          'Este documento não avalia conformidade com os itens 31.7 (agrotóxicos), 31.10 (trabalho a céu ' +
          'aberto), 31.12 (máquinas e implementos) e 31.14 (agentes biológicos e animais peçonhentos) da ' +
          'NR-31 — nenhum deles foi verificado. Levante os perigos antes de emitir o PGRTR.',
        colSpan: 4,
        styles: { textColor: [180, 83, 9], fontStyle: 'bold' }
      }]
    ],
    styles: { fontSize: 7, cellPadding: 2.2 },
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  curY = (doc as any).lastAutoTable.finalY + 6;

  // O sistema nao guarda checklist tematico da NR-31. Dizer isso e obrigatorio:
  // sem a ressalva, a ausencia do tema poderia ser lida como conformidade.
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(120, 53, 15);
  doc.text(
    doc.splitTextToSize(
      'Escopo deste documento: o inventário acima reproduz os riscos registrados no sistema. A verificação ' +
      'específica dos itens 31.7 (agrotóxicos), 31.10 (trabalho a céu aberto), 31.12 (máquinas, implementos ' +
      'e tomada de força) e 31.14 (agentes biológicos e animais peçonhentos) da NR-31 depende de inspeção ' +
      'em campo e não está registrada neste sistema — a ausência de apontamento não significa conformidade.',
      pageWidth - margin * 2
    ),
    margin,
    curY
  );

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
        { content: clientDocumentLine(client) }
      ],
      [
        { content: 'Médico Coordenador:', styles: { fontStyle: 'bold' } },
        { content: pcmsoPhysicianLine(organization) },
        { content: 'Grau de Risco:', styles: { fontStyle: 'bold' } },
        { content: `${riskDegreeLine(client)} - CNAE ${cnaeLine(client)}` }
      ]
    ],
    styles: { fontSize: 7.2, cellPadding: 2 }
  });

  const curY = (doc as any).lastAutoTable.finalY + 6;

  // Quadro de exames: cada campo ausente e declarado ausente. Os defaults
  // antigos (codigo 0295, periodicidade 12 meses, gatilhos e fundamentacao)
  // faziam o PDF afirmar um protocolo medico que ninguem prescreveu.
  const examRows = examProtocols.map((p: any) => {
    const ghe = ghes.find((g: any) => g.id === p.ghe_id);
    return [
      p.exam_name?.trim() || 'Exame não identificado',
      p.exam_code_table_27?.trim() || 'Cód. não informado',
      ghe?.name?.trim() || 'GHE não vinculado',
      `${p.periodicity_months ? `${p.periodicity_months} meses` : 'Periodicidade não definida'} (${p.triggers?.length ? p.triggers.join(', ') : 'gatilhos não definidos'})`,
      p.mandatory_by_standard?.trim() || 'Fundamentação não informada'
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
    // Sem protocolo cadastrado saiam tres exames de exemplo - audiometria e
    // espirometria para GHEs que talvez nem existam no cliente.
    body: examRows.length > 0 ? examRows : [
      [{
        content:
          'NENHUM PROTOCOLO DE EXAME CADASTRADO. O quadro de exames do PCMSO não pode ser emitido sem os ' +
          'exames definidos pelo médico coordenador para cada GHE, conforme o item 7.5 da NR-07. Cadastre ' +
          'os protocolos antes de entregar este documento.',
        colSpan: 5,
        styles: { textColor: [180, 83, 9], fontStyle: 'bold' }
      }]
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
        { content: clientDocumentLine(client) }
      ],
      [
        { content: 'Responsável Técnico:', styles: { fontStyle: 'bold' } },
        { content: technicalResponsibleLine(organization) },
        { content: 'Enquadramento Geral:', styles: { fontStyle: 'bold' } },
        { content: 'Decreto 3.048/99 Anexo IV / Tabela 24 eSocial' }
      ]
    ],
    styles: { fontSize: 7.2, cellPadding: 2 }
  });

  const curY = (doc as any).lastAutoTable.finalY + 6;

  // O codigo GFIP define 15, 20 ou 25 anos de aposentadoria especial. O default
  // '04' (25 anos) fazia o laudo afirmar um enquadramento previdenciario que
  // ninguem tinha classificado - e esse numero vai para o eSocial S-2240.
  const ltcatRows: any[] = [];
  ghes.forEach((ghe: any) => {
    const gheRisks = risks.filter((r: any) => r.ghe_id === ghe.id && r.status !== 'INACTIVE');
    gheRisks.forEach((r: any) => {
      const aposentadoria = r.special_retirement_applies
        ? (r.gfip_code
            ? `SIM — Código GFIP ${r.gfip_code}`
            : 'SIM, MAS CÓDIGO GFIP NÃO CLASSIFICADO — enquadramento incompleto')
        : 'NÃO ENSEJA APOSENTADORIA ESPECIAL';
      ltcatRows.push([
        ghe.code?.trim() || 'SEM CÓDIGO',
        ghe.name?.trim() || 'GHE sem identificação',
        `${r.agent_name || 'Agente não identificado'} (${r.risk_code_table_24?.trim() ? `Tab.24: ${r.risk_code_table_24}` : 'Tab.24 não informada'})`,
        r.measured_value ? `${r.measured_value} ${r.measurement_unit || ''}`.trim() : 'Sem medição registrada (avaliação qualitativa)',
        aposentadoria,
        r.epi_required
          ? (r.epis?.some((e: any) => e?.is_effective) ? 'EPI com CA declarado eficaz' : 'EPI exigido, eficácia não confirmada')
          : 'EPI não exigido para este agente'
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
      [{
        content:
          'INVENTÁRIO DE RISCOS VAZIO. Não há agente nocivo registrado para este estabelecimento. ' +
          'Este LTCAT não conclui pela existência nem pela inexistência de exposição a agentes nocivos e ' +
          'não deve embasar o evento S-2240 do eSocial nem o preenchimento de PPP.',
        colSpan: 6,
        styles: { textColor: [180, 83, 9], fontStyle: 'bold' }
      }]
    ],
    styles: { fontSize: 6.8, cellPadding: 2 },
    headStyles: { fillColor: [126, 34, 206], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  applyPageNumbers(doc);
  doc.save(`ltcat-inss-${(client.trade_name || client.legal_name || 'empresa').replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

/**
 * Blocos finais comuns aos dois laudos periciais: pendencias e conclusao.
 *
 * A conclusao nunca e montada aqui - ela chega pronta de `montarCorpoLaudo*`,
 * que so afirma o que o inventario sustenta. Esta funcao apenas desenha.
 */
function renderBlocosPericiais(
  doc: jsPDF,
  corpo: CorpoLaudo,
  opts: { margin: number; startY: number; tituloConclusao: string; corTitulo: [number, number, number] }
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const larguraUtil = pageWidth - opts.margin * 2;
  let curY = opts.startY;

  const quebrarSePreciso = (alturaNecessaria: number) => {
    if (curY + alturaNecessaria > pageHeight - 20) {
      doc.addPage();
      curY = 20;
    }
  };

  const escreverParagrafo = (texto: string, tamanho: number, estilo: 'normal' | 'bold' | 'italic') => {
    doc.setFont('helvetica', estilo);
    doc.setFontSize(tamanho);
    const linhas = doc.splitTextToSize(texto, larguraUtil);
    for (const linha of linhas) {
      quebrarSePreciso(5);
      doc.text(linha, opts.margin, curY);
      curY += tamanho * 0.5 + 0.7;
    }
    curY += 1.5;
  };

  if (corpo.pendencias.length > 0) {
    quebrarSePreciso(16);
    doc.setTextColor(180, 83, 9);
    escreverParagrafo('PENDÊNCIAS E LIMITAÇÕES DESTA AVALIAÇÃO', 8.5, 'bold');
    doc.setTextColor(120, 53, 15);
    corpo.pendencias.forEach(p => escreverParagrafo(`• ${p}`, 7.5, 'normal'));
    curY += 2;
  }

  quebrarSePreciso(16);
  doc.setTextColor(opts.corTitulo[0], opts.corTitulo[1], opts.corTitulo[2]);
  escreverParagrafo(opts.tituloConclusao, 9, 'bold');
  doc.setTextColor(15, 23, 42);
  corpo.conclusao.forEach(p => escreverParagrafo(p, 8, 'normal'));

  return curY;
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
        { content: clientDocumentLine(client) }
      ],
      [
        { content: 'Perito Responsável:', styles: { fontStyle: 'bold' } },
        { content: technicalResponsibleLine(organization) },
        { content: 'Amparo Legal:', styles: { fontStyle: 'bold' } },
        { content: 'Artigos 189 a 192 da CLT e NR-15 do Ministério do Trabalho' }
      ]
    ],
    styles: { fontSize: 7.2, cellPadding: 2 }
  });

  const curY = (doc as any).lastAutoTable.finalY + 6;

  // Corpo do laudo montado sobre o inventario real do cliente. Antes eram tres
  // linhas escritas no codigo - inclusive uma que concluia "INSALUBRE GRAU
  // MAXIMO (40%)" para toda e qualquer empresa que gerasse este PDF.
  const corpo = montarCorpoInsalubridade(risks, ghes);

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '2. ENQUADRAMENTO POR ANEXO DA NR-15 A PARTIR DO INVENTÁRIO DE RISCOS REGISTRADO', colSpan: 5, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ], [
      'GHE / Posto', 'Agente avaliado', 'Anexo NR-15 registrado', 'Avaliação / Limite de tolerância', 'Conclusão / Adicional'
    ]],
    body: corpo.linhas.length > 0 ? corpo.linhas : [
      [{
        content:
          'INVENTÁRIO DE RISCOS VAZIO — nenhum agente foi periciado. Veja a conclusão abaixo.',
        colSpan: 5,
        styles: { textColor: [180, 83, 9], fontStyle: 'bold' }
      }]
    ],
    styles: { fontSize: 6.8, cellPadding: 2.2, overflow: 'linebreak' },
    headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 28 }, 2: { cellWidth: 32 }, 3: { cellWidth: 38 } }
  });

  renderBlocosPericiais(doc, corpo, {
    margin,
    startY: (doc as any).lastAutoTable.finalY + 8,
    tituloConclusao: '3. CONCLUSÃO PERICIAL',
    corTitulo: [180, 83, 9]
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
  // O cabecalho anunciava "ADICIONAL DE 30% CLT" em todas as paginas, antes de
  // qualquer analise. O titulo do documento nao pode antecipar a conclusao.
  doc.text(`ART. 193 DA CLT`, pageWidth - margin, 12, { align: 'right' });
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
        { content: clientDocumentLine(client) }
      ],
      [
        { content: 'Perito Responsável:', styles: { fontStyle: 'bold' } },
        { content: technicalResponsibleLine(organization) },
        { content: 'Amparo Legal:', styles: { fontStyle: 'bold' } },
        { content: 'Artigo 193 da CLT e Anexos 1 a 5 da NR-16' }
      ]
    ],
    styles: { fontSize: 7.2, cellPadding: 2 }
  });

  const curY = (doc as any).lastAutoTable.finalY + 6;

  // Aqui estava o pior caso do arquivo: tres linhas fixas que concluiam
  // "PERICULOSO (Gera Adicional de 30% sobre o salario-base)" para qualquer
  // empresa - uma clinica de fisioterapia recebia a mesma cabine primaria e o
  // mesmo tanque de inflamaveis de uma subestacao. Agora o corpo vem do
  // inventario de riscos do proprio cliente.
  const corpo = montarCorpoPericulosidade(risks, ghes);

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: '2. CONFRONTO DO INVENTÁRIO DE RISCOS REGISTRADO COM OS ANEXOS DA NR-16', colSpan: 5, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ], [
      'GHE / Posto', 'Agente / Operação', 'Anexo NR-16 registrado', 'Fonte geradora / Local', 'Conclusão'
    ]],
    body: corpo.linhas.length > 0 ? corpo.linhas : [
      [{
        content:
          'INVENTÁRIO DE RISCOS VAZIO — nenhuma atividade ou operação foi periciada. Veja a conclusão abaixo.',
        colSpan: 5,
        styles: { textColor: [180, 83, 9], fontStyle: 'bold' }
      }]
    ],
    styles: { fontSize: 6.8, cellPadding: 2.2, overflow: 'linebreak' },
    headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 28 }, 2: { cellWidth: 34 }, 3: { cellWidth: 32 } }
  });

  let laudoY = (doc as any).lastAutoTable.finalY + 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const refLinhas = doc.splitTextToSize(ANEXOS_NR16, pageWidth - margin * 2);
  for (const linha of refLinhas) {
    doc.text(linha, margin, laudoY);
    laudoY += 3.2;
  }

  renderBlocosPericiais(doc, corpo, {
    margin,
    startY: laudoY + 5,
    tituloConclusao: '3. CONCLUSÃO PERICIAL',
    corTitulo: [185, 28, 28]
  });

  applyPageNumbers(doc);
  doc.save(`laudo-periculosidade-nr16-${(client.trade_name || client.legal_name || 'empresa').replace(/\s+/g, '_').toLowerCase()}.pdf`);
}



/**
 * Exporta o contrato em PDF, com a minuta gravada no proprio contrato.
 *
 * O botao "Download" era um alert. Este exportador fecha o fluxo: proposta
 * aceita -> contrato gerado -> documento para enviar ao cliente.
 *
 * O texto impresso e SEMPRE `contract.terms`, o mesmo que esta na tela. Se
 * fosse remontado aqui, o PDF poderia divergir do que foi revisado e aprovado -
 * e o documento assinado tem que ser o documento lido.
 */
export function exportContractPdf({
  contract,
  client,
  organization,
  proposal
}: {
  contract: Contract;
  client?: Client | null;
  organization: Organization;
  proposal?: Proposal | null;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const larguraUtil = pageWidth - margin * 2;

  const assinado = contract.status === 'ACTIVE' || contract.status === 'SIGNED';
  const nomeCliente = client?.legal_name || client?.trade_name || 'Contratante';

  // ----- Cabecalho -----
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name || organization.legal_name || 'PREVSAFE SST', margin, 12);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SST', margin, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(contract.contract_number, pageWidth - margin, 12, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(assinado ? 'ASSINADO' : 'AGUARDANDO ASSINATURA', pageWidth - margin, 18, { align: 'right' });
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 28, pageWidth, 2, 'F');

  // ----- Identificacao -----
  autoTable(doc, {
    startY: 36,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      { content: 'IDENTIFICAÇÃO DAS PARTES E DO INSTRUMENTO', colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
    ]],
    body: [
      [
        { content: 'CONTRATADA:', styles: { fontStyle: 'bold', cellWidth: 28 } },
        { content: organization.legal_name || organization.name || '-' },
        { content: 'CNPJ:', styles: { fontStyle: 'bold', cellWidth: 20 } },
        { content: organization.document_number || '-' }
      ],
      [
        { content: 'CONTRATANTE:', styles: { fontStyle: 'bold' } },
        { content: nomeCliente },
        { content: 'CNPJ:', styles: { fontStyle: 'bold' } },
        { content: client?.document_number || '-' }
      ],
      [
        { content: 'CNAE / Grau:', styles: { fontStyle: 'bold' } },
        {
          // Sem inventar: cliente sem CNAE ou sem grau aparece como pendente, e
          // nao com um valor plausivel que ninguem conferiu.
          content: `${client?.main_cnae || 'CNAE não informado'} — ${
            client?.risk_degree ? `Grau de Risco ${client.risk_degree} (NR-04)` : 'grau de risco não classificado'
          }`
        },
        { content: 'Vigência:', styles: { fontStyle: 'bold' } },
        { content: `${formatDate(contract.start_date)} a ${formatDate(contract.end_date)}` }
      ],
      [
        { content: 'Objeto:', styles: { fontStyle: 'bold' } },
        { content: contract.title || '-' },
        { content: 'Valor:', styles: { fontStyle: 'bold' } },
        { content: formatCurrency(contract.total_value || 0) }
      ],
      [
        { content: 'Proposta:', styles: { fontStyle: 'bold' } },
        { content: proposal ? `${proposal.proposal_number} — aceita em ${proposal.approved_at ? formatDate(proposal.approved_at) : 'data não registrada'}` : 'Contrato sem proposta vinculada' },
        { content: 'Resp. Técnico:', styles: { fontStyle: 'bold' } },
        { content: technicalResponsibleLine(organization) }
      ]
    ],
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: { 1: { cellWidth: 62 }, 3: { cellWidth: 'auto' } }
  });

  let curY = (doc as any).lastAutoTable.finalY + 6;

  // ----- Servicos contratados -----
  const itens = proposal?.items || [];
  if (itens.length > 0) {
    autoTable(doc, {
      startY: curY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [[
        { content: 'SERVIÇOS CONTRATADOS', colSpan: 4, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 } }
      ], ['Serviço', 'Qtd.', 'Valor unitário', 'Total']],
      body: itens.map(it => [
        it.service_name || '-',
        String(it.quantity ?? 1),
        formatCurrency(it.unit_price || 0),
        formatCurrency(it.total || 0)
      ]),
      foot: [['', '', 'TOTAL', formatCurrency(contract.total_value || 0)]],
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'center', cellWidth: 14 }, 2: { halign: 'right', cellWidth: 30 }, 3: { halign: 'right', cellWidth: 30 } }
    });
    curY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ----- Minuta -----
  const minuta = (contract.terms || '').trim();

  doc.addPage();
  curY = 20;

  if (!minuta) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(180, 83, 9);
    doc.text(
      doc.splitTextToSize(
        'Este contrato nao possui cláusulas registradas. Abra o contrato no sistema, ' +
        'clique em Editar e gere a minuta padrão antes de enviar para assinatura.',
        larguraUtil
      ),
      margin,
      curY
    );
    curY += 16;
  } else {
    doc.setTextColor(15, 23, 42);

    for (const linha of minuta.split('\n')) {
      const texto = linha.trimEnd();

      // Titulo do contrato e cabecalhos de clausula em negrito, com respiro.
      const ehTitulo = /^CONTRATO DE /.test(texto);
      const ehClausula = /^CLÁUSULA /.test(texto);
      const ehRodape = /^MINUTA PADRÃO/.test(texto);

      if (texto === '---') {
        curY += 2;
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, curY, pageWidth - margin, curY);
        curY += 4;
        continue;
      }

      if (texto === '') {
        curY += 3;
        continue;
      }

      if (ehTitulo) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
      } else if (ehClausula) {
        // Titulo de clausula sozinho no pe da pagina fica orfao do proprio
        // texto. Exige espaco para o titulo e pelo menos tres linhas de corpo.
        if (curY > pageHeight - 45) {
          doc.addPage();
          curY = 20;
        }
        curY += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
      } else if (ehRodape) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      const pedacos = doc.splitTextToSize(texto, larguraUtil);
      const alturaLinha = ehTitulo ? 6 : 4.4;

      for (const pedaco of pedacos) {
        // Quebra de pagina antes de escrever, nunca depois: escrever primeiro
        // deixaria a ultima linha fora da area util.
        if (curY > pageHeight - 24) {
          doc.addPage();
          curY = 20;
        }
        doc.text(pedaco, margin, curY);
        curY += alturaLinha;
      }

      if (ehTitulo || ehClausula) curY += 1;
      doc.setTextColor(15, 23, 42);
    }
  }

  // ----- Assinaturas -----
  if (curY > pageHeight - 70) {
    doc.addPage();
    curY = 20;
  } else {
    curY += 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('ASSINATURAS', margin, curY);
  curY += 6;

  const assinaturas = contract.signatures || [];

  if (assinado && assinaturas.length > 0) {
    autoTable(doc, {
      startY: curY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      // Dois hashes, identificados separadamente: o do contrato (o que estava
      // escrito no momento da assinatura) e o da assinatura (quem assinou,
      // quando e sobre qual documento). Eram a mesma coluna generica antes.
      head: [['Signatário', 'Documento', 'Data e hora', 'SHA-256 do contrato assinado', 'SHA-256 da assinatura']],
      body: assinaturas.map(a => [
        `${a.signer_name || '-'}\n${a.signer_email || ''}`,
        a.signer_document || '-',
        a.signed_at ? formatDateTimeBR(a.signed_at) : '-',
        formatHashParaImpressao(a.document_hash),
        formatHashParaImpressao(a.signature_hash)
      ]),
      styles: { fontSize: 6, cellPadding: 1.8, overflow: 'linebreak' },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 21 },
        2: { cellWidth: 21 },
        3: { cellWidth: 45, font: 'courier' },
        4: { cellWidth: 45, font: 'courier' }
      }
    });
    curY = (doc as any).lastAutoTable.finalY + 5;

    // O texto antigo invocava a MP 2.200-2/2001 e dizia que "a integridade do
    // documento e verificavel pelo hash acima" - naquele momento o hash era
    // Math.random(). O hash agora e SHA-256 de verdade, e a declaracao vem de
    // lib/documentoHash.ts, que descreve exatamente o que ele prova: assinatura
    // eletronica simples, sem ICP-Brasil e sem carimbo do tempo.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const declaracao = doc.splitTextToSize(DECLARACAO_DE_INTEGRIDADE, larguraUtil);
    for (const linha of declaracao) {
      if (curY > pageHeight - 18) {
        doc.addPage();
        curY = 20;
      }
      doc.text(linha, margin, curY);
      curY += 3.4;
    }
  } else {
    // Contrato ainda nao assinado: linhas para assinatura fisica, sem simular
    // uma assinatura eletronica que nao existe.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Documento ainda não assinado no sistema.', margin, curY);
    curY += 14;

    const larguraLinha = (larguraUtil - 10) / 2;
    doc.setDrawColor(100, 116, 139);
    doc.line(margin, curY, margin + larguraLinha, curY);
    doc.line(margin + larguraLinha + 10, curY, pageWidth - margin, curY);
    curY += 4;

    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(organization.legal_name || organization.name || 'CONTRATADA', margin, curY);
    doc.text(nomeCliente, margin + larguraLinha + 10, curY);
    curY += 3.5;
    doc.setTextColor(100, 116, 139);
    doc.text('CONTRATADA', margin, curY);
    doc.text('CONTRATANTE', margin + larguraLinha + 10, curY);
  }

  applyPageNumbers(doc);

  const nomeArquivo = `contrato-${contract.contract_number}-${(client?.trade_name || client?.legal_name || 'cliente')
    .replace(/\s+/g, '_')
    .toLowerCase()}.pdf`;
  doc.save(nomeArquivo);
}

/**
 * Hash em blocos de 16 caracteres, uma linha por bloco.
 *
 * Sessenta e quatro caracteres sem espaco nao quebram em celula de tabela: o
 * jsPDF-autotable trata como uma palavra so e estoura a largura da pagina. Em
 * blocos, cabe e ainda fica conferivel a olho contra a tela do /validar.
 */
function formatHashParaImpressao(hash?: string): string {
  const limpo = (hash || '').trim();
  if (!limpo) return 'não registrado';
  return (limpo.match(/.{1,16}/g) || [limpo]).join('\n');
}

/** Data e hora no formato brasileiro, para o quadro de assinaturas. */
function formatDateTimeBR(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}
