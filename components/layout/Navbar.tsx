'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { RoleType } from '@/types';
import { formatTime } from '@/lib/utils';
import { 
  Shield, 
  Bell, 
  Sparkles, 
  Smartphone, 
  UserCheck, 
  RefreshCw, 
  PlayCircle,
  ExternalLink,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Menu,
  X,
  BookOpen,
  GraduationCap,
  LogOut,
  KeyRound,
  Search,
  Plus,
  Keyboard,
  CloudOff,
  Cloud,
  CloudUpload,
  Loader2
} from 'lucide-react';

interface NavbarProps {
  onOpenCopilot: () => void;
  onOpenFastTrack: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  onOpenCommandPalette?: () => void;
  onOpenNewOS?: () => void;
  onOpenShortcutsHelp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCopilot,
  onOpenFastTrack,
  activeView,
  setActiveView,
  onToggleSidebar,
  isSidebarOpen = false,
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
  onOpenCommandPalette,
  onOpenNewOS,
  onOpenShortcutsHelp
}) => {
  const toggleMenu = onToggleSidebar || onToggleMobileSidebar;
  const menuIsOpen = isSidebarOpen || isMobileSidebarOpen;
  const { 
    currentProfile, 
    switchRole, 
    logout,
    organization, 
    notifications = [], 
    markNotificationAsRead, 
    markAllNotificationsAsRead,
    runDailyJobSimulation,
    resetDatabaseToSeed,
    serviceOrders = [], 
    requests = [], 
    clients = [], 
    syncStatus, 
    syncMessage, 
    lastSyncedAt 
  } = usePrevSafe();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const unreadNotifs = (notifications || []).filter(n => n?.status === 'UNREAD');
  const delayedOSCount = (serviceOrders || []).filter(os => os?.status === 'IN_PROGRESS' && os?.due_date && new Date(os.due_date) < new Date()).length;
  const criticalRequestsCount = (requests || []).filter(r => r?.status === 'OPEN' && r?.priority === 'HIGH').length;
  // Indicador de gravacao no servidor: o usuario precisa saber, sem clicar em
  // nada, se o que ele acabou de digitar ja saiu deste dispositivo.
  const syncBadge = (() => {
    switch (syncStatus) {
      case 'LOADING':
        return { icon: Loader2, spin: true, label: 'Carregando dados...', tone: 'text-slate-300 border-slate-700 bg-slate-800/80', title: 'Baixando os dados da organização do servidor.' };
      case 'SAVING':
        return { icon: CloudUpload, spin: false, label: 'Salvando...', tone: 'text-sky-300 border-sky-700/50 bg-sky-950/50', title: 'Enviando as alterações para o Supabase.' };
      case 'SAVED':
        return { icon: Cloud, spin: false, label: 'Salvo', tone: 'text-emerald-300 border-emerald-700/50 bg-emerald-950/50', title: lastSyncedAt ? `Última gravação no servidor às ${formatTime(lastSyncedAt)}.` : 'Dados salvos no servidor.' };
      case 'OFFLINE':
        return { icon: CloudOff, spin: false, label: 'Sem conexão', tone: 'text-amber-300 border-amber-700/50 bg-amber-950/50', title: syncMessage || 'Sem conexão com o servidor. As alterações sobem quando a conexão voltar.' };
      case 'ERROR':
        return { icon: AlertTriangle, spin: false, label: 'Não salvo', tone: 'text-rose-300 border-rose-700/50 bg-rose-950/50', title: syncMessage || 'Não foi possível salvar no servidor.' };
      default:
        return null;
    }
  })();

  const activeClients = (clients || []).filter(c => c?.status === 'ACTIVE');
  const firstClientName = activeClients[0]?.trade_name || activeClients[0]?.legal_name || '';

  const roles: { role: RoleType; label: string; desc: string }[] = [
    { role: 'ADMIN', label: 'Admin Geral', desc: 'Acesso integral ao SaaS e configurações' },
    { role: 'GESTOR', label: 'Gestor de Operações', desc: 'Gestão de OS, SLA, equipes e entregas' },
    { role: 'COMERCIAL', label: 'Executivo Comercial', desc: 'Leads, oportunidades e propostas' },
    { role: 'TÉCNICO', label: 'Técnico de Campo', desc: 'Visitas, tarefas, checklists e evidências' },
    { role: 'FINANCEIRO', label: 'Financeiro', desc: 'Contratos, valores e faturamento' },
    { role: 'CLIENTE_ADMIN', label: 'Cliente (Diretoria/RH)', desc: 'Portal simplificado e aceite formal' },
    { role: 'CLIENTE_USER', label: 'Cliente (Colaborador)', desc: 'Consulta de documentos autorizados' },
  ];

  const handleRunJobs = () => {
    const result = runDailyJobSimulation();
    setToastMessage(result.summary);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleReset = () => {
    if (confirm('Deseja limpar a base e voltar ao estado inicial? Todos os cadastros e movimentos serão apagados deste navegador. Esta ação não pode ser desfeita.')) {
      resetDatabaseToSeed();
      setToastMessage('Base limpa. Os catálogos de referência foram mantidos.');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white select-none">
      {toastMessage && (
        <div className="bg-emerald-600 text-white text-xs font-medium px-4 py-2 text-center animate-pulse">
          {toastMessage}
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Menu Lateral Toggle Button & Logo & Brand */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Sidebar Menu Toggle Button (Desktop & Mobile) */}
            {toggleMenu && (
              <button
                type="button"
                onClick={toggleMenu}
                className={`p-2 rounded-xl border transition-all duration-200 active:scale-95 touch-manipulation min-w-[42px] min-h-[42px] flex items-center justify-center space-x-2 ${
                  menuIsOpen 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950/50' 
                    : 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border-slate-700/80'
                }`}
                aria-label={menuIsOpen ? "Recolher menu lateral" : "Abrir menu lateral"}
                title={menuIsOpen ? "Recolher Menu Lateral (Esc)" : "Abrir Menu Lateral de Módulos"}
              >
                {menuIsOpen ? (
                  <X className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-200" />
                )}
                <span className="text-xs font-semibold hidden md:inline-block">
                  {menuIsOpen ? 'Recolher Menu' : 'Menu Lateral'}
                </span>
                <span className="hidden lg:inline-block text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-emerald-400 font-mono border border-emerald-500/30">
                  {menuIsOpen ? 'Aberto' : 'Recolhido'}
                </span>
              </button>
            )}

            <div className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer" onClick={() => setActiveView('dashboard-exec')}>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/40 flex-shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <span className="font-bold text-base sm:text-lg tracking-tight text-white">PrevSafe</span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">V1.0 SST</span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">Gestão Integrada de Serviços Contratados</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hidden lg:flex items-center space-x-4 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs">
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-200">
                {activeClients.length === 0
                  ? 'Nenhum cliente ativo'
                  : activeClients.length === 1
                    ? firstClientName
                    : `${firstClientName} & +${activeClients.length - 1}`}
              </span>
            </div>
            <div className="w-px h-3.5 bg-slate-700" />
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>OS Ativas: <strong>{serviceOrders.filter(o => o.status === 'IN_PROGRESS').length}</strong></span>
            </div>
            {delayedOSCount > 0 && (
              <>
                <div className="w-px h-3.5 bg-slate-700" />
                <div className="flex items-center space-x-1 text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Atrasadas: <strong>{delayedOSCount}</strong></span>
                </div>
              </>
            )}
            {criticalRequestsCount > 0 && (
              <>
                <div className="w-px h-3.5 bg-slate-700" />
                <div className="flex items-center space-x-1 text-amber-400">
                  <span>Pendências: <strong>{criticalRequestsCount}</strong></span>
                </div>
              </>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {syncBadge && (
              <div
                title={syncBadge.title}
                aria-live="polite"
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold ${syncBadge.tone}`}
              >
                <syncBadge.icon className={`w-3.5 h-3.5 ${syncBadge.spin ? 'animate-spin' : ''}`} />
                <span>{syncBadge.label}</span>
              </div>
            )}
            {/* Global Quick Search Button (Ctrl+K) */}
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="flex items-center space-x-2 px-2.5 sm:px-3 py-1.5 bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 hover:border-emerald-500/40 rounded-xl text-xs transition shadow-xs group"
                title="Busca rápida e paleta de comandos (Ctrl + K)"
                aria-label="Abrir busca rápida"
              >
                <Search className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="hidden md:inline text-slate-300">Busca rápida</span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-400 group-hover:text-emerald-300 group-hover:border-emerald-500/40">
                  <span className="text-[9px]">Ctrl</span> K
                </kbd>
              </button>
            )}

            {/* Global Nova OS Button (Ctrl+N) */}
            {onOpenNewOS && (
              <button
                type="button"
                onClick={onOpenNewOS}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-950/40 transition active:scale-95 group"
                title="Criar Nova Ordem de Serviço (Ctrl + N)"
                aria-label="Criar Nova Ordem de Serviço"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nova OS</span>
                <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.2 rounded bg-emerald-700/90 text-[10px] font-mono text-emerald-100 border border-emerald-500/40">
                  Ctrl+N
                </kbd>
              </button>
            )}

            {/* Shortcuts Help Cheat Sheet Button */}
            {onOpenShortcutsHelp && (
              <button
                type="button"
                onClick={onOpenShortcutsHelp}
                className="hidden md:flex p-2 text-slate-400 hover:text-emerald-300 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition"
                title="Guia de Atalhos Globais: Ctrl+K, Ctrl+N e Códigos Numéricos (ex: 100 para Funcionários) (?)"
                aria-label="Ver atalhos de teclado"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            )}

            {/* Help Center Button */}
            <button
              onClick={() => setActiveView('help-center')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                activeView === 'help-center'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white border-emerald-500/40'
              }`}
              title="Central de Ajuda, Tutoriais com Prints, Infográficos e Vídeos"
            >
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Ajuda & Tutoriais</span>
            </button>

            {/* Master Flow Walkthrough Button */}
            <button
              onClick={onOpenFastTrack}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-950/40 transition"
              title="Simular o Fluxo Completo de Lead até Avaliação"
            >
              <PlayCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Fluxo Master</span>
            </button>

            {/* AI Assistant Button */}
            <button
              onClick={onOpenCopilot}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 rounded-lg text-xs font-medium transition"
              title="Assistente IA de Normas Regulamentadoras e SST"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">IA Copilot</span>
            </button>

            {/* Field PWA Switch */}
            <button
              onClick={() => setActiveView('technician-field')}
              className={`p-2 rounded-lg text-xs font-medium border transition flex items-center space-x-1 ${
                activeView === 'technician-field'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Modo Técnico de Campo (PWA Mobile)"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden md:inline">Campo PWA</span>
            </button>

            {/* Run Daily Jobs */}
            <button
              onClick={handleRunJobs}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Executar Robô Diário de Prazos (08:00 D-3/D-1/D0)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 relative transition"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-3 text-slate-200">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Notificações ({notifications.length})
                    </span>
                    {unreadNotifs.length > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] text-emerald-400 hover:underline"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 mt-2">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">Nenhuma notificação registrada.</div>
                    ) : (
                      notifications.slice(0, 6).map((notif) => (
                        <div 
                          key={notif.id}
                          onClick={() => markNotificationAsRead(notif.id)}
                          className={`py-2 px-2 rounded-lg cursor-pointer transition text-xs ${
                            notif.status === 'UNREAD' ? 'bg-slate-800/80 font-medium' : 'hover:bg-slate-800/40 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">{notif.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                              {notif.channel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{notif.message}</p>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {formatTime(notif.sent_at)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 mt-2 flex justify-between">
                    <button
                      onClick={() => {
                        setActiveView('notifications');
                        setShowNotifMenu(false);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      Ver Central de Notificações
                    </button>
                    <button
                      onClick={handleReset}
                      className="text-[11px] text-slate-500 hover:text-rose-400"
                    >
                      Limpar Base
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile & Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-2 pl-2 pr-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs transition"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-[11px] text-white">
                  {currentProfile.full_name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200 leading-tight">{currentProfile.full_name}</div>
                  <div className="text-[10px] text-emerald-400 font-mono font-medium">{currentProfile.role}</div>
                </div>
              </button>

              {/* Role Switcher Dropdown */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 text-slate-200">
                  <div className="px-2 py-1.5 border-b border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Alternar Perfil (RBAC Multi-Role)</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Teste o sistema com permissões reais:</p>
                  </div>

                  <div className="space-y-1 mt-1">
                    {roles.map(r => (
                      <button
                        key={r.role}
                        onClick={() => {
                          switchRole(r.role);
                          setShowRoleMenu(false);
                          if (r.role === 'CLIENTE_ADMIN' || r.role === 'CLIENTE_USER') {
                            setActiveView('client-portal');
                          } else if (r.role === 'TÉCNICO') {
                            setActiveView('technician-field');
                          }
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                          currentProfile.role === r.role ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40' : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-100">{r.label}</div>
                          <div className="text-[10px] text-slate-400">{r.desc}</div>
                        </div>
                        {currentProfile.role === r.role && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800 mt-2 px-1 space-y-1">
                    <button
                      onClick={() => {
                        setActiveView('users-management');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-teal-300 hover:text-white hover:bg-teal-950/40 border border-teal-900/30 transition flex items-center space-x-2"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                      <span>Gerenciar Usuários & RBAC</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('login');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center space-x-2"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ir para Tela de Login</span>
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setShowRoleMenu(false);
                        setActiveView('login');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 border border-rose-900/30 transition flex items-center space-x-2"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Encerrar Sessão (Logout)</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 mt-1 px-2 text-[10px] text-slate-500">
                    SaaS Multi-tenant: {organization.name}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
