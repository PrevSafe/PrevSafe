/**
 * Conteudo fixo do PGR, transcrito do modelo da PrevSafe.
 *
 * FONTE
 *
 * "Modelo de PGR — Programa de Gerenciamento de Riscos (NR-01)", de
 * 23/09/2026, fornecido pelo responsavel tecnico. Segue a redacao do capitulo
 * 1.5 da NR-01 dada pela Portaria MTE 1.419/2024, em vigor desde 26/05/2026
 * (Portaria MTE 765/2025).
 *
 * REGRA DESTE ARQUIVO
 *
 * Nenhuma citacao normativa daqui foi escrita de memoria: toda referencia a
 * subitem esta no modelo. Quem precisar acrescentar uma que nao esteja la
 * deve conferir no texto oficial antes, e nao deduzir do contexto. Nesta base
 * de codigo ja houve tres casos de codigo oficial escrito de memoria e errado
 * (grupos da Tabela 24, codigos de exame da Tabela 27 e os atalhos do GHE).
 *
 * O que NAO esta aqui: tudo o que depende do cliente. Area construida,
 * produtos quimicos, cenarios de emergencia e afins sao dados do
 * estabelecimento; o gerador os imprime como pendencia quando nao existem,
 * nunca com conteudo de exemplo.
 */

export const PGR_VERSAO_DO_MODELO = 'Modelo PrevSafe de 23/09/2026';

export const PGR_NORMA_DE_REGENCIA =
  'NR-01, item 1.5 — Gerenciamento de Riscos Ocupacionais (GRO), com a redação ' +
  'das Portarias MTE nº 1.419/2024 e nº 765/2025';

/** Secao 2.1 — Objetivo. */
export const PGR_OBJETIVO =
  'Este PGR documenta o gerenciamento de riscos ocupacionais do estabelecimento ' +
  'para evitar ou eliminar perigos, identificar perigos e possíveis lesões ou ' +
  'agravos, avaliar e classificar os riscos, implementar medidas de prevenção na ' +
  'ordem de prioridade legal e acompanhar seu controle (subitem 1.5.3.2). Abrange ' +
  'agentes físicos, químicos e biológicos, riscos de acidentes e fatores ' +
  'ergonômicos, incluindo os fatores de risco psicossociais relacionados ao ' +
  'trabalho (subitem 1.5.3.1.4).';

/** Secao 2.2 — Composicao documental. */
export const PGR_COMPOSICAO_DOCUMENTAL =
  'O PGR é composto, no mínimo, pelo inventário de riscos (seção 7) e pelo plano ' +
  'de ação (seção 8), conforme subitem 1.5.7.1. Os critérios de avaliação ' +
  'exigidos pelo subitem 1.5.4.4.2.2 estão na seção 5.';

/** Secao 1.3 — Abrangencia. */
export const PGR_ABRANGENCIA =
  'Este PGR abrange todas as atividades, setores, processos, ambientes e ' +
  'trabalhadores do estabelecimento acima, próprios e terceirizados, em situações ' +
  'rotineiras, não rotineiras e de emergência (subitem 1.5.3.1.1.1).';

/** Secao 2.3 — Base legal e normativa. */
export const PGR_BASE_LEGAL: Array<[string, string]> = [
  ['CLT, arts. 157 e 200', 'Dever do empregador de cumprir e fazer cumprir as normas de SST'],
  ['NR-01 (Portarias SEPRT 6.730/2020, MTE 1.419/2024 e 765/2025)', 'Estrutura do GRO/PGR, critérios, inventário, plano de ação, emergências, terceiros, capacitação'],
  ['NR-05', 'Participação da CIPA; prevenção ao assédio (subitem 1.4.1.1 da NR-01)'],
  ['NR-07', 'Integração com o PCMSO (subitem 1.5.5.4.2)'],
  ['NR-09 (atualizada pela Portaria MTE 105/2026)', 'Avaliação e controle de agentes físicos, químicos e biológicos; níveis de ação; Anexos I (vibração) e III (calor)'],
  ['NR-15 e seus Anexos', 'Limites de tolerância usados na transição (subitem 9.6.1 da NR-09)'],
  ['NR-17', 'AEP, AET, organização do trabalho e fatores psicossociais'],
  ['NR-06', 'Seleção, fornecimento e controle de EPI'],
  ['NHO Fundacentro (01, 06, 09, 10, 11 e demais)', 'Métodos de avaliação quantitativa'],
  ['ACGIH (TLVs e BEIs)', 'Referência na ausência de limite na NR-15 (subitem 9.6.1.1 da NR-09)'],
  ['Guia MTE de fatores de riscos psicossociais (2025) e Manual do GRO/PGR (MTE)', 'Orientação técnica oficial para aplicação da NR-01']
];

/**
 * Secao 3 — Termos e definicoes. Reproduzem o sentido do Anexo I da NR-01 e
 * das NR correlatas.
 */
export const PGR_TERMOS: Array<[string, string, string]> = [
  ['Perigo ou fator de risco ocupacional', 'Elemento ou situação que, isoladamente ou em combinação, tem o potencial de dar origem a lesões ou agravos à saúde', 'NR-01, Anexo I'],
  ['Risco ocupacional', 'Combinação da probabilidade de ocorrer lesão ou agravo causado por evento perigoso, exposição a agente nocivo ou exigência da atividade com a severidade dessa lesão ou agravo', 'NR-01, Anexo I'],
  ['Risco ocupacional evidente', 'Risco óbvio e não controlado, que dispensa análise aprofundada e pode ser controlado por medida imediata', 'NR-01, Anexo I'],
  ['Evento perigoso', 'Ocorrência com potencial de causar lesões ou agravos à saúde', 'NR-01, Anexo I'],
  ['Perigo externo', 'Situação previsível fora do controle da organização e dos limites do local de trabalho que pode causar lesões ou agravos, exigindo medidas mitigadoras possíveis', 'NR-01, Anexo I'],
  ['Levantamento preliminar de perigos e riscos', 'Etapa inicial do GRO para evitar ou eliminar perigos e controlar riscos evidentes com medidas imediatas', 'NR-01, Anexo I'],
  ['Identificação de perigos', 'Processo de buscar, reconhecer e descrever perigos', 'NR-01, Anexo I'],
  ['Avaliação de riscos', 'Processo contínuo para determinar níveis de risco, classificá-los e julgar a necessidade de adotar ou manter medidas de prevenção', 'NR-01, Anexo I'],
  ['GRO', 'Processo contínuo e sistemático de identificação de perigos, avaliação e controle dos riscos ocupacionais', 'NR-01, Anexo I'],
  ['PGR', 'Conjunto coordenado de ações da organização para prevenção e gerenciamento dos riscos, formalmente documentado', 'NR-01, Anexo I'],
  ['Fatores de risco psicossociais relacionados ao trabalho', 'Perigos decorrentes de problemas na concepção, organização e gestão do trabalho que podem gerar efeitos psicológicos, físicos e sociais (estresse, esgotamento, depressão, DORT)', 'Guia MTE 2025'],
  ['Emergência de grande magnitude', 'Evento inesperado ligado aos processos da organização cujas consequências atingem também a população ou o meio ambiente', 'NR-01, Anexo I'],
  ['Organização contratada', 'Pessoa jurídica prestadora de serviços contratada nos termos da Lei 6.019/1974', 'NR-01, Anexo I'],
  ['Nível de ação', 'Valor acima do qual se implementam ações de controle sistemático para evitar que a exposição ultrapasse o limite', 'NR-09, 9.6.1.2'],
  ['Limite de exposição ocupacional (LEO)', 'Limite de tolerância da NR-15, limite de anexo da NR-09 ou, na falta, TLV da ACGIH', 'NR-09, 9.6.1'],
  ['Grupo de Exposição Similar (GES/GHE)', 'Grupo de trabalhadores com perfil de exposição semelhante, usado para caracterizar a exposição', 'Manual GRO/MTE'],
  ['AEP', 'Avaliação ergonômica preliminar das situações de trabalho, registrada e integrada ao inventário', 'NR-17, 17.3.1'],
  ['AET', 'Análise ergonômica do trabalho, aprofundada, nas hipóteses do item 17.3.2', 'NR-17, 17.3.2'],
  ['Risco tolerável', 'Nível de risco em que todas as medidas exigidas em NR e na legislação estão implementadas e mantidas, sem necessidade de controle adicional', 'Critério desta organização (seção 5.7)']
];

/** Secao 4.1 — Responsabilidades. */
export const PGR_RESPONSABILIDADES: Array<[string, string, string]> = [
  ['Organização / alta direção', 'Aprovar o PGR e prover recursos; implementar medidas na ordem 1.4.1 "g" (eliminação, proteção coletiva, medidas administrativas, EPI), ouvidos os trabalhadores; informar riscos e medidas; emitir ordens de serviço; definir procedimentos para acidentes; disponibilizar informações à Inspeção', 'NR-01, 1.4.1 e 1.5.3'],
  ['Responsável técnico pela elaboração', 'Conduzir identificação, avaliação e classificação conforme seção 5; propor medidas; registrar critérios e evidências; assinar o inventário', 'NR-01, 1.5.4 e 1.5.7.2'],
  ['Coordenador da implementação', 'Gerir o plano de ação, cronogramas, evidências e indicadores; acionar revisões', 'NR-01, 1.5.5.2 e 1.5.5.3'],
  ['SESMT (quando houver)', 'Assessorar tecnicamente todas as etapas; participar do acompanhamento e das análises de acidentes', 'NR-04'],
  ['Gestores de área', 'Garantir execução das medidas no setor; informar mudanças de processo, máquinas, produtos e organização do trabalho; orientar equipes (item 17.4.7 da NR-17)', 'NR-01, 1.5.4.4.6 "b"'],
  ['Médico do PCMSO', 'Planejar o controle de saúde conforme a classificação de riscos; informar indícios de associação entre agravos e riscos', 'NR-07; NR-01, 1.5.5.4'],
  ['CIPA ou nomeado', 'Participar da identificação e do acompanhamento; manifestar percepção de riscos; solicitar revisão justificada', 'NR-01, 1.5.3.3 e 1.5.4.4.6 "f"'],
  ['Trabalhadores', 'Cumprir normas e ordens de serviço; usar EPI; colaborar; comunicar situações de risco grave e iminente e exercer o direito de interrupção', 'NR-01, 1.4.2 e 1.4.3'],
  ['Organizações contratadas', 'Fornecer inventário e plano de ação da atividade contratada ou aderir às medidas do contratante; informar riscos que geram', 'NR-01, 1.5.8']
];

/** Secao 5.2 — Categorias de perigo e criterio de probabilidade. */
export const PGR_CATEGORIAS_DE_PERIGO: Array<[string, string, string]> = [
  ['Físico', 'Ruído, vibração, calor, frio, radiações, pressões anormais', 'Perfil de exposição x valor de referência (1.5.4.4.5.2)'],
  ['Químico', 'Poeiras, fumos, névoas, gases, vapores, contato dérmico', 'Perfil de exposição x valor de referência (1.5.4.4.5.2)'],
  ['Biológico', 'Microrganismos, parasitas, material biológico', 'Critérios da NR-09 e normas específicas (1.5.4.4.5.2)'],
  ['Acidente', 'Partes móveis, eletricidade, queda de altura, incêndio, veículos, animais peçonhentos', 'Exposição ao perigo + eficácia das medidas (1.5.4.4.5.4)'],
  ['Ergonômico', 'Levantamento de cargas, posturas, repetitividade, mobiliário, conforto', 'Exigências da atividade + eficácia (1.5.4.4.5.3)'],
  ['Psicossocial relacionado ao trabalho', 'Sobrecarga, baixa autonomia, assédio, má gestão de mudanças, trabalho isolado', 'Exigências da atividade + eficácia (1.5.4.4.5.3)']
];

/** Secao 5.4 — Gradacao da severidade. */
export const PGR_SEVERIDADE_CABECALHO =
  'A severidade é definida pela magnitude da consequência. Havendo mais de uma ' +
  'consequência possível, adota-se a de maior magnitude (subitem 1.5.4.4.4.1), ' +
  'ou seja, o pior cenário plausível.';

export const PGR_SEVERIDADE: Array<[string, string, string, string, string]> = [
  ['1', 'Leve', 'Lesão superficial, só primeiros socorros', 'Desconforto ou efeito transitório sem tratamento', 'Desconforto ou fadiga que cessa com repouso'],
  ['2', 'Menor', 'Lesão com atendimento médico, afastamento até 15 dias', 'Efeito reversível; irritante leve; agente biológico de grupo de risco 1', 'Queixa osteomuscular ou estresse reversível, sem afastamento prolongado'],
  ['3', 'Moderada', 'Fratura, queimadura extensa; afastamento superior a 15 dias sem sequela', 'Doença reversível com tratamento (dermatose, intoxicação aguda moderada); corrosivo; agente de grupo 2', 'DORT ou transtorno mental reversível com tratamento e afastamento'],
  ['4', 'Maior', 'Amputação, perda de função; incapacidade permanente parcial', 'Doença irreversível (PAIR, pneumoconiose, sensibilizante respiratório); carcinogênico suspeito (GHS 2, IARC 2A/2B, ACGIH A2); agente de grupo 3', 'Lesão osteomuscular crônica incapacitante; transtorno mental grave (ex.: após assédio ou evento traumático)'],
  ['5', 'Morte ou incapacidade total', 'Fatalidade, múltiplas vítimas, incapacidade permanente total', 'Carcinogênico comprovado (GHS 1A/1B, IARC 1, ACGIH A1); toxicidade aguda fatal; agente de grupo 4', 'Incapacidade permanente total ou risco à vida']
];

/** Secao 5.5 — Regras comuns da probabilidade. */
export const PGR_PROBABILIDADE_REGRAS: string[] = [
  'Não conformidade legal: descumprimento de requisito específico de NR aplicável ao perigo leva a probabilidade à gradação máxima (P5), conforme subitem 1.5.4.4.5.1 e Manual do GRO do MTE.',
  'Eficácia das medidas: só reduzem a probabilidade medidas implementadas, com funcionamento e manutenção evidenciados. Critério desta organização: EPI isolado reduz no máximo uma gradação; medida sem evidência não reduz.',
  'Ausência de dados: sem informação suficiente, adota-se a maior gradação plausível até que avaliação adicional a justifique reduzir.'
];

/** Secao 5.5 — Agentes fisicos e quimicos. */
export const PGR_PROBABILIDADE_FISICO_QUIMICO: Array<[string, string, string]> = [
  ['1', 'Exposição inferior a 50% do NA', 'Agente presente em quantidade insignificante, contato improvável'],
  ['2', 'De 50% do NA até abaixo do NA', 'Contato eventual, sistema fechado ou controle de engenharia eficaz'],
  ['3', 'Igual ou acima do NA e abaixo do LEO, com controle sistemático eficaz', 'Contato frequente, controles coletivos presentes e mantidos'],
  ['4', 'Igual ou acima do NA e abaixo do LEO sem controle sistemático; ou acima do LEO com EPI adequado e programa de EPI evidenciado', 'Contato habitual, controles deficientes ou apenas EPI'],
  ['5', 'Acima do LEO ou do valor teto sem controle eficaz', 'Contato habitual sem controle; ou não conformidade legal']
];

export const PGR_PROBABILIDADE_REFERENCIAS =
  'NA de agentes químicos = 50% do limite de tolerância; NA de ruído = dose 0,5 ' +
  '(subitem 9.6.1 da NR-09). Vibração: VMB com NA aren 2,5 m/s² e LEO 5 m/s²; VCI ' +
  'com NA aren 0,5 m/s² ou VDVR 9,1 m/s^1,75 e LEO aren 1,1 m/s² ou VDVR 21,0 ' +
  'm/s^1,75 (Anexo I da NR-09). Calor: Quadros 1 e 2 do Anexo III da NR-09, com ' +
  'IBUTG pela NHO 06. Sem limite na NR-15, usa-se a ACGIH.';

/** Secao 5.5 — Agentes biologicos. */
export const PGR_PROBABILIDADE_BIOLOGICO: Array<[string, string]> = [
  ['1', 'Contato improvável com fonte de agente biológico'],
  ['2', 'Contato eventual e indireto; controles eficazes (imunização, EPC, procedimentos)'],
  ['3', 'Contato frequente com material potencialmente contaminado, com controles mantidos'],
  ['4', 'Contato direto frequente com controles deficientes'],
  ['5', 'Contato direto habitual sem controles, ou não conformidade legal (ex.: NR-32)']
];

/** Secao 5.5 — Acidentes. */
export const PGR_PROBABILIDADE_ACIDENTE: Array<[string, string, string]> = [
  ['1', 'Rara (não rotineira, até anual)', 'Eliminação ou proteção coletiva eficaz, NR atendidas'],
  ['2', 'Ocasional (mensal)', 'Proteção coletiva eficaz e mantida'],
  ['3', 'Frequente (semanal)', 'Controles predominantemente administrativos e EPI, eficazes'],
  ['4', 'Diária', 'Apenas EPI ou procedimentos, ou controles com falhas; incidentes registrados'],
  ['5', 'Contínua ou diária', 'Sem controle, controles ineficazes, eventos recorrentes ou não conformidade legal']
];

/** Secao 5.5 — Ergonomicos e psicossociais. */
export const PGR_PROBABILIDADE_ERGONOMICO: Array<[string, string, string, string]> = [
  ['1', 'Eventual', 'Baixa', 'NR-17 integralmente atendida'],
  ['2', 'Eventual ou frequente', 'Baixa a moderada', 'Medidas organizacionais eficazes'],
  ['3', 'Frequente (diária, até metade da jornada)', 'Moderada', 'Medidas parciais'],
  ['4', 'Habitual (mais da metade da jornada)', 'Elevada', 'Medidas insuficientes; queixas ou afastamentos no GES'],
  ['5', 'Habitual ou contínua', 'Elevada', 'Sem medidas; não conformidade com a NR-17 (ex.: pausas do 17.4.3.1, requisitos de assentos do 17.6.6)']
];

/** Secao 5.7 — Regras de decisao. */
export const PGR_REGRAS_DE_DECISAO: string[] = [
  'Um risco só é tolerável se todos os requisitos de NR aplicáveis estiverem atendidos e mantidos. Risco tolerável não significa risco zero: os controles existentes entram no plano de ação como "manter".',
  'Toda não conformidade legal entra no plano de ação independentemente do nível, com o menor prazo entre o da classificação e 90 dias.',
  'Número de trabalhadores atingidos (subitem 1.5.5.2.1.1): dentro do mesmo nível, ordena-se por número de expostos; com 10 ou mais expostos, ou 20% ou mais do efetivo, o prazo passa ao da faixa imediatamente superior.',
  'Riscos com possibilidade de risco grave e iminente são comunicados aos trabalhadores, que podem interromper a atividade (item 1.4.3).'
];

/** Secao 7.1 — Estrutura do registro do inventario. */
export const PGR_CAMPOS_DO_INVENTARIO: Array<[string, string, string]> = [
  ['ID do risco', 'Código único e rastreável (ex.: R-GES02-F01)', '—'],
  ['Setor / ambiente e processo', 'Referência à seção 6.2', 'a'],
  ['GES e atividades', 'Referência à seção 6.3, com a atividade exposta', 'b, e'],
  ['Situação operacional', 'R, NR ou E', 'b'],
  ['Tipo de perigo', 'Físico, químico, biológico, acidente, ergonômico, psicossocial', 'c'],
  ['Perigo', 'Descrição objetiva', 'c'],
  ['Fonte ou circunstância', 'Onde e como o perigo se manifesta; indicar se é perigo externo', 'c'],
  ['Possíveis lesões ou agravos', 'Todas as consequências plausíveis, destacando a de maior magnitude', 'd'],
  ['Nº de expostos', 'Total do GES exposto ao perigo', 'e'],
  ['Medidas de prevenção implementadas', 'Por nível da hierarquia (coletiva, administrativa, EPI com CA) e evidência', 'f'],
  ['Caracterização da exposição', 'Via, frequência, duração, intensidade e cofatores', 'g'],
  ['Avaliação preliminar / monitoramento / AEP', 'Método, data, resultado, NA e LEO de referência, ou resultado da AEP', 'h'],
  ['Severidade (S)', '1 a 5 com justificativa (seção 5.4)', 'i'],
  ['Probabilidade (P)', '1 a 5 com justificativa (seção 5.5)', 'i'],
  ['Nível e classificação', 'S x P, faixa e prioridade (seções 5.6 e 5.7)', 'i'],
  ['Ação no plano', 'Nº da ação na seção 8', 'i'],
  ['Data e responsável pela avaliação', 'Data da avaliação e nome de quem avaliou', '—']
];

/** Secao 8.1 — Regras de elaboracao do plano de acao. */
export const PGR_REGRAS_DO_PLANO: string[] = [
  'Hierarquia obrigatória: eliminação, proteção coletiva, medidas administrativas ou de organização do trabalho e, por último, EPI (alínea "g" do item 1.4.1). Medida administrativa ou EPI no lugar de proteção coletiva exige justificativa de inviabilidade técnica, insuficiência, fase de implantação ou caráter complementar ou emergencial (subitem 1.5.5.1.2).',
  'Medidas para fatores ergonômicos e psicossociais priorizam mudanças na organização do trabalho (NR-17, item 17.4), definidas com participação dos trabalhadores.',
  'Cada medida informa aos trabalhadores procedimentos e limitações (subitem 1.5.5.1.3).',
  'Concluída a medida, o risco é reavaliado (alínea "a" do subitem 1.5.4.4.6) e o inventário atualizado.'
];

export const PGR_STATUS_DO_PLANO =
  'Status admitidos: Não iniciada, Em andamento, Concluída, Concluída - eficácia ' +
  'verificada, Atrasada (com nova data justificada). A alteração de prazo mantém ' +
  'o prazo original no histórico.';

/** Secao 9.9 — Hipoteses de revisao. */
export const PGR_HIPOTESES_DE_REVISAO: string[] = [
  'implementação de medidas de prevenção, para avaliar riscos residuais;',
  'inovações ou modificações em tecnologias, ambientes, processos, condições, procedimentos e organização do trabalho;',
  'inadequação, insuficiência ou ineficácia das medidas;',
  'acidente ou doença relacionada ao trabalho;',
  'mudança nos requisitos legais aplicáveis;',
  'solicitação justificada dos trabalhadores ou da CIPA.'
];

/** Secao 9.10 — Registro, guarda e disponibilidade. */
export const PGR_GUARDA: string[] = [
  'Documentos do PGR datados e assinados (subitem 1.5.7.2).',
  'Disponíveis aos trabalhadores interessados, aos sindicatos e à Inspeção do Trabalho (subitem 1.5.7.2.1).',
  'Histórico do inventário mantido por 20 anos (subitem 1.5.7.3.3.1).',
  'Documentos digitais: assinatura com certificado ICP-Brasil; preservação de autenticidade, integridade, disponibilidade, rastreabilidade e acesso irrestrito à Inspeção (subitens 1.6.2 a 1.6.5).'
];

/** Secao 10.1 — Anexos do PGR. */
export const PGR_ANEXOS: Array<[string, string]> = [
  ['I', 'Laudos e memórias de cálculo das avaliações quantitativas'],
  ['II', 'AEP e, quando houver, relatório de AET'],
  ['III', 'Procedimentos de resposta a emergências e registros de simulados'],
  ['IV', 'Relação de contratadas e documentos trocados (inventário e plano de ação)'],
  ['V', 'Matriz de treinamentos e certificados'],
  ['VI', 'FDS dos produtos químicos'],
  ['VII', 'Registros de comunicação e consulta aos trabalhadores e à CIPA'],
  ['VIII', 'Listagem de perigos de referência, incluindo fatores psicossociais (Guia MTE 2025)']
];

/**
 * Secao 10.2 — Checklist de conformidade para a fiscalizacao.
 *
 * O modelo instrui: "O sistema deve verificar cada linha antes de permitir a
 * emissao". O gerador imprime o checklist e marca o que o cliente ainda nao
 * tem, em vez de omitir a linha.
 */
export const PGR_CHECKLIST: Array<{
  requisito: string;
  norma: string;
  onde: string;
  /**
   * Secoes de DADOS cujo nao preenchimento torna este requisito pendente.
   *
   * Lista vazia = requisito atendido pelo proprio texto do modelo (criterios,
   * definicoes, regras), que sai em todo PGR. Derivar isto do campo "onde"
   * dava falso positivo: uma pendencia em 5.3 marcava "criterios documentados"
   * (5.4 a 5.7) como pendente, sendo que esses sao conteudo fixo.
   */
  secoes: string[];
}> = [
  { requisito: 'PGR por estabelecimento, abrangendo todos os tipos de risco, inclusive psicossociais', norma: '1.5.3.1.1.1 e 1.5.3.1.4', onde: '1.3, 5.2', secoes: ['1.3', '5.2'] },
  { requisito: 'Condições de trabalho da NR-17 consideradas', norma: '1.5.3.2.1', onde: '5.3, 7.4', secoes: ['5.3', '7.4'] },
  { requisito: 'Mecanismos de participação, consulta e comunicação', norma: '1.5.3.3', onde: '9.6', secoes: ['9.6'] },
  { requisito: 'Levantamento preliminar e riscos evidentes', norma: '1.5.4.2', onde: '5.1', secoes: [] },
  { requisito: 'Perigos externos previsíveis', norma: '1.5.4.3.2', onde: '5.2, 6.1', secoes: ['6.1'] },
  { requisito: 'Critérios de severidade, probabilidade, níveis, classificação e decisão documentados', norma: '1.5.4.4.2.2', onde: '5.4 a 5.7', secoes: [] },
  { requisito: 'Probabilidade por tipo de perigo e eficácia das medidas', norma: '1.5.4.4.5.1 a 1.5.4.4.5.4', onde: '5.5', secoes: [] },
  { requisito: 'Hipóteses de revisão, incluindo pedido da CIPA', norma: '1.5.4.4.6', onde: '9.9', secoes: [] },
  { requisito: 'Plano de ação com cronograma, responsáveis, acompanhamento e aferição; prioridade por número de expostos', norma: '1.5.5.2', onde: '5.7, 8', secoes: ['8.2'] },
  { requisito: 'Hierarquia de medidas com justificativa', norma: '1.4.1 "g" e 1.5.5.1.2', onde: '8.1', secoes: [] },
  { requisito: 'Registro e acompanhamento das medidas', norma: '1.5.5.3', onde: '8.2, 9.1', secoes: ['9.1'] },
  { requisito: 'Integração com o PCMSO', norma: '1.5.5.4', onde: '9.2', secoes: [] },
  { requisito: 'Análise de acidentes e eventos perigosos', norma: '1.5.5.5', onde: '9.3', secoes: [] },
  { requisito: 'Emergências e simulados com evidências', norma: '1.5.6', onde: '9.4', secoes: ['9.4'] },
  { requisito: 'Inventário com as alíneas "a" a "i"', norma: '1.5.7.3.2', onde: '7.1', secoes: ['7.2'] },
  { requisito: 'Documentos datados, assinados e disponíveis; histórico de 20 anos', norma: '1.5.7.2 e 1.5.7.3.3.1', onde: 'Capa, 9.10', secoes: [] },
  { requisito: 'Contratadas: medidas no PGR ou programas da contratada, troca de informações nos dois sentidos e riscos de interação', norma: '1.5.8', onde: '9.5', secoes: ['9.5'] },
  { requisito: 'Prevenção e combate ao assédio sexual e às demais formas de violência (organizações obrigadas a constituir CIPA)', norma: '1.4.1.1', onde: '9.8', secoes: ['9.8'] }
];

/** Advertencias de escopo do modelo. */
export const PGR_ADVERTENCIAS: string[] = [
  'Estabelecimentos rurais regidos pela NR-31 devem elaborar o PGRTR (item 31.3), e não este PGR.',
  'Insalubridade e periculosidade são caracterizadas pelas NR-15 e NR-16 em laudos próprios (subitem 1.5.2). O PGR não substitui LTCAT nem laudos de adicional.',
  'ME e EPP de grau de risco 1 e 2 sem exposição a agentes físicos, químicos e biológicos podem estar dispensadas do PGR (subitem 1.8.4), mas continuam obrigadas às demais NR, inclusive à AEP da NR-17 com fatores psicossociais.',
  'O PGR vale pela implementação, não pelo papel. Na fiscalização, o auditor confronta o inventário com o local de trabalho e o plano de ação com as evidências de execução.'
];
