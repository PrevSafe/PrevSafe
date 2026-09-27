/**
 * Fila dos eventos de sessao (entrada e saida) ate o servidor confirmar.
 *
 * POR QUE ESTES DOIS EVENTOS NAO PASSAM PELA SINCRONIZACAO NORMAL
 *
 * O resto do sistema sobe por diferenca, com debounce, e so enquanto
 * `isAuthenticated`. Os dois eventos de sessao caem fora disso, cada um pelo
 * seu lado:
 *
 *   LOGIN   e registrado antes de a sessao existir. Logo depois, o snapshot do
 *           servidor e aplicado sobre o estado local - e leva o registro
 *           embora.
 *   LOGOUT  e registrado e, no mesmo instante, `isAuthenticated` vira falso:
 *           o efeito de envio e cancelado antes de o debounce disparar.
 *
 * O resultado era uma trilha de auditoria sem nenhum login e sem nenhum
 * logout: as duas coisas que ela existe para poder mostrar.
 *
 * COMO FUNCIONA AGORA
 *
 * O evento e enfileirado aqui, em localStorage, e enviado numa gravacao
 * unica e imediata. Se o envio falhar - sem rede, token ja invalidado,
 * organizacao ainda desconhecida - ele FICA na fila e sobe na proxima entrada.
 * localStorage, e nao memoria, justamente porque o caso comum de falha e a
 * aba ser fechada em seguida.
 *
 * Este arquivo nao importa nada: a gravacao entra por parametro. E o que
 * permite testar a fila sem rede e sem Supabase.
 */

/** Fila de eventos ainda nao confirmados pelo servidor. */
export const CHAVE_FILA_DE_SESSAO = 'prevsafe:auditoria:sessao-pendente';

/**
 * Teto da fila.
 *
 * Passando disso, os mais ANTIGOS saem: uma fila que cresce sem fim estoura a
 * cota do localStorage e derruba tambem o que ainda ia ser gravado. Cinquenta
 * entradas sao cinquenta entradas e saidas sem rede - nao acontece por
 * acidente, e quando acontece o que interessa e o mais recente.
 */
export const TETO_DA_FILA = 50;

export interface EnvioDaAuditoria {
  ok: boolean;
  message?: string;
}

/** localStorage, ou null fora do navegador e quando o acesso e negado. */
function deposito(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage || null;
  } catch {
    return null;
  }
}

/**
 * Eventos ainda nao confirmados.
 *
 * Fila ilegivel devolve lista vazia em vez de lancar: um JSON corrompido no
 * armazenamento nao pode impedir o login nem o logout.
 */
export function lerEventosPendentes(): any[] {
  const d = deposito();
  if (!d) return [];
  try {
    const bruto = d.getItem(CHAVE_FILA_DE_SESSAO);
    if (!bruto) return [];
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) ? lista.filter((e) => e && e.id) : [];
  } catch {
    return [];
  }
}

function gravarFila(eventos: any[]): void {
  const d = deposito();
  if (!d) return;
  try {
    d.setItem(CHAVE_FILA_DE_SESSAO, JSON.stringify(eventos));
  } catch {
    /* cota ou escrita negada: nada a fazer aqui */
  }
}

/** Coloca um evento na fila. Sem id ele nao entra: nao haveria como remove-lo. */
export function enfileirarEventoDeSessao(evento: any): void {
  if (!evento?.id) return;
  const fila = [...lerEventosPendentes(), evento];
  gravarFila(fila.slice(-TETO_DA_FILA));
}

/** Tira da fila exatamente os ids confirmados, e so eles. */
export function removerEventosPendentes(ids: string[]): void {
  if (ids.length === 0) return;
  const confirmados = new Set(ids.map(String));
  const restantes = lerEventosPendentes().filter((e) => !confirmados.has(String(e.id)));
  if (restantes.length === 0) {
    const d = deposito();
    try {
      d?.removeItem(CHAVE_FILA_DE_SESSAO);
    } catch {
      gravarFila([]);
    }
    return;
  }
  gravarFila(restantes);
}

/**
 * Tenta enviar a fila. Nada e removido sem confirmacao do servidor.
 *
 * Remove pelos ids enviados, e nao a fila inteira: um evento enfileirado
 * durante o envio (um logout logo depois do login, por exemplo) continuaria
 * pendente em vez de desaparecer junto.
 */
export async function enviarEventosDeSessao(
  enviar: (eventos: any[]) => Promise<EnvioDaAuditoria>
): Promise<{ enviados: number; pendentes: number }> {
  const fila = lerEventosPendentes();
  if (fila.length === 0) return { enviados: 0, pendentes: 0 };

  const ids = fila.map((e) => String(e.id));
  let resultado: EnvioDaAuditoria;
  try {
    resultado = await enviar(fila);
  } catch {
    // Falha de rede lancada em vez de devolvida: o evento continua pendente.
    return { enviados: 0, pendentes: fila.length };
  }

  if (!resultado?.ok) return { enviados: 0, pendentes: fila.length };

  removerEventosPendentes(ids);
  return { enviados: ids.length, pendentes: lerEventosPendentes().length };
}
