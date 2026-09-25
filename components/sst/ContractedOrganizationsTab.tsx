'use client';

/**
 * Organizacoes contratadas — item 1.5.8 da NR-01, secao 9.5 do PGR.
 *
 * A NR-01 nao trata terceiro como anexo do PGR: o subitem 1.5.8.1 obriga o PGR
 * do contratante a incluir as medidas de prevencao das contratadas que atuem em
 * suas dependencias ou em local previamente convencionado em contrato, OU a
 * utilizar os programas delas - e, nesse caso, o subitem 1.5.8.1.1 exige que a
 * contratada forneca inventario de riscos e plano de acao. Os subitens 1.5.8.2 e
 * 1.5.8.3 exigem troca de informacoes nos DOIS sentidos, e o 1.5.8.4 manda
 * definir em conjunto as medidas para os riscos que resultam da interacao das
 * atividades, sob coordenacao do contratante.
 *
 * Nenhum campo nasce preenchido. Regime, local de atuacao e risco de interacao
 * comecam vazios porque um padrao aqui seria declaracao de conformidade que
 * ninguem fez - e é isso que a fiscalizacao confere contrato por contrato.
 */

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { ContractedOrganization, GroRegimeContratada, LocalDaContratada } from '@/types';
import { formatDate } from '@/lib/utils';
import { dataDeHoje } from '@/lib/datas';
import {
  Handshake,
  Plus,
  Trash2,
  Edit3,
  Check,
  Info,
  AlertTriangle,
  CheckCircle2,
  Building2
} from 'lucide-react';

interface ContractedOrganizationsTabProps {
  selectedClientId: string;
}

const LOCAIS: Array<{ valor: LocalDaContratada; rotulo: string; detalhe: string }> = [
  {
    valor: 'DEPENDENCIAS',
    rotulo: 'Nas dependências do contratante',
    detalhe: 'Aciona o subitem 1.5.8.1: as medidas entram neste PGR ou usa-se o programa da contratada.'
  },
  {
    valor: 'LOCAL_CONVENCIONADO',
    rotulo: 'Local convencionado em contrato',
    detalhe: 'Mesma regra do subitem 1.5.8.1, mesmo fora do estabelecimento.'
  },
  {
    valor: 'NAO_ATUA_NO_LOCAL',
    rotulo: 'Não atua nas dependências nem em local convencionado',
    detalhe: 'O subitem 1.5.8.1 não alcança, mas a troca de informações dos subitens 1.5.8.2 e 1.5.8.3 continua devida.'
  }
];

const REGIMES: Array<{ valor: GroRegimeContratada; rotulo: string; detalhe: string }> = [
  {
    valor: 'PGR_DO_CONTRATANTE',
    rotulo: 'As medidas entram neste PGR',
    detalhe: 'Os riscos da atividade contratada são inventariados aqui e o plano de ação cobre as medidas.'
  },
  {
    valor: 'PROGRAMA_DA_CONTRATADA',
    rotulo: 'Utiliza os programas da contratada',
    detalhe: 'O subitem 1.5.8.1.1 obriga a contratada a fornecer o inventário de riscos e o plano de ação das atividades contratadas.'
  },
  {
    valor: 'SOMENTE_TITULAR_OU_SOCIOS',
    rotulo: 'Serviços prestados somente pelo titular ou sócios',
    detalhe: 'Subitem 1.5.8.1.2: o contratante estende suas próprias medidas de prevenção aos riscos da atividade contratada.'
  }
];

const VAZIO = {
  legal_name: '',
  document_number: '',
  contracted_service: '',
  client_unit_id: '',
  work_location: '' as LocalDaContratada | '',
  work_location_note: '',
  gro_regime: '' as GroRegimeContratada | '',
  received_inventory_date: '',
  received_action_plan_date: '',
  extended_measures: '',
  informed_risks_date: '',
  informed_risks_evidence: '',
  received_risks_date: '',
  received_risks_evidence: '',
  interaction_risks: '' as 'SIM' | 'NAO' | '',
  joint_measures: '',
  notes: ''
};

export const ContractedOrganizationsTab: React.FC<ContractedOrganizationsTabProps> = ({
  selectedClientId
}) => {
  const {
    units,
    updateUnit,
    contractedOrganizations,
    addContractedOrganization,
    updateContractedOrganization,
    deleteContractedOrganization
  } = usePrevSafe();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editando, setEditando] = useState<ContractedOrganization | null>(null);
  const [form, setForm] = useState({ ...VAZIO });

  const unidadesDoCliente = units.filter(
    (u) => u.client_id === selectedClientId && u.status !== 'INACTIVE'
  );
  const estabelecimento = unidadesDoCliente[0] || null;
  const contratadas = contractedOrganizations.filter(
    (o) => o.client_id === selectedClientId && o.status !== 'INACTIVE'
  );

  /** O que falta em cada contratada, pelas exigências do item 1.5.8. */
  const pendenciasDe = (o: ContractedOrganization): string[] => {
    const falta: string[] = [];
    if (!o.work_location) falta.push('onde atua (1.5.8.1)');
    if (!o.gro_regime) falta.push('regime de GRO (1.5.8.1)');
    if (o.gro_regime === 'PROGRAMA_DA_CONTRATADA') {
      if (!o.received_inventory_date) falta.push('inventário da contratada (1.5.8.1.1)');
      if (!o.received_action_plan_date) falta.push('plano de ação da contratada (1.5.8.1.1)');
    }
    if (o.gro_regime === 'SOMENTE_TITULAR_OU_SOCIOS' && !o.extended_measures) {
      falta.push('extensão das medidas (1.5.8.1.2)');
    }
    if (!o.informed_risks_date) falta.push('riscos informados à contratada (1.5.8.2)');
    if (!o.received_risks_date) falta.push('riscos informados pela contratada (1.5.8.3)');
    if (!o.interaction_risks) falta.push('avaliação de riscos de interação (1.5.8.4)');
    if (o.interaction_risks === 'SIM' && !o.joint_measures) {
      falta.push('medidas definidas em conjunto (1.5.8.4)');
    }
    return falta;
  };

  const abrirModal = (o?: ContractedOrganization) => {
    if (o) {
      setEditando(o);
      setForm({
        legal_name: o.legal_name || '',
        document_number: o.document_number || '',
        contracted_service: o.contracted_service || '',
        client_unit_id: o.client_unit_id || '',
        work_location: (o.work_location || '') as LocalDaContratada | '',
        work_location_note: o.work_location_note || '',
        gro_regime: (o.gro_regime || '') as GroRegimeContratada | '',
        received_inventory_date: o.received_inventory_date || '',
        received_action_plan_date: o.received_action_plan_date || '',
        extended_measures: o.extended_measures || '',
        informed_risks_date: o.informed_risks_date || '',
        informed_risks_evidence: o.informed_risks_evidence || '',
        received_risks_date: o.received_risks_date || '',
        received_risks_evidence: o.received_risks_evidence || '',
        interaction_risks: (o.interaction_risks || '') as 'SIM' | 'NAO' | '',
        joint_measures: o.joint_measures || '',
        notes: o.notes || ''
      });
    } else {
      setEditando(null);
      setForm({ ...VAZIO });
    }
    setIsModalOpen(true);
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.legal_name.trim()) {
      alert('Informe a razão social da contratada.');
      return;
    }
    if (!form.contracted_service.trim()) {
      alert('Informe a atividade objeto da contratação: é ela que o subitem 1.5.8.1.1 identifica.');
      return;
    }

    const dados = {
      client_id: selectedClientId,
      client_unit_id: form.client_unit_id || undefined,
      legal_name: form.legal_name.trim(),
      document_number: form.document_number.trim() || undefined,
      contracted_service: form.contracted_service.trim(),
      work_location: (form.work_location || undefined) as LocalDaContratada | undefined,
      work_location_note: form.work_location_note.trim() || undefined,
      gro_regime: (form.gro_regime || undefined) as GroRegimeContratada | undefined,
      received_inventory_date: form.received_inventory_date || undefined,
      received_action_plan_date: form.received_action_plan_date || undefined,
      extended_measures: form.extended_measures.trim() || undefined,
      informed_risks_date: form.informed_risks_date || undefined,
      informed_risks_evidence: form.informed_risks_evidence.trim() || undefined,
      received_risks_date: form.received_risks_date || undefined,
      received_risks_evidence: form.received_risks_evidence.trim() || undefined,
      interaction_risks: (form.interaction_risks || undefined) as 'SIM' | 'NAO' | undefined,
      joint_measures: form.joint_measures.trim() || undefined,
      notes: form.notes.trim() || undefined,
      status: 'ACTIVE' as const
    };

    if (editando) {
      updateContractedOrganization(editando.id, dados);
    } else {
      addContractedOrganization(dados);
      // Cadastrar uma contratada desmente a declaracao de que nao havia
      // nenhuma. Deixa-la de pe faria a secao 9.5 afirmar as duas coisas.
      if (estabelecimento?.no_contracted_organizations_declared_at) {
        updateUnit(estabelecimento.id, { no_contracted_organizations_declared_at: undefined });
      }
    }
    setIsModalOpen(false);
  };

  const declarada = estabelecimento?.no_contracted_organizations_declared_at;

  if (!selectedClientId) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <Handshake className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Selecione um cliente para gerenciar as organizações contratadas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Handshake className="w-5 h-5 text-teal-400" />
              Organizações Contratadas
              <span className="text-[11px] font-semibold text-slate-500">NR-01, item 1.5.8</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[46rem]">
              Alimenta a seção 9.5 do PGR. O subitem 1.5.8.1 não deixa escolha em aberto: para a
              contratada que atua nas dependências ou em local convencionado em contrato, ou as
              medidas de prevenção entram neste PGR, ou se utilizam os programas dela — e aí ela
              deve fornecer inventário de riscos e plano de ação.
            </p>
          </div>
          <button
            type="button"
            onClick={() => abrirModal()}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Contratada
          </button>
        </div>
      </div>

      {/* Declaracao de que nao ha contratada. Lista vazia nao e declaracao. */}
      {contratadas.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          {declarada ? (
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-slate-200 font-semibold">
                  Declarado em {formatDate(declarada)}: nenhuma contratada atua neste estabelecimento.
                </p>
                <p className="text-xs text-slate-400">
                  A seção 9.5 do PGR sai com essa declaração e a data, e não como pendência. Ao
                  contratar terceiros, cadastre a contratada aqui — a declaração cai sozinha.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    estabelecimento
                    && updateUnit(estabelecimento.id, { no_contracted_organizations_declared_at: undefined })
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
                  Nenhuma contratada cadastrada — e nenhuma declaração de que não há.
                </p>
                <p className="text-xs text-slate-400">
                  Lista vazia não é declaração de inexistência: para o auditor, é cadastro não
                  feito. Enquanto não houver uma das duas coisas, a seção 9.5 do PGR sai como
                  pendência.
                </p>
                {estabelecimento ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateUnit(estabelecimento.id, {
                        no_contracted_organizations_declared_at: dataDeHoje()
                      })
                    }
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs border border-slate-700"
                  >
                    Declarar que nenhuma contratada atua neste estabelecimento
                  </button>
                ) : (
                  <p className="text-xs text-amber-400">
                    Cadastre o estabelecimento em Hierarquia &gt; Unidades para poder registrar a
                    declaração: ela fica no estabelecimento, porque o PGR é emitido por
                    estabelecimento (subitem 1.5.3.1.1.1).
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {contratadas.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 text-left">Contratada</th>
                <th className="py-3 px-4 text-left">Serviço contratado</th>
                <th className="py-3 px-4 text-left">Regime de GRO (1.5.8.1)</th>
                <th className="py-3 px-4 text-left">O que falta</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {contratadas.map((o) => {
                const falta = pendenciasDe(o);
                const local = LOCAIS.find((l) => l.valor === o.work_location);
                const regime = REGIMES.find((r) => r.valor === o.gro_regime);
                return (
                  <tr key={o.id} className="hover:bg-slate-950/50 align-top">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-100">{o.legal_name}</p>
                      {o.document_number && (
                        <p className="text-[10px] text-slate-500 font-mono">{o.document_number}</p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {local ? local.rotulo : 'Local de atuação não informado'}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{o.contracted_service}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {regime ? regime.rotulo : <span className="text-amber-400">Não definido</span>}
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
                          onClick={() => abrirModal(o)}
                          className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Editar contratada"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remover a contratada ${o.legal_name}?`)) {
                              deleteContractedOrganization(o.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Remover contratada"
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
                <Handshake className="w-5 h-5 text-teal-400" />
                {editando ? 'Editar Contratada' : 'Cadastrar Contratada'}
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
                  <label className="block text-slate-400 font-semibold mb-1">Razão social</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: Alfa Conservação e Limpeza Ltda"
                    value={form.legal_name}
                    onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">CNPJ ou CPF</label>
                  <input
                    type="text"
                    placeholder="12.345.678/0001-99"
                    value={form.document_number}
                    onChange={(e) => setForm({ ...form, document_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    CPF quando os serviços são prestados pelo titular.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Atividade objeto da contratação
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: limpeza e conservação das áreas comuns; manutenção elétrica preventiva"
                  value={form.contracted_service}
                  onChange={(e) => setForm({ ...form, contracted_service: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  É esta atividade, e não a empresa toda, que delimita o que a NR-01 cobra: o
                  subitem 1.5.8.1.1 fala do inventário e do plano &quot;referente às atividades
                  objeto de sua contratação&quot;.
                </p>
              </div>

              {unidadesDoCliente.length > 1 && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-400" />
                    Estabelecimento em que atua
                  </label>
                  <select
                    value={form.client_unit_id}
                    onChange={(e) => setForm({ ...form, client_unit_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  >
                    <option value="">Não vinculada a um estabelecimento específico</option>
                    {unidadesDoCliente.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Onde atua — o que aciona o subitem 1.5.8.1 */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-bold">
                  Onde atua <span className="text-slate-500 font-normal">(subitem 1.5.8.1)</span>
                </label>
                {LOCAIS.map((l) => (
                  <label key={l.valor} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="work_location"
                      checked={form.work_location === l.valor}
                      onChange={() => setForm({ ...form, work_location: l.valor })}
                      className="mt-0.5 accent-teal-500"
                    />
                    <span>
                      <span className="text-slate-200 font-semibold">{l.rotulo}</span>
                      <span className="block text-[10px] text-slate-500">{l.detalhe}</span>
                    </span>
                  </label>
                ))}
                {form.work_location === 'LOCAL_CONVENCIONADO' && (
                  <input
                    type="text"
                    placeholder="Qual local foi convencionado em contrato"
                    value={form.work_location_note}
                    onChange={(e) => setForm({ ...form, work_location_note: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                )}
              </div>

              {/* Regime de GRO */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-bold">
                  Regime de GRO <span className="text-slate-500 font-normal">(subitem 1.5.8.1)</span>
                </label>
                {REGIMES.map((r) => (
                  <label key={r.valor} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gro_regime"
                      checked={form.gro_regime === r.valor}
                      onChange={() => setForm({ ...form, gro_regime: r.valor })}
                      className="mt-0.5 accent-teal-500"
                    />
                    <span>
                      <span className="text-slate-200 font-semibold">{r.rotulo}</span>
                      <span className="block text-[10px] text-slate-500">{r.detalhe}</span>
                    </span>
                  </label>
                ))}

                {form.gro_regime === 'PROGRAMA_DA_CONTRATADA' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        Inventário de riscos recebido em
                      </label>
                      <input
                        type="date"
                        value={form.received_inventory_date}
                        onChange={(e) => setForm({ ...form, received_inventory_date: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        Plano de ação recebido em
                      </label>
                      <input
                        type="date"
                        value={form.received_action_plan_date}
                        onChange={(e) => setForm({ ...form, received_action_plan_date: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                      />
                    </div>
                    <p className="col-span-2 text-[10px] text-slate-500">
                      Os dois documentos, não um: o subitem 1.5.8.1.1 exige inventário de riscos
                      <em> e</em> plano de ação das atividades contratadas.
                    </p>
                  </div>
                )}

                {form.gro_regime === 'SOMENTE_TITULAR_OU_SOCIOS' && (
                  <div className="pt-1">
                    <label className="block text-slate-400 font-semibold mb-1">
                      Como as medidas deste PGR se estendem à atividade contratada
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex.: o eletricista autônomo recebe os EPIs do contratante, é incluído na OS de risco elétrico e segue o procedimento de bloqueio da NR-10"
                      value={form.extended_measures}
                      onChange={(e) => setForm({ ...form, extended_measures: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Subitem 1.5.8.1.2: quem presta o serviço sozinho não tem PGR próprio a
                      apresentar, e o contratante estende as suas medidas.
                    </p>
                  </div>
                )}
              </div>

              {/* Troca de informacoes nos dois sentidos */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <label className="block text-slate-300 font-bold">
                    Troca de informações sobre riscos
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Vai nos dois sentidos, em subitens separados: o 1.5.8.2 obriga o contratante a
                    informar, o 1.5.8.3 obriga a contratada. Um só não cumpre os dois.
                  </p>
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Informou (1.5.8.2)
                    </label>
                    <input
                      type="date"
                      value={form.informed_risks_date}
                      onChange={(e) => setForm({ ...form, informed_risks_date: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Evidência</label>
                    <input
                      type="text"
                      placeholder="Ex.: ofício 12/2026 com protocolo de recebimento assinado pelo preposto"
                      value={form.informed_risks_evidence}
                      onChange={(e) => setForm({ ...form, informed_risks_evidence: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Recebeu (1.5.8.3)
                    </label>
                    <input
                      type="date"
                      value={form.received_risks_date}
                      onChange={(e) => setForm({ ...form, received_risks_date: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Evidência</label>
                    <input
                      type="text"
                      placeholder="Ex.: comunicação da contratada sobre uso de produto químico na limpeza"
                      value={form.received_risks_evidence}
                      onChange={(e) => setForm({ ...form, received_risks_evidence: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Riscos de interacao */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div>
                  <label className="block text-slate-300 font-bold">
                    Riscos resultantes da interação das atividades
                    <span className="text-slate-500 font-normal"> (subitem 1.5.8.4)</span>
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Risco que nenhuma das duas tem sozinha e que aparece porque as atividades
                    convivem: solda na área da limpeza, empilhadeira na rota de quem monta, químico
                    volátil onde há trabalho a quente.
                  </p>
                </div>
                <div className="flex gap-2">
                  {([
                    ['SIM', 'Há riscos de interação'],
                    ['NAO', 'Avaliado: não há']
                  ] as const).map(([valor, rotulo]) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setForm({ ...form, interaction_risks: valor })}
                      className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                        form.interaction_risks === valor
                          ? 'bg-teal-500 text-slate-950 border-teal-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {rotulo}
                    </button>
                  ))}
                  {form.interaction_risks && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, interaction_risks: '' })}
                      className="px-3 py-1.5 text-slate-500 hover:text-slate-300"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                {!form.interaction_risks && (
                  <p className="text-[10px] text-amber-400 flex items-start gap-1.5">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" />
                    Em branco não é &quot;não há&quot;: é avaliação que ninguém fez, e sai como
                    pendência no PGR.
                  </p>
                )}
                {form.interaction_risks === 'SIM' && (
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Medidas definidas em conjunto, sob coordenação do contratante
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex.: permissão de trabalho conjunta, isolamento da área, reunião diária de compatibilização, responsável do contratante pela coordenação"
                      value={form.joint_measures}
                      onChange={(e) => setForm({ ...form, joint_measures: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      A coordenação é do contratante — o subitem 1.5.8.4 não a divide.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Observações</label>
                <input
                  type="text"
                  placeholder="Número do contrato, vigência, preposto responsável"
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
                  {editando ? 'Atualizar Contratada' : 'Salvar Contratada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
