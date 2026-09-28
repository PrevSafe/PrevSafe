/**
 * Protocolos de exame do PCMSO: a quem cada um alcanca, e o que a
 * periodicidade cadastrada implica.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * A matriz de exames define, por GHE, QUAIS exames sao devidos, com que
 * periodicidade e por qual gatilho. Ela e a unica fonte do codigo da Tabela 27
 * que vai no S-2220 - mas tres coisas dela ficavam no ar:
 *
 *   1. o filtro "quais protocolos sao deste cliente" estava escrito duas vezes
 *      e diferente: o card do painel contava os de TODOS os clientes, e a
 *      lista abaixo dele contava so os de um. Os dois numeros discordavam a
 *      partir do segundo cliente
 *   2. os protocolos MODELO, que acompanham o sistema, apareciam em todo
 *      cliente sem se identificarem como modelo - quem nao soubesse disso
 *      achava que o PCMSO daquele cliente ja estava cadastrado
 *   3. a periodicidade cadastrada nao governava nada: a validade do ASO era um
 *      ano fixo, digitado no formulario. Uma audiometria semestral saia
 *      semestral no PCMSO impresso e o alerta de vencimento continuava
 *      contando doze meses
 *
 * O QUE ESTE ARQUIVO NAO FAZ
 *
 * Nao arbitra periodicidade. Quando a matriz nao define nenhuma para o
 * trabalhador, `periodicidadeDoTrabalhador` devolve null e quem chama pede a
 * data ao medico - em vez de repetir "12 meses", que era um numero sem
 * origem, escrito no formulario.
 */

import { somarMesesISO } from '@/lib/datas';

/** Um protocolo MODELO nasce sem cliente e sem GHE: vale para todos ate ser copiado. */
export function ehProtocoloModelo(protocolo: any): boolean {
  return !String(protocolo?.client_id || '').trim()
    && !String(protocolo?.ghe_id || '').trim();
}

/** O protocolo esta ativo? Status ausente conta como ativo, como no resto do sistema. */
function ativo(protocolo: any): boolean {
  return protocolo?.status !== 'INACTIVE';
}

/**
 * Protocolos que aparecem para um cliente: os dele, os dos GHE dele e os
 * modelo. Sem cliente selecionado, todos.
 */
export function protocolosDoCliente(
  protocolos: any[],
  ghes: any[],
  clientId: string | null | undefined
): any[] {
  const lista = (Array.isArray(protocolos) ? protocolos : []).filter(ativo);
  if (!clientId) return lista;
  const ghesDoCliente = new Set(
    (Array.isArray(ghes) ? ghes : [])
      .filter((g: any) => g?.client_id === clientId)
      .map((g: any) => g?.id)
  );
  return lista.filter((p: any) => {
    if (ehProtocoloModelo(p)) return true;
    if (p?.client_id === clientId) return true;
    return Boolean(p?.ghe_id) && ghesDoCliente.has(p.ghe_id);
  });
}

/**
 * Protocolos que alcancam um trabalhador.
 *
 * Protocolo sem cliente e modelo e alcanca qualquer um; protocolo sem GHE
 * alcanca todos os GHE daquele cliente. `tipoDeAso` filtra pelos gatilhos
 * quando informado.
 */
export function protocolosDoTrabalhador(
  protocolos: any[],
  colaborador: any,
  tipoDeAso?: string
): any[] {
  return (Array.isArray(protocolos) ? protocolos : [])
    .filter(ativo)
    .filter((p: any) => !p?.client_id || p.client_id === colaborador?.client_id)
    .filter((p: any) => !colaborador?.ghe_id || !p?.ghe_id || p.ghe_id === colaborador.ghe_id)
    .filter((p: any) => !tipoDeAso
      || !Array.isArray(p?.triggers)
      || p.triggers.length === 0
      || p.triggers.includes(tipoDeAso));
}

/**
 * Periodicidade que governa o proximo exame periodico deste trabalhador.
 *
 * E a MENOR entre os protocolos que o alcancam e preveem exame periodico:
 * quem tem audiometria semestral e hemograma anual volta em seis meses, senao
 * a audiometria vence sozinha no meio do caminho.
 *
 * null = a matriz nao define periodicidade nenhuma para ele. Nesse caso o
 * sistema NAO arbitra um prazo: quem define e o medico coordenador.
 */
export function periodicidadeDoTrabalhador(
  protocolos: any[],
  colaborador: any
): { meses: number; origem: string } | null {
  const candidatos = protocolosDoTrabalhador(protocolos, colaborador, 'PERIODICO')
    .map((p: any) => ({
      meses: Number(p?.periodicity_months),
      origem: String(p?.exam_name || '').trim() || 'exame sem nome',
    }))
    .filter((c) => Number.isFinite(c.meses) && c.meses > 0);

  if (candidatos.length === 0) return null;
  return candidatos.reduce((menor, atual) => (atual.meses < menor.meses ? atual : menor));
}

/**
 * Validade sugerida do ASO, a partir da matriz.
 *
 * Sugestao, e nao imposicao: o medico coordenador pode alterar a data na
 * tela. O que mudou e que, antes, o numero nao vinha de lugar nenhum.
 */
export function validadeSugeridaDoAso(
  dataDoExame: string,
  protocolos: any[],
  colaborador: any
): { data: string; meses: number; origem: string } | null {
  const periodicidade = periodicidadeDoTrabalhador(protocolos, colaborador);
  if (!periodicidade) return null;
  const data = somarMesesISO(dataDoExame, periodicidade.meses);
  if (!data) return null;
  return { data, meses: periodicidade.meses, origem: periodicidade.origem };
}
