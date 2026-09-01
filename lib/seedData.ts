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
  ESocialBatch
} from '@/types';

export const INITIAL_ORGANIZATION: Organization = {
  id: 'org-prevsafe-01',
  name: 'PrevSafe Consultoria & Engenharia SST',
  legal_name: 'PrevSafe Gestão de Segurança e Saúde no Trabalho Ltda',
  document_number: '12.345.678/0001-90',
  email: 'contato@prevsafesst.com.br',
  phone: '(11) 3450-9900',
  status: 'ACTIVE',
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
    status: 'ACTIVE',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'user-manager-01',
    organization_id: 'org-prevsafe-01',
    full_name: 'Mariana Siqueira',
    email: 'mariana.siqueira@prevsafe.com.br',
    phone: '(11) 98888-1002',
    whatsapp: '5511988881002',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    role: 'GESTOR',
    status: 'ACTIVE',
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
    status: 'ACTIVE',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'user-tech-01',
    organization_id: 'org-prevsafe-01',
    full_name: 'Eng. Eduardo Vasconcelos',
    email: 'eduardo.vasconcelos@prevsafe.com.br',
    phone: '(11) 98888-1004',
    whatsapp: '5511988881004',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'TÉCNICO',
    status: 'ACTIVE',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
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
    status: 'ACTIVE',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'user-client-01',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    full_name: 'Dr. João Alencar',
    email: 'joao.alencar@valencametal.com.br',
    phone: '(11) 97777-2001',
    whatsapp: '5511977772001',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    role: 'CLIENTE_ADMIN',
    status: 'ACTIVE',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 'user-client-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    full_name: 'Beatriz Ramos',
    email: 'beatriz.ramos@valencametal.com.br',
    phone: '(11) 97777-2002',
    whatsapp: '5511977772002',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    role: 'CLIENTE_USER',
    status: 'ACTIVE',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z'
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-valenca-01',
    organization_id: 'org-prevsafe-01',
    legal_name: 'Metalúrgica Valença e Estruturas Metálicas S/A',
    trade_name: 'Metalúrgica Valença',
    document_number: '33.456.789/0001-12',
    main_cnae: '25.11-0-00',
    cnae_description: 'Fabricação de estruturas metálicas',
    risk_degree: 4,
    employee_count: 380,
    email: 'sst@valencametal.com.br',
    phone: '(11) 4002-8922',
    whatsapp: '5511977772001',
    address: 'Av. das Indústrias Pesadas, 1420 - Distrito Industrial',
    city: 'São Paulo',
    state: 'SP',
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
    document_number: '19.882.341/0001-55',
    main_cnae: '49.30-2-02',
    cnae_description: 'Transporte rodoviário de carga',
    risk_degree: 3,
    employee_count: 145,
    email: 'operacoes@transbrasillog.com.br',
    phone: '(19) 3211-9000',
    whatsapp: '5519998811223',
    address: 'Rodovia Anhanguera, Km 98 - Galpão 4',
    city: 'Campinas',
    state: 'SP',
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
    document_number: '44.112.990/0001-88',
    main_cnae: '41.20-4-00',
    cnae_description: 'Construção de edifícios',
    risk_degree: 4,
    employee_count: 210,
    email: 'seguranca@alfaeng.com.br',
    phone: '(11) 3100-5544',
    whatsapp: '5511995544332',
    address: 'Rua Bela Cintra, 890 - Consolação',
    city: 'São Paulo',
    state: 'SP',
    status: 'ACTIVE',
    notes: '3 canteiros de obras ativos. Foco em NR-18 e NR-35.',
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-02-01T09:00:00Z'
  },
  {
    id: 'cli-santaclara-04',
    organization_id: 'org-prevsafe-01',
    legal_name: 'Hospital e Maternidade Santa Clara S/A',
    trade_name: 'Hospital Santa Clara',
    document_number: '55.667.889/0001-33',
    main_cnae: '86.10-1-01',
    cnae_description: 'Atividades de atendimento hospitalar',
    risk_degree: 3,
    employee_count: 520,
    email: 'rh@santaclarasaude.com.br',
    phone: '(11) 2200-8800',
    whatsapp: '5511988776655',
    address: 'Av. Paulista, 2500 - Bela Vista',
    city: 'São Paulo',
    state: 'SP',
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
    address: 'Av. das Indústrias Pesadas, 1420',
    city: 'São Paulo',
    state: 'SP',
    cnae: '25.11-0-00',
    employee_count: 280,
    status: 'ACTIVE'
  },
  {
    id: 'unt-02',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-valenca-01',
    name: 'Centro de Distribuição e Pintura Eletrostática',
    address: 'Rua do Aço, 400',
    city: 'Guarulhos',
    state: 'SP',
    cnae: '25.39-0-01',
    employee_count: 100,
    status: 'ACTIVE'
  },
  {
    id: 'unt-03',
    organization_id: 'org-prevsafe-01',
    client_id: 'cli-alfa-03',
    name: 'Canteiro Edifício Sky Tower',
    address: 'Av. Faria Lima, 3400',
    city: 'São Paulo',
    state: 'SP',
    cnae: '41.20-4-00',
    employee_count: 110,
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
  }
];

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

