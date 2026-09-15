'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { SSTHierarchySector, SSTHierarchyJob } from '@/types';
import { 
  Building2, 
  Layers, 
  Briefcase, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Info, 
  ChevronRight,
  Shield,
  Users,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  Filter,
  Check
} from 'lucide-react';
import { CBO_DATABASE, searchCBO, CBOItem } from '@/lib/cboDatabase';

interface HierarchyTabProps {
  selectedClientId: string;
}

export const HierarchyTab: React.FC<HierarchyTabProps> = ({ selectedClientId }) => {
  const {
    units,
    hierarchySectors,
    hierarchyJobs,
    employees,
    addHierarchySector,
    updateHierarchySector,
    deleteHierarchySector,
    addHierarchyJob,
    updateHierarchyJob,
    deleteHierarchyJob,
    addUnit
  } = usePrevSafe();

  const [activeSubTab, setActiveSubTab] = useState<'SECTORS' | 'JOBS' | 'UNITS'>('SECTORS');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sector Modal
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<SSTHierarchySector | null>(null);
  const [sectorForm, setSectorForm] = useState<{
    client_unit_id: string;
    code: string;
    name: string;
    description: string;
    environment_type: 'ADMINISTRATIVO' | 'OPERACIONAL_FECHADO' | 'OPERACIONAL_ABERTO' | 'LABORATORIO' | 'ESPACO_CONFINADO' | 'CANTEIRO_OBRA' | 'VEICULO_TRANSPORTE' | 'OUTROS';
    building_features: string;
  }>({
    client_unit_id: '',
    code: '',
    name: '',
    description: '',
    environment_type: 'OPERACIONAL_FECHADO',
    building_features: 'Alvenaria, ventilação natural/mecânica, piso antiderrapante, iluminação LED conforme NR-17'
  });

  // Job Modal
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<SSTHierarchyJob | null>(null);
  const [jobForm, setJobForm] = useState<{
    sector_id: string;
    client_unit_id: string;
    cbo: string;
    cbo_title: string;
    name: string;
    activities_description: string;
    requirements_notes: string;
  }>({
    sector_id: '',
    client_unit_id: '',
    cbo: '',
    cbo_title: '',
    name: '',
    activities_description: '',
    requirements_notes: 'Treinamento de integração NR-01, NR-06, e procedimentos operacionais'
  });

  // CBO Search & Auto-complete state
  const [cboSearchQuery, setCboSearchQuery] = useState('');
  const [cboCategoryFilter, setCboCategoryFilter] = useState<string>('ALL');
  const [isCboDropdownOpen, setIsCboDropdownOpen] = useState(false);
  const [cboAutoFilledMessage, setCboAutoFilledMessage] = useState<string | null>(null);

  // Unit Modal
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitForm, setUnitForm] = useState<{
    name: string;
    code: string;
    type: 'MATRIZ' | 'FILIAL' | 'OBRA' | 'POSTO_SERVICO';
    cnpj_cno_caepf: string;
    city: string;
    state: string;
    cnae_preponderant: string;
    risk_grade: 1 | 2 | 3 | 4;
  }>({
    name: '',
    code: '',
    type: 'MATRIZ',
    cnpj_cno_caepf: '',
    city: 'São Paulo',
    state: 'SP',
    cnae_preponderant: '41.20-4-00',
    risk_grade: 3
  });

  const clientUnits = units.filter(u => !selectedClientId || u.client_id === selectedClientId);
  const clientSectors = hierarchySectors.filter(s => !selectedClientId || s.client_id === selectedClientId);
  const clientJobs = hierarchyJobs.filter(j => !selectedClientId || j.client_id === selectedClientId);

  const filteredSectors = clientSectors.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredJobs = clientJobs.filter(j => 
    j.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    j.cbo.includes(searchTerm) ||
    j.activities_description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenSectorModal = (sector?: SSTHierarchySector) => {
    if (sector) {
      setEditingSector(sector);
      setSectorForm({
        client_unit_id: sector.client_unit_id || clientUnits[0]?.id || 'unit-01',
        code: sector.code || '',
        name: sector.name,
        description: sector.description || '',
        environment_type: sector.environment_type || 'OPERACIONAL_FECHADO',
        building_features: sector.building_features || ''
      });
    } else {
      setEditingSector(null);
      setSectorForm({
        client_unit_id: clientUnits[0]?.id || 'unit-01',
        code: `SEC-${String(clientSectors.length + 1).padStart(3, '0')}`,
        name: '',
        description: '',
        environment_type: 'OPERACIONAL_FECHADO',
        building_features: 'Alvenaria, ventilação e iluminação em conformidade com a NR-17/NR-24'
      });
    }
    setIsSectorModalOpen(true);
  };

  const handleSaveSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectorForm.name || !sectorForm.code) return;

    if (editingSector) {
      updateHierarchySector(editingSector.id, sectorForm);
    } else {
      addHierarchySector({
        client_id: selectedClientId || clientUnits[0]?.client_id || 'cli-valenca-01',
        client_unit_id: sectorForm.client_unit_id || clientUnits[0]?.id || 'unit-01',
        name: sectorForm.name,
        code: sectorForm.code,
        description: sectorForm.description,
        environment_type: sectorForm.environment_type,
        building_features: sectorForm.building_features,
        total_workers: employees.filter(emp => emp.sector_id === editingSector?.id).length || 0,
        status: 'ACTIVE'
      });
    }
    setIsSectorModalOpen(false);
  };

  const handleOpenJobModal = (job?: SSTHierarchyJob) => {
    setCboSearchQuery('');
    setCboCategoryFilter('ALL');
    setIsCboDropdownOpen(false);
    setCboAutoFilledMessage(null);

    if (job) {
      setEditingJob(job);
      setJobForm({
        sector_id: job.sector_id,
        client_unit_id: job.client_unit_id || clientUnits[0]?.id || 'unit-01',
        cbo: job.cbo,
        cbo_title: job.cbo_title || job.name,
        name: job.name,
        activities_description: job.activities_description || '',
        requirements_notes: job.requirements_notes || ''
      });
    } else {
      setEditingJob(null);
      const initialCbo = CBO_DATABASE.find(c => c.code === '7152-10') || CBO_DATABASE[0];
      setJobForm({
        sector_id: clientSectors[0]?.id || 'sec-01',
        client_unit_id: clientUnits[0]?.id || 'unit-01',
        cbo: initialCbo.code,
        cbo_title: initialCbo.title,
        name: initialCbo.title,
        activities_description: initialCbo.description_mos,
        requirements_notes: initialCbo.requirements_notes ? `${initialCbo.requirements_notes}. Sugestão de EPIs: ${initialCbo.suggested_epis?.join(', ')}` : 'Treinamento de integração NR-01, NR-06'
      });
      setCboAutoFilledMessage(`CBO ${initialCbo.code} (${initialCbo.title}) carregado como sugestão inicial. Você pode buscar outro CBO ou editar todos os dados livremente abaixo.`);
    }
    setIsJobModalOpen(true);
  };

  const handleSelectCboItem = (cboItem: CBOItem) => {
    setJobForm(prev => ({
      ...prev,
      cbo: cboItem.code,
      cbo_title: cboItem.title,
      name: (!prev.name || prev.name === prev.cbo_title || prev.name === 'Pedreiro') ? cboItem.title : prev.name,
      activities_description: cboItem.description_mos,
      requirements_notes: cboItem.requirements_notes 
        ? `${cboItem.requirements_notes}${cboItem.suggested_epis?.length ? ` • EPIs Recomendados: ${cboItem.suggested_epis.join(', ')}` : ''}`
        : prev.requirements_notes
    }));
    setCboAutoFilledMessage(`CBO ${cboItem.code} - "${cboItem.title}" aplicado com sucesso! Descrição MOS eSocial e requisitos preenchidos. Você pode editar qualquer informação abaixo antes de salvar.`);
    setIsCboDropdownOpen(false);
    setCboSearchQuery('');
  };

  const handleRestoreCboStandardDesc = () => {
    const cleanCurrent = jobForm.cbo.replace(/[-.]/g, '').trim();
    const found = CBO_DATABASE.find(c => c.code.replace(/[-.]/g, '') === cleanCurrent || c.title.toLowerCase() === jobForm.cbo_title.toLowerCase());
    if (found) {
      setJobForm(prev => ({
        ...prev,
        activities_description: found.description_mos
      }));
      setCboAutoFilledMessage(`Descrição oficial do MOS eSocial restaurada para o CBO ${found.code} - ${found.title}.`);
    }
  };

  const cboSearchResults = searchCBO(cboSearchQuery, cboCategoryFilter);

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.name || !jobForm.cbo) return;

    const sector = clientSectors.find(s => s.id === jobForm.sector_id);

    if (editingJob) {
      updateHierarchyJob(editingJob.id, {
        ...jobForm,
        client_unit_id: sector?.client_unit_id || jobForm.client_unit_id
      });
    } else {
      addHierarchyJob({
        client_id: selectedClientId || sector?.client_id || 'cli-valenca-01',
        client_unit_id: sector?.client_unit_id || jobForm.client_unit_id || 'unit-01',
        sector_id: jobForm.sector_id,
        name: jobForm.name,
        cbo: jobForm.cbo,
        cbo_title: jobForm.cbo_title || jobForm.name,
        activities_description: jobForm.activities_description,
        requirements_notes: jobForm.requirements_notes,
        total_workers: employees.filter(emp => emp.job_id === editingJob?.id).length || 0,
        status: 'ACTIVE'
      });
    }
    setIsJobModalOpen(false);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name) return;
    addUnit({
      client_id: selectedClientId || 'cli-valenca-01',
      name: unitForm.name,
      document_number: unitForm.cnpj_cno_caepf || '12.345.678/0001-99',
      address: 'Endereço da Unidade',
      city: unitForm.city,
      state: unitForm.state,
      cnae: unitForm.cnae_preponderant,
      risk_degree: unitForm.risk_grade,
      employee_count: 0,
      status: 'ACTIVE'
    });
    setIsUnitModalOpen(false);
  };

  return (
    <div className="space-y-6" id="hierarchy-tab-container">
      {/* Subtabs header and Search/Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            id="subtab-sectors-btn"
            onClick={() => setActiveSubTab('SECTORS')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'SECTORS'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Setores ({clientSectors.length})
          </button>
          <button
            type="button"
            id="subtab-jobs-btn"
            onClick={() => setActiveSubTab('JOBS')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'JOBS'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Cargos & CBO ({clientJobs.length})
          </button>
          <button
            type="button"
            id="subtab-units-btn"
            onClick={() => setActiveSubTab('UNITS')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'UNITS'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Estabelecimentos ({clientUnits.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="hierarchy-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, código ou CBO..."
              className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {activeSubTab === 'SECTORS' && (
            <button
              type="button"
              id="add-sector-btn"
              onClick={() => handleOpenSectorModal()}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Setor
            </button>
          )}

          {activeSubTab === 'JOBS' && (
            <button
              type="button"
              id="add-job-btn"
              onClick={() => handleOpenJobModal()}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Cargo / CBO
            </button>
          )}

          {activeSubTab === 'UNITS' && (
            <button
              type="button"
              id="add-unit-btn"
              onClick={() => setIsUnitModalOpen(true)}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Unidade
            </button>
          )}
        </div>
      </div>

      {/* Info notice about hierarchy role in eSocial */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-slate-100">
            Importância da Estrutura Hierárquica para os Eventos de SST (S-2240, S-2220 e S-2210):
          </p>
          <p className="text-slate-400">
            A hierarquia estrutural Unidade ➔ Setor ➔ Cargo é utilizada diretamente para popular as TAGs do eSocial de localização do ambiente de trabalho (<code>dscSetor</code>, <code>tpAmb</code>), código CBO oficial (Tabela 24/CBO 2002) e descrição das atividades exigidas pelo Manual de Orientação do eSocial (MOS).
          </p>
        </div>
      </div>

      {/* Sectors Grid */}
      {activeSubTab === 'SECTORS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="sectors-grid">
          {filteredSectors.map((sector) => {
            const unit = units.find(u => u.id === sector.client_unit_id);
            const sectorJobs = hierarchyJobs.filter(j => j.sector_id === sector.id);

            return (
              <div 
                key={sector.id} 
                id={`sector-card-${sector.id}`}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[10px] font-mono font-bold rounded">
                      {sector.code || 'SEC'}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded">
                      {unit?.name || 'Matriz'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-100 text-sm mt-2">{sector.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{sector.description}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Tipo Ambiente:</span>
                    <strong className="text-slate-300">{sector.environment_type}</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Cargos Vinculados:</span>
                    <strong className="text-teal-400">{sectorJobs.length}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenSectorModal(sector)}
                    className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteHierarchySector(sector.id)}
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

      {/* Jobs Grid */}
      {activeSubTab === 'JOBS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="jobs-grid">
          {filteredJobs.map((job) => {
            const sector = hierarchySectors.find(s => s.id === job.sector_id);

            return (
              <div 
                key={job.id} 
                id={`job-card-${job.id}`}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold rounded">
                      CBO {job.cbo}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded">
                      {sector?.name || 'Setor'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-100 text-sm mt-2">{job.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{job.activities_description}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Título CBO Oficial:</span>
                    <strong className="text-slate-300">{job.cbo_title || job.name}</strong>
                  </div>
                  {job.requirements_notes && (
                    <p className="text-[11px] text-slate-400 line-clamp-1 bg-slate-950 p-1.5 rounded border border-slate-800/80">
                      {job.requirements_notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenJobModal(job)}
                    className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteHierarchyJob(job.id)}
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

      {/* Units Table */}
      {activeSubTab === 'UNITS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg" id="units-table">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Código / Nome da Unidade</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">CNPJ / CNO / CAEPF</th>
                <th className="py-3 px-4">Cidade / UF</th>
                <th className="py-3 px-4">CNAE Principal</th>
                <th className="py-3 px-4 text-center">Grau de Risco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {clientUnits.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-100">
                    <div>{u.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{u.id}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-semibold">
                      {u.document_type || 'MATRIZ'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">{u.document_number || '12.345.678/0001-99'}</td>
                  <td className="py-3 px-4">{u.city} - {u.state}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{u.cnae}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30">
                      Grau {u.risk_degree || 3}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sector Modal */}
      {isSectorModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-400" />
                {editingSector ? 'Editar Setor' : 'Cadastrar Novo Setor'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsSectorModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSector} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-400 font-semibold mb-1">Código</label>
                  <input
                    type="text"
                    required
                    placeholder="SEC-01"
                    value={sectorForm.code}
                    onChange={(e) => setSectorForm({ ...sectorForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Nome do Setor</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Caldeiraria e Soldagem"
                    value={sectorForm.name}
                    onChange={(e) => setSectorForm({ ...sectorForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Tipo de Ambiente Físico</label>
                <select
                  value={sectorForm.environment_type}
                  onChange={(e) => setSectorForm({ ...sectorForm, environment_type: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="OPERACIONAL_FECHADO">Operacional Fechado (Galpão / Oficina)</option>
                  <option value="OPERACIONAL_ABERTO">Operacional Aberto (Pátio / Externo)</option>
                  <option value="ADMINISTRATIVO">Administrativo (Escritório)</option>
                  <option value="CANTEIRO_OBRA">Canteiro de Obras</option>
                  <option value="LABORATORIO">Laboratório</option>
                  <option value="ESPACO_CONFINADO">Espaço Confinado (NR-33)</option>
                  <option value="VEICULO_TRANSPORTE">Veículo / Transporte</option>
                  <option value="OUTROS">Outros Ambientes</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descrição do Setor e Processos</label>
                <textarea
                  rows={2}
                  value={sectorForm.description}
                  onChange={(e) => setSectorForm({ ...sectorForm, description: e.target.value })}
                  placeholder="Descreva as características do setor..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Características Construtivas (NR-24 / PGR)</label>
                <input
                  type="text"
                  value={sectorForm.building_features}
                  onChange={(e) => setSectorForm({ ...sectorForm, building_features: e.target.value })}
                  placeholder="Piso, ventilação, iluminação, cobertura..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSectorModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md"
                >
                  Salvar Setor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Modal */}
      {isJobModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {editingJob ? 'Editar Cargo & CBO' : 'Cadastrar Novo Cargo / Função'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Preenchimento automático por CBO oficial com descrição do MOS eSocial
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsJobModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs">
              {/* CBO Search Box & Auto-Fill Component */}
              <div className="bg-slate-950 border border-teal-500/30 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    Buscar e Selecionar CBO Oficial (Preenchimento Automático)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {cboSearchResults.length} ocupações encontradas
                  </span>
                </div>

                {/* Search input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={cboSearchQuery}
                    onChange={(e) => {
                      setCboSearchQuery(e.target.value);
                      setIsCboDropdownOpen(true);
                    }}
                    onFocus={() => setIsCboDropdownOpen(true)}
                    placeholder="Digite o código (ex: 7152-10) ou nome da função (ex: Soldador, Pedreiro, Eletricista)..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs"
                  />
                  {cboSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCboSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    { id: 'ALL', label: 'Todas' },
                    { id: 'CONSTRUCAO', label: 'Construção Civil' },
                    { id: 'INDUSTRIA', label: 'Indústria / Metal' },
                    { id: 'ELETRICA', label: 'Elétrica' },
                    { id: 'LOGISTICA', label: 'Logística / Carga' },
                    { id: 'SERVICOS', label: 'Serviços / Limpeza' },
                    { id: 'SAUDE_SST', label: 'Saúde & SST' },
                    { id: 'ADMINISTRATIVO', label: 'Administrativo' },
                    { id: 'MANUTENCAO', label: 'Manutenção' },
                    { id: 'ALIMENTACAO', label: 'Alimentação' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCboCategoryFilter(cat.id);
                        setIsCboDropdownOpen(true);
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                        cboCategoryFilter === cat.id
                          ? 'bg-teal-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Dropdown list of results */}
                {isCboDropdownOpen && (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-800 mt-1 shadow-xl">
                    {cboSearchResults.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-[11px]">
                        Nenhuma ocupação encontrada para &quot;{cboSearchQuery}&quot;. Você pode preencher os campos manualmente abaixo.
                      </div>
                    ) : (
                      cboSearchResults.map(item => (
                        <div
                          key={item.code}
                          onClick={() => handleSelectCboItem(item)}
                          className="p-2.5 hover:bg-slate-800/80 cursor-pointer transition-colors flex items-start justify-between gap-3 group"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono font-bold text-[11px] border border-teal-500/30">
                                CBO {item.code}
                              </span>
                              <span className="font-bold text-slate-200 group-hover:text-teal-300 text-xs">
                                {item.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {item.family_title} {item.synonyms?.length ? `• Sinônimos: ${item.synonyms.join(', ')}` : ''}
                            </p>
                            <p className="text-[10px] text-slate-500 line-clamp-1 italic">
                              MOS: {item.description_mos}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="px-2.5 py-1 bg-teal-600/20 hover:bg-teal-500 group-hover:bg-teal-500 text-teal-300 group-hover:text-slate-950 font-bold rounded text-[10px] whitespace-nowrap transition-colors flex-shrink-0"
                          >
                            Preencher
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Auto-filled status banner */}
                {cboAutoFilledMessage && (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex items-start gap-2 text-[11px] text-emerald-300 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span>{cboAutoFilledMessage}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Form with all editable fields */}
              <form id="job-form" onSubmit={handleSaveJob} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Setor Pertencente</label>
                    <select
                      value={jobForm.sector_id}
                      onChange={(e) => setJobForm({ ...jobForm, sector_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500 font-semibold"
                    >
                      {clientSectors.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code || 'SEC'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-slate-400 font-semibold">Código CBO (6 dígitos)</label>
                      <span className="text-[10px] text-teal-400 font-mono">Formato: 0000-00</span>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 7152-10"
                      value={jobForm.cbo}
                      onChange={(e) => setJobForm({ ...jobForm, cbo: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Nome do Cargo / Função (Empresa)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Pedreiro de Acabamento / Oficial"
                      value={jobForm.name}
                      onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Título Oficial CBO (MTE / eSocial)</label>
                    <input
                      type="text"
                      placeholder="Ex: Pedreiro"
                      value={jobForm.cbo_title}
                      onChange={(e) => setJobForm({ ...jobForm, cbo_title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Editable Detailed Activities */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                      Descrição Detalhada das Atividades (MOS eSocial)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRestoreCboStandardDesc}
                        className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 bg-teal-950/40 border border-teal-500/30 px-2 py-0.5 rounded hover:bg-teal-900/50 transition-colors"
                        title="Restaura a descrição oficial padrão do CBO selecionado"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        Restaurar Padrão MOS
                      </button>
                      <span className="text-[10px] text-slate-500">
                        {jobForm.activities_description.length} caracteres
                      </span>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={jobForm.activities_description}
                    onChange={(e) => setJobForm({ ...jobForm, activities_description: e.target.value })}
                    placeholder="Descreva detalhadamente as rotinas, ferramentas operadas, postura de trabalho e tarefas realizadas..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 leading-relaxed focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs"
                  />
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Info className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    Campo exigido no eSocial (Evento S-2240 e S-2220). Você pode editar, detalhar e adaptar as atividades livremente.
                  </p>
                </div>

                {/* Editable Requirements & Training */}
                <div className="space-y-1.5">
                  <label className="block text-slate-400 font-semibold">
                    Requisitos de Treinamento / Normas Regulamentadoras & EPIs
                  </label>
                  <input
                    type="text"
                    value={jobForm.requirements_notes}
                    onChange={(e) => setJobForm({ ...jobForm, requirements_notes: e.target.value })}
                    placeholder="Ex: Treinamento NR-18, NR-35 (Altura), NR-06 (EPI)..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                  <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-400 pt-0.5">
                    <span className="text-slate-500 font-medium">Adicionar atalhos de NRs:</span>
                    {['NR-01', 'NR-06', 'NR-10', 'NR-12', 'NR-18', 'NR-33', 'NR-35', 'NR-34'].map(nr => (
                      <button
                        key={nr}
                        type="button"
                        onClick={() => {
                          if (!jobForm.requirements_notes.includes(nr)) {
                            setJobForm({
                              ...jobForm,
                              requirements_notes: jobForm.requirements_notes 
                                ? `${jobForm.requirements_notes}, Treinamento ${nr}`
                                : `Treinamento ${nr}`
                            });
                          }
                        }}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
                      >
                        +{nr}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsJobModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="job-form"
                className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {editingJob ? 'Atualizar Cargo' : 'Salvar Cargo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Modal */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-400" />
                Cadastrar Novo Estabelecimento / Unidade
              </h3>
              <button 
                type="button" 
                onClick={() => setIsUnitModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-400 font-semibold mb-1">Código</label>
                  <input
                    type="text"
                    required
                    placeholder="UN-01"
                    value={unitForm.code}
                    onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Nome da Unidade</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Planta Industrial SP"
                    value={unitForm.name}
                    onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tipo Estabelecimento</label>
                  <select
                    value={unitForm.type}
                    onChange={(e) => setUnitForm({ ...unitForm, type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  >
                    <option value="MATRIZ">Matriz</option>
                    <option value="FILIAL">Filial</option>
                    <option value="OBRA">Obra de Construção Civil (CNO)</option>
                    <option value="POSTO_SERVICO">Posto de Trabalho Externo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Grau de Risco (NR-04)</label>
                  <select
                    value={unitForm.risk_grade}
                    onChange={(e) => setUnitForm({ ...unitForm, risk_grade: Number(e.target.value) as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-bold text-teal-400"
                  >
                    <option value={1}>Grau de Risco 1</option>
                    <option value={2}>Grau de Risco 2</option>
                    <option value={3}>Grau de Risco 3</option>
                    <option value={4}>Grau de Risco 4</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">CNPJ / CNO / CAEPF</label>
                  <input
                    type="text"
                    required
                    placeholder="12.345.678/0001-99"
                    value={unitForm.cnpj_cno_caepf}
                    onChange={(e) => setUnitForm({ ...unitForm, cnpj_cno_caepf: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">CNAE Preponderante</label>
                  <input
                    type="text"
                    required
                    placeholder="41.20-4-00"
                    value={unitForm.cnae_preponderant}
                    onChange={(e) => setUnitForm({ ...unitForm, cnae_preponderant: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg shadow-md"
                >
                  Salvar Unidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
