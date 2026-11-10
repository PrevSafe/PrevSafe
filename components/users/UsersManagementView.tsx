'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Profile, RoleType, PermissionModule, PermissionDefinition } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase';
import { getAppUrl } from '@/lib/appUrl';
import { shareViaChannel } from '@/lib/shareLinks';
import { conferirDocumento } from '@/lib/validacoesBr';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Smartphone, 
  Mail, 
  Building2, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Copy, 
  Check, 
  Send, 
  UserCheck, 
  RefreshCw, 
  AlertTriangle, 
  ShieldAlert, 
  Sliders, 
  FileSpreadsheet, 
  Download, 
  Activity, 
  Eye, 
  Briefcase, 
  Award, 
  BadgeCheck, 
  ExternalLink,
  Phone,
  MessageSquare,
  History,
  Shield,
  Layers,
  ChevronRight,
  Info,
  X,
  Laptop
} from 'lucide-react';

// RBAC Permissions Catalog
export const PERMISSIONS_CATALOG: PermissionDefinition[] = [
  // 1. Dashboards
  {
    id: 'perm-dash-exec',
    module: 'DASHBOARDS',
    code: 'VIEW_EXECUTIVE_DASHBOARD',
    name: 'Visualizar Dashboard Executivo',
    description: 'Acesso a métricas de receita, margem, SLA RN004 e saúde do negócio.',
    default_roles: ['ADMIN', 'GESTOR', 'FINANCEIRO']
  },
  {
    id: 'perm-dash-oper',
    module: 'DASHBOARDS',
    code: 'VIEW_OPERATIONAL_DASHBOARD',
    name: 'Visualizar Dashboard Operacional',
    description: 'Monitoramento de ordens de serviço em andamento, gargalos e prazos de NRs.',
    default_roles: ['ADMIN', 'GESTOR', 'TÉCNICO']
  },
  {
    id: 'perm-dash-comm',
    module: 'DASHBOARDS',
    code: 'VIEW_COMMERCIAL_DASHBOARD',
    name: 'Visualizar Dashboard Comercial & Funil',
    description: 'Taxa de conversão de propostas, ticket médio e pipeline de vendas.',
    default_roles: ['ADMIN', 'GESTOR', 'COMERCIAL']
  },

  // 2. CRM & Comercial
  {
    id: 'perm-crm-manage',
    module: 'CRM',
    code: 'MANAGE_CLIENTS_LEADS',
    name: 'Gerenciar Clientes, Unidades e Leads',
    description: 'Cadastrar e editar dados cadastrais de clientes, CNAE, grau de risco e contatos.',
    default_roles: ['ADMIN', 'GESTOR', 'COMERCIAL']
  },
  {
    id: 'perm-prop-create',
    module: 'CRM',
    code: 'CREATE_PROPOSALS_CONTRACTS',
    name: 'Elaborar Propostas & Contratos SST',
    description: 'Gerar propostas comerciais com regras de precificação e minutas de contrato.',
    default_roles: ['ADMIN', 'GESTOR', 'COMERCIAL']
  },
  {
    id: 'perm-contract-sign',
    module: 'CRM',
    code: 'APPROVE_SIGN_CONTRACTS',
    name: 'Validar e Coletar Assinatura Digital',
    description: 'Formalizar contratos com link de assinatura eletrônica auditada.',
    default_roles: ['ADMIN', 'GESTOR', 'CLIENTE_ADMIN']
  },

  // 3. Operações SST
  {
    id: 'perm-os-manage',
    module: 'SERVICE_ORDERS',
    code: 'MANAGE_SERVICE_ORDERS',
    name: 'Criar e Gerenciar Ordens de Serviço (OS)',
    description: 'Abertura, atribuição técnica, controle de etapas e gestão de prazos (SLA).',
    default_roles: ['ADMIN', 'GESTOR', 'TÉCNICO']
  },
  {
    id: 'perm-os-sla-pause',
    module: 'SERVICE_ORDERS',
    code: 'PAUSE_SLA_JUSTIFIED',
    name: 'Pausar Cronômetro de SLA (RN004)',
    description: 'Suspender temporariamente o SLA por pendência de documentos do cliente.',
    default_roles: ['ADMIN', 'GESTOR']
  },
  {
    id: 'perm-docs-publish',
    module: 'DOCUMENTS',
    code: 'PUBLISH_SST_DOCUMENTS',
    name: 'Aprovar e Liberar Documentos (PGR/PCMSO)',
    description: 'Revisar laudos técnicos e liberar versão oficial no portal do cliente.',
    default_roles: ['ADMIN', 'GESTOR', 'TÉCNICO', 'SAUDE']
  },

  // 3.1 Saude ocupacional. Estas duas linhas espelham a RLS do banco
  // (supabase/migrations/20261005120000_papel_saude_e_isolamento_de_clientes.sql):
  // la elas valem pela API, nao so na tela.
  {
    id: 'perm-health-records',
    module: 'OCCUPATIONAL_HEALTH',
    code: 'ACCESS_HEALTH_RECORDS',
    name: 'Protocolos do PCMSO, CAT e Afastamentos (CID-10)',
    description: 'Coleções de saúde: protocolos de exame, CAT e afastamentos. O banco recusa os demais papéis.',
    default_roles: ['ADMIN', 'GESTOR', 'SAUDE']
  },
  {
    id: 'perm-health-results',
    module: 'OCCUPATIONAL_HEALTH',
    code: 'READ_WRITE_EXAM_RESULTS',
    name: 'Ler e Lançar Resultado de Exame (Prontuário)',
    description: 'Resultado e observação de cada exame, conclusão "apto com restrição" e a restrição do ASO. Os demais papéis veem só tipo, data, validade e apto/inapto.',
    default_roles: ['ADMIN', 'SAUDE']
  },

  // 4. PWA de Campo
  {
    id: 'perm-field-inspect',
    module: 'FIELD_PWA',
    code: 'EXECUTE_FIELD_INSPECTION',
    name: 'Realizar Vistorias Offline no PWA',
    description: 'Coletar evidências fotográficas com geolocalização e preencher checklists.',
    default_roles: ['ADMIN', 'GESTOR', 'TÉCNICO']
  },
  {
    id: 'perm-field-signature',
    module: 'FIELD_PWA',
    code: 'COLLECT_FIELD_SIGNATURE',
    name: 'Colher Assinatura em Campo',
    description: 'Assinatura digital na tela do tablet/smartphone pelo responsável da unidade.',
    default_roles: ['ADMIN', 'GESTOR', 'TÉCNICO']
  },

  // 5. eSocial SST
  {
    id: 'perm-esocial-view',
    module: 'ESOCIAL',
    code: 'VIEW_ESOCIAL_EVENTS',
    name: 'Consultar Eventos S-2210, S-2220 e S-2240',
    description: 'Visualizar status de transmissão, protocolo do governo e recibos.',
    default_roles: ['ADMIN', 'GESTOR', 'TÉCNICO', 'SAUDE']
  },
  {
    id: 'perm-esocial-transmit',
    module: 'ESOCIAL',
    code: 'TRANSMIT_ESOCIAL_BATCHES',
    name: 'Transmitir Lotes com Certificado Digital A1',
    description: 'Disparar envio de XMLs assinados para o ambiente oficial do eSocial (Governo).',
    default_roles: ['ADMIN', 'GESTOR']
  },

  // 6. Financeiro
  {
    id: 'perm-fin-transactions',
    module: 'FINANCIAL',
    code: 'MANAGE_FINANCIAL_TRANSACTIONS',
    name: 'Gestão de Contas a Pagar e Receber',
    description: 'Lançar despesas, faturamento de contratos, conciliação e fluxo de caixa.',
    default_roles: ['ADMIN', 'FINANCEIRO']
  },
  {
    id: 'perm-fin-reconcile',
    module: 'FINANCIAL',
    code: 'EXECUTE_BANK_RECONCILIATION',
    name: 'Executar Conciliação Bancária',
    description: 'Baixa de títulos, liquidação automática e conciliação de extratos.',
    default_roles: ['ADMIN', 'FINANCEIRO']
  },

  // 7. Portal do Cliente
  {
    id: 'perm-portal-view',
    module: 'CLIENT_PORTAL',
    code: 'ACCESS_CLIENT_PORTAL',
    name: 'Acesso ao Portal Corporativo do Cliente',
    description: 'Laudos liberados, OS, contratos, pendências, assinaturas e avaliações da própria empresa. Sem dado de saúde nem de outros clientes.',
    default_roles: ['CLIENTE_ADMIN', 'CLIENTE_USER', 'ADMIN', 'GESTOR']
  },
  {
    id: 'perm-portal-approve',
    module: 'CLIENT_PORTAL',
    code: 'APPROVE_SERVICES_CLIENT',
    name: 'Aprovar Entregas e Solicitar Revisões',
    description: 'Dar aceite formal em laudos entregues ou abrir chamados de revisão.',
    default_roles: ['CLIENTE_ADMIN']
  },

  // 8. Governança e Usuários
  {
    id: 'perm-users-manage',
    module: 'USERS_ACCESS',
    code: 'MANAGE_USERS_ROLES',
    name: 'Gerenciar Usuários e Perfis de Acesso',
    description: 'Criar contas, alterar perfis, redefinir senhas e configurar matriz RBAC.',
    default_roles: ['ADMIN']
  },
  {
    id: 'perm-audit-logs',
    module: 'SETTINGS_AUDIT',
    code: 'VIEW_AUDIT_LOGS_RN011',
    name: 'Acessar Trilha de Auditoria Imutável',
    description: 'Consultar logs de segurança, histórico de alterações e conformidade LGPD.',
    default_roles: ['ADMIN', 'GESTOR']
  }
];

export const ROLE_INFO: Record<RoleType, {
  label: string;
  badgeColor: string;
  bgBadge: string;
  borderBadge: string;
  description: string;
  targetAudience: string;
}> = {
  ADMIN: {
    label: 'Administrador Geral SaaS',
    badgeColor: 'text-rose-700',
    bgBadge: 'bg-rose-500/10',
    borderBadge: 'border-rose-500/20',
    description: 'Acesso irrestrito a todos os módulos, configurações da organização, auditoria e faturamento.',
    targetAudience: 'Sócios, Diretores e Gerentes de TI/SaaS'
  },
  GESTOR: {
    label: 'Gestor Operacional & Técnico',
    badgeColor: 'text-cyan-700',
    bgBadge: 'bg-cyan-500/10',
    borderBadge: 'border-cyan-500/20',
    description: 'Coordenação de equipes de campo, controle de SLA RN004, validação de laudos e eSocial. Vê tipo, data, validade e apto/inapto do ASO; o resultado de exame é do papel Saúde.',
    targetAudience: 'Coordenadores de SST e Engenheiros Chefes'
  },
  COMERCIAL: {
    label: 'Executivo Comercial',
    badgeColor: 'text-amber-700',
    bgBadge: 'bg-amber-500/10',
    borderBadge: 'border-amber-500/20',
    description: 'Gestão de funil de vendas, elaboração de propostas e acompanhamento de assinaturas.',
    targetAudience: 'Consultores de Vendas e Gerentes de Contas'
  },
  SAUDE: {
    label: 'Saúde Ocupacional (Médico)',
    badgeColor: 'text-pink-700',
    bgBadge: 'bg-pink-500/10',
    borderBadge: 'border-pink-500/20',
    description: 'PCMSO, ASO e prontuário: único papel, além do Administrador, que lê e lança resultado de exame, observação clínica e restrição.',
    targetAudience: 'Médico do Trabalho coordenador do PCMSO e a equipe que ele supervisiona'
  },
  TÉCNICO: {
    label: 'Engenheiro / Técnico de Campo',
    badgeColor: 'text-marca-escura',
    bgBadge: 'bg-marca-suave',
    borderBadge: 'border-marca-escura',
    description: 'Execução de OS, coletas no PWA de Campo, fotos GPS, checklists e eventos eSocial.',
    targetAudience: 'Técnicos em Segurança do Trabalho e Engenheiros de Campo'
  },
  FINANCEIRO: {
    label: 'Controladoria & Financeiro',
    badgeColor: 'text-marca-escura',
    bgBadge: 'bg-marca-suave',
    borderBadge: 'border-marca-escura',
    description: 'Faturamento de contratos recorrentes, contas a pagar/receber e conciliação bancária.',
    targetAudience: 'Analistas Financeiros e Contadores'
  },
  CLIENTE_ADMIN: {
    label: 'Cliente - Gestor / RH',
    badgeColor: 'text-purple-700',
    bgBadge: 'bg-purple-500/10',
    borderBadge: 'border-purple-500/20',
    description: 'Portal do cliente da própria empresa: aceite de OS, laudos liberados, pendências e assinaturas.',
    targetAudience: 'Diretores de RH, Coordenadores SESMT e Gestores da Contratante'
  },
  CLIENTE_USER: {
    label: 'Cliente - Colaborador',
    badgeColor: 'text-blue-700',
    bgBadge: 'bg-blue-500/10',
    borderBadge: 'border-blue-500/20',
    description: 'Portal do cliente da própria empresa, com o mesmo alcance do Gestor/RH do cliente.',
    targetAudience: 'Supervisores de setor, CIPA e Colaboradores da empresa'
  }
};

export const UsersManagementView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    profiles = [], 
    clients = [], 
    currentProfile, 
    addProfile, 
    updateProfile, 
    deleteProfile, 
    toggleProfileStatus,
    impersonateProfile,
    sendUserInvite,
    auditLogs = []
  } = usePrevSafe();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'users' | 'rbac' | 'security'>('users');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modals state
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
  const [inviteModalData, setInviteModalData] = useState<{ profile: Profile; url: string; tempPass?: string } | null>(null);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState<{ name: string; pass: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State for Create / Edit
  const [formData, setFormData] = useState<{
    full_name: string;
    email: string;
    phone: string;
    whatsapp: string;
    role: RoleType;
    department: string;
    job_title: string;
    cpf: string;
    professional_register: string;
    professional_register_uf: string;
    client_id: string;
    status: 'ACTIVE' | 'INACTIVE';
    two_factor_enabled: boolean;
    send_invite_now: boolean;
    password: string;
  }>({
    full_name: '',
    email: '',
    phone: '',
    whatsapp: '',
    role: 'TÉCNICO',
    department: '',
    job_title: '',
    cpf: '',
    professional_register: '',
    professional_register_uf: '',
    client_id: '',
    status: 'ACTIVE',
    two_factor_enabled: false,
    send_invite_now: true,
    password: ''
  });
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isResettingPasswordId, setIsResettingPasswordId] = useState<string | null>(null);

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
  };

  // Fetches the current admin's real Supabase session token, required by the admin API routes
  const getAuthToken = async (): Promise<string | null> => {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  // Calculate quick metrics
  const totalUsers = profiles.length;
  const activeUsers = profiles.filter(p => p.status === 'ACTIVE').length;
  const techUsers = profiles.filter(p => p.role === 'TÉCNICO').length;
  const clientUsers = profiles.filter(p => p.role === 'CLIENTE_ADMIN' || p.role === 'CLIENTE_USER').length;
  const twoFactorUsers = profiles.filter(p => p.two_factor_enabled).length;

  // Filtered profiles list
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      const matchesSearch = 
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm) ||
        (p.job_title && p.job_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.professional_register && p.professional_register.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchesClient = clientFilter === 'ALL' || (clientFilter === 'INTERNAL' ? !p.client_id : p.client_id === clientFilter);

      return matchesSearch && matchesRole && matchesStatus && matchesClient;
    });
  }, [profiles, searchTerm, roleFilter, statusFilter, clientFilter]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  const handleOpenCreateModal = () => {
    setEditingProfile(null);
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      whatsapp: '',
      role: 'TÉCNICO',
      department: '',
      job_title: '',
      cpf: '',
      professional_register: '',
      professional_register_uf: '',
      client_id: '',
      status: 'ACTIVE',
      two_factor_enabled: false,
      send_invite_now: true,
      password: generateTempPassword()
    });
    setIsNewUserModalOpen(true);
  };

  const handleOpenEditModal = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      whatsapp: profile.whatsapp,
      role: profile.role,
      department: profile.department || '',
      job_title: profile.job_title || '',
      cpf: profile.cpf || '',
      professional_register: profile.professional_register || '',
      professional_register_uf: profile.professional_register_uf || '',
      client_id: profile.client_id || '',
      status: profile.status,
      two_factor_enabled: profile.two_factor_enabled ?? false,
      send_invite_now: false,
      password: ''
    });
    setIsNewUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim() || !formData.email.trim()) {
      showToast('Preencha o nome completo e o e-mail corporativo.', 'error');
      return;
    }

    // CPF invalido gravado aqui reaparece como cpfResp de um S-2240 recusado
    // pelo governo. Barra na origem.
    if (formData.cpf.trim()) {
      const conf = conferirDocumento(formData.cpf, 'CPF');
      if (!conf.valido) {
        showToast(conf.motivo || 'CPF inválido.', 'error');
        return;
      }
    }

    // Check duplicate email
    const duplicate = profiles.find(
      p => p.email.toLowerCase() === formData.email.trim().toLowerCase() && p.id !== editingProfile?.id
    );
    if (duplicate) {
      showToast('Já existe um usuário cadastrado com este e-mail.', 'error');
      return;
    }

    if (editingProfile) {
      // O papel que a RLS confere esta em prevsafe_members, nao neste cadastro.
      // Sem gravar la, promover alguem a Saude nao lhe daria os resultados, e
      // rebaixar nao tiraria nada: a troca seria so visual.
      const clienteNovo = formData.role.startsWith('CLIENTE_') ? (formData.client_id || '') : '';
      const vinculoMudou = formData.role !== editingProfile.role || clienteNovo !== (editingProfile.client_id || '');
      if (vinculoMudou && editingProfile.auth_user_id) {
        setIsSavingUser(true);
        try {
          const token = await getAuthToken();
          if (!token) {
            showToast('Sessão expirada. Faça login novamente antes de trocar o perfil de acesso.', 'error');
            return;
          }
          const res = await fetch('/api/admin/update-member', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              auth_user_id: editingProfile.auth_user_id,
              role: formData.role,
              client_id: clienteNovo || undefined
            })
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.success) {
            showToast(json.message || 'Não foi possível trocar o perfil de acesso no servidor.', 'error');
            return;
          }
        } finally {
          setIsSavingUser(false);
        }
      } else if (vinculoMudou) {
        showToast('Este usuário não tem login real: o perfil muda só no cadastro e não altera o que ele acessa.', 'error');
      }

      // Dados do cadastro (nao muda o e-mail nem a senha do login real).
      updateProfile(editingProfile.id, {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        whatsapp: formData.whatsapp.trim() || formData.phone.trim().replace(/\D/g, ''),
        role: formData.role,
        department: formData.department.trim(),
        job_title: formData.job_title.trim(),
        cpf: formData.cpf.trim() || undefined,
        professional_register: formData.professional_register.trim() || undefined,
        professional_register_uf: formData.professional_register_uf.trim().toUpperCase() || undefined,
        client_id: formData.role.startsWith('CLIENTE_') ? (formData.client_id || undefined) : undefined,
        status: formData.status,
        two_factor_enabled: formData.two_factor_enabled
      });
      showToast(`Usuário ${formData.full_name} atualizado com sucesso!`);
      setIsNewUserModalOpen(false);
      return;
    }

    // Create new profile — requires creating a real login (Supabase Auth) first
    if (!formData.password || formData.password.length < 8) {
      showToast('Defina uma senha de acesso com ao menos 8 caracteres.', 'error');
      return;
    }

    setIsSavingUser(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        showToast('Sessão expirada. Faça login novamente antes de criar usuários.', 'error');
        return;
      }

      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          full_name: formData.full_name.trim(),
          role: formData.role,
          phone: formData.phone.trim(),
          whatsapp: formData.whatsapp.trim() || formData.phone.trim().replace(/\D/g, ''),
          department: formData.department.trim(),
          job_title: formData.job_title.trim(),
          professional_register: formData.professional_register.trim() || undefined,
          client_id: formData.role.startsWith('CLIENTE_') ? (formData.client_id || undefined) : undefined,
        })
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        showToast(json.message || 'Não foi possível criar o usuário.', 'error');
        return;
      }

      // O usuário existe no Auth, mas sem o vínculo com a organização a RLS
      // bloqueia os dados: ele entraria e veria o sistema vazio.
      if (json.warning) {
        showToast(json.warning, 'error');
      }

      const newProf = addProfile({
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        whatsapp: formData.whatsapp.trim() || formData.phone.trim().replace(/\D/g, ''),
        role: formData.role,
        department: formData.department.trim(),
        job_title: formData.job_title.trim(),
        cpf: formData.cpf.trim() || undefined,
        professional_register: formData.professional_register.trim() || undefined,
        professional_register_uf: formData.professional_register_uf.trim().toUpperCase() || undefined,
        client_id: formData.role.startsWith('CLIENTE_') ? (formData.client_id || undefined) : undefined,
        status: formData.status,
        two_factor_enabled: formData.two_factor_enabled,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.full_name)}&background=0D9488&color=fff`,
        auth_user_id: json.auth_user_id
      });

      setIsNewUserModalOpen(false);

      if (formData.send_invite_now) {
        const origin = getAppUrl();
        setInviteModalData({
          profile: newProf,
          url: origin,
          tempPass: formData.password
        });
      } else {
        showToast(`Usuário ${newProf.full_name} cadastrado com sucesso!`);
      }
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleResetPassword = async (profile: Profile) => {
    if (!profile.auth_user_id) {
      showToast('Este usuário não possui um login real ainda. Exclua e cadastre-o novamente para criar uma conta.', 'error');
      return;
    }

    setIsResettingPasswordId(profile.id);
    try {
      const token = await getAuthToken();
      if (!token) {
        showToast('Sessão expirada. Faça login novamente.', 'error');
        return;
      }

      const newPassword = generateTempPassword();
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ auth_user_id: profile.auth_user_id, password: newPassword })
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        showToast(json.message || 'Não foi possível redefinir a senha.', 'error');
        return;
      }

      setPasswordResetSuccess({
        name: profile.full_name,
        pass: newPassword
      });
    } finally {
      setIsResettingPasswordId(null);
    }
  };

  const handleShareInvite = (channel: 'WHATSAPP' | 'EMAIL') => {
    if (!inviteModalData) return;
    const { profile, url } = inviteModalData;

    const message = [
      `Olá, ${profile.full_name}!`,
      '',
      `Seu acesso ao sistema PrevSafe SST foi criado.`,
      `Endereço: ${url}`,
      `Login (e-mail): ${profile.email}`,
      '',
      `A senha será informada separadamente, por segurança.`,
      `Qualquer dúvida, estou à disposição.`,
      `${currentProfile.full_name}`,
    ].join('\n');

    const res = shareViaChannel(channel, {
      phone: profile.whatsapp || profile.phone,
      email: profile.email,
      subject: 'Seu acesso ao PrevSafe SST',
      message,
      recipientName: profile.full_name,
    });

    showToast(res.message, res.success ? 'success' : 'error');
  };

  const handleImpersonate = (profile: Profile) => {
    const res = impersonateProfile(profile.id);
    if (res.success) {
      showToast(res.message || `Conectado como ${profile.full_name}.`);
      if (profile.role === 'CLIENTE_ADMIN' || profile.role === 'CLIENTE_USER') {
        onNavigate('client-portal');
      } else if (profile.role === 'TÉCNICO') {
        onNavigate('technician-field');
      } else {
        onNavigate('dashboard-exec');
      }
    } else {
      showToast(res.message || 'Não foi possível entrar como este usuário.', 'error');
    }
  };

  const handleDeleteUser = (id: string) => {
    const res = deleteProfile(id);
    if (res.success) {
      showToast('Usuário excluído com sucesso.');
      setDeleteConfirmId(null);
      if (viewingProfile?.id === id) setViewingProfile(null);
    } else {
      showToast(res.message || 'Erro ao excluir usuário.', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const exportUsersCSV = () => {
    const headers = ['ID', 'Nome Completo', 'E-mail', 'Telefone', 'Perfil', 'Cargo', 'Departamento', 'Registro Profissional', 'Empresa Cliente', 'Status', '2FA Ativo', 'Ultimo Acesso'];
    const rows = profiles.map(p => {
      const clientName = p.client_id ? (clients.find(c => c.id === p.client_id)?.trade_name || p.client_id) : 'SaaS PrevSafe';
      return [
        p.id,
        `"${p.full_name}"`,
        p.email,
        p.phone,
        p.role,
        `"${p.job_title || ''}"`,
        `"${p.department || ''}"`,
        `"${p.professional_register || ''}"`,
        `"${clientName}"`,
        p.status,
        p.two_factor_enabled ? 'SIM' : 'NÃO',
        p.last_login_at || 'Nunca'
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `prevsafe_usuarios_perfis_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Relatório de usuários exportado em CSV com sucesso!');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback Notification */}
      {feedbackMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300 ${
          feedbackMessage.type === 'success' 
            ? 'bg-marca-suave border-marca-escura text-marca-escura' 
            : 'bg-rose-50 border-rose-500/30 text-rose-700'
        }`}>
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-marca-escura flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-700 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold">{feedbackMessage.text}</span>
        </div>
      )}

      {/* Header Bento Card */}
      <div className="bg-superficie border border-borda rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-teal-500/10 via-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-700 to-marca-escura flex items-center justify-center text-white shadow-lg shadow-teal-950/50 flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-tinta">Central de Usuários & Gestão de Acessos</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-800 border border-teal-500/20">
                  RBAC V1.0
                </span>
              </div>
              <p className="text-xs text-tinta-2 mt-1 max-w-2xl">
                Controle unificado de contas de colaboradores internos, técnicos de campo, executivos comerciais e acessos externos do Portal do Cliente com isolamento de dados (RLS).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={exportUsersCSV}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-superficie-2 hover:bg-superficie-3 text-tinta hover:text-tinta border border-borda text-xs font-semibold transition shadow-sm"
              title="Exportar base de usuários em CSV"
            >
              <Download className="w-4 h-4 text-tinta-2" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-marca-escura hover:from-teal-400 hover:to-marca-escura text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/60 transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Usuário / Convidar</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-borda">
          <div className="p-3.5 rounded-2xl bg-fundo border border-borda flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-700">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-tinta">{totalUsers}</div>
              <div className="text-[11px] text-tinta-2 font-medium">Total de Contas</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-fundo border border-borda flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-marca-suave border border-marca-escura flex items-center justify-center text-marca-escura">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-marca-escura">{activeUsers}</div>
              <div className="text-[11px] text-tinta-2 font-medium">Usuários Ativos</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-fundo border border-borda flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-800">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-cyan-700">{techUsers}</div>
              <div className="text-[11px] text-tinta-2 font-medium">Técnicos (PWA Campo)</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-fundo border border-borda flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-700">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-purple-700">{clientUsers}</div>
              <div className="text-[11px] text-tinta-2 font-medium">Clientes no Portal</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-fundo border border-borda flex items-center space-x-3 col-span-2 sm:col-span-1">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-teal-700">{twoFactorUsers} <span className="text-xs font-normal text-tinta-2">/ {totalUsers}</span></div>
              <div className="text-[11px] text-tinta-2 font-medium">2FA Habilitado</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pill Selector */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-borda">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'users'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-950/40'
                : 'bg-superficie-2 hover:bg-superficie-2 text-tinta hover:text-tinta'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Gerenciamento de Usuários ({filteredProfiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rbac')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'rbac'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-950/40'
                : 'bg-superficie-2 hover:bg-superficie-2 text-tinta hover:text-tinta'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Matriz de Perfis & Permissões (RBAC)</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'security'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-950/40'
                : 'bg-superficie-2 hover:bg-superficie-2 text-tinta hover:text-tinta'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Segurança, 2FA & Logs de Acesso</span>
          </button>
        </div>
      </div>

      {/* TAB 1: USERS LIST & MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-superficie border border-borda rounded-3xl p-4 shadow-xl flex flex-col lg:flex-row gap-3 items-center justify-between">
            <div className="relative w-full lg:w-96">
              <Search className="w-4 h-4 text-tinta-2 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, email, cargo, registro MTE/CREA/CRM..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-fundo border border-borda rounded-2xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-fundo border border-borda rounded-xl text-xs font-semibold text-tinta focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">Todos os Perfis</option>
                <option value="ADMIN">Admin Geral SaaS</option>
                <option value="GESTOR">Gestor Operacional</option>
                <option value="COMERCIAL">Executivo Comercial</option>
                <option value="TÉCNICO">Engenheiro / Técnico SST</option>
                <option value="FINANCEIRO">Financeiro</option>
                <option value="SAUDE">Saúde Ocupacional (Médico)</option>
                <option value="CLIENTE_ADMIN">Cliente Admin (RH)</option>
                <option value="CLIENTE_USER">Cliente Colaborador</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-fundo border border-borda rounded-xl text-xs font-semibold text-tinta focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">Status: Todos</option>
                <option value="ACTIVE">Apenas Ativos</option>
                <option value="INACTIVE">Apenas Inativos</option>
              </select>

              {/* Client/Internal Filter */}
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="px-3 py-2 bg-fundo border border-borda rounded-xl text-xs font-semibold text-tinta focus:outline-none focus:border-teal-500 max-w-[200px]"
              >
                <option value="ALL">Todas as Organizações</option>
                <option value="INTERNAL">Equipe Interna PrevSafe</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>Cliente: {c.trade_name}</option>
                ))}
              </select>

              {/* View toggle */}
              <div className="flex items-center bg-fundo border border-borda rounded-xl p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg transition ${viewMode === 'cards' ? 'bg-superficie-2 text-tinta' : 'text-tinta-2 hover:text-tinta'}`}
                  title="Visualização em Cards"
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition ${viewMode === 'table' ? 'bg-superficie-2 text-tinta' : 'text-tinta-2 hover:text-tinta'}`}
                  title="Visualização em Tabela"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* User Cards Grid */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfiles.map((p) => {
                const roleConfig = ROLE_INFO[p.role] || ROLE_INFO.TÉCNICO;
                const clientObj = p.client_id ? clients.find(c => c.id === p.client_id) : null;
                const isCurrentLoggedUser = currentProfile.id === p.id;

                return (
                  <div 
                    key={p.id} 
                    className={`bg-superficie border rounded-3xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between relative group ${
                      p.status === 'INACTIVE' 
                        ? 'border-borda opacity-75' 
                        : isCurrentLoggedUser 
                          ? 'border-teal-500/50 bg-superficie shadow-teal-950/30 ring-1 ring-teal-500/20' 
                          : 'border-borda hover:border-borda'
                    }`}
                  >
                    {/* Top Status & Role Badges */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${roleConfig.bgBadge} ${roleConfig.badgeColor} ${roleConfig.borderBadge}`}>
                          <ShieldCheck className="w-3 h-3" />
                          <span>{roleConfig.label}</span>
                        </span>

                        <div className="flex items-center space-x-1.5">
                          {p.two_factor_enabled && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-500/10 text-teal-800 border border-teal-500/20 flex items-center space-x-1" title="Autenticação 2FA ativa">
                              <Lock className="w-2.5 h-2.5" />
                              <span>2FA</span>
                            </span>
                          )}

                          <button
                            onClick={() => toggleProfileStatus(p.id, p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                              p.status === 'ACTIVE'
                                ? 'bg-marca-suave text-marca-escura border-marca-escura hover:bg-marca-suave'
                                : 'bg-superficie-2 text-tinta-2 border-borda hover:bg-superficie-3'
                            }`}
                            title="Clique para alternar o status da conta"
                          >
                            {p.status === 'ACTIVE' ? '● Ativo' : '○ Inativo'}
                          </button>
                        </div>
                      </div>

                      {/* User Info Header */}
                      <div className="flex items-start space-x-3 mb-3.5">
                        <div className="relative flex-shrink-0">
                          {p.avatar_url ? (
                            <Image 
                              src={p.avatar_url} 
                              alt={p.full_name} 
                              width={48} 
                              height={48}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-2xl object-cover border border-borda shadow-md"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-superficie-2 border border-borda flex items-center justify-center text-teal-700 font-bold text-base shadow-md">
                              {p.full_name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          {isCurrentLoggedUser && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-teal-500 border-2 border-borda flex items-center justify-center" title="Sua sessão atual">
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-tinta truncate group-hover:text-teal-700 transition flex items-center space-x-1.5">
                            <span className="truncate">{p.full_name}</span>
                            {isCurrentLoggedUser && (
                              <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-500/10 px-1.5 py-0.2 rounded border border-teal-500/20 flex-shrink-0">
                                VOCÊ
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-tinta-2 truncate">{p.job_title || 'Cargo não informado'}</p>
                          <p className="text-[11px] text-tinta-2 truncate">{p.department || 'Departamento Geral'}</p>
                        </div>
                      </div>

                      {/* Professional Register or Client Affiliation */}
                      <div className="space-y-1.5 py-2.5 border-y border-borda my-3 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-tinta-2">Organização:</span>
                          <span className="font-semibold text-tinta truncate max-w-[180px]">
                            {clientObj ? `🏢 ${clientObj.trade_name}` : '🛡️ SaaS PrevSafe (Matriz)'}
                          </span>
                        </div>

                        {p.professional_register && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-tinta-2">Reg. Profissional:</span>
                            <span className="font-mono font-semibold text-marca-escura bg-marca-suave px-1.5 py-0.5 rounded border border-marca-escura">
                              {p.professional_register}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-tinta-2">E-mail:</span>
                          <span className="font-mono text-tinta-2 truncate max-w-[180px]">{p.email}</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-tinta-2">WhatsApp / Tel:</span>
                          <span className="text-tinta-2">{p.phone || p.whatsapp || 'Não informado'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Bottom Strip */}
                    <div className="pt-2 flex items-center justify-between gap-1.5">
                      {currentProfile.role === 'ADMIN' && (
                        <button
                          onClick={() => handleImpersonate(p)}
                          className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-superficie-2 hover:bg-teal-700 hover:text-white text-white/90 text-xs font-semibold border border-borda transition"
                          title="Entrar temporariamente com as permissões deste perfil"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Acessar Como</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="p-2 rounded-xl bg-superficie-2 hover:bg-superficie-3 text-tinta hover:text-tinta border border-borda transition"
                        title="Editar cadastro do usuário"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleResetPassword(p)}
                        disabled={isResettingPasswordId === p.id}
                        className="p-2 rounded-xl bg-superficie-2 hover:bg-superficie-3 text-amber-800 hover:text-amber-800 border border-borda transition disabled:opacity-50"
                        title="Gerar nova senha temporária"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          const res = sendUserInvite(p.id, 'WHATSAPP');
                          setInviteModalData({ profile: p, url: res.inviteUrl });
                        }}
                        className="p-2 rounded-xl bg-superficie-2 hover:bg-superficie-3 text-marca-escura hover:text-marca-escura border border-borda transition"
                        title="Compartilhar dados de acesso"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      {!isCurrentLoggedUser && (
                        <button
                          onClick={() => setDeleteConfirmId(p.id)}
                          className="p-2 rounded-xl bg-superficie-2 hover:bg-rose-50 text-rose-700 hover:text-rose-700 border border-rose-200 transition"
                          title="Excluir conta de usuário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-superficie border border-borda rounded-3xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-fundo text-tinta-2 font-semibold border-b border-borda">
                    <tr>
                      <th className="py-3.5 px-4">Usuário</th>
                      <th className="py-3.5 px-4">Perfil de Acesso</th>
                      <th className="py-3.5 px-4">Empresa / Unidade</th>
                      <th className="py-3.5 px-4">Registro Técnico</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">2FA</th>
                      <th className="py-3.5 px-4">Último Acesso</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borda text-tinta">
                    {filteredProfiles.map(p => {
                      const roleConfig = ROLE_INFO[p.role] || ROLE_INFO.TÉCNICO;
                      const clientObj = p.client_id ? clients.find(c => c.id === p.client_id) : null;
                      const isCurrent = currentProfile.id === p.id;

                      return (
                        <tr key={p.id} className={`hover:bg-superficie-2 transition ${isCurrent ? 'bg-teal-50' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              {p.avatar_url ? (
                                <Image 
                                  src={p.avatar_url} 
                                  alt={p.full_name} 
                                  width={36} 
                                  height={36}
                                  referrerPolicy="no-referrer"
                                  className="w-9 h-9 rounded-xl object-cover border border-borda"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-superficie-2 border border-borda flex items-center justify-center text-teal-700 font-bold">
                                  {p.full_name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-tinta flex items-center space-x-1.5">
                                  <span>{p.full_name}</span>
                                  {isCurrent && <span className="text-[9px] font-mono text-teal-800 bg-teal-500/10 px-1 rounded border border-teal-500/20">VOCÊ</span>}
                                </div>
                                <div className="text-[11px] text-tinta-2">{p.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${roleConfig.bgBadge} ${roleConfig.badgeColor} ${roleConfig.borderBadge}`}>
                              {roleConfig.label}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-tinta">
                            {clientObj ? `🏢 ${clientObj.trade_name}` : '🛡️ SaaS PrevSafe'}
                          </td>

                          <td className="py-3 px-4">
                            {p.professional_register ? (
                              <span className="font-mono text-[11px] font-semibold text-marca-escura bg-marca-suave px-2 py-0.5 rounded border border-marca-escura">
                                {p.professional_register}
                              </span>
                            ) : (
                              <span className="text-tinta-2">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <button
                              onClick={() => toggleProfileStatus(p.id, p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                p.status === 'ACTIVE'
                                  ? 'bg-marca-suave text-marca-escura border-marca-escura'
                                  : 'bg-superficie-2 text-tinta-2 border-borda'
                              }`}
                            >
                              {p.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                            </button>
                          </td>

                          <td className="py-3 px-4">
                            {p.two_factor_enabled ? (
                              <span className="text-teal-700 font-semibold flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Sim</span>
                              </span>
                            ) : (
                              <span className="text-tinta-2">Não</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-tinta-2 text-[11px]">
                            {p.last_login_at ? formatDateTime(p.last_login_at) : 'Nunca'}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {currentProfile.role === 'ADMIN' && (
                                <button
                                  onClick={() => handleImpersonate(p)}
                                  className="p-1.5 rounded-lg bg-superficie-2 hover:bg-teal-700 hover:text-white text-white/90 transition"
                                  title="Entrar como este usuário"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditModal(p)}
                                className="p-1.5 rounded-lg bg-superficie-2 hover:bg-superficie-3 text-tinta transition"
                                title="Editar"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleResetPassword(p)}
                                disabled={isResettingPasswordId === p.id}
                                className="p-1.5 rounded-lg bg-superficie-2 hover:bg-superficie-3 text-amber-800 transition disabled:opacity-50"
                                title="Redefinir Senha"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                              {!isCurrent && (
                                <button
                                  onClick={() => setDeleteConfirmId(p.id)}
                                  className="p-1.5 rounded-lg bg-superficie-2 hover:bg-rose-50 text-rose-700 transition"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RBAC PERMISSIONS MATRIX */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          <div className="bg-superficie border border-borda rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-tinta flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-teal-700" />
                  <span>Matriz de Controle de Acesso Baseado em Papéis (RBAC)</span>
                </h2>
                <p className="text-xs text-tinta-2 mt-1">
                  Mapeamento de permissões granulares por módulo do PrevSafe SST e papéis de usuário.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-marca-escura bg-marca-suave px-2.5 py-1 rounded-xl border border-marca-escura">
                  Total de Permissões: {PERMISSIONS_CATALOG.length}
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="border border-borda rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-fundo text-tinta font-semibold border-b border-borda">
                    <tr>
                      <th className="py-3.5 px-4 w-72">Módulo & Funcionalidade</th>
                      <th className="py-3.5 px-2 text-center text-rose-700">ADMIN</th>
                      <th className="py-3.5 px-2 text-center text-cyan-700">GESTOR</th>
                      <th className="py-3.5 px-2 text-center text-amber-700">COMERCIAL</th>
                      <th className="py-3.5 px-2 text-center text-marca-escura">TÉCNICO</th>
                      <th className="py-3.5 px-2 text-center text-marca-escura">FINANCEIRO</th>
                      <th className="py-3.5 px-2 text-center text-pink-700">SAÚDE</th>
                      <th className="py-3.5 px-2 text-center text-purple-700">CLIENTE ADMIN</th>
                      <th className="py-3.5 px-2 text-center text-blue-700">CLIENTE USER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borda">
                    {PERMISSIONS_CATALOG.map((perm) => (
                      <tr key={perm.id} className="hover:bg-superficie-2 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-tinta">{perm.name}</div>
                          <div className="text-[11px] text-tinta-2">{perm.description}</div>
                          <div className="font-mono text-[9px] text-tinta-2 mt-0.5">{perm.code}</div>
                        </td>

                        {(['ADMIN', 'GESTOR', 'COMERCIAL', 'TÉCNICO', 'FINANCEIRO', 'SAUDE', 'CLIENTE_ADMIN', 'CLIENTE_USER'] as RoleType[]).map((role) => {
                          const isAllowed = perm.default_roles.includes(role);
                          return (
                            <td key={role} className="py-3 px-2 text-center">
                              {isAllowed ? (
                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-marca-suave border border-marca-escura text-marca-escura shadow-sm">
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-fundo text-slate-700">
                                  <span className="text-[10px]">•</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY, 2FA & ACCESS AUDIT */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Security Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-superficie border border-borda rounded-3xl p-5 shadow-xl space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-800">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-tinta">Autenticação de Dois Fatores (2FA)</h3>
              <p className="text-xs text-tinta-2">
                Obrigatoriedade de código OTP via WhatsApp ou app autenticador para perfis com privilégios elevados.
              </p>
              <div className="pt-2">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-teal-500/10 text-teal-800 border border-teal-500/20">
                  {twoFactorUsers} de {totalUsers} contas com 2FA
                </span>
              </div>
            </div>

            <div className="bg-superficie border border-borda rounded-3xl p-5 shadow-xl space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-700">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-tinta">Política de Senhas & LGPD</h3>
              <p className="text-xs text-tinta-2">
                Criptografia forte (bcrypt), expiração periódica de 90 dias e bloqueio após 5 tentativas incorretas.
              </p>
              <div className="pt-2">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-700 border border-blue-500/20">
                  Padrão Bancário Ativo
                </span>
              </div>
            </div>

            <div className="bg-superficie border border-borda rounded-3xl p-5 shadow-xl space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-700">
                <History className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-tinta">Trilha de Auditoria (RN011)</h3>
              <p className="text-xs text-tinta-2">
                Logs imutáveis registrando logins, trocas de perfil, redefinições de credenciais e exportações de dados.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => onNavigate('audit-logs')}
                  className="text-xs font-bold text-purple-700 hover:text-purple-700 flex items-center space-x-1"
                >
                  <span>Ver Todos os Logs de Auditoria</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Recent Access & Auth Audit Logs */}
          <div className="bg-superficie border border-borda rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-tinta flex items-center space-x-2">
              <History className="w-4 h-4 text-teal-700" />
              <span>Eventos Recentes de Acesso & Segurança</span>
            </h2>

            <div className="border border-borda rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-fundo text-tinta-2 font-semibold border-b border-borda">
                    <tr>
                      <th className="py-3 px-4">Data / Hora</th>
                      <th className="py-3 px-4">Usuário</th>
                      <th className="py-3 px-4">Ação / Evento</th>
                      <th className="py-3 px-4">Detalhes Técnicos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borda text-tinta">
                    {auditLogs
                      .filter(l => l.entity_type === 'ORGANIZATION' || l.action.includes('LOGIN') || l.action.includes('USER'))
                      .slice(0, 10)
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-superficie-2">
                          <td className="py-2.5 px-4 font-mono text-[11px] text-tinta-2">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-tinta">
                            {log.user_name}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-800 border border-teal-500/20">
                              {log.new_data?.event || log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-tinta-2 font-mono text-[11px]">
                            {log.new_data ? JSON.stringify(log.new_data).slice(0, 80) + '...' : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT USER */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fundo backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-superficie border border-borda rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-borda pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-800">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-tinta">
                    {editingProfile ? 'Editar Cadastro de Usuário' : 'Novo Usuário / Convidar Membro'}
                  </h3>
                  <p className="text-xs text-tinta-2">
                    Defina credenciais de acesso, perfil de permissão RBAC e vínculos organizacionais.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsNewUserModalOpen(false)}
                className="p-2 rounded-xl bg-superficie-2 hover:bg-superficie-3 text-tinta-2 hover:text-tinta transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-tinta">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-fundo border border-borda rounded-xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-tinta">E-mail Corporativo (Login) *</label>
                  <input
                    type="email"
                    required
                    placeholder="exemplo@prevsafe.com.br"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-fundo border border-borda rounded-xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-tinta">WhatsApp / Celular *</label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 98888-1234"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value, whatsapp: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2.5 bg-fundo border border-borda rounded-xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-tinta">Perfil de Acesso (RBAC) *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as RoleType })}
                    className="w-full px-3.5 py-2.5 bg-fundo border border-borda rounded-xl text-xs font-semibold text-teal-700 focus:outline-none focus:border-teal-500"
                  >
                    <option value="ADMIN">Administrador Geral SaaS (Acesso Total)</option>
                    <option value="GESTOR">Gestor Operacional & Técnico (Coordenação SST / SLA)</option>
                    <option value="COMERCIAL">Executivo Comercial (CRM / Propostas / Contratos)</option>
                    <option value="TÉCNICO">Engenheiro / Técnico de Campo (PWA / Vistorias / eSocial)</option>
                    <option value="FINANCEIRO">Financeiro & Controladoria (Faturamento / Cobrança)</option>
                    <option value="SAUDE">Saúde Ocupacional - Médico e equipe (PCMSO / ASO / Resultados de Exame)</option>
                    <option value="CLIENTE_ADMIN">Cliente - Gestor / RH (Portal do Cliente / Aprovações)</option>
                    <option value="CLIENTE_USER">Cliente - Colaborador (Consulta ASO / EPIs)</option>
                  </select>
                  <p className="text-[11px] text-tinta-2 mt-1">
                    {ROLE_INFO[formData.role]?.description}
                  </p>
                </div>

                {formData.role.startsWith('CLIENTE_') && (
                  <div className="space-y-1 sm:col-span-2 p-3 bg-purple-50 border border-purple-200 rounded-2xl">
                    <label className="text-xs font-semibold text-purple-700">Empresa Cliente Vinculada *</label>
                    <select
                      required
                      value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                      className="w-full px-3.5 py-2 bg-fundo border border-borda rounded-xl text-xs text-tinta focus:outline-none focus:border-purple-500 mt-1"
                    >
                      <option value="">Selecione a empresa cliente...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.trade_name} ({c.document_number})</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-purple-700 mt-1">
                      O banco (RLS) limita esta conta à empresa selecionada: OS, contratos, laudos liberados, pendências e assinaturas. Nenhum dado de saúde, de outro cliente ou interno.
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-tinta">Cargo / Função</label>
                  <input
                    type="text"
                    placeholder="Ex: Engenheiro de Segurança Sênior"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-fundo border border-borda rounded-xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-tinta">Departamento</label>
                  <input
                    type="text"
                    placeholder="Ex: Engenharia de Campo"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-fundo border border-borda rounded-xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-tinta">CPF</label>
                  <input
                    type="text"
                    placeholder="Somente números"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className={`w-full px-3.5 py-2.5 bg-fundo border rounded-xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500 ${
                      formData.cpf.trim() && !conferirDocumento(formData.cpf, 'CPF').valido
                        ? 'border-rose-500'
                        : 'border-borda'
                    }`}
                  />
                  {formData.cpf.trim() && !conferirDocumento(formData.cpf, 'CPF').valido ? (
                    <p className="text-[10px] text-rose-700">
                      {conferirDocumento(formData.cpf, 'CPF').motivo}
                    </p>
                  ) : (
                    <p className="text-[10px] text-tinta-2">
                      Exigido pelo eSocial no S-2240 (cpfResp) e no S-2220.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-tinta">UF do Registro</label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="Ex: SP"
                    value={formData.professional_register_uf}
                    onChange={(e) =>
                      setFormData({ ...formData, professional_register_uf: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3.5 py-2.5 bg-fundo border border-borda rounded-xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500 uppercase"
                  />
                  <p className="text-[10px] text-tinta-2">UF do CREA/CRM, exigida junto do registro.</p>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-tinta">Registro Profissional (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: MTE 0048192/SP, CREA 5061928371-SP ou CRM 149.202-SP"
                    value={formData.professional_register}
                    onChange={(e) => setFormData({ ...formData, professional_register: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-fundo border border-borda rounded-xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500"
                  />
                  <p className="text-[10px] text-tinta-2">
                    Obrigatório para emissão de laudos técnicos com ART/RRT e assinatura de ASOs/Eventos eSocial.
                  </p>
                </div>

                {!editingProfile && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-tinta">Senha Inicial de Acesso</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        minLength={8}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Mínimo 8 caracteres"
                        className="flex-1 px-3.5 py-2.5 bg-fundo border border-borda rounded-xl text-xs text-tinta font-mono placeholder-tinta-3 focus:outline-none focus:border-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, password: generateTempPassword() })}
                        title="Gerar outra senha"
                        className="p-2.5 rounded-xl bg-superficie-2 hover:bg-superficie-3 text-teal-700 border border-borda transition flex-shrink-0"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-tinta-2">
                      Essa é a senha real de login do usuário — anote-a para compartilhar com segurança.
                    </p>
                  </div>
                )}

                <div className="sm:col-span-2 flex items-center justify-between p-3 bg-fundo border border-borda rounded-2xl">
                  <div>
                    <div className="text-xs font-bold text-tinta">Autenticação de Dois Fatores (2FA)</div>
                    <div className="text-[11px] text-tinta-2">Exigir código OTP via WhatsApp no login</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.two_factor_enabled}
                    onChange={(e) => setFormData({ ...formData, two_factor_enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-700 focus:ring-teal-500 border-borda bg-superficie"
                  />
                </div>

                {!editingProfile && (
                  <div className="sm:col-span-2 flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-2xl">
                    <div>
                      <div className="text-xs font-bold text-teal-700">Enviar Convite de Acesso Imediato</div>
                      <div className="text-[11px] text-teal-700">Gerar link mágico e enviar por e-mail e WhatsApp</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.send_invite_now}
                      onChange={(e) => setFormData({ ...formData, send_invite_now: e.target.checked })}
                      className="w-4 h-4 rounded text-teal-700 focus:ring-teal-500 border-borda bg-superficie"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-borda flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-superficie-2 hover:bg-superficie-3 text-tinta text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-marca-escura hover:from-teal-400 hover:to-marca-escura text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 transition disabled:opacity-50"
                >
                  {isSavingUser ? 'Criando conta real...' : editingProfile ? 'Salvar Alterações' : 'Concluir Cadastro & Convidar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INVITE LINK GENERATED */}
      {inviteModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fundo backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-superficie border border-borda rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-center space-x-3 text-marca-escura">
              <div className="w-10 h-10 rounded-2xl bg-marca-suave border border-marca-escura flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-tinta">Convite de Acesso Gerado!</h3>
                <p className="text-xs text-tinta-2">Para: {inviteModalData.profile.full_name}</p>
              </div>
            </div>

            <div className="p-4 bg-fundo border border-borda rounded-2xl space-y-3">
              <div className="text-xs font-semibold text-tinta-2">Link Direto de Ativação:</div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={inviteModalData.url}
                  className="w-full px-3 py-2 bg-superficie border border-borda rounded-xl text-xs font-mono text-marca-escura focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(inviteModalData.url)}
                  className="p-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs transition hover:bg-teal-400 flex items-center space-x-1"
                >
                  {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {inviteModalData.tempPass && (
                <div className="pt-2 border-t border-borda flex items-center justify-between text-xs">
                  <span className="text-tinta-2">Senha Provisória:</span>
                  <span className="font-mono font-bold text-amber-800 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {inviteModalData.tempPass}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleShareInvite('WHATSAPP')}
                className="px-4 py-2.5 rounded-xl bg-marca hover:bg-marca-escura text-white text-xs font-bold transition flex items-center justify-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Abrir no WhatsApp</span>
              </button>
              <button
                onClick={() => handleShareInvite('EMAIL')}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Abrir no E-mail</span>
              </button>
            </div>

            <p className="text-[10px] text-tinta-2 leading-relaxed">
              A mensagem leva o link de acesso e o e-mail de login. Por segurança, a senha não vai na
              mensagem — combine-a com a pessoa por outro meio.
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setInviteModalData(null)}
                className="px-4 py-2 rounded-xl bg-superficie-2 hover:bg-superficie-3 text-tinta text-xs font-semibold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PASSWORD RESET SUCCESS */}
      {passwordResetSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fundo backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-superficie border border-borda rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-amber-700">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-tinta">Senha Redefinida com Sucesso</h3>
                <p className="text-xs text-tinta-2">{passwordResetSuccess.name}</p>
              </div>
            </div>

            <div className="p-4 bg-fundo border border-borda rounded-2xl space-y-2 text-center">
              <div className="text-xs text-tinta-2">Nova Senha Temporária:</div>
              <div className="text-lg font-mono font-bold text-amber-700 py-1 select-all">
                {passwordResetSuccess.pass}
              </div>
              <div className="text-[11px] text-tinta-2">
                O usuário deverá alterar a senha no primeiro login.
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={() => setPasswordResetSuccess(null)}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fundo backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-superficie border border-borda rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-700">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-tinta">Confirmar Exclusão de Usuário</h3>
                <p className="text-xs text-tinta-2">Esta ação revogará todo e qualquer acesso imediatamente.</p>
              </div>
            </div>

            <p className="text-xs text-tinta">
              Tem certeza que deseja remover esta conta de usuário do PrevSafe SST? O histórico de ordens de serviço e laudos assinados permanecerá preservado no Audit Log.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-superficie-2 hover:bg-superficie-3 text-tinta text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-950/50 transition"
              >
                Sim, Excluir Usuário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
