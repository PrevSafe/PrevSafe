import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Clock, ArrowRight, Newspaper } from 'lucide-react';
import { listarPublicados, formatarData, minutosDeLeitura } from '@/lib/siteContent';
import { FormularioContato } from '@/components/site/FormularioContato';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Atualizações de Segurança e Saúde no Trabalho',
  description:
    'Mudanças nas normas regulamentadoras, prazos do eSocial e o que elas significam na prática para empresas e trabalhadores.',
};

export default async function AtualizacoesPage() {
  const artigos = await listarPublicados('ARTIGO');
  const [destaque, ...restantes] = artigos;

  return (
    <>
      <section className="bg-slate-900 text-white py-16 sm:py-20">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <nav aria-label="Trilha" className="text-sm text-slate-400">
            <Link href="/" className="hover:text-emerald-400">Início</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-200">Atualizações</span>
          </nav>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Atualizações de SST</h1>
          <p className="mt-4 text-lg text-slate-300 max-w-[42rem] leading-relaxed">
            Mudanças nas normas, prazos que se aproximam e o que muda na rotina de quem
            precisa cumprir.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          {artigos.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-300 rounded-3xl">
              <Newspaper className="w-10 h-10 text-slate-400 mx-auto" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold text-slate-900">Em breve</h2>
              <p className="mt-2 text-slate-600 max-w-[32rem] mx-auto">
                Estamos preparando os primeiros conteúdos. Enquanto isso, fale com a
                gente se tiver alguma dúvida sobre obrigações de SST.
              </p>
              <Link
                href="/contato"
                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
              >
                Falar com especialista
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <>
              {destaque && (
                <Link
                  href={`/atualizacoes/${destaque.slug}`}
                  className="group grid lg:grid-cols-2 gap-8 items-center bg-white border border-slate-200 rounded-3xl overflow-hidden hover:border-emerald-400 hover:shadow-md transition mb-10"
                >
                  {destaque.imagem_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={destaque.imagem_url} alt="" className="w-full h-full min-h-[16rem] object-cover" />
                  ) : (
                    <div className="w-full min-h-[16rem] bg-gradient-to-br from-emerald-600 to-teal-800" aria-hidden="true" />
                  )}
                  <div className="p-7">
                    {destaque.categoria && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                        {destaque.categoria}
                      </span>
                    )}
                    <h2 className="mt-2 text-2xl font-bold text-slate-900 group-hover:text-emerald-700 transition">
                      {destaque.titulo}
                    </h2>
                    {destaque.resumo && (
                      <p className="mt-3 text-slate-600 leading-relaxed">{destaque.resumo}</p>
                    )}
                    <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="w-4 h-4" aria-hidden="true" />
                      {formatarData(destaque.publicado_em)} · {minutosDeLeitura(destaque.conteudo)} min de leitura
                    </p>
                  </div>
                </Link>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {restantes.map(a => (
                  <Link
                    key={a.id}
                    href={`/atualizacoes/${a.slug}`}
                    className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-emerald-400 hover:shadow-md transition flex flex-col"
                  >
                    {a.imagem_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.imagem_url} alt="" className="w-full h-40 object-cover" />
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      {a.categoria && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                          {a.categoria}
                        </span>
                      )}
                      <h2 className="mt-1.5 font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2">
                        {a.titulo}
                      </h2>
                      {a.resumo && <p className="mt-2 text-sm text-slate-600 line-clamp-3 flex-1">{a.resumo}</p>}
                      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        {formatarData(a.publicado_em)} · {minutosDeLeitura(a.conteudo)} min
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="py-14 sm:py-16 bg-slate-50">
        <div className="mx-auto max-w-[46rem] px-4 sm:px-6">
          <FormularioContato
            titulo="Dúvida sobre alguma obrigação?"
            descricao="Explique sua situação. Respondemos em até 1 dia útil, sem compromisso."
          />
        </div>
      </section>
    </>
  );
}
