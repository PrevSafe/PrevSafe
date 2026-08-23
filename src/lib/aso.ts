export type TipoExame =
  | 'admissional'
  | 'periodico'
  | 'mudanca_funcao'
  | 'retorno_trabalho'
  | 'demissional';

export const TIPO_EXAME_LABEL: Record<TipoExame, string> = {
  admissional: 'Admissional',
  periodico: 'Periódico',
  mudanca_funcao: 'Mudança de função',
  retorno_trabalho: 'Retorno ao trabalho',
  demissional: 'Demissional',
};

export type ResultadoExame = 'apto' | 'inapto';

export const RESULTADO_LABEL: Record<ResultadoExame, string> = {
  apto: 'Apto',
  inapto: 'Inapto',
};

export function corResultado(resultado: ResultadoExame) {
  return resultado === 'apto'
    ? 'bg-secondary-container/40 text-on-secondary-container'
    : 'bg-error-container text-on-error-container';
}

export type StatusValidade = 'sem_validade' | 'valido' | 'vencendo' | 'vencido';

const DIAS_ALERTA_VENCIMENTO = 30;

/** Situação do vencimento do exame a partir da data_vencimento (formato ISO yyyy-mm-dd). */
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
  sem_validade: 'Sem vencimento definido',
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

/** Sugere a validade a partir da periodicidade comum do PCMSO (NR-7): 1 ano para
 *  periódico/mudança de função/retorno, sem sugestão para admissional/demissional. */
export function calcularVencimento(dataExame: string, tipo: TipoExame): string | null {
  if (!dataExame) return null;
  if (tipo === 'admissional' || tipo === 'demissional') return null;
  const d = new Date(`${dataExame}T00:00:00`);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function formatarData(iso: string | null) {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
