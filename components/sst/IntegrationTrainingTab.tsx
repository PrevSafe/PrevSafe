'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { SSTIntegrationTraining, TrainingAttendee } from '@/types';
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit3,
  Search,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Printer,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ShieldCheck,
  Building2,
  UserCheck,
  Fingerprint,
  Camera,
  X,
  FileDown,
  Info,
  Clock,
  Award,
  Users,
  Calendar,
  BookOpen,
  Check,
  FileText
} from 'lucide-react';
import {
  exportTrainingAttendanceListPDF,
  exportTrainingCertificatePDF,
  exportTrainingAttendanceExcel
} from '@/lib/pdfExportService';
import { formatDate } from '@/lib/utils';
import { dataDeHoje } from '@/lib/datas';

interface IntegrationTrainingTabProps {
  selectedClientId: string;
}

export const IntegrationTrainingTab: React.FC<IntegrationTrainingTabProps> = ({ selectedClientId }) => {
  const {
    organization,
    clients,
    employees,
    units,
    ghes,
    integrationTrainings,
    addIntegrationTraining,
    updateIntegrationTraining,
    deleteIntegrationTraining,
    addAttendeeToTraining,
    updateAttendeeStatus,
    signTrainingAttendance,
    createDefaultAdmissionTrainingForClient
  } = usePrevSafe();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modals
  const [viewingTraining, setViewingTraining] = useState<SSTIntegrationTraining | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signingTrainingId, setSigningTrainingId] = useState<string | null>(null);
  const [signingEmployee, setSigningEmployee] = useState<TrainingAttendee | null>(null);
  const [signatureMethod, setSignatureMethod] = useState<'DIGITAL_BIOMETRIC' | 'PHYSICAL_MANUAL'>('DIGITAL_BIOMETRIC');
  const [isSimulatingBiometry, setIsSimulatingBiometry] = useState(false);

  // New Training Form State
  const [newTrainingTitle, setNewTrainingTitle] = useState('Treinamento de Integração em Segurança e Saúde no Trabalho (NR-01)');
  const [newTrainingType, setNewTrainingType] = useState<'ADMISSION_INTEGRATION' | 'PERIODIC_REFRESHER' | 'ROLE_CHANGE' | 'RETURN_TO_WORK' | 'SPECIAL_NR'>('ADMISSION_INTEGRATION');
  const [newModality, setNewModality] = useState<'PRESENTIAL' | 'HYBRID' | 'EAD_DISTANCE'>('PRESENTIAL');
  const [newWorkloadHours, setNewWorkloadHours] = useState(6);
  const [newValidityMonths, setNewValidityMonths] = useState(12);
  const [newStartDate, setNewStartDate] = useState(dataDeHoje());
  const [newEndDate, setNewEndDate] = useState(dataDeHoje());
  const [newLocation, setNewLocation] = useState('');
  const [newInstructorName, setNewInstructorName] = useState('Carlos Alberto Ferreira');
  const [newInstructorQualif, setNewInstructorQualif] = useState('');
  const [newInstructorReg, setNewInstructorReg] = useState('Reg. MTE nº 0019842');
  const [newSupervisorName, setNewSupervisorName] = useState('');
  const [newSupervisorQualif, setNewSupervisorQualif] = useState('');
  const [newSupervisorReg, setNewSupervisorReg] = useState('CREA-RJ 201812345-D');
  const [newNrFramework, setNewNrFramework] = useState('NR-01 item 1.7, NR-06, NR-12, NR-17 e Artigo 157 da CLT.');
  const [newSyllabusText, setNewSyllabusText] = useState(
    '1. Apresentação da empresa e Políticas de Segurança e Saúde Ocupacional\n' +
    '2. Direitos, deveres e proibições dos empregados (Art. 158 CLT / NR-01 item 1.4.2)\n' +
    '3. Identificação e percepção dos riscos ambientais da empresa (PGR / Inventário de Riscos)\n' +
    '4. Uso correto, guarda, higienização e conservação dos EPIs (NR-06)\n' +
    '5. Segurança na operação de máquinas, equipamentos e postos de trabalho (NR-12 / NR-17)\n' +
    '6. Procedimentos de emergência, combate a princípios de incêndio e rota de fuga (NR-23)\n' +
    '7. Primeiros socorros e fluxo de comunicação imediata de acidentes e CAT (S-2210 eSocial)'
  );
  const [selectedEmployeesForNewTraining, setSelectedEmployeesForNewTraining] = useState<string[]>([]);

  const activeClient = clients.find(c => c.id === selectedClientId) || clients[0];
  const clientTrainings = integrationTrainings.filter(t => !selectedClientId || t.client_id === selectedClientId);

  const filteredTrainings = clientTrainings.filter(t => {
    const matchesSearch =
      t.training_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.training_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.instructor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.attendees.some(a => a.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) || a.employee_cpf.includes(searchTerm));
    const matchesType = filterType === 'ALL' || t.training_type === filterType;
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalTrainingsCount = clientTrainings.length;
  const totalAttendeesCount = clientTrainings.reduce((sum, t) => sum + (t.attendees?.length || 0), 0);
  const signedAttendeesCount = clientTrainings.reduce((sum, t) => sum + (t.attendees?.filter(a => a.signed)?.length || 0), 0);

  const clientEmployees = employees.filter(e => !selectedClientId || e.client_id === selectedClientId);

  const handleToggleSelectEmployee = (empId: string) => {
    setSelectedEmployeesForNewTraining(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleSelectAllEmployees = () => {
    if (selectedEmployeesForNewTraining.length === clientEmployees.length) {
      setSelectedEmployeesForNewTraining([]);
    } else {
      setSelectedEmployeesForNewTraining(clientEmployees.map(e => e.id));
    }
  };

  const handleCreateTraining = () => {
    if (!newTrainingTitle || !newInstructorName || !newSupervisorName) {
      alert('Por favor preencha o título, instrutor e responsável técnico.');
      return;
    }

    const syllabusArray = newSyllabusText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const attendees: TrainingAttendee[] = selectedEmployeesForNewTraining.map(empId => {
      const emp = employees.find(e => e.id === empId);
      const ghe = ghes.find(g => g.id === emp?.ghe_id);
      return {
        employee_id: empId,
        employee_name: emp?.name || 'Colaborador',
        employee_cpf: emp?.cpf || '',
        employee_registration: emp?.registration_number,
        employee_job_title: emp?.job_title || 'Cargo',
        employee_sector: emp?.sector_name || 'Setor',
        employee_ghe_name: ghe?.name || 'GHE Operacional',
        attendance_rate_percent: 100,
        grade_score: 10.0,
        completed: true,
        signed: true,
        signature_method: 'DIGITAL_BIOMETRIC',
        signature_hash: `SHA256-INT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        certificate_code: `CERT-NR01-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        issued_at: new Date().toISOString()
      };
    });

    const count = integrationTrainings.length + 1;
    const trainingCode = `CAP-INT-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

    const created = addIntegrationTraining({
      client_id: activeClient?.id || '',
      client_name: activeClient?.trade_name || activeClient?.legal_name || 'Empresa Cliente',
      training_code: trainingCode,
      training_title: newTrainingTitle,
      training_type: newTrainingType,
      modality: newModality,
      workload_hours: newWorkloadHours,
      validity_months: newValidityMonths,
      start_date: newStartDate,
      end_date: newEndDate,
      location_or_platform: newLocation,
      instructor_name: newInstructorName,
      instructor_qualification: newInstructorQualif,
      instructor_registration_number: newInstructorReg,
      technical_supervisor_name: newSupervisorName,
      technical_supervisor_qualification: newSupervisorQualif,
      technical_supervisor_registration: newSupervisorReg,
      nr_framework: newNrFramework,
      program_content_syllabus: syllabusArray,
      training_evaluation_method: 'THEORETICAL_PRACTICAL_EXAM',
      status: 'COMPLETED',
      certificate_validity_legal_statement: 'Certificamos que o trabalhador cumpriu com êxito a carga horária e o conteúdo programático do Treinamento de Integração em Segurança e Saúde no Trabalho, cumprindo integralmente as exigências legais da Norma Regulamentadora nº 01 (Portaria MTP nº 4.219/2022, subitem 1.7) e das normas setoriais correlatas.',
      notes: 'Treinamento de integração cadastrado com lista de presença e validade jurídica para admissão e fiscalização.',
      attendees
    });

    setIsCreateModalOpen(false);
    setSelectedEmployeesForNewTraining([]);
    setViewingTraining(created);
  };

  const handleQuickCreateAdmissionTraining = () => {
    if (clientEmployees.length === 0) {
      alert('Nenhum colaborador encontrado para esta empresa.');
      return;
    }
    const created = createDefaultAdmissionTrainingForClient(activeClient.id, clientEmployees.map(e => e.id));
    alert(`Sucesso! Treinamento de Integração ${created.training_code} cadastrado com ${created.attendees.length} participantes.`);
    setViewingTraining(created);
  };

  const handleSignConfirm = () => {
    if (!signingTrainingId || !signingEmployee) return;
    setIsSimulatingBiometry(true);
    setTimeout(() => {
      signTrainingAttendance(signingTrainingId, signingEmployee.employee_id, {
        method: signatureMethod,
        photoUrl: signatureMethod === 'DIGITAL_BIOMETRIC' ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' : undefined,
        hash: `SHA256-TRAIN-ATTEND-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
      });
      setIsSimulatingBiometry(false);
      setIsSignModalOpen(false);
      setSigningEmployee(null);

      // Refresh viewing training if open
      if (viewingTraining && viewingTraining.id === signingTrainingId) {
        const updated = integrationTrainings.find(t => t.id === signingTrainingId);
        if (updated) setViewingTraining(updated);
      }
    }, 850);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-superficie border border-borda p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-tinta-2 uppercase tracking-wider">Treinamentos de Integração</p>
            <p className="text-2xl font-black text-tinta mt-1">{totalTrainingsCount}</p>
            <p className="text-[11px] text-tinta-2 mt-0.5">NR-01 item 1.7 (Capacitação)</p>
          </div>
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-800">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-superficie border border-borda p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-tinta-2 uppercase tracking-wider">Trabalhadores Capacitados</p>
            <p className="text-2xl font-black text-marca-escura mt-1">{totalAttendeesCount}</p>
            <p className="text-[11px] text-marca-escura mt-0.5">
              {totalAttendeesCount > 0 ? `${((signedAttendeesCount / totalAttendeesCount) * 100).toFixed(0)}% com presença assinada` : '0%'}
            </p>
          </div>
          <div className="p-3 bg-marca-suave border border-marca-borda rounded-xl text-marca-escura">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-superficie border border-borda p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-tinta-2 uppercase tracking-wider">Atas com Validade Jurídica</p>
            <p className="text-2xl font-black text-teal-700 mt-1">{clientTrainings.filter(t => t.status === 'COMPLETED').length}</p>
            <p className="text-[11px] text-teal-700 mt-0.5">Instrutor & RT com ART/CREA</p>
          </div>
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-800">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-superficie border border-borda p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-tinta-2 uppercase tracking-wider">Empresa Ativa</p>
            <p className="text-sm font-bold text-tinta mt-1 truncate max-w-[150px]">
              {activeClient?.trade_name || activeClient?.legal_name || 'Geral'}
            </p>
            <p className="text-[11px] text-tinta-2 mt-0.5">CNPJ: {activeClient?.document_number || 'S/N'}</p>
          </div>
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-800">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-superficie border border-borda p-4 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-tinta-2 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar treinamento por título, código, instrutor ou participante..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-fundo border border-borda rounded-lg text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-fundo border border-borda rounded-lg text-xs text-tinta py-2 px-3 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="ADMISSION_INTEGRATION">Integração Admissional</option>
            <option value="PERIODIC_REFRESHER">Reciclagem Periódica</option>
            <option value="ROLE_CHANGE">Mudança de Função</option>
            <option value="RETURN_TO_WORK">Retorno ao Trabalho</option>
            <option value="SPECIAL_NR">NR Específica (NR-10/12/35)</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-fundo border border-borda rounded-lg text-xs text-tinta py-2 px-3 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">Status (Todos)</option>
            <option value="COMPLETED">Concluído ✓</option>
            <option value="IN_PROGRESS">Em Andamento ⏳</option>
            <option value="SCHEDULED">Agendado 📅</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleQuickCreateAdmissionTraining}
            className="bg-teal-700 px-3 py-2 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            title="Cria automaticamente o Treinamento de Integração com todos os colaboradores admitidos da empresa"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Gerar Integração Admissional (Lote)
          </button>

          <button
            onClick={() => {
              setSelectedEmployeesForNewTraining(clientEmployees.map(e => e.id));
              setIsCreateModalOpen(true);
            }}
            className="px-3 py-2 bg-superficie-2 hover:bg-superficie-3 text-tinta rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-borda"
          >
            <Plus className="w-3.5 h-3.5" />
            Cadastrar Treinamento
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-superficie border border-borda rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-fundo border-b border-borda text-[11px] font-bold text-tinta-2 uppercase tracking-wider">
                <th className="py-3 px-3">Código / Data</th>
                <th className="py-3 px-3">Título do Treinamento & Tipo</th>
                <th className="py-3 px-3">Instrutor & Responsável Técnico</th>
                <th className="py-3 px-3">Carga Horária & Modalidade</th>
                <th className="py-3 px-3">Participantes (Ata)</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda text-xs text-tinta">
              {filteredTrainings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-tinta-2">
                    <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">Nenhum Treinamento de Integração cadastrado.</p>
                    <p className="text-xs text-tinta-2 mt-1">
                      Clique em &quot;Cadastrar Treinamento&quot; ou &quot;Gerar Integração Admissional (Lote)&quot; para registrar com todos os dados exigidos por lei.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTrainings.map(t => {
                  const signedCount = t.attendees.filter(a => a.signed).length;
                  return (
                    <tr key={t.id} className="hover:bg-superficie-2 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-teal-700">{t.training_code}</div>
                        <div className="text-[11px] text-tinta-2 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(t.start_date)}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-tinta">{t.training_title}</div>
                        <div className="text-[11px] text-tinta-2 mt-0.5">
                          {t.training_type === 'ADMISSION_INTEGRATION' ? (
                            <span className="text-marca-escura font-semibold">Integração Admissional (NR-01)</span>
                          ) : (
                            <span>{t.training_type}</span>
                          )}
                          <span className="text-tinta-2"> • {t.location_or_platform}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-tinta">{t.instructor_name}</div>
                        <div className="text-[11px] text-tinta-2">
                          RT: {t.technical_supervisor_name} ({t.technical_supervisor_registration})
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-tinta">{t.workload_hours} horas</div>
                        <div className="text-[11px] text-tinta-2">
                          {t.modality === 'PRESENTIAL' ? 'Presencial' : t.modality === 'HYBRID' ? 'Semipresencial' : 'EAD'} • Validade {t.validity_months}m
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-tinta">{t.attendees.length} colaboradores</span>
                        </div>
                        <div className="text-[11px] text-marca-escura">
                          {signedCount} assinados ({t.attendees.length > 0 ? ((signedCount / t.attendees.length) * 100).toFixed(0) : 0}%)
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {t.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-marca-suave text-marca-escura border border-marca-borda">
                            <CheckCircle2 className="w-3 h-3" />
                            Homologado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-800 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            {t.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingTraining(t)}
                            className="p-1.5 text-tinta-2 hover:text-tinta hover:bg-superficie-2 rounded-lg transition-colors"
                            title="Visualizar Detalhes e Lista de Presença"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => exportTrainingAttendanceListPDF(t, organization)}
                            className="p-1.5 text-marca-escura hover:text-marca-escura hover:bg-marca-suave rounded-lg transition-colors"
                            title="Exportar Lista de Presença Oficial (PDF)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => exportTrainingAttendanceExcel(t)}
                            className="p-1.5 text-marca-escura hover:text-marca-escura hover:bg-marca-suave rounded-lg transition-colors"
                            title="Exportar Lista em Excel (.xlsx)"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Deseja realmente excluir o treinamento ${t.training_code}?`)) {
                                deleteIntegrationTraining(t.id);
                              }
                            }}
                            className="p-1.5 text-rose-700 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir Treinamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: VIEW / PRINT ATTENDANCE LIST (ATA) ================= */}
      {viewingTraining && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-superficie border border-borda rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-fundo border-b border-borda flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-800">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-tinta">
                    Ata e Lista de Presença de Treinamento - {viewingTraining.training_code}
                  </h3>
                  <p className="text-xs text-tinta-2">
                    {viewingTraining.training_title} • {viewingTraining.client_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingTraining(null)}
                className="p-1.5 text-tinta-2 hover:text-tinta hover:bg-superficie-2 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-tinta">
              {/* Top Legal Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-fundo p-4 rounded-xl border border-borda">
                <div className="space-y-1">
                  <p className="text-teal-700 font-bold uppercase tracking-wider text-[11px] mb-2">Dados do Treinamento</p>
                  <p><span className="text-tinta-2">Empresa:</span> <strong className="text-tinta">{viewingTraining.client_name}</strong></p>
                  <p><span className="text-tinta-2">Carga Horária:</span> {viewingTraining.workload_hours} horas ({viewingTraining.modality === 'PRESENTIAL' ? 'Presencial' : 'Híbrido'})</p>
                  <p><span className="text-tinta-2">Período de Realização:</span> {formatDate(viewingTraining.start_date)} a {formatDate(viewingTraining.end_date)}</p>
                  <p><span className="text-tinta-2">Local / Plataforma:</span> {viewingTraining.location_or_platform}</p>
                  <p><span className="text-tinta-2">Amparo Normativo:</span> <span className="text-tinta font-semibold">{viewingTraining.nr_framework}</span></p>
                </div>

                <div className="space-y-1">
                  <p className="text-teal-700 font-bold uppercase tracking-wider text-[11px] mb-2">Responsabilidade Técnica & Docência</p>
                  <p><span className="text-tinta-2">Instrutor Docente:</span> <strong className="text-tinta">{viewingTraining.instructor_name}</strong></p>
                  <p><span className="text-tinta-2">Qualificação / Registro:</span> {viewingTraining.instructor_qualification} ({viewingTraining.instructor_registration_number})</p>
                  <p><span className="text-tinta-2">Responsável Técnico (RT):</span> <strong className="text-tinta">{viewingTraining.technical_supervisor_name}</strong></p>
                  <p><span className="text-tinta-2">Registro Profissional RT:</span> {viewingTraining.technical_supervisor_registration}</p>
                  <p><span className="text-tinta-2">Avaliação da Aprendizagem:</span> Prova Teórica e Avaliação Prática de Campo</p>
                </div>
              </div>

              {/* Syllabus / Conteúdo Programático */}
              <div className="space-y-2">
                <h4 className="font-bold text-tinta uppercase tracking-wider flex items-center gap-1.5 text-teal-700">
                  <BookOpen className="w-3.5 h-3.5" />
                  Conteúdo Programático Ministrado (NR-01 subitem 1.7.1)
                </h4>
                <div className="p-3 bg-fundo border border-borda rounded-xl space-y-1">
                  {viewingTraining.program_content_syllabus?.map((item, idx) => (
                    <div key={idx} className="text-tinta text-[11px] flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-marca-escura shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendees & Attendance Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-tinta uppercase tracking-wider flex items-center gap-1.5 text-teal-700">
                    <Users className="w-3.5 h-3.5" />
                    Lista Nominal de Presença & Assinaturas ({viewingTraining.attendees.length})
                  </h4>
                </div>

                <div className="bg-fundo border border-borda rounded-xl overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-fundo border-b border-borda text-[10px] font-bold text-tinta-2 uppercase">
                        <th className="py-2.5 px-3">Colaborador (CPF)</th>
                        <th className="py-2.5 px-3">Cargo / Função</th>
                        <th className="py-2.5 px-3">Frequência</th>
                        <th className="py-2.5 px-3">Nota Avaliação</th>
                        <th className="py-2.5 px-3">Assinatura / Biometria</th>
                        <th className="py-2.5 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borda text-xs">
                      {viewingTraining.attendees.map(attendee => (
                        <tr key={attendee.employee_id} className="hover:bg-superficie">
                          <td className="py-2.5 px-3">
                            <strong className="text-tinta">{attendee.employee_name}</strong>
                            <div className="text-[11px] text-tinta-2 font-mono">CPF: {attendee.employee_cpf}</div>
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="text-tinta">{attendee.employee_job_title}</div>
                            <div className="text-[11px] text-tinta-2">{attendee.employee_sector}</div>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 bg-marca-suave text-marca-escura rounded text-[10px] font-bold">
                              {attendee.attendance_rate_percent}%
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-bold text-tinta">{attendee.grade_score?.toFixed(1) || '10.0'}</span> / 10.0
                          </td>

                          <td className="py-2.5 px-3">
                            {attendee.signed ? (
                              <div>
                                <span className="inline-flex items-center gap-1 text-marca-escura font-bold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {attendee.signature_method === 'DIGITAL_BIOMETRIC' ? 'Biometria Facial (IA)' : 'Assinatura Coletada'}
                                </span>
                                {attendee.signature_hash && (
                                  <div className="text-[10px] font-mono text-tinta-2 truncate max-w-[180px]">
                                    Hash: {attendee.signature_hash}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSigningTrainingId(viewingTraining.id);
                                  setSigningEmployee(attendee);
                                  setIsSignModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/20"
                              >
                                <Fingerprint className="w-3 h-3" />
                                Coletar Presença
                              </button>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => exportTrainingCertificatePDF(viewingTraining, attendee, organization)}
                              className="p-1.5 text-teal-700 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                              title="Emitir Certificado Individual de Capacitação"
                            >
                              <Award className="w-3.5 h-3.5" />
                              Certificado
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Legal Validity Term */}
              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-700 text-[11px] leading-relaxed">
                <strong className="text-teal-700 block mb-1">Declaração de Validade Jurídica (NR-01 item 1.7.4):</strong>
                {viewingTraining.certificate_validity_legal_statement}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-fundo border-t border-borda flex items-center justify-between">
              <button
                onClick={() => setViewingTraining(null)}
                className="px-4 py-2 bg-superficie-2 hover:bg-superficie-3 text-tinta rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportTrainingAttendanceExcel(viewingTraining)}
                  className="px-4 py-2 bg-superficie-2 hover:bg-superficie-3 text-marca-escura border border-borda rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-marca-escura" />
                  Excel (.xlsx)
                </button>

                <button
                  onClick={() => exportTrainingAttendanceListPDF(viewingTraining, organization)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Ata de Presença Oficial (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE NEW TRAINING ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-superficie border border-borda rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-fundo border-b border-borda flex items-center justify-between">
              <h3 className="text-base font-bold text-tinta flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-teal-700" />
                Cadastrar Treinamento de Integração (NR-01)
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-tinta-2 hover:text-tinta">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-tinta">Título do Treinamento:</label>
                  <input
                    type="text"
                    value={newTrainingTitle}
                    onChange={e => setNewTrainingTitle(e.target.value)}
                    className="w-full bg-fundo border border-borda rounded-xl p-2.5 text-tinta focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-tinta">Tipo de Capacitação:</label>
                  <select
                    value={newTrainingType}
                    onChange={e => setNewTrainingType(e.target.value as any)}
                    className="w-full bg-fundo border border-borda rounded-xl p-2.5 text-tinta focus:border-teal-500 focus:outline-none"
                  >
                    <option value="ADMISSION_INTEGRATION">Integração Admissional (NR-01)</option>
                    <option value="PERIODIC_REFRESHER">Reciclagem Periódica</option>
                    <option value="ROLE_CHANGE">Mudança de Função / Risco</option>
                    <option value="RETURN_TO_WORK">Retorno ao Trabalho</option>
                    <option value="SPECIAL_NR">NR Específica (NR-10 / 12 / 35)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-tinta">Modalidade:</label>
                  <select
                    value={newModality}
                    onChange={e => setNewModality(e.target.value as any)}
                    className="w-full bg-fundo border border-borda rounded-xl p-2.5 text-tinta focus:border-teal-500 focus:outline-none"
                  >
                    <option value="PRESENTIAL">Presencial</option>
                    <option value="HYBRID">Híbrido (Semipresencial)</option>
                    <option value="EAD_DISTANCE">EAD / Ensino a Distância</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-tinta">Carga Horária (horas):</label>
                  <input
                    type="number"
                    value={newWorkloadHours}
                    onChange={e => setNewWorkloadHours(Number(e.target.value))}
                    className="w-full bg-fundo border border-borda rounded-xl p-2.5 text-tinta focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-tinta">Validade (meses):</label>
                  <input
                    type="number"
                    value={newValidityMonths}
                    onChange={e => setNewValidityMonths(Number(e.target.value))}
                    className="w-full bg-fundo border border-borda rounded-xl p-2.5 text-tinta focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-tinta">Data de Início:</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={e => setNewStartDate(e.target.value)}
                    className="w-full bg-fundo border border-borda rounded-xl p-2.5 text-tinta focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-tinta">Data de Término:</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={e => setNewEndDate(e.target.value)}
                    className="w-full bg-fundo border border-borda rounded-xl p-2.5 text-tinta focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-tinta">Local / Plataforma de Aplicação:</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  className="w-full bg-fundo border border-borda rounded-xl p-2.5 text-tinta focus:border-teal-500 focus:outline-none"
                />
              </div>

              {/* Instructor & Technical Supervisor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-fundo rounded-xl border border-borda">
                <div className="space-y-2">
                  <p className="font-bold text-teal-700 text-[11px] uppercase">Instrutor Docente</p>
                  <input
                    type="text"
                    placeholder="Nome do Instrutor"
                    value={newInstructorName}
                    onChange={e => setNewInstructorName(e.target.value)}
                    className="w-full bg-superficie border border-borda rounded-lg p-2 text-tinta text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Qualificação (ex: Técnico em Seg. do Trabalho)"
                    value={newInstructorQualif}
                    onChange={e => setNewInstructorQualif(e.target.value)}
                    className="w-full bg-superficie border border-borda rounded-lg p-2 text-tinta text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Reg. MTE / Conselho"
                    value={newInstructorReg}
                    onChange={e => setNewInstructorReg(e.target.value)}
                    className="w-full bg-superficie border border-borda rounded-lg p-2 text-tinta text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-teal-700 text-[11px] uppercase">Responsável Técnico (RT)</p>
                  <input
                    type="text"
                    placeholder="Nome do Responsável Técnico"
                    value={newSupervisorName}
                    onChange={e => setNewSupervisorName(e.target.value)}
                    className="w-full bg-superficie border border-borda rounded-lg p-2 text-tinta text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Qualificação (ex: Eng. de Segurança do Trabalho)"
                    value={newSupervisorQualif}
                    onChange={e => setNewSupervisorQualif(e.target.value)}
                    className="w-full bg-superficie border border-borda rounded-lg p-2 text-tinta text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Registro Profissional (ex: CREA-RJ 201812345-D)"
                    value={newSupervisorReg}
                    onChange={e => setNewSupervisorReg(e.target.value)}
                    className="w-full bg-superficie border border-borda rounded-lg p-2 text-tinta text-xs"
                  />
                </div>
              </div>

              {/* Syllabus */}
              <div className="space-y-1.5">
                <label className="font-semibold text-tinta">Conteúdo Programático (Ementa por tópicos):</label>
                <textarea
                  rows={4}
                  value={newSyllabusText}
                  onChange={e => setNewSyllabusText(e.target.value)}
                  className="w-full bg-fundo border border-borda rounded-xl p-2.5 text-tinta focus:border-teal-500 focus:outline-none text-[11px] font-mono leading-relaxed"
                />
              </div>

              {/* Attendees Multi-select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-tinta">
                    Selecione os Colaboradores Participantes ({selectedEmployeesForNewTraining.length} selecionados):
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllEmployees}
                    className="text-xs text-teal-700 hover:text-teal-700 font-semibold"
                  >
                    {selectedEmployeesForNewTraining.length === clientEmployees.length ? 'Desmarcar Todos' : 'Selecionar Todos da Empresa'}
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto bg-fundo border border-borda rounded-xl p-2 divide-y divide-borda">
                  {clientEmployees.map(emp => (
                    <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-superficie rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEmployeesForNewTraining.includes(emp.id)}
                        onChange={() => handleToggleSelectEmployee(emp.id)}
                        className="rounded bg-superficie border-borda text-teal-700 focus:ring-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-tinta truncate">{emp.name} (CPF: {emp.cpf})</p>
                        <p className="text-[11px] text-tinta-2">{emp.job_title} • {emp.sector_name}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-fundo border-t border-borda flex items-center justify-end gap-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-superficie-2 hover:bg-superficie-3 text-tinta rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>

              <button
                onClick={handleCreateTraining}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Cadastrar e Homologar Ata
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: COLLECT SIGNATURE / BIOMETRICS ================= */}
      {isSignModalOpen && signingEmployee && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-superficie border border-borda rounded-2xl w-full max-w-md shadow-sm p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-borda pb-3">
              <h3 className="text-base font-bold text-tinta flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-marca-escura" />
                Coleta de Presença no Treinamento
              </h3>
              <button
                onClick={() => {
                  setIsSignModalOpen(false);
                  setSigningEmployee(null);
                }}
                className="text-tinta-2 hover:text-tinta"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-fundo rounded-xl border border-borda">
                <p className="text-tinta-2 text-[11px]">Trabalhador:</p>
                <p className="font-bold text-tinta text-sm">{signingEmployee.employee_name}</p>
                <p className="font-mono text-tinta-2 text-xs">CPF: {signingEmployee.employee_cpf}</p>
                <p className="text-tinta-2 text-xs mt-1">{signingEmployee.employee_job_title} • {signingEmployee.employee_sector}</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-tinta">Método de Validação de Presença:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignatureMethod('DIGITAL_BIOMETRIC')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      signatureMethod === 'DIGITAL_BIOMETRIC'
                        ? 'bg-marca-suave border-marca-borda text-marca-escura font-bold'
                        : 'bg-fundo border-borda text-tinta-2'
                    }`}
                  >
                    <Camera className="w-4 h-4 mb-1.5" />
                    Biometria Facial (IA)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignatureMethod('PHYSICAL_MANUAL')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      signatureMethod === 'PHYSICAL_MANUAL'
                        ? 'bg-marca-suave border-marca-borda text-marca-escura font-bold'
                        : 'bg-fundo border-borda text-tinta-2'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 mb-1.5" />
                    Assinatura Manual em Ata
                  </button>
                </div>
              </div>

              <div className="p-3 bg-fundo rounded-xl border border-borda text-[11px] text-tinta-2">
                A confirmação gera carimbo de tempo inviolável, código de certificado individual e hash SHA-256 em total conformidade com a NR-01 item 1.7.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-borda">
              <button
                onClick={() => {
                  setIsSignModalOpen(false);
                  setSigningEmployee(null);
                }}
                className="px-4 py-2 bg-superficie-2 hover:bg-superficie-3 text-tinta rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>

              <button
                onClick={handleSignConfirm}
                disabled={isSimulatingBiometry}
                className="px-4 py-2 bg-marca-escura hover:opacity-90 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {isSimulatingBiometry ? (
                  <>Validando Biometria...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmar Presença
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
