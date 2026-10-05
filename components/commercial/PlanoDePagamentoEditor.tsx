'use client';

/**
 * Editor do plano de pagamento, usado na proposta e no contrato.
 *
 * As regras (cronograma, soma, o que falta) estao em lib/planoDePagamento.ts:
 * esta tela so edita. Nada nasce preenchido - nem forma, nem valor, nem data -
 * e nao ha placeholder com cara de valor: o usuario ja tomou exemplo cinza
 * por dado gravado. A orientacao fica abaixo do campo.
 */

import React from 'react';
import type { FinancialPaymentMethod, ParteDoPlanoDePagamento, PeriodicidadeDasParcelas, PlanoDePagamento } from '@/types';
import {
  FORMAS_DE_PAGAMENTO,
  PERIODICIDADES,
  ROTULO_DA_FORMA,
  ROTULO_DA_PERIODICIDADE,
  ROTULO_DO_TIPO,
  cronogramaDoPlano,
  deCentavos,
  emCentavos,
  faltasDoPlano,
  novaParte,
  parcelasDaParte
} from '@/lib/planoDePagamento';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Trash2, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface PlanoDePagamentoEditorProps {
  plano: PlanoDePagamento;
  onChange: (plano: PlanoDePagamento) => void;
  /** O total que o plano tem de somar (total da proposta ou valor do contrato). */
  total: number;
  /** Contrato assinado: so leitura. */
  somenteLeitura?: boolean;
}

const CAMPO = 'w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60';
const ROTULO = 'block font-semibold text-slate-300 mb-1 text-[11px]';
const DICA = 'text-[10px] text-slate-500 mt-1 block';

/** Campo numerico: vazio fica vazio (undefined), e nao zero. */
const numeroOuVazio = (v: string): number | undefined => {
  if (v.trim() === '') return undefined;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

export const PlanoDePagamentoEditor: React.FC<PlanoDePagamentoEditorProps> = ({ plano, onChange, total, somenteLeitura }) => {
  const partes = plano?.partes || [];
  const cronograma = cronogramaDoPlano(plano);
  const faltas = partes.length > 0 ? faltasDoPlano(plano, total) : [];
  const somaCentavos = cronograma.reduce((s, p) => s + emCentavos(p.valor), 0);
  const saldoCentavos = emCentavos(total) - somaCentavos;

  const atualizarParte = (id: string, mudanca: Partial<ParteDoPlanoDePagamento>) =>
    onChange({ ...plano, partes: partes.map((p) => (p.id === id ? { ...p, ...mudanca } : p)) });

  const removerParte = (id: string) => onChange({ ...plano, partes: partes.filter((p) => p.id !== id) });

  const incluirParte = (tipo: ParteDoPlanoDePagamento['tipo']) =>
    onChange({ ...plano, partes: [...partes, novaParte(tipo)] });

  /**
   * Saldo para esta parte: o total menos as OUTRAS partes completas. So o
   * usuario aciona - e o caso da "entrada + o restante parcelado".
   */
  const saldoParaParte = (parte: ParteDoPlanoDePagamento): number => {
    const outras = cronogramaDoPlano({ ...plano, partes: partes.filter((p) => p.id !== parte.id) });
    const usado = outras.reduce((s, p) => s + emCentavos(p.valor), 0);
    return deCentavos(emCentavos(total) - usado);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200 text-xs">Condições de pagamento</span>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Total a distribuir: <span className="text-slate-200">{formatCurrency(total)}</span>
          {partes.length > 0 && (
            <>
              {' · '}no plano: <span className="text-slate-200">{formatCurrency(deCentavos(somaCentavos))}</span>
              {saldoCentavos !== 0 && (
                <span className={saldoCentavos > 0 ? 'text-amber-400' : 'text-rose-400'}>
                  {' · '}{saldoCentavos > 0 ? 'faltam' : 'sobram'} {formatCurrency(deCentavos(Math.abs(saldoCentavos)))}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {partes.length === 0 && (
        <p className="text-[11px] text-slate-500">
          Nenhuma forma de pagamento definida. Sem ela, a cláusula 7 do contrato sai com a forma de pagamento em aberto.
          Combine as formas abaixo: por exemplo, uma entrada no Pix e o restante em parcelas fixas no boleto ou no cartão.
        </p>
      )}

      {partes.map((parte, i) => {
        const parcelas = parcelasDaParte(parte);
        const n = Number(parte.quantidade);
        const valorDaParcela = parte.tipo === 'FIXAS' && Number.isInteger(n) && n > 0 && emCentavos(parte.valor) > 0
          ? deCentavos(Math.floor(emCentavos(parte.valor) / n))
          : undefined;
        return (
          <div key={parte.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-indigo-300">
                Forma {i + 1} · {ROTULO_DO_TIPO[parte.tipo]}
              </span>
              {!somenteLeitura && (
                <button
                  type="button"
                  onClick={() => removerParte(parte.id)}
                  className="text-slate-500 hover:text-rose-400 transition"
                  title="Remover esta forma de pagamento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className={ROTULO}>Forma de pagamento</label>
                <select
                  value={parte.forma || ''}
                  disabled={somenteLeitura}
                  onChange={(e) => atualizarParte(parte.id, { forma: (e.target.value || undefined) as FinancialPaymentMethod | undefined })}
                  className={CAMPO}
                >
                  <option value="">Selecione</option>
                  {FORMAS_DE_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>{ROTULO_DA_FORMA[f]}</option>
                  ))}
                </select>
                {parte.forma === 'CARTAO_CREDITO' && (
                  <span className={DICA}>No cartão, as parcelas são iguais e mensais: cada uma vira uma conta a receber no mês em que a operadora repassa.</span>
                )}
              </div>
              <div>
                <label className={ROTULO}>Referência (opcional)</label>
                <input
                  type="text"
                  value={parte.descricao || ''}
                  disabled={somenteLeitura}
                  onChange={(e) => atualizarParte(parte.id, { descricao: e.target.value || undefined })}
                  className={CAMPO}
                />
                <span className={DICA}>Como esta parte aparece no contrato e no cronograma, por exemplo "Entrada".</span>
              </div>
            </div>

            {parte.tipo === 'UNICA' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={ROTULO}>Valor (R$)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={parte.valor ?? ''}
                    disabled={somenteLeitura}
                    onChange={(e) => atualizarParte(parte.id, { valor: numeroOuVazio(e.target.value) })}
                    className={`${CAMPO} font-mono`}
                  />
                  {!somenteLeitura && saldoParaParte(parte) > 0 && (
                    <button type="button" onClick={() => atualizarParte(parte.id, { valor: saldoParaParte(parte) })}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 mt-1">
                      Usar o saldo ({formatCurrency(saldoParaParte(parte))})
                    </button>
                  )}
                </div>
                <div>
                  <label className={ROTULO}>Vencimento</label>
                  <input
                    type="date"
                    value={parte.vencimento || ''}
                    disabled={somenteLeitura}
                    onChange={(e) => atualizarParte(parte.id, { vencimento: e.target.value || undefined })}
                    className={CAMPO}
                  />
                </div>
              </div>
            )}

            {parte.tipo === 'FIXAS' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className={ROTULO}>Nº de parcelas</label>
                  <input
                    type="number" min="1" step="1"
                    value={parte.quantidade ?? ''}
                    disabled={somenteLeitura}
                    onChange={(e) => atualizarParte(parte.id, { quantidade: numeroOuVazio(e.target.value) })}
                    className={`${CAMPO} font-mono`}
                  />
                </div>
                <div>
                  <label className={ROTULO}>Valor de cada parcela (R$)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={valorDaParcela ?? ''}
                    disabled={somenteLeitura || !(Number.isInteger(n) && n > 0)}
                    onChange={(e) => {
                      const v = numeroOuVazio(e.target.value);
                      atualizarParte(parte.id, { valor: v === undefined ? undefined : deCentavos(emCentavos(v) * n) });
                    }}
                    className={`${CAMPO} font-mono`}
                  />
                  <span className={DICA}>Informe o nº de parcelas antes.</span>
                </div>
                <div>
                  <label className={ROTULO}>Valor total desta forma (R$)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={parte.valor ?? ''}
                    disabled={somenteLeitura}
                    onChange={(e) => atualizarParte(parte.id, { valor: numeroOuVazio(e.target.value) })}
                    className={`${CAMPO} font-mono`}
                  />
                  {!somenteLeitura && saldoParaParte(parte) > 0 && (
                    <button type="button" onClick={() => atualizarParte(parte.id, { valor: saldoParaParte(parte) })}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 mt-1">
                      Usar o saldo ({formatCurrency(saldoParaParte(parte))})
                    </button>
                  )}
                </div>
                <div>
                  <label className={ROTULO}>Periodicidade</label>
                  <select
                    value={parte.periodicidade || ''}
                    disabled={somenteLeitura}
                    onChange={(e) => atualizarParte(parte.id, { periodicidade: (e.target.value || undefined) as PeriodicidadeDasParcelas | undefined })}
                    className={CAMPO}
                  >
                    <option value="">Selecione</option>
                    {PERIODICIDADES.map((p) => (
                      <option key={p} value={p}>{ROTULO_DA_PERIODICIDADE[p]}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={ROTULO}>Primeiro vencimento</label>
                  <input
                    type="date"
                    value={parte.vencimento || ''}
                    disabled={somenteLeitura}
                    onChange={(e) => atualizarParte(parte.id, { vencimento: e.target.value || undefined })}
                    className={CAMPO}
                  />
                  <span className={DICA}>As demais vencem no mesmo dia, contado a partir desta data (dia 31 vira o último dia do mês quando ele não existe).</span>
                </div>
                {parcelas && parcelas.length > 1 && parcelas[parcelas.length - 1].centavos !== parcelas[0].centavos && (
                  <div className="col-span-2 sm:col-span-4 text-[10px] text-slate-400">
                    O valor não se divide em centavos iguais: {parcelas.length - 1} de {formatCurrency(deCentavos(parcelas[0].centavos))} e
                    a última de {formatCurrency(deCentavos(parcelas[parcelas.length - 1].centavos))}.
                  </div>
                )}
              </div>
            )}

            {parte.tipo === 'VARIAVEIS' && (
              <div className="space-y-1.5">
                {(parte.parcelas || []).map((p, j) => (
                  <div key={j} className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2">
                    <span className="text-[10px] font-mono text-slate-500 pb-2">{j + 1}.</span>
                    <div>
                      {j === 0 && <label className={ROTULO}>Vencimento</label>}
                      <input
                        type="date"
                        value={p?.vencimento || ''}
                        disabled={somenteLeitura}
                        onChange={(e) => {
                          const lista = [...(parte.parcelas || [])];
                          lista[j] = { ...lista[j], vencimento: e.target.value || undefined };
                          atualizarParte(parte.id, { parcelas: lista });
                        }}
                        className={CAMPO}
                      />
                    </div>
                    <div>
                      {j === 0 && <label className={ROTULO}>Valor (R$)</label>}
                      <input
                        type="number" min="0" step="0.01"
                        value={p?.valor ?? ''}
                        disabled={somenteLeitura}
                        onChange={(e) => {
                          const lista = [...(parte.parcelas || [])];
                          lista[j] = { ...lista[j], valor: numeroOuVazio(e.target.value) };
                          atualizarParte(parte.id, { parcelas: lista });
                        }}
                        className={`${CAMPO} font-mono`}
                      />
                    </div>
                    {!somenteLeitura && (
                      <button
                        type="button"
                        onClick={() => atualizarParte(parte.id, { parcelas: (parte.parcelas || []).filter((_, k) => k !== j) })}
                        className="text-slate-500 hover:text-rose-400 pb-2"
                        title="Remover parcela"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {!somenteLeitura && (
                  <button
                    type="button"
                    onClick={() => atualizarParte(parte.id, { parcelas: [...(parte.parcelas || []), {}] })}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Incluir parcela
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {!somenteLeitura && (
        <div className="flex flex-wrap gap-2">
          {(['UNICA', 'FIXAS', 'VARIAVEIS'] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => incluirParte(tipo)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold border border-slate-700 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> {ROTULO_DO_TIPO[tipo]}
            </button>
          ))}
        </div>
      )}

      <div>
        <label className={ROTULO}>Condição acordada (opcional)</label>
        <textarea
          rows={2}
          value={plano?.observacoes || ''}
          disabled={somenteLeitura}
          onChange={(e) => onChange({ ...plano, observacoes: e.target.value || undefined })}
          className={CAMPO}
        />
        <span className={DICA}>Sai no contrato logo após as formas de pagamento. Use para o que foi combinado e não cabe nas parcelas, como um desconto por pontualidade.</span>
      </div>

      {faltas.length > 0 && (
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
          {faltas.map((f, i) => (
            <p key={i} className="text-[11px] text-amber-300 flex gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {f}
            </p>
          ))}
        </div>
      )}

      {cronograma.length > 0 && (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-3 py-2 bg-slate-900 text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            {faltas.length === 0 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            Cronograma ({cronograma.length} {cronograma.length === 1 ? 'parcela' : 'parcelas'})
          </div>
          <div className="max-h-[220px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <tbody>
                {cronograma.map((p) => (
                  <tr key={p.numero} className="border-t border-slate-800/70">
                    <td className="px-3 py-1.5 font-mono text-slate-500">{p.numero}ª</td>
                    <td className="px-3 py-1.5 font-mono text-slate-200">{formatDate(p.vencimento)}</td>
                    <td className="px-3 py-1.5 font-mono text-emerald-300 text-right">{formatCurrency(p.valor)}</td>
                    <td className="px-3 py-1.5 text-slate-300">{ROTULO_DA_FORMA[p.forma]}</td>
                    <td className="px-3 py-1.5 text-slate-500">{p.rotulo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
