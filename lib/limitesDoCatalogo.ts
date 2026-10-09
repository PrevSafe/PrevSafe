/**
 * Texto do limite de tolerancia e do nivel de acao do catalogo de riscos.
 *
 * O catalogo guarda o limite em NUMERO (tolerance_limit_value) e em TEXTO
 * (tolerance_limit_reference), porque o texto e o que vai para o inventario e
 * para o PGR. Os dois tem de dizer a mesma coisa: por isso o texto dos itens
 * da listagem, e o de qualquer item cujo numero for editado na tela, sai
 * sempre desta funcao, e nunca de uma formatacao escrita em outro lugar.
 */

/** Unidades que a listagem escreve de mais de um jeito. */
const UNIDADE_NORMALIZADA: Record<string, string> = {
  'mg/m3': 'mg/m³',
};

export function normalizarUnidade(unidade?: string): string | undefined {
  const limpa = (unidade || '').trim();
  if (!limpa) return undefined;
  return UNIDADE_NORMALIZADA[limpa] || limpa;
}

/**
 * 78 + "ppm" -> "78 ppm"; 1480 + "mg/m³" -> "1.480 mg/m³";
 * 0.016 + "ppm" + teto -> "0,016 ppm (valor teto)".
 *
 * Com fonte, o texto diz de onde o numero veio, porque no PGR e no laudo de
 * insalubridade a origem do limite importa tanto quanto ele:
 * 78 + "ppm" + sem teto + "NR-15, Anexo 11" -> "78 ppm (NR-15, Anexo 11)";
 * com teto -> "0,016 ppm (valor teto; NR-15, Anexo 11)". So o catalogo da
 * listagem passa a fonte, e so para o numero conferido no texto da norma; as
 * chamadas de 3 argumentos (a tela, ao editar o numero) continuam iguais -
 * numero editado a mao deixa de ser o da norma e nao deve cita-la.
 *
 * Zero, negativo ou ausente nao e limite: a listagem escreve 0 quando o agente
 * nao tem valor fixo (silica, calor, ruido de impacto), e "0 ppm" no PGR
 * diria que qualquer exposicao ultrapassa o limite.
 */
export function textoDoLimite(
  valor: number | undefined,
  unidade?: string,
  teto?: boolean,
  fonte?: string
): string | undefined {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) return undefined;
  const numero = valor.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  const un = normalizarUnidade(unidade);
  const notas = [teto ? 'valor teto' : '', (fonte || '').trim()].filter(Boolean);
  return `${numero}${un ? ` ${un}` : ''}${notas.length ? ` (${notas.join('; ')})` : ''}`;
}
