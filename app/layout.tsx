import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#047857',
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
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
