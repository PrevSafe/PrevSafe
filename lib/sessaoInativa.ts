/**
 * Encerramento da sessao por inatividade.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * O cliente Supabase e criado com `persistSession: true` e
 * `autoRefreshToken: true` (lib/supabase.ts): o token se renova sozinho
 * enquanto existir uma aba aberta, e a sessao so terminava quando o usuario
 * clicava em "Encerrar Sessao". Uma estacao destravada e sozinha e, neste
 * sistema, acesso a CPF, ASO, atestado de saude ocupacional e CAT - dado
 * pessoal sensivel de saude (LGPD, art. 5o, II, e art. 11).
 *
 * O prazo e contado pela ULTIMA ATIVIDADE, e nao pela hora do login: quem
 * esta trabalhando nao e interrompido, e quem saiu da frente do computador
 * perde a sessao.
 *
 * ONDE SE MUDA O PRAZO
 *
 * Nas duas constantes abaixo. Elas valem para o sistema inteiro, inclusive o
 * PWA de campo - o tecnico nao perde vistoria por isso, porque o que ele
 * coletou fica em localStorage e IndexedDB (lib/pwaStorage.ts), que este
 * controle nao toca, e volta a sincronizar no proximo login.
 */

/** Minutos sem atividade apos os quais a sessao e encerrada. */
export const INATIVIDADE_MINUTOS = 30;

/**
 * Segundos de aviso antes de encerrar.
 *
 * Existe para nao tirar do usuario um formulario meio preenchido sem avisar:
 * qualquer toque ou tecla dentro dessa janela renova o prazo.
 */
export const AVISO_ANTES_SEGUNDOS = 120;

/**
 * Onde fica a marca da ultima atividade.
 *
 * localStorage, de proposito. sessionStorage e por aba - trabalhar numa aba
 * nao contaria como atividade na outra, e a sessao cairia com o usuario
 * digitando. E memoria do processo nao sobrevive ao recarregamento: fechar e
 * reabrir o navegador zeraria o prazo, que e justamente o caso em que a
 * estacao ficou sozinha.
 */
export const CHAVE_ULTIMA_ATIVIDADE = 'prevsafe:sessao:ultima-atividade';

/**
 * Eventos que contam como atividade.
 *
 * NAO entram aqui `focus` nem `visibilitychange`. Voltar para a aba depois de
 * uma hora nao e atividade durante essa hora, e trata-los como tal renovaria
 * o prazo exatamente no caso que este controle existe para pegar.
 *
 * Tambem nao entra `mousemove`: um mouse esbarrado mantem a sessao aberta sem
 * ninguem usando o sistema.
 */
export const EVENTOS_DE_ATIVIDADE = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/** Intervalo minimo entre duas gravacoes da marca (nao e a cada tecla). */
export const GRAVACAO_MINIMA_MS = 15_000;

export type FaseDaSessao = 'ATIVA' | 'AVISO' | 'ENCERRADA';

const LIMITE_MS = INATIVIDADE_MINUTOS * 60_000;
const AVISO_MS = AVISO_ANTES_SEGUNDOS * 1_000;

/** localStorage, ou null fora do navegador e quando o acesso e negado. */
function deposito(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage || null;
  } catch {
    // Modo privado e politicas de cookie podem lancar no simples acesso.
    return null;
  }
}

/** Grava o momento da ultima atividade. */
export function registrarAtividade(agora: number = Date.now()): void {
  const d = deposito();
  if (!d) return;
  try {
    d.setItem(CHAVE_ULTIMA_ATIVIDADE, String(agora));
  } catch {
    // Cota estourada ou escrita negada: sem marca, quem chama trata como
    // "nao ha prazo em curso" e regrava na proxima avaliacao.
  }
}

/**
 * Ultima atividade gravada, ou null quando nao ha marca utilizavel.
 *
 * Marca ilegivel nao encerra a sessao por engano nem vale como prova de
 * atividade: quem chama trata null regravando a marca.
 */
export function lerUltimaAtividade(): number | null {
  const d = deposito();
  if (!d) return null;
  let bruto: string | null = null;
  try {
    bruto = d.getItem(CHAVE_ULTIMA_ATIVIDADE);
  } catch {
    return null;
  }
  if (!bruto) return null;
  const n = Number(bruto);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Apaga a marca. Chamado no logout, para o proximo login comecar limpo. */
export function limparUltimaAtividade(): void {
  const d = deposito();
  if (!d) return;
  try {
    d.removeItem(CHAVE_ULTIMA_ATIVIDADE);
  } catch {
    /* nada a fazer: a marca sera sobrescrita no proximo login */
  }
}

/** Quanto falta para encerrar, em ms. Negativo quando o prazo ja passou. */
export function msAteEncerrar(ultimaAtividade: number, agora: number = Date.now()): number {
  return ultimaAtividade + LIMITE_MS - agora;
}

/**
 * Em que fase a sessao esta.
 *
 * Marca no futuro (relogio da maquina adiantado, ou corrigido para tras)
 * devolve ATIVA: um relogio errado nao pode encerrar a sessao de quem esta
 * trabalhando.
 */
export function faseDaSessao(ultimaAtividade: number, agora: number = Date.now()): FaseDaSessao {
  const falta = msAteEncerrar(ultimaAtividade, agora);
  if (falta <= 0) return 'ENCERRADA';
  if (falta <= AVISO_MS) return 'AVISO';
  return 'ATIVA';
}

/**
 * A sessao restaurada no carregamento ainda vale?
 *
 * Chamado antes de dar o usuario como autenticado: o token do Supabase pode
 * estar valido e a estacao ter ficado horas aberta. Sem marca nenhuma, vale -
 * e o primeiro acesso depois do deploy, ou armazenamento limpo, e nao ha
 * inatividade provada.
 */
export function sessaoRestauradaExpirou(agora: number = Date.now()): boolean {
  const ultima = lerUltimaAtividade();
  if (ultima === null) return false;
  return faseDaSessao(ultima, agora) === 'ENCERRADA';
}

/** Segundos em mm:ss, para a contagem do aviso. */
export function contagemRegressiva(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const min = Math.floor(s / 60);
  return `${min}:${String(s - min * 60).padStart(2, '0')}`;
}
