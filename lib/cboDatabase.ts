export interface CBOItem {
  code: string;
  title: string;
  synonyms?: string[];
  family_code: string;
  family_title: string;
  category: 'CONSTRUCAO' | 'INDUSTRIA' | 'ELETRICA' | 'LOGISTICA' | 'ADMINISTRATIVO' | 'SAUDE_SST' | 'SERVICOS' | 'MANUTENCAO' | 'ALIMENTACAO' | 'AGRO' | 'TI';
  description_mos: string; // Descrição detalhada conforme Manual de Orientação do eSocial (MOS)
  requirements_notes?: string;
  suggested_epis?: string[];
}

export const CBO_DATABASE: CBOItem[] = [
  // CONSTRUÇÃO CIVIL & EDIFICAÇÕES
  {
    code: '7152-10',
    title: 'Pedreiro',
    synonyms: ['Pedreiro de Alvenaria', 'Pedreiro de Acabamento', 'Oficial de Pedreiro'],
    family_code: '7152',
    family_title: 'Trabalhadores de alvenaria e estruturas afins',
    category: 'CONSTRUCAO',
    description_mos: 'Executa trabalhos de alvenaria, concreto e outros materiais guiando-se por desenhos, esquemas e especificações. Constrói e repara alicerces, paredes, muros, pisos e estruturas semelhantes em obras de construção civil. Prepara argamassas, realiza assentamento de tijolos, blocos cerâmicos ou de concreto, executa rebocos, emboços e assentamento de pisos e azulejos. Opera betoneiras e ferramentas manuais e elétricas portáteis.',
    requirements_notes: 'Treinamento de Integração NR-18, NR-01 (Disposições Gerais), NR-06 (EPI), NR-35 (Trabalho em Altura acima de 2m)',
    suggested_epis: ['Capacete com jugular', 'Óculos de proteção contra impactos', 'Bota de segurança com biqueira de aço/composite e palmilha antiperfuro', 'Luvas de vaqueta/látex', 'Protetor auditivo tipo plug', 'Cinto de segurança tipo paraquedista com talabarte duplo em Y (em altura)']
  },
  {
    code: '7170-20',
    title: 'Servente de Obras',
    synonyms: ['Ajudante de Obras', 'Auxiliar de Construção Civil', 'Ajudante Geral de Obra'],
    family_code: '7170',
    family_title: 'Ajudantes de obras civis',
    category: 'CONSTRUCAO',
    description_mos: 'Auxilia pedreiros, carpinteiros, armadores e demais profissionais da construção civil no canteiro de obras. Efetua a carga, descarga, transporte manual e empilhamento de materiais (cimento, areia, blocos, tijolos, ferragens e madeiras). Realiza escavações manuais de valas, limpeza e organização do local de trabalho, remoção de entulhos e preparo manual ou mecânico de concreto e massas em betoneiras.',
    requirements_notes: 'Treinamento de Integração NR-18, NR-01, NR-06, NR-17 (Ergonomia no levantamento e transporte manual de cargas)',
    suggested_epis: ['Capacete de segurança', 'Luva de látex/nitrílica para manuseio de cimento', 'Calçado de segurança com biqueira', 'Óculos de proteção', 'Protetor auricular tipo concha/plug', 'Máscara PFF2 para poeiras minerais']
  },
  {
    code: '7153-15',
    title: 'Armador de Estrutura de Concreto Armado',
    synonyms: ['Armador de Ferragens', 'Ferreiro de Obra'],
    family_code: '7153',
    family_title: 'Montadores de estruturas de concreto armado',
    category: 'CONSTRUCAO',
    description_mos: 'Corta, dobra, molda e monta vergalhões de aço para confecção de armaduras e ferragens de vigas, colunas, lajes, sapatas e fundações. Posiciona e amarra as armaduras utilizando arame recozido e torquês, garantindo o espaçamento e recobrimento conforme projeto estrutural. Auxilia na conferência de formas antes da concretagem.',
    requirements_notes: 'NR-18 (Condições de Segurança na Indústria da Construção), NR-35 (Trabalho em Altura), NR-06 (Uso e Conservação de EPIs)',
    suggested_epis: ['Luvas de vaqueta reforçada ou raspa', 'Óculos de proteção com proteção lateral', 'Botina de segurança com palmilha antiperfuro', 'Protetor auditivo', 'Cinto de segurança tipo paraquedista com talabarte']
  },
  {
    code: '7155-05',
    title: 'Carpinteiro de Obras',
    synonyms: ['Carpinteiro de Formas', 'Carpinteiro Estrutural'],
    family_code: '7155',
    family_title: 'Trabalhadores da montagem de estruturas de madeira e carpintaria',
    category: 'CONSTRUCAO',
    description_mos: 'Fabrica, monta e desmonta formas de madeira e painéis compensados para moldagem de concreto armado em lajes, vigas, pilares e fundações. Realiza cortes e ajustes em madeira com auxílio de serra circular de bancada, serra tico-tico e ferramentas manuais. Instala escoramentos metálicos e de madeira, andaimes e passarelas de madeira.',
    requirements_notes: 'NR-18 (Operação de Máquinas de Carpintaria / Serra Circular), NR-12 (Segurança em Máquinas), NR-35 (Trabalho em Altura)',
    suggested_epis: ['Protetor facial ou óculos de ampla visão', 'Protetor auricular tipo concha', 'Luvas de proteção mecânica', 'Botina de couro com biqueira', 'Máscara PFF2 contra poeira de madeira']
  },
  {
    code: '7166-10',
    title: 'Pintor de Obras',
    synonyms: ['Pintor Imobiliário', 'Pintor de Parede', 'Pintor Civil'],
    family_code: '7166',
    family_title: 'Pintores de obras e revestidores',
    category: 'CONSTRUCAO',
    description_mos: 'Prepara superfícies de alvenaria, gesso, concreto e madeira aplicando lixamento, raspagem, emassamento com massa corrida ou acrílica e seladores. Aplica tintas látex, acrílica, epóxi, esmalte sintético e vernizes utilizando rolos, trinchas e pistolas de pintura airless. Realiza isolamento e proteção de áreas não destinadas à pintura.',
    requirements_notes: 'NR-18, NR-35 (Trabalho em Altura em balancins/andaimes), NR-06, Treinamento para manuseio seguro de produtos químicos (FISPQ / FDS)',
    suggested_epis: ['Respirador com filtro para vapores orgânicos e névoas', 'Macacão descartável tipo Tyvek', 'Óculos de proteção ampla visão', 'Luvas nitrílicas ou de neoprene', 'Calçado de segurança']
  },
  {
    code: '7165-25',
    title: 'Gesseiro',
    synonyms: ['Montador de Drywall', 'Instalador de Forro de Gesso', 'Gesseiro Revestidor'],
    family_code: '7165',
    family_title: 'Aplicadores de revestimentos cerâmicos e gesso',
    category: 'CONSTRUCAO',
    description_mos: 'Prepara e aplica gesso liso e projetado em paredes e tetos. Monta estruturas metálicas leves para instalação de placas de drywall, divisórias e forros acartonados ou modulados. Executa molduras, sancas e tratamento de juntas com fita e massa específica, lixando superfícies para acabamento final.',
    requirements_notes: 'NR-18, NR-35 (Trabalho em Andaimes e Plataformas Elevatórias), NR-17 (Ergonomia de membros superiores)',
    suggested_epis: ['Máscara descartável PFF1/PFF2 contra poeiras de gesso', 'Óculos de proteção contra poeira', 'Luvas de tecido com banho nitrílico/látex', 'Botina de segurança']
  },

  // METALMECÂNICA, SOLDA E CALDEIRARIA
  {
    code: '7212-05',
    title: 'Soldador no Processo Elétrico e a Gás',
    synonyms: ['Soldador MIG/MAG', 'Soldador TIG', 'Soldador de Eletrodo Revestido', 'Soldador de Tubulação'],
    family_code: '7212',
    family_title: 'Preparadores e operadores de máquinas-ferramenta e soldadores',
    category: 'INDUSTRIA',
    description_mos: 'Une e corta peças de ligas metálicas (aço carbono, aço inoxidável, alumínio) utilizando processos de soldagem por arco elétrico (SMAW/Eletrodo Revestido, GMAW/MIG-MAG, GTAW/TIG, FCAW/Arame Tubular) e maçarico oxicombustível. Prepara juntas com esmerilhadeiras e chanfradores, realiza pré-aquecimento e controle interpasses, inspeciona visualmente a solda e trata descontinuidades.',
    requirements_notes: 'NR-01, NR-06, NR-10 (Segurança em Eletricidade), NR-34 (Condições e Meio Ambiente de Trabalho na Indústria da Construção e Reparação Naval / Trabalho a Quente), NR-33 se em espaço confinado',
    suggested_epis: ['Máscara de solda com lente automática tonalidade 9-13', 'Avental, mangote e perneira de raspa de couro', 'Luva de raspa com cano longo', 'Capuz de soldador (balaclava)', 'Respirador PFF2 com camada de carvão ativado para fumos metálicos', 'Botina de segurança sem componentes metálicos externos e com elástico']
  },
  {
    code: '7244-10',
    title: 'Caldeireiro (Chapas de Cobre)',
    synonyms: ['Caldeireiro Montador', 'Caldeireiro Traçador', 'Caldeireiro Industrial'],
    family_code: '7244',
    family_title: 'Trabalhadores de caldeiraria e estruturas metálicas',
    category: 'INDUSTRIA',
    description_mos: 'Confecciona, repara e instala estruturas metálicas, tanques, reservatórios, tubulações e caldeiras industriais. Realiza traçagem em chapas metálicas a partir de desenhos técnicos, operando guilhotinas mecânicas, calandras, dobradeiras, prensas e equipamentos de corte térmico (oxicorte/plasma). Ajusta e ponteia componentes para soldagem final.',
    requirements_notes: 'NR-12 (Segurança no Trabalho em Máquinas e Equipamentos), NR-34 (Trabalho a Quente), NR-35 (Trabalho em Altura)',
    suggested_epis: ['Protetor auricular tipo concha acoplado ao capacete', 'Óculos de proteção', 'Luvas de vaqueta mista com raspa', 'Botina com biqueira de composite', 'Perneiras de couro']
  },
  {
    code: '7214-05',
    title: 'Torneiro Mecânico',
    synonyms: ['Operador de Torno Convencional', 'Torneiro Ferramenteiro'],
    family_code: '7214',
    family_title: 'Operadores de máquinas de usinagem',
    category: 'INDUSTRIA',
    description_mos: 'Opera torno mecânico convencional para usinar peças cilíndricas, cônicas e planas de materiais metálicos e não-metálicos. Prepara e fixa ferramentas de corte (bits, pastilhas intercambiáveis) e matéria-prima na placa. Regula rotações, avanços e profundidades de corte conforme tolerâncias especificadas em desenho mecânico com uso de micrômetros, paquímetros e relógios comparadores.',
    requirements_notes: 'NR-12 (Proteção de barramentos, placas e partes móveis), NR-06, NR-01',
    suggested_epis: ['Óculos de segurança com proteção lateral', 'Protetor auditivo tipo plug', 'Calçado de segurança com biqueira de aço', 'Rede de contenção de cabelos se aplicável (proibido uso de luvas soltas ou roupas folgadas em torno)']
  },
  {
    code: '7214-10',
    title: 'Operador de Torno com Comando Numérico (CNC)',
    synonyms: ['Programador e Operador de Torno CNC', 'Operador de Centro de Usinagem CNC'],
    family_code: '7214',
    family_title: 'Operadores de máquinas de usinagem CNC',
    category: 'INDUSTRIA',
    description_mos: 'Prepara e opera centros de usinagem e tornos de comando numérico computadorizado para fabricação de peças seriadas e complexas. Carrega e ajusta programas de usinagem (código G), posiciona ferramentas nos magazines, fixa matéria-prima em dispositivos hidráulicos/pneumáticos, acompanha ciclos de usinagem fechados com fluido de corte e realiza controle dimensional rigoroso.',
    requirements_notes: 'NR-12 (Sistemas de intertravamento de segurança classe 4), NR-06, NR-01',
    suggested_epis: ['Óculos de segurança ampla visão', 'Protetor auricular', 'Calçado de segurança com biqueira', 'Creme protetor de pele ou luva nitrílica para manuseio esporádico de peças oleadas']
  },
  {
    code: '7252-05',
    title: 'Montador de Estruturas Metálicas',
    synonyms: ['Montador de Galpão Metálico', 'Montador Industrial'],
    family_code: '7252',
    family_title: 'Montadores de estruturas metálicas de edifícios e indústrias',
    category: 'INDUSTRIA',
    description_mos: 'Efetua montagem de estruturas metálicas de galpões, mezaninos, passarelas e torres. Recebe perfis metálicos içados por guindastes, posiciona peças com uso de tirfor, alavancas e macacos hidráulicos, alinha e torqueia conjuntos parafusados ou ponteia para soldagem estrutural. Trabalha comumente sobre plataformas elevatórias ou em altura sobre andaimes.',
    requirements_notes: 'NR-35 (Trabalho em Altura - Obrigatório 8h/anual), NR-18, NR-11 (Içamento e Amarração de Cargas), NR-12',
    suggested_epis: ['Cinto tipo paraquedista com 2 talabartes de fita e absorvedor de energia', 'Capacete com jugular', 'Luvas de vaqueta mista', 'Botina com biqueira e palmilha antiperfuro', 'Óculos escuros para trabalho a céu aberto']
  },

  // ELÉTRICA & MANUTENÇÃO ELETROMECÂNICA
  {
    code: '7156-15',
    title: 'Eletricista de Instalações',
    synonyms: ['Eletricista Predial', 'Eletricista Residencial e Comercial'],
    family_code: '7156',
    family_title: 'Eletricistas de instalações de edifícios e similares',
    category: 'ELETRICA',
    description_mos: 'Planeja e executa serviços elétricos de baixa tensão em instalações residenciais, comerciais e industriais. Passa fiações e cabos elétricos através de eletrodutos, perfilados e eletrocalhas; monta e liga quadros de distribuição de circuitos (QDC), disjuntores, DRs, DPS, tomadas, interruptores e luminárias. Realiza testes de continuidade, resistência de isolamento e aterramento.',
    requirements_notes: 'NR-10 (Segurança em Instalações e Serviços em Eletricidade - Básico 40h), NR-35 (Trabalho em Altura), NR-06, NR-01',
    suggested_epis: ['Vestimenta antichama 100% algodão com proteção contra arco elétrico (ATP >= 8 cal/cm²)', 'Capacete classe B (isolamento até 20.000V)', 'Calçado isolante para eletricista sem partes metálicas', 'Luvas de borracha isolante com sobreluva de vaqueta', 'Óculos de proteção contra radiação ultravioleta e impactos']
  },
  {
    code: '7156-10',
    title: 'Eletricista de Manutenção Industrial',
    synonyms: ['Eletrotécnico de Manutenção', 'Eletricista de Força e Controle'],
    family_code: '7156',
    family_title: 'Eletricistas de instalações industriais',
    category: 'ELETRICA',
    description_mos: 'Instala, inspeciona e mantém sistemas elétricos industriais de força, comando e automação. Diagnostica falhas em motores trifásicos, inversores de frequência, soft-starters, CLPs, transformadores, painéis CCM (Centro de Controle de Motores) e subestações abrigadas. Aplica procedimentos de bloqueio e etiquetagem de energias perigosas (LOTO - Lockout/Tagout).',
    requirements_notes: 'NR-10 (Básico 40h e Complementar SEP - Sistema Elétrico de Potência 40h), NR-12 (Segurança de Painéis de Máquinas), NR-33, NR-35',
    suggested_epis: ['Uniforme de brim antichama com ATPV certificado', 'Balaclava e capuz arc-flash para intervenção em painéis', 'Luvas isolantes para baixa/média tensão', 'Detector de tensão por contato e aproximação', 'Botina com solado dielétrico']
  },
  {
    code: '7255-05',
    title: 'Mecânico de Manutenção de Máquinas Industriais',
    synonyms: ['Mecânico Industrial', 'Técnico de Manutenção Mecânica'],
    family_code: '7255',
    family_title: 'Mecânicos de manutenção de máquinas industriais',
    category: 'MANUTENCAO',
    description_mos: 'Realiza manutenção preventiva, preditiva e corretiva em máquinas, bombas centrífugas, redutores de velocidade, compressores, esteiras transportadoras e sistemas hidráulicos/pneumáticos. Desmonta conjuntos mecânicos, substitui rolamentos, retentores, gaxetas, engrenagens e eixos danificados. Realiza alinhamento a laser de eixos e balanceamento dinâmico.',
    requirements_notes: 'NR-12 (Segurança em Máquinas e Bloqueio LOTO), NR-33 (Entrada e Trabalho em Espaço Confinado), NR-35 (Trabalho em Altura)',
    suggested_epis: ['Luvas de nitrilo reforçado contra óleos e graxas', 'Óculos de proteção', 'Protetor auricular tipo concha', 'Botina com biqueira de composite', 'Macacão de manutenção']
  },

  // TRANSPORTE, LOGÍSTICA & MÁQUINAS PESADAS
  {
    code: '7825-10',
    title: 'Motorista de Caminhão (Rotas Regionais e Internacionais)',
    synonyms: ['Motorista Carreteiro', 'Motorista de Veículo Pesado', 'Motorista Rodoviário'],
    family_code: '7825',
    family_title: 'Motoristas de veículos de carga em geral',
    category: 'LOGISTICA',
    description_mos: 'Conduz caminhões pesados, cavalos mecânicos e carretas para transporte rodoviário de cargas secas, frigorificadas ou fracionadas. Inspeciona as condições mecânicas e de segurança do veículo (pneus, freios, fluidos, luzes e tacógrafo), confere amarração e distribuição de carga na carroceria/baú, acompanha pesagens em balanças e preenche diários de bordo e controle de jornada.',
    requirements_notes: 'Lei do Motorista (Lei nº 13.103/2015), Treinamento de Direção Defensiva, NR-11 (Transporte de Cargas), MOPP se transportar produtos perigosos',
    suggested_epis: ['Calçado de segurança com biqueira para momentos de carga/descarga', 'Luvas de vaqueta para amarração de cintas', 'Colete refletivo de alta visibilidade', 'Óculos de sol com proteção UV']
  },
  {
    code: '7822-20',
    title: 'Operador de Empilhadeira',
    synonyms: ['Operador de Empilhadeira a Combustão / Elétrica', 'Operador de Reach Stacker'],
    family_code: '7822',
    family_title: 'Operadores de equipamentos de movimentação de carga',
    category: 'LOGISTICA',
    description_mos: 'Opera empilhadeiras elétricas e a GLP/combustão para movimentação, empilhamento e desempilhamento de pallets em porta-paletes e estruturas de armazenagem vertical. Carrega e descarrega carretas e contêineres, realiza checklist diário pré-operacional de itens de segurança (buzina, freios, giroscópio, mastro e garfos), respeita limites de velocidade e capacidade máxima de carga.',
    requirements_notes: 'Treinamento de Capacitação NR-11 (Operador de Transporte e Movimentação de Cargas - Certificado e reciclagem periódica anual)',
    suggested_epis: ['Protetor auricular tipo plug ou concha', 'Calçado de segurança com biqueira', 'Colete refletivo de alta visibilidade', 'Óculos de proteção incolor']
  },
  {
    code: '7151-15',
    title: 'Operador de Escavadeira Hidráulica',
    synonyms: ['Operador de Máquinas Pesadas', 'Operador de Retroescavadeira', 'Operador de Trator de Esteira'],
    family_code: '7151',
    family_title: 'Operadores de máquinas de terraplenagem e fundações',
    category: 'CONSTRUCAO',
    description_mos: 'Opera escavadeiras hidráulicas sobre esteiras ou pneus para escavação de valas, cortes, aterros, nivelamento de terrenos e carregamento de caminhões basculantes em obras de terraplenagem e mineração. Executa manutenção básica e verificação diária de mangueiras hidráulicas, nível de óleo, esteiras e cabine ROPS/FOPS contra tombamento e queda de objetos.',
    requirements_notes: 'Treinamento Obrigatório NR-11 e NR-18 (Operação de Equipamentos Pesados de Terraplenagem), NR-12',
    suggested_epis: ['Protetor auricular tipo concha com alta atenuação (NRRsf)', 'Óculos de proteção com filtro UV', 'Calçado de segurança com biqueira', 'Colete refletivo classe 2']
  },
  {
    code: '7841-05',
    title: 'Operador de Carga e Descarga',
    synonyms: ['Ajudante de Carga e Descarga', 'Auxiliar de Logística Operacional', 'Chapa'],
    family_code: '7841',
    family_title: 'Trabalhadores de embalagem e movimentação manual de cargas',
    category: 'LOGISTICA',
    description_mos: 'Efetua carga e descarga manual ou com auxílio de paleteiras manuais de mercadorias em caminhões, furgões e armazéns logísticos. Organiza caixas, sacarias e produtos em pallets, realiza unitização com filme stretch, etiquetagem e conferência visual de avarias e quantidades de volumes.',
    requirements_notes: 'NR-17 (Ergonomia - Treinamento de Levantamento e Transporte Manual de Pesos), NR-11, NR-06',
    suggested_epis: ['Luvas de malha com banho antiderrapante ou nitrílico', 'Calçado de segurança com biqueira', 'Cinta ergonômica abdominal quando indicada por laudo ergonômico', 'Protetor auricular se em galpão ruidoso']
  },

  // SERVIÇOS GERAIS, LIMPEZA & ALIMENTAÇÃO
  {
    code: '5143-20',
    title: 'Faxineiro / Auxiliar de Limpeza',
    synonyms: ['Auxiliar de Serviços Gerais (ASG)', 'Zelador', 'Limpador de Instalações'],
    family_code: '5143',
    family_title: 'Trabalhadores dos serviços de manutenção de edifícios e limpeza',
    category: 'SERVICOS',
    description_mos: 'Executa a limpeza, desinfecção e conservação de pisos, paredes, janelas, sanitários, vestiários, salas de escritório e áreas comuns da empresa. Efetua a diluição e aplicação de produtos químicos de limpeza (desinfetantes, detergentes clorados, ceras e desincrustantes). Recolhe lixos comuns e recicláveis, higieniza lixeiras e repõe materiais descartáveis (papel toalha, papel higiênico e sabonete).',
    requirements_notes: 'Treinamento de Manuseio Seguro de Produtos Químicos de Limpeza (FISPQ / NR-01), NR-06, NR-35 se limpeza de vidros em altura',
    suggested_epis: ['Luvas de borracha nitrílica ou látex de cano longo', 'Avental impermeável de PVC', 'Bota de borracha impermeável com solado antiderrapante', 'Óculos de proteção contra respingos', 'Máscara PFF1 para odores fortes']
  },
  {
    code: '5132-05',
    title: 'Cozinheiro Geral',
    synonyms: ['Cozinheiro Industrial', 'Chefe de Cozinha'],
    family_code: '5132',
    family_title: 'Cozinheiros e trabalhadores de manipulação de alimentos',
    category: 'ALIMENTACAO',
    description_mos: 'Prepara e confecciona cardápios e refeições em cozinhas industriais e restaurantes comerciais. Opera fogões industriais, fornos combinados, fritadeiras, caldeiras e fatiadores mecânicos de alimentos. Realiza o corte, cozimento, fritura e assamento de carnes, legumes e guarnições, observando rigorosos padrões de boas práticas higiênico-sanitárias (ANVISA/RDC 216) e controle de temperaturas.',
    requirements_notes: 'NR-01, NR-06, NR-12 (Segurança de fatiadores e cortadores), Treinamento de Boas Práticas de Manipulação de Alimentos',
    suggested_epis: ['Avental térmico de silicone ou impermeável', 'Luva de malha de aço para corte com facas', 'Luvas térmicas de cano longo para fornos e caldeiras', 'Calçado de segurança ocupacional fechado e antiderrapante (NR-32/NR-24)', 'Touca descartável para cabelo']
  },
  {
    code: '5173-30',
    title: 'Vigilante',
    synonyms: ['Vigilante Patrimonial', 'Guarda de Segurança Privada'],
    family_code: '5173',
    family_title: 'Vigilantes e guardas de segurança',
    category: 'SERVICOS',
    description_mos: 'Executa rondas de vigilância e fiscalização nas dependências do estabelecimento para preservação do patrimônio e integridade física de clientes, colaboradores e visitantes. Controla o acesso de pessoas e veículos nas portarias, monitora sistemas de alarmes e CFTV, atua preventivamente na prevenção de sinistros e incêndios, e registra ocorrências em livro próprio.',
    requirements_notes: 'Curso de Formação e Reciclagem Bienal de Vigilante (Polícia Federal), Treinamento de Brigada de Incêndio (NR-23), NR-01',
    suggested_epis: ['Colete de proteção balística nível II / II-A (fornecimento obrigatório conforme Portaria PF)', 'Calçado de segurança tipo coturno com solado antiderrapante', 'Capa de chuva impermeável com faixas refletivas', 'Lanterna tática']
  },

  // ADMINISTRATIVO & GESTÃO
  {
    code: '4110-10',
    title: 'Assistente Administrativo',
    synonyms: ['Auxiliar Administrativo', 'Analista Administrativo Júnior', 'Escriturário'],
    family_code: '4110',
    family_title: 'Escriturários em geral e assistentes administrativos',
    category: 'ADMINISTRATIVO',
    description_mos: 'Executa rotinas administrativas em escritório, atuando na emissão e conferência de relatórios, digitação e conferência de documentos e planilhas, controle de arquivos digitais e físicos, atendimento telefônico e recepção de correspondências. Utiliza microcomputadores com teclado e mouse durante a jornada de trabalho, cumprindo pausas ergonômicas.',
    requirements_notes: 'NR-17 (Ergonomia em Trabalho com Equipamentos de Processamento Eletrônico de Dados), NR-01 (Integração de Segurança)',
    suggested_epis: ['Não há exigência rotineira de EPI para ambiente administrativo (NR-06)']
  },
  {
    code: '4141-05',
    title: 'Almoxarife',
    synonyms: ['Auxiliar de Almoxarifado', 'Estoquista', 'Encarregado de Estoque'],
    family_code: '4141',
    family_title: 'Almoxarifes e armazenistas',
    category: 'LOGISTICA',
    description_mos: 'Recebe, confere, armazena, controla e distribui materiais, ferramentas, insumos e EPIs no almoxarifado da empresa. Registra entradas e saídas no sistema ERP informatizado, controla estoque mínimo e validade de itens, organiza prateleiras e escaninhos e mantém fichas de entrega de EPI devidamente assinadas pelos trabalhadores conforme NR-06.',
    requirements_notes: 'NR-06 (Gestão e Registro de Ficha de EPI), NR-17 (Ergonomia no manuseio de caixas e embalagens)',
    suggested_epis: ['Calçado de segurança com biqueira de composite', 'Luvas de malha pigmentada para pega de caixas', 'Óculos de proteção incolor']
  },
  {
    code: '1421-05',
    title: 'Gerente Administrativo',
    synonyms: ['Diretor Administrativo', 'Coordenador Administrativo'],
    family_code: '1421',
    family_title: 'Gerentes administrativos, financeiros e de riscos',
    category: 'ADMINISTRATIVO',
    description_mos: 'Planeja, organiza e supervisiona as atividades administrativas, orçamentárias e de suporte operacional da empresa. Define diretrizes, monitora indicadores-chave de desempenho (KPIs), coordena equipes departamentais e aprova investimentos em programas de saúde, segurança e sustentabilidade corporativa.',
    requirements_notes: 'NR-01 (Liderança e Cultura de Gestão de Riscos Ocupacionais)',
    suggested_epis: ['Não aplicável para ambiente corporativo']
  },

  // SAÚDE & SEGURANÇA DO TRABALHO (SST)
  {
    code: '3516-05',
    title: 'Técnico em Segurança no Trabalho',
    synonyms: ['TST', 'Técnico de SST', 'Fiscal de Segurança do Trabalho'],
    family_code: '3516',
    family_title: 'Técnicos de segurança no trabalho',
    category: 'SAUDE_SST',
    description_mos: 'Inspeciona locais, instalações e equipamentos da empresa, identificando fatores de risco de acidentes e doenças ocupacionais para proposição de medidas de eliminação e controle (PGR/NR-01). Realiza integrações e treinamentos obrigatórios de segurança, investiga acidentes de trabalho com emissão de CAT, acompanha auditorias e fiscalizações do MTE, e inspeciona o fornecimento e uso correto de EPIs e EPCs.',
    requirements_notes: 'Registro Profissional no MTE / Ministério do Trabalho, Capacitação em NRs (NR-01, NR-05 CIPA, NR-06, NR-10, NR-18, NR-33, NR-35)',
    suggested_epis: ['Capacete de segurança com jugular', 'Óculos de proteção', 'Calçado de segurança com biqueira', 'Protetor auricular', 'Colete refletivo de identificação técnica']
  },
  {
    code: '2142-05',
    title: 'Engenheiro de Segurança do Trabalho',
    synonyms: ['Engenheiro de SST', 'Coordenador de Engenharia de Segurança'],
    family_code: '2142',
    family_title: 'Engenheiros de segurança do trabalho',
    category: 'SAUDE_SST',
    description_mos: 'Elabora, coordena e assina tecnicamente programas e laudos de engenharia de segurança do trabalho (PGR, LTCAT, Laudo de Insalubridade NR-15, Laudo de Periculosidade NR-16). Dimensiona sistemas de proteção coletiva (EPC) e equipamentos de proteção individual (EPI). Realiza avaliações quantitativas de agentes físicos, químicos e biológicos no ambiente de trabalho com instrumentação calibrada.',
    requirements_notes: 'Graduação em Engenharia/Arquitetura com Especialização em Engenharia de Segurança do Trabalho e Registro Ativo no CREA/CAU com emissão de ART/RRT',
    suggested_epis: ['Capacete com jugular', 'Calçado de segurança ocupacional', 'Óculos de segurança com proteção UV', 'EPIs específicos conforme área inspecionada']
  },
  {
    code: '2251-25',
    title: 'Médico do Trabalho',
    synonyms: ['Médico Coordenador do PCMSO', 'Médico Examinador Ocupacional'],
    family_code: '2251',
    family_title: 'Médicos clínicos e especialistas em medicina do trabalho',
    category: 'SAUDE_SST',
    description_mos: 'Elabora, implementa e coordena o Programa de Controle Médico de Saúde Ocupacional (PCMSO - NR-07). Realiza consultas médicas e exames clínicos ocupacionais (admissional, periódico, de retorno ao trabalho, de mudança de riscos e demissional), interpretando exames complementares e emitindo Atestados de Saúde Ocupacional (ASO). Avalia nexo causal de adoecimentos e emite relatórios analíticos anuais do PCMSO.',
    requirements_notes: 'Graduação em Medicina com Especialização/Residência em Medicina do Trabalho e Registro Ativo no CRM com RQE (Registro de Qualificação de Especialista)',
    suggested_epis: ['Jaleco médico de manga longa', 'Luvas de procedimento descartáveis para exames clínicos', 'Máscara cirúrgica ou N95/PFF2 se risco biológico']
  },
  {
    code: '2235-05',
    title: 'Enfermeiro do Trabalho',
    synonyms: ['Enfermeiro Ocupacional', 'Especialista em Enfermagem do Trabalho'],
    family_code: '2235',
    family_title: 'Enfermeiros e afins',
    category: 'SAUDE_SST',
    description_mos: 'Executa e coordena serviços de enfermagem do trabalho no ambulatório da empresa. Presta primeiros socorros a acidentados e enfermos, realiza triagens, aferição de sinais vitais e glicemia capilar, administra medicações prescritas, e agenda exames periódicos complementares em apoio à coordenação do PCMSO. Promove campanhas educativas de imunização, prevenção de ISTs e qualidade de vida no trabalho.',
    requirements_notes: 'Graduação em Enfermagem com Pós-graduação em Enfermagem do Trabalho e Registro Ativo no COREN',
    suggested_epis: ['Jaleco de proteção', 'Luvas de procedimento látex/nitrila', 'Máscara facial de proteção', 'Óculos de proteção biológica']
  },

  // SAÚDE CLÍNICA / ASSISTENCIAL
  {
    code: '3222-05',
    title: 'Técnico de Enfermagem',
    synonyms: ['Técnico de Enfermagem Assistencial', 'Técnico de Enfermagem do Trabalho'],
    family_code: '3222',
    family_title: 'Técnicos e auxiliares de enfermagem',
    category: 'SAUDE_SST',
    description_mos: 'Presta assistência de enfermagem a pacientes sob supervisão do enfermeiro. Realiza procedimentos como aferição de sinais vitais, administração de medicamentos orais e injetáveis, realização de curativos, punção venosa periférica e coleta de exames laboratoriais. Higieniza leitos e materiais e descarta perfurocortantes em coletores rígidos Descarpack conforme NR-32.',
    requirements_notes: 'Curso Técnico de Enfermagem e Registro no COREN. Capacitação obrigatória na NR-32 (Segurança e Saúde no Trabalho em Serviços de Saúde)',
    suggested_epis: ['Luvas de procedimento descartáveis', 'Avental descartável impermeável', 'Máscara cirúrgica / PFF2', 'Óculos de proteção ampla visão', 'Calçado fechado impermeável antiderrapante']
  },

  // QUÍMICA & LABORATÓRIO
  {
    code: '3111-05',
    title: 'Técnico em Química',
    synonyms: ['Analista Químico Júnior', 'Técnico de Controle de Qualidade Químico'],
    family_code: '3111',
    family_title: 'Técnicos de laboratório químico e análises',
    category: 'INDUSTRIA',
    description_mos: 'Coleta amostras de matérias-primas e produtos em processos industriais e realiza análises físico-químicas laboratoriais (titulação, pHmetria, cromatografia, espectrofotometria). Prepara reagentes químicos, padroniza soluções e opera capelas de exaustão química. Registra laudos e certificados analíticos cumprindo normas de segurança e descarte de resíduos químicos perigosos.',
    requirements_notes: 'Registro Ativo no CRQ (Conselho Regional de Química), Treinamento NR-01, NR-06 e NR-26 (Sinalização de Segurança e GHS / Rotulagem Preventiva)',
    suggested_epis: ['Jaleco de algodão 100% manga longa', 'Óculos de ampla visão contra respingos químicos', 'Luvas de nitrila ou neoprene', 'Respirador semifacial com cartucho para vapores químicos/ácidos']
  }
];

export function searchCBO(query: string, categoryFilter?: string): CBOItem[] {
  if (!query && !categoryFilter) return CBO_DATABASE.slice(0, 15);

  const cleanQuery = (query || '').toLowerCase().trim().replace(/[-.]/g, '');

  return CBO_DATABASE.filter(item => {
    if (categoryFilter && categoryFilter !== 'ALL' && item.category !== categoryFilter) {
      return false;
    }

    if (!cleanQuery) return true;

    const codeClean = item.code.replace(/[-.]/g, '');
    const codeMatch = codeClean.includes(cleanQuery) || item.code.includes(cleanQuery);
    const titleMatch = item.title.toLowerCase().includes(cleanQuery);
    const familyMatch = item.family_title.toLowerCase().includes(cleanQuery) || item.family_code.includes(cleanQuery);
    const synonymsMatch = item.synonyms?.some(s => s.toLowerCase().includes(cleanQuery));

    return codeMatch || titleMatch || familyMatch || synonymsMatch;
  });
}
