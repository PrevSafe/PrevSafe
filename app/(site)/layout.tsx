import React from 'react';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { RecoveryLinkGuard } from '@/components/site/RecoveryLinkGuard';
import { BotaoWhatsApp } from '@/components/site/BotaoWhatsApp';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white text-slate-900 min-h-screen flex flex-col selection:bg-emerald-200 selection:text-emerald-950">
      {/* O Supabase pode mandar o link de recuperação para a raiz do domínio,
          que agora é o site e não mais o sistema. Sem isto o token viraria
          sessão silenciosamente e o usuário nunca chegaria à tela de senha. */}
      <RecoveryLinkGuard />

      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-emerald-600 focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <SiteHeader />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <BotaoWhatsApp />
    </div>
  );
}
