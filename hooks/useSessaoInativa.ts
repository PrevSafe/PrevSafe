'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AVISO_ANTES_SEGUNDOS,
  EVENTOS_DE_ATIVIDADE,
  GRAVACAO_MINIMA_MS,
  faseDaSessao,
  lerUltimaAtividade,
  msAteEncerrar,
  registrarAtividade,
  type FaseDaSessao,
} from '@/lib/sessaoInativa';

/**
 * Conta o tempo sem atividade e avisa antes de encerrar a sessao.
 *
 * A regra de prazo esta em lib/sessaoInativa.ts; aqui so ficam os ouvintes e o
 * relogio. `aoEncerrar` e chamado UMA vez por sessao, mesmo que o relogio
 * bata varias vezes depois do prazo.
 */
export function useSessaoInativa({
  ativo,
  aoEncerrar,
}: {
  ativo: boolean;
  aoEncerrar: () => void;
}) {
  const [fase, setFase] = useState<FaseDaSessao>('ATIVA');
  const [segundosRestantes, setSegundosRestantes] = useState(AVISO_ANTES_SEGUNDOS);
  const jaEncerrou = useRef(false);
  const ultimaGravacao = useRef(0);

  /** Botao "Continuar conectado" do aviso. */
  const continuar = useCallback(() => {
    const agora = Date.now();
    registrarAtividade(agora);
    ultimaGravacao.current = agora;
    setFase('ATIVA');
  }, []);

  useEffect(() => {
    if (!ativo || typeof window === 'undefined') {
      jaEncerrou.current = false;
      setFase('ATIVA');
      return;
    }

    jaEncerrou.current = false;

    // Sem marca (primeiro acesso depois do deploy, ou armazenamento limpo): o
    // prazo comeca a contar agora, em vez de encerrar a sessao no ato.
    if (lerUltimaAtividade() === null) registrarAtividade();

    const marcar = () => {
      const agora = Date.now();
      // Qualquer atividade renova o prazo, inclusive durante o aviso: quem
      // esta digitando esta usando o sistema, e tirar o formulario da frente
      // dele seria perder o que ele escreveu.
      if (agora - ultimaGravacao.current < GRAVACAO_MINIMA_MS) return;
      ultimaGravacao.current = agora;
      registrarAtividade(agora);
    };

    const avaliar = () => {
      const ultima = lerUltimaAtividade();
      if (ultima === null) {
        registrarAtividade();
        setFase('ATIVA');
        return;
      }
      const agora = Date.now();
      const atual = faseDaSessao(ultima, agora);
      setFase(atual);
      // A contagem so muda de estado durante o aviso. Fora dele, `setFase`
      // com o mesmo valor nao redesenha nada, e a sessao inteira passa sem uma
      // renderizacao por segundo.
      if (atual === 'AVISO') {
        setSegundosRestantes(Math.max(0, Math.ceil(msAteEncerrar(ultima, agora) / 1_000)));
      }
      if (atual === 'ENCERRADA' && !jaEncerrou.current) {
        jaEncerrou.current = true;
        aoEncerrar();
      }
    };

    EVENTOS_DE_ATIVIDADE.forEach((evento) =>
      window.addEventListener(evento, marcar, { passive: true })
    );
    // Voltar para a aba nao renova o prazo - mas e o momento de conferir, e o
    // navegador congela temporizadores de aba oculta.
    document.addEventListener('visibilitychange', avaliar);
    const relogio = window.setInterval(avaliar, 1_000);
    avaliar();

    return () => {
      EVENTOS_DE_ATIVIDADE.forEach((evento) => window.removeEventListener(evento, marcar));
      document.removeEventListener('visibilitychange', avaliar);
      window.clearInterval(relogio);
    };
  }, [ativo, aoEncerrar]);

  return { fase, segundosRestantes, continuar };
}
