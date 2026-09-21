/**
 * DIMENSIONAMENTO DO SESMT — NR-04.
 *
 * FONTE (conferida diretamente no arquivo oficial, paginas 30 e 31):
 *   NR-04 — Servicos Especializados em Seguranca e em Medicina do Trabalho,
 *   redacao dada pela Portaria MTP n.o 2.318, de 03/08/2022.
 *   https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/
 *   conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/
 *   normas-regulamentadora/normas-regulamentadoras-vigentes/nr-04-atualizada-2023.pdf
 *
 * ---------------------------------------------------------------------------
 * NOME DO QUADRO
 * ---------------------------------------------------------------------------
 * Na redacao VIGENTE da NR-04 a tabela de dimensionamento chama-se ANEXO II
 * ("ANEXO II — DIMENSIONAMENTO DO SESMT"), e a relacao CNAE x grau de risco
 * chama-se ANEXO I. O nome "Quadro II" vem da redacao anterior. O arquivo
 * mantem o nome nr4QuadroII pedido no projeto, mas o conteudo e o Anexo II
 * vigente. A relacao CNAE x grau de risco esta em lib/nr4AnexoI.ts.
 *
 * ---------------------------------------------------------------------------
 * ESTA TABELA NAO ESTIMA
 * ---------------------------------------------------------------------------
 * Celula em branco no Anexo II significa profissional NAO exigido naquela faixa
 * — zero, nao "pelo menos um". Faixa inexistente para o grau significa que o
 * estabelecimento nao se enquadra no Anexo II e esta dispensado de SESMT
 * proprio. Grau de risco ausente devolve "nao dimensionado", nunca um numero.
 *
 * A regra acima de 5.000 empregados NAO e extrapolada por conta propria: ela
 * esta escrita na nota (**) do proprio Anexo II, reproduzida em
 * NOTA_ACIMA_DE_5000 e implementada literalmente.
 */

export type GrauDeRiscoNR4 = 1 | 2 | 3 | 4;

export interface FaixaTrabalhadores {
  min: number;
  max: number;
  /** Rotulo exatamente como impresso no cabecalho do Anexo II. */
  rotulo: string;
}

/**
 * Cabecalho "N.o de Trabalhadores no estabelecimento" do Anexo II, na ordem
 * impressa. A 8a coluna ("Acima de 5.000 ...") nao e faixa: e regra de
 * acrescimo, tratada a parte.
 */
export const NR4_FAIXAS_ANEXO_II: FaixaTrabalhadores[] = [
  { min: 50, max: 100, rotulo: '50 a 100' },
  { min: 101, max: 250, rotulo: '101 a 250' },
  { min: 251, max: 500, rotulo: '251 a 500' },
  { min: 501, max: 1000, rotulo: '501 a 1.000' },
  { min: 1001, max: 2000, rotulo: '1.001 a 2.000' },
  { min: 2001, max: 3500, rotulo: '2.001 a 3.500' },
  { min: 3501, max: 5000, rotulo: '3.501 a 5.000' },
];

export const NR4_LIMITE_ULTIMA_FAIXA = 5000;

/** Nota (**) do Anexo II: grupos de 4.000, com fracao ACIMA de 2.000 contando como grupo. */
export const NR4_GRUPO_ACRESCIMO = 4000;
export const NR4_FRACAO_ACRESCIMO = 2000;

/**
 * Quantidade de cada profissional numa celula do Anexo II.
 * tempoParcial* reproduz os asteriscos do quadro; nao altera a quantidade.
 */
export interface CelulaAnexoII {
  tecnicoSegurancaTrabalho: number;
  engenheiroSegurancaTrabalho: number;
  auxTecEnfermagemTrabalho: number;
  enfermeiroTrabalho: number;
  medicoTrabalho: number;
  /** (*) Tempo parcial (minimo de tres horas) — por profissional. */
  tempoParcial?: Array<'engenheiro' | 'enfermeiro' | 'medico' | 'tecnico'>;
  /** (***) Pode substituir o aux./tec. de enfermagem por enfermeiro em tempo parcial. */
  auxEnfermagemSubstituivel?: boolean;
}

const VAZIA: CelulaAnexoII = {
  tecnicoSegurancaTrabalho: 0,
  engenheiroSegurancaTrabalho: 0,
  auxTecEnfermagemTrabalho: 0,
  enfermeiroTrabalho: 0,
  medicoTrabalho: 0,
};

/**
 * Transcricao literal do Anexo II. Cada celula foi conferida pelas coordenadas
 * de cada numero no PDF oficial (paginas 30 e 31), nao por resumo de terceiros.
 *
 * Indices seguem NR4_FAIXAS_ANEXO_II. `acrescimoPorGrupo` e a coluna
 * "Acima de 5.000".
 */
export const NR4_ANEXO_II: Record<
  GrauDeRiscoNR4,
  { faixas: CelulaAnexoII[]; acrescimoPorGrupo: CelulaAnexoII }
> = {
  1: {
    faixas: [
      VAZIA, // 50 a 100
      VAZIA, // 101 a 250
      VAZIA, // 251 a 500
      { ...VAZIA, tecnicoSegurancaTrabalho: 1 }, // 501 a 1.000
      { ...VAZIA, tecnicoSegurancaTrabalho: 1, medicoTrabalho: 1, tempoParcial: ['medico'] }, // 1.001 a 2.000
      {
        tecnicoSegurancaTrabalho: 1,
        engenheiroSegurancaTrabalho: 1,
        auxTecEnfermagemTrabalho: 1,
        enfermeiroTrabalho: 0,
        medicoTrabalho: 1,
        tempoParcial: ['engenheiro', 'medico'],
        auxEnfermagemSubstituivel: true,
      }, // 2.001 a 3.500
      {
        tecnicoSegurancaTrabalho: 2,
        engenheiroSegurancaTrabalho: 1,
        auxTecEnfermagemTrabalho: 1,
        enfermeiroTrabalho: 1,
        medicoTrabalho: 1,
        tempoParcial: ['enfermeiro'],
      }, // 3.501 a 5.000
    ],
    acrescimoPorGrupo: {
      tecnicoSegurancaTrabalho: 1,
      engenheiroSegurancaTrabalho: 1,
      auxTecEnfermagemTrabalho: 1,
      enfermeiroTrabalho: 0,
      medicoTrabalho: 1,
      tempoParcial: ['engenheiro', 'medico'],
    },
  },
  2: {
    faixas: [
      VAZIA, // 50 a 100
      VAZIA, // 101 a 250
      VAZIA, // 251 a 500
      { ...VAZIA, tecnicoSegurancaTrabalho: 1 }, // 501 a 1.000
      {
        tecnicoSegurancaTrabalho: 1,
        engenheiroSegurancaTrabalho: 1,
        auxTecEnfermagemTrabalho: 1,
        enfermeiroTrabalho: 0,
        medicoTrabalho: 1,
        tempoParcial: ['engenheiro', 'medico'],
        auxEnfermagemSubstituivel: true,
      }, // 1.001 a 2.000
      {
        tecnicoSegurancaTrabalho: 2,
        engenheiroSegurancaTrabalho: 1,
        auxTecEnfermagemTrabalho: 1,
        enfermeiroTrabalho: 0,
        medicoTrabalho: 1,
        auxEnfermagemSubstituivel: true,
      }, // 2.001 a 3.500
      {
        tecnicoSegurancaTrabalho: 5,
        engenheiroSegurancaTrabalho: 1,
        auxTecEnfermagemTrabalho: 1,
        enfermeiroTrabalho: 1,
        medicoTrabalho: 1,
      }, // 3.501 a 5.000
    ],
    acrescimoPorGrupo: {
      tecnicoSegurancaTrabalho: 1,
      engenheiroSegurancaTrabalho: 1,
      auxTecEnfermagemTrabalho: 1,
      enfermeiroTrabalho: 0,
      medicoTrabalho: 1,
      tempoParcial: ['engenheiro'],
    },
  },
  3: {
    faixas: [
      VAZIA, // 50 a 100
      { ...VAZIA, tecnicoSegurancaTrabalho: 1 }, // 101 a 250
      { ...VAZIA, tecnicoSegurancaTrabalho: 2 }, // 251 a 500
      {
        tecnicoSegurancaTrabalho: 3,
        engenheiroSegurancaTrabalho: 1,
        auxTecEnfermagemTrabalho: 0,
        enfermeiroTrabalho: 0,
        medicoTrabalho: 1,
        tempoParcial: ['engenheiro', 'medico'],
      }, // 501 a 1.000
      {
        tecnicoSegurancaTrabalho: 4,
        engenheiroSegurancaTrabalho: 1,
        auxTecEnfermagemTrabalho: 1,
        enfermeiroTrabalho: 0,
        medicoTrabalho: 1,
        auxEnfermagemSubstituivel: true,
      }, // 1.001 a 2.000
      {
        tecnicoSegurancaTrabalho: 6,
        engenheiroSegurancaTrabalho: 1,
        auxTecEnfermagemTrabalho: 1,
        enfermeiroTrabalho: 1,
        medicoTrabalho: 1,
      }, // 2.001 a 3.500
      {
        tecnicoSegurancaTrabalho: 8,
        engenheiroSegurancaTrabalho: 2,
        auxTecEnfermagemTrabalho: 1,
        enfermeiroTrabalho: 1,
        medicoTrabalho: 2,
      }, // 3.501 a 5.000
    ],
    acrescimoPorGrupo: {
      tecnicoSegurancaTrabalho: 3,
      engenheiroSegurancaTrabalho: 1,
      auxTecEnfermagemTrabalho: 1,
      enfermeiroTrabalho: 0,
      medicoTrabalho: 1,
    },
  },
  4: {
    faixas: [
      { ...VAZIA, tecnicoSegurancaTrabalho: 1 }, // 50 a 100
      {
        tecnicoSegurancaTrabalho: 2,
        engenheiroSegurancaTrabalho: 1,
        auxTecEnfermagemTrabalho: 0,
        enfermeiroTrabalho: 0,
        medicoTrabalho: 1,
        tempoParcial: ['engenheiro', 'medico'],
      }, // 101 a 250
      {
        tecnicoSegurancaTrabalho: 3,
        engenheiroSegurancaTrabalho: 1,
        auxTecEnfermagemTrabalho: 0,
        enfermeiroTrabalho: 0,
        medicoTrabalho: 1,
        tempoParcial: ['engenheiro', 'medico'],
      }, // 251 a 500
      {
        tecnicoSegurancaTrabalho: 4,
        engenheiroSegurancaTrabalho: 1,
        auxTecEnfermagemTrabalho: 1,
        enfermeiroTrabalho: 0,
        medicoTrabalho: 1,
        auxEnfermagemSubstituivel: true,
      }, // 501 a 1.000
      {
        tecnicoSegurancaTrabalho: 5,
        engenheiroSegurancaTrabalho: 1,
        auxTecEnfermagemTrabalho: 1,
        enfermeiroTrabalho: 0,
        medicoTrabalho: 1,
        auxEnfermagemSubstituivel: true,
      }, // 1.001 a 2.000
      {
        tecnicoSegurancaTrabalho: 8,
        engenheiroSegurancaTrabalho: 2,
        auxTecEnfermagemTrabalho: 1,
        enfermeiroTrabalho: 1,
        medicoTrabalho: 2,
      }, // 2.001 a 3.500
      {
        tecnicoSegurancaTrabalho: 10,
        engenheiroSegurancaTrabalho: 3,
        auxTecEnfermagemTrabalho: 1,
        enfermeiroTrabalho: 1,
        medicoTrabalho: 3,
      }, // 3.501 a 5.000
    ],
    acrescimoPorGrupo: {
      tecnicoSegurancaTrabalho: 3,
      engenheiroSegurancaTrabalho: 1,
      auxTecEnfermagemTrabalho: 1,
      enfermeiroTrabalho: 0,
      medicoTrabalho: 1,
    },
  },
};

/** Nota (**) do Anexo II, transcrita. */
export const NOTA_ACIMA_DE_5000 =
  'O dimensionamento total deverá ser feito levando-se em consideração o dimensionamento da faixa de ' +
  '3.501 a 5.000, acrescido do dimensionamento do(s) grupo(s) de 4.000 ou fração acima de 2.000. (nota ** do Anexo II da NR-04)';

/** Nota (*) do Anexo II. */
export const NOTA_TEMPO_PARCIAL = 'Tempo parcial (mínimo de três horas). (nota * do Anexo II da NR-04)';

/** Nota (***) do Anexo II. */
export const NOTA_SUBSTITUICAO_ENFERMAGEM =
  'O empregador pode optar pela contratação de um enfermeiro do trabalho em tempo parcial, em substituição ' +
  'ao auxiliar ou técnico de enfermagem do trabalho. (nota *** do Anexo II da NR-04)';

/** Observacao A) do Anexo II. */
export const OBSERVACAO_ESTABELECIMENTOS_DE_SAUDE =
  'Hospitais, ambulatórios, maternidades, casas de saúde e repouso, clínicas e estabelecimentos similares ' +
  'deverão contratar um enfermeiro do trabalho em tempo integral quando possuírem mais de quinhentos ' +
  'trabalhadores. (observação A do Anexo II da NR-04)';

export const NR4_FUNDAMENTACAO_ANEXO_II =
  'Anexo II da NR-04 — Dimensionamento do SESMT (redação dada pela Portaria MTP nº 2.318/2022).';

export type ResultadoAnexoIIStatus =
  /** Enquadrou no Anexo II: SESMT proprio obrigatorio. */
  | 'SESMT_OBRIGATORIO'
  /** Nao se enquadra no Anexo II: dispensado de SESMT proprio. */
  | 'DISPENSADO'
  /** Faltou dado. Nao ha o que dimensionar. */
  | 'NAO_DIMENSIONADO';

export interface ResultadoAnexoII {
  status: ResultadoAnexoIIStatus;
  grau: GrauDeRiscoNR4 | null;
  trabalhadores: number | null;
  /** null quando status === 'NAO_DIMENSIONADO'. Nunca um valor estimado. */
  profissionais: CelulaAnexoII | null;
  faixa: string | null;
  /** Numero de grupos de 4.000 aplicados acima de 5.000 (0 quando nao se aplica). */
  gruposAcimaDe5000: number;
  /** Texto visivel ao usuario. */
  fundamentacao: string;
  /** Notas do quadro que incidem sobre este resultado, prontas para exibicao. */
  notas: string[];
}

function grauValido(grau: any): grau is GrauDeRiscoNR4 {
  return grau === 1 || grau === 2 || grau === 3 || grau === 4;
}

function somarCelulas(base: CelulaAnexoII, incremento: CelulaAnexoII, vezes: number): CelulaAnexoII {
  return {
    tecnicoSegurancaTrabalho: base.tecnicoSegurancaTrabalho + incremento.tecnicoSegurancaTrabalho * vezes,
    engenheiroSegurancaTrabalho:
      base.engenheiroSegurancaTrabalho + incremento.engenheiroSegurancaTrabalho * vezes,
    auxTecEnfermagemTrabalho: base.auxTecEnfermagemTrabalho + incremento.auxTecEnfermagemTrabalho * vezes,
    enfermeiroTrabalho: base.enfermeiroTrabalho + incremento.enfermeiroTrabalho * vezes,
    medicoTrabalho: base.medicoTrabalho + incremento.medicoTrabalho * vezes,
  };
}

function temProfissional(c: CelulaAnexoII): boolean {
  return (
    c.tecnicoSegurancaTrabalho +
      c.engenheiroSegurancaTrabalho +
      c.auxTecEnfermagemTrabalho +
      c.enfermeiroTrabalho +
      c.medicoTrabalho >
    0
  );
}

function notasDaCelula(c: CelulaAnexoII): string[] {
  const notas: string[] = [];
  if (c.tempoParcial && c.tempoParcial.length > 0) notas.push(NOTA_TEMPO_PARCIAL);
  if (c.auxEnfermagemSubstituivel) notas.push(NOTA_SUBSTITUICAO_ENFERMAGEM);
  return notas;
}

/**
 * Consulta o Anexo II da NR-04.
 *
 * Devolve 'NAO_DIMENSIONADO' quando falta grau de risco ou numero de
 * trabalhadores — nao assume grau, nao assume quantidade.
 */
export function consultarAnexoII(
  grau: GrauDeRiscoNR4 | null | undefined,
  trabalhadores: number | null | undefined
): ResultadoAnexoII {
  const base: ResultadoAnexoII = {
    status: 'NAO_DIMENSIONADO',
    grau: null,
    trabalhadores: null,
    profissionais: null,
    faixa: null,
    gruposAcimaDe5000: 0,
    fundamentacao: '',
    notas: [],
  };

  if (!grauValido(grau)) {
    return {
      ...base,
      fundamentacao:
        'Grau de risco não informado ou inválido. O dimensionamento do SESMT depende do grau de risco do ' +
        'Anexo I da NR-04. Informe o CNAE do estabelecimento ou o grau de risco.',
    };
  }

  const n = Number(trabalhadores);
  if (trabalhadores === null || trabalhadores === undefined || !Number.isFinite(n) || n < 0) {
    return {
      ...base,
      grau,
      fundamentacao:
        'Número de trabalhadores no estabelecimento não informado. Sem esse dado o Anexo II da NR-04 ' +
        'não pode ser aplicado.',
    };
  }

  const total = Math.floor(n);
  const linha = NR4_ANEXO_II[grau];

  // Acima de 5.000: base da faixa 3.501 a 5.000 + grupos, conforme nota (**).
  if (total > NR4_LIMITE_ULTIMA_FAIXA) {
    const baseCelula = linha.faixas[linha.faixas.length - 1];
    const excedente = total - NR4_LIMITE_ULTIMA_FAIXA;
    const gruposInteiros = Math.floor(excedente / NR4_GRUPO_ACRESCIMO);
    const resto = excedente % NR4_GRUPO_ACRESCIMO;
    const grupos = gruposInteiros + (resto > NR4_FRACAO_ACRESCIMO ? 1 : 0);
    const profissionais = somarCelulas(baseCelula, linha.acrescimoPorGrupo, grupos);
    return {
      status: 'SESMT_OBRIGATORIO',
      grau,
      trabalhadores: total,
      profissionais,
      faixa: `acima de 5.000 (base 3.501 a 5.000 + ${grupos} grupo(s))`,
      gruposAcimaDe5000: grupos,
      fundamentacao: `${NR4_FUNDAMENTACAO_ANEXO_II} ${NOTA_ACIMA_DE_5000}`,
      notas: [NOTA_ACIMA_DE_5000, ...notasDaCelula(baseCelula)],
    };
  }

  const indice = NR4_FAIXAS_ANEXO_II.findIndex((f) => total >= f.min && total <= f.max);

  // Abaixo da primeira faixa do grau, ou faixa com todas as celulas vazias:
  // o estabelecimento nao se enquadra no Anexo II.
  if (indice < 0 || !temProfissional(linha.faixas[indice])) {
    return {
      status: 'DISPENSADO',
      grau,
      trabalhadores: total,
      profissionais: { ...VAZIA },
      faixa: indice >= 0 ? NR4_FAIXAS_ANEXO_II[indice].rotulo : null,
      gruposAcimaDe5000: 0,
      fundamentacao:
        `Estabelecimento com ${total} trabalhador(es) e grau de risco ${grau} não se enquadra no Anexo II da ` +
        'NR-04: não há exigência de SESMT próprio. Permanecem as demais obrigações de SST.',
      notas: [],
    };
  }

  const faixa = NR4_FAIXAS_ANEXO_II[indice];
  const celula = linha.faixas[indice];
  return {
    status: 'SESMT_OBRIGATORIO',
    grau,
    trabalhadores: total,
    profissionais: celula,
    faixa: faixa.rotulo,
    gruposAcimaDe5000: 0,
    fundamentacao: `${NR4_FUNDAMENTACAO_ANEXO_II} Grau de risco ${grau}, faixa de ${faixa.rotulo} trabalhadores.`,
    notas: notasDaCelula(celula),
  };
}
