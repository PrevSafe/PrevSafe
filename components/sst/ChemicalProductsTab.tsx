'use client';

/**
 * Produtos quimicos — secao 6.4 do PGR, item 26.4 da NR-26.
 *
 * DUAS COISAS QUE ESTA TELA EXISTE PARA NAO DEIXAR CONFUNDIR:
 *
 * 1. Saneante notificado ou registrado na Anvisa e dispensado da ROTULAGEM
 *    preventiva (subitem 26.4.2.4) - e so dela. Classificacao (26.4.1) e ficha
 *    com dados de seguranca (26.4.3) continuam exigiveis. E o erro mais facil
 *    de cometer em clinica, escola e escritorio, onde quase tudo e saneante.
 * 2. Produto NAO classificado como perigoso tambem exige FDS quando os usos
 *    previstos derem origem a riscos (subitem 26.4.3.3), e exige rotulagem
 *    preventiva simplificada (subitem 26.4.2.3). Nao perigoso nao e "sem
 *    obrigacao".
 */

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { ChemicalProduct } from '@/types';
import { formatDate } from '@/lib/utils';
import { dataDeHoje } from '@/lib/datas';
import {
  FlaskConical,
  Plus,
  Trash2,
  Edit3,
  Check,
  Info,
  AlertTriangle,
  CheckCircle2,
  Building2
} from 'lucide-react';

interface ChemicalProductsTabProps {
  selectedClientId: string;
}

const CLASSIFICACOES: Array<{
  valor: NonNullable<ChemicalProduct['ghs_classification']>;
  rotulo: string;
  detalhe: string;
}> = [
  {
    valor: 'PERIGOSO',
    rotulo: 'Perigoso segundo o GHS',
    detalhe: 'A ficha com dados de segurança é obrigatória (subitem 26.4.3.1), sem condição nenhuma.'
  },
  {
    valor: 'NAO_PERIGOSO',
    rotulo: 'Não perigoso segundo o GHS',
    detalhe: 'Ainda exige rotulagem simplificada (26.4.2.3), e a FDS quando os usos previstos derem origem a riscos (26.4.3.3).'
  }
];

const ROTULAGENS: Array<{
  valor: NonNullable<ChemicalProduct['labeling_status']>;
  rotulo: string;
  detalhe: string;
}> = [
  {
    valor: 'CONFORME_GHS',
    rotulo: 'Conforme o GHS',
    detalhe: 'Subitem 26.4.2.2: identificação e composição, pictograma, palavra de advertência, frases de perigo e de precaução e informações suplementares.'
  },
  {
    valor: 'SIMPLIFICADA',
    rotulo: 'Simplificada',
    detalhe: 'Subitem 26.4.2.3, do produto não classificado como perigoso: nome, informação de que não é classificado como perigoso e recomendações de precaução.'
  },
  {
    valor: 'DISPENSADA_SANEANTE',
    rotulo: 'Saneante Anvisa — dispensada',
    detalhe: 'Subitem 26.4.2.4. A dispensa é só da rotulagem: classificação e FDS continuam exigíveis.'
  },
  {
    valor: 'IRREGULAR',
    rotulo: 'Irregular — rótulo ausente ou incompleto',
    detalhe: 'Entra como pendência na seção 6.4 e deve ir ao plano de ação.'
  }
];

const FDS: Array<{ valor: NonNullable<ChemicalProduct['sds_status']>; rotulo: string }> = [
  { valor: 'DISPONIVEL', rotulo: 'Disponível' },
  { valor: 'SOLICITADA', rotulo: 'Solicitada ao fornecedor' },
  { valor: 'NAO_OBTIDA', rotulo: 'Não obtida' }
];

const VAZIO = {
  name: '',
  manufacturer: '',
  use_description: '',
  location: '',
  quantity: '',
  client_unit_id: '',
  components: '',
  ghs_classification: '' as ChemicalProduct['ghs_classification'] | '',
  ghs_hazard_classes: '',
  ghs_signal_word: '',
  labeling_status: '' as ChemicalProduct['labeling_status'] | '',
  anvisa_registration: '',
  sds_status: '' as ChemicalProduct['sds_status'] | '',
  sds_date: '',
  sds_location: '',
  training_date: '',
  notes: ''
};

export const ChemicalProductsTab: React.FC<ChemicalProductsTabProps> = ({ selectedClientId }) => {
  const {
    units,
    updateUnit,
    chemicalProducts,
    addChemicalProduct,
    updateChemicalProduct,
    deleteChemicalProduct,
    environmentalRisks,
    ghes
  } = usePrevSafe();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editando, setEditando] = useState<ChemicalProduct | null>(null);
  const [form, setForm] = useState({ ...VAZIO });

  const unidadesDoCliente = units.filter(
    (u) => u.client_id === selectedClientId && u.status !== 'INACTIVE'
  );
  const estabelecimento = unidadesDoCliente[0] || null;
  const produtos = chemicalProducts.filter(
    (q) => q.client_id === selectedClientId && q.status !== 'INACTIVE'
  );

  // Coerencia com o inventario da secao 7: produto perigoso e nenhum agente
  // quimico inventariado e contradicao entre duas secoes do mesmo PGR.
  const ghesDoCliente = ghes.filter((g: any) => !g?.client_id || g.client_id === selectedClientId);
  const idsDeGhe = new Set(ghesDoCliente.map((g: any) => g.id));
  const temAgenteQuimico = environmentalRisks.some(
    (r: any) =>
      (idsDeGhe.has(r?.ghe_id) || r?.client_id === selectedClientId)
      && String(r?.risk_category || '').toUpperCase().startsWith('QU')
  );
  const temPerigoso = produtos.some((q) => q.ghs_classification === 'PERIGOSO');

  /** O que falta em cada produto, pelos subitens do item 26.4. */
  const pendenciasDe = (q: ChemicalProduct): string[] => {
    const falta: string[] = [];
    const perigoso = q.ghs_classification === 'PERIGOSO';
    if (!q.ghs_classification) falta.push('classificação GHS (26.4.1.1)');
    if (perigoso && !q.ghs_hazard_classes) falta.push('classes de perigo');
    if (!q.components) falta.push('componentes e CAS');
    if (!q.labeling_status) falta.push('conferência da rotulagem (26.4.2)');
    if (q.labeling_status === 'IRREGULAR') falta.push('rotulagem irregular');
    if (q.labeling_status === 'DISPENSADA_SANEANTE' && !q.anvisa_registration) {
      falta.push('registro Anvisa que fundamenta a dispensa');
    }
    if (perigoso && q.sds_status !== 'DISPONIVEL') falta.push('FDS (26.4.3.1)');
    if (q.sds_status === 'DISPONIVEL' && !q.sds_location) falta.push('onde se acessa a FDS (26.5.1)');
    if (!q.training_date) falta.push('treinamento (26.5.2)');
    return falta;
  };

  const abrirModal = (q?: ChemicalProduct) => {
    if (q) {
      setEditando(q);
      setForm({
        name: q.name || '',
        manufacturer: q.manufacturer || '',
        use_description: q.use_description || '',
        location: q.location || '',
        quantity: q.quantity || '',
        client_unit_id: q.client_unit_id || '',
        components: q.components || '',
        ghs_classification: q.ghs_classification || '',
        ghs_hazard_classes: q.ghs_hazard_classes || '',
        ghs_signal_word: q.ghs_signal_word || '',
        labeling_status: q.labeling_status || '',
        anvisa_registration: q.anvisa_registration || '',
        sds_status: q.sds_status || '',
        sds_date: q.sds_date || '',
        sds_location: q.sds_location || '',
        training_date: q.training_date || '',
        notes: q.notes || ''
      });
    } else {
      setEditando(null);
      setForm({ ...VAZIO });
    }
    setIsModalOpen(true);
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Informe o nome comercial do produto, como está no rótulo.');
      return;
    }

    const dados = {
      client_id: selectedClientId,
      client_unit_id: form.client_unit_id || undefined,
      name: form.name.trim(),
      manufacturer: form.manufacturer.trim() || undefined,
      use_description: form.use_description.trim() || undefined,
      location: form.location.trim() || undefined,
      quantity: form.quantity.trim() || undefined,
      components: form.components.trim() || undefined,
      ghs_classification: (form.ghs_classification || undefined) as ChemicalProduct['ghs_classification'],
      ghs_hazard_classes: form.ghs_hazard_classes.trim() || undefined,
      ghs_signal_word: form.ghs_signal_word.trim() || undefined,
      labeling_status: (form.labeling_status || undefined) as ChemicalProduct['labeling_status'],
      anvisa_registration: form.anvisa_registration.trim() || undefined,
      sds_status: (form.sds_status || undefined) as ChemicalProduct['sds_status'],
      sds_date: form.sds_date || undefined,
      sds_location: form.sds_location.trim() || undefined,
      training_date: form.training_date || undefined,
      notes: form.notes.trim() || undefined,
      status: 'ACTIVE' as const
    };

    if (editando) {
      updateChemicalProduct(editando.id, dados);
    } else {
      addChemicalProduct(dados);
      if (estabelecimento?.no_chemical_products_declared_at) {
        updateUnit(estabelecimento.id, { no_chemical_products_declared_at: undefined });
      }
    }
    setIsModalOpen(false);
  };

  const declarada = estabelecimento?.no_chemical_products_declared_at;

  if (!selectedClientId) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <FlaskConical className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Selecione um cliente para gerenciar o inventário de produtos químicos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-teal-400" />
              Produtos Químicos
              <span className="text-[11px] font-semibold text-slate-500">NR-26, item 26.4</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[46rem]">
              Alimenta a seção 6.4 do PGR. Todo produto usado no local de trabalho é classificado
              quanto aos perigos segundo o GHS (26.4.1.1); o classificado como perigoso tem ficha
              com dados de segurança obrigatória (26.4.3.1), acesso garantido ao trabalhador
              (26.5.1) e treinamento (26.5.2).
            </p>
          </div>
          <button
            type="button"
            onClick={() => abrirModal()}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Produto
          </button>
        </div>
      </div>

      {/* Coerencia com o inventario de riscos */}
      {temPerigoso && !temAgenteQuimico && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-amber-200 font-semibold">
              Há produto perigoso aqui e nenhum agente químico no inventário de riscos.
            </p>
            <p className="text-xs text-amber-200/70 mt-1">
              O PGR sairia afirmando duas coisas diferentes nas seções 6.4 e 7. Avalie a exposição e
              inventarie o agente no GHE, ou registre no inventário a ausência de risco com a
              justificativa. Sai como pendência enquanto isso.
            </p>
          </div>
        </div>
      )}

      {produtos.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          {declarada ? (
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-slate-200 font-semibold">
                  Declarado em {formatDate(declarada)}: nenhum produto químico utilizado.
                </p>
                <p className="text-xs text-slate-400">
                  Confira antes de manter: álcool 70%, hipoclorito, desinfetante e detergente são
                  produtos químicos. A dispensa do subitem 26.4.2.4 alcança apenas a rotulagem dos
                  saneantes — não a existência do produto.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    estabelecimento
                    && updateUnit(estabelecimento.id, { no_chemical_products_declared_at: undefined })
                  }
                  className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2"
                >
                  Retirar a declaração
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-slate-200 font-semibold">
                  Nenhum produto cadastrado — e nenhuma declaração de que não se usa nenhum.
                </p>
                <p className="text-xs text-slate-400">
                  Lista vazia não é declaração de inexistência. Estabelecimento sem produto químico
                  nenhum é raro: o material de limpeza já conta.
                </p>
                {estabelecimento ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateUnit(estabelecimento.id, { no_chemical_products_declared_at: dataDeHoje() })
                    }
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs border border-slate-700"
                  >
                    Declarar que não se utiliza produto químico
                  </button>
                ) : (
                  <p className="text-xs text-amber-400">
                    Cadastre o estabelecimento em Hierarquia &gt; Unidades para registrar a
                    declaração.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {produtos.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 text-left">Produto</th>
                <th className="py-3 px-4 text-left">Uso e local</th>
                <th className="py-3 px-4 text-left">GHS</th>
                <th className="py-3 px-4 text-left">FDS</th>
                <th className="py-3 px-4 text-left">O que falta</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {produtos.map((q) => {
                const falta = pendenciasDe(q);
                const perigoso = q.ghs_classification === 'PERIGOSO';
                return (
                  <tr key={q.id} className="hover:bg-slate-950/50 align-top">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-100">{q.name}</p>
                      {q.manufacturer && (
                        <p className="text-[10px] text-slate-500">{q.manufacturer}</p>
                      )}
                      {q.components && (
                        <p className="text-[10px] text-slate-500 font-mono">{q.components}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {q.use_description || <span className="text-slate-600">—</span>}
                      {q.location && <p className="text-[10px] text-slate-500">{q.location}</p>}
                    </td>
                    <td className="py-3 px-4">
                      {q.ghs_classification ? (
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                            perigoso
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {perigoso ? 'Perigoso' : 'Não perigoso'}
                        </span>
                      ) : (
                        <span className="text-amber-400">Não classificado</span>
                      )}
                      {q.ghs_hazard_classes && (
                        <p className="text-[10px] text-slate-500 mt-0.5">{q.ghs_hazard_classes}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {q.sds_status
                        ? FDS.find((f) => f.valor === q.sds_status)?.rotulo
                        : <span className="text-amber-400">Não informado</span>}
                      {q.sds_date && (
                        <p className="text-[10px] text-slate-500">{formatDate(q.sds_date)}</p>
                      )}
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
                          onClick={() => abrirModal(q)}
                          className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Editar produto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remover ${q.name}?`)) deleteChemicalProduct(q.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Remover produto"
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-[52rem] w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-teal-400" />
                {editando ? 'Editar Produto Químico' : 'Cadastrar Produto Químico'}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Nome comercial, como está no rótulo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: Álcool etílico 70% INPM; Hipoclorito de sódio 2,5%"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Fabricante</label>
                  <input
                    type="text"
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Para que é usado, em que tarefa
                </label>
                <input
                  type="text"
                  placeholder="Ex.: desinfecção de superfícies e macas entre atendimentos"
                  value={form.use_description}
                  onChange={(e) => setForm({ ...form, use_description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Local de uso e estoque</label>
                  <input
                    type="text"
                    placeholder="Salas de atendimento; depósito"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Quantidade ou consumo</label>
                  <input
                    type="text"
                    placeholder="Ex.: 5 L/mês"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                {unidadesDoCliente.length > 1 && (
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-teal-400" />
                      Estabelecimento
                    </label>
                    <select
                      value={form.client_unit_id}
                      onChange={(e) => setForm({ ...form, client_unit_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    >
                      <option value="">Não vinculado</option>
                      {unidadesDoCliente.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Componentes, número CAS e concentração
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex.: etanol (CAS 64-17-5), 70% v/v; água (CAS 7732-18-5)"
                  value={form.components}
                  onChange={(e) => setForm({ ...form, components: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Sai da seção 3 da FDS. No caso de mistura, o subitem 26.4.3.1.1.1 manda explicitar
                  o nome e a concentração das substâncias que representem perigo à saúde acima dos
                  valores de corte do GHS e das que tenham limite de exposição ocupacional.
                </p>
              </div>

              {/* Classificacao GHS */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-bold">
                  Classificação GHS <span className="text-slate-500 font-normal">(subitem 26.4.1.1)</span>
                </label>
                {CLASSIFICACOES.map((c) => (
                  <label key={c.valor} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ghs_classification"
                      checked={form.ghs_classification === c.valor}
                      onChange={() => setForm({ ...form, ghs_classification: c.valor })}
                      className="mt-0.5 accent-teal-500"
                    />
                    <span>
                      <span className="text-slate-200 font-semibold">{c.rotulo}</span>
                      <span className="block text-[10px] text-slate-500">{c.detalhe}</span>
                    </span>
                  </label>
                ))}
                {!form.ghs_classification && (
                  <p className="text-[10px] text-amber-400 flex items-start gap-1.5">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" />
                    Sem classificação, o produto sai como pendência: é o próprio subitem 26.4.1.1
                    que a exige.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Classes e categorias de perigo
                    </label>
                    <input
                      type="text"
                      placeholder="Ex.: líquido inflamável categoria 2; irritação ocular categoria 2A"
                      value={form.ghs_hazard_classes}
                      onChange={(e) => setForm({ ...form, ghs_hazard_classes: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Advertência e frases de perigo
                    </label>
                    <input
                      type="text"
                      placeholder="Ex.: Perigo — H225, H319"
                      value={form.ghs_signal_word}
                      onChange={(e) => setForm({ ...form, ghs_signal_word: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Rotulagem preventiva */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div>
                  <label className="block text-slate-300 font-bold">
                    Rotulagem preventiva conferida no local
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Conferida na embalagem que está em uso, não na do catálogo do fornecedor.
                  </p>
                </div>
                {ROTULAGENS.map((r) => (
                  <label key={r.valor} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="labeling_status"
                      checked={form.labeling_status === r.valor}
                      onChange={() => setForm({ ...form, labeling_status: r.valor })}
                      className="mt-0.5 accent-teal-500"
                    />
                    <span>
                      <span className="text-slate-200 font-semibold">{r.rotulo}</span>
                      <span className="block text-[10px] text-slate-500">{r.detalhe}</span>
                    </span>
                  </label>
                ))}
                {form.labeling_status === 'DISPENSADA_SANEANTE' && (
                  <div className="pt-1">
                    <label className="block text-slate-400 font-semibold mb-1">
                      Notificação ou registro na Anvisa
                    </label>
                    <input
                      type="text"
                      placeholder="Número da notificação ou do registro"
                      value={form.anvisa_registration}
                      onChange={(e) => setForm({ ...form, anvisa_registration: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                    />
                    <p className="text-[10px] text-amber-400 mt-1">
                      É o número que fundamenta a dispensa. Sem ele, a dispensa é afirmação sem
                      prova — e ela vale só para a rotulagem: a classificação e a FDS continuam
                      exigíveis deste produto.
                    </p>
                  </div>
                )}
              </div>

              {/* FDS e treinamento */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <label className="block text-slate-300 font-bold">
                    Ficha com dados de segurança (FDS)
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Obrigatória para todo produto classificado como perigoso (subitem 26.4.3.1). E
                    também para o não classificado como perigoso cujos usos previstos ou
                    recomendados derem origem a riscos (subitem 26.4.3.3).
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {FDS.map((f) => (
                    <button
                      key={f.valor}
                      type="button"
                      onClick={() => setForm({ ...form, sds_status: f.valor })}
                      className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                        form.sds_status === f.valor
                          ? 'bg-teal-500 text-slate-950 border-teal-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {f.rotulo}
                    </button>
                  ))}
                  {form.sds_status && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, sds_status: '' })}
                      className="px-3 py-1.5 text-slate-500 hover:text-slate-300"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Revisão da FDS</label>
                    <input
                      type="date"
                      value={form.sds_date}
                      onChange={(e) => setForm({ ...form, sds_date: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Onde o trabalhador acessa a FDS
                    </label>
                    <input
                      type="text"
                      placeholder="Ex.: pasta física na copa e no depósito; pasta compartilhada na rede"
                      value={form.sds_location}
                      onChange={(e) => setForm({ ...form, sds_location: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Subitem 26.5.1: ter a ficha não basta, o trabalhador tem de alcançá-la.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Treinamento sobre rotulagem, FDS, perigos e emergência
                  </label>
                  <input
                    type="date"
                    value={form.training_date}
                    onChange={(e) => setForm({ ...form, training_date: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Subitem 26.5.2. A NR-26 não fixa periodicidade nem carga horária para ele.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Observações</label>
                <input
                  type="text"
                  placeholder="Substituição prevista por produto menos perigoso, restrição de uso, EPI específico"
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
                  {editando ? 'Atualizar Produto' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
