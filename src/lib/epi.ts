import { hojeBrasil } from '@/lib/cipa/fuso';

export type MotivoEntrega =
  | 'entrega_inicial'
  | 'troca_periodica'
  | 'substituicao_dano'
  | 'substituicao_perda';

export const MOTIVO_LABEL: Record<MotivoEntrega, string> = {
  entrega_inicial: 'Entrega inicial',
  troca_periodica: 'Troca periódica',
  substituicao_dano: 'Substituição por dano',
  substituicao_perda: 'Substituição por perda/furto',
};

export type StatusValidade = 'sem_validade' | 'valido' | 'vencendo' | 'vencido';

const DIAS_ALERTA_VENCIMENTO = 30;

/** Situação do prazo de troca a partir da data de validade (formato ISO yyyy-mm-dd). */
export function statusValidade(dataValidade: string | null): StatusValidade {
  if (!dataValidade) return 'sem_validade';
  const validade = new Date(`${dataValidade}T00:00:00`);
  const hoje = new Date();
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const diffDias = Math.floor((validade.getTime() - hojeSemHora.getTime()) / 86400000);
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

/** Soma a vida útil (em dias) à data de entrega para sugerir a data de validade. */
export function calcularValidade(dataEntrega: string, vidaUtilDias: number | null): string | null {
  if (!dataEntrega || !vidaUtilDias) return null;
  const d = new Date(`${dataEntrega}T00:00:00`);
  d.setDate(d.getDate() + vidaUtilDias);
  return d.toISOString().slice(0, 10);
}

export function formatarData(iso: string | null) {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export type SituacaoCa = 'nao_verificado' | 'vigente' | 'vencido';

/**
 * Situação do CA calculada ao vivo a partir de data_validade_ca, em vez de
 * confiar na coluna epis.situacao_ca — essa coluna só é recalculada pelo
 * trigger quando o registro é salvo (insert/update de data_validade_ca), então
 * fica desatualizada indefinidamente se o CA vencer sem que ninguém edite o
 * cadastro. Usa hojeBrasil() para não depender do fuso do navegador de quem
 * está com a tela aberta.
 */
export function situacaoCaAtual(dataValidadeCa: string | null): SituacaoCa {
  if (!dataValidadeCa) return 'nao_verificado';
  return dataValidadeCa >= hojeBrasil() ? 'vigente' : 'vencido';
}

export const SITUACAO_CA_LABEL: Record<SituacaoCa, string> = {
  vigente: 'CA vigente',
  vencido: 'CA vencido',
  nao_verificado: 'CA não verificado',
};

export function corSituacaoCa(situacao: SituacaoCa) {
  if (situacao === 'vencido') return 'bg-error-container text-on-error-container';
  if (situacao === 'vigente') return 'bg-secondary-container/40 text-on-secondary-container';
  return 'bg-surface-container-high text-on-surface-variant';
}
