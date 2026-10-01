'use client';

/**
 * Fatores de risco psicossociais de uma situacao de trabalho avaliada na AEP.
 *
 * O subitem 1.5.3.2.1 da NR-01 manda considerar esses fatores "nos termos da
 * NR-17": eles sao avaliados aqui, dentro da AEP, e o fator presente vai ao
 * inventario do PGR (item 17.3.5) com severidade e probabilidade escolhidas por
 * quem avalia, pelos criterios das secoes 5.4 e 5.5 do PGR.
 *
 * O que esta tela nao faz: nao pontua, nao aplica questionario e nao guarda
 * nada sobre pessoa. As regras estao em lib/psicossocial.ts; aqui so a tela.
 */

import React, { useMemo, useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import type {
  AvaliacaoPsicossocial,
  ConclusaoDoFator,
  ErgonomicAssessment,
  EstrategiaPsicossocial,
  FonteDaConstatacao
} from '@/types';
import {
  CONCLUSAO_DO_FATOR_POR_EXTENSO,
  ESTRATEGIAS_PSICOSSOCIAIS,
  FONTES_DA_CONSTATACAO,
  FONTE_DA_LISTAGEM,
  O_QUE_A_AVALIACAO_NAO_E,
  REQUISITO_17_4_4,
  REQUISITO_17_4_7,
  VIGENCIA_DO_CAPITULO_1_5,
  fatoresDaAvaliacao,
  faltasPsicossociais,
  faltasDeInventarioPsicossocial,
  riscosDaOrigem
} from '@/lib/psicossocial';
import { PGR_SEVERIDADE, PGR_PROBABILIDADE_ERGONOMICO } from '@/lib/pgrModelo';
import { classificarRisco } from '@/lib/classificacaoDeRisco';
import { SITUACOES_OPERACIONAIS, SituacaoOperacional } from '@/lib/situacaoOperacional';
import { formatDate } from '@/lib/utils';
import { novoId } from '@/lib/datas';
import { Brain, X, Plus, AlertTriangle, CheckCircle2, Users, ArrowRightToLine, Info } from 'lucide-react';

interface AepPsychosocialModalProps {
  aep: ErgonomicAssessment;
  onClose: () => void;
}

const copia = (p?: AvaliacaoPsicossocial): AvaliacaoPsicossocial =>
  p ? JSON.parse(JSON.stringify(p)) : {};

/** Tira espacos e campos vazios antes de gravar. */
function limpo(p: AvaliacaoPsicossocial): AvaliacaoPsicossocial {
  const t = (v?: string) => (String(v || '').trim() || undefined);
  const fatores: AvaliacaoPsicossocial['fatores'] = {};
  Object.entries(p.fatores || {}).forEach(([k, v]) => {
    if (!v?.conclusao) return;
    fatores[k] = {
      conclusao: v.conclusao,
      caracterizacao: v.conclusao === 'PRESENTE' ? t(v.caracterizacao) : undefined,
      fontes: v.conclusao === 'PRESENTE' && (v.fontes || []).length > 0 ? v.fontes : undefined
    };
  });
  const estrategias = p.estrategias || [];
  const comQuestionario = estrategias.includes('QUESTIONARIO');
  return {
    estrategias: estrategias.length > 0 ? estrategias : undefined,
    instrumento: comQuestionario ? t(p.instrumento) : undefined,
    instrumento_fundamentacao: comQuestionario ? t(p.instrumento_fundamentacao) : undefined,
    anonimato_garantido: comQuestionario ? p.anonimato_garantido === true : undefined,
    indicadores_consultados: t(p.indicadores_consultados),
    fatores: Object.keys(fatores).length > 0 ? fatores : undefined,
    adicionais: (p.adicionais || []).length > 0
      ? (p.adicionais || []).map((x) => ({
        ...x,
        perigo: String(x.perigo || '').trim(),
        consequencias: t(x.consequencias),
        caracterizacao: x.conclusao === 'PRESENTE' ? t(x.caracterizacao) : undefined,
        fontes: x.conclusao === 'PRESENTE' && (x.fontes || []).length > 0 ? x.fontes : undefined
      }))
      : undefined,
    avaliacao_de_desempenho: p.avaliacao_de_desempenho?.conclusao
      ? { conclusao: p.avaliacao_de_desempenho.conclusao, observacao: t(p.avaliacao_de_desempenho.observacao) }
      : undefined,
    orientacao_das_chefias: p.orientacao_das_chefias?.conclusao
      ? { conclusao: p.orientacao_das_chefias.conclusao, observacao: t(p.orientacao_das_chefias.observacao) }
      : undefined
  };
}

const PEDIDO_VAZIO = {
  gheId: '',
  severidade: '',
  probabilidade: '',
  situacoes: [] as SituacaoOperacional[],
  medidaImplementada: false,
  eficaciaVerificada: false,
  descricaoDaMedida: ''
};

export const AepPsychosocialModal: React.FC<AepPsychosocialModalProps> = ({ aep, onClose }) => {
  const {
    ergonomicAssessments,
    environmentalRisks,
    ghes,
    updateErgonomicAssessment,
    levarFatorAoInventario
  } = usePrevSafe();

  // Sempre a versao mais nova: o inventario e a AEP mudam enquanto a tela esta aberta.
  const atual = ergonomicAssessments.find((a) => a.id === aep.id) || aep;

  const [form, setForm] = useState<AvaliacaoPsicossocial>(() => copia(atual.psychosocial));
  const [aviso, setAviso] = useState('');
  const [levando, setLevando] = useState<string | null>(null);
  const [pedido, setPedido] = useState({ ...PEDIDO_VAZIO });
  const [novoPerigo, setNovoPerigo] = useState('');
  const [novasConsequencias, setNovasConsequencias] = useState('');

  const comForm = useMemo(() => ({ ...atual, psychosocial: limpo(form) }), [atual, form]);
  const fatores = fatoresDaAvaliacao(comForm);
  const nomeDoGhe = (id: string) => {
    const g: any = ghes.find((x: any) => x.id === id);
    return g?.code || g?.name || 'GHE não encontrado';
  };
  const faltas = [
    ...faltasPsicossociais(comForm),
    ...faltasDeInventarioPsicossocial(comForm, environmentalRisks, nomeDoGhe)
  ];
  const ghesDaSituacao: string[] = atual.ghe_ids || [];

  // ------------------------------------------------------------ edicao
  const definirFator = (chave: string, adicional: boolean, patch: Record<string, any>) => {
    setForm((f) => {
      if (adicional) {
        return {
          ...f,
          adicionais: (f.adicionais || []).map((x) => (x.id === chave ? { ...x, ...patch } : x))
        };
      }
      return { ...f, fatores: { ...(f.fatores || {}), [chave]: { ...(f.fatores?.[chave] || {}), ...patch } } };
    });
  };

  const alternarFonte = (chave: string, adicional: boolean, atuais: FonteDaConstatacao[] | undefined, fonte: FonteDaConstatacao) => {
    const lista = atuais || [];
    definirFator(chave, adicional, {
      fontes: lista.includes(fonte) ? lista.filter((x) => x !== fonte) : [...lista, fonte]
    });
  };

  const alternarEstrategia = (e: EstrategiaPsicossocial) => {
    setForm((f) => {
      const lista = f.estrategias || [];
      return { ...f, estrategias: lista.includes(e) ? lista.filter((x) => x !== e) : [...lista, e] };
    });
  };

  const adicionarFator = () => {
    if (!novoPerigo.trim()) {
      setAviso('Descreva o perigo do fator adicional.');
      return;
    }
    setForm((f) => ({
      ...f,
      adicionais: [
        ...(f.adicionais || []),
        { id: novoId('psico'), perigo: novoPerigo.trim(), consequencias: novasConsequencias.trim() || undefined }
      ]
    }));
    setNovoPerigo('');
    setNovasConsequencias('');
  };

  const removerAdicional = (id: string) => {
    if (riscosDaOrigem(environmentalRisks, atual.id, id).length > 0) {
      setAviso('Este fator já está no inventário. Reavalie o risco na aba de inventário antes de retirá-lo daqui.');
      return;
    }
    setForm((f) => ({ ...f, adicionais: (f.adicionais || []).filter((x) => x.id !== id) }));
  };

  const salvar = (fechar: boolean) => {
    updateErgonomicAssessment(atual.id, { psychosocial: limpo(form) });
    if (fechar) onClose();
    else setAviso('Avaliação psicossocial salva.');
  };

  // ------------------------------------------------------------ inventario
  const abrirInventario = (chave: string) => {
    const livres = ghesDaSituacao.filter(
      (g) => !riscosDaOrigem(environmentalRisks, atual.id, chave).some((r) => r.ghe_id === g)
    );
    setLevando(chave);
    setPedido({ ...PEDIDO_VAZIO, gheId: livres[0] || '' });
  };

  const levar = () => {
    if (!levando) return;
    // Grava a avaliacao antes: o risco nasce do que esta na AEP, e nao do que
    // esta so na tela.
    const psychosocial = limpo(form);
    updateErgonomicAssessment(atual.id, { psychosocial });
    const r = levarFatorAoInventario({
      aep: { ...atual, psychosocial },
      chave: levando,
      gheId: pedido.gheId,
      severidade: Number(pedido.severidade),
      probabilidade: Number(pedido.probabilidade),
      situacoes: pedido.situacoes,
      medidaImplementada: pedido.medidaImplementada,
      eficaciaVerificada: pedido.eficaciaVerificada,
      descricaoDaMedida: pedido.descricaoDaMedida
    });
    setAviso(r.message);
    if (r.ok) {
      setLevando(null);
      setPedido({ ...PEDIDO_VAZIO });
    }
  };

  const classificacaoDoPedido = classificarRisco(Number(pedido.severidade), Number(pedido.probabilidade));

  // ------------------------------------------------------------ tela
  const estrategias = form.estrategias || [];
  const desempenho = form.avaliacao_de_desempenho || {};
  const chefias = form.orientacao_das_chefias || {};

  const botao = (ativo: boolean, cor: 'teal' | 'rose' | 'slate') =>
    `px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
      ativo
        ? cor === 'rose'
          ? 'bg-rose-500 text-white border-rose-400'
          : cor === 'teal'
            ? 'bg-teal-500 text-slate-950 border-teal-400'
            : 'bg-slate-600 text-white border-slate-500'
        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
    }`;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-[64rem] w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto text-xs">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Brain className="w-5 h-5 text-teal-400" />
              Fatores psicossociais — {atual.situation_name}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[52rem]">
              Desde {VIGENCIA_DO_CAPITULO_1_5}, o subitem 1.5.3.2.1 da NR-01 manda considerar estes fatores nos
              termos da NR-17 — aqui, na AEP. O fator presente vai ao inventário do PGR (item 17.3.5).
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <ul className="text-[11px] text-slate-400 space-y-1">
            {O_QUE_A_AVALIACAO_NAO_E.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>

        {aviso && (
          <div className="bg-slate-950 border border-teal-500/30 rounded-lg p-3 text-slate-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <span className="flex-1">{aviso}</span>
            <button type="button" onClick={() => setAviso('')} className="text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------- conducao */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
          <div>
            <p className="text-slate-200 font-bold">Como a avaliação foi conduzida</p>
            <p className="text-[10px] text-slate-500">
              O MTE não indica método. Escolha um caminho ou combine (Guia do MTE, cap. 3). A equipe de
              especialistas conduz, mas precisa de um dos outros caminhos para chegar aos resultados.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ESTRATEGIAS_PSICOSSOCIAIS.map((e) => (
              <button key={e.valor} type="button" onClick={() => alternarEstrategia(e.valor)}
                className={botao(estrategias.includes(e.valor), 'teal')}>
                {e.rotulo}
              </button>
            ))}
          </div>

          {estrategias.includes('QUESTIONARIO') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input type="text" placeholder="Nome do questionário ou ferramenta"
                value={form.instrumento || ''}
                onChange={(e) => setForm({ ...form, instrumento: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
              <input type="text" placeholder="Estudo científico ou instituição de SST que o fundamenta"
                value={form.instrumento_fundamentacao || ''}
                onChange={(e) => setForm({ ...form, instrumento_fundamentacao: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
              <label className="md:col-span-2 flex items-start gap-2 text-slate-300">
                <input type="checkbox" checked={form.anonimato_garantido === true}
                  onChange={(e) => setForm({ ...form, anonimato_garantido: e.target.checked })}
                  className="mt-0.5" />
                <span>
                  O questionário foi aplicado com anonimato garantido. <span className="text-slate-500">Sem
                  confiança e anonimato, o diagnóstico é falho (Manual do GRO, item 17.1.1).</span>
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold">Informações de saúde consultadas</label>
            <p className="text-[10px] text-slate-500">
              Afastamentos, CAT, indicadores do PCMSO — sempre somados por setor ou GHE. Nunca nome nem CID de
              pessoa: são dados sensíveis (LGPD, art. 5º, II).
            </p>
            <input type="text" placeholder="Ex.: afastamentos do setor nos últimos 12 meses, por grupo de CID"
              value={form.indicadores_consultados || ''}
              onChange={(e) => setForm({ ...form, indicadores_consultados: e.target.value })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
          </div>

          <div className="flex items-start gap-2 text-[11px]">
            <Users className="w-3.5 h-3.5 text-teal-400 mt-0.5 shrink-0" />
            {atual.workers_heard === 'SIM' ? (
              <span className="text-slate-300">
                Empregados ouvidos
                {atual.workers_heard_date ? ` em ${formatDate(atual.workers_heard_date)}` : ''}
                {atual.workers_heard_count ? ` · ${atual.workers_heard_count} ouvido(s)` : ''}
                {atual.workers_heard_note ? ` · ${atual.workers_heard_note}` : ''}.{' '}
                <span className="text-slate-500">Data, número e forma se registram em &quot;Editar avaliação&quot;.</span>
              </span>
            ) : (
              <span className="text-amber-300">
                A oitiva dos empregados não está registrada como feita. &quot;Não há identificação de perigos e
                avaliação de riscos válida [...] sem a voz do trabalhador&quot; (Manual do GRO, item 17.2).
                Registre em &quot;Editar avaliação&quot;.
              </span>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------- fatores */}
        <div className="space-y-2">
          <div>
            <p className="text-slate-200 font-bold">Fatores</p>
            <p className="text-[10px] text-slate-500">{FONTE_DA_LISTAGEM} A lista não esgota o tema: acrescente o que encontrar.</p>
          </div>

          {fatores.map((f) => {
            const c = f.avaliacao?.conclusao;
            const ligados = riscosDaOrigem(environmentalRisks, atual.id, f.chave);
            const livres = ghesDaSituacao.filter((g) => !ligados.some((r) => r.ghe_id === g));
            return (
              <div key={f.chave} className={`p-3 rounded-xl border ${c === 'PRESENTE' ? 'border-rose-500/30 bg-rose-500/5' : 'border-slate-800 bg-slate-950'}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-[14rem] flex-1">
                    <p className="font-semibold text-slate-100">
                      {f.perigo || 'Fator sem descrição'}
                      {f.adicional && <span className="ml-1.5 text-[10px] text-slate-500 font-normal">adicional</span>}
                    </p>
                    {f.consequencias && <p className="text-[10px] text-slate-500">Possível consequência: {f.consequencias}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['PRESENTE', 'NAO_IDENTIFICADO'] as ConclusaoDoFator[]).map((v) => (
                      <button key={v} type="button"
                        onClick={() => definirFator(f.chave, f.adicional, { conclusao: c === v ? undefined : v })}
                        className={botao(c === v, v === 'PRESENTE' ? 'rose' : 'slate')}>
                        {CONCLUSAO_DO_FATOR_POR_EXTENSO[v]}
                      </button>
                    ))}
                    {f.adicional && (
                      <button type="button" onClick={() => removerAdicional(f.chave)}
                        className="px-2 py-1 text-[11px] text-slate-500 hover:text-rose-300">
                        Retirar
                      </button>
                    )}
                  </div>
                </div>

                {c === 'PRESENTE' && (
                  <div className="mt-2 space-y-2">
                    <textarea rows={2}
                      placeholder="Caracterização: como o trabalho REAL acontece, por quanto tempo, com que frequência e intensidade"
                      value={f.avaliacao?.caracterizacao || ''}
                      onChange={(e) => definirFator(f.chave, f.adicional, { caracterizacao: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-slate-500 mr-1">De onde veio:</span>
                      {FONTES_DA_CONSTATACAO.map((fo) => (
                        <button key={fo.valor} type="button"
                          onClick={() => alternarFonte(f.chave, f.adicional, f.avaliacao?.fontes, fo.valor)}
                          className={botao((f.avaliacao?.fontes || []).includes(fo.valor), 'teal')}>
                          {fo.rotulo}
                        </button>
                      ))}
                    </div>

                    {/* inventario */}
                    <div className="pt-1 border-t border-slate-800/60">
                      {ghesDaSituacao.length === 0 ? (
                        <p className="text-amber-300 text-[11px]">
                          A situação não tem GHE: vincule um em &quot;Editar avaliação&quot; para levar o fator ao inventário.
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {ghesDaSituacao.map((g) => {
                            const r = ligados.find((x) => x.ghe_id === g);
                            const cl = r ? classificarRisco(r.severity, r.probability) : null;
                            return (
                              <p key={g} className="text-[11px]">
                                <span className="font-mono text-slate-400">{nomeDoGhe(g)}</span>{' — '}
                                {r
                                  ? <span className="text-emerald-300">no inventário: {cl ? `${cl.rotulo} (S${cl.severidade} × P${cl.probabilidade})` : 'sem classificação'}</span>
                                  : <span className="text-amber-300">fora do inventário (item 17.3.5)</span>}
                              </p>
                            );
                          })}
                          {livres.length > 0 && levando !== f.chave && (
                            <button type="button" onClick={() => abrirInventario(f.chave)}
                              className="mt-1 px-2.5 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-[11px] flex items-center gap-1">
                              <ArrowRightToLine className="w-3.5 h-3.5" />
                              Levar ao inventário
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {levando === f.chave && (
                      <div className="p-3 rounded-lg bg-slate-950 border border-teal-500/30 space-y-2">
                        <p className="text-[10px] text-slate-500">
                          Severidade e probabilidade são escolha de quem avalia, pelos critérios das seções 5.4 e 5.5
                          do PGR. Para fatores psicossociais, a probabilidade considera as exigências da atividade e a
                          eficácia das medidas (subitem 1.5.4.4.5.3 da NR-01). O sistema não sugere número.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <select value={pedido.gheId} onChange={(e) => setPedido({ ...pedido, gheId: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-slate-100">
                            <option value="">GHE…</option>
                            {livres.map((g) => <option key={g} value={g}>{nomeDoGhe(g)}</option>)}
                          </select>
                          <select value={pedido.severidade} onChange={(e) => setPedido({ ...pedido, severidade: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-slate-100">
                            <option value="">Severidade…</option>
                            {PGR_SEVERIDADE.map((l) => (
                              <option key={l[0]} value={l[0]}>S{l[0]} {l[1]} — {l[4]}</option>
                            ))}
                          </select>
                          <select value={pedido.probabilidade} onChange={(e) => setPedido({ ...pedido, probabilidade: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-slate-100">
                            <option value="">Probabilidade…</option>
                            {PGR_PROBABILIDADE_ERGONOMICO.map((l) => (
                              <option key={l[0]} value={l[0]}>P{l[0]} {l[1]} · {l[2]} · {l[3]}</option>
                            ))}
                          </select>
                        </div>
                        {classificacaoDoPedido && (
                          <p className="text-[11px] text-slate-300">
                            Nível: <strong>{classificacaoDoPedido.rotulo}</strong> ({classificacaoDoPedido.score}) — {classificacaoDoPedido.prazo}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] text-slate-500 mr-1">Situação operacional:</span>
                          {SITUACOES_OPERACIONAIS.map((so) => (
                            <button key={so.valor} type="button"
                              onClick={() => setPedido({
                                ...pedido,
                                situacoes: pedido.situacoes.includes(so.valor)
                                  ? pedido.situacoes.filter((x) => x !== so.valor)
                                  : [...pedido.situacoes, so.valor]
                              })}
                              className={botao(pedido.situacoes.includes(so.valor), 'teal')}>
                              {so.rotulo}
                            </button>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 text-slate-300">
                          <input type="checkbox" checked={pedido.medidaImplementada}
                            onChange={(e) => setPedido({
                              ...pedido,
                              medidaImplementada: e.target.checked,
                              eficaciaVerificada: e.target.checked ? pedido.eficaciaVerificada : false
                            })} />
                          Já existe medida de prevenção implementada para este fator
                        </label>
                        {pedido.medidaImplementada && (
                          <>
                            <input type="text" placeholder="Qual medida, na organização do trabalho"
                              value={pedido.descricaoDaMedida}
                              onChange={(e) => setPedido({ ...pedido, descricaoDaMedida: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
                            <label className="flex items-center gap-2 text-slate-300">
                              <input type="checkbox" checked={pedido.eficaciaVerificada}
                                onChange={(e) => setPedido({ ...pedido, eficaciaVerificada: e.target.checked })} />
                              A eficácia foi verificada, com evidência
                            </label>
                          </>
                        )}
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={() => setLevando(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
                            Cancelar
                          </button>
                          <button type="button" onClick={levar}
                            className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold">
                            Levar ao inventário
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="p-3 rounded-xl border border-dashed border-slate-700 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
            <input type="text" placeholder="Outro fator encontrado (perigo)" value={novoPerigo}
              onChange={(e) => setNovoPerigo(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
            <input type="text" placeholder="Possível consequência" value={novasConsequencias}
              onChange={(e) => setNovasConsequencias(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
            <button type="button" onClick={adicionarFator}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1 justify-center">
              <Plus className="w-3.5 h-3.5" /> Acrescentar
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------- requisitos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { req: REQUISITO_17_4_4, valor: desempenho, campo: 'avaliacao_de_desempenho' as const, opcoes: ['ATENDE', 'NAO_ATENDE', 'NAO_HA_SISTEMA'] },
            { req: REQUISITO_17_4_7, valor: chefias, campo: 'orientacao_das_chefias' as const, opcoes: ['ATENDE', 'NAO_ATENDE'] }
          ].map(({ req, valor, campo, opcoes }) => (
            <div key={campo} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <p className="text-slate-200 font-bold">{req.item}</p>
              <p className="text-[10px] text-slate-500">{req.texto}</p>
              <div className="flex flex-wrap gap-1.5">
                {opcoes.map((o) => (
                  <button key={o} type="button"
                    onClick={() => setForm({ ...form, [campo]: { ...(valor || {}), conclusao: (valor as any)?.conclusao === o ? undefined : o } })}
                    className={botao((valor as any)?.conclusao === o, o === 'NAO_ATENDE' ? 'rose' : 'teal')}>
                    {req.conclusoes[o]}
                  </button>
                ))}
              </div>
              {(valor as any)?.conclusao === 'NAO_ATENDE' && (
                <input type="text" placeholder="O que se observou"
                  value={(valor as any)?.observacao || ''}
                  onChange={(e) => setForm({ ...form, [campo]: { ...(valor || {}), observacao: e.target.value } })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" />
              )}
            </div>
          ))}
        </div>

        {/* ---------------------------------------------------------- o que falta */}
        {faltas.length === 0 ? (
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Avaliação psicossocial completa e coerente com o inventário.
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <ul className="text-amber-200 space-y-0.5 list-disc list-inside">
              {faltas.map((f, i) => <li key={i}>{f.longo}</li>)}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
            Fechar sem salvar
          </button>
          <button type="button" onClick={() => salvar(false)}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-100 hover:bg-slate-600 font-semibold">
            Salvar
          </button>
          <button type="button" onClick={() => salvar(true)}
            className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold">
            Salvar e fechar
          </button>
        </div>
      </div>
    </div>
  );
};
