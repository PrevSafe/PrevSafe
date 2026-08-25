import { hojeBrasil } from '@/lib/cipa/fuso';

export type TipoEquipamentoMedicao =
  | 'decibelimetro'
  | 'dosimetro'
  | 'termometro'
  | 'luximetro'
  | 'outro';

export const TIPO_EQUIPAMENTO_LABEL: Record<TipoEquipamentoMedicao, string> = {
  decibelimetro: 'Decibelímetro',
  dosimetro: 'Dosímetro',
  termometro: 'Termômetro',
  luximetro: 'Luxímetro',
  outro: 'Outro',
};

export const TIPO_EQUIPAMENTO_ICONE: Record<TipoEquipamentoMedicao, string> = {
  decibelimetro: 'volume_up',
  dosimetro: 'sensors',
  termometro: 'thermostat',
  luximetro: 'light_mode',
  outro: 'build',
};

export type StatusCalibracao = 'sem_data' | 'em_dia' | 'vencendo' | 'vencida';

const DIAS_ALERTA_VENCIMENTO = 30;

/** Situação do prazo de calibração a partir da data de validade (formato ISO yyyy-mm-dd). */
export function statusCalibracao(dataValidadeCalibracao: string | null): StatusCalibracao {
  if (!dataValidadeCalibracao) return 'sem_data';
  const validade = new Date(`${dataValidadeCalibracao}T00:00:00`);
  const hoje = new Date(`${hojeBrasil()}T00:00:00`);
  const diffDias = Math.floor((validade.getTime() - hoje.getTime()) / 86400000);
  if (diffDias < 0) return 'vencida';
  if (diffDias <= DIAS_ALERTA_VENCIMENTO) return 'vencendo';
  return 'em_dia';
}

export const STATUS_CALIBRACAO_LABEL: Record<StatusCalibracao, string> = {
  sem_data: 'Sem calibração registrada',
  em_dia: 'Calibração em dia',
  vencendo: 'Vence em breve',
  vencida: 'Calibração vencida',
};

export function corStatusCalibracao(status: StatusCalibracao) {
  if (status === 'vencida') return 'bg-error-container text-on-error-container';
  if (status === 'vencendo') return 'bg-[#F97316]/15 text-[#9a3412]';
  if (status === 'em_dia') return 'bg-secondary-container/40 text-on-secondary-container';
  return 'bg-surface-container-high text-on-surface-variant';
}

export function formatarData(iso: string | null) {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
