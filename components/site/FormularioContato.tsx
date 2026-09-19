'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight, MessageCircle } from 'lucide-react';
import { linkWhatsApp } from '@/lib/siteConfig';

interface Props {
  /** Aparece no CRM, para saber de qual conteúdo veio o lead. */
  interesse?: string;
  titulo?: string;
  descricao?: string;
  /** Compacto para barras de CTA no meio do conteúdo. */
  compacto?: boolean;
}

const INTERESSES = [
  'Não sei por onde começar',
  'PGR (NR-01)',
  'PCMSO (NR-07)',
  'LTCAT / Aposentadoria especial',
  'Laudos de insalubridade ou periculosidade',
  'Envio ao eSocial (S-2210, S-2220, S-2240)',
  'Treinamentos e CIPA',
  'Gestão completa de SST',
];

export function FormularioContato({
  interesse: interesseInicial,
  titulo = 'Receba um diagnóstico gratuito',
  descricao = 'Conte um pouco da sua operação. Respondemos em até 1 dia útil com o que é obrigatório para o seu CNAE e o que pode esperar.',
  compacto = false,
}: Props) {
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [contexto, setContexto] = useState({ pagina: '', utm_source: '', utm_medium: '', utm_campaign: '' });

  // Origem e campanha ficam gravadas junto do lead: sem isso não dá para saber
  // qual conteúdo converteu.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setContexto({
      pagina: window.location.pathname,
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
    });
  }, []);

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const dados = Object.fromEntries(new FormData(form).entries());

    setEnviando(true);
    setErro(null);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dados, ...contexto }),
      });
      const json = await res.json();
      if (json.ok) {
        setEnviado(true);
        form.reset();
      } else {
        setErro(json.message || 'Não foi possível enviar agora.');
      }
    } catch {
      setErro('Não foi possível enviar agora. Verifique sua conexão ou fale pelo WhatsApp.');
    }
    setEnviando(false);
  };

  if (enviado) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" aria-hidden="true" />
        <h3 className="text-xl font-bold text-slate-900 mt-4">Recebemos seu contato</h3>
        <p className="text-slate-600 mt-2 max-w-[28rem] mx-auto">
          Um especialista vai responder em até 1 dia útil. Se preferir adiantar, chame
          no WhatsApp — costuma ser mais rápido.
        </p>
        <a
          href={linkWhatsApp(interesseInicial)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
        >
          <MessageCircle className="w-4 h-4" aria-hidden="true" />
          Falar agora no WhatsApp
        </a>
      </div>
    );
  }

  const campo =
    'w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition';

  return (
    <div className={compacto ? '' : 'bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm'}>
      {!compacto && (
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-slate-900">{titulo}</h3>
          <p className="text-slate-600 mt-2">{descricao}</p>
        </div>
      )}

      <form onSubmit={enviar} className="space-y-4">
        {/* Campo isca contra robôs: escondido de gente e de leitor de tela. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-slate-700 mb-1.5">
              Seu nome *
            </label>
            <input id="nome" name="nome" type="text" required autoComplete="name" className={campo} />
          </div>
          <div>
            <label htmlFor="empresa" className="block text-sm font-medium text-slate-700 mb-1.5">
              Empresa
            </label>
            <input id="empresa" name="empresa" type="text" autoComplete="organization" className={campo} />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              E-mail *
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className={campo} />
          </div>
          <div>
            <label htmlFor="telefone" className="block text-sm font-medium text-slate-700 mb-1.5">
              Telefone com DDD *
            </label>
            <input
              id="telefone"
              name="telefone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="(00) 00000-0000"
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="funcionarios" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nº de colaboradores
            </label>
            <input id="funcionarios" name="funcionarios" type="number" min={1} className={campo} />
          </div>
          <div>
            <label htmlFor="interesse" className="block text-sm font-medium text-slate-700 mb-1.5">
              O que você precisa
            </label>
            <select id="interesse" name="interesse" defaultValue={interesseInicial || ''} className={campo}>
              <option value="">Selecione</option>
              {INTERESSES.map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="mensagem" className="block text-sm font-medium text-slate-700 mb-1.5">
            Conte sua situação
          </label>
          <textarea
            id="mensagem"
            name="mensagem"
            rows={3}
            placeholder="Ex.: temos 40 colaboradores em marcenaria e nunca fizemos PGR."
            className={campo}
          />
        </div>

        {erro && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{erro}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold shadow-sm transition"
        >
          {enviando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Enviando...
            </>
          ) : (
            <>
              Quero meu diagnóstico
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>

        <p className="text-xs text-slate-500 text-center">
          Seus dados são usados apenas para este atendimento. Sem disparo de spam.
        </p>
      </form>
    </div>
  );
}
