import type { Metadata } from 'next';
import { PrevSafeProvider } from '@/context/PrevSafeContext';
import { ServiceWorkerManager } from '@/components/field-pwa/ServiceWorkerManager';

/**
 * Layout do sistema.
 *
 * O provedor de estado e o service worker do PWA ficam aqui, e nao na raiz,
 * porque o site publico nao precisa de nenhum dos dois: carregar o contexto
 * inteiro do sistema numa pagina de marketing atrasaria o primeiro
 * carregamento e registraria um service worker para visitantes que nunca vao
 * abrir o app.
 */

export const metadata: Metadata = {
  title: 'Sistema PrevSafe',
  description: 'Gestão de serviços de Segurança e Saúde no Trabalho.',
  robots: { index: false, follow: false },
};

export default function SistemaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-fundo text-tinta min-h-screen selection:bg-marca-suave selection:text-tinta">
      <PrevSafeProvider>
        {children}
        <ServiceWorkerManager />
      </PrevSafeProvider>
    </div>
  );
}
