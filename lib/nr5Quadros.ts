/**
 * QUADROS DE DIMENSIONAMENTO DA CIPA — NR-05 e normas setoriais.
 *
 * O quadro principal e o Quadro I da NR-05. Os quadros proprios da CIPATR
 * (NR-31) e da CIPAMIN (NR-22) estao em lib/cipaQuadrosSetoriais.ts, cada um
 * com a sua fonte.
 *
 * FONTE do Quadro I (conferida diretamente no arquivo oficial, pagina 11):
 *   NR-05 — Comissao Interna de Prevencao de Acidentes e de Assedio - CIPA
 *   Texto dado pela Portaria MTP n.o 422, de 07/10/2021 (DOU 08/10/21),
 *   alterado pela Portaria MTP n.o 4.219, de 20/12/2022 (DOU 22/12/22).
 *   https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/
 *   conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/
 *   normas-regulamentadora/normas-regulamentadoras-vigentes/NR05atualizada2023.pdf
 *
 * ---------------------------------------------------------------------------
 * ATENCAO — NAO EXISTE "AGRUPAMENTO DE CNAE" NA NR-05 VIGENTE
 * ---------------------------------------------------------------------------
 * A redacao ANTIGA da NR-05 (anterior a Portaria MTP 422/2021) dimensionava a
 * CIPA por AGRUPAMENTO de CNAE: Quadro II (agrupamento) cruzado com o Quadro I
 * (faixas de empregados), e o Quadro III relacionava cada CNAE ao seu grupo
 * (C-1, C-2, ...). Essa sistematica FOI REVOGADA.
 *
 * Na redacao VIGENTE ha um unico quadro — o Quadro I — e ele cruza GRAU DE
 * RISCO com FAIXA DE EMPREGADOS. A propria nota de rodape do quadro oficial diz,
 * textualmente:
 *
 *   "*Grau de Risco conforme estabelecido no Quadro I da NR-04 - Relacao da
 *    Classificacao Nacional de Atividades Economicas - CNAE (Versao 2.0), com
 *    correspondente Grau de Risco - GR para fins de dimensionamento do SESMT."
 *
 * Ou seja: a NR-05 vigente usa exatamente o mesmo grau de risco da NR-04, que
 * neste projeto vem de lib/nr4AnexoI.ts. Nao existe tabela de agrupamento de
 * CNAE para transcrever, e inventar uma seria pior do que nao ter nenhuma.
 *
 * ---------------------------------------------------------------------------
 * ESTA TABELA NAO ESTIMA
 * ---------------------------------------------------------------------------
 * Celula em branco no quadro oficial significa "o estabelecimento NAO se
 * enquadra no Quadro I" — e nesse caso a NR-05 nao manda constituir CIPA, manda
 * nomear um representante (item 5.4.13). A consulta devolve esse desfecho
 * explicitamente. Grau de risco ausente ou numero de empregados ausente devolve
 * "nao dimensionado", nunca um numero plausivel.
 */

export type GrauDeRiscoNR5 = 1 | 2 | 3 | 4;

export interface FaixaEmpregados {
  /** Limite inferior da faixa, inclusive. */
  min: number;
  /** Limite superior da faixa, inclusive. */
  max: number;
  /** Rotulo exatamente como impresso no cabecalho do Quadro I. */
  rotulo: string;
}

/**
 * Cabecalho "NUMERO DE EMPREGADOS NO ESTABELECIMENTO" do Quadro I, na ordem
 * impressa. A 14a coluna do quadro ("Acima de 10.000, para cada grupo de 2.500
 * acrescentar") nao e uma faixa: e uma regra de acrescimo, tratada a parte.
 */
export const NR5_FAIXAS_QUADRO_I: FaixaEmpregados[] = [
  { min: 0, max: 19, rotulo: '0 a 19' },
  { min: 20, max: 29, rotulo: '20 a 29' },
  { min: 30, max: 50, rotulo: '30 a 50' },
  { min: 51, max: 80, rotulo: '51 a 80' },
  { min: 81, max: 100, rotulo: '81 a 100' },
  { min: 101, max: 120, rotulo: '101 a 120' },
  { min: 121, max: 140, rotulo: '121 a 140' },
  { min: 141, max: 300, rotulo: '141 a 300' },
  { min: 301, max: 500, rotulo: '301 a 500' },
  { min: 501, max: 1000, rotulo: '501 a 1000' },
  { min: 1001, max: 2500, rotulo: '1001 a 2500' },
  { min: 2501, max: 5000, rotulo: '2501 a 5000' },
  { min: 5001, max: 10000, rotulo: '5001 a 10.000' },
];

/** Faixa a partir da qual vale a regra de acrescimo por grupo de 2.500. */
export const NR5_LIMITE_ULTIMA_FAIXA = 10000;

/** Tamanho do grupo de acrescimo acima de 10.000 empregados. */
export const NR5_GRUPO_ACRESCIMO = 2500;

export interface LinhaQuadroI {
  /**
   * Um valor por faixa de NR5_FAIXAS_QUADRO_I, na mesma ordem.
   * null = celula EM BRANCO no quadro oficial (nao se enquadra).
   */
  efetivos: Array<number | null>;
  suplentes: Array<number | null>;
  /** Coluna "Acima de 10.000 para cada grupo de 2.500 acrescentar". */
  acrescimoPorGrupo: { efetivos: number; suplentes: number };
}

/**
 * Transcricao literal do Quadro I. Conferido celula a celula pelas coordenadas
 * de cada numero no PDF oficial, nao por leitura de resumo de terceiros.
 *
 * Observacao de fidelidade: no quadro publicado, os graus 3 e 4 coincidem nas
 * faixas 141 a 300, 301 a 500 e 501 a 1000 (4/5/6 efetivos). Isso e o que esta
 * impresso; a tabela reproduz, nao "corrige".
 */
export const NR5_QUADRO_I: Record<GrauDeRiscoNR5, LinhaQuadroI> = {
  1: {
    //         0-19  20-29 30-50 51-80 81-100 101-120 121-140 141-300 301-500 501-1000 1001-2500 2501-5000 5001-10000
    efetivos: [null, null, null, null, 1, 1, 1, 1, 2, 4, 5, 6, 8],
    suplentes: [null, null, null, null, 1, 1, 1, 1, 2, 3, 4, 5, 6],
    acrescimoPorGrupo: { efetivos: 1, suplentes: 1 },
  },
  2: {
    efetivos: [null, null, null, 1, 1, 2, 2, 3, 4, 5, 6, 8, 10],
    suplentes: [null, null, null, 1, 1, 1, 1, 2, 3, 4, 5, 6, 8],
    acrescimoPorGrupo: { efetivos: 1, suplentes: 1 },
  },
  3: {
    efetivos: [null, 1, 1, 2, 2, 2, 3, 4, 5, 6, 8, 10, 12],
    suplentes: [null, 1, 1, 1, 1, 1, 2, 2, 4, 4, 6, 8, 8],
    acrescimoPorGrupo: { efetivos: 2, suplentes: 2 },
  },
  4: {
    efetivos: [null, 1, 2, 3, 3, 4, 4, 4, 5, 6, 9, 11, 13],
    suplentes: [null, 1, 1, 2, 2, 2, 2, 3, 4, 5, 7, 8, 10],
    acrescimoPorGrupo: { efetivos: 2, suplentes: 2 },
  },
};

/** Carga horaria minima de treinamento — NR-05, item 5.7.4. */
export const NR5_CARGA_HORARIA_TREINAMENTO: Record<GrauDeRiscoNR5, number> = {
  1: 8,
  2: 12,
  3: 16,
  4: 20,
};

export const NR5_FUNDAMENTACAO =
  'Quadro I da NR-05 (texto dado pela Portaria MTP nº 422/2021, alterado pela Portaria MTP nº 4.219/2022).';

export type ResultadoQuadroIStatus =
  /** Enquadrou no Quadro I: ha CIPA, com numero de membros definido. */
  | 'CIPA'
  /** Nao se enquadra no Quadro I: item 5.4.13 — representante nomeado da NR-05. */
  | 'REPRESENTANTE_NR05'
  /** Faltou dado (grau de risco ou numero de empregados). Nao ha o que dimensionar. */
  | 'NAO_DIMENSIONADO';

export interface ResultadoQuadroI {
  status: ResultadoQuadroIStatus;
  /** null quando status != 'CIPA'. Nunca um valor estimado. */
  efetivos: number | null;
  suplentes: number | null;
  grau: GrauDeRiscoNR5 | null;
  empregados: number | null;
  /** Rotulo da faixa aplicada, como impresso no quadro. null se nao enquadrou. */
  faixa: string | null;
  /** Carga horaria minima (item 5.7.4). null quando o grau nao foi informado. */
  cargaHorariaTreinamento: number | null;
  /** Texto visivel ao usuario explicando o enquadramento ou a falta de dado. */
  fundamentacao: string;
  /**
   * true quando o resultado depende da leitura da coluna "Acima de 10.000".
   * Ver NOTA_ACIMA_DE_10000.
   */
  aplicouAcrescimoAcimaDe10000: boolean;
}

/**
 * O quadro diz "Acima de 10.000 para cada grupo de 2.500 acrescentar N", sem
 * dizer o que fazer com grupo incompleto. Esta implementacao conta cada grupo
 * de 2.500 INICIADO acima de 10.000 (10.001..12.500 = 1 grupo), que e a unica
 * leitura que mantem o quadro continuo. A alternativa (so grupos completos)
 * faria 10.001 empregados exigirem a mesma CIPA de 10.000, o que contradiz a
 * progressao do proprio quadro. A leitura fica declarada no resultado para que
 * o profissional responsavel possa conferir.
 */
export const NOTA_ACIMA_DE_10000 =
  'Acima de 10.000 empregados o Quadro I da NR-05 manda acrescentar, para cada grupo de 2.500, ' +
  'o número indicado na última coluna. O sistema conta cada grupo de 2.500 iniciado acima de 10.000. ' +
  'A norma não explicita o tratamento de grupo incompleto — confira o enquadramento com o profissional responsável.';

function grauValido(grau: any): grau is GrauDeRiscoNR5 {
  return grau === 1 || grau === 2 || grau === 3 || grau === 4;
}

/**
 * Consulta o Quadro I da NR-05.
 *
 * Devolve 'NAO_DIMENSIONADO' quando falta grau de risco ou numero de empregados
 * — nao assume grau 3, nao assume 100 empregados, nao arredonda.
 */
export function consultarQuadroI(
  grau: GrauDeRiscoNR5 | null | undefined,
  empregados: number | null | undefined
): ResultadoQuadroI {
  const base: ResultadoQuadroI = {
    status: 'NAO_DIMENSIONADO',
    efetivos: null,
    suplentes: null,
    grau: null,
    empregados: null,
    faixa: null,
    cargaHorariaTreinamento: null,
    fundamentacao: '',
    aplicouAcrescimoAcimaDe10000: false,
  };

  if (!grauValido(grau)) {
    return {
      ...base,
      fundamentacao:
        'Grau de risco não informado ou inválido. O dimensionamento da CIPA depende do grau de risco ' +
        'do Anexo I da NR-04. Informe o CNAE do estabelecimento ou o grau de risco.',
    };
  }

  const n = Number(empregados);
  if (empregados === null || empregados === undefined || !Number.isFinite(n) || n < 0) {
    return {
      ...base,
      grau,
      cargaHorariaTreinamento: NR5_CARGA_HORARIA_TREINAMENTO[grau],
      fundamentacao:
        'Número de empregados no estabelecimento não informado. Sem esse dado o Quadro I da NR-05 ' +
        'não pode ser aplicado.',
    };
  }

  const total = Math.floor(n);
  const linha = NR5_QUADRO_I[grau];
  const cargaHoraria = NR5_CARGA_HORARIA_TREINAMENTO[grau];

  // Acima da ultima faixa impressa: base da faixa 5.001 a 10.000 + acrescimo.
  if (total > NR5_LIMITE_ULTIMA_FAIXA) {
    const ultima = NR5_FAIXAS_QUADRO_I.length - 1;
    const baseEf = linha.efetivos[ultima];
    const baseSup = linha.suplentes[ultima];
    const grupos = Math.ceil((total - NR5_LIMITE_ULTIMA_FAIXA) / NR5_GRUPO_ACRESCIMO);
    return {
      status: 'CIPA',
      efetivos: (baseEf as number) + grupos * linha.acrescimoPorGrupo.efetivos,
      suplentes: (baseSup as number) + grupos * linha.acrescimoPorGrupo.suplentes,
      grau,
      empregados: total,
      faixa: `acima de 10.000 (${grupos} grupo(s) de 2.500)`,
      cargaHorariaTreinamento: cargaHoraria,
      fundamentacao: `${NR5_FUNDAMENTACAO} ${NOTA_ACIMA_DE_10000}`,
      aplicouAcrescimoAcimaDe10000: true,
    };
  }

  const indice = NR5_FAIXAS_QUADRO_I.findIndex((f) => total >= f.min && total <= f.max);
  if (indice < 0) {
    return {
      ...base,
      grau,
      empregados: total,
      cargaHorariaTreinamento: cargaHoraria,
      fundamentacao:
        'Número de empregados fora das faixas do Quadro I da NR-05. Informe o enquadramento manualmente.',
    };
  }

  const faixa = NR5_FAIXAS_QUADRO_I[indice];
  const ef = linha.efetivos[indice];
  const sup = linha.suplentes[indice];

  // Celula em branco no quadro oficial -> item 5.4.13, representante nomeado.
  if (ef === null || sup === null) {
    return {
      status: 'REPRESENTANTE_NR05',
      efetivos: null,
      suplentes: null,
      grau,
      empregados: total,
      faixa: faixa.rotulo,
      cargaHorariaTreinamento: cargaHoraria,
      fundamentacao:
        `Estabelecimento com ${total} empregado(s) e grau de risco ${grau} não se enquadra no Quadro I da NR-05 ` +
        `(faixa ${faixa.rotulo}). Não há CIPA a constituir: conforme o item 5.4.13, quando o estabelecimento não ` +
        'se enquadra no Quadro I e não é atendido por SESMT, a organização deve nomear um representante da NR-05 ' +
        'entre seus empregados. O MEI está dispensado (item 5.4.13.2).',
      aplicouAcrescimoAcimaDe10000: false,
    };
  }

  return {
    status: 'CIPA',
    efetivos: ef,
    suplentes: sup,
    grau,
    empregados: total,
    faixa: faixa.rotulo,
    cargaHorariaTreinamento: cargaHoraria,
    fundamentacao: `${NR5_FUNDAMENTACAO} Grau de risco ${grau}, faixa de ${faixa.rotulo} empregados no estabelecimento.`,
    aplicouAcrescimoAcimaDe10000: false,
  };
}
