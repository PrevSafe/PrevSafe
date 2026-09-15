import { 
  Organization, 
  Profile, 
  Client, 
  ClientContact, 
  ClientUnit, 
  Lead, 
  Opportunity, 
  Proposal, 
  Contract, 
  ServiceTemplate, 
  ServiceOrder, 
  Document, 
  RequestItem, 
  Notification, 
  NotificationTemplate, 
  Communication, 
  Evaluation, 
  AuditLog,
  ESocialEvent,
  ESocialBatch,
  ESocialConfig,
  FinancialTransaction,
  Employee,
  SSTHierarchySector,
  SSTHierarchyJob,
  SSTGroupHomogeneousExposure,
  SSTEnvironmentalRisk,
  SSTExamProtocol,
  SSTCATRecord,
  SSTWorkAbsence,
  EPICatalogItem,
  EPIDeliveryRecord,
  SSTWorkOrderOS,
  SSTIntegrationTraining,
  SSTAccidentIncidentRecord,
  SSTDocumentSignature
} from '@/types';

export const INITIAL_ORGANIZATION: Organization = {
  id: 'org-prevsafe-01',
  name: 'PrevSafe Consultoria & Engenharia SST',
  legal_name: 'PrevSafe Gestão de Segurança e Saúde no Trabalho Ltda',
  document_number: '12.345.678/0001-90',
  email: 'contato@prevsafesst.com.br',
  phone: '(11) 3450-9900',
  status: 'ACTIVE',
  theme_settings: {
    primary_color: '#10b981',
    primary_hover: '#059669',
    secondary_color: '#064e3b',
    accent_color: '#06b6d4',
    pwa_theme_color: '#022c22',
    portal_brand_name: 'PrevSafe Gestão SST',
    portal_tagline: 'SaaS Multi-tenant de Digitalização e Gestão SST',
    pwa_app_title: 'PrevSafe Field PWA',
    pwa_icon_emoji: '🛡️',
    border_radius: 'rounded-2xl',
    contrast_mode: 'balanced',
    enable_glow: true
  },
  created_at: '2026-01-01T08:00:00Z',
  updated_at: '2026-01-01T08:00:00Z'
};

export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'user-admin-01',
    organization_id: 'org-prevsafe-01',
    full_name: 'Carlos Mendes',
    email: 'carlos.mendes@prevsafe.com.br',
    phone: '(11) 98888-1001',
    whatsapp: '5511988881001',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'ADMIN',
    department: 'Diretoria Executiva',
    job_title: 'Diretor de Operações & Administrador Geral',
    professional_register: 'CREA 5061928371-SP',
    status: 'ACTIVE',
    two_factor_enabled: true,
    last_login_at: '2026-08-27T13:45:00Z',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'user-manager-01',
    organization_id: 'org-prevsafe-01',
    full_name: 'Dra. Juliana Vasconcelos',
    email: 'mariana.siqueira@prevsafe.com.br',
    phone: '(11) 98888-1002',
    whatsapp: '5511988881002',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    role: 'GESTOR',
    department: 'Coordenação de SST & Saúde',
    job_title: 'Gestora Técnica de Projetos & Médica do Trabalho',
    professional_register: 'CRM 149.202-SP / RQE 8820',
    status: 'ACTIVE',
    two_factor_enabled: true,
    last_login_at: '2026-08-27T12:10:00Z',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'user-commercial-01',
    organization_id: 'org-prevsafe-01',
    full_name: 'Ricardo Braga',
    email: 'ricardo.braga@prevsafe.com.br',
    phone: '(11) 98888-1003',
    whatsapp: '5511988881003',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'COMERCIAL',
    department: 'Expansão Comercial',
    job_title: 'Executivo de Contas SST',
    status: 'ACTIVE',
    two_factor_enabled: false,
    last_login_at: '2026-08-26T16:20:00Z',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'user-tech-01',
    organization_id: 'org-prevsafe-01',
    full_name: 'Eng. Roberto Silva',
    email: 'eduardo.vasconcelos@prevsafe.com.br',
    phone: '(11) 98888-1004',
    whatsapp: '5511988881004',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'TÉCNICO',
    department: 'Engenharia de Campo',
    job_title: 'Engenheiro de Segurança do Trabalho',
    professional_register: 'CREA/CONFEA 50781920-SP',
    status: 'ACTIVE',
    two_factor_enabled: true,
    last_login_at: '2026-08-27T11:00:00Z',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'user-tech-02',
    organization_id: 'org-prevsafe-01',
    full_name: 'Marcos Vinícius Prado',
    email: 'marcos.prado@prevsafe.com.br',
    phone: '(11) 98888-1006',
    whatsapp: '5511988881006',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    role: 'TÉCNICO',
    department: 'Higiene Ocupacional',
    job_title: 'Técnico em Segurança do Trabalho',
    professional_register: 'MTE 0048192/SP',
    status: 'ACTIVE',
    two_factor_enabled: false,
    last_login_at: '2026-08-25T09:30:00Z',
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-01-15T08:00:00Z'
  },
  {
    id: 'user-fin-01',
    organization_id: 'org-prevsafe-01',
    full_name: 'Camila Frota',
    email: 'camila.frota@prevsafe.com.br',
    phone: '(11) 98888-1005',
    whatsapp: '5511988881005',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    role: 'FINANCEIRO',
    department: 'Controladoria & Faturamento',
    job_title: 'Analista Financeira Plena',
    status: 'ACTIVE',
    two_factor_enabled: true,
    last_login_at: '2026-08-27T10:15:00Z',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'user-client-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    full_name: 'Dra. Beatriz Santos',
    email: 'joao.alencar@valencametal.com.br',
    phone: '(11) 97777-2001',
    whatsapp: '5511977772001',
    avatar_url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
    role: 'CLIENTE_ADMIN',
    department: 'Diretoria de Gente & Gestão',
    job_title: 'Gerente Executiva de Recursos Humanos',
    status: 'ACTIVE',
    two_factor_enabled: true,
    last_login_at: '2026-08-27T08:50:00Z',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'user-client-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    full_name: 'Lucas Ferreira',
    email: 'beatriz.ramos@valencametal.com.br',
    phone: '(11) 97777-2002',
    whatsapp: '5511977772002',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    role: 'CLIENTE_USER',
    department: 'Operações Industriais',
    job_title: 'Supervisor de Produção & Membro CIPA',
    status: 'ACTIVE',
    two_factor_enabled: false,
    last_login_at: '2026-08-24T14:10:00Z',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'user-client-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-construtora-02',
    full_name: 'Fernando Guimarães',
    email: 'fernando.guimaraes@construtorahorizonte.com.br',
    phone: '(11) 97777-3001',
    whatsapp: '5511977773001',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    role: 'CLIENTE_ADMIN',
    department: 'SESMT Corporativo',
    job_title: 'Coordenador Geral de Segurança do Trabalho',
    professional_register: 'MTE 0039182/SP',
    status: 'ACTIVE',
    two_factor_enabled: true,
    last_login_at: '2026-08-26T17:00:00Z',
    created_at: '2026-02-01T08:00:00Z',
    updated_at: '2026-02-01T08:00:00Z'
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-valenca-01',
    organization_id: 'org-prevsafe-01',
    legal_name: 'Metalúrgica Valença e Estruturas Metálicas S/A',
    trade_name: 'Metalúrgica Valença',
    document_type: 'CNPJ',
    document_number: '33.456.789/0001-12',
    main_cnae: '25.11-0-00',
    cnae_description: 'Fabricação de estruturas metálicas',
    risk_degree: 4,
    employee_count: 380,
    email: 'sst@valencametal.com.br',
    phone: '(11) 4002-8922',
    whatsapp: '5511977772001',
    address: 'Av. das Indústrias Pesadas, 1420',
    neighborhood: 'Distrito Industrial',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '04578-000',
    porte: 'DEMAIS (GRANDE PORTE)',
    natureza_juridica: '205-4 - Sociedade Anônima Fechada',
    status_receita: 'ATIVA',
    status: 'ACTIVE',
    notes: 'Cliente chave com grau de risco 4. Exige foco em trabalho a quente, ruído contínuo e pontes rolantes.',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-10T10:00:00Z'
  },
  {
    id: 'cli-transbrasil-02',
    organization_id: 'org-prevsafe-01',
    legal_name: 'Logística & Transportes Rápidos TransBrasil Ltda',
    trade_name: 'TransBrasil Logística',
    document_type: 'CNPJ',
    document_number: '19.882.341/0001-55',
    main_cnae: '49.30-2-02',
    cnae_description: 'Transporte rodoviário de carga',
    risk_degree: 3,
    employee_count: 145,
    email: 'operacoes@transbrasillog.com.br',
    phone: '(19) 3211-9000',
    whatsapp: '5519998811223',
    address: 'Rodovia Anhanguera, Km 98 - Galpão 4',
    neighborhood: 'Jardim Garcia',
    city: 'Campinas',
    state: 'SP',
    zip_code: '13060-000',
    porte: 'MÉDIO PORTE',
    natureza_juridica: '206-2 - Sociedade Empresária Limitada',
    status_receita: 'ATIVA',
    status: 'ACTIVE',
    notes: 'Frota pesada, motoristas carreteiros e operadores de empilhadeira.',
    created_at: '2026-01-15T11:00:00Z',
    updated_at: '2026-01-15T11:00:00Z'
  },
  {
    id: 'cli-alfa-03',
    organization_id: 'org-prevsafe-01',
    legal_name: 'Alfa Engenharia e Construções Civis Ltda',
    trade_name: 'Construtora Alfa',
    document_type: 'CNPJ',
    document_number: '44.112.990/0001-88',
    cno: '90.123.45678/90',
    main_cnae: '41.20-4-00',
    cnae_description: 'Construção de edifícios',
    risk_degree: 3,
    employee_count: 210,
    email: 'seguranca@alfaeng.com.br',
    phone: '(11) 3100-5544',
    whatsapp: '5511995544332',
    address: 'Rua Bela Cintra, 890',
    neighborhood: 'Consolação',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '01415-000',
    porte: 'DEMAIS (MÉDIO PORTE)',
    natureza_juridica: '206-2 - Sociedade Empresária Limitada',
    status_receita: 'ATIVA',
    status: 'ACTIVE',
    notes: '3 canteiros de obras ativos vinculados a matrículas CNO. Foco em NR-18 e NR-35.',
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-02-01T09:00:00Z'
  },
  {
    id: 'cli-rural-05',
    organization_id: 'org-prevsafe-01',
    legal_name: 'Antônio Carlos Silveira (Produtor Rural)',
    trade_name: 'Fazenda Santa Esperança - Café & Grãos',
    document_type: 'CAEPF',
    document_number: '123.456.789/001-44',
    caepf: '123.456.789/001-44',
    main_cnae: '01.21-1-01',
    cnae_description: 'Cultivo de café',
    risk_degree: 3,
    employee_count: 48,
    email: 'contato@fazendasantarural.com.br',
    phone: '(16) 99876-1234',
    whatsapp: '5516998761234',
    address: 'Rodovia Municipal do Café, Km 14 - Gleba 2',
    neighborhood: 'Zona Rural',
    city: 'Franca',
    state: 'SP',
    zip_code: '14400-000',
    porte: 'PRODUTOR RURAL (PESSOA FÍSICA)',
    natureza_juridica: '412-0 - Produtor Rural (Pessoa Física)',
    status_receita: 'ATIVA',
    status: 'ACTIVE',
    notes: 'Inscrição CAEPF integrada ao eSocial (tpInsc: 3). Foco em NR-31 e aplicação de defensivos agrícolas.',
    created_at: '2026-02-10T08:00:00Z',
    updated_at: '2026-02-10T08:00:00Z'
  },
  {
    id: 'cli-santaclara-04',
    organization_id: 'org-prevsafe-01',
    legal_name: 'Hospital e Maternidade Santa Clara S/A',
    trade_name: 'Hospital Santa Clara',
    document_type: 'CNPJ',
    document_number: '55.667.889/0001-33',
    main_cnae: '86.10-1-01',
    cnae_description: 'Atividades de atendimento hospitalar',
    risk_degree: 3,
    employee_count: 520,
    email: 'rh@santaclarasaude.com.br',
    phone: '(11) 2200-8800',
    whatsapp: '5511988776655',
    address: 'Av. Paulista, 2500',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '01310-300',
    porte: 'GRANDE PORTE',
    natureza_juridica: '205-4 - Sociedade Anônima Fechada',
    status_receita: 'ATIVA',
    status: 'PROSPECT',
    notes: 'Em negociação para PGR (NR-32) e PCMSO com 520 vidas.',
    created_at: '2026-02-15T14:00:00Z',
    updated_at: '2026-02-15T14:00:00Z'
  }
];

export const INITIAL_CONTACTS: ClientContact[] = [
  {
    id: 'cnt-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    name: 'Dr. João Alencar',
    role: 'Diretor Industrial',
    email: 'joao.alencar@valencametal.com.br',
    phone: '(11) 4002-8922',
    whatsapp: '5511977772001',
    is_primary: true
  },
  {
    id: 'cnt-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    name: 'Beatriz Ramos',
    role: 'Coordenadora de RH e SST',
    email: 'beatriz.ramos@valencametal.com.br',
    phone: '(11) 4002-8925',
    whatsapp: '5511977772002',
    is_primary: false
  },
  {
    id: 'cnt-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    name: 'Marcos Vinícius',
    role: 'Gerente Geral de Frota',
    email: 'marcos@transbrasillog.com.br',
    phone: '(19) 3211-9001',
    whatsapp: '5519998811223',
    is_primary: true
  }
];

export const INITIAL_UNITS: ClientUnit[] = [
  {
    id: 'unt-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    name: 'Planta Principal de Usinagem & Montagem',
    document_type: 'CNPJ',
    document_number: '33.456.789/0001-12',
    address: 'Av. das Indústrias Pesadas, 1420',
    neighborhood: 'Distrito Industrial',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '04578-000',
    cnae: '25.11-0-00',
    cnae_description: 'Fabricação de estruturas metálicas',
    risk_degree: 4,
    employee_count: 280,
    status: 'ACTIVE'
  },
  {
    id: 'unt-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    name: 'Centro de Distribuição e Pintura Eletrostática',
    document_type: 'CNPJ',
    document_number: '33.456.789/0002-95',
    address: 'Rua do Aço, 400',
    neighborhood: 'Cumbica',
    city: 'Guarulhos',
    state: 'SP',
    zip_code: '07180-000',
    cnae: '25.39-0-01',
    cnae_description: 'Serviços de usinagem, torneamento e solda',
    risk_degree: 3,
    employee_count: 100,
    status: 'ACTIVE'
  },
  {
    id: 'unt-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-alfa-03',
    name: 'Canteiro Edifício Sky Tower (CNO)',
    document_type: 'CNO',
    document_number: '90.123.45678/90',
    address: 'Av. Brigadeiro Faria Lima, 3400',
    neighborhood: 'Itaim Bibi',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '04538-132',
    cnae: '41.20-4-00',
    cnae_description: 'Construção de edifícios',
    risk_degree: 3,
    employee_count: 110,
    status: 'ACTIVE'
  },
  {
    id: 'unt-04',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-rural-05',
    name: 'Gleba Principal - Lavoura e Secagem (CAEPF)',
    document_type: 'CAEPF',
    document_number: '123.456.789/001-44',
    address: 'Rodovia Municipal do Café, Km 14',
    neighborhood: 'Zona Rural',
    city: 'Franca',
    state: 'SP',
    zip_code: '14400-000',
    cnae: '01.21-1-01',
    cnae_description: 'Cultivo de café',
    risk_degree: 3,
    employee_count: 48,
    status: 'ACTIVE'
  }
];

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-01',
    organization_id: 'org-prevsafe-01',
    name: 'Fernanda Castilho',
    company: 'Distribuidora Alimentos Sabor Brasil',
    email: 'fernanda@saborbrasil.com.br',
    phone: '(11) 98765-4321',
    source: 'INDICAÇÃO',
    status: 'QUALIFIED',
    assigned_to: 'user-commercial-01',
    cnae: '46.39-7-01',
    estimated_employees: 95,
    notes: 'Precisa renovar PGR e PCMSO com urgência para fiscalização do MTE.',
    created_at: '2026-08-20T09:30:00Z'
  },
  {
    id: 'lead-02',
    organization_id: 'org-prevsafe-01',
    name: 'Rodrigo Antunes',
    company: 'Química Paulista Indústria e Comércio',
    email: 'rodrigo@quimicapaulista.com.br',
    phone: '(19) 99123-8877',
    source: 'GOOGLE',
    status: 'NEW',
    assigned_to: 'user-commercial-01',
    cnae: '20.19-3-99',
    estimated_employees: 60,
    notes: 'Necessidade de LTCAT com laudo de periculosidade para inflamáveis (NR-20).',
    created_at: '2026-08-24T14:15:00Z'
  }
];

export const INITIAL_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-santaclara-04',
    title: 'PGR Hospitalar NR-32 + PCMSO 520 Vidas',
    estimated_value: 48000,
    probability: 80,
    stage: 'PROPOSAL',
    expected_close_date: '2026-09-15',
    assigned_to: 'user-commercial-01',
    created_at: '2026-08-10T10:00:00Z'
  },
  {
    id: 'opp-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    title: 'Renovação Anual SST + AET Ergonômica',
    estimated_value: 26500,
    probability: 90,
    stage: 'NEGOTIATION',
    expected_close_date: '2026-09-05',
    assigned_to: 'user-commercial-01',
    created_at: '2026-08-12T11:00:00Z'
  }
];

// Service Templates with full 15-stage workflow for PGR and realistic stages
export const INITIAL_SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    id: 'tmpl-pgr-01',
    organization_id: 'org-prevsafe-01',
    name: 'PGR — Programa de Gerenciamento de Riscos (NR-01)',
    code: 'PGR-NR01',
    category: 'PROGRAMAS',
    description: 'Elaboração completa do PGR com Inventário de Riscos Ocupacionais e Plano de Ação conforme Portaria 6.730 da NR-01.',
    default_duration_days: 15,
    default_price: 6500,
    mandatory_documents: ['Inventário de Riscos', 'Plano de Ação', 'ART/CREA'],
    active: true,
    stages: [
      {
        id: 'stg-tmpl-01',
        service_template_id: 'tmpl-pgr-01',
        name: '01 Cadastro & Abertura',
        description: 'Coleta preliminar dos dados cadastrais e definição do escopo.',
        order_index: 1,
        default_days: 1,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-t-01', stage_id: 'stg-tmpl-01', name: 'Validar dados cadastrais e CNAE', description: 'Conferir razão social, CNPJ e grau de risco no sistema.', order_index: 1, default_role: 'GESTOR', is_mandatory: true }
        ]
      },
      {
        id: 'stg-tmpl-02',
        service_template_id: 'tmpl-pgr-01',
        name: '02 Coleta de Dados',
        description: 'Solicitação do organograma, relação de cargos e setores ao cliente.',
        order_index: 2,
        default_days: 2,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'tsk-t-02', stage_id: 'stg-tmpl-02', name: 'Enviar formulário de levantamento inicial', description: 'Disponibilizar formulário no portal do cliente.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true },
          { id: 'tsk-t-03', stage_id: 'stg-tmpl-02', name: 'Conferir lista de funcionários por GHE', description: 'Validação da estratificação por Grupos Homogêneos de Exposição.', order_index: 2, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'stg-tmpl-03',
        service_template_id: 'tmpl-pgr-01',
        name: '03 Documentação Anterior',
        description: 'Análise de laudos anteriores, PPRA e fichas com FISPQs.',
        order_index: 3,
        default_days: 1,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'tsk-t-04', stage_id: 'stg-tmpl-03', name: 'Analisar histórico de acidentes e FISPQs', description: 'Verificar produtos químicos utilizados na produção.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'stg-tmpl-04',
        service_template_id: 'tmpl-pgr-01',
        name: '04 Agendamento de Visita',
        description: 'Alinhamento com o preposto da empresa da data e horário da inspeção.',
        order_index: 4,
        default_days: 1,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'tsk-t-05', stage_id: 'stg-tmpl-04', name: 'Confirmar agenda técnica com cliente', description: 'Notificar via WhatsApp e registrar no portal.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'stg-tmpl-05',
        service_template_id: 'tmpl-pgr-01',
        name: '05 Visita Técnica de Campo',
        description: 'Inspeção presencial nas instalações, medições de reconhecimento e fotos.',
        order_index: 5,
        default_days: 3,
        is_mandatory: true,
        requires_client: true,
        checklist_items: ['Área administrativa', 'Produção', 'Máquinas e Equipamentos', 'Produtos Químicos', 'EPC', 'EPI', 'Sinalização', 'Emergência'],
        tasks: [
          { id: 'tsk-t-06', stage_id: 'stg-tmpl-05', name: 'Executar checklist de inspeção de campo', description: 'Preencher checklist no PWA móvel.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true },
          { id: 'tsk-t-07', stage_id: 'stg-tmpl-05', name: 'Registrar evidências fotográficas e de ruído', description: 'Tirar fotos dos postos e registrar dosimetrias.', order_index: 2, default_role: 'TÉCNICO', is_mandatory: true },
          { id: 'tsk-t-08', stage_id: 'stg-tmpl-05', name: 'Colher assinatura do preposto no local', description: 'Assinatura digital da visita técnica.', order_index: 3, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'stg-tmpl-06',
        service_template_id: 'tmpl-pgr-01',
        name: '06 Identificação de Perigos',
        description: 'Mapeamento detalhado dos perigos físicos, químicos, biológicos, ergonômicos e de acidentes.',
        order_index: 6,
        default_days: 2,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-t-09', stage_id: 'stg-tmpl-06', name: 'Estruturar matriz de perigos por setor', description: 'Categorizar agentes ambientais identificados na visita.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'stg-tmpl-07',
        service_template_id: 'tmpl-pgr-01',
        name: '07 Avaliação de Riscos',
        description: 'Matriz de probabilidade x severidade conforme metodologia NR-01.',
        order_index: 7,
        default_days: 2,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-t-10', stage_id: 'stg-tmpl-07', name: 'Graduar níveis de risco ocupacional', description: 'Calcular criticidade de cada perigo.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'stg-tmpl-08',
        service_template_id: 'tmpl-pgr-01',
        name: '08 Inventário de Riscos',
        description: 'Consolidação das planilhas de inventário de riscos por GHE.',
        order_index: 8,
        default_days: 2,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-t-11', stage_id: 'stg-tmpl-08', name: 'Gerar tabelas do Inventário de Riscos', description: 'Consolidar medidas preventivas e EPI/EPC recomendados.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'stg-tmpl-09',
        service_template_id: 'tmpl-pgr-01',
        name: '09 Plano de Ação',
        description: 'Definição de metas, cronograma 5W2H, responsáveis e prazos de implementação.',
        order_index: 9,
        default_days: 1,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-t-12', stage_id: 'stg-tmpl-09', name: 'Estruturar cronograma 5W2H do plano de ação', description: 'Definir ações corretivas e preventivas.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'stg-tmpl-10',
        service_template_id: 'tmpl-pgr-01',
        name: '10 Elaboração Documental',
        description: 'Montagem da minuta completa do PGR (versão 1.0) em formato oficial.',
        order_index: 10,
        default_days: 2,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-t-13', stage_id: 'stg-tmpl-10', name: 'Compilar minuta do relatório técnico PGR', description: 'Gerar arquivo de versão inicial no repositório.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'stg-tmpl-11',
        service_template_id: 'tmpl-pgr-01',
        name: '11 Revisão Técnica (Peer Review)',
        description: 'Revisão por engenheiro de segurança sênior ou coordenador.',
        order_index: 11,
        default_days: 1,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-t-14', stage_id: 'stg-tmpl-11', name: 'Revisar conformidade regulatória NR-01', description: 'Aprovar minuta ou apontar ajustes técnicos.', order_index: 1, default_role: 'GESTOR', is_mandatory: true }
        ]
      },
      {
        id: 'stg-tmpl-12',
        service_template_id: 'tmpl-pgr-01',
        name: '12 Emissão de ART & Aprovação Interna',
        description: 'Emissão da Anotação de Responsabilidade Técnica junto ao CREA.',
        order_index: 12,
        default_days: 1,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-t-15', stage_id: 'stg-tmpl-12', name: 'Emitir ART no CREA e anexar ao documento final', description: 'Assinar digitalmente com e-CPF do engenheiro.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'stg-tmpl-13',
        service_template_id: 'tmpl-pgr-01',
        name: '13 Entrega Oficial ao Cliente',
        description: 'Disponibilização do PGR assinado no Portal do Cliente com notificação.',
        order_index: 13,
        default_days: 1,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-t-16', stage_id: 'stg-tmpl-13', name: 'Liberar documento final e solicitar aceite', description: 'Disparar notificação multicanal com link direto.', order_index: 1, default_role: 'GESTOR', is_mandatory: true }
        ]
      },
      {
        id: 'stg-tmpl-14',
        service_template_id: 'tmpl-pgr-01',
        name: '14 Validação & Aceite do Cliente',
        description: 'Análise pelo cliente com opção de Aceite formal ou Solicitação de Correção (Rework).',
        order_index: 14,
        default_days: 3,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'tsk-t-17', stage_id: 'stg-tmpl-14', name: 'Aguardar aceite formal do cliente no portal', description: 'Registro de data, hora e IP.', order_index: 1, default_role: 'CLIENTE_ADMIN', is_mandatory: true }
        ]
      },
      {
        id: 'stg-tmpl-15',
        service_template_id: 'tmpl-pgr-01',
        name: '15 Encerramento & Pós-Venda',
        description: 'Pesquisa de satisfação NPS, arquivo morto e gatilho para oportunidade de PCMSO/LTCAT.',
        order_index: 15,
        default_days: 1,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-t-18', stage_id: 'stg-tmpl-15', name: 'Coletar avaliação de qualidade e agendar revisão anual', description: 'Alimentar painel de qualidade e alerta comercial D-330.', order_index: 1, default_role: 'COMERCIAL', is_mandatory: true }
        ]
      }
    ]
  },
  {
    id: 'tmpl-pcmso-02',
    organization_id: 'org-prevsafe-01',
    name: 'PCMSO — Programa de Controle Médico de Saúde Ocupacional (NR-07)',
    code: 'PCMSO-NR07',
    category: 'PROGRAMAS',
    description: 'Elaboração do PCMSO pelo médico do trabalho coordenador com definição do rol de exames complementares e cronograma periódico.',
    default_duration_days: 10,
    default_price: 5200,
    mandatory_documents: ['PCMSO Coordenador', 'Tabela de Exames por Cargo', 'RQE Médico'],
    active: true,
    stages: [
      {
        id: 'pcmso-stg-01',
        service_template_id: 'tmpl-pcmso-02',
        name: '01 Alinhamento com PGR',
        description: 'Recebimento do inventário de riscos do PGR para cruzar exposições.',
        order_index: 1,
        default_days: 2,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-pcmso-01', stage_id: 'pcmso-stg-01', name: 'Cruzar riscos químicos/ruído com Quadro 1 da NR-07', description: 'Definir audiometrias, espirometrias e exames laboratoriais.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'pcmso-stg-02',
        service_template_id: 'tmpl-pcmso-02',
        name: '02 Elaboração Médica',
        description: 'Redação do programa pelo Médico Coordenador.',
        order_index: 2,
        default_days: 4,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-pcmso-02', stage_id: 'pcmso-stg-02', name: 'Definir protocolos de ASO Admissional, Periódico e Demissional', description: 'Redigir diretrizes clínicas.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'pcmso-stg-03',
        service_template_id: 'tmpl-pcmso-03',
        name: '03 Entrega & Liberação no Portal',
        description: 'Assinatura com CRM/RQE do médico e entrega.',
        order_index: 3,
        default_days: 2,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-pcmso-03', stage_id: 'pcmso-stg-03', name: 'Disponibilizar PCMSO assinado ao cliente', description: 'Notificar cliente para aceite.', order_index: 1, default_role: 'GESTOR', is_mandatory: true }
        ]
      },
      {
        id: 'pcmso-stg-04',
        service_template_id: 'tmpl-pcmso-04',
        name: '04 Aceite & Integração eSocial (S-2220)',
        description: 'Aceite do cliente e parametrização dos exames no sistema.',
        order_index: 4,
        default_days: 2,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'tsk-pcmso-04', stage_id: 'pcmso-stg-04', name: 'Registrar aceite do cliente', description: 'Finalização do ciclo.', order_index: 1, default_role: 'CLIENTE_ADMIN', is_mandatory: true }
        ]
      }
    ]
  },
  {
    id: 'tmpl-ltcat-03',
    organization_id: 'org-prevsafe-01',
    name: 'LTCAT — Laudo Técnico das Condições Ambientais de Trabalho',
    code: 'LTCAT-PREV',
    category: 'LAUDOS',
    description: 'Laudo conclusivo para fins de Aposentadoria Especial (INSS/eSocial S-2240) com dosimetrias e avaliações quantitativas.',
    default_duration_days: 12,
    default_price: 7800,
    mandatory_documents: ['Relatório de Dosimetria de Ruído', 'Laudo LTCAT Conclusivo', 'ART CREA'],
    active: true,
    stages: [
      {
        id: 'ltcat-stg-01',
        service_template_id: 'tmpl-ltcat-03',
        name: '01 Medições Quantitativas em Campo',
        description: 'Instalação de dosímetros e termômetros de globo.',
        order_index: 1,
        default_days: 4,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'tsk-ltcat-01', stage_id: 'ltcat-stg-01', name: 'Efetuar dosimetrias de ruído contínuo/intermitente NHO-01', description: 'Medições durante jornada de 8h.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'ltcat-stg-02',
        service_template_id: 'tmpl-ltcat-03',
        name: '02 Parecer de Aposentadoria Especial',
        description: 'Enquadramento conforme Decreto 3.048/99 anexo IV.',
        order_index: 2,
        default_days: 4,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-ltcat-02', stage_id: 'ltcat-stg-02', name: 'Emitir parecer conclusivo para GFIP e eSocial S-2240', description: 'Indicar códigos GFIP 00 a 04.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'ltcat-stg-03',
        service_template_id: 'tmpl-ltcat-03',
        name: '03 Entrega & Aceite',
        description: 'Entrega final com ART e aceite.',
        order_index: 3,
        default_days: 4,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'tsk-ltcat-03', stage_id: 'ltcat-stg-03', name: 'Validação e Aceite pelo Cliente', description: 'Assinatura de recebimento.', order_index: 1, default_role: 'CLIENTE_ADMIN', is_mandatory: true }
        ]
      }
    ]
  },
  {
    id: 'tmpl-aet-04',
    organization_id: 'org-prevsafe-01',
    name: 'AET — Análise Ergonômica do Trabalho (NR-17)',
    code: 'AET-NR17',
    category: 'ERGONOMIA',
    description: 'Avaliação ergonômica detalhada de postos de trabalho administrativos e operacionais.',
    default_duration_days: 18,
    default_price: 6900,
    mandatory_documents: ['Relatório AET', 'Plano de Ação Ergonômico'],
    active: true,
    stages: [
      {
        id: 'aet-stg-01',
        service_template_id: 'tmpl-aet-04',
        name: '01 Mapeamento e Filmagem dos Postos',
        description: 'Registro de ciclos de trabalho e posturas.',
        order_index: 1,
        default_days: 5,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'tsk-aet-01', stage_id: 'aet-stg-01', name: 'Filmar ciclos de operação na linha de produção', description: 'Coleta de dados biomecânicos.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'aet-stg-02',
        service_template_id: 'tmpl-aet-04',
        name: '02 Análise Biomecânica RULA / OWAS / NIOSH',
        description: 'Aplicação de ferramentas ergonômicas reconhecidas.',
        order_index: 2,
        default_days: 8,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk-aet-02', stage_id: 'aet-stg-02', name: 'Processar equações de levantamento de peso NIOSH', description: 'Calcular índice de levantamento.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'aet-stg-03',
        service_template_id: 'tmpl-aet-04',
        name: '03 Entrega e Apresentação de Melhorias',
        description: 'Reunião com comitê de ergonomia e entrega do laudo.',
        order_index: 3,
        default_days: 5,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'tsk-aet-03', stage_id: 'aet-stg-03', name: 'Apresentar recomendações e colher aceite', description: 'Entrega formal.', order_index: 1, default_role: 'CLIENTE_ADMIN', is_mandatory: true }
        ]
      }
    ]
  },
  {
    id: 'tmpl-nr35-05',
    organization_id: 'org-prevsafe-01',
    name: 'Treinamento NR-35 — Trabalho em Altura (8 Horas)',
    code: 'TREIN-NR35',
    category: 'TREINAMENTOS',
    description: 'Capacitação teórica e prática com emissão de certificados individuais e carteirinhas.',
    default_duration_days: 5,
    default_price: 3500,
    mandatory_documents: ['Lista de Presença', 'Certificados', 'ART do Instrutor'],
    active: true,
    stages: [
      {
        id: 'nr35-stg-01',
        service_template_id: 'tmpl-nr35-05',
        name: '01 Alinhamento & Lista de Participantes',
        description: 'Recebimento de nomes e conferência de ASO apto para altura.',
        order_index: 1,
        default_days: 2,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'tsk-nr35-01', stage_id: 'nr35-stg-01', name: 'Validar ASOs aptos para trabalho em altura', description: 'Exigência da NR-35.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'nr35-stg-02',
        service_template_id: 'tmpl-nr35-05',
        name: '02 Execução Prática e Prova Teórica',
        description: 'Aplicação do treinamento presencial.',
        order_index: 2,
        default_days: 1,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'tsk-nr35-02', stage_id: 'nr35-stg-02', name: 'Ministrar aula teórica e prática com nós e ancoragens', description: 'Coleta de assinaturas na lista.', order_index: 1, default_role: 'TÉCNICO', is_mandatory: true }
        ]
      },
      {
        id: 'nr35-stg-03',
        service_template_id: 'tmpl-nr35-05',
        name: '03 Emissão de Certificados e Encerramento',
        description: 'Envio dos certificados digitais autenticados.',
        order_index: 3,
        default_days: 2,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'tsk-nr35-03', stage_id: 'nr35-stg-03', name: 'Emitir certificados no portal e colher aceite', description: 'Finalização do treinamento.', order_index: 1, default_role: 'GESTOR', is_mandatory: true }
        ]
      }
    ]
  }
];

export const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: 'prop-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    opportunity_id: 'opp-valenca-01',
    proposal_number: 'PROP-2026-000001',
    title: 'Pacote Integrado SST: PGR + PCMSO + LTCAT Valença',
    description: 'Prestação de serviços contínuos de Engenharia e Medicina do Trabalho para a planta de 380 funcionários, incluindo inventário de riscos, dosimetrias e assessoria eSocial.',
    items: [
      {
        id: 'item-01',
        proposal_id: 'prop-01',
        service_template_id: 'tmpl-pgr-01',
        service_name: 'PGR — Programa de Gerenciamento de Riscos (NR-01)',
        description: 'Elaboração com inventário e plano de ação.',
        quantity: 1,
        unit_price: 6500,
        total: 6500
      },
      {
        id: 'item-02',
        proposal_id: 'prop-01',
        service_template_id: 'tmpl-pcmso-02',
        service_name: 'PCMSO — Programa de Controle Médico (NR-07)',
        description: 'Coordenação médica e tabela de exames.',
        quantity: 1,
        unit_price: 5200,
        total: 5200
      },
      {
        id: 'item-03',
        proposal_id: 'prop-01',
        service_template_id: 'tmpl-ltcat-03',
        service_name: 'LTCAT — Laudo Técnico Previdenciário',
        description: 'Laudo com dosimetrias de ruído.',
        quantity: 1,
        unit_price: 7800,
        total: 7800
      }
    ],
    subtotal: 19500,
    discount: 1500,
    total: 18000,
    valid_until: '2026-09-30',
    status: 'APPROVED',
    created_by: 'user-commercial-01',
    approved_at: '2026-08-15T15:20:00Z',
    approval_details: {
      id: 'appr-01',
      proposal_id: 'prop-01',
      client_user_id: 'user-client-01',
      client_name: 'Dr. João Alencar (Diretor Industrial)',
      action: 'APPROVED',
      comment: 'Proposta aprovada conforme negociação comercial. Aguardo minuta do contrato para assinatura.',
      ip_address: '189.120.45.10',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      created_at: '2026-08-15T15:20:00Z'
    },
    created_at: '2026-08-10T10:00:00Z',
    updated_at: '2026-08-15T15:20:00Z'
  },
  {
    id: 'prop-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    opportunity_id: 'opp-02',
    proposal_number: 'PROP-2026-000002',
    title: 'Renovação Anual PGR + AET Ergonômica TransBrasil',
    description: 'Assessoria anual de SST para base de transporte rodoviário e análise ergonômica dos motoristas de longa distância.',
    items: [
      {
        id: 'item-201',
        proposal_id: 'prop-02',
        service_template_id: 'tmpl-pgr-01',
        service_name: 'PGR (NR-01) - Renovação Anual',
        description: 'Revisão geral do inventário e plano de ação.',
        quantity: 1,
        unit_price: 5500,
        total: 5500
      },
      {
        id: 'item-202',
        proposal_id: 'prop-02',
        service_template_id: 'tmpl-aet-04',
        service_name: 'AET Ergonômica para Motoristas de Carga',
        description: 'Avaliação de vibração de corpo inteiro e postura.',
        quantity: 1,
        unit_price: 6900,
        total: 6900
      }
    ],
    subtotal: 12400,
    discount: 400,
    total: 12000,
    valid_until: '2026-09-10',
    status: 'SENT',
    created_by: 'user-commercial-01',
    created_at: '2026-08-20T14:00:00Z',
    updated_at: '2026-08-20T14:00:00Z'
  },
  {
    id: 'prop-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-alfa-03',
    proposal_number: 'PROP-2026-000003',
    title: 'Treinamentos de Segurança em Altura (NR-35) Alfa Canteiro',
    description: 'Capacitação de 3 turmas de 15 operários para trabalho em altura na obra Edifício Sky Tower.',
    items: [
      {
        id: 'item-301',
        proposal_id: 'prop-03',
        service_template_id: 'tmpl-nr35-05',
        service_name: 'Treinamento NR-35 (8h) - Turmas 1, 2 e 3',
        description: 'Capacitação prática com emissão de certificados.',
        quantity: 3,
        unit_price: 3200,
        total: 9600
      }
    ],
    subtotal: 9600,
    discount: 600,
    total: 9000,
    valid_until: '2026-09-25',
    status: 'DRAFT',
    created_by: 'user-commercial-01',
    created_at: '2026-08-24T16:00:00Z',
    updated_at: '2026-08-24T16:00:00Z'
  }
];

export const INITIAL_CONTRACTS: Contract[] = [
  {
    id: 'cont-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    proposal_id: 'prop-01',
    contract_number: 'CONT-2026-000001',
    title: 'Contrato de Prestação de Serviços SST Valença 2026',
    status: 'ACTIVE',
    recurrence: 'ANNUAL',
    total_value: 18000,
    start_date: '2026-08-16',
    end_date: '2027-08-15',
    signed_at: '2026-08-16T10:30:00Z',
    document_path: '/contracts/valenca_cont_2026_assinado.pdf',
    signatures: [
      {
        id: 'sig-01',
        contract_id: 'cont-01',
        signer_user_id: 'user-admin-01',
        signer_name: 'Carlos Mendes',
        signer_email: 'carlos.mendes@prevsafe.com.br',
        signer_document: '111.222.333-44',
        signed_at: '2026-08-16T09:00:00Z',
        ip_address: '177.18.29.100',
        provider: 'PREVSAFE_SIGN',
        signature_hash: 'SHA256:a9f02c4810e8d76e41b7'
      },
      {
        id: 'sig-02',
        contract_id: 'cont-01',
        signer_user_id: 'user-client-01',
        signer_name: 'Dr. João Alencar',
        signer_email: 'joao.alencar@valencametal.com.br',
        signer_document: '999.888.777-66',
        signed_at: '2026-08-16T10:30:00Z',
        ip_address: '189.120.45.10',
        provider: 'PREVSAFE_SIGN',
        signature_hash: 'SHA256:f47b2c991e0a29d8819a'
      }
    ],
    created_at: '2026-08-15T16:00:00Z',
    updated_at: '2026-08-16T10:30:00Z'
  },
  {
    id: 'cont-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-alfa-03',
    contract_number: 'CONT-2026-000002',
    title: 'Contrato Assessoria de Campo Obra Sky Tower',
    status: 'ACTIVE',
    recurrence: 'ONE_TIME',
    total_value: 14500,
    start_date: '2026-07-01',
    end_date: '2026-12-31',
    signed_at: '2026-07-02T11:00:00Z',
    signatures: [
      {
        id: 'sig-03',
        contract_id: 'cont-02',
        signer_name: 'Carlos Mendes',
        signer_email: 'carlos.mendes@prevsafe.com.br',
        signed_at: '2026-07-01T14:00:00Z',
        ip_address: '177.18.29.100',
        provider: 'PREVSAFE_SIGN'
      },
      {
        id: 'sig-04',
        contract_id: 'cont-02',
        signer_name: 'Eng. Marcelo Alfa',
        signer_email: 'marcelo@alfaeng.com.br',
        signed_at: '2026-07-02T11:00:00Z',
        ip_address: '201.88.12.33',
        provider: 'PREVSAFE_SIGN'
      }
    ],
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-02T11:00:00Z'
  }
];

export const INITIAL_SERVICE_ORDERS: ServiceOrder[] = [
  {
    id: 'os-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    contract_id: 'cont-01',
    service_template_id: 'tmpl-pgr-01',
    service_name: 'PGR — Programa de Gerenciamento de Riscos (NR-01)',
    service_code: 'PGR-NR01',
    os_number: 'OS-2026-000457',
    title: 'Elaboração do PGR 2026 - Metalúrgica Valença S/A',
    description: 'Inventário completo de riscos e plano de ação estruturado para 380 postos de trabalho.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    start_date: '2026-08-16',
    due_date: '2026-09-02',
    progress: 68, // automatically calculated from completed tasks
    manager_id: 'user-manager-01',
    manager_name: 'Mariana Siqueira',
    technical_responsible_id: 'user-tech-01',
    technical_responsible_name: 'Eng. Eduardo Vasconcelos',
    sla_total_days: 15,
    sla_internal_days: 6,
    sla_client_waiting_days: 2,
    sla_is_paused: false,
    dependencies: [],
    stages: [
      {
        id: 'os-stg-01',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-01',
        name: '01 Cadastro & Abertura',
        order_index: 1,
        status: 'COMPLETED',
        start_date: '2026-08-16',
        due_date: '2026-08-17',
        completed_at: '2026-08-16T14:00:00Z',
        assigned_to: 'user-manager-01',
        assigned_name: 'Mariana Siqueira',
        progress: 100,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'os-tsk-01', service_stage_id: 'os-stg-01', name: 'Validar dados cadastrais e CNAE', description: 'Conferir razão social, CNPJ e grau de risco no sistema.', status: 'COMPLETED', priority: 'MEDIUM', assigned_to: 'user-manager-01', assigned_name: 'Mariana Siqueira', due_date: '2026-08-17', completed_at: '2026-08-16T14:00:00Z', is_mandatory: true, order_index: 1 }
        ]
      },
      {
        id: 'os-stg-02',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-02',
        name: '02 Coleta de Dados',
        order_index: 2,
        status: 'COMPLETED',
        start_date: '2026-08-17',
        due_date: '2026-08-19',
        completed_at: '2026-08-18T16:30:00Z',
        assigned_to: 'user-tech-01',
        assigned_name: 'Eng. Eduardo Vasconcelos',
        progress: 100,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'os-tsk-02', service_stage_id: 'os-stg-02', name: 'Enviar formulário de levantamento inicial', description: 'Disponibilizar no portal do cliente.', status: 'COMPLETED', priority: 'HIGH', assigned_to: 'user-tech-01', assigned_name: 'Eng. Eduardo Vasconcelos', due_date: '2026-08-18', completed_at: '2026-08-17T11:00:00Z', is_mandatory: true, order_index: 1 },
          { id: 'os-tsk-03', service_stage_id: 'os-stg-02', name: 'Conferir lista de funcionários por GHE', description: 'Validação da estratificação por GHE.', status: 'COMPLETED', priority: 'HIGH', assigned_to: 'user-tech-01', assigned_name: 'Eng. Eduardo Vasconcelos', due_date: '2026-08-19', completed_at: '2026-08-18T16:30:00Z', is_mandatory: true, order_index: 2 }
        ]
      },
      {
        id: 'os-stg-03',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-03',
        name: '03 Documentação Anterior',
        order_index: 3,
        status: 'COMPLETED',
        start_date: '2026-08-19',
        due_date: '2026-08-20',
        completed_at: '2026-08-19T17:00:00Z',
        assigned_to: 'user-tech-01',
        assigned_name: 'Eng. Eduardo Vasconcelos',
        progress: 100,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'os-tsk-04', service_stage_id: 'os-stg-03', name: 'Analisar histórico de acidentes e FISPQs', description: 'Verificar produtos químicos na produção.', status: 'COMPLETED', priority: 'MEDIUM', assigned_to: 'user-tech-01', assigned_name: 'Eng. Eduardo Vasconcelos', due_date: '2026-08-20', completed_at: '2026-08-19T17:00:00Z', is_mandatory: true, order_index: 1 }
        ]
      },
      {
        id: 'os-stg-04',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-04',
        name: '04 Agendamento de Visita',
        order_index: 4,
        status: 'COMPLETED',
        start_date: '2026-08-20',
        due_date: '2026-08-21',
        completed_at: '2026-08-20T11:00:00Z',
        assigned_to: 'user-tech-01',
        assigned_name: 'Eng. Eduardo Vasconcelos',
        progress: 100,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'os-tsk-05', service_stage_id: 'os-stg-04', name: 'Confirmar agenda técnica com cliente', description: 'Visita agendada para 22/08 às 09:00.', status: 'COMPLETED', priority: 'HIGH', assigned_to: 'user-tech-01', assigned_name: 'Eng. Eduardo Vasconcelos', due_date: '2026-08-21', completed_at: '2026-08-20T11:00:00Z', is_mandatory: true, order_index: 1 }
        ]
      },
      {
        id: 'os-stg-05',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-05',
        name: '05 Visita Técnica de Campo',
        order_index: 5,
        status: 'COMPLETED',
        start_date: '2026-08-22',
        due_date: '2026-08-24',
        completed_at: '2026-08-23T15:00:00Z',
        assigned_to: 'user-tech-01',
        assigned_name: 'Eng. Eduardo Vasconcelos',
        progress: 100,
        is_mandatory: true,
        requires_client: true,
        checklist: [
          { id: 'chk-01', item: 'Área administrativa', completed: true },
          { id: 'chk-02', item: 'Produção (Estamparia e Corte)', completed: true },
          { id: 'chk-03', item: 'Máquinas e Equipamentos (Prensas NR-12)', completed: true },
          { id: 'chk-04', item: 'Produtos Químicos (Desengraxantes)', completed: true },
          { id: 'chk-05', item: 'EPC (Exaustores e Proteções fixas)', completed: true },
          { id: 'chk-06', item: 'EPI (Protetor auricular, óculos, botinas)', completed: true },
          { id: 'chk-07', item: 'Sinalização de Segurança', completed: true },
          { id: 'chk-08', item: 'Rotas de Fuga e Emergência', completed: true }
        ],
        field_evidence: {
          photos: [
            { url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=80', caption: 'Setor de Prensas - Cortinas de Luz instaladas', timestamp: '2026-08-22T10:15:00Z' },
            { url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=500&auto=format&fit=crop&q=80', caption: 'Bancada de Solda - Exaustão localizada', timestamp: '2026-08-22T11:40:00Z' }
          ],
          inspection_notes: 'Visita concluída com sucesso. Planta em plena atividade. Identificada necessidade de proteção adicional na esteira 03.',
          client_signature: {
            name: 'Dr. João Alencar',
            signed_at: '2026-08-22T14:30:00Z'
          },
          geo_location: {
            latitude: -23.5505,
            longitude: -46.6333,
            label: 'Distrito Industrial - São Paulo/SP'
          }
        },
        tasks: [
          { id: 'os-tsk-06', service_stage_id: 'os-stg-05', name: 'Executar checklist de inspeção de campo', description: 'Preenchido no PWA.', status: 'COMPLETED', priority: 'HIGH', assigned_to: 'user-tech-01', assigned_name: 'Eng. Eduardo Vasconcelos', due_date: '2026-08-23', completed_at: '2026-08-22T14:00:00Z', is_mandatory: true, order_index: 1 },
          { id: 'os-tsk-07', service_stage_id: 'os-stg-05', name: 'Registrar evidências fotográficas e de ruído', description: 'Fotos anexadas e nível de pressão sonora medido (87 dBA no corte).', status: 'COMPLETED', priority: 'HIGH', assigned_to: 'user-tech-01', assigned_name: 'Eng. Eduardo Vasconcelos', due_date: '2026-08-23', completed_at: '2026-08-22T14:15:00Z', is_mandatory: true, order_index: 2 },
          { id: 'os-tsk-08', service_stage_id: 'os-stg-05', name: 'Colher assinatura do preposto no local', description: 'Assinado pelo Dr. João.', status: 'COMPLETED', priority: 'HIGH', assigned_to: 'user-tech-01', assigned_name: 'Eng. Eduardo Vasconcelos', due_date: '2026-08-23', completed_at: '2026-08-22T14:30:00Z', is_mandatory: true, order_index: 3 }
        ]
      },
      {
        id: 'os-stg-06',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-06',
        name: '06 Identificação de Perigos',
        order_index: 6,
        status: 'COMPLETED',
        start_date: '2026-08-23',
        due_date: '2026-08-24',
        completed_at: '2026-08-24T10:00:00Z',
        assigned_to: 'user-tech-01',
        assigned_name: 'Eng. Eduardo Vasconcelos',
        progress: 100,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'os-tsk-09', service_stage_id: 'os-stg-06', name: 'Estruturar matriz de perigos por setor', description: 'Classificação física, química e mecânica finalizada.', status: 'COMPLETED', priority: 'HIGH', assigned_to: 'user-tech-01', assigned_name: 'Eng. Eduardo Vasconcelos', due_date: '2026-08-24', completed_at: '2026-08-24T10:00:00Z', is_mandatory: true, order_index: 1 }
        ]
      },
      {
        id: 'os-stg-07',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-07',
        name: '07 Avaliação de Riscos',
        order_index: 7,
        status: 'COMPLETED',
        start_date: '2026-08-24',
        due_date: '2026-08-25',
        completed_at: '2026-08-24T17:00:00Z',
        assigned_to: 'user-tech-01',
        assigned_name: 'Eng. Eduardo Vasconcelos',
        progress: 100,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'os-tsk-10', service_stage_id: 'os-stg-07', name: 'Graduar níveis de risco ocupacional', description: 'Matriz de probabilidade e severidade aplicada.', status: 'COMPLETED', priority: 'HIGH', assigned_to: 'user-tech-01', assigned_name: 'Eng. Eduardo Vasconcelos', due_date: '2026-08-25', completed_at: '2026-08-24T17:00:00Z', is_mandatory: true, order_index: 1 }
        ]
      },
      {
        id: 'os-stg-08',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-08',
        name: '08 Inventário de Riscos',
        order_index: 8,
        status: 'COMPLETED',
        start_date: '2026-08-25',
        due_date: '2026-08-26',
        completed_at: '2026-08-25T09:00:00Z',
        assigned_to: 'user-tech-01',
        assigned_name: 'Eng. Eduardo Vasconcelos',
        progress: 100,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'os-tsk-11', service_stage_id: 'os-stg-08', name: 'Gerar tabelas do Inventário de Riscos', description: 'Consolidação das planilhas por GHE.', status: 'COMPLETED', priority: 'HIGH', assigned_to: 'user-tech-01', assigned_name: 'Eng. Eduardo Vasconcelos', due_date: '2026-08-26', completed_at: '2026-08-25T09:00:00Z', is_mandatory: true, order_index: 1 }
        ]
      },
      {
        id: 'os-stg-09',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-09',
        name: '09 Plano de Ação',
        order_index: 9,
        status: 'COMPLETED',
        start_date: '2026-08-25',
        due_date: '2026-08-26',
        completed_at: '2026-08-25T11:30:00Z',
        assigned_to: 'user-tech-01',
        assigned_name: 'Eng. Eduardo Vasconcelos',
        progress: 100,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'os-tsk-12', service_stage_id: 'os-stg-09', name: 'Estruturar cronograma 5W2H do plano de ação', description: '8 ações propostas com metas de 30 a 180 dias.', status: 'COMPLETED', priority: 'HIGH', assigned_to: 'user-tech-01', assigned_name: 'Eng. Eduardo Vasconcelos', due_date: '2026-08-26', completed_at: '2026-08-25T11:30:00Z', is_mandatory: true, order_index: 1 }
        ]
      },
      {
        id: 'os-stg-10',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-10',
        name: '10 Elaboração Documental',
        order_index: 10,
        status: 'IN_PROGRESS',
        start_date: '2026-08-25',
        due_date: '2026-08-27',
        assigned_to: 'user-tech-01',
        assigned_name: 'Eng. Eduardo Vasconcelos',
        progress: 50,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'os-tsk-13', service_stage_id: 'os-stg-10', name: 'Compilar minuta do relatório técnico PGR', description: 'Montagem do texto-base oficial e anexos técnicos.', status: 'IN_PROGRESS', priority: 'HIGH', assigned_to: 'user-tech-01', assigned_name: 'Eng. Eduardo Vasconcelos', due_date: '2026-08-27', is_mandatory: true, order_index: 1 }
        ]
      },
      {
        id: 'os-stg-11',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-11',
        name: '11 Revisão Técnica (Peer Review)',
        order_index: 11,
        status: 'TODO',
        start_date: '2026-08-27',
        due_date: '2026-08-28',
        assigned_to: 'user-manager-01',
        assigned_name: 'Mariana Siqueira',
        progress: 0,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'os-tsk-14', service_stage_id: 'os-stg-11', name: 'Revisar conformidade regulatória NR-01', description: 'Revisão técnica de qualidade.', status: 'TODO', priority: 'HIGH', assigned_to: 'user-manager-01', assigned_name: 'Mariana Siqueira', due_date: '2026-08-28', is_mandatory: true, order_index: 1 }
        ]
      },
      {
        id: 'os-stg-12',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-12',
        name: '12 Emissão de ART & Aprovação Interna',
        order_index: 12,
        status: 'TODO',
        start_date: '2026-08-28',
        due_date: '2026-08-29',
        assigned_to: 'user-tech-01',
        assigned_name: 'Eng. Eduardo Vasconcelos',
        progress: 0,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'os-tsk-15', service_stage_id: 'os-stg-12', name: 'Emitir ART no CREA e anexar ao documento final', description: 'Assinatura digital com e-CPF.', status: 'TODO', priority: 'HIGH', assigned_to: 'user-tech-01', assigned_name: 'Eng. Eduardo Vasconcelos', due_date: '2026-08-29', is_mandatory: true, order_index: 1 }
        ]
      },
      {
        id: 'os-stg-13',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-13',
        name: '13 Entrega Oficial ao Cliente',
        order_index: 13,
        status: 'TODO',
        start_date: '2026-08-29',
        due_date: '2026-08-30',
        assigned_to: 'user-manager-01',
        assigned_name: 'Mariana Siqueira',
        progress: 0,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'os-tsk-16', service_stage_id: 'os-stg-13', name: 'Liberar documento final e solicitar aceite', description: 'Notificação automática.', status: 'TODO', priority: 'HIGH', assigned_to: 'user-manager-01', assigned_name: 'Mariana Siqueira', due_date: '2026-08-30', is_mandatory: true, order_index: 1 }
        ]
      },
      {
        id: 'os-stg-14',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-14',
        name: '14 Validação & Aceite do Cliente',
        order_index: 14,
        status: 'TODO',
        start_date: '2026-08-30',
        due_date: '2026-09-01',
        assigned_to: 'user-client-01',
        assigned_name: 'Dr. João Alencar',
        progress: 0,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'os-tsk-17', service_stage_id: 'os-stg-14', name: 'Aguardar aceite formal do cliente no portal', description: 'Registro com assinatura digital.', status: 'TODO', priority: 'HIGH', assigned_to: 'user-client-01', assigned_name: 'Dr. João Alencar', due_date: '2026-09-01', is_mandatory: true, order_index: 1 }
        ]
      },
      {
        id: 'os-stg-15',
        service_order_id: 'os-01',
        template_stage_id: 'stg-tmpl-15',
        name: '15 Encerramento & Pós-Venda',
        order_index: 15,
        status: 'TODO',
        start_date: '2026-09-01',
        due_date: '2026-09-02',
        assigned_to: 'user-commercial-01',
        assigned_name: 'Ricardo Braga',
        progress: 0,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'os-tsk-18', service_stage_id: 'os-stg-15', name: 'Coletar avaliação de qualidade e agendar revisão anual', description: 'Pesquisa NPS e feedback.', status: 'TODO', priority: 'MEDIUM', assigned_to: 'user-commercial-01', assigned_name: 'Ricardo Braga', due_date: '2026-09-02', is_mandatory: true, order_index: 1 }
        ]
      }
    ],
    created_at: '2026-08-16T11:00:00Z',
    updated_at: '2026-08-25T11:30:00Z'
  },
  {
    id: 'os-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    service_template_id: 'tmpl-aet-04',
    service_name: 'AET — Análise Ergonômica do Trabalho (NR-17)',
    service_code: 'AET-NR17',
    os_number: 'OS-2026-000458',
    title: 'AET Setor de Logística e Armazém TransBrasil',
    description: 'Análise ergonômica dos postos de conferência, carga manual e cabines dos caminhões.',
    status: 'WAITING_ACCEPTANCE',
    priority: 'MEDIUM',
    start_date: '2026-08-01',
    due_date: '2026-08-20',
    progress: 100,
    manager_id: 'user-manager-01',
    manager_name: 'Mariana Siqueira',
    technical_responsible_id: 'user-tech-01',
    technical_responsible_name: 'Eng. Eduardo Vasconcelos',
    sla_total_days: 18,
    sla_internal_days: 16,
    sla_client_waiting_days: 2,
    sla_is_paused: false,
    dependencies: [],
    stages: [
      {
        id: 'os2-stg-01',
        service_order_id: 'os-02',
        name: '01 Mapeamento e Filmagem dos Postos',
        order_index: 1,
        status: 'COMPLETED',
        start_date: '2026-08-01',
        due_date: '2026-08-05',
        completed_at: '2026-08-05T16:00:00Z',
        progress: 100,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'tsk2-01', service_stage_id: 'os2-stg-01', name: 'Filmar ciclos de operação', description: 'Coleta de dados.', status: 'COMPLETED', priority: 'HIGH', due_date: '2026-08-05', is_mandatory: true, order_index: 1 }
        ]
      },
      {
        id: 'os2-stg-02',
        service_order_id: 'os-02',
        name: '02 Análise Biomecânica RULA / OWAS / NIOSH',
        order_index: 2,
        status: 'COMPLETED',
        start_date: '2026-08-06',
        due_date: '2026-08-14',
        completed_at: '2026-08-14T17:00:00Z',
        progress: 100,
        is_mandatory: true,
        requires_client: false,
        tasks: [
          { id: 'tsk2-02', service_stage_id: 'os2-stg-02', name: 'Processar equações de levantamento', description: 'Cálculo de sobrecarga.', status: 'COMPLETED', priority: 'HIGH', due_date: '2026-08-14', is_mandatory: true, order_index: 1 }
        ]
      },
      {
        id: 'os2-stg-03',
        service_order_id: 'os-02',
        name: '03 Entrega e Apresentação de Melhorias',
        order_index: 3,
        status: 'COMPLETED',
        start_date: '2026-08-15',
        due_date: '2026-08-20',
        completed_at: '2026-08-19T14:00:00Z',
        progress: 100,
        is_mandatory: true,
        requires_client: true,
        tasks: [
          { id: 'tsk2-03', service_stage_id: 'os2-stg-03', name: 'Apresentar recomendações e liberar laudo', description: 'Laudo entregue no portal.', status: 'COMPLETED', priority: 'HIGH', due_date: '2026-08-19', is_mandatory: true, order_index: 1 }
        ]
      }
    ],
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-20T10:00:00Z'
  }
];

export const INITIAL_DOCUMENTS: Document[] = [
  {
    id: 'doc-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    service_order_id: 'os-01',
    stage_id: 'os-stg-10',
    doc_number: 'DOC-2026-000001',
    name: 'PGR — Programa de Gerenciamento de Riscos 2026',
    document_type: 'PGR',
    status: 'IN_REVIEW',
    current_version: 2,
    storage_path: '/storage/organizations/org-prevsafe-01/services/os-01/drafts/PGR_Valenca_v2.pdf',
    uploaded_by_name: 'Eng. Eduardo Vasconcelos',
    is_client_released: false,
    versions: [
      {
        id: 'ver-01',
        document_id: 'doc-01',
        version: 1,
        storage_path: '/storage/organizations/org-prevsafe-01/services/os-01/drafts/PGR_Valenca_v1.pdf',
        file_name: 'PGR_Valenca_v1.pdf',
        mime_type: 'application/pdf',
        file_size: 4200150,
        checksum: 'MD5:d41d8cd98f00b204e9800998ecf8427e',
        status: 'SUPERSEDED',
        created_by_name: 'Eng. Eduardo Vasconcelos',
        created_at: '2026-08-24T16:00:00Z',
        notes: 'Primeiro rascunho com dados preliminares da visita.',
        is_client_released: false
      },
      {
        id: 'ver-02',
        document_id: 'doc-01',
        version: 2,
        storage_path: '/storage/organizations/org-prevsafe-01/services/os-01/drafts/PGR_Valenca_v2.pdf',
        file_name: 'PGR_Valenca_v2.pdf',
        mime_type: 'application/pdf',
        file_size: 5120890,
        checksum: 'MD5:7902699be42c8a8e46fbbb450172650c',
        status: 'IN_REVIEW',
        created_by_name: 'Eng. Eduardo Vasconcelos',
        created_at: '2026-08-25T11:00:00Z',
        notes: 'Inclusão da matriz 5W2H do plano de ação e fotos de campo.',
        is_client_released: false
      }
    ],
    created_at: '2026-08-24T16:00:00Z',
    updated_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'doc-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    service_order_id: 'os-02',
    stage_id: 'os2-stg-03',
    doc_number: 'DOC-2026-000002',
    name: 'Laudo Ergonômico AET — Base TransBrasil 2026',
    document_type: 'AET',
    status: 'APPROVED',
    current_version: 1,
    storage_path: '/storage/organizations/org-prevsafe-01/services/os-02/final/AET_TransBrasil_FINAL.pdf',
    uploaded_by_name: 'Eng. Eduardo Vasconcelos',
    is_client_released: true,
    versions: [
      {
        id: 'ver-03',
        document_id: 'doc-02',
        version: 1,
        storage_path: '/storage/organizations/org-prevsafe-01/services/os-02/final/AET_TransBrasil_FINAL.pdf',
        file_name: 'AET_TransBrasil_FINAL.pdf',
        mime_type: 'application/pdf',
        file_size: 8904500,
        checksum: 'MD5:c3fcd3d76192e4007dfb496cca67e13b',
        status: 'FINAL',
        created_by_name: 'Eng. Eduardo Vasconcelos',
        created_at: '2026-08-19T14:00:00Z',
        notes: 'Versão final assinada com ART CREA.',
        is_client_released: true
      }
    ],
    created_at: '2026-08-19T14:00:00Z',
    updated_at: '2026-08-19T14:00:00Z'
  },
  {
    id: 'doc-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    doc_number: 'DOC-2026-000003',
    name: 'Contrato de Prestação de Serviços SST 2026 Assinado',
    document_type: 'CONTRATO',
    status: 'FINAL',
    current_version: 1,
    storage_path: '/storage/organizations/org-prevsafe-01/contracts/Contrato_Valenca_2026.pdf',
    uploaded_by_name: 'Sistema PrevSafe',
    is_client_released: true,
    versions: [
      {
        id: 'ver-04',
        document_id: 'doc-03',
        version: 1,
        storage_path: '/storage/organizations/org-prevsafe-01/contracts/Contrato_Valenca_2026.pdf',
        file_name: 'Contrato_Valenca_2026_Assinado.pdf',
        mime_type: 'application/pdf',
        file_size: 1240000,
        checksum: 'MD5:8b1a9953c4611296a827abf8c47804d7',
        status: 'FINAL',
        created_by_name: 'Sistema PrevSafe',
        created_at: '2026-08-16T10:30:00Z',
        notes: 'Assinado digitalmente por ambas as partes.',
        is_client_released: true
      }
    ],
    created_at: '2026-08-16T10:30:00Z',
    updated_at: '2026-08-16T10:30:00Z'
  }
];

export const INITIAL_REQUESTS: RequestItem[] = [
  {
    id: 'req-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    service_order_id: 'os-01',
    stage_id: 'os-stg-02',
    req_number: 'REQ-2026-000001',
    title: 'Enviar relação atualizada de funcionários por setor',
    description: 'Necessário para fechar os Grupos Homogêneos de Exposição (GHE) no PGR e alimentar a base do eSocial.',
    type: 'INFORMATION',
    priority: 'HIGH',
    status: 'OPEN',
    assigned_to_client_user: 'user-client-02', // Beatriz Ramos
    due_date: '2026-08-28',
    created_at: '2026-08-25T08:00:00Z'
  },
  {
    id: 'req-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    service_order_id: 'os-01',
    stage_id: 'os-stg-03',
    req_number: 'REQ-2026-000002',
    title: 'Anexar FISPQ do novo desengraxante industrial',
    description: 'Ficha de Informação de Segurança de Produto Químico da linha de tratamento de superfície.',
    type: 'DOCUMENT',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    assigned_to_client_user: 'user-client-02',
    due_date: '2026-08-20',
    resolved_at: '2026-08-19T16:00:00Z',
    resolution_notes: 'Documento PDF recebido e conferido pelo Eng. Eduardo.',
    created_at: '2026-08-17T10:00:00Z'
  },
  {
    id: 'req-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    service_order_id: 'os-02',
    req_number: 'REQ-2026-000003',
    title: 'Realizar Aceite Formal da Análise Ergonômica (AET)',
    description: 'Por favor, revise o documento final disponibilizado no portal e confirme o aceite.',
    type: 'APPROVAL',
    priority: 'HIGH',
    status: 'SENT',
    assigned_to_client_user: 'cnt-03',
    due_date: '2026-08-30',
    created_at: '2026-08-20T10:30:00Z'
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-01',
    organization_id: 'org-prevsafe-01',
    recipient_user_id: 'user-client-01',
    recipient_name: 'Dr. João Alencar',
    recipient_email: 'joao.alencar@valencametal.com.br',
    recipient_phone: '5511977772001',
    event_type: 'proposal.approved',
    title: 'Proposta Comercial Aprovada com Sucesso',
    message: 'A proposta PROP-2026-000001 foi confirmada e o contrato CONT-2026-000001 está liberado para assinatura.',
    channel: 'WHATSAPP',
    status: 'READ',
    related_entity_type: 'PROPOSAL',
    related_entity_id: 'prop-01',
    deliveries: [
      {
        id: 'del-01',
        notification_id: 'notif-01',
        channel: 'WHATSAPP',
        provider: 'Z-API WhatsApp Cloud',
        external_id: 'wamid.HBgLMNTUxMTk3Nzc3',
        status: 'READ',
        sent_at: '2026-08-15T15:21:00Z',
        delivered_at: '2026-08-15T15:21:05Z',
        read_at: '2026-08-15T15:22:10Z'
      }
    ],
    sent_at: '2026-08-15T15:21:00Z',
    read_at: '2026-08-15T15:22:10Z'
  },
  {
    id: 'notif-02',
    organization_id: 'org-prevsafe-01',
    recipient_user_id: 'user-tech-01',
    recipient_name: 'Eng. Eduardo Vasconcelos',
    recipient_email: 'eduardo.vasconcelos@prevsafe.com.br',
    event_type: 'service.stage.completed',
    title: 'Etapa 09 (Plano de Ação) Concluída na OS-2026-000457',
    message: 'A etapa 09 foi finalizada. A etapa 10 (Elaboração Documental) está agora ativa.',
    channel: 'PORTAL',
    status: 'UNREAD',
    related_entity_type: 'SERVICE_ORDER',
    related_entity_id: 'os-01',
    deliveries: [
      {
        id: 'del-02',
        notification_id: 'notif-02',
        channel: 'PORTAL',
        provider: 'PrevSafe InApp Notifications',
        status: 'DELIVERED',
        sent_at: '2026-08-25T11:30:00Z',
        delivered_at: '2026-08-25T11:30:00Z'
      }
    ],
    sent_at: '2026-08-25T11:30:00Z'
  }
];

export const INITIAL_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'tmpl-notif-01',
    organization_id: 'org-prevsafe-01',
    event_type: 'proposal.sent',
    channel: 'WHATSAPP',
    subject: 'Proposta Comercial PrevSafe - {{client_name}}',
    body: 'Olá, {{client_name}}! Sua proposta comercial {{proposal_number}} referente a {{service_name}} já está disponível para visualização e aprovação no link: {{portal_url}}',
    active: true
  },
  {
    id: 'tmpl-notif-02',
    organization_id: 'org-prevsafe-01',
    event_type: 'contract.signed',
    channel: 'EMAIL',
    subject: 'Contrato Assinado com Sucesso — {{client_name}}',
    body: 'Prezado(a) {{client_name}}, confirmamos a assinatura digital do contrato {{contract_number}}. A Ordem de Serviço {{os_number}} foi aberta e nossa equipe técnica iniciará o atendimento.',
    active: true
  },
  {
    id: 'tmpl-notif-03',
    organization_id: 'org-prevsafe-01',
    event_type: 'service.delivered',
    channel: 'WHATSAPP',
    subject: 'Documentos do Serviço {{os_number}} Disponíveis para Aceite',
    body: 'Olá, {{client_name}}! O serviço {{service_name}} (OS {{os_number}}) foi concluído e os documentos oficiais estão prontos para seu download e aceite formal no Portal: {{portal_url}}',
    active: true
  },
  {
    id: 'tmpl-notif-04',
    organization_id: 'org-prevsafe-01',
    event_type: 'request.created',
    channel: 'SMS',
    subject: 'Pendência SST PrevSafe',
    body: 'PrevSafe: Nova pendência aberta para {{client_name}} referente a {{service_name}}. Acesse {{portal_url}} para enviar.',
    active: true
  }
];

export const INITIAL_COMMUNICATIONS: Communication[] = [
  {
    id: 'comm-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    service_order_id: 'os-01',
    channel: 'WHATSAPP',
    direction: 'OUTBOUND',
    subject: 'Confirmação da Visita Técnica de Campo',
    content: 'Prezado Dr. João, confirmamos a visita do Eng. Eduardo no dia 22/08 às 09h para inspeção da estamparia e solda.',
    sent_by_name: 'Eng. Eduardo Vasconcelos',
    created_at: '2026-08-20T11:05:00Z'
  },
  {
    id: 'comm-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    service_order_id: 'os-01',
    channel: 'WHATSAPP',
    direction: 'INBOUND',
    subject: 'Re: Confirmação da Visita Técnica',
    content: 'Perfeito, Eduardo! Portaria e supervisores da produção já avisados para liberação dos EPIs e acompanhamento.',
    sent_by_name: 'Dr. João Alencar',
    created_at: '2026-08-20T11:20:00Z'
  },
  {
    id: 'comm-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    service_order_id: 'os-01',
    channel: 'EMAIL',
    direction: 'OUTBOUND',
    subject: 'Envio da Lista de Funcionários - Pendência REQ-2026-000001',
    content: 'Olá Beatriz, conforme conversamos, solicitamos o envio da planilha com os 380 colaboradores estratificados por função.',
    sent_by_name: 'Mariana Siqueira',
    created_at: '2026-08-25T08:15:00Z'
  }
];

export const INITIAL_EVALUATIONS: Evaluation[] = [
  {
    id: 'eval-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    service_order_id: 'os-02',
    service_title: 'AET — Análise Ergonômica do Trabalho (NR-17)',
    overall_score: 5,
    quality_score: 5,
    service_score: 5,
    deadline_score: 4,
    communication_score: 5,
    nps_score: 10,
    comment: 'Excelente trabalho técnico da PrevSafe. A apresentação do laudo ergonômico esclareceu pontos críticos da cabine dos caminhões. Já estamos cotando a renovação.',
    created_at: '2026-08-21T16:00:00Z'
  },
  {
    id: 'eval-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-alfa-03',
    service_order_id: 'os-alfa-past',
    service_title: 'Treinamento NR-35 Trabalho em Altura Obra Sky',
    overall_score: 5,
    quality_score: 5,
    service_score: 5,
    deadline_score: 5,
    communication_score: 4,
    nps_score: 9,
    comment: 'Instrutor muito didático e prático com a equipe da obra. Certificados entregues em 24 horas no portal.',
    created_at: '2026-07-28T14:30:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-01',
    organization_id: 'org-prevsafe-01',
    user_id: 'user-admin-01',
    user_name: 'Carlos Mendes',
    user_role: 'ADMIN',
    action: 'PROPOSAL_CREATED',
    entity_type: 'PROPOSAL',
    entity_id: 'prop-01',
    entity_number: 'PROP-2026-000001',
    new_data: { total: 18000, client: 'Metalúrgica Valença' },
    ip_address: '177.18.29.100',
    created_at: '2026-08-10T10:00:00Z'
  },
  {
    id: 'audit-02',
    organization_id: 'org-prevsafe-01',
    user_id: 'user-client-01',
    user_name: 'Dr. João Alencar',
    user_role: 'CLIENTE_ADMIN',
    action: 'PROPOSAL_APPROVED',
    entity_type: 'PROPOSAL',
    entity_id: 'prop-01',
    entity_number: 'PROP-2026-000001',
    new_data: { action: 'APPROVED', comment: 'Proposta aprovada no portal' },
    ip_address: '189.120.45.10',
    created_at: '2026-08-15T15:20:00Z'
  },
  {
    id: 'audit-03',
    organization_id: 'org-prevsafe-01',
    user_id: 'user-admin-01',
    user_name: 'Carlos Mendes',
    user_role: 'ADMIN',
    action: 'CONTRACT_CREATED',
    entity_type: 'CONTRACT',
    entity_id: 'cont-01',
    entity_number: 'CONT-2026-000001',
    new_data: { recurrence: 'ANNUAL', total_value: 18000 },
    ip_address: '177.18.29.100',
    created_at: '2026-08-15T16:00:00Z'
  },
  {
    id: 'audit-04',
    organization_id: 'org-prevsafe-01',
    user_id: 'user-client-01',
    user_name: 'Dr. João Alencar',
    user_role: 'CLIENTE_ADMIN',
    action: 'CONTRACT_SIGNED',
    entity_type: 'CONTRACT',
    entity_id: 'cont-01',
    entity_number: 'CONT-2026-000001',
    new_data: { signed_at: '2026-08-16T10:30:00Z', hash: 'SHA256:f47b2c991e0a29d8819a' },
    ip_address: '189.120.45.10',
    created_at: '2026-08-16T10:30:00Z'
  },
  {
    id: 'audit-05',
    organization_id: 'org-prevsafe-01',
    user_id: 'user-manager-01',
    user_name: 'Mariana Siqueira',
    user_role: 'GESTOR',
    action: 'OS_CREATED',
    entity_type: 'SERVICE_ORDER',
    entity_id: 'os-01',
    entity_number: 'OS-2026-000457',
    new_data: { template: 'PGR-NR01', stages_count: 15 },
    ip_address: '177.18.29.102',
    created_at: '2026-08-16T11:00:00Z'
  },
  {
    id: 'audit-06',
    organization_id: 'org-prevsafe-01',
    user_id: 'user-tech-01',
    user_name: 'Eng. Eduardo Vasconcelos',
    user_role: 'TÉCNICO',
    action: 'STAGE_COMPLETED',
    entity_type: 'STAGE',
    entity_id: 'os-stg-05',
    entity_number: 'OS-2026-000457 / Etapa 05',
    new_data: { checklist_completed: 8, photos_count: 2 },
    ip_address: '187.54.12.90',
    created_at: '2026-08-23T15:00:00Z'
  },
  {
    id: 'audit-07',
    organization_id: 'org-prevsafe-01',
    user_id: 'user-tech-01',
    user_name: 'Eng. Eduardo Vasconcelos',
    user_role: 'TÉCNICO',
    action: 'DOCUMENT_UPLOADED',
    entity_type: 'DOCUMENT',
    entity_id: 'doc-01',
    entity_number: 'DOC-2026-000001',
    new_data: { version: 2, file_name: 'PGR_Valenca_v2.pdf' },
    ip_address: '187.54.12.90',
    created_at: '2026-08-25T11:00:00Z'
  }
];

export const INITIAL_ESOCIAL_EVENTS: ESocialEvent[] = [
  {
    id: 'evt-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'client-01',
    service_order_id: 'os-01',
    event_type: 'S-2240',
    event_number: 'EVT-2026-000101',
    status: 'SUCCESS',
    environment: 'PRODUCAO',
    is_rectification: false,
    worker_name: 'Marcos Paulo da Silva',
    worker_cpf: '234.567.890-12',
    worker_nis: '128.45902.11-4',
    worker_registration: 'MAT-8812',
    worker_cbo: '7212-15',
    worker_role: 'Operador de Torno CNC / Centro de Usinagem',
    workplace_unit_id: 'unit-01',
    ambient_data: {
      start_date: '2026-01-10',
      description_activities: 'Operação de torno CNC, usinagem de peças metálicas seriadas, abastecimento de fluidos de corte e medição de precisão.',
      work_environment: 'Galpão Principal de Usinagem Pesada - Setor A',
      ambient_risks: [
        {
          id: 'risk-101',
          risk_code_table_24: '01.01.001',
          category: 'FÍSICO',
          description: 'Ruído Contínuo e Intermitente em Usinagem',
          intensity_concentration: '87.4 dB(A)',
          limit_tolerance: '85.0 dB(A) (NHO-01 / NR-15 Anexo 1)',
          measurement_unit: 'dB(A)',
          technique_used: 'Dosimetria de Ruído (Audiodosímetro Integrador NHO-01)',
          epc_effective: false,
          epi_effective: true,
          epi_ca_numbers: ['CA 14235', 'CA 38240'],
          is_insalubre: true,
          is_periculoso: false
        },
        {
          id: 'risk-102',
          risk_code_table_24: '02.01.014',
          category: 'QUÍMICO',
          description: 'Névoas de Óleo Mineral e Fluido de Corte Solúvel',
          intensity_concentration: '2.1 mg/m³',
          limit_tolerance: '5.0 mg/m³ (ACGIH / NR-15 Anexo 11)',
          measurement_unit: 'mg/m³',
          technique_used: 'Amostragem em Bomba Gravimétrica com Filtro PTFE',
          epc_effective: true,
          epi_effective: true,
          epi_ca_numbers: ['CA 41120', 'CA 28911'],
          is_insalubre: false,
          is_periculoso: false
        }
      ],
      responsible_technician_name: 'Eng. Eduardo Vasconcelos',
      responsible_technician_cpf: '123.456.789-00',
      responsible_technician_crea_crm: 'CREA-SP 5069812/D',
      responsible_technician_uf: 'SP'
    },
    receipt_number: '1.2.202608.0000000000000847120-01',
    protocol_number: 'PROT-SERPRO-889102-2026',
    transmitted_at: '2026-08-18T14:22:10Z',
    transmission_batch_id: 'batch-01',
    return_code: '201',
    return_message: 'Evento processado e recepcionado com sucesso pela base oficial do eSocial (Serpro).',
    created_at: '2026-08-18T10:00:00Z',
    updated_at: '2026-08-18T14:22:10Z',
    history: [
      { date: '2026-08-18T10:00:00Z', action: 'CRIAÇÃO', user_name: 'Eng. Eduardo Vasconcelos', status: 'DRAFT', details: 'Evento gerado a partir do PGR/LTCAT da OS-2026-000457.' },
      { date: '2026-08-18T11:15:00Z', action: 'VALIDAÇÃO_XSD', user_name: 'Eng. Eduardo Vasconcelos', status: 'VALIDATED', details: 'Validação de schemas XSD v.S-1.2 sem erros.' },
      { date: '2026-08-18T14:22:10Z', action: 'TRANSMISSÃO_GOVERNO', user_name: 'Mariana Siqueira', status: 'SUCCESS', details: 'Transmissão assinada com Certificado A1 ICP-Brasil e recibo emitido.' }
    ]
  },
  {
    id: 'evt-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'client-01',
    service_order_id: 'os-01',
    event_type: 'S-2220',
    event_number: 'EVT-2026-000102',
    status: 'SUCCESS',
    environment: 'PRODUCAO',
    is_rectification: false,
    worker_name: 'Rodrigo Albuquerque de Oliveira',
    worker_cpf: '345.678.901-23',
    worker_nis: '130.88712.99-1',
    worker_registration: 'MAT-9104',
    worker_cbo: '7243-15',
    worker_role: 'Soldador TIG / Caldeireiro Industrial',
    workplace_unit_id: 'unit-01',
    aso_data: {
      aso_type: 'PERIODICO',
      exam_date: '2026-08-14',
      result: 'APTO',
      physician_name: 'Dra. Camila Bittencourt Guimarães',
      physician_crm: 'CRM-SP 145892',
      physician_uf: 'SP',
      pcmso_coordinator_name: 'Dr. Roberto Magalhães Filho',
      pcmso_coordinator_crm: 'CRM-SP 98210',
      pcmso_coordinator_uf: 'SP',
      exams_list: [
        {
          code: '0295',
          name: 'Avaliação Clínica Ocupacional e Anamnese Geral',
          date: '2026-08-14',
          procedure_type: 'CLINICO',
          result: 'NORMAL',
          observation: 'Apto para atividades com exposição a calor e fumos metálicos.'
        },
        {
          code: '0281',
          name: 'Audiometria Tonal Ocupacional por Via Aérea e Óssea',
          date: '2026-08-12',
          procedure_type: 'AUDIOMETRIA',
          result: 'ESTAVEL',
          observation: 'Limiares auditivos estáveis em relação ao traçado referencial anterior.'
        },
        {
          code: '0340',
          name: 'Espirometria Ocupacional de Capacidade Vital Forçada',
          date: '2026-08-12',
          procedure_type: 'ESPIROMETRIA',
          result: 'NORMAL',
          observation: 'Parâmetros ventilatórios pulmonares sem restrições ou obstruções.'
        },
        {
          code: '0491',
          name: 'Telerradiografia de Tórax Padrão OIT',
          date: '2026-08-11',
          procedure_type: 'RX_TORAX_OIT',
          result: 'NORMAL',
          observation: 'Classificação radiológica 0/0 (ausência de pneumoconiose).'
        }
      ]
    },
    receipt_number: '1.2.202608.0000000000000847135-02',
    protocol_number: 'PROT-SERPRO-889103-2026',
    transmitted_at: '2026-08-19T09:40:00Z',
    transmission_batch_id: 'batch-01',
    return_code: '201',
    return_message: 'Evento processado e recepcionado com sucesso pela base oficial do eSocial (Serpro).',
    created_at: '2026-08-19T08:00:00Z',
    updated_at: '2026-08-19T09:40:00Z',
    history: [
      { date: '2026-08-19T08:00:00Z', action: 'CRIAÇÃO', user_name: 'Dra. Camila Bittencourt', status: 'DRAFT', details: 'Lançamento do ASO Periódico e exames complementares.' },
      { date: '2026-08-19T09:40:00Z', action: 'TRANSMISSÃO_GOVERNO', user_name: 'Mariana Siqueira', status: 'SUCCESS', details: 'Transmissão assinada com Certificado A1 ICP-Brasil e recibo emitido.' }
    ]
  },
  {
    id: 'evt-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'client-02',
    service_order_id: 'os-02',
    event_type: 'S-2210',
    event_number: 'EVT-2026-000103',
    status: 'SUCCESS',
    environment: 'PRODUCAO',
    is_rectification: false,
    worker_name: 'Juliana Fontes Medeiros',
    worker_cpf: '456.789.012-34',
    worker_nis: '131.22904.55-0',
    worker_registration: 'MAT-5520',
    worker_cbo: '7822-20',
    worker_role: 'Operadora de Empilhadeira e Transpaleteira',
    workplace_unit_id: 'unit-02',
    cat_data: {
      cat_type: 'INICIAL',
      accident_date: '2026-08-20',
      accident_time: '10:45',
      accident_type: 'TIPICO',
      body_part: 'Tornozelo e Pé Direito',
      accident_agent: 'Piso com desnível na rampa de transbordo e carga paletizada',
      death_occurred: false,
      police_report: false,
      medical_cert_issuer: 'Hospital Municipal de Pronto Socorro',
      medical_crm: 'CRM-RJ 88412',
      medical_uf: 'RJ',
      cid_code: 'S93.4 - Entorse e distensão do tornozelo',
      days_away: 7,
      location_type: 'ESTABELECIMENTO_EMPREGADOR',
      location_description: 'Doca de Carga e Descarga - Almoxarifado Central'
    },
    receipt_number: '1.2.202608.0000000000000847190-03',
    protocol_number: 'PROT-SERPRO-889140-2026',
    transmitted_at: '2026-08-21T08:15:22Z',
    transmission_batch_id: 'batch-02',
    return_code: '201',
    return_message: 'Comunicação de Acidente de Trabalho (CAT) registrada com sucesso.',
    created_at: '2026-08-20T16:00:00Z',
    updated_at: '2026-08-21T08:15:22Z',
    history: [
      { date: '2026-08-20T16:00:00Z', action: 'CRIAÇÃO', user_name: 'Carlos Mendes', status: 'DRAFT', details: 'Abertura de CAT Inicial protocolada pelo SESMT.' },
      { date: '2026-08-21T08:15:22Z', action: 'TRANSMISSÃO_GOVERNO', user_name: 'Carlos Mendes', status: 'SUCCESS', details: 'Envio tempestivo antes do 1º dia útil seguinte.' }
    ]
  },
  {
    id: 'evt-04',
    organization_id: 'org-prevsafe-01',
    client_id: 'client-02',
    service_order_id: 'os-02',
    event_type: 'S-2240',
    event_number: 'EVT-2026-000104',
    status: 'READY_TO_SEND',
    environment: 'PRODUCAO',
    is_rectification: false,
    worker_name: 'Fernando Bezerra da Costa',
    worker_cpf: '567.890.123-45',
    worker_nis: '132.44109.88-3',
    worker_registration: 'MAT-3341',
    worker_cbo: '7152-10',
    worker_role: 'Pedreiro de Manutenção Predial e Altura',
    workplace_unit_id: 'unit-02',
    ambient_data: {
      start_date: '2026-02-01',
      description_activities: 'Execução de alvenaria estrutural, revestimentos de fachadas em balancim suspenso e reparos em telhados industriais.',
      work_environment: 'Obras Civis e Manutenção Predial de Fachadas',
      ambient_risks: [
        {
          id: 'risk-103',
          risk_code_table_24: '05.01.001',
          category: 'ACIDENTES',
          description: 'Trabalho em Altura (> 2,00m) com Risco de Queda',
          intensity_concentration: 'Qualitativo (NR-35)',
          technique_used: 'Análise Preliminar de Risco (APR) e Permissão de Trabalho (PT)',
          epc_effective: true,
          epi_effective: true,
          epi_ca_numbers: ['CA 36890', 'CA 40129', 'CA 18450'],
          is_insalubre: false,
          is_periculoso: false
        },
        {
          id: 'risk-104',
          risk_code_table_24: '02.01.001',
          category: 'QUÍMICO',
          description: 'Poeiras Minerais Respiráveis Contendo Sílica Livre Cristalizada',
          intensity_concentration: '0.04 mg/m³',
          limit_tolerance: '0.05 mg/m³ (NR-15 Anexo 12)',
          measurement_unit: 'mg/m³',
          technique_used: 'Ciclone de Nylon Dorr-Oliver acoplado a Bomba Gravimétrica',
          epc_effective: true,
          epi_effective: true,
          epi_ca_numbers: ['CA 41120'],
          is_insalubre: false,
          is_periculoso: false
        }
      ],
      responsible_technician_name: 'Eng. Eduardo Vasconcelos',
      responsible_technician_cpf: '123.456.789-00',
      responsible_technician_crea_crm: 'CREA-SP 5069812/D',
      responsible_technician_uf: 'SP'
    },
    created_at: '2026-08-24T14:00:00Z',
    updated_at: '2026-08-25T09:10:00Z',
    history: [
      { date: '2026-08-24T14:00:00Z', action: 'CRIAÇÃO', user_name: 'Eng. Eduardo Vasconcelos', status: 'DRAFT', details: 'Evento cadastrado e revisado.' },
      { date: '2026-08-25T09:10:00Z', action: 'VALIDAÇÃO_XSD', user_name: 'Mariana Siqueira', status: 'READY_TO_SEND', details: 'Aprovado pelo validador XSD. Pronto para transmissão em lote.' }
    ]
  },
  {
    id: 'evt-05',
    organization_id: 'org-prevsafe-01',
    client_id: 'client-01',
    service_order_id: 'os-01',
    event_type: 'S-2220',
    event_number: 'EVT-2026-000105',
    status: 'VALIDATED',
    environment: 'PRODUCAO',
    is_rectification: false,
    worker_name: 'Larissa Neves Silveira',
    worker_cpf: '678.901.234-56',
    worker_nis: '133.77102.12-9',
    worker_registration: 'MAT-9921',
    worker_cbo: '4110-10',
    worker_role: 'Assistente Administrativa e Controle Financeiro',
    workplace_unit_id: 'unit-01',
    aso_data: {
      aso_type: 'ADMISSIONAL',
      exam_date: '2026-08-24',
      result: 'APTO',
      physician_name: 'Dra. Camila Bittencourt Guimarães',
      physician_crm: 'CRM-SP 145892',
      physician_uf: 'SP',
      pcmso_coordinator_name: 'Dr. Roberto Magalhães Filho',
      pcmso_coordinator_crm: 'CRM-SP 98210',
      pcmso_coordinator_uf: 'SP',
      exams_list: [
        {
          code: '0295',
          name: 'Avaliação Clínica Ocupacional Admissional',
          date: '2026-08-24',
          procedure_type: 'CLINICO',
          result: 'NORMAL',
          observation: 'Apto para o desempenho das funções sem restrições ocupacionais.'
        }
      ]
    },
    created_at: '2026-08-24T16:00:00Z',
    updated_at: '2026-08-25T08:30:00Z',
    history: [
      { date: '2026-08-24T16:00:00Z', action: 'CRIAÇÃO', user_name: 'Dra. Camila Bittencourt', status: 'DRAFT', details: 'Cadastro de ASO Admissional.' },
      { date: '2026-08-25T08:30:00Z', action: 'VALIDAÇÃO_XSD', user_name: 'Mariana Siqueira', status: 'VALIDATED', details: 'Dados validados com sucesso.' }
    ]
  },
  {
    id: 'evt-06',
    organization_id: 'org-prevsafe-01',
    client_id: 'client-01',
    service_order_id: 'os-01',
    event_type: 'S-2240',
    event_number: 'EVT-2026-000106',
    status: 'REJECTED',
    environment: 'PRODUCAO',
    is_rectification: false,
    worker_name: 'Gustavo Lima Nogueira',
    worker_cpf: '789.012.345-67',
    worker_nis: '134.88901.34-7',
    worker_registration: 'MAT-4421',
    worker_cbo: '8117-05',
    worker_role: 'Operador Químico de Destilação',
    workplace_unit_id: 'unit-01',
    ambient_data: {
      start_date: '2026-01-15',
      description_activities: 'Manipulação de reagentes voláteis em coluna de fracionamento.',
      work_environment: 'Parque de Tanques e Destilaria',
      ambient_risks: [
        {
          id: 'risk-105',
          risk_code_table_24: '02.01.025',
          category: 'QUÍMICO',
          description: 'Solventes Aromáticos e Vapores de Tolueno',
          intensity_concentration: '12.0 ppm',
          technique_used: 'Tubo Colorimétrico',
          epc_effective: false,
          epi_effective: true,
          epi_ca_numbers: ['CA 00000'], // Invalid CA to test rejection
          is_insalubre: true,
          is_periculoso: false
        }
      ],
      responsible_technician_name: 'Eng. Eduardo Vasconcelos',
      responsible_technician_cpf: '123.456.789-00',
      responsible_technician_crea_crm: 'CREA-SP 5069812/D',
      responsible_technician_uf: 'SP'
    },
    validation_errors: [
      'Erro 401 - CA do Equipamento de Proteção Individual (EPI) inválido ou vencido no cadastro do MTE (CA 00000).'
    ],
    return_code: '401',
    return_message: 'MS1002 - O Certificado de Aprovação (CA) informado não existe ou encontra-se cancelado na base do Ministério do Trabalho e Emprego.',
    created_at: '2026-08-22T10:00:00Z',
    updated_at: '2026-08-22T14:30:00Z',
    history: [
      { date: '2026-08-22T10:00:00Z', action: 'CRIAÇÃO', user_name: 'Eng. Eduardo Vasconcelos', status: 'DRAFT', details: 'Evento criado.' },
      { date: '2026-08-22T14:30:00Z', action: 'REJEIÇÃO_SERPRO', user_name: 'Sistema eSocial', status: 'REJECTED', details: 'Rejeitado com código MS1002 (CA inválido).' }
    ]
  },
  {
    id: 'evt-07',
    organization_id: 'org-prevsafe-01',
    client_id: 'client-02',
    service_order_id: 'os-02',
    event_type: 'S-2240',
    event_number: 'EVT-2026-000107',
    status: 'DRAFT',
    environment: 'PRODUCAO',
    is_rectification: false,
    worker_name: 'Lucas Andrade Ramos',
    worker_cpf: '890.123.456-78',
    worker_registration: 'MAT-1049',
    worker_cbo: '5143-20',
    worker_role: 'Auxiliar de Limpeza e Conservação',
    workplace_unit_id: 'unit-02',
    ambient_data: {
      start_date: '2026-03-01',
      description_activities: 'Higienização de áreas comuns e sanitários com produtos domissanitários.',
      work_environment: 'Instalações Administrativas e Sanitários',
      ambient_risks: [
        {
          id: 'risk-106',
          risk_code_table_24: '03.01.001',
          category: 'BIOLÓGICO',
          description: 'Agentes Biológicos em Sanitários de Grande Circulação',
          intensity_concentration: 'Qualitativo',
          technique_used: 'Inspeção Visual e Avaliação Qualitativa NR-15 Anexo 14',
          epc_effective: false,
          epi_effective: true,
          epi_ca_numbers: ['CA 38901'],
          is_insalubre: true,
          is_periculoso: false
        }
      ],
      responsible_technician_name: 'Eng. Eduardo Vasconcelos',
      responsible_technician_cpf: '123.456.789-00',
      responsible_technician_crea_crm: 'CREA-SP 5069812/D',
      responsible_technician_uf: 'SP'
    },
    created_at: '2026-08-25T11:00:00Z',
    updated_at: '2026-08-25T11:00:00Z',
    history: [
      { date: '2026-08-25T11:00:00Z', action: 'CRIAÇÃO', user_name: 'Eng. Eduardo Vasconcelos', status: 'DRAFT', details: 'Rascunho inicial criado para preenchimento posterior.' }
    ]
  },
  {
    id: 'evt-08',
    organization_id: 'org-prevsafe-01',
    client_id: 'client-01',
    event_type: 'S-3000',
    event_number: 'EVT-2026-000108',
    status: 'SUCCESS',
    environment: 'PRODUCAO',
    is_rectification: false,
    worker_name: 'Antônio Carlos Moreira (Ex-colaborador)',
    worker_cpf: '901.234.567-89',
    worker_registration: 'MAT-2019',
    worker_cbo: '7212-15',
    worker_role: 'Torneiro Mecânico',
    exclusion_data: {
      target_event_type: 'S-2240',
      target_receipt_number: '1.2.202607.0000000000000632110-00',
      exclusion_reason: 'Exclusão de evento transmitido indevidamente com data de admissão divergente da CTPS digital.'
    },
    receipt_number: '1.2.202608.0000000000000847999-09',
    protocol_number: 'PROT-SERPRO-889999-2026',
    transmitted_at: '2026-08-20T17:45:00Z',
    transmission_batch_id: 'batch-02',
    return_code: '201',
    return_message: 'Evento de Exclusão S-3000 processado e evento anterior baixado no eSocial.',
    created_at: '2026-08-20T17:00:00Z',
    updated_at: '2026-08-20T17:45:00Z',
    history: [
      { date: '2026-08-20T17:00:00Z', action: 'CRIAÇÃO', user_name: 'Mariana Siqueira', status: 'DRAFT', details: 'Geração de evento de exclusão S-3000.' },
      { date: '2026-08-20T17:45:00Z', action: 'TRANSMISSÃO_GOVERNO', user_name: 'Mariana Siqueira', status: 'SUCCESS', details: 'Exclusão homologada pelo Serpro.' }
    ]
  },
  {
    id: 'evt-09',
    organization_id: 'org-prevsafe-01',
    client_id: 'client-01',
    event_type: 'S-2230',
    event_number: 'EVT-2026-000109',
    status: 'SUCCESS',
    environment: 'PRODUCAO',
    is_rectification: false,
    worker_name: 'Marcos Vinícius Pires',
    worker_cpf: '321.654.987-12',
    worker_nis: '129.88741.02-3',
    worker_registration: 'MAT-3389',
    worker_cbo: '7241-10',
    worker_role: 'Encanador Industrial e Caldeiraria',
    workplace_unit_id: 'unit-01',
    absence_data: {
      reason_code_table_18: '01',
      reason_description: 'Acidente de trabalho típico ou doença profissional',
      start_date: '2026-08-15',
      end_date: '2026-08-29',
      estimated_days: 14,
      is_traffic_accident: false,
      medical_issuer_name: 'Dr. Fernando Albuquerque',
      medical_crm: 'CRM-SP 120934',
      medical_uf: 'SP',
      cid_10: 'M54.5 - Dor lombar baixa (Lumbago com ciática)',
      observation: 'Repouso domiciliar prescrito após esforço repetitivo em instalação de tubulações pesadas.'
    },
    receipt_number: '1.2.202608.0000000000000847250-05',
    protocol_number: 'PROT-SERPRO-889155-2026',
    transmitted_at: '2026-08-16T10:15:00Z',
    transmission_batch_id: 'batch-01',
    return_code: '201',
    return_message: 'Evento S-2230 (Afastamento Temporário) recepcionado com sucesso.',
    created_at: '2026-08-15T15:00:00Z',
    updated_at: '2026-08-16T10:15:00Z',
    history: [
      { date: '2026-08-15T15:00:00Z', action: 'CRIAÇÃO', user_name: 'Mariana Siqueira', status: 'DRAFT', details: 'Atestado médico de afastamento lançado.' },
      { date: '2026-08-16T10:15:00Z', action: 'TRANSMISSÃO_GOVERNO', user_name: 'Mariana Siqueira', status: 'SUCCESS', details: 'Transmissão do evento S-2230 homologada pelo eSocial.' }
    ]
  }
];

export const INITIAL_ESOCIAL_CONFIG: ESocialConfig = {
  organization_id: 'org-prevsafe-01',
  environment: 'PRODUCAO_RESTRITA',
  layout_version: 'S-01.03.00',
  transmitter_mode: 'PROCURACAO_ELETRONICA',
  employer_type: '1',
  employer_document: '48.910.234/0001-89',
  transmitter_document: '48.910.234/0001-89',
  certificate: {
    file_name: 'PREVSAFE_ENGENHARIA_SST_2026_2027.pfx',
    certificate_type: 'A1_PFX',
    subject_name: 'PREVSAFE ENGENHARIA E MEDICINA DO TRABALHO LTDA:48910234000189',
    subject_cnpj: '48.910.234/0001-89',
    issuer_name: 'AC CERTISIGN MULTIPLA G7 - ICP-BRASIL v5',
    serial_number: '7F3A901B42CD88E10934F',
    valid_from: '2026-01-10T00:00:00Z',
    valid_until: '2027-01-10T23:59:59Z',
    days_remaining: 135,
    status: 'VALID',
    has_password: true,
    last_tested_at: '2026-08-28T08:30:00Z',
    pfx_base64: 'MIIKWgIBAzCCClcGCSqGSIb3DQEHAaCCCkgEggpEMIIKQDCCBA8GCSqGSIb3DQEHBqCC...'
  },
  auto_sign_on_validation: true,
  auto_transmit_batches: false,
  webhook_url: 'https://api.prevsafe.com.br/v1/esocial/webhooks/receipts',
  serpro_client_id: 'serpro_prevsafe_live_883921',
  serpro_client_secret: '••••••••••••••••••••••••••••••••',
  sla_exam_warning_days: 30,
  sla_document_warning_days: 15,
  last_sync_at: '2026-08-28T09:00:00Z'
};

export const INITIAL_ESOCIAL_BATCHES: ESocialBatch[] = [
  {
    id: 'batch-01',
    organization_id: 'org-prevsafe-01',
    batch_number: 'LOTE-2026-00001',
    environment: 'PRODUCAO',
    certificate_type: 'A1_DIGITAL',
    event_ids: ['evt-01', 'evt-02'],
    events_count: 2,
    success_count: 2,
    error_count: 0,
    status: 'SUCESSO_TOTAL',
    protocol_number: 'PROT-SERPRO-889102-2026',
    created_at: '2026-08-18T14:20:00Z',
    completed_at: '2026-08-18T14:22:10Z'
  },
  {
    id: 'batch-02',
    organization_id: 'org-prevsafe-01',
    batch_number: 'LOTE-2026-00002',
    environment: 'PRODUCAO',
    certificate_type: 'A1_DIGITAL',
    event_ids: ['evt-03', 'evt-08'],
    events_count: 2,
    success_count: 2,
    error_count: 0,
    status: 'SUCESSO_TOTAL',
    protocol_number: 'PROT-SERPRO-889140-2026',
    created_at: '2026-08-21T08:10:00Z',
    completed_at: '2026-08-21T08:15:22Z'
  }
];

// ===================================================
// DADOS INICIAIS DO MÓDULO FINANCEIRO (PrevSafe Finance)
// ===================================================

export const INITIAL_FINANCIAL_TRANSACTIONS: FinancialTransaction[] = [
  // --- CONTAS A RECEBER (RECEIVABLES) ---
  {
    id: 'fin-rec-001',
    organization_id: 'org-prevsafe-01',
    type: 'RECEIVABLE',
    status: 'PAID',
    reconciliation_status: 'RECONCILED',
    reconciled_at: '2026-08-08T14:30:00Z',
    reconciled_by: 'Gean Monteiro (Financeiro)',
    reconciliation_ref: 'EXT-ITAU-88392109',
    reconciliation_notes: 'Crédito identificado no extrato conta corrente Itaú Ag 1450 CC 99201-4.',
    title: 'Mensalidade Assessoria SST & eSocial (Agosto/2026)',
    description: 'Gestão contínua de segurança, envio mensal de eventos S-2240 e acompanhamento pericial.',
    client_id: 'client-01',
    client_name: 'Indústria Metalúrgica Alpha S/A',
    contract_id: 'contract-01',
    category: 'MENSALIDADE_SST',
    category_name: 'Mensalidade de Gestão SST',
    amount: 6800.00,
    discount: 0,
    fine_interest: 0,
    final_amount: 6800.00,
    due_date: '2026-08-10',
    payment_date: '2026-08-08',
    payment_method: 'BOLETO',
    document_number: 'NF-e 2026/0491',
    barcode_or_pix: '34191.79001 01043.510047 91020.150008 4 98700000680000',
    notes: 'Pagamento liquidado via compensação bancária Itaú.',
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-08T14:30:00Z'
  },
  {
    id: 'fin-rec-002',
    organization_id: 'org-prevsafe-01',
    type: 'RECEIVABLE',
    status: 'PENDING',
    reconciliation_status: 'PENDING_RECONCILIATION',
    title: 'Elaboração de PGR & PCMSO (Canteiro de Obras CNO)',
    description: 'Programa de Gerenciamento de Riscos (NR-01/NR-18) e PCMSO com cronograma de exames.',
    client_id: 'client-02',
    client_name: 'Construtora & Incorporadora Horizonte Ltda',
    contract_id: 'contract-02',
    service_order_id: 'os-02',
    category: 'ELABORACAO_PGR_PCMSO',
    category_name: 'Elaboração PGR / PCMSO',
    amount: 14500.00,
    discount: 500.00,
    fine_interest: 0,
    final_amount: 14000.00,
    due_date: '2026-08-29',
    payment_method: 'BOLETO',
    document_number: 'FAT-2026-0082',
    barcode_or_pix: '23793.38128 60032.198302 44005.120004 8 98900001400000',
    notes: 'Fatura emitida após validação técnica da OS-2026-0002. Vencimento próximo (D-3).',
    created_at: '2026-08-15T09:30:00Z',
    updated_at: '2026-08-15T09:30:00Z'
  },
  {
    id: 'fin-rec-003',
    organization_id: 'org-prevsafe-01',
    type: 'RECEIVABLE',
    status: 'PENDING',
    reconciliation_status: 'PENDING_RECONCILIATION',
    title: 'Laudo Técnico das Condições Ambientais (LTCAT) CAEPF',
    description: 'Avaliação quantitativa de ruído, calor e defensivos agrícolas com enquadramento previdenciário.',
    client_id: 'client-03',
    client_name: 'Agropecuária Vale Verde (CAEPF)',
    service_order_id: 'os-03',
    category: 'LAUDOS_LTCAT_INSALUBRIDADE',
    category_name: 'Laudos Técnicos (LTCAT / Insalubridade)',
    amount: 8900.00,
    discount: 0,
    fine_interest: 0,
    final_amount: 8900.00,
    due_date: '2026-09-05',
    payment_method: 'PIX',
    document_number: 'REC-2026/0114',
    barcode_or_pix: '00020126580014br.gov.bcb.pix0136prevsafe-financeiro-agro@prevsafe.com.br52040000530398654048900.005802BR',
    notes: 'Aguardando medições in loco para emissão do boleto/chave PIX.',
    created_at: '2026-08-18T10:00:00Z',
    updated_at: '2026-08-18T10:00:00Z'
  },
  {
    id: 'fin-rec-004',
    organization_id: 'org-prevsafe-01',
    type: 'RECEIVABLE',
    status: 'PAID',
    reconciliation_status: 'RECONCILED',
    reconciled_at: '2026-08-14T17:00:00Z',
    reconciled_by: 'Gean Monteiro (Financeiro)',
    reconciliation_ref: 'TED-BRAD-99182',
    reconciliation_notes: 'Conciliado com comprovante de TED enviado pelo setor financeiro da LogMax.',
    title: 'Gestão de Exames Clínicos ASO & Complementares (Julho/2026)',
    description: '45 Exames periódicos e admissionais coordenados via rede credenciada.',
    client_id: 'client-04',
    client_name: 'LogMax Transportes e Logística S/A',
    category: 'EXAMES_CLINICOS_ASO',
    category_name: 'Exames Médicos & ASO',
    amount: 4200.00,
    discount: 0,
    fine_interest: 0,
    final_amount: 4200.00,
    due_date: '2026-08-15',
    payment_date: '2026-08-14',
    payment_method: 'TRANSFERENCIA',
    document_number: 'NF-e 2026/0488',
    notes: 'Comprovante TED recebido e conciliado.',
    created_at: '2026-08-05T14:00:00Z',
    updated_at: '2026-08-14T17:00:00Z'
  },
  {
    id: 'fin-rec-005',
    organization_id: 'org-prevsafe-01',
    type: 'RECEIVABLE',
    status: 'OVERDUE',
    reconciliation_status: 'PENDING_RECONCILIATION',
    title: 'Treinamento NR-35 (Trabalho em Altura) - 2 Turmas',
    description: 'Capacitação teórica e prática com emissão de certificados e ART.',
    client_id: 'client-05',
    client_name: 'Supermercados União Ltda',
    category: 'TREINAMENTOS_NR',
    category_name: 'Treinamentos de NRs',
    amount: 5400.00,
    discount: 0,
    fine_interest: 108.00,
    final_amount: 5508.00,
    due_date: '2026-08-15',
    payment_method: 'BOLETO',
    document_number: 'FAT-2026-0075',
    notes: 'Boleto vencido há 11 dias. Enviado lembrete amigável via WhatsApp.',
    created_at: '2026-08-01T11:00:00Z',
    updated_at: '2026-08-20T09:00:00Z'
  },
  {
    id: 'fin-rec-006',
    organization_id: 'org-prevsafe-01',
    type: 'RECEIVABLE',
    status: 'PENDING',
    reconciliation_status: 'PENDING_RECONCILIATION',
    title: 'Mensalidade Envio eSocial S-2240 e S-2220 (Setembro/2026)',
    description: 'Monitoramento contínuo de admissões, demissões e geração de lotes.',
    client_id: 'client-01',
    client_name: 'Indústria Metalúrgica Alpha S/A',
    contract_id: 'contract-01',
    category: 'EVENTOS_ESOCIAL_SST',
    category_name: 'Transmissão eSocial SST',
    amount: 6800.00,
    discount: 0,
    fine_interest: 0,
    final_amount: 6800.00,
    due_date: '2026-09-10',
    payment_method: 'BOLETO',
    document_number: 'NF-e 2026/0512',
    notes: 'Cobrança programada no faturamento mensal.',
    created_at: '2026-08-22T08:00:00Z',
    updated_at: '2026-08-22T08:00:00Z'
  },

  // --- CONTAS A PAGAR (PAYABLES) ---
  {
    id: 'fin-pay-001',
    organization_id: 'org-prevsafe-01',
    type: 'PAYABLE',
    status: 'PAID',
    reconciliation_status: 'RECONCILED',
    reconciled_at: '2026-08-09T15:00:00Z',
    reconciled_by: 'Gean Monteiro (Financeiro)',
    reconciliation_ref: 'PIX-E2E-99182310',
    reconciliation_notes: 'Transferência PIX confirmada pelo banco emissor.',
    title: 'Honorários Médico Coordenador PCMSO (Dr. Roberto Silva)',
    description: 'Supervisão técnica, emissão de relatórios anuais e assinaturas digitais de ASOs.',
    supplier_name: 'Dr. Roberto Silva - Medicina do Trabalho (CRM/SP 145.892)',
    category: 'HONORARIOS_MEDICOS',
    category_name: 'Honorários Médicos (PCMSO)',
    amount: 4500.00,
    discount: 0,
    fine_interest: 0,
    final_amount: 4500.00,
    due_date: '2026-08-10',
    payment_date: '2026-08-09',
    payment_method: 'PIX',
    document_number: 'RPA-2026/088',
    barcode_or_pix: 'pix-roberto-med@prevsafe.com.br',
    notes: 'RPA quitado com retenção de INSS e IRRF conforme legislação.',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-09T15:00:00Z'
  },
  {
    id: 'fin-pay-002',
    organization_id: 'org-prevsafe-01',
    type: 'PAYABLE',
    status: 'PENDING',
    reconciliation_status: 'PENDING_RECONCILIATION',
    title: 'Exames Clínicos e Complementares (Rede Credenciada)',
    description: 'Audiometrias, Espirometrias, Raios-X OIT e exames laboratoriais complementares.',
    supplier_name: 'MedLab Diagnósticos & Saúde Ocupacional Ltda',
    category: 'CLINICAS_LABORATORIOS_PARCEIROS',
    category_name: 'Clínicas & Laboratórios Credenciados',
    amount: 3800.00,
    discount: 0,
    fine_interest: 0,
    final_amount: 3800.00,
    due_date: '2026-08-28',
    payment_method: 'BOLETO',
    document_number: 'NF-e 18920',
    barcode_or_pix: '03399.88210 55001.291024 10002.390001 5 98800000380000',
    notes: 'Fechamento quinzenal de guias de exames. Vencimento próximo (D-2)!',
    created_at: '2026-08-16T11:00:00Z',
    updated_at: '2026-08-16T11:00:00Z'
  },
  {
    id: 'fin-pay-003',
    organization_id: 'org-prevsafe-01',
    type: 'PAYABLE',
    status: 'PENDING',
    reconciliation_status: 'PENDING_RECONCILIATION',
    title: 'Calibração Acreditada RBC de Dosímetros de Ruído e Luxímetro',
    description: 'Calibração anual com certificado RBC / Inmetro para dosímetros SV-104 e luxímetro.',
    supplier_name: 'LabCal Metrologia e Calibração RBC',
    category: 'CALIBRACAO_EQUIPAMENTOS',
    category_name: 'Calibração de Equipamentos SST',
    amount: 1650.00,
    discount: 0,
    fine_interest: 0,
    final_amount: 1650.00,
    due_date: '2026-09-02',
    payment_method: 'BOLETO',
    document_number: 'NF-e 8840',
    barcode_or_pix: '34191.75009 01043.510047 91020.150008 4 98900000165000',
    notes: 'Equipamentos retirados com laudo de conformidade.',
    created_at: '2026-08-19T15:00:00Z',
    updated_at: '2026-08-19T15:00:00Z'
  },
  {
    id: 'fin-pay-004',
    organization_id: 'org-prevsafe-01',
    type: 'PAYABLE',
    status: 'PAID',
    reconciliation_status: 'RECONCILED',
    reconciled_at: '2026-08-12T17:30:00Z',
    reconciled_by: 'Gean Monteiro (Financeiro)',
    reconciliation_ref: 'PIX-E2E-11928374',
    reconciliation_notes: 'Conciliado com comprovante de remessa PIX instantâneo.',
    title: 'Honorários Periciais de Engenharia de Segurança (Eng. Marcelo)',
    description: 'Levantamentos ambientais de vibração de corpo inteiro (VCI) e laudo pericial.',
    supplier_name: 'Eng. Marcelo T. Costa (CREA/SP 506.992-D)',
    category: 'HONORARIOS_ENGENHARIA_TECNICO',
    category_name: 'Honorários Engenharia & Técnicos',
    amount: 3200.00,
    discount: 0,
    fine_interest: 0,
    final_amount: 3200.00,
    due_date: '2026-08-12',
    payment_date: '2026-08-12',
    payment_method: 'PIX',
    document_number: 'NF-Se 2026/019',
    barcode_or_pix: 'chave-pix-eng-marcelo@prevsafe.com.br',
    notes: 'Laudo entregue e aprovado pelo cliente.',
    created_at: '2026-08-04T09:00:00Z',
    updated_at: '2026-08-12T17:30:00Z'
  },
  {
    id: 'fin-pay-005',
    organization_id: 'org-prevsafe-01',
    type: 'PAYABLE',
    status: 'PAID',
    reconciliation_status: 'RECONCILED',
    reconciled_at: '2026-08-05T09:00:00Z',
    reconciled_by: 'Gean Monteiro (Financeiro)',
    reconciliation_ref: 'CC-FAT-GOOGLE-8812',
    reconciliation_notes: 'Débito confirmado na fatura corporativa Visa final 4412.',
    title: 'Infraestrutura Cloud GCP, Assinaturas Digitais e eSocial',
    description: 'Servidores de mensageria, certificado digital A1 nuvem e armazenamento de XMLs.',
    supplier_name: 'Google Cloud Platform & CertiSign',
    category: 'SOFTWARES_LICENCAS',
    category_name: 'Softwares, Nuvem & Licenças',
    amount: 890.00,
    discount: 0,
    fine_interest: 0,
    final_amount: 890.00,
    due_date: '2026-08-05',
    payment_date: '2026-08-05',
    payment_method: 'CARTAO_CREDITO',
    document_number: 'INV-GCP-88190',
    notes: 'Débito automático no cartão corporativo.',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-05T09:00:00Z'
  },
  {
    id: 'fin-pay-006',
    organization_id: 'org-prevsafe-01',
    type: 'PAYABLE',
    status: 'PENDING',
    reconciliation_status: 'PENDING_RECONCILIATION',
    title: 'Aluguel, IPTU e Condomínio Sede Consultoria SST',
    description: 'Espaço para recepção de clientes, sala de treinamentos e depósito de EPIs/aparelhos.',
    supplier_name: 'Administradora Imobiliária Paulista Ltda',
    category: 'ALUGUEL_INSTALACOES',
    category_name: 'Aluguel & Infraestrutura Física',
    amount: 4200.00,
    discount: 0,
    fine_interest: 0,
    final_amount: 4200.00,
    due_date: '2026-08-30',
    payment_method: 'BOLETO',
    document_number: 'BOL-LOC-88912',
    notes: 'Vencimento programado para o fim do mês (D-4).',
    created_at: '2026-08-10T10:00:00Z',
    updated_at: '2026-08-10T10:00:00Z'
  },
  {
    id: 'fin-pay-007',
    organization_id: 'org-prevsafe-01',
    type: 'PAYABLE',
    status: 'OVERDUE',
    reconciliation_status: 'PENDING_RECONCILIATION',
    title: 'DAS Simples Nacional & Tributos Municipais ISSQN (Ref. Julho/2026)',
    description: 'Guia de recolhimento tributário sobre serviços de engenharia e medicina do trabalho.',
    supplier_name: 'Receita Federal do Brasil / Pref. São Paulo',
    category: 'IMPOSTOS_TRIBUTOS',
    category_name: 'Impostos & Tributos',
    amount: 2940.00,
    discount: 0,
    fine_interest: 58.80,
    final_amount: 2998.80,
    due_date: '2026-08-20',
    payment_method: 'BOLETO',
    document_number: 'DAS-2026-07',
    notes: 'Guia vencida há 6 dias. Necessário recalcular com acréscimos legais antes do pagamento.',
    created_at: '2026-08-08T09:00:00Z',
    updated_at: '2026-08-21T09:00:00Z'
  }
];

export const INITIAL_SAAS_PLANS: import('@/types').SaaSSubscriptionPlan[] = [
  {
    id: 'STARTER',
    name: 'Plano Starter SST',
    badge: 'Iniciante / Autônomo',
    monthly_price: 499.00,
    yearly_price: 4788.00, // R$ 399/mês
    max_managed_companies: 15,
    max_internal_users: 3,
    esocial_direct_transmission: false,
    whatsapp_automations: true,
    ai_copilot_sst: false,
    custom_white_label: false,
    priority_support: false,
    description: 'Ideal para técnicos e engenheiros autônomos iniciando carteira de consultoria SST.'
  },
  {
    id: 'PRO',
    name: 'Plano Professional SST',
    badge: 'Mais Popular / Consultorias',
    monthly_price: 1290.00,
    yearly_price: 12384.00, // R$ 1.032/mês
    max_managed_companies: 60,
    max_internal_users: 12,
    esocial_direct_transmission: true,
    whatsapp_automations: true,
    ai_copilot_sst: true,
    custom_white_label: false,
    priority_support: true,
    description: 'Para consultorias de médio porte com gestão integrada de PGR, PCMSO, eSocial e CRM.'
  },
  {
    id: 'ENTERPRISE',
    name: 'Plano Enterprise SST',
    badge: 'Grandes Assessorias',
    monthly_price: 2990.00,
    yearly_price: 28704.00, // R$ 2.392/mês
    max_managed_companies: 300,
    max_internal_users: 50,
    esocial_direct_transmission: true,
    whatsapp_automations: true,
    ai_copilot_sst: true,
    custom_white_label: true,
    priority_support: true,
    description: 'Para grandes redes de medicina e engenharia com White-Label, API dedicada e suporte SLA 2h.'
  }
];

export const INITIAL_TENANTS: import('@/types').Tenant[] = [
  {
    id: 'tenant-prevsafe-matriz',
    name: 'PrevSafe Matriz (Tenant Padrão)',
    trade_name: 'PrevSafe Consultoria & Engenharia SST',
    document_number: '12.345.678/0001-90',
    email: 'contato@prevsafesst.com.br',
    phone: '(11) 3450-9900',
    whatsapp: '5511988881001',
    city: 'São Paulo',
    state: 'SP',
    plan_id: 'ENTERPRISE',
    plan_name: 'Plano Enterprise SST',
    billing_cycle: 'ANNUAL',
    mrr: 2392.00,
    status: 'ACTIVE',
    next_billing_date: '2027-01-15',
    admin_name: 'Carlos Mendes',
    admin_email: 'carlos.mendes@prevsafe.com.br',
    admin_phone: '(11) 98888-1001',
    active_companies_count: 8,
    max_companies_limit: 300,
    active_users_count: 5,
    max_users_limit: 50,
    storage_used_mb: 2840,
    created_at: '2026-01-01T08:00:00Z',
    invite_status: 'ACCEPTED',
    database_isolation_mode: 'SHARED_ROW_LEVEL_SECURITY',
    theme_settings: {
      primary_color: '#10b981',
      primary_hover: '#059669',
      secondary_color: '#064e3b',
      accent_color: '#06b6d4',
      pwa_theme_color: '#022c22',
      portal_brand_name: 'PrevSafe Gestão SST',
      portal_tagline: 'Portal do Cliente & Laudos Digitais',
      pwa_app_title: 'PrevSafe Técnico PWA',
      pwa_icon_emoji: '🛡️',
      border_radius: 'rounded-2xl',
      contrast_mode: 'balanced',
      enable_glow: true
    },
    notes: 'Tenant principal de demonstração e homologação do software.'
  },
  {
    id: 'tenant-segurwork-01',
    name: 'SegurWork Assessoria Ocupacional Ltda',
    trade_name: 'SegurWork SST',
    document_number: '28.910.442/0001-33',
    email: 'diretoria@segurworksst.com.br',
    phone: '(19) 3231-8800',
    whatsapp: '5519997123456',
    city: 'Campinas',
    state: 'SP',
    plan_id: 'PRO',
    plan_name: 'Plano Professional SST',
    billing_cycle: 'MONTHLY',
    mrr: 1290.00,
    status: 'ACTIVE',
    next_billing_date: '2026-09-05',
    admin_name: 'Dr. Roberto Silveira',
    admin_email: 'roberto.silveira@segurworksst.com.br',
    admin_phone: '(19) 99712-3456',
    active_companies_count: 34,
    max_companies_limit: 60,
    active_users_count: 8,
    max_users_limit: 12,
    storage_used_mb: 1420,
    created_at: '2026-03-10T10:00:00Z',
    invite_status: 'ACCEPTED',
    database_isolation_mode: 'SHARED_ROW_LEVEL_SECURITY',
    theme_settings: {
      primary_color: '#2563eb',
      primary_hover: '#1d4ed8',
      secondary_color: '#1e3a8a',
      accent_color: '#38bdf8',
      pwa_theme_color: '#0f172a',
      portal_brand_name: 'SegurWork Portal SST',
      portal_tagline: 'Segurança Ocupacional & Engenharia de Campo',
      pwa_app_title: 'SegurWork Field PWA',
      pwa_icon_emoji: '⚙️',
      border_radius: 'rounded-2xl',
      contrast_mode: 'high',
      enable_glow: true
    },
    notes: 'Consultoria focada em indústrias metalúrgicas da região metropolitana de Campinas.'
  },
  {
    id: 'tenant-prevmed-02',
    name: 'PrevMed Medicina do Trabalho & Laudos Eireli',
    trade_name: 'PrevMed Ocupacional',
    document_number: '35.678.112/0001-08',
    email: 'gestao@prevmedocupacional.com.br',
    phone: '(31) 3144-7700',
    whatsapp: '5531998442211',
    city: 'Belo Horizonte',
    state: 'MG',
    plan_id: 'PRO',
    plan_name: 'Plano Professional SST',
    billing_cycle: 'MONTHLY',
    mrr: 1290.00,
    status: 'ACTIVE',
    next_billing_date: '2026-09-12',
    admin_name: 'Dra. Fernanda Alencar',
    admin_email: 'fernanda@prevmedocupacional.com.br',
    admin_phone: '(31) 99844-2211',
    active_companies_count: 48,
    max_companies_limit: 60,
    active_users_count: 10,
    max_users_limit: 12,
    storage_used_mb: 2150,
    created_at: '2026-04-18T14:30:00Z',
    invite_status: 'ACCEPTED',
    database_isolation_mode: 'SHARED_ROW_LEVEL_SECURITY',
    theme_settings: {
      primary_color: '#0891b2',
      primary_hover: '#0e7490',
      secondary_color: '#164e63',
      accent_color: '#2dd4bf',
      pwa_theme_color: '#083344',
      portal_brand_name: 'PrevMed Portal Clínico',
      portal_tagline: 'Gestão de PCMSO, ASO Digital & Audiometria',
      pwa_app_title: 'PrevMed Mobile ASO',
      pwa_icon_emoji: '🩺',
      border_radius: 'rounded-2xl',
      contrast_mode: 'balanced',
      enable_glow: true
    },
    notes: 'Clínica de exames ocupacionais e clínica móvel para ASOs in company.'
  },
  {
    id: 'tenant-safelife-03',
    name: 'SafeLife Engenharia e Perícias Trabalhistas',
    trade_name: 'SafeLife SST Brasil',
    document_number: '44.123.987/0001-55',
    email: 'comercial@safelifebrasil.com.br',
    phone: '(41) 3088-5522',
    whatsapp: '5541987654321',
    city: 'Curitiba',
    state: 'PR',
    plan_id: 'STARTER',
    plan_name: 'Plano Starter SST',
    billing_cycle: 'MONTHLY',
    mrr: 499.00,
    status: 'TRIAL',
    trial_ends_at: '2026-09-02T23:59:59Z',
    next_billing_date: '2026-09-03',
    admin_name: 'Eng. Guilherme Santos',
    admin_email: 'guilherme@safelifebrasil.com.br',
    admin_phone: '(41) 98765-4321',
    active_companies_count: 6,
    max_companies_limit: 15,
    active_users_count: 2,
    max_users_limit: 3,
    storage_used_mb: 310,
    created_at: '2026-08-18T09:00:00Z',
    invite_status: 'ACCEPTED',
    database_isolation_mode: 'SHARED_ROW_LEVEL_SECURITY',
    theme_settings: {
      primary_color: '#ea580c',
      primary_hover: '#c2410c',
      secondary_color: '#7c2d12',
      accent_color: '#f59e0b',
      pwa_theme_color: '#431407',
      portal_brand_name: 'SafeLife Perícias & Obras',
      portal_tagline: 'Perícias Técnicas e Segurança na Construção',
      pwa_app_title: 'SafeLife Vistoria PWA',
      pwa_icon_emoji: '🏗️',
      border_radius: 'rounded-xl',
      contrast_mode: 'high',
      enable_glow: true
    },
    notes: 'Em período de teste gratuito de 14 dias. Alta probabilidade de upgrade para o Plano Pro.'
  },
  {
    id: 'tenant-inovalab-04',
    name: 'InovaLab Ergonomia & Higiene Ocupacional',
    trade_name: 'InovaLab SST',
    document_number: '50.334.889/0001-61',
    email: 'contato@inovalabsst.com.br',
    phone: '(81) 3222-1100',
    whatsapp: '5581991239876',
    city: 'Recife',
    state: 'PE',
    plan_id: 'STARTER',
    plan_name: 'Plano Starter SST',
    billing_cycle: 'MONTHLY',
    mrr: 499.00,
    status: 'PAST_DUE',
    next_billing_date: '2026-08-20',
    admin_name: 'Juliana Bezerra',
    admin_email: 'juliana@inovalabsst.com.br',
    admin_phone: '(81) 99123-9876',
    active_companies_count: 11,
    max_companies_limit: 15,
    active_users_count: 2,
    max_users_limit: 3,
    storage_used_mb: 480,
    created_at: '2026-05-02T11:00:00Z',
    invite_status: 'ACCEPTED',
    database_isolation_mode: 'SHARED_ROW_LEVEL_SECURITY',
    theme_settings: {
      primary_color: '#6366f1',
      primary_hover: '#4f46e5',
      secondary_color: '#312e81',
      accent_color: '#a855f7',
      pwa_theme_color: '#1e1b4b',
      portal_brand_name: 'InovaLab Ergonomia',
      portal_tagline: 'Análise Ergonômica do Trabalho AET & NR-17',
      pwa_app_title: 'InovaLab Ergo PWA',
      pwa_icon_emoji: '💡',
      border_radius: 'rounded-3xl',
      contrast_mode: 'soft',
      enable_glow: true
    },
    notes: 'Boleto de mensalidade vencido há 6 dias. Notificação automática de cobrança disparada.'
  }
];

// ==========================================
// 28. SST Hierarchy: Sectors & Jobs
// ==========================================
export const INITIAL_HIERARCHY_SECTORS: SSTHierarchySector[] = [
  {
    id: 'sec-valenca-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    name: 'Solda & Caldeiraria Pesada',
    code: 'SEC-CALD-01',
    description: 'Área fabril destinada ao corte, caldeiraria, montagem e soldagem de vigas metálicas estruturais.',
    environment_type: 'OPERACIONAL_FECHADO',
    building_features: 'Galpão em alvenaria com estrutura metálica, pé-direito de 9m, piso de concreto polido usinado, sistema de exaustão localizada de fumos de solda e lanternins superiores para iluminação natural.',
    total_workers: 45,
    status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00Z'
  },
  {
    id: 'sec-valenca-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    name: 'Usinagem & Torneamento CNC',
    code: 'SEC-USIN-02',
    description: 'Setor de usinagem pesada com tornos mecânicos convencionais, centros de usinagem CNC e fresadoras.',
    environment_type: 'OPERACIONAL_FECHADO',
    building_features: 'Galpão industrial fechado, piso epóxi com canaletas de contenção de fluidos solúveis de corte, iluminação LED industrial 500 lux.',
    total_workers: 28,
    status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00Z'
  },
  {
    id: 'sec-valenca-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    name: 'Cabine de Pintura Eletrostática & Jateamento',
    code: 'SEC-PINT-03',
    description: 'Cabine hermética de jateamento abrasivo com granalha de aço e cabine de pintura a pó eletrostática com estufa de cura.',
    environment_type: 'OPERACIONAL_FECHADO',
    building_features: 'Cabines isoladas com pressão negativa, filtros manga de retenção de particulado e sistema automático de combate a incêndio por CO2.',
    total_workers: 14,
    status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00Z'
  },
  {
    id: 'sec-valenca-04',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    name: 'Manutenção Eletromecânica & Utilidades',
    code: 'SEC-MANUT-04',
    description: 'Oficina de apoio para manutenção preventiva e corretiva de máquinas industriais, painéis elétricos e pontes rolantes.',
    environment_type: 'OPERACIONAL_FECHADO',
    building_features: 'Área com bancadas reforçadas, armários anti-chamas para produtos químicos inflamáveis e isolamento acústico em relação à linha de montagem.',
    total_workers: 18,
    status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00Z'
  },
  {
    id: 'sec-valenca-05',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    name: 'Administração, SESMT & Engenharia de Projetos',
    code: 'SEC-ADM-05',
    description: 'Escritórios administrativos, salas de reunião, departamento de recursos humanos e sala de engenharia.',
    environment_type: 'ADMINISTRATIVO',
    building_features: 'Prédio comercial climatizado por sistema central de ar condicionado tipo VRF, piso laminado, iluminação artificial adequada (500 lux).',
    total_workers: 32,
    status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00Z'
  },
  {
    id: 'sec-transbrasil-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    client_unit_id: 'unit-transbrasil-campinas',
    name: 'Operações de Transporte Rodoviário',
    code: 'SEC-FROTA-01',
    description: 'Condução de cavalos mecânicos e carretas baú em rotas intermunicipais e interestaduais.',
    environment_type: 'VEICULO_TRANSPORTE',
    building_features: 'Cabines climatizadas de caminhões extrapesados com suspensão pneumática no banco do motorista e leito para repouso.',
    total_workers: 65,
    status: 'ACTIVE',
    created_at: '2026-02-01T08:00:00Z'
  }
];

export const INITIAL_HIERARCHY_JOBS: SSTHierarchyJob[] = [
  {
    id: 'job-valenca-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    sector_id: 'sec-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    name: 'Soldador Industrial MIG/MAG e Eletrodo Revestido',
    cbo: '7243-15',
    cbo_title: 'Soldador a arco elétrico e com gás',
    activities_description: 'Executa operações de união de peças metálicas por processos de soldagem MIG/MAG, TIG e eletrodo revestido em estruturas de aço carbono. Realiza chanfro, esmerilhamento com lixadeira angular para acabamento superficial e limpeza de escória. Opera maçarico de corte oxiacetilênico e realiza inspeção visual das soldas executadas.',
    requirements_notes: 'Exige NR-18, NR-35 (trabalho em altura se aplicável) e NR-34 (trabalho a quente).',
    total_workers: 24,
    status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00Z'
  },
  {
    id: 'job-valenca-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    sector_id: 'sec-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    name: 'Caldeireiro Montador Pesado',
    cbo: '7244-05',
    cbo_title: 'Caldeireiro (chapas de ferro e aço)',
    activities_description: 'Traça, corta, dobra, ajusta e monta peças em chapas de aço e perfis estruturais de acordo com desenhos técnicos mecânicos. Utiliza prensas dobradeiras, guilhotinas industriais e ferramentas manuais de impacto. Auxilia na movimentação de peças de grande porte com auxílio de talhas e pontes rolantes.',
    requirements_notes: 'Exige treinamento em NR-12 (segurança em máquinas) e capacitação para movimentação de cargas.',
    total_workers: 21,
    status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00Z'
  },
  {
    id: 'job-valenca-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    sector_id: 'sec-valenca-02',
    client_unit_id: 'unit-valenca-matriz',
    name: 'Operador de Centro de Usinagem & Torno CNC',
    cbo: '7212-15',
    cbo_title: 'Operador de máquinas-ferramenta convencionais e CNC',
    activities_description: 'Prepara e opera centros de usinagem e tornos CNC para fabricação e acabamento de peças metálicas de precisão. Carrega programas numéricos, fixa peças no mandril, substitui pastilhas e ferramentas de corte, abastece e monitora o reservatório de óleo solúvel refrigerante e realiza medições dimensionais com paquímetro e micrômetro.',
    requirements_notes: 'Exige NR-12 e curso profissionalizante em usinagem CNC.',
    total_workers: 16,
    status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00Z'
  },
  {
    id: 'job-valenca-04',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    sector_id: 'sec-valenca-03',
    client_unit_id: 'unit-valenca-matriz',
    name: 'Pintor Industrial a Pistola / Eletrostático',
    cbo: '7233-10',
    cbo_title: 'Pintor de estruturas metálicas e pintura a pistola',
    activities_description: 'Prepara superfícies metálicas por jateamento ou desengraxe químico. Aplica primers antioxidantes e tintas líquidas/pó eletrostático com pistolas de alta pressão airless. Controla a espessura de película seca e opera a estufa de cura térmica.',
    requirements_notes: 'Exige NR-33 (espaço confinado se pintura interna) e NR-20 (inflamáveis).',
    total_workers: 8,
    status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00Z'
  },
  {
    id: 'job-valenca-05',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    sector_id: 'sec-valenca-04',
    client_unit_id: 'unit-valenca-matriz',
    name: 'Eletricista de Manutenção Industrial',
    cbo: '9511-05',
    cbo_title: 'Eletricista de manutenção eletroeletrônica',
    activities_description: 'Realiza manutenção preventiva e corretiva em subestações elétricas, quadros de distribuição de baixa e média tensão, motores trifásicos, inversores de frequência e sistemas de automação industrial. Executa bloqueio e etiquetagem de energias perigosas (LOTO) e intervenções elétricas em altura.',
    requirements_notes: 'Exige NR-10 Básico (40h), NR-10 SEP (40h) e NR-35.',
    total_workers: 6,
    status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00Z'
  },
  {
    id: 'job-valenca-06',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    sector_id: 'sec-valenca-05',
    client_unit_id: 'unit-valenca-matriz',
    name: 'Analista de Recursos Humanos & Departamento Pessoal',
    cbo: '2524-05',
    cbo_title: 'Analista de recursos humanos',
    activities_description: 'Executa rotinas de admissão, controle de ponto, folha de pagamento, controle de férias e suporte a funcionários. Trabalha em ambiente de escritório climatizado com uso intensivo de computador, teclado e mouse.',
    requirements_notes: 'Avaliação ergonômica preliminar conforme NR-17.',
    total_workers: 4,
    status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00Z'
  },
  {
    id: 'job-transbrasil-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    sector_id: 'sec-transbrasil-01',
    client_unit_id: 'unit-transbrasil-campinas',
    name: 'Motorista de Carreta Rodoviário Interestadual',
    cbo: '7825-10',
    cbo_title: 'Motorista de caminhão (rotas regionais e internacionais)',
    activities_description: 'Conduz veículos pesados de carga tipo carreta bitrem em rodovias federais e estaduais. Realiza a conferência de amarração de cargas, checagem diária de itens de segurança (pneus, freios, luzes) e controle de tempos de direção e descanso conforme Lei 13.103/2015.',
    requirements_notes: 'Exige CNH categoria E, curso MOPP e exame toxicológico periódico.',
    total_workers: 52,
    status: 'ACTIVE',
    created_at: '2026-02-01T08:00:00Z'
  }
];

// ==========================================
// 29. SST Homogeneous Exposure Groups (GHE)
// ==========================================
export const INITIAL_GHES: SSTGroupHomogeneousExposure[] = [
  {
    id: 'ghe-valenca-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    code: 'GHE-01',
    name: 'GHE 01 - Soldagem, Caldeiraria & Corte a Quente',
    description: 'Composto por Soldadores e Caldeireiros expostos a ruído contínuo, fumos metálicos de solda (Manganês, Ferro, Cromo), radiação não ionizante (UV/IV do arco elétrico) e calor radiante.',
    sector_ids: ['sec-valenca-01'],
    job_ids: ['job-valenca-01', 'job-valenca-02'],
    work_schedule_description: 'Turno diurno: segunda a quinta das 07:00 às 17:00 e sexta das 07:00 às 16:00 (44h semanais), 1h de intervalo intrajornada.',
    environment_description: 'Galpão de caldeiraria pesado com ventilação geral diluidora e braços de exaustão captadora localizada.',
    total_exposed_workers: 45,
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-01-15T09:00:00Z'
  },
  {
    id: 'ghe-valenca-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    code: 'GHE-02',
    name: 'GHE 02 - Usinagem Mecânica & Fresagem CNC',
    description: 'Operadores de torno e centros de usinagem com exposição a ruído contínuo/intermitente, névoas de óleo de corte mineral/solúvel e postura em pé prolongada.',
    sector_ids: ['sec-valenca-02'],
    job_ids: ['job-valenca-03'],
    work_schedule_description: 'Escala 6x2 com turnos de 8h (Revezamento)',
    environment_description: 'Galpão de usinagem com piso impermeabilizado e proteção enclausurada nas máquinas CNC.',
    total_exposed_workers: 28,
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-01-15T09:00:00Z'
  },
  {
    id: 'ghe-valenca-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    code: 'GHE-03',
    name: 'GHE 03 - Pintura Industrial & Preparação de Superfícies',
    description: 'Pintores e preparadores expostos a vapores orgânicos (Tolueno, Xileno), particulados de resinas e ruído do compressor/ar comprimido.',
    sector_ids: ['sec-valenca-03'],
    job_ids: ['job-valenca-04'],
    work_schedule_description: 'Turno fixo comercial de 44h semanais.',
    environment_description: 'Cabine pressurizada com fluxo de ar contínuo e filtros de carvão ativado.',
    total_exposed_workers: 14,
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-01-15T09:00:00Z'
  },
  {
    id: 'ghe-valenca-04',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    code: 'GHE-04',
    name: 'GHE 04 - Manutenção Elétrica & Subestações (Alta/Baixa Tensão)',
    description: 'Eletricistas e técnicos de utilidades expostos ao risco de choque elétrico e arco voltaico (Periculosidade NR-16) e trabalho em altura.',
    sector_ids: ['sec-valenca-04'],
    job_ids: ['job-valenca-05'],
    work_schedule_description: 'Jornada diurna com regime de sobreaviso quinzenal.',
    environment_description: 'Áreas de utilidades industriais, subestação abrigada 13.8kV e painéis elétricos CCM.',
    total_exposed_workers: 18,
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-01-15T09:00:00Z'
  },
  {
    id: 'ghe-valenca-05',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    code: 'GHE-05',
    name: 'GHE 05 - Administrativo & Gestão Corporativa',
    description: 'Profissionais de suporte administrativo e diretoria em atividades de escritório sem exposição a agentes nocivos nocivos (Ausência de Fatores de Risco Físicos/Químicos/Biológicos).',
    sector_ids: ['sec-valenca-05'],
    job_ids: ['job-valenca-06'],
    work_schedule_description: 'Segunda a sexta das 08:00 às 18:00 (44h semanais).',
    environment_description: 'Ambiente climatizado, mesas ergonômicas e monitores na altura dos olhos.',
    total_exposed_workers: 32,
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-01-15T09:00:00Z'
  },
  {
    id: 'ghe-transbrasil-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    client_unit_id: 'unit-transbrasil-campinas',
    code: 'GHE-01',
    name: 'GHE 01 - Motoristas Rodoviários de Carga Pesada',
    description: 'Motoristas expostos a vibração de corpo inteiro (VCI), ruído do motor e postura sentada prolongada.',
    sector_ids: ['sec-transbrasil-01'],
    job_ids: ['job-transbrasil-01'],
    work_schedule_description: 'Jornada móvel conforme diário de bordo e tacógrafo (Lei 13.103).',
    environment_description: 'Cabine de caminhão tipo leito.',
    total_exposed_workers: 65,
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-02-01T09:00:00Z'
  }
];

// ==========================================
// 30. Environmental Risk Inventory (PGR / LTCAT / eSocial S-2240)
// ==========================================
export const INITIAL_ENVIRONMENTAL_RISKS: SSTEnvironmentalRisk[] = [
  {
    id: 'risk-valenca-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    ghe_id: 'ghe-valenca-01',
    risk_category: 'FÍSICO',
    risk_code_table_24: '01.01.001',
    agent_name: 'Ruído Contínuo ou Intermitente',
    generating_source: 'Lixadeiras angulares pneumáticas, corte por plasma, martelos de desempeno e soldagem contínua no galpão',
    propagation_path: 'Aérea através de ondas acústicas de pressão',
    health_effects: 'Perda auditiva induzida por ruído ocupacional (PAIR), zumbido nos ouvidos, aumento do estresse e fadiga neuropsíquica.',
    evaluation_type: 'QUANTITATIVA',
    measured_value: '88.7',
    measurement_unit: 'dB(A)',
    tolerance_limit: '85.0 dB(A) para 8h (NR-15 Anexo 1)',
    action_level: '80.0 dB(A) (NR-09 / PGR)',
    measurement_methodology: 'NHO-01 da Fundacentro com audiodosímetro integrador classe 1 aferido pela RBC antes e após as medições (q=3 e q=5).',
    probability: 4,
    severity: 3,
    risk_level: 'ALTO',
    epc_implemented: false,
    epc_effective: false,
    epi_required: true,
    epis: [
      {
        ca_number: '14235',
        epi_name: 'Protetor Auditivo Tipo Concha / Abafador Acoplável ao Capacete',
        attenuation_factor: 'NRRsf 22 dB',
        is_effective: true,
        complies_with_nr06: true,
        uninterrupted_use: true,
        periodic_replacement: true,
        hygienic_conditions: true
      },
      {
        ca_number: '5674',
        epi_name: 'Protetor Auditivo de Inserção Pré-Moldado de Silicone',
        attenuation_factor: 'NRRsf 16 dB',
        is_effective: true,
        complies_with_nr06: true,
        uninterrupted_use: true,
        periodic_replacement: true,
        hygienic_conditions: true
      }
    ],
    special_retirement_applies: true,
    gfip_code: '04', // 25 anos
    ltcat_technical_conclusion: 'Enseja aposentadoria especial pelo critério do Decreto 3.048/99 (NEN > 85 dB(A) sem eficácia plena de EPC).',
    insalubridade_applies: true,
    insalubridade_degree: '20%',
    insalubridade_legal_basis: 'NR-15, Anexo 1 - Limites de Tolerância para Ruído Contínuo ou Intermitente',
    periculosidade_applies: false,
    status: 'ACTIVE',
    created_at: '2026-01-20T08:00:00Z',
    updated_at: '2026-01-20T08:00:00Z'
  },
  {
    id: 'risk-valenca-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    ghe_id: 'ghe-valenca-01',
    risk_category: 'QUÍMICO',
    risk_code_table_24: '02.01.014',
    agent_name: 'Fumos Metálicos de Manganês e seus compostos',
    generating_source: 'Processo de soldagem a arco elétrico em chapas de aço carbono com eletrodos tubulares e gás de proteção',
    propagation_path: 'Aérea (inalação de particulado fino e vapores condensados)',
    health_effects: 'Intoxicação por manganês (Manganismo), irritação das vias aéreas superiores, bronquite química crônica e febre dos fumos metálicos.',
    evaluation_type: 'QUANTITATIVA',
    measured_value: '0.082',
    measurement_unit: 'mg/m³',
    tolerance_limit: '0.10 mg/m³ (Fração respirável - ACGIH / NR-15)',
    action_level: '0.05 mg/m³ (Nível de Ação NR-09)',
    measurement_methodology: 'Amostragem individual com bomba gravimétrica de vazão constante com cassete e filtro de membrana de éster de celulose conforme método NIOSH 7300.',
    probability: 3,
    severity: 4,
    risk_level: 'ALTO',
    epc_implemented: true,
    epc_description: 'Sistema de exaustão localizada com coifa móvel articulada na bancada de soldagem',
    epc_effective: true,
    epi_required: true,
    epis: [
      {
        ca_number: '41514',
        epi_name: 'Respirador Semifacial PFF2 (N95) contra poeiras, névoas e fumos metálicos com válvula de exalação',
        is_effective: true,
        complies_with_nr06: true,
        uninterrupted_use: true,
        periodic_replacement: true,
        hygienic_conditions: true
      }
    ],
    special_retirement_applies: true,
    gfip_code: '04',
    ltcat_technical_conclusion: 'Agente químico nocivo constante no Anexo IV do RPS (Dec. 3.048/99).',
    insalubridade_applies: true,
    insalubridade_degree: '20%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 12 e Anexo nº 11',
    periculosidade_applies: false,
    status: 'ACTIVE',
    created_at: '2026-01-20T08:00:00Z',
    updated_at: '2026-01-20T08:00:00Z'
  },
  {
    id: 'risk-valenca-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    ghe_id: 'ghe-valenca-01',
    risk_category: 'FÍSICO',
    risk_code_table_24: '01.12.001',
    agent_name: 'Radiações Não Ionizantes (Radiação Ultravioleta e Infravermelha)',
    generating_source: 'Arco elétrico gerado durante a soldagem MIG/MAG e corte térmico',
    propagation_path: 'Irradiação direta e reflexão em superfícies metálicas',
    health_effects: 'Fotoqueratite ocular, queimaduras na córnea, eritema cutâneo e envelhecimento precoce da pele.',
    evaluation_type: 'QUALITATIVA',
    tolerance_limit: 'Critério qualitativo com base na inspeção de campo e inspeção da intensidade do arco elétrico',
    probability: 3,
    severity: 3,
    risk_level: 'MEDIO',
    epc_implemented: true,
    epc_description: 'Biombos de proteção de solda com cortinas de PVC anti-UV amarelo/verde',
    epc_effective: true,
    epi_required: true,
    epis: [
      {
        ca_number: '38190',
        epi_name: 'Máscara de Solda de Auto-Escurecimento Tonalidade DIN 9 a 13',
        is_effective: true,
        complies_with_nr06: true,
        uninterrupted_use: true,
        periodic_replacement: true,
        hygienic_conditions: true
      },
      {
        ca_number: '17890',
        epi_name: 'Avental e Mangote de Raspa de Couro Bovino',
        is_effective: true,
        complies_with_nr06: true,
        uninterrupted_use: true,
        periodic_replacement: true,
        hygienic_conditions: true
      }
    ],
    special_retirement_applies: false,
    gfip_code: '01',
    ltcat_technical_conclusion: 'Agente controlado eficazmente por EPC e EPI com CA válido.',
    insalubridade_applies: true,
    insalubridade_degree: '20%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 7 - Radiações Não-Ionizantes',
    periculosidade_applies: false,
    status: 'ACTIVE',
    created_at: '2026-01-20T08:00:00Z',
    updated_at: '2026-01-20T08:00:00Z'
  },
  {
    id: 'risk-valenca-04',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    ghe_id: 'ghe-valenca-03',
    risk_category: 'QUÍMICO',
    risk_code_table_24: '02.01.690',
    agent_name: 'Vapores Orgânicos (Tolueno e Xileno)',
    generating_source: 'Solventes e diluentes utilizados na preparação de tintas e limpeza de pistolas de pintura',
    propagation_path: 'Inalação e absorção cutânea',
    health_effects: 'Depressão do sistema nervoso central, cefaleia, náuseas, dermatite de contato e irritação ocular.',
    evaluation_type: 'QUANTITATIVA',
    measured_value: '18.4',
    measurement_unit: 'ppm',
    tolerance_limit: '78.0 ppm (NR-15 Anexo 11)',
    action_level: '39.0 ppm',
    measurement_methodology: 'Tubos de amostragem de carvão ativo com bomba de amostragem individual calibrada NIOSH 1501.',
    probability: 2,
    severity: 3,
    risk_level: 'MEDIO',
    epc_implemented: true,
    epc_description: 'Cabine de pintura com cortina de água e exaustão com filtros de carvão ativo',
    epc_effective: true,
    epi_required: true,
    epis: [
      {
        ca_number: '29810',
        epi_name: 'Máscara Facial Inteira com Filtro Combinado para Vapores Orgânicos e Particulados',
        is_effective: true,
        complies_with_nr06: true,
        uninterrupted_use: true,
        periodic_replacement: true,
        hygienic_conditions: true
      },
      {
        ca_number: '31220',
        epi_name: 'Luvas de Borracha Nitrílica Resistentes a Solventes Químicos',
        is_effective: true,
        complies_with_nr06: true,
        uninterrupted_use: true,
        periodic_replacement: true,
        hygienic_conditions: true
      }
    ],
    special_retirement_applies: true,
    gfip_code: '04',
    ltcat_technical_conclusion: 'Presença de hidrocarbonetos aromáticos enquadrados no Decreto 3.048/99.',
    insalubridade_applies: true,
    insalubridade_degree: '20%',
    insalubridade_legal_basis: 'NR-15 Anexo 11 e Anexo 13',
    periculosidade_applies: true,
    periculosidade_legal_basis: 'NR-16 Anexo 2 - Atividades e operações perigosas com inflamáveis',
    status: 'ACTIVE',
    created_at: '2026-01-20T08:00:00Z',
    updated_at: '2026-01-20T08:00:00Z'
  },
  {
    id: 'risk-valenca-05',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    ghe_id: 'ghe-valenca-04',
    risk_category: 'ACIDENTES',
    risk_code_table_24: '04.01.001',
    agent_name: 'Energia Elétrica em Alta e Baixa Tensão (Choque Elétrico & Arco Voltaico)',
    generating_source: 'Subestação de entrada de energia 13.8 kV, barramentos de cobre em painéis CCM e cabos condutores',
    propagation_path: 'Contato direto e aproximação à zona controlada',
    health_effects: 'Queimaduras elétricas graves de 3º grau, fibrilação ventricular, parada cardiorrespiratória e quedas de nível decorrentes do choque.',
    evaluation_type: 'QUALITATIVA',
    tolerance_limit: 'Não se aplica (Risco periculoso absoluto conforme NR-10 e NR-16)',
    probability: 2,
    severity: 5,
    risk_level: 'ALTO',
    epc_implemented: true,
    epc_description: 'Sistema LOTO (Lockout / Tagout) com cadeados de bloqueio individual e barreiras físicas isolantes nos barramentos',
    epc_effective: true,
    epi_required: true,
    epis: [
      {
        ca_number: '43900',
        epi_name: 'Vestimenta de Proteção Térmica Risco 2 ATPV 12 cal/cm² (Calça e Camisa Anti-Arco)',
        is_effective: true,
        complies_with_nr06: true,
        uninterrupted_use: true,
        periodic_replacement: true,
        hygienic_conditions: true
      },
      {
        ca_number: '21980',
        epi_name: 'Luva Isolante de Borracha Classe 2 (17.000V) com Luva de Cobertura em Vaqueta',
        is_effective: true,
        complies_with_nr06: true,
        uninterrupted_use: true,
        periodic_replacement: true,
        hygienic_conditions: true
      }
    ],
    special_retirement_applies: true,
    gfip_code: '04',
    ltcat_technical_conclusion: 'Atividade perigosa com enquadramento jurisprudencial (Súmula 198 do TFR / Eletricidade > 250V).',
    insalubridade_applies: false,
    periculosidade_applies: true,
    periculosidade_legal_basis: 'NR-16 Anexo 4 - Atividades e operações perigosas com energia elétrica',
    status: 'ACTIVE',
    created_at: '2026-01-20T08:00:00Z',
    updated_at: '2026-01-20T08:00:00Z'
  },
  {
    id: 'risk-valenca-06',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    ghe_id: 'ghe-valenca-05',
    risk_category: 'AUSÊNCIA_RISCO',
    risk_code_table_24: '05.01.001',
    agent_name: 'Ausência de Fatores de Risco Físicos, Químicos ou Biológicos Nocivos',
    generating_source: 'Atividade administrativa em ambiente de escritório padrão corporativo',
    propagation_path: 'Não aplicável',
    health_effects: 'Sem danos ocupacionais causados por agentes nocivos de insalubridade ou aposentadoria especial.',
    evaluation_type: 'QUALITATIVA',
    probability: 1,
    severity: 1,
    risk_level: 'MUITO_BAIXO',
    epc_implemented: false,
    epc_effective: false,
    epi_required: false,
    epis: [],
    special_retirement_applies: false,
    gfip_code: '00', // 00: Sem exposição a agentes nocivos
    ltcat_technical_conclusion: 'Não enseja aposentadoria especial conforme critérios do Decreto 3.048/99 e NR-15.',
    insalubridade_applies: false,
    periculosidade_applies: false,
    status: 'ACTIVE',
    created_at: '2026-01-20T08:00:00Z',
    updated_at: '2026-01-20T08:00:00Z'
  }
];

// ==========================================
// 31. Occupational Exam Protocols (PCMSO / NR-07 / eSocial S-2220)
// ==========================================
export const INITIAL_EXAM_PROTOCOLS: SSTExamProtocol[] = [
  {
    id: 'proto-valenca-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    ghe_id: 'ghe-valenca-01',
    exam_code_table_27: '0295',
    exam_name: 'Audiometria Tonal por Via Aérea e Via Óssea + Logoaudiometria',
    periodicity_months: 6,
    triggers: ['ADMISSIONAL', 'PERIODICO', 'RETORNO_TRABALHO', 'MUDANCA_RISCO', 'DEMISSIONAL'],
    mandatory_by_standard: 'NR-07',
    preparation_instructions: 'Repouso auditivo obrigatório de pelo menos 14 horas antes da realização do exame. Não utilizar fones de ouvido no trajeto.',
    status: 'ACTIVE',
    created_at: '2026-01-22T08:00:00Z'
  },
  {
    id: 'proto-valenca-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    ghe_id: 'ghe-valenca-01',
    exam_code_table_27: '0411',
    exam_name: 'Radiografia de Tórax em PA no Padrão OIT (Organização Internacional do Trabalho)',
    periodicity_months: 12,
    triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'],
    mandatory_by_standard: 'NR-07',
    preparation_instructions: 'Retirar correntes, pingentes e botões metálicos da região torácica. Exame de triagem para pneumoconioses.',
    status: 'ACTIVE',
    created_at: '2026-01-22T08:00:00Z'
  },
  {
    id: 'proto-valenca-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    ghe_id: 'ghe-valenca-01',
    exam_code_table_27: '0281',
    exam_name: 'Espirometria Ocupacional com Prova Broncodilatadora',
    periodicity_months: 12,
    triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'],
    mandatory_by_standard: 'NR-07',
    preparation_instructions: 'Evitar refeições pesadas 2 horas antes e não consumir café, chá preto ou fumar nas 4 horas antecedentes ao teste.',
    status: 'ACTIVE',
    created_at: '2026-01-22T08:00:00Z'
  },
  {
    id: 'proto-valenca-04',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    ghe_id: 'ghe-valenca-01',
    exam_code_table_27: '0040',
    exam_name: 'Hemograma Completo com Contagem de Plaquetas e Leucograma',
    periodicity_months: 12,
    triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'],
    mandatory_by_standard: 'NR-07',
    preparation_instructions: 'Jejum prévio de 4 horas recomendado para coleta laboratorial.',
    status: 'ACTIVE',
    created_at: '2026-01-22T08:00:00Z'
  },
  {
    id: 'proto-valenca-05',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    ghe_id: 'ghe-valenca-04',
    exam_code_table_27: '0210',
    exam_name: 'Eletrocardiograma de Repouso (ECG) de 12 Derivações',
    periodicity_months: 12,
    triggers: ['ADMISSIONAL', 'PERIODICO', 'RETORNO_TRABALHO', 'MUDANCA_RISCO', 'DEMISSIONAL'],
    mandatory_by_standard: 'NR-10',
    preparation_instructions: 'Exame obrigatório para aptidão em trabalhos com alta tensão e trabalho em altura (NR-10 e NR-35).',
    status: 'ACTIVE',
    created_at: '2026-01-22T08:00:00Z'
  },
  {
    id: 'proto-valenca-06',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    ghe_id: 'ghe-valenca-05',
    exam_code_table_27: '0008',
    exam_name: 'Avaliação Clínica Ocupacional com Anamnese e Exame Físico',
    periodicity_months: 24,
    triggers: ['ADMISSIONAL', 'PERIODICO', 'RETORNO_TRABALHO', 'MUDANCA_RISCO', 'DEMISSIONAL'],
    mandatory_by_standard: 'NR-07',
    preparation_instructions: 'Consulta presencial com Médico do Trabalho ou Médico Examinador credenciado.',
    status: 'ACTIVE',
    created_at: '2026-01-22T08:00:00Z'
  }
];

// ==========================================
// 32. Registered Employees (Trabalhadores eSocial)
// ==========================================
export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-valenca-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    sector_id: 'sec-valenca-01',
    job_id: 'job-valenca-01',
    ghe_id: 'ghe-valenca-01',
    name: 'Carlos Eduardo Silveira',
    cpf: '234.567.890-12',
    nis_pis: '123.45678.90-1',
    registration_number: 'MAT-2024-0089',
    birth_date: '1988-04-12',
    admission_date: '2024-03-10',
    gender: 'M',
    marital_status: 'CASADO',
    worker_category: '101',
    employment_regime: 'CLT',
    job_title: 'Soldador Industrial MIG/MAG e Eletrodo Revestido',
    cbo: '7243-15',
    sector_name: 'Solda & Caldeiraria Pesada',
    unit_name: 'Unidade Matriz - Fábrica São Paulo',
    ghe_name: 'GHE 01 - Soldagem, Caldeiraria & Corte a Quente',
    is_pcd: false,
    blood_type: 'O+',
    status: 'ACTIVE',
    current_aso_status: 'VALID',
    last_aso_date: '2026-03-10',
    next_aso_date: '2027-03-10',
    email: 'carlos.silveira@valencametal.com.br',
    phone: '(11) 98877-1122',
    whatsapp: '5511988771122',
    address: 'Rua das Palmeiras, 340, Apto 42',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '03102-000',
    epis: [
      {
        id: 'epi-carlos-01',
        ca_number: '14235',
        epi_name: 'Protetor Auditivo Tipo Concha 22dB',
        delivery_date: '2026-03-10',
        term_signed: true,
        replacement_due_date: '2026-09-10'
      },
      {
        id: 'epi-carlos-02',
        ca_number: '41514',
        epi_name: 'Respirador PFF2 (N95) com Válvula',
        delivery_date: '2026-08-01',
        term_signed: true,
        replacement_due_date: '2026-09-01'
      },
      {
        id: 'epi-carlos-03',
        ca_number: '38190',
        epi_name: 'Máscara de Solda de Auto-Escurecimento',
        delivery_date: '2024-03-10',
        term_signed: true
      }
    ],
    aso_history: [
      {
        id: 'aso-carlos-01',
        aso_type: 'PERIODICO',
        exam_date: '2026-03-10',
        valid_until: '2027-03-10',
        result: 'APTO',
        physician_name: 'Dr. Roberto Meirelles',
        physician_crm: 'CRM/SP 98124',
        physician_uf: 'SP',
        esocial_event_id: 'evt-2026-000002'
      },
      {
        id: 'aso-carlos-02',
        aso_type: 'ADMISSIONAL',
        exam_date: '2024-03-10',
        valid_until: '2025-03-10',
        result: 'APTO',
        physician_name: 'Dra. Camila Nogueira',
        physician_crm: 'CRM/SP 114520',
        physician_uf: 'SP'
      }
    ],
    created_at: '2024-03-10T08:00:00Z',
    updated_at: '2026-03-10T11:00:00Z'
  },
  {
    id: 'emp-valenca-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    sector_id: 'sec-valenca-01',
    job_id: 'job-valenca-02',
    ghe_id: 'ghe-valenca-01',
    name: 'Marcos Vinícius Barbosa',
    cpf: '345.678.901-23',
    nis_pis: '134.56789.01-2',
    registration_number: 'MAT-2023-0045',
    birth_date: '1992-09-25',
    admission_date: '2023-06-15',
    gender: 'M',
    marital_status: 'SOLTEIRO',
    worker_category: '101',
    employment_regime: 'CLT',
    job_title: 'Caldeireiro Montador Pesado',
    cbo: '7244-05',
    sector_name: 'Solda & Caldeiraria Pesada',
    unit_name: 'Unidade Matriz - Fábrica São Paulo',
    ghe_name: 'GHE 01 - Soldagem, Caldeiraria & Corte a Quente',
    is_pcd: false,
    blood_type: 'A+',
    status: 'ACTIVE',
    current_aso_status: 'EXPIRING',
    last_aso_date: '2025-09-15',
    next_aso_date: '2026-09-15',
    email: 'marcos.barbosa@valencametal.com.br',
    phone: '(11) 97766-3344',
    whatsapp: '5511977663344',
    address: 'Av. Brasilândia, 1200',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '02800-000',
    epis: [
      {
        id: 'epi-marcos-01',
        ca_number: '14235',
        epi_name: 'Protetor Auditivo Tipo Concha 22dB',
        delivery_date: '2025-09-15',
        term_signed: true
      },
      {
        id: 'epi-marcos-02',
        ca_number: '28400',
        epi_name: 'Óculos de Segurança com Proteção Lateral Anti-Risco',
        delivery_date: '2026-01-10',
        term_signed: true
      }
    ],
    aso_history: [
      {
        id: 'aso-marcos-01',
        aso_type: 'PERIODICO',
        exam_date: '2025-09-15',
        valid_until: '2026-09-15',
        result: 'APTO',
        physician_name: 'Dr. Roberto Meirelles',
        physician_crm: 'CRM/SP 98124',
        physician_uf: 'SP'
      }
    ],
    created_at: '2023-06-15T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z'
  },
  {
    id: 'emp-valenca-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    sector_id: 'sec-valenca-04',
    job_id: 'job-valenca-05',
    ghe_id: 'ghe-valenca-04',
    name: 'Juliano Alves Prado',
    cpf: '456.789.012-34',
    nis_pis: '145.67890.12-3',
    registration_number: 'MAT-2022-0012',
    birth_date: '1985-11-03',
    admission_date: '2022-02-01',
    gender: 'M',
    marital_status: 'CASADO',
    worker_category: '101',
    employment_regime: 'CLT',
    job_title: 'Eletricista de Manutenção Industrial',
    cbo: '9511-05',
    sector_name: 'Manutenção Eletromecânica & Utilidades',
    unit_name: 'Unidade Matriz - Fábrica São Paulo',
    ghe_name: 'GHE 04 - Manutenção Elétrica & Subestações',
    is_pcd: false,
    blood_type: 'B+',
    status: 'ACTIVE',
    current_aso_status: 'VALID',
    last_aso_date: '2026-02-01',
    next_aso_date: '2027-02-01',
    email: 'juliano.prado@valencametal.com.br',
    phone: '(11) 98112-9988',
    whatsapp: '5511981129988',
    address: 'Rua Bela Vista, 45',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '01310-000',
    epis: [
      {
        id: 'epi-juliano-01',
        ca_number: '43900',
        epi_name: 'Vestimenta Anti-Arco Risco 2 ATPV 12',
        delivery_date: '2026-02-01',
        term_signed: true
      },
      {
        id: 'epi-juliano-02',
        ca_number: '21980',
        epi_name: 'Luvas Isolantes de Alta Tensão Classe 2',
        delivery_date: '2026-02-01',
        term_signed: true
      }
    ],
    aso_history: [
      {
        id: 'aso-juliano-01',
        aso_type: 'PERIODICO',
        exam_date: '2026-02-01',
        valid_until: '2027-02-01',
        result: 'APTO',
        physician_name: 'Dr. Roberto Meirelles',
        physician_crm: 'CRM/SP 98124',
        physician_uf: 'SP'
      }
    ],
    created_at: '2022-02-01T08:00:00Z',
    updated_at: '2026-02-01T08:00:00Z'
  },
  {
    id: 'emp-valenca-04',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    sector_id: 'sec-valenca-05',
    job_id: 'job-valenca-06',
    ghe_id: 'ghe-valenca-05',
    name: 'Beatriz Vasconcelos Ramos',
    cpf: '567.890.123-45',
    nis_pis: '156.78901.23-4',
    registration_number: 'MAT-2021-0005',
    birth_date: '1990-07-18',
    admission_date: '2021-08-16',
    gender: 'F',
    marital_status: 'CASADO',
    worker_category: '101',
    employment_regime: 'CLT',
    job_title: 'Analista de Recursos Humanos & Departamento Pessoal',
    cbo: '2524-05',
    sector_name: 'Administração, SESMT & Engenharia de Projetos',
    unit_name: 'Unidade Matriz - Fábrica São Paulo',
    ghe_name: 'GHE 05 - Administrativo & Gestão Corporativa',
    is_pcd: false,
    blood_type: 'O-',
    status: 'ACTIVE',
    current_aso_status: 'VALID',
    last_aso_date: '2025-08-16',
    next_aso_date: '2027-08-16',
    email: 'beatriz.ramos@valencametal.com.br',
    phone: '(11) 97777-2001',
    whatsapp: '5511977772001',
    address: 'Alameda Santos, 900',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '01418-000',
    epis: [],
    aso_history: [
      {
        id: 'aso-beatriz-01',
        aso_type: 'PERIODICO',
        exam_date: '2025-08-16',
        valid_until: '2027-08-16',
        result: 'APTO',
        physician_name: 'Dra. Camila Nogueira',
        physician_crm: 'CRM/SP 114520',
        physician_uf: 'SP'
      }
    ],
    created_at: '2021-08-16T08:00:00Z',
    updated_at: '2025-08-16T08:00:00Z'
  },
  {
    id: 'emp-valenca-05',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_unit_id: 'unit-valenca-matriz',
    sector_id: 'sec-valenca-01',
    job_id: 'job-valenca-01',
    ghe_id: 'ghe-valenca-01',
    name: 'José Ribeiro Antunes',
    cpf: '678.901.234-56',
    nis_pis: '167.89012.34-5',
    registration_number: 'MAT-2025-0104',
    birth_date: '1979-01-30',
    admission_date: '2025-01-10',
    gender: 'M',
    marital_status: 'CASADO',
    worker_category: '101',
    employment_regime: 'CLT',
    job_title: 'Soldador Industrial MIG/MAG e Eletrodo Revestido',
    cbo: '7243-15',
    sector_name: 'Solda & Caldeiraria Pesada',
    unit_name: 'Unidade Matriz - Fábrica São Paulo',
    ghe_name: 'GHE 01 - Soldagem, Caldeiraria & Corte a Quente',
    is_pcd: false,
    blood_type: 'AB+',
    status: 'AWAY',
    current_aso_status: 'VALID',
    last_aso_date: '2025-01-10',
    next_aso_date: '2026-01-10',
    email: 'jose.antunes@valencametal.com.br',
    phone: '(11) 96655-4433',
    whatsapp: '5511966554433',
    address: 'Rua dos Operários, 88',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '03500-000',
    epis: [
      {
        id: 'epi-jose-01',
        ca_number: '14235',
        epi_name: 'Protetor Auditivo Tipo Concha 22dB',
        delivery_date: '2025-01-10',
        term_signed: true
      }
    ],
    aso_history: [
      {
        id: 'aso-jose-01',
        aso_type: 'ADMISSIONAL',
        exam_date: '2025-01-10',
        valid_until: '2026-01-10',
        result: 'APTO',
        physician_name: 'Dr. Roberto Meirelles',
        physician_crm: 'CRM/SP 98124',
        physician_uf: 'SP'
      }
    ],
    created_at: '2025-01-10T08:00:00Z',
    updated_at: '2026-08-20T14:00:00Z'
  },
  {
    id: 'emp-transbrasil-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    client_unit_id: 'unit-transbrasil-campinas',
    sector_id: 'sec-transbrasil-01',
    job_id: 'job-transbrasil-01',
    ghe_id: 'ghe-transbrasil-01',
    name: 'Antônio Ferreira Lima',
    cpf: '789.012.345-67',
    nis_pis: '178.90123.45-6',
    registration_number: 'MAT-2023-0881',
    birth_date: '1976-12-05',
    admission_date: '2023-04-01',
    gender: 'M',
    marital_status: 'CASADO',
    worker_category: '101',
    employment_regime: 'CLT',
    job_title: 'Motorista de Carreta Rodoviário Interestadual',
    cbo: '7825-10',
    sector_name: 'Operações de Transporte Rodoviário',
    unit_name: 'Filial Campinas / CD Anhanguera',
    ghe_name: 'GHE 01 - Motoristas Rodoviários de Carga Pesada',
    is_pcd: false,
    blood_type: 'O+',
    status: 'ACTIVE',
    current_aso_status: 'EXPIRED',
    last_aso_date: '2025-04-01',
    next_aso_date: '2026-04-01',
    email: 'antonio.lima@transbrasillog.com.br',
    phone: '(19) 98822-1133',
    whatsapp: '5519988221133',
    address: 'Rua das Acácias, 410',
    city: 'Campinas',
    state: 'SP',
    zip_code: '13070-000',
    epis: [],
    aso_history: [
      {
        id: 'aso-antonio-01',
        aso_type: 'PERIODICO',
        exam_date: '2025-04-01',
        valid_until: '2026-04-01',
        result: 'APTO',
        physician_name: 'Dr. Paulo Rogério Costa',
        physician_crm: 'CRM/SP 85112',
        physician_uf: 'SP'
      }
    ],
    created_at: '2023-04-01T08:00:00Z',
    updated_at: '2026-08-10T08:00:00Z'
  }
];

// ==========================================
// 33. CAT Records (S-2210)
// ==========================================
export const INITIAL_CAT_RECORDS: SSTCATRecord[] = [
  {
    id: 'cat-2026-0001',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    employee_id: 'emp-valenca-05',
    cat_number: 'CAT-2026-000001',
    esocial_event_id: 'evt-2026-000001',
    worker_name: 'José Ribeiro Antunes',
    worker_cpf: '678.901.234-56',
    worker_registration: 'MAT-2025-0104',
    worker_cbo: '7243-15',
    worker_role: 'Soldador Industrial MIG/MAG',
    cat_type: 'INICIAL',
    accident_date: '2026-08-20',
    accident_time: '14:35',
    accident_type: 'TIPICO',
    hours_worked_before_accident: '06:35',
    death_occurred: false,
    police_report: false,
    location_type: 'ESTABELECIMENTO_EMPREGADOR',
    location_description: 'Bancada 03 do Galpão de Solda & Caldeiraria Pesada',
    location_address: 'Av. das Indústrias Pesadas, 1420 - São Paulo/SP',
    body_part_code: '75.20.00',
    body_part_name: 'Mão (exceto punho ou dedos) - Lado Direito',
    causative_agent_code: '30.10.10',
    causative_agent_name: 'Disco abrasivo de lixadeira angular rotativa',
    nature_lesion_code: 'Corte, Laceração profunda com sangramento ativo',
    medical_name: 'Dr. Fernando Albuquerque',
    medical_crm: 'CRM/SP 134900',
    medical_uf: 'SP',
    cid_10: 'S61.0 - Ferimento de dedo(s) sem lesão da unha',
    days_away: 15,
    treatment_type: 'AMBULATORIAL',
    status: 'TRANSMITTED',
    receipt_number: '1.2.202608.0000000000000981245',
    protocol_number: 'PROT-SERPRO-99881122',
    created_at: '2026-08-20T16:00:00Z'
  },
  {
    id: 'cat-2026-0002',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    employee_id: 'emp-transbrasil-01',
    cat_number: 'CAT-2026-000002',
    worker_name: 'Antônio Ferreira Lima',
    worker_cpf: '789.012.345-67',
    worker_registration: 'MAT-2023-0881',
    worker_cbo: '7825-10',
    worker_role: 'Motorista de Carreta Rodoviário',
    cat_type: 'INICIAL',
    accident_date: '2026-08-25',
    accident_time: '09:15',
    accident_type: 'TRAJETO',
    hours_worked_before_accident: '01:15',
    death_occurred: false,
    police_report: true,
    police_report_number: 'B.O. 98124/2026 - Polícia Rodoviária Federal',
    location_type: 'VIA_PUBLICA',
    location_description: 'Rodovia dos Bandeirantes, KM 74 - Sentido Interior',
    location_address: 'Rod. dos Bandeirantes, Km 74 - Itupeva/SP',
    body_part_code: '50.10.00',
    body_part_name: 'Coluna Cervical e Dorso',
    causative_agent_code: '40.20.00',
    causative_agent_name: 'Colisão de veículo automotor',
    nature_lesion_code: 'Contusão, Entorse e estiramento muscular cervical (Whiplash)',
    medical_name: 'Dra. Vanessa Mendonça',
    medical_crm: 'CRM/SP 167230',
    medical_uf: 'SP',
    cid_10: 'S13.4 - Entorse e distensão da coluna cervical',
    days_away: 7,
    treatment_type: 'AMBULATORIAL',
    status: 'READY_TO_SEND',
    created_at: '2026-08-25T11:30:00Z'
  }
];

// ==========================================
// 34. Work Absence Records (S-2230)
// ==========================================
export const INITIAL_WORK_ABSENCES: SSTWorkAbsence[] = [
  {
    id: 'abs-2026-0001',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    employee_id: 'emp-valenca-05',
    esocial_event_id: 'evt-2026-000001',
    worker_name: 'José Ribeiro Antunes',
    worker_cpf: '678.901.234-56',
    worker_registration: 'MAT-2025-0104',
    worker_cbo: '7243-15',
    reason_code_table_18: '01',
    reason_description: '01 - Acidente de trabalho típico',
    start_date: '2026-08-20',
    end_date: '2026-09-04',
    estimated_days: 15,
    is_traffic_accident: false,
    physician_name: 'Dr. Fernando Albuquerque',
    physician_crm: 'CRM/SP 134900',
    physician_uf: 'SP',
    cid_10: 'S61.0',
    status: 'ACTIVE_AWAY',
    created_at: '2026-08-20T16:10:00Z'
  },
  {
    id: 'abs-2026-0002',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    employee_id: 'emp-transbrasil-01',
    worker_name: 'Antônio Ferreira Lima',
    worker_cpf: '789.012.345-67',
    worker_registration: 'MAT-2023-0881',
    worker_cbo: '7825-10',
    reason_code_table_18: '02',
    reason_description: '02 - Acidente de trajeto',
    start_date: '2026-08-25',
    end_date: '2026-08-31',
    estimated_days: 7,
    is_traffic_accident: true,
    physician_name: 'Dra. Vanessa Mendonça',
    physician_crm: 'CRM/SP 167230',
    physician_uf: 'SP',
    cid_10: 'S13.4',
    status: 'ACTIVE_AWAY',
    created_at: '2026-08-25T11:45:00Z'
  }
];

// ==========================================
// 35. Comprehensive EPI Catalog & Seed (NR-06 & MTE)
// ==========================================
export const INITIAL_EPI_CATALOG: EPICatalogItem[] = [
  {
    id: 'epi-cat-01',
    organization_id: 'org-prevsafe-01',
    ca_number: '14235',
    name: 'Protetor Auditivo de Inserção tipo Plug Silicone',
    manufacturer: '3M do Brasil Ltda',
    model_description: 'Plug de silicone com cordão de poliéster, atenuação NRRsf 16 dB. Lavável e reutilizável.',
    protection_type: 'AUDITIVA',
    ca_validity_date: '2028-11-15',
    ca_status: 'VALID',
    standard_validity_days: 90,
    unit_cost: 4.80,
    stock_quantity: 145,
    min_stock_alert: 30,
    barcode_sku: '7891234567890',
    technical_sheet_notes: 'Higienização diária com água morna e sabão neutro. Substituição recomendada a cada 3 meses.',
    esocial_code_table_24: '01.01.001',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z'
  },
  {
    id: 'epi-cat-02',
    organization_id: 'org-prevsafe-01',
    ca_number: '29792',
    name: 'Óculos de Segurança Antirrisco e Antiembaçante',
    manufacturer: 'Kalipso Equipamentos',
    model_description: 'Armação em policarbonato incolor com proteção lateral, lente com tratamento antiembaçamento e UV 99.9%.',
    protection_type: 'OLHOS_FACE',
    ca_validity_date: '2029-04-20',
    ca_status: 'VALID',
    standard_validity_days: 180,
    unit_cost: 14.50,
    stock_quantity: 82,
    min_stock_alert: 20,
    barcode_sku: '7899876543210',
    technical_sheet_notes: 'Armazenar em estojo limpo para evitar riscos na lente.',
    esocial_code_table_24: '02.01.005',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z'
  },
  {
    id: 'epi-cat-03',
    organization_id: 'org-prevsafe-01',
    ca_number: '41419',
    name: 'Calçado Ocupacional tipo Botina de Segurança com Bico Composite',
    manufacturer: 'Marluvas Calçados de Segurança',
    model_description: 'Botina em couro hidrofugado curtido ao cromo, palmilha antiperfuração, biqueira composite e solado PU bidensidade.',
    protection_type: 'MEMBROS_INFERIORES',
    ca_validity_date: '2028-09-30',
    ca_status: 'VALID',
    standard_validity_days: 365,
    unit_cost: 112.00,
    stock_quantity: 48,
    min_stock_alert: 15,
    barcode_sku: '7895556667778',
    technical_sheet_notes: 'Não usar secagem direta ao sol ou estufa para preservar o couro.',
    esocial_code_table_24: '07.01.002',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z'
  },
  {
    id: 'epi-cat-04',
    organization_id: 'org-prevsafe-01',
    ca_number: '31469',
    name: 'Capacete de Segurança Classe B com Jugular',
    manufacturer: 'MSA do Brasil',
    model_description: 'Casco rígido em polietileno de alta densidade tipo aba frontal, suspensão Staz-On e tira jugular em tecido.',
    protection_type: 'CABECA',
    ca_validity_date: '2027-12-10',
    ca_status: 'VALID',
    standard_validity_days: 730,
    unit_cost: 38.90,
    stock_quantity: 60,
    min_stock_alert: 10,
    barcode_sku: '7891112223334',
    technical_sheet_notes: 'Inspecionar trincas e estado da carneira mensalmente.',
    esocial_code_table_24: '03.01.001',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z'
  },
  {
    id: 'epi-cat-05',
    organization_id: 'org-prevsafe-01',
    ca_number: '38507',
    name: 'Respirador Purificador de Ar PFF2 com Válvula de Exalação',
    manufacturer: 'Delta Plus Brasil',
    model_description: 'Mascara semifacial filtrante contra poeiras, névoas e fumos metálicos de solda.',
    protection_type: 'RESPIRATORIA',
    ca_validity_date: '2029-01-18',
    ca_status: 'VALID',
    standard_validity_days: 15,
    unit_cost: 6.90,
    stock_quantity: 210,
    min_stock_alert: 50,
    barcode_sku: '7894443332221',
    technical_sheet_notes: 'Descartar ao notar aumento de resistência respiratória ou saturação.',
    esocial_code_table_24: '04.01.003',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z'
  },
  {
    id: 'epi-cat-06',
    organization_id: 'org-prevsafe-01',
    ca_number: '36014',
    name: 'Cinturão de Segurança tipo Paraquedista com Talabarte Y (NR-35)',
    manufacturer: 'Hercules Equipamentos',
    model_description: 'Cinto 5 pontos com pontos dorsal, peitoral e de posicionamento. Acompanha talabarte duplo com absorvedor de energia.',
    protection_type: 'ALTURA_QUEDA',
    ca_validity_date: '2028-05-12',
    ca_status: 'VALID',
    standard_validity_days: 1095,
    unit_cost: 295.00,
    stock_quantity: 24,
    min_stock_alert: 5,
    barcode_sku: '7898889990001',
    technical_sheet_notes: 'Obrigatório checklist diário pré-uso antes de trabalho em altura acima de 2 metros.',
    esocial_code_table_24: '09.01.001',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z'
  },
  {
    id: 'epi-cat-07',
    organization_id: 'org-prevsafe-01',
    ca_number: '10786',
    name: 'Luva de Segurança em Vaqueta Mista com Punho em Raspa',
    manufacturer: 'Zanel Equipamentos de Proteção',
    model_description: 'Palma e dedos em vaqueta macia, dorso e punho de 15cm em raspa bovina selecionada.',
    protection_type: 'MEMBROS_SUPERIORES',
    ca_validity_date: '2027-08-22',
    ca_status: 'VALID',
    standard_validity_days: 60,
    unit_cost: 22.40,
    stock_quantity: 110,
    min_stock_alert: 25,
    barcode_sku: '7897778889992',
    technical_sheet_notes: 'Proteção contra abrasão, corte e agentes mecânicos.',
    esocial_code_table_24: '06.01.004',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z'
  }
];

// ==========================================
// 36. Initial EPI Deliveries Seed
// ==========================================
export const INITIAL_EPI_DELIVERIES: EPIDeliveryRecord[] = [
  {
    id: 'epi-del-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_name: 'Valença Metalurgia & Caldeiraria Pesada',
    employee_id: 'emp-valenca-01',
    employee_name: 'Carlos Alberto Mendonça',
    employee_cpf: '123.456.789-00',
    employee_registration: 'MAT-2024-0012',
    employee_job: 'Soldador de Caldeiraria Pesada',
    employee_sector: 'Galpão de Solda & Caldeiraria',
    epi_id: 'epi-cat-01',
    ca_number: '14235',
    epi_name: 'Protetor Auditivo de Inserção tipo Plug Silicone',
    manufacturer: '3M do Brasil Ltda',
    quantity: 1,
    delivery_date: '2026-08-15',
    delivery_time: '08:30',
    replacement_due_date: '2026-11-15',
    delivery_reason: 'PERIODICA_SUBSTITUICAO',
    delivery_method: 'FACIAL_BIOMETRIC',
    delivered_by_user_name: 'Eng. Eduardo Vasconcelos (PrevSafe)',
    biometric_face_matched: true,
    biometric_confidence: 0.984,
    biometric_photo_data_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="%230f172a" width="200" height="200"/><circle cx="100" cy="80" r="35" fill="%2338bdf8"/><path d="M50 170 C50 130, 150 130, 150 170 Z" fill="%2338bdf8"/><circle cx="100" cy="100" r="85" fill="none" stroke="%2310b981" stroke-width="4" stroke-dasharray="6,6"/><text x="100" y="190" fill="%2310b981" font-size="10" font-family="sans-serif" font-weight="bold" text-anchor="middle">BIOMETRIA FACIAL 98.4%</text></svg>',
    biometric_timestamp: '2026-08-15T08:30:22Z',
    term_receipt_accepted: true,
    training_received: true,
    hygiene_guidance_received: true,
    status: 'DELIVERED',
    notes: 'Colaborador validado com reconhecimento facial no posto de trabalho.',
    created_at: '2026-08-15T08:30:25Z'
  },
  {
    id: 'epi-del-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_name: 'Valença Metalurgia & Caldeiraria Pesada',
    employee_id: 'emp-valenca-01',
    employee_name: 'Carlos Alberto Mendonça',
    employee_cpf: '123.456.789-00',
    employee_registration: 'MAT-2024-0012',
    employee_job: 'Soldador de Caldeiraria Pesada',
    employee_sector: 'Galpão de Solda & Caldeiraria',
    epi_id: 'epi-cat-02',
    ca_number: '29792',
    epi_name: 'Óculos de Segurança Antirrisco e Antiembaçante',
    manufacturer: 'Kalipso Equipamentos',
    quantity: 1,
    delivery_date: '2026-08-15',
    delivery_time: '08:31',
    replacement_due_date: '2027-02-15',
    delivery_reason: 'ADMISSAO',
    delivery_method: 'FACIAL_BIOMETRIC',
    delivered_by_user_name: 'Eng. Eduardo Vasconcelos (PrevSafe)',
    biometric_face_matched: true,
    biometric_confidence: 0.979,
    biometric_photo_data_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="%230f172a" width="200" height="200"/><circle cx="100" cy="80" r="35" fill="%2338bdf8"/><path d="M50 170 C50 130, 150 130, 150 170 Z" fill="%2338bdf8"/><circle cx="100" cy="100" r="85" fill="none" stroke="%2310b981" stroke-width="4" stroke-dasharray="6,6"/><text x="100" y="190" fill="%2310b981" font-size="10" font-family="sans-serif" font-weight="bold" text-anchor="middle">BIOMETRIA FACIAL 97.9%</text></svg>',
    biometric_timestamp: '2026-08-15T08:31:05Z',
    term_receipt_accepted: true,
    training_received: true,
    hygiene_guidance_received: true,
    status: 'DELIVERED',
    notes: 'Treinamento de conservação aplicado.',
    created_at: '2026-08-15T08:31:10Z'
  },
  {
    id: 'epi-del-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_name: 'Valença Metalurgia & Caldeiraria Pesada',
    employee_id: 'emp-valenca-02',
    employee_name: 'Mariana Oliveira Costa',
    employee_cpf: '234.567.890-12',
    employee_registration: 'MAT-2024-0045',
    employee_job: 'Torneiro Mecânico CNC',
    employee_sector: 'Usinagem CNC & Ajustagem',
    epi_id: 'epi-cat-03',
    ca_number: '41419',
    epi_name: 'Calçado Ocupacional tipo Botina de Segurança com Bico Composite',
    manufacturer: 'Marluvas Calçados de Segurança',
    quantity: 1,
    delivery_date: '2026-08-10',
    delivery_time: '14:20',
    replacement_due_date: '2027-08-10',
    delivery_reason: 'PERIODICA_SUBSTITUICAO',
    delivery_method: 'MANUAL_SHEET',
    delivered_by_user_name: 'Téc. Robson Alves (PrevSafe)',
    biometric_face_matched: false,
    sheet_protocol_code: 'PROTO-EPI-2026-0891',
    term_receipt_accepted: true,
    training_received: true,
    hygiene_guidance_received: true,
    status: 'DELIVERED',
    notes: 'Ficha impressa assinada fisicamente e arquivada na pasta funcional da colaboradora.',
    created_at: '2026-08-10T14:20:00Z'
  }
];

// ==========================================
// 36. Comprehensive SST Work Orders (NR-01 & Art. 157 CLT)
// ==========================================
export const INITIAL_WORK_ORDERS_OS: SSTWorkOrderOS[] = [
  {
    id: 'os-valenca-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_name: 'Valença Metalurgia & Caldeiraria Pesada',
    employee_id: 'emp-valenca-01',
    os_code: 'OS-NR01-2026-0001',
    revision: 1,
    issue_date: '2026-08-15',
    validity_start_date: '2026-08-15',
    employer_name: 'Valença Metalurgia & Caldeiraria Pesada Ltda',
    employer_document: '23.456.789/0001-11',
    employer_cnae: '25.11-0-00 - Fabricação de estruturas metálicas',
    employer_risk_grade: 3,
    establishment_address: 'Av. Industrial das Nações, 4500 - Distrito Industrial - Valença/RJ',
    employee_name: 'Carlos Eduardo da Silva',
    employee_cpf: '123.456.789-00',
    employee_registration: 'MAT-2024-0012',
    employee_job_title: 'Caldeireiro Montador Especialista',
    employee_cbo: '7244-05',
    employee_sector: 'Caldeiraria & Soldagem Pesada',
    employee_unit: 'Unidade Industrial Matriz - Valença/RJ',
    employee_admission_date: '2024-02-10',
    employee_ghe_id: 'ghe-valenca-01',
    employee_ghe_name: 'GHE 01 - Soldagem e Caldeiraria Pesada',
    job_description: 'Executar serviços de corte, dobra, conformação, traçagem e montagem de peças e estruturas metálicas pesadas; manuseio de maçarico, esmerilhadeira, ponte rolante e ferramentas de caldeiraria.',
    routine_activities: [
      'Traçagem e corte térmico de chapas de aço carbono com maçarico oxiacetilênico',
      'Esmerilhamento de chanfros e rebarbas com esmerilhadeira angular de 7"',
      'Movimentação de peças pesadas com auxílio de talha elétrica e ponte rolante',
      'Ponteamento preliminar com solda MIG/MAG e eletrodo revestido',
      'Inspeção visual dimensional de conjuntos soldados e caldeirados'
    ],
    physical_risks: [
      'Ruído contínuo/intermitente (88.5 dB(A)) proveniente de marretamento e esmerilhamento',
      'Radiação não-ionizante (radiação UV/IV gerada pelo arco elétrico de solda)',
      'Calor radiante gerado por processos de oxi-corte e pré-aquecimento de chapas'
    ],
    chemical_risks: [
      'Fumos metálicos (Óxido de Ferro, Manganês, Cromo e Níquel)',
      'Gases tóxicos decorrentes de combustão (Monóxido de Carbono, Ozônio)'
    ],
    biological_risks: [
      'Ausência de agentes biológicos significativos na atividade padrão'
    ],
    ergonomic_risks: [
      'Posturas inadequadas com flexão de tronco e agachamento prolongado',
      'Levantamento manual e transporte de cargas pesadas pontuais (>25 kg)',
      'Esforço físico moderado/pesado e movimentos repetitivos de membros superiores'
    ],
    accident_mechanical_risks: [
      'Projeção de partículas incandescentes nos olhos e face (fagulhas de esmeril)',
      'Queda de material e peças suspensas durante içamento com ponte rolante',
      'Prensamento de membros superiores e esmagamento de dedos',
      'Queimaduras por contato com peças aquecidas ou escória de solda',
      'Cortes e perfurações com chapas metálicas vivas e rebarbas'
    ],
    collective_protections_epc: [
      'Sistema de exaustão localizada móvel com braço articulado nos postos de solda',
      'Biombos de proteção visual retráteis com filtro UV/IV para retenção de radiação',
      'Sinalização de segurança, demarcação de piso para trânsito de cargas suspensas',
      'Travas de segurança em ganchos de pontes rolantes e inspeção diária de cabos de aço'
    ],
    mandatory_epis: [
      {
        epi_name: 'Óculos de Segurança de Ampla Visão com Lente Incolor Anti-risco',
        ca_number: '18828',
        protection_type: 'OLHOS_FACE',
        usage_recommendation: 'Uso obrigatório durante todo o tempo de permanência no galpão'
      },
      {
        epi_name: 'Protetor Auditivo tipo Concha / Abafador com atenuação NRRsf 22 dB',
        ca_number: '14235',
        protection_type: 'AUDITIVA',
        usage_recommendation: 'Uso obrigatório contínuo em áreas de caldeiraria e esmerilhamento'
      },
      {
        epi_name: 'Respirador Semifacial PFF2 / N95 para Fumos Metálicos com Válvula',
        ca_number: '38511',
        protection_type: 'RESPIRATORIA',
        usage_recommendation: 'Obrigatório durante cortes térmicos, esmerilhamento e soldagem'
      },
      {
        epi_name: 'Luva de Segurança em Couro tipo Vaqueta e Raspa com Punho Longo',
        ca_number: '30244',
        protection_type: 'MEMBROS_SUPERIORES',
        usage_recommendation: 'Obrigatório no manuseio de chapas cortantes e ferramentas rotativas'
      },
      {
        epi_name: 'Calçado de Segurança com Bico de Aço / Composite e Palmilha Anti-perfuração',
        ca_number: '41419',
        protection_type: 'MEMBROS_INFERIORES',
        usage_recommendation: 'Uso obrigatório durante toda a jornada de trabalho'
      },
      {
        epi_name: 'Avental e Mangote em Raspa de Couro para Proteção contra Calor e Respingos',
        ca_number: '28114',
        protection_type: 'CORPO_INTEIRO',
        usage_recommendation: 'Obrigatório durante operações de corte oxiacetilênico e soldagem'
      }
    ],
    safe_work_procedures: [
      'Inspecione visualmente ferramentas elétricas, discos abrasivos e cabos antes de ligar à tomada',
      'Nunca remova a coifa de proteção (guarda) da esmerilhadeira angular',
      'Certifique-se de que os biombos de proteção estão posicionados antes de abrir o arco de solda',
      'Içamento de cargas: respeite a capacidade nominal da ponte rolante e jamais passe por baixo de cargas suspensas',
      'Mantenha extintores de incêndio (PQS / CO2) desobstruídos e próximos aos locais de trabalho a quente'
    ],
    mandatory_employee_obligations: [
      'Cumprir integralmente as Normas Regulamentadoras (NRs) e ordens de serviço emitidas pelo empregador (Art. 158 da CLT e item 1.4.2 da NR-01)',
      'Usar rigorosamente os EPIs fornecidos pelo empregador exclusivamente para a finalidade a que se destinam',
      'Responsabilizar-se pela guarda, limpeza e conservação dos EPIs sob seus cuidados',
      'Comunicar imediatamente ao Técnico de Segurança / Engenheiro qualquer alteração no EPI que o torne impróprio para uso',
      'Submeter-se aos exames médicos ocupacionais obrigatórios previstos no PCMSO (NR-07)',
      'Informar imediatamente à liderança e ao SESMT qualquer incidente, quase-acidente ou condição insegura no posto de trabalho'
    ],
    prohibitions_unsafe_acts: [
      'É estritamente proibido operar equipamentos sem capacitação/treinamento comprovado e ordem expressa da gerência',
      'É proibido usar anéis, alianças, correntes, pulseiras ou roupas soltas próximas a peças rotativas em movimento',
      'É proibido improvisar ferramentas manuais ("gambiarras") ou utilizar discos de corte danificados ou fora da especificação',
      'É proibido limpar máquinas com ar comprimido direcionado contra o próprio corpo ou de terceiros',
      'É proibido fumar em áreas de produção ou locais com manuseio de gases inflamáveis (acetileno/oxigênio)',
      'É proibido consumir bebidas alcoólicas ou substâncias entorpecentes antes ou durante a jornada de trabalho'
    ],
    emergency_accident_conduct: [
      'Em caso de acidente de trabalho: preste socorro imediato acionando a Brigada de Emergência / Primeiros Socorros interna pelo ramal de emergência (192 / Ramal 222)',
      'Não movimente vítimas de quedas ou traumas antes da chegada do socorro qualificado',
      'Comunique o fato imediatamente ao SESMT para abertura e emissão da CAT (Comunicação de Acidente de Trabalho - S-2210) no prazo legal de até 24 horas',
      'Em caso de princípio de incêndio: acione o alarme de emergência, utilize o extintor adequado e dirija-se ao Ponto de Encontro sinalizado'
    ],
    disciplinary_sanctions_text: 'O não cumprimento das disposições desta Ordem de Serviço, bem como a recusa injustificada ao uso dos EPIs fornecidos ou a prática de atos inseguros, constitui ato faltoso passível de punição disciplinar conforme o Artigo 158 da CLT, aplicando-se de forma gradativa: 1) Advertência Verbal; 2) Advertência Escrita; 3) Suspensão Disciplinar do Trabalho (1 a 30 dias); 4) Demissão por Justa Causa (Artigo 482 da CLT).',
    legal_framework: 'NR-01 (Portaria MTP nº 4.219/2022, subitens 1.4.1 e 1.4.2), NR-06, NR-07, NR-09, NR-12 e Artigo 157, inciso II c/c Artigo 158 da Consolidação das Leis do Trabalho (CLT).',
    employee_signed: true,
    signed_at: '2026-08-15T09:00:00Z',
    signature_method: 'DIGITAL_BIOMETRIC',
    signature_photo_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="%230f172a" width="200" height="200"/><circle cx="100" cy="80" r="35" fill="%2310b981"/><path d="M50 170 C50 130, 150 130, 150 170 Z" fill="%2310b981"/><circle cx="100" cy="100" r="85" fill="none" stroke="%2310b981" stroke-width="4" stroke-dasharray="6,6"/><text x="100" y="190" fill="%2310b981" font-size="10" font-family="sans-serif" font-weight="bold" text-anchor="middle">BIOMETRIA FACIAL OK</text></svg>',
    signature_hash: 'SHA256-OS-NR01-99A82B3C4D5E6F',
    responsible_engineer_name: 'Eng. Eduardo Vasconcelos',
    responsible_engineer_registration: 'CREA-RJ 201812345-D / Reg. MTE 00452-RJ',
    status: 'ACTIVE',
    notes: 'Ordem de Serviço homologada na admissão e validada com biometria facial.',
    created_at: '2026-08-15T09:00:00Z',
    updated_at: '2026-08-15T09:00:00Z'
  },
  {
    id: 'os-valenca-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_name: 'Valença Metalurgia & Caldeiraria Pesada',
    employee_id: 'emp-valenca-02',
    os_code: 'OS-NR01-2026-0002',
    revision: 1,
    issue_date: '2026-08-10',
    validity_start_date: '2026-08-10',
    employer_name: 'Valença Metalurgia & Caldeiraria Pesada Ltda',
    employer_document: '23.456.789/0001-11',
    employer_cnae: '25.11-0-00 - Fabricação de estruturas metálicas',
    employer_risk_grade: 3,
    establishment_address: 'Av. Industrial das Nações, 4500 - Distrito Industrial - Valença/RJ',
    employee_name: 'Mariana Oliveira Costa',
    employee_cpf: '234.567.890-12',
    employee_registration: 'MAT-2024-0045',
    employee_job_title: 'Torneiro Mecânico CNC',
    employee_cbo: '7212-15',
    employee_sector: 'Usinagem CNC & Ajustagem',
    employee_unit: 'Unidade Industrial Matriz - Valença/RJ',
    employee_admission_date: '2024-05-18',
    employee_ghe_id: 'ghe-valenca-02',
    employee_ghe_name: 'GHE 02 - Usinagem CNC e Tornearia',
    job_description: 'Operar e programar centros de usinagem e tornos CNC para desbaste, torneamento, fresamento e furação de peças metálicas; fixação de peças em placas hidráulicas, troca de ferramentas de corte e controle dimensional com paquímetro/micrômetro.',
    routine_activities: [
      'Preparação e fixação de peças metálicas em tornos CNC',
      'Leitura de programas ISO e ajustes de parâmetros de corte (RPM e avanço)',
      'Troca de insertos e ferramentas de metal duro',
      'Aplicação e monitoramento de fluido refrigerante de corte solúvel',
      'Limpeza do leito do torno e remoção de cavacos com gancho'
    ],
    physical_risks: [
      'Ruído intermitente (84.0 dB(A)) proveniente do processo de corte e usinagem'
    ],
    chemical_risks: [
      'Névoas de óleo solúvel e fluidos sintéticos de corte durante usinagem em alta rotação'
    ],
    biological_risks: [
      'Ausência de agentes biológicos significativos'
    ],
    ergonomic_risks: [
      'Trabalho em pé contínuo com sobrecarga em membros inferiores',
      'Movimentos finos repetitivos e atenção visual concentrada em medições'
    ],
    accident_mechanical_risks: [
      'Projeção de cavacos aquecidos e partículas metálicas no campo visual',
      'Risco de prensamento e aprisionamento em peças e placas em rotação (NR-12)',
      'Cortes nas mãos durante manuseio de cavacos e insertos afiados',
      'Queda em mesmo nível devido a piso com eventuais respingos de óleo'
    ],
    collective_protections_epc: [
      'Enclausuramento total do centro de usinagem com intertravamento de segurança (NR-12)',
      'Botoeiras de parada de emergência monitoradas por relé de segurança',
      'Coletores de névoa acoplados à carenagem da máquina',
      'Piso antiderrapante e estrados ergonômicos de borracha nos postos'
    ],
    mandatory_epis: [
      {
        epi_name: 'Óculos de Proteção Incolor com Proteção Lateral e Anti-embaçante',
        ca_number: '18828',
        protection_type: 'OLHOS_FACE',
        usage_recommendation: 'Uso obrigatório durante toda a operação'
      },
      {
        epi_name: 'Protetor Auditivo tipo Plug de Silicone com Atenuação NRRsf 15 dB',
        ca_number: '14235',
        protection_type: 'AUDITIVA',
        usage_recommendation: 'Obrigatório no ambiente de usinagem'
      },
      {
        epi_name: 'Calçado de Segurança com Biqueira de Composite e Solado Poliuretano Bidensidade',
        ca_number: '41419',
        protection_type: 'MEMBROS_INFERIORES',
        usage_recommendation: 'Uso obrigatório contínuo na fábrica'
      },
      {
        epi_name: 'Luvas de Proteção Nitrílica / Anticorte nível 5 (utilizar APENAS na limpeza e manuseio de peças paradas)',
        ca_number: '30244',
        protection_type: 'MEMBROS_SUPERIORES',
        usage_recommendation: 'PROIBIDO o uso de luvas com a máquina ou fuso em rotação'
      }
    ],
    safe_work_procedures: [
      'Nunca ligue o torno ou CNC com as portas de proteção abertas ou sistemas de segurança burlados',
      'Utilize ganchos metálicos e escovas apropriadas para remoção de cavacos, NUNCA utilize as mãos diretamente',
      'Nunca utilize luvas, mangas compridas soltas, relógios ou anéis ao operar máquinas com eixos rotativos',
      'Mantenha o piso ao redor da máquina sempre limpo e seco, aplicando material absorvente imediatamente em caso de gotejamento de óleo'
    ],
    mandatory_employee_obligations: [
      'Cumprir as disposições da NR-01, NR-12 e instruções da liderança',
      'Manter os dispositivos de segurança da máquina em perfeito funcionamento',
      'Usar os EPIs fornecidos e comunicar irregularidades imediatamente',
      'Participar dos treinamentos operacionais e de segurança promovidos pela empresa'
    ],
    prohibitions_unsafe_acts: [
      'É expressamente proibido desativar chaves fim de curso ou sensores de portas das máquinas',
      'É proibido realizar medições ou trocas de peças com o fuso da máquina em movimento',
      'É proibido utilizar ar comprimido para limpeza de roupas ou do corpo'
    ],
    emergency_accident_conduct: [
      'Em caso de emergência ou anomalia na máquina: pressione imediatamente o botão de Parada de Emergência tipo cogumelo',
      'Comunique a supervisão e o SESMT para apuração e emissão da CAT em até 24h caso ocorra lesão'
    ],
    disciplinary_sanctions_text: 'O descumprimento das normas e instruções de segurança contidas nesta Ordem de Serviço constitui ato faltoso passível das penas disciplinares do Artigo 158 da CLT (advertência verbal, advertência escrita, suspensão e demissão por justa causa conforme Art. 482 da CLT).',
    legal_framework: 'NR-01, NR-06, NR-07, NR-09, NR-12 e Artigos 157 e 158 da CLT.',
    employee_signed: true,
    signed_at: '2026-08-10T14:30:00Z',
    signature_method: 'PHYSICAL_MANUAL',
    signature_hash: 'ASSINATURA-FISICA-COLETADA-FOLHA-02',
    responsible_engineer_name: 'Eng. Eduardo Vasconcelos',
    responsible_engineer_registration: 'CREA-RJ 201812345-D / Reg. MTE 00452-RJ',
    status: 'ACTIVE',
    notes: 'Ordem de Serviço impressa e assinada fisicamente pela colaboradora.',
    created_at: '2026-08-10T14:30:00Z',
    updated_at: '2026-08-10T14:30:00Z'
  }
];

export const INITIAL_INTEGRATION_TRAININGS: SSTIntegrationTraining[] = [
  {
    id: 'train-valenca-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_name: 'Valença Metalurgia & Caldeiraria Pesada',
    training_code: 'CAP-INT-2026-001',
    training_title: 'Treinamento de Integração em Segurança e Saúde do Trabalho (NR-01)',
    training_type: 'ADMISSION_INTEGRATION',
    modality: 'PRESENTIAL',
    workload_hours: 6,
    validity_months: 12,
    start_date: '2026-08-15',
    end_date: '2026-08-15',
    location_or_platform: 'Auditório de Treinamentos - Planta Industrial Valença/RJ',
    instructor_name: 'Carlos Alberto Ferreira',
    instructor_qualification: 'Técnico em Segurança do Trabalho (MTE/RJ 0019842)',
    instructor_registration_number: 'Reg. MTE/RJ nº 0019842',
    technical_supervisor_name: 'Eng. Eduardo Vasconcelos',
    technical_supervisor_qualification: 'Engenheiro de Segurança do Trabalho e Mecânico',
    technical_supervisor_registration: 'CREA-RJ 201812345-D / Reg. MTE Especialista',
    nr_framework: 'NR-01 item 1.7 (Capacitação e Treinamento em SST), NR-06 (EPI), NR-12 (Máquinas), NR-17 (Ergonomia) e Art. 157 da CLT.',
    program_content_syllabus: [
      '1. Políticas corporativas de Segurança, Meio Ambiente e Saúde Ocupacional (SMS)',
      '2. Direitos, deveres e proibições dos trabalhadores conforme Artigo 158 da CLT e NR-01',
      '3. Identificação e percepção dos riscos ocupacionais da unidade: Físicos, Químicos, Biológicos, Ergonômicos e Acidentes (PGR)',
      '4. Uso correto, guarda, conservação, higienização e substituição dos Equipamentos de Proteção Individual (NR-06)',
      '5. Princípios de segurança em máquinas industriais, prensas, pontes rolantes e dispositivos de intertravamento (NR-12)',
      '6. Noções de ergonomia no transporte e movimentação manual de materiais e postura (NR-17)',
      '7. Procedimentos de emergência, rotas de fuga, alarmes, ponto de encontro e combate a princípio de incêndio (NR-23)',
      '8. Fluxo de comunicação de acidentes de trabalho, primeiros socorros imediatos e abertura de CAT (S-2210 eSocial)'
    ],
    training_evaluation_method: 'THEORETICAL_PRACTICAL_EXAM',
    status: 'COMPLETED',
    certificate_validity_legal_statement: 'Certificamos que o trabalhador participou integralmente e obteve aproveitamento satisfatório no Treinamento de Integração Admissional de Segurança e Saúde no Trabalho, cumprindo rigorosamente as diretrizes da Norma Regulamentadora nº 01 (Portaria MTP nº 4.219/2022, subitem 1.7) e das NRs aplicáveis à atividade.',
    notes: 'Treinamento ministrado para integração do lote admissional de agosto/2026. Ata de presença com assinaturas físicas e digitais arquivada no prontuário.',
    attendees: [
      {
        employee_id: 'emp-valenca-01',
        employee_name: 'Carlos Eduardo da Silva',
        employee_cpf: '123.456.789-00',
        employee_registration: 'MAT-2024-0012',
        employee_job_title: 'Soldador Especialista TIG/MIG',
        employee_sector: 'Caldeiraria Pesada & Estruturas Metálicas',
        employee_ghe_name: 'GHE 01 - Soldagem e Caldeiraria',
        attendance_rate_percent: 100,
        grade_score: 9.5,
        completed: true,
        signed: true,
        signature_method: 'DIGITAL_BIOMETRIC',
        signature_photo_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="%230f172a" width="200" height="200"/><circle cx="100" cy="80" r="35" fill="%2310b981"/><path d="M50 170 C50 130, 150 130, 150 170 Z" fill="%2310b981"/><circle cx="100" cy="100" r="85" fill="none" stroke="%2310b981" stroke-width="4" stroke-dasharray="6,6"/><text x="100" y="190" fill="%2310b981" font-size="10" font-family="sans-serif" font-weight="bold" text-anchor="middle">BIOMETRIA INTEGRACAO OK</text></svg>',
        signature_hash: 'SHA256-INT-TRAIN-8899AAFF11',
        certificate_code: 'CERT-NR01-2026-0001',
        issued_at: '2026-08-15T17:30:00Z'
      },
      {
        employee_id: 'emp-valenca-02',
        employee_name: 'Mariana Oliveira Costa',
        employee_cpf: '234.567.890-12',
        employee_registration: 'MAT-2024-0045',
        employee_job_title: 'Torneiro Mecânico CNC',
        employee_sector: 'Usinagem CNC & Ajustagem',
        employee_ghe_name: 'GHE 02 - Usinagem CNC e Tornearia',
        attendance_rate_percent: 100,
        grade_score: 9.0,
        completed: true,
        signed: true,
        signature_method: 'PHYSICAL_MANUAL',
        signature_hash: 'ASSINATURA-FISICA-ATA-FOLHA-01',
        certificate_code: 'CERT-NR01-2026-0002',
        issued_at: '2026-08-15T17:30:00Z'
      }
    ],
    created_at: '2026-08-15T08:00:00Z',
    updated_at: '2026-08-15T18:00:00Z'
  },
  {
    id: 'train-transbrasil-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    client_name: 'TransBrasil Logística Integrada',
    training_code: 'CAP-INT-2026-002',
    training_title: 'Integração de Segurança para Motoristas e Operadores de Carga (NR-01 / NR-11)',
    training_type: 'ADMISSION_INTEGRATION',
    modality: 'HYBRID',
    workload_hours: 8,
    validity_months: 12,
    start_date: '2026-08-12',
    end_date: '2026-08-13',
    location_or_platform: 'Centro de Treinamento TransBrasil - Sala 2 & AVA PrevSafe',
    instructor_name: 'Ana Paula Medeiros',
    instructor_qualification: 'Engenheira de Segurança do Trabalho (CREA-SP 5069812)',
    instructor_registration_number: 'CREA-SP 5069812 / MTE 009841',
    technical_supervisor_name: 'Eng. Eduardo Vasconcelos',
    technical_supervisor_qualification: 'Engenheiro Responsável Técnico',
    technical_supervisor_registration: 'CREA-RJ 201812345-D',
    nr_framework: 'NR-01 item 1.7, NR-11 (Transporte e Movimentação de Materiais), NR-17 e Código de Trânsito Brasileiro (CTB).',
    program_content_syllabus: [
      '1. Diretrizes de Segurança Viária e Prevenção de Fadiga na Condução',
      '2. Procedimentos seguros para amarração e travamento de cargas em carretas',
      '3. Inspeção diária obrigatória do veículo (Checklist Diário de Pneus, Freios e Direção)',
      '4. Uso de EPIs em operações de carga/descarga (Calçado com biqueira, colete refletivo, capacete)',
      '5. Plano de Atendimento a Emergências nas Rodovias e Acionamento de Sinistros'
    ],
    training_evaluation_method: 'THEORETICAL_PRACTICAL_EXAM',
    status: 'COMPLETED',
    certificate_validity_legal_statement: 'Certificamos que o colaborador concluiu satisfatoriamente o módulo de Integração de Segurança Operacional conforme exigências do MTP e NR-01.',
    notes: 'Treinamento admissional com módulo prático de amarração de carga.',
    attendees: [
      {
        employee_id: 'emp-trans-01',
        employee_name: 'Roberto Mendonça de Lima',
        employee_cpf: '345.678.901-23',
        employee_registration: 'MOT-2024-0089',
        employee_job_title: 'Motorista Carreteiro Interestadual',
        employee_sector: 'Transporte Rodoviário Pesado',
        employee_ghe_name: 'GHE 01 - Motoristas Rodoviários',
        attendance_rate_percent: 100,
        grade_score: 9.8,
        completed: true,
        signed: true,
        signature_method: 'DIGITAL_BIOMETRIC',
        signature_hash: 'SHA256-INT-ROB-MEND-991',
        certificate_code: 'CERT-NR01-2026-0003',
        issued_at: '2026-08-13T17:00:00Z'
      }
    ],
    created_at: '2026-08-12T08:00:00Z',
    updated_at: '2026-08-13T17:30:00Z'
  }
];

// ==========================================
// 38. SST Accident & Incident Investigation Seed (NR-01, NR-04, NR-05, NBR 14280, 5W2H)
// ==========================================
export const INITIAL_ACCIDENTS_INCIDENTS: SSTAccidentIncidentRecord[] = [
  {
    id: 'inc-acid-2026-001',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_name: 'Valença Metalurgia & Caldeiraria Pesada',
    code: 'ACID-2026-001',
    title: 'Corte e Laceração na mão direita durante corte com lixadeira angular',
    type: 'ACIDENTE_COM_AFASTAMENTO',
    severity: 'GRAVE',
    occurrence_date: '2026-08-20',
    occurrence_time: '14:35',
    shift: 'TARDE',
    unit_name: 'Unidade Industrial São Paulo (Matriz)',
    sector_name: 'Galpão de Solda & Caldeiraria',
    exact_location: 'Bancada de Ajustagem 03, próximo ao posto de soldagem MAG 02',
    has_victim: true,
    employee_id: 'emp-valenca-05',
    employee_name: 'José Ribeiro Antunes',
    employee_cpf: '678.901.234-56',
    employee_role: 'Soldador Industrial MIG/MAG',
    employee_registration: 'MAT-2025-0104',
    time_in_role: '1 ano e 8 meses',
    days_away: 15,
    days_debited: 0,
    linked_cat_id: 'cat-2026-0001',
    linked_cat_number: 'CAT-2026-000001',
    cid_10: 'S61.0 - Ferimento de dedo(s) sem lesão da unha',
    body_part: 'Mão (exceto punho ou dedos) - Lado Direito (Tabela 13 eSocial)',
    causative_agent: 'Disco abrasivo de lixadeira angular rotativa (Tabela 14 eSocial)',
    nature_lesion: 'Corte, Laceração profunda de partes moles com sangramento ativo',
    detailed_description: 'O colaborador estava realizando o desbaste de cordão de solda em uma viga metálica utilizando esmerilhadeira angular de 7 polegadas. Durante a operação, a ferramenta travou repentinamente na rebarba ("kickback" / contragolpe violento), projetando o disco abrasivo contra a mão direita do trabalhador. O colaborador utilizava luva de vaqueta que foi rompida pela aresta cortante do disco. Constatou-se que a coifa de proteção (guarda do disco) havia sido removida da ferramenta para facilitar o acesso a cantos estreitos.',
    immediate_actions_taken: 'Interrupção imediata da atividade com desligamento da energia da bancada; socorro imediato pela Brigada de Emergência com estancamento do sangramento e curativo compressivo; encaminhamento da vítima ao Hospital São Camilo em ambulância; isolamento da bancada e recolhimento da lixadeira para perícia técnica; emissão e transmissão da CAT (S-2210) no eSocial.',
    investigation_method: 'COMBINADA',
    five_whys: {
      why_1: 'Por que o operador sofreu o corte? Porque a esmerilhadeira sofreu um contragolpe ("kickback") e o disco atingiu sua mão direita.',
      why_2: 'Por que o disco atingiu a mão? Porque a coifa de proteção regulável (guarda do disco) não estava instalada na máquina.',
      why_3: 'Por que a coifa não estava instalada? Porque foi removida pelo próprio operador para desbastar um ponto de solda em ângulo de difícil acesso.',
      why_4: 'Por que o operador removeu a proteção e improvisou a operação? Porque não havia ferramenta adequada (microretífica ou lima rotativa) disponível no posto de trabalho e o colaborador não possuía reciclagem do procedimento operacional de segurança (POS-012).',
      why_5: 'Por que a liderança não impediu o uso da ferramenta sem proteção? Porque as inspeções comportamentais e de pré-uso de ferramentas (checklists diários de NR-12) não estavam sendo auditadas periodicamente pela supervisão.',
      root_cause: 'Operação de ferramenta rotativa sem dispositivo de segurança obrigatório (coifa) combinada com falha no checklist pré-uso e ausência de ferramenta específica para cantos vivos.'
    },
    ishikawa: {
      method: 'Ausência de procedimento de trabalho específico para corte em cantos confinados e falta de auditoria no checklist diário de ferramentas elétricas.',
      machine: 'Lixadeira angular utilizada com a capa de proteção (coifa) desmontada e sem sistema anti-bloqueio eletrônico ("kickback stop").',
      material: 'Disco abrasivo de corte de 7" utilizado indevidamente para função de desbaste lateral (esforço de flexão excessivo no disco).',
      manpower: 'Colaborador com treinamento de NR-12 vencido há 2 meses e prática de atalho operacional para ganho de agilidade.',
      measurement: 'Inspeção mensal de ferramentas elétricas pela equipe de manutenção não executada no mês corrente.',
      environment: 'Iluminação pontual deficiente na bancada de ajustagem criando sombras no ponto de contato.'
    },
    contributing_factors: [
      'Remoção de proteção coletiva/coifa da máquina (NR-12)',
      'Uso de disco impróprio para esforço lateral',
      'Pressão por produtividade na entrega de vigas estruturais',
      'Treinamento de reciclagem de segurança pendente'
    ],
    root_cause_summary: 'Contragolpe de ferramenta rotativa operada sem guarda de proteção (NR-12) e com disco abrasivo inadequado para a geometria da peça.',
    witnesses: [
      {
        id: 'wit-001',
        is_employee: true,
        employee_id: 'emp-valenca-01',
        name: 'Carlos Alberto Mendonça',
        cpf: '123.456.789-00',
        role: 'Soldador de Caldeiraria Pesada',
        sector: 'Galpão de Solda & Caldeiraria',
        phone: '(11) 98765-4321',
        statement: 'Eu estava na bancada ao lado quando ouvi o tranco característico da lixadeira travando e o grito do José. Corri imediatamente, desliguei o disjuntor da bancada e avisei o encarregado. Vi que a lixadeira estava sem a capa de proteção no momento do acidente.',
        statement_date: '2026-08-20'
      },
      {
        id: 'wit-002',
        is_employee: false,
        name: 'Marcos Vinícius Silveira',
        phone: '(11) 97123-8899',
        statement: 'Representante técnico de fornecedor de consumíveis de solda. Estava visitando o galpão para homologar novo arame tubular e presenciei o momento em que a peça prendeu na ferramenta e causou o contragolpe.',
        statement_date: '2026-08-20'
      }
    ],
    attachments: [
      {
        id: 'att-001',
        type: 'IMAGE',
        title: 'Foto 01 - Local exato do acidente e bancada de ajustagem',
        description: 'Registro fotográfico da bancada 03 com a viga metálica e a ferramenta retida após isolamento.',
        file_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><rect fill="%231e293b" width="400" height="260"/><rect x="20" y="20" width="360" height="220" fill="%230f172a" stroke="%23f43f5e" stroke-width="2" stroke-dasharray="4,4"/><circle cx="200" cy="110" r="45" fill="%23f43f5e" fill-opacity="0.2"/><path d="M185 85 L215 135 M215 85 L185 135" stroke="%23f43f5e" stroke-width="6" stroke-linecap="round"/><text x="200" y="175" fill="%23f43f5e" font-size="13" font-family="sans-serif" font-weight="bold" text-anchor="middle">EVIDÊNCIA FOTOGRÁFICA 01</text><text x="200" y="195" fill="%2394a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">Ferramenta sem guarda de proteção e disco danificado</text></svg>',
        file_name: 'evidencia_foto_01_bancada.jpg',
        file_size: '2.4 MB',
        uploaded_at: '2026-08-20T15:30:00Z'
      },
      {
        id: 'att-002',
        type: 'PDF',
        title: 'Atestado Médico e Prontuário de Atendimento de Emergência',
        description: 'Laudo médico emitido pelo Hospital São Camilo constatando sutura de 8 pontos e afastamento de 15 dias.',
        file_url: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr...',
        file_name: 'atestado_medico_hosp_sao_camilo.pdf',
        file_size: '850 KB',
        uploaded_at: '2026-08-20T17:15:00Z'
      }
    ],
    action_plan: [
      {
        id: 'act-001',
        what: 'Substituir todas as esmerilhadeiras convencionais do galpão por modelos com sistema eletrônico anti-contragolpe (Kickback Stop) e trava de guarda fixa.',
        why: 'Eliminar o risco mecânico de contragolpe descontrolado e impedir a remoção manual da coifa de segurança.',
        where: 'Galpão de Solda & Caldeiraria e Linha de Ajustagem',
        who: 'Eng. Eduardo Vasconcelos / Depto de Manutenção',
        when: '2026-09-05',
        how: 'Aquisição de 6 novas ferramentas industriais homologadas e descarte das unidades obsoletas.',
        how_much: 'R$ 7.200,00',
        status: 'EM_ANDAMENTO'
      },
      {
        id: 'act-002',
        what: 'Realizar Diálogo Diário de Segurança (DDS Especial) com 100% dos operadores sobre manuseio seguro de ferramentas rotativas e proibição de remoção de proteções.',
        why: 'Reforçar a conscientização comportamental e obrigações da NR-01 / NR-12.',
        where: 'Salas de Treinamento 01 e 02',
        who: 'Téc. Robson Alves (SESMT PrevSafe)',
        when: '2026-08-22',
        how: 'Apresentação presencial com estudo de caso do acidente, lista de presença com biometria facial e assinatura de termo.',
        how_much: 'Recursos internos',
        status: 'CONCLUIDO',
        completion_date: '2026-08-22',
        effectiveness_notes: 'Treinamento ministrado para 42 colaboradores do setor produtivo.'
      },
      {
        id: 'act-003',
        what: 'Implementar checklist digital diário pré-uso obrigatório no PWA com bloqueio por QR Code fixado nas máquinas.',
        why: 'Garantir que nenhuma máquina seja ligada sem verificação prévia de proteções, cabos e discos.',
        where: 'Todos os postos operacionais da fábrica',
        who: 'Equipe de TI & Engenharia de Segurança',
        when: '2026-09-15',
        how: 'Configuração de rotina de checagem no PrevSafe PWA com validação fotográfica do operador.',
        how_much: 'R$ 1.500,00',
        status: 'PENDENTE'
      }
    ],
    investigator_name: 'Eng. Eduardo Vasconcelos',
    investigator_role: 'Engenheiro de Segurança do Trabalho (CREA-RJ 201812345-D)',
    cipa_representative_name: 'Carlos Alberto Mendonça (Presidente da CIPA Gestão 2026)',
    manager_name: 'Roberto Valença (Diretor Industrial)',
    investigation_date: '2026-08-21',
    status: 'PLANO_DE_ACAO',
    created_at: '2026-08-20T17:00:00Z',
    updated_at: '2026-08-22T10:00:00Z'
  },
  {
    id: 'inc-acid-2026-002',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    client_name: 'Valença Metalurgia & Caldeiraria Pesada',
    code: 'INC-2026-002',
    title: 'Quase-Acidente (Near-Miss): Rompimento de cinta de elevação durante içamento de chapa de aço de 1.8 ton',
    type: 'INCIDENTE_QUASE_ACIDENTE',
    severity: 'ALTA',
    occurrence_date: '2026-08-18',
    occurrence_time: '10:15',
    shift: 'MANHA',
    unit_name: 'Unidade Industrial São Paulo (Matriz)',
    sector_name: 'Galpão de Solda & Caldeiraria',
    exact_location: 'Baia de descarga de matéria-prima, viga de rolamento da Ponte Rolante PR-01',
    has_victim: false,
    days_away: 0,
    days_debited: 0,
    detailed_description: 'Durante a movimentação de um fardo de chapas de aço laminado de 1.800 kg utilizando a ponte rolante PR-01, uma das cintas têxteis de poliéster rompeu repentinamente a uma altura de 1,5 metro do solo. A chapa colidiu com o chão de concreto produzindo forte impacto e ruído. Não houve feridos, pois a área de isolamento de raio de tombamento estava demarcada, porém dois ajudantes estavam a menos de 4 metros do perímetro.',
    immediate_actions_taken: 'Parada imediata da ponte rolante; evacuação e reforço do isolamento de segurança da baia; recolhimento da cinta rompida para laudo técnico de tração; vistoria de todas as outras cintas do estoque.',
    investigation_method: 'CINCO_PORQUES',
    five_whys: {
      why_1: 'Por que a carga caiu? Porque a cinta têxtil de 2 toneladas rompeu durante o içamento.',
      why_2: 'Por que a cinta rompeu? Porque sofreu corte por aresta viva na borda da chapa de aço sem proteção de canto.',
      why_3: 'Por que não havia proteção de canto (cantoneira de borracha/poliuretano)? Porque os operadores não utilizaram os protetores de canto disponíveis na caixa de acessórios.',
      why_4: 'Por que os operadores não utilizaram a proteção? Porque a cinta apresentava desgastes prévios por atrito e os colaboradores subestimaram o risco de cisalhamento da fita.',
      why_5: 'Por que a cinta desgastada estava em uso? Porque não havia plano formal de inspeção e descarte com critérios de cores de validade trimestral para lingas e cintas (NR-11).',
      root_cause: 'Falta de protetores de canto vivo no içamento de chapas afiadas e ausência de critério de descarte sistemático de cintas desgastadas (NR-11 / NBR 15637).'
    },
    ishikawa: {
      method: 'Plano de içamento de cargas ("Plano de Rigger") não detalhava a obrigatoriedade de cantoneiras magnéticas.',
      machine: 'Ponte rolante PR-01 com freio mecânico em perfeito estado, mas sem sensor de sobrecarga no gancho.',
      material: 'Cinta de poliéster com abrasão lateral prévia e sem etiqueta de capacidade de carga legível.',
      manpower: 'Operador de ponte rolante e sinaleiro sem treinamento de reciclagem de movimentação segura de cargas.',
      measurement: 'Inspeção visual pré-içamento negligenciada.',
      environment: 'Piso da baia com acúmulo temporário de cavacos metálicos.'
    },
    contributing_factors: [
      'Ausência de protetores de cantos vivos',
      'Uso de acessório de elevação com desgaste abrasivo',
      'Desconhecimento de critérios de descarte da NBR 15637'
    ],
    root_cause_summary: 'Cisalhamento de cinta têxtil por contato direto com aresta viva cortante de chapa metálica sem uso de cantoneiras de proteção.',
    witnesses: [
      {
        id: 'wit-003',
        is_employee: true,
        employee_id: 'emp-valenca-02',
        name: 'Mariana Oliveira Costa',
        cpf: '234.567.890-12',
        role: 'Torneiro Mecânico CNC',
        sector: 'Usinagem CNC & Ajustagem',
        statement: 'Estava passando no corredor demarcado e vi a carga balançar e despencar quando a cinta rasgou. O barulho foi assustador. Sorte que ninguém estava embaixo.',
        statement_date: '2026-08-18'
      }
    ],
    attachments: [
      {
        id: 'att-003',
        type: 'IMAGE',
        title: 'Foto 01 - Cinta têxtil rompida e chapa no solo',
        description: 'Evidência fotográfica demonstrando as fibras rompidas da cinta no ponto de contato com a aresta metálica.',
        file_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><rect fill="%231e293b" width="400" height="260"/><circle cx="200" cy="110" r="50" fill="%23f59e0b" fill-opacity="0.2"/><path d="M160 110 Q200 60 240 110 T320 110" fill="none" stroke="%23f59e0b" stroke-width="4" stroke-dasharray="6,6"/><text x="200" y="180" fill="%23f59e0b" font-size="13" font-family="sans-serif" font-weight="bold" text-anchor="middle">REGISTRO DE QUASE-ACIDENTE</text><text x="200" y="200" fill="%2394a3b8" font-size="11" font-family="sans-serif" text-anchor="middle">Rompimento de cinta de içamento (NR-11)</text></svg>',
        file_name: 'quase_acidente_cinta_rompida.jpg',
        file_size: '1.9 MB',
        uploaded_at: '2026-08-18T11:00:00Z'
      }
    ],
    action_plan: [
      {
        id: 'act-004',
        what: 'Adquirir 12 jogos de protetores de canto em poliuretano de alta densidade com fixação magnética para todas as baias de movimentação.',
        why: 'Proteger as cintas têxteis contra corte mecânico em bordas de chapas e perfis de aço.',
        where: 'Todas as baias de carga e descarga da fábrica',
        who: 'Eng. Eduardo Vasconcelos / Almoxarifado',
        when: '2026-08-28',
        how: 'Compra emergencial com fornecedor homologado e entrega com termo de responsabilidade aos operadores de ponte.',
        how_much: 'R$ 2.400,00',
        status: 'CONCLUIDO',
        completion_date: '2026-08-26',
        effectiveness_notes: 'Protetores instalados e testados com sucesso.'
      },
      {
        id: 'act-005',
        what: 'Instituir sistema de inspeção mensal com lacre de cores trimestrais (NBR 15637) e descarte imediato de cintas não conformes.',
        why: 'Evitar que acessórios avariados permaneçam em circulação no pátio industrial.',
        where: 'Almoxarifado e Pontes Rolantes',
        who: 'Téc. Robson Alves (SESMT)',
        when: '2026-09-10',
        how: 'Criação de procedimento e etiquetagem com lacre de cor do trimestre (Ex: Verde = Q3/2026).',
        how_much: 'R$ 600,00',
        status: 'EM_ANDAMENTO'
      }
    ],
    investigator_name: 'Téc. Robson Alves',
    investigator_role: 'Técnico em Segurança do Trabalho (MTE/SP 0054321)',
    cipa_representative_name: 'Carlos Alberto Mendonça (Presidente da CIPA)',
    manager_name: 'Roberto Valença (Diretor Industrial)',
    investigation_date: '2026-08-18',
    status: 'CONCLUIDO',
    created_at: '2026-08-18T12:00:00Z',
    updated_at: '2026-08-26T14:00:00Z'
  },
  {
    id: 'inc-acid-2026-003',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    client_name: 'TransBrasil Logística Integrada',
    code: 'ACID-2026-002',
    title: 'Acidente de Trajeto: Colisão traseira com entorse cervical na Rodovia dos Bandeirantes',
    type: 'ACIDENTE_TRAJETO',
    severity: 'MODERADA',
    occurrence_date: '2026-08-25',
    occurrence_time: '09:15',
    shift: 'MANHA',
    unit_name: 'Hub Logístico Campinas/Jundiaí',
    sector_name: 'Transporte Rodoviário Pesado',
    exact_location: 'Rodovia dos Bandeirantes, KM 74 - Sentido Interior',
    has_victim: true,
    employee_id: 'emp-transbrasil-01',
    employee_name: 'Antônio Ferreira Lima',
    employee_cpf: '789.012.345-67',
    employee_role: 'Motorista de Carreta Rodoviário',
    employee_registration: 'MAT-2023-0881',
    time_in_role: '3 anos e 2 meses',
    days_away: 7,
    days_debited: 0,
    linked_cat_id: 'cat-2026-0002',
    linked_cat_number: 'CAT-2026-000002',
    cid_10: 'S13.4 - Entorse e distensão da coluna cervical',
    body_part: 'Coluna Cervical e Dorso',
    causative_agent: 'Colisão de veículo automotor (Tabela 14 eSocial)',
    nature_lesion: 'Contusão, Entorse e estiramento muscular cervical (Whiplash)',
    detailed_description: 'O colaborador estava em deslocamento no trajeto residência-trabalho conduzindo seu veículo próprio quando foi atingido na traseira por um caminhão de carga de terceiros que não conseguiu frear a tempo em uma retenção de tráfego por obras na pista. O impacto gerou efeito chicote (whiplash) na coluna cervical do motorista.',
    immediate_actions_taken: 'Atendimento médico prestado pela concessionária da rodovia AutoBAn; elaboração do Boletim de Ocorrência da PRF nº 98124/2026; encaminhamento ao Pronto-Socorro de Itupeva; abertura e transmissão de CAT tipo Trajeto (S-2210).',
    investigation_method: 'CINCO_PORQUES',
    five_whys: {
      why_1: 'Por que o colaborador sofreu a lesão? Porque sofreu desaceleração brusca em colisão traseira.',
      why_2: 'Por que houve a colisão? Porque veículo de terceiros não manteve distância regulamentar de seguimento em fila de trânsito.',
      why_3: 'Por que o colaborador estava no local? Porque fazia o percurso habitual de ida ao trabalho.',
      why_4: 'Por que o trajeto foi enquadrado como acidente de trabalho? Porque ocorreu no percurso direto residência-trabalho conforme art. 21, IV, "d" da Lei 8.213/91.',
      why_5: 'Por que a empresa deve registrar? Porque a emissão da CAT de trajeto é exigência legal do eSocial (evento S-2210) e do INSS.',
      root_cause: 'Colisão rodoviária provocada por imprudência de condutor terceiro em rodovia sob concessão.'
    },
    contributing_factors: [
      'Obras na rodovia com lentidão repentina de pista',
      'Distância de seguimento insuficiente do condutor terceiro'
    ],
    root_cause_summary: 'Acidente de trajeto provocado por colisão traseira involuntária em rodovia.',
    witnesses: [
      {
        id: 'wit-004',
        is_employee: false,
        name: 'Policial Rodoviário Federal Marcos Aurélio',
        statement: 'Atendimento do sinistro no local. Constatada colisão traseira por desatenção do condutor do caminhão baú placa XYZ-9988. Vítima encaminhada consciente para atendimento médico.',
        statement_date: '2026-08-25'
      }
    ],
    attachments: [
      {
        id: 'att-004',
        type: 'PDF',
        title: 'Boletim de Ocorrência da Polícia Rodoviária Federal',
        description: 'B.O. nº 98124/2026 expedido pela PRF detalhando a dinâmica do sinistro e laudo pericial de trânsito.',
        file_url: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr...',
        file_name: 'boletim_ocorrencia_prf_98124.pdf',
        file_size: '1.2 MB',
        uploaded_at: '2026-08-25T14:00:00Z'
      }
    ],
    action_plan: [
      {
        id: 'act-006',
        what: 'Campanha de Conscientização de Direção Defensiva e Prevenção de Acidentes de Trajeto (Maio Amarelo / Campanha Permanente).',
        why: 'Sensibilizar todos os motoristas sobre a importância do uso do cinto, ajuste do encosto de cabeça e distância segura de seguimento.',
        where: 'Todos os hubs da TransBrasil',
        who: 'Comitê de SST & CIPA TransBrasil',
        when: '2026-09-20',
        how: 'Distribuição de cartilhas digitais no app dos motoristas e podcast de segurança viária.',
        how_much: 'R$ 800,00',
        status: 'EM_ANDAMENTO'
      }
    ],
    investigator_name: 'Ana Paula Medeiros',
    investigator_role: 'Engenheira de Segurança do Trabalho (CREA-SP 5069812)',
    investigation_date: '2026-08-26',
    status: 'CONCLUIDO',
    created_at: '2026-08-25T15:00:00Z',
    updated_at: '2026-08-26T16:00:00Z'
  }
];

// ==========================================
// 55. SST Electronic Signature & Digital Acceptance Seed Data
// ==========================================
export const INITIAL_SST_DOCUMENT_SIGNATURES: SSTDocumentSignature[] = [
  {
    id: 'sig-env-001',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-001',
    client_name: 'Metalúrgica Valença S/A',
    document_type: 'PGR',
    document_title: 'Programa de Gerenciamento de Riscos (PGR - NR-01) 2026/2027',
    document_number: 'PGR-VAL-2026-001',
    document_reference_id: 'doc-001',
    created_at: '2026-08-25T10:00:00Z',
    updated_at: '2026-08-28T14:30:00Z',
    status: 'PARTIALLY_SIGNED',
    document_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    legal_framework: 'Lei Federal 14.063/2020 (Art. 4º, II), MP 2.200-2/2001 e Portaria MTP 672/2021',
    qr_code_verification_url: 'https://prevsafe.com.br/validar?doc=PGR-VAL-2026-001&hash=9f86d081',
    notes: 'PGR completo com inventário de 6 GHEs, matriz de risco e plano de ação NR-01.',
    signers: [
      {
        id: 'sgn-001',
        signer_role: 'TECHNICAL_RESPONSIBLE',
        name: 'Eng. Eduardo Vasconcelos',
        email: 'eduardo.eng@prevsafesst.com.br',
        cpf: '123.456.789-10',
        role_title: 'Engenheiro de Segurança do Trabalho',
        professional_council_number: 'CREA-SP 5061928/D',
        signature_status: 'SIGNED',
        signed_at: '2026-08-26T09:15:32Z',
        signature_mode: 'DIGITAL_CERTIFICATE_ICP',
        signature_hash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
        ip_address: '189.120.45.102',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
        compliance_statement: 'Declaro, sob as penas da lei e responsabilidade técnica (ART/CREA), a veracidade das avaliações ambientais e plano de ação aqui consignados.',
        security_auth_code: 'ICP-BR-A1-VAL-9921'
      },
      {
        id: 'sgn-002',
        signer_role: 'EMPLOYER_REPRESENTATIVE',
        name: 'Dr. Marcelo Silva',
        email: 'marcelo.silva@valenca.com.br',
        cpf: '321.654.987-00',
        role_title: 'Diretor Administrativo / Empregador',
        signature_status: 'PENDING',
        compliance_statement: 'Declaro ciência e aprovação do inventário de riscos e cronograma de ações do PGR, autorizando o envio dos eventos ao eSocial.'
      }
    ],
    audit_trail: [
      {
        id: 'aud-001',
        timestamp: '2026-08-25T10:00:00Z',
        action: 'ENVELOPE_CRIADO',
        actor_name: 'Eng. Eduardo Vasconcelos',
        actor_cpf: '123.456.789-10',
        ip_address: '189.120.45.102',
        details: 'Envelope de assinatura gerado a partir do módulo de Documentos Técnicos.'
      },
      {
        id: 'aud-002',
        timestamp: '2026-08-26T09:15:32Z',
        action: 'ASSINATURA_REGISTRADA',
        actor_name: 'Eng. Eduardo Vasconcelos',
        actor_cpf: '123.456.789-10',
        ip_address: '189.120.45.102',
        details: 'Assinado com Certificado Digital ICP-Brasil A1 (SHA-256).'
      },
      {
        id: 'aud-003',
        timestamp: '2026-08-26T09:16:00Z',
        action: 'NOTIFICACAO_CLIENTE_ENVIADA',
        actor_name: 'Sistema PrevSafe',
        ip_address: '10.0.0.1',
        details: 'E-mail e notificação no Portal do Cliente enviados para Dr. Marcelo Silva.'
      }
    ]
  },
  {
    id: 'sig-env-002',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-001',
    client_name: 'Metalúrgica Valença S/A',
    document_type: 'PCMSO',
    document_title: 'Programa de Controle Médico de Saúde Ocupacional (PCMSO - NR-07)',
    document_number: 'PCMSO-VAL-2026-001',
    document_reference_id: 'doc-002',
    created_at: '2026-08-20T14:00:00Z',
    updated_at: '2026-08-22T16:45:00Z',
    status: 'SIGNED',
    document_sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    legal_framework: 'Lei Federal 14.063/2020, MP 2.200-2/2001 e Portaria MTP 672/2021',
    qr_code_verification_url: 'https://prevsafe.com.br/validar?doc=PCMSO-VAL-2026-001&hash=5e884898',
    notes: 'PCMSO anual coordenado pela Dra. Camila Torres com cronograma de exames complementares.',
    signers: [
      {
        id: 'sgn-003',
        signer_role: 'TECHNICAL_RESPONSIBLE',
        name: 'Dra. Camila Torres',
        email: 'camila.med@prevsafesst.com.br',
        cpf: '456.789.123-45',
        role_title: 'Médica Coordenadora do PCMSO',
        professional_council_number: 'CRM-SP 98765 / RQE 1234',
        signature_status: 'SIGNED',
        signed_at: '2026-08-21T11:20:00Z',
        signature_mode: 'DIGITAL_CERTIFICATE_ICP',
        signature_hash: 'd4e5f6a1b2c37890abcdef1234567890abcdef1234567890abcdef1234567890',
        ip_address: '201.88.140.22',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        compliance_statement: 'Declaro a coordenação médica do programa de saúde ocupacional conforme preconizado pela NR-07.',
        security_auth_code: 'CRM-DIGITAL-SP-98765'
      },
      {
        id: 'sgn-004',
        signer_role: 'EMPLOYER_REPRESENTATIVE',
        name: 'Dr. Marcelo Silva',
        email: 'marcelo.silva@valenca.com.br',
        cpf: '321.654.987-00',
        role_title: 'Diretor Administrativo / RH',
        signature_status: 'SIGNED',
        signed_at: '2026-08-22T16:45:00Z',
        signature_mode: 'ELECTRONIC_PORTAL',
        signature_hash: 'c3d4e5f6a1b27890abcdef1234567890abcdef1234567890abcdef1234567890',
        ip_address: '177.135.90.14',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)',
        compliance_statement: 'Aceite digital formalizado pelo Empregador no Portal PrevSafe, ciente do custeio dos exames ocupacionais.',
        security_auth_code: 'OTP-PORTAL-671290'
      }
    ],
    audit_trail: [
      {
        id: 'aud-004',
        timestamp: '2026-08-20T14:00:00Z',
        action: 'ENVELOPE_CRIADO',
        actor_name: 'Dra. Camila Torres',
        actor_cpf: '456.789.123-45',
        ip_address: '201.88.140.22',
        details: 'Envelope gerado e disponibilizado para assinaturas.'
      },
      {
        id: 'aud-005',
        timestamp: '2026-08-21T11:20:00Z',
        action: 'ASSINATURA_MEDICA_REGISTRADA',
        actor_name: 'Dra. Camila Torres',
        actor_cpf: '456.789.123-45',
        ip_address: '201.88.140.22',
        details: 'Assinatura digital médica com CRM/RQE confirmada.'
      },
      {
        id: 'aud-006',
        timestamp: '2026-08-22T16:45:00Z',
        action: 'ACEITE_CLIENTE_CONCLUIDO',
        actor_name: 'Dr. Marcelo Silva',
        actor_cpf: '321.654.987-00',
        ip_address: '177.135.90.14',
        details: 'Aceite digital finalizado no Portal com dupla autenticação OTP.'
      }
    ]
  },
  {
    id: 'sig-env-003',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-001',
    client_name: 'Metalúrgica Valença S/A',
    document_type: 'ESOCIAL_S2240',
    document_title: 'Lote S-2240 — Condições Ambientais do Trabalho (6 Trabalhadores)',
    document_number: 'ESOCIAL-S2240-2026-08',
    document_reference_id: 'evt-2240-val-01',
    created_at: '2026-08-28T11:00:00Z',
    updated_at: '2026-08-28T11:30:00Z',
    status: 'SIGNED',
    document_sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    legal_framework: 'Manual de Orientação do eSocial (MOS S-1.3) e Certificação Digital ICP-Brasil A1',
    qr_code_verification_url: 'https://prevsafe.com.br/validar?esocial=S2240-2026-08',
    notes: 'Assinatura eletrônica e autorização de transmissão ao ambiente de produção do governo.',
    signers: [
      {
        id: 'sgn-005',
        signer_role: 'TECHNICAL_RESPONSIBLE',
        name: 'Eng. Eduardo Vasconcelos',
        email: 'eduardo.eng@prevsafesst.com.br',
        cpf: '123.456.789-10',
        role_title: 'Responsável Técnico pelos Registros Ambientais',
        professional_council_number: 'CREA-SP 5061928/D',
        signature_status: 'SIGNED',
        signed_at: '2026-08-28T11:25:00Z',
        signature_mode: 'DIGITAL_CERTIFICATE_ICP',
        signature_hash: 'e5f6a1b2c3d47890abcdef1234567890abcdef1234567890abcdef1234567890',
        ip_address: '189.120.45.102',
        compliance_statement: 'Atesto a conformidade dos dados de fatores de risco Físicos, Químicos e Ergonômicos com a Tabela 24 do eSocial.'
      },
      {
        id: 'sgn-006',
        signer_role: 'EMPLOYER_REPRESENTATIVE',
        name: 'Dr. Marcelo Silva',
        email: 'marcelo.silva@valenca.com.br',
        cpf: '321.654.987-00',
        role_title: 'Empregador Outorgante (Procuração RFB)',
        signature_status: 'SIGNED',
        signed_at: '2026-08-28T11:30:00Z',
        signature_mode: 'ELECTRONIC_PORTAL',
        signature_hash: 'f6a1b2c3d4e57890abcdef1234567890abcdef1234567890abcdef1234567890',
        ip_address: '189.120.45.102',
        compliance_statement: 'Autorizo o envio imediato do lote ao Webservice do eSocial.'
      }
    ],
    audit_trail: [
      {
        id: 'aud-007',
        timestamp: '2026-08-28T11:00:00Z',
        action: 'XML_VALIDADO_SCHEMA',
        actor_name: 'Validador eSocial PrevSafe',
        ip_address: '10.0.0.1',
        details: 'Validação XSD S-01.03.00 concluída com 100% de conformidade.'
      },
      {
        id: 'aud-008',
        timestamp: '2026-08-28T11:30:00Z',
        action: 'ASSINATURA_XML_A1',
        actor_name: 'Certificado ICP A1 PrevSafe',
        ip_address: '189.120.45.102',
        details: 'Tag Signature XMLDSig gerada com sucesso e lote transmitido.'
      }
    ]
  },
  {
    id: 'sig-env-004',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-001',
    client_name: 'Metalúrgica Valença S/A',
    document_type: 'ORDEM_SERVICO',
    document_title: 'Ordem de Serviço de SST (NR-01) — Carlos Eduardo Santos (Soldador)',
    document_number: 'OS-SST-2026-045',
    document_reference_id: 'os-sst-01',
    created_at: '2026-08-27T08:30:00Z',
    updated_at: '2026-08-27T10:15:00Z',
    status: 'SIGNED',
    document_sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    legal_framework: 'Art. 157 e 158 da CLT, NR-01 e Portaria MTP 672/2021',
    qr_code_verification_url: 'https://prevsafe.com.br/validar?os=OS-SST-2026-045',
    notes: 'Ordem de Serviço emitida no ato da admissão, contendo orientações de prevenção e advertências disciplinares.',
    signers: [
      {
        id: 'sgn-007',
        signer_role: 'TECHNICAL_RESPONSIBLE',
        name: 'Ricardo Alves',
        email: 'ricardo.tst@prevsafesst.com.br',
        cpf: '789.123.456-78',
        role_title: 'Técnico em Segurança do Trabalho',
        professional_council_number: 'MTE/SP 0045129',
        signature_status: 'SIGNED',
        signed_at: '2026-08-27T09:00:00Z',
        signature_mode: 'ELECTRONIC_PORTAL',
        signature_hash: '1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
        ip_address: '189.120.45.102',
        compliance_statement: 'Ministrei a integração de segurança e entreguei as instruções operacionais.'
      },
      {
        id: 'sgn-008',
        signer_role: 'EMPLOYEE',
        name: 'Carlos Eduardo Santos',
        email: 'carlos.soldador@valenca.com.br',
        cpf: '445.556.667-88',
        role_title: 'Soldador MIG/MAG',
        signature_status: 'SIGNED',
        signed_at: '2026-08-27T10:15:00Z',
        signature_mode: 'BIOMETRIC_DRAW',
        signature_hash: '2b3c4d5e6f1a7890abcdef1234567890abcdef1234567890abcdef1234567890',
        ip_address: '177.135.90.14',
        user_agent: 'PrevSafe Field PWA / Android 14',
        compliance_statement: 'Declaro que recebi o treinamento, compreendi os riscos da minha função e comprometo-me a cumprir todas as normas de segurança e usar os EPIs.'
      }
    ],
    audit_trail: [
      {
        id: 'aud-009',
        timestamp: '2026-08-27T08:30:00Z',
        action: 'OS_CRIADA_AUTOMATICA',
        actor_name: 'Sistema PrevSafe',
        ip_address: '10.0.0.1',
        details: 'Ordem de serviço gerada com base no GHE-02 Soldagem Industrial.'
      },
      {
        id: 'aud-010',
        timestamp: '2026-08-27T10:15:00Z',
        action: 'ASSINATURA_COLABORADOR_COLETADA',
        actor_name: 'Carlos Eduardo Santos',
        actor_cpf: '445.556.667-88',
        ip_address: '177.135.90.14',
        details: 'Assinatura biométrica/rubrica digital colhida no tablet do SESMT com geolocalização.'
      }
    ]
  },
  {
    id: 'sig-env-005',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-transbrasil-02',
    client_name: 'TransBrasil Logística Integrada',
    document_type: 'LTCAT',
    document_title: 'Laudo Técnico das Condições Ambientais do Trabalho (LTCAT - INSS)',
    document_number: 'LTCAT-TB-2026-002',
    document_reference_id: 'doc-003',
    created_at: '2026-08-26T15:00:00Z',
    updated_at: '2026-08-29T10:00:00Z',
    status: 'PARTIALLY_SIGNED',
    document_sha256: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    legal_framework: 'Art. 58 da Lei 8.213/91, Instrução Normativa PRES/INSS nº 128/2022 e Lei 14.063/2020',
    qr_code_verification_url: 'https://prevsafe.com.br/validar?ltcat=LTCAT-TB-2026-002',
    notes: 'Avaliação quantitativa de ruído, vibração de corpo inteiro (VCI) e agentes químicos para aposentadoria especial.',
    signers: [
      {
        id: 'sgn-009',
        signer_role: 'TECHNICAL_RESPONSIBLE',
        name: 'Ana Paula Medeiros',
        email: 'ana.medeiros@prevsafesst.com.br',
        cpf: '556.667.778-99',
        role_title: 'Engenheira de Segurança do Trabalho',
        professional_council_number: 'CREA-SP 5069812/D',
        signature_status: 'SIGNED',
        signed_at: '2026-08-27T14:30:00Z',
        signature_mode: 'DIGITAL_CERTIFICATE_ICP',
        signature_hash: '3c4d5e6f1a2b7890abcdef1234567890abcdef1234567890abcdef1234567890',
        ip_address: '189.120.45.102',
        compliance_statement: 'Responsável técnica pela elaboração do LTCAT e enquadramento previdenciário no Perfil Profissiográfico Previdenciário (PPP).'
      },
      {
        id: 'sgn-010',
        signer_role: 'EMPLOYER_REPRESENTATIVE',
        name: 'Carlos Drummond',
        email: 'carlos.drummond@transbrasil.com.br',
        cpf: '667.778.889-00',
        role_title: 'Diretor de Operações TransBrasil',
        signature_status: 'PENDING',
        compliance_statement: 'Declaro ciência das conclusões de aposentadoria especial e GFIP/eSocial.'
      }
    ],
    audit_trail: [
      {
        id: 'aud-011',
        timestamp: '2026-08-26T15:00:00Z',
        action: 'ENVELOPE_LTCAT_CRIADO',
        actor_name: 'Ana Paula Medeiros',
        ip_address: '189.120.45.102',
        details: 'LTCAT finalizado com medições de dosimetria de ruído e acelerometria VCI.'
      }
    ]
  },
  {
    id: 'sig-env-006',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-001',
    client_name: 'Metalúrgica Valença S/A',
    document_type: 'RELATORIO_ACIDENTE_RIAA',
    document_title: 'Relatório e Investigação de Acidente (RIAA) — ACID-2026-001',
    document_number: 'RIAA-ACID-2026-001',
    document_reference_id: 'acid-001',
    created_at: '2026-08-20T17:00:00Z',
    updated_at: '2026-08-21T18:00:00Z',
    status: 'PARTIALLY_SIGNED',
    document_sha256: 'a35c4c29c8e1e792e34586927a4d538e12ff95874de388b14a2f8b5f3d6ec8c1',
    legal_framework: 'NR-01, NR-04, NR-05 e NBR 14280',
    qr_code_verification_url: 'https://prevsafe.com.br/validar?riaa=ACID-2026-001',
    notes: 'Investigação com Ishikawa 6M, 5 Porquês e Plano de Ação 5W2H para prensa P-04.',
    signers: [
      {
        id: 'sgn-011',
        signer_role: 'TECHNICAL_RESPONSIBLE',
        name: 'Ricardo Alves',
        email: 'ricardo.tst@prevsafesst.com.br',
        cpf: '789.123.456-78',
        role_title: 'Técnico em Segurança do Trabalho (SESMT)',
        professional_council_number: 'MTE/SP 0045129',
        signature_status: 'SIGNED',
        signed_at: '2026-08-21T10:00:00Z',
        signature_mode: 'ELECTRONIC_PORTAL',
        signature_hash: '4d5e6f1a2b3c7890abcdef1234567890abcdef1234567890abcdef1234567890',
        ip_address: '189.120.45.102',
        compliance_statement: 'Conduzi a investigação in loco e defini o plano de contingência.'
      },
      {
        id: 'sgn-012',
        signer_role: 'CIPA_REPRESENTATIVE',
        name: 'Lucas Martins',
        email: 'lucas.cipa@valenca.com.br',
        cpf: '889.990.001-12',
        role_title: 'Presidente da CIPA (Gestão 2026)',
        signature_status: 'SIGNED',
        signed_at: '2026-08-21T14:30:00Z',
        signature_mode: 'BIOMETRIC_DRAW',
        signature_hash: '5e6f1a2b3c4d7890abcdef1234567890abcdef1234567890abcdef1234567890',
        ip_address: '177.135.90.14',
        compliance_statement: 'Comitê da CIPA participou da análise de causas e deliberou favoravelmente sobre o plano de ação.'
      },
      {
        id: 'sgn-013',
        signer_role: 'EMPLOYER_REPRESENTATIVE',
        name: 'Dr. Marcelo Silva',
        email: 'marcelo.silva@valenca.com.br',
        cpf: '321.654.987-00',
        role_title: 'Diretor Industrial / Representante Legal',
        signature_status: 'PENDING',
        compliance_statement: 'Aprovo a liberação de recursos financeiros e prazos do plano 5W2H.'
      }
    ],
    audit_trail: [
      {
        id: 'aud-012',
        timestamp: '2026-08-20T17:00:00Z',
        action: 'RELATORIO_INVESTIGACAO_CONCLUIDO',
        actor_name: 'Ricardo Alves (SESMT)',
        ip_address: '189.120.45.102',
        details: 'RIAA emitido e enviado aos membros da comissão de segurança.'
      }
    ]
  }
];
