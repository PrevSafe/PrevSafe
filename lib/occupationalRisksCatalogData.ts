import { OccupationalRiskCatalogItem } from '@/types';

/**
 * CODIGOS DE EXAME CORRIGIDOS CONTRA A TABELA 27.
 *
 * Os 13 codigos distintos que este catalogo usava estavam TODOS errados: cada
 * um apontava para um agente quimico ou um anticorpo, nao para um exame.
 *
 *   0008 -> 1,2-gliceril dinitrato        (usado como "Avaliacao Clinica")
 *   0040 -> 2-naftilamina                 (usado como "Hemograma")
 *   0042 -> 3-alfa androstanediol         (usado como "Glicemia")
 *   0112 -> Acido lactico                 (usado como "Acuidade Visual" e "Psicossocial")
 *   0210 -> Anticoagulante lupico         (usado como "ECG")
 *   0215 -> Anticorpo antimieloperoxidase (usado como "EEG")
 *   0281 -> Audiometria tonal ocupacional (usado como "Espirometria")
 *   0295 -> Avaliacao clinica ocupacional (usado como "Audiometria")
 *   0310 -> Bartituratos                  (usado como "Sorologias")
 *   0312 -> Benzeno urinario              (usado como "Leptospirose")
 *   0411 -> Clorofenol                    (usado como "Radiografia OIT")
 *   0415 -> Coagulograma                  (usado como "Radiografia de Coluna")
 *   0514 -> Dimetiltiofosfato             (usado como "Acido Hipurico")
 *
 * Note 0281 e 0295: estavam TROCADOS entre si - a audiometria levava o codigo
 * da avaliacao clinica e a espirometria levava o da audiometria.
 *
 * Entradas compostas viraram varios exames, cada um com seu codigo: um codigo
 * so nao representa um painel, e escolher um deles perderia os demais.
 *
 * Os nomes sao agora os da Tabela 27 (lib/tabela27.ts), porque e a denominacao
 * publicada que vale perante o governo.
 */
export const INITIAL_OCCUPATIONAL_RISKS_CATALOG: OccupationalRiskCatalogItem[] = [
  // =========================================================================
  // GRUPO 1: RISCOS FÍSICOS (Código eSocial Grupo 01)
  // =========================================================================
  {
    id: 'risk-cat-01',
    code_table_24: '01.01.001',
    name: 'Ruído Contínuo ou Intermitente',
    group: 'FÍSICO',
    category_color: 'amber',
    generating_sources: 'Motores elétricos, compressores, prensas mecânicas, tornos CNC, serras circulares, esmerilhadeiras, tráfego pesado e ferramentas pneumáticas.',
    propagation_paths: 'Aérea (ondas de pressão sonora)',
    health_effects: 'Perda Auditiva Induzida por Ruído Ocupacional (PAIR / CID H83.3, H90), zumbido permanente (tinnitus), fadiga mental, estresse, hipertensão arterial, distúrbios do sono e redução da atenção.',
    evaluation_type: 'QUANTITATIVA',
    standard_unit: 'dB(A)',
    tolerance_limit_reference: '85.0 dB(A) para 8 horas de jornada (NR-15 Anexo 1 / NHO-01 Fundacentro, q=3)',
    action_level_reference: '80.0 dB(A) para 8 horas (NR-09 / Critério preventivo)',
    measurement_methodology: 'Dosimetria com medidor integrador de uso pessoal classe 1/2 conforme NHO-01 Fundacentro e IEC 61252',
    recommended_epcs: 'Enclausuramento acústico de máquinas ruidosas, barreiras acústicas absorventes, manutenção preventiva de rolamentos e amortecedores de vibração.',
    recommended_epis: [
      { ca_example: '14235', name: 'Protetor Auditivo tipo Plug de Silicone de Inserção', protection_type: 'AUDITIVA', attenuation: '16 dB NRRsf' },
      { ca_example: '29705', name: 'Protetor Auditivo tipo Concha / Abafador Supra-auricular', protection_type: 'AUDITIVA', attenuation: '22 dB NRRsf' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0281', exam_name: 'Audiometria tonal ocupacional', periodicity_months: 6, triggers: ['ADMISSIONAL', 'PERIODICO', 'MUDANCA_RISCO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' },
      { exam_code: '0285', exam_name: 'Audiometria vocal - Pesquisa de limiar de inteligibilidade', periodicity_months: 6, triggers: ['ADMISSIONAL', 'PERIODICO', 'MUDANCA_RISCO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' },
      { exam_code: '0295', exam_name: 'Avaliação clínica ocupacional (anamnese e exame físico)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' },
      { exam_code: '0291', exam_name: 'Avaliação clínica com ênfase neurossensorial (anamnese e exame físico)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 3,
    default_probability: 3,
    special_retirement_eligible: true,
    gfip_code_suggested: '04', // 25 anos
    insalubridade_applicable: true,
    insalubridade_degree_suggested: '20%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 1 - Limites de Tolerância para Ruído Contínuo ou Intermitente',
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-02',
    code_table_24: '01.01.002',
    name: 'Ruído de Impacto',
    group: 'FÍSICO',
    category_color: 'amber',
    generating_sources: 'Prensas de estampagem pesada, marteletes pneumáticos, forjarias, detonações de rochas e guilhotinas industriais.',
    propagation_paths: 'Aérea (picos instantâneos de pressão sonora com duração inferior a 1 segundo)',
    health_effects: 'Trauma acústico agudo (CID H83.3), perfuração de membrana timpânica, perda auditiva súbita e desorientação espacial.',
    evaluation_type: 'QUANTITATIVA',
    standard_unit: 'dB (linear) / dB(C)',
    tolerance_limit_reference: '130 dB (linear) ou 120 dB(C) fast (NR-15 Anexo 2)',
    action_level_reference: '120 dB (linear)',
    measurement_methodology: 'Medidor de nível de pressão sonora operando em circuito de pico ou resposta rápida conforme NHO-01',
    recommended_epcs: 'Isolamento de bases de fundação com coxins amortecedores, cabines blindadas com vidro duplo.',
    recommended_epis: [
      { ca_example: '32840', name: 'Dupla Proteção Auditiva: Abafador Concha + Plug de Espuma', protection_type: 'AUDITIVA', attenuation: '27 dB NRRsf combinada' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0281', exam_name: 'Audiometria tonal ocupacional', periodicity_months: 6, triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' },
      { exam_code: '0285', exam_name: 'Audiometria vocal - Pesquisa de limiar de inteligibilidade', periodicity_months: 6, triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 4,
    default_probability: 2,
    special_retirement_eligible: true,
    gfip_code_suggested: '04',
    insalubridade_applicable: true,
    insalubridade_degree_suggested: '20%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 2 - Limites de Tolerância para Ruídos de Impacto',
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-03',
    code_table_24: '01.01.003',
    name: 'Calor e Sobrecarga Térmica (IBUTG)',
    group: 'FÍSICO',
    category_color: 'amber',
    generating_sources: 'Fornos industriais de fundição, caldeiras, estufas de secagem, processos de tratamento térmico e trabalho a céu aberto sob radiação solar.',
    propagation_paths: 'Radiação infravermelha, condução e convecção térmica ambiental',
    health_effects: 'Intermação / insolação (CID T67.0), síncope por calor, desidratação severa, cãibras, sobrecarga cardiovascular e distúrbios hidroeletrolíticos.',
    evaluation_type: 'QUANTITATIVA',
    standard_unit: 'IBUTG (°C)',
    tolerance_limit_reference: 'Quadro 1 e 2 do Anexo 3 da NR-15 e NHO-06 Fundacentro (função da taxa metabólica em Watts)',
    action_level_reference: 'IBUTG correspondente ao limite de tolerância menos 1.0 °C',
    measurement_methodology: 'Termômetro de Globo IBUTG digital conforme NHO-06 Fundacentro com cálculo de taxa metabólica',
    recommended_epcs: 'Barreiras refletivas de calor, climatização e insuflamento de ar fresco, exaustão localizada e áreas de descanso termicamente confortáveis.',
    recommended_epis: [
      { ca_example: '35120', name: 'Vestimenta de Proteção Térmica / Avental e Mangote Aluminizado', protection_type: 'TRONCO', attenuation: 'Proteção contra calor radiante até 500°C' },
      { ca_example: '28410', name: 'Luva de Grafite / Fibra de Kevlar resistente a alta temperatura', protection_type: 'MEMBROS_SUPERIORES' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0530', exam_name: 'ECG (Eletrocardiograma) convencional de até 12 derivações', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' },
      { exam_code: '0693', exam_name: 'Hemograma com contagem de plaquetas ou frações (eritrograma, leucograma, plaquetas)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' },
      { exam_code: '1127', exam_name: 'Sódio', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' },
      { exam_code: '1022', exam_name: 'Potássio', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' },
      { exam_code: '1242', exam_name: 'Uréia', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' },
      { exam_code: '0456', exam_name: 'Creatinina', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 3,
    default_probability: 3,
    special_retirement_eligible: true,
    gfip_code_suggested: '04',
    insalubridade_applicable: true,
    insalubridade_degree_suggested: '20%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 3 - Limites de Tolerância para Exposição ao Calor',
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-04',
    code_table_24: '01.01.006',
    name: 'Vibrações de Corpo Inteiro (VCI)',
    group: 'FÍSICO',
    category_color: 'amber',
    generating_sources: 'Operação de tratores, caminhões fora-de-estrada, retroescavadeiras, empilhadeiras em pisos irregulares e trens.',
    propagation_paths: 'Mecânica pelo assento do operador e plataforma dos pés',
    health_effects: 'Lombalgias crônicas, hérnias discais (CID M51.2), degeneração articular da coluna vertebral e alterações do sistema circulatório.',
    evaluation_type: 'QUANTITATIVA',
    standard_unit: 'aren (m/s²) / VDVR (m/s^1.75)',
    tolerance_limit_reference: 'aren = 1.1 m/s² ou VDVR = 21.0 m/s^1.75 (NR-15 Anexo 8 e NHO-09)',
    action_level_reference: 'aren = 0.5 m/s² ou VDVR = 9.1 m/s^1.75 (NR-09)',
    measurement_methodology: 'Medidor triaxial de vibração humana com acelerômetro de assento (disco semirrígido) conforme NHO-09 e ISO 2631-1',
    recommended_epcs: 'Bancos ergonômicos com suspensão pneumática ativa calibrada ao peso do operador, nivelamento de pisos de tráfego.',
    recommended_epis: [
      { ca_example: '39410', name: 'Calçado com sistema de absorção de impacto no calcanhar', protection_type: 'MEMBROS_INFERIORES' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '1075', exam_name: 'Radiografia de coluna lombo-sacra', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' },
      { exam_code: '1074', exam_name: 'Radiografia de coluna dorsal', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 3,
    default_probability: 2,
    special_retirement_eligible: true,
    gfip_code_suggested: '04',
    insalubridade_applicable: true,
    insalubridade_degree_suggested: '20%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 8 - Vibrações de Corpo Inteiro',
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-05',
    code_table_24: '01.01.007',
    name: 'Vibrações de Mãos e Braços (VMB)',
    group: 'FÍSICO',
    category_color: 'amber',
    generating_sources: 'Uso contínuo de motosserras, marteletes demolidores, lixadeiras angulares, parafusadeiras de impacto e perfuratrizes.',
    propagation_paths: 'Mecânica transmitida pelas empunhaduras e ferramentas portáteis',
    health_effects: 'Síndrome de Raynaud ocupacional / "dedo branco" induzido por vibração (CID I73.0), neuropatia periférica, artrose de punho e cotovelo.',
    evaluation_type: 'QUANTITATIVA',
    standard_unit: 'aren (m/s²)',
    tolerance_limit_reference: 'aren = 5.0 m/s² para 8 horas (NR-15 Anexo 8 e NHO-10)',
    action_level_reference: 'aren = 2.5 m/s² para 8 horas (NR-09)',
    measurement_methodology: 'Acelerômetro triaxial acoplado à empunhadura conforme NHO-10 Fundacentro e ISO 5349-1/2',
    recommended_epcs: 'Substituição por ferramentas pneumáticas com balancins e sistemas internos antivibratórios, rodízio de operadores.',
    recommended_epis: [
      { ca_example: '38140', name: 'Luva de Proteção Antivibração com gomos de polímero certificados ISO 10819', protection_type: 'MEMBROS_SUPERIORES' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0286', exam_name: 'Avaliação clínica com ênfase cardiocirculatória (anamnese e exame físico)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 3,
    default_probability: 3,
    special_retirement_eligible: true,
    gfip_code_suggested: '04',
    insalubridade_applicable: true,
    insalubridade_degree_suggested: '20%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 8 - Vibrações de Mãos e Braços',
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-06',
    code_table_24: '01.01.004',
    name: 'Radiações Não-Ionizantes (UV / Infravermelho de Solda e Laser)',
    group: 'FÍSICO',
    category_color: 'amber',
    generating_sources: 'Processos de soldagem a arco elétrico (MIG/MAG, TIG, Eletrodo Revestido), corte a plasma, fornos de fusão e lasers industriais.',
    propagation_paths: 'Radiação eletromagnética óptica não ionizante',
    health_effects: 'Fotoqueratite / ceratoconjuntivite actínica (CID H16.1), queimaduras cutâneas por radiação ultravioleta, catarata ocupacional e eritema.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'W/cm² / Densidade de potência',
    tolerance_limit_reference: 'Critério qualitativo e limites da ACGIH TLV / NR-15 Anexo 7',
    measurement_methodology: 'Avaliação técnica qualitativa dos postos de corte e soldagem',
    recommended_epcs: 'Biombos de solda com cortinas retráteis opacas antichama, exaustão mecânica de fumos.',
    recommended_epis: [
      { ca_example: '38190', name: 'Máscara de Solda Automática com Escurecimento DIN 9-13', protection_type: 'OLHOS_FACE' },
      { ca_example: '29792', name: 'Óculos de Segurança com Lente de Tonalidade Específica', protection_type: 'OLHOS_FACE' },
      { ca_example: '10786', name: 'Vestimenta de Raspa de Couro (Avental, Mangotes e Perneiras)', protection_type: 'TRONCO' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '1432', exam_name: 'Exame oftalmológico com avaliação de retina e/ou cristalino', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' },
      { exam_code: '0296', exam_name: 'Avaliação da acuidade visual', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 3,
    default_probability: 3,
    special_retirement_eligible: false,
    gfip_code_suggested: '01',
    insalubridade_applicable: true,
    insalubridade_degree_suggested: '20%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 7 - Radiações Não-Ionizantes',
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-07',
    code_table_24: '01.01.008',
    name: 'Frio e Câmaras Frigoríficas',
    group: 'FÍSICO',
    category_color: 'amber',
    generating_sources: 'Câmaras de congelamento e resfriamento, túneis de congelamento rápido, abate e desossa em frigoríficos.',
    propagation_paths: 'Convecção e contato térmico',
    health_effects: 'Hipotermia ocupacional (CID T68), congelamento de extremidades / frostbite (CID T33), bronquite asmática e perda de sensibilidade tátil.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: '°C (Temperatura do ar)',
    tolerance_limit_reference: 'Temperaturas inferiores a 10°C / 12°C dependendo da zona climática nacional (Art. 253 da CLT e NR-15 Anexo 9)',
    measurement_methodology: 'Termohigrômetro calibrado e cálculo do índice de sensação térmica Wind Chill',
    recommended_epcs: 'Ante-câmaras térmicas com cortinas de ar e cortinas de tiras de PVC flexível.',
    recommended_epis: [
      { ca_example: '32190', name: 'Conjunto Frigorífico Térmico Completo com Capuz para até -40°C', protection_type: 'CORPO_INTEIRO' },
      { ca_example: '28114', name: 'Bota Térmica de Poliuretano com Forração de Lã Sintética', protection_type: 'MEMBROS_INFERIORES' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '1057', exam_name: 'Prova de função pulmonar completa (ou espirometria)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 3,
    default_probability: 3,
    special_retirement_eligible: false,
    gfip_code_suggested: '01',
    insalubridade_applicable: true,
    insalubridade_degree_suggested: '20%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 9 - Frio',
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },

  // =========================================================================
  // GRUPO 2: RISCOS QUÍMICOS (Código eSocial Grupo 02)
  // =========================================================================
  {
    id: 'risk-cat-08',
    code_table_24: '02.01.014',
    name: 'Fumos Metálicos (Manganês, Ferro, Cromo, Níquel)',
    group: 'QUÍMICO',
    category_color: 'purple',
    generating_sources: 'Soldagem a arco elétrico (MIG/MAG, TIG, Eletrodo Revestido), corte térmico a maçarico oxicorte/plasma e goivagem.',
    propagation_paths: 'Respiratória (inalação de partículas sólidas geradas por condensação de vapores metálicos)',
    health_effects: 'Febre dos fumos metálicos (CID T56.0), pneumoconiose dos soldadores (siderose / CID J63.4), manganismo (sintomas parkinsonianos) e irritação das vias aéreas superiores.',
    evaluation_type: 'QUANTITATIVA',
    standard_unit: 'mg/m³',
    tolerance_limit_reference: 'Manganês: 0.1 mg/m³ (Fração inalável NR-15 / ACGIH); Fumos de Ferro: 5.0 mg/m³',
    action_level_reference: '50% do Limite de Tolerância (NR-09)',
    measurement_methodology: 'Bomba gravimétrica de amostragem pessoal com cassete de 37mm e filtro de éster de celulose conforme NIOSH 7300 / NHO-08',
    recommended_epcs: 'Braços articulados de exaustão localizada na tocha de solda, mesas aspiradas e sistemas de filtragem ciclônica.',
    recommended_epis: [
      { ca_example: '38507', name: 'Respirador Semifacial Descartável PFF2 com Válvula e Carvão Ativado', protection_type: 'RESPIRATORIA' },
      { ca_example: '41120', name: 'Respirador Semifacial Reutilizável com Filtro P3 para Vapores e Fumos', protection_type: 'RESPIRATORIA' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '1078', exam_name: 'Radiografia de tórax (PA) Padrão OIT (o mais recente), com dois leitores habilitados', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' },
      { exam_code: '1057', exam_name: 'Prova de função pulmonar completa (ou espirometria)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' },
      { exam_code: '0693', exam_name: 'Hemograma com contagem de plaquetas ou frações (eritrograma, leucograma, plaquetas)', periodicity_months: 6, triggers: ['PERIODICO'], mandatory_standard: 'NR-07' },
      { exam_code: '0835', exam_name: 'Manganês urinário', periodicity_months: 6, triggers: ['PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 4,
    default_probability: 3,
    special_retirement_eligible: true,
    gfip_code_suggested: '04', // 25 anos
    insalubridade_applicable: true,
    insalubridade_degree_suggested: '20%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 12 - Limites de Tolerância para Poeiras Minerais e Fumos Metálicos',
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-09',
    code_table_24: '02.01.001',
    name: 'Poeiras Minerais / Sílica Livre Cristalizada (Quartzo)',
    group: 'QUÍMICO',
    category_color: 'purple',
    generating_sources: 'Corte e britagem de concreto, corte de pedras decorativas (granito/mármore), jateamento de areia, perfuração de túneis e assentamento de alvenaria.',
    propagation_paths: 'Respiratória (inalação da fração respirável da sílica < 5 micrômetros)',
    health_effects: 'Silicose aguda e crônica (CID J62.8), fibrose pulmonar irreversível, aumento de risco de tuberculose pulmonar e câncer de pulmão (Grupo 1 IARC).',
    evaluation_type: 'QUANTITATIVA',
    standard_unit: 'mg/m³ (fração respirável)',
    tolerance_limit_reference: 'Fórmula NR-15 Anexo 12: L.T. = 8 / (% Quartzo + 2) mg/m³ ou 0.05 mg/m³ (ACGIH)',
    action_level_reference: '0.025 mg/m³ (NR-09 / ACGIH)',
    measurement_methodology: 'Amostragem com ciclone de nylon e filtro de PVC 37mm 5.0µm + Difratometria de Raios-X (NIOSH 7500 / NHO-08)',
    recommended_epcs: 'Processos úmidos de corte (aspersão constante de água), enclausuramento de moinhos e exaustão com filtros manga HEPA.',
    recommended_epis: [
      { ca_example: '41120', name: 'Respirador Semifacial com Filtro P100 / P3 de Alta Eficiência', protection_type: 'RESPIRATORIA' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '1078', exam_name: 'Radiografia de tórax (PA) Padrão OIT (o mais recente), com dois leitores habilitados', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' },
      { exam_code: '1057', exam_name: 'Prova de função pulmonar completa (ou espirometria)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 5,
    default_probability: 2,
    special_retirement_eligible: true,
    gfip_code_suggested: '04',
    insalubridade_applicable: true,
    insalubridade_degree_suggested: '40%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 12 - Poeiras Minerais (Sílica Livre Cristalizada)',
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-10',
    code_table_24: '02.01.025',
    name: 'Vapores Orgânicos e Hidrocarbonetos Aromáticos (Tolueno, Xileno, Thinner)',
    group: 'QUÍMICO',
    category_color: 'purple',
    generating_sources: 'Pintura a pistola em cabines e campo, desengraxe de peças mecânicas, aplicação de resinas epóxi, vernizes e solventes de limpeza.',
    propagation_paths: 'Respiratória e dérmica (absorção cutânea direta)',
    health_effects: 'Intoxicação por solventes (CID T52.8), cefaleia, narcose, tontura, dermatite de contato e danos hepatorrenais.',
    evaluation_type: 'QUANTITATIVA',
    standard_unit: 'ppm / mg/m³',
    tolerance_limit_reference: 'Tolueno: 78 ppm (NR-15 Anexo 11) / Xileno: 78 ppm',
    action_level_reference: '39 ppm (50% do Limite de Tolerância)',
    measurement_methodology: 'Tubos de carvão ativado com bomba de baixa vazão (NIOSH 1501 / NHO-07) e cromatografia gasosa',
    recommended_epcs: 'Cabines de pintura com cortina d água e exaustão contínua com filtros de carvão ativado.',
    recommended_epis: [
      { ca_example: '41120', name: 'Respirador Semifacial com Cartucho Químico para Vapores Orgânicos (VO)', protection_type: 'RESPIRATORIA' },
      { ca_example: '32014', name: 'Luva de Proteção em Borracha Nitrílica Sol-Vex resistente a solventes', protection_type: 'MEMBROS_SUPERIORES' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0109', exam_name: 'Ácido hipúrico', periodicity_months: 6, triggers: ['PERIODICO', 'RETORNO_TRABALHO'], mandatory_standard: 'NR-07' },
      { exam_code: '0116', exam_name: 'Ácido metilhipúrico', periodicity_months: 6, triggers: ['PERIODICO', 'RETORNO_TRABALHO'], mandatory_standard: 'NR-07' },
      { exam_code: '0693', exam_name: 'Hemograma com contagem de plaquetas ou frações (eritrograma, leucograma, plaquetas)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' },
      { exam_code: '1204', exam_name: 'Transaminase oxalacética (amino transferase aspartato)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' },
      { exam_code: '1205', exam_name: 'Transaminase pirúvica (amino transferase de alanina)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' },
      { exam_code: '0652', exam_name: 'Gama-glutamil transferase (gama-GT)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 4,
    default_probability: 3,
    special_retirement_eligible: true,
    gfip_code_suggested: '04',
    insalubridade_applicable: true,
    insalubridade_degree_suggested: '20%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 11 e 13 - Agentes Químicos e Hidrocarbonetos',
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-11',
    code_table_24: '02.01.040',
    name: 'Ácidos e Álcalis Cáusticos (Ácido Sulfúrico, Clorídrico, Soda Cáustica)',
    group: 'QUÍMICO',
    category_color: 'purple',
    generating_sources: 'Banhos de decapagem galvânica, estações de tratamento de efluentes (ETE), recarga e manutenção de baterias chumbo-ácido.',
    propagation_paths: 'Inalação de névoas ácidas e contato dérmico/ocular direto por respingos',
    health_effects: 'Queimaduras químicas graves na pele e olhos (CID T20-T32), ulcerações na mucosa nasal, erosão dentária e bronquite química.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'mg/m³ / ppm',
    tolerance_limit_reference: 'Avaliação qualitativa conforme NR-15 Anexo 13',
    measurement_methodology: 'Inspeção de processos, checagem de FISPQ/FDS e rotulagem GHS conforme NR-26',
    recommended_epcs: 'Lava-olhos e chuveiro de emergência próximos, bacias de contenção de vazamentos e neutralizadores químicos.',
    recommended_epis: [
      { ca_example: '31290', name: 'Óculos de Ampla Visão / Protetor Facial de Policarbonato', protection_type: 'OLHOS_FACE' },
      { ca_example: '29810', name: 'Luva de PVC Cano Longo resistente a ácidos e bases', protection_type: 'MEMBROS_SUPERIORES' },
      { ca_example: '30412', name: 'Avental Impermeável de PVC / Trevira', protection_type: 'TRONCO' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '1432', exam_name: 'Exame oftalmológico com avaliação de retina e/ou cristalino', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' },
      { exam_code: '0287', exam_name: 'Avaliação clínica com ênfase dermatológica (anamnese e exame físico)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 4,
    default_probability: 2,
    special_retirement_eligible: false,
    gfip_code_suggested: '01',
    insalubridade_applicable: true,
    insalubridade_degree_suggested: '20%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 13 - Fabricação e manuseio de ácidos e álcalis cáusticos',
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-12',
    code_table_24: '02.01.060',
    name: 'Óleos Minerais e Graxas Derivadas de Petróleo',
    group: 'QUÍMICO',
    category_color: 'purple',
    generating_sources: 'Usinagem de peças metálicas com fluido de corte solúvel/integral, lubrificação mecânica de motores e caixas de transmissão.',
    propagation_paths: 'Contato dérmico direto com as mãos e antebraços e névoas suspensas',
    health_effects: 'Dermatite de contato ocupacional (CID L23-L25), elaioconiose folicular (cravo de graxa), fotossensibilização e lesões pré-cancerosas.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'mg/m³',
    tolerance_limit_reference: 'Avaliação qualitativa conforme NR-15 Anexo 13 e 5 mg/m³ para névoas minerais (ACGIH)',
    measurement_methodology: 'Avaliação de campo do tempo de contato dérmico e inspeção de FISPQs',
    recommended_epcs: 'Carenagens de proteção de máquinas operatrizes contra névoas de óleo de corte, skimmers separadores.',
    recommended_epis: [
      { ca_example: '32014', name: 'Luva de Borracha Nitrílica ou Neoprene impermeável', protection_type: 'MEMBROS_SUPERIORES' },
      { ca_example: '24110', name: 'Creme Protetor de Segurança com CA contra óleos e solventes', protection_type: 'MEMBROS_SUPERIORES' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0287', exam_name: 'Avaliação clínica com ênfase dermatológica (anamnese e exame físico)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 3,
    default_probability: 3,
    special_retirement_eligible: true,
    gfip_code_suggested: '04',
    insalubridade_applicable: true,
    insalubridade_degree_suggested: '40%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 13 - Hidrocarbonetos e Outros Compostos de Carbono (Manipulação de óleos minerais)',
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },

  // =========================================================================
  // GRUPO 3: RISCOS BIOLÓGICOS (Código eSocial Grupo 03)
  // =========================================================================
  {
    id: 'risk-cat-13',
    code_table_24: '03.01.001',
    name: 'Microorganismos Patogênicos (Vírus, Bactérias, Fungos em Saúde)',
    group: 'BIOLÓGICO',
    category_color: 'emerald',
    generating_sources: 'Atendimento a pacientes em hospitais, clínicas, prontos-socorros, UTIs, enfermarias de isolamento e laboratórios de análises clínicas.',
    propagation_paths: 'Aérea por gotículas e aerossóis, contato dérmico, inoculação acidental por perfurocortantes (sangue e fluidos)',
    health_effects: 'Infecções ocupacionais por HIV, Hepatite B e C (CID B16-B18), Tuberculose (CID A15), infecções bacterianas multirresistentes.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'Qualitativa',
    tolerance_limit_reference: 'Avaliação qualitativa conforme NR-15 Anexo 14 e NR-32',
    measurement_methodology: 'Mapeamento de postos, descarte de perfurocortantes e protocolos da NR-32',
    recommended_epcs: 'Caixas de descarte de perfurocortantes rígidas com trava, fluxo laminar em capelas biológicas, quartos de pressão negativa.',
    recommended_epis: [
      { ca_example: '38507', name: 'Respirador N95 / PFF2 sem válvula de exalação', protection_type: 'RESPIRATORIA' },
      { ca_example: '18920', name: 'Luvas de Procedimento Não Cirúrgico em Nitrila ou Látex', protection_type: 'MEMBROS_SUPERIORES' },
      { ca_example: '29792', name: 'Óculos de Segurança com Proteção Lateral e Protetor Facial', protection_type: 'OLHOS_FACE' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0704', exam_name: 'Hepatite B - HBsAC (anti-HBs)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' },
      { exam_code: '0705', exam_name: 'Hepatite C - Anti-HCV - IgG', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' },
      { exam_code: '0733', exam_name: 'HIV1 ou HIV2, pesquisa de anticorpos', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' },
      { exam_code: '1123', exam_name: 'Sífilis - VDRL', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' },
      { exam_code: '1430', exam_name: 'Radiografia de tórax em visão anteroposterior e de perfil', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 4,
    default_probability: 3,
    special_retirement_eligible: true,
    gfip_code_suggested: '04', // 25 anos
    insalubridade_applicable: true,
    insalubridade_degree_suggested: '40%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 14 - Agentes Biológicos (Contato permanente com pacientes em isolamento ou material infectocontagiante)',
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-14',
    code_table_24: '03.01.002',
    name: 'Contato com Esgotos, Galerias e Resíduos Urbanos',
    group: 'BIOLÓGICO',
    category_color: 'emerald',
    generating_sources: 'Coleta de lixo domiciliar/urbano, limpeza e desobstrução de galerias de esgoto sanitário, estações de tratamento e tanques sépticos.',
    propagation_paths: 'Contato dérmico, inalação de bioaerossóis e contaminação oral-fecal',
    health_effects: 'Leptospirose (CID A27), hepatite A, tétano (CID A35), parasitoses intestinais e dermatites infecciosas.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'Qualitativa',
    tolerance_limit_reference: 'Critério qualitativo de contato habitual conforme NR-15 Anexo 14',
    measurement_methodology: 'Inspeção in loco das tarefas de higienização e saneamento',
    recommended_epcs: 'Sistemas automatizados de bombeamento de efluentes, desinfecção de redes.',
    recommended_epis: [
      { ca_example: '35410', name: 'Macacão Impermeável de Proteção Química e Biológica', protection_type: 'CORPO_INTEIRO' },
      { ca_example: '29810', name: 'Luva de PVC / Borracha Nitrílica Cano Extra Longo', protection_type: 'MEMBROS_SUPERIORES' },
      { ca_example: '24190', name: 'Bota de Borracha PVC de Cano Longo e Biqueira de Aço', protection_type: 'MEMBROS_INFERIORES' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0800', exam_name: 'Leptospirose - IgG', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 4,
    default_probability: 3,
    special_retirement_eligible: true,
    gfip_code_suggested: '04',
    insalubridade_applicable: true,
    insalubridade_degree_suggested: '40%',
    insalubridade_legal_basis: 'NR-15 Anexo nº 14 - Esgotos (galerias e tanques) e Lixo Urbano',
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },

  // =========================================================================
  // GRUPO 4: RISCOS ERGONÔMICOS (Código eSocial Grupo 04 / NR-17)
  // =========================================================================
  {
    id: 'risk-cat-15',
    code_table_24: '04.01.001',
    name: 'Levantamento, Transporte e Descarga Manual de Cargas Pesadas',
    group: 'ERGONÔMICO',
    category_color: 'blue',
    generating_sources: 'Carregamento manual de sacarias de 25kg/50kg, caixas, lingotes metálicos, tambores e peças de reposição pesadas.',
    propagation_paths: 'Biomecânica corporal com sobrecarga na coluna lombar e membros',
    health_effects: 'Lombalgias agudas e crônicas (CID M54.5), hérnia de disco lombar (CID M51.2), contraturas musculares e lesões ligamentares.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'Equação de NIOSH (Índice de Levantamento IL)',
    tolerance_limit_reference: 'Limite de 25 kg para homens adultos (Normas Internacionais / NR-17 item 17.5)',
    action_level_reference: 'IL > 1.0 (Equação de NIOSH)',
    measurement_methodology: 'Análise Ergonômica do Trabalho (AET) aplicando Equação de NIOSH, checklist Moore-Garg e OWAS',
    recommended_epcs: 'Talhas elétricas, pontes rolantes, carrinhos hidráulicos de transporte, mesas pantográficas ajustáveis na altura de pega.',
    recommended_epis: [
      { ca_example: '10786', name: 'Luvas de vaqueta com aderência reforçada na palma', protection_type: 'MEMBROS_SUPERIORES' },
      { ca_example: '41419', name: 'Calçado com solado antiderrapante e absorção de impacto', protection_type: 'MEMBROS_INFERIORES' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0292', exam_name: 'Avaliação clínica com ênfase ortopédica (anamnese e exame físico)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO', 'MUDANCA_RISCO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 3,
    default_probability: 3,
    special_retirement_eligible: false,
    gfip_code_suggested: '01',
    insalubridade_applicable: false,
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-16',
    code_table_24: '04.01.002',
    name: 'Exigência de Posturas Incômodas, Estáticas ou Forçadas por Longos Períodos',
    group: 'ERGONÔMICO',
    category_color: 'blue',
    generating_sources: 'Trabalho contínuo em pé sem pausas, agachado em manutenção veicular, braços elevados acima do ombro ou tronco flexionado.',
    propagation_paths: 'Biomecânica e circulação venosa',
    health_effects: 'Cervicalgias (CID M54.2), síndrome do impacto no ombro / tendinite do manguito rotador (CID M75.1), varizes de membros inferiores e fadiga postural.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'Pontuação RULA / REBA',
    tolerance_limit_reference: 'Critério qualitativo e níveis de ação da Análise Ergonômica do Trabalho (NR-17)',
    measurement_methodology: 'Método RULA (Rapid Upper Limb Assessment) e REBA (Rapid Entire Body Assessment)',
    recommended_epcs: 'Tapetes antifadiga ergonômicos em postos em pé, bancadas com regulagem elétrica de altura, cadeiras ergonômicas NR-17 com suporte lombar e braços reguláveis.',
    recommended_epis: [],
    suggested_exams_pcmso: [
      { exam_code: '0292', exam_name: 'Avaliação clínica com ênfase ortopédica (anamnese e exame físico)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 3,
    default_probability: 3,
    special_retirement_eligible: false,
    gfip_code_suggested: '01',
    insalubridade_applicable: false,
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-17',
    code_table_24: '04.01.003',
    name: 'Movimentos Repetitivos de Membros Superiores (Digitação, Montagem)',
    group: 'ERGONÔMICO',
    category_color: 'blue',
    generating_sources: 'Linhas de montagem rápida industrial, corte e desossa em frigoríficos, digitação contínua e operação de caixas de supermercado.',
    propagation_paths: 'Esforço mecânico contínuo em tendões, bainhas e nervos',
    health_effects: 'Distúrbios Osteomusculares Relacionados ao Trabalho (DORT / LER), Síndrome do Túnel do Carpo (CID G56.0), Tenossinovite de De Quervain (CID M65.4) e Epicondilite lateral.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'Índice OCRA / Strain Index',
    tolerance_limit_reference: 'Critérios da AET conforme NR-17 e ISO 11228-3',
    action_level_reference: 'Pontuação OCRA > 2.2',
    measurement_methodology: 'Método OCRA Checklist e Strain Index (Moore-Garg)',
    recommended_epcs: 'Rodízio programado de tarefas, pausas psicofisiológicas obrigatórias de 10 minutos a cada 50 minutos de trabalho, ferramentas com empunhaduras neutras.',
    recommended_epis: [],
    suggested_exams_pcmso: [
      { exam_code: '0292', exam_name: 'Avaliação clínica com ênfase ortopédica (anamnese e exame físico)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 3,
    default_probability: 3,
    special_retirement_eligible: false,
    gfip_code_suggested: '01',
    insalubridade_applicable: false,
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },

  // =========================================================================
  // GRUPO 5: RISCOS DE ACIDENTES / MECÂNICOS (Código eSocial Grupo 05)
  // =========================================================================
  {
    id: 'risk-cat-18',
    code_table_24: '05.01.001',
    name: 'Risco de Queda com Diferença de Nível / Trabalho em Altura (NR-35)',
    group: 'ACIDENTES',
    category_color: 'rose',
    generating_sources: 'Atividades executadas acima de 2,00m do nível inferior com risco de queda: andaimes, telhados, escadas móveis, torres de transmissão e plataformas elevatórias.',
    propagation_paths: 'Energia gravitacional potencial de impacto em solo ou obstáculos',
    health_effects: 'Politraumatismo severo (CID T07), traumatismo cranioencefálico (TCE / CID S06), fraturas ósseas múltiplas, lesão medular irreversível e óbito.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'Qualitativa (PGR Matriz 5x5)',
    tolerance_limit_reference: 'Altura superior a 2,00 metros (NR-35)',
    measurement_methodology: 'Permissão de Trabalho (PT), Análise Preliminar de Risco (APR) e inspeção de pontos de ancoragem certificados conforme NBR 16325',
    recommended_epcs: 'Linhas de vida horizontais/verticais certificadas, guarda-corpos e rodapés metálicos rígidos (altura 1,20m / 0,70m), redes de proteção.',
    recommended_epis: [
      { ca_example: '36014', name: 'Cinturão de Segurança tipo Paraquedista 5 pontos com Talabarte Y com ABS', protection_type: 'ALTURA_QUEDA' },
      { ca_example: '31469', name: 'Capacete de Segurança Classe B com Tira Jugular de 3 pontas', protection_type: 'CABECA' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0530', exam_name: 'ECG (Eletrocardiograma) convencional de até 12 derivações', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-35' },
      { exam_code: '0536', exam_name: 'EEG (Eletroencefalograma) de rotina', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-35' },
      { exam_code: '0658', exam_name: 'Glicemia', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-35' },
      { exam_code: '0693', exam_name: 'Hemograma com contagem de plaquetas ou frações (eritrograma, leucograma, plaquetas)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-35' },
      { exam_code: '0300', exam_name: 'Avaliação psicossocial', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-35' }
    ],
    default_severity: 5,
    default_probability: 2,
    special_retirement_eligible: false,
    gfip_code_suggested: '01',
    insalubridade_applicable: false,
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-19',
    code_table_24: '05.01.002',
    name: 'Máquinas e Equipamentos sem Proteção Móvel ou Fixa (NR-12)',
    group: 'ACIDENTES',
    category_color: 'rose',
    generating_sources: 'Prensas mecânicas excêntricas, guilhotinas, calandras, esteiras transportadoras sem cabo de emergência, eixos cardans e correias sem proteção.',
    propagation_paths: 'Mecânica (pontos de agarramento, prensagem e cisalhamento)',
    health_effects: 'Amputação traumática de dedos e membros (CID S68, S88), esmagamento de mãos, fraturas expostas e ferimentos corto-contusos.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'Apreciação de Riscos HRN (Hazard Rating Number) / NBR ISO 12100',
    tolerance_limit_reference: 'Conformidade com a NR-12 e Categoria de Segurança Cat 4 / PL e',
    measurement_methodology: 'Laudo de Apreciação de Riscos NR-12 com determinação de Nível de Performance (PL)',
    recommended_epcs: 'Cortinas de luz de segurança Cat 4, botões de emergência com rearme manual monitorado por relé de segurança, proteções fixas e intertravadas com chave de segurança mecânica/magnética, enclausuramento de eixos.',
    recommended_epis: [
      { ca_example: '10786', name: 'Luvas de proteção anticorte com nível D ou E de resistência', protection_type: 'MEMBROS_SUPERIORES' },
      { ca_example: '29792', name: 'Óculos de proteção com lente de policarbonato antirrisco', protection_type: 'OLHOS_FACE' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0290', exam_name: 'Avaliação clínica com ênfase neurológca (anamnese e exame físico)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' },
      { exam_code: '0296', exam_name: 'Avaliação da acuidade visual', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 5,
    default_probability: 2,
    special_retirement_eligible: false,
    gfip_code_suggested: '01',
    insalubridade_applicable: false,
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-20',
    code_table_24: '05.01.003',
    name: 'Eletricidade / Choque Elétrico e Arco Voltaico (NR-10)',
    group: 'ACIDENTES',
    category_color: 'rose',
    generating_sources: 'Manutenção em subestações, painéis de baixa/média tensão (QGBT), barramentos energizados, troca de disjuntores e fiações aéreas.',
    propagation_paths: 'Passagem de corrente elétrica pelo corpo humano e radiação térmica explosiva do arco elétrico',
    health_effects: 'Fibrilação ventricular e parada cardiorrespiratória (CID I46), queimaduras graves por arco elétrico de 3º e 4º grau, sequelas neurológicas e morte instantânea.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'Cal/cm² (Energia incidente de arco elétrico) / Volts',
    tolerance_limit_reference: 'Tensões superiores a 50V em corrente alternada (NR-10)',
    measurement_methodology: 'Estudo de energia incidente de arco elétrico conforme IEEE 1584 e auditoria de prontuário das instalações elétricas NR-10',
    recommended_epcs: 'Procedimento LOTO (Lockout/Tagout - Bloqueio e Etiquetagem de Energia), aterramento temporário, barreiras isolantes de acrílico e tapetes de borracha isolante.',
    recommended_epis: [
      { ca_example: '35120', name: 'Vestimenta de Proteção NR-10 ATPV Risco 2 (Mínimo 8.6 cal/cm²)', protection_type: 'CORPO_INTEIRO' },
      { ca_example: '21980', name: 'Luva de Borracha Isolante de Alta Tensão Classe 0/2 com Luva de Cobertura de Vaqueta', protection_type: 'MEMBROS_SUPERIORES' },
      { ca_example: '31469', name: 'Capacete Classe B sem furos com Protetor Facial contra Arco Elétrico', protection_type: 'CABECA' },
      { ca_example: '41419', name: 'Botina de Segurança Dielétrica sem componentes metálicos', protection_type: 'MEMBROS_INFERIORES' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0530', exam_name: 'ECG (Eletrocardiograma) convencional de até 12 derivações', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-10' },
      { exam_code: '0536', exam_name: 'EEG (Eletroencefalograma) de rotina', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-10' },
      { exam_code: '0300', exam_name: 'Avaliação psicossocial', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-10' }
    ],
    default_severity: 5,
    default_probability: 2,
    special_retirement_eligible: true,
    gfip_code_suggested: '04', // 25 anos (enquadramento periculosidade)
    insalubridade_applicable: false,
    periculosidade_applicable: true,
    periculosidade_legal_basis: 'NR-16 Anexo nº 4 - Atividades e operações perigosas com energia elétrica',
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-21',
    code_table_24: '05.01.004',
    name: 'Espaço Confinado / Asfixia e Atmosferas Perigosas (NR-33)',
    group: 'ACIDENTES',
    category_color: 'rose',
    generating_sources: 'Trabalhos no interior de silos, tanques de combustível, galerias subterrâneas, caldeiras desativadas, esgotos e reatores químicos.',
    propagation_paths: 'Deficiência de Oxigênio (<19.5%), enriquecimento de O2 (>23%), gases tóxicos (H2S, CO) e gases inflamáveis (Metano, GLP)',
    health_effects: 'Asfixia química e anóxia cerebral imediata (CID T71), perda de consciência em segundos, envenenamento e morte coletiva.',
    evaluation_type: 'QUANTITATIVA',
    standard_unit: '% O2 / ppm CO / ppm H2S / % LEL Inflamabilidade',
    tolerance_limit_reference: 'O2 entre 19.5% e 23.0%; LEL < 10%; CO < 39 ppm; H2S < 8 ppm (NR-33)',
    measurement_methodology: 'Detector multigás 4 gases portátil com bomba de sucção e calibração periódica com gás padrão',
    recommended_epcs: 'Insufladores e exaustores mecânicos de ar para ventilação contínua, tripé/monopé de resgate com guincho mecânico com trava-quedas.',
    recommended_epis: [
      { ca_example: '36014', name: 'Cinto de Segurança tipo Paraquedista com alças de ombro para resgate em espaço confinado', protection_type: 'ALTURA_QUEDA' },
      { ca_example: '41120', name: 'Conjunto Autônomo de Ar Respirável de Pressão Positiva / Máscara de Fuga', protection_type: 'RESPIRATORIA' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0530', exam_name: 'ECG (Eletrocardiograma) convencional de até 12 derivações', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-33' },
      { exam_code: '1057', exam_name: 'Prova de função pulmonar completa (ou espirometria)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-33' },
      { exam_code: '0536', exam_name: 'EEG (Eletroencefalograma) de rotina', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-33' },
      { exam_code: '0300', exam_name: 'Avaliação psicossocial', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-33' }
    ],
    default_severity: 5,
    default_probability: 2,
    special_retirement_eligible: false,
    gfip_code_suggested: '01',
    insalubridade_applicable: false,
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-22',
    code_table_24: '05.01.005',
    name: 'Incêndio e Explosão / Inflamáveis e Combustíveis (NR-20)',
    group: 'ACIDENTES',
    category_color: 'rose',
    generating_sources: 'Armazenamento e trasfega de combustíveis líquidos (gasolina, diesel, etanol), depósitos de GLP, pintura industrial e atmosferas com poeiras combustíveis.',
    propagation_paths: 'Onda de choque explosiva, chamas diretas e fumaça tóxica',
    health_effects: 'Queimaduras térmicas graves extensas (CID T20-T32), inalação de fumaça com monóxido de carbono e cianeto, fraturas por explosão e morte.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'Limite Inferior de Explosividade (% LEL)',
    tolerance_limit_reference: 'LEL < 10% e distâncias regulamentares conforme NR-20 e NR-16 Anexo 2',
    measurement_methodology: 'Classificação de áreas perigosas (Zonas 0, 1 e 2) e detector de gás explosivo calibrado',
    recommended_epcs: 'Sistemas automáticos de combate a incêndio por sprinklers / espuma, bacias de contenção estanques, sistemas de aterramento estático equipotencial.',
    recommended_epis: [
      { ca_example: '35120', name: 'Vestimenta 100% Algodão Antiestática e Retardante a Chamas', protection_type: 'CORPO_INTEIRO' },
      { ca_example: '41419', name: 'Calçado com solado condutivo / antiestático para dissipação de eletricidade estática', protection_type: 'MEMBROS_INFERIORES' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0295', exam_name: 'Avaliação clínica ocupacional (anamnese e exame físico)', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 5,
    default_probability: 2,
    special_retirement_eligible: true,
    gfip_code_suggested: '04', // 25 anos
    insalubridade_applicable: false,
    periculosidade_applicable: true,
    periculosidade_legal_basis: 'NR-16 Anexo nº 2 - Atividades e operações perigosas com inflamáveis',
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-23',
    code_table_24: '05.01.006',
    name: 'Projeção de Fragmentos, Partículas Volantes e Respingo de Líquidos',
    group: 'ACIDENTES',
    category_color: 'rose',
    generating_sources: 'Esmerilhamento de soldas, lixamento mecânico, torneamento e fresamento de metais, corte com serra rápida e sopro com ar comprimido.',
    propagation_paths: 'Mecânica (projeção em alta velocidade pelo ar)',
    health_effects: 'Corpo estranho na córnea e conjuntiva (CID T15), perfuração ocular, cegueira monocular/binocular, lacerações cutâneas na face e mãos.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'Qualitativa',
    tolerance_limit_reference: 'Avaliação qualitativa do posto de usinagem e corte',
    measurement_methodology: 'Inspeção técnica das máquinas operatrizes e ferramentas manuais rotativas',
    recommended_epcs: 'Carenagens de proteção transparente de policarbonato sobre rebolos e mandris de tornos, biombos antichamas.',
    recommended_epis: [
      { ca_example: '29792', name: 'Óculos de Segurança com Proteção Lateral de Impacto', protection_type: 'OLHOS_FACE' },
      { ca_example: '31290', name: 'Protetor Facial em Policarbonato com Visor de 8 polegadas', protection_type: 'OLHOS_FACE' },
      { ca_example: '10786', name: 'Luva de Vaqueta Mista e Mangote de Raspa de Couro', protection_type: 'MEMBROS_SUPERIORES' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0296', exam_name: 'Avaliação da acuidade visual', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 4,
    default_probability: 3,
    special_retirement_eligible: false,
    gfip_code_suggested: '01',
    insalubridade_applicable: false,
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },
  {
    id: 'risk-cat-24',
    code_table_24: '05.01.007',
    name: 'Atropelamento e Colisão por Empilhadeiras e Veículos Industriais (NR-11)',
    group: 'ACIDENTES',
    category_color: 'rose',
    generating_sources: 'Operação de empilhadeiras a gás/elétricas, transpaleteiras elétricas, rebocadores e caminhões em centros de distribuição e galpões.',
    propagation_paths: 'Mecânica por tráfego cruzado de veículos e pedestres',
    health_effects: 'Politraumatismo, esmagamento de membros inferiores (CID S87), amputação traumática e morte.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'Qualitativa',
    tolerance_limit_reference: 'Normas de sinalização e circulação da NR-11',
    measurement_methodology: 'Auditoria de rotas de pedestres, sinalização de piso e iluminação em armazéns',
    recommended_epcs: 'Demarcação visual de faixas de pedestres e vias de empilhadeiras, barreiras físicas metálicas de proteção para pedestres, espelhos convexos em cruzamentos.',
    recommended_epis: [
      { ca_example: '30412', name: 'Colete Refletivo de Alta Visibilidade Classe 2 (NBR 15292)', protection_type: 'TRONCO' },
      { ca_example: '41419', name: 'Calçado de Segurança com Biqueira de Aço / Composite', protection_type: 'MEMBROS_INFERIORES' }
    ],
    suggested_exams_pcmso: [
      { exam_code: '0296', exam_name: 'Avaliação da acuidade visual', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-11' },
      { exam_code: '0299', exam_name: 'Avaliação do campo visual', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-11' },
      { exam_code: '0298', exam_name: 'Avaliação da visão de cores', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-11' },
      { exam_code: '0281', exam_name: 'Audiometria tonal ocupacional', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-11' },
      { exam_code: '0300', exam_name: 'Avaliação psicossocial', periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], mandatory_standard: 'NR-11' }
    ],
    default_severity: 5,
    default_probability: 2,
    special_retirement_eligible: false,
    gfip_code_suggested: '01',
    insalubridade_applicable: false,
    periculosidade_applicable: false,
    is_system_default: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  },

  // =========================================================================
  // GRUPO 9: AUSÊNCIA DE FATOR DE RISCO
  //
  // O codigo aqui era 05.01.001 - o MESMO de "Risco de Queda em Altura", e do
  // grupo 05 (acidentes). Dois riscos opostos com um codigo so, e a ausencia
  // de risco cadastrada como risco de acidente.
  //
  // O prefixo 09 e o grupo de ausencia de fator de risco. Os tres ultimos
  // digitos precisam ser conferidos na Tabela 24 oficial, que ainda nao entrou
  // no projeto - por isso este item nasce INACTIVE: ele nao deve ser aplicado
  // a um cliente nem declarado ao eSocial enquanto o codigo nao for conferido.
  // =========================================================================
  {
    id: 'risk-cat-25',
    code_table_24: '09.01.001',
    name: 'Ausência de Fatores de Risco Físicos, Químicos ou Biológicos Nocivos',
    group: 'AUSÊNCIA_RISCO',
    category_color: 'slate',
    generating_sources: 'Atividades administrativas em ambiente de escritório corporativo padrão, recepção e atendimento comercial sem exposição a agentes nocivos.',
    propagation_paths: 'Não aplicável',
    health_effects: 'Sem danos ocupacionais decorrentes de agentes nocivos que ensejem insalubridade, periculosidade ou aposentadoria especial.',
    evaluation_type: 'QUALITATIVA',
    standard_unit: 'Qualitativa',
    tolerance_limit_reference: 'Critério PGR / DIR (Declaração de Inexistência de Riscos) e LTCAT',
    measurement_methodology: 'Inspeção qualitativa de ambiente de trabalho conforme NR-01 e MOS eSocial S-2240',
    recommended_epcs: 'Ar-condicionado regulado, iluminação adequada conforme NBR ISO/CIE 8995-1.',
    recommended_epis: [],
    suggested_exams_pcmso: [
      { exam_code: '0295', exam_name: 'Avaliação clínica ocupacional (anamnese e exame físico)', periodicity_months: 24, triggers: ['ADMISSIONAL', 'PERIODICO', 'MUDANCA_RISCO', 'DEMISSIONAL'], mandatory_standard: 'NR-07' }
    ],
    default_severity: 1,
    default_probability: 1,
    special_retirement_eligible: false,
    gfip_code_suggested: '00', // 00: Sem exposição a agentes nocivos
    insalubridade_applicable: false,
    periculosidade_applicable: false,
    is_system_default: true,
    // INACTIVE ate o codigo ser conferido na Tabela 24 oficial. Ver o
    // comentario acima.
    status: 'INACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z'
  }
];
