export type RoleType = 
  | 'ADMIN'
  | 'GESTOR'
  | 'COMERCIAL'
  | 'TÉCNICO'
  | 'FINANCEIRO'
  | 'CLIENTE_ADMIN'
  | 'CLIENTE_USER';

export type ProposalStatus = 
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'NEGOTIATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type ContractStatus = 
  | 'DRAFT'
  | 'REVIEW'
  | 'SENT'
  | 'VIEWED'
  | 'SIGNING'
  | 'SIGNED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'TERMINATED';

export type ServiceOrderStatus = 
  | 'DRAFT'
  | 'READY'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'WAITING_CLIENT'
  | 'BLOCKED'
  | 'DELIVERED'
  | 'WAITING_ACCEPTANCE'
  | 'ACCEPTED'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED'
  | 'REWORK';

export type StageStatus = 
  | 'TODO'
  | 'IN_PROGRESS'
  | 'WAITING_CLIENT'
  | 'BLOCKED'
  | 'COMPLETED';

export type TaskStatus = 
  | 'TODO'
  | 'IN_PROGRESS'
  | 'WAITING_CLIENT'
  | 'BLOCKED'
  | 'IN_REVIEW'
  | 'COMPLETED'
  | 'CANCELLED';

export type DocumentStatus = 
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'FINAL'
  | 'SUPERSEDED'
  | 'REJECTED';

export type RequestType = 
  | 'DOCUMENT'
  | 'INFORMATION'
  | 'APPROVAL'
  | 'CORRECTION'
  | 'SCHEDULING'
  | 'OTHER';

export type RequestStatus = 
  | 'OPEN'
  | 'SENT'
  | 'VIEWED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'EXPIRED'
  | 'CANCELLED';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ChannelType = 'WHATSAPP' | 'EMAIL' | 'SMS' | 'PORTAL' | 'APP';

export type RecurrenceType = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'CUSTOM';

// 14.0 Tenant Theme & Customization (PWA & Portal)
export interface TenantThemeSettings {
  primary_color: string;
  primary_hover?: string;
  secondary_color?: string;
  accent_color?: string;
  pwa_theme_color?: string;
  portal_brand_name?: string;
  portal_tagline?: string;
  portal_logo_url?: string;
  pwa_app_title?: string;
  pwa_icon_emoji?: string;
  border_radius?: 'rounded-lg' | 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl';
  contrast_mode?: 'high' | 'balanced' | 'soft' | 'outdoor_sunlight';
  enable_outdoor_high_contrast?: boolean;
  outdoor_contrast_preset?: 'yellow_nr18' | 'green_safety' | 'amber_solar' | 'monochrome_pure';
  enable_glow?: boolean;
  custom_css?: string;
}

// 14.1 Organizations
export interface Organization {
  id: string;
  name: string;
  legal_name: string;
  document_number: string; // CNPJ
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  theme_settings?: TenantThemeSettings;
  // Responsabilidade técnica impressa nos documentos legais (PGR, PCMSO, LTCAT).
  technical_responsible_name?: string;
  technical_responsible_title?: string; // Ex.: Engenheiro de Segurança do Trabalho
  technical_responsible_council?: string; // Ex.: CREA-BA 201812345-D
  technical_responsible_art?: string; // ART de cargo/função
  pcmso_physician_name?: string;
  pcmso_physician_crm?: string; // Ex.: CRM 189204/BA
  pcmso_physician_rqe?: string; // RQE em Medicina do Trabalho
  created_at: string;
  updated_at: string;
}

// 15. Profiles & Access Management
export interface Profile {
  id: string;
  organization_id: string;
  auth_user_id?: string; // Links to the real Supabase Auth user (auth.users.id), when the account is real
  full_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  avatar_url?: string;
  role: RoleType;
  client_id?: string; // If client user
  department?: string;
  job_title?: string;
  /**
   * CPF do profissional. Exigido pelo eSocial no S-2240 (cpfResp - responsavel
   * pelos registros ambientais) e no S-2220. Sem ele o evento e recusado pelo
   * governo, entao nao ha como gerar um S-2240 valido para um responsavel
   * tecnico que nao tenha este campo preenchido.
   */
  cpf?: string;
  professional_register?: string; // e.g. "MTE 0048192/SP", "CREA 5061928371", "CRM 149202"
  /** UF do registro profissional (CREA/CRM), exigida pelo eSocial. */
  professional_register_uf?: string;
  status: 'ACTIVE' | 'INACTIVE';
  two_factor_enabled?: boolean;
  last_login_at?: string;
  custom_permissions?: string[];
  created_at: string;
  updated_at: string;
}

export type UserProfile = Profile;

export type PermissionModule = 
  | 'DASHBOARDS'
  | 'FINANCIAL'
  | 'CRM'
  | 'SERVICE_ORDERS'
  | 'FIELD_PWA'
  | 'ESOCIAL'
  | 'DOCUMENTS'
  | 'CLIENT_PORTAL'
  | 'USERS_ACCESS'
  | 'SETTINGS_AUDIT';

export interface PermissionDefinition {
  id: string;
  module: PermissionModule;
  code: string;
  name: string;
  description: string;
  default_roles: RoleType[];
}

export type DocumentType = 'CNPJ' | 'CPF' | 'CAEPF' | 'CNO';

// 18. Clients
export interface Client {
  id: string;
  organization_id: string;
  legal_name: string;
  trade_name: string;
  document_type?: DocumentType; // CNPJ | CPF | CAEPF | CNO
  document_number: string; // Documento formatado ou número de inscrição
  caepf?: string; // Inscrição CAEPF vinculada (se produtor rural / autônomo)
  cno?: string; // Inscrição CNO vinculada (se obra de construção civil)
  main_cnae: string;
  cnae_description?: string;
  risk_degree: 1 | 2 | 3 | 4; // Grau de Risco Quadro I NR-04 (MTE)
  employee_count: number;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  neighborhood?: string;
  zip_code?: string;
  city: string;
  state: string;
  porte?: string;
  natureza_juridica?: string;
  status_receita?: 'ATIVA' | 'INAPTA' | 'SUSPENSA' | 'BAIXADA';
  status: 'ACTIVE' | 'INACTIVE' | 'PROSPECT';
  notes?: string;
  created_at: string;
  updated_at: string;
}

// 19. Client Contacts
export interface ClientContact {
  id: string;
  organization_id: string;
  client_id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  whatsapp: string;
  is_primary: boolean;
}

// 20. Client Units
export interface ClientUnit {
  id: string;
  organization_id: string;
  client_id: string;
  name: string;
  document_type?: DocumentType; // CNPJ Filial | CAEPF | CNO Obra | CPF
  document_number?: string;
  address: string;
  neighborhood?: string;
  city: string;
  state: string;
  zip_code?: string;
  cnae: string;
  cnae_description?: string;
  risk_degree?: 1 | 2 | 3 | 4;
  employee_count: number;
  status: 'ACTIVE' | 'INACTIVE';
}

// 21. Leads
export interface Lead {
  id: string;
  organization_id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: 'INDICAÇÃO' | 'GOOGLE' | 'EVENTO' | 'OUTBOUND' | 'SITE' | 'OUTRO';
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DISQUALIFIED' | 'CONVERTED';
  assigned_to?: string;
  cnae?: string;
  estimated_employees?: number;
  notes?: string;
  // Contexto de marketing, preenchido quando o lead vem do site publico.
  // Sem isto nao da para saber qual pagina ou campanha converteu.
  landing_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  created_at: string;
}

// 22. Opportunities
export interface Opportunity {
  id: string;
  organization_id: string;
  client_id?: string;
  lead_id?: string;
  title: string;
  estimated_value: number;
  probability: number; // percentage
  stage: 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  expected_close_date: string;
  assigned_to?: string;
  created_at: string;
}

// 23. Proposals
export interface ProposalItem {
  id: string;
  proposal_id: string;
  service_template_id: string;
  service_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  original_price?: number;
  discount_type?: 'FIXED' | 'PERCENT';
  discount_value?: number;
  discount?: number;
}

export interface ProposalApproval {
  id: string;
  proposal_id: string;
  client_user_id: string;
  client_name: string;
  action: 'APPROVED' | 'REJECTED';
  comment?: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface Proposal {
  id: string;
  organization_id: string;
  client_id: string;
  opportunity_id?: string;
  proposal_number: string; // PROP-2026-000001
  title: string;
  description: string;
  items: ProposalItem[];
  subtotal: number;
  discount: number;
  total: number;
  valid_until: string;
  status: ProposalStatus;
  created_by: string;
  approved_at?: string;
  approval_details?: ProposalApproval;
  created_at: string;
  updated_at: string;
}

// 26. Contracts
export interface ContractSignature {
  id: string;
  contract_id: string;
  signer_user_id?: string;
  signer_name: string;
  signer_email: string;
  signer_document?: string;
  signed_at: string;
  ip_address: string;
  provider: 'PREVSAFE_SIGN' | 'DOCUSIGN' | 'CLICKSIGN' | 'MANUAL';
  external_id?: string;
  /** SHA-256 do conteudo do contrato no momento da assinatura. */
  document_hash?: string;
  signature_hash?: string;
}

export interface Contract {
  id: string;
  organization_id: string;
  client_id: string;
  proposal_id?: string;
  contract_number: string; // CONT-2026-000001
  title: string;
  status: ContractStatus;
  recurrence: RecurrenceType;
  total_value: number;
  start_date: string;
  end_date: string;
  signed_at?: string;
  document_path?: string;
  /** Minuta do contrato. Gerada a partir da proposta aceita e editavel. */
  terms?: string;
  /** Servicos contratados, copiados dos itens da proposta na geracao. */
  services_summary?: string;
  signatures: ContractSignature[];
  created_at: string;
  updated_at: string;
}

// 28. Service Templates (Catalog)
export interface ServiceTemplateTask {
  id: string;
  stage_id: string;
  name: string;
  description: string;
  order_index: number;
  default_role: RoleType;
  is_mandatory: boolean;
  estimated_hours?: number;
}

export interface ServiceTemplateStage {
  id: string;
  service_template_id: string;
  name: string;
  description: string;
  order_index: number;
  default_days: number;
  is_mandatory: boolean;
  requires_client: boolean;
  tasks: ServiceTemplateTask[];
  checklist_items?: string[];
}

export interface ServiceTemplate {
  id: string;
  organization_id: string;
  name: string; // PGR, PCMSO, LTCAT, AET, Treinamento NR-35, etc.
  code: string; // PGR-01, PCMSO-07, LTCAT-PREV
  category: 'PROGRAMAS' | 'LAUDOS' | 'TREINAMENTOS' | 'ERGONOMIA' | 'CONSULTORIA' | 'AUDITORIA';
  description: string;
  default_duration_days: number;
  default_price: number;
  mandatory_documents: string[];
  active: boolean;
  stages: ServiceTemplateStage[];
}

// 31. Service Orders (OS)
export interface ServiceTask {
  id: string;
  service_stage_id: string;
  name: string;
  description: string;
  status: TaskStatus;
  priority: PriorityLevel;
  assigned_to?: string;
  assigned_name?: string;
  due_date: string;
  completed_at?: string;
  is_mandatory: boolean;
  order_index: number;
  evidence_notes?: string;
  checklist?: { id: string; item: string; completed: boolean }[];
}

export interface ServiceStage {
  id: string;
  service_order_id: string;
  template_stage_id?: string;
  name: string;
  description?: string;
  order_index: number;
  status: StageStatus;
  start_date: string;
  due_date: string;
  completed_at?: string;
  assigned_to?: string;
  assigned_name?: string;
  progress: number; // 0-100
  blocked_reason?: string;
  is_mandatory: boolean;
  requires_client: boolean;
  tasks: ServiceTask[];
  checklist?: { id: string; item: string; completed: boolean }[];
  field_evidence?: {
    photos?: { url: string; caption: string; timestamp: string }[];
    client_signature?: { name: string; signed_at: string; data_url?: string };
    inspection_notes?: string;
    geo_location?: { latitude: number; longitude: number; label: string };
  };
}

export interface ServiceDependency {
  id: string;
  service_order_id: string;
  source_stage_id: string;
  target_stage_id: string;
  dependency_type: 'BLOCKS' | 'REQUIRES' | 'PRECEDES';
}

export interface ServiceOrder {
  id: string;
  organization_id: string;
  client_id: string;
  contract_id?: string;
  service_template_id: string;
  service_name: string;
  service_code: string;
  os_number: string; // OS-2026-000457
  title: string;
  description: string;
  status: ServiceOrderStatus;
  priority: PriorityLevel;
  start_date: string;
  due_date: string;
  completed_at?: string;
  progress: number; // 0 - 100 calculated from tasks
  manager_id: string;
  manager_name: string;
  technical_responsible_id: string;
  technical_responsible_name: string;
  stages: ServiceStage[];
  dependencies: ServiceDependency[];
  sla_total_days: number;
  sla_internal_days: number;
  sla_client_waiting_days: number;
  sla_is_paused: boolean;
  sla_pause_reason?: string;
  rework_history?: {
    date: string;
    requested_by: string;
    reason: string;
    correction_task_id?: string;
    previous_delivery_date: string;
  }[];
  created_at: string;
  updated_at: string;
}

// 35. Documents & Versions
export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  checksum: string;
  status: DocumentStatus;
  created_by_name: string;
  created_at: string;
  notes?: string;
  is_client_released: boolean;
}

export interface Document {
  id: string;
  organization_id: string;
  client_id: string;
  service_order_id?: string;
  stage_id?: string;
  doc_number: string; // DOC-2026-000001
  name: string;
  document_type: 'PGR' | 'PCMSO' | 'LTCAT' | 'AET' | 'APR' | 'CERTIFICADO' | 'CONTRATO' | 'RELATÓRIO' | 'OUTRO';
  status: DocumentStatus;
  current_version: number;
  storage_path: string;
  uploaded_by_name: string;
  is_client_released: boolean;
  versions: DocumentVersion[];
  created_at: string;
  updated_at: string;
}

// 37. Requests (Pendências e Solicitações)
export interface RequestItem {
  id: string;
  organization_id: string;
  client_id: string;
  service_order_id?: string;
  stage_id?: string;
  req_number: string; // REQ-2026-000001
  title: string;
  description: string;
  type: RequestType;
  priority: PriorityLevel;
  status: RequestStatus;
  assigned_to_client_user?: string;
  due_date: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
}

// 38. Notifications & Deliveries
export interface NotificationDelivery {
  id: string;
  notification_id: string;
  channel: ChannelType;
  provider: string;
  external_id?: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'RETRY';
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
}

export interface Notification {
  id: string;
  organization_id: string;
  recipient_user_id: string;
  recipient_name: string;
  recipient_email?: string;
  recipient_phone?: string;
  event_type: string; // proposal.sent, contract.signed, service.delivered, etc.
  title: string;
  message: string;
  channel: ChannelType;
  status: 'UNREAD' | 'READ';
  related_entity_type?: 'PROPOSAL' | 'CONTRACT' | 'SERVICE_ORDER' | 'DOCUMENT' | 'REQUEST' | 'ESOCIAL_EVENT' | 'ESOCIAL_BATCH';
  related_entity_id?: string;
  deliveries: NotificationDelivery[];
  sent_at: string;
  read_at?: string;
}

export interface NotificationTemplate {
  id: string;
  organization_id: string;
  event_type: string;
  channel: ChannelType;
  subject: string;
  body: string;
  active: boolean;
}

// 41. Communications
export interface Communication {
  id: string;
  organization_id: string;
  client_id: string;
  service_order_id?: string;
  channel: ChannelType;
  direction: 'INBOUND' | 'OUTBOUND';
  subject: string;
  content: string;
  sent_by_name: string;
  created_at: string;
}

// 42. Evaluations
export interface Evaluation {
  id: string;
  organization_id: string;
  client_id: string;
  service_order_id: string;
  service_title: string;
  overall_score: number; // 1 to 5
  quality_score: number; // 1 to 5
  service_score: number; // 1 to 5
  deadline_score: number; // 1 to 5
  communication_score: number; // 1 to 5
  nps_score: number; // 0 to 10
  comment: string;
  created_at: string;
}

// 43. Audit Logs
export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string;
  user_name: string;
  user_role: RoleType;
  action: 
    | 'LOGIN'
    | 'LOGOUT'
    | 'PROPOSAL_CREATED'
    | 'PROPOSAL_SENT'
    | 'PROPOSAL_APPROVED'
    | 'PROPOSAL_REJECTED'
    | 'CONTRACT_CREATED'
    | 'CONTRACT_SIGNED'
    | 'OS_CREATED'
    | 'STAGE_STARTED'
    | 'STAGE_COMPLETED'
    | 'STAGE_BLOCKED'
    | 'TASK_COMPLETED'
    | 'DOCUMENT_UPLOADED'
    | 'DOCUMENT_APPROVED'
    | 'SERVICE_DELIVERED'
    | 'SERVICE_ACCEPTED'
    | 'REWORK_REQUESTED'
    | 'EVALUATION_RECEIVED'
    | 'STATUS_CHANGED'
    | 'SLA_PAUSED'
    | 'SLA_RESUMED'
    | 'ESOCIAL_EVENT_CREATED'
    | 'ESOCIAL_EVENT_VALIDATED'
    | 'ESOCIAL_EVENT_TRANSMITTED'
    | 'ESOCIAL_EVENT_REJECTED'
    | 'ESOCIAL_EVENT_EXCLUDED'
    | 'ESOCIAL_BATCH_TRANSMITTED'
    | 'ESOCIAL_AUTOMATION_EXECUTED';
  entity_type: 'CLIENT' | 'PROPOSAL' | 'CONTRACT' | 'SERVICE_ORDER' | 'STAGE' | 'TASK' | 'DOCUMENT' | 'REQUEST' | 'EVALUATION' | 'ESOCIAL_EVENT' | 'ESOCIAL_BATCH' | 'ORGANIZATION' | 'USER';
  entity_id: string;
  entity_number?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  ip_address: string;
  user_agent?: string;
  created_at: string;
}

// 44. eSocial SST Events Management Types
export type ESocialEventType = 'S-2210' | 'S-2220' | 'S-2230' | 'S-2240' | 'S-3000';
export type ESocialEventStatus = 'DRAFT' | 'VALIDATED' | 'READY_TO_SEND' | 'PROCESSING' | 'SUCCESS' | 'REJECTED' | 'EXCLUDED';

export interface ESocialCATData {
  cat_type: 'INICIAL' | 'REABERTURA' | 'COMUNICACAO_OBITO';
  accident_date: string;
  accident_time: string;
  accident_type: 'TIPICO' | 'TRAJETO' | 'DOENCA_OCUPACIONAL';
  body_part: string;
  accident_agent: string;
  death_occurred: boolean;
  death_date?: string;
  police_report: boolean;
  medical_cert_issuer: string;
  medical_crm: string;
  medical_uf: string;
  cid_code: string;
  days_away: number;
  location_type: 'ESTABELECIMENTO_EMPREGADOR' | 'EMPRESA_TERCEIRA' | 'VIA_PUBLICA' | 'OUTROS';
  location_description: string;
}

export interface ESocialComplementaryExam {
  code: string;
  name: string;
  date: string;
  procedure_type: 'CLINICO' | 'AUDIOMETRIA' | 'ESPIROMETRIA' | 'RX_TORAX_OIT' | 'HEMOGRAMA' | 'GLICEMIA' | 'ACUIDADE_VISUAL' | 'OUTRO';
  result: 'NORMAL' | 'ALTERADO' | 'ESTAVEL' | 'AGRAVAMENTO';
  observation?: string;
}

export interface ESocialASOData {
  aso_type: 'ADMISSIONAL' | 'PERIODICO' | 'RETORNO_TRABALHO' | 'MUDANCA_RISCO' | 'DEMISSIONAL';
  exam_date: string;
  result: 'APTO' | 'INAPTO';
  physician_name: string;
  physician_crm: string;
  physician_uf: string;
  pcmso_coordinator_name?: string;
  pcmso_coordinator_crm?: string;
  pcmso_coordinator_uf?: string;
  exams_list: ESocialComplementaryExam[];
}

export interface ESocialAmbientRiskFactor {
  id: string;
  risk_code_table_24: string; // Tabela 24 eSocial (ex: "01.01.001", "02.01.014", "05.01.001")
  category: 'FÍSICO' | 'QUÍMICO' | 'BIOLÓGICO' | 'ERGONÔMICO' | 'ACIDENTES' | 'AUSÊNCIA_RISCO';
  description: string;
  intensity_concentration?: string;
  limit_tolerance?: string;
  measurement_unit?: string;
  technique_used?: string;
  epc_effective: boolean;
  epi_effective: boolean;
  epi_ca_numbers?: string[];
  is_insalubre?: boolean;
  is_periculoso?: boolean;
}

export interface ESocialAmbientRiskData {
  start_date: string;
  end_date?: string;
  description_activities: string;
  work_environment: string;
  ambient_risks: ESocialAmbientRiskFactor[];
  responsible_technician_name: string;
  responsible_technician_cpf: string;
  responsible_technician_crea_crm: string;
  responsible_technician_uf: string;
}

export interface ESocialAbsenceData {
  reason_code_table_18: string; // Tabela 18 eSocial (ex: "01 - Acidente de trabalho", "03 - Doença", "17 - Licença maternidade")
  reason_description: string;
  start_date: string;
  end_date?: string;
  estimated_days: number;
  days_count?: number;
  is_traffic_accident: boolean;
  medical_issuer_name: string;
  physician_name?: string;
  medical_crm: string;
  medical_uf: string;
  cid_10?: string;
  cid_code?: string;
  observation?: string;
}

export interface ESocialExclusionData {
  target_event_type: 'S-2210' | 'S-2220' | 'S-2230' | 'S-2240';
  target_receipt_number: string;
  exclusion_reason: string;
}

export interface ESocialEvent {
  id: string;
  organization_id: string;
  client_id: string;
  service_order_id?: string;
  event_type: ESocialEventType;
  event_number: string; // EVT-2026-000001
  status: ESocialEventStatus;
  environment: 'PRODUCAO' | 'PRODUCAO_RESTRITA';
  is_rectification: boolean;
  rectified_receipt_number?: string;
  
  // Worker Identification
  worker_name: string;
  worker_cpf: string;
  worker_nis?: string;
  worker_registration: string; // Matrícula
  worker_cbo: string;
  worker_role: string;
  workplace_unit_id?: string;

  // Specific Payloads
  cat_data?: ESocialCATData;
  aso_data?: ESocialASOData;
  ambient_data?: ESocialAmbientRiskData;
  absence_data?: ESocialAbsenceData;
  exclusion_data?: ESocialExclusionData;

  // Transmission & XML
  xml_content?: string;
  receipt_number?: string;
  protocol_number?: string;
  transmitted_at?: string;
  transmission_batch_id?: string;
  validation_errors?: string[];
  return_code?: string;
  return_message?: string;

  created_at: string;
  updated_at: string;
  history?: {
    date: string;
    action: string;
    user_name: string;
    status: ESocialEventStatus;
    details?: string;
  }[];
}

export interface ESocialBatch {
  id: string;
  organization_id: string;
  batch_number: string;
  environment: 'PRODUCAO' | 'PRODUCAO_RESTRITA';
  certificate_type: 'A1_DIGITAL' | 'A3_TOKEN_SMARTCARD';
  event_ids: string[];
  events_count: number;
  success_count: number;
  error_count: number;
  status: 'PROCESSANDO' | 'SUCESSO_TOTAL' | 'SUCESSO_PARCIAL' | 'REJEITADO';
  protocol_number: string;
  created_at: string;
  completed_at?: string;
}

// 45. eSocial Certificate & Environment Configuration
export type ESocialEnvironment = 'PRODUCAO' | 'PRODUCAO_RESTRITA';
export type ESocialCertificateType = 'A1_PFX' | 'A3_TOKEN' | 'CLOUD_NEOID' | 'A1_DIGITAL' | 'A3_TOKEN_SMARTCARD';

export interface DigitalCertificateInfo {
  file_name: string;
  certificate_type: 'A1_PFX' | 'A3_TOKEN' | 'CLOUD_NEOID' | 'A1_DIGITAL' | 'A3_TOKEN_SMARTCARD';
  /**
   * Os campos abaixo so existem quando o certificado for efetivamente LIDO.
   * O sistema nao abre o .pfx (nao ha biblioteca de leitura de PKCS#12 aqui, e
   * ele nao assina nada), entao eles ficam ausentes. Antes eram preenchidos
   * sem leitura nenhuma: emissor "AC CERTISIGN MULTIPLA G7 - ICP-BRASIL v5",
   * numero de serie tirado do relogio, validade de hoje + 1 ano e status
   * 'VALID'. Renomear um arquivo de texto para .pfx produzia um "certificado
   * ICP-Brasil autenticado".
   */
  subject_name?: string;
  subject_cnpj?: string;
  issuer_name?: string;
  serial_number?: string;
  valid_from?: string;
  valid_until?: string;
  days_remaining?: number;
  status: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'NOT_CONFIGURED' | 'NAO_VERIFICADO';
  has_password: boolean;
  /** Quando o arquivo foi anexado. Nao e um teste de validade. */
  uploaded_at?: string;
  last_tested_at?: string;
  // A chave privada do certificado A1 NAO e persistida. O arquivo .pfx nunca
  // foi usado para assinar nada aqui, e guarda-lo no banco deixaria a chave
  // privada da empresa legivel por qualquer membro da organizacao via API.
  // Só os metadados de validade/titularidade ficam gravados.
}

export interface ESocialConfig {
  organization_id: string;
  environment: ESocialEnvironment; // Homologação vs Produção
  tp_amb?: 1 | 2;
  layout_version: 'S-01.03.00' | 'S-01.02.00';
  transmitter_mode: 'PROCURACAO_ELETRONICA' | 'EMPREGADOR_DIRETO' | 'CONVENIO_SERPRO';
  employer_type: '1' | '2'; // 1: CNPJ, 2: CPF
  employer_document: string;
  transmitter_document: string; // CNPJ da Assessoria / Procurador
  software_house_cnpj?: string;
  software_house_name?: string;
  transmitter_cnpj?: string;
  transmitter_type?: 'PROCURADOR' | 'EMPREGADOR_DIRETO' | 'CONVENIO_SERPRO';
  auth_type?: 'CERTIFICADO_A1' | 'CERTIFICADO_A3' | 'PROCURACAO_RFB';
  certificate: DigitalCertificateInfo;
  auto_sign_on_validation: boolean;
  auto_transmit_batches: boolean;
  auto_batch_transmission?: boolean;
  notify_rh_on_success?: boolean;
  webhook_url?: string;
  serpro_client_id?: string;
  serpro_client_secret?: string;
  sla_exam_warning_days: number; // ex: 30 dias de antecedência para ASO
  sla_document_warning_days: number; // ex: 15 dias de antecedência para PGR/PCMSO
  last_sync_at?: string;
}

export interface ESocialReportOptions {
  title?: string;
  mode?: 'SINGLE' | 'BATCH';
  includeSignatures?: boolean;
  includeQrCode?: boolean;
  includeTransmissionReceipt?: boolean;
  includeXmlSnippet?: boolean;
  includeXmlPreview?: boolean;
  includeValidationErrors?: boolean;
  reportLayout?: 'FULL_CONFERENCE' | 'SIMPLIFIED' | 'BATCH_AUDIT';
}

export interface SSTDeadlineNotification {
  id: string;
  type: 'EXAM_EXPIRING' | 'EXAM_OVERDUE' | 'DOCUMENT_SLA_EXPIRING' | 'DOCUMENT_SLA_OVERDUE' | 'PGR_REVISION_DUE';
  title: string;
  message: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  days_difference: number;
  entity_id: string;
  client_id: string;
  client_name: string;
  target_date: string;
  action_route: string;
  created_at: string;
}

// ==========================================
// 40. MÓDULO FINANCEIRO (PrevSafe Finance)
// ==========================================

export type FinancialTransactionType = 'RECEIVABLE' | 'PAYABLE';
export type FinancialTransactionStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type FinancialReconciliationStatus = 'PENDING_RECONCILIATION' | 'RECONCILED' | 'UNRECONCILED' | 'DISCREPANCY';
export type FinancialPaymentMethod = 'BOLETO' | 'PIX' | 'TRANSFERENCIA' | 'CARTAO_CREDITO' | 'DINHEIRO';

export type FinancialCategoryKey =
  // Receitas SST
  | 'MENSALIDADE_SST'
  | 'ELABORACAO_PGR_PCMSO'
  | 'LAUDOS_LTCAT_INSALUBRIDADE'
  | 'EXAMES_CLINICOS_ASO'
  | 'TREINAMENTOS_NR'
  | 'EVENTOS_ESOCIAL_SST'
  | 'ASSESSORIA_MENSAL'
  | 'OUTRAS_RECEITAS'
  // Despesas Operacionais & Administrativas
  | 'HONORARIOS_MEDICOS'
  | 'HONORARIOS_ENGENHARIA_TECNICO'
  | 'CLINICAS_LABORATORIOS_PARCEIROS'
  | 'CALIBRACAO_EQUIPAMENTOS'
  | 'SOFTWARES_LICENCAS'
  | 'ALUGUEL_INSTALACOES'
  | 'IMPOSTOS_TRIBUTOS'
  | 'MARKETING_COMERCIAL'
  | 'DESPESAS_ADMINISTRATIVAS'
  | 'OUTRAS_DESPESAS';

export interface FinancialTransaction {
  id: string;
  organization_id: string;
  type: FinancialTransactionType; // RECEIVABLE (Contas a Receber) | PAYABLE (Contas a Pagar)
  status: FinancialTransactionStatus;
  reconciliation_status?: FinancialReconciliationStatus; // Status de Conciliação Bancária
  reconciled_at?: string; // Data/hora da conciliação bancária
  reconciled_by?: string; // Nome do operador que conciliou
  reconciliation_ref?: string; // Código de autenticação / NSU bancário
  reconciliation_notes?: string;
  title: string;
  description?: string;
  client_id?: string;
  client_name?: string;
  supplier_name?: string; // Fornecedor / Profissional Credenciado (para Contas a Pagar)
  contract_id?: string;
  service_order_id?: string;
  category: FinancialCategoryKey;
  category_name: string;
  amount: number;
  discount?: number;
  fine_interest?: number;
  final_amount: number;
  due_date: string; // YYYY-MM-DD
  payment_date?: string; // YYYY-MM-DD
  payment_method?: FinancialPaymentMethod;
  document_number?: string; // Nota Fiscal / Recibo / Fatura
  barcode_or_pix?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CashFlowSummary {
  current_balance: number;
  total_receivable_month: number;
  total_payable_month: number;
  received_month: number;
  paid_month: number;
  overdue_receivables: number;
  overdue_payables: number;
  projected_balance_30d: number;
  projected_balance_60d: number;
  projected_balance_90d: number;
  default_rate_percent: number; // Inadimplência %
  reconciled_count?: number; // Total de transações conciliadas
  pending_reconciliation_count?: number; // Total pendente de conciliação
  due_soon_count?: number; // Contas com vencimento nos próximos 5 dias
  overdue_count?: number; // Contas vencidas
}

// ==========================================
// 27. SaaS Multi-Tenancy & Subscriptions (Super Admin)
// ==========================================
export type SubscriptionPlanId = 'STARTER' | 'PRO' | 'ENTERPRISE' | 'CUSTOM';

export type TenantStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';

export interface SaaSSubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  badge: string;
  monthly_price: number;
  yearly_price: number;
  max_managed_companies: number;
  max_internal_users: number;
  esocial_direct_transmission: boolean;
  whatsapp_automations: boolean;
  ai_copilot_sst: boolean;
  custom_white_label: boolean;
  priority_support: boolean;
  description: string;
}

export interface Tenant {
  id: string;
  name: string;
  trade_name: string;
  document_number: string; // CNPJ da Consultoria
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  state: string;
  plan_id: SubscriptionPlanId;
  plan_name: string;
  billing_cycle: 'MONTHLY' | 'ANNUAL';
  mrr: number;
  status: TenantStatus;
  trial_ends_at?: string;
  next_billing_date: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  active_companies_count: number;
  max_companies_limit: number;
  active_users_count: number;
  max_users_limit: number;
  storage_used_mb: number;
  created_at: string;
  invite_token?: string;
  invite_url?: string;
  invite_status: 'ACCEPTED' | 'PENDING';
  invite_sent_at?: string;
  database_isolation_mode: 'SHARED_ROW_LEVEL_SECURITY' | 'DEDICATED_SCHEMA';
  custom_domain?: string;
  theme_settings?: TenantThemeSettings;
  notes?: string;
}

// ==========================================
// 45. Complete eSocial SST & Occupational Health Data Architecture
// ==========================================

export type WorkerCategoryType = 
  | '101' // Empregado - Geral, inclusive o empregado público da administração direta ou indireta contratado pela CLT
  | '102' // Empregado - Trabalhador Rural por Pequeno Prazo
  | '103' // Empregado - Aprendiz
  | '104' // Empregado - Doméstico
  | '105' // Empregado - Contrato a termo firmado nos termos da Lei 9.601/1998
  | '106' // Trabalhador Temporário
  | '701' // Contribuinte Individual - Autônomo em geral
  | '721' // Contribuinte Individual - Diretor não empregado, com FGTS
  | '722' // Contribuinte Individual - Diretor não empregado, sem FGTS
  | '901'; // Estagiário

export type EmploymentRegime = 'CLT' | 'ESTATUTARIO' | 'AVULSO' | 'TEMPORARIO' | 'ESTAGIO';

export interface EmployeeEPIItem {
  id: string;
  ca_number: string;
  epi_name: string;
  delivery_date: string;
  term_signed: boolean;
  term_signature_url?: string;
  replacement_due_date?: string;
}

export type EmployeeEPI = EmployeeEPIItem;

export interface EmployeeASOHistory {
  id: string;
  aso_type: 'ADMISSIONAL' | 'PERIODICO' | 'RETORNO_TRABALHO' | 'MUDANCA_RISCO' | 'DEMISSIONAL';
  exam_date: string;
  valid_until: string;
  result: 'APTO' | 'INAPTO' | 'APTO_COM_RESTRICAO';
  restrictions_notes?: string;
  physician_name: string;
  physician_crm: string;
  physician_uf: string;
  document_url?: string;
  esocial_event_id?: string;
}

export type EmployeeASO = EmployeeASOHistory;

export interface Employee {
  id: string;
  organization_id: string;
  client_id: string;
  client_unit_id: string;
  sector_id: string;
  job_id: string;
  ghe_id?: string;

  // eSocial Worker Identification
  name: string;
  cpf: string;
  nis_pis?: string;
  registration_number: string; // Matrícula no eSocial
  birth_date: string;
  admission_date: string;
  dismissal_date?: string;
  gender: 'M' | 'F';
  marital_status?: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'UNIAO_ESTAVEL';
  worker_category: WorkerCategoryType;
  employment_regime: EmploymentRegime;

  // Job & Role details
  job_title: string;
  role_title?: string;
  cbo: string;
  sector_name: string;
  unit_name: string;
  ghe_name?: string;

  // Health & Accessibility
  is_pcd: boolean;
  pcd_type?: 'FISICA' | 'AUDITIVA' | 'VISUAL' | 'INTELECTUAL' | 'MULTIPLA' | 'REABILITADO';
  blood_type?: string;

  // Status & ASO
  status: 'ACTIVE' | 'AWAY' | 'DISMISSED';
  current_aso_status: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'PENDING';
  last_aso_date?: string;
  next_aso_date?: string;
  periodic_exam_due_date?: string;

  // Contact
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  zip_code?: string;
  city?: string;
  state?: string;

  // Relations
  epis: EmployeeEPIItem[];
  aso_history: EmployeeASOHistory[];
  notes?: string;

  created_at: string;
  updated_at: string;
}

// 46. SST Hierarchy: Sectors & Jobs
export interface SSTHierarchySector {
  id: string;
  organization_id: string;
  client_id: string;
  client_unit_id: string;
  name: string;
  code?: string;
  description: string;
  environment_type: 'ADMINISTRATIVO' | 'OPERACIONAL_FECHADO' | 'OPERACIONAL_ABERTO' | 'LABORATORIO' | 'ESPACO_CONFINADO' | 'CANTEIRO_OBRA' | 'VEICULO_TRANSPORTE' | 'OUTROS';
  building_features?: string; // ex: Alvenaria, piso de concreto usinado, ventilação natural e exaustores mecânicos
  total_workers: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface SSTHierarchyJob {
  id: string;
  organization_id: string;
  client_id: string;
  sector_id: string;
  client_unit_id: string;
  name: string;
  cbo: string; // Código CBO 6 dígitos
  cbo_title: string;
  activities_description: string; // Descrição pormenorizada das atividades e tarefas exigida pelo MOS eSocial
  requirements_notes?: string;
  total_workers: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

// 47. GHE (Grupo Homogêneo de Exposição)
export interface SSTGroupHomogeneousExposure {
  id: string;
  organization_id: string;
  client_id: string;
  client_unit_id: string;
  code: string; // ex: "GHE-01"
  name: string; // ex: "GHE 01 - Soldadores e Montadores Estruturais"
  description: string;
  sector_ids: string[];
  job_ids: string[];
  work_schedule_description: string; // Jornada: 44h semanais, turno das 07:00 às 17:00 com 1h de intervalo
  environment_description: string;
  total_exposed_workers: number;
  created_at: string;
  updated_at: string;
}

// 48. Environmental Risk Inventory (PGR / LTCAT / eSocial S-2240)
export type RiskCategoryType = 'FÍSICO' | 'QUÍMICO' | 'BIOLÓGICO' | 'ERGONÔMICO' | 'ACIDENTES' | 'AUSÊNCIA_RISCO' | 'FISICO' | 'QUIMICO' | 'BIOLOGICO' | 'ERGONOMICO';
export type EnvironmentalRiskAgentCategory = RiskCategoryType;
export type RiskEvaluationType = 'QUALITATIVA' | 'QUANTITATIVA';
export type RiskLevelType = 'MUITO_BAIXO' | 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';

// 48.1 Global Occupational Risks Catalog / Tabela 24 eSocial
export interface OccupationalRiskEPISuggestion {
  ca_example?: string;
  name: string;
  protection_type: string;
  attenuation?: string;
}

export interface OccupationalRiskExamSuggestion {
  exam_code: string;
  exam_name: string;
  periodicity_months: number;
  triggers: Array<'ADMISSIONAL' | 'PERIODICO' | 'RETORNO_TRABALHO' | 'MUDANCA_RISCO' | 'DEMISSIONAL'>;
  mandatory_standard?: 'NR-07' | 'NR-11' | 'NR-15' | 'NR-35' | 'NR-33' | 'NR-10' | 'CRITERIO_MEDICO';
}

export interface OccupationalRiskCatalogItem {
  id: string;
  organization_id?: string;
  code_table_24: string; // ex: "01.01.001", "02.01.014"
  name: string;
  group: RiskCategoryType;
  category_color?: string;
  generating_sources: string; // Fontes geradoras comuns
  propagation_paths: string; // Vias de propagação / penetração no organismo
  health_effects: string; // Possíveis danos / patologias / CID-10
  evaluation_type: RiskEvaluationType;
  standard_unit?: string; // dB(A), mg/m³, ppm, m/s², IBUTG °C, etc.
  tolerance_limit_reference?: string; // Limite de tolerância (NR-15 / ACGIH)
  action_level_reference?: string; // Nível de ação (NR-09)
  measurement_methodology?: string; // Metodologia recomendada (NHO, NIOSH, OSHA)
  recommended_epcs: string; // Medidas de proteção coletivas
  recommended_epis: OccupationalRiskEPISuggestion[]; // EPIs recomendados
  suggested_exams_pcmso: OccupationalRiskExamSuggestion[]; // Exames PCMSO recomendados
  default_severity: 1 | 2 | 3 | 4 | 5;
  default_probability: 1 | 2 | 3 | 4 | 5;
  special_retirement_eligible: boolean; // LTCAT / Aposentadoria Especial (Dec. 3048/99)
  gfip_code_suggested: '00' | '01' | '02' | '03' | '04';
  insalubridade_applicable: boolean;
  insalubridade_degree_suggested?: '10%' | '20%' | '40%';
  insalubridade_legal_basis?: string;
  periculosidade_applicable: boolean;
  periculosidade_legal_basis?: string;
  is_system_default?: boolean;
  is_custom?: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;

  // Custom risk entry extras (user-editable items only)
  regulatory_norm_reference?: string;
  suggested_medium?: string;
  suggested_source?: string;
  suggested_measured_value?: number;
  suggested_controls_summary?: string;
  description?: string;
}

export interface SSTEnvironmentalRisk {
  id: string;
  organization_id: string;
  client_id: string;
  client_unit_id: string;
  ghe_id: string;
  sector_id?: string;
  job_id?: string;

  // eSocial Tabela 24
  risk_category: RiskCategoryType;
  risk_code_table_24: string; // ex: "01.01.001 - Ruído Contínuo ou Intermitente", "02.01.014 - Fumos Metálicos de Manganês"
  agent_name: string;
  generating_source: string; // Fonte geradora: ex: "Corte por plasma, solda MIG/MAG e lixamento"
  propagation_path: string; // Via de propagação: "Aérea", "Contato dérmico", etc.
  health_effects: string; // Possíveis danos: "PAIR, irritação respiratória, estresse térmico"

  // Exposure Evaluation & Metrics
  evaluation_type: RiskEvaluationType;
  measured_value?: string; // ex: "88.5"
  measurement_unit?: string; // ex: "dB(A)", "mg/m³", "ppm", "m/s²", "IBUTG °C"
  tolerance_limit?: string; // ex: "85.0 dB(A) para 8h (NR-15 Anexo 1)"
  action_level?: string; // ex: "80.0 dB(A) (NR-09)"
  measurement_methodology?: string; // ex: "NHO-01 Fundacentro com dosímetro integrador classe 1 calibrado RBC"

  // PGR Risk Matrix
  probability: 1 | 2 | 3 | 4 | 5;
  severity: 1 | 2 | 3 | 4 | 5;
  risk_level: RiskLevelType;

  // Controls & Protections
  epc_implemented: boolean;
  epc_description?: string;
  epc_effective: boolean;

  epi_required: boolean;
  epis: Array<{
    ca_number: string;
    epi_name: string;
    attenuation_factor?: string;
    is_effective: boolean;
    complies_with_nr06: boolean;
    uninterrupted_use: boolean;
    periodic_replacement: boolean;
    hygienic_conditions: boolean;
  }>;

  // Special Enquadramentos (LTCAT / Aposentadoria Especial & eSocial S-2240)
  special_retirement_applies: boolean;
  gfip_code: '00' | '01' | '02' | '03' | '04'; // 00: Sem exposição / 01: Não enseja / 02: 15 anos / 03: 20 anos / 04: 25 anos
  ltcat_technical_conclusion: string;

  // Insalubridade & Periculosidade
  insalubridade_applies: boolean;
  insalubridade_degree?: '10%' | '20%' | '40%';
  insalubridade_legal_basis?: string; // ex: "NR-15 Anexo nº 11 - Agentes Químicos"

  periculosidade_applies: boolean;
  periculosidade_legal_basis?: string; // ex: "NR-16 Anexo nº 2 - Inflamáveis"

  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

// 49. Occupational Exam Protocol (PCMSO / NR-07 / eSocial S-2220)
export interface SSTExamProtocol {
  id: string;
  organization_id: string;
  client_id: string;
  ghe_id: string;
  job_id?: string;
  risk_id?: string;

  // Tabela 27 eSocial
  exam_code_table_27: string; // ex: "0295 - Audiometria Tonal e Vocal", "0040 - Hemograma Completo", "0008 - Avaliação Clínica"
  exam_name: string;
  periodicity_months: number; // ex: 6, 12, 24
  triggers: Array<'ADMISSIONAL' | 'PERIODICO' | 'RETORNO_TRABALHO' | 'MUDANCA_RISCO' | 'DEMISSIONAL'>;
  mandatory_by_standard: 'NR-07' | 'NR-11' | 'NR-15' | 'NR-35' | 'NR-33' | 'NR-10' | 'CRITERIO_MEDICO';
  preparation_instructions?: string; // ex: "Repouso auditivo de 14h antes do exame", "Jejum de 8h"
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

// 50. CAT Record (S-2210)
export interface SSTCATRecord {
  id: string;
  organization_id: string;
  client_id: string;
  employee_id: string;
  cat_number: string; // CAT-2026-0001
  esocial_event_id?: string;
  
  // Worker Snapshot
  worker_name: string;
  employee_name?: string;
  worker_cpf: string;
  worker_registration: string;
  worker_cbo: string;
  worker_role: string;

  // Accident Info
  cat_type: 'INICIAL' | 'REABERTURA' | 'COMUNICACAO_OBITO';
  accident_date: string;
  accident_time: string;
  accident_type: 'TIPICO' | 'TRAJETO' | 'DOENCA_OCUPACIONAL';
  hours_worked_before_accident: string;
  death_occurred: boolean;
  death_date?: string;
  police_report: boolean;
  police_report_number?: string;

  // Location
  location_type: 'ESTABELECIMENTO_EMPREGADOR' | 'EMPRESA_TERCEIRA' | 'VIA_PUBLICA' | 'EMBARCACAO' | 'OUTROS';
  location_description: string;
  location_address?: string;
  accident_location?: string;

  // Lesion details (Tabelas eSocial 13, 14, 15)
  body_part_code: string; // ex: "75.20.00 - Mão (exceto punho ou dedos)"
  body_part_name: string;
  affected_body_part?: string;
  causative_agent_code: string; // ex: "30.10.10 - Máquina operatriz"
  causative_agent_name: string;
  causative_agent?: string;
  nature_lesion_code?: string; // ex: "Corte, Laceração"

  // Medical Certificate
  medical_name: string;
  medical_crm: string;
  medical_uf: string;
  cid_10: string; // ex: "S61.0 - Ferimento de dedo sem lesão da unha"
  days_away: number;
  caused_absence?: boolean;
  treatment_type: 'AMBULATORIAL' | 'INTERNACAO';

  // Status & eSocial Protocol
  status: 'DRAFT' | 'READY_TO_SEND' | 'TRANSMITTED' | 'REJECTED';
  receipt_number?: string;
  protocol_number?: string;
  created_at: string;
}

// 51. Work Absence Record (S-2230)
export interface SSTWorkAbsence {
  id: string;
  organization_id: string;
  client_id: string;
  employee_id: string;
  esocial_event_id?: string;

  // Worker Snapshot
  worker_name: string;
  worker_cpf: string;
  worker_registration: string;
  worker_cbo: string;

  // Absence Data (Tabela 18 eSocial)
  reason_code_table_18: string; // ex: "01 - Acidente de trabalho / doença do trabalho", "03 - Doença não relacionada ao trabalho", "17 - Licença maternidade"
  reason_description: string;
  start_date: string;
  end_date?: string;
  estimated_days: number;
  is_traffic_accident: boolean;

  // Medical Certificate
  physician_name: string;
  physician_crm: string;
  physician_uf: string;
  cid_10?: string;

  status: 'ACTIVE_AWAY' | 'RETURNED' | 'CANCELLED';
  created_at: string;
}

// ==========================================
// 52. Comprehensive EPI Management Architecture (NR-06, NR-01 & eSocial S-2240)
// ==========================================

export type SSTWorkOrderSignatureMethod = 'PHYSICAL_MANUAL' | 'DIGITAL_BIOMETRIC' | 'ELECTRONIC_TOKEN';
export type SSTWorkOrderStatus = 'ACTIVE' | 'ARCHIVED' | 'REVISED';

export interface SSTWorkOrderOS {
  id: string;
  organization_id: string;
  client_id: string;
  client_name?: string;
  employee_id: string;
  
  // Header / Identification
  os_code: string; // ex: OS-2026-0001
  revision: number;
  issue_date: string;
  validity_start_date: string;
  
  // Employer Info
  employer_name: string;
  employer_document: string;
  employer_cnae?: string;
  employer_risk_grade?: number;
  establishment_address?: string;
  
  // Employee Info
  employee_name: string;
  employee_cpf: string;
  employee_registration: string;
  employee_job_title: string;
  employee_cbo?: string;
  employee_sector: string;
  employee_unit: string;
  employee_admission_date: string;
  employee_ghe_id?: string;
  employee_ghe_name?: string;
  
  // Job Description / Routine Activities (CBO & Description)
  job_description: string;
  routine_activities: string[];
  
  // Identified Hazards & Occupational Risks (NR-01 / PGR & eSocial S-2240)
  physical_risks: string[];
  chemical_risks: string[];
  biological_risks: string[];
  ergonomic_risks: string[];
  accident_mechanical_risks: string[];
  
  // Protective Measures & Prevention (EPC & Procedures)
  collective_protections_epc: string[];
  mandatory_epis: {
    epi_name: string;
    ca_number: string;
    protection_type: string;
    usage_recommendation: string;
  }[];
  
  // Safe Work Procedures & Rules
  safe_work_procedures: string[];
  mandatory_employee_obligations: string[];
  prohibitions_unsafe_acts: string[];
  
  // Emergency & Accident Procedures
  emergency_accident_conduct: string[];
  
  // Disciplinary Sanctions (Art. 158 CLT & NR-01)
  disciplinary_sanctions_text: string;
  
  // Legal Framework & Signature metadata
  legal_framework: string; // "NR-01 (Portaria MTP 4.219/2022) e Art. 157 da CLT"
  employee_signed: boolean;
  signed_at?: string;
  signature_method: SSTWorkOrderSignatureMethod;
  signature_photo_url?: string;
  signature_hash?: string;
  responsible_engineer_name: string;
  responsible_engineer_registration: string;
  
  status: SSTWorkOrderStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type EPITypeProtection = 
  | 'CABECA' // Capacete, touca
  | 'OLHOS_FACE' // Óculos, protetor facial, máscara de solda
  | 'AUDITIVA' // Protetor auricular plug, concha
  | 'RESPIRATORIA' // PFF2, N95, máscara semi-facial, filtro químico
  | 'TRONCO' // Avental, vestimenta térmica, capa
  | 'MEMBROS_SUPERIORES' // Luvas látex, vaqueta, nitrílica, mangote
  | 'MEMBROS_INFERIORES' // Botina de segurança, biqueira composite, perneira
  | 'CORPO_INTEIRO' // Macacão químico, vestimenta arco elétrico
  | 'ALTURA_QUEDA' // Cinto paraquedista, talabarte, trava-quedas (NR-35)
  | 'OUTROS';

export type EPIDeliveryMethod = 'FACIAL_BIOMETRIC' | 'DIGITAL_SIGNATURE' | 'MANUAL_SHEET' | 'BATCH_DISPENSING';

export type EPIDeliveryReason = 
  | 'ADMISSAO' 
  | 'PERIODICA_SUBSTITUICAO' 
  | 'DESGASTE_DANIFICADO' 
  | 'EXTRAVIO' 
  | 'MUDANCA_FUNCAO' 
  | 'ADEQUACAO_RISCO';

export interface EPICatalogItem {
  id: string;
  organization_id: string;
  ca_number: string; // Certificado de Aprovação MTE
  name: string;
  manufacturer: string;
  model_description: string;
  protection_type: EPITypeProtection;
  ca_validity_date: string;
  ca_status: 'VALID' | 'EXPIRED' | 'SUSPENDED';
  standard_validity_days: number; // Vida útil estimada em dias (ex: 90 dias)
  unit_cost?: number;
  stock_quantity: number;
  min_stock_alert: number;
  barcode_sku?: string;
  technical_sheet_notes?: string;
  // eSocial Tabela 24 compatibilidade
  esocial_code_table_24?: string;
  created_at: string;
  updated_at: string;
}

export interface EPIDeliveryRecord {
  id: string;
  organization_id: string;
  client_id: string;
  client_name?: string;
  employee_id: string;
  employee_name: string;
  employee_cpf: string;
  employee_registration: string;
  employee_job: string;
  employee_sector: string;
  
  epi_id: string;
  ca_number: string;
  epi_name: string;
  manufacturer?: string;
  quantity: number;
  
  delivery_date: string;
  delivery_time: string;
  replacement_due_date: string;
  delivery_reason: EPIDeliveryReason;
  delivery_method: EPIDeliveryMethod;
  delivered_by_user_name: string;
  
  // Biometric / Digital Evidence (Legal NR-06 & Portaria MTP 672)
  biometric_face_matched: boolean;
  biometric_confidence?: number;
  biometric_photo_data_url?: string;
  biometric_timestamp?: string;
  
  signature_data_url?: string;
  sheet_protocol_code?: string;
  sheet_signed_upload_url?: string;
  
  // Declarations & Legal terms accepted
  term_receipt_accepted: boolean;
  training_received: boolean;
  hygiene_guidance_received: boolean;
  
  status: 'DELIVERED' | 'RETURNED' | 'DISCARDED' | 'PENDING_PHYSICAL_SIGNATURE';
  return_date?: string;
  return_reason?: string;
  return_condition?: 'BOM' | 'DANIFICADO' | 'DESCARTE';
  
  notes?: string;
  created_at: string;
}

// ==========================================
// 53. SST Integration Trainings & Legal Attendance Lists (NR-01 item 1.7)
// ==========================================
export type TrainingModality = 'PRESENCIAL' | 'SEMIPRESENCIAL' | 'EAD' | 'PRESENTIAL' | 'HYBRID' | 'EAD_DISTANCE';
export type TrainingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type IntegrationTrainingType = 'ADMISSION_INTEGRATION' | 'PERIODIC_REFRESHER' | 'ROLE_CHANGE' | 'RETURN_TO_WORK' | 'SPECIAL_NR';

export interface TrainingAttendee {
  employee_id: string;
  employee_name: string;
  employee_cpf: string;
  employee_registration?: string;
  employee_job_title: string;
  employee_sector: string;
  employee_ghe_name?: string;
  present?: boolean;
  completed?: boolean;
  score_grade?: number; // 0-100%
  grade_score?: number; // 0-10
  attendance_rate_percent?: number;
  approved?: boolean;
  signed?: boolean;
  signature_type?: 'MANUAL' | 'DIGITAL_BIOMETRIC' | 'ELECTRONIC_TOKEN';
  signature_method?: string;
  signature_timestamp?: string;
  issued_at?: string;
  signature_photo_url?: string;
  signature_hash?: string;
  certificate_code?: string;
}

export interface SSTIntegrationTraining {
  id: string;
  organization_id: string;
  client_id: string;
  client_name?: string;

  // Training Identification
  code?: string; // ex: TR-INT-2026-001
  training_code?: string; // legacy alias for code
  title?: string; // ex: Treinamento Admissional de Integração em SST (NR-01)
  training_title?: string; // legacy alias for title
  training_type?: IntegrationTrainingType;
  normative_reference?: string; // "NR-01 (Portaria MTP nº 4.219/2022) e NR-06"
  nr_framework?: string; // legacy alias for normative_reference
  modality: TrainingModality;
  training_modality?: string;
  workload_hours: number; // ex: 4, 6, 8 horas
  validity_months?: number;
  status: TrainingStatus;

  // Dates & Location
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  training_date?: string;
  valid_until?: string;
  schedule_time?: string; // ex: "08:00 às 12:00"
  location?: string; // ex: "Sala de Treinamento SESMT - Unidade Matriz"
  location_or_platform?: string; // legacy alias for location

  // Legal Requirements & Syllabus (Conteúdo Programático Exigido por Lei)
  syllabus?: string[];
  program_content_syllabus?: string[]; // legacy alias for syllabus
  evaluation_method?: string; // ex: "Avaliação prática e teórica com aproveitamento mínimo de 70%"
  training_evaluation_method?: string; // legacy alias for evaluation_method
  certificate_validity_legal_statement?: string;

  // Instructor / Technical Responsible (Qualificação e Registro Legal)
  instructor_name: string;
  instructor_qualification: string; // ex: "Engenheiro de Segurança do Trabalho" / "Técnico em Segurança do Trabalho"
  instructor_registration?: string; // ex: "CREA-SP 5061234567" ou "MTE/SP 0012345"
  instructor_registration_number?: string; // legacy alias for instructor_registration
  instructor_cpf?: string;

  // Responsible Technical Director / Engineer
  technical_manager_name?: string;
  technical_manager_registration?: string;
  technical_supervisor_name?: string; // legacy alias for technical_manager_name
  technical_supervisor_qualification?: string;
  technical_supervisor_registration?: string; // legacy alias for technical_manager_registration

  // Attendees & Attendance Records
  attendees: TrainingAttendee[];

  notes?: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// 54. SST Accident & Incident Investigation (NR-01, NR-04, NR-05, NBR 14280, 5W2H)
// ==========================================
export type AccidentIncidentType = 
  | 'ACIDENTE_COM_AFASTAMENTO'    // CPT - Com Perda de Tempo
  | 'ACIDENTE_SEM_AFASTAMENTO'    // SPT - Sem Perda de Tempo
  | 'ACIDENTE_TRAJETO'            // Trajeto residência-trabalho
  | 'INCIDENTE_QUASE_ACIDENTE'    // Near Miss / Quase-Acidente
  | 'DOENCA_OCUPACIONAL';         // Agravo / Doença do Trabalho

export type IncidentSeverity = 'LEVE' | 'MODERADA' | 'GRAVE' | 'CRITICA' | 'FATAL';

export type InvestigationMethod = 'CINCO_PORQUES' | 'ISHIKAWA_6M' | 'ARVORE_CAUSAS' | 'COMBINADA';

export interface AccidentWitness {
  id: string;
  is_employee?: boolean;
  is_company_employee?: boolean;
  employee_id?: string;
  name?: string;
  witness_name?: string;
  cpf?: string;
  witness_document?: string;
  role?: string;
  witness_job_title?: string;
  witness_role?: string;
  sector?: string;
  phone?: string;
  witness_phone?: string;
  statement?: string; // Relato do depoimento
  statement_text?: string;
  witness_statement?: string;
  statement_date: string;
}

export interface AccidentAttachment {
  id: string;
  type?: 'IMAGE' | 'PDF';
  file_type?: 'IMAGE' | 'PDF' | 'DOCUMENT';
  category?: 'LOCAL_PHOTO' | 'MEDICAL_REPORT' | 'POLICE_REPORT' | 'EQUIPMENT_PHOTO' | 'OTHER';
  title: string;
  description?: string;
  file_url: string; // Data URL ou link
  url?: string;
  file_name: string;
  file_size?: string;
  uploaded_at: string;
}

export interface ActionPlanItem5W2H {
  id: string;
  what: string;       // O que será feito (Ação)
  why: string;        // Por que será feito (Justificativa / Causa raiz)
  where: string;      // Onde será feito (Local / Setor)
  who?: string;        // Quem fará (Responsável)
  who_responsible?: string;
  when?: string;       // Quando será concluído (Prazo)
  when_deadline?: string;
  how: string;        // Como será feito (Procedimento)
  how_much?: string | number;   // Quanto custará (Custo / Recursos)
  how_much_cost?: number;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'EFICACIA_VALIDADA' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  completion_date?: string;
  effectiveness_notes?: string;
}

export interface FiveWhysAnalysis {
  why_1: string;
  why_2: string;
  why_3: string;
  why_4: string;
  why_5: string;
  root_cause: string;
}

export interface IshikawaFactors {
  method?: string;       // Método / Procedimento operacional
  machine?: string;      // Máquinas / Equipamentos / Ferramental
  material?: string;     // Matéria-prima / EPI / Insumos
  manpower?: string;     // Mão de Obra / Capacitação / Fadiga
  measurement?: string;  // Medição / Inspeção / Controle
  environment?: string;  // Meio Ambiente / Espaço / Iluminação / Ruído
}

export interface SSTAccidentIncidentRecord {
  id: string;
  organization_id: string;
  client_id: string;
  client_name?: string;
  code: string; // ex: ACID-2026-001 ou INC-2026-003
  title: string;
  type: AccidentIncidentType;
  severity: IncidentSeverity;
  occurrence_date: string;
  occurrence_time: string;
  shift?: 'MANHA' | 'TARDE' | 'NOITE' | 'ADMINISTRATIVO' | 'REVEZAMENTO';
  
  // Localização & Setor
  unit_id?: string;
  unit_name: string;
  sector_id?: string;
  sector_name: string;
  exact_location: string; // ex: Linha de Montagem 02, Próximo à Prensa P-04
  
  // Vítima / Colaborador Envolvido (se houver)
  has_victim: boolean;
  employee_id?: string;
  employee_name?: string;
  employee_cpf?: string;
  employee_role?: string;
  employee_registration?: string;
  time_in_role?: string; // ex: 2 anos e 4 meses
  days_away?: number;    // Dias perdidos
  days_debited?: number; // Dias debitados conforme NBR 14280
  
  // Vínculo com CAT (opcional / Puxar dados de CAT aberta)
  linked_cat_id?: string;
  linked_cat_number?: string;
  cid_10?: string;
  body_part?: string;
  causative_agent?: string;
  nature_lesion?: string;
  
  // Descrição Detalhada dos Fatos
  detailed_description: string;
  immediate_actions_taken: string; // Primeiros socorros, isolamento, parada de máquina
  
  // Análise de Causa Raiz
  investigation_method: InvestigationMethod;
  five_whys?: FiveWhysAnalysis;
  ishikawa?: IshikawaFactors;
  contributing_factors?: string[]; // Fatores humanos, organizacionais, ambientais
  root_cause_summary: string;
  
  // Testemunhas & Depoimentos
  witnesses: AccidentWitness[];
  
  // Evidências Fotográficas & Documentos PDF
  attachments: AccidentAttachment[];
  
  // Plano de Ação 5W2H (NR-01 item 1.5.5)
  action_plan: ActionPlanItem5W2H[];
  
  // Comitê de Investigação (SESMT / CIPA)
  investigator_name: string;
  investigator_role: string;
  cipa_representative_name?: string;
  manager_name?: string;
  investigation_date: string;
  status: 'EM_INVESTIGACAO' | 'PLANO_DE_ACAO' | 'AGUARDANDO_EFICACIA' | 'CONCLUIDO' | 'CANCELADO';
  
  // Compatibility & Extended Properties
  occurrence_type?: string;
  classification?: string;
  severity_level?: string;
  body_part_affected?: string;
  causing_agent?: string;
  days_absent?: number;
  investigation_status?: string;
  personal_insecurity_factor?: string;
  unsafe_condition_environment?: string;
  investigation_lead_name?: string;
  cipa_member_name?: string;
  employee_admission_date?: string;
  employee_sector?: string;
  employee_unit?: string;
  employee_job_title?: string;
  photos?: any[];
  witness_statements?: any[];
  prevention_plan_items?: any[];
  action_plan_5w2h?: ActionPlanItem5W2H[];

  created_at: string;
  updated_at: string;
}

// ==========================================
// 55. SST Electronic Signature & Digital Acceptance (Lei 14.063/2020 & MP 2.200-2/2001)
// ==========================================
export type SSTDocumentSignatureType = 
  | 'PGR'
  | 'PGRTR'
  | 'PCMSO'
  | 'LTCAT'
  | 'LAUDO_INSALUBRIDADE'
  | 'LAUDO_PERICULOSIDADE'
  | 'ORDEM_SERVICO'
  | 'FICHA_EPI'
  | 'CERTIFICADO_TREINAMENTO'
  | 'RELATORIO_ACIDENTE_RIAA'
  | 'ESOCIAL_S2210'
  | 'ESOCIAL_S2220'
  | 'ESOCIAL_S2240'
  | 'KIT_ADMISSIONAL'
  | 'OUTRO';

export type SignerRoleType = 
  | 'TECHNICAL_RESPONSIBLE'    // Eng. de Segurança / TST / Médico do Trabalho
  | 'EMPLOYER_REPRESENTATIVE'  // Representante Legal / Gestor de RH / Diretor
  | 'EMPLOYEE'                 // Trabalhador / Operador
  | 'CIPA_REPRESENTATIVE'      // Presidente ou Vice da CIPA
  | 'AUDITOR';                 // Auditor ou Perito

export type SignatureMode = 
  | 'DIGITAL_CERTIFICATE_ICP'  // Certificado ICP-Brasil (A1 / A3 / Nuvem)
  | 'ELECTRONIC_PORTAL'        // Assinatura Eletrônica Avançada (Portal + CPF + OTP/Autenticação)
  | 'BIOMETRIC_DRAW'           // Rubrica / Assinatura Manuscrita em Tela Touch/Mouse
  | 'TOKEN_OTP'                // Token de Verificação por E-mail / WhatsApp
  | 'DIGITALIZED_RUBRIC';      // Carimbo Digital com Rubrica Gráfica

export type SSTSignatureStatus = 'PENDING' | 'PARTIALLY_SIGNED' | 'SIGNED' | 'REJECTED' | 'EXPIRED';

export interface DocumentSigner {
  id: string;
  signer_role: SignerRoleType;
  role_type?: SignerRoleType;
  name: string;
  email: string;
  phone?: string;
  cpf: string;
  role_title: string; // Ex: Eng. de Segurança do Trabalho - CREA 12345/D ou Diretor Industrial
  role_description?: string;
  professional_council_number?: string; // CREA / CRM / MTE / RQE
  signature_status: 'PENDING' | 'SIGNED' | 'REJECTED';
  signed_at?: string;
  signature_mode?: SignatureMode;
  signature_hash?: string;
  ip_address?: string;
  user_agent?: string;
  signature_image_url?: string;
  compliance_statement?: string;
  rejection_reason?: string;
  security_auth_code?: string;
}

export interface SSTSignatureAuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor_name: string;
  actor_cpf?: string;
  /** E-mail de quem agiu. Antes o e-mail era gravado em actor_cpf. */
  actor_email?: string;
  ip_address: string;
  details: string;
}

export interface SSTDocumentSignature {
  id: string;
  organization_id: string;
  client_id: string;
  client_name: string;
  document_type: SSTDocumentSignatureType;
  document_title: string;
  document_number: string; // ex: PGR-2026-001, OS-2026-045, S2240-2026-89
  document_reference_id?: string; // Link to OS, Document, Cat, Training, etc.
  created_at: string;
  updated_at: string;
  expires_at?: string;
  status: SSTSignatureStatus;
  signers: DocumentSigner[];
  document_sha256: string;
  legal_framework: string; // "Lei Federal 14.063/2020, MP 2.200-2/2001, Portaria MTP 672/2021"
  qr_code_verification_url: string;
  notes?: string;
  audit_trail: SSTSignatureAuditLog[];
}

// ==========================================
// 56. CIPA (NR-05), CIPATR (NR-31.7) & CIPAMIN (NR-22.36) Management
// ==========================================

export type CipaRegulatoryNorm = 
  | 'NR-05'      // CIPA Geral (Indústria, Comércio, Serviços)
  | 'NR-31.7'    // CIPATR (Comissão Interna de Prevenção de Acidentes no Trabalho Rural)
  | 'NR-22.36'   // CIPAMIN (Comissão Interna de Prevenção de Acidentes na Mineração)
  | 'NR-18.17'   // CIPA na Construção Civil
  | 'NR-30'      // CIPAT (Trabalho Aquaviário)
  | 'NR-32';     // CIPA em Serviços de Saúde

export type CipaProcessStatus = 
  | 'DRAFT'
  | 'CONVOCATION_PUBLISHED'       // Edital publicado (D-60 a D-45)
  | 'COMMISSION_CONSTITUTED'      // Comissão Eleitoral constituída
  | 'CANDIDACIES_OPEN'           // Inscrições abertas (min 15 dias)
  | 'CANDIDACIES_CLOSED'         // Inscrições encerradas / Homologação
  | 'VOTING_IN_PROGRESS'         // Votação secreta em andamento (D-30)
  | 'SCRUTINY_COMPLETED'         // Apuração e desempates concluídos
  | 'TRAINING_IN_PROGRESS'       // Treinamento obrigatório (Lei 14.457/2022)
  | 'INAUGURATION_COMPLETED'     // Posse realizada e ata lavrada
  | 'ACTIVE_MANDATE'             // Mandato vigente (Reuniões ordinárias mensais)
  | 'ARCHIVED';

export type CipaElectedRole = 'PRESIDENT' | 'VICE_PRESIDENT' | 'SECRETARY' | 'SUBSTITUTE_SECRETARY' | 'TITULAR' | 'SUPLENTE' | 'NOT_ELECTED';

export type CipaRepresentedParty = 'EMPLOYER' | 'EMPLOYEE';

export interface CipaDimensioningResult {
  norm: CipaRegulatoryNorm;
  risk_grade: 1 | 2 | 3 | 4;
  total_employees: number;
  effective_members_employer: number;
  substitute_members_employer: number;
  effective_members_employee: number;
  substitute_members_employee: number;
  total_members: number;
  is_designated_only: boolean; // Se dispensa comissão completa e exige apenas Designado CIPA
  training_hours_required: number; // 8h (Grau 1), 12h (Grau 2), 16h (Grau 3), 20h (Grau 4)
  includes_harassment_module: boolean; // Lei 14.457/2022 obrigatório
}

export interface CipaElectoralTimeline {
  convocation_date: string;         // Data de convocação oficial
  edital_publication_date: string;  // Publicação do edital de eleição (mín 45 dias antes do fim do mandato)
  commission_formation_date: string;// Constituição da comissão eleitoral
  candidacy_start_date: string;     // Início das inscrições (min 15 dias de duração)
  candidacy_end_date: string;       // Fim das inscrições
  voter_list_publication_date: string; // Publicação da relação de eleitores aptos
  candidate_list_publication_date: string; // Publicação dos candidatos homologados
  voting_start_date: string;        // Início da votação secreta (mín 30 dias antes do término)
  voting_end_date: string;          // Fim da votação secreta
  scrutiny_date: string;            // Apuração dos votos
  training_start_date: string;      // Início do treinamento dos eleitos e indicados
  training_end_date: string;        // Fim do treinamento
  inauguration_date: string;        // Data de posse oficial dos membros
  mandate_end_date: string;         // Término do mandato de 1 ano
}

export interface CipaElectoralCommissionMember {
  id: string;
  name: string;
  cpf: string;
  role: 'PRESIDENT' | 'SECRETARY' | 'MEMBER';
  represented_party: CipaRepresentedParty;
  department: string;
}

export interface CipaCandidate {
  id: string;
  name: string;
  cpf: string;
  department: string;
  job_title: string;
  candidacy_number: string;
  photo_url?: string;
  proposals?: string;
  registration_date: string;
  is_eligible: boolean;
  has_stability_protection: boolean; // Art. 10, II, "a" do ADCT (registro até 1 ano após mandato)
  votes_received: number;
  elected_role?: CipaElectedRole;
  tiebreaker_seniority_months: number; // Tempo de serviço na empresa (critério de desempate NR-05)
  tiebreaker_age_years: number;         // Maior idade (segundo critério de desempate)
}

export interface CipaEmployerAppointee {
  id: string;
  name: string;
  cpf: string;
  role: 'PRESIDENT' | 'TITULAR' | 'SUPLENTE' | 'SECRETARY';
  job_title: string;
  department: string;
  is_president: boolean; // Presidente é sempre indicado pelo empregador (NR-05)
  training_completed: boolean;
  training_hours: number;
}

export type CipaVoteVerificationMethod = 
  | 'FACIAL_BIOMETRICS'     // Biometria Facial no Navegador / Câmera
  | 'DIGITAL_SIGNATURE'     // Token Criptográfico / OTP
  | 'CORPORATE_SSO'         // Autenticação Corporativa (LDAP / Google / Microsoft)
  | 'HYBRID_IN_PERSON';     // Cédula Física com Registro Digital

export interface CipaAuditVote {
  id: string;
  anonymous_vote_hash: string;       // Hash criptográfico irreversível (garante voto secreto)
  voter_cpf_masked: string;          // Ex: ***.456.789-** (para auditoria de quórum sem quebrar sigilo)
  verification_method: CipaVoteVerificationMethod;
  facial_biometric_confidence?: number;
  casted_at: string;
  ip_address?: string;
  audit_proof_receipt: string;       // Código único do comprovante de votação
}

export interface CipaMeetingRecord {
  id: string;
  meeting_number: number;           // 1 a 12 (Reuniões ordinárias mensais)
  type: 'ORDINARY' | 'EXTRAORDINARY';
  date: string;
  title: string;
  agenda_topics: string[];
  attendees_count: number;
  ata_document_sha256?: string;
  is_signed_by_all: boolean;
}

export interface CipaManagementProcess {
  id: string;
  client_id: string;
  client_name: string;
  unit_id?: string;
  norm: CipaRegulatoryNorm;
  status: CipaProcessStatus;
  mandate_year: string;              // Ex: 2026/2027
  cnae: string;
  risk_grade: 1 | 2 | 3 | 4;
  total_employees: number;
  total_eligible_voters: number;
  total_votes_cast: number;
  quorum_percentage: number;         // Quórum mínimo legal é 50% dos empregados
  dimensioning: CipaDimensioningResult;
  timeline: CipaElectoralTimeline;
  electoral_commission: CipaElectoralCommissionMember[];
  employer_appointees: CipaEmployerAppointee[];
  candidates: CipaCandidate[];
  audit_votes: CipaAuditVote[];
  meetings: CipaMeetingRecord[];
  generated_documents: {
    id: string;
    type: 'CONVOCATION_NOTICE' | 'COMMISSION_CONSTITUTION' | 'CANDIDATE_LIST' | 'BALLOT_PAPER' | 'ELECTION_SCRUTINY_ATA' | 'INAUGURATION_ATA' | 'ANNUAL_MEETING_CALENDAR' | 'TRAINING_CERTIFICATE';
    title: string;
    generated_at: string;
    sha256: string;
  }[];
}

