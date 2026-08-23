export type TipoFrota = 'veiculo' | 'maquina';

export const TIPO_LABEL: Record<TipoFrota, string> = {
  veiculo: 'Veículo',
  maquina: 'Máquina/Equipamento',
};

export type StatusFrota = 'ativo' | 'manutencao' | 'inativo';

export const STATUS_LABEL: Record<StatusFrota, string> = {
  ativo: 'Ativo',
  manutencao: 'Em manutenção',
  inativo: 'Inativo',
};

export function corStatus(status: StatusFrota) {
  if (status === 'manutencao') return 'bg-[#F97316]/15 text-[#9a3412]';
  if (status === 'inativo') return 'bg-surface-container-high text-on-surface-variant';
  return 'bg-secondary-container/40 text-on-secondary-container';
}

export type StatusManutencao = 'sem_data' | 'em_dia' | 'vencendo' | 'vencida';

const DIAS_ALERTA_VENCIMENTO = 30;

/** Situação do prazo de manutenção/revisão a partir da próxima data prevista (formato ISO yyyy-mm-dd). */
export function statusManutencao(dataProximaManutencao: string | null): StatusManutencao {
  if (!dataProximaManutencao) return 'sem_data';
  const proxima = new Date(`${dataProximaManutencao}T00:00:00`);
  const hoje = new Date();
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const diffDias = Math.floor((proxima.getTime() - hojeSemHora.getTime()) / 86400000);
  if (diffDias < 0) return 'vencida';
  if (diffDias <= DIAS_ALERTA_VENCIMENTO) return 'vencendo';
  return 'em_dia';
}

export const STATUS_MANUTENCAO_LABEL: Record<StatusManutencao, string> = {
  sem_data: 'Sem previsão',
  em_dia: 'Manutenção em dia',
  vencendo: 'Manutenção vencendo',
  vencida: 'Manutenção vencida',
};

export function corStatusManutencao(status: StatusManutencao) {
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
