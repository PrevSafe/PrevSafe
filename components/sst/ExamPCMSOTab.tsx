'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { SSTExamProtocol, Employee } from '@/types';
import { 
  Stethoscope, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  CheckCircle2, 
  HeartPulse, 
  Activity, 
  FileCheck2,
  Clock,
  Building2,
  Info
} from 'lucide-react';

interface ExamPCMSOTabProps {
  selectedClientId: string;
}

const todayISO = () => new Date().toISOString().split('T')[0];
const addYearsISO = (years: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
};

export const ExamPCMSOTab: React.FC<ExamPCMSOTabProps> = ({ selectedClientId }) => {
  const {
    examProtocols,
    ghes,
    employees,
    addExamProtocol,
    updateExamProtocol,
    deleteExamProtocol,
    addEmployeeAso,
    generateS2220FromEmployeeAso
  } = usePrevSafe();

  const [activeSubTab, setActiveSubTab] = useState<'PROTOCOLS' | 'APPLICATIONS'>('PROTOCOLS');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Protocol Modal
  const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<SSTExamProtocol | null>(null);
  const [protocolForm, setProtocolForm] = useState<{
    ghe_id: string;
    exam_name: string;
    exam_code_table_27: string;
    periodicity_months: number;
    triggers: Array<'ADMISSIONAL' | 'PERIODICO' | 'RETORNO_TRABALHO' | 'MUDANCA_RISCO' | 'DEMISSIONAL'>;
    mandatory_by_standard: 'NR-07' | 'NR-11' | 'NR-15' | 'NR-35' | 'NR-33' | 'NR-10' | 'CRITERIO_MEDICO';
    preparation_instructions: string;
  }>({
    ghe_id: '',
    exam_name: '',
    exam_code_table_27: '',
    periodicity_months: 12,
    triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'],
    mandatory_by_standard: 'NR-07',
    preparation_instructions: ''
  });

  // Apply ASO Modal
  const [isAsoModalOpen, setIsAsoModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || '');
  const [asoForm, setAsoForm] = useState<{
    aso_type: 'ADMISSIONAL' | 'PERIODICO' | 'RETORNO_TRABALHO' | 'MUDANCA_RISCO' | 'DEMISSIONAL';
    issue_date: string;
    validity_date: string;
    doctor_name: string;
    doctor_crm: string;
    doctor_crm_state: string;
    result: 'APTO' | 'INAPTO' | 'APTO_COM_RESTRICAO';
    restrictions_description: string;
  }>({
    aso_type: 'PERIODICO',
    issue_date: todayISO(),
    validity_date: addYearsISO(1),
    doctor_name: '',
    doctor_crm: '',
    doctor_crm_state: '',
    result: 'APTO',
    restrictions_description: ''
  });

  const [generatedS2220Success, setGeneratedS2220Success] = useState<string | null>(null);

  const clientExams = examProtocols.filter(e => {
    if (!selectedClientId) return true;
    const ghe = ghes.find(g => g.id === e.ghe_id);
    return !ghe || ghe.client_id === selectedClientId;
  });

  const clientEmployees = employees.filter(emp => !selectedClientId || emp.client_id === selectedClientId);

  const filteredProtocols = clientExams.filter(p => 
    p.exam_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.exam_code_table_27.includes(searchTerm) ||
    (p.preparation_instructions && p.preparation_instructions.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenProtocolModal = (protocol?: SSTExamProtocol) => {
    if (protocol) {
      setEditingProtocol(protocol);
      setProtocolForm({
        ghe_id: protocol.ghe_id,
        exam_name: protocol.exam_name,
        exam_code_table_27: protocol.exam_code_table_27,
        periodicity_months: protocol.periodicity_months || 12,
        triggers: protocol.triggers || ['PERIODICO'],
        mandatory_by_standard: protocol.mandatory_by_standard || 'NR-07',
        preparation_instructions: protocol.preparation_instructions || ''
      });
    } else {
      setEditingProtocol(null);
      setProtocolForm({
        ghe_id: ghes[0]?.id || '',
        exam_name: '',
        exam_code_table_27: '',
        periodicity_months: 12,
        triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'],
        mandatory_by_standard: 'NR-07',
        preparation_instructions: ''
      });
    }
    setIsProtocolModalOpen(true);
  };

  const handleSaveProtocol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!protocolForm.exam_name || !protocolForm.exam_code_table_27) return;

    const selectedGhe = ghes.find(g => g.id === protocolForm.ghe_id);

    if (editingProtocol) {
      updateExamProtocol(editingProtocol.id, {
        ...protocolForm,
        client_id: selectedGhe?.client_id || selectedClientId || ''
      });
    } else {
      addExamProtocol({
        client_id: selectedGhe?.client_id || selectedClientId || '',
        ghe_id: protocolForm.ghe_id || ghes[0]?.id || '',
        exam_name: protocolForm.exam_name,
        exam_code_table_27: protocolForm.exam_code_table_27,
        periodicity_months: protocolForm.periodicity_months,
        triggers: protocolForm.triggers,
        mandatory_by_standard: protocolForm.mandatory_by_standard,
        preparation_instructions: protocolForm.preparation_instructions,
        status: 'ACTIVE'
      });
    }
    setIsProtocolModalOpen(false);
  };

  const handleApplyAso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    addEmployeeAso(selectedEmployeeId, {
      aso_type: asoForm.aso_type,
      exam_date: asoForm.issue_date,
      valid_until: asoForm.validity_date,
      physician_name: asoForm.doctor_name,
      physician_crm: asoForm.doctor_crm,
      physician_uf: asoForm.doctor_crm_state,
      result: asoForm.result,
      restrictions_notes: asoForm.restrictions_description || undefined
    });
    
    // Auto-generate S-2220
    const evt = generateS2220FromEmployeeAso(selectedEmployeeId, `aso-${Date.now()}`);
    if (evt) {
      setGeneratedS2220Success(`ASO emitido com sucesso! Evento eSocial S-2220 (${evt.event_number}) pronto para assinatura A1.`);
      setTimeout(() => setGeneratedS2220Success(null), 5000);
    }

    setIsAsoModalOpen(false);
  };

  return (
    <div className="space-y-6" id="exam-pcmso-tab-container">
      {/* Top Banner Alert */}
      {generatedS2220Success && (
        <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center justify-between text-xs text-teal-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
            <span className="font-semibold">{generatedS2220Success}</span>
          </div>
          <span className="text-[11px] bg-teal-500 text-slate-950 font-bold px-2 py-1 rounded">S-2220 Criado</span>
        </div>
      )}

      {/* Sub Tabs and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            id="subtab-protocols-btn"
            onClick={() => setActiveSubTab('PROTOCOLS')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'PROTOCOLS'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            Matriz de Exames PCMSO ({clientExams.length})
          </button>
          <button
            type="button"
            id="subtab-applications-btn"
            onClick={() => setActiveSubTab('APPLICATIONS')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'APPLICATIONS'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            Aplicação de ASOs & Monitoramento eSocial ({clientEmployees.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="exam-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar exame ou código Tabela 27..."
              className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {activeSubTab === 'PROTOCOLS' ? (
            <button
              type="button"
              id="add-protocol-btn"
              onClick={() => handleOpenProtocolModal()}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Protocolo de Exame
            </button>
          ) : (
            <button
              type="button"
              id="apply-aso-btn"
              onClick={() => setIsAsoModalOpen(true)}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Emitir ASO & Gerar S-2220
            </button>
          )}
        </div>
      </div>

      {/* Info Card explaining PCMSO & S-2220 Flow */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-slate-100">
            Regra Técnica NR-07 & Evento eSocial S-2220 (Monitoramento da Saúde do Trabalhador):
          </p>
          <p className="text-slate-400">
            Os exames definidos para cada GHE determinam os protocolos ocupacionais do PCMSO. Cada ASO emitido (Admissional, Periódico, Demissional, Retorno ao Trabalho ou Mudança de Riscos Ocupacionais) gera automaticamente o evento XML S-2220 com o médico coordenador/examinador, CRM, data e parecer de aptidão.
          </p>
        </div>
      </div>

      {/* Protocols View */}
      {activeSubTab === 'PROTOCOLS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="protocols-grid">
          {filteredProtocols.map((protocol) => {
            const ghe = ghes.find(g => g.id === protocol.ghe_id);

            return (
              <div 
                key={protocol.id} 
                id={`protocol-card-${protocol.id}`}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[10px] font-mono font-bold rounded">
                      Cód. Tab 27: {protocol.exam_code_table_27}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded font-semibold">
                      {protocol.mandatory_by_standard}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-100 text-sm mt-2">{protocol.exam_name}</h4>
                  
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>GHE: <strong className="text-slate-300">{ghe?.name || 'GHE Geral'}</strong></span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Periodicidade:
                    </span>
                    <strong className="text-slate-200">A cada {protocol.periodicity_months} meses</strong>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {protocol.triggers?.map((t, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-slate-950 text-slate-400 text-[9px] rounded font-mono">
                        {t}
                      </span>
                    ))}
                  </div>

                  {protocol.preparation_instructions && (
                    <p className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80">
                      <strong>Instruções:</strong> {protocol.preparation_instructions}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenProtocolModal(protocol)}
                    className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteExamProtocol(protocol.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Applications (ASO / S-2220) View */}
      {activeSubTab === 'APPLICATIONS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg" id="aso-applications-table">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Trabalhador</th>
                  <th className="py-3 px-4">Cargo / Função</th>
                  <th className="py-3 px-4">Último ASO</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4 text-center">Status ASO</th>
                  <th className="py-3 px-4">Médico Emitente</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {clientEmployees.map((emp) => {
                  const lastAso = emp.aso_history?.[0];
                  return (
                    <tr key={emp.id} id={`emp-aso-row-${emp.id}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100">{emp.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">CPF: {emp.cpf} • Mat: {emp.registration_number}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {emp.job_title}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {lastAso?.exam_date || emp.last_aso_date || emp.admission_date}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {lastAso?.valid_until || emp.next_aso_date || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {emp.current_aso_status || 'VALID'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {lastAso?.physician_name || 'Médico não informado'}{lastAso?.physician_crm ? ` (CRM ${lastAso.physician_crm})` : ''}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => { setSelectedEmployeeId(emp.id); setIsAsoModalOpen(true); }}
                          className="px-2.5 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded text-[11px] transition-colors"
                        >
                          Novo ASO S-2220
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

      {/* Protocol Modal */}
      {isProtocolModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-400" />
                {editingProtocol ? 'Editar Protocolo de Exame PCMSO' : 'Novo Protocolo de Exame Ocupacional'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsProtocolModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProtocol} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">GHE / Grupo de Exposição Aplicável</label>
                <select
                  value={protocolForm.ghe_id}
                  onChange={(e) => setProtocolForm({ ...protocolForm, ghe_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  {ghes.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Nome do Exame</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: Audiometria Tonal Ocupacional"
                    value={protocolForm.exam_name}
                    onChange={(e) => setProtocolForm({ ...protocolForm, exam_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-400 font-semibold mb-1">Cód. Tabela 27</label>
                  <input
                    type="text"
                    required
                    placeholder="0295"
                    value={protocolForm.exam_code_table_27}
                    onChange={(e) => setProtocolForm({ ...protocolForm, exam_code_table_27: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Periodicidade (Meses)</label>
                  <input
                    type="number"
                    required
                    value={protocolForm.periodicity_months}
                    onChange={(e) => setProtocolForm({ ...protocolForm, periodicity_months: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Norma Regulamentadora</label>
                  <select
                    value={protocolForm.mandatory_by_standard}
                    onChange={(e) => setProtocolForm({ ...protocolForm, mandatory_by_standard: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="NR-07">NR-07 (PCMSO Padrão)</option>
                    <option value="NR-15">NR-15 (Insalubridade)</option>
                    <option value="NR-35">NR-35 (Trabalho em Altura)</option>
                    <option value="NR-33">NR-33 (Espaço Confinado)</option>
                    <option value="NR-10">NR-10 (Eletricidade)</option>
                    <option value="CRITERIO_MEDICO">Critério do Médico do Trabalho</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Instruções de Preparo / Orientações</label>
                <textarea
                  rows={2}
                  value={protocolForm.preparation_instructions}
                  onChange={(e) => setProtocolForm({ ...protocolForm, preparation_instructions: e.target.value })}
                  placeholder="Ex.: Repouso auditivo prévio de 14h, jejum de 8h..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProtocolModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md"
                >
                  Salvar Protocolo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASO Application Modal */}
      {isAsoModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-teal-400" />
                Emissão de ASO & Geração de Evento S-2220
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAsoModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyAso} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Colaborador / Trabalhador</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500 font-semibold"
                >
                  {clientEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} (CPF: {emp.cpf})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tipo de ASO (eSocial)</label>
                  <select
                    value={asoForm.aso_type}
                    onChange={(e) => setAsoForm({ ...asoForm, aso_type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="ADMISSIONAL">1 - Admissional</option>
                    <option value="PERIODICO">2 - Periódico</option>
                    <option value="RETORNO_TRABALHO">3 - Retorno ao Trabalho</option>
                    <option value="MUDANCA_RISCO">4 - Mudança de Riscos Ocupacionais</option>
                    <option value="DEMISSIONAL">5 - Demissional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Resultado da Aptidão</label>
                  <select
                    value={asoForm.result}
                    onChange={(e) => setAsoForm({ ...asoForm, result: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500 font-bold text-teal-400"
                  >
                    <option value="APTO">1 - APTO</option>
                    <option value="INAPTO">2 - INAPTO</option>
                    <option value="APTO_COM_RESTRICAO">3 - Apto com Restrições</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Data de Realização do ASO</label>
                  <input
                    type="date"
                    required
                    value={asoForm.issue_date}
                    onChange={(e) => setAsoForm({ ...asoForm, issue_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Data de Validade</label>
                  <input
                    type="date"
                    required
                    value={asoForm.validity_date}
                    onChange={(e) => setAsoForm({ ...asoForm, validity_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Médico Examinador / Emitente</label>
                  <input
                    type="text"
                    required
                    value={asoForm.doctor_name}
                    onChange={(e) => setAsoForm({ ...asoForm, doctor_name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-400 font-semibold mb-1">CRM / UF</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      required
                      placeholder="189204"
                      value={asoForm.doctor_crm}
                      onChange={(e) => setAsoForm({ ...asoForm, doctor_crm: e.target.value })}
                      className="w-2/3 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-slate-100 font-mono"
                    />
                    <input
                      type="text"
                      required
                      maxLength={2}
                      placeholder="SP"
                      value={asoForm.doctor_crm_state}
                      onChange={(e) => setAsoForm({ ...asoForm, doctor_crm_state: e.target.value.toUpperCase() })}
                      className="w-1/3 bg-slate-900 border border-slate-700 rounded-lg px-1 py-2 text-slate-100 font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAsoModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md"
                >
                  Emitir ASO & Criar S-2220
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
