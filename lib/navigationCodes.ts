/**
 * PrevSafe System Navigation Codes Registry
 * 
 * Permite navegação ultrarrápida por código numérico:
 * Ex: Digitar '100' navega para 'Cadastro de Funcionários & Trabalhadores'
 *     Digitar '10' ou '010' navega para 'Dashboard Executivo'
 *     Digitar '50' navega para 'Ordens de Serviço (OS NR-01)'
 */

export interface NavigationCodeItem {
  code: string;               // Código numérico principal, ex: '100'
  aliases?: string[];         // Aliases adicionais, ex: ['func', 'trabalhadores']
  viewId: string;             // ID da view no app/page.tsx
  subTab?: string;            // Sub-aba se aplicável (ex: 'EMPLOYEES' na Engenharia SST)
  title: string;              // Título legível em português
  category: string;           // Categoria do menu
  description: string;        // Breve descrição do recurso
  iconName?: string;          // Nome de referência do ícone
  badge?: string;             // Badge visual opcional
}

export const NAVIGATION_CODES: NavigationCodeItem[] = [
  // ==========================================
  // 100 - TRABALHADORES & RECURSOS HUMANOS
  // ==========================================
  {
    code: '100',
    aliases: ['101', 'func', 'trabalhadores'],
    viewId: 'sst-engineering',
    subTab: 'EMPLOYEES',
    title: 'Cadastro de Funcionários & Trabalhadores',
    category: 'ENGENHARIA SST & RH',
    description: 'Gestão de trabalhadores, admissões, matrículas e-Social, fichas de EPI e ASO',
    badge: 'NR-01 / eSocial'
  },
  {
    code: '110',
    aliases: ['111', 'cargos', 'funcoes'],
    viewId: 'sst-engineering',
    subTab: 'HIERARCHY',
    title: 'Cargos, Funções & CBO',
    category: 'ENGENHARIA SST & RH',
    description: 'Cadastro de cargos, atribuições e códigos CBO da empresa',
    badge: 'Hierarquia'
  },
  {
    code: '120',
    aliases: ['121', 'setores', 'unidades'],
    viewId: 'sst-engineering',
    subTab: 'HIERARCHY',
    title: 'Setores, Unidades & Estabelecimentos',
    category: 'ENGENHARIA SST & RH',
    description: 'Estrutura organizacional, plantas físicas e setores de trabalho',
    badge: 'Hierarquia'
  },
  {
    code: '130',
    aliases: ['131', 'ghe', 'grupos'],
    viewId: 'sst-engineering',
    subTab: 'GHE_RISKS',
    title: 'GHE & Grupos Homogêneos de Exposição',
    category: 'ENGENHARIA SST & RH',
    description: 'Inventário de riscos por GHE para PGR e LTCAT',
    badge: 'PGR / LTCAT'
  },
  {
    code: '140',
    aliases: ['141', 'treinamentos', 'capacitacao'],
    viewId: 'sst-engineering',
    subTab: 'INTEGRATION_TRAINING',
    title: 'Treinamentos de Integração & NRs',
    category: 'ENGENHARIA SST & RH',
    description: 'Capacitações obrigatórias de NRs, certificados e validades',
    badge: 'NR-01'
  },
  {
    code: '150',
    aliases: ['151', 'assinaturas', 'biometria'],
    viewId: 'sst-engineering',
    subTab: 'SIGNATURES',
    title: 'Assinaturas Digitais & Fichas SST',
    category: 'ENGENHARIA SST & RH',
    description: 'Controle de assinaturas de Ordens de Serviço, EPIs e termos',
    badge: 'Digital'
  },

  // ==========================================
  // 010 a 040 - DASHBOARDS EXECUTIVOS & BI
  // ==========================================
  {
    code: '010',
    aliases: ['10', 'dash', 'executivo'],
    viewId: 'dashboard-exec',
    title: 'Dashboard Executivo',
    category: 'VISÃO EXECUTIVA',
    description: 'Indicadores estratégicos gerais, faturamento e saúde global do negócio',
    badge: 'Estratégico'
  },
  {
    code: '020',
    aliases: ['20', 'operacional', 'sla'],
    viewId: 'dashboard-oper',
    title: 'Dashboard Operacional & SLAs',
    category: 'VISÃO EXECUTIVA',
    description: 'Monitoramento de ordens de serviço, capacidade técnica e prazos',
    badge: 'Operação'
  },
  {
    code: '030',
    aliases: ['30', 'comercial', 'vendas'],
    viewId: 'dashboard-comm',
    title: 'Dashboard Comercial & Funil',
    category: 'VISÃO EXECUTIVA',
    description: 'Funil de vendas, ticket médio, taxa de conversão e pipeline',
    badge: 'Comercial'
  },
  {
    code: '040',
    aliases: ['40', 'qualidade', 'nps'],
    viewId: 'dashboard-qual',
    title: 'Dashboard de Qualidade & NPS',
    category: 'VISÃO EXECUTIVA',
    description: 'Métricas de satisfação do cliente, pós-venda e avaliações',
    badge: 'Qualidade'
  },

  // ==========================================
  // 050 a 090 - OPERAÇÕES, OS & DOCUMENTOS
  // ==========================================
  {
    code: '050',
    aliases: ['50', 'os', 'servicos'],
    viewId: 'service-orders',
    title: 'Ordens de Serviço (OS NR-01)',
    category: 'OPERAÇÕES & ENGENHARIA',
    description: 'Abertura, acompanhamento de etapas, laudos e fechamento de serviços',
    badge: 'Principal'
  },
  {
    code: '060',
    aliases: ['60', 'pgr', 'pcmso', 'ltcat'],
    viewId: 'sst-engineering',
    subTab: 'HIERARCHY',
    title: 'Engenharia SST Unificada (PGR/PCMSO)',
    category: 'OPERAÇÕES & ENGENHARIA',
    description: 'Ambiente completo de engenharia de segurança e medicina ocupacional',
    badge: 'NR-01/07/09'
  },
  {
    code: '070',
    aliases: ['70', 'riscos', 'tabela24'],
    viewId: 'occupational-risks-catalog',
    title: 'Catálogo de Riscos Ocupacionais',
    category: 'OPERAÇÕES & ENGENHARIA',
    description: 'Banco de agentes físicos, químicos, biológicos, ergonômicos e mecânicos',
    badge: 'Tabela 24'
  },
  {
    code: '080',
    aliases: ['80', 'documentos', 'laudos'],
    viewId: 'documents',
    title: 'Repositório de Documentos & Laudos',
    category: 'OPERAÇÕES & ENGENHARIA',
    description: 'Gestão de arquivos técnicos, laudos emitidos e acervo digital',
    badge: 'Documentos'
  },
  {
    code: '090',
    aliases: ['90', 'templates', 'catalogo'],
    viewId: 'service-templates',
    title: 'Catálogo de Serviços & NRs',
    category: 'OPERAÇÕES & ENGENHARIA',
    description: 'Modelos de serviços pré-configurados para propostas e OSs',
    badge: 'Serviços'
  },

  // ==========================================
  // 200 a 290 - PROTEÇÃO, CIPA & PREVENÇÃO
  // ==========================================
  {
    code: '200',
    aliases: ['epi', 'ca'],
    viewId: 'epi-management',
    title: 'Gestão de EPI & Biometria (NR-06)',
    category: 'PROTEÇÃO & CIPA',
    description: 'Controle de CA, entrega de equipamentos de proteção e biometria',
    badge: 'NR-06'
  },
  {
    code: '210',
    aliases: ['cipa', 'eleicao'],
    viewId: 'cipa-management',
    title: 'Gestão da CIPA & Eleições (NR-05)',
    category: 'PROTEÇÃO & CIPA',
    description: 'Dimensionamento, atas de reunião, votação secreta e posse',
    badge: 'NR-05'
  },
  {
    code: '220',
    aliases: ['pcmso', 'exames', 'aso'],
    viewId: 'sst-engineering',
    subTab: 'EXAMS_PCMSO',
    title: 'Exames Médicos Ocupacionais & ASO',
    category: 'MEDICINA DO TRABALHO',
    description: 'Protocolos de exames complementares, clínicos e convocação de ASO',
    badge: 'NR-07'
  },

  // ==========================================
  // 300 a 390 - SINISTRALIDADE & EVENTOS eSOCIAL
  // ==========================================
  {
    code: '300',
    aliases: ['cat', 'afastamentos'],
    viewId: 'cat-absences',
    title: 'CAT (S-2210) & Afastamentos (S-2230)',
    category: 'SINISTRALIDADE & eSOCIAL',
    description: 'Emissão de Comunicado de Acidente de Trabalho e atestados médicos',
    badge: 'S-2210 / 2230'
  },
  {
    code: '310',
    aliases: ['acidentes', 'investigacao', 'ishikawa'],
    viewId: 'accidents-incidents',
    title: 'Acidentes & Incidentes (NBR 14280)',
    category: 'SINISTRALIDADE & eSOCIAL',
    description: 'Investigação profunda de causas com 5W2H, Ishikawa e Pirâmide de Bird',
    badge: 'NBR 14280'
  },
  {
    code: '320',
    aliases: ['esocial', 'robo', 'transmissao'],
    viewId: 'esocial',
    title: 'Central de Eventos eSocial SST',
    category: 'SINISTRALIDADE & eSOCIAL',
    description: 'Robô de transmissão de lotes XML (S-2210, S-2220 e S-2240) com A1',
    badge: 'Governo'
  },

  // ==========================================
  // 400 a 490 - COMERCIAL, CRM & FINANCEIRO
  // ==========================================
  {
    code: '400',
    aliases: ['clientes', 'crm'],
    viewId: 'crm-clients',
    title: 'Clientes & Unidades Cadastradas',
    category: 'CRM & COMERCIAL',
    description: 'Base de empresas contratantes, filiais, graus de risco e contatos',
    badge: 'Clientes'
  },
  {
    code: '410',
    aliases: ['leads', 'funil'],
    viewId: 'crm-leads',
    title: 'Leads & Funil de Oportunidades',
    category: 'CRM & COMERCIAL',
    description: 'Prospecção, etapas de qualificação e pipeline de novos negócios',
    badge: 'CRM'
  },
  {
    code: '420',
    aliases: ['propostas', 'orcamentos'],
    viewId: 'proposals',
    title: 'Propostas Comerciais SST',
    category: 'CRM & COMERCIAL',
    description: 'Gerador de propostas com precificação por funcionário/NR e link de aceite',
    badge: 'Propostas'
  },
  {
    code: '430',
    aliases: ['contratos', 'assinatura'],
    viewId: 'contracts',
    title: 'Contratos & Assinaturas Digitais',
    category: 'CRM & COMERCIAL',
    description: 'Gestão de contratos ativos, reajustes, vigências e assinatura digital',
    badge: 'Contratos'
  },
  {
    code: '450',
    aliases: ['financeiro', 'caixa', 'dre'],
    viewId: 'financial',
    title: 'Gestão Financeira & Fluxo de Caixa',
    category: 'FINANCEIRO & CAIXA',
    description: 'Contas a pagar e receber, fluxo de caixa diário e DRE operacional',
    badge: 'Finanças'
  },

  // ==========================================
  // 500 a 590 - DEMANDAS, RELATÓRIOS & COMUNICAÇÃO
  // ==========================================
  {
    code: '500',
    aliases: ['relatorios', 'bi', 'excel', 'pdf'],
    viewId: 'reports',
    title: 'Central de Relatórios & BI',
    category: 'INTELIGÊNCIA OPERACIONAL',
    description: 'Exportação em lote de laudos em PDF e planilhas analíticas em Excel',
    badge: 'XLSX / PDF'
  },
  {
    code: '510',
    aliases: ['pendencias', 'chamados', 'sla'],
    viewId: 'requests',
    title: 'Central de Pendências & SLAs',
    category: 'INTELIGÊNCIA OPERACIONAL',
    description: 'Tickets de suporte, chamados internos e controle de tempo de resposta',
    badge: 'Chamados'
  },
  {
    code: '520',
    aliases: ['comunicacao', 'whatsapp', 'email'],
    viewId: 'communications',
    title: 'Central Multicanal (WhatsApp & Email)',
    category: 'COMUNICAÇÃO & AUTOMAÇÃO',
    description: 'Disparos automáticos de avisos de vencimento de ASO e laudos',
    badge: 'WhatsApp'
  },
  {
    code: '530',
    aliases: ['notificacoes', 'webhooks'],
    viewId: 'notifications',
    title: 'Notificações & Webhooks',
    category: 'COMUNICAÇÃO & AUTOMAÇÃO',
    description: 'Configuração de alertas em tempo real e integrações externas',
    badge: 'Alertas'
  },

  // ==========================================
  // 600 a 690 - GOVERNANÇA, USUÁRIOS & SAAS
  // ==========================================
  {
    code: '600',
    aliases: ['usuarios', 'perfis', 'rbac'],
    viewId: 'users-management',
    title: 'Central de Usuários & Perfis de Acesso',
    category: 'GOVERNANÇA & ACESSO',
    description: 'Controle RBAC, concessão de permissões e convites para a plataforma',
    badge: 'Segurança'
  },
  {
    code: '610',
    aliases: ['saas', 'tenants', 'assinantes'],
    viewId: 'saas-management',
    title: 'Gestão de Assinantes SaaS & Multi-Tenant',
    category: 'GOVERNANÇA & ACESSO',
    description: 'Controle de planos, limites de usuários e isolamento de dados',
    badge: 'SaaS'
  },
  {
    code: '620',
    aliases: ['auditoria', 'logs', 'audit'],
    viewId: 'audit-logs',
    title: 'Auditoria Geral do Sistema (Audit Log)',
    category: 'GOVERNANÇA & ACESSO',
    description: 'Trilha de auditoria com IP, data/hora e registros imutáveis de operações',
    badge: 'Auditoria'
  },
  {
    code: '630',
    aliases: ['tema', 'personalizacao', 'cores'],
    viewId: 'tenant-theme-settings',
    title: 'Personalização Visual & Tema SaaS',
    category: 'GOVERNANÇA & ACESSO',
    description: 'Cores institucionais, logotipo e estilo do portal do cliente e PWA',
    badge: 'White-Label'
  },
  {
    code: '640',
    aliases: ['configuracoes', 'parametros', 'settings'],
    viewId: 'settings',
    title: 'Configurações Globais do Sistema',
    category: 'GOVERNANÇA & ACESSO',
    description: 'Parâmetros técnicos, conexões de banco e credenciais de APIs',
    badge: 'Config'
  },

  // ==========================================
  // 700 a 790 - EXPERIÊNCIAS ESPECIAIS & SUPORTE
  // ==========================================
  {
    code: '700',
    aliases: ['portal', 'portal-cliente'],
    viewId: 'client-portal',
    title: 'Portal Corporativo do Cliente',
    category: 'EXPERIÊNCIA DEDICADA',
    description: 'Interface exclusiva para empresas contratantes visualizarem seus laudos',
    badge: 'Externo'
  },
  {
    code: '710',
    aliases: ['pwa', 'campo', 'tecnico'],
    viewId: 'technician-field',
    title: 'PWA de Campo (Técnico SST)',
    category: 'EXPERIÊNCIA DEDICADA',
    description: 'Aplicativo mobile para vistorias em campo com modo 100% offline',
    badge: 'Mobile'
  },
  {
    code: '720',
    aliases: ['ajuda', 'tutoriais', 'help'],
    viewId: 'help-center',
    title: 'Central de Ajuda & Manuais Práticos',
    category: 'SUPORTE & APRENDIZADO',
    description: 'Tutoriais ilustrados, vídeos demonstrativos e guias de normas',
    badge: 'Tutoriais'
  }
];

/**
 * Busca um item pelo código numérico exato ou alias
 */
export function findNavigationByCode(codeOrAlias: string): NavigationCodeItem | undefined {
  if (!codeOrAlias) return undefined;
  const clean = codeOrAlias.trim().toLowerCase();
  return NAVIGATION_CODES.find(item => 
    item.code.toLowerCase() === clean || 
    (item.aliases && item.aliases.some(a => a.toLowerCase() === clean))
  );
}

/**
 * Filtra itens por busca textual (código, título ou categoria)
 */
export function searchNavigationCodes(term: string): NavigationCodeItem[] {
  if (!term || !term.trim()) return NAVIGATION_CODES;
  const clean = term.trim().toLowerCase();
  return NAVIGATION_CODES.filter(item => 
    item.code.includes(clean) ||
    item.title.toLowerCase().includes(clean) ||
    item.category.toLowerCase().includes(clean) ||
    (item.aliases && item.aliases.some(a => a.toLowerCase().includes(clean)))
  );
}
