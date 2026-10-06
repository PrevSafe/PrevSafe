/**
 * Quem le e grava o que, do lado do app.
 *
 * ESPELHO da RLS de
 * supabase/migrations/20261005120000_papel_saude_e_isolamento_de_clientes.sql
 * (prevsafe_pode_ler e prevsafe_pode_gravar). Quem decide e o banco; este
 * arquivo existe por dois motivos:
 *
 *   1. O app nao tenta gravar o que o banco vai recusar. pushRecords envia o
 *      delta em lotes e para no primeiro erro: um registro recusado - o
 *      protocolo-modelo que o TECNICO tem em memoria, a notificacao que o
 *      cliente nao pode reescrever - travava o envio de todo o resto, e a
 *      barra ficava em "erro ao salvar" para sempre.
 *   2. A tela diz "restrito" em vez de "vazio". Quando a RLS nao devolve a
 *      linha, o app nao sabe se ela nao existe ou se e proibida; quem sabe e o
 *      papel.
 *
 * scripts/verificar-saude-e-clientes.mjs confere que as listas daqui sao as
 * mesmas do SQL.
 */

/** Papeis das contas de cliente: so o portal, so a propria empresa. */
export const PAPEIS_DE_CLIENTE = ['CLIENTE_ADMIN', 'CLIENTE_USER'] as const;

/** Unicos papeis que leem e gravam examResults. */
export const PAPEIS_COM_RESULTADO_DE_EXAME = ['ADMIN', 'SAUDE'] as const;

/** Papeis que leem e gravam as colecoes de saude anteriores a examResults. */
export const PAPEIS_COM_COLECOES_DE_SAUDE = ['ADMIN', 'GESTOR', 'SAUDE'] as const;

/** Mesma lista de public.prevsafe_colecao_de_saude (migracao 20260921000000). */
export const COLECOES_DE_SAUDE = ['examProtocols', 'workAbsences', 'catRecords'] as const;

/** Resultado de exame, observacao clinica e restricao do ASO. */
export const COLECAO_DE_RESULTADOS_DE_EXAME = 'examResults';

/**
 * Colecoes que a conta de cliente alcanca, sempre so no que e da propria
 * empresa (o banco confere o client_id de cada linha):
 *
 *   LEITURA   le e nao grava;
 *   EDICAO    le, inclui e altera (aceite de OS, pendencias, assinatura);
 *   INCLUSAO  so inclui; o app envia com ON CONFLICT DO NOTHING, e o banco
 *             recusa reescrever (auditoria, notificacao e avaliacao ja
 *             enviadas nao mudam).
 *
 * Fora daqui, nada: nem colecao de saude, nem de outro cliente, nem interna.
 */
export const COLECOES_DO_PORTAL: Readonly<Record<string, 'LEITURA' | 'EDICAO' | 'INCLUSAO'>> = {
  organization: 'LEITURA',
  clients: 'LEITURA',
  profiles: 'LEITURA',
  contracts: 'LEITURA',
  documents: 'LEITURA',
  serviceOrders: 'EDICAO',
  requests: 'EDICAO',
  sstSignatures: 'EDICAO',
  evaluations: 'INCLUSAO',
  notifications: 'INCLUSAO',
  auditLogs: 'INCLUSAO',
};

/**
 * Colecoes em que o banco confere o autor (updated_by = auth.uid()) e nao o
 * client_id: a auditoria e as notificacoes que a propria conta gera.
 */
const COLECOES_DO_AUTOR = new Set(['auditLogs', 'notifications']);

/** Como o banco compara: maiusculas, sem espacos nas pontas. */
export function normalizarPapel(papel: string | null | undefined): string {
  return String(papel || '').trim().toUpperCase();
}

export function ehPapelDeCliente(papel: string | null | undefined): boolean {
  return (PAPEIS_DE_CLIENTE as readonly string[]).includes(normalizarPapel(papel));
}

export function podeLerResultadosDeExame(papel: string | null | undefined): boolean {
  return (PAPEIS_COM_RESULTADO_DE_EXAME as readonly string[]).includes(normalizarPapel(papel));
}

export function podeLerColecoesDeSaude(papel: string | null | undefined): boolean {
  return (PAPEIS_COM_COLECOES_DE_SAUDE as readonly string[]).includes(normalizarPapel(papel));
}

/** O vinculo lido de prevsafe_members: papel e, para conta de cliente, o cliente. */
export interface AcessoDaConta {
  papel: string | null;
  clienteId: string | null;
}

/**
 * Como a conta grava numa colecao:
 *
 *   TUDO              equipe da consultoria, como sempre foi;
 *   EDICAO_DO_CLIENTE conta de cliente, so registros com o client_id dela;
 *   INCLUSAO          so registros novos, enviados sem reescrever;
 *   NADA              a colecao fica so neste dispositivo.
 */
export type ModoDeGravacao = 'TUDO' | 'EDICAO_DO_CLIENTE' | 'INCLUSAO' | 'NADA';

export function modoDeGravacao(acesso: AcessoDaConta, colecao: string): ModoDeGravacao {
  const papel = normalizarPapel(acesso.papel);

  if (ehPapelDeCliente(papel)) {
    // Sem cliente no vinculo o banco nao entrega nem aceita nada.
    if (!acesso.clienteId) return 'NADA';
    const modo = COLECOES_DO_PORTAL[colecao];
    if (modo === 'EDICAO') return 'EDICAO_DO_CLIENTE';
    if (modo === 'INCLUSAO') return 'INCLUSAO';
    return 'NADA';
  }

  if (colecao === COLECAO_DE_RESULTADOS_DE_EXAME) {
    return podeLerResultadosDeExame(papel) ? 'TUDO' : 'NADA';
  }
  if ((COLECOES_DE_SAUDE as readonly string[]).includes(colecao)) {
    return podeLerColecoesDeSaude(papel) ? 'TUDO' : 'NADA';
  }
  return 'TUDO';
}

/** O registro passa na regra de gravacao da conta nesta colecao? */
export function registroGravavel(acesso: AcessoDaConta, colecao: string, registro: any): boolean {
  const modo = modoDeGravacao(acesso, colecao);
  if (modo === 'NADA') return false;
  if (modo === 'TUDO') return true;
  if (COLECOES_DO_AUTOR.has(colecao)) return true;
  return Boolean(acesso.clienteId) && String(registro?.client_id ?? '') === String(acesso.clienteId);
}

export interface EnvioDaColecao {
  rows: any[];
  deletedIds: string[];
  /** Enviar com ON CONFLICT DO NOTHING: a conta so inclui nesta colecao. */
  somenteInclusao: boolean;
}

/**
 * O que a conta pode enviar de uma colecao.
 *
 * `anterior` e o que o servidor ja confirmou (id -> JSON); `atual`, o que esta
 * em memoria (id -> registro e JSON). O que fica de fora nao e erro: e o que a
 * conta nao pode gravar, e permanece so neste dispositivo.
 */
export function envioPermitido(
  acesso: AcessoDaConta,
  colecao: string,
  anterior: Map<string, string>,
  atual: Map<string, { registro: any; json: string }>
): EnvioDaColecao {
  const modo = modoDeGravacao(acesso, colecao);
  if (modo === 'NADA') return { rows: [], deletedIds: [], somenteInclusao: false };

  const rows: any[] = [];
  atual.forEach(({ registro, json }, id) => {
    if (anterior.get(id) === json) return;
    // Ja enviado e alterado depois: nesta colecao a conta nao reescreve.
    if (modo === 'INCLUSAO' && anterior.has(id)) return;
    if (!registroGravavel(acesso, colecao, registro)) return;
    rows.push(registro);
  });

  const deletedIds: string[] = [];
  if (modo !== 'INCLUSAO') {
    anterior.forEach((json, id) => {
      if (atual.has(id)) return;
      if (modo === 'EDICAO_DO_CLIENTE') {
        let antes: any = null;
        try {
          antes = JSON.parse(json);
        } catch {
          antes = null;
        }
        if (!registroGravavel(acesso, colecao, antes)) return;
      }
      deletedIds.push(id);
    });
  }

  return { rows, deletedIds, somenteInclusao: modo === 'INCLUSAO' };
}
