import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PrevSafeProvider } from '@/context/PrevSafeContext';
import { ServiceWorkerManager } from '@/components/field-pwa/ServiceWorkerManager';

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'PrevSafe - Gestão de Serviços SST',
  description: 'Sistema SaaS Multi-tenant para digitalização e gestão completa do ciclo de serviços de Segurança e Saúde no Trabalho (CRM, Proposta, Contrato, OS, Workflow, SLA, Documentos, Aceite, Portal do Cliente e PWA de Campo com Suporte Offline).',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PrevSafe Campo'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-indigo-500/30 selection:text-indigo-200">
        <PrevSafeProvider>
          {children}
          <ServiceWorkerManager />
        </PrevSafeProvider>
      </body>
    </html>
  );
}
