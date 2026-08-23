export type StatusInspecao = 'em_andamento' | 'concluida';

export const STATUS_INSPECAO_LABEL: Record<StatusInspecao, string> = {
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};

export function corStatusInspecao(status: string) {
  if (status === 'concluida') return 'bg-secondary-container/40 text-on-secondary-container';
  return 'bg-[#F97316]/15 text-[#9a3412]';
}

/** Ciclo de vida gravado no banco — "atrasado" nunca é armazenado, é derivado de `quando`. */
export type StatusPlanoAcao = 'pendente' | 'em_andamento' | 'concluido';

export const STATUS_PLANO_ACAO_LABEL: Record<StatusPlanoAcao, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};

/** Status exibido na tela, incluindo "atrasado" — calculado a partir do prazo (`quando`). */
export type StatusPlanoAcaoEfetivo = StatusPlanoAcao | 'atrasado';

export const STATUS_PLANO_ACAO_EFETIVO_LABEL: Record<StatusPlanoAcaoEfetivo, string> = {
  ...STATUS_PLANO_ACAO_LABEL,
  atrasado: 'Atrasado',
};

/** Um plano concluído nunca é "atrasado", mesmo com prazo vencido. */
export function statusEfetivoPlanoAcao(status: string, quando: string | null): StatusPlanoAcaoEfetivo {
  if (status === 'concluido') return 'concluido';
  if (quando) {
    const prazo = new Date(`${quando}T00:00:00`);
    const hoje = new Date();
    const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    if (prazo.getTime() < hojeSemHora.getTime()) return 'atrasado';
  }
  return (status as StatusPlanoAcao) ?? 'pendente';
}

export function corStatusPlanoAcao(status: StatusPlanoAcaoEfetivo) {
  if (status === 'atrasado') return 'bg-error-container text-on-error-container';
  if (status === 'concluido') return 'bg-secondary-container/40 text-on-secondary-container';
  if (status === 'em_andamento') return 'bg-[#F97316]/15 text-[#9a3412]';
  return 'bg-surface-container-high text-on-surface-variant';
}

export function formatarData(iso: string | null) {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarMoeda(valor: number | null) {
  if (valor == null) return '—';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
