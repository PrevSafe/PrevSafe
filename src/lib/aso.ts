export type TipoExame =
  | 'admissional'
  | 'periodico'
  | 'retorno_trabalho'
  | 'mudanca_risco'
  | 'demissional';

export const TIPO_EXAME_LABEL: Record<TipoExame, string> = {
  admissional: 'Admissional',
  periodico: 'Periódico',
  retorno_trabalho: 'Retorno ao trabalho',
  mudanca_risco: 'Mudança de risco ocupacional',
  demissional: 'Demissional',
};

export type Resultado = 'apto' | 'inapto' | 'apto_com_restricoes';

export const RESULTADO_LABEL: Record<Resultado, string> = {
  apto: 'Apto',
  inapto: 'Inapto',
  apto_com_restricoes: 'Apto com restrições',
};

export function corResultado(resultado: string) {
  if (resultado === 'inapto') return 'bg-error-container text-on-error-container';
  if (resultado === 'apto_com_restricoes') return 'bg-[#F97316]/15 text-[#9a3412]';
  return 'bg-secondary-container/40 text-on-secondary-container';
}

export type StatusValidade = 'sem_validade' | 'valido' | 'vencendo' | 'vencido';

const DIAS_ALERTA_VENCIMENTO = 30;

/** Situação do prazo até o próximo exame a partir da data de vencimento (formato ISO yyyy-mm-dd). */
export function statusValidade(dataVencimento: string | null): StatusValidade {
  if (!dataVencimento) return 'sem_validade';
  const vencimento = new Date(`${dataVencimento}T00:00:00`);
  const hoje = new Date();
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const diffDias = Math.floor((vencimento.getTime() - hojeSemHora.getTime()) / 86400000);
  if (diffDias < 0) return 'vencido';
  if (diffDias <= DIAS_ALERTA_VENCIMENTO) return 'vencendo';
  return 'valido';
}

export const STATUS_VALIDADE_LABEL: Record<StatusValidade, string> = {
  sem_validade: 'Sem prazo definido',
  valido: 'Válido',
  vencendo: 'Vencendo em breve',
  vencido: 'Vencido',
};

export function corStatusValidade(status: StatusValidade) {
  if (status === 'vencido') return 'bg-error-container text-on-error-container';
  if (status === 'vencendo') return 'bg-[#F97316]/15 text-[#9a3412]';
  if (status === 'valido') return 'bg-secondary-container/40 text-on-secondary-container';
  return 'bg-surface-container-high text-on-surface-variant';
}

export function formatarData(iso: string | null) {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
