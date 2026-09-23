'use client';

/**
 * Seletor de agente nocivo da Tabela 24 do eSocial.
 *
 * DUAS COISAS QUE ESTE CAMPO PRECISA DEIXAR CLARAS
 *
 * 1. O codigo era digitado a mao, e os 25 agentes do catalogo tinham TODOS o
 *    codigo errado - o sistema tratava a Tabela 24 como se fosse a
 *    classificacao do PGR (01=fisico, 02=quimico). Ela nao e: 01 e QUIMICOS e
 *    02 e FISICOS. "Ruido" estava como 01.01.001, que e Arsenio.
 *
 * 2. VAZIO E UMA RESPOSTA VALIDA. A Tabela 24 lista os agentes do Anexo IV do
 *    Decreto 3.048/1999 - os de aposentadoria especial. Risco ergonomico, de
 *    acidente, frio e radiacao nao-ionizante entram no PGR pela NR-01 e nao
 *    tem codigo aqui. Um campo que obriga o preenchimento empurra o usuario a
 *    escolher um codigo qualquer.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Check, AlertTriangle, X, Info } from 'lucide-react';
import {
  buscarAgentes,
  consultarAgente,
  formatoDoCodigoTabela24,
  TOTAL_AGENTES_TABELA_24,
  TABELA_24,
  type AgenteTabela24,
} from '@/lib/tabela24';

type AgenteComCodigo = AgenteTabela24 & { codigo: string };

interface SeletorTabela24Props {
  codigo: string;
  onSelecionar: (agente: AgenteComCodigo) => void;
  /** Limpa a seleção — declarar "sem código" é uma escolha legítima. */
  onLimpar?: () => void;
  compacto?: boolean;
}

/** Os agentes que mais aparecem num PGR industrial, como atalho de navegação. */
const FREQUENTES = ['02.01.001', '02.01.014', '02.01.002', '02.01.003', '01.18.001', '01.02.001', '01.08.001', '01.14.001', '01.17.001', '03.01.001', '09.01.001'];

export const SeletorTabela24: React.FC<SeletorTabela24Props> = ({
  codigo,
  onSelecionar,
  onLimpar,
  compacto = false,
}) => {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  const selecionado = consultarAgente(codigo);
  const codigoInvalido = !!codigo && !selecionado;

  const resultados = useMemo<AgenteComCodigo[]>(() => {
    if (termo.trim()) return buscarAgentes(termo);
    return FREQUENTES.filter((c) => TABELA_24[c]).map((c) => ({ codigo: c, ...TABELA_24[c] }));
  }, [termo]);

  useEffect(() => setIndiceAtivo(0), [termo]);

  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', aoClicar);
    return () => document.removeEventListener('mousedown', aoClicar);
  }, [aberto]);

  useEffect(() => {
    if (!aberto || !listaRef.current) return;
    (listaRef.current.children[indiceAtivo] as HTMLElement | undefined)?.scrollIntoView({
      block: 'nearest',
    });
  }, [indiceAtivo, aberto]);

  const escolher = (a: AgenteComCodigo) => {
    onSelecionar(a);
    setTermo('');
    setAberto(false);
  };

  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAberto(true);
      setIndiceAtivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (aberto && resultados[indiceAtivo]) {
        e.preventDefault();
        escolher(resultados[indiceAtivo]);
      }
    } else if (e.key === 'Escape') {
      setAberto(false);
    }
  };

  const altura = compacto ? 'py-1.5 text-[11px]' : 'py-2 text-sm';

  return (
    <div ref={containerRef} className="relative">
      {selecionado && !aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className={`w-full flex items-center gap-2 bg-white border border-slate-300 hover:border-emerald-500 rounded-lg px-2.5 ${altura} text-left transition-colors`}
        >
          <span className="font-mono text-emerald-700 font-semibold shrink-0">{selecionado.codigo}</span>
          <span className="text-slate-800 truncate flex-1">{selecionado.nome}</span>
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
              className="text-slate-400 hover:text-rose-500 shrink-0"
              title="Remover o código — risco do PGR sem enquadramento no Anexo IV"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value);
              setAberto(true);
            }}
            onFocus={() => setAberto(true)}
            onKeyDown={aoTeclar}
            placeholder="Busque o agente por nome ou código — deixe vazio se não houver"
            className={`w-full bg-white border rounded-lg pl-8 pr-2.5 ${altura} text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              codigoInvalido ? 'border-rose-400' : 'border-slate-300'
            }`}
          />
        </div>
      )}

      {codigoInvalido && !aberto && (
        <p className="mt-1 text-[11px] text-rose-600 flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
          <span>
            O código <span className="font-mono">{formatoDoCodigoTabela24(codigo).codigo || codigo}</span>{' '}
            não consta na Tabela 24. Escolha o agente correto, ou deixe vazio se este risco não
            enseja aposentadoria especial.
          </span>
        </p>
      )}

      {!codigo && !aberto && (
        <p className="mt-1 text-[11px] text-slate-500 flex items-start gap-1">
          <Info className="w-3 h-3 shrink-0 mt-px" />
          <span>
            Sem código: o risco entra no PGR, mas não é declarado como agente nocivo no S-2240.
            É o caso de riscos ergonômicos e de acidente.
          </span>
        </p>
      )}

      {aberto && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-2xl overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
            <span>
              {termo.trim() ? `${resultados.length} resultado(s)` : 'Agentes mais comuns — digite para buscar'}
            </span>
            <span className="font-mono">{TOTAL_AGENTES_TABELA_24} agentes</span>
          </div>

          {resultados.length === 0 ? (
            <div className="px-2.5 py-3 text-[11px] text-slate-600 space-y-1.5">
              <p>Nenhum agente encontrado para “{termo}”.</p>
              <p className="text-slate-500">
                A Tabela 24 só lista os agentes do Anexo IV do Decreto 3.048/1999. Riscos
                ergonômicos, de acidente, frio e radiação não-ionizante não constam dela — nesses
                casos o campo fica vazio.
              </p>
            </div>
          ) : (
            <ul ref={listaRef} className="max-h-72 overflow-y-auto">
              {resultados.map((a, i) => (
                <li key={a.codigo}>
                  <button
                    type="button"
                    onMouseEnter={() => setIndiceAtivo(i)}
                    onClick={() => escolher(a)}
                    className={`w-full flex items-start gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                      i === indiceAtivo ? 'bg-emerald-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-mono text-emerald-700 font-semibold shrink-0 w-16">
                      {a.codigo}
                    </span>
                    <span className="flex-1">
                      <span className="text-slate-800 block">{a.nome}</span>
                      <span className="text-slate-400 text-[10px]">{a.subgrupo}</span>
                    </span>
                    {a.codigo === codigo && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
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
