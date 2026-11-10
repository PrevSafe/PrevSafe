'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Search, Loader2, FileCheck2, Clock } from 'lucide-react';

/**
 * Pagina publica de verificacao de autenticidade.
 *
 * Destino do QR Code impresso nos documentos assinados. Quem chega aqui
 * costuma ser um auditor ou fiscal com o papel na mao, sem login no sistema,
 * entao a pagina precisa funcionar sozinha e responder uma pergunta so:
 * este documento e autentico e quem o assinou?
 */

interface Signer {
  name: string;
  role_title: string;
  professional_council_number: string;
  cpf_masked: string;
  signature_status: 'PENDING' | 'SIGNED' | 'REJECTED';
  signed_at: string | null;
}

interface VerifiedDocument {
  number: string;
  title: string;
  type: string;
  client_name: string;
  sha256: string;
  legal_framework: string;
  status: string;
  fully_signed: boolean;
  created_at: string;
  expires_at: string | null;
  signers: Signer[];
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR');
};

export default function ValidarPage() {
  const [doc, setDoc] = useState('');
  const [hash, setHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifiedDocument | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const verify = useCallback(async (docNumber: string, hashCode: string) => {
    if (!docNumber.trim() || !hashCode.trim()) return;
    setLoading(true);
    setMessage(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/validar?doc=${encodeURIComponent(docNumber.trim())}&hash=${encodeURIComponent(hashCode.trim())}`
      );
      const json = await res.json();
      if (json.found) {
        setResult(json.document as VerifiedDocument);
      } else {
        setMessage(json.message || 'Documento não localizado.');
      }
    } catch {
      setMessage('Não foi possível consultar agora. Verifique sua conexão e tente novamente.');
    }
    setLoading(false);
    setSearched(true);
  }, []);

  // O QR Code ja traz numero e codigo na URL: quem escaneia ve o resultado
  // direto, sem digitar nada.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('doc') || '';
    const h = params.get('hash') || '';
    if (d) setDoc(d);
    if (h) setHash(h);
    if (d && h) void verify(d, h);
  }, [verify]);

  return (
    <main className="min-h-screen bg-fundo text-tinta px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-marca-suave border border-marca-escura flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-marca-escura" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Verificação de Autenticidade</h1>
          <p className="text-sm text-tinta-2">
            Confirme se um documento técnico de SST foi realmente emitido e assinado neste sistema.
          </p>
        </header>

        <form
          onSubmit={(e) => { e.preventDefault(); void verify(doc, hash); }}
          className="bg-superficie border border-borda rounded-3xl p-5 space-y-4 shadow-xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="doc" className="block text-xs font-semibold text-tinta-2 mb-1.5">
                Número do documento
              </label>
              <input
                id="doc"
                type="text"
                required
                placeholder="Ex.: PGR-2026-001"
                value={doc}
                onChange={(e) => setDoc(e.target.value)}
                className="w-full px-3 py-2.5 bg-fundo border border-borda rounded-2xl text-sm focus:outline-none focus:border-marca-escura"
              />
            </div>
            <div>
              <label htmlFor="hash" className="block text-xs font-semibold text-tinta-2 mb-1.5">
                Código de verificação
              </label>
              <input
                id="hash"
                type="text"
                required
                placeholder="Impresso junto ao QR Code"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                className="w-full px-3 py-2.5 bg-fundo border border-borda rounded-2xl text-sm font-mono focus:outline-none focus:border-marca-escura"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-marca hover:bg-marca-escura disabled:opacity-50 text-white rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Verificando...</>
              : <><Search className="w-4 h-4" aria-hidden="true" /> Verificar documento</>}
          </button>
        </form>

        {message && searched && (
          <div className="bg-rose-50 border border-rose-800/60 rounded-3xl p-5 flex gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold text-rose-700 text-sm">Documento não confirmado</p>
              <p className="text-xs text-rose-700/90 mt-1">{message}</p>
            </div>
          </div>
        )}

        {result && (
          <section className="bg-superficie border border-borda rounded-3xl overflow-hidden shadow-xl">
            <div className={`px-5 py-4 flex items-center gap-3 ${result.fully_signed ? 'bg-marca-suave border-b border-marca-escura' : 'bg-amber-50 border-b border-amber-800/50'}`}>
              {result.fully_signed
                ? <ShieldCheck className="w-6 h-6 text-marca-escura shrink-0" aria-hidden="true" />
                : <Clock className="w-6 h-6 text-amber-700 shrink-0" aria-hidden="true" />}
              <div>
                <p className={`font-bold text-sm ${result.fully_signed ? 'text-marca-escura' : 'text-amber-700'}`}>
                  {result.fully_signed
                    ? 'Documento autêntico e assinado por todos os signatários'
                    : 'Documento autêntico, com assinaturas pendentes'}
                </p>
                <p className="text-[11px] text-tinta-2 mt-0.5">
                  Emitido em {formatDateTime(result.created_at)}
                </p>
              </div>
            </div>

            <dl className="p-5 space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="text-tinta-2 sm:w-44 shrink-0">Documento</dt>
                <dd className="font-semibold">{result.title}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="text-tinta-2 sm:w-44 shrink-0">Número</dt>
                <dd className="font-mono">{result.number}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="text-tinta-2 sm:w-44 shrink-0">Empresa</dt>
                <dd>{result.client_name}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="text-tinta-2 sm:w-44 shrink-0">Hash SHA-256</dt>
                <dd className="font-mono text-[11px] text-tinta break-all">{result.sha256}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="text-tinta-2 sm:w-44 shrink-0">Enquadramento legal</dt>
                <dd className="text-xs text-tinta">{result.legal_framework}</dd>
              </div>
            </dl>

            <div className="border-t border-borda p-5 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-tinta-2 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4" aria-hidden="true" />
                Signatários
              </h2>
              <ul className="space-y-2.5">
                {result.signers.map((s, i) => (
                  <li key={i} className="bg-fundo border border-borda rounded-2xl p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{s.name}</p>
                        <p className="text-[11px] text-tinta-2">{s.role_title}</p>
                        {s.professional_council_number && (
                          <p className="text-[11px] text-tinta-2 font-mono mt-0.5">{s.professional_council_number}</p>
                        )}
                        {s.cpf_masked && (
                          <p className="text-[11px] text-tinta-2 font-mono">CPF {s.cpf_masked}</p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          s.signature_status === 'SIGNED'
                            ? 'bg-marca-suave text-marca-escura border border-marca-escura'
                            : s.signature_status === 'REJECTED'
                              ? 'bg-rose-500/15 text-rose-800 border border-rose-600/40'
                              : 'bg-superficie-3 text-tinta border border-borda'
                        }`}
                      >
                        {s.signature_status === 'SIGNED' ? 'Assinado' : s.signature_status === 'REJECTED' ? 'Recusado' : 'Pendente'}
                      </span>
                    </div>
                    {s.signed_at && (
                      <p className="text-[11px] text-tinta-2 mt-2">Assinado em {formatDateTime(s.signed_at)}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <p className="text-[11px] text-tinta-2 text-center leading-relaxed">
          Esta página confirma a existência e a integridade do documento emitido.
          Por proteção aos envolvidos, dados pessoais completos não são exibidos aqui.
        </p>
      </div>
    </main>
  );
}
