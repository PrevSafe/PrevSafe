'use client';

import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  ShieldCheck,
  X,
  Search,
  Sparkles,
  Layers as LayersIcon
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  isMobileOpen = false,
  setIsMobileOpen
}) => {
  const { currentRole, serviceOrders, requests, proposals, contracts, esocialEvents } = usePrevSafe();
  const [searchTerm, setSearchTerm] = useState('');

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen && setIsMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, setIsMobileOpen]);

  const isClientRole = currentRole === 'CLIENTE_ADMIN' || currentRole === 'CLIENTE_USER';

  const menuSections = [
    {
      title: 'VISÃO EXECUTIVA',
      roles: ['ADMIN', 'GESTOR', 'COMERCIAL', 'FINANCEIRO'],
      items: [
        { id: 'dashboard-exec', label: 'Dashboard Executivo', icon: BarChart3, badge: undefined },
        { id: 'dashboard-oper', label: 'Dashboard Operacional', icon: Activity, badge: serviceOrders.filter(o => o.status === 'IN_PROGRESS').length.toString() },
        { id: 'dashboard-comm', label: 'Dashboard Comercial', icon: TrendingUp, badge: proposals.filter(p => p.status === 'SENT').length.toString() },
        { id: 'dashboard-qual', label: 'Dashboard de Qualidade', icon: Award, badge: 'NPS 9.6' },
      ]
    },
    {
      title: 'CRM & COMERCIAL',
      roles: ['ADMIN', 'GESTOR', 'COMERCIAL', 'FINANCEIRO'],
      items: [
        { id: 'crm-clients', label: 'Clientes & Unidades', icon: Users, badge: undefined },
        { id: 'crm-leads', label: 'Leads & Funil Oportunidades', icon: Target, badge: undefined },
        { id: 'proposals', label: 'Propostas Comerciais', icon: FileSpreadsheet, badge: undefined },
        { id: 'contracts', label: 'Contratos & Assinaturas', icon: FileSignature, badge: contracts.length.toString() },
      ]
    },
    {
      title: 'OPERAÇÕES SST',
      roles: ['ADMIN', 'GESTOR', 'TÉCNICO'],
      items: [
        { id: 'service-orders', label: 'Ordens de Serviço (OS)', icon: Briefcase, badge: serviceOrders.length.toString() },
        { id: 'esocial', label: 'Gestão de Eventos eSocial', icon: ShieldCheck, badge: esocialEvents.length.toString(), badgeColor: 'bg-emerald-500' },
        { id: 'requests', label: 'Central de Pendências', icon: CheckSquare, badge: requests.filter(r => r.status === 'OPEN').length.toString(), badgeColor: 'bg-amber-500' },
        { id: 'documents', label: 'Repositório de Documentos', icon: FolderKanban, badge: undefined },
        { id: 'service-templates', label: 'Catálogo de Serviços (NRs)', icon: Layers, badge: undefined },
      ]
    },
    {
      title: 'COMUNICAÇÃO & AUTOMAÇÕES',
      roles: ['ADMIN', 'GESTOR', 'COMERCIAL'],
      items: [
        { id: 'communications', label: 'Central Multicanal (WA/Email)', icon: MessageSquare, badge: undefined },
        { id: 'notifications', label: 'Notificações & Webhooks', icon: BellRing, badge: undefined },
      ]
    },
    {
      title: 'GOVERNANÇA & QUALIDADE',
      roles: ['ADMIN', 'GESTOR', 'FINANCEIRO'],
      items: [
        { id: 'evaluations', label: 'Avaliações & Pós-Venda', icon: Star, badge: undefined },
        { id: 'audit-logs', label: 'Auditoria Geral (Audit Log)', icon: History, badge: undefined },
        { id: 'settings', label: 'Configurações SaaS', icon: Settings, badge: undefined },
      ]
    },
    {
      title: 'EXPERIÊNCIA DEDICADA',
      roles: ['ADMIN', 'GESTOR', 'COMERCIAL', 'TÉCNICO', 'FINANCEIRO', 'CLIENTE_ADMIN', 'CLIENTE_USER'],
      items: [
        { id: 'client-portal', label: 'Portal do Cliente (Visão Externa)', icon: UserCheck, highlight: true },
        { id: 'technician-field', label: 'PWA de Campo (Técnico)', icon: Smartphone, highlight: true },
      ]
    }
  ];

  const handleSelectView = (viewId: string) => {
    setActiveView(viewId);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const renderContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* Mobile Drawer Header with Close Button */}
      {isMobile && (
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-950/40">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center space-x-1.5">
                <span>PrevSafe</span>
                <span className="text-[9px] uppercase font-mono px-1 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">Menu</span>
              </div>
              <p className="text-[10px] text-slate-400">Navegação Completa</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 touch-manipulation"
            aria-label="Fechar menu lateral"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

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

        {/* Quick Filter Search in Mobile */}
        {isMobile && (
          <div className="mt-3 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar módulos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
        {menuSections.map((sec, secIdx) => {
          const hasAccess = sec.roles.includes(currentRole);
          if (!hasAccess && !isClientRole) return null;
          if (isClientRole && sec.title !== 'EXPERIÊNCIA DEDICADA') return null;

          const filteredItems = sec.items.filter(item => 
            !searchTerm || item.label.toLowerCase().includes(searchTerm.toLowerCase())
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

                    <div className="flex items-center space-x-1.5">
                      {item.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                          item.badgeColor || (isActive ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300')
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400 sm:hidden" />}
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
          title="Ver configurações e status do banco Supabase"
        >
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-300">Prev Workflow</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400/80">Supabase</span>
        </button>
        <div className="text-[10px] text-slate-500 text-center">PrevSafe SST • V1.0</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none">
        {renderContent(false)}
      </aside>

      {/* Mobile Drawer (Slide-Over with Backdrop Overlay) */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop blur overlay */}
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] bg-slate-950 border-r border-slate-800 shadow-2xl z-10 flex flex-col h-full animate-in slide-in-from-left duration-200">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
};

