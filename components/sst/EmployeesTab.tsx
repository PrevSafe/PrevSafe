'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Employee, WorkerCategoryType, EmploymentRegime } from '@/types';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Eye, 
  HardHat, 
  FileText, 
  HeartPulse,
  Info,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  CheckCheck,
  GraduationCap
} from 'lucide-react';
import { 
  exportWorkOrderOSPDF, 
  exportBatchWorkOrdersOSPDF, 
  exportEPIDeliveryFichaPDF, 
  exportBatchEPIDeliveryFichasPDF,
  exportWorkOrdersOSExcel,
  exportAdmissionKitPDF,
  exportBatchAdmissionKitsPDF
} from '@/lib/pdfExportService';

interface EmployeesTabProps {
  selectedClientId: string;
}

export const EmployeesTab: React.FC<EmployeesTabProps> = ({ selectedClientId }) => {
  const {
    organization,
    clients,
    employees,
    units,
    hierarchySectors,
    hierarchyJobs,
    ghes,
    workOrdersOS,
    epiDeliveries,
    integrationTrainings,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addEmployeeEpi,
    generateWorkOrderOSForEmployee,
    generateBatchWorkOrdersOS,
    createDefaultAdmissionTrainingForClient
  } = usePrevSafe();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterGhe, setFilterGhe] = useState<string>('ALL');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  
  // Post-Registration Modal
  const [justCreatedEmp, setJustCreatedEmp] = useState<Employee | null>(null);

  // Employee Modal
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState<{
    name: string;
    cpf: string;
    nis_pis: string;
    birth_date: string;
    gender: 'M' | 'F';
    registration_number: string;
    admission_date: string;
    worker_category: WorkerCategoryType;
    employment_regime: EmploymentRegime;
    unit_id: string;
    sector_id: string;
    job_id: string;
    ghe_id: string;
    email: string;
    phone: string;
  }>({
    name: '',
    cpf: '',
    nis_pis: '',
    birth_date: '1990-05-15',
    gender: 'M',
    registration_number: '',
    admission_date: '2026-08-27',
    worker_category: '101',
    employment_regime: 'CLT',
    unit_id: '',
    sector_id: '',
    job_id: '',
    ghe_id: '',
    email: '',
    phone: ''
  });

  // EPI Modal
  const [isEpiModalOpen, setIsEpiModalOpen] = useState(false);
  const [selectedEmpForEpi, setSelectedEmpForEpi] = useState<Employee | null>(null);
  const [epiForm, setEpiForm] = useState<{
    ca_number: string;
    epi_name: string;
    delivery_date: string;
    term_signed: boolean;
  }>({
    ca_number: '14235',
    epi_name: 'Protetor Auditivo tipo Plug de Silicone',
    delivery_date: '2026-08-27',
    term_signed: true
  });

  // View Dossier Modal
  const [viewingEmpDossier, setViewingEmpDossier] = useState<Employee | null>(null);

  const clientEmployees = employees.filter(e => !selectedClientId || e.client_id === selectedClientId);

  const filteredEmployees = clientEmployees.filter(emp => {
    if (filterGhe !== 'ALL' && emp.ghe_id !== filterGhe) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return emp.name.toLowerCase().includes(q) || 
             emp.cpf.includes(q) ||
             emp.registration_number.includes(q) ||
             emp.job_title.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOpenEmployeeModal = (emp?: Employee) => {
    if (emp) {
      setEditingEmployee(emp);
      setEmployeeForm({
        name: emp.name,
        cpf: emp.cpf,
        nis_pis: emp.nis_pis || '',
        birth_date: emp.birth_date,
        gender: emp.gender,
        registration_number: emp.registration_number,
        admission_date: emp.admission_date,
        worker_category: emp.worker_category || '101',
        employment_regime: emp.employment_regime || 'CLT',
        unit_id: emp.client_unit_id,
        sector_id: emp.sector_id,
        job_id: emp.job_id,
        ghe_id: emp.ghe_id || '',
        email: emp.email || '',
        phone: emp.phone || ''
      });
    } else {
      setEditingEmployee(null);
      const defaultUnit = units[0]?.id || '';
      const defaultSector = hierarchySectors[0]?.id || '';
      const defaultJob = hierarchyJobs[0]?.id || '';
      const defaultGhe = ghes[0]?.id || '';

      setEmployeeForm({
        name: '',
        cpf: '',
        nis_pis: '123.45678.90-1',
        birth_date: '1992-04-10',
        gender: 'M',
        registration_number: `MAT-${String(clientEmployees.length + 1).padStart(4, '0')}`,
        admission_date: '2026-08-27',
        worker_category: '101',
        employment_regime: 'CLT',
        unit_id: defaultUnit,
        sector_id: defaultSector,
        job_id: defaultJob,
        ghe_id: defaultGhe,
        email: '',
        phone: '(11) 98765-4321'
      });
    }
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.name || !employeeForm.cpf || !employeeForm.registration_number) return;

    const selectedJobObj = hierarchyJobs.find(j => j.id === employeeForm.job_id);
    const selectedSectorObj = hierarchySectors.find(s => s.id === employeeForm.sector_id);
    const selectedUnitObj = units.find(u => u.id === employeeForm.unit_id);
    const selectedGheObj = ghes.find(g => g.id === employeeForm.ghe_id);

    const empData = {
      client_id: selectedClientId || units[0]?.client_id || (clients[0]?.id || ''),
      client_unit_id: employeeForm.unit_id || units[0]?.id || 'unit-01',
      sector_id: employeeForm.sector_id || hierarchySectors[0]?.id || 'sec-01',
      job_id: employeeForm.job_id || hierarchyJobs[0]?.id || 'job-01',
      ghe_id: employeeForm.ghe_id || undefined,
      name: employeeForm.name,
      cpf: employeeForm.cpf,
      nis_pis: employeeForm.nis_pis,
      registration_number: employeeForm.registration_number,
      birth_date: employeeForm.birth_date,
      admission_date: employeeForm.admission_date,
      gender: employeeForm.gender,
      worker_category: employeeForm.worker_category,
      employment_regime: employeeForm.employment_regime,
      job_title: selectedJobObj?.name || 'Operador Especializado',
      cbo: selectedJobObj?.cbo || '7212-05',
      sector_name: selectedSectorObj?.name || 'Produção',
      unit_name: selectedUnitObj?.name || 'Matriz',
      ghe_name: selectedGheObj?.name,
      is_pcd: false,
      status: 'ACTIVE' as const,
      current_aso_status: 'VALID' as const,
      epis: editingEmployee?.epis || [],
      aso_history: editingEmployee?.aso_history || [],
      email: employeeForm.email,
      phone: employeeForm.phone
    };

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, empData);
      setJustCreatedEmp({ ...editingEmployee, ...empData });
    } else {
      const created = addEmployee(empData);
      // Auto generate OS for this new employee
      generateWorkOrderOSForEmployee(created.id);
      setJustCreatedEmp(created);
    }
    setIsEmployeeModalOpen(false);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedEmpIds(filteredEmployees.map(emp => emp.id));
    } else {
      setSelectedEmpIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedEmpIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Batch Handlers
  const handleBatchGenerateOS = () => {
    const targetIds = selectedEmpIds.length > 0 ? selectedEmpIds : filteredEmployees.map(e => e.id);
    const result = generateBatchWorkOrdersOS(targetIds);
    alert(`Sucesso! Foram geradas/atualizadas ${result.count} Ordens de Serviço para os colaboradores.`);
  };

  const handleBatchPrintOS = () => {
    const targetIds = selectedEmpIds.length > 0 ? selectedEmpIds : filteredEmployees.map(e => e.id);
    const targetOSList: any[] = [];
    
    targetIds.forEach(id => {
      let os = workOrdersOS.find(o => o.employee_id === id);
      if (!os) {
        os = generateWorkOrderOSForEmployee(id);
      }
      if (os) targetOSList.push(os);
    });

    if (targetOSList.length === 0) {
      alert('Nenhuma Ordem de Serviço encontrada.');
      return;
    }

    if (targetOSList.length === 1) {
      exportWorkOrderOSPDF(targetOSList[0], organization);
    } else {
      exportBatchWorkOrdersOSPDF(targetOSList, organization);
    }
  };

  const handleBatchPrintEPI = () => {
    const targetEmps = selectedEmpIds.length > 0 
      ? filteredEmployees.filter(e => selectedEmpIds.includes(e.id))
      : filteredEmployees;

    if (targetEmps.length === 0) {
      alert('Nenhum colaborador selecionado.');
      return;
    }

    const clientObj = clients.find(c => c.id === selectedClientId) || clients[0];

    if (targetEmps.length === 1) {
      exportEPIDeliveryFichaPDF(targetEmps[0], epiDeliveries, organization, clientObj);
    } else {
      exportBatchEPIDeliveryFichasPDF(targetEmps, epiDeliveries, organization, clientObj);
    }
  };

  const handleBatchPrintKitAdmissional = () => {
    const targetEmps = selectedEmpIds.length > 0 
      ? filteredEmployees.filter(e => selectedEmpIds.includes(e.id))
      : filteredEmployees;

    if (targetEmps.length === 0) {
      alert('Nenhum colaborador selecionado.');
      return;
    }

    const clientObj = clients.find(c => c.id === selectedClientId) || clients[0];
    exportBatchAdmissionKitsPDF(targetEmps, workOrdersOS, epiDeliveries, integrationTrainings, organization, clientObj);
  };

  const handleIndividualPrintKitAdmissional = (emp: Employee) => {
    let os = workOrdersOS.find(o => o.employee_id === emp.id);
    if (!os) {
      os = generateWorkOrderOSForEmployee(emp.id);
    }
    let training = integrationTrainings.find(t => t.client_id === emp.client_id);
    if (!training) {
      training = createDefaultAdmissionTrainingForClient(emp.client_id, [emp.id]);
    }
    const clientObj = clients.find(c => c.id === emp.client_id) || clients[0];
    exportAdmissionKitPDF(emp, os || null, epiDeliveries, training || null, organization, clientObj);
  };

  const handleIndividualPrintOS = (emp: Employee) => {
    let os = workOrdersOS.find(o => o.employee_id === emp.id);
    if (!os) {
      os = generateWorkOrderOSForEmployee(emp.id);
    }
    if (os) {
      exportWorkOrderOSPDF(os, organization);
    }
  };

  const handleIndividualPrintEPI = (emp: Employee) => {
    const clientObj = clients.find(c => c.id === emp.client_id) || clients[0];
    exportEPIDeliveryFichaPDF(emp, epiDeliveries, organization, clientObj);
  };

  const handleSaveEpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForEpi || !epiForm.ca_number) return;

    addEmployeeEpi(selectedEmpForEpi.id, {
      ca_number: epiForm.ca_number,
      epi_name: epiForm.epi_name,
      delivery_date: epiForm.delivery_date,
      term_signed: epiForm.term_signed
    });
    setIsEpiModalOpen(false);
  };

  return (
    <div className="space-y-6" id="employees-tab-container">
      {/* Top Bar Actions and Filters */}
      <div className="flex flex-col gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="emp-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, CPF ou matrícula..."
                className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 w-64"
              />
            </div>

            <select
              value={filterGhe}
              onChange={(e) => setFilterGhe(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">Todos os GHEs</option>
              {ghes.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="add-employee-btn"
              onClick={() => handleOpenEmployeeModal()}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Colaborador (eSocial)
            </button>
          </div>
        </div>

        {/* Batch Operations Toolbar */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-semibold text-slate-300">
              {filteredEmployees.length} colaboradores ({selectedEmpIds.length} selecionados)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-emp-batch-generate-os"
              onClick={handleBatchGenerateOS}
              className="px-2.5 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Gerar OS em Lote
            </button>

            <button
              type="button"
              id="btn-emp-batch-print-os"
              onClick={handleBatchPrintOS}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              Imprimir OS (Lote PDF)
            </button>

            <button
              type="button"
              id="btn-emp-batch-print-epi"
              onClick={handleBatchPrintEPI}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
            >
              <HardHat className="w-3.5 h-3.5 text-amber-400" />
              Imprimir Fichas EPI (PDF)
            </button>

            <button
              type="button"
              id="btn-emp-batch-print-kit"
              onClick={handleBatchPrintKitAdmissional}
              className="px-2.5 py-1.5 bg-teal-950 hover:bg-teal-900 text-teal-300 border border-teal-800 rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Imprime o Kit de Admissão Completo (OS NR-01 + Ficha de EPI NR-06 + Lista de Presença do Treinamento de Integração NR-01 item 1.7)"
            >
              <CheckCheck className="w-3.5 h-3.5 text-teal-400" />
              Kit Admissional Completo (OS + EPI + Treinamento NR-01)
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner for eSocial technical compliance */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-slate-100">
            Emissão Documental Integrada (NR-01, NR-06 e eSocial):
          </p>
          <p className="text-slate-400">
            Você pode gerar e imprimir individualmente ou em lote as <strong>Ordens de Serviço (NR-01)</strong> e as <strong>Fichas de Entrega de EPI (NR-06)</strong> com termos de ciência e coleta de assinatura para os colaboradores.
          </p>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg" id="employees-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedEmpIds.length > 0 && selectedEmpIds.length === filteredEmployees.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-700 text-teal-500 focus:ring-0 w-4 h-4 bg-slate-900"
                  />
                </th>
                <th className="py-3 px-4">Trabalhador / CPF</th>
                <th className="py-3 px-4">Matrícula eSocial</th>
                <th className="py-3 px-4">Cargo / CBO</th>
                <th className="py-3 px-4">GHE Vinculado</th>
                <th className="py-3 px-4 text-center">Documentos (OS / EPI)</th>
                <th className="py-3 px-4 text-center">Status ASO</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEmployees.map((emp) => {
                const ghe = ghes.find(g => g.id === emp.ghe_id);
                const episCount = emp.epis?.length || 0;
                const empOS = workOrdersOS.find(o => o.employee_id === emp.id);
                const isSelected = selectedEmpIds.includes(emp.id);

                return (
                  <tr key={emp.id} id={`employee-row-${emp.id}`} className={`hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-teal-950/20' : ''}`}>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(emp.id)}
                        className="rounded border-slate-700 text-teal-500 focus:ring-0 w-4 h-4 bg-slate-900"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-100">{emp.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">CPF: {emp.cpf}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-teal-400 font-semibold">
                      {emp.registration_number}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{emp.job_title}</div>
                      <div className="text-[10px] text-slate-500 font-mono">CBO {emp.cbo} • {emp.employment_regime}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 text-[10px] rounded">
                        {ghe?.name || emp.ghe_name || 'GHE Operacional'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* OS Button */}
                        <button
                          type="button"
                          onClick={() => handleIndividualPrintOS(emp)}
                          className="px-2 py-0.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-[10px] rounded font-bold transition-colors flex items-center gap-1"
                          title="Imprimir Ordem de Serviço NR-01"
                        >
                          <Printer className="w-3 h-3 text-indigo-400" />
                          {empOS ? `OS ${empOS.os_code}` : 'Gerar OS'}
                        </button>

                        {/* EPI Button */}
                        <button
                          type="button"
                          onClick={() => handleIndividualPrintEPI(emp)}
                          className="px-2 py-0.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 text-[10px] rounded font-bold transition-colors flex items-center gap-1"
                          title="Imprimir Ficha de Entrega de EPI NR-06"
                        >
                          <HardHat className="w-3 h-3 text-amber-400" />
                          Ficha EPI ({episCount})
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] rounded font-bold">
                        {emp.current_aso_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleIndividualPrintKitAdmissional(emp)}
                          className="p-1.5 text-teal-400 hover:text-teal-300 hover:bg-teal-950/60 rounded transition-colors"
                          title="Imprimir Kit de Admissão (OS + EPI + Lista de Presença Treinamento de Integração)"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingEmpDossier(emp)}
                          className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors"
                          title="Ver Ficha Cadastral eSocial"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEmployeeModal(emp)}
                          className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors"
                          title="Editar Colaborador"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEmployee(emp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                          title="Excluir Colaborador"
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
      </div>

      {/* Employee Modal */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-400" />
                {editingEmployee ? 'Editar Dados do Colaborador (eSocial)' : 'Cadastrar Novo Colaborador (Campos Obrigatórios MOS)'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsEmployeeModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Nome Completo do Trabalhador</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: Carlos Eduardo de Souza"
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-400 font-semibold mb-1">CPF (TAG cpfTrab)</label>
                  <input
                    type="text"
                    required
                    placeholder="123.456.789-00"
                    value={employeeForm.cpf}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, cpf: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Matrícula eSocial</label>
                  <input
                    type="text"
                    required
                    placeholder="MAT-001"
                    value={employeeForm.registration_number}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, registration_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">PIS / PASEP / NIS</label>
                  <input
                    type="text"
                    value={employeeForm.nis_pis}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, nis_pis: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Data Nascimento</label>
                  <input
                    type="date"
                    value={employeeForm.birth_date}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, birth_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Sexo Biológico</label>
                  <select
                    value={employeeForm.gender}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, gender: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Categoria eSocial</label>
                  <select
                    value={employeeForm.worker_category}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, worker_category: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                  >
                    <option value="101">101 - CLT Geral</option>
                    <option value="103">103 - Aprendiz</option>
                    <option value="104">104 - Doméstico</option>
                    <option value="901">901 - Estagiário</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Data de Admissão</label>
                  <input
                    type="date"
                    required
                    value={employeeForm.admission_date}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, admission_date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Cargo / Função e CBO</label>
                  <select
                    value={employeeForm.job_id}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, job_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    {hierarchyJobs.map(j => (
                      <option key={j.id} value={j.id}>{j.name} (CBO {j.cbo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">GHE Vinculado (Riscos)</label>
                  <select
                    value={employeeForm.ghe_id}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, ghe_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500 font-medium"
                  >
                    {ghes.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">E-mail</label>
                  <input
                    type="email"
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                    placeholder="colaborador@empresa.com.br"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md"
                >
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EPI Delivery Modal */}
      {isEpiModalOpen && selectedEmpForEpi && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <HardHat className="w-5 h-5 text-teal-400" />
                Entrega de EPI - {selectedEmpForEpi.name}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsEpiModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEpi} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-400 font-semibold mb-1">Nº CA</label>
                  <input
                    type="text"
                    required
                    placeholder="14235"
                    value={epiForm.ca_number}
                    onChange={(e) => setEpiForm({ ...epiForm, ca_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Descrição do EPI</label>
                  <input
                    type="text"
                    required
                    value={epiForm.epi_name}
                    onChange={(e) => setEpiForm({ ...epiForm, epi_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Data da Entrega</label>
                <input
                  type="date"
                  required
                  value={epiForm.delivery_date}
                  onChange={(e) => setEpiForm({ ...epiForm, delivery_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={epiForm.term_signed}
                    onChange={(e) => setEpiForm({ ...epiForm, term_signed: e.target.checked })}
                    className="rounded border-slate-700 text-teal-500 focus:ring-teal-500"
                  />
                  Termo de Responsabilidade e Guarda Assinado pelo Colaborador (NR-06)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEpiModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md"
                >
                  Registrar Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Dossier Modal */}
      {viewingEmpDossier && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                Ficha Técnica Ocupacional & eSocial do Trabalhador
              </h3>
              <button 
                type="button" 
                onClick={() => setViewingEmpDossier(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">{viewingEmpDossier.name}</h4>
                    <p className="text-teal-400 font-semibold">{viewingEmpDossier.job_title} (CBO {viewingEmpDossier.cbo})</p>
                  </div>
                  <span className="px-2 py-0.5 bg-teal-500/10 text-teal-300 font-mono text-xs rounded border border-teal-500/30">
                    Matrícula: {viewingEmpDossier.registration_number}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-slate-400 text-[11px]">
                  <div>CPF: <span className="text-slate-200 font-mono">{viewingEmpDossier.cpf}</span></div>
                  <div>PIS: <span className="text-slate-200 font-mono">{viewingEmpDossier.nis_pis || '-'}</span></div>
                  <div>Admissão: <span className="text-slate-200">{viewingEmpDossier.admission_date}</span></div>
                  <div>Status: <span className="text-emerald-400 font-bold">{viewingEmpDossier.status}</span></div>
                </div>
              </div>

              {/* EPI History */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-200 flex items-center gap-1.5">
                  <HardHat className="w-4 h-4 text-teal-400" />
                  Histórico de Equipamentos de Proteção Individual (EPI)
                </h5>
                {viewingEmpDossier.epis && viewingEmpDossier.epis.length > 0 ? (
                  <div className="space-y-1.5">
                    {viewingEmpDossier.epis.map((epi, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 flex justify-between items-center text-[11px]">
                        <div>
                          <span className="font-bold text-slate-200">{epi.epi_name}</span>
                          <span className="ml-2 font-mono text-teal-400">CA: {epi.ca_number}</span>
                        </div>
                        <div className="text-slate-400">
                          Entregue em: <span className="text-slate-200">{epi.delivery_date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-[11px]">Nenhum EPI registrado na ficha deste colaborador.</p>
                )}
              </div>

              {/* ASO History */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-200 flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-teal-400" />
                  Histórico de Exames e Atestados (ASO)
                </h5>
                {viewingEmpDossier.aso_history && viewingEmpDossier.aso_history.length > 0 ? (
                  <div className="space-y-1.5">
                    {viewingEmpDossier.aso_history.map((aso, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 flex justify-between items-center text-[11px]">
                        <div>
                          <span className="font-bold text-slate-200">ASO {aso.aso_type}</span>
                          <span className="ml-2 text-slate-400">Médico: {aso.physician_name} (CRM {aso.physician_crm}/{aso.physician_uf})</span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-bold rounded">
                          {aso.result} ({aso.exam_date})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-[11px]">Nenhum ASO emitido ainda para este colaborador.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setViewingEmpDossier(null)}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Registration Success Modal (OS & EPI Prompt) */}
      {justCreatedEmp && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-teal-500/50 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-teal-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Colaborador Registrado com Sucesso!
                </h3>
                <p className="text-xs text-slate-400">
                  {justCreatedEmp.name} • {justCreatedEmp.job_title} (CPF: {justCreatedEmp.cpf})
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <p className="text-slate-300 font-semibold">
                Deseja gerar e imprimir os documentos de admissão e conformidade legal agora?
              </p>
              <p className="text-slate-400 text-[11px]">
                A <strong>Ordem de Serviço (NR-01)</strong> foi criada automaticamente com base no cargo e riscos do GHE. Você pode emitir a OS e a Ficha de EPI para coleta de assinatura física ou biométrica.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                id="modal-print-os-btn"
                onClick={() => handleIndividualPrintOS(justCreatedEmp)}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-between text-xs transition-colors shadow-lg shadow-indigo-600/20"
              >
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Ordem de Serviço (NR-01 & CLT Art. 157)</span>
                </div>
                <span className="text-[10px] bg-indigo-700 px-2 py-0.5 rounded">PDF</span>
              </button>

              <button
                type="button"
                id="modal-print-epi-btn"
                onClick={() => handleIndividualPrintEPI(justCreatedEmp)}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl flex items-center justify-between text-xs transition-colors shadow-lg shadow-amber-600/20"
              >
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 h-4" />
                  <span>Imprimir Ficha de Entrega de EPI (NR-06)</span>
                </div>
                <span className="text-[10px] bg-amber-700/50 text-slate-950 px-2 py-0.5 rounded font-bold">PDF</span>
              </button>

              <button
                type="button"
                id="modal-print-kit-btn"
                onClick={() => handleIndividualPrintKitAdmissional(justCreatedEmp)}
                className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl flex items-center justify-between text-xs transition-colors shadow-lg shadow-teal-500/20"
              >
                <div className="flex items-center gap-2">
                  <CheckCheck className="w-4 h-4" />
                  <span>Imprimir Kit Completo de Admissão (OS + Ficha EPI + Treinamento NR-01)</span>
                </div>
                <span className="text-[10px] bg-teal-600 text-slate-950 px-2 py-0.5 rounded font-bold">PDF Completo</span>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setJustCreatedEmp(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Concluir e Voltar à Lista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
