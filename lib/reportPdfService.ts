import { jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { 
  ServiceOrder, 
  ESocialEvent, 
  Client, 
  Organization, 
  UserProfile,
  Employee,
  SSTEnvironmentalRisk,
  SSTGroupHomogeneousExposure,
  SSTHierarchySector,
  SSTExamProtocol,
  EPIDeliveryRecord,
  EPICatalogItem,
  FinancialTransaction,
  SSTCATRecord,
  SSTWorkAbsence,
  SSTIntegrationTraining,
  Proposal,
  Contract
} from '@/types';
import { formatDate } from '@/lib/utils';

// Helper to format currency
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

/**
 * Standard Header & Footer for PrevSafe SST Reports
 */
function applyReportHeaderAndFooter(
  doc: jsPDF,
  title: string,
  subtitle: string,
  organization: Organization,
  filterSummary?: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const orgName = organization?.name || 'PrevSafe Gestão em SST';
  const orgCnpj = organization?.document_number || '12.345.678/0001-90';

  // Primary top bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent line
  doc.setFillColor(13, 148, 136); // teal-600
  doc.rect(0, 28, pageWidth, 3, 'F');

  // Top Organization Branding
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(orgName.toUpperCase(), 14, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`CNPJ: ${orgCnpj} | Sistema Integrado de Saúde e Segurança do Trabalho`, 14, 18);
  doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, 18, { align: 'right' });

  // Title Section
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 38);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(subtitle, 14, 43);

  if (filterSummary) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Filtros: ${filterSummary}`, 14, 48);
  }
}

/**
 * Universal Page Numbering and Legal Hash
 */
function finalizeReportPages(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const hash = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.text(`PrevSafe SST - Relatório Técnico Operacional e Gerencial | Autenticidade: ${hash}`, 14, pageHeight - 7);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
}

/**
 * Generic Table Exporter for Custom Filtered Views to PDF
 */
export function exportCustomReportPdf({
  title,
  subtitle,
  filterSummary,
  headers,
  rows,
  kpis = [],
  organization,
  orientation = 'portrait',
  fileName = 'relatorio_personalizado_sst'
}: {
  title: string;
  subtitle: string;
  filterSummary?: string;
  headers: string[];
  rows: (string | number)[][];
  kpis?: Array<{ label: string; value: string | number; color?: string }>;
  organization: Organization;
  orientation?: 'portrait' | 'landscape';
  fileName?: string;
}) {
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  applyReportHeaderAndFooter(doc, title, subtitle, organization, filterSummary, orientation);
  const pageWidth = doc.internal.pageSize.getWidth();

  let startY = filterSummary ? 52 : 47;

  // Render KPI boxes if available
  if (kpis.length > 0) {
    const boxWidth = (pageWidth - 28 - (kpis.length - 1) * 3) / kpis.length;
    kpis.forEach((kpi, idx) => {
      const x = 14 + idx * (boxWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, startY, boxWidth, 12, 1.5, 1.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, startY, boxWidth, 12, 1.5, 1.5, 'D');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, x + 3, startY + 4.5);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(kpi.value), x + 3, startY + 9.5);
    });
    startY += 16;
  }

  // Render autoTable
  autoTable(doc, {
    startY,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14, bottom: 18 }
  });

  finalizeReportPages(doc);
  const sanitized = fileName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  doc.save(`${sanitized}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Service Orders Report to PDF (Landscape)
 */
export function exportServiceOrdersPdf({
  serviceOrders,
  clients,
  profiles = [],
  organization,
  filterSummary
}: {
  serviceOrders: ServiceOrder[];
  clients: Client[];
  profiles?: UserProfile[];
  organization: Organization;
  filterSummary?: string;
}) {
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const profileMap = new Map(profiles.map(p => [p.id, p]));

  const total = serviceOrders.length;
  const inProgress = serviceOrders.filter(o => o.status === 'IN_PROGRESS' || o.status === 'READY' || o.status === 'SCHEDULED').length;
  const completed = serviceOrders.filter(o => o.status === 'COMPLETED' || o.status === 'ACCEPTED').length;
  const delayed = serviceOrders.filter(o => (o.status !== 'COMPLETED' && o.status !== 'CANCELLED') && new Date(o.due_date) < new Date()).length;

  const headers = [
    'O.S. / Código',
    'Cliente / Empresa',
    'Serviço / Atividade',
    'Prioridade',
    'Status Atual',
    'Prazo SLA',
    'Responsável Técnico',
    'Progresso'
  ];

  const rows = serviceOrders.map((os) => {
    const client = clientMap.get(os.client_id);
    const tech = os.technical_responsible_id ? profileMap.get(os.technical_responsible_id) : undefined;
    const stagesTotal = os.stages?.length || 0;
    const stagesDone = os.stages?.filter(s => s.status === 'COMPLETED').length || 0;
    const pct = stagesTotal > 0 ? `${Math.round((stagesDone / stagesTotal) * 100)}%` : '0%';

    const clientName = client ? (client.trade_name || client.legal_name) : 'N/A';
    return [
      os.os_number || os.id.substring(0, 8),
      clientName.length > 22 ? clientName.substring(0, 20) + '...' : clientName,
      os.title.length > 30 ? os.title.substring(0, 28) + '...' : os.title,
      os.priority,
      os.status,
      os.due_date ? formatDate(os.due_date) : '-',
      tech ? tech.full_name.split(' ')[0] : (os.technical_responsible_name?.split(' ')[0] || '-'),
      `${stagesDone}/${stagesTotal} (${pct})`
    ];
  });

  exportCustomReportPdf({
    title: 'Relatório Executivo de Ordens de Serviço (SST)',
    subtitle: 'Consolidado operacional de execuções de campo, conformidade com SLA e entregas técnicas',
    filterSummary,
    headers,
    rows,
    kpis: [
      { label: 'Total de O.S.', value: total },
      { label: 'Em Execução', value: inProgress },
      { label: 'Concluídas', value: completed },
      { label: 'Fora do SLA', value: delayed }
    ],
    organization,
    orientation: 'landscape',
    fileName: 'relatorio_ordens_servico_sst'
  });
}

/**
 * Risks & PGR Inventory to PDF (Landscape)
 */
export function exportRisksPgrPdf({
  risks,
  ghes,
  clients,
  organization,
  filterSummary
}: {
  risks: SSTEnvironmentalRisk[];
  ghes: SSTGroupHomogeneousExposure[];
  clients: Client[];
  organization: Organization;
  filterSummary?: string;
}) {
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const gheMap = new Map(ghes.map(g => [g.id, g]));

  const headers = [
    'Empresa',
    'GHE / Posto',
    'Grupo do Risco',
    'Agente Nocivo',
    'Fonte Geradora',
    'Intensidade',
    'Severidade / Prob.',
    'Matriz PGR',
    'Insalubre / Periculoso'
  ];

  const rows = risks.map((r) => {
    const ghe = r.ghe_id ? gheMap.get(r.ghe_id) : undefined;
    const client = ghe ? clientMap.get(ghe.client_id) : (r.client_id ? clientMap.get(r.client_id) : undefined);

    const clientName = client ? (client.trade_name || client.legal_name) : 'N/A';
    return [
      clientName.length > 18 ? clientName.substring(0, 16) + '..' : clientName,
      ghe ? (ghe.name.length > 18 ? ghe.name.substring(0, 16) + '..' : ghe.name) : 'Geral',
      r.risk_category || (r as any).category,
      r.agent_name || (r as any).description,
      r.generating_source || 'Processo',
      r.measured_value ? `${r.measured_value} ${r.measurement_unit || ''}` : ((r as any).intensity_level ? `${(r as any).intensity_level} ${r.measurement_unit || ''}` : 'Qualitativo'),
      `S${r.severity || (r as any).severity_level || 3} / P${r.probability || (r as any).probability_level || 3}`,
      r.risk_level || (r as any).risk_matrix_level || 'MÉDIO',
      r.insalubridade_applies ? 'INSALUBRE (NR-15)' : (r.periculosidade_applies ? 'PERICULOSO (NR-16)' : 'NÃO ENQUADRADO')
    ];
  });

  exportCustomReportPdf({
    title: 'Inventário Geral de Riscos Ocupacionais (NR-01 / PGR)',
    subtitle: 'Mapeamento de perigos, fatores de risco, matriz de probabilidade x severidade e adicionais legais',
    filterSummary,
    headers,
    rows,
    kpis: [
      { label: 'Total de Riscos', value: risks.length },
      { label: 'Físicos / Químicos', value: risks.filter(r => (r.risk_category === 'FÍSICO' || r.risk_category === 'QUÍMICO' || (r as any).category === 'PHYSICAL' || (r as any).category === 'CHEMICAL')).length },
      { label: 'Biológicos / Ergonômicos', value: risks.filter(r => (r.risk_category === 'BIOLÓGICO' || r.risk_category === 'ERGONÔMICO' || (r as any).category === 'BIOLOGICAL' || (r as any).category === 'ERGONOMIC')).length },
      { label: 'Insalubres / Periculosos', value: risks.filter(r => r.insalubridade_applies || r.periculosidade_applies).length }
    ],
    organization,
    orientation: 'landscape',
    fileName: 'inventario_riscos_pgr_sst'
  });
}

/**
 * Occupational Health & ASOs to PDF (Landscape)
 */
export function exportAsosHealthPdf({
  employees,
  clients,
  organization,
  filterSummary
}: {
  employees: Employee[];
  clients: Client[];
  organization: Organization;
  filterSummary?: string;
}) {
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const today = new Date();

  const headers = [
    'Matrícula',
    'Colaborador',
    'CPF',
    'Empresa',
    'Cargo',
    'Tipo ASO',
    'Data Exame',
    'Validade',
    'Situação',
    'Aptidão',
    'eSocial S-2220'
  ];

  const rows: (string | number)[][] = [];

  employees.forEach((emp) => {
    const client = clientMap.get(emp.client_id);
    const asos = emp.aso_history || (emp as any).asos || [];

      const clientName = client ? (client.trade_name || client.legal_name) : 'N/A';
      if (asos.length === 0) {
        rows.push([
          emp.registration_number || emp.id.substring(0, 6),
          emp.name,
          emp.cpf,
          clientName.substring(0, 16),
          emp.job_title || 'N/A',
          'Sem ASO',
          '-',
          'Pendente',
          'CRÍTICO - SEM ASO',
          'PENDENTE',
          'NÃO'
        ]);
      } else {
        asos.forEach((aso) => {
          let situation = 'VIGENTE';
          if (aso.valid_until) {
            const diffDays = Math.round((new Date(aso.valid_until).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) situation = `VENCIDO (${Math.abs(diffDays)}d)`;
            else if (diffDays <= 30) situation = `A VENCER (${diffDays}d)`;
          }

          rows.push([
            emp.registration_number || emp.id.substring(0, 6),
            emp.name,
            emp.cpf,
            clientName.substring(0, 16),
            emp.job_title || 'N/A',
            aso.aso_type || (aso as any).exam_type || 'Periódico',
            aso.exam_date ? formatDate(aso.exam_date) : '-',
            aso.valid_until ? formatDate(aso.valid_until) : '-',
            situation,
            aso.result || (aso as any).aptitude || 'APTO',
            (aso.esocial_event_id || (aso as any).esocial_transmitted) ? 'TRANSMITIDO' : 'PENDENTE'
          ]);
      });
    }
  });

  exportCustomReportPdf({
    title: 'Relatório de Saúde Ocupacional & Vencimentos de ASOs (NR-07)',
    subtitle: 'Painel de controle médico do PCMSO, monitoramento de exames periódicos e conformidade S-2220',
    filterSummary,
    headers,
    rows,
    kpis: [
      { label: 'Total de Funcionários', value: employees.length },
      { label: 'Total de ASOs Listados', value: rows.length },
      { label: 'ASOs Vencidos/A Vencer', value: rows.filter(r => String(r[8]).includes('VENCIDO') || String(r[8]).includes('A VENCER')).length },
      { label: 'Transmitidos ao eSocial', value: rows.filter(r => r[10] === 'TRANSMITIDO').length }
    ],
    organization,
    orientation: 'landscape',
    fileName: 'relatorio_saude_ocupacional_pcmso'
  });
}

/**
 * eSocial SST Events Compliance to PDF (Landscape)
 */
export function exportESocialEventsPdf({
  events,
  clients,
  organization,
  filterSummary
}: {
  events: ESocialEvent[];
  clients: Client[];
  organization: Organization;
  filterSummary?: string;
}) {
  const clientMap = new Map(clients.map(c => [c.id, c]));

  const headers = [
    'ID Evento',
    'Evento',
    'Descrição SST',
    'Empresa',
    'Status Transmissão',
    'Data Criação',
    'Data Envio',
    'Recibo de Entrega Gov',
    'Ambiente'
  ];

  const rows = events.map((ev) => {
    const client = clientMap.get(ev.client_id);
    const clientName = client ? (client.trade_name || client.legal_name) : 'N/A';
    return [
      ev.id.substring(0, 8),
      ev.event_type,
      ev.event_type === 'S-2210' ? 'CAT - Acidente' : ev.event_type === 'S-2220' ? 'ASO - Saúde' : ev.event_type === 'S-2240' ? 'Riscos Ambientais' : 'S-3000 Exclusão',
      clientName.substring(0, 20),
      ev.status,
      ev.created_at ? formatDate(ev.created_at) : '-',
      ev.transmitted_at ? formatDate(ev.transmitted_at) : 'Pendente',
      ev.receipt_number || 'Aguardando envio',
      ev.environment === 'PRODUCAO' ? 'Produção' : 'Homologação'
    ];
  });

  exportCustomReportPdf({
    title: 'Relatório Geral de Transmissões e Conformidade eSocial SST',
    subtitle: 'Eventos S-2210 (CAT), S-2220 (Monitoramento da Saúde) e S-2240 (Condições Ambientais)',
    filterSummary,
    headers,
    rows,
    kpis: [
      { label: 'Total de Eventos', value: events.length },
      { label: 'Aceitos com Recibo', value: events.filter(e => e.status === 'SUCCESS' || (e.status as string) === 'TRANSMITTED' || (e.status as string) === 'ACCEPTED').length },
      { label: 'Pendentes de Envio', value: events.filter(e => e.status === 'DRAFT' || e.status === 'VALIDATED' || e.status === 'READY_TO_SEND' || e.status === 'PROCESSING' || (e.status as string) === 'PENDING').length },
      { label: 'Erros / Rejeitados', value: events.filter(e => e.status === 'REJECTED' || (e.status as string) === 'ERROR').length }
    ],
    organization,
    orientation: 'landscape',
    fileName: 'relatorio_eventos_esocial_sst'
  });
}

/**
 * EPI Delivery Control to PDF
 */
export function exportEpiDeliveriesPdf({
  deliveries,
  catalog,
  employees,
  clients,
  organization,
  filterSummary
}: {
  deliveries: EPIDeliveryRecord[];
  catalog: EPICatalogItem[];
  employees: Employee[];
  clients: Client[];
  organization: Organization;
  filterSummary?: string;
}) {
  const empMap = new Map(employees.map(e => [e.id, e]));
  const epiMap = new Map(catalog.map(c => [c.id, c]));

  const headers = [
    'Colaborador',
    'CPF',
    'Equipamento / EPI',
    'Nº CA',
    'Qtd',
    'Data Entrega',
    'Troca Prevista',
    'Método Assinatura',
    'Status'
  ];

  const rows = deliveries.map((d) => {
    const emp = empMap.get(d.employee_id);
    const epi = epiMap.get(d.epi_id || (d as any).epi_catalog_id);
    const isSigned = d.biometric_face_matched || !!d.signature_data_url || d.status === 'DELIVERED' || (d as any).is_signed;
    const signMethod = d.biometric_face_matched ? 'BIOMETRIA FACIAL' : (d.signature_data_url ? 'ASSINATURA DIGITAL' : (d.delivery_method || 'FÍSICO'));

    return [
      d.employee_name || (emp ? emp.name : 'N/A'),
      d.employee_cpf || (emp ? emp.cpf : 'N/A'),
      d.epi_name || (epi ? epi.name.substring(0, 24) : 'EPI'),
      d.ca_number || (epi ? epi.ca_number : '-'),
      d.quantity || 1,
      d.delivery_date ? formatDate(d.delivery_date) : '-',
      d.replacement_due_date ? formatDate(d.replacement_due_date) : ((d as any).expected_replacement_date ? formatDate((d as any).expected_replacement_date) : 'Desgaste'),
      signMethod,
      isSigned ? 'ASSINADO' : 'PENDENTE'
    ];
  });

  exportCustomReportPdf({
    title: 'Relatório de Controle de Entrega de EPIs (NR-06)',
    subtitle: 'Comprovações de fornecimento de EPI, certificados de aprovação CA e assinaturas biométricas',
    filterSummary,
    headers,
    rows,
    kpis: [
      { label: 'Total de Fichas', value: deliveries.length },
      { label: 'Assinados com Biometria', value: deliveries.filter(d => d.biometric_face_matched).length },
      { label: 'Assinaturas Digitais', value: deliveries.filter(d => !!d.signature_data_url).length },
      { label: 'Fichas Pendentes', value: deliveries.filter(d => !d.biometric_face_matched && !d.signature_data_url && d.status !== 'DELIVERED' && !(d as any).is_signed).length }
    ],
    organization,
    orientation: 'landscape',
    fileName: 'relatorio_controle_epis_nr06'
  });
}

/**
 * Financial Cash Flow & Billing to PDF
 */
export function exportFinancialPdf({
  transactions,
  clients,
  organization,
  filterSummary
}: {
  transactions: FinancialTransaction[];
  clients: Client[];
  organization: Organization;
  filterSummary?: string;
}) {
  const clientMap = new Map(clients.map(c => [c.id, c]));

  const headers = [
    'Código',
    'Tipo',
    'Descrição / Referência',
    'Cliente / Fornecedor',
    'Valor (R$)',
    'Vencimento',
    'Liquidação',
    'Forma Pagamento',
    'Status'
  ];

  const rows = transactions.map((t) => {
    const client = t.client_id ? clientMap.get(t.client_id) : undefined;
    const clientName = client ? (client.trade_name || client.legal_name) : (t.supplier_name || t.client_name || (t as any).counterparty_name || 'N/A');
    const paymentDate = t.payment_date || (t as any).paid_date;
    return [
      t.id.substring(0, 8),
      t.type === 'RECEIVABLE' ? 'RECEITA' : 'DESPESA',
      t.title.length > 25 ? t.title.substring(0, 23) + '..' : t.title,
      clientName.substring(0, 18),
      formatCurrency(t.final_amount || (t.amount - (t.discount || 0))),
      t.due_date ? formatDate(t.due_date) : '-',
      paymentDate ? formatDate(paymentDate) : 'Aberto',
      t.payment_method || 'BOLETO',
      t.status
    ];
  });

  const totalReceivable = transactions.filter(t => t.type === 'RECEIVABLE').reduce((a, t) => a + t.amount, 0);
  const totalPayable = transactions.filter(t => t.type === 'PAYABLE').reduce((a, t) => a + t.amount, 0);

  exportCustomReportPdf({
    title: 'Relatório Financeiro & Fluxo de Caixa SST',
    subtitle: 'Demonstrativo de contas a receber e pagar, faturamento por contratos e status de liquidação',
    filterSummary,
    headers,
    rows,
    kpis: [
      { label: 'Total Lançamentos', value: transactions.length },
      { label: 'Receitas Totais', value: formatCurrency(totalReceivable) },
      { label: 'Despesas Totais', value: formatCurrency(totalPayable) },
      { label: 'Saldo Projetado', value: formatCurrency(totalReceivable - totalPayable) }
    ],
    organization,
    orientation: 'landscape',
    fileName: 'relatorio_financeiro_fluxo_caixa'
  });
}
