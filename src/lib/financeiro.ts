import { hojeBrasil } from '@/lib/cipa/fuso';

export { hojeBrasil };

export type TipoCobranca = 'vidas_ativas' | 'por_exame';

export const TIPO_COBRANCA_LABEL: Record<TipoCobranca, string> = {
  vidas_ativas: 'Vidas Ativas',
  por_exame: 'Por Exame Realizado',
};

export type StatusFatura = 'aberta' | 'emitida' | 'paga' | 'cancelada';

export const STATUS_FATURA_LABEL: Record<StatusFatura, string> = {
  aberta: 'Aberta',
  emitida: 'Emitida',
  paga: 'Paga',
  cancelada: 'Cancelada',
};

export function corStatusFatura(status: StatusFatura) {
  if (status === 'paga') return 'bg-secondary-container/40 text-on-secondary-container';
  if (status === 'emitida') return 'bg-primary-container/15 text-primary-container';
  if (status === 'cancelada') return 'bg-outline-variant/30 text-outline';
  return 'bg-surface-container-high text-on-surface-variant';
}

export type StatusRepasse = 'pendente' | 'conferido' | 'pago' | 'contestado';

export const STATUS_REPASSE_LABEL: Record<StatusRepasse, string> = {
  pendente: 'Pendente',
  conferido: 'Conferido',
  pago: 'Pago',
  contestado: 'Contestado',
};

export function corStatusRepasse(status: StatusRepasse) {
  if (status === 'pago') return 'bg-secondary-container/40 text-on-secondary-container';
  if (status === 'conferido') return 'bg-primary-container/15 text-primary-container';
  if (status === 'contestado') return 'bg-error-container text-on-error-container';
  return 'bg-[#F97316]/15 text-[#9a3412]';
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

/** Formata uma competência (date do banco, "YYYY-MM-DD") como "Setembro/2026". */
export function formatarCompetencia(iso: string | null) {
  if (!iso) return '—';
  const [ano, mes] = iso.split('-');
  const nome = MESES[Number(mes) - 1] ?? mes;
  return `${nome}/${ano}`;
}

export function formatarData(iso: string | null) {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
