export interface TutorialStep {
  stepNumber: number;
  title: string;
  description: string;
  highlightAction: string;
  tip?: string;
  uiPin?: { label: string; x: number; y: number };
  screenType: 'FORM' | 'TABLE' | 'KANBAN' | 'MODAL' | 'PWA' | 'DASHBOARD' | 'REPORT' | 'XML_VIEWER';
  mockupDetails: {
    screenTitle: string;
    breadcrumbs: string[];
    mainActionLabel?: string;
    fieldsOrItems?: Array<{ label: string; value: string; badge?: string; status?: string }>;
    highlightBox?: { title: string; desc: string; color: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose' };
    calloutText?: string;
  };
}

export interface InfographicNode {
  id: string;
  phase: string;
  actor: string;
  actorColor: string;
  title: string;
  description: string;
  rulesOrDocs?: string[];
  output: string;
  isDecision?: boolean;
  decisionChoices?: { yes: string; no: string };
  slaTime?: string;
}

export interface VideoKeyframe {
  timestamp: number; // in seconds (e.g. 0, 5, 12...)
  duration: number;
  actionTitle: string;
  narratorText: string;
  cursorTarget: { x: number; y: number; label: string };
  screenState: {
    activeTab?: string;
    modalOpen?: boolean;
    bannerText?: string;
    badgeStatus?: string;
    tableHighlightRow?: number;
    successMessage?: string;
  };
}

export interface TutorialItem {
  id: string;
  title: string;
  subtitle: string;
  category: 
    | 'CLIENTS' 
    | 'COMMERCIAL' 
    | 'SERVICE_ORDERS' 
    | 'FIELD_PWA' 
    | 'DOCUMENTS' 
    | 'ESOCIAL' 
    | 'FINANCIAL' 
    | 'CLIENT_PORTAL' 
    | 'REQUESTS' 
    | 'SAAS_ADMIN' 
    | 'AI_COPILOT' 
    | 'AUDIT_LOGS';
  categoryLabel: string;
  targetRoles: string[];
  difficulty: 'INICIANTE' | 'INTERMEDIÁRIO' | 'AVANÇADO';
  estimatedMinutes: number;
  regulatoryRef?: string;
  targetViewId: string; // for "Abrir no Sistema"
  tags: string[];
  summary: string;
  whyItMatters: string;
  processUtility: string;
  prerequisites: string[];
  steps: TutorialStep[];
  infographic: {
    objective: string;
    flowNodes: InfographicNode[];
    regulatoryCompliance: string;
    criticalSuccessFactor: string;
  };
  videoSimulator: {
    totalDurationSeconds: number;
    videoTitle: string;
    videoDescription: string;
    keyframes: VideoKeyframe[];
  };
  faq: Array<{ question: string; answer: string }>;
  commonMistakes: Array<{ mistake: string; prevention: string }>;
}

export const TUTORIALS_DATA: TutorialItem[] = [
  {
    id: 'tut-clients-cnpj',
    title: 'Cadastro Inteligente de Clientes e Unidades com Consulta CNPJ na RFB',
    subtitle: 'Aprenda a cadastrar clientes corporativos buscando dados em tempo real na Receita Federal com preenchimento automático de CNAE, Grau de Risco e Contatos.',
    category: 'CLIENTS',
    categoryLabel: 'Clientes & Unidades',
    targetRoles: ['ADMIN', 'GESTOR', 'COMERCIAL', 'FINANCEIRO'],
    difficulty: 'INICIANTE',
    estimatedMinutes: 4,
    regulatoryRef: 'NR-04 (Quadro I) & Portaria MTP nº 671',
    targetViewId: 'crm-clients',
    tags: ['Clientes', 'Receita Federal', 'Consulta CNPJ', 'CNAE', 'Grau de Risco', 'Unidades Operacionais'],
    summary: 'Cadastre empresas tomadoras com 1 clique digitando apenas o CNPJ. O PrevSafe consulta as bases públicas da Receita Federal e preenche automaticamente Razão Social, CNAE Primário, Grau de Risco NR-04, Endereço e Quadro Societário.',
    whyItMatters: 'Evita erros cadastrais graves no eSocial e garante que o enquadramento do SESMT e CIPA ocorra com o CNAE oficial registrado.',
    processUtility: 'Primeiro passo para qualquer operação no PrevSafe: sem o cliente e sua unidade cadastrados, não é possível emitir propostas, contratos, OS ou eventos S-2240.',
    prerequisites: ['CNPJ do cliente em mãos', 'Definição do responsável comercial'],
    steps: [
      {
        stepNumber: 1,
        title: 'Acessar o Módulo de Clientes e Clicar em "+ Novo Cliente"',
        description: 'No menu lateral, clique em "Clientes & Unidades" e depois no botão de destaque superior "+ Novo Cliente".',
        highlightAction: 'Clique no botão "+ Novo Cliente"',
        tip: 'Você também pode usar o atalho de busca rápida para localizar clientes existentes antes de cadastrar.',
        screenType: 'TABLE',
        mockupDetails: {
          screenTitle: 'Gestão de Clientes & Unidades Operacionais',
          breadcrumbs: ['CRM & Comercial', 'Clientes'],
          mainActionLabel: '+ Novo Cliente',
          fieldsOrItems: [
            { label: 'Metalúrgica Valença S.A.', value: 'CNPJ: 14.892.441/0001-92', badge: 'Grau de Risco 3', status: 'Ativo' },
            { label: 'Construtora Horizonte Ltda', value: 'CNPJ: 08.765.123/0001-44', badge: 'Grau de Risco 4', status: 'Ativo' },
            { label: 'Logística TransBrasil Sul', value: 'CNPJ: 22.345.987/0001-10', badge: 'Grau de Risco 3', status: 'Ativo' }
          ],
          highlightBox: {
            title: 'Botão de Ação Superior',
            desc: 'Localizado no topo direito da tela de listagem de clientes.',
            color: 'emerald'
          }
        }
      },
      {
        stepNumber: 2,
        title: 'Digitar o CNPJ e Clicar em "Consultar Receita Federal"',
        description: 'Digite os 14 dígitos do CNPJ da empresa. O sistema validará o dígito verificador e habilitará o botão "Buscar na RFB". Ao clicar, os dados são trazidos em menos de 1 segundo.',
        highlightAction: 'Preencher CNPJ e clicar em Buscar',
        tip: 'O sistema traz Razão Social, Nome Fantasia, CNAE principal, CNAEs secundários, CEP, Logradouro, Bairro e Município.',
        screenType: 'FORM',
        mockupDetails: {
          screenTitle: 'Modal: Cadastrar Nova Empresa Cliente',
          breadcrumbs: ['Clientes', 'Formulário de Cadastro'],
          mainActionLabel: '🔍 Buscar na RFB',
          fieldsOrItems: [
            { label: 'CNPJ', value: '14.892.441/0001-92 (Válido)', badge: 'Consulta BrasilAPI Ativa' },
            { label: 'Razão Social', value: 'METALURGICA VALENCA S.A.', badge: 'Preenchido Automaticamente' },
            { label: 'CNAE Principal', value: '25.11-0-00 - Fabricação de estruturas metálicas', badge: 'NR-04 Grau de Risco 3' }
          ],
          highlightBox: {
            title: 'Auto-Preenchimento RFB',
            desc: 'Os campos de endereço e CNAE são preenchidos e validados diretamente.',
            color: 'blue'
          }
        }
      },
      {
        stepNumber: 3,
        title: 'Cadastrar Unidades Operacionais (Matriz & Filiais)',
        description: 'Vincule as unidades físicas onde os colaboradores prestam serviço. Cada unidade pode possuir um endereço e responsável de segurança específico para os laudos.',
        highlightAction: 'Adicionar Unidade Operacional',
        screenType: 'FORM',
        mockupDetails: {
          screenTitle: 'Aba de Unidades e Estabelecimentos',
          breadcrumbs: ['Clientes', 'Metalúrgica Valença', 'Unidades'],
          mainActionLabel: '+ Adicionar Unidade',
          fieldsOrItems: [
            { label: 'Unidade Matriz - Parque Fabril', value: '120 Colaboradores • Grau 3', badge: 'Ativa' },
            { label: 'Filial Administrativa Centro', value: '25 Colaboradores • Grau 1', badge: 'Ativa' }
          ],
          highlightBox: {
            title: 'Multiestabelecimentos eSocial',
            desc: 'Essencial para envio correto do S-2240 por estabelecimento (CNPJ/CNO).',
            color: 'purple'
          }
        }
      }
    ],
    infographic: {
      objective: 'Estabelecer a base mestra cadastral e enquadramento regulamentar da empresa tomadora de SST.',
      regulatoryCompliance: 'NR-04 (Dimensionamento SESMT), NR-05 (CIPA) e Tabela 24 do eSocial (Ambientes de Trabalho).',
      criticalSuccessFactor: 'Validação prévia do CNAE oficial na Receita Federal para evitar inconsistências nos laudos técnicos.',
      flowNodes: [
        {
          id: 'n1',
          phase: 'Entrada de Dados',
          actor: 'Comercial / Atendimento',
          actorColor: 'emerald',
          title: '1. Inserção do CNPJ',
          description: 'Operador informa o CNPJ de 14 dígitos no formulário de cliente.',
          output: 'CNPJ formatado e validado'
        },
        {
          id: 'n2',
          phase: 'Integração RFB',
          actor: 'API BrasilAPI / Receita',
          actorColor: 'blue',
          title: '2. Consulta Governamental',
          description: 'PrevSafe faz requisição HTTP segura buscando dados oficiais públicos.',
          output: 'JSON cadastral com CNAE e endereço completo',
          slaTime: '1 segundo'
        },
        {
          id: 'n3',
          phase: 'Enquadramento SST',
          actor: 'Motor Regulamentar PrevSafe',
          actorColor: 'purple',
          title: '3. Cálculo de Grau de Risco',
          description: 'O sistema cruza o CNAE com o Quadro I da NR-04 e define Grau 1 a 4.',
          output: 'Grau de Risco e exigências normativas mapeadas'
        },
        {
          id: 'n4',
          phase: 'Cadastro de Unidades',
          actor: 'Operador SST',
          actorColor: 'amber',
          title: '4. Estruturação de Estabelecimentos',
          description: 'Criação da Matriz e Filiais com quantidade de trabalhadores por setor.',
          output: 'Cliente pronto para Propostas e Ordens de Serviço'
        }
      ]
    },
    videoSimulator: {
      totalDurationSeconds: 24,
      videoTitle: 'Como Cadastrar um Cliente com Busca por CNPJ',
      videoDescription: 'Veja em menos de 30 segundos como consultar e preencher os dados de uma empresa na base da Receita Federal.',
      keyframes: [
        {
          timestamp: 0,
          duration: 6,
          actionTitle: '1. Abrindo a tela de clientes',
          narratorText: 'No menu CRM & Comercial, selecione a opção Clientes & Unidades.',
          cursorTarget: { x: 82, y: 18, label: 'Clicar em "+ Novo Cliente"' },
          screenState: { activeTab: 'list', bannerText: 'Tela de Clientes Ativa' }
        },
        {
          timestamp: 6,
          duration: 6,
          actionTitle: '2. Digitando o CNPJ e buscando',
          narratorText: 'Insira o CNPJ da empresa e clique no botão azul "Buscar na RFB".',
          cursorTarget: { x: 65, y: 42, label: 'Buscar Dados na Receita Federal' },
          screenState: { modalOpen: true, bannerText: 'Consultando BrasilAPI...' }
        },
        {
          timestamp: 12,
          duration: 6,
          actionTitle: '3. Conferência do CNAE e Grau de Risco',
          narratorText: 'Os campos de Razão Social, CNAE e Grau de Risco foram preenchidos automaticamente!',
          cursorTarget: { x: 50, y: 55, label: 'Conferir CNAE 25.11-0-00 (Grau 3)' },
          screenState: { modalOpen: true, badgeStatus: 'Preenchido com Sucesso!' }
        },
        {
          timestamp: 18,
          duration: 6,
          actionTitle: '4. Salvando o cadastro',
          narratorText: 'Clique em "Salvar Cliente" para disponibilizá-lo para propostas e ordens de serviço.',
          cursorTarget: { x: 75, y: 88, label: 'Confirmar e Salvar' },
          screenState: { modalOpen: false, successMessage: 'Cliente cadastrado com sucesso!' }
        }
      ]
    },
    faq: [
      {
        question: 'O que fazer se a empresa for imune de CNPJ (produtor rural ou pessoa física)?',
        answer: 'Você pode selecionar o tipo CAEPF ou CPF na opção de documento e preencher os dados manualmente.'
      },
      {
        question: 'O Grau de Risco é obrigatório para emitir o PGR?',
        answer: 'Sim, o Grau de Risco (NR-04) define prazos de renovação de exames no PCMSO e obrigações do SESMT e CIPA.'
      }
    ],
    commonMistakes: [
      {
        mistake: 'Cadastrar CNPJ de filial como cliente separado sem vincular à matriz.',
        prevention: 'Cadastre a Matriz como Cliente Principal e utilize a aba "Unidades" para adicionar filiais e canteiros de obras.'
      }
    ]
  },

  {
    id: 'tut-commercial-proposals',
    title: 'Elaboração de Propostas Comerciais, Contratos e Assinatura Eletrônica',
    subtitle: 'Monte orçamentos técnicos de SST com cálculo de margem, gere contratos jurídicos automáticos e colete assinaturas com link rastreável.',
    category: 'COMMERCIAL',
    categoryLabel: 'Comercial & CRM',
    targetRoles: ['ADMIN', 'COMERCIAL', 'FINANCEIRO'],
    difficulty: 'INTERMEDIÁRIO',
    estimatedMinutes: 5,
    regulatoryRef: 'Código Civil (Lei 10.406) & MP 2.200-2 (Validade Jurídica)',
    targetViewId: 'proposals',
    tags: ['Propostas', 'Orçamentos', 'Contratos SST', 'Assinatura Digital', 'Aceite Eletrônico', 'Faturamento'],
    summary: 'Crie propostas de prestação de serviços de SST (PGR, PCMSO, LTCAT, Exames e Gestão eSocial) com precificação por funcionário ou tabela fixa, gerando automaticamente a minuta contratual e disparando link de assinatura com validade jurídica.',
    whyItMatters: 'Acelera o ciclo de vendas da consultoria de SST e garante segurança jurídica antes do início da prestação dos serviços técnicos.',
    processUtility: 'Converte Leads em Contratos Ativos, que automaticamente habilitam a abertura de Ordens de Serviço e geram as faturas no módulo Financeiro.',
    prerequisites: ['Cliente cadastrado', 'Serviços selecionados do catálogo'],
    steps: [
      {
        stepNumber: 1,
        title: 'Criar Nova Proposta Comercial',
        description: 'Selecione o cliente, a validade da proposta (padrão 15 dias) e o modelo de contratação (Pacote Pontual ou Mensalidade Recorrente).',
        highlightAction: 'Clique em "+ Nova Proposta"',
        screenType: 'FORM',
        mockupDetails: {
          screenTitle: 'Elaborador de Propostas SST',
          breadcrumbs: ['Comercial', 'Propostas', 'Nova Proposta'],
          mainActionLabel: 'Salvar e Gerar PDF',
          fieldsOrItems: [
            { label: 'Cliente', value: 'Metalúrgica Valença S.A.', badge: 'Grau 3' },
            { label: 'Itens Inclusos', value: 'PGR + PCMSO + LTCAT + 45 ASOs Anuais + Envio eSocial', status: 'Pacote Anual' },
            { label: 'Valor Total', value: 'R$ 14.850,00 (12x R$ 1.237,50)', badge: 'Margem 42%' }
          ],
          highlightBox: {
            title: 'Composição de Preços',
            desc: 'O valor calcula automaticamente o custo por vida/colaborador.',
            color: 'emerald'
          }
        }
      },
      {
        stepNumber: 2,
        title: 'Aprovar Proposta e Gerar Contrato Jurídico Automático',
        description: 'Ao mudar o status para "Aprovada", o PrevSafe gera instantaneamente o Contrato de Prestação de Serviços SST com cláusulas de LGPD e responsabilidade técnica.',
        highlightAction: 'Aprovar e Converter em Contrato',
        screenType: 'MODAL',
        mockupDetails: {
          screenTitle: 'Contrato Gerado com Sucesso',
          breadcrumbs: ['Comercial', 'Contratos', 'CTR-2026-0042'],
          mainActionLabel: '✍️ Solicitar Assinatura Eletrônica',
          fieldsOrItems: [
            { label: 'Contrato Nº', value: 'CTR-2026-0042', badge: 'Minuta Gerada' },
            { label: 'Signatários', value: 'Diretor Geral (Cliente) e Responsável Técnico (PrevSafe)' },
            { label: 'Cláusula de SLA', value: 'Emissão de Laudos em até 15 dias úteis' }
          ],
          highlightBox: {
            title: 'Assinatura Eletrônica ICP/Gov.br',
            desc: 'Dispara e-mail e WhatsApp com token criptográfico de aceite.',
            color: 'blue'
          }
        }
      }
    ],
    infographic: {
      objective: 'Formalizar comercialmente a prestação de serviços de SST com garantia contratual e financeira.',
      regulatoryCompliance: 'MP 2.200-2/2001 (Assinatura Eletrônica) e Marco Legal da LGPD.',
      criticalSuccessFactor: 'Definição clara do escopo (exames inclusos x adicionais) para evitar custos operacionais imprevistos.',
      flowNodes: [
        {
          id: 'p1',
          phase: 'Orçamento',
          actor: 'Consultor Comercial',
          actorColor: 'emerald',
          title: '1. Composição de Itens',
          description: 'Seleção dos laudos e estimativa de vidas/exames.',
          output: 'Proposta Comercial em PDF'
        },
        {
          id: 'p2',
          phase: 'Negociação',
          actor: 'Cliente (Tomador)',
          actorColor: 'blue',
          title: '2. Envio e Aceite',
          description: 'Cliente recebe link rastreável com alerta de visualização.',
          output: 'Aceite registrado com IP e data/hora'
        },
        {
          id: 'p3',
          phase: 'Formalização',
          actor: 'Módulo de Contratos',
          actorColor: 'purple',
          title: '3. Geração do Contrato',
          description: 'Preenchimento automático das cláusulas jurídicas e anexos técnicos.',
          output: 'Contrato Digital Assinado'
        },
        {
          id: 'p4',
          phase: 'Desdobramento',
          actor: 'Sistema PrevSafe',
          actorColor: 'amber',
          title: '4. Gatilhos Operacionais',
          description: 'Criação automática das OSs de implantação e títulos a receber no Financeiro.',
          output: 'OS Gerada + Faturas Agendadas'
        }
      ]
    },
    videoSimulator: {
      totalDurationSeconds: 20,
      videoTitle: 'Criando Proposta e Enviando Contrato para Assinatura',
      videoDescription: 'Aprenda a montar orçamentos, aprovar e disparar contratos eletrônicos em segundos.',
      keyframes: [
        {
          timestamp: 0,
          duration: 5,
          actionTitle: '1. Criando a Proposta Comercial',
          narratorText: 'Abra a aba Propostas Comerciais e selecione o cliente e os laudos necessários.',
          cursorTarget: { x: 75, y: 22, label: 'Nova Proposta' },
          screenState: { activeTab: 'proposals', bannerText: 'Formulário de Proposta' }
        },
        {
          timestamp: 5,
          duration: 5,
          actionTitle: '2. Adicionando os Laudos e Vidas',
          narratorText: 'Defina o PGR, PCMSO, LTCAT e a quantidade de trabalhadores para cálculo automático.',
          cursorTarget: { x: 45, y: 50, label: 'Adicionar PGR + PCMSO' },
          screenState: { modalOpen: true, badgeStatus: 'Total R$ 14.850,00' }
        },
        {
          timestamp: 10,
          duration: 5,
          actionTitle: '3. Aprovando a Proposta',
          narratorText: 'Com a aprovação do cliente, clique em Gerar Contrato.',
          cursorTarget: { x: 80, y: 75, label: 'Gerar Contrato Automático' },
          screenState: { modalOpen: false, bannerText: 'Contrato CTR-2026 Criado' }
        },
        {
          timestamp: 15,
          duration: 5,
          actionTitle: '4. Disparando Link de Assinatura',
          narratorText: 'O link com validação por WhatsApp e E-mail é enviado instantaneamente.',
          cursorTarget: { x: 60, y: 65, label: 'Enviar Link de Assinatura' },
          screenState: { successMessage: 'Link enviado com validade jurídica!' }
        }
      ]
    },
    faq: [
      {
        question: 'Como funciona a assinatura eletrônica no PrevSafe?',
        answer: 'É uma assinatura eletrônica simples (Lei 14.063/2020, art. 4º, I). O sistema registra o IP, o navegador, a data e a hora em UTC e um código SHA-256 do conteúdo assinado, que pode ser conferido na página pública /validar para provar que o documento não foi alterado depois de assinado. Não há certificado ICP-Brasil nem carimbo do tempo de terceiro.'
      }
    ],
    commonMistakes: [
      {
        mistake: 'Iniciar as visitas técnicas antes do contrato estar assinado.',
        prevention: 'Mantenha a regra de liberação ativa: a OS de execução só é liberada para a equipe de campo após a assinatura do contrato.'
      }
    ]
  },

  {
    id: 'tut-service-orders-sla',
    title: 'Gestão de Ordens de Serviço (OS), Fases Técnicas e SLA com Pausa Regulamentar',
    subtitle: 'Domine a esteira operacional de SST: agendamento, vistorias de campo, elaboração médica/engenharia, controle de SLA e pausas por pendência do cliente (RN004).',
    category: 'SERVICE_ORDERS',
    categoryLabel: 'Operações & Ordens de Serviço',
    targetRoles: ['ADMIN', 'GESTOR', 'TÉCNICO'],
    difficulty: 'AVANÇADO',
    estimatedMinutes: 6,
    regulatoryRef: 'Regra de Negócio RN004 & Normas Regulamentadoras',
    targetViewId: 'service-orders',
    tags: ['Ordem de Serviço', 'OS', 'SLA', 'Pausa Regulamentar', 'RN004', 'Kanban', 'Visita Técnica'],
    summary: 'Acompanhe todo o ciclo de vida dos serviços contratados em um Kanban visual com 6 fases: Aberta, Agendada, Vistoria Realizada, Em Elaboração, Em Validação e Concluída. Ative a Pausa Regulamentar do SLA quando o cliente demorar para enviar documentos obrigatórios.',
    whyItMatters: 'Protege a consultoria de multas contratuais por atraso quando o cliente é o responsável por não fornecer dados da CIPA, exames ou layout da fábrica.',
    processUtility: 'Garante o cumprimento dos prazos pactuados e orquestra a transição de tarefas entre técnicos de campo, engenheiros de segurança e médicos do trabalho.',
    prerequisites: ['Contrato ativo', 'Técnico responsável atribuído'],
    steps: [
      {
        stepNumber: 1,
        title: 'Visualizar as OSs no Quadro Kanban e Filtrar por Criticidade',
        description: 'Acesse "Ordens de Serviço". O painel destaca OSs dentro do prazo em verde, em atenção em amarelo e com risco de atraso em vermelho.',
        highlightAction: 'Visualizar Kanban de OSs',
        screenType: 'KANBAN',
        mockupDetails: {
          screenTitle: 'Quadro Kanban de Ordens de Serviço',
          breadcrumbs: ['Operações SST', 'Ordens de Serviço'],
          fieldsOrItems: [
            { label: 'OS-2026-001 • PGR Matriz', value: 'Metalúrgica Valença • Eng. Roberto', badge: 'SLA: 4 dias restantes', status: 'Em Elaboração' },
            { label: 'OS-2026-002 • PCMSO Filial', value: 'Construtora Horizonte • Dra. Camila', badge: 'SLA Pausado (RN004)', status: 'Aguardando Cliente' },
            { label: 'OS-2026-003 • LTCAT Galpão', value: 'Logística TransBrasil • Téc. Marcos', badge: 'Visita Agendada p/ Amanhã', status: 'Agendada' }
          ],
          highlightBox: {
            title: 'Indicadores de SLA em Tempo Real',
            desc: 'Barras de progresso mostram os dias úteis decorridos e restantes.',
            color: 'blue'
          }
        }
      },
      {
        stepNumber: 2,
        title: 'Aplicar a Pausa Regulamentar de SLA (Regra RN004)',
        description: 'Se o cliente não enviou a lista de funcionários ou a planta da fábrica, abra os detalhes da OS e clique em "Pausar SLA por Pendência". O relógio congela até a resposta.',
        highlightAction: 'Clicar em "Pausar SLA por Pendência"',
        tip: 'O sistema dispara um e-mail e WhatsApp automático ao cliente cobrando a pendência com link direto.',
        screenType: 'MODAL',
        mockupDetails: {
          screenTitle: 'Modal: Acionamento de Pausa Regulamentar de SLA',
          breadcrumbs: ['OS-2026-002', 'Controle de SLA'],
          mainActionLabel: '⏸️ Confirmar Pausa Regulamentar',
          fieldsOrItems: [
            { label: 'Motivo da Pausa', value: 'Aguardando envio do Mapa de Risco e Lista de Colaboradores Atualizada' },
            { label: 'Data de Congelamento', value: 'Hoje às 08:30 (SLA congelado com 6 dias restantes)' },
            { label: 'Notificação ao Cliente', value: 'WhatsApp + E-mail automático habilitados' }
          ],
          highlightBox: {
            title: 'Regra de Negócio RN004',
            desc: 'O tempo em pausa não é contabilizado no SLA contratual da consultoria.',
            color: 'amber'
          }
        }
      },
      {
        stepNumber: 3,
        title: 'Concluir Etapas Técnicas e Liberar para Validação',
        description: 'Após a elaboração do laudo pelo engenheiro ou médico, anexe o rascunho e mova para "Em Validação" para revisão do responsável técnico.',
        highlightAction: 'Mover para "Em Validação"',
        screenType: 'FORM',
        mockupDetails: {
          screenTitle: 'Checklist de Entrega Técnica',
          breadcrumbs: ['OS-2026-001', 'Etapas'],
          mainActionLabel: '✅ Enviar para Validação Final',
          fieldsOrItems: [
            { label: 'Vistoria de Campo', value: 'Concluída com 18 Fotos e 4 Dosimetrias de Ruído', status: 'OK' },
            { label: 'Inventário de Riscos GRO', value: 'Matriz de Risco 5x5 Preenchida', status: 'OK' },
            { label: 'Plano de Ação 5W2H', value: '12 Medidas de Controle Cadastradas', status: 'OK' }
          ]
        }
      }
    ],
    infographic: {
      objective: 'Orquestrar a execução de serviços técnicos com controle rigoroso de prazos e blindagem contra atrasos de clientes.',
      regulatoryCompliance: 'Portaria MTP 671/2021 e SLAs de contratos corporativos.',
      criticalSuccessFactor: 'Registro formal e auditável de todas as pausas com notificação direta ao tomador.',
      flowNodes: [
        {
          id: 'os1',
          phase: 'Abertura',
          actor: 'Gestor de Operações',
          actorColor: 'emerald',
          title: '1. Criação da OS',
          description: 'Definição do escopo, prazo final e técnico responsável.',
          output: 'OS Aberta com SLA ativo (Ex: 15 dias)'
        },
        {
          id: 'os2',
          phase: 'Campo',
          actor: 'Técnico de Campo',
          actorColor: 'blue',
          title: '2. Visita Técnica & Medições',
          description: 'Inspeção in loco, fotos geolocalizadas e dosimetrias.',
          output: 'Relatório de Campo no PWA'
        },
        {
          id: 'os3',
          phase: 'Pausa (Opcional)',
          actor: 'Regra RN004',
          actorColor: 'amber',
          title: '3. Pausa por Pendência',
          description: 'Congelamento automático do SLA enquanto cliente responde chamados.',
          output: 'SLA Congelado + Notificação WhatsApp',
          isDecision: true,
          decisionChoices: { yes: 'Cliente respondeu -> Retoma SLA', no: 'Permanece congelado' }
        },
        {
          id: 'os4',
          phase: 'Elaboração & RT',
          actor: 'Engenheiro / Médico',
          actorColor: 'purple',
          title: '4. Parecer e Emissão',
          description: 'Elaboração do laudo e assinatura técnica com ART/RQE.',
          output: 'Laudo Final Pronto para Liberação'
        }
      ]
    },
    videoSimulator: {
      totalDurationSeconds: 22,
      videoTitle: 'Operando o Kanban de OS e Acionando Pausa de SLA',
      videoDescription: 'Veja como gerenciar ordens de serviço e pausar o prazo quando o cliente não responde.',
      keyframes: [
        {
          timestamp: 0,
          duration: 5,
          actionTitle: '1. Acessando o Kanban de OS',
          narratorText: 'No menu Operações SST, abra as Ordens de Serviço.',
          cursorTarget: { x: 30, y: 30, label: 'Visualizar OS-2026-001' },
          screenState: { activeTab: 'kanban', bannerText: 'Kanban Operacional' }
        },
        {
          timestamp: 5,
          duration: 6,
          actionTitle: '2. Identificando Pendência do Cliente',
          narratorText: 'Abra a OS para verificar que a lista de trabalhadores não foi enviada.',
          cursorTarget: { x: 70, y: 45, label: 'Abrir Detalhes da OS' },
          screenState: { modalOpen: true, bannerText: 'OS em Andamento' }
        },
        {
          timestamp: 11,
          duration: 6,
          actionTitle: '3. Acionando a Pausa Regulamentar RN004',
          narratorText: 'Clique em "Pausar SLA por Pendência" para congelar o prazo com segurança jurídica.',
          cursorTarget: { x: 65, y: 78, label: 'Confirmar Pausa de SLA' },
          screenState: { modalOpen: true, badgeStatus: 'SLA Pausado em D-6' }
        },
        {
          timestamp: 17,
          duration: 5,
          actionTitle: '4. Notificação Disparada ao Tomador',
          narratorText: 'O cliente recebe na hora uma cobrança amigável por WhatsApp com link direto.',
          cursorTarget: { x: 50, y: 60, label: 'WhatsApp Enviado' },
          screenState: { successMessage: 'SLA congelado e cliente notificado!' }
        }
      ]
    },
    faq: [
      {
        question: 'Quem pode acionar ou retirar a pausa de SLA?',
        answer: 'Gestores de Operações e Administradores com registro na trilha de auditoria.'
      }
    ],
    commonMistakes: [
      {
        mistake: 'Deixar o SLA estourar sem registrar a pendência do cliente no sistema.',
        prevention: 'Sempre que depender de documentos do cliente, abra a pendência e acione a pausa no mesmo dia.'
      }
    ]
  },

  {
    id: 'tut-field-pwa-offline',
    title: 'PWA de Campo: Coleta Offline de Evidências, Fotos e Medições',
    subtitle: 'Guia completo para o técnico em vistoria: funcionamento sem internet, fotos com geolocalização, gravação de áudio e sincronização automática.',
    category: 'FIELD_PWA',
    categoryLabel: 'PWA de Campo & Coleta Offline',
    targetRoles: ['ADMIN', 'GESTOR', 'TÉCNICO'],
    difficulty: 'INICIANTE',
    estimatedMinutes: 4,
    regulatoryRef: 'NR-01 (GRO) & NHOs Fundacentro (01, 06 e 11)',
    targetViewId: 'technician-field',
    tags: ['PWA', 'Campo', 'Offline', 'Vistoria', 'Fotos', 'Dosimetria', 'Geolocalização', 'Mobile'],
    summary: 'Aplicativo progressivo (PWA) instalável no celular do técnico de segurança. Permite preencher checklists, tirar fotos com carimbo de GPS e data/hora, gravar relatos de áudio e anotar dosimetrias de ruído mesmo no subsolo ou em áreas rurais sem sinal de celular.',
    whyItMatters: 'Elimina o retrabalho de pranchetas de papel e digitação posterior, acelerando a confecção do PGR em mais de 70%.',
    processUtility: 'Alimenta o Repositório de Documentos e a OS diretamente com dados brutos de campo certificados.',
    prerequisites: ['Dispositivo móvel com GPS', 'Login de Técnico de Campo'],
    steps: [
      {
        stepNumber: 1,
        title: 'Abrir o Modo Técnico de Campo (PWA) no Celular',
        description: 'Clique no botão "Campo PWA" na barra superior ou instale o aplicativo na tela inicial do smartphone.',
        highlightAction: 'Acessar PWA de Campo',
        screenType: 'PWA',
        mockupDetails: {
          screenTitle: 'PrevSafe Field PWA Mobile',
          breadcrumbs: ['PWA', 'Minhas Visitas de Hoje'],
          mainActionLabel: '📶 Modo Offline Habilitado (IndexedDB)',
          fieldsOrItems: [
            { label: 'Visita 1: Metalúrgica Valença', value: '14:00 • Galpão Industrial • Ruído e Solda', badge: 'Pendente' },
            { label: 'Visita 2: Construtora Horizonte', value: '16:30 • Obra Residencial • NR-18 / NR-35', badge: 'Agendada' }
          ],
          highlightBox: {
            title: 'Sincronização Bidirecional',
            desc: 'Os dados ficam salvos localmente e sobem automaticamente ao restabelecer a conexão.',
            color: 'blue'
          }
        }
      },
      {
        stepNumber: 2,
        title: 'Tirar Fotos e Anotar Medições Quantitativas',
        description: 'Fotografe os postos de trabalho, máquinas sem proteção (NR-12) e painéis elétricos. Insira os níveis de ruído em dB(A) medidos no dosímetro.',
        highlightAction: 'Capturar Foto com GPS',
        screenType: 'PWA',
        mockupDetails: {
          screenTitle: 'Coleta de Riscos: Setor de Estamparia',
          breadcrumbs: ['Metalúrgica Valença', 'Prensas Mecânicas'],
          fieldsOrItems: [
            { label: 'Foto da Prensa #04', value: 'Geotag: -23.5505, -46.6333 • 14:22:10', badge: 'Anexada' },
            { label: 'Nível de Ruído Medido', value: '88.4 dB(A) • NHO-01 Fundacentro', badge: 'Acima do Nível de Ação' },
            { label: 'Relato de Áudio', value: 'Gravação de 42s descrevendo vibração', badge: 'Salvo' }
          ]
        }
      },
      {
        stepNumber: 3,
        title: 'Concluir Vistoria e Sincronizar com a Nuvem',
        description: 'Ao terminar a inspeção, clique em "Concluir Coleta". Assim que o aparelho conectar ao Wi-Fi ou 4G, todas as evidências sobem para a OS.',
        highlightAction: 'Clicar em "Sincronizar Dados"',
        screenType: 'PWA',
        mockupDetails: {
          screenTitle: 'Vistoria Concluída com Sucesso',
          breadcrumbs: ['PWA', 'Sincronização'],
          mainActionLabel: '☁️ Sincronizado com Sucesso (18 Fotos / 4 Medições)',
          highlightBox: {
            title: 'Pronto para Elaboração',
            desc: 'O engenheiro na sede já pode visualizar o inventário de riscos em tempo real.',
            color: 'emerald'
          }
        }
      }
    ],
    infographic: {
      objective: 'Coletar evidências fidedignas no ambiente de trabalho sem depender de sinal de internet.',
      regulatoryCompliance: 'NR-01 (Identificação de Perigos) e NHO-01 (Avaliação de Ruído Ocupacional).',
      criticalSuccessFactor: 'Registro das fotos com data e hora da vistoria para auditorias do Ministério do Trabalho.',
      flowNodes: [
        {
          id: 'f1',
          phase: 'Preparação',
          actor: 'Técnico de Campo',
          actorColor: 'emerald',
          title: '1. Carga de Dados no Celular',
          description: 'App carrega a lista de visitas e checklists antes de sair da base.',
          output: 'Dados em Cache Local (IndexedDB)'
        },
        {
          id: 'f2',
          phase: 'Execução Offline',
          actor: 'Técnico in loco',
          actorColor: 'blue',
          title: '2. Vistoria sem Conexão',
          description: 'Registro de fotos, dosimetrias de ruído, calor (IBUTG) e relatos em áudio.',
          output: 'Evidências com Geotag'
        },
        {
          id: 'f3',
          phase: 'Reconexão',
          actor: 'Service Worker PWA',
          actorColor: 'purple',
          title: '3. Detecção de Rede',
          description: 'O aplicativo identifica conexão com internet e inicia o upload em segundo plano.',
          output: 'Sincronização Automática',
          slaTime: 'Automático'
        },
        {
          id: 'f4',
          phase: 'Disponibilização',
          actor: 'Servidor PrevSafe',
          actorColor: 'amber',
          title: '4. Integração com a OS',
          description: 'As fotos e medições alimentam automaticamente o PGR e o evento S-2240.',
          output: 'Inventário Populado'
        }
      ]
    },
    videoSimulator: {
      totalDurationSeconds: 18,
      videoTitle: 'Usando o PWA de Campo em Modo Offline',
      videoDescription: 'Veja como tirar fotos com coordenadas e salvar dosimetrias de ruído sem internet.',
      keyframes: [
        {
          timestamp: 0,
          duration: 4,
          actionTitle: '1. Abrindo o PWA no celular',
          narratorText: 'Abra o PWA de Campo no smartphone mesmo no modo avião.',
          cursorTarget: { x: 50, y: 35, label: 'Abrir Visita da Metalúrgica' },
          screenState: { activeTab: 'pwa', bannerText: 'Modo Offline Ativo' }
        },
        {
          timestamp: 4,
          duration: 5,
          actionTitle: '2. Registrando a Medição de Ruído',
          narratorText: 'Digite o valor medido no dosímetro (88.4 dB(A)) e selecione a NHO-01.',
          cursorTarget: { x: 60, y: 55, label: 'Inserir 88.4 dB(A)' },
          screenState: { badgeStatus: 'Ruído Registrado' }
        },
        {
          timestamp: 9,
          duration: 5,
          actionTitle: '3. Capturando Foto com Geotag',
          narratorText: 'Tire a foto da máquina: o horário e a referência de local da vistoria são gravados.',
          cursorTarget: { x: 50, y: 70, label: 'Tirar Foto com GPS' },
          screenState: { bannerText: 'Foto Anexada (-23.5505, -46.6333)' }
        },
        {
          timestamp: 14,
          duration: 4,
          actionTitle: '4. Sincronização Automática',
          narratorText: 'Ao conectar ao Wi-Fi, o app sincroniza tudo com a nuvem sem perda de dados.',
          cursorTarget: { x: 50, y: 90, label: 'Concluir Vistoria' },
          screenState: { successMessage: 'Dados sincronizados com o PGR!' }
        }
      ]
    },
    faq: [
      {
        question: 'O PWA funciona em iOS (iPhone) e Android?',
        answer: 'Sim, funciona em qualquer navegador moderno (Chrome, Safari, Edge) e pode ser instalado na tela inicial.'
      }
    ],
    commonMistakes: [
      {
        mistake: 'Esquecer de conceder permissão de localização no navegador do celular.',
        prevention: 'Autorize o acesso ao GPS na primeira abertura do PWA para carimbar as fotos com coordenadas auditáveis.'
      }
    ]
  },

  {
    id: 'tut-documents-rn009',
    title: 'Central de Laudos Digitais e Liberação Formal ao Cliente (Regra RN009)',
    subtitle: 'Controle de versionamento de PGR, PCMSO e LTCAT, assinatura digital com certificado e fluxo de liberação formal (RN009) para a Área do Cliente.',
    category: 'DOCUMENTS',
    categoryLabel: 'Documentos & Laudos Digitais',
    targetRoles: ['ADMIN', 'GESTOR', 'TÉCNICO'],
    difficulty: 'INTERMEDIÁRIO',
    estimatedMinutes: 5,
    regulatoryRef: 'Regra RN009 & Portaria MTP 672',
    targetViewId: 'documents',
    tags: ['Laudos', 'PGR', 'PCMSO', 'LTCAT', 'RN009', 'Versionamento', 'Assinatura Digital', 'Liberação Formal'],
    summary: 'Gerencie todo o acervo de documentos técnicos de SST da consultoria. A Regra de Negócio RN009 impede que documentos em rascunho ou sem validação do Responsável Técnico sejam visualizados pelo cliente final, evitando vazamentos e inconformidades.',
    whyItMatters: 'Garante que somente laudos devidamente assinados por engenheiros e médicos habilitados cheguem ao cliente e à fiscalização.',
    processUtility: 'Centraliza o download seguro, verificação de hash SHA-256 e disponibilização imediata no Portal do Cliente.',
    prerequisites: ['Laudo elaborado', 'Responsável técnico com CREA/CRM válido'],
    steps: [
      {
        stepNumber: 1,
        title: 'Localizar o Documento na Central de Documentos',
        description: 'Filtre por cliente, tipo de laudo (PGR, PCMSO, LTCAT, Laudo de Insalubridade) ou status de liberação.',
        highlightAction: 'Filtrar Laudos em Elaboração',
        screenType: 'TABLE',
        mockupDetails: {
          screenTitle: 'Repositório Central de Documentos SST',
          breadcrumbs: ['Operações SST', 'Documentos'],
          fieldsOrItems: [
            { label: 'PGR 2026 - Metalúrgica Valença', value: 'Versão 1.0 • 68 páginas', badge: 'Rascunho Interno (RN009)', status: 'Restrito' },
            { label: 'PCMSO 2026 - Metalúrgica Valença', value: 'Versão 1.0 • 34 páginas', badge: 'Validado Médico', status: 'Aprovado' },
            { label: 'LTCAT 2026 - Construtora Horizonte', value: 'Versão 2.1 • 45 páginas', badge: 'Liberado ao Cliente', status: 'Público' }
          ]
        }
      },
      {
        stepNumber: 2,
        title: 'Executar a Liberação Formal (Regra RN009)',
        description: 'Clique em "Liberar para o Cliente". O sistema valida se o documento possui assinatura técnica, registra a data, a hora e o autor da liberação e notifica a diretoria do cliente por e-mail.',
        highlightAction: 'Clicar em "Liberar ao Cliente (RN009)"',
        screenType: 'MODAL',
        mockupDetails: {
          screenTitle: 'Validação e Liberação Formal RN009',
          breadcrumbs: ['Documentos', 'PGR-2026', 'Liberação'],
          mainActionLabel: '🚀 Confirmar Liberação ao Cliente',
          fieldsOrItems: [
            { label: 'Engenheiro Responsável', value: 'Eng. Roberto Santos (CREA-SP 5069228)', badge: 'ART Vinculada' },
            { label: 'Hash Criptográfico', value: 'SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
            { label: 'Disponibilidade', value: 'Imediata no Portal do Cliente com notificação por e-mail' }
          ],
          highlightBox: {
            title: 'Regra de Negócio RN009',
            desc: 'Status alterado de RASCUNHO para LIBERADO. Cliente agora pode visualizar e baixar.',
            color: 'emerald'
          }
        }
      }
    ],
    infographic: {
      objective: 'Garantir que nenhum documento chegue ao cliente sem a devida validação e assinatura do Responsável Técnico.',
      regulatoryCompliance: 'Portarias MTP 671/672, Resoluções CFM/CREA e Regra RN009.',
      criticalSuccessFactor: 'Controle rigoroso de versões (v1.0, v1.1) para evitar que o cliente use laudos desatualizados.',
      flowNodes: [
        {
          id: 'd1',
          phase: 'Elaboração',
          actor: 'Técnico / Engenheiro',
          actorColor: 'emerald',
          title: '1. Redação do Laudo',
          description: 'Inserção de inventários, medições e cronograma de ações.',
          output: 'Laudo Status: RASCUNHO (Invisível ao Cliente)'
        },
        {
          id: 'd2',
          phase: 'Revisão Técnica',
          actor: 'Médico / Engenheiro Chefe',
          actorColor: 'blue',
          title: '2. Verificação de Conformidade',
          description: 'Conferência de limites de tolerância (NR-15) e exames médicos (NR-07).',
          output: 'Aprovação Técnica Registrada'
        },
        {
          id: 'd3',
          phase: 'Liberação RN009',
          actor: 'Gestor SST',
          actorColor: 'purple',
          title: '3. Execução da Regra RN009',
          description: 'Assinatura digital e publicação formal do documento no portal.',
          output: 'Status: LIBERADO + Hash SHA-256'
        },
        {
          id: 'd4',
          phase: 'Entrega',
          actor: 'Portal do Cliente',
          actorColor: 'amber',
          title: '4. Download e Notificação',
          description: 'Diretor e RH do cliente recebem e-mail com link seguro para download.',
          output: 'Acesso Auditado em Tempo Real'
        }
      ]
    },
    videoSimulator: {
      totalDurationSeconds: 19,
      videoTitle: 'Como Liberar Laudos para o Cliente com a Regra RN009',
      videoDescription: 'Aprenda a aplicar o controle de liberação formal e disponibilizar laudos assinados.',
      keyframes: [
        {
          timestamp: 0,
          duration: 5,
          actionTitle: '1. Localizando o PGR no Repositório',
          narratorText: 'Na Central de Documentos, localize o PGR 2026 com status Rascunho.',
          cursorTarget: { x: 75, y: 30, label: 'Visualizar Detalhes do Laudo' },
          screenState: { activeTab: 'docs', bannerText: 'Documento Bloqueado p/ Cliente' }
        },
        {
          timestamp: 5,
          duration: 5,
          actionTitle: '2. Verificando Assinatura do Engenheiro',
          narratorText: 'Confira se a ART do CREA está anexada e o parecer aprovado.',
          cursorTarget: { x: 50, y: 50, label: 'Conferir ART e Assinatura' },
          screenState: { modalOpen: true, badgeStatus: 'ART Válida' }
        },
        {
          timestamp: 10,
          duration: 5,
          actionTitle: '3. Clicando em Liberar ao Cliente',
          narratorText: 'Clique no botão verde "Liberar ao Cliente (RN009)".',
          cursorTarget: { x: 65, y: 75, label: 'Executar Liberação Formal' },
          screenState: { modalOpen: true, bannerText: 'Gerando Hash SHA-256...' }
        },
        {
          timestamp: 15,
          duration: 4,
          actionTitle: '4. Documento Disponível no Portal',
          narratorText: 'Pronto! O cliente já pode baixar o PDF oficial no portal.',
          cursorTarget: { x: 50, y: 60, label: 'Liberação Concluída' },
          screenState: { successMessage: 'Laudo liberado e notificação enviada!' }
        }
      ]
    },
    faq: [
      {
        question: 'O cliente pode ver laudos com status "Rascunho"?',
        answer: 'Não. A regra RN009 bloqueia completamente o acesso do cliente a qualquer laudo não liberado formalmente.'
      }
    ],
    commonMistakes: [
      {
        mistake: 'Subir uma revisão corretiva sem incrementar a versão do documento.',
        prevention: 'Sempre crie uma nova versão (ex: v1.1) ao alterar qualquer tabela ou dado no laudo.'
      }
    ]
  },

  {
    id: 'tut-esocial-batch-transmission',
    title: 'Transmissão em Lote de Eventos de SST ao eSocial (S-2210, S-2220 e S-2240)',
    subtitle: 'Geração de arquivos XML, validação prévia de esquemas XSD, envio em lote direto ao WebService do Governo e tratamento de recibos e erros.',
    category: 'ESOCIAL',
    categoryLabel: 'Eventos de SST no eSocial',
    targetRoles: ['ADMIN', 'GESTOR', 'TÉCNICO'],
    difficulty: 'AVANÇADO',
    estimatedMinutes: 6,
    regulatoryRef: 'Manual de Orientação do eSocial (MOS) & Portaria MTP 671',
    targetViewId: 'esocial',
    tags: ['eSocial', 'S-2210', 'S-2220', 'S-2240', 'S-3000', 'XML', 'Lotes', 'Transmissão', 'Recibos'],
    summary: 'Módulo completo de mensageria para o eSocial. Permite gerar, validar a sintaxe contra o XSD oficial do governo e transmitir em lote com certificado digital A1 os eventos S-2210 (CAT), S-2220 (ASO) e S-2240 (Condições Ambientais de Trabalho).',
    whyItMatters: 'O não envio ou envio em atraso gera multas automáticas pela Receita Federal e Ministério do Trabalho diretamente pelo cruzamento da folha.',
    processUtility: 'Gera os recibos governamentais oficiais que comprovam a regularidade previdenciária e trabalhista da empresa tomadora.',
    prerequisites: ['Certificado Digital A1 configurado', 'Dados cadastrais do trabalhador (CPF e Matrícula)'],
    steps: [
      {
        stepNumber: 1,
        title: 'Filtrar Eventos Pendentes de Envio',
        description: 'Acesse "Gestão de Eventos eSocial". A aba "Eventos Pendentes" agrupa todos os ASOs e laudos prontos que ainda não foram transmitidos.',
        highlightAction: 'Visualizar Fila de Eventos',
        screenType: 'TABLE',
        mockupDetails: {
          screenTitle: 'Painel Geral de Mensageria eSocial SST',
          breadcrumbs: ['Operações SST', 'eSocial'],
          mainActionLabel: '🚀 Transmitir Lote Selecionado',
          fieldsOrItems: [
            { label: 'S-2240 • João da Silva (Matrícula 1042)', value: 'Agente: Ruído 88.4 dB(A) • EPI Eficaz', badge: 'Pendente Envio', status: 'Válido' },
            { label: 'S-2220 • Maria Fernandes (Matrícula 2011)', value: 'ASO Periódico Apto • Dr. Lucas (CRM 14233)', badge: 'Pendente Envio', status: 'Válido' },
            { label: 'S-2210 • Carlos Eduardo (Matrícula 3044)', value: 'CAT Típica • Fratura Membro Superior', badge: 'Urgente (S-2210)', status: 'Válido' }
          ]
        }
      },
      {
        stepNumber: 2,
        title: 'Validar a Estrutura XML contra os Esquemas XSD',
        description: 'O PrevSafe analisa se todos os campos obrigatórios (CNAE, CBO, CRM do médico, Código de Agente Nocivo Tabela 24) estão preenchidos antes de consumir o WebService.',
        highlightAction: 'Conferir Validação Prévia',
        screenType: 'XML_VIEWER',
        mockupDetails: {
          screenTitle: 'Validador Sintático XSD eSocial v.S-1.2',
          breadcrumbs: ['eSocial', 'Validação de Lote'],
          fieldsOrItems: [
            { label: 'Validação de Esquema XSD', value: '100% Conforme', badge: 'Sem Inconsistências' },
            { label: 'Certificado Digital A1', value: 'Consultoria PrevSafe (Válido até Dez/2026)', badge: 'Pronto' }
          ],
          highlightBox: {
            title: 'Zero Erros de Rejeição',
            desc: 'A validação prévia evita rejeições comuns como CBO inválido ou CPF divergente.',
            color: 'emerald'
          }
        }
      },
      {
        stepNumber: 3,
        title: 'Transmitir Lote e Armazenar Recibo Governamental',
        description: 'Clique em "Transmitir Lote". O sistema assina o XML digitalmente, envia ao ambiente da Receita Federal e grava o número de recibo oficial no histórico do trabalhador.',
        highlightAction: 'Transmitir e Obter Recibo',
        screenType: 'TABLE',
        mockupDetails: {
          screenTitle: 'Lote Transmitido com Sucesso',
          breadcrumbs: ['eSocial', 'Lotes Transmitidos', 'LOTE-2026-088'],
          mainActionLabel: '📄 Baixar Comprovante em PDF',
          fieldsOrItems: [
            { label: 'Status do Lote', value: 'Processado com Sucesso', badge: 'Código 201 (Sucesso)' },
            { label: 'Recibo S-2240', value: '1.2.202608.0000000000014294821', badge: 'Gravado na Base' },
            { label: 'Data e Hora do Envio', value: '26/08/2026 às 14:15:30 (Horário de Brasília)' }
          ]
        }
      }
    ],
    infographic: {
      objective: 'Garantir a transmissão tempestiva e sem erros dos eventos S-2210, S-2220 e S-2240 ao Governo Federal.',
      regulatoryCompliance: 'Portaria Conjunta SEPRT/RFB nº 71 e Tabela 24 do eSocial.',
      criticalSuccessFactor: 'Validação preventiva de CBO, CPF e Certificado A1 antes do envio do lote.',
      flowNodes: [
        {
          id: 'es1',
          phase: 'Origem dos Dados',
          actor: 'Laudos e ASOs',
          actorColor: 'emerald',
          title: '1. Extração Automática',
          description: 'O PrevSafe extrai os dados do PGR (S-2240), ASO (S-2220) ou CAT (S-2210).',
          output: 'Fila de Eventos Gerada'
        },
        {
          id: 'es2',
          phase: 'Validação',
          actor: 'Motor XSD PrevSafe',
          actorColor: 'blue',
          title: '2. Checagem Sintática',
          description: 'Validação contra o layout oficial S-1.2 do eSocial.',
          output: 'XML Validado e Assinado Digitalmente'
        },
        {
          id: 'es3',
          phase: 'Transmissão',
          actor: 'WebService eSocial (RFB)',
          actorColor: 'purple',
          title: '3. Envio do Lote SOAP',
          description: 'O eSocial exige disparo via HTTPS com Certificado Digital A1/ICP-Brasil. No PrevSafe esta etapa ainda é simulada.',
          output: 'Protocolo de Envio e Processamento',
          slaTime: '2 a 5 segundos'
        },
        {
          id: 'es4',
          phase: 'Confirmação',
          actor: 'Banco PrevSafe',
          actorColor: 'amber',
          title: '4. Gravação de Recibo',
          description: 'Armazenamento do número de recibo oficial e disponibilização no Portal do Cliente.',
          output: 'Evento Homologado no Governo'
        }
      ]
    },
    videoSimulator: {
      totalDurationSeconds: 22,
      videoTitle: 'Transmitindo Lotes de Eventos S-2240 e S-2220 ao eSocial',
      videoDescription: 'Assista como selecionar eventos pendentes, validar o XML e obter os recibos oficiais.',
      keyframes: [
        {
          timestamp: 0,
          duration: 5,
          actionTitle: '1. Acessando a Fila de Eventos',
          narratorText: 'No menu Operações SST, selecione Gestão de Eventos eSocial.',
          cursorTarget: { x: 35, y: 25, label: 'Abrir Eventos Pendentes' },
          screenState: { activeTab: 'pending', bannerText: 'Fila com 3 eventos pendentes' }
        },
        {
          timestamp: 5,
          duration: 5,
          actionTitle: '2. Selecionando os Eventos para Envio',
          narratorText: 'Marque a caixa de seleção para incluir os eventos S-2240 e S-2220 no lote.',
          cursorTarget: { x: 20, y: 45, label: 'Selecionar Todos os Eventos' },
          screenState: { badgeStatus: '3 Eventos Selecionados' }
        },
        {
          timestamp: 10,
          duration: 6,
          actionTitle: '3. Clicando em Transmitir Lote',
          narratorText: 'Clique em "Transmitir Lote". O sistema valida o XML e assina com o Certificado A1.',
          cursorTarget: { x: 80, y: 25, label: 'Transmitir Lote de Eventos' },
          screenState: { modalOpen: true, bannerText: 'Comunicando com WebService da RFB...' }
        },
        {
          timestamp: 16,
          duration: 6,
          actionTitle: '4. Recibos Oficiais Gerados',
          narratorText: 'Lote processado com sucesso! Os números de recibo foram vinculados aos colaboradores.',
          cursorTarget: { x: 60, y: 70, label: 'Visualizar Recibo Oficial' },
          screenState: { modalOpen: false, successMessage: 'Lote transmitido com Sucesso (Código 201)!' }
        }
      ]
    },
    faq: [
      {
        question: 'O que fazer se um evento for rejeitado pelo eSocial?',
        answer: 'O sistema exibe o código de erro retornado pela Receita Federal (ex: CBO inválido) com link direto para corrigir o campo no cadastro e retransmitir com 1 clique.'
      },
      {
        question: 'Como cancelar um evento transmitido indevidamente?',
        answer: 'Utilize o botão "Gerar S-3000 (Exclusão)", que envia o evento de exclusão referenciando o recibo anterior.'
      }
    ],
    commonMistakes: [
      {
        mistake: 'Deixar para transmitir os eventos do mês apenas no dia 15.',
        prevention: 'Recomenda-se transmitir em lotes semanais para evitar sobrecarga no WebService do governo no último dia.'
      }
    ]
  },

  {
    id: 'tut-financial-cashflow',
    title: 'Gestão Financeira, Fluxo de Caixa e Automações de Cobrança (D-3, D0, D+3)',
    subtitle: 'Aprenda a controlar contas a receber automáticas de contratos e OSs, lançar despesas, conciliar extratos e configurar réguas de cobrança.',
    category: 'FINANCIAL',
    categoryLabel: 'Financeiro & Fluxo de Caixa',
    targetRoles: ['ADMIN', 'FINANCEIRO', 'GESTOR'],
    difficulty: 'INTERMEDIÁRIO',
    estimatedMinutes: 5,
    regulatoryRef: 'Regras Financeiras PrevSafe & Cobrança Bancária',
    targetViewId: 'financial',
    tags: ['Financeiro', 'Fluxo de Caixa', 'Contas a Receber', 'Contas a Pagar', 'Conciliação', 'Cobrança', 'D-3 D0 D+3'],
    summary: 'Controle integral da saúde financeira da consultoria de SST. Títulos a receber são gerados automaticamente quando contratos são assinados ou OSs concluídas. A régua de notificações dispara lembretes amigáveis por e-mail e WhatsApp em D-3 (aviso prévio), D0 (vencimento hoje) e D+3 (cobrança de atraso).',
    whyItMatters: 'Reduz a inadimplência em até 80% e elimina o trabalho manual de emitir boletos e cobrar clientes individualmente.',
    processUtility: 'Conecta a execução técnica diretamente com a receita da empresa, mantendo o DRE e o saldo bancário conciliados.',
    prerequisites: ['Contas bancárias cadastradas', 'Contratos com valores definidos'],
    steps: [
      {
        stepNumber: 1,
        title: 'Conferir o Resumo do Fluxo de Caixa e Inadimplência',
        description: 'Na aba "Fluxo de Caixa", veja o Saldo Atual, Total a Receber no Mês, Total a Pagar e Índice de Inadimplência.',
        highlightAction: 'Visualizar Dashboard Financeiro',
        screenType: 'DASHBOARD',
        mockupDetails: {
          screenTitle: 'PrevSafe Finance & Fluxo de Caixa Consolidado',
          breadcrumbs: ['Financeiro', 'Fluxo de Caixa'],
          fieldsOrItems: [
            { label: 'Saldo em Caixa', value: 'R$ 84.650,00', badge: '+14% vs Mês Anterior' },
            { label: 'A Receber (30 dias)', value: 'R$ 42.180,00 (24 faturas)', badge: 'Previsão Saudável' },
            { label: 'Vencidos / Inadimplentes', value: 'R$ 3.420,00 (2 faturas)', badge: 'Ação Necessária' }
          ]
        }
      },
      {
        stepNumber: 2,
        title: 'Executar Régua de Cobrança Automatizada (D-3, D0, D+3)',
        description: 'Clique em "Executar Régua de Cobranças". O sistema identifica faturas a vencer em 3 dias, vencendo hoje e vencidas há 3 dias, disparando mensagens personalizadas com Pix e Código de Barras.',
        highlightAction: 'Disparar Régua de Cobrança',
        screenType: 'MODAL',
        mockupDetails: {
          screenTitle: 'Régua de Notificações Financeiras Automáticas',
          breadcrumbs: ['Financeiro', 'Automação de Cobrança'],
          mainActionLabel: '⚡ Disparar Lembretes Selecionados',
          fieldsOrItems: [
            { label: 'Lembrete Preventivo (D-3)', value: '8 Empresas • Envio WhatsApp + Boleto PDF' },
            { label: 'Vencimento Hoje (D0)', value: '4 Empresas • Aviso de Vencimento com Chave Pix' },
            { label: 'Cobrança de Atraso (D+3)', value: '2 Empresas • Aviso de Reemissão com Juros' }
          ]
        }
      }
    ],
    infographic: {
      objective: 'Garantir liquidez financeira e redução da inadimplência através de cobranças automatizadas e conciliação.',
      regulatoryCompliance: 'Regulamentação BACEN / Pix e Boletos Registrados.',
      criticalSuccessFactor: 'Automatização do disparo de lembretes antes do vencimento para evitar esquecimento do cliente.',
      flowNodes: [
        {
          id: 'fn1',
          phase: 'Geração do Título',
          actor: 'Contrato / OS',
          actorColor: 'emerald',
          title: '1. Faturamento Automático',
          description: 'Criação do título a receber com vencimento pactuado.',
          output: 'Fatura Gerada com Pix/Boleto'
        },
        {
          id: 'fn2',
          phase: 'Aviso D-3',
          actor: 'Robô PrevSafe',
          actorColor: 'blue',
          title: '2. Lembrete Amigável',
          description: '3 dias antes do vencimento, envio de mensagem WhatsApp.',
          output: 'Notificação Preventiva Entregue'
        },
        {
          id: 'fn3',
          phase: 'Vencimento D0',
          actor: 'Gateway Financeiro',
          actorColor: 'purple',
          title: '3. Data de Pagamento',
          description: 'Recebimento via Pix ou Boleto com liquidação automática.',
          output: 'Baixa Automática no Fluxo'
        },
        {
          id: 'fn4',
          phase: 'Inadimplência D+3',
          actor: 'Régua de Cobrança',
          actorColor: 'amber',
          title: '4. Cobrança de Atraso',
          description: 'Se não pago após 3 dias, envio de lembrete com cálculo de multa e juros.',
          output: 'Recuperação de Crédito'
        }
      ]
    },
    videoSimulator: {
      totalDurationSeconds: 20,
      videoTitle: 'Gerenciando Contas a Receber e Régua de Cobrança',
      videoDescription: 'Aprenda a visualizar o fluxo de caixa e disparar cobranças D-3/D0/D+3 em lote.',
      keyframes: [
        {
          timestamp: 0,
          duration: 5,
          actionTitle: '1. Abrindo o Módulo Financeiro',
          narratorText: 'No menu lateral, clique em Gestão Financeira & Fluxo de Caixa.',
          cursorTarget: { x: 40, y: 30, label: 'Acessar Financeiro' },
          screenState: { activeTab: 'overview', bannerText: 'Painel Financeiro Consolidado' }
        },
        {
          timestamp: 5,
          duration: 5,
          actionTitle: '2. Conferindo Faturas Vencidas',
          narratorText: 'Filtre faturas em atraso para identificar empresas pendentes.',
          cursorTarget: { x: 70, y: 40, label: 'Filtrar Vencidos' },
          screenState: { badgeStatus: '2 Faturas Vencidas' }
        },
        {
          timestamp: 10,
          duration: 5,
          actionTitle: '3. Disparando a Régua de Cobrança',
          narratorText: 'Clique em "Executar Régua de Cobranças" para notificar os tomadores.',
          cursorTarget: { x: 80, y: 25, label: 'Disparar Lembretes' },
          screenState: { modalOpen: true, bannerText: 'Enviando WhatsApp e Boletos...' }
        },
        {
          timestamp: 15,
          duration: 5,
          actionTitle: '4. Conciliação Registrada',
          narratorText: 'Tudo pronto! O histórico de envio fica registrado na auditoria do título.',
          cursorTarget: { x: 50, y: 60, label: 'Confirmar Disparo' },
          screenState: { modalOpen: false, successMessage: 'Lembretes disparados com sucesso!' }
        }
      ]
    },
    faq: [
      {
        question: 'O sistema dá baixa automática quando o cliente paga via Pix?',
        answer: 'Sim, se a chave Pix com payload dinâmico ou webhook do banco estiver integrada, a baixa é instantânea.'
      }
    ],
    commonMistakes: [
      {
        mistake: 'Faturar a OS manualmente duas vezes quando já existe contrato mensal.',
        prevention: 'Verifique se o serviço já está coberto pela mensalidade recorrente antes de gerar fatura adicional.'
      }
    ]
  },

  {
    id: 'tut-client-portal-experience',
    title: 'Portal do Cliente: Autoatendimento, Visualização de Laudos e Aceite Formal',
    subtitle: 'Como o tomador de serviços acessa sua área exclusiva, baixa documentos oficiais, responde pendências e formaliza aceites com segurança.',
    category: 'CLIENT_PORTAL',
    categoryLabel: 'Portal do Cliente / Tomador',
    targetRoles: ['ADMIN', 'GESTOR', 'CLIENTE_ADMIN', 'CLIENTE_USER'],
    difficulty: 'INICIANTE',
    estimatedMinutes: 4,
    regulatoryRef: 'Portaria MTP 671 & Acesso Seguro LGPD',
    targetViewId: 'client-portal',
    tags: ['Portal do Cliente', 'Autoatendimento', 'Laudos', 'Aceite Formal', 'Chamados', 'Extrato SST'],
    summary: 'Área externa segura e intuitiva para os diretores, gerentes de RH e engenheiros da empresa cliente. Permite consultar laudos vigentes (PGR, PCMSO), verificar recibos do eSocial, abrir solicitações e assinar o termo de aceite formal dos programas de segurança.',
    whyItMatters: 'Reduz em mais de 90% as ligações e e-mails pedindo "segunda via de laudo" ou "comprovante do eSocial".',
    processUtility: 'Cria uma experiência moderna e transparente para o cliente, fortalecendo a retenção e o NPS da consultoria.',
    prerequisites: ['Usuário do cliente com perfil CLIENTE_ADMIN ou CLIENTE_USER'],
    steps: [
      {
        stepNumber: 1,
        title: 'Acessar o Portal do Cliente e Visualizar o Painel de Conformidade',
        description: 'O cliente enxerga apenas a sua empresa com um velocímetro de conformidade SST, status dos laudos e pendências abertas.',
        highlightAction: 'Visualizar Dashboard do Cliente',
        screenType: 'DASHBOARD',
        mockupDetails: {
          screenTitle: 'Portal do Cliente PrevSafe • Metalúrgica Valença',
          breadcrumbs: ['Área do Cliente', 'Visão Geral'],
          fieldsOrItems: [
            { label: 'Conformidade SST', value: '94% Conforme', badge: 'Excelente' },
            { label: 'PGR / GRO 2026', value: 'Válido até Agosto/2027', badge: 'Liberado' },
            { label: 'PCMSO 2026', value: 'Coordenador: Dr. Lucas Silveira', badge: 'Liberado' }
          ]
        }
      },
      {
        stepNumber: 2,
        title: 'Efetuar o Aceite Formal de Laudo com Token',
        description: 'Na lista de documentos, o diretor da empresa pode ler o PGR e clicar em "Registrar Aceite Formal", gerando a evidência de entrega exigida pela fiscalização.',
        highlightAction: 'Registrar Aceite Formal',
        screenType: 'MODAL',
        mockupDetails: {
          screenTitle: 'Termo de Ciência e Aceite Formal do PGR',
          breadcrumbs: ['Documentos', 'Aceite Formal'],
          mainActionLabel: '✍️ Confirmar Ciência e Aceite',
          fieldsOrItems: [
            { label: 'Representante Legal', value: 'Carlos Valença (Diretor Executivo)' },
            { label: 'Declaração', value: 'Declaro ciência do Inventário de Riscos e Plano de Ação 5W2H' },
            { label: 'Registro de Autenticidade', value: 'IP 189.40.22.110 • 26/08/2026 15:40' }
          ]
        }
      }
    ],
    infographic: {
      objective: 'Proporcionar autonomia ao cliente para consulta de laudos e registro legal de recebimento.',
      regulatoryCompliance: 'NR-01 (Ciência dos Riscos aos Trabalhadores e Direção) e LGPD.',
      criticalSuccessFactor: 'Interface simplificada sem jargões complexos para uso direto pelo RH e Diretoria.',
      flowNodes: [
        {
          id: 'cp1',
          phase: 'Notificação',
          actor: 'PrevSafe Engine',
          actorColor: 'emerald',
          title: '1. Aviso de Laudo Disponível',
          description: 'Cliente recebe link seguro por e-mail e WhatsApp.',
          output: 'Link com Acesso Criptografado'
        },
        {
          id: 'cp2',
          phase: 'Consulta',
          actor: 'Diretor / RH Cliente',
          actorColor: 'blue',
          title: '2. Acesso ao Portal',
          description: 'Visualização da conformidade, laudos em PDF e recibos eSocial.',
          output: 'Download Instantâneo'
        },
        {
          id: 'cp3',
          phase: 'Aceite',
          actor: 'Representante da Empresa',
          actorColor: 'purple',
          title: '3. Registro de Aceite Formal',
          description: 'Assinatura digital do termo de ciência do plano de ação do PGR.',
          output: 'Protocolo Jurídico de Entrega'
        }
      ]
    },
    videoSimulator: {
      totalDurationSeconds: 18,
      videoTitle: 'Navegando no Portal do Cliente e Dando Aceite no PGR',
      videoDescription: 'Veja como o tomador de serviços visualiza seus laudos e assina o termo de ciência.',
      keyframes: [
        {
          timestamp: 0,
          duration: 4,
          actionTitle: '1. Acessando o Portal do Cliente',
          narratorText: 'O cliente faz login e visualiza o painel de conformidade da sua empresa.',
          cursorTarget: { x: 50, y: 30, label: 'Ver Painel de Conformidade' },
          screenState: { activeTab: 'portal', bannerText: 'Área do Cliente • Metalúrgica Valença' }
        },
        {
          timestamp: 4,
          duration: 5,
          actionTitle: '2. Baixando o Laudo Oficial',
          narratorText: 'Clique em "Download PDF" para baixar o PGR completo com ART.',
          cursorTarget: { x: 75, y: 45, label: 'Baixar PGR Oficial' },
          screenState: { badgeStatus: 'PDF Baixado com Sucesso' }
        },
        {
          timestamp: 9,
          duration: 5,
          actionTitle: '3. Registrando o Aceite Formal',
          narratorText: 'Clique em "Aceite Formal" para validar a ciência da diretoria.',
          cursorTarget: { x: 60, y: 70, label: 'Registrar Aceite Formal' },
          screenState: { modalOpen: true, bannerText: 'Termo de Ciência Aberto' }
        },
        {
          timestamp: 14,
          duration: 5,
          actionTitle: '4. Certificado de Entrega Emitido',
          narratorText: 'Pronto! O protocolo com IP e data fica disponível para auditorias.',
          cursorTarget: { x: 50, y: 80, label: 'Confirmar Assinatura' },
          screenState: { modalOpen: false, successMessage: 'Aceite formal homologado com sucesso!' }
        }
      ]
    },
    faq: [
      {
        question: 'O cliente pode alterar dados dos laudos no portal?',
        answer: 'Não. O portal é estritamente para consulta, download e solicitação de alterações via chamados.'
      }
    ],
    commonMistakes: [
      {
        mistake: 'Não cadastrar o e-mail correto do RH ou Diretor para o primeiro acesso.',
        prevention: 'Sempre confirme o e-mail institucional no cadastro da empresa para que o convite chegue corretamente.'
      }
    ]
  },

  {
    id: 'tut-ai-copilot-sst',
    title: 'IA Copilot SST: Diagnóstico de CNAE, Enquadramento NR-04 e Minutas Técnicas',
    subtitle: 'Utilize a inteligência artificial especialista para analisar perigos por atividade econômica, redigir justificativas de propostas e sintetizar visitas de campo.',
    category: 'AI_COPILOT',
    categoryLabel: 'IA Copilot SST & Produtividade',
    targetRoles: ['ADMIN', 'GESTOR', 'COMERCIAL', 'TÉCNICO'],
    difficulty: 'INICIANTE',
    estimatedMinutes: 3,
    regulatoryRef: 'NR-01, NR-04, NR-07 e Portarias MTP',
    targetViewId: 'dashboard-exec',
    tags: ['IA', 'Copilot', 'Gemini', 'CNAE', 'Grau de Risco', 'Propostas', 'Parecer Técnico'],
    summary: 'Assistente inteligente integrado com modelos avançados de IA e motor de conhecimento SST local. Permite consultar o enquadramento de qualquer CNAE, prever exames obrigatórios do PCMSO, dimensionar CIPA/SESMT e redigir textos comerciais persuasivos em segundos.',
    whyItMatters: 'Multiplica a produtividade da equipe técnica e comercial, reduzindo o tempo de elaboração de orçamentos e pareceres.',
    processUtility: 'Auxilia em todas as etapas: desde a prospecção do Lead até a redação do relatório de campo.',
    prerequisites: ['Acesso ao botão "IA Copilot" na barra superior'],
    steps: [
      {
        stepNumber: 1,
        title: 'Abrir o Modal da IA Copilot SST',
        description: 'Clique no botão "IA Copilot" com ícone de brilho no topo direito da tela.',
        highlightAction: 'Abrir IA Copilot',
        screenType: 'MODAL',
        mockupDetails: {
          screenTitle: 'PrevSafe IA Copilot SST • Especialista Regulamentar',
          breadcrumbs: ['Ferramentas', 'IA Copilot'],
          mainActionLabel: '⚡ Executar Análise Inteligente',
          fieldsOrItems: [
            { label: 'CNAE Alvo', value: '25.11-0-00 (Estruturas Metálicas)' },
            { label: 'Ação Selecionada', value: 'Análise Completa de CNAE e Grau de Risco' },
            { label: 'Efetivo', value: '45 Trabalhadores' }
          ]
        }
      },
      {
        stepNumber: 2,
        title: 'Gerar o Parecer Técnico e Copiar para a Proposta',
        description: 'A IA gera o Grau de Risco estimado, NRs obrigatórias (NR-01, NR-07, NR-12), exames médicos complementares e eventos eSocial. Você pode copiar o parecer formatado em Markdown com 1 clique.',
        highlightAction: 'Copiar Parecer Técnico',
        screenType: 'MODAL',
        mockupDetails: {
          screenTitle: 'Parecer Técnico Gerado',
          breadcrumbs: ['IA Copilot', 'Diagnóstico'],
          mainActionLabel: '📋 Copiar Parecer Formatado',
          highlightBox: {
            title: 'Grau de Risco 3 • CIPA Obrigatória',
            desc: 'Recomendações de exames: Audiometria, Espirometria e Avaliação Clínica.',
            color: 'emerald'
          }
        }
      }
    ],
    infographic: {
      objective: 'Acelerar diagnósticos técnicos e elaboração de documentos com inteligência artificial especialista em SST.',
      regulatoryCompliance: 'Normas Regulamentadoras 01 a 38 e Tabela 24 do eSocial.',
      criticalSuccessFactor: 'Revisão e validação final pelo Engenheiro ou Médico do Trabalho habilitado.',
      flowNodes: [
        {
          id: 'ai1',
          phase: 'Prompt',
          actor: 'Usuário',
          actorColor: 'emerald',
          title: '1. Seleção de Parâmetros',
          description: 'Informar CNAE, nome da empresa e número de vidas.',
          output: 'Contexto Estruturado'
        },
        {
          id: 'ai2',
          phase: 'Processamento',
          actor: 'Motor IA SST',
          actorColor: 'blue',
          title: '2. Cruzamento Regulamentar',
          description: 'Avaliação das NRs, riscos prováveis e exigências do eSocial.',
          output: 'Parecer Estruturado em Markdown'
        },
        {
          id: 'ai3',
          phase: 'Aplicação',
          actor: 'Técnico / Comercial',
          actorColor: 'purple',
          title: '3. Inserção na Proposta/OS',
          description: 'Aproveitamento do texto na proposta ou inventário de riscos.',
          output: 'Orçamento Preciso em Segundos'
        }
      ]
    },
    videoSimulator: {
      totalDurationSeconds: 16,
      videoTitle: 'Usando a IA Copilot para Analisar um CNAE',
      videoDescription: 'Veja como obter o diagnóstico de riscos e NRs de qualquer atividade econômica.',
      keyframes: [
        {
          timestamp: 0,
          duration: 4,
          actionTitle: '1. Abrindo a IA Copilot',
          narratorText: 'Clique no botão IA Copilot na barra superior de navegação.',
          cursorTarget: { x: 80, y: 15, label: 'Abrir IA Copilot' },
          screenState: { modalOpen: true, bannerText: 'IA Copilot Ativa' }
        },
        {
          timestamp: 4,
          duration: 4,
          actionTitle: '2. Selecionando Análise de CNAE',
          narratorText: 'Selecione a opção "Análise de CNAE" e informe o código da empresa.',
          cursorTarget: { x: 50, y: 40, label: 'Selecionar CNAE 25.11-0-00' },
          screenState: { modalOpen: true, badgeStatus: 'CNAE Inserido' }
        },
        {
          timestamp: 8,
          duration: 4,
          actionTitle: '3. Gerando o Parecer',
          narratorText: 'Clique em Executar Análise para receber o relatório técnico completo.',
          cursorTarget: { x: 60, y: 70, label: 'Gerar Diagnóstico' },
          screenState: { modalOpen: true, bannerText: 'Gerando Parecer com Normas e Exames...' }
        },
        {
          timestamp: 12,
          duration: 4,
          actionTitle: '4. Copiando para a Proposta',
          narratorText: 'Copie o parecer e cole diretamente na sua proposta comercial!',
          cursorTarget: { x: 50, y: 85, label: 'Copiar Parecer' },
          screenState: { successMessage: 'Parecer copiado com sucesso!' }
        }
      ]
    },
    faq: [
      {
        question: 'A IA substitui a assinatura do Engenheiro ou Médico?',
        answer: 'Não. A IA atua como assistente e redatora técnica. Toda emissão de laudo requer validação do profissional habilitado com ART/RQE.'
      }
    ],
    commonMistakes: [
      {
        mistake: 'Utilizar o CNAE secundário em vez do principal para o dimensionamento inicial.',
        prevention: 'Sempre realize a análise do CNAE principal da atividade econômica com maior grau de risco.'
      }
    ]
  },

  {
    id: 'tut-saas-multi-tenant-admin',
    title: 'Super Admin: Gestão de Assinantes SaaS, Planos e Isolamento RLS',
    subtitle: 'Painel do administrador do software: criação de consultorias assinantes, limites de empresas/usuários, métricas MRR/ARR e impersonação de suporte.',
    category: 'SAAS_ADMIN',
    categoryLabel: 'Super Admin & Multi-Tenant',
    targetRoles: ['ADMIN'],
    difficulty: 'AVANÇADO',
    estimatedMinutes: 5,
    regulatoryRef: 'LGPD (Lei 13.709/2018) & Row Level Security (RLS)',
    targetViewId: 'saas-management',
    tags: ['SaaS', 'Multi-Tenant', 'Super Admin', 'Planos', 'MRR', 'ARR', 'RLS', 'Impersonação'],
    summary: 'Administre todas as consultorias de SST que utilizam a plataforma PrevSafe. Crie novas contas assinantes, altere planos (Starter, Pro, Enterprise), monitore faturamento recorrente (MRR) e alterne de contexto para prestar suporte com isolamento total de dados por tenant_id.',
    whyItMatters: 'Permite escalar a plataforma como um SaaS robusto sem risco de vazamento de dados entre consultorias concorrentes.',
    processUtility: 'Garante o controle de licenciamento e segurança em nível de banco de dados para todas as operações.',
    prerequisites: ['Perfil Super Admin'],
    steps: [
      {
        stepNumber: 1,
        title: 'Acessar o Painel de Gestão de Assinantes SaaS',
        description: 'No menu Governança & Qualidade, clique em "Gestão de Assinantes SaaS". Veja as métricas consolidadas de MRR, ARR e consultorias ativas.',
        highlightAction: 'Visualizar Dashboard SaaS',
        screenType: 'DASHBOARD',
        mockupDetails: {
          screenTitle: 'Painel do Super Administrador SaaS PrevSafe',
          breadcrumbs: ['Governança', 'Gestão de Assinantes SaaS'],
          fieldsOrItems: [
            { label: 'Receita Recorrente Mensal (MRR)', value: 'R$ 38.450,00', badge: '+18% no Trimestre' },
            { label: 'Consultorias Assinantes', value: '28 Empresas de SST', badge: 'Ativas' },
            { label: 'Vidas Monitoradas na Base', value: '14.280 Trabalhadores', badge: 'Conectados' }
          ]
        }
      },
      {
        stepNumber: 2,
        title: 'Cadastrar Nova Consultoria e Gerar Token de Convite',
        description: 'Preencha o CNPJ da consultoria, escolha o plano (ex: Professional) e clique em "Criar Assinante". O sistema gera a URL de primeiro acesso para o administrador.',
        highlightAction: 'Cadastrar Nova Consultoria',
        screenType: 'FORM',
        mockupDetails: {
          screenTitle: 'Onboarding de Nova Consultoria Assinante',
          breadcrumbs: ['Assinantes', 'Novo Cadastro'],
          mainActionLabel: '🚀 Criar Assinante e Gerar Convite',
          fieldsOrItems: [
            { label: 'Razão Social', value: 'PrevMed Medicina e Segurança Ocupacional Ltda' },
            { label: 'Plano Selecionado', value: 'PROFESSIONAL (Até 60 Empresas e 12 Usuários)' },
            { label: 'Isolamento de Dados', value: 'Tenant ID único gerado com RLS no PostgreSQL' }
          ]
        }
      }
    ],
    infographic: {
      objective: 'Gerenciar o ciclo de vida dos assinantes SaaS com isolamento lógico estrito de dados (RLS).',
      regulatoryCompliance: 'LGPD Art. 46 (Segurança e Sigilo de Dados) e Padrões SOC 2.',
      criticalSuccessFactor: 'Garantia de que toda consulta SQL possua a cláusula WHERE tenant_id = :id.',
      flowNodes: [
        {
          id: 'sa1',
          phase: 'Cadastro',
          actor: 'Super Admin',
          actorColor: 'emerald',
          title: '1. Criação do Tenant',
          description: 'Definição dos limites de empresas, usuários e plano contratado.',
          output: 'Registro de Tenant Criado'
        },
        {
          id: 'sa2',
          phase: 'Segurança',
          actor: 'Database RLS',
          actorColor: 'blue',
          title: '2. Isolamento de Dados',
          description: 'Criação das políticas de segurança que segregam tabelas por tenant_id.',
          output: 'Blindagem Lógica de Dados'
        },
        {
          id: 'sa3',
          phase: 'Onboarding',
          actor: 'Admin da Consultoria',
          actorColor: 'purple',
          title: '3. Primeiro Acesso',
          description: 'Administrador define sua senha através do link criptográfico de convite.',
          output: 'Ambiente Ativo e Operante'
        }
      ]
    },
    videoSimulator: {
      totalDurationSeconds: 18,
      videoTitle: 'Gerenciando Assinantes SaaS e Métricas de MRR',
      videoDescription: 'Veja como cadastrar uma nova consultoria de SST e monitorar planos no Super Admin.',
      keyframes: [
        {
          timestamp: 0,
          duration: 4,
          actionTitle: '1. Acessando a Gestão SaaS',
          narratorText: 'No menu Governança, abra o painel de Gestão de Assinantes SaaS.',
          cursorTarget: { x: 30, y: 35, label: 'Abrir Gestão SaaS' },
          screenState: { activeTab: 'saas', bannerText: 'Painel do Super Admin' }
        },
        {
          timestamp: 4,
          duration: 5,
          actionTitle: '2. Criando Novo Assinante',
          narratorText: 'Clique em "Nova Consultoria" e selecione o plano Professional.',
          cursorTarget: { x: 75, y: 25, label: 'Nova Consultoria' },
          screenState: { modalOpen: true, badgeStatus: 'Formulário Aberto' }
        },
        {
          timestamp: 9,
          duration: 5,
          actionTitle: '3. Gerando o Link de Convite',
          narratorText: 'O sistema cria o Tenant isolado e gera o link de primeiro acesso.',
          cursorTarget: { x: 60, y: 75, label: 'Gerar Convite de Acesso' },
          screenState: { modalOpen: true, bannerText: 'Link gerado com sucesso' }
        },
        {
          timestamp: 14,
          duration: 4,
          actionTitle: '4. Nova Assinatura no MRR',
          narratorText: 'O faturamento recorrente é atualizado instantaneamente no painel.',
          cursorTarget: { x: 50, y: 40, label: 'Conferir MRR Consolidado' },
          screenState: { modalOpen: false, successMessage: 'Consultoria ativada no ecossistema SaaS!' }
        }
      ]
    },
    faq: [
      {
        question: 'Uma consultoria consegue visualizar dados de outra consultoria?',
        answer: 'Nunca. O isolamento lógico por Row Level Security (RLS) garante que cada usuário acesse exclusivamente os registros do seu tenant_id.'
      }
    ],
    commonMistakes: [
      {
        mistake: 'Cadastrar clientes finais no painel de Super Admin em vez de no módulo de Clientes da consultoria.',
        prevention: 'O Super Admin é exclusivo para cadastrar Consultorias de SST assinantes. As empresas atendidas são cadastradas em Clientes & Unidades.'
      }
    ]
  },

  {
    id: 'tut-audit-compliance-rn011',
    title: 'Auditoria Geral (Audit Log), Trilha Imutável e Conformidade RN011',
    subtitle: 'Rastreabilidade total: registro de data e hora, IP, usuário, antes/depois de alterações e exportação para auditorias do MTE.',
    category: 'AUDIT_LOGS',
    categoryLabel: 'Auditoria Geral & Conformidade',
    targetRoles: ['ADMIN', 'GESTOR'],
    difficulty: 'INTERMEDIÁRIO',
    estimatedMinutes: 4,
    regulatoryRef: 'Regra de Negócio RN011, LGPD & Portaria MTP 671',
    targetViewId: 'audit-logs',
    tags: ['Auditoria', 'Audit Log', 'RN011', 'Trilha Imutável', 'Histórico', 'IP', 'Exportação'],
    summary: 'Central de auditoria com registro imutável de todas as ações no sistema: criação de laudos, transmissão de eSocial, alteração de dados de clientes, exclusões e impersonações de suporte. Em conformidade com a Regra RN011, nenhum log pode ser apagado ou editado.',
    whyItMatters: 'Protege a consultoria contra fraudes internas e atende 100% dos requisitos de auditoria jurídica e pericial.',
    processUtility: 'Permite auditar quem aprovou um documento, quem transmitiu um lote do eSocial e quando um cliente visualizou seu laudo.',
    prerequisites: ['Acesso de Administrador'],
    steps: [
      {
        stepNumber: 1,
        title: 'Filtrar Logs por Usuário, Módulo e Período',
        description: 'Acesse "Auditoria Geral". Filtre por data, ação (CREATE, UPDATE, DELETE, TRANSMIT) ou usuário específico.',
        highlightAction: 'Filtrar Trilha de Auditoria',
        screenType: 'TABLE',
        mockupDetails: {
          screenTitle: 'Trilha Imutável de Auditoria Geral (RN011)',
          breadcrumbs: ['Governança & Qualidade', 'Auditoria Geral'],
          fieldsOrItems: [
            { label: 'TRANSMIT_ESOCIAL_BATCH', value: 'Usuário: Gestor Roberto • Lote S-2240 (3 eventos)', badge: 'IP: 177.18.90.12', status: 'Auditado' },
            { label: 'RELEASE_DOCUMENT_RN009', value: 'Usuário: Eng. Carlos • PGR 2026 Metalúrgica', badge: 'IP: 189.40.11.20', status: 'Auditado' },
            { label: 'CLIENT_PORTAL_LOGIN', value: 'Usuário: Diretor Valença • Acesso Área do Cliente', badge: 'IP: 201.55.44.10', status: 'Auditado' }
          ]
        }
      },
      {
        stepNumber: 2,
        title: 'Inspecionar o Diff (Antes vs Depois) da Alteração',
        description: 'Clique em um log para visualizar exatamente quais campos foram modificados com o valor anterior e o novo valor.',
        highlightAction: 'Inspecionar Detalhes do Log',
        screenType: 'MODAL',
        mockupDetails: {
          screenTitle: 'Detalhamento do Registro de Auditoria #LOG-8841',
          breadcrumbs: ['Auditoria', 'Inspecionar Diff'],
          fieldsOrItems: [
            { label: 'Objeto Afetado', value: 'Ordem de Serviço OS-2026-002 (Pausa de SLA)' },
            { label: 'Valor Anterior', value: 'status: "IN_PROGRESS", sla_paused: false' },
            { label: 'Novo Valor', value: 'status: "PAUSED_PENDING_CLIENT", sla_paused: true' },
            { label: 'Assinatura SHA-256', value: '9f8379f9069ed2aa138781d0add9e2f4d805b605' }
          ]
        }
      }
    ],
    infographic: {
      objective: 'Garantir a rastreabilidade e integridade jurídica de todos os atos técnicos e administrativos.',
      regulatoryCompliance: 'Portaria MTP 671/2021 e Princípio da Responsabilização da LGPD.',
      criticalSuccessFactor: 'Preservação dos registros de auditoria com data e hora em UTC e endereço IP.',
      flowNodes: [
        {
          id: 'al1',
          phase: 'Ação do Usuário',
          actor: 'Qualquer Usuário',
          actorColor: 'emerald',
          title: '1. Execução de Operação',
          description: 'Clique em salvar, transmitir, editar ou excluir qualquer registro.',
          output: 'Evento Disparado'
        },
        {
          id: 'al2',
          phase: 'Interceptação',
          actor: 'Middleware RN011',
          actorColor: 'blue',
          title: '2. Captura de Contexto',
          description: 'Registro do ID do usuário, perfil, IP, agente de navegação e payload de dados.',
          output: 'Snapshot com Diff Antes/Depois'
        },
        {
          id: 'al3',
          phase: 'Persistência Imutável',
          actor: 'Banco de Logs',
          actorColor: 'purple',
          title: '3. Gravação em Tabela Append-Only',
          description: 'Registro gravado sem permissão de UPDATE ou DELETE.',
          output: 'Log Criptografado e Permanente'
        }
      ]
    },
    videoSimulator: {
      totalDurationSeconds: 16,
      videoTitle: 'Consultando Logs e Exportando Relatórios de Auditoria',
      videoDescription: 'Veja como auditar alterações de laudos e transmissões de eSocial no sistema.',
      keyframes: [
        {
          timestamp: 0,
          duration: 4,
          actionTitle: '1. Acessando a Auditoria Geral',
          narratorText: 'No menu Governança, abra a Auditoria Geral.',
          cursorTarget: { x: 30, y: 40, label: 'Abrir Auditoria' },
          screenState: { activeTab: 'audit', bannerText: 'Trilha de Auditoria Imutável' }
        },
        {
          timestamp: 4,
          duration: 4,
          actionTitle: '2. Filtrando Eventos de eSocial',
          narratorText: 'Filtre por ações de transmissão de eSocial para conferir os envios.',
          cursorTarget: { x: 60, y: 25, label: 'Filtrar eSocial' },
          screenState: { badgeStatus: 'Filtrado por eSocial' }
        },
        {
          timestamp: 8,
          duration: 4,
          actionTitle: '3. Visualizando o Diff da Alteração',
          narratorText: 'Abra o registro para conferir o valor antes e depois com IP do operador.',
          cursorTarget: { x: 50, y: 55, label: 'Ver Detalhes do Log' },
          screenState: { modalOpen: true, bannerText: 'Diff Antes vs Depois' }
        },
        {
          timestamp: 12,
          duration: 4,
          actionTitle: '4. Exportando para Perícia ou Auditoria',
          narratorText: 'Exporte o relatório oficial em PDF ou CSV com assinatura eletrônica.',
          cursorTarget: { x: 80, y: 25, label: 'Exportar Relatório' },
          screenState: { modalOpen: false, successMessage: 'Relatório de auditoria exportado com sucesso!' }
        }
      ]
    },
    faq: [
      {
        question: 'É possível excluir um log de auditoria?',
        answer: 'Não. Pela regra RN011 e padrões de segurança, a tabela de auditoria é estritamente de adição (append-only) e imutável.'
      }
    ],
    commonMistakes: [
      {
        mistake: 'Compartilhar senhas entre operadores, dificultando a atribuição individual nos logs.',
        prevention: 'Cadastre um usuário nominal para cada colaborador técnico e comercial.'
      }
    ]
  }
];
