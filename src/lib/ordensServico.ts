export type StatusOS =
  | 'rascunho'
  | 'pronta'
  | 'agendada'
  | 'em_execucao'
  | 'aguardando_cliente'
  | 'bloqueada'
  | 'entregue'
  | 'aguardando_aceite'
  | 'aceita'
  | 'concluida'
  | 'em_espera'
  | 'cancelada'
  | 'retrabalho';

export const STATUS_OS_LABEL: Record<StatusOS, string> = {
  rascunho: 'Rascunho',
  pronta: 'Pronta',
  agendada: 'Agendada',
  em_execucao: 'Em execução',
  aguardando_cliente: 'Aguardando cliente',
  bloqueada: 'Bloqueada',
  entregue: 'Entregue',
  aguardando_aceite: 'Aguardando aceite',
  aceita: 'Aceita',
  concluida: 'Concluída',
  em_espera: 'Em espera',
  cancelada: 'Cancelada',
  retrabalho: 'Retrabalho',
};

export type StatusEtapa = 'pendente' | 'em_andamento' | 'aguardando_cliente' | 'bloqueada' | 'concluida' | 'cancelada';

export const STATUS_ETAPA_LABEL: Record<StatusEtapa, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  aguardando_cliente: 'Aguardando cliente',
  bloqueada: 'Bloqueada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export type StatusTarefa =
  | 'pendente'
  | 'em_andamento'
  | 'aguardando_cliente'
  | 'bloqueada'
  | 'em_revisao'
  | 'concluida'
  | 'cancelada';

export const STATUS_TAREFA_LABEL: Record<StatusTarefa, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  aguardando_cliente: 'Aguardando cliente',
  bloqueada: 'Bloqueada',
  em_revisao: 'Em revisão',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export type PrioridadeOS = 'baixa' | 'normal' | 'alta' | 'urgente';

export const PRIORIDADE_OS_LABEL: Record<PrioridadeOS, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

const COR_NEUTRA = 'bg-surface-container-high text-on-surface-variant';
const COR_INFO = 'bg-primary-container/15 text-primary-container';
const COR_AVISO = 'bg-[#F97316]/15 text-[#9a3412]';
const COR_ERRO = 'bg-error-container text-on-error-container';
const COR_SUCESSO = 'bg-secondary-container/40 text-on-secondary-container';

/** Classe de badge para o status da OS — mesma paleta usada no resto do sistema
 *  (equipamentos de medição, faturas etc.), sem inventar cores novas. */
export function corStatusOS(status: StatusOS): string {
  switch (status) {
    case 'concluida':
    case 'aceita':
      return COR_SUCESSO;
    case 'entregue':
    case 'aguardando_aceite':
      return COR_INFO;
    case 'aguardando_cliente':
    case 'em_espera':
      return COR_AVISO;
    case 'bloqueada':
    case 'cancelada':
      return COR_ERRO;
    case 'retrabalho':
      return COR_AVISO;
    case 'em_execucao':
    case 'agendada':
    case 'pronta':
      return COR_INFO;
    default:
      return COR_NEUTRA;
  }
}

export function corStatusEtapa(status: StatusEtapa | StatusTarefa): string {
  switch (status) {
    case 'concluida':
      return COR_SUCESSO;
    case 'aguardando_cliente':
      return COR_AVISO;
    case 'bloqueada':
      return COR_ERRO;
    case 'em_andamento':
    case 'em_revisao':
      return COR_INFO;
    case 'cancelada':
      return COR_NEUTRA;
    default:
      return COR_NEUTRA;
  }
}

export function corPrioridadeOS(prioridade: PrioridadeOS): string {
  if (prioridade === 'urgente') return COR_ERRO;
  if (prioridade === 'alta') return COR_AVISO;
  if (prioridade === 'normal') return COR_INFO;
  return COR_NEUTRA;
}

export function formatarDataOS(iso: string | null): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
