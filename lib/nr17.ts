/**
 * NR-17 — Ergonomia. Conteudo fixo da avaliacao ergonomica.
 *
 * Extraido do texto publicado na redacao vigente (Portarias MTP n.o 423, de
 * 07/10/2021, e n.o 4.219, de 20/12/2022). A redacao anterior, que muita
 * consultoria ainda cita, tinha outros numeros: 20 a 23 graus de temperatura,
 * umidade minima de 40% e iluminamento pela ABNT NBR 5413. Nenhum dos tres
 * sobreviveu - ver PARAMETROS_DE_CONFORTO.
 *
 * A NR-17 NAO PRESCREVE INSTRUMENTO: o subitem 17.3.1.1 admite abordagens
 * "qualitativas, semiquantitativas, quantitativas ou combinacao dessas,
 * dependendo do risco e dos requisitos legais". Por isso este modulo lista o
 * que a avaliacao tem de ALCANCAR, e nao um questionario com pontuacao.
 */

/** Item 17.4.1: o que a organizacao do trabalho deve levar em consideracao. */
export const NR17_FATORES_DA_ORGANIZACAO: Array<{ alinea: string; texto: string }> = [
  { alinea: 'a', texto: 'As normas de produção' },
  { alinea: 'b', texto: 'O modo operatório, quando aplicável' },
  { alinea: 'c', texto: 'A exigência de tempo' },
  { alinea: 'd', texto: 'O ritmo de trabalho' },
  { alinea: 'e', texto: 'O conteúdo das tarefas e os instrumentos e meios técnicos disponíveis' },
  { alinea: 'f', texto: 'Os aspectos cognitivos que possam comprometer a segurança e a saúde do trabalhador' }
];

/**
 * Item 17.4.3: o que as medidas de prevencao devem evitar que o trabalhador
 * seja obrigado a efetuar de forma continua e repetitiva.
 */
export const NR17_EXIGENCIAS_A_EVITAR: Array<{ alinea: string; texto: string }> = [
  { alinea: 'a', texto: 'Posturas extremas ou nocivas do tronco, pescoço, cabeça, membros superiores e/ou inferiores' },
  { alinea: 'b', texto: 'Movimentos bruscos de impacto dos membros superiores' },
  { alinea: 'c', texto: 'Uso excessivo de força muscular' },
  { alinea: 'd', texto: 'Frequência de movimentos dos membros superiores ou inferiores que possa comprometer a segurança e a saúde' },
  { alinea: 'e', texto: 'Exposição a vibrações, nos termos do Anexo I da NR-09' },
  { alinea: 'f', texto: 'Exigência cognitiva que possa comprometer a segurança e a saúde do trabalhador' }
];

/**
 * Subitem 17.4.3.1: as medidas de prevencao devem incluir DUAS OU MAIS destas
 * alternativas. E o subitem 17.4.3.1.1: quando nao for possivel adotar as das
 * alineas "c" e "d", as das alineas "a" e "b" tornam-se obrigatorias.
 */
export const NR17_ALTERNATIVAS_DE_PREVENCAO: Array<{ alinea: string; texto: string }> = [
  { alinea: 'a', texto: 'Pausas para recuperação psicofisiológica, computadas como tempo de trabalho efetivo' },
  { alinea: 'b', texto: 'Alternância de atividades com outras tarefas que permitam variar posturas, grupos musculares ou ritmo' },
  { alinea: 'c', texto: 'Alteração da forma de execução ou da organização da tarefa' },
  { alinea: 'd', texto: 'Outras medidas técnicas aplicáveis, recomendadas na avaliação ergonômica preliminar ou na AET' }
];

export const NR17_MINIMO_DE_ALTERNATIVAS = 2;

/** Subitem 17.4.3.2: requisitos minimos para que a pausa cumpra sua funcao. */
export const NR17_REQUISITOS_DAS_PAUSAS: string[] = [
  'A introdução das pausas não pode ser acompanhada de aumento da cadência individual (alínea "a" do subitem 17.4.3.2).',
  'As pausas devem ser usufruídas fora dos postos de trabalho (alínea "b" do subitem 17.4.3.2).',
  'Deve ser assegurada a saída dos postos de trabalho para satisfação das necessidades fisiológicas (item 17.4.3.3).'
];

/** Item 17.3.2: quando a AET passa a ser devida. */
export const NR17_GATILHOS_DA_AET: Array<{ alinea: string; texto: string }> = [
  { alinea: 'a', texto: 'Observada a necessidade de uma avaliação mais aprofundada da situação' },
  { alinea: 'b', texto: 'Identificadas inadequações ou insuficiência das ações adotadas' },
  { alinea: 'c', texto: 'Sugerida pelo acompanhamento de saúde dos trabalhadores, nos termos do PCMSO e da alínea "c" do subitem 1.5.5.1.1 da NR-01' },
  { alinea: 'd', texto: 'Indicada causa relacionada às condições de trabalho na análise de acidentes e doenças relacionadas ao trabalho, nos termos do PGR' }
];

/**
 * Item 17.3.3: etapas da AET.
 *
 * Ficam aqui para o PGR poder dizer o que a AET tera de conter quando for
 * devida. O sistema nao gera a AET: ela e trabalho tecnico com diagnostico e
 * restituicao aos trabalhadores, nao formulario.
 */
export const NR17_ETAPAS_DA_AET: Array<{ alinea: string; texto: string }> = [
  { alinea: 'a', texto: 'Análise da demanda e, quando aplicável, reformulação do problema' },
  { alinea: 'b', texto: 'Análise do funcionamento da organização, dos processos, das situações de trabalho e da atividade' },
  { alinea: 'c', texto: 'Descrição e justificativa dos métodos, técnicas e ferramentas adequados, sem estar adstrita a métodos específicos' },
  { alinea: 'd', texto: 'Estabelecimento de diagnóstico' },
  { alinea: 'e', texto: 'Recomendações para as situações de trabalho analisadas' },
  { alinea: 'f', texto: 'Restituição dos resultados, validação e revisão das intervenções, com a participação dos trabalhadores' }
];

/**
 * Parametros numericos do item 17.8, na redacao vigente.
 *
 * Os valores da redacao ANTERIOR eram outros e continuam circulando: 20 a 23
 * graus, umidade relativa nao inferior a 40% e iluminamento pela NBR 5413.
 * Nenhum deles esta no texto atual - a umidade deixou de ter valor numerico.
 */
export const PARAMETROS_DE_CONFORTO: Array<{ item: string; parametro: string; fonte: string }> = [
  {
    item: 'Iluminamento',
    parametro: 'Níveis mínimos da NHO 11 da Fundacentro (Avaliação dos Níveis de Iluminamento em Ambientes Internos de Trabalho), versão 2018, em ambientes internos',
    fonte: 'item 17.8.3'
  },
  {
    item: 'Qualidade da iluminação',
    parametro: 'Projetada e instalada de forma a evitar ofuscamento, reflexos incômodos, sombras e contrastes excessivos',
    fonte: 'item 17.8.2'
  },
  {
    item: 'Conforto acústico',
    parametro: 'Ruído de fundo conforme os valores de referência de normas técnicas oficiais para a finalidade de uso do ambiente; nos demais casos, até 65 dB(A), LAeq, circuito de resposta Slow',
    fonte: 'subitens 17.8.4.1.1 e 17.8.4.1.2'
  },
  {
    item: 'Conforto térmico',
    parametro: 'Faixa de temperatura do ar entre 18 e 25 °C em ambientes climatizados, com controle da velocidade do ar e da umidade',
    fonte: 'subitem 17.8.4.2'
  },
  {
    item: 'Correntes de ar',
    parametro: 'Controle da ventilação ambiental para minimizar correntes de ar aplicadas diretamente sobre os trabalhadores',
    fonte: 'subitem 17.8.4.2.1'
  }
];

/**
 * Aspectos que a avaliacao percorre, um por capitulo da NR-17.
 *
 * Nao e escala de pontuacao: e a lista do que a avaliacao tem de ALCANCAR,
 * porque o subitem 17.3.1.1 deixa a abordagem a critério de quem avalia.
 */
export const NR17_ASPECTOS: Array<{ chave: string; rotulo: string; fonte: string; ajuda: string }> = [
  {
    chave: 'organizacao',
    rotulo: 'Organização do trabalho',
    fonte: 'item 17.4.1',
    ajuda: 'Normas de produção, modo operatório, exigência de tempo, ritmo, conteúdo das tarefas e aspectos cognitivos.'
  },
  {
    chave: 'sobrecarga',
    rotulo: 'Sobrecarga muscular e exigências repetitivas',
    fonte: 'itens 17.4.2 e 17.4.3',
    ajuda: 'Sobrecarga estática ou dinâmica, posturas extremas, força, frequência de movimentos, vibração e exigência cognitiva.'
  },
  {
    chave: 'cargas',
    rotulo: 'Levantamento, transporte e descarga de cargas',
    fonte: 'item 17.5',
    ajuda: 'Peso, meios técnicos, distância, frequência e treinamento de quem transporta carga não eventual (item 17.5.5).'
  },
  {
    chave: 'mobiliario',
    rotulo: 'Mobiliário do posto de trabalho',
    fonte: 'item 17.6',
    ajuda: 'Regulagens, planos de trabalho, zonas de alcance, assentos e apoio para os pés.'
  },
  {
    chave: 'maquinas',
    rotulo: 'Máquinas, equipamentos e ferramentas manuais',
    fonte: 'item 17.7',
    ajuda: 'Comandos e painéis, terminais de vídeo, computador portátil em uso não eventual, dispositivo de sustentação e seleção de ferramentas.'
  },
  {
    chave: 'conforto',
    rotulo: 'Condições de conforto no ambiente',
    fonte: 'item 17.8',
    ajuda: 'Iluminamento pela NHO 11, conforto acústico e conforto térmico. Ver PARAMETROS_DE_CONFORTO.'
  }
];

/** Conclusao da avaliacao para cada aspecto percorrido. */
export type ConclusaoDoAspecto = 'ADEQUADO' | 'INADEQUADO' | 'NAO_APLICAVEL';

export const CONCLUSAO_POR_EXTENSO: Record<ConclusaoDoAspecto, string> = {
  ADEQUADO: 'Adequado',
  INADEQUADO: 'Inadequado — exige medida',
  NAO_APLICAVEL: 'Não aplicável a esta situação'
};

/** Abordagem empregada, na expressao do subitem 17.3.1.1. */
export type AbordagemDaAvaliacao = 'QUALITATIVA' | 'SEMIQUANTITATIVA' | 'QUANTITATIVA' | 'COMBINADA';

export const ABORDAGEM_POR_EXTENSO: Record<AbordagemDaAvaliacao, string> = {
  QUALITATIVA: 'Qualitativa',
  SEMIQUANTITATIVA: 'Semiquantitativa',
  QUANTITATIVA: 'Quantitativa',
  COMBINADA: 'Combinação de abordagens'
};

/**
 * A organizacao esta dispensada de ELABORAR a AET?
 *
 * Item 17.3.4: ME e EPP enquadradas como graus de risco 1 e 2, e o MEI, nao sao
 * obrigados a elaborar a AET, mas devem atender todos os demais requisitos da
 * NR-17. Subitem 17.3.4.1: essas ME e EPP realizam a AET quando observadas as
 * situacoes das alineas "c" e "d" do item 17.3.2 - saude do trabalhador e
 * analise de acidente ou doenca.
 *
 * `porte` chega da consulta a Receita como texto livre, por isso a comparacao e
 * por conteudo. Sem porte informado nao se presume dispensa: devolve null, e
 * quem le decide.
 */
export function dispensadaDeElaborarAET(
  porte: string | null | undefined,
  grauDeRisco: 1 | 2 | 3 | 4 | null | undefined
): boolean | null {
  const p = String(porte || '').toUpperCase();
  const ehMei = /\bMEI\b|MICROEMPREENDEDOR/.test(p);
  if (ehMei) return true;

  const ehMeOuEpp = /\bME\b|MICROEMPRESA|\bEPP\b|PEQUENO PORTE/.test(p);
  if (!p || (!ehMeOuEpp && !/DEMAIS|MEDIO|GRANDE/.test(p))) return null;
  if (!ehMeOuEpp) return false;
  if (grauDeRisco !== 1 && grauDeRisco !== 2) {
    return grauDeRisco == null ? null : false;
  }
  return true;
}

export const NR17_FUNDAMENTO_DA_DISPENSA =
  'Item 17.3.4 da NR-17: as ME e EPP enquadradas como graus de risco 1 e 2 e o MEI não são '
  + 'obrigados a elaborar a AET, mas devem atender a todos os demais requisitos desta NR. '
  + 'Subitem 17.3.4.1: essas ME e EPP devem realizar a AET quando observadas as situações das '
  + 'alíneas "c" e "d" do item 17.3.2.';
