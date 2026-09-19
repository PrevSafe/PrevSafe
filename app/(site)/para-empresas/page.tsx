import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { CheckCircle2, AlertTriangle, TrendingDown, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { FormularioContato } from '@/components/site/FormularioContato';

export const metadata: Metadata = {
  title: 'SST para empresas — o que é obrigatório e por onde começar',
  description:
    'Entenda quais documentos de segurança do trabalho sua empresa precisa ter, os riscos de não ter, e como colocar tudo em dia sem travar a operação.',
};

const OBRIGACOES = [
  {
    titulo: 'PGR — Programa de Gerenciamento de Riscos',
    norma: 'NR-01',
    texto: 'Mapeia os riscos de cada função e define o plano de ação. É a base de tudo.',
    href: '/servicos/pgr-programa-de-gerenciamento-de-riscos',
  },
  {
    titulo: 'PCMSO — Controle Médico',
    norma: 'NR-07',
    texto: 'Define os exames de cada função e acompanha a aptidão dos colaboradores.',
    href: '/servicos/pcmso-programa-de-controle-medico',
  },
  {
    titulo: 'Eventos de SST no eSocial',
    norma: 'Portaria 672/2021',
    texto: 'S-2210, S-2220 e S-2240 dentro do prazo, sem pendência acumulada.',
    href: '/servicos/esocial-eventos-sst',
  },
  {
    titulo: 'Treinamentos normativos',
    norma: 'Várias NRs',
    texto: 'Registro adequado do que foi treinado, com carga horária e reciclagem controlada.',
    href: '/servicos/treinamentos-e-cipa',
  },
];

const RISCOS = [
  {
    icone: AlertTriangle,
    titulo: 'Autuação',
    texto: 'A fiscalização cobra o PGR e o PCMSO. A multa varia com o porte da empresa e a gravidade, e vem acompanhada de prazo para regularizar.',
  },
  {
    icone: TrendingDown,
    titulo: 'Passivo trabalhista',
    texto: 'Sem laudo, adicional de insalubridade vira discussão judicial — normalmente decidida por perícia, com a empresa em desvantagem.',
  },
  {
    icone: Clock,
    titulo: 'Pendência acumulada',
    texto: 'Evento não enviado ao eSocial não desaparece. Ele se acumula em silêncio até travar alguma coisa.',
  },
];

const ETAPAS = [
  ['Diagnóstico gratuito', 'Levantamos o que é obrigatório para o seu CNAE e grau de risco.'],
  ['Proposta fechada', 'Escopo e valor definidos, sem surpresa no meio do caminho.'],
  ['Visita técnica', 'Avaliação em campo com medições e registro fotográfico.'],
  ['Entrega e acompanhamento', 'Documentos assinados e prazos monitorados daí em diante.'],
];

export default function ParaEmpresasPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-slate-900 to-emerald-950 text-white py-16 sm:py-20">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <nav aria-label="Trilha" className="text-sm text-slate-400">
              <Link href="/" className="hover:text-emerald-400">Início</Link>
              <span className="mx-2" aria-hidden="true">/</span>
              <span className="text-slate-200">Para empresas</span>
            </nav>
            <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
              O que sua empresa precisa ter — e o que acontece se não tiver
            </h1>
            <p className="mt-5 text-lg text-slate-300 leading-relaxed">
              A obrigação de SST não depende do tamanho da empresa. Depende de ter
              empregado registrado. Veja o que se aplica ao seu caso.
            </p>
          </div>
          <div className="lg:pl-6">
            <FormularioContato
              interesse="Não sei por onde começar"
              titulo="Descubra o que é obrigatório"
              descricao="Informe a atividade e o número de colaboradores. Devolvemos a lista do que se aplica."
            />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 max-w-[38rem]">
            O básico que quase toda empresa com funcionário precisa
          </h2>

          <div className="mt-10 grid sm:grid-cols-2 gap-5">
            {OBRIGACOES.map(o => (
              <Link
                key={o.titulo}
                href={o.href}
                className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-emerald-400 hover:shadow-md transition"
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">{o.norma}</span>
                <h3 className="mt-1.5 font-bold text-slate-900 group-hover:text-emerald-700 transition">{o.titulo}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{o.texto}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  Ver detalhes
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">O custo de deixar para depois</h2>
          <div className="mt-8 grid sm:grid-cols-3 gap-5">
            {RISCOS.map(r => (
              <div key={r.titulo} className="bg-white border border-slate-200 rounded-2xl p-6">
                <r.icone className="w-6 h-6 text-amber-500" aria-hidden="true" />
                <h3 className="mt-3 font-bold text-slate-900">{r.titulo}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{r.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Diferencial
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
              Documento entregue é só metade do trabalho
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Muita consultoria entrega o PDF e desaparece. O problema é que SST é rotina:
              exame vence, colaborador entra, risco muda, evento precisa ser enviado.
            </p>
            <p className="mt-3 text-slate-600 leading-relaxed">
              Por isso cada cliente recebe acesso ao sistema, onde os prazos ficam visíveis
              antes de virarem problema.
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                'Alerta de exame e documento a vencer',
                'Documentos sempre na versão mais recente',
                'Histórico do que estava valendo em cada data',
                'Aceite digital com validade legal',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/guia-do-sistema"
              className="mt-6 inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Conhecer o sistema
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="bg-slate-900 rounded-3xl p-8 text-white">
            <h2 className="text-xl font-bold">Como começamos</h2>
            <ol className="mt-5 space-y-4">
              {ETAPAS.map(([t, d], i) => (
                <li key={t} className="flex gap-3.5">
                  <span className="shrink-0 w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-slate-400 mt-0.5 leading-relaxed">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-[46rem] px-4 sm:px-6">
          <FormularioContato
            titulo="Comece pelo diagnóstico"
            descricao="Gratuito, sem compromisso, com resposta em até 1 dia útil."
          />
        </div>
      </section>
    </>
  );
}
