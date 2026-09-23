/**
 * Tabela 24 do eSocial - Fatores de Riscos Ambientais.
 *
 * ESTADO ATUAL: so a VALIDACAO DE FORMATO esta aqui. A tabela oficial ainda
 * nao foi transcrita.
 *
 * POR QUE APENAS ISSO
 *
 * A Tabela 24 tem centenas de codigos, e nenhum deles pode ser escrito de
 * memoria. Foi assim que o catalogo de riscos e os protocolos de exame
 * acumularam codigos errados: alguem digitou o que parecia certo. Enquanto o
 * documento oficial nao entra no projeto, o sistema confere o FORMATO e a
 * unicidade - o que da para afirmar sem a fonte - e nao finge conhecer os
 * codigos.
 *
 * O QUE O FORMATO GARANTE, E O QUE NAO GARANTE
 *
 * Garante que "01.01.001" tem a forma que o eSocial espera e que "1.1.1" ou
 * "audiometria" nao passam. NAO garante que aquele codigo existe na tabela nem
 * que corresponde ao agente descrito - para isso e necessaria a tabela.
 *
 * QUANDO A TABELA OFICIAL CHEGAR
 *
 * Este arquivo passa a exportar TABELA_24 e consultarFatorDeRisco, nos moldes
 * de lib/tabela27.ts, e o catalogo passa a escolher o codigo em vez de
 * aceita-lo digitado.
 */

/**
 * Grupos da Tabela 24, pelos dois primeiros digitos do codigo.
 *
 * Os grupos 01 a 05 sao os mesmos do inventario de riscos da NR-01 (fisico,
 * quimico, biologico, ergonomico, acidentes). O grupo 09 e o de ausencia de
 * fator de risco. Esta relacao entre o prefixo e o grupo e estrutural - vem da
 * organizacao da propria tabela -, e por isso pode ficar aqui.
 */
export const GRUPOS_TABELA_24: Record<string, string> = {
  '01': 'Físico',
  '02': 'Químico',
  '03': 'Biológico',
  '04': 'Ergonômico',
  '05': 'Acidentes / Mecânico',
  '09': 'Ausência de fator de risco',
};

/**
 * Codigo de ausencia de fator de risco.
 *
 * Fica nomeado porque o catalogo o usava com o codigo 05.01.001, que e do
 * grupo 05 (acidentes) - ou seja, "ausencia de risco" estava cadastrada como
 * um risco de acidente, e com o MESMO codigo do risco de queda em altura.
 *
 * O prefixo do grupo (09) e estrutural. Os tres ultimos digitos precisam ser
 * conferidos na tabela oficial antes de este valor ser usado para declarar
 * algo ao governo.
 */
export const CODIGO_AUSENCIA_DE_RISCO = '09.01.001';

export interface ResultadoFormatoTabela24 {
  valido: boolean;
  /** Codigo normalizado no formato NN.NN.NNN. Vazio quando invalido. */
  codigo: string;
  /** Nome do grupo, quando o prefixo e reconhecido. */
  grupo?: string;
  /** Texto pronto para a tela, presente apenas quando invalido. */
  motivo?: string;
}

/**
 * Confere o formato do codigo da Tabela 24 e normaliza para NN.NN.NNN.
 *
 * Aceita com ou sem pontos ("0101001" e "01.01.001") e ignora um sufixo
 * descritivo ("01.01.001 - Ruido continuo"), porque e assim que os codigos
 * costumam estar gravados.
 */
export function formatoDoCodigoTabela24(valor: string | undefined | null): ResultadoFormatoTabela24 {
  const bruto = (valor || '').trim();

  if (!bruto) {
    return { valido: false, codigo: '', motivo: 'Informe o código da Tabela 24 do eSocial.' };
  }

  // Corta um sufixo descritivo, se houver.
  const antesDaSeparacao = bruto.split(/\s+[-–]\s+/)[0].trim();
  const digitos = antesDaSeparacao.replace(/\D/g, '');

  if (digitos.length !== 7) {
    return {
      valido: false,
      codigo: '',
      motivo:
        `"${bruto}" não tem a forma de um código da Tabela 24. ` +
        'São 7 dígitos, no formato NN.NN.NNN — por exemplo 01.01.001.',
    };
  }

  const codigo = `${digitos.slice(0, 2)}.${digitos.slice(2, 4)}.${digitos.slice(4)}`;
  const grupo = GRUPOS_TABELA_24[digitos.slice(0, 2)];

  if (!grupo) {
    return {
      valido: false,
      codigo,
      motivo:
        `O grupo "${digitos.slice(0, 2)}" não existe na Tabela 24. ` +
        `Os grupos são: ${Object.entries(GRUPOS_TABELA_24)
          .map(([n, g]) => `${n} (${g})`)
          .join(', ')}.`,
    };
  }

  return { valido: true, codigo, grupo };
}

/**
 * Codigos repetidos num conjunto de riscos.
 *
 * Dois agentes com o mesmo codigo tornam impossivel saber qual deles o S-2240
 * esta declarando. O catalogo tinha 05.01.001 em dois itens: "Risco de queda
 * em altura" e "Ausencia de fatores de risco" - dois opostos, um codigo so.
 */
export function codigosDuplicados(
  itens: Array<{ code_table_24?: string; name?: string }>
): Array<{ codigo: string; nomes: string[] }> {
  const porCodigo = new Map<string, string[]>();

  itens.forEach((item) => {
    const codigo = formatoDoCodigoTabela24(item?.code_table_24).codigo || (item?.code_table_24 || '');
    if (!codigo) return;
    const nomes = porCodigo.get(codigo) || [];
    nomes.push(item?.name || 'sem nome');
    porCodigo.set(codigo, nomes);
  });

  return [...porCodigo.entries()]
    .filter(([, nomes]) => nomes.length > 1)
    .map(([codigo, nomes]) => ({ codigo, nomes }));
}
