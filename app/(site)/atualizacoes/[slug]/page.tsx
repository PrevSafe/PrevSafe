import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Clock, ArrowLeft, User } from 'lucide-react';
import { buscarPorSlug, listarPublicados, formatarData, minutosDeLeitura } from '@/lib/siteContent';
import { markdownParaHtml } from '@/lib/siteMarkdown';
import { FormularioContato } from '@/components/site/FormularioContato';

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artigo = await buscarPorSlug('ARTIGO', slug);
  if (!artigo) return { title: 'Conteúdo não encontrado' };

  return {
    title: artigo.seo_titulo || artigo.titulo,
    description: artigo.seo_descricao || artigo.resumo || undefined,
    alternates: { canonical: `/atualizacoes/${slug}` },
    openGraph: {
      title: artigo.seo_titulo || artigo.titulo,
      description: artigo.seo_descricao || artigo.resumo || undefined,
      type: 'article',
      publishedTime: artigo.publicado_em || undefined,
      images: artigo.imagem_url ? [artigo.imagem_url] : undefined,
    },
  };
}

export default async function ArtigoPage({ params }: Props) {
  const { slug } = await params;
  const artigo = await buscarPorSlug('ARTIGO', slug);
  if (!artigo) notFound();

  const relacionados = (await listarPublicados('ARTIGO', 4)).filter(a => a.slug !== slug).slice(0, 3);
  const html = markdownParaHtml(artigo.conteudo || '');

  return (
    <>
      <article>
        <header className="bg-slate-900 text-white py-14 sm:py-16">
          <div className="mx-auto max-w-[48rem] px-4 sm:px-6">
            <Link
              href="/atualizacoes"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-emerald-400 transition"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Todas as atualizações
            </Link>

            {artigo.categoria && (
              <span className="block mt-5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                {artigo.categoria}
              </span>
            )}

            <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              {artigo.titulo}
            </h1>

            {artigo.resumo && (
              <p className="mt-4 text-lg text-slate-300 leading-relaxed">{artigo.resumo}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" aria-hidden="true" />
                {formatarData(artigo.publicado_em)} · {minutosDeLeitura(artigo.conteudo)} min
              </span>
              {artigo.autor && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" aria-hidden="true" />
                  {artigo.autor}
                </span>
              )}
            </div>
          </div>
        </header>

        {artigo.imagem_url && (
          <div className="mx-auto max-w-[56rem] px-4 sm:px-6 -mt-8 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artigo.imagem_url}
              alt=""
              className="w-full rounded-3xl shadow-lg object-cover max-h-[26rem]"
            />
          </div>
        )}

        <div className="mx-auto max-w-[48rem] px-4 sm:px-6 py-12">
          <div dangerouslySetInnerHTML={{ __html: html }} />

          {artigo.tags && artigo.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-slate-200 flex flex-wrap gap-2">
              {artigo.tags.map(t => (
                <span key={t} className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>

      <section className="py-12 bg-slate-50">
        <div className="mx-auto max-w-[48rem] px-4 sm:px-6">
          <FormularioContato
            interesse={artigo.categoria || undefined}
            titulo="Isso se aplica à sua empresa?"
            descricao="Fale com um especialista e descubra o que é obrigatório no seu caso. Diagnóstico gratuito."
          />
        </div>
      </section>

      {relacionados.length > 0 && (
        <section className="py-14">
          <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Leia também</h2>
            <div className="mt-6 grid sm:grid-cols-3 gap-6">
              {relacionados.map(a => (
                <Link
                  key={a.id}
                  href={`/atualizacoes/${a.slug}`}
                  className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-400 hover:shadow-md transition"
                >
                  {a.categoria && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      {a.categoria}
                    </span>
                  )}
                  <h3 className="mt-1.5 font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2">
                    {a.titulo}
                  </h3>
                  <p className="mt-2 text-xs text-slate-500">{formatarData(a.publicado_em)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
