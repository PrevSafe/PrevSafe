import type { Metadata } from 'next';
import './globals.css';
import { PrevSafeProvider } from '@/context/PrevSafeContext';

export const metadata: Metadata = {
  title: 'PrevSafe - Gestão de Serviços SST',
  description: 'Sistema SaaS Multi-tenant para digitalização e gestão completa do ciclo de serviços de Segurança e Saúde no Trabalho (CRM, Proposta, Contrato, OS, Workflow, SLA, Documentos, Aceite, Portal do Cliente e PWA de Campo).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-indigo-500/30 selection:text-indigo-200">
        <PrevSafeProvider>
          {children}
        </PrevSafeProvider>
      </body>
    </html>
  );
}
