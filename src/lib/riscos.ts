export type TipoRisco = 'fisico' | 'quimico' | 'biologico' | 'ergonomico' | 'acidente';

export const TIPO_RISCO_LABEL: Record<TipoRisco, string> = {
  fisico: 'Físico',
  quimico: 'Químico',
  biologico: 'Biológico',
  ergonomico: 'Ergonômico',
  acidente: 'Acidente',
};

export const TIPO_RISCO_ICONE: Record<TipoRisco, string> = {
  fisico: 'thermostat',
  quimico: 'science',
  biologico: 'coronavirus',
  ergonomico: 'accessibility_new',
  acidente: 'warning',
};

export type NivelRisco = 'baixo' | 'medio' | 'alto' | 'critico';

export const NIVEL_RISCO_LABEL: Record<NivelRisco, string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
  critico: 'Crítico',
};

/** Produto probabilidade x severidade (1-5 cada), de 1 a 25. */
export function calcularNivelRisco(probabilidade: number, severidade: number): number {
  return probabilidade * severidade;
}

/** Classifica o produto probabilidade x severidade em uma faixa de criticidade. */
export function classificarNivelRisco(produto: number): NivelRisco {
  if (produto >= 16) return 'critico';
  if (produto >= 10) return 'alto';
  if (produto >= 5) return 'medio';
  return 'baixo';
}

/** Classes utilitárias (badge/texto) por nível de criticidade. */
export function corNivelRisco(nivel: NivelRisco): string {
  switch (nivel) {
    case 'critico':
      return 'bg-error text-on-error';
    case 'alto':
      return 'bg-error-container text-on-error-container';
    case 'medio':
      return 'bg-[#F97316]/15 text-[#9a3412]';
    case 'baixo':
      return 'bg-secondary-container/40 text-on-secondary-container';
  }
}

/** Classes utilitárias (fundo mais forte) para as células da matriz 5x5. */
export function fundoCelulaMatriz(nivel: NivelRisco): string {
  switch (nivel) {
    case 'critico':
      return 'bg-error text-on-error';
    case 'alto':
      return 'bg-error-container text-on-error-container';
    case 'medio':
      return 'bg-[#F97316]/25 text-[#9a3412]';
    case 'baixo':
      return 'bg-secondary-container/40 text-on-secondary-container';
  }
}
