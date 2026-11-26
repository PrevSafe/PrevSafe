'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Star, X } from 'lucide-react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import type { Client } from '@/types';

type Criterio = 'NOME' | 'CNPJ' | 'CPF' | 'CAEPF' | 'CNO';

const CRITERIOS: { chave: Criterio; rotulo: string }[] = [
  { chave: 'NOME', rotulo: 'Nome/Código' },
  { chave: 'CNPJ', rotulo: 'CNPJ' },
  { chave: 'CPF', rotulo: 'CPF' },
  { chave: 'CAEPF', rotulo: 'CAEPF' },
  { chave: 'CNO', rotulo: 'CNO' },
];

/** Só dígitos, para comparar documento digitado com ou sem pontuação. */
const digitos = (v: string) => (v || '').replace(/\D/g, '');

/**
 * A inscrição que a empresa mostra depende do critério: no CAEPF e no CNO a
 * inscrição relevante não é o CNPJ, é a vinculada. Fora desses dois, vale o
 * documento principal do cadastro.
 */
function inscricaoDe(c: Client, criterio: Criterio) {
  if (criterio === 'CAEPF' && c.caepf) return { numero: c.caepf, tipo: 'CAEPF' };
  if (criterio === 'CNO' && c.cno) return { numero: c.cno, tipo: 'CNO' };
  return { numero: c.document_number, tipo: c.document_type || 'CNPJ' };
}

interface Props {
  onNavigate?: (view: string) => void;
}

/**
 * Janela "Localizar empresas", no mesmo desenho do Semeio Agro: os critérios
 * de busca em cima, a lista no meio e a dica de teclado embaixo.
 *
 * Escolher uma empresa aqui é o que define a empresa em uso em todo o
 * sistema -- é o mesmo activeClientId que a pílula da barra superior mostra
 * e que o Painel e a Engenharia SST usam para filtrar.
 *
 * "Empresa principal" é outra coisa: é a que a equipe assume ao entrar.
 * Antes dela existir, o Painel chamava de principal o primeiro cliente ativo
 * da lista, que mudava sozinho quando entrava um cliente novo.
 */
export function LocalizarEmpresas({ onNavigate }: Props) {
  const {
    clients,
    units,
    organization,
    updateOrganization,
    activeClientId,
    setActiveClientId,
    localizarEmpresasAberto,
    fecharLocalizarEmpresas,
  } = usePrevSafe();

  const [criterio, setCriterio] = useState<Criterio>('NOME');
  const [termo, setTermo] = useState('');
  const [mostrarInativas, setMostrarInativas] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  const principalId = organization?.principal_client_id;

  // Código curto e estável: a posição da empresa na ordem de cadastro. Os ids
  // reais (cli-1789947730115) não servem para ninguém digitar.
  const comCodigo = useMemo(() => {
    const ordenados = [...(clients || [])].sort((a, b) =>
      (a.created_at || '').localeCompare(b.created_at || '')
    );
    return ordenados.map((c, i) => ({ cliente: c, codigo: i + 1 }));
  }, [clients]);

  const encontradas = useMemo(() => {
    const t = termo.trim().toLowerCase();
    const td = digitos(termo);

    return comCodigo.filter(({ cliente, codigo }) => {
      if (!mostrarInativas && cliente.status !== 'ACTIVE') return false;

      if (criterio === 'CAEPF' && !cliente.caepf) return false;
      if (criterio === 'CNO' && !cliente.cno) return false;
      if (criterio === 'CNPJ' && (cliente.document_type || 'CNPJ') !== 'CNPJ') return false;
      if (criterio === 'CPF' && cliente.document_type !== 'CPF') return false;

      if (!t) return true;

      if (criterio === 'NOME') {
        return (
          String(codigo) === t ||
          (cliente.trade_name || '').toLowerCase().includes(t) ||
          (cliente.legal_name || '').toLowerCase().includes(t)
        );
      }
      if (!td) return true;
      return digitos(inscricaoDe(cliente, criterio).numero).includes(td);
    });
  }, [comCodigo, criterio, termo, mostrarInativas]);

  // Ao abrir: foco no campo e destaque na empresa em uso, para Enter direto
  // não trocar a empresa sem querer.
  useEffect(() => {
    if (!localizarEmpresasAberto) return;
    setTermo('');
    setCriterio('NOME');
    const i = encontradas.findIndex((e) => e.cliente.id === activeClientId);
    setDestaque(i >= 0 ? i : 0);
    const t = setTimeout(() => campo.current?.focus(), 30);
    return () => clearTimeout(t);
    // Só ao abrir: refazer isso a cada tecla apagaria o que a pessoa digitou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localizarEmpresasAberto]);

  useEffect(() => {
    if (destaque >= encontradas.length) setDestaque(Math.max(0, encontradas.length - 1));
  }, [encontradas.length, destaque]);

  // Mantém a linha destacada dentro da área visível ao andar com as setas.
  useEffect(() => {
    const el = listaRef.current?.querySelector<HTMLElement>('[data-destacada="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [destaque]);

  if (!localizarEmpresasAberto) return null;

  function escolher(c?: Client) {
    if (!c) return;
    setActiveClientId(c.id);
    fecharLocalizarEmpresas();
  }

  function definirPrincipal() {
    const alvo = encontradas[destaque]?.cliente;
    if (!alvo) return;
    updateOrganization({ principal_client_id: alvo.id });
    setActiveClientId(alvo.id);
  }

  function teclas(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDestaque((i) => Math.min(i + 1, encontradas.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDestaque((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      escolher(encontradas[destaque]?.cliente);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      fecharLocalizarEmpresas();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-localizar-empresas"
      onKeyDown={teclas}
    >
      <div
        className="fixed inset-0 bg-tinta/40 backdrop-blur-sm"
        onClick={fecharLocalizarEmpresas}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-3xl mt-[6vh] bg-superficie border border-borda rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-borda">
          <h2 id="titulo-localizar-empresas" className="font-titulo text-[17px] font-bold text-tinta">
            Localizar empresas
          </h2>
          <button
            onClick={fecharLocalizarEmpresas}
            className="p-1.5 rounded-lg text-tinta-2 hover:text-tinta hover:bg-superficie-2 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-5 py-3.5 border-b border-borda space-y-3">
          <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <legend className="sr-only">Buscar por</legend>
            {CRITERIOS.map((c) => (
              <label key={c.chave} className="flex items-center gap-1.5 text-[13px] text-tinta cursor-pointer">
                <input
                  type="radio"
                  name="criterio-localizar-empresa"
                  checked={criterio === c.chave}
                  onChange={() => { setCriterio(c.chave); setDestaque(0); }}
                  className="accent-marca-escura w-3.5 h-3.5"
                />
                {c.rotulo}
              </label>
            ))}
          </fieldset>

          <div className="flex flex-wrap items-center gap-2.5">
            <label htmlFor="busca-empresa" className="text-[13px] font-semibold text-tinta shrink-0">
              Empresa:
            </label>
            <div className="relative flex-1 min-w-[12rem]">
              <input
                id="busca-empresa"
                ref={campo}
                value={termo}
                onChange={(e) => { setTermo(e.target.value); setDestaque(0); }}
                placeholder={criterio === 'NOME' ? 'Nome, razão social ou código' : `Número do ${criterio}`}
                autoComplete="off"
                className="w-full h-[38px] pl-3 pr-9 rounded-[9px] border border-borda bg-superficie text-[13px] text-tinta placeholder:text-tinta-3 focus:outline-none focus:border-marca-escura transition"
              />
              <Search className="w-4 h-4 text-tinta-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button
              type="button"
              onClick={definirPrincipal}
              disabled={!encontradas[destaque]}
              title="Marca a empresa destacada como a que o sistema assume ao entrar"
              className="h-[38px] inline-flex items-center gap-1.5 px-3.5 rounded-[9px] border border-amber-200 bg-amber-50 text-[13px] font-semibold text-amber-800 hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Star className="w-4 h-4" />
              Empresa principal
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[13px] text-tinta-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarInativas}
                onChange={(e) => setMostrarInativas(e.target.checked)}
                className="accent-marca-escura w-3.5 h-3.5"
              />
              Mostrar inativas
            </label>
            <span className="text-[13px] text-tinta-2 tabular-nums">
              {encontradas.length} {encontradas.length === 1 ? 'empresa' : 'empresas'}
            </span>
          </div>
        </div>

        <div ref={listaRef} className="max-h-[46vh] overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-superficie-2">
                {['CÓD.', 'EMPRESA', 'INSCRIÇÃO', 'UNID.'].map((h) => (
                  <th
                    key={h}
                    className={`text-left text-[10px] font-bold tracking-[0.08em] text-tinta-3 px-4 py-2.5 border-y border-borda ${
                      h === 'UNID.' ? 'text-right' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {encontradas.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-tinta-2">
                    Nenhuma empresa encontrada
                    {termo.trim() && <> para &ldquo;{termo.trim()}&rdquo;</>}
                    {!mostrarInativas && <> entre as ativas.</>}
                  </td>
                </tr>
              )}

              {encontradas.map(({ cliente, codigo }, i) => {
                const destacada = i === destaque;
                const emUso = cliente.id === activeClientId;
                const ehPrincipal = cliente.id === principalId;
                const inscricao = inscricaoDe(cliente, criterio);
                const unidades = (units || []).filter((u) => u.client_id === cliente.id).length;

                return (
                  <tr
                    key={cliente.id}
                    data-destacada={destacada}
                    onMouseEnter={() => setDestaque(i)}
                    onClick={() => escolher(cliente)}
                    className={`cursor-pointer border-b border-borda last:border-b-0 transition ${
                      destacada ? 'bg-marca-suave' : 'hover:bg-superficie-2'
                    }`}
                  >
                    <td className="px-4 py-2.5 align-top tabular-nums text-tinta-2">{codigo}</td>
                    <td className="px-4 py-2.5 align-top">
                      <div className="font-semibold text-tinta">{cliente.trade_name || cliente.legal_name}</div>
                      {cliente.legal_name && cliente.legal_name !== cliente.trade_name && (
                        <div className="text-tinta-2 text-xs mt-0.5">{cliente.legal_name}</div>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {ehPrincipal && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-amber-50 text-amber-800">
                            <Star className="w-3 h-3" /> Principal
                          </span>
                        )}
                        {emUso && (
                          <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-marca-suave text-marca-escura">
                            Em uso
                          </span>
                        )}
                        {cliente.status !== 'ACTIVE' && (
                          <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-superficie-2 text-tinta-2 border border-borda">
                            {cliente.status === 'PROSPECT' ? 'Prospect' : 'Inativa'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <div className="tabular-nums text-tinta">{inscricao.numero || '—'}</div>
                      <div className="text-tinta-3 text-[11px] mt-0.5">
                        {inscricao.tipo}
                        {cliente.city && <> · {cliente.city}/{cliente.state}</>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 align-top text-right tabular-nums text-tinta-2">{unidades}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-2.5 border-t border-borda text-[11.5px] text-tinta-2">
          <span>↑ ↓ para escolher · Enter para abrir · Esc para fechar</span>
          {onNavigate && (
            <button
              onClick={() => { fecharLocalizarEmpresas(); onNavigate('crm-clients'); }}
              className="font-semibold text-teal-700 underline"
            >
              Abrir cadastro de clientes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
