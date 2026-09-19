import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CheckCircle2, Clock, Users, ArrowRight, ScrollText } from 'lucide-react';
import { buscarPorSlug } from '@/lib/siteContent';
import { buscarServicoPadrao, SERVICOS_PADRAO } from '@/lib/siteServicos';
import { markdownParaHtml } from '@/lib/siteMarkdown';
import { FormularioContato } from '@/components/site/FormularioContato';

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Resolve o servico dando precedencia ao que foi publicado na administracao.
 * O catalogo padrao e a rede de seguranca: mantem a pagina no ar e indexavel
 * antes de qualquer conteudo ser cadastrado.
 */
async function resolver(slug: string) {
  const publicado = await buscarPorSlug('SERVICO', slug);
  if (publicado) {
    return {
      titulo: publicado.titulo,
      resumo: publicado.resumo || '',
      norma: publicado.categoria || '',
      paraQuem: '',
      prazo: '',
      entregaveis: [] as string[],
      html: markdownParaHtml(publicado.conteudo || ''),
      seoTitulo: publicado.seo_titulo || publicado.titulo,
      seoDescricao: publicado.seo_descricao || publicado.resumo || '',
      ctaTexto: publicado.cta_texto,
      ctaDestino: publicado.cta_destino,
    };
  }

  const padrao = buscarServicoPadrao(slug);
  if (!padrao) return null;

  return {
    titulo: padrao.titulo,
    resumo: padrao.resumo,
    norma: padrao.norma,
    paraQuem: padrao.paraQuem,
    prazo: padrao.prazo,
    entregaveis: padrao.entregaveis,
    html: markdownParaHtml(padrao.conteudo),
    seoTitulo: padrao.titulo,
    seoDescricao: padrao.resumo,
    ctaTexto: null as string | null,
    ctaDestino: null as string | null,
  };
}

export async function generateStaticParams() {
  return SERVICOS_PADRAO.map(s => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const servico = await resolver(slug);
  if (!servico) return { title: 'Serviço não encontrado' };
  return {
    title: servico.seoTitulo,
    description: servico.seoDescricao,
    alternates: { canonical: `/servicos/${slug}` },
  };
}

export default async function ServicoPage({ params }: Props) {
  const { slug } = await params;
  const servico = await resolver(slug);
  if (!servico) notFound();

  return (
    <>
      <section className="bg-slate-900 text-white py-14 sm:py-16">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <nav aria-label="Trilha" className="text-sm text-slate-400">
            <Link href="/" className="hover:text-emerald-400">Início</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href="/servicos" className="hover:text-emerald-400">Serviços</Link>
          </nav>
          {servico.norma && (
            <span className="inline-block mt-4 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              {servico.norma}
            </span>
          )}
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight max-w-[44rem]">
            {servico.titulo}
          </h1>
          {servico.resumo && (
            <p className="mt-4 text-lg text-slate-300 max-w-[42rem] leading-relaxed">
              {servico.resumo}
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[76rem] px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid lg:grid-cols-3 gap-10">
          <article className="lg:col-span-2">
            <div dangerouslySetInnerHTML={{ __html: servico.html }} />

            {servico.entregaveis.length > 0 && (
              <div className="mt-10 bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <ScrollText className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                  O que você recebe
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {servico.entregaveis.map(e => (
                    <li key={e} className="flex items-start gap-2.5 text-slate-700">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-5">
              {(servico.paraQuem || servico.prazo) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  {servico.paraQuem && (
                    <div>
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <Users className="w-3.5 h-3.5" aria-hidden="true" />
                        Para quem
                      </p>
                      <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">{servico.paraQuem}</p>
                    </div>
                  )}
                  {servico.prazo && (
                    <div className="pt-4 border-t border-slate-200">
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        Prazo estimado
                      </p>
                      <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">{servico.prazo}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-slate-900 rounded-2xl p-6 text-white">
                <h2 className="font-bold text-lg">Precisa deste serviço?</h2>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  Fale com um especialista e receba um diagnóstico gratuito do que é
                  obrigatório para a sua empresa.
                </p>
                <Link
                  href={servico.ctaDestino || `/contato?interesse=${encodeURIComponent(servico.titulo)}`}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition"
                >
                  {servico.ctaTexto || 'Solicitar diagnóstico'}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <section className="py-14 sm:py-16 bg-slate-50">
        <div className="mx-auto max-w-[46rem] px-4 sm:px-6">
          <FormularioContato
            interesse={servico.titulo}
            titulo={`Fale sobre ${servico.norma || 'este serviço'}`}
            descricao="Conte a situação da sua empresa. Respondemos em até 1 dia útil."
          />
        </div>
      </section>
    </>
  );
}
