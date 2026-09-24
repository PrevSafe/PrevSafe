/**
 * Classificacao de risco do PGR — matriz S x P do modelo da PrevSafe.
 *
 * FONTE
 *
 * "Modelo de PGR — Programa de Gerenciamento de Riscos (NR-01)", secoes 5.4 a
 * 5.7, fornecido pelo responsavel tecnico. A matriz, as faixas e os prazos
 * vieram dali, celula por celula. Nada aqui foi escrito de memoria.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * Havia DUAS formulas diferentes no sistema, e as duas divergiam entre si e
 * do modelo:
 *
 *   score   aba do GHE     catalogo de riscos   modelo
 *       4   BAIXO          MUITO_BAIXO          Baixo
 *       9   MEDIO          BAIXO                Medio
 *      12   MEDIO          MEDIO                Alto
 *      20   ALTO           CRITICO              Muito alto
 *
 * O caso de score 20 e o mais grave: no modelo, "muito alto" significa que a
 * atividade NAO SE INICIA ou e interrompida ate a reducao do risco. O mesmo
 * risco era classificado como "alto" ou "critico" conforme a tela em que
 * tivesse sido cadastrado.
 *
 * Agora ha uma funcao so. Quem classificar risco em qualquer lugar do sistema
 * chama `classificarRisco`.
 */

/** Os quatro niveis do modelo (secao 5.6). */
export type NivelDeRiscoPGR = 'BAIXO' | 'MEDIO' | 'ALTO' | 'MUITO_ALTO';

export type GradacaoSP = 1 | 2 | 3 | 4 | 5;

/**
 * Faixas da secao 5.6: Baixo 1-4; Medio 5-10; Alto 12-16; Muito alto 20-25.
 *
 * Os numeros ausentes (11, 13, 14, 17, 18, 19, 21 a 24) nao sao esquecimento
 * do modelo: com S e P inteiros de 1 a 5, o produto nunca cai neles. Os
 * limites abaixo sao inclusivos e cobrem todos os 14 produtos possiveis.
 */
export const FAIXAS_DO_MODELO: Array<{
  nivel: NivelDeRiscoPGR;
  rotulo: string;
  de: number;
  ate: number;
}> = [
  { nivel: 'BAIXO', rotulo: 'Baixo', de: 1, ate: 4 },
  { nivel: 'MEDIO', rotulo: 'Médio', de: 5, ate: 10 },
  { nivel: 'ALTO', rotulo: 'Alto', de: 12, ate: 16 },
  { nivel: 'MUITO_ALTO', rotulo: 'Muito alto', de: 20, ate: 25 }
];

/**
 * Secao 5.7 — Classificacao e tomada de decisao.
 *
 * Os prazos sao os do modelo, que os marca como parametro da organizacao
 * ({{30}}, {{90}}, {{270}} dias). Ficam aqui como padrao da PrevSafe.
 */
export const DECISAO_POR_NIVEL: Record<NivelDeRiscoPGR, {
  rotulo: string;
  classificacao: string;
  prioridade: 1 | 2 | 3 | 4;
  decisao: string;
  prazo: string;
  prazoEmDias: number | null;
}> = {
  MUITO_ALTO: {
    rotulo: 'Muito alto',
    classificacao: 'Inaceitável – prioridade 1',
    prioridade: 1,
    decisao:
      'Atividade não se inicia ou é interrompida até redução do risco; ' +
      'medidas emergenciais imediatas; ciência da direção',
    prazo: 'Emergencial: imediato. Definitiva: 30 dias',
    prazoEmDias: 30
  },
  ALTO: {
    rotulo: 'Alto',
    classificacao: 'Inaceitável sem ação – prioridade 2',
    prioridade: 2,
    decisao:
      'Medidas adicionais obrigatórias; medida provisória enquanto a ' +
      'definitiva é implantada',
    prazo: '90 dias',
    prazoEmDias: 90
  },
  MEDIO: {
    rotulo: 'Médio',
    classificacao: 'Tolerável condicionado – prioridade 3',
    prioridade: 3,
    decisao:
      'Reavaliar controles e implantar melhorias; avaliar necessidade de ' +
      'avaliação quantitativa ou AET',
    prazo: '270 dias',
    prazoEmDias: 270
  },
  BAIXO: {
    rotulo: 'Baixo',
    classificacao: 'Tolerável – prioridade 4',
    prioridade: 4,
    decisao: 'Manter e monitorar controles existentes',
    prazo: 'Verificação em até 12 meses',
    prazoEmDias: 365
  }
};

export interface RiscoClassificado {
  severidade: GradacaoSP;
  probabilidade: GradacaoSP;
  /** S x P, de 1 a 25. */
  score: number;
  nivel: NivelDeRiscoPGR;
  rotulo: string;
  classificacao: string;
  prioridade: 1 | 2 | 3 | 4;
  decisao: string;
  prazo: string;
  prazoEmDias: number | null;
}

const ehGradacao = (v: any): v is GradacaoSP =>
  v === 1 || v === 2 || v === 3 || v === 4 || v === 5;

/**
 * Classifica um risco pela matriz do modelo.
 *
 * Devolve `null` quando severidade ou probabilidade nao foram avaliadas. O
 * sistema NAO escolhe uma classificacao padrao: a classificacao define a
 * prioridade e o prazo do plano de acao, e e decisao do responsavel tecnico.
 */
export function classificarRisco(
  severidade: any,
  probabilidade: any
): RiscoClassificado | null {
  if (!ehGradacao(severidade) || !ehGradacao(probabilidade)) return null;

  const score = severidade * probabilidade;
  const faixa = FAIXAS_DO_MODELO.find((f) => score >= f.de && score <= f.ate);

  // Inalcancavel com S e P de 1 a 5, mas nao se inventa nivel se acontecer.
  if (!faixa) return null;

  const decisao = DECISAO_POR_NIVEL[faixa.nivel];
  return {
    severidade,
    probabilidade,
    score,
    nivel: faixa.nivel,
    rotulo: faixa.rotulo,
    classificacao: decisao.classificacao,
    prioridade: decisao.prioridade,
    decisao: decisao.decisao,
    prazo: decisao.prazo,
    prazoEmDias: decisao.prazoEmDias
  };
}

/**
 * A matriz 5 x 5 como o modelo a imprime (secao 5.6), de S5 a S1.
 *
 * Gerada pela mesma funcao que classifica, e nao digitada a parte: se a
 * funcao e a tabela impressa no PGR puderem divergir, um dia divergem.
 */
export function matrizDoModelo(): Array<{
  severidade: GradacaoSP;
  celulas: Array<{ probabilidade: GradacaoSP; score: number; rotulo: string }>;
}> {
  const gradacoes: GradacaoSP[] = [5, 4, 3, 2, 1];
  return gradacoes.map((s) => ({
    severidade: s,
    celulas: ([1, 2, 3, 4, 5] as GradacaoSP[]).map((p) => {
      const c = classificarRisco(s, p)!;
      return { probabilidade: p, score: c.score, rotulo: c.rotulo };
    })
  }));
}

/**
 * Converte os niveis antigos gravados no banco para os quatro do modelo.
 *
 * O sistema usava cinco niveis, com MUITO_BAIXO e CRITICO. Os riscos ja
 * cadastrados os carregam, e o PGR nao pode imprimir um nivel que a secao 5.6
 * do modelo nao reconhece.
 *
 *   MUITO_BAIXO -> BAIXO        (a faixa mais baixa do modelo)
 *   CRITICO     -> MUITO_ALTO   (a faixa mais alta do modelo)
 *
 * Havendo severidade e probabilidade gravadas, prefira `classificarRisco`:
 * reclassificar pelo calculo e mais fiel do que traduzir o rotulo antigo.
 */
export function normalizarNivelAntigo(nivel: any): NivelDeRiscoPGR | null {
  switch (String(nivel || '').toUpperCase()) {
    case 'MUITO_BAIXO':
    case 'BAIXO':
      return 'BAIXO';
    case 'MEDIO':
    case 'MÉDIO':
      return 'MEDIO';
    case 'ALTO':
      return 'ALTO';
    case 'CRITICO':
    case 'CRÍTICO':
    case 'MUITO_ALTO':
      return 'MUITO_ALTO';
    default:
      return null;
  }
}

/**
 * O nivel de um risco gravado: recalculado quando ha S e P, traduzido do
 * rotulo antigo quando nao ha, e `null` quando nao da para afirmar nada.
 */
export function nivelDoRisco(risco: any): NivelDeRiscoPGR | null {
  const calculado = classificarRisco(risco?.severity, risco?.probability);
  if (calculado) return calculado.nivel;
  return normalizarNivelAntigo(risco?.risk_level);
}
