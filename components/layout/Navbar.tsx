'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { RoleType } from '@/types';
import { formatTime } from '@/lib/utils';
import { 
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
  Loader2,
  MoreHorizontal
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
  const [showMoreMenu, setShowMoreMenu] = useState(false);
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

  // Este botao apaga a organizacao inteira, no dispositivo E no servidor
  // (resetDatabaseToSeed chama purgeOrganizationRecords). O aviso anterior dizia
  // "apagados deste navegador", subestimando o estrago, e o botao ficava dentro
  // do menu de notificacoes. Agora exige digitar CONFIRMAR.
  const handleReset = () => {
    const primeiroAviso = confirm(
      'APAGAR TODOS OS DADOS DA ORGANIZAÇÃO\n\n' +
      'Serão excluídos clientes, funcionários, propostas, contratos, ordens de serviço, ' +
      'documentos, eventos do eSocial e assinaturas — NESTE DISPOSITIVO E NO SERVIDOR, ' +
      'para todos os usuários da organização.\n\n' +
      'Esta ação NÃO pode ser desfeita e não há backup automático.\n\n' +
      'Deseja continuar?'
    );
    if (!primeiroAviso) return;

    const digitado = prompt('Para confirmar a exclusão definitiva, digite: CONFIRMAR');
    if ((digitado || '').trim().toUpperCase() !== 'CONFIRMAR') {
      setToastMessage('Exclusão cancelada. Nenhum dado foi apagado.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    resetDatabaseToSeed();
    setToastMessage('Todos os dados da organização foram apagados, aqui e no servidor.');
    setTimeout(() => setToastMessage(null), 6000);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white select-none">
      {toastMessage && (
        <div className="bg-emerald-600 text-white text-xs font-medium px-4 py-2 text-center animate-pulse">
          {toastMessage}
        </div>
      )}
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 h-16">
          {/* Menu Lateral Toggle Button & Logo & Brand */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 lg:flex-initial">
            {/* Sidebar Menu Toggle Button (Desktop & Mobile) */}
            {toggleMenu && (
              <button
                type="button"
                onClick={toggleMenu}
                className={`p-2 rounded-xl border transition-all duration-200 active:scale-95 touch-manipulation min-w-[42px] min-h-[42px] shrink-0 flex items-center justify-center space-x-2 ${
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

            <div className="flex items-center cursor-pointer min-w-0" onClick={() => setActiveView('dashboard-exec')}>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
                  <span className="font-bold text-base sm:text-lg tracking-tight text-white truncate">PrevSafe</span>
                  <span className="hidden sm:inline-block text-[10px] uppercase font-mono tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">V1.0 SST</span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block truncate">Gestão Integrada de Serviços Contratados</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hidden 2xl:flex shrink-0 items-center space-x-4 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs whitespace-nowrap">
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-200 truncate max-w-[220px]">
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
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
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

            {/* Acoes secundarias.
                Somadas, elas deixavam o grupo da direita com 1204px dentro de um
                container de 1216px: sobrava zero para o nome e para a barra de
                metricas, que colapsavam em coluna de uma palavra por linha.
                Agrupadas aqui, continuam todas acessiveis num clique. */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  showMoreMenu
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700'
                }`}
                title="Ajuda, IA Copilot, Campo PWA, Fluxo Master, atalhos e robô de prazos"
                aria-haspopup="menu"
                aria-expanded={showMoreMenu}
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="hidden lg:inline">Mais</span>
              </button>

              {showMoreMenu && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 text-slate-200"
                >
                  <button
                    role="menuitem"
                    onClick={() => { setActiveView('help-center'); setShowMoreMenu(false); }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-2 ${
                      activeView === 'help-center' ? 'bg-emerald-600/20 text-emerald-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Ajuda &amp; Tutoriais</span>
                  </button>

                  <button
                    role="menuitem"
                    onClick={() => { onOpenCopilot(); setShowMoreMenu(false); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>IA Copilot (Normas e SST)</span>
                  </button>

                  <button
                    role="menuitem"
                    onClick={() => { onOpenFastTrack(); setShowMoreMenu(false); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center space-x-2"
                  >
                    <PlayCircle className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Fluxo Master (Lead a Avaliação)</span>
                  </button>

                  <button
                    role="menuitem"
                    onClick={() => { setActiveView('technician-field'); setShowMoreMenu(false); }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-2 ${
                      activeView === 'technician-field' ? 'bg-blue-600/20 text-blue-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Campo PWA (Modo Técnico)</span>
                  </button>

                  <div className="my-1 border-t border-slate-800" />

                  {onOpenShortcutsHelp && (
                    <button
                      role="menuitem"
                      onClick={() => { onOpenShortcutsHelp(); setShowMoreMenu(false); }}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center space-x-2"
                    >
                      <Keyboard className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Atalhos de teclado</span>
                    </button>
                  )}

                  <button
                    role="menuitem"
                    onClick={() => { handleRunJobs(); setShowMoreMenu(false); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center space-x-2"
                    title="Executar Robô Diário de Prazos (D-3 / D-1 / D0)"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Rodar robô de prazos</span>
                  </button>
                </div>
              )}
            </div>

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
