'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
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
 * A tecla de foco e a barra (/), e nao Ctrl+K: aqui o Ctrl+K ja e da busca
 * rapida, e roubar um atalho que a pessoa ja usa seria pior que nao ter o
 * campo.
 */
export function CodigoTela({ setActiveView, className = '' }: Props) {
  const { currentRole } = usePrevSafe();
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const idLista = useId();

  const lista = buscarProgramas(termo, currentRole || '').slice(0, 8);

  const fechar = useCallback(() => setAberto(false), []);

  // Clicar fora fecha a lista.
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) fechar();
    };
    document.addEventListener('mousedown', aoClicar);
    return () => document.removeEventListener('mousedown', aoClicar);
  }, [aberto, fechar]);

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
      setAberto(true);
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

  return (
    <div className={`relative ${className}`} ref={caixa}>
      <label className="flex items-center gap-2 h-[42px] px-2.5 rounded-xl bg-superficie-2 border border-borda focus-within:border-marca-escura transition">
        <span className="text-[10px] font-bold uppercase tracking-wider text-tinta-2 whitespace-nowrap">
          Cód. Tela
        </span>
        <input
          ref={campo}
          value={termo}
          placeholder="código ou nome"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-label="Ir para a tela pelo código ou nome"
          className="w-28 lg:w-40 bg-transparent text-xs text-tinta placeholder:text-tinta-3 outline-none"
          onFocus={() => setAberto(true)}
          onChange={(e) => {
            setTermo(e.target.value);
            setDestaque(0);
            setAberto(true);
          }}
          onKeyDown={teclas}
        />
        <kbd className="hidden lg:inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-fundo text-tinta-2 border border-borda">
          /
        </kbd>
      </label>

      {aberto && (
        <ul
          id={idLista}
          role="listbox"
          className="absolute left-0 top-full mt-2 w-[22rem] max-h-80 overflow-y-auto bg-superficie border border-borda rounded-xl shadow-lg z-50 p-1.5"
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
                <span className="text-xs text-tinta truncate flex-1">{p.label}</span>
                <span className="text-[9px] uppercase tracking-wider text-tinta-3 truncate max-w-[7rem] shrink-0">
                  {p.grupo}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
