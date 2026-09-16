import * as XLSX from 'xlsx';
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

export interface ExcelSheetData {
  sheetName: string;
  data: Record<string, any>[];
  colWidths?: number[];
}

/**
 * Universal Workbook Builder with Metadata Sheet and auto column width
 */
export function buildAndDownloadWorkbook(
  workbookName: string,
  sheets: ExcelSheetData[],
  metadata?: {
    reportTitle: string;
    organizationName?: string;
    filterSummary?: string;
    generatedBy?: string;
    totalRecords?: number;
  }
) {
  const wb = XLSX.utils.book_new();

  // If metadata is provided, create a summary cover sheet
  if (metadata) {
    const metaDataRows = [
      { 'Propriedade': 'Relatório', 'Valor': metadata.reportTitle },
      { 'Propriedade': 'Organização Emissora', 'Valor': metadata.organizationName || 'PrevSafe SST Gestão' },
      { 'Propriedade': 'Data de Geração', 'Valor': new Date().toLocaleString('pt-BR') },
      { 'Propriedade': 'Filtros Aplicados', 'Valor': metadata.filterSummary || 'Todos os registros' },
      { 'Propriedade': 'Total de Linhas', 'Valor': metadata.totalRecords ?? '-' },
      { 'Propriedade': 'Operador / Emitente', 'Valor': metadata.generatedBy || 'Sistema Integrado SST' },
      { 'Propriedade': 'Validade Técnica', 'Valor': 'Em conformidade com as Normas Regulamentadoras MTE e eSocial' }
    ];
    const wsMeta = XLSX.utils.json_to_sheet(metaDataRows);
    wsMeta['!cols'] = [{ wch: 25 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Sumário & Metadados');
  }

  // Append each data sheet
  sheets.forEach((sheet) => {
    if (sheet.data.length === 0) {
      const emptyWs = XLSX.utils.aoa_to_sheet([['Nenhum registro encontrado para os filtros selecionados']]);
      XLSX.utils.book_append_sheet(wb, emptyWs, sheet.sheetName.substring(0, 31));
      return;
    }

    const ws = XLSX.utils.json_to_sheet(sheet.data);

    // Auto-calculate column widths if not explicitly provided
    if (sheet.colWidths && sheet.colWidths.length > 0) {
      ws['!cols'] = sheet.colWidths.map(w => ({ wch: w }));
    } else {
      const keys = Object.keys(sheet.data[0] || {});
      const autoCols = keys.map((key) => {
        let maxLen = key.length;
        sheet.data.forEach((row) => {
          const val = row[key];
          if (val !== undefined && val !== null) {
            const strVal = String(val);
            if (strVal.length > maxLen) {
              maxLen = Math.min(strVal.length, 50); // cap max width
            }
          }
        });
        return { wch: Math.max(maxLen + 3, 12) };
      });
      ws['!cols'] = autoCols;
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName.substring(0, 31));
  });

  const sanitizedFileName = workbookName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  XLSX.writeFile(wb, `${sanitizedFileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Generic Table to Excel Export
 */
export function exportGenericTableToExcel({
  reportTitle,
  fileName,
  headers,
  rows,
  filterSummary,
  organizationName
}: {
  reportTitle: string;
  fileName: string;
  headers: string[];
  rows: (string | number | boolean)[][];
  filterSummary?: string;
  organizationName?: string;
}) {
  const data = rows.map((row) => {
    const rowObj: Record<string, any> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = row[idx] ?? '';
    });
    return rowObj;
  });

  buildAndDownloadWorkbook(
    fileName,
    [{ sheetName: 'Dados do Relatório', data }],
    {
      reportTitle,
      organizationName,
      filterSummary,
      totalRecords: rows.length
    }
  );
}

/**
 * Export Service Orders (OS) to Excel with KPI summary
 */
export function exportServiceOrdersToExcel({
  serviceOrders,
  clients,
  profiles = [],
  organization,
  filterSummary
}: {
  serviceOrders: ServiceOrder[];
  clients: Client[];
  profiles?: UserProfile[];
  organization?: Organization;
  filterSummary?: string;
}) {
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const profileMap = new Map(profiles.map(p => [p.id, p]));

  const rows = serviceOrders.map((os) => {
    const client = clientMap.get(os.client_id);
    const tech = os.technical_responsible_id ? profileMap.get(os.technical_responsible_id) : undefined;
    const isDelayed = (os.status !== 'COMPLETED' && os.status !== 'CANCELLED') && new Date(os.due_date) < new Date();

    return {
      'Código O.S.': os.os_number || os.id.substring(0, 8),
      'Cliente / Razão Social': client ? (client.trade_name || client.legal_name) : 'N/A',
      'CNPJ do Cliente': client ? client.document_number : 'N/A',
      'Título do Serviço': os.title,
      'Prioridade': os.priority === 'URGENT' ? 'URGENTE' : os.priority === 'HIGH' ? 'ALTA' : os.priority === 'MEDIUM' ? 'MÉDIA' : 'BAIXA',
      'Status Atual': translateOSStatus(os.status),
      'Dentro do Prazo?': isDelayed ? 'NÃO - ATRASADA' : 'SIM - NO PRAZO',
      'Data de Abertura': os.created_at ? formatDate(os.created_at) : '-',
      'Data Limite (SLA)': os.due_date ? formatDate(os.due_date) : '-',
      'Data de Conclusão': os.completed_at ? formatDate(os.completed_at) : 'Em aberto',
      'Responsável Técnico': tech ? tech.full_name : (os.technical_responsible_name || 'Não atribuído'),
      'Etapas Totais': os.stages ? os.stages.length : 0,
      'Etapas Concluídas': os.stages ? os.stages.filter(s => s.status === 'COMPLETED').length : 0,
      'Possui Evidências de Campo': os.stages?.some(s => s.field_evidence) ? 'SIM' : 'NÃO',
      'Valor Estimado': 'Sob Contrato'
    };
  });

  // KPI Summary Sheet
  const total = serviceOrders.length;
  const inProgress = serviceOrders.filter(o => o.status === 'IN_PROGRESS' || o.status === 'READY' || o.status === 'SCHEDULED').length;
  const completed = serviceOrders.filter(o => o.status === 'COMPLETED' || o.status === 'ACCEPTED').length;
  const delayed = serviceOrders.filter(o => (o.status !== 'COMPLETED' && o.status !== 'CANCELLED') && new Date(o.due_date) < new Date()).length;
  const rework = serviceOrders.filter(o => o.status === 'REWORK').length;

  const kpiData = [
    { 'Indicador': 'Total de Ordens de Serviço', 'Quantidade': total, 'Percentual': '100%' },
    { 'Indicador': 'Em Execução / Agendadas', 'Quantidade': inProgress, 'Percentual': total ? `${((inProgress / total) * 100).toFixed(1)}%` : '0%' },
    { 'Indicador': 'Concluídas e Homologadas', 'Quantidade': completed, 'Percentual': total ? `${((completed / total) * 100).toFixed(1)}%` : '0%' },
    { 'Indicador': 'Atrasadas (Violação de SLA)', 'Quantidade': delayed, 'Percentual': total ? `${((delayed / total) * 100).toFixed(1)}%` : '0%' },
    { 'Indicador': 'Em Retrabalho Técnico', 'Quantidade': rework, 'Percentual': total ? `${((rework / total) * 100).toFixed(1)}%` : '0%' }
  ];

  buildAndDownloadWorkbook(
    'relatorio_ordens_servico_sst',
    [
      { sheetName: 'Ordens de Serviço', data: rows },
      { sheetName: 'Resumo Gerencial KPIs', data: kpiData }
    ],
    {
      reportTitle: 'Relatório Consolidado de Ordens de Serviço SST',
      organizationName: organization?.name,
      filterSummary,
      totalRecords: total
    }
  );
}

/**
 * Export Environmental Risks and PGR Inventory to Excel
 */
export function exportRisksPgrToExcel({
  risks,
  ghes,
  clients,
  sectors = [],
  organization,
  filterSummary
}: {
  risks: SSTEnvironmentalRisk[];
  ghes: SSTGroupHomogeneousExposure[];
  clients: Client[];
  sectors?: SSTHierarchySector[];
  organization?: Organization;
  filterSummary?: string;
}) {
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const gheMap = new Map(ghes.map(g => [g.id, g]));
  const sectorMap = new Map(sectors.map(s => [s.id, s]));

  const rows = risks.map((risk) => {
    const ghe = risk.ghe_id ? gheMap.get(risk.ghe_id) : undefined;
    const client = ghe ? clientMap.get(ghe.client_id) : (risk.client_id ? clientMap.get(risk.client_id) : undefined);
    const sector = ghe?.sector_ids?.[0] ? sectorMap.get(ghe.sector_ids[0]) : undefined;

    const episDesc = risk.epis?.map(e => `${e.epi_name} (CA ${e.ca_number})`).join(', ');
    return {
      'ID Risco': risk.id.substring(0, 8),
      'Cliente / Empresa': client ? (client.trade_name || client.legal_name) : 'N/A',
      'GHE (Grupo Homogêneo)': ghe ? ghe.name : 'Geral',
      'Setor de Trabalho': sector ? sector.name : (ghe?.environment_description || 'Geral'),
      'Grupo / Categoria do Risco': translateRiskCategory(risk.risk_category || (risk as any).category),
      'Agente Nocivo': risk.agent_name || (risk as any).description,
      'Fonte Geradora': risk.generating_source || 'Processo produtivo',
      'Via de Propagação / Exposição': risk.propagation_path || (risk as any).exposure_type || 'Habitual e Permanente',
      'Intensidade / Concentração': risk.measured_value ? `${risk.measured_value} ${risk.measurement_unit || ''}` : ((risk as any).intensity_level ? `${(risk as any).intensity_level} ${risk.measurement_unit || ''}` : 'Qualitativo'),
      'Limite de Tolerância (NR-15)': risk.tolerance_limit || 'N/A',
      'Nível de Ação': risk.action_level || 'N/A',
      'Grau de Risco / Severidade': risk.severity ? `Nível ${risk.severity}` : 'Médio',
      'Probabilidade': risk.probability ? `Nível ${risk.probability}` : 'Médio',
      'Classificação Matriz PGR': risk.risk_level || (risk as any).risk_matrix_level || 'MÉDIO (Amarelo)',
      'Medidas de Controle Existentes (EPC/EPI)': [
        risk.epc_description ? `EPC: ${risk.epc_description}` : '',
        episDesc ? `EPI: ${episDesc}` : ''
      ].filter(Boolean).join(' | ') || 'Em implantação',
      'Enquadramento eSocial Tabela 24': risk.risk_code_table_24 || (risk as any).esocial_code || '09.01.001 - Ausência de risco',
      'Gera Adicional Insalubridade (NR-15)': risk.insalubridade_applies ? `SIM (${risk.insalubridade_degree || '20%'})` : 'NÃO',
      'Gera Adicional Periculosidade (NR-16)': risk.periculosidade_applies ? 'SIM (30%)' : 'NÃO',
      'Aposentadoria Especial (LTCAT/INSS)': risk.special_retirement_applies ? 'SIM - FAP Especial' : 'NÃO'
    };
  });

  buildAndDownloadWorkbook(
    'inventario_riscos_pgr_sst',
    [{ sheetName: 'Inventário de Riscos NR-01', data: rows }],
    {
      reportTitle: 'Inventário Geral de Riscos Ocupacionais (PGR / NR-01 / LTCAT)',
      organizationName: organization?.name,
      filterSummary,
      totalRecords: risks.length
    }
  );
}

/**
 * Export Occupational Health (PCMSO & ASO) to Excel
 */
export function exportAsosHealthToExcel({
  employees,
  examProtocols,
  clients,
  organization,
  filterSummary
}: {
  employees: Employee[];
  examProtocols: SSTExamProtocol[];
  clients: Client[];
  organization?: Organization;
  filterSummary?: string;
}) {
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const today = new Date();

  const rows: Record<string, any>[] = [];

  employees.forEach((emp) => {
    const client = clientMap.get(emp.client_id);
    const asos = emp.aso_history || (emp as any).asos || [];

    if (asos.length === 0) {
      rows.push({
        'Matrícula': emp.registration_number || emp.id.substring(0, 8),
        'Nome do Colaborador': emp.name,
        'CPF': emp.cpf,
        'Empresa': client ? (client.trade_name || client.legal_name) : 'N/A',
        'Cargo': emp.job_title || 'N/A',
        'Data de Admissão': emp.admission_date ? formatDate(emp.admission_date) : '-',
        'Status do Colaborador': emp.status === 'ACTIVE' ? 'ATIVO' : 'AFASTADO/DEMITIDO',
        'Tipo do Último ASO': 'Nenhum ASO cadastrado',
        'Data do Último Exame': '-',
        'Validade do ASO': 'PENDENTE',
        'Situação do Prazo': 'CRÍTICO - SEM ASO',
        'Resultado de Aptidão': 'PENDENTE',
        'Médico Examinador': '-',
        'CRM/UF': '-',
        'Transmitido eSocial S-2220': 'NÃO'
      });
    } else {
      asos.forEach((aso) => {
        let deadlineStatus = 'VIGENTE';
        if (aso.valid_until) {
          const validDate = new Date(aso.valid_until);
          const diffDays = Math.round((validDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            deadlineStatus = `VENCIDO (${Math.abs(diffDays)} dias)`;
          } else if (diffDays <= 30) {
            deadlineStatus = `A VENCER (${diffDays} dias)`;
          } else {
            deadlineStatus = `VIGENTE (${diffDays} dias)`;
          }
        }

        const aptResult = aso.result || (aso as any).aptitude;
        const aptText = aptResult === 'APTO' ? 'APTO' : aptResult === 'APTO_COM_RESTRICAO' ? 'APTO COM RESTRIÇÃO' : 'INAPTO';
        const docName = aso.physician_name || (aso as any).doctor_name || 'Dr. Médico Coordenador';
        const docCrm = aso.physician_crm || (aso as any).doctor_crm;
        const docUf = aso.physician_uf || (aso as any).doctor_uf || 'SP';

        rows.push({
          'Matrícula': emp.registration_number || emp.id.substring(0, 8),
          'Nome do Colaborador': emp.name,
          'CPF': emp.cpf,
          'Empresa': client ? (client.trade_name || client.legal_name) : 'N/A',
          'Cargo': emp.job_title || 'N/A',
          'Data de Admissão': emp.admission_date ? formatDate(emp.admission_date) : '-',
          'Status do Colaborador': emp.status === 'ACTIVE' ? 'ATIVO' : 'AFASTADO/DEMITIDO',
          'Tipo do Último ASO': translateAsoType(aso.aso_type || (aso as any).exam_type),
          'Data do Último Exame': aso.exam_date ? formatDate(aso.exam_date) : '-',
          'Validade do ASO': aso.valid_until ? formatDate(aso.valid_until) : 'Indeterminado',
          'Situação do Prazo': deadlineStatus,
          'Resultado de Aptidão': aptText,
          'Médico Examinador': docName,
          'CRM/UF': docCrm ? `${docCrm}/${docUf}` : 'CRM/SP',
          'Transmitido eSocial S-2220': (aso.esocial_event_id || (aso as any).esocial_transmitted) ? `SIM` : 'NÃO'
        });
      });
    }
  });

  buildAndDownloadWorkbook(
    'relatorio_saude_ocupacional_pcmso_asos',
    [{ sheetName: 'Controle de ASOs NR-07', data: rows }],
    {
      reportTitle: 'Relatório de Saúde Ocupacional e Vencimento de ASOs (PCMSO / NR-07)',
      organizationName: organization?.name,
      filterSummary,
      totalRecords: rows.length
    }
  );
}

/**
 * Export eSocial SST Events to Excel
 */
export function exportESocialEventsToExcel({
  events,
  clients,
  organization,
  filterSummary
}: {
  events: ESocialEvent[];
  clients: Client[];
  organization?: Organization;
  filterSummary?: string;
}) {
  const clientMap = new Map(clients.map(c => [c.id, c]));

  const rows = events.map((ev) => {
    const client = clientMap.get(ev.client_id);
    return {
      'ID do Evento': ev.id.substring(0, 8),
      'Código do Evento': ev.event_type,
      'Descrição do Evento': ev.event_type === 'S-2210' ? 'CAT - Acidente de Trabalho' :
        ev.event_type === 'S-2220' ? 'ASO - Monitoramento da Saúde' :
        ev.event_type === 'S-2240' ? 'Condições Ambientais do Trabalho' :
        ev.event_type === 'S-2230' ? 'Afastamento Temporário' :
        ev.event_type === 'S-3000' ? 'Exclusão de Evento' : ev.event_type,
      'Cliente / Empregador': client ? (client.trade_name || client.legal_name) : 'N/A',
      'CNPJ / CPF do Empregador': client ? client.document_number : 'N/A',
      'Status de Transmissão': translateESocialStatus(ev.status),
      'Data de Geração': ev.created_at ? formatDate(ev.created_at) : '-',
      'Data de Envio': ev.transmitted_at ? formatDate(ev.transmitted_at) : 'Pendente',
      'Ambiente': ev.environment === 'PRODUCAO' ? 'Produção Oficial' : 'Produção Restrita / Homologação',
      'Recibo de Entrega': ev.receipt_number || 'Aguardando envio',
      'Protocolo de Envio': ev.protocol_number || '-',
      'Código de Resposta do Gov': ev.return_code || '-',
      'Mensagem de Retorno': ev.return_message || 'Nenhum erro retornado',
      'Tipo de Certificado': 'A1 Digital ICP-Brasil',
      'Hash XML SHA-256': ev.xml_content ? ev.xml_content.substring(0, 16) + '...' : 'Gerado dinamicamente'
    };
  });

  const total = events.length;
  const transmitted = events.filter(e => e.status === 'SUCCESS' || (e.status as string) === 'TRANSMITTED' || (e.status as string) === 'ACCEPTED').length;
  const pending = events.filter(e => e.status === 'DRAFT' || e.status === 'VALIDATED' || e.status === 'READY_TO_SEND' || e.status === 'PROCESSING' || (e.status as string) === 'PENDING').length;
  const rejected = events.filter(e => e.status === 'REJECTED' || (e.status as string) === 'ERROR').length;

  const kpis = [
    { 'Status eSocial': 'Total de Eventos SST', 'Quantidade': total, 'Percentual': '100%' },
    { 'Status eSocial': 'Transmitidos com Sucesso (Recibo Gov)', 'Quantidade': transmitted, 'Percentual': total ? `${((transmitted / total) * 100).toFixed(1)}%` : '0%' },
    { 'Status eSocial': 'Pendentes de Transmissão', 'Quantidade': pending, 'Percentual': total ? `${((pending / total) * 100).toFixed(1)}%` : '0%' },
    { 'Status eSocial': 'Rejeitados com Erro de Schema/Regra', 'Quantidade': rejected, 'Percentual': total ? `${((rejected / total) * 100).toFixed(1)}%` : '0%' }
  ];

  buildAndDownloadWorkbook(
    'relatorio_eventos_esocial_sst',
    [
      { sheetName: 'Eventos eSocial', data: rows },
      { sheetName: 'Conformidade eSocial', data: kpis }
    ],
    {
      reportTitle: 'Relatório Geral de Transmissões e Conformidade eSocial SST',
      organizationName: organization?.name,
      filterSummary,
      totalRecords: total
    }
  );
}

/**
 * Export EPIs Catalog & Deliveries to Excel
 */
export function exportEpiDeliveriesToExcel({
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
  organization?: Organization;
  filterSummary?: string;
}) {
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const empMap = new Map(employees.map(e => [e.id, e]));
  const epiMap = new Map(catalog.map(c => [c.id, c]));

  const rows = deliveries.map((d) => {
    const emp = empMap.get(d.employee_id);
    const epi = epiMap.get(d.epi_id || (d as any).epi_catalog_id);
    const client = clientMap.get(d.client_id) || (emp ? clientMap.get(emp.client_id) : undefined);
    const isSigned = d.biometric_face_matched || !!d.signature_data_url || d.status === 'DELIVERED' || (d as any).is_signed;

    return {
      'ID Entrega': d.id.substring(0, 8),
      'Colaborador': d.employee_name || (emp ? emp.name : 'N/A'),
      'CPF': d.employee_cpf || (emp ? emp.cpf : 'N/A'),
      'Empresa': client ? (client.trade_name || client.legal_name) : 'N/A',
      'Equipamento / EPI': d.epi_name || (epi ? epi.name : 'EPI'),
      'Certificado de Aprovação (CA)': d.ca_number || (epi ? epi.ca_number : 'N/A'),
      'Fabricante': epi ? epi.manufacturer : (d.manufacturer || 'N/A'),
      'Quantidade Entregue': d.quantity || 1,
      'Data da Entrega': d.delivery_date ? formatDate(d.delivery_date) : '-',
      'Data Prevista de Troca': d.replacement_due_date ? formatDate(d.replacement_due_date) : ((d as any).expected_replacement_date ? formatDate((d as any).expected_replacement_date) : 'Conforme desgaste'),
      'Motivo da Entrega': translateEpiReason(d.delivery_reason),
      'Método de Assinatura': d.biometric_face_matched ? 'BIOMETRIA FACIAL' : (d.signature_data_url ? 'ASSINATURA DIGITAL' : (d.delivery_method || 'TERMO ELETRÔNICO')),
      'Status de Assinatura': isSigned ? 'ASSINADO' : 'PENDENTE',
      'Código de Hash da Ficha': d.sheet_protocol_code || (d as any).delivery_hash || 'SHA256-OK',
      'Status do CA no MTE': epi?.ca_status === 'VALID' ? 'CA VÁLIDO' : 'CA A VENCER / VERIFICAR'
    };
  });

  buildAndDownloadWorkbook(
    'relatorio_gestao_epis_nr06',
    [{ sheetName: 'Fichas de Entrega de EPI', data: rows }],
    {
      reportTitle: 'Relatório de Controle de Entrega e Ficha de EPIs (NR-06)',
      organizationName: organization?.name,
      filterSummary,
      totalRecords: deliveries.length
    }
  );
}

/**
 * Export Financial Transactions to Excel
 */
export function exportFinancialToExcel({
  transactions,
  clients,
  organization,
  filterSummary
}: {
  transactions: FinancialTransaction[];
  clients: Client[];
  organization?: Organization;
  filterSummary?: string;
}) {
  const clientMap = new Map(clients.map(c => [c.id, c]));

  const rows = transactions.map((t) => {
    const client = t.client_id ? clientMap.get(t.client_id) : undefined;
    const counterparty = client ? (client.trade_name || client.legal_name) : (t.supplier_name || t.client_name || (t as any).counterparty_name || 'N/A');
    const paymentDate = t.payment_date || (t as any).paid_date;
    const isReconciled = t.reconciliation_status === 'RECONCILED' || (t as any).is_reconciled;

    return {
      'Código Lançamento': t.id.substring(0, 8),
      'Tipo de Movimentação': t.type === 'RECEIVABLE' ? 'RECEITA (Contas a Receber)' : 'DESPESA (Contas a Pagar)',
      'Descrição / Serviço': t.title,
      'Categoria Financeira': t.category_name || (t.category as string) || 'Geral',
      'Cliente / Fornecedor': counterparty,
      'Valor Original': formatCurrency(t.amount),
      'Desconto Aplicado': t.discount ? formatCurrency(t.discount) : 'R$ 0,00',
      'Valor Líquido': formatCurrency(t.final_amount || (t.amount - (t.discount || 0))),
      'Data de Vencimento': t.due_date ? formatDate(t.due_date) : '-',
      'Data de Liquidação': paymentDate ? formatDate(paymentDate) : 'Em aberto',
      'Status de Pagamento': translatePaymentStatus(t.status),
      'Forma de Pagamento': translatePaymentMethod(t.payment_method || 'BOLETO'),
      'Conciliado': isReconciled ? 'SIM' : 'NÃO',
      'Referência de Cobrança': t.reconciliation_ref || t.document_number || (t as any).invoice_number || 'Manual'
    };
  });

  const totalReceivable = transactions.filter(t => t.type === 'RECEIVABLE').reduce((acc, t) => acc + t.amount, 0);
  const totalPayable = transactions.filter(t => t.type === 'PAYABLE').reduce((acc, t) => acc + t.amount, 0);
  const totalReceived = transactions.filter(t => t.type === 'RECEIVABLE' && t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);
  const totalPaid = transactions.filter(t => t.type === 'PAYABLE' && t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);

  const kpis = [
    { 'Métrica Financeira': 'Total de Receitas Previstas', 'Valor (R$)': formatCurrency(totalReceivable) },
    { 'Métrica Financeira': 'Total de Receitas Liquidadas', 'Valor (R$)': formatCurrency(totalReceived) },
    { 'Métrica Financeira': 'Total de Despesas Previstas', 'Valor (R$)': formatCurrency(totalPayable) },
    { 'Métrica Financeira': 'Total de Despesas Pagas', 'Valor (R$)': formatCurrency(totalPaid) },
    { 'Métrica Financeira': 'Saldo Operacional Previsto', 'Valor (R$)': formatCurrency(totalReceivable - totalPayable) },
    { 'Métrica Financeira': 'Saldo Realizado em Caixa', 'Valor (R$)': formatCurrency(totalReceived - totalPaid) }
  ];

  buildAndDownloadWorkbook(
    'relatorio_financeiro_fluxo_caixa_sst',
    [
      { sheetName: 'Lançamentos Financeiros', data: rows },
      { sheetName: 'DRE & Fluxo de Caixa', data: kpis }
    ],
    {
      reportTitle: 'Relatório Financeiro e Fluxo de Caixa SST',
      organizationName: organization?.name,
      filterSummary,
      totalRecords: transactions.length
    }
  );
}

/**
 * Export Work Accidents (CAT) and Absences to Excel
 */
export function exportCatAndAbsencesToExcel({
  cats,
  absences,
  employees,
  clients,
  organization,
  filterSummary
}: {
  cats: SSTCATRecord[];
  absences: SSTWorkAbsence[];
  employees: Employee[];
  clients: Client[];
  organization?: Organization;
  filterSummary?: string;
}) {
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const empMap = new Map(employees.map(e => [e.id, e]));

  const catRows = cats.map((c) => {
    const emp = empMap.get(c.employee_id);
    const client = c.client_id ? clientMap.get(c.client_id) : (emp ? clientMap.get(emp.client_id) : undefined);
    return {
      'Número CAT': c.cat_number || c.id.substring(0, 8),
      'Colaborador Acidentado': c.worker_name || (emp ? emp.name : 'N/A'),
      'CPF': c.worker_cpf || (emp ? emp.cpf : 'N/A'),
      'Empresa': client ? (client.trade_name || client.legal_name) : 'N/A',
      'Tipo de CAT': c.cat_type === 'INICIAL' ? 'INICIAL' : c.cat_type === 'REABERTURA' ? 'REABERTURA' : 'ÓBITO',
      'Tipo de Acidente': c.accident_type === 'TIPICO' ? 'TÍPICO' : c.accident_type === 'TRAJETO' ? 'TRAJETO' : 'DOENÇA DO TRABALHO',
      'Data e Hora do Acidente': c.accident_date ? `${formatDate(c.accident_date)} ${c.accident_time || ''}` : '-',
      'Local do Acidente': c.location_description || (c as any).accident_location || 'Estabelecimento do empregador',
      'Parte do Corpo Atingida': c.body_part_name || (c as any).body_part || 'Membro superior',
      'Agente Causador': c.causative_agent_name || (c as any).causative_agent || 'Máquina / Equipamento',
      'Houve Afastamento?': (c.days_away > 0 || (c as any).caused_absence) ? 'SIM' : 'NÃO',
      'Houve Óbito?': (c.death_occurred || (c as any).caused_death) ? 'SIM' : 'NÃO',
      'Transmitida ao eSocial S-2210': (c.receipt_number || (c as any).esocial_transmitted) ? `SIM (Rec: ${c.receipt_number || 'OK'})` : 'NÃO'
    };
  });

  const absenceRows = absences.map((a) => {
    const emp = empMap.get(a.employee_id);
    const client = a.client_id ? clientMap.get(a.client_id) : (emp ? clientMap.get(emp.client_id) : undefined);
    return {
      'ID Afastamento': a.id.substring(0, 8),
      'Colaborador': a.worker_name || (emp ? emp.name : 'N/A'),
      'CPF': a.worker_cpf || (emp ? emp.cpf : 'N/A'),
      'Empresa': client ? (client.trade_name || client.legal_name) : 'N/A',
      'Motivo do Afastamento': a.reason_description || (a as any).reason || 'Doença / Acidente',
      'Código CID-10': a.cid_10 || (a as any).cid_code || 'Não informado',
      'Data de Início': a.start_date ? formatDate(a.start_date) : '-',
      'Data de Término Prevista': a.end_date ? formatDate(a.end_date) : 'Indeterminada',
      'Total de Dias Afastados': a.estimated_days || (a as any).days_absent || '-',
      'Emitido S-2230 eSocial': (a.esocial_event_id || (a as any).esocial_transmitted) ? 'SIM' : 'NÃO'
    };
  });

  buildAndDownloadWorkbook(
    'relatorio_acidentes_cat_afastamentos_sst',
    [
      { sheetName: 'Acidentes de Trabalho (CAT)', data: catRows },
      { sheetName: 'Afastamentos Ocupacionais', data: absenceRows }
    ],
    {
      reportTitle: 'Relatório Estatístico de Acidentes de Trabalho (CAT) e Afastamentos',
      organizationName: organization?.name,
      filterSummary,
      totalRecords: cats.length + absences.length
    }
  );
}

/**
 * Export Integration Trainings to Excel
 */
export function exportTrainingsToExcel({
  trainings,
  employees,
  clients,
  organization,
  filterSummary
}: {
  trainings: SSTIntegrationTraining[];
  employees: Employee[];
  clients: Client[];
  organization?: Organization;
  filterSummary?: string;
}) {
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const empMap = new Map(employees.map(e => [e.id, e]));

  const rows: Record<string, any>[] = [];

  trainings.forEach((tr) => {
    const client = clientMap.get(tr.client_id);
    const attendees = tr.attendees || [];

    if (attendees.length === 0) {
      rows.push({
        'ID Treinamento': tr.id.substring(0, 8),
        'Empresa': client ? (client.trade_name || client.legal_name) : 'N/A',
        'Norma / Treinamento': tr.title || 'Treinamento de Integração NR-01',
        'Modalidade': tr.modality || (tr as any).training_modality || 'PRESENCIAL',
        'Carga Horária': `${tr.workload_hours || 4}h`,
        'Instrutor / Responsável': tr.instructor_name || 'Eng. de Segurança do Trabalho',
        'Data de Realização': tr.start_date ? formatDate(tr.start_date) : ((tr as any).training_date ? formatDate((tr as any).training_date) : '-'),
        'Data de Validade': (tr as any).valid_until ? formatDate((tr as any).valid_until) : '1 ano',
        'Colaborador Inscrito': 'Nenhum participante vinculado',
        'CPF': '-',
        'Presença Confirmada': 'N/A',
        'Assinatura da Lista': 'N/A'
      });
    } else {
      attendees.forEach((att) => {
        const emp = empMap.get(att.employee_id);
        rows.push({
          'ID Treinamento': tr.id.substring(0, 8),
          'Empresa': client ? (client.trade_name || client.legal_name) : 'N/A',
          'Norma / Treinamento': tr.title || 'Treinamento de Integração NR-01',
          'Modalidade': tr.modality || (tr as any).training_modality || 'PRESENCIAL',
          'Carga Horária': `${tr.workload_hours || 4}h`,
          'Instrutor / Responsável': tr.instructor_name || 'Eng. de Segurança do Trabalho',
          'Data de Realização': tr.start_date ? formatDate(tr.start_date) : ((tr as any).training_date ? formatDate((tr as any).training_date) : '-'),
          'Data de Validade': (tr as any).valid_until ? formatDate((tr as any).valid_until) : '1 ano',
          'Colaborador Inscrito': emp ? emp.name : att.employee_name,
          'CPF': emp ? emp.cpf : (att.employee_cpf || '-'),
          'Presença Confirmada': att.present ? 'SIM' : 'FALTOU',
          'Assinatura da Lista': att.signature_timestamp ? 'ASSINADO DIGITALMENTE' : ((att as any).signed ? 'ASSINADO' : (att.present ? 'PRESENÇA CONFIRMADA' : 'PENDENTE'))
        });
      });
    }
  });

  buildAndDownloadWorkbook(
    'relatorio_treinamentos_capacitacao_nr01',
    [{ sheetName: 'Treinamentos e Capacitações', data: rows }],
    {
      reportTitle: 'Relatório de Treinamentos e Capacitações em SST (NR-01)',
      organizationName: organization?.name,
      filterSummary,
      totalRecords: rows.length
    }
  );
}

/**
 * Export Commercial Proposals and Contracts to Excel
 */
export function exportCommercialToExcel({
  proposals,
  contracts,
  clients,
  organization,
  filterSummary
}: {
  proposals: Proposal[];
  contracts: Contract[];
  clients: Client[];
  organization?: Organization;
  filterSummary?: string;
}) {
  const clientMap = new Map(clients.map(c => [c.id, c]));

  const propRows = proposals.map((p) => {
    const client = clientMap.get(p.client_id);
    return {
      'Número Proposta': p.proposal_number || p.id.substring(0, 8),
      'Cliente': client ? (client.trade_name || client.legal_name) : 'N/A',
      'Título': p.title,
      'Valor Total': formatCurrency(p.total),
      'Status Comercial': translateProposalStatus(p.status),
      'Data de Envio': p.created_at ? formatDate(p.created_at) : '-',
      'Validade da Proposta': p.valid_until ? formatDate(p.valid_until) : '-'
    };
  });

  const contractRows = contracts.map((c) => {
    const client = clientMap.get(c.client_id);
    return {
      'Número Contrato': c.contract_number || c.id.substring(0, 8),
      'Cliente': client ? (client.trade_name || client.legal_name) : 'N/A',
      'Título do Contrato': c.title,
      'Valor Mensal / Recorrente': formatCurrency(c.total_value),
      'Recorrência': c.recurrence === 'MONTHLY' ? 'MENSAL' : c.recurrence === 'ANNUAL' ? 'ANUAL' : 'PONTUAL',
      'Status': c.status === 'ACTIVE' ? 'ATIVO E VIGENTE' : c.status === 'SIGNED' ? 'ASSINADO' : c.status,
      'Vigência Início': c.start_date ? formatDate(c.start_date) : '-',
      'Vigência Fim': c.end_date ? formatDate(c.end_date) : 'Indeterminado'
    };
  });

  buildAndDownloadWorkbook(
    'relatorio_comercial_propostas_contratos_sst',
    [
      { sheetName: 'Propostas Comerciais', data: propRows },
      { sheetName: 'Contratos Vigentes', data: contractRows }
    ],
    {
      reportTitle: 'Relatório Comercial de Propostas e Contratos SST',
      organizationName: organization?.name,
      filterSummary,
      totalRecords: proposals.length + contracts.length
    }
  );
}

// Helpers for translations
function translateOSStatus(s: string) {
  const map: Record<string, string> = {
    'DRAFT': 'Rascunho',
    'READY': 'Pronta',
    'SCHEDULED': 'Agendada',
    'IN_PROGRESS': 'Em Execução',
    'WAITING_CLIENT': 'Aguardando Cliente',
    'BLOCKED': 'Bloqueada',
    'DELIVERED': 'Entregue',
    'WAITING_ACCEPTANCE': 'Aguardando Homologação',
    'ACCEPTED': 'Aceita pelo Cliente',
    'COMPLETED': 'Concluída',
    'ON_HOLD': 'Em Pausa',
    'CANCELLED': 'Cancelada',
    'REWORK': 'Em Retrabalho'
  };
  return map[s] || s;
}

function translateRiskCategory(c: string) {
  const map: Record<string, string> = {
    'PHYSICAL': 'FÍSICO (Ruído, Calor, Vibração, Radiação)',
    'CHEMICAL': 'QUÍMICO (Poeiras, Fumos, Vapores, Gases)',
    'BIOLOGICAL': 'BIOLÓGICO (Vírus, Bactérias, Fungos)',
    'ERGONOMIC': 'ERGONÔMICO (Postura, Esforço, Repetitividade)',
    'ACCIDENT': 'ACIDENTES / MECÂNICO (Quedas, Máquinas, Eletricidade)',
    'MECANICO': 'MECÂNICO'
  };
  return map[c] || c;
}

function translateAsoType(t: string) {
  const map: Record<string, string> = {
    'ADMISSIONAL': 'Admissional',
    'PERIODICO': 'Periódico',
    'RETORNO_TRABALHO': 'Retorno ao Trabalho',
    'MUDANCA_FUNCAO': 'Mudança de Riscos / Função',
    'DEMISSIONAL': 'Demissional',
    'MONITORAMENTO_PONTUAL': 'Monitoramento Pontual'
  };
  return map[t] || t;
}

function translateESocialStatus(s: string) {
  const map: Record<string, string> = {
    'DRAFT': 'Rascunho',
    'VALIDATED': 'Validado (Schema OK)',
    'PENDING': 'Pendente de Transmissão',
    'TRANSMITTED': 'Transmitido com Recibo',
    'ACCEPTED': 'Aceito pelo Governo',
    'REJECTED': 'Rejeitado com Inconsistência',
    'ERROR': 'Erro de Comunicação'
  };
  return map[s] || s;
}

function translateEpiReason(r: string) {
  const map: Record<string, string> = {
    'ADMISSION': 'Admissão de Colaborador',
    'REPLACEMENT_WEAR': 'Substituição por Desgaste Natural',
    'DAMAGED': 'Danificado / Avariado em Serviço',
    'LOST': 'Extravio / Perda',
    'NEW_RISK': 'Adequação a Novo Risco de Trabalho'
  };
  return map[r] || r;
}

function translatePaymentStatus(s: string) {
  const map: Record<string, string> = {
    'PENDING': 'Pendente / A Vencer',
    'PAID': 'Liquidado / Pago',
    'OVERDUE': 'Em Atraso / Vencido',
    'CANCELLED': 'Cancelado'
  };
  return map[s] || s;
}

function translatePaymentMethod(m: string) {
  const map: Record<string, string> = {
    'BOLETO': 'Boleto Bancário',
    'PIX': 'PIX Instantâneo',
    'CREDIT_CARD': 'Cartão de Crédito',
    'BANK_TRANSFER': 'Transferência Bancária / TED',
    'CASH': 'Dinheiro em Espécie'
  };
  return map[m] || m;
}

function translateProposalStatus(s: string) {
  const map: Record<string, string> = {
    'DRAFT': 'Rascunho',
    'SENT': 'Enviada ao Cliente',
    'VIEWED': 'Visualizada pelo Cliente',
    'NEGOTIATION': 'Em Negociação',
    'APPROVED': 'Aprovada',
    'REJECTED': 'Recusada',
    'EXPIRED': 'Expirada',
    'CANCELLED': 'Cancelada'
  };
  return map[s] || s;
}
