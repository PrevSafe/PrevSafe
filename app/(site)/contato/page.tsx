import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Phone, Mail, MessageCircle, Clock, LogIn } from 'lucide-react';
import { FormularioContato } from '@/components/site/FormularioContato';
import { EMPRESA, linkWhatsApp } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'Fale com um especialista em SST',
  description:
    'Diagnóstico gratuito do que é obrigatório para a sua empresa: PGR, PCMSO, LTCAT, laudos e eSocial. Resposta em até 1 dia útil.',
};

interface Props {
  searchParams: Promise<{ interesse?: string }>;
}

export default async function ContatoPage({ searchParams }: Props) {
  const { interesse } = await searchParams;

  return (
    <>
      <section className="bg-slate-900 text-white py-14 sm:py-16">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <nav aria-label="Trilha" className="text-sm text-slate-400">
            <Link href="/" className="hover:text-emerald-400">Início</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-200">Contato</span>
          </nav>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Fale com um especialista</h1>
          <p className="mt-4 text-lg text-slate-300 max-w-[42rem] leading-relaxed">
            Conte a situação da sua empresa. Devolvemos o que é obrigatório para o seu
            CNAE, uma estimativa de prazo e o próximo passo. Sem custo e sem compromisso.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6 grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <FormularioContato
              interesse={interesse}
              titulo="Diagnóstico gratuito"
              descricao="Quanto mais detalhe, mais preciso o retorno."
            />
          </div>

          <aside className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="font-bold text-slate-900">Prefere falar direto?</h2>
              <ul className="mt-4 space-y-3.5 text-sm">
                <li>
                  <a
                    href={linkWhatsApp()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2.5 text-slate-700 hover:text-emerald-700 transition"
                  >
                    <MessageCircle className="w-4.5 h-4.5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold">WhatsApp</span>
                      <span className="text-slate-500">{EMPRESA.telefone}</span>
                    </span>
                  </a>
                </li>
                <li>
                  <a href={`tel:${EMPRESA.telefoneLimpo}`} className="flex items-start gap-2.5 text-slate-700 hover:text-emerald-700 transition">
                    <Phone className="w-4.5 h-4.5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold">Telefone</span>
                      <span className="text-slate-500">{EMPRESA.telefone}</span>
                    </span>
                  </a>
                </li>
                <li>
                  <a href={`mailto:${EMPRESA.email}`} className="flex items-start gap-2.5 text-slate-700 hover:text-emerald-700 transition">
                    <Mail className="w-4.5 h-4.5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold">E-mail</span>
                      <span className="text-slate-500 break-all">{EMPRESA.email}</span>
                    </span>
                  </a>
                </li>
                <li className="flex items-start gap-2.5 text-slate-700">
                  <Clock className="w-4.5 h-4.5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold">Atendimento</span>
                    <span className="text-slate-500">Segunda a sexta, 8h às 18h</span>
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <LogIn className="w-6 h-6 text-emerald-700" aria-hidden="true" />
              <h2 className="mt-3 font-bold text-slate-900">Já é cliente?</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Para documentos, prazos e pendências, use o sistema.
              </p>
              <Link
                href="/sistema"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition"
              >
                Entrar no sistema
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
