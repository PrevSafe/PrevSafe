'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { buscarProgramas, type ProgramaEncontrado } from '@/lib/programas';

interface Props {
  setActiveView: (view: string) => void;
  className?: string;
}

/**
 * Campo de atalho da barra superior: digite o codigo da tela (010, 400) ou
 * parte do nome e Enter. E o mesmo "Cod. Prog." do Semeio Agro, e usa o
 * catalogo de lib/programas.ts -- os codigos sao os mesmos que o menu
 * lateral mostra ao lado de cada item.
 *
 * A lista vai num portal com position:fixed, e nao num absolute dentro do
 * proprio campo. O motivo e concreto: o globals.css deixa o body com
 * overflow-x:hidden, e pela regra do CSS isso promove o overflow-y de
 * visible para auto -- o body vira um container de recorte. Com a lista em
 * absolute ela media 352x298 e aparecia cortada na primeira linha, o que na
 * tela dava uma caixa branca vazia pendurada embaixo do campo. Em fixed,
 * nenhum ancestral com overflow recorta.
 *
 * A tecla de foco e a barra (/), e nao Ctrl+K: aqui o Ctrl+K ja e da busca
 * rapida, e roubar um atalho que a pessoa ja usa seria pior que nao ter o
 * campo.
 */
export function CodigoTela({ setActiveView, className = '' }: Props) {
  const { currentRole } = usePrevSafe();
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const [caixa, setCaixa] = useState<{ left: number; top: number; width: number } | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const idLista = useId();

  const lista = buscarProgramas(termo, currentRole || '').slice(0, 8);

  const fechar = useCallback(() => setAberto(false), []);

  // Posicao da lista em coordenadas de viewport. Se nao couber embaixo,
  // abre para cima -- o campo fica numa barra fixa no topo, entao embaixo
  // quase sempre cabe, mas em janela baixa (ou com o teclado do celular na
  // tela) nao cabia e a lista saia da area visivel.
  const posicionar = useCallback(() => {
    const el = raiz.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const largura = Math.max(r.width, 380);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - largura - 8);
    setCaixa({ left, top: r.bottom + 8, width: largura });
  }, []);

  useLayoutEffect(() => {
    if (!aberto) return;
    posicionar();
    window.addEventListener('resize', posicionar);
    window.addEventListener('scroll', posicionar, true);
    return () => {
      window.removeEventListener('resize', posicionar);
      window.removeEventListener('scroll', posicionar, true);
    };
  }, [aberto, posicionar]);

  // Clicar fora fecha a lista. A lista esta fora da arvore do campo (portal),
  // entao o teste precisa olhar os dois.
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (raiz.current?.contains(alvo)) return;
      if ((alvo as HTMLElement)?.closest?.(`[data-lista-telas="${idLista}"]`)) return;
      fechar();
    };
    document.addEventListener('mousedown', aoClicar);
    return () => document.removeEventListener('mousedown', aoClicar);
  }, [aberto, fechar, idLista]);

  // "/" leva para o campo de qualquer tela, desde que nao se esteja
  // digitando em outro lugar -- senao a barra entraria no texto.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const alvo = document.activeElement as HTMLElement | null;
      const digitando =
        !!alvo &&
        (/^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName) || alvo.isContentEditable);
      if (digitando) return;
      if (!campo.current?.offsetParent) return;
      e.preventDefault();
      campo.current.focus();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, []);

  function abrir(programa?: ProgramaEncontrado) {
    if (!programa) return;
    setTermo('');
    setAberto(false);
    campo.current?.blur();
    setActiveView(programa.id);
  }

  function teclas(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAberto(true);
      setDestaque((i) => Math.min(i + 1, lista.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDestaque((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      abrir(lista[destaque]);
    }
    if (e.key === 'Escape') {
      setAberto(false);
      campo.current?.blur();
    }
  }

  const mostrar = aberto && caixa;

  return (
    <div className={`relative flex items-center gap-2 h-[38px] px-2.5 rounded-[9px] bg-superficie-2 border border-borda focus-within:border-marca-escura transition ${className}`} ref={raiz}>
      <span className="text-[11px] font-bold text-tinta bg-superficie border border-borda rounded-[5px] px-1.5 py-0.5 whitespace-nowrap">
        Cód.
      </span>
      <input
        ref={campo}
        value={termo}
        placeholder="código ou nome"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={!!mostrar}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-label="Ir para a tela pelo código ou nome"
        className="flex-1 min-w-0 bg-transparent text-[13px] text-tinta placeholder:text-tinta-3 outline-none"
        onChange={(e) => {
          setTermo(e.target.value);
          setDestaque(0);
          setAberto(true);
        }}
        onKeyDown={teclas}
      />
      <kbd className="hidden xl:inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-superficie text-tinta-2 border border-borda">
        /
      </kbd>

      {mostrar &&
        typeof document !== 'undefined' &&
        createPortal(
          <ul
            id={idLista}
            role="listbox"
            data-lista-telas={idLista}
            style={{ left: caixa.left, top: caixa.top, width: caixa.width }}
            className="fixed max-h-[min(20rem,60vh)] overflow-y-auto bg-superficie border border-borda rounded-xl shadow-lg z-[60] p-1.5"
          >
            {lista.length === 0 && (
              <li className="px-3 py-2.5 text-xs text-tinta-2">
                Nenhuma tela com &ldquo;{termo}&rdquo;
              </li>
            )}
            {lista.map((p, i) => {
              const Icone = p.icon;
              const marcado = i === destaque;
              return (
                <li
                  key={p.id}
                  role="option"
                  aria-selected={marcado}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => abrir(p)}
                  onMouseEnter={() => setDestaque(i)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition ${
                    marcado ? 'bg-marca-suave' : ''
                  }`}
                >
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-fundo text-marca-escura border border-borda w-10 text-center shrink-0">
                    {p.code || '—'}
                  </span>
                  <Icone className="w-4 h-4 text-tinta-2 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs text-tinta truncate">{p.label}</span>
                    <span className="block text-[9px] uppercase tracking-wider text-tinta-3 truncate">
                      {p.grupo}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}
