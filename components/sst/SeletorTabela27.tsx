'use client';

/**
 * Seletor de procedimento da Tabela 27 do eSocial.
 *
 * POR QUE EXISTE
 *
 * O codigo do exame era um campo de texto livre. Quem cadastrava digitava o
 * numero de cabeca, e os protocolos que vinham no sistema tinham os seis
 * codigos errados - "0295" rotulado como Audiometria (0295 e Avaliacao
 * clinica), "0411" como Radiografia OIT (0411 e Clorofenol), e assim por
 * diante. Um codigo errado no S-2220 declara ao governo um procedimento que
 * nao foi feito.
 *
 * Aqui o codigo deixa de ser digitado: e escolhido da tabela oficial, e o nome
 * vem junto. Digitar continua possivel - o usuario busca por nome ou por
 * numero -, mas o que fica gravado e sempre um par codigo+nome que existe.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Check, AlertTriangle, X } from 'lucide-react';
import {
  buscarProcedimentos,
  consultarProcedimento,
  normalizarCodigoTabela27,
  PROCEDIMENTOS_FREQUENTES_PCMSO,
  TABELA_27,
  TOTAL_PROCEDIMENTOS_TABELA_27,
  type ProcedimentoTabela27,
} from '@/lib/tabela27';

interface SeletorTabela27Props {
  /** Codigo atualmente selecionado (4 digitos), ou vazio. */
  codigo: string;
  onSelecionar: (procedimento: ProcedimentoTabela27) => void;
  /** Limpa a selecao. Ausente = nao da para limpar. */
  onLimpar?: () => void;
  /** Texto do campo quando nada foi escolhido. */
  placeholder?: string;
  /** Visual compacto, para uso dentro de uma linha de tabela. */
  compacto?: boolean;
  autoFocus?: boolean;
}

export const SeletorTabela27: React.FC<SeletorTabela27Props> = ({
  codigo,
  onSelecionar,
  onLimpar,
  placeholder = 'Busque por nome ou código do exame...',
  compacto = false,
  autoFocus = false,
}) => {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  const selecionado = consultarProcedimento(codigo);

  // Codigo gravado que NAO existe na tabela: nao some da tela. O usuario
  // precisa ver que aquele cadastro esta errado para poder corrigir.
  const codigoInvalido = !!codigo && !selecionado;

  const resultados = useMemo<ProcedimentoTabela27[]>(() => {
    if (termo.trim()) return buscarProcedimentos(termo);
    // Sem termo, a lista abre com os exames comuns de PCMSO — atalho de
    // navegação, não recomendação clínica.
    return PROCEDIMENTOS_FREQUENTES_PCMSO.filter((c) => TABELA_27[c]).map((c) => ({
      codigo: c,
      nome: TABELA_27[c],
    }));
  }, [termo]);

  useEffect(() => {
    setIndiceAtivo(0);
  }, [termo]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', aoClicar);
    return () => document.removeEventListener('mousedown', aoClicar);
  }, [aberto]);

  // Mantém a opção ativa visível ao navegar pelo teclado.
  useEffect(() => {
    if (!aberto || !listaRef.current) return;
    const item = listaRef.current.children[indiceAtivo] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [indiceAtivo, aberto]);

  const escolher = (p: ProcedimentoTabela27) => {
    onSelecionar(p);
    setTermo('');
    setAberto(false);
  };

  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAberto(true);
      setIndiceAtivo((i) => Math.min(i + 1, resultados.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivo((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      // Não deixa o Enter enviar o formulário enquanto a lista está aberta.
      if (aberto && resultados[indiceAtivo]) {
        e.preventDefault();
        escolher(resultados[indiceAtivo]);
      }
      return;
    }
    if (e.key === 'Escape') {
      setAberto(false);
    }
  };

  const alturaCampo = compacto ? 'py-1.5 text-[11px]' : 'py-2 text-xs';

  return (
    <div ref={containerRef} className="relative">
      {selecionado && !aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className={`w-full flex items-center gap-2 bg-slate-950 border border-slate-700 hover:border-teal-500 rounded-lg px-2.5 ${alturaCampo} text-left transition-colors`}
        >
          <span className="font-mono text-teal-400 shrink-0">{selecionado.codigo}</span>
          <span className="text-slate-200 truncate flex-1">{selecionado.nome}</span>
          {onLimpar && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onLimpar();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onLimpar();
                }
              }}
              className="text-slate-500 hover:text-rose-400 shrink-0"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            autoFocus={autoFocus}
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value);
              setAberto(true);
            }}
            onFocus={() => setAberto(true)}
            onKeyDown={aoTeclar}
            placeholder={placeholder}
            className={`w-full bg-slate-950 border rounded-lg pl-8 pr-2.5 ${alturaCampo} text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 ${
              codigoInvalido ? 'border-rose-500' : 'border-slate-700'
            }`}
          />
        </div>
      )}

      {codigoInvalido && !aberto && (
        <p className="mt-1 text-[10px] text-rose-400 flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
          <span>
            O código <span className="font-mono">{normalizarCodigoTabela27(codigo) || codigo}</span> não
            consta na Tabela 27. Escolha o procedimento correto — o eSocial recusa o evento com código
            inexistente.
          </span>
        </p>
      )}

      {aberto && (
        <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <span>
              {termo.trim()
                ? `${resultados.length} resultado(s)`
                : 'Exames comuns em PCMSO — digite para buscar na tabela'}
            </span>
            <span className="font-mono">{TOTAL_PROCEDIMENTOS_TABELA_27} procedimentos</span>
          </div>

          {resultados.length === 0 ? (
            <p className="px-2.5 py-3 text-[11px] text-slate-400">
              Nenhum procedimento encontrado para “{termo}”. A Tabela 27 é fechada: só é possível
              declarar procedimentos que constam nela.
            </p>
          ) : (
            <ul ref={listaRef} className="max-h-64 overflow-y-auto">
              {resultados.map((p, i) => (
                <li key={p.codigo}>
                  <button
                    type="button"
                    onMouseEnter={() => setIndiceAtivo(i)}
                    onClick={() => escolher(p)}
                    className={`w-full flex items-start gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                      i === indiceAtivo ? 'bg-slate-800' : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="font-mono text-teal-400 shrink-0 w-9">{p.codigo}</span>
                    <span className="text-slate-200 flex-1">{p.nome}</span>
                    {p.codigo === codigo && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
