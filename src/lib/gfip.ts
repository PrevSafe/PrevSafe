export const GFIP: Record<number, string> = {
  0: 'Nunca esteve exposto',
  1: 'Exposto, neutralizado',
  2: 'Especial 15 anos (+12% SAT)',
  3: 'Especial 20 anos (+9% SAT)',
  4: 'Especial 25 anos (+6% SAT)',
};

export function corGfip(codigo: number) {
  if (codigo === 0) return 'bg-secondary-container/40 text-on-secondary-container';
  if (codigo === 1) return 'bg-surface-container-high text-on-surface-variant';
  if (codigo === 2) return 'bg-error-container text-on-error-container';
  return 'bg-[#F97316]/15 text-[#9a3412]';
}

export function formatarCbo(cbo: string | null) {
  if (!cbo || cbo.length !== 6) return cbo ?? '—';
  return cbo.replace(/(\d{4})(\d{2})/, '$1-$2');
}
