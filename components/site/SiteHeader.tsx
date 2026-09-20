'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, LogIn } from 'lucide-react';

const LINKS = [
  { href: '/servicos', label: 'Serviços' },
  { href: '/atualizacoes', label: 'Atualizações' },
  { href: '/para-empresas', label: 'Para empresas' },
  { href: '/para-trabalhadores', label: 'Para trabalhadores' },
  { href: '/contato', label: 'Contato' },
];

export function SiteHeader() {
  const [aberto, setAberto] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="shrink-0" aria-label="PrevSafe, página inicial">
            <span className="font-bold text-xl tracking-tight text-slate-900">PrevSafe</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-7" aria-label="Navegação principal">
            {LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-slate-600 hover:text-emerald-700 transition"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            {/* Área do cliente: destaque visual menor que o CTA comercial, mas
                sempre visível — quem já é cliente não deve caçar o login. */}
            <Link
              href="/sistema"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              Área do cliente
            </Link>
            <Link
              href="/contato"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition"
            >
              Falar com especialista
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setAberto(v => !v)}
            className="lg:hidden p-2 -mr-2 text-slate-700"
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={aberto}
          >
            {aberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {aberto && (
        <div className="lg:hidden border-t border-slate-200 bg-white">
          <nav className="mx-auto max-w-[76rem] px-4 py-4 flex flex-col gap-1" aria-label="Navegação principal">
            {LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setAberto(false)}
                className="py-2.5 text-[15px] font-medium text-slate-700"
              >
                {l.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-slate-200">
              <Link
                href="/sistema"
                onClick={() => setAberto(false)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-700"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                Área do cliente
              </Link>
              <Link
                href="/contato"
                onClick={() => setAberto(false)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold"
              >
                Falar com especialista
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
