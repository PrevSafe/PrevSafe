'use client';

/**
 * Avaliacao Ergonomica Preliminar — AEP, item 17.3 da NR-17.
 *
 * O QUE ESTA TELA NAO E: um questionario com pontuacao. O subitem 17.3.1.1
 * admite abordagens "qualitativas, semiquantitativas, quantitativas ou
 * combinacao dessas, dependendo do risco e dos requisitos legais", e a alinea
 * "c" do item 17.3.3 diz que a analise "nao esta adstrita a utilizacao de
 * metodos, tecnicas e ferramentas especificos". Inventar uma escala e atribui-la
 * a NR-17 seria o mesmo defeito das cargas horarias inventadas.
 *
 * O que a tela faz e percorrer os aspectos que a norma manda alcancar (um por
 * capitulo, de 17.4 a 17.8), registrar a conclusao de quem avalia, a abordagem
 * e os metodos que ele escolheu, e cobrar o que a norma exige em seguida: duas
 * ou mais medidas do 17.4.3.1, a oitiva dos empregados do 17.3.8 e a AET quando
 * um gatilho do 17.3.2 aparecer.
 */

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { ErgonomicAssessment } from '@/types';
import {
  NR17_ASPECTOS,
  NR17_ALTERNATIVAS_DE_PREVENCAO,
  NR17_MINIMO_DE_ALTERNATIVAS,
  NR17_GATILHOS_DA_AET,
  PARAMETROS_DE_CONFORTO,
  CONCLUSAO_POR_EXTENSO,
  ABORDAGEM_POR_EXTENSO,
  ConclusaoDoAspecto,
  AbordagemDaAvaliacao,
  dispensadaDeElaborarAET,
  NR17_FUNDAMENTO_DA_DISPENSA
} from '@/lib/nr17';
import { formatDate } from '@/lib/utils';
import {
  Activity,
  Plus,
  Trash2,
  Edit3,
  Check,
  Info,
  AlertTriangle,
  CheckCircle2,
  Users
} from 'lucide-react';

interface ErgonomicAssessmentTabProps {
  selectedClientId: string;
}

const VAZIO = {
  situation_name: '',
  ghe_ids: [] as string[],
  job_ids: [] as string[],
  worker_count: '',
  approach: '' as AbordagemDaAvaliacao | '',
  methods: '',
  assessment_date: '',
  assessor: '',
  aspects: {} as Record<string, { conclusao?: ConclusaoDoAspecto; observacao?: string }>,
  prevention_measures: [] as Array<'a' | 'b' | 'c' | 'd'>,
  prevention_description: '',
  workers_heard: '' as 'SIM' | 'NAO' | '',
  workers_heard_note: '',
  aet_triggers: [] as Array<'a' | 'b' | 'c' | 'd'>,
  aet_report_date: '',
  aet_report_reference: '',
  notes: ''
};

export const ErgonomicAssessmentTab: React.FC<ErgonomicAssessmentTabProps> = ({ selectedClientId }) => {
  const {
    clients,
    units,
    ghes,
    hierarchyJobs,
    environmentalRisks,
    ergonomicAssessments,
    addErgonomicAssessment,
    updateErgonomicAssessment,
    deleteErgonomicAssessment
  } = usePrevSafe();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editando, setEditando] = useState<ErgonomicAssessment | null>(null);
  const [form, setForm] = useState({ ...VAZIO });

  const cliente = clients.find((c) => c.id === selectedClientId);
  const unidadesDoCliente = units.filter(
    (u) => u.client_id === selectedClientId && u.status !== 'INACTIVE'
  );
  const estabelecimento = unidadesDoCliente[0] || null;
  const dispensaAET = dispensadaDeElaborarAET(
    cliente?.porte,
    (estabelecimento?.risk_degree ?? cliente?.risk_degree) as any
  );

  const aeps = ergonomicAssessments.filter(
    (a) => a.client_id === selectedClientId && a.status !== 'INACTIVE'
  );
  const cargosDoCliente = hierarchyJobs.filter(
    (j) => j.client_id === selectedClientId && j.status !== 'INACTIVE'
  );
  const ghesDoCliente = ghes.filter((g: any) => !g?.client_id || g.client_id === selectedClientId);

  const idsComAep = new Set(aeps.flatMap((a) => a.ghe_ids || []));
  const ghesSemAep = ghesDoCliente.filter((g: any) => !idsComAep.has(g.id));

  const idsDeGhe = new Set(ghesDoCliente.map((g: any) => g.id));
  const temRiscoErgonomico = environmentalRisks.some(
    (r: any) =>
      (idsDeGhe.has(r?.ghe_id) || r?.client_id === selectedClientId)
      && String(r?.risk_category || '').toUpperCase().startsWith('ERGON')
  );

  /** O que falta em cada AEP, pelos itens da NR-17. */
  const pendenciasDe = (a: ErgonomicAssessment): string[] => {
    const falta: string[] = [];
    if ((a.ghe_ids || []).length === 0 && (a.job_ids || []).length === 0) {
      falta.push('GHE ou cargo');
    }
    if (!a.approach) falta.push('abordagem (17.3.1.1)');
    if (!a.methods) falta.push('métodos empregados');
    if (!a.assessment_date) falta.push('data');
    if (!a.assessor) falta.push('quem avaliou');

    const naoAvaliados = NR17_ASPECTOS.filter((asp) => !a.aspects?.[asp.chave]?.conclusao);
    if (naoAvaliados.length > 0) {
      falta.push(`${naoAvaliados.length} aspecto(s) sem conclusão`);
    }
    const inadequadosSemNota = NR17_ASPECTOS.filter(
      (asp) => a.aspects?.[asp.chave]?.conclusao === 'INADEQUADO' && !a.aspects?.[asp.chave]?.observacao
    );
    if (inadequadosSemNota.length > 0) {
      falta.push('observação nos aspectos inadequados');
    }

    const inadequados = NR17_ASPECTOS.filter(
      (asp) => a.aspects?.[asp.chave]?.conclusao === 'INADEQUADO'
    );
    const medidas = a.prevention_measures || [];
    if (inadequados.length > 0) {
      if (medidas.length < NR17_MINIMO_DE_ALTERNATIVAS) {
        falta.push(`${NR17_MINIMO_DE_ALTERNATIVAS} ou mais medidas do 17.4.3.1`);
      }
      const temCouD = medidas.includes('c') || medidas.includes('d');
      if (!temCouD && !(medidas.includes('a') && medidas.includes('b'))) {
        falta.push('pausas e alternância, obrigatórias pelo 17.4.3.1.1');
      }
    }

    if (!a.workers_heard) falta.push('oitiva dos empregados (17.3.8)');
    else if (a.workers_heard === 'NAO') falta.push('empregados não ouvidos (17.3.8)');

    const gatilhos = a.aet_triggers || [];
    const obrigam = dispensaAET === true ? gatilhos.filter((g) => g === 'c' || g === 'd') : gatilhos;
    if (obrigam.length > 0 && !a.aet_report_date) falta.push('AET (17.3.2)');

    return falta;
  };

  const definirAspecto = (chave: string, campo: 'conclusao' | 'observacao', valor: any) => {
    setForm((f) => ({
      ...f,
      aspects: { ...f.aspects, [chave]: { ...(f.aspects[chave] || {}), [campo]: valor } }
    }));
  };

  const alternarLista = (
    campo: 'ghe_ids' | 'job_ids' | 'prevention_measures' | 'aet_triggers',
    valor: any
  ) => {
    setForm((f) => {
      const atual = f[campo] as any[];
      return {
        ...f,
        [campo]: atual.includes(valor) ? atual.filter((x) => x !== valor) : [...atual, valor]
      };
    });
  };

  const abrirModal = (a?: ErgonomicAssessment) => {
    if (a) {
      setEditando(a);
      setForm({
        situation_name: a.situation_name || '',
        ghe_ids: a.ghe_ids || [],
        job_ids: a.job_ids || [],
        worker_count: a.worker_count ? String(a.worker_count) : '',
        approach: a.approach || '',
        methods: a.methods || '',
        assessment_date: a.assessment_date || '',
        assessor: a.assessor || '',
        aspects: a.aspects ? JSON.parse(JSON.stringify(a.aspects)) : {},
        prevention_measures: a.prevention_measures || [],
        prevention_description: a.prevention_description || '',
        workers_heard: a.workers_heard || '',
        workers_heard_note: a.workers_heard_note || '',
        aet_triggers: a.aet_triggers || [],
        aet_report_date: a.aet_report_date || '',
        aet_report_reference: a.aet_report_reference || '',
        notes: a.notes || ''
      });
    } else {
      setEditando(null);
      setForm({ ...VAZIO, aspects: {} });
    }
    setIsModalOpen(true);
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.situation_name.trim()) {
      alert('Informe a situação de trabalho avaliada.');
      return;
    }

    const n = Number(String(form.worker_count).replace(/\D/g, ''));
    const aspectosLimpos: ErgonomicAssessment['aspects'] = {};
    for (const asp of NR17_ASPECTOS) {
      const v = form.aspects[asp.chave];
      if (v?.conclusao) {
        aspectosLimpos[asp.chave] = {
          conclusao: v.conclusao,
          observacao: v.observacao?.trim() || undefined
        };
      }
    }

    const dados = {
      client_id: selectedClientId,
      situation_name: form.situation_name.trim(),
      ghe_ids: form.ghe_ids.length > 0 ? form.ghe_ids : undefined,
      job_ids: form.job_ids.length > 0 ? form.job_ids : undefined,
      worker_count: Number.isFinite(n) && n > 0 ? n : undefined,
      approach: (form.approach || undefined) as ErgonomicAssessment['approach'],
      methods: form.methods.trim() || undefined,
      assessment_date: form.assessment_date || undefined,
      assessor: form.assessor.trim() || undefined,
      aspects: Object.keys(aspectosLimpos).length > 0 ? aspectosLimpos : undefined,
      prevention_measures: form.prevention_measures.length > 0 ? form.prevention_measures : undefined,
      prevention_description: form.prevention_description.trim() || undefined,
      workers_heard: (form.workers_heard || undefined) as ErgonomicAssessment['workers_heard'],
      workers_heard_note: form.workers_heard_note.trim() || undefined,
      aet_triggers: form.aet_triggers.length > 0 ? form.aet_triggers : undefined,
      aet_report_date: form.aet_report_date || undefined,
      aet_report_reference: form.aet_report_reference.trim() || undefined,
      notes: form.notes.trim() || undefined,
      status: 'ACTIVE' as const
    };

    if (editando) {
      updateErgonomicAssessment(editando.id, dados);
    } else {
      addErgonomicAssessment(dados);
    }
    setIsModalOpen(false);
  };

  const inadequadosNoForm = NR17_ASPECTOS.filter(
    (asp) => form.aspects[asp.chave]?.conclusao === 'INADEQUADO'
  );

  if (!selectedClientId) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <Activity className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Selecione um cliente para registrar a avaliação ergonômica.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-400" />
              Avaliação Ergonômica Preliminar
              <span className="text-[11px] font-semibold text-slate-500">NR-17, item 17.3</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[46rem]">
              Alimenta as seções 5.3 e 7.4 do PGR. A NR-17 <strong className="text-slate-300">não
              prescreve método</strong>: o subitem 17.3.1.1 admite abordagem qualitativa,
              semiquantitativa, quantitativa ou combinação, e a alínea &quot;c&quot; do 17.3.3 diz
              que a análise não está adstrita a ferramentas específicas. Aqui se registra a
              conclusão de quem avalia, aspecto por aspecto — não uma pontuação.
            </p>
          </div>
          <button
            type="button"
            onClick={() => abrirModal()}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md flex items-center gap-1.5 text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Avaliação
          </button>
        </div>
      </div>

      {/* Dispensa de elaborar a AET */}
      <div
        className={`rounded-2xl p-4 border flex items-start gap-2.5 ${
          dispensaAET === null
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        <Info
          className={`w-4 h-4 mt-0.5 shrink-0 ${
            dispensaAET === null ? 'text-amber-400' : 'text-teal-400'
          }`}
        />
        <div>
          {dispensaAET === true && (
            <>
              <p className="text-sm text-slate-200 font-semibold">
                Esta organização está dispensada de elaborar a AET.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {NR17_FUNDAMENTO_DA_DISPENSA} A AET continua devida nas situações das alíneas
                &quot;c&quot; e &quot;d&quot; — saúde do trabalhador e análise de acidente ou doença.
              </p>
            </>
          )}
          {dispensaAET === false && (
            <>
              <p className="text-sm text-slate-200 font-semibold">
                Esta organização não se enquadra na dispensa do item 17.3.4.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                A AET é devida em qualquer das quatro situações do item 17.3.2.
              </p>
            </>
          )}
          {dispensaAET === null && (
            <>
              <p className="text-sm text-amber-200 font-semibold">
                Porte da organização não informado.
              </p>
              <p className="text-xs text-amber-200/70 mt-1">
                Sem ele não se sabe se incide a dispensa de elaborar a AET do item 17.3.4, que
                alcança ME e EPP de graus de risco 1 e 2 e o MEI. Preencha em CRM &gt; Clientes. O PGR
                sai com pendência enquanto isso — a dispensa não se presume.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Coerencia com o inventario e cobertura dos GHE */}
      {aeps.length > 0 && (ghesSemAep.length > 0 || !temRiscoErgonomico) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-amber-200 font-semibold">Lacunas de cobertura</p>
            <ul className="text-xs text-amber-200/70 mt-1 space-y-0.5 list-disc list-inside">
              {ghesSemAep.length > 0 && (
                <li>
                  {ghesSemAep.length} GHE sem avaliação:{' '}
                  {ghesSemAep.map((g: any) => g.code || g.name).join(', ')}. O item 17.2.1 aplica a
                  NR-17 a todas as situações de trabalho.
                </li>
              )}
              {!temRiscoErgonomico && (
                <li>
                  Há AEP registrada e nenhum agente ergonômico no inventário. O item 17.3.5 manda os
                  resultados da AEP integrarem o inventário de riscos.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {aeps.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-slate-200 font-semibold">Nenhuma avaliação registrada.</p>
            <p className="text-xs text-slate-400 mt-1">
              O subitem 17.3.1.2.1 exige que a AEP seja registrada, e o item 17.2.1 aplica a NR-17 a
              todas as situações de trabalho. Aqui não cabe declaração de inexistência.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 text-left">Situação de trabalho</th>
                <th className="py-3 px-4 text-left">Abordagem</th>
                <th className="py-3 px-4 text-left">Aspectos</th>
                <th className="py-3 px-4 text-left">O que falta</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {aeps.map((a) => {
                const falta = pendenciasDe(a);
                const inadequados = NR17_ASPECTOS.filter(
                  (asp) => a.aspects?.[asp.chave]?.conclusao === 'INADEQUADO'
                );
                const avaliados = NR17_ASPECTOS.filter((asp) => a.aspects?.[asp.chave]?.conclusao);
                const alcance = [
                  ...(a.ghe_ids || []).map(
                    (id) => (ghesDoCliente.find((g: any) => g.id === id) as any)?.code || ''
                  ),
                  ...(a.job_ids || []).map(
                    (id) => cargosDoCliente.find((j) => j.id === id)?.name || ''
                  )
                ].filter(Boolean).join('; ');
                return (
                  <tr key={a.id} className="hover:bg-slate-950/50 align-top">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-100">{a.situation_name}</p>
                      {alcance && <p className="text-[10px] text-slate-500">{alcance}</p>}
                      {a.worker_count ? (
                        <p className="text-[10px] text-slate-500">{a.worker_count} trabalhador(es)</p>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {a.approach
                        ? ABORDAGEM_POR_EXTENSO[a.approach]
                        : <span className="text-amber-400">Não informada</span>}
                      {a.assessment_date && (
                        <p className="text-[10px] text-slate-500">{formatDate(a.assessment_date)}</p>
                      )}
                      {a.assessor && <p className="text-[10px] text-slate-500">{a.assessor}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-slate-300">
                        {avaliados.length}/{NR17_ASPECTOS.length} avaliados
                      </p>
                      {inadequados.length > 0 && (
                        <p className="text-[10px] text-rose-300 mt-0.5">
                          {inadequados.length} inadequado(s): {inadequados.map((x) => x.rotulo).join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {falta.length === 0 ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completa
                        </span>
                      ) : (
                        <span className="text-amber-400">{falta.join('; ')}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => abrirModal(a)}
                          className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Editar avaliação"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remover a avaliação de ${a.situation_name}?`)) {
                              deleteErgonomicAssessment(a.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Remover avaliação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Parametros do 17.8, para consulta ao avaliar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-slate-100">
          Parâmetros de conforto <span className="text-slate-500 font-normal">(item 17.8)</span>
        </h4>
        <p className="text-xs text-slate-400 mt-1">
          Na redação vigente. Os valores da redação anterior ainda circulam e são outros: 20 a 23 °C,
          umidade mínima de 40% e iluminamento pela ABNT NBR 5413. Nenhum dos três está no texto
          atual — a umidade deixou de ter valor numérico.
        </p>
        <div className="mt-3 space-y-2">
          {PARAMETROS_DE_CONFORTO.map((c) => (
            <div key={c.item} className="text-xs">
              <span className="font-bold text-slate-200">{c.item}</span>
              <span className="text-slate-500"> · {c.fonte}</span>
              <p className="text-slate-400">{c.parametro}</p>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-[56rem] w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-400" />
                {editando ? 'Editar Avaliação Ergonômica' : 'Nova Avaliação Ergonômica Preliminar'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={salvar} className="space-y-4 text-xs">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Situação de trabalho avaliada
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: Recepção — atendimento ao público em posto informatizado"
                    value={form.situation_name}
                    onChange={(e) => setForm({ ...form, situation_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Trabalhadores</label>
                  <input
                    type="text"
                    placeholder="4"
                    value={form.worker_count}
                    onChange={(e) => setForm({ ...form, worker_count: e.target.value })}
                    className="w-[6rem] bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              {/* Alcance */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <label className="block text-slate-300 font-bold">A que GHE e cargos corresponde</label>
                {ghesDoCliente.length > 0 && (
                  <div>
                    <p className="text-slate-400 font-semibold mb-1">GHE</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ghesDoCliente.map((g: any) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => alternarLista('ghe_ids', g.id)}
                          className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                            form.ghe_ids.includes(g.id)
                              ? 'bg-teal-500 text-slate-950 border-teal-400'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          {g.code || g.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {cargosDoCliente.length > 0 && (
                  <div>
                    <p className="text-slate-400 font-semibold mb-1">Cargos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cargosDoCliente.map((j) => (
                        <button
                          key={j.id}
                          type="button"
                          onClick={() => alternarLista('job_ids', j.id)}
                          className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                            form.job_ids.includes(j.id)
                              ? 'bg-teal-500 text-slate-950 border-teal-400'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          {j.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Abordagem e autoria */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <label className="block text-slate-300 font-bold">
                    Abordagem empregada <span className="text-slate-500 font-normal">(subitem 17.3.1.1)</span>
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    A norma admite as quatro, conforme o risco e os requisitos legais. Não há uma
                    correta: há a que você usou, e ela vai para o documento.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(ABORDAGEM_POR_EXTENSO) as AbordagemDaAvaliacao[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setForm({ ...form, approach: k })}
                      className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                        form.approach === k
                          ? 'bg-teal-500 text-slate-950 border-teal-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {ABORDAGEM_POR_EXTENSO[k]}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Métodos, técnicas e ferramentas empregados
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex.: observação direta da tarefa em dois turnos, entrevista com os quatro trabalhadores, registro fotográfico das posturas, medição de iluminamento pela NHO 11"
                    value={form.methods}
                    onChange={(e) => setForm({ ...form, methods: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Data</label>
                    <input
                      type="date"
                      value={form.assessment_date}
                      onChange={(e) => setForm({ ...form, assessment_date: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Quem avaliou</label>
                    <input
                      type="text"
                      placeholder="Nome e registro profissional"
                      value={form.assessor}
                      onChange={(e) => setForm({ ...form, assessor: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Aspectos: um por capitulo da NR-17 */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <label className="block text-slate-300 font-bold">Conclusão por aspecto</label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Um por capítulo da NR-17. Aspecto sem conclusão é aspecto não avaliado, e sai como
                    pendência — ausência não é &quot;adequado&quot;.
                  </p>
                </div>
                {NR17_ASPECTOS.map((asp) => {
                  const atual = form.aspects[asp.chave] || {};
                  return (
                    <div key={asp.chave} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-[16rem]">
                          <p className="font-bold text-slate-200">
                            {asp.rotulo}
                            <span className="text-slate-500 font-normal"> · {asp.fonte}</span>
                          </p>
                          <p className="text-[10px] text-slate-500">{asp.ajuda}</p>
                        </div>
                        <div className="flex gap-1.5">
                          {(Object.keys(CONCLUSAO_POR_EXTENSO) as ConclusaoDoAspecto[]).map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => definirAspecto(asp.chave, 'conclusao', k)}
                              className={`px-2 py-1 rounded-lg border text-[10px] font-semibold transition-colors ${
                                atual.conclusao === k
                                  ? k === 'INADEQUADO'
                                    ? 'bg-rose-500 text-white border-rose-400'
                                    : 'bg-teal-500 text-slate-950 border-teal-400'
                                  : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                              }`}
                            >
                              {k === 'ADEQUADO' ? 'Adequado' : k === 'INADEQUADO' ? 'Inadequado' : 'N/A'}
                            </button>
                          ))}
                        </div>
                      </div>
                      {atual.conclusao && (
                        <input
                          type="text"
                          placeholder={
                            atual.conclusao === 'INADEQUADO'
                              ? 'O que se observou — exigido para o aspecto inadequado'
                              : 'Observação (opcional)'
                          }
                          value={atual.observacao || ''}
                          onChange={(e) => definirAspecto(asp.chave, 'observacao', e.target.value)}
                          className="w-full mt-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Medidas de prevencao */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div>
                  <label className="block text-slate-300 font-bold">
                    Medidas de prevenção <span className="text-slate-500 font-normal">(subitem 17.4.3.1)</span>
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Devem incluir <strong className="text-slate-400">duas ou mais</strong> das
                    alternativas. Quando não for possível adotar as das alíneas &quot;c&quot; e
                    &quot;d&quot;, as das alíneas &quot;a&quot; e &quot;b&quot; tornam-se
                    obrigatórias (subitem 17.4.3.1.1).
                  </p>
                </div>
                {NR17_ALTERNATIVAS_DE_PREVENCAO.map((alt) => (
                  <label key={alt.alinea} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.prevention_measures.includes(alt.alinea as any)}
                      onChange={() => alternarLista('prevention_measures', alt.alinea)}
                      className="mt-0.5 accent-teal-500"
                    />
                    <span className="text-slate-300">
                      <strong className="text-slate-200">{alt.alinea})</strong> {alt.texto}
                    </span>
                  </label>
                ))}
                {inadequadosNoForm.length > 0
                  && form.prevention_measures.length < NR17_MINIMO_DE_ALTERNATIVAS && (
                  <p className="text-[10px] text-amber-400 flex items-start gap-1.5">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" />
                    Há {inadequadosNoForm.length} aspecto(s) inadequado(s) e{' '}
                    {form.prevention_measures.length} medida(s): o subitem 17.4.3.1 exige duas ou
                    mais.
                  </p>
                )}
                {inadequadosNoForm.length > 0
                  && !form.prevention_measures.includes('c')
                  && !form.prevention_measures.includes('d')
                  && !(form.prevention_measures.includes('a') && form.prevention_measures.includes('b')) && (
                  <p className="text-[10px] text-amber-400 flex items-start gap-1.5">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" />
                    Sem as alíneas &quot;c&quot; ou &quot;d&quot;, as alíneas &quot;a&quot; e
                    &quot;b&quot; passam a ser obrigatórias (subitem 17.4.3.1.1).
                  </p>
                )}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Como as medidas foram implementadas
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex.: pausa de 10 min a cada 50 min fora do posto; revezamento entre recepção e arquivo a cada 2 h; cadeira com regulagem de altura e apoio lombar"
                    value={form.prevention_description}
                    onChange={(e) => setForm({ ...form, prevention_description: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              {/* Oitiva dos empregados */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div>
                  <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-teal-400" />
                    Os empregados foram ouvidos? <span className="text-slate-500 font-normal">(item 17.3.8)</span>
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    A organização deve garantir que os empregados sejam ouvidos durante o processo da
                    AEP e na AET. Não é opcional, e em branco sai como pendência.
                  </p>
                </div>
                <div className="flex gap-2">
                  {(['SIM', 'NAO'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm({ ...form, workers_heard: v })}
                      className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                        form.workers_heard === v
                          ? v === 'SIM'
                            ? 'bg-teal-500 text-slate-950 border-teal-400'
                            : 'bg-rose-500 text-white border-rose-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {v === 'SIM' ? 'Sim' : 'Não'}
                    </button>
                  ))}
                </div>
                {form.workers_heard === 'SIM' && (
                  <input
                    type="text"
                    placeholder="Como: entrevista individual, reunião com o setor, participação da CIPA"
                    value={form.workers_heard_note}
                    onChange={(e) => setForm({ ...form, workers_heard_note: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                )}
              </div>

              {/* Gatilhos da AET */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div>
                  <label className="block text-slate-300 font-bold">
                    Gatilhos da AET observados nesta situação{' '}
                    <span className="text-slate-500 font-normal">(item 17.3.2)</span>
                  </label>
                  {dispensaAET === true && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Nesta organização, dispensada pelo item 17.3.4, apenas as alíneas &quot;c&quot; e
                      &quot;d&quot; obrigam à AET (subitem 17.3.4.1).
                    </p>
                  )}
                </div>
                {NR17_GATILHOS_DA_AET.map((g) => (
                  <label key={g.alinea} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.aet_triggers.includes(g.alinea as any)}
                      onChange={() => alternarLista('aet_triggers', g.alinea)}
                      className="mt-0.5 accent-teal-500"
                    />
                    <span className="text-slate-300">
                      <strong className="text-slate-200">{g.alinea})</strong> {g.texto}
                    </span>
                  </label>
                ))}
                {form.aet_triggers.length > 0 && (
                  <div className="grid grid-cols-[auto_1fr] gap-3 pt-1">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Relatório da AET</label>
                      <input
                        type="date"
                        value={form.aet_report_date}
                        onChange={(e) => setForm({ ...form, aet_report_date: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Guarda de 20 anos (17.3.7).</p>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Identificação do relatório</label>
                      <input
                        type="text"
                        placeholder="Ex.: AET-2026-03, elaborada por..."
                        value={form.aet_report_reference}
                        onChange={(e) => setForm({ ...form, aet_report_reference: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Observações</label>
                <input
                  type="text"
                  placeholder="Revisão prevista, restrições observadas, encaminhamentos"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {editando ? 'Atualizar Avaliação' : 'Registrar Avaliação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
