import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { HardHat, FileText, Stethoscope, Scale, AlertCircle, ShieldCheck } from 'lucide-react';
import { EMPRESA, linkWhatsApp } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'Segurança do trabalho: o que todo trabalhador deveria saber',
  description:
    'Seus direitos em segurança e saúde no trabalho: EPI, exames, ASO, CAT, insalubridade e o que fazer em caso de acidente.',
};

const DIREITOS = [
  {
    icone: HardHat,
    titulo: 'EPI fornecido pela empresa, sem custo',
    texto:
      'O equipamento de proteção individual é obrigação do empregador: fornecer gratuitamente, no tamanho certo, em bom estado, com Certificado de Aprovação válido, e substituir quando danificar. Treinar sobre o uso também é dever dele.',
    base: 'NR-06',
  },
  {
    icone: Stethoscope,
    titulo: 'Exames ocupacionais pagos pela empresa',
    texto:
      'Admissional, periódico, de retorno ao trabalho, de mudança de função e demissional. Todos por conta do empregador, em horário que conta como jornada. Você tem direito a uma via do ASO.',
    base: 'NR-07',
  },
  {
    icone: FileText,
    titulo: 'Saber a quais riscos você está exposto',
    texto:
      'A empresa precisa informar os riscos da sua função e as medidas de proteção adotadas. Essa informação está no PGR, e você pode pedir para conhecer a parte que trata do seu setor.',
    base: 'NR-01',
  },
  {
    icone: Scale,
    titulo: 'Adicional quando houver exposição',
    texto:
      'Insalubridade (10%, 20% ou 40%) ou periculosidade (30%) quando a exposição se enquadra na norma. O que define é o laudo técnico, não o acordo verbal nem o que está escrito no contrato.',
    base: 'NR-15 e NR-16',
  },
];

const ACIDENTE = [
  'Procure atendimento médico imediatamente. A sua saúde vem primeiro.',
  'Comunique a empresa assim que possível, mesmo que a lesão pareça pequena.',
  'A empresa é obrigada a emitir a CAT — Comunicação de Acidente de Trabalho — até o primeiro dia útil seguinte.',
  'Se a empresa não emitir, você, um dependente, o sindicato, o médico ou a autoridade pública podem emitir.',
  'Guarde os atestados, receitas e exames. Eles sustentam o reconhecimento do acidente depois.',
];

export default function ParaTrabalhadoresPage() {
  return (
    <>
      <section className="bg-slate-900 text-white py-16 sm:py-20">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <nav aria-label="Trilha" className="text-sm text-slate-400">
            <Link href="/" className="hover:text-emerald-400">Início</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-200">Para trabalhadores</span>
          </nav>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight max-w-[40rem] leading-[1.1]">
            O que todo trabalhador deveria saber sobre segurança
          </h1>
          <p className="mt-5 text-lg text-slate-300 max-w-[42rem] leading-relaxed">
            Boa parte dos direitos de segurança e saúde no trabalho é desconhecida por
            quem mais precisa deles. Esta página resume o essencial, em linguagem direta.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Seus direitos</h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {DIREITOS.map(d => (
              <div key={d.titulo} className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <span className="shrink-0 w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <d.icone className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                  </span>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      {d.base}
                    </span>
                    <h3 className="mt-0.5 font-bold text-slate-900">{d.titulo}</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{d.texto}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-amber-50 border-y border-amber-200">
        <div className="mx-auto max-w-[48rem] px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <AlertCircle className="w-7 h-7 text-amber-600" aria-hidden="true" />
            Sofreu um acidente de trabalho?
          </h2>
          <p className="mt-3 text-slate-700">
            A ordem dos passos importa. Guarde esta sequência:
          </p>
          <ol className="mt-6 space-y-3">
            {ACIDENTE.map((passo, i) => (
              <li key={passo} className="flex gap-3.5 bg-white rounded-2xl p-4 border border-amber-200">
                <span className="shrink-0 w-7 h-7 rounded-lg bg-amber-500 text-white text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-slate-700 leading-relaxed">{passo}</p>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm text-slate-600">
            A CAT é o que liga o acidente ao trabalho para fins previdenciários. Sem ela,
            provar o vínculo depois fica bem mais difícil.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-[48rem] px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Recusar trabalho em risco grave é direito
          </h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            A NR-01 assegura ao trabalhador interromper suas atividades quando houver
            risco grave e iminente à sua saúde ou segurança, comunicando imediatamente o
            superior hierárquico.
          </p>
          <p className="mt-3 text-slate-600 leading-relaxed">
            Não é insubordinação: é uma previsão da própria norma. O papel da empresa é
            corrigir a condição, não pressionar pela continuidade.
          </p>

          <div className="mt-8 bg-slate-900 rounded-3xl p-8 text-white">
            <ShieldCheck className="w-8 h-8 text-emerald-400" aria-hidden="true" />
            <h3 className="mt-4 text-xl font-bold">Trabalha numa empresa atendida por nós?</h3>
            <p className="mt-2 text-slate-300 leading-relaxed">
              Se a sua empresa é cliente PrevSafe e você quer entender os riscos da sua
              função ou tirar dúvida sobre um exame, fale com a gente. Orientação sem
              custo.
            </p>
            <a
              href={linkWhatsApp('uma dúvida como trabalhador')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition"
            >
              Tirar dúvida no WhatsApp
            </a>
            <p className="mt-4 text-xs text-slate-500">
              {EMPRESA.telefone} · Segunda a sexta, 8h às 18h
            </p>
          </div>

          <p className="mt-8 text-sm text-slate-500 leading-relaxed">
            Este conteúdo é informativo e não substitui orientação jurídica ou médica para
            o seu caso concreto. Em situação de risco iminente, procure o sindicato da
            categoria ou a Superintendência Regional do Trabalho.
          </p>
        </div>
      </section>
    </>
  );
}
