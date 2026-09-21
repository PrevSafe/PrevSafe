'use client';

import React, { useState, useTransition } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Client, ClientContact, ClientUnit, DocumentType } from '@/types';
import { lookupRiskDegreeByCnae, calculateSesmtDimensioning } from '@/lib/nr4';
import { lookupCompanyData, formatDocumentNumber, CompanyLookupResult } from '@/lib/companyLookup';
import { conferirDocumento } from '@/lib/validacoesBr';
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Shield, 
  FileText, 
  ChevronRight,
  Sparkles,
  Edit2,
  Trash2,
  UserPlus,
  Building,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Info,
  Layers,
  ArrowUpRight,
  Loader2,
  HelpCircle,
  Hash,
  Briefcase
} from 'lucide-react';

export const ClientsView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    clients = [], 
    contacts = [], 
    units = [], 
    addClient, 
    updateClient, 
    deleteClient,
    addContact,
    deleteContact,
    addUnit,
    deleteUnit,
    contracts = [], 
    serviceOrders = [] 
  } = usePrevSafe();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('ALL');
  const [selectedDocTypeFilter, setSelectedDocTypeFilter] = useState<string>('ALL');
  const [selectedClient, setSelectedClient] = useState<Client | null>(clients?.[0] || null);
  
  // Modals
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showNewUnitModal, setShowNewUnitModal] = useState(false);
  const [showESocialInfoModal, setShowESocialInfoModal] = useState(false);

  // Form State for client (New / Edit)
  const [clientForm, setClientForm] = useState({
    legal_name: '',
    trade_name: '',
    document_type: 'CNPJ' as DocumentType,
    document_number: '',
    caepf: '',
    cno: '',
    main_cnae: '',
    cnae_description: '',
    risk_degree: null as 1 | 2 | 3 | 4 | null,
    employee_count: 50,
    email: '',
    phone: '',
    address: '',
    neighborhood: '',
    zip_code: '',
    city: 'São Paulo',
    state: 'SP',
    porte: '',
    natureza_juridica: '',
    notes: '',
    status: 'ACTIVE' as Client['status']
  });

  // State for lookup
  const [isSearchingDoc, setIsSearchingDoc] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState<CompanyLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Form State for Contact
  const [contactForm, setContactForm] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    is_primary: false,
    receives_notifications: true
  });

  // Form State for Unit
  const [unitForm, setUnitForm] = useState({
    name: '',
    document_type: 'CNPJ' as DocumentType,
    document_number: '',
    address: '',
    neighborhood: '',
    zip_code: '',
    city: 'São Paulo',
    state: 'SP',
    cnae: '',
    cnae_description: '',
    risk_degree: null as 1 | 2 | 3 | 4 | null,
    employee_count: 20
  });
  const [isSearchingUnitDoc, setIsSearchingUnitDoc] = useState(false);

  // Real-time NR-04 verification helper for Client Form
  const currentClientNr4 = React.useMemo(() => {
    if (!clientForm.main_cnae) return null;
    return lookupRiskDegreeByCnae(clientForm.main_cnae);
  }, [clientForm.main_cnae]);

  // Real-time SESMT dimensioning for selected client
  const activeClientSesmt = React.useMemo(() => {
    if (!selectedClient) return null;
    return calculateSesmtDimensioning(selectedClient.risk_degree, selectedClient.employee_count);
  }, [selectedClient]);

  // Real-time NR-04 for Unit Form
  const currentUnitNr4 = React.useMemo(() => {
    if (!unitForm.cnae) return null;
    return lookupRiskDegreeByCnae(unitForm.cnae);
  }, [unitForm.cnae]);

  const filteredClients = clients.filter(c => {
    const cleanSearch = searchTerm.toLowerCase().replace(/[\.\-\/\\]/g, '');
    const cleanDoc = (c.document_number || '').replace(/[\.\-\/\\]/g, '');
    const cleanCaepf = (c.caepf || '').replace(/[\.\-\/\\]/g, '');
    const cleanCno = (c.cno || '').replace(/[\.\-\/\\]/g, '');
    const cleanCnae = (c.main_cnae || '').replace(/[\.\-\/\\]/g, '');

    const matchesSearch = 
      c.legal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.trade_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cleanDoc.includes(cleanSearch) ||
      cleanCaepf.includes(cleanSearch) ||
      cleanCno.includes(cleanSearch) ||
      cleanCnae.includes(cleanSearch) ||
      (c.city || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = selectedRiskFilter === 'ALL' || c.risk_degree.toString() === selectedRiskFilter;
    const matchesDocType = selectedDocTypeFilter === 'ALL' || (c.document_type || 'CNPJ') === selectedDocTypeFilter;

    return matchesSearch && matchesRisk && matchesDocType;
  });

  // Handler for Document Auto-Lookup in Client Form
  const handlePerformDocumentLookup = async (docNum?: string, docType?: DocumentType) => {
    const targetDoc = docNum || clientForm.document_number;
    const targetType = docType || clientForm.document_type;

    if (!targetDoc || targetDoc.replace(/\D/g, '').length < 9) {
      setLookupError('Informe o número completo do documento (CNPJ: 14 dígitos, CPF: 11 dígitos, CAEPF: 14 dígitos, CNO: 12 dígitos).');
      return;
    }

    setIsSearchingDoc(true);
    setLookupError(null);
    setLookupFeedback(null);

    try {
      const result = await lookupCompanyData(targetDoc, targetType);
      setLookupFeedback(result);

      // Auto-fill form fields with verified data
      setClientForm(prev => ({
        ...prev,
        legal_name: result.legal_name || prev.legal_name,
        trade_name: result.trade_name || result.legal_name || prev.trade_name,
        document_number: result.document_number,
        document_type: result.document_type,
        caepf: result.document_type === 'CAEPF' ? result.document_number : prev.caepf,
        cno: result.document_type === 'CNO' ? result.document_number : prev.cno,
        main_cnae: result.main_cnae || prev.main_cnae,
        cnae_description: result.cnae_description || prev.cnae_description,
        risk_degree: result.risk_degree,
        address: result.address || prev.address,
        neighborhood: result.neighborhood || prev.neighborhood,
        zip_code: result.zip_code || prev.zip_code,
        city: result.city || prev.city,
        state: result.state || prev.state,
        phone: result.phone || prev.phone,
        email: result.email || prev.email,
        porte: result.porte || prev.porte,
        natureza_juridica: result.natureza_juridica || prev.natureza_juridica
      }));
    } catch (err: any) {
      setLookupError(err.message || 'Não foi possível consultar os dados do documento.');
    } finally {
      setIsSearchingDoc(false);
    }
  };

  // Auto-lookup for Unit Form
  const handlePerformUnitDocumentLookup = async () => {
    if (!unitForm.document_number || unitForm.document_number.replace(/\D/g, '').length < 9) {
      alert('Informe o número do documento da filial ou canteiro.');
      return;
    }

    setIsSearchingUnitDoc(true);
    try {
      const result = await lookupCompanyData(unitForm.document_number, unitForm.document_type);
      setUnitForm(prev => ({
        ...prev,
        name: prev.name || result.trade_name || result.legal_name,
        address: result.address,
        neighborhood: result.neighborhood || '',
        zip_code: result.zip_code || '',
        city: result.city,
        state: result.state,
        cnae: result.main_cnae,
        cnae_description: result.cnae_description,
        risk_degree: result.risk_degree
      }));
    } catch (err: any) {
      alert(err.message || 'Erro ao buscar dados da unidade.');
    } finally {
      setIsSearchingUnitDoc(false);
    }
  };

  const handleOpenNewClient = () => {
    setClientForm({
      legal_name: '',
      trade_name: '',
      document_type: 'CNPJ',
      document_number: '',
      caepf: '',
      cno: '',
      main_cnae: '',
      cnae_description: '',
      risk_degree: null,
      employee_count: 50,
      email: '',
      phone: '',
      address: '',
      neighborhood: '',
      zip_code: '',
      city: 'São Paulo',
      state: 'SP',
      porte: '',
      natureza_juridica: '',
      notes: '',
      status: 'ACTIVE'
    });
    setLookupFeedback(null);
    setLookupError(null);
    setShowNewClientModal(true);
  };

  const handleOpenEditClient = () => {
    if (!selectedClient) return;
    setClientForm({
      legal_name: selectedClient.legal_name,
      trade_name: selectedClient.trade_name,
      document_type: selectedClient.document_type || 'CNPJ',
      document_number: selectedClient.document_number,
      caepf: selectedClient.caepf || '',
      cno: selectedClient.cno || '',
      main_cnae: selectedClient.main_cnae,
      cnae_description: selectedClient.cnae_description || '',
      risk_degree: selectedClient.risk_degree,
      employee_count: selectedClient.employee_count,
      email: selectedClient.email,
      phone: selectedClient.phone,
      address: selectedClient.address,
      neighborhood: selectedClient.neighborhood || '',
      zip_code: selectedClient.zip_code || '',
      city: selectedClient.city,
      state: selectedClient.state,
      porte: selectedClient.porte || '',
      natureza_juridica: selectedClient.natureza_juridica || '',
      notes: selectedClient.notes || '',
      status: selectedClient.status
    });
    setLookupFeedback(null);
    setLookupError(null);
    setShowEditClientModal(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.legal_name || !clientForm.trade_name || !clientForm.document_number) {
      alert('Preencha os campos obrigatórios (Razão Social, Nome Fantasia, Documento).');
      return;
    }

    // Documento com digito verificador errado passa para o PGR, para o ASO e
    // para o evento do eSocial, e so aparece como problema quando o governo
    // rejeita - ou quando o documento ja foi entregue ao cliente.
    if (clientForm.document_type === 'CNPJ' || clientForm.document_type === 'CPF') {
      const conferencia = conferirDocumento(clientForm.document_number, clientForm.document_type);
      if (!conferencia.valido) {
        alert(`${conferencia.motivo}\n\nConfira o número informado antes de salvar.`);
        return;
      }
    }

    // O grau de risco define o dimensionamento do SESMT (Quadro II da NR-04) e
    // entra em documento assinado: nao pode ficar em branco nem ser adivinhado.
    const nr4Result = lookupRiskDegreeByCnae(clientForm.main_cnae);
    const grauEscolhido = Number(clientForm.risk_degree);
    if (![1, 2, 3, 4].includes(grauEscolhido)) {
      alert(
        'Informe o Grau de Risco NR-04.\n\n' +
        'O CNAE informado não consta no Anexo I da NR-04, então o sistema não o preenche ' +
        'automaticamente. Confira o CNAE ou selecione o grau manualmente.'
      );
      return;
    }

    const payload = {
      ...clientForm,
      risk_degree: grauEscolhido as 1 | 2 | 3 | 4,
      cnae_description: clientForm.cnae_description || nr4Result.description,
      whatsapp: clientForm.phone.replace(/\D/g, '')
    };

    if (showEditClientModal && selectedClient) {
      updateClient(selectedClient.id, payload);
      setSelectedClient({
        ...selectedClient,
        ...payload
      });
      setShowEditClientModal(false);
    } else {
      const created = addClient(payload);
      setSelectedClient(created);
      setShowNewClientModal(false);
    }
  };

  const handleDeleteClient = () => {
    if (!selectedClient) return;
    deleteClient(selectedClient.id);
    setShowDeleteConfirmModal(false);
    const remaining = clients.filter(c => c.id !== selectedClient.id);
    setSelectedClient(remaining[0] || null);
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !contactForm.name || !contactForm.email) {
      alert('Preencha nome e e-mail do contato.');
      return;
    }

    addContact({
      client_id: selectedClient.id,
      name: contactForm.name,
      role: contactForm.role || 'Responsável SST',
      email: contactForm.email,
      phone: contactForm.phone || '(11) 99999-9999',
      whatsapp: contactForm.phone || '(11) 99999-9999',
      is_primary: contactForm.is_primary
    });

    setContactForm({
      name: '',
      role: '',
      email: '',
      phone: '',
      is_primary: false,
      receives_notifications: true
    });
    setShowNewContactModal(false);
  };

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !unitForm.name || !unitForm.address) {
      alert('Preencha o nome e o endereço da unidade.');
      return;
    }

    const unitNr4 = lookupRiskDegreeByCnae(unitForm.cnae || selectedClient.main_cnae);

    addUnit({
      client_id: selectedClient.id,
      name: unitForm.name,
      document_type: unitForm.document_type,
      document_number: unitForm.document_number,
      address: unitForm.address,
      neighborhood: unitForm.neighborhood,
      zip_code: unitForm.zip_code,
      city: unitForm.city,
      state: unitForm.state,
      cnae: unitForm.cnae || selectedClient.main_cnae,
      cnae_description: unitForm.cnae_description || unitNr4.description,
      // Igual ao cliente: vale o que esta no formulario, nao a reconsulta.
      risk_degree: unitForm.risk_degree,
      employee_count: Number(unitForm.employee_count) || 10,
      status: 'ACTIVE'
    });

    setUnitForm({
      name: '',
      document_type: 'CNPJ',
      document_number: '',
      address: '',
      neighborhood: '',
      zip_code: '',
      city: 'São Paulo',
      state: 'SP',
      cnae: '',
      cnae_description: '',
      risk_degree: null,
      employee_count: 20
    });
    setShowNewUnitModal(false);
  };

  const clientContacts = selectedClient ? contacts.filter(c => c.client_id === selectedClient.id) : [];
  const clientUnits = selectedClient ? units.filter(u => u.client_id === selectedClient.id) : [];
  const clientContracts = selectedClient ? contracts.filter(c => c.client_id === selectedClient.id) : [];
  const clientOS = selectedClient ? serviceOrders.filter(o => o.client_id === selectedClient.id) : [];

  return (
    <div id="clients-view-container" className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div id="clients-header" className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">CRM de Clientes & Unidades</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Validação NR-04 & eSocial
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestão de empresas, produtores rurais (CAEPF), canteiros de obras (CNO) e cálculo automatizado de grau de risco.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            id="btn-open-esocial-info"
            onClick={() => setShowESocialInfoModal(true)}
            className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 rounded-2xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Info className="w-4 h-4 text-indigo-400" />
            <span>Regras eSocial (CAEPF / CPF / CNO)</span>
          </button>
          
          <button 
            id="btn-new-client"
            onClick={handleOpenNewClient}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente / Empregador</span>
          </button>
        </div>
      </div>

      {/* Filters Bar Bento Card with Multi-Document Types */}
      <div id="clients-filter-bar" className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-clients"
            type="text"
            placeholder="Buscar por CNPJ, CAEPF, CPF, CNO, Razão Social ou CNAE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          {/* Document Type Filter Chips */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'CNPJ', label: 'CNPJ' },
              { id: 'CAEPF', label: 'CAEPF' },
              { id: 'CPF', label: 'CPF' },
              { id: 'CNO', label: 'CNO' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedDocTypeFilter(tab.id)}
                className={`px-2.5 py-1 rounded-xl font-medium transition ${
                  selectedDocTypeFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1.5">
            <select
              id="select-risk-filter"
              value={selectedRiskFilter}
              onChange={(e) => setSelectedRiskFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Todos os Graus NR-04</option>
              <option value="1">Grau 1 (Leve)</option>
              <option value="2">Grau 2 (Médio)</option>
              <option value="3">Grau 3 (Grave)</option>
              <option value="4">Grau 4 (Crítico)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Client List & Active Details in Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List */}
        <div id="clients-list" className="lg:col-span-5 space-y-3">
          {filteredClients.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-500 text-xs">
              Nenhum cliente ou empregador encontrado para a busca informada.
            </div>
          ) : (
            filteredClients.map((client) => {
              const isSelected = selectedClient?.id === client.id;
              const docType = client.document_type || 'CNPJ';

              return (
                <div
                  id={`client-card-${client.id}`}
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`p-5 rounded-3xl border cursor-pointer transition flex flex-col justify-between ${
                    isSelected 
                      ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40' 
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white">{client.trade_name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          client.risk_degree === 4 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          client.risk_degree === 3 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          Grau {client.risk_degree}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-xs">{client.legal_name}</div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                        docType === 'CAEPF' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                        docType === 'CNO' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                        docType === 'CPF' ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' :
                        'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {docType}
                      </span>
                      <span>{client.document_number}</span>
                    </div>
                    <span className="text-slate-300 font-medium">{client.employee_count} vidas</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Detail Pane */}
        {selectedClient ? (
          <div id="client-detail-pane" className="lg:col-span-7 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header of Detail with Edit & Delete actions */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center flex-wrap gap-2.5">
                    <h2 className="text-xl font-bold text-white">{selectedClient.trade_name}</h2>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      selectedClient.risk_degree === 4 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      selectedClient.risk_degree === 3 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      Grau de Risco {selectedClient.risk_degree} (NR-04)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                      Tipo: {selectedClient.document_type || 'CNPJ'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{selectedClient.legal_name}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    id="btn-edit-client"
                    onClick={handleOpenEditClient}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition border border-slate-700 flex items-center space-x-1"
                    title="Editar Cliente"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    id="btn-delete-client"
                    onClick={() => setShowDeleteConfirmModal(true)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold transition border border-rose-500/20 flex items-center space-x-1"
                    title="Excluir Cliente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* NR-04 Automatic Validation & SESMT Dimensioning Card */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-indigo-500/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span>Enquadramento Técnico NR-04 (MTE) & Dimensionamento SESMT</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                    Portaria MTP nº 4.219/2022
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">CNAE Principal</span>
                    <span className="font-mono font-bold text-white text-xs">{selectedClient.main_cnae}</span>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {selectedClient.cnae_description || 'Atividades Gerais'}
                    </p>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Grau de Risco</span>
                    <span className={`font-bold text-xs ${
                      selectedClient.risk_degree >= 3 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      Grau {selectedClient.risk_degree} ({selectedClient.risk_degree === 4 ? 'Crítico' : selectedClient.risk_degree === 3 ? 'Grave' : selectedClient.risk_degree === 2 ? 'Médio' : 'Leve'})
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Quadro I da NR-04</p>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Exigência SESMT (Quadro II)</span>
                    <span className={`font-bold text-xs ${activeClientSesmt && (activeClientSesmt.tecnicoSeguranca + activeClientSesmt.engenheiroSeguranca + activeClientSesmt.medicoTrabalho > 0) ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {activeClientSesmt && (activeClientSesmt.tecnicoSeguranca + activeClientSesmt.engenheiroSeguranca + activeClientSesmt.medicoTrabalho > 0) ? 'Obrigatório' : 'Desobrigado'}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {selectedClient.employee_count} colaboradores ativos
                    </p>
                  </div>
                </div>

                {/* SESMT Staff Matrix if required */}
                {activeClientSesmt && (activeClientSesmt.tecnicoSeguranca + activeClientSesmt.engenheiroSeguranca + activeClientSesmt.medicoTrabalho + activeClientSesmt.enfermeiroTrabalho > 0) && (
                  <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-2.5 text-[11px] flex items-center justify-between text-amber-200">
                    <span>Equipe SESMT Mínima:</span>
                    <div className="flex items-center gap-3 font-mono font-bold">
                      {activeClientSesmt.tecnicoSeguranca > 0 && <span>{activeClientSesmt.tecnicoSeguranca} TST</span>}
                      {activeClientSesmt.engenheiroSeguranca > 0 && <span>{activeClientSesmt.engenheiroSeguranca} Eng. Seg</span>}
                      {activeClientSesmt.medicoTrabalho > 0 && <span>{activeClientSesmt.medicoTrabalho} Méd. Trab</span>}
                      {activeClientSesmt.enfermeiroTrabalho > 0 && <span>{activeClientSesmt.enfermeiroTrabalho} Enf. Trab</span>}
                    </div>
                  </div>
                )}

                {/* eSocial Integration Tag */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>eSocial Layout S-1.2: Eventos S-2240, S-2220 e S-2210 compatíveis</span>
                  </span>
                  <span className="font-mono text-indigo-300">
                    &lt;tpInsc: {selectedClient.document_type === 'CAEPF' ? '3 (CAEPF)' : selectedClient.document_type === 'CNO' ? '4 (CNO)' : selectedClient.document_type === 'CPF' ? '2 (CPF)' : '1 (CNPJ)'}&gt;
                  </span>
                </div>
              </div>

              {/* General Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Identificação Cadastral</h3>
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Documento Principal:</span>
                      <span className="font-mono text-white font-medium">{selectedClient.document_number}</span>
                    </div>
                    {selectedClient.caepf && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Inscrição CAEPF:</span>
                        <span className="font-mono text-amber-300 font-medium">{selectedClient.caepf}</span>
                      </div>
                    )}
                    {selectedClient.cno && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Matrícula CNO (Obras):</span>
                        <span className="font-mono text-blue-300 font-medium">{selectedClient.cno}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Porte / Regime:</span>
                      <span className="text-slate-200">{selectedClient.porte || 'Empresa Geral'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status na Receita:</span>
                      <span className="text-emerald-400 font-medium">{selectedClient.status_receita || 'ATIVA'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Localização & Contato</h3>
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-start space-x-2 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                      <span>{selectedClient.address} {selectedClient.neighborhood ? `- ${selectedClient.neighborhood}` : ''} - {selectedClient.city}/{selectedClient.state}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{selectedClient.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{selectedClient.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Units / Branches Section */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                    Unidades, Filiais & Canteiros ({clientUnits.length})
                  </h3>
                  <button
                    id="btn-add-unit"
                    onClick={() => setShowNewUnitModal(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Unidade / CNO</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {clientUnits.length === 0 ? (
                    <div className="text-xs text-slate-500">Nenhuma filial ou canteiro cadastrado além da matriz.</div>
                  ) : (
                    clientUnits.map((u) => (
                      <div key={u.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{u.name}</span>
                            {u.document_type && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                                {u.document_type}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-[11px]">{u.address} - {u.city}/{u.state}</div>
                          <div className="text-slate-500 font-mono text-[10px]">CNAE: {u.cnae} | {u.employee_count} colaboradores</div>
                        </div>
                        <button
                          onClick={() => deleteUnit(u.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition"
                          title="Remover Unidade"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Contacts Section */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                    Contatos & Responsáveis ({clientContacts.length})
                  </h3>
                  <button
                    id="btn-add-contact"
                    onClick={() => setShowNewContactModal(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Adicionar Contato</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {clientContacts.length === 0 ? (
                    <div className="text-xs text-slate-500 col-span-2">Nenhum responsável cadastrado.</div>
                  ) : (
                    clientContacts.map((contact) => (
                      <div key={contact.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="font-bold text-white flex items-center space-x-1.5">
                            <span>{contact.name}</span>
                            {contact.is_primary && (
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-full font-normal">
                                Principal
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-[11px]">{contact.role}</div>
                          <div className="text-slate-500 text-[10px] font-mono">{contact.email}</div>
                        </div>
                        <button
                          onClick={() => deleteContact(contact.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition"
                          title="Remover Contato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Active Service Orders */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Histórico de Ordens de Serviço (OS)</h3>
                <div className="space-y-2">
                  {clientOS.length === 0 ? (
                    <div className="text-xs text-slate-500">Nenhuma OS em andamento para este cliente.</div>
                  ) : (
                    clientOS.map((os) => (
                      <div 
                        key={os.id} 
                        onClick={() => onNavigate('service-orders')}
                        className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-700 cursor-pointer transition text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-indigo-300">{os.os_number}</span>
                          <div className="font-medium text-slate-200 mt-0.5">{os.service_name}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {os.status}
                          </span>
                          <div className="text-[11px] text-slate-400 font-mono mt-1">{os.progress}% Concluído</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 bg-slate-900 p-12 rounded-3xl border border-slate-800 text-center text-slate-500">
            Selecione um cliente ao lado para ver os detalhes completos.
          </div>
        )}
      </div>

      {/* New / Edit Client Modal with Automatic Document Lookup & NR-04 Validation */}
      {(showNewClientModal || showEditClientModal) && (
        <div id="modal-client-form" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-800 max-h-[92vh] overflow-y-auto text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {showEditClientModal ? 'Editar Cliente / Empregador SST' : 'Cadastrar Novo Cliente / Empregador SST'}
                </h3>
                <p className="text-xs text-slate-400">
                  Suporta CNPJ, CAEPF (Produtor Rural), CPF e CNO com validação automática NR-04 e eSocial.
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowNewClientModal(false);
                  setShowEditClientModal(false);
                }} 
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Document Auto-Lookup Bar */}
            <div className="p-4 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Busca Inteligente por Documento (CNPJ / CAEPF / CPF / CNO)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Receita Federal & NR-04</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                <div className="sm:col-span-3">
                  <select
                    value={clientForm.document_type}
                    onChange={(e) => setClientForm({ ...clientForm, document_type: e.target.value as DocumentType })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CNPJ">CNPJ (Empresas)</option>
                    <option value="CAEPF">CAEPF (Produtor Rural / Autônomo)</option>
                    <option value="CPF">CPF (Pessoa Física)</option>
                    <option value="CNO">CNO (Obra Civil)</option>
                  </select>
                </div>

                <div className="sm:col-span-6">
                  <input
                    type="text"
                    placeholder={
                      clientForm.document_type === 'CAEPF' ? 'Ex: 123.456.789/001-44 (CAEPF)' :
                      clientForm.document_type === 'CPF' ? 'Ex: 987.654.321-00 (CPF)' :
                      clientForm.document_type === 'CNO' ? 'Ex: 90.123.45678/90 (CNO)' :
                      'Ex: 33.456.789/0001-12 (CNPJ)'
                    }
                    value={clientForm.document_number}
                    onChange={(e) => setClientForm({ ...clientForm, document_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={() => handlePerformDocumentLookup()}
                    disabled={isSearchingDoc}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                  >
                    {isSearchingDoc ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Buscando...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Buscar Dados</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {lookupFeedback && (
                lookupFeedback.source === 'RECEITA_FEDERAL_ONLINE' ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>✓ Dados localizados na Receita Federal</span>
                      <span className="font-mono text-[10px]">{lookupFeedback.esocial_tp_insc}</span>
                    </div>
                    <p className="text-[11px] text-emerald-200">{lookupFeedback.esocial_explanation}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Documento classificado — preencha os dados manualmente</span>
                      <span className="font-mono text-[10px]">{lookupFeedback.esocial_tp_insc}</span>
                    </div>
                    <p className="text-[11px] text-amber-200">{lookupFeedback.esocial_explanation}</p>
                    <p className="text-[11px] text-amber-200/80">
                      Não há consulta pública para este tipo de documento. Informe razão social, endereço e o CNAE
                      (que define o grau de risco do PGR/PCMSO).
                    </p>
                  </div>
                )
              )}

              {lookupError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                  {lookupError}
                </div>
              )}
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Razão Social / Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Indústria Mecânica Alpha S/A"
                    value={clientForm.legal_name}
                    onChange={(e) => setClientForm({ ...clientForm, legal_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nome Fantasia / Identificação da Unidade *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alpha Mecânica"
                    value={clientForm.trade_name}
                    onChange={(e) => setClientForm({ ...clientForm, trade_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* CNAE & NR-04 Automatic Calculation Card */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">CNAE Principal & Grau de Risco (NR-04 Automático)</span>
                  {currentClientNr4 && (
                    currentClientNr4.riskDegree === null ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">
                        CNAE não classificado — informe o grau
                      </span>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        currentClientNr4.riskDegree >= 3 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        Grau de Risco {currentClientNr4.riskDegree} ({currentClientNr4.riskDegree === 4 ? 'Crítico' : currentClientNr4.riskDegree === 3 ? 'Grave' : 'Médio/Leve'})
                      </span>
                    )
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] text-slate-400 mb-1">Código CNAE</label>
                    <input
                      type="text"
                      placeholder="Ex: 25.11-0-00 ou 01.21-1-01"
                      value={clientForm.main_cnae}
                      onChange={(e) => {
                        const val = e.target.value;
                        const nr4 = lookupRiskDegreeByCnae(val);
                        setClientForm({
                          ...clientForm,
                          main_cnae: val,
                          risk_degree: nr4.riskDegree ?? clientForm.risk_degree,
                          cnae_description: nr4.description || clientForm.cnae_description
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] text-slate-400 mb-1">Descrição da Atividade Econômica</label>
                    <input
                      type="text"
                      placeholder="Descrição oficial do CNAE"
                      value={clientForm.cnae_description}
                      onChange={(e) => setClientForm({ ...clientForm, cnae_description: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] text-slate-400 mb-1">Grau de Risco NR-04</label>
                    <select
                      value={clientForm.risk_degree ?? ''}
                      onChange={(e) => setClientForm({ ...clientForm, risk_degree: (e.target.value ? Number(e.target.value) : null) as any })}
                      className={`w-full px-3 py-2 bg-slate-900 border rounded-xl text-xs text-white font-bold focus:outline-none focus:border-indigo-500 ${
                        clientForm.risk_degree ? 'border-slate-800' : 'border-amber-500/60'
                      }`}
                    >
                      <option value="">Não classificado — selecione</option>
                      <option value={1}>Grau 1 (Leve)</option>
                      <option value={2}>Grau 2 (Médio)</option>
                      <option value={3}>Grau 3 (Grave)</option>
                      <option value={4}>Grau 4 (Crítico)</option>
                    </select>
                  </div>
                </div>

                {currentClientNr4 && (
                  <p className="text-[10px] text-slate-500">
                    <strong className="text-slate-400">Base Legal:</strong> {currentClientNr4.legalBasis}
                  </p>
                )}
              </div>

              {/* Extra Document Inputs (CAEPF / CNO) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Inscrição CAEPF (se Produtor Rural)</label>
                  <input
                    type="text"
                    placeholder="000.000.000/000-00"
                    value={clientForm.caepf}
                    onChange={(e) => setClientForm({ ...clientForm, caepf: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Matrícula CNO (se Canteiro de Obras)</label>
                  <input
                    type="text"
                    placeholder="00.000.00000/00"
                    value={clientForm.cno}
                    onChange={(e) => setClientForm({ ...clientForm, cno: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nº de Colaboradores (Vidas)</label>
                  <input
                    type="number"
                    value={clientForm.employee_count}
                    onChange={(e) => setClientForm({ ...clientForm, employee_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">E-mail Comercial</label>
                  <input
                    type="email"
                    placeholder="contato@empresa.com.br"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Endereço Completo</label>
                  <input
                    type="text"
                    placeholder="Rua, número, bairro"
                    value={clientForm.address}
                    onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Cidade / UF</label>
                  <input
                    type="text"
                    value={`${clientForm.city}/${clientForm.state}`}
                    onChange={(e) => {
                      const [c, s] = e.target.value.split('/');
                      setClientForm({ ...clientForm, city: c || 'São Paulo', state: s || 'SP' });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Observações de Campo / Perigos Conhecidos</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Trabalho com pontes rolantes, ruído contínuo na estamparia, defensivos agrícolas..."
                  value={clientForm.notes}
                  onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewClientModal(false);
                    setShowEditClientModal(false);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  {showEditClientModal ? 'Atualizar Cliente' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Unit Modal with NR-04 & Document Lookup */}
      {showNewUnitModal && selectedClient && (
        <div id="modal-new-unit" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Adicionar Unidade, Filial ou CNO</h3>
                <p className="text-xs text-slate-400">Vinculado a: {selectedClient.trade_name}</p>
              </div>
              <button onClick={() => setShowNewUnitModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleAddUnit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tipo de Inscrição</label>
                  <select
                    value={unitForm.document_type}
                    onChange={(e) => setUnitForm({ ...unitForm, document_type: e.target.value as DocumentType })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CNPJ">CNPJ (Filial)</option>
                    <option value="CNO">CNO (Canteiro de Obras)</option>
                    <option value="CAEPF">CAEPF (Área Rural)</option>
                    <option value="CPF">CPF (Pessoa Física)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Número do Documento</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={unitForm.document_number}
                      onChange={(e) => setUnitForm({ ...unitForm, document_number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handlePerformUnitDocumentLookup}
                      disabled={isSearchingUnitDoc}
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs shrink-0"
                      title="Buscar dados do documento"
                    >
                      {isSearchingUnitDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nome da Unidade / Canteiro *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Canteiro Edifício Sky Tower / CD Guarulhos"
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Endereço Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Av. Brigadeiro Faria Lima, 3400"
                  value={unitForm.address}
                  onChange={(e) => setUnitForm({ ...unitForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={unitForm.city}
                    onChange={(e) => setUnitForm({ ...unitForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">UF</label>
                  <input
                    type="text"
                    value={unitForm.state}
                    onChange={(e) => setUnitForm({ ...unitForm, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">CNAE da Unidade</label>
                  <input
                    type="text"
                    placeholder="Ex: 41.20-4-00"
                    value={unitForm.cnae}
                    onChange={(e) => {
                      const val = e.target.value;
                      const nr4 = lookupRiskDegreeByCnae(val);
                      setUnitForm({
                        ...unitForm,
                        cnae: val,
                        risk_degree: nr4.riskDegree ?? unitForm.risk_degree,
                        cnae_description: nr4.description
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Grau de Risco (NR-04)</label>
                  <select
                    value={unitForm.risk_degree ?? ''}
                    onChange={(e) => setUnitForm({ ...unitForm, risk_degree: (e.target.value ? Number(e.target.value) : null) as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>Grau 1 (Leve)</option>
                    <option value={2}>Grau 2 (Médio)</option>
                    <option value={3}>Grau 3 (Grave)</option>
                    <option value={4}>Grau 4 (Crítico)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Vidas / Colaboradores na Unidade</label>
                <input
                  type="number"
                  value={unitForm.employee_count}
                  onChange={(e) => setUnitForm({ ...unitForm, employee_count: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewUnitModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  Salvar Unidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Educational eSocial Info Modal */}
      {showESocialInfoModal && (
        <div id="modal-esocial-rules" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-indigo-500/30 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Manual eSocial: Enquadramento de Documentos e tpInsc</h3>
              </div>
              <button onClick={() => setShowESocialInfoModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                No eSocial (Layout S-1.2), a identificação do empregador e dos estabelecimentos de trabalho para os eventos de SST (<strong className="text-indigo-300">S-2240</strong>, <strong className="text-indigo-300">S-2220</strong> e <strong className="text-indigo-300">S-2210</strong>) segue a tabela técnica do MTE/Receita Federal:
              </p>

              <div className="space-y-2">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between font-mono font-bold text-emerald-400">
                    <span>1. CNPJ &lt;tpInsc: 1&gt;</span>
                    <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full">Pessoa Jurídica</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Utilizado para empresas privadas, sociedades anônimas, limitadas e estabelecimentos matriz ou filial. 14 dígitos numéricos.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between font-mono font-bold text-purple-400">
                    <span>2. CPF &lt;tpInsc: 2&gt;</span>
                    <span className="text-[10px] bg-purple-500/10 px-2 py-0.5 rounded-full">Pessoa Física Empregadora</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Utilizado para empregadores pessoas físicas, profissionais liberais (médicos, advogados, dentistas) e empregadores domésticos. 11 dígitos numéricos.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between font-mono font-bold text-amber-400">
                    <span>3. CAEPF &lt;tpInsc: 3&gt;</span>
                    <span className="text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full">Produtor Rural / Titular de Cartório</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cadastro de Atividade Econômica da Pessoa Física. O empregador possui CPF e vincula seus estabelecimentos agropecuários pelo número CAEPF de 14 dígitos. Obrigatório no eSocial para trabalhadores rurais (NR-31).
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between font-mono font-bold text-blue-400">
                    <span>4. CNO &lt;tpInsc: 4&gt;</span>
                    <span className="text-[10px] bg-blue-500/10 px-2 py-0.5 rounded-full">Obra de Construção Civil</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cadastro Nacional de Obras. Utilizado pelas construtoras e empreiteiras para alocar trabalhadores da construção civil em canteiros de obras específicos (NR-18).
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowESocialInfoModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && selectedClient && (
        <div id="modal-delete-client" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/20 text-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Cliente / Empregador</h3>
                <p className="text-xs text-slate-400">Esta ação removerá a empresa do sistema.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Tem certeza de que deseja remover <strong className="text-white">{selectedClient.trade_name}</strong>?
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteClient}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Contact Modal */}
      {showNewContactModal && selectedClient && (
        <div id="modal-new-contact" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Adicionar Contato / Responsável</h3>
              <button onClick={() => setShowNewContactModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Cargo / Função</label>
                <input
                  type="text"
                  placeholder="Ex: Coordenador de SST / Gerente de RH"
                  value={contactForm.role}
                  onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  placeholder="joao@empresa.com.br"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-primary"
                  checked={contactForm.is_primary}
                  onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="chk-primary" className="text-slate-300 cursor-pointer">Contato Principal da Empresa</label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewContactModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  Salvar Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
