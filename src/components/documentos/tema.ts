/**
 * Tema Claro (Light Corporate Theme) do Módulo de Elaboração e Impressão de
 * Documentos SST. Paleta isolada e propositalmente fora dos design tokens
 * globais (index.css, tema escuro/teal do restante do app) — este módulo
 * simula um documento impresso e precisa de alto contraste em papel branco.
 */
export const TEMA = {
  bgTela: 'bg-[#F8FAFC]',
  card: 'bg-[#FFFFFF] border border-[#E2E8F0]',
  cardArredondado: 'bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl',
  titulo: 'text-[#0F172A]',
  texto: 'text-[#1E293B]',
  muted: 'text-[#64748B]',
  bordaSutil: 'border-[#E2E8F0]',
  previewBg: 'bg-[#F1F5F9]',

  botaoPrimario:
    'bg-[#1E3A8A] text-white hover:bg-[#1E40AF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  botaoSecundario:
    'bg-white text-[#1E293B] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors',

  avisoBg: 'bg-[#FFFBEB] border border-[#D97706]',
  avisoTexto: 'text-[#D97706]',

  blocoBg: 'bg-[#FEF2F2] border border-[#DC2626]',
  blocoTexto: 'text-[#DC2626]',

  campo:
    'w-full h-10 rounded-md border border-[#E2E8F0] bg-white px-3 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]',
} as const;
