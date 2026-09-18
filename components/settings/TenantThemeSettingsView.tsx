'use client';

import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Sparkles, 
  Smartphone, 
  Globe, 
  Check, 
  RotateCcw, 
  Copy, 
  ShieldCheck, 
  Building2, 
  Sliders, 
  Layers, 
  Eye, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  FileCheck,
  HardHat,
  Activity,
  AlertTriangle,
  Code,
  Sun,
  Moon,
  SunMedium,
  Contrast,
  Flame,
  ShieldAlert,
  Glasses
} from 'lucide-react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { TenantThemeSettings, Tenant } from '@/types';
import { 
  THEME_PRESETS, 
  OUTDOOR_SUNLIGHT_PRESETS,
  DEFAULT_THEME_SETTINGS, 
  adjustHexBrightness, 
  hexToRgb, 
  getContrastRatio, 
  generateCssSnippet,
  ThemePreset 
} from '@/lib/themeUtils';

interface TenantThemeSettingsViewProps {
  onNavigate?: (view: string) => void;
}

export const TenantThemeSettingsView: React.FC<TenantThemeSettingsViewProps> = ({ onNavigate }) => {
  const { 
    organization, 
    tenants = [], 
    activeTenantContext, 
    switchTenantContext, 
    tenantTheme, 
    updateTenantTheme, 
    resetTenantTheme 
  } = usePrevSafe();

  // Selected Tenant for customization
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    activeTenantContext?.id || tenants?.[0]?.id || 'tenant-prevsafe-matriz'
  );

  // Form State
  const [primaryColor, setPrimaryColor] = useState<string>(tenantTheme?.primary_color || '#10b981');
  const [secondaryColor, setSecondaryColor] = useState<string>(tenantTheme?.secondary_color || '#0f172a');
  const [accentColor, setAccentColor] = useState<string>(tenantTheme?.accent_color || '#06b6d4');
  const [pwaThemeColor, setPwaThemeColor] = useState<string>(tenantTheme?.pwa_theme_color || '#022c22');
  const [portalBrandName, setPortalBrandName] = useState<string>(tenantTheme?.portal_brand_name || organization?.name || 'PrevSafe');
  const [portalTagline, setPortalTagline] = useState<string>(tenantTheme?.portal_tagline || 'Portal de Gestão de Segurança & Saúde no Trabalho');
  const [pwaAppTitle, setPwaAppTitle] = useState<string>(tenantTheme?.pwa_app_title || 'PrevSafe Field PWA');
  const [pwaIconEmoji, setPwaIconEmoji] = useState<string>(tenantTheme?.pwa_icon_emoji || '🛡️');
  const [borderRadius, setBorderRadius] = useState<'rounded-lg' | 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl'>(
    tenantTheme?.border_radius || 'rounded-2xl'
  );
  const [enableGlow, setEnableGlow] = useState<boolean>(tenantTheme?.enable_glow !== false);
  
  // Outdoor Sunlight High Contrast State
  const [enableOutdoorHighContrast, setEnableOutdoorHighContrast] = useState<boolean>(
    tenantTheme?.enable_outdoor_high_contrast === true || tenantTheme?.contrast_mode === 'outdoor_sunlight'
  );
  const [outdoorContrastPreset, setOutdoorContrastPreset] = useState<'yellow_nr18' | 'green_safety' | 'amber_solar' | 'monochrome_pure'>(
    tenantTheme?.outdoor_contrast_preset || 'yellow_nr18'
  );

  // Preview Simulator State
  const [simulateSunlight, setSimulateSunlight] = useState<boolean>(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'portal' | 'pwa' | 'css'>('portal');
  const [copiedCss, setCopiedCss] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);

  // Selected Tenant Object
  const currentSelectedTenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];

  // Helper to load tenant settings into state
  const loadTenantIntoForm = (tenant: typeof tenants[0]) => {
    if (tenant?.theme_settings) {
      const ts = tenant.theme_settings;
      setPrimaryColor(ts.primary_color || '#10b981');
      setSecondaryColor(ts.secondary_color || '#0f172a');
      setAccentColor(ts.accent_color || '#06b6d4');
      setPwaThemeColor(ts.pwa_theme_color || '#022c22');
      setPortalBrandName(ts.portal_brand_name || tenant.trade_name);
      setPortalTagline(ts.portal_tagline || 'Portal do Cliente & SST');
      setPwaAppTitle(ts.pwa_app_title || `${tenant.trade_name} PWA`);
      setPwaIconEmoji(ts.pwa_icon_emoji || '🛡️');
      setBorderRadius(ts.border_radius || 'rounded-2xl');
      setEnableGlow(ts.enable_glow !== false);
      setEnableOutdoorHighContrast(ts.enable_outdoor_high_contrast === true || ts.contrast_mode === 'outdoor_sunlight');
      setOutdoorContrastPreset(ts.outdoor_contrast_preset || 'yellow_nr18');
    } else {
      setPrimaryColor(tenantTheme.primary_color);
      setSecondaryColor(tenantTheme.secondary_color || '#0f172a');
      setAccentColor(tenantTheme.accent_color || '#06b6d4');
      setPwaThemeColor(tenantTheme.pwa_theme_color || '#022c22');
      setPortalBrandName(tenantTheme.portal_brand_name || organization.name);
      setPortalTagline(tenantTheme.portal_tagline || 'Portal de Gestão de Segurança & Saúde no Trabalho');
      setPwaAppTitle(tenantTheme.pwa_app_title || 'PrevSafe Field PWA');
      setPwaIconEmoji(tenantTheme.pwa_icon_emoji || '🛡️');
      setEnableOutdoorHighContrast(tenantTheme.enable_outdoor_high_contrast === true || tenantTheme.contrast_mode === 'outdoor_sunlight');
      setOutdoorContrastPreset(tenantTheme.outdoor_contrast_preset || 'yellow_nr18');
    }
  };

  const handleTenantSelectChange = (newTenantId: string) => {
    setSelectedTenantId(newTenantId);
    switchTenantContext(newTenantId);
    const targetTenant = tenants.find(t => t.id === newTenantId);
    if (targetTenant) {
      loadTenantIntoForm(targetTenant);
    }
  };

  // Current draft theme for preview
  const draftTheme: TenantThemeSettings = {
    primary_color: primaryColor,
    primary_hover: adjustHexBrightness(primaryColor, -15),
    secondary_color: secondaryColor,
    accent_color: accentColor,
    pwa_theme_color: enableOutdoorHighContrast ? '#000000' : pwaThemeColor,
    portal_brand_name: portalBrandName,
    portal_tagline: portalTagline,
    pwa_app_title: pwaAppTitle,
    pwa_icon_emoji: pwaIconEmoji,
    border_radius: borderRadius,
    enable_glow: enableGlow && !enableOutdoorHighContrast,
    enable_outdoor_high_contrast: enableOutdoorHighContrast,
    contrast_mode: enableOutdoorHighContrast ? 'outdoor_sunlight' : 'balanced',
    outdoor_contrast_preset: outdoorContrastPreset
  };

  const contrastInfo = getContrastRatio(primaryColor);
  const rgb = hexToRgb(primaryColor);

  // Toggle Outdoor High Contrast Mode
  const handleToggleOutdoorHighContrast = (enable: boolean) => {
    setEnableOutdoorHighContrast(enable);
    if (enable) {
      // If turning on outdoor mode and color is dark/muted, propose safety yellow NR-18
      if (primaryColor === '#10b981' || primaryColor === '#64748b' || primaryColor === '#0891b2') {
        setPrimaryColor('#eab308');
        setSecondaryColor('#000000');
        setPwaThemeColor('#000000');
      }
      setEnableGlow(false); // Glow blurs under bright sunlight
    } else {
      setSecondaryColor('#0f172a');
      setPwaThemeColor('#022c22');
      setEnableGlow(true);
    }

    // Apply live feedback
    updateTenantTheme({
      ...draftTheme,
      enable_outdoor_high_contrast: enable,
      contrast_mode: enable ? 'outdoor_sunlight' : 'balanced',
      pwa_theme_color: enable ? '#000000' : pwaThemeColor,
      enable_glow: enable ? false : true
    }, selectedTenantId);
  };

  // Apply changes immediately to application state
  const handleApplyTheme = () => {
    updateTenantTheme(draftTheme, selectedTenantId);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 4000);
  };

  // Select Preset
  const handleSelectPreset = (preset: ThemePreset) => {
    setPrimaryColor(preset.primary_color);
    setSecondaryColor(preset.secondary_color);
    setAccentColor(preset.accent_color);
    setPwaThemeColor(preset.pwa_theme_color);

    if (preset.is_outdoor_optimized) {
      setEnableOutdoorHighContrast(true);
      setEnableGlow(false);
    }

    // Also apply live
    updateTenantTheme({
      ...draftTheme,
      primary_color: preset.primary_color,
      primary_hover: preset.primary_hover,
      secondary_color: preset.secondary_color,
      accent_color: preset.accent_color,
      pwa_theme_color: preset.pwa_theme_color,
      enable_outdoor_high_contrast: preset.is_outdoor_optimized ? true : enableOutdoorHighContrast,
      contrast_mode: preset.is_outdoor_optimized ? 'outdoor_sunlight' : (enableOutdoorHighContrast ? 'outdoor_sunlight' : 'balanced'),
      enable_glow: preset.is_outdoor_optimized ? false : enableGlow
    }, selectedTenantId);
  };

  // Reset to default
  const handleResetToDefault = () => {
    resetTenantTheme(selectedTenantId);
    setPrimaryColor(DEFAULT_THEME_SETTINGS.primary_color);
    setSecondaryColor(DEFAULT_THEME_SETTINGS.secondary_color || '#0f172a');
    setAccentColor(DEFAULT_THEME_SETTINGS.accent_color || '#06b6d4');
    setPwaThemeColor(DEFAULT_THEME_SETTINGS.pwa_theme_color || '#022c22');
    setPortalBrandName(DEFAULT_THEME_SETTINGS.portal_brand_name || organization.name);
    setPortalTagline(DEFAULT_THEME_SETTINGS.portal_tagline || 'Portal de Gestão SST');
    setPwaAppTitle(DEFAULT_THEME_SETTINGS.pwa_app_title || 'PrevSafe Field PWA');
    setPwaIconEmoji(DEFAULT_THEME_SETTINGS.pwa_icon_emoji || '🛡️');
    setEnableOutdoorHighContrast(false);
    setEnableGlow(true);
  };

  // Copy CSS variables snippet
  const handleCopyCss = () => {
    const snippet = generateCssSnippet(draftTheme);
    navigator.clipboard.writeText(snippet);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12" id="tenant-theme-settings-view">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div 
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: primaryColor }}
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-200">
                <Palette className="w-6 h-6" style={{ color: primaryColor }} />
              </span>
              <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Customização White-Label & CSS Variables
              </span>
              {enableOutdoorHighContrast ? (
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 animate-pulse">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Modo Alto Contraste Solar Ativo
                </span>
              ) : (
                <span className="px-3 py-1 text-xs font-medium uppercase tracking-wider rounded-full bg-slate-800/90 text-slate-400 border border-slate-700 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-slate-400" />
                  Modo Padrão / Escritório
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Personalização do Tema & Cores do Tenant
            </h1>
            <p className="text-slate-400 text-sm md:text-base mt-1 max-w-2xl">
              Configure a identidade visual de cada consultoria/inquilino e alterne facilmente entre o <strong>Modo Padrão</strong> e o <strong>Modo de Alto Contraste para Ambientes Externos</strong> sob luz solar intensa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleResetToDefault}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-sm font-medium flex items-center gap-2 transition-all"
              title="Restaurar padrão PrevSafe Esmeralda"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              Restaurar Padrão
            </button>
            <button
              onClick={handleApplyTheme}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                backgroundColor: primaryColor,
                boxShadow: enableGlow && !enableOutdoorHighContrast ? `0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)` : 'none'
              }}
            >
              <Sparkles className="w-4 h-4" />
              Salvar & Ativar Tema
            </button>
          </div>
        </div>

        {/* Quick Mode Toggle Pill in Header */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Modo de Exibição do Ambiente:</span>
            <div className="inline-flex p-1 rounded-2xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => handleToggleOutdoorHighContrast(false)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  !enableOutdoorHighContrast 
                    ? 'bg-slate-800 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Modo Padrão / Escritório</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleOutdoorHighContrast(true)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  enableOutdoorHighContrast 
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' 
                    : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Modo Alto Contraste Solar (Campo)</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Injeção dinâmica em tempo real via <code className="text-emerald-400 font-mono">--tenant-primary</code></span>
          </div>
        </div>

        {/* Real-Time Live Status Bar */}
        {saveSuccessNotice && (
          <div className="mt-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-emerald-300 text-sm animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                <strong>Tema aplicado com sucesso!</strong> {enableOutdoorHighContrast ? 'Modo de Alto Contraste para Luz Solar ativado no DOM.' : 'Tema padrão configurado e injetado em toda a aplicação.'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onNavigate && (
                <button 
                  onClick={() => onNavigate('client-portal')}
                  className="text-xs underline hover:text-emerald-200 font-semibold flex items-center gap-1"
                >
                  Ver no Portal <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tenant Selector Bar */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Inquilino / Consultoria Ativa</span>
            <span className="text-sm font-bold text-white">{currentSelectedTenant?.trade_name || organization.name}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="tenant-select" className="text-xs text-slate-400">Selecionar Consultoria:</label>
          <select
            id="tenant-select"
            value={selectedTenantId}
            onChange={(e) => handleTenantSelectChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {tenants.map(t => (
              <option key={t.id} value={t.id}>
                {t.trade_name} ({t.plan_name}) — {t.theme_settings?.primary_color || '#10b981'}
              </option>
            ))}
          </select>
          <span 
            className="w-5 h-5 rounded-full border border-slate-600 shadow-sm shrink-0" 
            style={{ backgroundColor: primaryColor }}
            title={`Cor ativa: ${primaryColor}`}
          />
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Color Controls & Presets (7 cols) */}
        <div className="xl:col-span-7 space-y-6">

          {/* 🌟 NEW FEATURE: OUTDOOR HIGH-CONTRAST SUNLIGHT MODE CARD */}
          <div className={`border rounded-3xl p-6 shadow-xl transition-all ${
            enableOutdoorHighContrast 
              ? 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/30' 
              : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
              <div className="flex items-start gap-3">
                <span className={`p-3 rounded-2xl shrink-0 ${
                  enableOutdoorHighContrast ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400'
                }`}>
                  <Sun className="w-6 h-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base md:text-lg font-bold text-white">
                      Modo de Alto Contraste para Ambientes Externos
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Luz Solar Intensa
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Otimizado para técnicos e peritos em vistorias a céu aberto (canteiros de obras NR-18, telhados NR-35, mineração NR-22 e pátios industriais). Elimina reflexos, reforça bordas em 2px sólido e amplia a legibilidade sob luz solar direta.
                  </p>
                </div>
              </div>

              {/* Master Switch */}
              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                <label 
                  htmlFor="outdoor-high-contrast-toggle"
                  className="text-xs font-bold text-slate-300 cursor-pointer select-none"
                >
                  {enableOutdoorHighContrast ? 'Ativado ☀️' : 'Desativado 🌙'}
                </label>
                <button
                  id="outdoor-high-contrast-toggle"
                  type="button"
                  role="switch"
                  aria-checked={enableOutdoorHighContrast}
                  onClick={() => handleToggleOutdoorHighContrast(!enableOutdoorHighContrast)}
                  className={`w-14 h-8 rounded-full p-1 transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    enableOutdoorHighContrast ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <div 
                    className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform flex items-center justify-center ${
                      enableOutdoorHighContrast ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  >
                    {enableOutdoorHighContrast ? (
                      <Sun className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Outdoor High Contrast Features & Quick Presets */}
            {enableOutdoorHighContrast ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {OUTDOOR_SUNLIGHT_PRESETS.map((preset) => {
                    const isSelected = primaryColor.toLowerCase() === preset.primary_color.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={`text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                          isSelected 
                            ? 'border-amber-400 bg-amber-950/40 shadow-lg ring-2 ring-amber-400' 
                            : 'border-slate-800 bg-slate-950/80 hover:bg-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: preset.primary_color }}
                            />
                            <span className="text-xs font-bold text-white">{preset.name}</span>
                          </div>
                          {isSelected && (
                            <span className="p-1 rounded-full bg-amber-400 text-slate-950">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-1">{preset.description}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[10px] font-mono text-amber-300 px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800">
                            {preset.primary_color}
                          </span>
                          <span className="text-[10px] text-amber-400/90 font-medium">{preset.category}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Technical Visibility Directives */}
                <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Bordas Sólidas 2px Anti-Ofuscamento</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Contraste WCAG AAA (Legibilidade Máxima)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Fundo Sólido Preto Puro (Zero Glare)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-slate-400 text-xs">
                  <Glasses className="w-5 h-5 text-slate-500 shrink-0" />
                  <span>
                    Atualmente utilizando o <strong>Modo Padrão</strong> (gradientes suaves, efeito neon glow e transparências adequadas para ambientes internos e escritórios).
                  </span>
                </div>
                <button
                  onClick={() => handleToggleOutdoorHighContrast(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all"
                >
                  <Sun className="w-3.5 h-3.5" />
                  Ativar Modo Solar
                </button>
              </div>
            )}
          </div>

          {/* 1. Curated Palette Presets */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5" style={{ color: primaryColor }} />
                  Paletas Padrão de Consultoria SST
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Escolha uma paleta profissional otimizada para o segmento da consultoria.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEME_PRESETS.map((preset) => {
                const isSelected = primaryColor.toLowerCase() === preset.primary_color.toLowerCase() && !enableOutdoorHighContrast;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setEnableOutdoorHighContrast(false);
                      handleSelectPreset(preset);
                    }}
                    className={`text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected 
                        ? 'border-white bg-slate-800/90 shadow-md ring-2 ring-offset-2 ring-offset-slate-900 ring-slate-400' 
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: preset.primary_color }}
                        />
                        <span className="text-xs font-bold text-white">{preset.name}</span>
                      </div>
                      {isSelected && (
                        <span className="p-1 rounded-full bg-white text-slate-950">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{preset.description}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800">
                        {preset.primary_color}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">{preset.category}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Color Studio & Fine Tuning */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5" style={{ color: primaryColor }} />
              Estúdio de Cores & Variáveis CSS
            </h2>

            {/* Primary Color Picker */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="primary-color-input" className="text-sm font-semibold text-white block">
                    Cor Principal (Primary Theme Color)
                  </label>
                  <span className="text-xs text-slate-400">Alimenta botões de ação, badges ativas, bordas e destaque dos laudos.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-300 px-2 py-1 bg-slate-900 rounded-lg border border-slate-700">
                    {primaryColor.toUpperCase()}
                  </span>
                  <div className="relative">
                    <input
                      id="primary-color-input"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Swatches */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-500 font-medium">Amostras Rápidas:</span>
                {['#10b981', '#2563eb', '#0891b2', '#ea580c', '#6366f1', '#e11d48', '#059669', '#64748b', '#eab308', '#22c55e', '#ffffff'].map(hex => (
                  <button
                    key={hex}
                    onClick={() => setPrimaryColor(hex)}
                    className="w-6 h-6 rounded-lg transition-transform hover:scale-110 active:scale-95 border border-white/20"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>

              {/* Contrast and Accessibility Indicator */}
              <div className="flex items-center justify-between text-xs bg-slate-900/90 rounded-xl p-2.5 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Contraste WCAG: <strong>{contrastInfo.isLight ? 'Fundo Claro' : 'Fundo Escuro'}</strong></span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  enableOutdoorHighContrast 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {enableOutdoorHighContrast ? 'AAA Conforme (Alto Contraste Solar)' : `AA Conforme (Texto ${contrastInfo.textColor === '#ffffff' ? 'Branco' : 'Preto'})`}
                </span>
              </div>
            </div>

            {/* Secondary, Accent & PWA Status Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <label htmlFor="secondary-color-input" className="text-xs font-semibold text-white block mb-1">
                  Cor Secundária
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="secondary-color-input"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <label htmlFor="accent-color-input" className="text-xs font-semibold text-white block mb-1">
                  Destaque (Accent)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="accent-color-input"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <label htmlFor="pwa-header-color-input" className="text-xs font-semibold text-white block mb-1">
                  PWA Header (Mobile)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="pwa-header-color-input"
                    type="color"
                    value={pwaThemeColor}
                    onChange={(e) => setPwaThemeColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={pwaThemeColor}
                    onChange={(e) => setPwaThemeColor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2 py-1.5 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Geometry & FX */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <label htmlFor="border-radius-select" className="text-xs font-semibold text-white block mb-1.5">
                  Estilo dos Cantos (Border Radius)
                </label>
                <select
                  id="border-radius-select"
                  value={borderRadius}
                  onChange={(e: any) => setBorderRadius(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 outline-none"
                >
                  <option value="rounded-lg">Compacto (8px / Rounded-LG)</option>
                  <option value="rounded-xl">Clássico (12px / Rounded-XL)</option>
                  <option value="rounded-2xl">Moderno (16px / Rounded-2XL)</option>
                  <option value="rounded-3xl">Suave / Fluid (24px / Rounded-3XL)</option>
                </select>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <label htmlFor="enable-glow-toggle" className="text-xs font-semibold text-white block">Efeito Glow Neon</label>
                  <span className="text-[11px] text-slate-400">
                    {enableOutdoorHighContrast ? 'Desativado no Modo Solar (Anti-reflexo)' : 'Brilho suave ao redor de botões e cartões'}
                  </span>
                </div>
                <input
                  id="enable-glow-toggle"
                  type="checkbox"
                  checked={enableGlow && !enableOutdoorHighContrast}
                  disabled={enableOutdoorHighContrast}
                  onChange={(e) => setEnableGlow(e.target.checked)}
                  className="w-5 h-5 rounded text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500 disabled:opacity-40"
                />
              </div>
            </div>
          </div>

          {/* 3. Branding & Portal/PWA Naming */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5" style={{ color: primaryColor }} />
              Identidade do Portal & App PWA
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="portal-brand-input" className="text-xs font-semibold text-slate-300 block mb-1">
                  Nome do Portal do Cliente
                </label>
                <input
                  id="portal-brand-input"
                  type="text"
                  value={portalBrandName}
                  onChange={(e) => setPortalBrandName(e.target.value)}
                  placeholder="Ex: SegurWork Portal SST"
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-xl px-3.5 py-2.5 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label htmlFor="pwa-app-title-input" className="text-xs font-semibold text-slate-300 block mb-1">
                  Título do App no PWA (Mobile)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pwaIconEmoji}
                    onChange={(e) => setPwaIconEmoji(e.target.value)}
                    className="w-12 text-center bg-slate-950 border border-slate-800 text-sm text-white rounded-xl py-2.5 font-emoji"
                    title="Ícone Emoji"
                  />
                  <input
                    id="pwa-app-title-input"
                    type="text"
                    value={pwaAppTitle}
                    onChange={(e) => setPwaAppTitle(e.target.value)}
                    placeholder="Ex: SegurWork Field"
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-xl px-3.5 py-2.5 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="portal-tagline-input" className="text-xs font-semibold text-slate-300 block mb-1">
                  Slogan / Subtítulo Institucional
                </label>
                <input
                  id="portal-tagline-input"
                  type="text"
                  value={portalTagline}
                  onChange={(e) => setPortalTagline(e.target.value)}
                  placeholder="Ex: Portal de Gestão de Segurança & Saúde no Trabalho"
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-xl px-3.5 py-2.5 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Interactive Real-Time Live Previews (5 cols) */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl sticky top-6">
            
            {/* Preview Tabs & Sunlight Simulator Toggle */}
            <div className="flex flex-col gap-3 mb-5 border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Preview em Tempo Real</h3>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setActivePreviewTab('portal')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      activePreviewTab === 'portal' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Globe className="w-3 h-3" /> Portal
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('pwa')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      activePreviewTab === 'pwa' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" /> PWA
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('css')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      activePreviewTab === 'css' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Code className="w-3 h-3" /> CSS
                  </button>
                </div>
              </div>

              {/* Sunlight Simulator Toggle Bar */}
              <div className="flex items-center justify-between bg-slate-950/80 rounded-xl p-2 border border-slate-800/80">
                <div className="flex items-center gap-2 text-xs">
                  <SunMedium className={`w-4 h-4 ${simulateSunlight ? 'text-amber-400 animate-spin' : 'text-slate-400'}`} />
                  <span className="text-slate-300 font-medium">Simular Sol a Pino (Luz Solar):</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSimulateSunlight(!simulateSunlight)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    simulateSunlight 
                      ? 'bg-amber-500 text-slate-950 shadow' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Sun className="w-3 h-3" />
                  {simulateSunlight ? 'Sol Forte ON' : 'Testar Sol'}
                </button>
              </div>
            </div>

            {/* Tab 1: Portal do Cliente Live Preview */}
            {activePreviewTab === 'portal' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Simulação do <strong>Portal do Cliente</strong> {enableOutdoorHighContrast ? '(Alto Contraste Solar)' : ''}:</span>
                  <span className="font-mono font-bold" style={{ color: primaryColor }}>{primaryColor}</span>
                </div>

                {/* Mockup Desktop Screen Container with Optional Sunlight Simulation Overlay */}
                <div className="relative rounded-2xl overflow-hidden">
                  {simulateSunlight && (
                    <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-tr from-amber-100/10 via-yellow-200/20 to-white/30 backdrop-brightness-125 mix-blend-screen flex items-start justify-end p-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950 shadow">
                        ☀️ Simulação de Incidência Solar Ativa
                      </span>
                    </div>
                  )}

                  <div className={`p-4 ${borderRadius} shadow-2xl space-y-4 transition-all ${
                    enableOutdoorHighContrast 
                      ? 'bg-black border-2 border-white' 
                      : 'bg-slate-950 border border-slate-800'
                  }`}>
                    {/* Mock Portal Header */}
                    <div className={`flex items-center justify-between pb-3 ${
                      enableOutdoorHighContrast ? 'border-b-2 border-white' : 'border-b border-slate-800'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {pwaIconEmoji}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white leading-tight">{portalBrandName}</h4>
                          <p className={`text-[10px] truncate max-w-[180px] ${enableOutdoorHighContrast ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
                            {portalTagline}
                          </p>
                        </div>
                      </div>
                      <span 
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          enableOutdoorHighContrast 
                            ? 'bg-amber-400 text-slate-950 border border-amber-300' 
                            : ''
                        }`}
                        style={!enableOutdoorHighContrast ? { 
                          backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
                          color: primaryColor,
                          border: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`
                        } : {}}
                      >
                        eSocial S-2240 OK
                      </span>
                    </div>

                    {/* Mock KPI Cards */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div 
                        className={`p-3 transition-all ${
                          enableOutdoorHighContrast 
                            ? `bg-black border-2 border-white ${borderRadius}` 
                            : `bg-slate-900/90 border ${borderRadius}`
                        }`}
                        style={!enableOutdoorHighContrast ? { 
                          borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
                          boxShadow: enableGlow ? `0 0 16px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)` : 'none'
                        } : {}}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-semibold ${enableOutdoorHighContrast ? 'text-white' : 'text-slate-400'}`}>
                            Laudos Entregues
                          </span>
                          <FileCheck className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                        </div>
                        <p className="text-lg font-black text-white mt-1">100%</p>
                        <span className={`text-[9px] font-bold ${enableOutdoorHighContrast ? 'text-amber-300' : 'text-emerald-400'}`}>
                          PGR & PCMSO Vigentes
                        </span>
                      </div>

                      <div 
                        className={`p-3 transition-all ${
                          enableOutdoorHighContrast 
                            ? `bg-black border-2 border-white ${borderRadius}` 
                            : `bg-slate-900/90 border ${borderRadius}`
                        }`}
                        style={!enableOutdoorHighContrast ? { 
                          borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
                          boxShadow: enableGlow ? `0 0 16px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)` : 'none'
                        } : {}}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-semibold ${enableOutdoorHighContrast ? 'text-white' : 'text-slate-400'}`}>
                            ASOs Realizados
                          </span>
                          <Activity className="w-3.5 h-3.5" style={{ color: accentColor }} />
                        </div>
                        <p className="text-lg font-black text-white mt-1">142</p>
                        <span className={`text-[9px] ${enableOutdoorHighContrast ? 'text-slate-200 font-semibold' : 'text-slate-400'}`}>
                          Exames em dia
                        </span>
                      </div>
                    </div>

                    {/* Mock Action Item */}
                    <div className={`p-3 rounded-xl flex items-center justify-between gap-3 ${
                      enableOutdoorHighContrast 
                        ? 'bg-black border-2 border-white' 
                        : 'bg-slate-900/70 border border-slate-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        <HardHat className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-white">Renovação Anual LTCAT</p>
                          <p className={`text-[10px] ${enableOutdoorHighContrast ? 'text-slate-300' : 'text-slate-400'}`}>
                            Vence em 15 dias • Unidade Matriz
                          </p>
                        </div>
                      </div>
                      <button
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow ${
                          enableOutdoorHighContrast 
                            ? 'bg-white text-black border border-black font-black' 
                            : 'text-white'
                        }`}
                        style={!enableOutdoorHighContrast ? { 
                          backgroundColor: primaryColor,
                          boxShadow: enableGlow ? `0 0 10px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)` : 'none'
                        } : {}}
                      >
                        Aprovar
                      </button>
                    </div>
                  </div>
                </div>

                {onNavigate && (
                  <button
                    onClick={() => onNavigate('client-portal')}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Abrir Portal do Cliente Completo</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            )}

            {/* Tab 2: PWA do Técnico Mobile Live Preview */}
            {activePreviewTab === 'pwa' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Simulação do <strong>PWA Móvel de Campo</strong>:</span>
                  <span className="font-mono font-bold" style={{ color: primaryColor }}>{pwaAppTitle}</span>
                </div>

                {/* Smartphone Mockup */}
                <div className="relative mx-auto max-w-[280px]">
                  {simulateSunlight && (
                    <div className="absolute inset-0 z-20 pointer-events-none rounded-[36px] bg-gradient-to-tr from-amber-100/10 via-yellow-200/25 to-white/35 backdrop-brightness-125 mix-blend-screen flex items-start justify-center pt-5">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950 shadow">
                        ☀️ Luz Solar 100%
                      </span>
                    </div>
                  )}

                  <div className={`p-3 rounded-[36px] shadow-2xl relative overflow-hidden transition-all ${
                    enableOutdoorHighContrast 
                      ? 'bg-black border-4 border-white' 
                      : 'bg-slate-950 border-4 border-slate-800'
                  }`}>
                    
                    {/* Phone Speaker Notch */}
                    <div className="w-20 h-3.5 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-slate-950 mr-1" />
                      <div className="w-6 h-1 rounded-full bg-slate-900" />
                    </div>

                    {/* Status Bar */}
                    <div 
                      className={`rounded-2xl p-3 text-white space-y-3 transition-colors ${
                        enableOutdoorHighContrast ? 'bg-black border-2 border-white' : ''
                      }`}
                      style={!enableOutdoorHighContrast ? { backgroundColor: pwaThemeColor } : {}}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span>09:41</span>
                        <div className="flex items-center gap-1">
                          <span>5G</span>
                          <span>100%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{pwaIconEmoji}</span>
                          <div>
                            <p className="text-xs font-bold leading-tight">{pwaAppTitle}</p>
                            <p className={`text-[9px] ${enableOutdoorHighContrast ? 'text-amber-300 font-bold' : 'opacity-75'}`}>
                              {enableOutdoorHighContrast ? 'Modo Campo Solar Ativo' : 'Técnico em Campo • Offline Ready'}
                            </p>
                          </div>
                        </div>
                        <span 
                          className={`w-2.5 h-2.5 rounded-full ${enableOutdoorHighContrast ? 'bg-amber-400 border border-white' : 'animate-pulse'}`}
                          style={!enableOutdoorHighContrast ? { backgroundColor: primaryColor } : {}}
                        />
                      </div>
                    </div>

                    {/* PWA Body */}
                    <div className="p-3 space-y-2.5 mt-2">
                      <div 
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between shadow ${
                          enableOutdoorHighContrast 
                            ? 'bg-amber-400 text-slate-950 border-2 border-white font-black' 
                            : 'text-white'
                        }`}
                        style={!enableOutdoorHighContrast ? { 
                          backgroundColor: primaryColor,
                          boxShadow: enableGlow ? `0 0 14px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)` : 'none'
                        } : {}}
                      >
                        <span>Iniciar Checklist NR-18</span>
                        <Zap className="w-3.5 h-3.5" />
                      </div>

                      <div className={`p-2 rounded-xl text-[11px] space-y-1 ${
                        enableOutdoorHighContrast 
                          ? 'bg-black border-2 border-white' 
                          : 'bg-slate-900 border border-slate-800'
                      }`}>
                        <p className="font-bold text-white">Vistoria NR-35 Trabalho em Altura</p>
                        <p className={`text-[10px] ${enableOutdoorHighContrast ? 'text-slate-300 font-medium' : 'text-slate-400'}`}>
                          Canteiro CNO 091.221 • 3 pendências
                        </p>
                        <div className="w-full bg-slate-800 rounded-full h-2 mt-1 overflow-hidden border border-slate-700">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: '75%', 
                              backgroundColor: enableOutdoorHighContrast ? '#eab308' : primaryColor 
                            }} 
                          />
                        </div>
                      </div>

                      <div className={`p-2 rounded-xl text-[10px] flex items-center justify-between ${
                        enableOutdoorHighContrast 
                          ? 'bg-black border-2 border-white text-white font-semibold' 
                          : 'bg-slate-900/60 border border-slate-800/80 text-slate-400'
                      }`}>
                        <span>Sincronização Nuvem:</span>
                        <span className={enableOutdoorHighContrast ? 'text-amber-300 font-bold' : 'text-emerald-400 font-semibold'}>
                          12 fotos prontas
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {onNavigate && (
                  <button
                    onClick={() => onNavigate('field-pwa')}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Abrir PWA do Técnico Completo</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            )}

            {/* Tab 3: Generated CSS Variables Code Snippet */}
            {activePreviewTab === 'css' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Variáveis CSS injetadas no <code>:root</code>:</span>
                  <button
                    onClick={handleCopyCss}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-[11px] flex items-center gap-1.5 transition-all"
                  >
                    {copiedCss ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>Copiar CSS</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed shadow-inner">
                  {generateCssSnippet(draftTheme)}
                </pre>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Como usar no Tailwind ou componentes:</p>
                  <code className="text-[10px] text-cyan-300 block bg-slate-900 p-1.5 rounded">
                    {'<button className="bg-tenant-primary hover:bg-tenant-primary-hover shadow-tenant-glow">'}
                  </code>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default TenantThemeSettingsView;
