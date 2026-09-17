'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Tenant, SaaSSubscriptionPlan, TenantStatus, SubscriptionPlanId } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  ShieldCheck, 
  KeyRound, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ExternalLink, 
  Copy, 
  Send, 
  DollarSign, 
  Layers, 
  Database, 
  Server, 
  HelpCircle, 
  Check, 
  Smartphone, 
  Mail, 
  Settings, 
  ArrowRight, 
  UserCheck, 
  Eye, 
  LogOut, 
  Trash2, 
  Edit3, 
  Sparkles,
  Lock,
  Globe,
  Radio,
  FileText
} from 'lucide-react';
import { shareViaChannel } from '@/lib/shareLinks';

export const SaaSManagementView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    tenants = [], 
    saasPlans = [], 
    createTenant, 
    updateTenant, 
    toggleTenantStatus, 
    switchTenantContext, 
    activeTenantContext,
    generateTenantInviteLink,
    resendTenantInvite,
    deleteTenant 
  } = usePrevSafe();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [isNewTenantModalOpen, setIsNewTenantModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState<Tenant | null>(null);
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'TENANTS' | 'PLANS' | 'INVITES'>('TENANTS');
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // Form State for New Tenant
  const [formData, setFormData] = useState({
    name: '',
    trade_name: '',
    document_number: '',
    email: '',
    phone: '',
    whatsapp: '',
    city: '',
    state: 'SP',
    plan_id: 'PRO' as SubscriptionPlanId,
    billing_cycle: 'MONTHLY' as 'MONTHLY' | 'ANNUAL',
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    max_companies_limit: 60,
    max_users_limit: 12,
    notes: ''
  });

  // Calculate SaaS Metrics
  const activeTenants = tenants.filter(t => t.status === 'ACTIVE' || t.status === 'TRIAL');
  const totalMRR = activeTenants.reduce((acc, t) => acc + (t.mrr || 0), 0);
  const totalManagedClients = tenants.reduce((acc, t) => acc + (t.active_companies_count || 0), 0);
  const totalInternalUsers = tenants.reduce((acc, t) => acc + (t.active_users_count || 0), 0);

  // Filtered Tenants List
  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      t.trade_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.document_number.includes(searchTerm) ||
      t.admin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.admin_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPlan = planFilter === 'ALL' || t.plan_id === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleCopyInvite = (tenantId: string) => {
    const { url } = generateTenantInviteLink(tenantId);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedTokenId(tenantId);
      setTimeout(() => setCopiedTokenId(null), 3000);
    }
  };

  const handleResendInvite = (tenantId: string, channel: 'WHATSAPP' | 'EMAIL') => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    const result = resendTenantInvite(tenantId, channel);
    if (!result.success) return;

    const share = shareViaChannel(channel, {
      phone: tenant.admin_phone || tenant.whatsapp || tenant.phone,
      email: tenant.admin_email,
      subject: `Acesso PrevSafe SST - ${tenant.trade_name}`,
      message: `Olá ${tenant.admin_name}! Seu ambiente PrevSafe SST para a consultoria ${tenant.trade_name} está pronto. Acesse por: ${result.url}`,
      recipientName: tenant.admin_name,
    });

    setInviteSuccessMsg(share.message);
    setTimeout(() => setInviteSuccessMsg(null), 5000);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.trade_name || !formData.admin_name || !formData.admin_email) {
      alert('Por favor, preencha o Nome Fantasia da Consultoria, Nome do Administrador e E-mail.');
      return;
    }

    const created = createTenant({
      ...formData,
      name: formData.name || formData.trade_name
    });

    setIsNewTenantModalOpen(false);
    setInviteSuccessMsg(`Consultoria ${created.trade_name} cadastrada com sucesso! Link de ativação gerado.`);
    setTimeout(() => setInviteSuccessMsg(null), 5000);

    // Reset Form
    setFormData({
      name: '',
      trade_name: '',
      document_number: '',
      email: '',
      phone: '',
      whatsapp: '',
      city: '',
      state: 'SP',
      plan_id: 'PRO',
      billing_cycle: 'MONTHLY',
      admin_name: '',
      admin_email: '',
      admin_phone: '',
      max_companies_limit: 60,
      max_users_limit: 12,
      notes: ''
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForEdit) return;

    updateTenant(selectedTenantForEdit.id, {
      trade_name: selectedTenantForEdit.trade_name,
      name: selectedTenantForEdit.name,
      document_number: selectedTenantForEdit.document_number,
      plan_id: selectedTenantForEdit.plan_id,
      status: selectedTenantForEdit.status,
      max_companies_limit: selectedTenantForEdit.max_companies_limit,
      max_users_limit: selectedTenantForEdit.max_users_limit,
      admin_name: selectedTenantForEdit.admin_name,
      admin_email: selectedTenantForEdit.admin_email,
      admin_phone: selectedTenantForEdit.admin_phone,
      notes: selectedTenantForEdit.notes
    });

    setIsEditModalOpen(false);
    setSelectedTenantForEdit(null);
  };

  const getStatusBadge = (status: TenantStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Ativo</span>;
      case 'TRIAL':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"><Sparkles className="w-3 h-3 mr-1" /> Em Teste (Trial)</span>;
      case 'PAST_DUE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><AlertTriangle className="w-3 h-3 mr-1" /> Pendente / Vencido</span>;
      case 'SUSPENDED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><AlertTriangle className="w-3 h-3 mr-1" /> Suspenso</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20"><XCircle className="w-3 h-3 mr-1" /> Cancelado</span>;
    }
  };

  const getPlanBadge = (planId: SubscriptionPlanId) => {
    switch (planId) {
      case 'STARTER':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">Starter</span>;
      case 'PRO':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40">Professional</span>;
      case 'ENTERPRISE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">Enterprise</span>;
      case 'CUSTOM':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">Custom</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Active Impersonation Context Alert */}
      {activeTenantContext && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-600/20 to-orange-500/20 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between text-amber-200 shadow-xl backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 rounded-xl">
              <Eye className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Modo de Suporte / Impersonação Ativo</p>
              <p className="text-sm text-amber-100">
                Você está visualizando o ecossistema como <strong>{activeTenantContext.trade_name}</strong> ({activeTenantContext.admin_name}).
              </p>
            </div>
          </div>
          <button
            onClick={() => switchTenantContext(null)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair do Modo Suporte</span>
          </button>
        </div>
      )}

      {/* Success Notification Alert */}
      {inviteSuccessMsg && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between text-emerald-200 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-xs sm:text-sm font-medium">{inviteSuccessMsg}</p>
          </div>
          <button onClick={() => setInviteSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header Bento Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-teal-950/50 shrink-0">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black text-white tracking-tight">Gestão de Assinantes SaaS</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-md">
                  Super Admin
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Controle central de consultorias contratantes do software PrevSafe SST, provisionamento de novas contas, controle de planos, limites e faturamento recorrente.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsArchitectureModalOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-semibold transition"
            >
              <Database className="w-4 h-4 text-teal-400" />
              <span>Como Funciona o Banco / RLS</span>
            </button>

            <button
              onClick={() => setIsNewTenantModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold rounded-2xl text-xs transition shadow-lg shadow-teal-950/50"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Nova Consultoria</span>
            </button>
          </div>
        </div>

        {/* Key SaaS Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>MRR Total (Recorrente)</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-emerald-400">{formatCurrency(totalMRR)}<span className="text-[10px] text-slate-500 font-normal">/mês</span></p>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Consultorias Ativas</span>
              <Building2 className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{activeTenants.length} <span className="text-xs font-normal text-slate-500">de {tenants.length}</span></p>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Empresas Gerenciadas</span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{totalManagedClients} <span className="text-xs font-normal text-slate-500">clientes finais</span></p>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Usuários Internos SST</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{totalInternalUsers} <span className="text-xs font-normal text-slate-500">técnicos / admins</span></p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('TENANTS')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === 'TENANTS'
              ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Consultorias Cadastradas ({tenants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PLANS')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
            activeTab === 'PLANS'
              ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Planos de Assinatura ({saasPlans.length})</span>
        </button>
      </div>

      {/* TAB CONTENT: TENANTS LIST */}
      {activeTab === 'TENANTS' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-lg">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar consultoria, CNPJ, admin ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center space-x-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-400">Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-300 focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">Todos os Status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="TRIAL">Trial / Em Teste</option>
                <option value="PAST_DUE">Pendentes / Vencidos</option>
                <option value="SUSPENDED">Suspensos</option>
                <option value="CANCELLED">Cancelados</option>
              </select>

              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-300 focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">Todos os Planos</option>
                <option value="STARTER">Starter</option>
                <option value="PRO">Professional</option>
                <option value="ENTERPRISE">Enterprise</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
          </div>

          {/* Tenants List Grid */}
          <div className="grid grid-cols-1 gap-4">
            {filteredTenants.map((tenant) => (
              <div 
                key={tenant.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-xl transition space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Company Info */}
                  <div className="flex items-start space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 shrink-0 font-bold text-sm">
                      {tenant.trade_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-white">{tenant.trade_name}</h3>
                        {getStatusBadge(tenant.status)}
                        {getPlanBadge(tenant.plan_id)}
                        <span className="text-[11px] text-slate-400 font-mono">CNPJ: {tenant.document_number}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {tenant.name} • {tenant.city}/{tenant.state} • Cadastrado em {formatDateTime(tenant.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Pricing & Limits */}
                  <div className="flex flex-wrap items-center gap-4 lg:text-right">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Mensalidade SaaS</span>
                      <span className="text-base font-bold text-emerald-400">{formatCurrency(tenant.mrr)}<span className="text-[10px] text-slate-500">/mês</span></span>
                    </div>

                    <div className="w-px h-8 bg-slate-800 hidden sm:block" />

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Clientes Cadastrados</span>
                      <span className="text-xs font-semibold text-slate-200">
                        {tenant.active_companies_count} / {tenant.max_companies_limit} empresas
                      </span>
                    </div>

                    <div className="w-px h-8 bg-slate-800 hidden sm:block" />

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Usuários da Consultoria</span>
                      <span className="text-xs font-semibold text-slate-200">
                        {tenant.active_users_count} / {tenant.max_users_limit} licenças
                      </span>
                    </div>
                  </div>
                </div>

                {/* Administrator Contact & Onboarding Link */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400">
                      <UserCheck className="w-4 h-4 text-teal-400" />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Administrador Principal</span>
                      <span className="text-white font-medium">{tenant.admin_name}</span>
                      <span className="text-slate-400 text-[11px] block">{tenant.admin_email} • {tenant.admin_phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4">
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-400 block text-[10px]">Link de Onboarding / Ativação:</span>
                      <p className="text-slate-300 font-mono text-[11px] truncate">
                        {tenant.invite_url || `https://prevsafe.com.br/onboarding?token=${tenant.invite_token}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => handleCopyInvite(tenant.id)}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center space-x-1 transition ${
                          copiedTokenId === tenant.id 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                        title="Copiar Link de Primeiro Acesso"
                      >
                        {copiedTokenId === tenant.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedTokenId === tenant.id ? 'Copiado!' : 'Copiar Link'}</span>
                      </button>

                      <button
                        onClick={() => handleResendInvite(tenant.id, 'WHATSAPP')}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center space-x-1 transition"
                        title="Disparar via WhatsApp"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Enviar WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                    <Database className="w-3.5 h-3.5 text-teal-400" />
                    <span>Isolamento: <strong>PostgreSQL RLS (tenant_id)</strong></span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Impersonate / Support Access */}
                    <button
                      onClick={() => switchTenantContext(tenant.id)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-semibold transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Acessar Ambiente (Suporte)</span>
                    </button>

                    {/* Toggle Status (Active / Suspended) */}
                    {tenant.status === 'ACTIVE' ? (
                      <button
                        onClick={() => toggleTenantStatus(tenant.id, 'SUSPENDED')}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Suspender</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleTenantStatus(tenant.id, 'ACTIVE')}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Reativar</span>
                      </button>
                    )}

                    {/* Edit Details */}
                    <button
                      onClick={() => {
                        setSelectedTenantForEdit(tenant);
                        setIsEditModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition"
                      title="Editar Consultoria"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Tenant */}
                    <button
                      onClick={() => {
                        if (confirm(`Deseja realmente remover a consultoria ${tenant.trade_name}? Esta ação não pode ser desfeita.`)) {
                          deleteTenant(tenant.id);
                        }
                      }}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition"
                      title="Excluir Consultoria"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredTenants.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <h4 className="text-base font-bold text-white">Nenhuma consultoria encontrada</h4>
                <p className="text-xs text-slate-400 mt-1">Ajuste os filtros de busca ou cadastre uma nova consultoria parceira.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SAAS SUBSCRIPTION PLANS */}
      {activeTab === 'PLANS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {saasPlans.map((plan) => {
              const subscribersCount = tenants.filter(t => t.plan_id === plan.id && t.status === 'ACTIVE').length;
              const isPopular = plan.id === 'PRO';
              return (
                <div 
                  key={plan.id}
                  className={`bg-slate-900 rounded-3xl p-6 sm:p-7 border shadow-xl flex flex-col justify-between ${
                    isPopular 
                      ? 'border-teal-500/60 ring-1 ring-teal-500/30 relative' 
                      : 'border-slate-800'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black text-[10px] uppercase rounded-full shadow-md">
                      Plano Mais Vendido
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-black text-white">{plan.name}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {subscribersCount} assinantes
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">{plan.description}</p>

                    <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 mb-5">
                      <div className="flex items-baseline">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-400">{formatCurrency(plan.monthly_price)}</span>
                        <span className="text-xs text-slate-500 ml-1">/mês</span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        ou {formatCurrency(plan.yearly_price)}/ano (com desconto anual)
                      </span>
                    </div>

                    <div className="space-y-2.5 mb-6 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Empresas Clientes:</span>
                        <strong className="text-white">Até {plan.max_managed_companies} empresas</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Usuários Internos:</span>
                        <strong className="text-white">Até {plan.max_internal_users} técnicos/admins</strong>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-4 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Recursos Principais:</span>
                      <div className="flex items-start space-x-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                        <span>Transmissão eSocial Direta: {plan.esocial_direct_transmission ? 'Inclusa' : 'Básica'}</span>
                      </div>
                      <div className="flex items-start space-x-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                        <span>Automações de WhatsApp: {plan.whatsapp_automations ? 'Sim' : 'Não'}</span>
                      </div>
                      <div className="flex items-start space-x-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                        <span>IA Copilot SST: {plan.ai_copilot_sst ? 'Disponível' : 'Não'}</span>
                      </div>
                      <div className="flex items-start space-x-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                        <span>White-Label / Logotipo Próprio: {plan.custom_white_label ? 'Sim' : 'Não'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-800/80 mt-6">
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, plan_id: plan.id }));
                        setIsNewTenantModalOpen(true);
                      }}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Cadastrar Assinante no {plan.name}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: NEW TENANT / SUBSCRIBER ONBOARDING */}
      {isNewTenantModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cadastrar Nova Consultoria / Assinante</h3>
                  <p className="text-xs text-slate-400">Cria o ambiente isolado do cliente e gera o link seguro de primeiro acesso.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsNewTenantModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nome Fantasia da Consultoria *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: SegurMed SST Consultoria"
                    value={formData.trade_name}
                    onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Razão Social</label>
                  <input
                    type="text"
                    placeholder="Ex: SegurMed Medicina e Segurança Ltda"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">CNPJ / CPF</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={formData.document_number}
                    onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Cidade / UF</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="São Paulo"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="col-span-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    <input
                      type="text"
                      placeholder="SP"
                      maxLength={2}
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white text-center uppercase placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Subscription Plan Selection */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-white block">Plano Contratado & Ciclo de Cobrança</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {saasPlans.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, plan_id: p.id, max_companies_limit: p.max_managed_companies, max_users_limit: p.max_internal_users })}
                      className={`p-3 rounded-xl border text-left transition ${
                        formData.plan_id === p.id 
                          ? 'bg-teal-500/10 border-teal-500 text-teal-300' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold block text-white">{p.name}</span>
                      <span className="text-xs text-emerald-400 font-bold">{formatCurrency(p.monthly_price)}/mês</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Até {p.max_managed_companies} clientes</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Limite Máximo de Clientes</label>
                    <input
                      type="number"
                      value={formData.max_companies_limit}
                      onChange={(e) => setFormData({ ...formData, max_companies_limit: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Limite Máximo de Técnicos</label>
                    <input
                      type="number"
                      value={formData.max_users_limit}
                      onChange={(e) => setFormData({ ...formData, max_users_limit: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Administrator Contact Info */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-white block">Dados do Administrador da Consultoria (Primeiro Acesso)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Dr. Roberto Alencar"
                      value={formData.admin_name}
                      onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">E-mail Corporativo *</label>
                    <input
                      type="email"
                      required
                      placeholder="roberto@segurmed.com.br"
                      value={formData.admin_email}
                      onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">WhatsApp para Convite</label>
                    <input
                      type="text"
                      placeholder="(11) 98765-4321"
                      value={formData.admin_phone}
                      onChange={(e) => setFormData({ ...formData, admin_phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTenantModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-teal-950/40"
                >
                  Criar Ambiente e Gerar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TENANT */}
      {isEditModalOpen && selectedTenantForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Editar Consultoria: {selectedTenantForEdit.trade_name}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    value={selectedTenantForEdit.trade_name}
                    onChange={(e) => setSelectedTenantForEdit({ ...selectedTenantForEdit, trade_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Status</label>
                  <select
                    value={selectedTenantForEdit.status}
                    onChange={(e) => setSelectedTenantForEdit({ ...selectedTenantForEdit, status: e.target.value as TenantStatus })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="ACTIVE">ACTIVE (Ativo)</option>
                    <option value="TRIAL">TRIAL (Em Teste)</option>
                    <option value="PAST_DUE">PAST_DUE (Vencido)</option>
                    <option value="SUSPENDED">SUSPENDED (Suspenso)</option>
                    <option value="CANCELLED">CANCELLED (Cancelado)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Plano SaaS</label>
                  <select
                    value={selectedTenantForEdit.plan_id}
                    onChange={(e) => setSelectedTenantForEdit({ ...selectedTenantForEdit, plan_id: e.target.value as SubscriptionPlanId })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="STARTER">Starter</option>
                    <option value="PRO">Professional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Limite de Empresas</label>
                  <input
                    type="number"
                    value={selectedTenantForEdit.max_companies_limit}
                    onChange={(e) => setSelectedTenantForEdit({ ...selectedTenantForEdit, max_companies_limit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Admin Principal</label>
                  <input
                    type="text"
                    value={selectedTenantForEdit.admin_name}
                    onChange={(e) => setSelectedTenantForEdit({ ...selectedTenantForEdit, admin_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">E-mail do Admin</label>
                  <input
                    type="email"
                    value={selectedTenantForEdit.admin_email}
                    onChange={(e) => setSelectedTenantForEdit({ ...selectedTenantForEdit, admin_email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ARCHITECTURAL EXPLAINER (HOW MULTI-TENANCY WORKS IN PRACTICE) */}
      {isArchitectureModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Como Funciona a Separação de Dados no SaaS?</h3>
                  <p className="text-xs text-slate-400">Entenda a arquitetura de isolamento seguro (Shared Database vs. tenant_id).</p>
                </div>
              </div>
              <button onClick={() => setIsArchitectureModalOpen(false)} className="text-slate-400 hover:text-white rounded-xl bg-slate-800 p-1.5">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <h4 className="text-sm font-bold text-teal-400 mb-1">1. Banco Compartilhado com Separação Lógica (Row-Level Security)</h4>
                <p>
                  No padrão de ouro da indústria SaaS (usado por Notion, Slack e Salesforce), <strong>todas as consultorias utilizam o mesmo banco de dados relacional (PostgreSQL)</strong>. Cada tabela (clientes, ordens de serviço, laudos, exames, eventos eSocial) possui uma coluna obrigatória: <code className="px-1.5 py-0.5 bg-slate-800 text-teal-300 rounded font-mono">tenant_id</code> (ou <code className="px-1.5 py-0.5 bg-slate-800 text-teal-300 rounded font-mono">organization_id</code>).
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <h4 className="text-sm font-bold text-emerald-400 mb-1">2. Garantia Absoluta de Privacidade e Impossibilidade de Vazamento</h4>
                <p>
                  O banco aplica políticas automáticas de segurança a nível de linha (<strong>Row Level Security - RLS</strong>). Quando a consultoria &quot;Alpha SST&quot; consulta dados, o banco só retorna registros onde <code className="px-1.5 py-0.5 bg-slate-800 text-emerald-300 rounded font-mono">tenant_id = &apos;alpha&apos;</code>. Ela nunca conseguirá ver laudos, clientes ou dados da &quot;Beta Medicina&quot;.
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <h4 className="text-sm font-bold text-blue-400 mb-1">3. Como Funciona a Liberação do Acesso na Prática?</h4>
                <ol className="list-decimal pl-4 space-y-1.5 mt-2">
                  <li><strong>Venda Fechada:</strong> Você entra neste painel Super Admin e clica em <em>&quot;Cadastrar Nova Consultoria&quot;</em>.</li>
                  <li><strong>Geração do Token:</strong> O sistema cria o registro da consultoria e gera um <strong>Token Criptografado de Primeiro Acesso</strong>.</li>
                  <li><strong>Envio Automático:</strong> O sistema envia um WhatsApp ou E-mail para o responsável com o link único: <code className="text-teal-300 font-mono text-[11px]">prevsafe.com.br/onboarding?token=xyz</code>.</li>
                  <li><strong>Primeiro Login:</strong> O administrador da consultoria clica no link, define sua senha mestra e já acessa seu ambiente limpo e personalizado.</li>
                  <li><strong>Gestão de Técnicos:</strong> Ele mesmo cadastra seus próprios médicos, engenheiros e clientes finais, tudo isolado no ID dele!</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsArchitectureModalOpen(false)}
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                Entendi, Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
