import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  LogIn, KeyRound, FileText, Bell, ShieldCheck, Smartphone,
  HelpCircle, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { EMPRESA, linkWhatsApp } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'Guia de acesso ao sistema PrevSafe',
  description:
    'Como entrar no sistema PrevSafe, recuperar a senha, baixar documentos, acompanhar prazos e dar aceite digital nos laudos.',
};

const PASSOS = [
  {
    icone: LogIn,
    titulo: 'Receba seu convite',
    texto:
      'Depois do contrato assinado, enviamos por e-mail ou WhatsApp o endereço de acesso e o seu login. Cada pessoa da sua equipe pode ter um acesso próprio.',
  },
  {
    icone: KeyRound,
    titulo: 'Defina sua senha',
    texto:
      'No primeiro acesso, use "Esqueci minha senha" com o e-mail cadastrado. Você recebe um link para criar a sua senha — ela é sua e não fica visível para nós.',
  },
  {
    icone: FileText,
    titulo: 'Encontre seus documentos',
    texto:
      'PGR, PCMSO, laudos e certificados ficam na área de documentos, sempre na versão mais recente e prontos para baixar em PDF.',
  },
  {
    icone: Bell,
    titulo: 'Acompanhe os prazos',
    texto:
      'Exames a vencer, documentos que precisam de renovação e pendências aparecem com antecedência, antes de virarem problema.',
  },
];

const RECURSOS = [
  {
    icone: ShieldCheck,
    titulo: 'Aceite digital com validade legal',
    texto:
      'Você assina documentos técnicos pelo próprio sistema, com carimbo de autenticidade conforme a Lei 14.063/2020. Cada documento sai com um QR Code que qualquer fiscal pode conferir.',
  },
  {
    icone: Smartphone,
    titulo: 'Funciona no celular',
    texto:
      'O sistema abre no navegador do celular sem instalar nada. Útil quando a fiscalização chega e o documento precisa aparecer na hora.',
  },
  {
    icone: FileText,
    titulo: 'Histórico completo',
    texto:
      'Versões anteriores dos documentos continuam disponíveis. Você consegue mostrar o que estava valendo em qualquer data passada.',
  },
];

const DUVIDAS = [
  {
    p: 'Esqueci minha senha. E agora?',
    r: 'Na tela de login, clique em "Esqueci minha senha" e informe o e-mail cadastrado. Você recebe um link para criar uma nova. Se o e-mail não chegar em alguns minutos, confira a caixa de spam ou fale com a gente.',
  },
  {
    p: 'Posso dar acesso para outra pessoa da empresa?',
    r: 'Sim. Informe o nome, o e-mail e a função de quem precisa acessar, e criamos o acesso. É melhor cada pessoa ter o seu do que compartilhar uma senha, porque o sistema registra quem fez cada ação.',
  },
  {
    p: 'O documento que baixei tem validade legal?',
    r: 'Sim. Os documentos assinados saem com hash de integridade e QR Code de verificação. Quem receber o documento pode conferir a autenticidade na página de validação, sem precisar de login.',
  },
  {
    p: 'Como sei que um documento é mesmo da PrevSafe?',
    r: 'Todo documento assinado tem um QR Code e um código de verificação. Acesse a página de validação, informe o número do documento e o código, e o sistema confirma quem assinou e quando.',
  },
];

export default function GuiaDoSistemaPage() {
  return (
    <>
      <section className="bg-slate-900 text-white py-14 sm:py-16">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <nav aria-label="Trilha" className="text-sm text-slate-400">
            <Link href="/" className="hover:text-emerald-400">Início</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-200">Guia do sistema</span>
          </nav>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Guia de acesso ao sistema</h1>
          <p className="mt-4 text-lg text-slate-300 max-w-[42rem] leading-relaxed">
            Tudo que você precisa para entrar, encontrar seus documentos e acompanhar os
            prazos da sua empresa.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link
              href="/sistema"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              Entrar no sistema
            </Link>
            <a
              href={linkWhatsApp('acesso ao sistema')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-600 text-slate-100 font-semibold hover:border-emerald-500 hover:text-emerald-300 transition"
            >
              Preciso de ajuda
            </a>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Primeiro acesso</h2>
          <ol className="mt-8 grid sm:grid-cols-2 gap-5">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="bg-white border border-slate-200 rounded-2xl p-6 flex gap-4">
                <span className="shrink-0 w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <p.icone className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">
                    <span className="text-emerald-700">{i + 1}.</span> {p.titulo}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-14 sm:py-16 bg-slate-50">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            O que você consegue fazer
          </h2>
          <div className="mt-8 grid sm:grid-cols-3 gap-5">
            {RECURSOS.map(r => (
              <div key={r.titulo} className="bg-white border border-slate-200 rounded-2xl p-6">
                <span className="inline-flex w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 items-center justify-center">
                  <r.icone className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-bold text-slate-900">{r.titulo}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{r.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-[48rem] px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <HelpCircle className="w-7 h-7 text-emerald-600" aria-hidden="true" />
            Dúvidas frequentes
          </h2>
          <dl className="mt-8 space-y-4">
            {DUVIDAS.map(d => (
              <div key={d.p} className="bg-white border border-slate-200 rounded-2xl p-6">
                <dt className="font-bold text-slate-900 flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                  {d.p}
                </dt>
                <dd className="mt-2 pl-7 text-slate-600 leading-relaxed">{d.r}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 bg-slate-900 rounded-3xl p-8 text-center text-white">
            <h2 className="text-xl font-bold">Não achou sua resposta?</h2>
            <p className="mt-2 text-slate-300">
              Fale com a gente pelo WhatsApp {EMPRESA.telefone} — costuma ser o caminho
              mais rápido.
            </p>
            <a
              href={linkWhatsApp('acesso ao sistema')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition"
            >
              Chamar no WhatsApp
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
