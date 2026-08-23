export type TipoTreinamento = 'dds' | 'treinamento';

export const TIPO_LABEL: Record<TipoTreinamento, string> = {
  dds: 'DDS',
  treinamento: 'Treinamento',
};

export const TIPO_DESCRICAO: Record<TipoTreinamento, string> = {
  dds: 'Diálogo Diário/Semanal de Segurança',
  treinamento: 'Treinamento formal',
};

export function corTipo(tipo: TipoTreinamento) {
  return tipo === 'dds'
    ? 'bg-secondary-container/40 text-on-secondary-container'
    : 'bg-primary-container/15 text-primary-container';
}

/** Formata a carga horária em minutos como texto legível (ex.: "1h 30min"). */
export function formatarCargaHoraria(minutos: number | null): string {
  if (!minutos) return '—';
  const horas = Math.floor(minutos / 60);
  const min = minutos % 60;
  if (horas === 0) return `${min}min`;
  if (min === 0) return `${horas}h`;
  return `${horas}h ${min}min`;
}

export function formatarData(iso: string | null) {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
