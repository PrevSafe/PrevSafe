'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Client, ClientContact, ClientUnit } from '@/types';
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
  AlertTriangle
} from 'lucide-react';

export const ClientsView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    clients, 
    contacts, 
    units, 
    addClient, 
    updateClient, 
    deleteClient,
    addContact,
    deleteContact,
    addUnit,
    deleteUnit,
    contracts, 
    serviceOrders 
  } = usePrevSafe();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('ALL');
  const [selectedClient, setSelectedClient] = useState<Client | null>(clients[0] || null);
  
  // Modals
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showNewUnitModal, setShowNewUnitModal] = useState(false);

  // Form State for client (New / Edit)
  const [clientForm, setClientForm] = useState({
    legal_name: '',
    trade_name: '',
    document_number: '',
    main_cnae: '',
    cnae_description: '',
    risk_degree: 3 as 1 | 2 | 3 | 4,
    employee_count: 50,
    email: '',
    phone: '',
    address: '',
    city: 'São Paulo',
    state: 'SP',
    notes: '',
    status: 'ACTIVE' as Client['status']
  });

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
    code: '',
    address: '',
    city: 'São Paulo',
    state: 'SP',
    cnae: '',
    risk_degree: 3 as 1 | 2 | 3 | 4,
    employee_count: 20
  });

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.legal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.trade_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.document_number.includes(searchTerm) ||
      c.main_cnae.includes(searchTerm);

    const matchesRisk = selectedRiskFilter === 'ALL' || c.risk_degree.toString() === selectedRiskFilter;
    return matchesSearch && matchesRisk;
  });

  const handleOpenNewClient = () => {
    setClientForm({
      legal_name: '',
      trade_name: '',
      document_number: '',
      main_cnae: '25.11-0-00',
      cnae_description: 'Fabricação de estruturas metálicas',
      risk_degree: 3,
      employee_count: 50,
      email: '',
      phone: '',
      address: '',
      city: 'São Paulo',
      state: 'SP',
      notes: '',
      status: 'ACTIVE'
    });
    setShowNewClientModal(true);
  };

  const handleOpenEditClient = () => {
    if (!selectedClient) return;
    setClientForm({
      legal_name: selectedClient.legal_name,
      trade_name: selectedClient.trade_name,
      document_number: selectedClient.document_number,
      main_cnae: selectedClient.main_cnae,
      cnae_description: selectedClient.cnae_description,
      risk_degree: selectedClient.risk_degree,
      employee_count: selectedClient.employee_count,
      email: selectedClient.email,
      phone: selectedClient.phone,
      address: selectedClient.address,
      city: selectedClient.city,
      state: selectedClient.state,
      notes: selectedClient.notes || '',
      status: selectedClient.status
    });
    setShowEditClientModal(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.legal_name || !clientForm.trade_name || !clientForm.document_number) {
      alert('Preencha os campos obrigatórios (Razão Social, Nome Fantasia, CNPJ).');
      return;
    }

    if (showEditClientModal && selectedClient) {
      updateClient(selectedClient.id, {
        ...clientForm,
        whatsapp: clientForm.phone.replace(/\D/g, '') || '5511999999999'
      });
      setSelectedClient({
        ...selectedClient,
        ...clientForm,
        whatsapp: clientForm.phone.replace(/\D/g, '') || '5511999999999'
      });
      setShowEditClientModal(false);
    } else {
      const created = addClient({
        ...clientForm,
        whatsapp: clientForm.phone.replace(/\D/g, '') || '5511999999999'
      });
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

    addUnit({
      client_id: selectedClient.id,
      name: unitForm.name,
      address: unitForm.address,
      city: unitForm.city,
      state: unitForm.state,
      cnae: unitForm.cnae || selectedClient.main_cnae,
      employee_count: Number(unitForm.employee_count) || 10,
      status: 'ACTIVE'
    });

    setUnitForm({
      name: '',
      code: '',
      address: '',
      city: 'São Paulo',
      state: 'SP',
      cnae: '',
      risk_degree: 3,
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
      <div id="clients-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">CRM de Clientes & Unidades</h1>
            <p className="text-xs text-slate-400 mt-0.5">Gestão cadastral, filiais, responsáveis e grau de risco ocupacional (NR-04).</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            id="btn-new-client"
            onClick={handleOpenNewClient}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Filters Bar Bento Card */}
      <div id="clients-filter-bar" className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-clients"
            type="text"
            placeholder="Buscar por razão social, CNPJ ou CNAE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium">Grau de Risco:</span>
          <select
            id="select-risk-filter"
            value={selectedRiskFilter}
            onChange={(e) => setSelectedRiskFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todos os Riscos</option>
            <option value="1">Grau 1 (Leve)</option>
            <option value="2">Grau 2 (Médio)</option>
            <option value="3">Grau 3 (Grave)</option>
            <option value="4">Grau 4 (Crítico)</option>
          </select>
        </div>
      </div>

      {/* Main 2-Column Split: Client List & Active Details in Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List */}
        <div id="clients-list" className="lg:col-span-5 space-y-3">
          {filteredClients.map((client) => {
            const isSelected = selectedClient?.id === client.id;
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
                        Risco {client.risk_degree}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-xs">{client.legal_name}</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>CNPJ: {client.document_number}</span>
                  <span className="text-slate-300 font-medium">{client.employee_count} vidas</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Detail Pane */}
        {selectedClient ? (
          <div id="client-detail-pane" className="lg:col-span-7 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header of Detail with Edit & Delete actions */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-bold text-white">{selectedClient.trade_name}</h2>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      selectedClient.risk_degree === 4 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      selectedClient.risk_degree === 3 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      Grau de Risco {selectedClient.risk_degree} (NR-04)
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
                  <button
                    id="btn-create-proposal-for-client"
                    onClick={() => onNavigate('proposals')}
                    className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition"
                  >
                    Criar Proposta
                  </button>
                </div>
              </div>

              {/* General Info Grid Bento */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">CNPJ</span>
                  <span className="font-mono font-medium text-slate-200">{selectedClient.document_number}</span>
                </div>
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">CNAE Principal</span>
                  <span className="font-mono font-medium text-slate-200">{selectedClient.main_cnae}</span>
                  <span className="text-[10px] text-slate-400 block truncate">{selectedClient.cnae_description}</span>
                </div>
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Quadro Funcional</span>
                  <span className="font-bold text-white text-sm">{selectedClient.employee_count} colaboradores</span>
                </div>
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Telefone / WhatsApp</span>
                  <span className="text-slate-200">{selectedClient.phone}</span>
                </div>
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 sm:col-span-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Endereço Principal</span>
                  <span className="text-slate-200">{selectedClient.address} - {selectedClient.city}/{selectedClient.state}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedClient.notes && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-200">
                  <span className="font-bold block mb-0.5 text-amber-300">Observações Técnicas de SST:</span>
                  {selectedClient.notes}
                </div>
              )}

              {/* Contacts & Responsibles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Contatos & Responsáveis</h3>
                  <button
                    id="btn-add-contact-modal"
                    onClick={() => setShowNewContactModal(true)}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar Contato</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {clientContacts.length === 0 ? (
                    <div className="text-xs text-slate-500 col-span-2">Nenhum contato cadastrado para este cliente.</div>
                  ) : (
                    clientContacts.map((cnt) => (
                      <div key={cnt.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between group">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white">{cnt.name}</span>
                            {cnt.is_primary && (
                              <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-full">
                                Principal
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{cnt.role}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-1">{cnt.email} • {cnt.phone}</div>
                        </div>
                        <button
                          onClick={() => deleteContact(cnt.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition"
                          title="Remover Contato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Units & Branches */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Unidades & Plantas Físicas</h3>
                  <button
                    id="btn-add-unit-modal"
                    onClick={() => setShowNewUnitModal(true)}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar Unidade</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {clientUnits.length === 0 ? (
                    <div className="text-xs text-slate-500">Unidade matriz apenas.</div>
                  ) : (
                    clientUnits.map((u) => (
                      <div key={u.id} className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between text-xs group">
                        <div>
                          <div className="font-bold text-white">{u.name} <span className="text-[10px] text-slate-500 font-mono">({u.cnae})</span></div>
                          <div className="text-slate-400">{u.address} - {u.city}/{u.state}</div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-emerald-400 font-semibold">{u.employee_count} vidas</span>
                          <button
                            onClick={() => deleteUnit(u.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition"
                            title="Remover Unidade"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

      {/* New / Edit Client Modal */}
      {(showNewClientModal || showEditClientModal) && (
        <div id="modal-client-form" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{showEditClientModal ? 'Editar Cliente SST' : 'Cadastrar Novo Cliente SST'}</h3>
                <p className="text-xs text-slate-400">Insira as informações da empresa contratante</p>
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

            <form onSubmit={handleSaveClient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Razão Social *</label>
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
                  <label className="block font-semibold text-slate-300 mb-1">Nome Fantasia *</label>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">CNPJ *</label>
                  <input
                    type="text"
                    required
                    placeholder="00.000.000/0001-00"
                    value={clientForm.document_number}
                    onChange={(e) => setClientForm({ ...clientForm, document_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">CNAE Principal</label>
                  <input
                    type="text"
                    placeholder="Ex: 25.11-0-00"
                    value={clientForm.main_cnae}
                    onChange={(e) => setClientForm({ ...clientForm, main_cnae: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Grau de Risco (NR-04)</label>
                  <select
                    value={clientForm.risk_degree}
                    onChange={(e) => setClientForm({ ...clientForm, risk_degree: Number(e.target.value) as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>Grau 1 (Leve)</option>
                    <option value={2}>Grau 2 (Médio)</option>
                    <option value={3}>Grau 3 (Grave)</option>
                    <option value={4}>Grau 4 (Crítico)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nº Empregados</label>
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
                  <label className="block font-semibold text-slate-300 mb-1">Endereço da Planta</label>
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
                  placeholder="Ex: Trabalho com pontes rolantes, ruído contínuo na estamparia..."
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && selectedClient && (
        <div id="modal-delete-client" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/20 text-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Cliente</h3>
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
                  placeholder="Ex: Carlos Silva"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Cargo / Função</label>
                <input
                  type="text"
                  placeholder="Ex: Gerente de RH / Engenheiro de Segurança"
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
                  placeholder="carlos@empresa.com.br"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 98888-7777"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-primary-contact"
                  checked={contactForm.is_primary}
                  onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })}
                  className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="chk-primary-contact" className="text-slate-300 cursor-pointer">Definir como contato principal</label>
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

      {/* New Unit Modal */}
      {showNewUnitModal && selectedClient && (
        <div id="modal-new-unit" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Adicionar Unidade / Filial</h3>
              <button onClick={() => setShowNewUnitModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleAddUnit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nome da Unidade *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Planta Industrial Campinas / CD Guarulhos"
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
                  placeholder="Rod. Santos Dumont, km 60"
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
                  <label className="block font-semibold text-slate-300 mb-1">Grau de Risco</label>
                  <select
                    value={unitForm.risk_degree}
                    onChange={(e) => setUnitForm({ ...unitForm, risk_degree: Number(e.target.value) as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>Grau 1</option>
                    <option value={2}>Grau 2</option>
                    <option value={3}>Grau 3</option>
                    <option value={4}>Grau 4</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Vidas / Funcionários</label>
                  <input
                    type="number"
                    value={unitForm.employee_count}
                    onChange={(e) => setUnitForm({ ...unitForm, employee_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
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
    </div>
  );
};
