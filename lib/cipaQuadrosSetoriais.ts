/**
 * QUADROS SETORIAIS DE DIMENSIONAMENTO DA CIPA.
 *
 * A CIPA geral (NR-05) esta em lib/nr5Quadros.ts. Aqui ficam os setores que
 * tem quadro PROPRIO na norma: CIPATR (NR-31) e CIPAMIN (NR-22). Os dois NAO
 * usam grau de risco — dependem apenas do numero de trabalhadores.
 *
 * Setores que NAO tem quadro proprio e seguem o Quadro I da NR-05:
 *   - Industria da construcao (Anexo I da NR-05) — por canteiro de obras;
 *   - Servicos de saude (NR-32) — a NR-32 nao traz dimensionamento de CIPA;
 *   - Trabalho aquaviario (NR-30, item 30.6.1) — NR-05 mais um acrescimo que
 *     depende do numero de embarcacoes (ver NOTA_NR30_AQUAVIARIOS).
 *
 * Mesma regra da casa das demais tabelas: dado faltando devolve
 * "nao dimensionado", e coluna inexistente na norma devolve null. Nunca um
 * numero plausivel.
 */

import { FaixaEmpregados, ResultadoQuadroIStatus } from './nr5Quadros';

export interface ResultadoQuadroSetorial {
  status: ResultadoQuadroIStatus;
  titularesEmpregados: number | null;
  /** null quando o quadro oficial nao traz coluna de suplentes (caso da NR-31). */
  suplentesEmpregados: number | null;
  titularesEmpregador: number | null;
  suplentesEmpregador: number | null;
  empregados: number | null;
  faixa: string | null;
  cargaHorariaTreinamento: number | null;
  fundamentacao: string;
}

// ===========================================================================
// CIPATR — QUADRO 2 DA NR-31
// ===========================================================================

/**
 * FONTE (conferida no arquivo oficial, item 31.5.3):
 *   NR-31 — Seguranca e Saude no Trabalho na Agricultura, Pecuaria,
 *   Silvicultura, Exploracao Florestal e Aquicultura. Quadro 2 retificado pela
 *   Portaria MTP n.o 698, de 04/04/2022; item 31.5 alterado pela Portaria MTP
 *   n.o 4.219, de 20/12/2022.
 *   https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/
 *   conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/
 *   normas-regulamentadora/normas-regulamentadoras-vigentes/nr-31-atualizada-2024-2.pdf
 *
 * Fidelidade ao texto:
 * - A CIPATR nao depende de grau de risco, so do numero de trabalhadores.
 * - O Quadro 2 traz apenas MEMBROS, sem coluna de suplentes. A consulta
 *   devolve suplentes = null; o sistema nao inventa suplentes.
 * - Obrigatoria a partir de 20 empregados por prazo indeterminado (31.5.2).
 * - Treinamento: carga horaria minima de 20 horas (31.5.25).
 * - Mandato: 2 anos (31.5.6).
 * - Na redacao vigente a CIPATR esta no item 31.5, nao no antigo 31.7.
 */
export const NR31_FAIXAS_QUADRO_2: FaixaEmpregados[] = [
  { min: 20, max: 35, rotulo: '20 a 35' },
  { min: 36, max: 70, rotulo: '36 a 70' },
  { min: 71, max: 100, rotulo: '71 a 100' },
  { min: 101, max: 500, rotulo: '101 a 500' },
  { min: 501, max: 1000, rotulo: '501 a 1000' },
  { min: 1001, max: Number.MAX_SAFE_INTEGER, rotulo: 'acima de 1000' },
];

/** Representacao paritaria, um valor por faixa de NR31_FAIXAS_QUADRO_2. */
export const NR31_QUADRO_2 = {
  representantesTrabalhadores: [1, 2, 3, 4, 5, 6],
  representantesEmpregador: [1, 2, 3, 4, 5, 6],
};

export const NR31_CARGA_HORARIA_CIPATR = 20;

export const NR31_FUNDAMENTACAO =
  'Quadro 2 da NR-31 (retificado pela Portaria MTP nº 698/2022; item 31.5 alterado pela Portaria MTP nº 4.219/2022).';

// ===========================================================================
// CIPAMIN — QUADRO III DA NR-22
// ===========================================================================

/**
 * FONTE (conferida no arquivo oficial, Quadro III do anexo da norma):
 *   NR-22 — Seguranca e Saude Ocupacional na Mineracao, texto vigente.
 *   https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/
 *   conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/
 *   normas-regulamentadora/normas-regulamentadoras-vigentes/nr-22-atualizada-2022.pdf
 *
 * Fidelidade ao texto:
 * - A CIPAMIN nao depende de grau de risco, so do numero de empregados.
 * - O empregador tem 1 titular e 1 suplente em TODAS as faixas, e o quadro traz
 *   "---" na coluna de acrescimo do empregador: acima de 5.000 a representacao
 *   do empregador nao cresce.
 * - Quando o estabelecimento nao se enquadra no Quadro III, o item 22.36.3.2
 *   manda indicar um representante.
 * - Treinamento: 40 horas anuais, das quais 20 antes da posse (22.36.12.3).
 */
export const NR22_FAIXAS_QUADRO_III: FaixaEmpregados[] = [
  { min: 15, max: 30, rotulo: '15 a 30' },
  { min: 31, max: 50, rotulo: '31 a 50' },
  { min: 51, max: 100, rotulo: '51 a 100' },
  { min: 101, max: 250, rotulo: '101 a 250' },
  { min: 251, max: 500, rotulo: '251 a 500' },
  { min: 501, max: 1000, rotulo: '501 a 1.000' },
  { min: 1001, max: 2500, rotulo: '1.001 a 2.500' },
  { min: 2501, max: 5000, rotulo: '2.501 a 5.000' },
];

export const NR22_LIMITE_ULTIMA_FAIXA = 5000;
export const NR22_GRUPO_ACRESCIMO = 500;

export const NR22_QUADRO_III = {
  titularesEmpregador: [1, 1, 1, 1, 1, 1, 1, 1],
  suplentesEmpregador: [1, 1, 1, 1, 1, 1, 1, 1],
  titularesEmpregados: [1, 2, 3, 4, 5, 6, 9, 12],
  suplentesEmpregados: [1, 1, 1, 1, 2, 2, 3, 4],
  /** Coluna "acima de 5.000 para cada grupo de 500 acrescentar". */
  acrescimoPorGrupo: {
    titularesEmpregador: 0, // "---" no quadro oficial
    suplentesEmpregador: 0, // "---" no quadro oficial
    titularesEmpregados: 4,
    suplentesEmpregados: 2,
  },
};

export const NR22_CARGA_HORARIA_CIPAMIN = 40;

export const NR22_FUNDAMENTACAO = 'Quadro III da NR-22 — Dimensionamento da CIPAMIN.';

// ===========================================================================
// NOTAS DE SETORES QUE SEGUEM O QUADRO I DA NR-05
// ===========================================================================

/**
 * NR-30: a CIPA dos aquaviarios segue a NR-05 (item 30.6.1), com um acrescimo
 * que depende do NUMERO DE EMBARCACOES, dado que o sistema nao coleta. O
 * acrescimo nao e calculado: e informado ao usuario.
 */
export const NOTA_NR30_AQUAVIARIOS =
  'NR-30, item 30.6.1.1: além do dimensionamento do Quadro I da NR-05, os aquaviários são representados na ' +
  'CIPA do estabelecimento com maior número de trabalhadores, na razão de 1 (um) membro titular para cada ' +
  '10 (dez) embarcações da organização, ou fração, e 1 (um) suplente para cada 20 (vinte) embarcações, ou ' +
  'fração. O sistema não calcula esse acréscimo porque não coleta o número de embarcações — informe-o manualmente.';

/**
 * Anexo I da NR-05 (industria da construcao): CIPA POR CANTEIRO DE OBRAS,
 * usando o MESMO Quadro I da NR-05. Nao existe na norma vigente o limiar de 70
 * trabalhadores que versoes antigas traziam.
 */
export const NOTA_NR18_CONSTRUCAO =
  'Anexo I da NR-05 (CIPA da Indústria da Construção): a CIPA é constituída por canteiro de obras quando o ' +
  'número de empregados se enquadrar no Quadro I da NR-05 (item 3.1). Quando o canteiro não se enquadrar, ' +
  'nomeia-se ao menos um representante (item 3.1.1). Obras com até 180 dias de duração e frentes de trabalho ' +
  'têm regra própria — confira os itens 3.1.2 a 3.3 do Anexo I.';

/** NR-32: a norma nao traz dimensionamento proprio de CIPA. */
export const NOTA_NR32_SAUDE =
  'A NR-32 não estabelece dimensionamento próprio de CIPA: aplica-se o Quadro I da NR-05. O conteúdo ' +
  'específico de agentes biológicos e perfurocortantes entra no treinamento, não no número de membros.';

// ===========================================================================
// CONSULTAS
// ===========================================================================

function dadoAusente(empregados: number | null | undefined): boolean {
  const n = Number(empregados);
  return empregados === null || empregados === undefined || !Number.isFinite(n) || n < 0;
}

/** Consulta o Quadro 2 da NR-31 (CIPATR). Nao usa grau de risco. */
export function consultarQuadroCipatr(
  empregados: number | null | undefined
): ResultadoQuadroSetorial {
  const vazio: ResultadoQuadroSetorial = {
    status: 'NAO_DIMENSIONADO',
    titularesEmpregados: null,
    suplentesEmpregados: null,
    titularesEmpregador: null,
    suplentesEmpregador: null,
    empregados: null,
    faixa: null,
    cargaHorariaTreinamento: NR31_CARGA_HORARIA_CIPATR,
    fundamentacao: '',
  };

  if (dadoAusente(empregados)) {
    return {
      ...vazio,
      fundamentacao:
        'Número de trabalhadores no estabelecimento rural não informado. Sem esse dado o Quadro 2 da NR-31 ' +
        'não pode ser aplicado.',
    };
  }

  const total = Math.floor(Number(empregados));
  const indice = NR31_FAIXAS_QUADRO_2.findIndex((f) => total >= f.min && total <= f.max);

  if (indice < 0) {
    return {
      ...vazio,
      status: 'REPRESENTANTE_NR05',
      empregados: total,
      fundamentacao:
        `Empregador rural com ${total} trabalhador(es) não se enquadra no Quadro 2 da NR-31: a CIPATR é ` +
        'obrigatória a partir de 20 empregados contratados por prazo indeterminado (item 31.5.2).',
    };
  }

  const faixa = NR31_FAIXAS_QUADRO_2[indice];
  return {
    status: 'CIPA',
    titularesEmpregados: NR31_QUADRO_2.representantesTrabalhadores[indice],
    suplentesEmpregados: null, // o Quadro 2 nao tem coluna de suplentes
    titularesEmpregador: NR31_QUADRO_2.representantesEmpregador[indice],
    suplentesEmpregador: null,
    empregados: total,
    faixa: faixa.rotulo,
    cargaHorariaTreinamento: NR31_CARGA_HORARIA_CIPATR,
    fundamentacao:
      `${NR31_FUNDAMENTACAO} Faixa de ${faixa.rotulo} trabalhadores. O Quadro 2 estabelece apenas o número de ` +
      'representantes de cada parte, de forma paritária; a norma não traz coluna de suplentes. Mandato de ' +
      '2 anos (item 31.5.6) e treinamento de 20 horas (item 31.5.25).',
  };
}

/** Consulta o Quadro III da NR-22 (CIPAMIN). Nao usa grau de risco. */
export function consultarQuadroCipamin(
  empregados: number | null | undefined
): ResultadoQuadroSetorial {
  const vazio: ResultadoQuadroSetorial = {
    status: 'NAO_DIMENSIONADO',
    titularesEmpregados: null,
    suplentesEmpregados: null,
    titularesEmpregador: null,
    suplentesEmpregador: null,
    empregados: null,
    faixa: null,
    cargaHorariaTreinamento: NR22_CARGA_HORARIA_CIPAMIN,
    fundamentacao: '',
  };

  if (dadoAusente(empregados)) {
    return {
      ...vazio,
      fundamentacao:
        'Número de empregados no estabelecimento não informado. Sem esse dado o Quadro III da NR-22 ' +
        'não pode ser aplicado.',
    };
  }

  const total = Math.floor(Number(empregados));

  if (total > NR22_LIMITE_ULTIMA_FAIXA) {
    const ultimo = NR22_FAIXAS_QUADRO_III.length - 1;
    const grupos = Math.ceil((total - NR22_LIMITE_ULTIMA_FAIXA) / NR22_GRUPO_ACRESCIMO);
    const a = NR22_QUADRO_III.acrescimoPorGrupo;
    return {
      status: 'CIPA',
      titularesEmpregados: NR22_QUADRO_III.titularesEmpregados[ultimo] + grupos * a.titularesEmpregados,
      suplentesEmpregados: NR22_QUADRO_III.suplentesEmpregados[ultimo] + grupos * a.suplentesEmpregados,
      titularesEmpregador: NR22_QUADRO_III.titularesEmpregador[ultimo],
      suplentesEmpregador: NR22_QUADRO_III.suplentesEmpregador[ultimo],
      empregados: total,
      faixa: `acima de 5.000 (${grupos} grupo(s) de 500)`,
      cargaHorariaTreinamento: NR22_CARGA_HORARIA_CIPAMIN,
      fundamentacao:
        `${NR22_FUNDAMENTACAO} Acima de 5.000 empregados, para cada grupo de 500 acrescentam-se 4 titulares e ` +
        '2 suplentes dos empregados; a representação do empregador não é acrescida ("---" no quadro). ' +
        'O sistema conta cada grupo de 500 iniciado acima de 5.000 — confira o enquadramento com o ' +
        'profissional responsável.',
    };
  }

  const indice = NR22_FAIXAS_QUADRO_III.findIndex((f) => total >= f.min && total <= f.max);
  if (indice < 0) {
    return {
      ...vazio,
      status: 'REPRESENTANTE_NR05',
      empregados: total,
      fundamentacao:
        `Estabelecimento de mineração com ${total} empregado(s) não se enquadra no Quadro III da NR-22. ` +
        'Conforme o item 22.36.3.2, a empresa ou o Permissionário de Lavra Garimpeira deve indicar um ' +
        'representante para cumprir os objetivos da CIPAMIN.',
    };
  }

  const faixa = NR22_FAIXAS_QUADRO_III[indice];
  return {
    status: 'CIPA',
    titularesEmpregados: NR22_QUADRO_III.titularesEmpregados[indice],
    suplentesEmpregados: NR22_QUADRO_III.suplentesEmpregados[indice],
    titularesEmpregador: NR22_QUADRO_III.titularesEmpregador[indice],
    suplentesEmpregador: NR22_QUADRO_III.suplentesEmpregador[indice],
    empregados: total,
    faixa: faixa.rotulo,
    cargaHorariaTreinamento: NR22_CARGA_HORARIA_CIPAMIN,
    fundamentacao:
      `${NR22_FUNDAMENTACAO} Faixa de ${faixa.rotulo} empregados. Treinamento de 40 horas anuais, das quais ` +
      '20 horas antes da posse (item 22.36.12.3).',
  };
}
