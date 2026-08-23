export type MotivoAfastamento = 'acidente_trabalho' | 'doenca_ocupacional' | 'doenca_nao_ocupacional' | 'outros';

export const MOTIVO_AFASTAMENTO_LABEL: Record<MotivoAfastamento, string> = {
  acidente_trabalho: 'Acidente de trabalho',
  doenca_ocupacional: 'Doença ocupacional',
  doenca_nao_ocupacional: 'Doença não ocupacional',
  outros: 'Outros',
};

export function acidentario(motivo: MotivoAfastamento): boolean {
  return motivo === 'acidente_trabalho' || motivo === 'doenca_ocupacional';
}

export function corMotivo(motivo: MotivoAfastamento): string {
  return acidentario(motivo)
    ? 'bg-error-container text-on-error-container'
    : 'bg-secondary-container/40 text-on-secondary-container';
}
