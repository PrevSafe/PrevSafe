'use client';

import React, { useCallback } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { useSessaoInativa } from '@/hooks/useSessaoInativa';
import { INATIVIDADE_MINUTOS, contagemRegressiva } from '@/lib/sessaoInativa';
import { Clock, LogOut, ShieldAlert } from 'lucide-react';

/**
 * Aviso de que a sessao esta por encerrar por inatividade.
 *
 * Fica montado em toda a area autenticada e nao desenha nada enquanto a sessao
 * esta ativa. Quando o prazo entra na janela de aviso, cobre a tela: o usuario
 * que esta na frente do computador ve a contagem e continua; o que nao esta
 * perde a sessao, que e o ponto.
 *
 * Nao ha "fechar" sem escolher. Um X que so esconde o aviso deixaria o usuario
 * sem saber que a sessao caiu no meio de um formulario.
 */
export const AvisoDeInatividade: React.FC = () => {
  const { isAuthenticated, logout } = usePrevSafe();

  const encerrarPorInatividade = useCallback(() => logout('INATIVIDADE'), [logout]);

  const { fase, segundosRestantes, continuar } = useSessaoInativa({
    ativo: isAuthenticated,
    aoEncerrar: encerrarPorInatividade,
  });

  if (!isAuthenticated || fase !== 'AVISO') return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aviso-inatividade-titulo"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
    >
      <div className="w-full max-w-[27rem] rounded-2xl bg-slate-900 border border-amber-500/40 shadow-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 id="aviso-inatividade-titulo" className="text-base font-bold text-white tracking-tight">
              Sua sessão vai ser encerrada
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sem atividade há {INATIVIDADE_MINUTOS} minutos
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2.5 rounded-xl bg-slate-950/60 border border-slate-800 py-3.5">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-2xl font-bold text-amber-300 font-mono tabular-nums">
            {contagemRegressiva(segundosRestantes)}
          </span>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-300">
          O sistema mostra dado pessoal sensível de saúde — CPF, ASO e atestados dos
          trabalhadores. Por isso a sessão não fica aberta sem uso. Clique em continuar para
          seguir de onde parou; nada do que você já salvou é perdido.
        </p>

        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={continuar}
            autoFocus
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
          >
            Continuar conectado
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            Sair agora
          </button>
        </div>
      </div>
    </div>
  );
};
