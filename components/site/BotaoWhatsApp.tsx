'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { linkWhatsApp } from '@/lib/siteConfig';

/**
 * Atalho fixo para o WhatsApp.
 *
 * Boa parte do publico de SST prefere resolver por mensagem a preencher
 * formulario. Deixar o caminho curto visivel em toda pagina costuma render
 * mais conversa do que insistir so no formulario.
 */
export function BotaoWhatsApp() {
  return (
    <a
      href={linkWhatsApp()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-900/20 transition"
    >
      <MessageCircle className="w-5 h-5" aria-hidden="true" />
      <span className="hidden sm:inline text-sm">Falar no WhatsApp</span>
    </a>
  );
}
