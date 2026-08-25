import { paraInstanteBrasil, paraCampoDataHoraBrasil } from '@/lib/cipa/fuso';

export { paraInstanteBrasil, paraCampoDataHoraBrasil };

export type StatusAgendamento = 'agendado' | 'confirmado' | 'realizado' | 'faltou' | 'cancelado';

export const STATUS_AGENDAMENTO_LABEL: Record<StatusAgendamento, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  realizado: 'Realizado',
  faltou: 'Faltou',
  cancelado: 'Cancelado',
};

export function corStatusAgendamento(status: StatusAgendamento) {
  if (status === 'realizado') return 'bg-secondary-container/40 text-on-secondary-container';
  if (status === 'faltou') return 'bg-error-container text-on-error-container';
  if (status === 'cancelado') return 'bg-surface-container-high text-on-surface-variant';
  if (status === 'confirmado') return 'bg-primary-container/30 text-primary-container';
  return 'bg-primary-container/15 text-primary-container';
}

/** Formata um timestamptz do banco como "dd/mm/yyyy HH:mm" no horário de Brasília. */
export function formatarData(iso: string | null) {
  if (!iso) return '—';
  const campo = paraCampoDataHoraBrasil(iso);
  const [data, hora] = campo.split('T');
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano} ${hora}`;
}
