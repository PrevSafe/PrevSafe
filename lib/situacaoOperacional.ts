/**
 * Situacao operacional do risco — alinea "b" do subitem 1.5.7.3.2 da NR-01.
 *
 * FONTE
 *
 * "Modelo de PGR" da PrevSafe, secao 5.2:
 *
 *   "Considera o trabalho real, nao apenas o prescrito, em tres situacoes:
 *    rotineira (R), nao rotineira (NR - manutencao, limpeza, setup, parada)
 *    e emergencia (E)."
 *
 * E a secao 7.1, que lista "Situacao operacional | R, NR ou E" como campo
 * obrigatorio do registro do inventario, com a alinea "b".
 *
 * POR QUE E UM CONJUNTO, E NAO UM VALOR
 *
 * O mesmo perigo pode existir em mais de uma situacao, e o exemplo 2 da secao
 * 7.2 do modelo registra exatamente isso: "R e NR (limpeza e ajuste)". O
 * risco de contato com a correia existe na operacao E na limpeza, e a
 * probabilidade nao e a mesma nas duas. Guardar so uma das situacoes apagaria
 * a que costuma ser mais grave - a nao rotineira, feita com a maquina aberta.
 *
 * Por isso o campo e uma lista, acompanhada de uma nota livre para descrever
 * a circunstancia ("limpeza e ajuste", "parada programada", "abandono de
 * area").
 */

export type SituacaoOperacional = 'ROTINEIRA' | 'NAO_ROTINEIRA' | 'EMERGENCIA';

export const SITUACOES_OPERACIONAIS: Array<{
  valor: SituacaoOperacional;
  sigla: 'R' | 'NR' | 'E';
  rotulo: string;
  ajuda: string;
}> = [
  {
    valor: 'ROTINEIRA',
    sigla: 'R',
    rotulo: 'Rotineira',
    ajuda: 'A atividade habitual do GES, como ela acontece no dia a dia.'
  },
  {
    valor: 'NAO_ROTINEIRA',
    sigla: 'NR',
    rotulo: 'Não rotineira',
    ajuda: 'Manutenção, limpeza, setup, parada, partida — em geral com as proteções abertas.'
  },
  {
    valor: 'EMERGENCIA',
    sigla: 'E',
    rotulo: 'Emergência',
    ajuda: 'Incêndio, vazamento, resgate, abandono de área e demais cenários do subitem 1.5.6.'
  }
];

const PORVALOR = new Map(SITUACOES_OPERACIONAIS.map((s) => [s.valor, s]));

/** Aceita a lista gravada em qualquer ordem e descarta valor desconhecido. */
export function normalizarSituacoes(valor: any): SituacaoOperacional[] {
  const bruto = Array.isArray(valor) ? valor : valor ? [valor] : [];
  const vistos = new Set<SituacaoOperacional>();
  for (const item of bruto) {
    const chave = String(item || '').toUpperCase().replace(/[\s-]/g, '_');
    // Aceita tambem a sigla, para quem digitou "R" ou "NR" na importacao.
    const porSigla = SITUACOES_OPERACIONAIS.find((s) => s.sigla === String(item || '').toUpperCase());
    if (PORVALOR.has(chave as SituacaoOperacional)) vistos.add(chave as SituacaoOperacional);
    else if (porSigla) vistos.add(porSigla.valor);
  }
  // Mantem sempre a ordem R, NR, E, para o documento nao variar.
  return SITUACOES_OPERACIONAIS.filter((s) => vistos.has(s.valor)).map((s) => s.valor);
}

/**
 * Como a situacao sai no PGR: "R", "R e NR", "R e NR (limpeza e ajuste)".
 * Devolve string vazia quando nao ha situacao registrada — quem chama decide
 * se isso vira pendencia.
 */
export function descreverSituacao(valor: any, nota?: string): string {
  const situacoes = normalizarSituacoes(valor);
  if (situacoes.length === 0) return '';
  const siglas = situacoes.map((s) => PORVALOR.get(s)!.sigla);
  const texto =
    siglas.length === 1
      ? siglas[0]
      : `${siglas.slice(0, -1).join(', ')} e ${siglas[siglas.length - 1]}`;
  const complemento = String(nota || '').trim();
  return complemento ? `${texto} (${complemento})` : texto;
}

/** Forma longa, para telas: "Rotineira e Não rotineira". */
export function descreverSituacaoPorExtenso(valor: any): string {
  const situacoes = normalizarSituacoes(valor);
  if (situacoes.length === 0) return '';
  const rotulos = situacoes.map((s) => PORVALOR.get(s)!.rotulo);
  return rotulos.length === 1
    ? rotulos[0]
    : `${rotulos.slice(0, -1).join(', ')} e ${rotulos[rotulos.length - 1].toLowerCase()}`;
}

/** O registro atende a alinea "b"? */
export const temSituacaoOperacional = (risco: any): boolean =>
  normalizarSituacoes(risco?.operational_situation).length > 0;
