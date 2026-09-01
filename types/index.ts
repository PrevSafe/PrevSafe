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

export type ChannelType = 'WHATSAPP' | 'EMAIL' | 'SMS' | 'PORTAL';

export type RecurrenceType = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'CUSTOM';

// 14.1 Organizations
export interface Organization {
  id: string;
  name: string;
  legal_name: string;
  document_number: string; // CNPJ
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

// 15. Profiles
export interface Profile {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  avatar_url?: string;
  role: RoleType;
  client_id?: string; // If client user
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

// 18. Clients
export interface Client {
  id: string;
  organization_id: string;
  legal_name: string;
  trade_name: string;
  document_number: string; // CNPJ
  main_cnae: string;
  cnae_description?: string;
  risk_degree: 1 | 2 | 3 | 4;
  employee_count: number;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
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
  address: string;
  city: string;
  state: string;
  cnae: string;
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
  related_entity_type?: 'PROPOSAL' | 'CONTRACT' | 'SERVICE_ORDER' | 'DOCUMENT' | 'REQUEST' | 'ESOCIAL_EVENT';
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
    | 'ESOCIAL_EVENT_EXCLUDED';
  entity_type: 'CLIENT' | 'PROPOSAL' | 'CONTRACT' | 'SERVICE_ORDER' | 'STAGE' | 'TASK' | 'DOCUMENT' | 'REQUEST' | 'EVALUATION' | 'ESOCIAL_EVENT' | 'ESOCIAL_BATCH';
  entity_id: string;
  entity_number?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  ip_address: string;
  user_agent?: string;
  created_at: string;
}

// 44. eSocial SST Events Management Types
export type ESocialEventType = 'S-2210' | 'S-2220' | 'S-2240' | 'S-3000';
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

export interface ESocialExclusionData {
  target_event_type: 'S-2210' | 'S-2220' | 'S-2240';
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

