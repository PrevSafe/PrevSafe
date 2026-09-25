'use client';

/**
 * Maquinas e equipamentos — secao 6.5 do PGR.
 *
 * Compoe a caracterizacao dos processos e ambientes de trabalho (alinea "a" do
 * subitem 1.5.7.3.2 da NR-01): o inventario de riscos aponta o perigo, e esta
 * lista diz em que maquina ele esta e qual evidencia existe.
 *
 * O QUE ESTA TELA NAO FAZ: nao calcula prazo de inspecao da NR-13. O item
 * 13.4.4 e seguintes fazem os prazos maximos variar por categoria da caldeira,
 * pela existencia de SPIE (Anexo II) e por sistema instrumentado de seguranca -
 * de 12 a 48 meses -, e quem os fixa e o Profissional Habilitado. O campo
 * recebe a data que consta do relatorio dele, e o PGR aponta quando ela passou.
 */

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { MachineEquipment, NormaDeMaquina } from '@/types';
import { formatDate } from '@/lib/utils';
import { dataDeHoje } from '@/lib/datas';
import {
  Cog,
  Plus,
  Trash2,
  Edit3,
  Check,
  Info,
  AlertTriangle,
  CheckCircle2,
  Building2
} from 'lucide-react';

interface MachinesEquipmentTabProps {
  selectedClientId: string;
}

const NORMAS: Array<{ valor: NormaDeMaquina; rotulo: string; detalhe: string }> = [
  {
    valor: 'NR_12',
    rotulo: 'NR-12 — máquinas e equipamentos',
    detalhe: 'Puxa a apreciação de riscos (subitem 12.1.9), os sistemas de segurança e o registro das manutenções (subitem 12.11.2).'
  },
  {
    valor: 'NR_13',
    rotulo: 'NR-13 — caldeira, vaso de pressão, tubulação, tanque',
    detalhe: 'Puxa a categoria, as datas de inspeção e o Profissional Habilitado. Autoclave e compressor de ar entram aqui.'
  },
  {
    valor: 'NR_11',
    rotulo: 'NR-11 — transporte e movimentação de materiais',
    detalhe: 'Puxa os operadores habilitados e autorizados e a capacidade de carga sinalizada.'
  }
];

const ESTADOS: Array<{ valor: NonNullable<MachineEquipment['operational_state']>; rotulo: string }> = [
  { valor: 'EM_OPERACAO', rotulo: 'Em operação' },
  { valor: 'PARADA', rotulo: 'Parada' },
  { valor: 'DESATIVADA', rotulo: 'Desativada' }
];

const VAZIO = {
  name: '',
  tag: '',
  manufacturer: '',
  manufacture_year: '',
  location: '',
  client_unit_id: '',
  applicable_norms: [] as NormaDeMaquina[],
  other_requirements: '',
  operational_state: '' as MachineEquipment['operational_state'] | '',
  risk_appraisal_date: '',
  risk_appraisal_author: '',
  safety_systems: '',
  maintenance_record: '',
  nr13_category: '',
  nr13_last_inspection_date: '',
  nr13_next_inspection_date: '',
  nr13_professional: '',
  nr11_operators: '',
  nr11_load_capacity: '',
  notes: ''
};

export const MachinesEquipmentTab: React.FC<MachinesEquipmentTabProps> = ({ selectedClientId }) => {
  const {
    units,
    updateUnit,
    machinesEquipment,
    addMachineEquipment,
    updateMachineEquipment,
    deleteMachineEquipment
  } = usePrevSafe();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editando, setEditando] = useState<MachineEquipment | null>(null);
  const [form, setForm] = useState({ ...VAZIO });

  const unidadesDoCliente = units.filter(
    (u) => u.client_id === selectedClientId && u.status !== 'INACTIVE'
  );
  const estabelecimento = unidadesDoCliente[0] || null;
  const maquinas = machinesEquipment.filter(
    (m) => m.client_id === selectedClientId && m.status !== 'INACTIVE'
  );
  const hoje = dataDeHoje();

  /** O que falta em cada máquina, pela norma que o usuário marcou. */
  const pendenciasDe = (m: MachineEquipment): string[] => {
    const falta: string[] = [];
    const normas = m.applicable_norms || [];
    if (normas.length === 0 && !m.other_requirements) falta.push('normas aplicáveis');
    if (normas.includes('NR_12')) {
      if (!m.risk_appraisal_date) falta.push('apreciação de riscos (12.1.9)');
      if (!m.safety_systems) falta.push('sistemas de segurança');
      if (!m.maintenance_record) falta.push('registro de manutenções (12.11.2)');
    }
    if (normas.includes('NR_13')) {
      if (!m.nr13_category) falta.push('categoria definida pelo PH');
      if (!m.nr13_next_inspection_date) falta.push('próxima inspeção');
      if (!m.nr13_professional) falta.push('Profissional Habilitado');
      if (m.nr13_next_inspection_date && m.nr13_next_inspection_date < hoje) {
        falta.push(`inspeção vencida em ${formatDate(m.nr13_next_inspection_date)}`);
      }
    }
    if (normas.includes('NR_11')) {
      if (!m.nr11_operators) falta.push('operadores habilitados');
      if (!m.nr11_load_capacity) falta.push('capacidade de carga');
    }
    return falta;
  };

  const alternarNorma = (valor: NormaDeMaquina) => {
    setForm((f) => ({
      ...f,
      applicable_norms: f.applicable_norms.includes(valor)
        ? f.applicable_norms.filter((n) => n !== valor)
        : [...f.applicable_norms, valor]
    }));
  };

  const abrirModal = (m?: MachineEquipment) => {
    if (m) {
      setEditando(m);
      setForm({
        name: m.name || '',
        tag: m.tag || '',
        manufacturer: m.manufacturer || '',
        manufacture_year: m.manufacture_year || '',
        location: m.location || '',
        client_unit_id: m.client_unit_id || '',
        applicable_norms: m.applicable_norms || [],
        other_requirements: m.other_requirements || '',
        operational_state: m.operational_state || '',
        risk_appraisal_date: m.risk_appraisal_date || '',
        risk_appraisal_author: m.risk_appraisal_author || '',
        safety_systems: m.safety_systems || '',
        maintenance_record: m.maintenance_record || '',
        nr13_category: m.nr13_category || '',
        nr13_last_inspection_date: m.nr13_last_inspection_date || '',
        nr13_next_inspection_date: m.nr13_next_inspection_date || '',
        nr13_professional: m.nr13_professional || '',
        nr11_operators: m.nr11_operators || '',
        nr11_load_capacity: m.nr11_load_capacity || '',
        notes: m.notes || ''
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
      alert('Informe o nome ou o tipo da máquina.');
      return;
    }

    const dados = {
      client_id: selectedClientId,
      client_unit_id: form.client_unit_id || undefined,
      name: form.name.trim(),
      tag: form.tag.trim() || undefined,
      manufacturer: form.manufacturer.trim() || undefined,
      manufacture_year: form.manufacture_year.trim() || undefined,
      location: form.location.trim() || undefined,
      applicable_norms: form.applicable_norms.length > 0 ? form.applicable_norms : undefined,
      other_requirements: form.other_requirements.trim() || undefined,
      operational_state: (form.operational_state || undefined) as MachineEquipment['operational_state'],
      risk_appraisal_date: form.risk_appraisal_date || undefined,
      risk_appraisal_author: form.risk_appraisal_author.trim() || undefined,
      safety_systems: form.safety_systems.trim() || undefined,
      maintenance_record: form.maintenance_record.trim() || undefined,
      nr13_category: form.nr13_category.trim() || undefined,
      nr13_last_inspection_date: form.nr13_last_inspection_date || undefined,
      nr13_next_inspection_date: form.nr13_next_inspection_date || undefined,
      nr13_professional: form.nr13_professional.trim() || undefined,
      nr11_operators: form.nr11_operators.trim() || undefined,
      nr11_load_capacity: form.nr11_load_capacity.trim() || undefined,
      notes: form.notes.trim() || undefined,
      status: 'ACTIVE' as const
    };

    if (editando) {
      updateMachineEquipment(editando.id, dados);
    } else {
      addMachineEquipment(dados);
      // Cadastrar uma maquina desmente a declaracao de que nao havia nenhuma.
      if (estabelecimento?.no_specific_machines_declared_at) {
        updateUnit(estabelecimento.id, { no_specific_machines_declared_at: undefined });
      }
    }
    setIsModalOpen(false);
  };

  const declarada = estabelecimento?.no_specific_machines_declared_at;

  if (!selectedClientId) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <Cog className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">Selecione um cliente para gerenciar as máquinas e equipamentos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Cog className="w-5 h-5 text-teal-400" />
              Máquinas e Equipamentos
              <span className="text-[11px] font-semibold text-slate-500">NR-12, NR-13 e NR-11</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[46rem]">
              Alimenta a seção 6.5 do PGR. O inventário da seção 7 aponta o perigo; esta lista diz
              em que máquina ele está e qual evidência existe. Marque só as normas que realmente
              se aplicam — cada uma cobra documentos diferentes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => abrirModal()}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Máquina
          </button>
        </div>
      </div>

      {maquinas.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          {declarada ? (
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-slate-200 font-semibold">
                  Declarado em {formatDate(declarada)}: nenhuma máquina com requisito específico.
                </p>
                <p className="text-xs text-slate-400">
                  A seção 6.5 do PGR sai com essa declaração e a data. Confira antes de manter:
                  autoclave, compressor de ar e caldeira são equipamentos da NR-13 mesmo em
                  atividade administrativa ou de saúde.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    estabelecimento
                    && updateUnit(estabelecimento.id, { no_specific_machines_declared_at: undefined })
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
                  Nenhuma máquina cadastrada — e nenhuma declaração de que não há.
                </p>
                <p className="text-xs text-slate-400">
                  Lista vazia não é declaração de inexistência. Antes de declarar, verifique se há
                  autoclave, compressor de ar, caldeira, elevador de carga ou empilhadeira: são os
                  equipamentos que passam desapercebidos em atividade não industrial.
                </p>
                {estabelecimento ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateUnit(estabelecimento.id, { no_specific_machines_declared_at: dataDeHoje() })
                    }
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs border border-slate-700"
                  >
                    Declarar que não há máquina com requisito de NR-12, NR-13 ou NR-11
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

      {maquinas.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 text-left">Máquina / equipamento</th>
                <th className="py-3 px-4 text-left">Local</th>
                <th className="py-3 px-4 text-left">Normas</th>
                <th className="py-3 px-4 text-left">O que falta</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {maquinas.map((m) => {
                const falta = pendenciasDe(m);
                const vencida = !!m.nr13_next_inspection_date && m.nr13_next_inspection_date < hoje;
                return (
                  <tr key={m.id} className="hover:bg-slate-950/50 align-top">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-100">{m.name}</p>
                      {m.tag && <p className="text-[10px] text-slate-500 font-mono">{m.tag}</p>}
                      {m.manufacturer && (
                        <p className="text-[10px] text-slate-500">
                          {[m.manufacturer, m.manufacture_year].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {m.location || <span className="text-slate-600">—</span>}
                      {m.operational_state && (
                        <p className="text-[10px] text-slate-500">
                          {ESTADOS.find((e) => e.valor === m.operational_state)?.rotulo}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(m.applicable_norms || []).map((n) => (
                          <span
                            key={n}
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                              n === 'NR_13' && vencida
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {n.replace('_', '-')}
                          </span>
                        ))}
                        {(m.applicable_norms || []).length === 0 && !m.other_requirements && (
                          <span className="text-amber-400">Não classificada</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {falta.length === 0 ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completo
                        </span>
                      ) : (
                        <span className={vencida ? 'text-rose-300' : 'text-amber-400'}>
                          {falta.join('; ')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => abrirModal(m)}
                          className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Editar máquina"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remover ${m.name}?`)) deleteMachineEquipment(m.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Remover máquina"
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
                <Cog className="w-5 h-5 text-teal-400" />
                {editando ? 'Editar Máquina ou Equipamento' : 'Cadastrar Máquina ou Equipamento'}
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
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Nome ou tipo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: Autoclave horizontal 100 L; Prensa excêntrica 40 t"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tag / patrimônio</label>
                  <input
                    type="text"
                    placeholder="MAQ-014"
                    value={form.tag}
                    onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Fabricante</label>
                  <input
                    type="text"
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Ano</label>
                  <input
                    type="text"
                    placeholder="2019"
                    value={form.manufacture_year}
                    onChange={(e) => setForm({ ...form, manufacture_year: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Estado</label>
                  <select
                    value={form.operational_state || ''}
                    onChange={(e) =>
                      setForm({ ...form, operational_state: (e.target.value || '') as any })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  >
                    <option value="">Não informado</option>
                    {ESTADOS.map((s) => (
                      <option key={s.valor} value={s.valor}>{s.rotulo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Local de instalação</label>
                  <input
                    type="text"
                    placeholder="Ex.: sala de esterilização; galpão de produção, linha 2"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
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
                      <option value="">Não vinculada a um estabelecimento específico</option>
                      {unidadesDoCliente.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Normas aplicaveis: nada vem marcado */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div>
                  <label className="block text-slate-300 font-bold">Normas aplicáveis</label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Nada vem marcado: marcar NR-12 em tudo enche o PGR de exigência que não se
                    aplica, e não marcar nada esconde a caldeira.
                  </p>
                </div>
                {NORMAS.map((n) => (
                  <label key={n.valor} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.applicable_norms.includes(n.valor)}
                      onChange={() => alternarNorma(n.valor)}
                      className="mt-0.5 accent-teal-500"
                    />
                    <span>
                      <span className="text-slate-200 font-semibold">{n.rotulo}</span>
                      <span className="block text-[10px] text-slate-500">{n.detalhe}</span>
                    </span>
                  </label>
                ))}
                <div className="pt-1">
                  <label className="block text-slate-400 font-semibold mb-1">Outros requisitos</label>
                  <input
                    type="text"
                    placeholder="Ex.: NR-18 para grua de obra; NR-34; norma técnica específica do fabricante"
                    value={form.other_requirements}
                    onChange={(e) => setForm({ ...form, other_requirements: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                {form.applicable_norms.length === 0 && !form.other_requirements.trim() && (
                  <p className="text-[10px] text-amber-400 flex items-start gap-1.5">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" />
                    Sem classificação, a máquina sai como pendência na seção 6.5.
                  </p>
                )}
              </div>

              {form.applicable_norms.includes('NR_12') && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <label className="block text-slate-300 font-bold">NR-12</label>
                  <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        Apreciação de riscos
                      </label>
                      <input
                        type="date"
                        value={form.risk_appraisal_date}
                        onChange={(e) => setForm({ ...form, risk_appraisal_date: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Subitem 12.1.9.</p>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Quem a elaborou</label>
                      <input
                        type="text"
                        placeholder="Nome e registro profissional"
                        value={form.risk_appraisal_author}
                        onChange={(e) => setForm({ ...form, risk_appraisal_author: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Sistemas de segurança e proteções existentes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex.: proteção fixa na transmissão, proteção móvel com chave de segurança e interface, botão de emergência acessível, comando bimanual"
                      value={form.safety_systems}
                      onChange={(e) => setForm({ ...form, safety_systems: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Onde fica o registro das manutenções
                    </label>
                    <input
                      type="text"
                      placeholder="Ex.: ficha de manutenção por equipamento, arquivada na manutenção; sistema X"
                      value={form.maintenance_record}
                      onChange={(e) => setForm({ ...form, maintenance_record: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Subitem 12.11.2: livro, ficha ou sistema, com as intervenções, as peças
                      substituídas, o responsável e a indicação conclusiva quanto às condições de
                      segurança.
                    </p>
                  </div>
                </div>
              )}

              {form.applicable_norms.includes('NR_13') && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div>
                    <label className="block text-slate-300 font-bold">NR-13</label>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      As datas são as do relatório do Profissional Habilitado. O sistema não
                      calcula o prazo: os máximos do item 13.4.4 variam com a categoria, com a
                      existência de SPIE e com sistema instrumentado de segurança, de 12 a 48
                      meses, e é o PH que os fixa.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        Categoria ou classe
                      </label>
                      <input
                        type="text"
                        placeholder="Ex.: caldeira categoria B; vaso classe IV"
                        value={form.nr13_category}
                        onChange={(e) => setForm({ ...form, nr13_category: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        Profissional Habilitado (PH)
                      </label>
                      <input
                        type="text"
                        placeholder="Nome e registro no conselho"
                        value={form.nr13_professional}
                        onChange={(e) => setForm({ ...form, nr13_professional: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        Última inspeção de segurança
                      </label>
                      <input
                        type="date"
                        value={form.nr13_last_inspection_date}
                        onChange={(e) =>
                          setForm({ ...form, nr13_last_inspection_date: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        Próxima, conforme o relatório do PH
                      </label>
                      <input
                        type="date"
                        value={form.nr13_next_inspection_date}
                        onChange={(e) =>
                          setForm({ ...form, nr13_next_inspection_date: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                      />
                      {form.nr13_next_inspection_date
                        && form.nr13_next_inspection_date < hoje && (
                        <p className="text-[10px] text-rose-300 mt-1 flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          Inspeção vencida. Sai como pendência na seção 6.5 do PGR.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {form.applicable_norms.includes('NR_11') && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <label className="block text-slate-300 font-bold">NR-11</label>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Capacidade de carga e sinalização
                    </label>
                    <input
                      type="text"
                      placeholder="Ex.: 2.500 kg, placa afixada na lateral e no posto do operador"
                      value={form.nr11_load_capacity}
                      onChange={(e) => setForm({ ...form, nr11_load_capacity: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Operadores habilitados e autorizados
                    </label>
                    <input
                      type="text"
                      placeholder="Nomes, ou o documento que os autoriza"
                      value={form.nr11_operators}
                      onChange={(e) => setForm({ ...form, nr11_operators: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Observações</label>
                <input
                  type="text"
                  placeholder="Número de série, contrato de manutenção, restrições de operação"
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
                  {editando ? 'Atualizar Máquina' : 'Salvar Máquina'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
