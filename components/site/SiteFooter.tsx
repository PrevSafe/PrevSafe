import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';
import { EMPRESA } from '@/lib/siteConfig';

export function SiteFooter() {
  const ano = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-[76rem] px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <div>
              <span className="font-bold text-xl text-white">PrevSafe</span>
            </div>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Consultoria e gestão de Segurança e Saúde no Trabalho, do laudo técnico
              ao envio dos eventos ao eSocial.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Serviços</h2>
            <ul className="space-y-2 text-sm">
              <li><Link href="/servicos" className="hover:text-emerald-400 transition">Todos os serviços</Link></li>
              <li><Link href="/para-empresas" className="hover:text-emerald-400 transition">Para empresas</Link></li>
              <li><Link href="/para-trabalhadores" className="hover:text-emerald-400 transition">Para trabalhadores</Link></li>
              <li><Link href="/atualizacoes" className="hover:text-emerald-400 transition">Atualizações de SST</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Clientes</h2>
            <ul className="space-y-2 text-sm">
              <li><Link href="/sistema" className="hover:text-emerald-400 transition">Acessar o sistema</Link></li>
              <li><Link href="/guia-do-sistema" className="hover:text-emerald-400 transition">Guia de acesso</Link></li>
              <li><Link href="/validar" className="hover:text-emerald-400 transition">Validar documento</Link></li>
              <li><Link href="/contato" className="hover:text-emerald-400 transition">Falar com especialista</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Contato</h2>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <a href={`tel:${EMPRESA.telefoneLimpo}`} className="hover:text-emerald-400 transition">
                  {EMPRESA.telefone}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <a href={`mailto:${EMPRESA.email}`} className="hover:text-emerald-400 transition break-all">
                  {EMPRESA.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="text-slate-400">{EMPRESA.atuacao}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-slate-500">
          <p>
            © {ano} {EMPRESA.razaoSocial} — CNPJ {EMPRESA.cnpj}
          </p>
          <p>
            Conteúdo informativo. Não substitui a avaliação de um profissional habilitado
            para o caso concreto.
          </p>
        </div>
      </div>
    </footer>
  );
}
