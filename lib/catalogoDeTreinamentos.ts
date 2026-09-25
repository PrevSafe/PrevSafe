/**
 * Catalogo de treinamentos das NR — sugestoes para a matriz de capacitacao
 * (secao 9.7 do PGR).
 *
 * TODA LINHA DAQUI FOI EXTRAIDA DO TEXTO PUBLICADO DA NORMA, e carrega o
 * subitem em `fonte`. Nada aqui foi escrito de memoria: carga horaria de NR e
 * periodicidade sao o tipo de dado que, errado num certificado, invalida a
 * capacitacao.
 *
 * O CAMPO QUE IMPORTA MAIS E `base`
 *
 * O subitem 1.7.1.2.2 da NR-01 diz que o treinamento periodico ocorre "de
 * acordo com periodicidade estabelecida nas NR ou, quando nao estabelecido, em
 * prazo determinado pelo empregador". Ha portanto tres situacoes distintas, e
 * confundi-las e o erro classico da matriz de capacitacao:
 *
 *   NORMA        a NR fixa carga horaria e/ou periodicidade (NR-10, NR-33,
 *                NR-35, NR-13)
 *   EMPREGADOR   a NR exige o treinamento mas NAO fixa carga nem periodicidade
 *                (NR-06, NR-12, NR-26). Quem define e o empregador, e a matriz
 *                tem de registrar o que ele definiu
 *   ORGANIZACAO  requisito proprio, nao exigido por NR
 *
 * A NR-12 e explicita: a capacitacao deve "ter carga horaria minima, definida
 * pelo empregador, que garanta aos trabalhadores executarem suas atividades com
 * seguranca" (alinea "c" do subitem 12.16.3). Atribuir a ela uma carga
 * normativa e inventar norma.
 *
 * O QUE NAO ESTA AQUI: NR-18, NR-20, NR-22, NR-31, NR-32, NR-34, NR-36 e NR-37
 * tambem exigem capacitacao. Ficaram fora porque nao foram conferidas no texto
 * oficial nesta revisao - e uma lacuna declarada vale mais que um numero
 * plausivel. A tela permite cadastrar qualquer treinamento a mao.
 */

/** De onde vem a carga horaria e a periodicidade da capacitacao. */
export type BaseDaCapacitacao = 'NORMA' | 'EMPREGADOR' | 'ORGANIZACAO';

export interface TreinamentoDoCatalogo {
  /** Chave estavel, usada pela tela e pelos testes. */
  chave: string;
  nome: string;
  /** Rotulo da NR: "NR-35". */
  norma: string;
  /** Subitem exato que exige o treinamento. */
  fonte: string;
  base: BaseDaCapacitacao;
  /** Carga horaria inicial. Vazio quando a norma nao a fixa. */
  cargaInicial?: string;
  /** Periodicidade do periodico em meses. Vazio quando a norma nao a fixa. */
  periodicidadeMeses?: number;
  /** Carga horaria do periodico. */
  cargaPeriodica?: string;
  /** A quem se aplica, na expressao da propria norma. */
  publico: string;
  /** Observacao que o PGR imprime junto da linha. */
  nota?: string;
}

/**
 * Carga horaria do treinamento da CIPA: depende do grau de risco.
 *
 * Nao entra no catalogo como numero fixo. A tela a busca em
 * lib/nr5Quadros.ts (NR5_CARGA_HORARIA_TREINAMENTO), que e a fonte unica ja
 * conferida, e a preenche conforme o grau do estabelecimento.
 */
export const CHAVE_CIPA = 'nr05-cipa';

export const CATALOGO_DE_TREINAMENTOS: TreinamentoDoCatalogo[] = [
  // -----------------------------------------------------------------------
  // NR-01
  // -----------------------------------------------------------------------
  {
    chave: 'nr01-inicial',
    nome: 'Treinamento inicial de segurança e saúde no trabalho',
    norma: 'NR-01',
    fonte: 'subitens 1.7.1.2 "a" e 1.7.1.2.1',
    base: 'EMPREGADOR',
    publico: 'Todo trabalhador, antes de iniciar suas funções',
    nota: 'A NR-01 exige que ocorra antes de o trabalhador iniciar suas funções, e não fixa carga horária: quem a define é o empregador.'
  },
  // -----------------------------------------------------------------------
  // NR-05
  // -----------------------------------------------------------------------
  {
    chave: CHAVE_CIPA,
    nome: 'CIPA — treinamento dos membros titulares e suplentes',
    norma: 'NR-05',
    fonte: 'item 5.7.4',
    base: 'NORMA',
    publico: 'Membros titulares e suplentes da CIPA',
    nota: 'A carga horária mínima varia com o grau de risco do estabelecimento (Quadro I da NR-04, Anexo I). A tela a preenche conforme o grau cadastrado.'
  },
  // -----------------------------------------------------------------------
  // NR-06
  // -----------------------------------------------------------------------
  {
    chave: 'nr06-epi',
    nome: 'Uso adequado, guarda e conservação de EPI',
    norma: 'NR-06',
    fonte: 'alínea "d" do subitem 6.6.1',
    base: 'EMPREGADOR',
    publico: 'Todo trabalhador que recebe EPI',
    nota: 'A NR-06 obriga a orientar e treinar, e não fixa carga horária nem periodicidade.'
  },
  // -----------------------------------------------------------------------
  // NR-10 — Quadro I do subitem 10.9.2 e periodico do 10.9.10
  // -----------------------------------------------------------------------
  {
    chave: 'nr10-basico',
    nome: 'Segurança em instalações e serviços em eletricidade — Básico',
    norma: 'NR-10',
    fonte: 'Quadro I do subitem 10.9.2 e subitem 10.9.10',
    base: 'NORMA',
    cargaInicial: '40 h',
    periodicidadeMeses: 24,
    cargaPeriodica: '16 h',
    publico: 'Trabalhadores autorizados (capítulo 10.10)',
    nota: 'O periódico é bienal, com carga horária mínima de 16 horas e conteúdo adequado às instalações e aos procedimentos da organização (subitem 10.9.10).'
  },
  {
    chave: 'nr10-sep',
    nome: 'Segurança em eletricidade — Complementar do SEP',
    norma: 'NR-10',
    fonte: 'Quadro I do subitem 10.9.2 e subitem 10.9.5',
    base: 'NORMA',
    cargaInicial: '40 h',
    periodicidadeMeses: 24,
    cargaPeriodica: '16 h',
    publico: 'Trabalhadores autorizados que atuam no Sistema Elétrico de Potência ou em sua proximidade'
  },
  {
    chave: 'nr10-mt-at',
    nome: 'Segurança em eletricidade — Complementar de Média e Alta Tensão (SEC)',
    norma: 'NR-10',
    fonte: 'Quadro I do subitem 10.9.2 e subitem 10.9.6',
    base: 'NORMA',
    cargaInicial: '16 h',
    periodicidadeMeses: 24,
    cargaPeriodica: '16 h',
    publico: 'Trabalhadores autorizados que atuam em média e alta tensão no SEC ou em sua proximidade'
  },
  {
    chave: 'nr10-area-classificada',
    nome: 'Segurança em eletricidade — Complementar de Área Classificada',
    norma: 'NR-10',
    fonte: 'Quadro I do subitem 10.9.2 e subitem 10.9.7',
    base: 'NORMA',
    cargaInicial: '16 h',
    periodicidadeMeses: 24,
    cargaPeriodica: '16 h',
    publico: 'Trabalhadores que realizam serviços em eletricidade em áreas classificadas'
  },
  // -----------------------------------------------------------------------
  // NR-11
  // -----------------------------------------------------------------------
  {
    chave: 'nr11-operador',
    nome: 'Operador de equipamento de transporte motorizado',
    norma: 'NR-11',
    fonte: 'subitens 11.1.5 e 11.1.6.1',
    base: 'EMPREGADOR',
    publico: 'Operadores de equipamentos de transporte com força motriz própria',
    nota: 'O treinamento é específico e dado pela empresa, sem carga horária fixada. O cartão de identificação do operador tem validade de 1 ano e a revalidação exige exame de saúde completo, por conta do empregador (subitem 11.1.6.1).'
  },
  // -----------------------------------------------------------------------
  // NR-12
  // -----------------------------------------------------------------------
  {
    chave: 'nr12-maquinas',
    nome: 'Operação, manutenção e inspeção de máquinas e equipamentos',
    norma: 'NR-12',
    fonte: 'subitens 12.16.2 e 12.16.3',
    base: 'EMPREGADOR',
    publico: 'Trabalhadores que operam, mantêm, inspecionam ou intervêm em máquinas',
    nota: 'Ocorre antes de o trabalhador assumir a função, sem ônus para ele e durante a jornada. A carga horária mínima é definida pelo empregador, de modo a garantir a execução segura da atividade (alínea "c" do subitem 12.16.3).'
  },
  // -----------------------------------------------------------------------
  // NR-13
  // -----------------------------------------------------------------------
  {
    chave: 'nr13-caldeiras',
    nome: 'Treinamento de Segurança na Operação de Caldeiras',
    norma: 'NR-13',
    fonte: 'alínea "f" do item A1.3 do Anexo I',
    base: 'NORMA',
    cargaInicial: '40 h',
    publico: 'Operadores de caldeira'
  },
  {
    chave: 'nr13-unidades-processo',
    nome: 'Treinamento de Segurança na Operação de Unidades de Processo',
    norma: 'NR-13',
    fonte: 'alínea "f" do item B1.4 do Anexo II',
    base: 'NORMA',
    cargaInicial: '40 h',
    publico: 'Operadores de unidades de processo'
  },
  // -----------------------------------------------------------------------
  // NR-26
  // -----------------------------------------------------------------------
  {
    chave: 'nr26-quimicos',
    nome: 'Rotulagem preventiva, FDS, perigos e emergência com produto químico',
    norma: 'NR-26',
    fonte: 'subitem 26.5.2',
    base: 'EMPREGADOR',
    publico: 'Trabalhadores que utilizam produto químico no local de trabalho',
    nota: 'Abrange compreender a rotulagem preventiva e a ficha com dados de segurança, e os perigos, riscos, medidas preventivas e procedimentos de emergência. A NR-26 não fixa carga horária nem periodicidade.'
  },
  // -----------------------------------------------------------------------
  // NR-33
  // -----------------------------------------------------------------------
  {
    chave: 'nr33-autorizados',
    nome: 'Espaços confinados — trabalhadores autorizados e Vigias',
    norma: 'NR-33',
    fonte: 'subitens 33.3.5.4 e 33.3.5.3',
    base: 'NORMA',
    cargaInicial: '16 h',
    periodicidadeMeses: 12,
    cargaPeriodica: '8 h',
    publico: 'Trabalhadores autorizados e Vigias',
    nota: 'A capacitação inicial é realizada dentro do horário de trabalho (subitem 33.3.5.4).'
  },
  {
    chave: 'nr33-supervisores',
    nome: 'Espaços confinados — Supervisores de Entrada',
    norma: 'NR-33',
    fonte: 'subitens 33.3.5.6 e 33.3.5.3',
    base: 'NORMA',
    cargaInicial: '40 h',
    periodicidadeMeses: 12,
    cargaPeriodica: '8 h',
    publico: 'Supervisores de Entrada',
    nota: 'Conteúdo do subitem 33.3.5.4 acrescido dos itens do 33.3.5.5, entre eles programa de proteção respiratória, área classificada e operações de salvamento.'
  },
  // -----------------------------------------------------------------------
  // NR-35
  // -----------------------------------------------------------------------
  {
    chave: 'nr35-altura',
    nome: 'Trabalho em altura',
    norma: 'NR-35',
    fonte: 'subitens 35.3.2 e 35.3.3.1',
    base: 'NORMA',
    cargaInicial: '8 h',
    periodicidadeMeses: 24,
    cargaPeriodica: '8 h',
    publico: 'Trabalhadores que executam trabalho em altura',
    nota: 'Treinamento teórico e prático, com aprovação (subitem 35.3.2). O periódico é bienal, com 8 horas mínimas e conteúdo definido pelo empregador (subitem 35.3.3.1).'
  }
];

/**
 * Situacoes que obrigam treinamento EVENTUAL, na literalidade do subitem
 * 1.7.1.2.3 da NR-01.
 *
 * Nao sao linhas da matriz: sao gatilhos. A carga horaria, o prazo e o
 * conteudo atendem a situacao que os motivou (subitem 1.7.1.2.3.1).
 */
export const GATILHOS_DE_TREINAMENTO_EVENTUAL: string[] = [
  'Mudança nos procedimentos, condições ou operações de trabalho que impliquem alteração dos riscos ocupacionais (alínea "a").',
  'Ocorrência de acidente grave ou fatal que indique a necessidade de novo treinamento (alínea "b").',
  'Retorno de afastamento ao trabalho por período superior a 180 dias (alínea "c").'
];

export const catalogoPorChave = (chave: string): TreinamentoDoCatalogo | undefined =>
  CATALOGO_DE_TREINAMENTOS.find((t) => t.chave === chave);

/** Rotulo de `base`, para a tela e para o PDF usarem o mesmo texto. */
export const BASE_POR_EXTENSO: Record<BaseDaCapacitacao, string> = {
  NORMA: 'Fixada na NR',
  EMPREGADOR: 'Definida pelo empregador (subitem 1.7.1.2.2)',
  ORGANIZACAO: 'Requisito próprio da organização'
};
