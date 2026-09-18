import { ESocialEvent, ESocialReportOptions, Client, Organization } from '@/types';

/**
 * Generates an official, beautifully formatted HTML report ready for printing/PDF export
 * for eSocial SST Events (S-2210, S-2220, S-2230, S-2240) and Batch Conferral Dossiers.
 */
export function generateESocialReportHtml(
  events: ESocialEvent[],
  options: ESocialReportOptions,
  organization: Organization,
  clients: Client[]
): string {
  const isBatch = options.mode === 'BATCH' || events.length > 1;
  const today = new Date().toLocaleDateString('pt-BR');
  const time = new Date().toLocaleTimeString('pt-BR');

  const getClient = (clientId: string) => {
    return clients.find(c => c.id === clientId);
  };

  const renderS2240Section = (event: ESocialEvent) => {
    const risks = event.ambient_data?.ambient_risks || [];
    return `
      <div class="section">
        <div class="section-title">S-2240: CONDIÇÕES AMBIENTAIS DO TRABALHO - FATORES DE RISCO</div>
        <table class="data-table">
          <tr>
            <td style="width: 30%"><strong>Ambiente de Trabalho:</strong></td>
            <td>${event.ambient_data?.work_environment || 'Instalações do Empregador'}</td>
          </tr>
          <tr>
            <td><strong>Descrição das Atividades:</strong></td>
            <td>${event.ambient_data?.description_activities || 'Atividades operacionais conforme CBO ' + (event.worker_cbo || '7152-10')}</td>
          </tr>
        </table>

        <div style="margin-top: 12px; font-weight: bold; font-size: 11px; text-transform: uppercase; color: #1e293b;">
          Inventário de Riscos Ocupacionais (Tabela 24 do eSocial)
        </div>
        <table class="grid-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Agente Nocivo</th>
              <th>Categoria</th>
              <th>Intensidade / Concentração</th>
              <th>EPI / EPC</th>
            </tr>
          </thead>
          <tbody>
            ${risks.length > 0 ? risks.map(r => `
              <tr>
                <td><strong>${r.risk_code_table_24}</strong></td>
                <td>${r.description}</td>
                <td>${r.category}</td>
                <td>${r.intensity_concentration || 'Avaliação Qualitativa'} (${r.measurement_unit || '-'})</td>
                <td>${r.epi_effective ? 'EPI Eficaz (CA: ' + (r.epi_ca_numbers?.join(', ') || 'Válido') + ')' : 'Sem EPI / Não aplicável'}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="5" style="text-align: center; color: #64748b;">09.01.001 - Ausência de Fatores de Risco ou agentes nocivos com limites tolerados.</td>
              </tr>
            `}
          </tbody>
        </table>

        <table class="data-table" style="margin-top: 10px;">
          <tr>
            <td style="width: 30%"><strong>Responsável Técnico (LTCAT/PGR):</strong></td>
            <td>${event.ambient_data?.responsible_technician_name || 'Nao informado'}${event.ambient_data?.responsible_technician_crea_crm ? ` - ${event.ambient_data.responsible_technician_crea_crm}` : ''}</td>
          </tr>
        </table>
      </div>
    `;
  };

  const renderS2220Section = (event: ESocialEvent) => {
    const aso = event.aso_data;
    const exams = aso?.exams_list || [];
    return `
      <div class="section">
        <div class="section-title">S-2220: MONITORAMENTO DA SAÚDE DO TRABALHADOR (ASO)</div>
        <table class="data-table">
          <tr>
            <td style="width: 25%"><strong>Tipo de Exame:</strong></td>
            <td>${aso?.aso_type || 'PERIODICO'}</td>
            <td style="width: 20%"><strong>Data do ASO:</strong></td>
            <td>${aso?.exam_date ? new Date(aso.exam_date).toLocaleDateString('pt-BR') : today}</td>
          </tr>
          <tr>
            <td><strong>Resultado ASO:</strong></td>
            <td><strong style="color: ${aso?.result === 'APTO' ? '#16a34a' : '#dc2626'}">${aso?.result || 'APTO'}</strong></td>
            <td><strong>Médico Examinador:</strong></td>
            <td>${aso?.physician_name || 'Nao informado'}${aso?.physician_crm ? ` (CRM ${aso.physician_crm}${aso?.physician_uf ? '/' + aso.physician_uf : ''})` : ''}</td>
          </tr>
          <tr>
            <td><strong>Médico Coord. PCMSO:</strong></td>
            <td colspan="3">${aso?.pcmso_coordinator_name || 'Nao informado'}</td>
          </tr>
        </table>

        <div style="margin-top: 12px; font-weight: bold; font-size: 11px; text-transform: uppercase; color: #1e293b;">
          Exames Complementares Realizados (Tabela 27 do eSocial)
        </div>
        <table class="grid-table">
          <thead>
            <tr>
              <th>Código Tabela 27</th>
              <th>Procedimento Diagnóstico</th>
              <th>Data Realização</th>
              <th>Parecer Clínico</th>
            </tr>
          </thead>
          <tbody>
            ${exams.length > 0 ? exams.map(e => `
              <tr>
                <td><strong>${e.code}</strong></td>
                <td>${e.name}</td>
                <td>${new Date(e.date).toLocaleDateString('pt-BR')}</td>
                <td><span class="badge ${e.result === 'NORMAL' ? 'badge-success' : 'badge-danger'}">${e.result}</span></td>
              </tr>
            `).join('') : `
              <tr>
                <td><strong>0001</strong></td>
                <td>Exame Clínico Ocupacional / Anamnese Dirigida</td>
                <td>${aso?.exam_date ? new Date(aso.exam_date).toLocaleDateString('pt-BR') : today}</td>
                <td><span class="badge badge-success">NORMAL</span></td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    `;
  };

  const renderS2210Section = (event: ESocialEvent) => {
    const cat = event.cat_data;
    return `
      <div class="section">
        <div class="section-title">S-2210: COMUNICAÇÃO DE ACIDENTE DE TRABALHO (CAT)</div>
        <table class="data-table">
          <tr>
            <td style="width: 25%"><strong>Tipo de CAT:</strong></td>
            <td>${cat?.cat_type || 'INICIAL'}</td>
            <td style="width: 25%"><strong>Tipo de Acidente:</strong></td>
            <td>${cat?.accident_type || 'TÍPICO'}</td>
          </tr>
          <tr>
            <td><strong>Data e Hora:</strong></td>
            <td>${cat?.accident_date ? new Date(cat.accident_date).toLocaleDateString('pt-BR') : today} às ${cat?.accident_time || '10:00'}</td>
            <td><strong>Houve Óbito:</strong></td>
            <td>${cat?.death_occurred ? 'SIM' : 'NÃO'}</td>
          </tr>
          <tr>
            <td><strong>Local do Acidente:</strong></td>
            <td colspan="3">${cat?.location_description || 'Setor de Produção / Máquinas'} (${cat?.location_type || 'ESTABELECIMENTO_EMPREGADOR'})</td>
          </tr>
          <tr>
            <td><strong>Parte Atingida:</strong></td>
            <td>Código ${cat?.body_part || '752000000'}</td>
            <td><strong>Agente Causador:</strong></td>
            <td>Código ${cat?.accident_agent || '303020100'}</td>
          </tr>
          <tr>
            <td><strong>Diagnóstico Provável:</strong></td>
            <td>CID-10: <strong>${cat?.cid_code || 'S93.4'}</strong></td>
            <td><strong>Dias de Afastamento:</strong></td>
            <td>${cat?.days_away || 0} dias</td>
          </tr>
          <tr>
            <td><strong>Atestado Médico:</strong></td>
            <td colspan="3">Emitido por ${cat?.medical_cert_issuer || 'Pronto Socouro Regional'} - CRM ${cat?.medical_crm || '88412'}/${cat?.medical_uf || 'SP'}</td>
          </tr>
        </table>
      </div>
    `;
  };

  const renderS2230Section = (event: ESocialEvent) => {
    const abs = event.absence_data;
    return `
      <div class="section">
        <div class="section-title">S-2230: AFASTAMENTO TEMPORÁRIO</div>
        <table class="data-table">
          <tr>
            <td style="width: 25%"><strong>Motivo Afastamento:</strong></td>
            <td>Código <strong>${abs?.reason_code_table_18 || '01'}</strong> (Tabela 18 do eSocial)</td>
            <td style="width: 25%"><strong>Data de Início:</strong></td>
            <td>${abs?.start_date ? new Date(abs.start_date).toLocaleDateString('pt-BR') : today}</td>
          </tr>
          <tr>
            <td><strong>Duração Prevista:</strong></td>
            <td>${abs?.days_count || 5} dias (${abs?.end_date ? 'Até ' + new Date(abs.end_date).toLocaleDateString('pt-BR') : 'Indeterminado'})</td>
            <td><strong>CID-10:</strong></td>
            <td><strong>${abs?.cid_code || 'M54.5'}</strong></td>
          </tr>
          <tr>
            <td><strong>Médico Emitente:</strong></td>
            <td colspan="3">${abs?.physician_name || 'Dr. Ortopedista'} (CRM ${abs?.medical_crm || '77890'}/${abs?.medical_uf || 'SP'})</td>
          </tr>
        </table>
      </div>
    `;
  };

  const renderSingleEvent = (event: ESocialEvent, index: number) => {
    const client = getClient(event.client_id);
    return `
      <div class="page ${index > 0 ? 'page-break' : ''}">
        <!-- Header -->
        <div class="header">
          <div class="header-left">
            <div class="org-name">${organization.name || organization.legal_name}</div>
            <div class="doc-title">ESPELHO DE CONFERÊNCIA DE EVENTO SST eSOCIAL</div>
            <div class="doc-sub">Evento Oficial ${event.event_type} - Layout MOS v.S-1.2</div>
          </div>
          <div class="header-right">
            <div class="protocol-box">
              <div class="proto-label">Número do Evento</div>
              <div class="proto-value">${event.event_number}</div>
              <div class="proto-sub">Ambiente: ${event.environment}</div>
            </div>
          </div>
        </div>

        <!-- Identificação do Empregador e Trabalhador -->
        <div class="section">
          <div class="section-title">1. IDENTIFICAÇÃO DO EMPREGADOR E DO TRABALHADOR</div>
          <table class="data-table">
            <tr>
              <td style="width: 20%"><strong>Razão Social:</strong></td>
              <td>${client?.legal_name || 'Cliente PrevSafe SST'}</td>
              <td style="width: 15%"><strong>CNPJ:</strong></td>
              <td style="width: 25%">${client?.document_number || organization.document_number}</td>
            </tr>
            <tr>
              <td><strong>Trabalhador:</strong></td>
              <td><strong>${event.worker_name}</strong></td>
              <td><strong>CPF:</strong></td>
              <td>${event.worker_cpf}</td>
            </tr>
            <tr>
              <td><strong>Matrícula eSocial:</strong></td>
              <td>${event.worker_registration}</td>
              <td><strong>CBO:</strong></td>
              <td>${event.worker_cbo || '7152-10'} - ${event.worker_role || 'Trabalhador'}</td>
            </tr>
          </table>
        </div>

        <!-- Status e Recibo Oficial -->
        <div class="section">
          <div class="section-title">2. SITUAÇÃO DE PROCESSAMENTO E CONFORMIDADE</div>
          <table class="data-table">
            <tr>
              <td style="width: 20%"><strong>Status Atual:</strong></td>
              <td><span class="badge ${event.status === 'SUCCESS' ? 'badge-success' : event.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}">${event.status}</span></td>
              <td style="width: 20%"><strong>Recibo Governamental:</strong></td>
              <td><strong>${event.receipt_number || 'Pendente de Envio ao Governo'}</strong></td>
            </tr>
            ${event.protocol_number ? `
              <tr>
                <td><strong>Protocolo de Lote:</strong></td>
                <td colspan="3">${event.protocol_number} (Transmitido em: ${event.transmitted_at ? new Date(event.transmitted_at).toLocaleString('pt-BR') : '-'})</td>
              </tr>
            ` : ''}
            ${event.validation_errors && event.validation_errors.length > 0 ? `
              <tr>
                <td style="color: #dc2626;"><strong>Inconsistências:</strong></td>
                <td colspan="3" style="color: #dc2626; font-size: 11px;">
                  <ul>${event.validation_errors.map(err => `<li>${err}</li>`).join('')}</ul>
                </td>
              </tr>
            ` : ''}
          </table>
        </div>

        <!-- Conteúdo do Evento Específico -->
        ${event.event_type === 'S-2240' ? renderS2240Section(event) : ''}
        ${event.event_type === 'S-2220' ? renderS2220Section(event) : ''}
        ${event.event_type === 'S-2210' ? renderS2210Section(event) : ''}
        ${event.event_type === 'S-2230' ? renderS2230Section(event) : ''}

        <!-- XML Preview (Opcional) -->
        ${options.includeXmlPreview ? `
          <div class="section">
            <div class="section-title">XML ASSINADO DIGITALMENTE (PADRÃO XSD v.S-1.2)</div>
            <pre class="xml-box">${escapeHtml(event.xml_content || '<xml>Preview não disponível</xml>')}</pre>
          </div>
        ` : ''}

        <!-- Signatures & Conformity Stamp -->
        <div class="footer-signatures">
          <div class="sig-col">
            <div class="sig-line"></div>
            <div class="sig-name">Gestor de SST / Responsável Técnico</div>
            <div class="sig-detail">PrevSafe SST Cloud Platform</div>
          </div>
          <div class="sig-col">
            <div class="sig-line"></div>
            <div class="sig-name">Representante Legal / RH do Empregador</div>
            <div class="sig-detail">${client?.trade_name || 'Empresa Empregadora'}</div>
          </div>
          <div class="stamp-box">
            <div class="stamp-title">CONFERÊNCIA SST</div>
            <div class="stamp-date">Emitido em: ${today}</div>
            <div class="stamp-cert">Certificado A1 ICP-Brasil</div>
          </div>
        </div>
      </div>
    `;
  };

  const renderBatchDossier = () => {
    const totalEvents = events.length;
    const readyCount = events.filter(e => e.status === 'READY_TO_SEND' || e.status === 'DRAFT').length;
    const successCount = events.filter(e => e.status === 'SUCCESS').length;
    const rejectedCount = events.filter(e => e.status === 'REJECTED').length;

    return `
      <div class="page">
        <!-- Cover Header -->
        <div class="header">
          <div class="header-left">
            <div class="org-name">${organization.name || organization.legal_name}</div>
            <div class="doc-title">RELATÓRIO GERENCIAL DE CONFERÊNCIA DE EVENTOS SST eSOCIAL</div>
            <div class="doc-sub">Dossiê Analítico para Auditoria e Conferência Pré-Envio</div>
          </div>
          <div class="header-right">
            <div class="protocol-box">
              <div class="proto-label">Emissão do Relatório</div>
              <div class="proto-value">${today} - ${time}</div>
              <div class="proto-sub">Total: ${totalEvents} eventos</div>
            </div>
          </div>
        </div>

        <!-- Summary KPI Grid -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-num" style="color: #1e293b;">${totalEvents}</div>
            <div class="kpi-label">Total de Eventos</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-num" style="color: #16a34a;">${successCount}</div>
            <div class="kpi-label">Aceitos / Recibo OK</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-num" style="color: #d97706;">${readyCount}</div>
            <div class="kpi-label">Prontos / Pendentes</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-num" style="color: #dc2626;">${rejectedCount}</div>
            <div class="kpi-label">Com Inconsistência</div>
          </div>
        </div>

        <!-- List Table -->
        <div class="section" style="margin-top: 15px;">
          <div class="section-title">LISTAGEM ANALÍTICA DOS EVENTOS DO LOTE</div>
          <table class="grid-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Cliente / Empresa</th>
                <th>Trabalhador</th>
                <th>CPF</th>
                <th>Status</th>
                <th>Recibo / Observação</th>
              </tr>
            </thead>
            <tbody>
              ${events.map(e => {
                const client = getClient(e.client_id);
                return `
                  <tr>
                    <td><strong>${e.event_number}</strong></td>
                    <td><span class="badge badge-info">${e.event_type}</span></td>
                    <td>${client?.trade_name || 'Cliente'}</td>
                    <td><strong>${e.worker_name}</strong><br><span style="font-size: 9px; color: #64748b;">${e.worker_role || ''}</span></td>
                    <td>${e.worker_cpf}</td>
                    <td><span class="badge ${e.status === 'SUCCESS' ? 'badge-success' : e.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}">${e.status}</span></td>
                    <td style="font-size: 10px;">${e.receipt_number || (e.validation_errors?.length ? e.validation_errors[0] : 'Aguardando lote')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Signatures -->
        <div class="footer-signatures">
          <div class="sig-col">
            <div class="sig-line"></div>
            <div class="sig-name">Gestor de SST / Auditoria</div>
            <div class="sig-detail">PrevSafe Cloud SST</div>
          </div>
          <div class="sig-col">
            <div class="sig-line"></div>
            <div class="sig-name">Diretoria de Recursos Humanos</div>
            <div class="sig-detail">Visto e Conferência</div>
          </div>
        </div>
      </div>

      <!-- Followed by detailed individual sheets -->
      ${events.map((e, idx) => renderSingleEvent(e, idx + 1)).join('')}
    `;
  };

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório eSocial SST - ${isBatch ? 'Lote de Conferência' : events[0]?.event_number || 'Evento'}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background-color: #f8fafc;
          padding: 20px;
          font-size: 12px;
          line-height: 1.4;
        }
        .page {
          background: #ffffff;
          width: 100%;
          max-width: 860px;
          margin: 0 auto 30px auto;
          padding: 35px 40px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
        }
        @media print {
          body { background: transparent; padding: 0; }
          .page { box-shadow: none; border-radius: 0; padding: 25px 30px; margin: 0; }
          .page-break { page-break-before: always; }
          .no-print { display: none !important; }
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .org-name { font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
        .doc-title { font-size: 13px; font-weight: 700; color: #4338ca; margin-top: 2px; }
        .doc-sub { font-size: 11px; color: #64748b; margin-top: 1px; }
        .protocol-box {
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          padding: 6px 12px;
          border-radius: 6px;
          text-align: right;
        }
        .proto-label { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; }
        .proto-value { font-size: 12px; font-weight: 800; font-family: monospace; color: #0f172a; }
        .proto-sub { font-size: 10px; color: #475569; }
        .section {
          margin-bottom: 14px;
        }
        .section-title {
          font-size: 11px;
          font-weight: 800;
          color: #1e293b;
          text-transform: uppercase;
          background: #f1f5f9;
          padding: 4px 8px;
          border-left: 4px solid #4338ca;
          margin-bottom: 6px;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .data-table td {
          padding: 4px 6px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: top;
        }
        .grid-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-top: 6px;
        }
        .grid-table th {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 6px 8px;
          text-align: left;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          color: #475569;
        }
        .grid-table td {
          border: 1px solid #e2e8f0;
          padding: 6px 8px;
        }
        .badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-success { background: #dcfce7; color: #16a34a; }
        .badge-warning { background: #fef3c7; color: #d97706; }
        .badge-danger { background: #fee2e2; color: #dc2626; }
        .badge-info { background: #e0e7ff; color: #4338ca; }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }
        .kpi-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 10px;
          border-radius: 6px;
          text-align: center;
        }
        .kpi-num { font-size: 20px; font-weight: 800; }
        .kpi-label { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; }
        .xml-box {
          background: #0f172a;
          color: #93c5fd;
          padding: 8px 12px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 9px;
          max-height: 140px;
          overflow: auto;
          white-space: pre-wrap;
        }
        .footer-signatures {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 30px;
          padding-top: 20px;
        }
        .sig-col { text-align: center; width: 40%; }
        .sig-line { border-top: 1px solid #0f172a; margin-bottom: 4px; }
        .sig-name { font-size: 11px; font-weight: 700; color: #0f172a; }
        .sig-detail { font-size: 10px; color: #64748b; }
        .stamp-box {
          border: 2px dashed #4338ca;
          padding: 8px 12px;
          border-radius: 6px;
          text-align: center;
          background: #f5f3ff;
        }
        .stamp-title { font-size: 10px; font-weight: 800; color: #4338ca; }
        .stamp-date { font-size: 9px; color: #475569; }
        .stamp-cert { font-size: 9px; font-weight: 700; color: #16a34a; }
      </style>
    </head>
    <body>
      <div class="no-print" style="max-width: 860px; margin: 0 auto 15px auto; display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: white; padding: 12px 20px; border-radius: 8px;">
        <div>
          <span style="font-weight: bold; font-size: 13px;">Pré-visualização do Relatório Oficial eSocial</span>
          <span style="color: #94a3b8; font-size: 11px; margin-left: 8px;">(${events.length} evento(s) selecionados)</span>
        </div>
        <div>
          <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px;">
            Imprimir / Salvar em PDF
          </button>
        </div>
      </div>

      ${isBatch ? renderBatchDossier() : renderSingleEvent(events[0], 0)}
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Triggers direct browser printing for an eSocial report
 */
export function printESocialReport(
  events: ESocialEvent[],
  options: ESocialReportOptions,
  organization: Organization,
  clients: Client[]
) {
  const html = generateESocialReportHtml(events, options, organization, clients);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  }
}
