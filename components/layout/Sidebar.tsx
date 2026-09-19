'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  BarChart3, 
  Activity, 
  TrendingUp, 
  Award, 
  Users, 
  Target, 
  FileSpreadsheet, 
  FileSignature, 
  Briefcase, 
  CheckSquare, 
  FolderKanban, 
  Layers, 
  MessageSquare, 
  BellRing, 
  Star, 
  History, 
  Settings, 
  Smartphone, 
  UserCheck,
  Building,
  Building2,
  ChevronRight,
  ShieldCheck,
  X,
  Search,
  Sparkles,
  DollarSign,
  Layers as LayersIcon,
  GraduationCap,
  BookOpen,
  LogOut,
  KeyRound,
  HardHat,
  Palette,
  Vote,
  AlertOctagon,
  AlertTriangle,
  Newspaper
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  code?: string;
  badge?: string;
  badgeColor?: string;
  highlight?: boolean;
}

interface MenuSection {
  title: string;
  roles: string[];
  items: MenuItem[];
}

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  isOpen = false,
  setIsOpen,
  isMobileOpen = false,
  setIsMobileOpen
}) => {
  const { 
    currentRole, 
    serviceOrders = [], 
    requests = [], 
    proposals = [], 
    contracts = [], 
    esocialEvents = [], 
    transactions = [], 
    tenants = [], 
    profiles = [], 
    logout 
  } = usePrevSafe();
  const [searchTerm, setSearchTerm] = useState('');

  const sidebarVisible = isOpen || isMobileOpen;
  const handleClose = useCallback(() => {
    if (setIsOpen) setIsOpen(false);
    if (setIsMobileOpen) setIsMobileOpen(false);
  }, [setIsOpen, setIsMobileOpen]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarVisible) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarVisible, handleClose]);

  const isClientRole = currentRole === 'CLIENTE_ADMIN' || currentRole === 'CLIENTE_USER';

  const menuSections: MenuSection[] = [
    {
      title: 'VISÃO EXECUTIVA',
      roles: ['ADMIN', 'GESTOR', 'COMERCIAL', 'FINANCEIRO'],
      items: [
        { id: 'dashboard-exec', label: 'Dashboard Executivo', icon: BarChart3, code: '010' },
        { id: 'dashboard-oper', label: 'Dashboard Operacional', icon: Activity, code: '020', badge: (serviceOrders || []).filter(o => o?.status === 'IN_PROGRESS').length.toString() },
        { id: 'dashboard-comm', label: 'Dashboard Comercial', icon: TrendingUp, code: '030', badge: (proposals || []).filter(p => p?.status === 'SENT').length.toString() },
        { id: 'dashboard-qual', label: 'Dashboard de Qualidade', icon: Award, code: '040' },
      ]
    },
    {
      title: 'FINANCEIRO & FLUXO DE CAIXA',
      roles: ['ADMIN', 'GESTOR', 'COMERCIAL', 'FINANCEIRO'],
      items: [
        { 
          id: 'financial', 
          label: 'Gestão Financeira & Fluxo de Caixa', 
          icon: DollarSign, 
          code: '450',
          badge: Array.isArray(transactions) ? `${transactions.length}` : undefined,
          badgeColor: 'bg-emerald-500'
        },
      ]
    },
    {
      title: 'CRM & COMERCIAL',
      roles: ['ADMIN', 'GESTOR', 'COMERCIAL', 'FINANCEIRO'],
      items: [
        { id: 'crm-clients', label: 'Clientes & Unidades', icon: Users, code: '400' },
        { id: 'crm-leads', label: 'Leads & Funil Oportunidades', icon: Target, code: '410' },
        { id: 'proposals', label: 'Propostas Comerciais', icon: FileSpreadsheet, code: '420' },
        { id: 'contracts', label: 'Contratos & Assinaturas', icon: FileSignature, code: '430', badge: (contracts || []).length.toString() },
      ]
    },
    {
      title: 'ENGENHARIA & HIGIENE OCUPACIONAL',
      roles: ['ADMIN', 'GESTOR', 'TÉCNICO'],
      items: [
        { 
          id: 'sst-engineering', 
          label: 'Engenharia SST & Funcionários', 
          icon: HardHat, 
          code: '100',
          badge: 'NR-01/07/09',
          badgeColor: 'bg-teal-500',
          highlight: true
        },
        { 
          id: 'occupational-risks-catalog', 
          label: 'Catálogo de Riscos Ocupacionais', 
          icon: AlertTriangle, 
          code: '070',
          badge: 'Tabela 24 / NRs',
          badgeColor: 'bg-indigo-500',
          highlight: true
        },
        { id: 'service-orders', label: 'Ordens de Serviço (OS NR-01)', icon: Briefcase, code: '050', badge: (serviceOrders || []).length.toString() },
        { id: 'documents', label: 'Repositório de Documentos & Laudos', icon: FolderKanban, code: '080' },
        { id: 'service-templates', label: 'Catálogo de Serviços & NRs', icon: Layers, code: '090' },
      ]
    },
    {
      title: 'PROTEÇÃO, CIPA & PREVENÇÃO',
      roles: ['ADMIN', 'GESTOR', 'TÉCNICO'],
      items: [
        { 
          id: 'epi-management', 
          label: 'Gestão de EPI & Biometria (NR-06)', 
          icon: ShieldCheck, 
          code: '200',
          badge: 'NR-06',
          badgeColor: 'bg-amber-500',
          highlight: true
        },
        {
          id: 'cipa-management',
          label: 'Gestão da CIPA & Eleições (NR-05)',
          icon: Vote,
          code: '210',
          badge: 'NR-05/31/22',
          badgeColor: 'bg-teal-500',
          highlight: true
        },
      ]
    },
    {
      title: 'SINISTRALIDADE & EVENTOS eSOCIAL',
      roles: ['ADMIN', 'GESTOR', 'TÉCNICO'],
      items: [
        { 
          id: 'cat-absences', 
          label: 'CAT (S-2210) & Afastamentos (S-2230)', 
          icon: AlertOctagon, 
          code: '300',
          badge: 'S-2210/2230',
          badgeColor: 'bg-rose-500',
          highlight: true
        },
        { 
          id: 'accidents-incidents', 
          label: 'Acidentes & Incidentes (NBR 14280)', 
          icon: AlertTriangle, 
          code: '310',
          badge: '5W2H / 6M',
          badgeColor: 'bg-rose-600'
        },
        { 
          id: 'esocial', 
          label: 'Gestão de Eventos eSocial', 
          icon: ShieldCheck, 
          code: '320',
          badge: (esocialEvents || []).length.toString(), 
          badgeColor: 'bg-emerald-500' 
        },
      ]
    },
    {
      title: 'DEMANDAS & INTELIGÊNCIA OPERACIONAL',
      roles: ['ADMIN', 'GESTOR', 'TÉCNICO'],
      items: [
        { 
          id: 'reports', 
          label: 'Central de Relatórios & BI (Excel/PDF)', 
          icon: FileSpreadsheet, 
          code: '500',
          badge: 'XLSX/PDF',
          badgeColor: 'bg-emerald-500',
          highlight: true
        },
        { id: 'requests', label: 'Central de Pendências & SLAs', icon: CheckSquare, code: '510', badge: (requests || []).filter(r => r?.status === 'OPEN').length.toString(), badgeColor: 'bg-amber-500' },
      ]
    },
    {
      title: 'COMUNICAÇÃO & AUTOMAÇÕES',
      roles: ['ADMIN', 'GESTOR', 'COMERCIAL'],
      items: [
        { id: 'communications', label: 'Central Multicanal (WA/Email)', icon: MessageSquare, code: '520' },
        { id: 'notifications', label: 'Notificações & Webhooks', icon: BellRing, code: '530' },
      ]
    },
    {
      title: 'GOVERNANÇA & QUALIDADE',
      roles: ['ADMIN', 'GESTOR', 'FINANCEIRO'],
      items: [
        { 
          id: 'users-management', 
          label: 'Central de Usuários & Perfis', 
          icon: UserCheck, 
          code: '600',
          badge: profiles ? `${profiles.length}` : undefined,
          badgeColor: 'bg-teal-500',
          highlight: true
        },
        { 
          id: 'saas-management', 
          label: 'Gestão de Assinantes SaaS', 
          icon: Building2, 
          code: '610',
          badge: tenants ? `${tenants.length}` : undefined,
          badgeColor: 'bg-teal-500'
        },
        { id: 'evaluations', label: 'Avaliações & Pós-Venda', icon: Star },
        { id: 'audit-logs', label: 'Auditoria Geral (Audit Log)', icon: History, code: '620' },
        { 
          id: 'tenant-theme-settings', 
          label: 'Tema & Cores PWA/Portal', 
          icon: Palette, 
          code: '630',
          badge: 'CSS Vars', 
          badgeColor: 'bg-emerald-500', 
          highlight: true 
        },
        { id: 'site-content', label: 'Site & Conteúdo', icon: Newspaper, code: '650', badge: 'Público', badgeColor: 'bg-emerald-500' },
        { id: 'settings', label: 'Configurações da Empresa', icon: Settings, code: '640' },
      ]
    },
    {
      title: 'SUPORTE & APRENDIZADO',
      roles: ['ADMIN', 'GESTOR', 'COMERCIAL', 'TÉCNICO', 'FINANCEIRO', 'CLIENTE_ADMIN', 'CLIENTE_USER'],
      items: [
        { 
          id: 'help-center', 
          label: 'Central de Ajuda & Tutoriais', 
          icon: BookOpen, 
          code: '720',
          badge: 'Prints & Vídeos',
          badgeColor: 'bg-emerald-500',
          highlight: true 
        },
      ]
    },
    {
      title: 'EXPERIÊNCIA DEDICADA',
      roles: ['ADMIN', 'GESTOR', 'COMERCIAL', 'TÉCNICO', 'FINANCEIRO', 'CLIENTE_ADMIN', 'CLIENTE_USER'],
      items: [
        { id: 'client-portal', label: 'Portal do Cliente (Visão Externa)', icon: UserCheck, code: '700', highlight: true },
        { id: 'technician-field', label: 'PWA de Campo (Técnico)', icon: Smartphone, code: '710', highlight: true },
      ]
    }
  ];

  const handleSelectView = (viewId: string) => {
    setActiveView(viewId);
    handleClose();
  };

  const renderContent = () => (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* Sidebar Header with Close Button */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-950/40">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center space-x-1.5">
              <span>PrevSafe</span>
              <span className="text-[9px] uppercase font-mono px-1 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">Módulos</span>
            </div>
            <p className="text-[10px] text-slate-400">Navegação Integrada SST</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 touch-manipulation"
          aria-label="Fechar menu lateral"
          title="Fechar Menu (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Context Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Nível de Acesso
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-white tracking-tight">{currentRole}</span>
          <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            Multi-Tenant
          </span>
        </div>

        {/* Quick Filter Search in Sidebar */}
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar ferramentas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
        {menuSections.map((sec, secIdx) => {
          const hasAccess = sec.roles.includes(currentRole);
          if (!hasAccess && !isClientRole) return null;
          if (isClientRole && sec.title !== 'EXPERIÊNCIA DEDICADA') return null;

          const filteredItems = sec.items.filter(item => 
            !searchTerm || 
            item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.code && item.code.includes(searchTerm.toLowerCase()))
          );

          if (filteredItems.length === 0) return null;

          return (
            <div key={secIdx} className="space-y-1">
              <div className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {sec.title}
              </div>
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectView(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 sm:py-2 rounded-xl text-xs font-medium transition touch-manipulation min-h-[42px] sm:min-h-0 ${
                      isActive
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : item.highlight
                        ? 'text-slate-200 hover:bg-slate-900 hover:text-white bg-slate-900/50 border border-slate-800/80'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {item.code && (
                        <span 
                          className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-950/80 text-emerald-400/90 border border-slate-800 hover:border-emerald-500/40"
                          title={`Digite ${item.code} para ir direto`}
                        >
                          {item.code}
                        </span>
                      )}
                      {item.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                          item.badgeColor || (isActive ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300')
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 text-left space-y-1.5">
        <button
          onClick={() => handleSelectView('settings')}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition text-left"
          title="Configurações da Empresa e status do banco Supabase"
        >
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-300">Prev Workflow</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400/80">Supabase</span>
        </button>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => handleSelectView('login')}
            className="flex items-center justify-center space-x-1.5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition text-xs font-semibold"
            title="Acessar Tela de Login"
          >
            <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tela Login</span>
          </button>

          <button
            onClick={() => {
              logout();
              handleSelectView('login');
            }}
            className="flex items-center justify-center space-x-1.5 p-2 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-300 hover:text-rose-200 transition text-xs font-semibold"
            title="Encerrar Sessão"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Sair</span>
          </button>
        </div>

        <div className="text-[10px] text-slate-500 text-center pt-1">PrevSafe SST • V1.0</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Slide-Over Drawer with Backdrop Overlay (Desktop & Mobile) */}
      {sidebarVisible && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop blur overlay */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Drawer Panel (slides smoothly from the left) */}
          <div className="relative w-80 max-w-[90vw] bg-slate-950 border-r border-slate-800 shadow-2xl z-10 flex flex-col h-full animate-in slide-in-from-left duration-200">
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
};

