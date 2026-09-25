'use client';

/**
 * Matriz de capacitacao — secao 9.7 do PGR, item 1.7 da NR-01.
 *
 * AS SUGESTOES VEM DE lib/catalogoDeTreinamentos.ts, onde toda linha carrega o
 * subitem de onde saiu. Botao de preset que grava numero inventado ja aconteceu
 * neste projeto e e o defeito mais caro possivel aqui: carga horaria errada num
 * certificado invalida a capacitacao.
 *
 * O CAMPO `basis` E O QUE ESTA TELA EXISTE PARA NAO DEIXAR ERRAR. O subitem
 * 1.7.1.2.2 separa a periodicidade estabelecida NA NR daquela determinada pelo
 * EMPREGADOR quando a NR nao a estabelece. NR-06, NR-12 e NR-26 exigem o
 * treinamento sem fixar carga nem prazo; NR-10, NR-33, NR-35 e NR-13 fixam.
 */

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { TrainingRequirement } from '@/types';
import {
  CATALOGO_DE_TREINAMENTOS,
  BASE_POR_EXTENSO,
  GATILHOS_DE_TREINAMENTO_EVENTUAL,
  CHAVE_CIPA,
  TreinamentoDoCatalogo
} from '@/lib/catalogoDeTreinamentos';
import { NR5_CARGA_HORARIA_TREINAMENTO } from '@/lib/nr5Quadros';
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit3,
  Check,
  Info,
  AlertTriangle,
  CheckCircle2,
  BookOpen
} from 'lucide-react';

interface TrainingMatrixTabProps {
  selectedClientId: string;
}

const BASES: Array<{ valor: NonNullable<TrainingRequirement['basis']>; rotulo: string; detalhe: string }> = [
  {
    valor: 'NORMA',
    rotulo: 'Fixada na NR',
    detalhe: 'A própria norma estabelece a carga horária e/ou a periodicidade. Ex.: NR-35, NR-33, NR-10, NR-13.'
  },
  {
    valor: 'EMPREGADOR',
    rotulo: 'Definida pelo empregador',
    detalhe: 'A NR exige o treinamento mas não fixa carga nem prazo — subitem 1.7.1.2.2. Ex.: NR-06, NR-12, NR-26.'
  },
  {
    valor: 'ORGANIZACAO',
    rotulo: 'Requisito próprio',
    detalhe: 'Treinamento que a organização adota por decisão sua, sem exigência de NR.'
  }
];

const VAZIO = {
  name: '',
  norm: '',
  norm_reference: '',
  catalog_key: '',
  job_ids: [] as string[],
  ghe_ids: [] as string[],
  audience_note: '',
  basis: '' as TrainingRequirement['basis'] | '',
  initial_hours: '',
  periodic_months: '',
  periodic_hours: '',
  notes: ''
};

export const TrainingMatrixTab: React.FC<TrainingMatrixTabProps> = ({ selectedClientId }) => {
  const {
    units,
    ghes,
    hierarchyJobs,
    environmentalRisks,
    machinesEquipment,
    chemicalProducts,
    trainingRequirements,
    addTrainingRequirement,
    updateTrainingRequirement,
    deleteTrainingRequirement
  } = usePrevSafe();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editando, setEditando] = useState<TrainingRequirement | null>(null);
  const [form, setForm] = useState({ ...VAZIO });
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);

  const unidadesDoCliente = units.filter(
    (u) => u.client_id === selectedClientId && u.status !== 'INACTIVE'
  );
  const estabelecimento = unidadesDoCliente[0] || null;
  const grauDeRisco = estabelecimento?.risk_degree;

  const matriz = trainingRequirements.filter(
    (t) => t.client_id === selectedClientId && t.status !== 'INACTIVE'
  );
  const cargosDoCliente = hierarchyJobs.filter(
    (j) => j.client_id === selectedClientId && j.status !== 'INACTIVE'
  );
  const ghesDoCliente = ghes.filter((g: any) => !g?.client_id || g.client_id === selectedClientId);

  const normaNaMatriz = (n: string) =>
    matriz.some((t) => String(t.norm || '').toUpperCase().replace(/[^0-9A-Z]/g, '') === n);

  // Coerencia com o que ja esta cadastrado no resto do PGR.
  const idsDeGhe = new Set(ghesDoCliente.map((g: any) => g.id));
  const maquinasNr12 = machinesEquipment.filter(
    (m) => m.client_id === selectedClientId && (m.applicable_norms || []).includes('NR_12')
  );
  const equipamentosNr13 = machinesEquipment.filter(
    (m) => m.client_id === selectedClientId && (m.applicable_norms || []).includes('NR_13')
  );
  const quimicos = chemicalProducts.filter(
    (q) => q.client_id === selectedClientId && q.status !== 'INACTIVE'
  );
  const riscosComEpi = environmentalRisks.filter(
    (r: any) =>
      (idsDeGhe.has(r?.ghe_id) || r?.client_id === selectedClientId) && r?.epi_required
  );

  const lacunas: string[] = [];
  if (maquinasNr12.length > 0 && !normaNaMatriz('NR12')) {
    lacunas.push(`${maquinasNr12.length} máquina(s) com requisito de NR-12 na seção 6.5 e nenhum treinamento de NR-12 aqui`);
  }
  if (equipamentosNr13.length > 0 && !normaNaMatriz('NR13')) {
    lacunas.push(`${equipamentosNr13.length} equipamento(s) da NR-13 na seção 6.5 e nenhum treinamento de NR-13 aqui`);
  }
  if (quimicos.length > 0 && !normaNaMatriz('NR26')) {
    lacunas.push(`${quimicos.length} produto(s) químico(s) na seção 6.4 e nenhum treinamento de NR-26 aqui (subitem 26.5.2)`);
  }
  if (riscosComEpi.length > 0 && !normaNaMatriz('NR06')) {
    lacunas.push(`${riscosComEpi.length} risco(s) com EPI exigido e nenhum treinamento de NR-06 aqui (alínea "d" do subitem 6.6.1)`);
  }

  /** O que falta em cada linha da matriz. */
  const pendenciasDe = (t: TrainingRequirement): string[] => {
    const falta: string[] = [];
    const temAlcance =
      (t.job_ids || []).length > 0 || (t.ghe_ids || []).length > 0 || !!t.audience_note;
    if (!temAlcance) falta.push('a quem se aplica');
    if (!t.basis) falta.push('carga fixada na NR ou pelo empregador');
    if (!t.initial_hours) falta.push('carga horária inicial');
    if (!t.periodic_months) falta.push('periodicidade');
    return falta;
  };

  /** Carga horaria da CIPA: vem do grau de risco, nao do catalogo. */
  const cargaDoCatalogo = (item: TreinamentoDoCatalogo): string => {
    if (item.chave === CHAVE_CIPA) {
      return grauDeRisco ? `${NR5_CARGA_HORARIA_TREINAMENTO[grauDeRisco]} h` : '';
    }
    return item.cargaInicial || '';
  };

  const aplicarDoCatalogo = (item: TreinamentoDoCatalogo) => {
    setEditando(null);
    setForm({
      ...VAZIO,
      name: item.nome,
      norm: item.norma,
      norm_reference: item.fonte,
      catalog_key: item.chave,
      basis: item.base,
      initial_hours: cargaDoCatalogo(item),
      periodic_months: item.periodicidadeMeses ? String(item.periodicidadeMeses) : '',
      periodic_hours: item.cargaPeriodica || '',
      audience_note: item.publico,
      notes: item.nota || ''
    });
    setMostrarCatalogo(false);
    setIsModalOpen(true);
  };

  const abrirModal = (t?: TrainingRequirement) => {
    if (t) {
      setEditando(t);
      setForm({
        name: t.name || '',
        norm: t.norm || '',
        norm_reference: t.norm_reference || '',
        catalog_key: t.catalog_key || '',
        job_ids: t.job_ids || [],
        ghe_ids: t.ghe_ids || [],
        audience_note: t.audience_note || '',
        basis: t.basis || '',
        initial_hours: t.initial_hours || '',
        periodic_months: t.periodic_months ? String(t.periodic_months) : '',
        periodic_hours: t.periodic_hours || '',
        notes: t.notes || ''
      });
    } else {
      setEditando(null);
      setForm({ ...VAZIO });
    }
    setIsModalOpen(true);
  };

  const alternar = (campo: 'job_ids' | 'ghe_ids', id: string) => {
    setForm((f) => ({
      ...f,
      [campo]: f[campo].includes(id) ? f[campo].filter((x) => x !== id) : [...f[campo], id]
    }));
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Informe o nome do treinamento.');
      return;
    }

    const meses = Number(String(form.periodic_months).replace(/\D/g, ''));
    const dados = {
      client_id: selectedClientId,
      name: form.name.trim(),
      norm: form.norm.trim() || undefined,
      norm_reference: form.norm_reference.trim() || undefined,
      catalog_key: form.catalog_key || undefined,
      job_ids: form.job_ids.length > 0 ? form.job_ids : undefined,
      ghe_ids: form.ghe_ids.length > 0 ? form.ghe_ids : undefined,
      audience_note: form.audience_note.trim() || undefined,
      basis: (form.basis || undefined) as TrainingRequirement['basis'],
      initial_hours: form.initial_hours.trim() || undefined,
      periodic_months: Number.isFinite(meses) && meses > 0 ? meses : undefined,
      periodic_hours: form.periodic_hours.trim() || undefined,
      notes: form.notes.trim() || undefined,
      status: 'ACTIVE' as const
    };

    if (editando) {
      updateTrainingRequirement(editando.id, dados);
    } else {
      addTrainingRequirement(dados);
    }
    setIsModalOpen(false);
  };

  if (!selectedClientId) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <GraduationCap className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Selecione um cliente para montar a matriz de capacitação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-teal-400" />
              Matriz de Capacitação
              <span className="text-[11px] font-semibold text-slate-500">NR-01, item 1.7</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[46rem]">
              Alimenta a seção 9.7 do PGR. O treinamento inicial ocorre antes de o trabalhador
              iniciar suas funções (1.7.1.2.1); o periódico segue a periodicidade estabelecida na NR
              ou, quando ela não a estabelece, prazo determinado pelo empregador (1.7.1.2.2).
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMostrarCatalogo((v) => !v)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 text-sm"
            >
              <BookOpen className="w-4 h-4" />
              Sugestões das NR
            </button>
            <button
              type="button"
              onClick={() => abrirModal()}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md flex items-center gap-1.5 text-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Treinamento
            </button>
          </div>
        </div>
      </div>

      {mostrarCatalogo && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div>
            <h4 className="text-sm font-bold text-slate-100">Sugestões conferidas no texto das normas</h4>
            <p className="text-xs text-slate-400 mt-1">
              Cada sugestão traz o subitem de onde saiu. Onde a norma não fixa carga horária ou
              periodicidade, a sugestão vem marcada como definida pelo empregador e o campo fica em
              branco para você preencher — não há número inventado aqui.
            </p>
            <p className="text-[11px] text-amber-400/90 mt-2 flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              NR-18, NR-20, NR-22, NR-31, NR-32, NR-34, NR-36 e NR-37 também exigem capacitação e
              não estão nesta lista: não foram conferidas no texto oficial nesta revisão. Cadastre-as
              com &quot;Novo Treinamento&quot;.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {CATALOGO_DE_TREINAMENTOS.map((item) => {
              const jaNaMatriz = matriz.some((t) => t.catalog_key === item.chave);
              return (
                <button
                  key={item.chave}
                  type="button"
                  onClick={() => aplicarDoCatalogo(item)}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    jaNaMatriz
                      ? 'bg-slate-950 border-slate-800 opacity-60'
                      : 'bg-slate-950 border-slate-700 hover:border-teal-500/50 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-100">{item.nome}</span>
                    <span className="text-[10px] font-bold text-teal-400 shrink-0">{item.norma}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{item.fonte}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px]">
                    <span className="text-slate-400">
                      Inicial: <strong className="text-slate-300">{cargaDoCatalogo(item) || 'a definir'}</strong>
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">
                      Periódico:{' '}
                      <strong className="text-slate-300">
                        {item.periodicidadeMeses ? `${item.periodicidadeMeses} meses` : 'a definir'}
                      </strong>
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className={item.base === 'NORMA' ? 'text-emerald-400' : 'text-amber-400'}>
                      {BASE_POR_EXTENSO[item.base]}
                    </span>
                  </div>
                  {jaNaMatriz && (
                    <p className="text-[10px] text-slate-500 mt-1">Já está na matriz.</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {lacunas.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-amber-200 font-semibold">
              O que está cadastrado no PGR pressupõe treinamento que não está nesta matriz.
            </p>
            <ul className="text-xs text-amber-200/70 mt-1 space-y-0.5 list-disc list-inside">
              {lacunas.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </div>
        </div>
      )}

      {matriz.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-slate-200 font-semibold">Matriz vazia.</p>
            <p className="text-xs text-slate-400 mt-1">
              Aqui não há declaração de inexistência possível: o subitem 1.7.1.2.1 exige treinamento
              inicial de todo trabalhador antes de iniciar suas funções, sem exceção. Matriz vazia é
              sempre pendência na seção 9.7.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 text-left">Treinamento</th>
                <th className="py-3 px-4 text-left">A quem se aplica</th>
                <th className="py-3 px-4 text-center">Inicial</th>
                <th className="py-3 px-4 text-left">Periódico</th>
                <th className="py-3 px-4 text-left">O que falta</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {matriz.map((t) => {
                const falta = pendenciasDe(t);
                const alcance = [
                  ...(t.job_ids || []).map(
                    (id) => cargosDoCliente.find((j) => j.id === id)?.name || ''
                  ),
                  ...(t.ghe_ids || []).map(
                    (id) => (ghesDoCliente.find((g: any) => g.id === id) as any)?.code || ''
                  ),
                  t.audience_note
                ].filter(Boolean).join('; ');
                return (
                  <tr key={t.id} className="hover:bg-slate-950/50 align-top">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-100">{t.name}</p>
                      {t.norm && (
                        <p className="text-[10px] text-teal-400 font-bold">
                          {t.norm}
                          {t.norm_reference && (
                            <span className="text-slate-500 font-normal"> · {t.norm_reference}</span>
                          )}
                        </p>
                      )}
                      {t.basis && (
                        <p
                          className={`text-[10px] mt-0.5 ${
                            t.basis === 'NORMA' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {BASE_POR_EXTENSO[t.basis]}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {alcance || <span className="text-amber-400">Não definido</span>}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-300">
                      {t.initial_hours || <span className="text-amber-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {t.periodic_months
                        ? `A cada ${t.periodic_months} meses${t.periodic_hours ? `, ${t.periodic_hours}` : ''}`
                        : <span className="text-amber-400">Não definido</span>}
                    </td>
                    <td className="py-3 px-4">
                      {falta.length === 0 ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completo
                        </span>
                      ) : (
                        <span className="text-amber-400">{falta.join('; ')}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => abrirModal(t)}
                          className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Editar treinamento"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remover ${t.name} da matriz?`)) deleteTrainingRequirement(t.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Remover da matriz"
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

      {/* Gatilhos do eventual: nao sao linhas da matriz */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-slate-100">
          Treinamento eventual <span className="text-slate-500 font-normal">(subitem 1.7.1.2.3)</span>
        </h4>
        <p className="text-xs text-slate-400 mt-1">
          Não é linha da matriz: é gatilho. Ocorre independentemente do periódico, com carga horária,
          prazo e conteúdo que atendam à situação que o motivou (1.7.1.2.3.1). Sai na seção 9.7 do
          PGR em todo documento.
        </p>
        <ul className="text-xs text-slate-300 mt-2 space-y-1 list-disc list-inside">
          {GATILHOS_DE_TREINAMENTO_EVENTUAL.map((g) => <li key={g}>{g}</li>)}
        </ul>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-[52rem] w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-teal-400" />
                {editando ? 'Editar Treinamento da Matriz' : 'Treinamento na Matriz'}
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
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nome do treinamento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: Trabalho em altura"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-[auto_1fr] gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">NR de origem</label>
                  <input
                    type="text"
                    placeholder="NR-35"
                    value={form.norm}
                    onChange={(e) => setForm({ ...form, norm: e.target.value })}
                    className="w-[8rem] bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Subitem que o exige
                  </label>
                  <input
                    type="text"
                    placeholder="Ex.: subitens 35.3.2 e 35.3.3.1"
                    value={form.norm_reference}
                    onChange={(e) => setForm({ ...form, norm_reference: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    O PGR imprime esta referência ao lado do treinamento. É o que o auditor confere.
                  </p>
                </div>
              </div>

              {/* base: o campo que separa carga normativa de carga escolhida */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div>
                  <label className="block text-slate-300 font-bold">
                    Carga horária e periodicidade: quem as define?
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Subitem 1.7.1.2.2 da NR-01. Marcar &quot;fixada na NR&quot; num treinamento cuja
                    norma não fixa carga faz o PGR atribuir à norma um número que ela não tem.
                  </p>
                </div>
                {BASES.map((b) => (
                  <label key={b.valor} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="basis"
                      checked={form.basis === b.valor}
                      onChange={() => setForm({ ...form, basis: b.valor })}
                      className="mt-0.5 accent-teal-500"
                    />
                    <span>
                      <span className="text-slate-200 font-semibold">{b.rotulo}</span>
                      <span className="block text-[10px] text-slate-500">{b.detalhe}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Carga horária inicial</label>
                  <input
                    type="text"
                    placeholder="Ex.: 8 h"
                    value={form.initial_hours}
                    onChange={(e) => setForm({ ...form, initial_hours: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Periodicidade (meses)</label>
                  <input
                    type="text"
                    placeholder="Ex.: 24"
                    value={form.periodic_months}
                    onChange={(e) => setForm({ ...form, periodic_months: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Carga do periódico</label>
                  <input
                    type="text"
                    placeholder="Ex.: 8 h"
                    value={form.periodic_hours}
                    onChange={(e) => setForm({ ...form, periodic_hours: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              {/* Alcance */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <label className="block text-slate-300 font-bold">A quem se aplica</label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    A matriz da seção 9.7 é por função. Marque os cargos, os GHE, ou descreva o
                    público quando ele não corresponde à hierarquia cadastrada.
                  </p>
                </div>

                {cargosDoCliente.length > 0 && (
                  <div>
                    <p className="text-slate-400 font-semibold mb-1">Cargos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cargosDoCliente.map((j) => (
                        <button
                          key={j.id}
                          type="button"
                          onClick={() => alternar('job_ids', j.id)}
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

                {ghesDoCliente.length > 0 && (
                  <div>
                    <p className="text-slate-400 font-semibold mb-1">GHE</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ghesDoCliente.map((g: any) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => alternar('ghe_ids', g.id)}
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

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Ou descreva o público
                  </label>
                  <input
                    type="text"
                    placeholder="Ex.: todo trabalhador, antes de iniciar suas funções"
                    value={form.audience_note}
                    onChange={(e) => setForm({ ...form, audience_note: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Conteúdo programático, instrutor, modalidade, aproveitamento de conteúdo anterior"
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
                  {editando ? 'Atualizar' : 'Adicionar à Matriz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
