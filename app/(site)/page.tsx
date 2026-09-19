import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight, ShieldCheck, FileCheck2, Stethoscope, HardHat, Send,
  Clock, CheckCircle2, AlertTriangle, LogIn, BookOpen,
} from 'lucide-react';
import { listarPublicados, formatarData, minutosDeLeitura } from '@/lib/siteContent';
import { FormularioContato } from '@/components/site/FormularioContato';
import { SERVICOS_PADRAO } from '@/lib/siteServicos';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'PrevSafe — Segurança e Saúde no Trabalho sem dor de cabeça',
  description:
    'PGR, PCMSO, LTCAT, laudos, treinamentos e envio ao eSocial. Consultoria de SST que resolve a obrigação legal e organiza a gestão de riscos da sua empresa.',
};

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck, FileCheck2, Stethoscope, HardHat, Send, BookOpen,
};

export default async function HomePage() {
  const [artigos, servicosPublicados] = await Promise.all([
    listarPublicados('ARTIGO', 3),
    listarPublicados('SERVICO'),
  ]);

  // Enquanto não houver serviços cadastrados na administração, o site mostra o
  // catálogo padrão — a home nunca fica com um buraco no lugar da oferta.
  const servicos = servicosPublicados.length > 0
    ? servicosPublicados.map(s => ({
        slug: s.slug,
        titulo: s.titulo,
        resumo: s.resumo || '',
        icone: 'ShieldCheck',
      }))
    : SERVICOS_PADRAO.map(s => ({
        slug: s.slug,
        titulo: s.titulo,
        resumo: s.resumo,
        icone: s.icone,
      }));

  return (
    <>
      {/* ---------------- Topo ---------------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950">
        <div className="absolute inset-0 opacity-20" aria-hidden="true">
          <div className="absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-emerald-500 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-[24rem] h-[24rem] rounded-full bg-teal-400 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-[76rem] px-4 sm:px-6 py-20 sm:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                NR-01 · NR-07 · eSocial
              </span>

              <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1]">
                Sua empresa em dia com a{' '}
                <span className="text-emerald-400">segurança do trabalho</span>
              </h1>

              <p className="mt-5 text-lg text-slate-300 leading-relaxed max-w-[34rem]">
                Fazemos o PGR, o PCMSO, os laudos e o envio ao eSocial — e deixamos tudo
                organizado num sistema que você acompanha de qualquer lugar. Sem planilha
                solta, sem prazo perdido.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/contato"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-lg shadow-emerald-950/40"
                >
                  Diagnóstico gratuito
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/servicos"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-600 text-slate-100 font-semibold hover:border-emerald-500 hover:text-emerald-300 transition"
                >
                  Ver serviços
                </Link>
              </div>

              <dl className="mt-10 grid grid-cols-3 gap-6 max-w-[30rem]">
                {[
                  ['Prazo legal', 'Acompanhado por SLA'],
                  ['Documentos', 'Assinados e verificáveis'],
                  ['eSocial', 'S-2210, S-2220, S-2240'],
                ].map(([t, d]) => (
                  <div key={t}>
                    <dt className="text-sm font-bold text-emerald-400">{t}</dt>
                    <dd className="text-xs text-slate-400 mt-0.5">{d}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Formulário no topo: o visitante que já chegou decidido não
                precisa rolar a página inteira para conseguir falar com alguém. */}
            <div className="lg:pl-6">
              <FormularioContato
                titulo="Diagnóstico gratuito"
                descricao="Diga o porte e a atividade da empresa. Devolvemos o que é obrigatório para o seu CNAE e uma estimativa de prazo."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Dor ---------------- */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <div className="max-w-[44rem]">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Falta de SST não aparece — até aparecer
            </h2>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              O problema raramente começa com uma fiscalização. Começa com um documento
              vencido que ninguém viu, um exame que não foi feito, um evento que não
              subiu ao eSocial.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-5">
            {[
              {
                titulo: 'Multa e autuação',
                texto: 'A fiscalização do trabalho cobra o PGR e o PCMSO de praticamente todo empregador com funcionário registrado.',
              },
              {
                titulo: 'Passivo trabalhista',
                texto: 'Sem laudo, insalubridade e periculosidade viram discussão judicial — normalmente com a empresa em desvantagem.',
              },
              {
                titulo: 'Pendência no eSocial',
                texto: 'Evento de SST não enviado gera inconsistência que trava a folha e se acumula em silêncio.',
              },
            ].map(item => (
              <div key={item.titulo} className="bg-white border border-slate-200 rounded-2xl p-6">
                <AlertTriangle className="w-6 h-6 text-amber-500" aria-hidden="true" />
                <h3 className="mt-3 font-bold text-slate-900">{item.titulo}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Serviços ---------------- */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="max-w-[40rem]">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                O que resolvemos
              </h2>
              <p className="mt-3 text-slate-600">
                Do documento obrigatório à rotina de acompanhamento, com responsável
                técnico habilitado assinando cada entrega.
              </p>
            </div>
            <Link
              href="/servicos"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 shrink-0"
            >
              Ver todos os serviços
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {servicos.slice(0, 6).map(s => {
              const Icone = ICONES[s.icone] || ShieldCheck;
              return (
                <Link
                  key={s.slug}
                  href={`/servicos/${s.slug}`}
                  className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-emerald-400 hover:shadow-md transition"
                >
                  <span className="inline-flex w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 items-center justify-center">
                    <Icone className="w-5 h-5 text-emerald-700" />
                  </span>
                  <h3 className="mt-4 font-bold text-slate-900 group-hover:text-emerald-700 transition">
                    {s.titulo}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {s.resumo}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    Saiba mais
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- Como funciona ---------------- */}
      <section className="py-16 sm:py-20 bg-slate-900 text-white">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">Como funciona</h2>
          <p className="mt-3 text-slate-400 max-w-[38rem]">
            Quatro etapas. Você acompanha cada uma pelo sistema, com prazo à vista.
          </p>

          <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              ['Diagnóstico', 'Levantamos o que é obrigatório para o seu CNAE e grau de risco. Sem custo.'],
              ['Visita técnica', 'Avaliação em campo, medições e registro fotográfico dos riscos reais.'],
              ['Documentos', 'PGR, PCMSO, laudos e plano de ação, assinados por responsável técnico.'],
              ['Acompanhamento', 'Prazos monitorados, exames no vencimento e eventos enviados ao eSocial.'],
            ].map(([titulo, texto], i) => (
              <li key={titulo} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
                <span className="inline-flex w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 font-bold items-center justify-center">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-bold">{titulo}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- Área do cliente ---------------- */}
      <section className="py-16 sm:py-20 bg-emerald-50">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <div className="bg-white border border-emerald-200 rounded-3xl p-8 sm:p-10 grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                Já é cliente?
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                Acesse o sistema PrevSafe
              </h2>
              <p className="mt-3 text-slate-600 leading-relaxed">
                Seus documentos, prazos, exames e eventos do eSocial num lugar só.
                Acompanhe o andamento dos serviços e baixe os laudos quando precisar.
              </p>

              <ul className="mt-5 space-y-2.5">
                {[
                  'Documentos técnicos para baixar a qualquer hora',
                  'Prazos e exames com alerta de vencimento',
                  'Aceite digital com validade legal',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/sistema"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition"
                >
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  Entrar no sistema
                </Link>
                <Link
                  href="/guia-do-sistema"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:border-emerald-500 hover:text-emerald-700 transition"
                >
                  Como acessar
                </Link>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 text-slate-300">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Primeiro acesso
              </p>
              <ol className="mt-4 space-y-3.5 text-sm">
                {[
                  'Você recebe um convite por e-mail ou WhatsApp com seu login.',
                  'Entre em prevsafe.com.br/sistema e defina sua senha.',
                  'Pronto: documentos, prazos e pendências ficam disponíveis.',
                ].map((passo, i) => (
                  <li key={passo} className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{passo}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 pt-4 border-t border-slate-800 text-xs text-slate-500">
                Perdeu o acesso? Use &quot;Esqueci minha senha&quot; na tela de login ou fale
                com a gente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Atualizações ---------------- */}
      {artigos.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="max-w-[40rem]">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Atualizações de SST
                </h2>
                <p className="mt-3 text-slate-600">
                  Mudanças nas normas, prazos e o que elas significam na prática.
                </p>
              </div>
              <Link
                href="/atualizacoes"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 shrink-0"
              >
                Ver todas
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {artigos.map(a => (
                <Link
                  key={a.id}
                  href={`/atualizacoes/${a.slug}`}
                  className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-emerald-400 hover:shadow-md transition"
                >
                  {a.imagem_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.imagem_url} alt="" className="w-full h-40 object-cover" />
                  )}
                  <div className="p-5">
                    {a.categoria && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                        {a.categoria}
                      </span>
                    )}
                    <h3 className="mt-1.5 font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2">
                      {a.titulo}
                    </h3>
                    {a.resumo && (
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">{a.resumo}</p>
                    )}
                    <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      {formatarData(a.publicado_em)} · {minutosDeLeitura(a.conteudo)} min
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Fechamento ---------------- */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="mx-auto max-w-[46rem] px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Não sabe por onde começar?
            </h2>
            <p className="mt-3 text-slate-600">
              A maioria das empresas que nos procura está exatamente nesse ponto. O
              diagnóstico é gratuito e sem compromisso.
            </p>
          </div>
          <FormularioContato
            titulo="Fale com um especialista"
            descricao="Respondemos em até 1 dia útil."
          />
        </div>
      </section>
    </>
  );
}
