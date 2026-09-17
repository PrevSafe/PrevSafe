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
  name: 'PrevSafe',
  legal_name: 'G MONTEIRO EMPREENDIMENTOS LTDA',
  document_number: '69.133.606/0001-00',
  email: 'evoluaevenca@gmail.com',
  phone: '(73) 99918-9499',
  status: 'ACTIVE',
  theme_settings: {
    primary_color: '#10b981',
    primary_hover: '#059669',
    secondary_color: '#064e3b',
    accent_color: '#06b6d4',
    pwa_theme_color: '#022c22',
    portal_brand_name: 'PrevSafe',
    portal_tagline: 'Gestão de Segurança e Saúde no Trabalho',
    pwa_app_title: 'PrevSafe Campo',
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
    auth_user_id: '08b63aac-7df5-4056-8eec-c4d6cbffad5e',
    full_name: 'Gean Monteiro',
    email: 'geanmonteiro1@gmail.com',
    phone: '',
    whatsapp: '',
    role: 'ADMIN',
    department: 'Diretoria',
    job_title: 'Administrador Geral',
    status: 'ACTIVE',
    two_factor_enabled: false,
    created_at: '2026-09-17T00:00:00Z',
    updated_at: '2026-09-17T00:00:00Z'
  }
];

export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_CONTACTS: ClientContact[] = [];

export const INITIAL_UNITS: ClientUnit[] = [];

export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_OPPORTUNITIES: Opportunity[] = [];

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

export const INITIAL_PROPOSALS: Proposal[] = [];

export const INITIAL_CONTRACTS: Contract[] = [];

export const INITIAL_SERVICE_ORDERS: ServiceOrder[] = [];

export const INITIAL_DOCUMENTS: Document[] = [];

export const INITIAL_REQUESTS: RequestItem[] = [];

export const INITIAL_NOTIFICATIONS: Notification[] = [];

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

export const INITIAL_COMMUNICATIONS: Communication[] = [];

export const INITIAL_EVALUATIONS: Evaluation[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_ESOCIAL_EVENTS: ESocialEvent[] = [];

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

export const INITIAL_ESOCIAL_BATCHES: ESocialBatch[] = [];

// ===================================================
// DADOS INICIAIS DO MÓDULO FINANCEIRO (PrevSafe Finance)
// ===================================================

export const INITIAL_FINANCIAL_TRANSACTIONS: FinancialTransaction[] = [];

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

export const INITIAL_TENANTS: import('@/types').Tenant[] = [];

// ==========================================
// 28. SST Hierarchy: Sectors & Jobs
// ==========================================
export const INITIAL_HIERARCHY_SECTORS: SSTHierarchySector[] = [];

export const INITIAL_HIERARCHY_JOBS: SSTHierarchyJob[] = [];

// ==========================================
// 29. SST Homogeneous Exposure Groups (GHE)
// ==========================================
export const INITIAL_GHES: SSTGroupHomogeneousExposure[] = [];

// ==========================================
// 30. Environmental Risk Inventory (PGR / LTCAT / eSocial S-2240)
// ==========================================
export const INITIAL_ENVIRONMENTAL_RISKS: SSTEnvironmentalRisk[] = [];

// ==========================================
// 31. Occupational Exam Protocols (PCMSO / NR-07 / eSocial S-2220)
// ==========================================
export const INITIAL_EXAM_PROTOCOLS: SSTExamProtocol[] = [
  {
    id: 'proto-modelo-01',
    organization_id: 'org-prevsafe-01',
    client_id: '',
    ghe_id: '',
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
    id: 'proto-modelo-02',
    organization_id: 'org-prevsafe-01',
    client_id: '',
    ghe_id: '',
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
    id: 'proto-modelo-03',
    organization_id: 'org-prevsafe-01',
    client_id: '',
    ghe_id: '',
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
    id: 'proto-modelo-04',
    organization_id: 'org-prevsafe-01',
    client_id: '',
    ghe_id: '',
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
    id: 'proto-modelo-05',
    organization_id: 'org-prevsafe-01',
    client_id: '',
    ghe_id: '',
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
    id: 'proto-modelo-06',
    organization_id: 'org-prevsafe-01',
    client_id: '',
    ghe_id: '',
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
export const INITIAL_EMPLOYEES: Employee[] = [];

// ==========================================
// 33. CAT Records (S-2210)
// ==========================================
export const INITIAL_CAT_RECORDS: SSTCATRecord[] = [];

// ==========================================
// 34. Work Absence Records (S-2230)
// ==========================================
export const INITIAL_WORK_ABSENCES: SSTWorkAbsence[] = [];

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
export const INITIAL_EPI_DELIVERIES: EPIDeliveryRecord[] = [];

// ==========================================
// 36. Comprehensive SST Work Orders (NR-01 & Art. 157 CLT)
// ==========================================
export const INITIAL_WORK_ORDERS_OS: SSTWorkOrderOS[] = [];

export const INITIAL_INTEGRATION_TRAININGS: SSTIntegrationTraining[] = [];

// ==========================================
// 38. SST Accident & Incident Investigation Seed (NR-01, NR-04, NR-05, NBR 14280, 5W2H)
// ==========================================
export const INITIAL_ACCIDENTS_INCIDENTS: SSTAccidentIncidentRecord[] = [];

// ==========================================
// 55. SST Electronic Signature & Digital Acceptance Seed Data
// ==========================================
export const INITIAL_SST_DOCUMENT_SIGNATURES: SSTDocumentSignature[] = [];
