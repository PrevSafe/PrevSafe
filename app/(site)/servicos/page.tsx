import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, ShieldCheck, FileCheck2, Stethoscope, HardHat, Send, BookOpen } from 'lucide-react';
import { listarPublicados } from '@/lib/siteContent';
import { SERVICOS_PADRAO } from '@/lib/siteServicos';
import { FormularioContato } from '@/components/site/FormularioContato';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Serviços de Segurança e Saúde no Trabalho',
  description:
    'PGR, PCMSO, LTCAT, laudos de insalubridade e periculosidade, eventos do eSocial, treinamentos e CIPA. Veja o que cada serviço entrega e para quem é obrigatório.',
};

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck, FileCheck2, Stethoscope, HardHat, Send, BookOpen,
};

export default async function ServicosPage() {
  const publicados = await listarPublicados('SERVICO');

  // O que foi publicado na administração tem precedência; o catálogo padrão
  // preenche o resto, para a página nunca ficar incompleta.
  const slugsPublicados = new Set(publicados.map(p => p.slug));
  const itens = [
    ...publicados.map(p => ({
      slug: p.slug,
      titulo: p.titulo,
      resumo: p.resumo || '',
      norma: p.categoria || '',
      icone: 'ShieldCheck',
    })),
    ...SERVICOS_PADRAO.filter(s => !slugsPublicados.has(s.slug)).map(s => ({
      slug: s.slug,
      titulo: s.titulo,
      resumo: s.resumo,
      norma: s.norma,
      icone: s.icone,
    })),
  ];

  return (
    <>
      <section className="bg-slate-900 text-white py-16 sm:py-20">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <nav aria-label="Trilha" className="text-sm text-slate-400">
            <Link href="/" className="hover:text-emerald-400">Início</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-200">Serviços</span>
          </nav>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Serviços de SST</h1>
          <p className="mt-4 text-lg text-slate-300 max-w-[42rem] leading-relaxed">
            Cada entrega sai assinada por responsável técnico habilitado e fica disponível
            no sistema para você baixar quando precisar.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {itens.map(s => {
              const Icone = ICONES[s.icone] || ShieldCheck;
              return (
                <Link
                  key={s.slug}
                  href={`/servicos/${s.slug}`}
                  className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-emerald-400 hover:shadow-md transition flex flex-col"
                >
                  <span className="inline-flex w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 items-center justify-center">
                    <Icone className="w-5 h-5 text-emerald-700" />
                  </span>
                  {s.norma && (
                    <span className="mt-4 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      {s.norma}
                    </span>
                  )}
                  <h2 className="mt-1 font-bold text-slate-900 group-hover:text-emerald-700 transition">
                    {s.titulo}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed flex-1">{s.resumo}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    Ver detalhes
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16 bg-slate-50">
        <div className="mx-auto max-w-[46rem] px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Qual desses a sua empresa precisa?
            </h2>
            <p className="mt-3 text-slate-600">
              Depende do CNAE, do grau de risco e do número de colaboradores. O
              diagnóstico responde isso sem custo.
            </p>
          </div>
          <FormularioContato titulo="Diagnóstico gratuito" descricao="Respondemos em até 1 dia útil." />
        </div>
      </section>
    </>
  );
}
