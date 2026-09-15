import { TenantThemeSettings } from '@/types';

export const DEFAULT_THEME_SETTINGS: TenantThemeSettings = {
  primary_color: '#10b981', // Emerald PrevSafe standard
  primary_hover: '#059669',
  secondary_color: '#0f172a',
  accent_color: '#06b6d4',
  pwa_theme_color: '#0f172a',
  portal_brand_name: 'PrevSafe Gestão SST',
  portal_tagline: 'Portal de Gestão de Segurança & Saúde no Trabalho',
  pwa_app_title: 'PrevSafe Field PWA',
  pwa_icon_emoji: '🛡️',
  border_radius: 'rounded-2xl',
  contrast_mode: 'balanced',
  enable_outdoor_high_contrast: false,
  enable_glow: true,
};

export interface ThemePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  primary_color: string;
  primary_hover: string;
  secondary_color: string;
  accent_color: string;
  pwa_theme_color: string;
  preview_gradient: string;
  is_outdoor_optimized?: boolean;
}

export const OUTDOOR_SUNLIGHT_PRESETS: ThemePreset[] = [
  {
    id: 'outdoor-yellow-nr18',
    name: 'Amarelo Segurança Canteiro (NR-18)',
    category: 'Luz Solar Intensa',
    description: 'Máxima visibilidade sob luz solar direta em obras e canteiros.',
    primary_color: '#eab308',
    primary_hover: '#ca8a04',
    secondary_color: '#000000',
    accent_color: '#facc15',
    pwa_theme_color: '#000000',
    preview_gradient: 'from-yellow-400 to-amber-500',
    is_outdoor_optimized: true,
  },
  {
    id: 'outdoor-vivid-green',
    name: 'Verde Flúor Segurança (NR-01/35)',
    category: 'Luz Solar Intensa',
    description: 'Verde de alta luminância para vistorias em áreas abertas e telhados.',
    primary_color: '#22c55e',
    primary_hover: '#16a34a',
    secondary_color: '#000000',
    accent_color: '#4ade80',
    pwa_theme_color: '#000000',
    preview_gradient: 'from-emerald-400 to-green-500',
    is_outdoor_optimized: true,
  },
  {
    id: 'outdoor-solar-amber',
    name: 'Âmbar Solar Alto Contraste (NR-22)',
    category: 'Luz Solar Intensa',
    description: 'Otimizado contra reflexos solares em mineração e pedreiras.',
    primary_color: '#f97316',
    primary_hover: '#ea580c',
    secondary_color: '#000000',
    accent_color: '#fb923c',
    pwa_theme_color: '#000000',
    preview_gradient: 'from-orange-500 to-amber-500',
    is_outdoor_optimized: true,
  },
  {
    id: 'outdoor-monochrome-pure',
    name: 'Monocromático Anti-Reflexo',
    category: 'Luz Solar Intensa',
    description: 'Preto e Branco puro com contraste ótico absoluto (WCAG AAA).',
    primary_color: '#ffffff',
    primary_hover: '#e2e8f0',
    secondary_color: '#000000',
    accent_color: '#38bdf8',
    pwa_theme_color: '#000000',
    preview_gradient: 'from-slate-100 to-slate-300',
    is_outdoor_optimized: true,
  }
];

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'emerald-prevsafe',
    name: 'PrevSafe Esmeralda',
    category: 'Segurança & Saúde',
    description: 'Padrão clássico de SST, saúde ocupacional e conformidade legal.',
    primary_color: '#10b981',
    primary_hover: '#059669',
    secondary_color: '#064e3b',
    accent_color: '#06b6d4',
    pwa_theme_color: '#022c22',
    preview_gradient: 'from-emerald-600 to-teal-500',
  },
  {
    id: 'ocean-sapphire',
    name: 'Azul Safira Corporativo',
    category: 'Engenharia & Tech',
    description: 'Tom profissional, alta confiabilidade e laudos de engenharia.',
    primary_color: '#2563eb',
    primary_hover: '#1d4ed8',
    secondary_color: '#1e3a8a',
    accent_color: '#38bdf8',
    pwa_theme_color: '#0f172a',
    preview_gradient: 'from-blue-600 to-indigo-500',
  },
  {
    id: 'cyan-teal',
    name: 'Ciano Clínico & Diagnóstico',
    category: 'Medicina do Trabalho',
    description: 'Focado em clínicas médicas, audiometrias e gestão de ASO.',
    primary_color: '#0891b2',
    primary_hover: '#0e7490',
    secondary_color: '#164e63',
    accent_color: '#2dd4bf',
    pwa_theme_color: '#083344',
    preview_gradient: 'from-cyan-600 to-teal-500',
  },
  {
    id: 'amber-industrial',
    name: 'Âmbar & Laranja Industrial',
    category: 'Construção & Mineração',
    description: 'Alta visibilidade, canteiros de obras (NR-18) e mineração (NR-22).',
    primary_color: '#ea580c',
    primary_hover: '#c2410c',
    secondary_color: '#7c2d12',
    accent_color: '#f59e0b',
    pwa_theme_color: '#431407',
    preview_gradient: 'from-orange-600 to-amber-500',
  },
  {
    id: 'indigo-cyber',
    name: 'Índigo Digital & Inovação',
    category: 'Consultoria SaaS',
    description: 'Modernidade e sofisticação para consultorias SST ágeis.',
    primary_color: '#6366f1',
    primary_hover: '#4f46e5',
    secondary_color: '#312e81',
    accent_color: '#a855f7',
    pwa_theme_color: '#1e1b4b',
    preview_gradient: 'from-indigo-600 to-violet-500',
  },
  {
    id: 'ruby-crimson',
    name: 'Rubi Alerta & Proteção',
    category: 'Emergência & Brigada',
    description: 'Brigadas de incêndio (NR-23), trabalho em altura e alta periculosidade.',
    primary_color: '#e11d48',
    primary_hover: '#be123c',
    secondary_color: '#881337',
    accent_color: '#fb7185',
    pwa_theme_color: '#4c0519',
    preview_gradient: 'from-rose-600 to-pink-500',
  },
  {
    id: 'forest-green',
    name: 'Verde Floresta & ESG',
    category: 'Meio Ambiente & NR-38',
    description: 'Sustentabilidade ambiental, limpeza urbana e saneamento.',
    primary_color: '#059669',
    primary_hover: '#047857',
    secondary_color: '#064e3b',
    accent_color: '#34d399',
    pwa_theme_color: '#022c22',
    preview_gradient: 'from-emerald-700 to-green-600',
  },
  {
    id: 'titanium-slate',
    name: 'Titânio & Prata Executivo',
    category: 'Perícias Judiciais',
    description: 'Neutralidade, precisão técnica e laudos periciais de insalubridade.',
    primary_color: '#64748b',
    primary_hover: '#475569',
    secondary_color: '#1e293b',
    accent_color: '#94a3b8',
    pwa_theme_color: '#0f172a',
    preview_gradient: 'from-slate-600 to-zinc-500',
  }
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) {
    return { r: 16, g: 185, b: 129 }; // Fallback to emerald
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return { r, g, b };
}

export function adjustHexBrightness(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const adjust = (val: number) => {
    const res = Math.round(val * (1 + percent / 100));
    return Math.min(255, Math.max(0, res));
  };
  const toHex = (val: number) => val.toString(16).padStart(2, '0');
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

export function getContrastRatio(hex: string): { isLight: boolean; textColor: string } {
  const { r, g, b } = hexToRgb(hex);
  // YIQ luminance formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  const isLight = yiq >= 128;
  return {
    isLight,
    textColor: isLight ? '#0f172a' : '#ffffff'
  };
}

export function applyTenantThemeToDom(theme: TenantThemeSettings): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const isOutdoorContrast = theme.enable_outdoor_high_contrast === true || theme.contrast_mode === 'outdoor_sunlight';
  
  const { r, g, b } = hexToRgb(theme.primary_color);
  const hoverHex = theme.primary_hover || adjustHexBrightness(theme.primary_color, -15);
  const { r: hr, g: hg, b: hb } = hexToRgb(hoverHex);

  const secRgb = hexToRgb(theme.secondary_color || '#0f172a');
  const accRgb = hexToRgb(theme.accent_color || '#06b6d4');

  // Inject Primary CSS Variables
  root.style.setProperty('--tenant-primary', theme.primary_color);
  root.style.setProperty('--tenant-primary-rgb', `${r}, ${g}, ${b}`);
  root.style.setProperty('--tenant-primary-hover', hoverHex);
  root.style.setProperty('--tenant-primary-hover-rgb', `${hr}, ${hg}, ${hb}`);
  
  // Variations for alpha/glass/glow
  root.style.setProperty('--tenant-primary-50', isOutdoorContrast ? `rgba(${r}, ${g}, ${b}, 0.2)` : `rgba(${r}, ${g}, ${b}, 0.05)`);
  root.style.setProperty('--tenant-primary-100', isOutdoorContrast ? `rgba(${r}, ${g}, ${b}, 0.3)` : `rgba(${r}, ${g}, ${b}, 0.1)`);
  root.style.setProperty('--tenant-primary-200', isOutdoorContrast ? `rgba(${r}, ${g}, ${b}, 0.4)` : `rgba(${r}, ${g}, ${b}, 0.2)`);
  root.style.setProperty('--tenant-primary-subtle', isOutdoorContrast ? `rgba(${r}, ${g}, ${b}, 0.25)` : `rgba(${r}, ${g}, ${b}, 0.12)`);
  root.style.setProperty('--tenant-primary-border', isOutdoorContrast ? '#ffffff' : `rgba(${r}, ${g}, ${b}, 0.35)`);
  root.style.setProperty('--tenant-primary-glow', theme.enable_glow && !isOutdoorContrast ? `0 0 24px rgba(${r}, ${g}, ${b}, 0.4)` : 'none');
  
  // Secondary and Accent variables
  root.style.setProperty('--tenant-secondary', theme.secondary_color || '#0f172a');
  root.style.setProperty('--tenant-secondary-rgb', `${secRgb.r}, ${secRgb.g}, ${secRgb.b}`);
  root.style.setProperty('--tenant-accent', theme.accent_color || '#06b6d4');
  root.style.setProperty('--tenant-accent-rgb', `${accRgb.r}, ${accRgb.g}, ${accRgb.b}`);

  // Outdoor Sunlight & High Contrast Attributes & Variables
  if (isOutdoorContrast) {
    root.setAttribute('data-outdoor-contrast', 'true');
    root.style.setProperty('--tenant-outdoor-contrast', '1');
    root.style.setProperty('--tenant-border-contrast', '#ffffff');
    root.style.setProperty('--tenant-border-width', '2px');
    root.style.setProperty('--tenant-card-bg-solid', '#000000');
    root.style.setProperty('--tenant-text-pure', '#ffffff');
  } else {
    root.removeAttribute('data-outdoor-contrast');
    root.style.setProperty('--tenant-outdoor-contrast', '0');
    root.style.setProperty('--tenant-border-contrast', `rgba(${r}, ${g}, ${b}, 0.35)`);
    root.style.setProperty('--tenant-border-width', '1px');
    root.style.setProperty('--tenant-card-bg-solid', '#0f172a');
    root.style.setProperty('--tenant-text-pure', '#f8fafc');
  }

  // PWA status bar meta tag update
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.setAttribute('name', 'theme-color');
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute('content', isOutdoorContrast ? '#000000' : (theme.pwa_theme_color || theme.primary_color));
}

export function generateCssSnippet(theme: TenantThemeSettings): string {
  const isOutdoorContrast = theme.enable_outdoor_high_contrast === true || theme.contrast_mode === 'outdoor_sunlight';
  const { r, g, b } = hexToRgb(theme.primary_color);
  const hoverHex = theme.primary_hover || adjustHexBrightness(theme.primary_color, -15);
  
  return `:root {
  /* Variáveis Dinâmicas do Tema do Inquilino */
  --tenant-primary: ${theme.primary_color};
  --tenant-primary-rgb: ${r}, ${g}, ${b};
  --tenant-primary-hover: ${hoverHex};
  --tenant-primary-subtle: ${isOutdoorContrast ? `rgba(${r}, ${g}, ${b}, 0.25)` : `rgba(${r}, ${g}, ${b}, 0.12)`};
  --tenant-primary-border: ${isOutdoorContrast ? '#ffffff' : `rgba(${r}, ${g}, ${b}, 0.35)`};
  --tenant-primary-glow: ${theme.enable_glow && !isOutdoorContrast ? `0 0 24px rgba(${r}, ${g}, ${b}, 0.40)` : 'none'};
  --tenant-secondary: ${theme.secondary_color || '#0f172a'};
  --tenant-accent: ${theme.accent_color || '#06b6d4'};
  --tenant-pwa-theme: ${isOutdoorContrast ? '#000000' : (theme.pwa_theme_color || '#0f172a')};
  
  /* Modo de Alto Contraste Solar / Campo Externo */
  --tenant-outdoor-contrast: ${isOutdoorContrast ? '1' : '0'};
  --tenant-border-width: ${isOutdoorContrast ? '2px' : '1px'};
  --tenant-border-contrast: ${isOutdoorContrast ? '#ffffff' : `rgba(${r}, ${g}, ${b}, 0.35)`};
  --tenant-card-bg-solid: ${isOutdoorContrast ? '#000000' : '#0f172a'};
}`;
}
