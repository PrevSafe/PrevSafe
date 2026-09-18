'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { SSTCATRecord, SSTWorkAbsence } from '@/types';
import { 
  AlertOctagon, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Send, 
  BedDouble,
  Info
} from 'lucide-react';

interface CatAndAbsenceTabProps {
  selectedClientId: string;
}

const todayISO = () => new Date().toISOString().split('T')[0];
const addDaysISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const CatAndAbsenceTab: React.FC<CatAndAbsenceTabProps> = ({ selectedClientId }) => {
  const {
    catRecords,
    workAbsences,
    employees,
    units,
    addCatRecord,
    transmitCatRecord,
    addWorkAbsence,
    transmitWorkAbsence,
    generateS2210FromCat,
    generateS2230FromAbsence
  } = usePrevSafe();

  const [activeSubTab, setActiveSubTab] = useState<'CAT' | 'ABSENCE'>('CAT');
  const [searchTerm, setSearchTerm] = useState('');

  // CAT Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState<{
    employee_id: string;
    cat_type: 'INICIAL' | 'REABERTURA' | 'COMUNICACAO_OBITO';
    accident_type: 'TIPICO' | 'TRAJETO' | 'DOENCA_OCUPACIONAL';
    accident_date: string;
    accident_time: string;
    hours_worked_before_accident: string;
    death_occurred: boolean;
    death_date?: string;
    police_report: boolean;
    location_type: 'ESTABELECIMENTO_EMPREGADOR' | 'EMPRESA_TERCEIRA' | 'VIA_PUBLICA' | 'EMBARCACAO' | 'OUTROS';
    location_description: string;
    body_part_code: string;
    body_part_name: string;
    causative_agent_code: string;
    causative_agent_name: string;
    medical_name: string;
    medical_crm: string;
    medical_uf: string;
    cid_10: string;
    days_away: number;
    treatment_type: 'AMBULATORIAL' | 'INTERNACAO';
  }>({
    employee_id: employees[0]?.id || '',
    cat_type: 'INICIAL',
    accident_type: 'TIPICO',
    accident_date: todayISO(),
    accident_time: '',
    hours_worked_before_accident: '',
    death_occurred: false,
    police_report: false,
    location_type: 'ESTABELECIMENTO_EMPREGADOR',
    location_description: '',
    body_part_code: '',
    body_part_name: '',
    causative_agent_code: '',
    causative_agent_name: '',
    medical_name: '',
    medical_crm: '',
    medical_uf: '',
    cid_10: '',
    days_away: 0,
    treatment_type: 'AMBULATORIAL'
  });

  // Absence Modal
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absenceForm, setAbsenceForm] = useState<{
    employee_id: string;
    reason_code_table_18: string;
    reason_description: string;
    start_date: string;
    end_date: string;
    estimated_days: number;
    is_traffic_accident: boolean;
    physician_name: string;
    physician_crm: string;
    physician_uf: string;
    cid_10: string;
  }>({
    employee_id: employees[0]?.id || '',
    reason_code_table_18: '01',
    reason_description: '01 - Acidente de trabalho / doença do trabalho',
    start_date: todayISO(),
    end_date: addDaysISO(1),
    estimated_days: 1,
    is_traffic_accident: false,
    physician_name: '',
    physician_crm: '',
    physician_uf: '',
    cid_10: ''
  });

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const clientEmployees = employees.filter(e => !selectedClientId || e.client_id === selectedClientId);

  const filteredCats = catRecords.filter(c => {
    if (selectedClientId && c.client_id !== selectedClientId) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return c.worker_name.toLowerCase().includes(q) || 
             c.cid_10.toLowerCase().includes(q) ||
             c.cat_number.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredAbsences = workAbsences.filter(a => {
    if (selectedClientId && a.client_id !== selectedClientId) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return a.worker_name.toLowerCase().includes(q) || 
             (a.cid_10 && a.cid_10.toLowerCase().includes(q)) ||
             a.reason_description.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSaveCat = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(x => x.id === catForm.employee_id);
    if (!emp || !catForm.cid_10) return;

    const newCat = addCatRecord({
      client_id: emp.client_id,
      employee_id: emp.id,
      cat_number: `CAT-${new Date().getFullYear()}-${String(catRecords.length + 1).padStart(6, '0')}`,
      worker_name: emp.name,
      worker_cpf: emp.cpf,
      worker_registration: emp.registration_number,
      worker_cbo: emp.cbo || '7212-05',
      worker_role: emp.job_title || 'Operador',
      cat_type: catForm.cat_type,
      accident_date: catForm.accident_date,
      accident_time: catForm.accident_time,
      accident_type: catForm.accident_type,
      hours_worked_before_accident: catForm.hours_worked_before_accident,
      death_occurred: catForm.death_occurred,
      death_date: catForm.death_date,
      police_report: catForm.police_report,
      location_type: catForm.location_type,
      location_description: catForm.location_description,
      body_part_code: catForm.body_part_code,
      body_part_name: catForm.body_part_name,
      causative_agent_code: catForm.causative_agent_code,
      causative_agent_name: catForm.causative_agent_name,
      medical_name: catForm.medical_name,
      medical_crm: catForm.medical_crm,
      medical_uf: catForm.medical_uf,
      cid_10: catForm.cid_10,
      days_away: catForm.days_away,
      treatment_type: catForm.treatment_type,
      status: 'READY_TO_SEND'
    });

    generateS2210FromCat(newCat.id);
    setNotificationMsg(`CAT ${newCat.cat_number} registrada com sucesso! Evento eSocial S-2210 pronto para envio imediato.`);
    setTimeout(() => setNotificationMsg(null), 5000);
    setIsCatModalOpen(false);
  };

  const handleSaveAbsence = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(x => x.id === absenceForm.employee_id);
    if (!emp || !absenceForm.cid_10) return;

    const newAbs = addWorkAbsence({
      client_id: emp.client_id,
      employee_id: emp.id,
      worker_name: emp.name,
      worker_cpf: emp.cpf,
      worker_registration: emp.registration_number,
      worker_cbo: emp.cbo || '7212-05',
      reason_code_table_18: absenceForm.reason_code_table_18,
      reason_description: absenceForm.reason_description,
      start_date: absenceForm.start_date,
      end_date: absenceForm.end_date,
      estimated_days: absenceForm.estimated_days,
      is_traffic_accident: absenceForm.is_traffic_accident,
      physician_name: absenceForm.physician_name,
      physician_crm: absenceForm.physician_crm,
      physician_uf: absenceForm.physician_uf,
      cid_10: absenceForm.cid_10,
      status: 'ACTIVE_AWAY'
    });

    generateS2230FromAbsence(newAbs.id);
    setNotificationMsg(`Afastamento registrado! Evento eSocial S-2230 gerado com sucesso.`);
    setTimeout(() => setNotificationMsg(null), 5000);
    setIsAbsenceModalOpen(false);
  };

  const handleTransmitCat = (catId: string) => {
    transmitCatRecord(catId);
    setNotificationMsg('Evento S-2210 transmitido ao Ambiente Nacional do eSocial com recibo gerado!');
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleTransmitAbsence = (absId: string) => {
    transmitWorkAbsence(absId);
    setNotificationMsg('Evento S-2230 transmitido ao eSocial com sucesso!');
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  return (
    <div className="space-y-6" id="cat-absence-tab-container">
      {notificationMsg && (
        <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center justify-between text-xs text-teal-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
            <span className="font-semibold">{notificationMsg}</span>
          </div>
          <span className="text-[11px] bg-teal-500 text-slate-950 font-bold px-2 py-1 rounded">eSocial Notificado</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            id="subtab-cat-btn"
            onClick={() => setActiveSubTab('CAT')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'CAT'
                ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            Comunicação de Acidente (CAT / S-2210) ({filteredCats.length})
          </button>
          <button
            type="button"
            id="subtab-absence-btn"
            onClick={() => setActiveSubTab('ABSENCE')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'ABSENCE'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BedDouble className="w-4 h-4" />
            Afastamentos Temporários (S-2230) ({filteredAbsences.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="cat-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar colaborador ou CID..."
              className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {activeSubTab === 'CAT' ? (
            <button
              type="button"
              id="add-cat-btn"
              onClick={() => setIsCatModalOpen(true)}
              className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Emitir Nova CAT (S-2210)
            </button>
          ) : (
            <button
              type="button"
              id="add-absence-btn"
              onClick={() => setIsAbsenceModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Lançar Afastamento (S-2230)
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-slate-100">
            Regras de Prazos Legais eSocial & Previdência Social:
          </p>
          <p className="text-slate-400">
            • <strong>CAT (S-2210):</strong> Prazo de transmissão de até 1 dia útil após o acidente (ou imediatamente em caso de óbito).<br/>
            • <strong>Afastamentos (S-2230):</strong> Transmissão até o dia 15 do mês subsequente ou até 3 dias úteis para afastamentos por acidente de trabalho.
          </p>
        </div>
      </div>

      {activeSubTab === 'CAT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="cat-records-grid">
          {filteredCats.map((cat) => {
            return (
              <div 
                key={cat.id} 
                id={`cat-card-${cat.id}`}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-mono font-bold rounded">
                        {cat.cat_number} • {cat.cat_type}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded">
                        Acidente {cat.accident_type}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-100 text-sm mt-1">{cat.worker_name}</h4>
                    <p className="text-xs text-slate-400 font-mono">CPF: {cat.worker_cpf} • Matrícula: {cat.worker_registration}</p>
                  </div>

                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      cat.status === 'TRANSMITTED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    }`}>
                      {cat.status}
                    </span>
                    {cat.receipt_number && (
                      <p className="text-[10px] text-slate-500 font-mono mt-1">Rec: {cat.receipt_number}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Data & Hora do Acidente:</span>
                    <span>{cat.accident_date} às {cat.accident_time}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Parte do Corpo Atingida:</span>
                    <span className="truncate block">{cat.body_part_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Agente Causador:</span>
                    <span className="truncate block">{cat.causative_agent_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Diagnóstico Médico / CID-10:</span>
                    <span className="font-mono text-rose-400 font-bold">{cat.cid_10}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">
                    Afastamento: <strong className="text-slate-200">{cat.days_away} dias</strong> • Dr. {cat.medical_name}
                  </span>

                  {cat.status !== 'TRANSMITTED' ? (
                    <button
                      type="button"
                      onClick={() => handleTransmitCat(cat.id)}
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-lg transition-all flex items-center gap-1 text-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Transmitir S-2210
                    </button>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Transmitido com Recibo
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeSubTab === 'ABSENCE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg" id="absences-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Trabalhador</th>
                  <th className="py-3 px-4">Motivo eSocial (Tab. 18)</th>
                  <th className="py-3 px-4">Período Afastamento</th>
                  <th className="py-3 px-4">CID-10</th>
                  <th className="py-3 px-4">Médico Atestante</th>
                  <th className="py-3 px-4 text-center">Status eSocial</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAbsences.map((abs) => {
                  return (
                    <tr key={abs.id} id={`absence-row-${abs.id}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100">{abs.worker_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Matrícula: {abs.worker_registration}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono rounded">
                          Cód {abs.reason_code_table_18}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {abs.reason_description}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {abs.start_date} até {abs.end_date || 'Indeterminado'} ({abs.estimated_days} dias)
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-400">
                        {abs.cid_10 || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {abs.physician_name} (CRM {abs.physician_crm}/{abs.physician_uf})
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {abs.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleTransmitAbsence(abs.id)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] transition-colors"
                        >
                          Enviar S-2230
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isCatModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-500" />
                Registrar Comunicação de Acidente de Trabalho (CAT / S-2210)
              </h3>
              <button 
                type="button" 
                onClick={() => setIsCatModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCat} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Colaborador Acidentado</label>
                  <select
                    value={catForm.employee_id}
                    onChange={(e) => setCatForm({ ...catForm, employee_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    {clientEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} (CPF: {emp.cpf})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tipo de Acidente (eSocial)</label>
                  <select
                    value={catForm.accident_type}
                    onChange={(e) => setCatForm({ ...catForm, accident_type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="TIPICO">1 - Típico (No local de trabalho)</option>
                    <option value="TRAJETO">2 - De Trajeto (Ida/Volta)</option>
                    <option value="DOENCA_OCUPACIONAL">3 - Doença Ocupacional</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Data do Acidente</label>
                  <input
                    type="date"
                    required
                    value={catForm.accident_date}
                    onChange={(e) => setCatForm({ ...catForm, accident_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Hora do Acidente</label>
                  <input
                    type="time"
                    required
                    value={catForm.accident_time}
                    onChange={(e) => setCatForm({ ...catForm, accident_time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Horas Trabalhadas Antes</label>
                  <input
                    type="text"
                    value={catForm.hours_worked_before_accident}
                    onChange={(e) => setCatForm({ ...catForm, hours_worked_before_accident: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Local Exato do Acidente</label>
                <input
                  type="text"
                  required
                  value={catForm.location_description}
                  onChange={(e) => setCatForm({ ...catForm, location_description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Parte do Corpo (Tabela 13 eSocial)</label>
                  <input
                    type="text"
                    required
                    value={catForm.body_part_name}
                    onChange={(e) => setCatForm({ ...catForm, body_part_name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Agente Causador (Tabela 14 eSocial)</label>
                  <input
                    type="text"
                    required
                    value={catForm.causative_agent_name}
                    onChange={(e) => setCatForm({ ...catForm, causative_agent_name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Código CID-10 & Diagnóstico</label>
                  <input
                    type="text"
                    required
                    value={catForm.cid_10}
                    onChange={(e) => setCatForm({ ...catForm, cid_10: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Dias de Afastamento</label>
                  <input
                    type="number"
                    value={catForm.days_away}
                    onChange={(e) => setCatForm({ ...catForm, days_away: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Médico Atestante</label>
                  <input
                    type="text"
                    required
                    value={catForm.medical_name}
                    onChange={(e) => setCatForm({ ...catForm, medical_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-400 font-semibold mb-1">CRM / UF</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      required
                      value={catForm.medical_crm}
                      onChange={(e) => setCatForm({ ...catForm, medical_crm: e.target.value })}
                      className="w-2/3 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-slate-100 font-mono"
                    />
                    <input
                      type="text"
                      required
                      maxLength={2}
                      value={catForm.medical_uf}
                      onChange={(e) => setCatForm({ ...catForm, medical_uf: e.target.value.toUpperCase() })}
                      className="w-1/3 bg-slate-950 border border-slate-700 rounded-lg px-1 py-2 text-slate-100 font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-lg shadow-md"
                >
                  Emitir CAT & Gerar S-2210
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAbsenceModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-amber-400" />
                Registrar Afastamento Temporário (S-2230)
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAbsenceModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAbsence} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Trabalhador Afastado</label>
                <select
                  value={absenceForm.employee_id}
                  onChange={(e) => setAbsenceForm({ ...absenceForm, employee_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  {clientEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} (CPF: {emp.cpf})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Motivo do Afastamento (Tabela 18 eSocial)</label>
                <select
                  value={absenceForm.reason_code_table_18}
                  onChange={(e) => {
                    const code = e.target.value;
                    const desc = code === '01' ? '01 - Acidente de trabalho / doença do trabalho' :
                                 code === '03' ? '03 - Acidente / doença não relacionada ao trabalho' :
                                 code === '17' ? '17 - Licença maternidade' : '21 - Licença sem remuneração';
                    setAbsenceForm({ ...absenceForm, reason_code_table_18: code, reason_description: desc });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="01">01 - Acidente / Doença do Trabalho</option>
                  <option value="03">03 - Acidente / Doença não relacionada ao trabalho</option>
                  <option value="17">17 - Licença Maternidade</option>
                  <option value="21">21 - Licença sem remuneração</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Data Início</label>
                  <input
                    type="date"
                    required
                    value={absenceForm.start_date}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, start_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Previsão Término</label>
                  <input
                    type="date"
                    value={absenceForm.end_date}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, end_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Dias Estimados</label>
                  <input
                    type="number"
                    value={absenceForm.estimated_days}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, estimated_days: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Código CID-10</label>
                  <input
                    type="text"
                    required
                    value={absenceForm.cid_10}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, cid_10: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Médico Emitente (CRM/UF)</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={absenceForm.physician_name}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, physician_name: e.target.value })}
                      placeholder="Nome do Médico"
                      className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-slate-100"
                    />
                    <input
                      type="text"
                      value={absenceForm.physician_crm}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, physician_crm: e.target.value })}
                      placeholder="CRM"
                      className="w-1/4 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-slate-100 font-mono"
                    />
                    <input
                      type="text"
                      maxLength={2}
                      value={absenceForm.physician_uf}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, physician_uf: e.target.value.toUpperCase() })}
                      placeholder="UF"
                      className="w-1/4 bg-slate-900 border border-slate-700 rounded-lg px-1 py-2 text-slate-100 font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAbsenceModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-md"
                >
                  Salvar Afastamento & Gerar S-2230
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
