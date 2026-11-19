import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

/**
 * Tipografia da identidade visual: Montserrat nos titulos, Inter no texto.
 *
 * Os arquivos vem do pacote @fontsource (npm) e sao servidos pelo proprio
 * dominio, em vez de baixados do Google Fonts no build. Isso tira uma
 * requisicao a terceiro do carregamento da pagina, nao vaza o IP de quem
 * visita para outro servidor, e faz o build funcionar em rede fechada.
 */
const inter = localFont({
  src: [
    {
      path: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
      style: 'normal',
    },
  ],
  variable: '--fonte-inter',
  display: 'swap',
});

const montserrat = localFont({
  src: [
    {
      path: '../node_modules/@fontsource/montserrat/files/montserrat-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/montserrat/files/montserrat-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/montserrat/files/montserrat-latin-800-normal.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
  variable: '--fonte-montserrat',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0E3A46',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.prevsafe.com'),
  title: {
    default: 'PrevSafe — Segurança e Saúde no Trabalho',
    template: '%s | PrevSafe',
  },
  description:
    'Consultoria e gestão de Segurança e Saúde no Trabalho: PGR, PCMSO, LTCAT, laudos técnicos, treinamentos e envio ao eSocial.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PrevSafe Campo',
  },
};

/**
 * Layout raiz enxuto: define apenas o documento.
 *
 * O tema e o provedor de estado moram nos layouts de cada area — o site
 * publico em (site) e o sistema em /sistema — porque as duas tem aparencia e
 * necessidades diferentes.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${montserrat.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased min-h-screen font-texto">{children}</body>
    </html>
  );
}
