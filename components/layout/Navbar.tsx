'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { CodigoTela } from './CodigoTela';
import { RoleType } from '@/types';
import { formatTime } from '@/lib/utils';
import { 
  Bell, 
  Home,
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
        return { icon: Loader2, spin: true, label: 'Carregando dados...', tone: 'text-tinta border-borda bg-superficie-2', title: 'Baixando os dados da organização do servidor.' };
      case 'SAVING':
        return { icon: CloudUpload, spin: false, label: 'Salvando...', tone: 'text-teal-700 border-teal-700/50 bg-teal-50', title: 'Enviando as alterações para o Supabase.' };
      case 'SAVED':
        return { icon: Cloud, spin: false, label: 'Salvo', tone: 'text-marca-escura border-marca-borda bg-marca-suave', title: lastSyncedAt ? `Última gravação no servidor às ${formatTime(lastSyncedAt)}.` : 'Dados salvos no servidor.' };
      case 'OFFLINE':
        return { icon: CloudOff, spin: false, label: 'Sem conexão', tone: 'text-amber-700 border-amber-200 bg-amber-50', title: syncMessage || 'Sem conexão com o servidor. As alterações sobem quando a conexão voltar.' };
      case 'ERROR':
        return { icon: AlertTriangle, spin: false, label: 'Não salvo', tone: 'text-rose-700 border-rose-200 bg-rose-50', title: syncMessage || 'Não foi possível salvar no servidor.' };
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
    { role: 'SAUDE', label: 'Saúde Ocupacional', desc: 'PCMSO, ASO e resultados de exame' },
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
    <header className="flex-shrink-0 z-40 bg-superficie border-b border-borda text-tinta select-none">
      {toastMessage && (
        <div className="bg-marca-escura text-white text-xs font-medium px-4 py-2 text-center animate-pulse">
          {toastMessage}
        </div>
      )}
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 lg:gap-3.5 h-[58px]">
          {/* Barra do prototipo: hamburguer, marca, campo de codigo, Pagina
              inicial, pilula da empresa e o bloco do usuario. O resto (busca
              rapida, nova OS, robo de prazos, atalhos) esta no menu "Mais" --
              medido, o grupo da direita sozinho ocupava 744px de 1408 e
              empurrava a marca para largura zero. */}
          {toggleMenu && (
            <button
              type="button"
              onClick={toggleMenu}
              className="shrink-0 p-1.5 rounded-lg text-tinta-2 hover:text-tinta hover:bg-superficie-2 transition active:scale-95 touch-manipulation"
              aria-label={menuIsOpen ? 'Recolher menu lateral' : 'Abrir menu lateral'}
              title={menuIsOpen ? 'Recolher menu lateral (Esc)' : 'Abrir menu lateral de módulos'}
            >
              {menuIsOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveView('dashboard-exec')}
            className="flex items-center gap-2.5 shrink-0"
            aria-label="Ir para o painel"
          >
            <svg viewBox="0 0 26 30" className="w-[22px] h-[26px] shrink-0" aria-hidden="true">
              <path d="M13 1 24 5v11c0 7-5 11-11 13C7 27 2 23 2 16V5z" fill="none" stroke="#0E3A46" strokeWidth="2.2" />
              <path d="M7.5 14.5l4 4L21 7" fill="none" stroke="#2FB24A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-titulo font-bold text-[17px] tracking-[-0.2px] text-tinta whitespace-nowrap">
              Prev<span className="text-marca-escura">Safe</span>
            </span>
          </button>

          {/* Atalho de tela pelo codigo, como o "Cod. Prog." do Semeio */}
          <CodigoTela setActiveView={setActiveView} className="hidden md:flex flex-1 max-w-[330px] min-w-0" />

          <button
            type="button"
            onClick={() => setActiveView('dashboard-exec')}
            className="hidden lg:flex shrink-0 items-center gap-1.5 h-[38px] px-3 rounded-[9px] border border-borda bg-superficie text-[13px] font-semibold text-tinta hover:bg-superficie-2 transition"
          >
            <Home className="w-[15px] h-[15px]" />
            Página inicial
          </button>

          {/* Empresa em uso. No mockup e a peca mais forte da barra: fundo
              petroleo, para quem olha de relance saber em qual empresa esta
              mexendo antes de clicar em qualquer coisa. */}
          <div className="hidden sm:flex flex-1 lg:max-w-[400px] min-w-0 items-center gap-2.5 h-[38px] px-3 rounded-[9px] bg-petroleo text-white text-[13px]">
            <span className={`text-[10px] font-bold tracking-[0.09em] text-marca-clara shrink-0` /* contraste-ok: #8FD3A1 sobre o bg-petroleo desta pilula, 7,01 */}>EMPRESA</span>
            <span className="font-semibold truncate min-w-0 flex-1">
              {activeClients.length === 0
                ? 'Nenhuma empresa ativa'
                : activeClients.length === 1
                  ? firstClientName
                  : `${firstClientName} · +${activeClients.length - 1}`}
            </span>
            <Building2 className="w-[15px] h-[15px] opacity-70 shrink-0" />
          </div>

          {/* Bloco do usuario: empurra tudo para a direita, como o .usuario
              do prototipo (margin-left:auto). */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">

            {/* Acoes secundarias.
                Somadas, elas deixavam o grupo da direita com 1204px dentro de um
                container de 1216px: sobrava zero para o nome e para a barra de
                metricas, que colapsavam em coluna de uma palavra por linha.
                Agrupadas aqui, continuam todas acessiveis num clique. */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`p-2 rounded-lg border transition ${
                  showMoreMenu
                    ? 'bg-superficie-3 text-tinta border-borda'
                    : 'bg-superficie-2 text-tinta border-borda hover:bg-superficie-3'
                }`}
                title="Nova OS, busca rápida, ajuda, IA Copilot, Campo PWA, Fluxo Master, atalhos e robô de prazos"
                aria-haspopup="menu"
                aria-expanded={showMoreMenu}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMoreMenu && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 bg-superficie border border-borda rounded-xl shadow-sm z-50 p-2 text-tinta"
                >
                  {onOpenNewOS && (
                    <button
                      role="menuitem"
                      onClick={() => { onOpenNewOS(); setShowMoreMenu(false); }}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-tinta hover:bg-superficie-2 transition flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 text-marca-escura shrink-0" />
                      <span className="flex-1">Nova Ordem de Serviço</span>
                      <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-fundo border border-borda text-tinta-2">Ctrl+N</kbd>
                    </button>
                  )}

                  {onOpenCommandPalette && (
                    <button
                      role="menuitem"
                      onClick={() => { onOpenCommandPalette(); setShowMoreMenu(false); }}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-tinta hover:bg-superficie-2 transition flex items-center gap-2"
                    >
                      <Search className="w-4 h-4 text-marca-escura shrink-0" />
                      <span className="flex-1">Busca rápida</span>
                      <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-fundo border border-borda text-tinta-2">Ctrl+K</kbd>
                    </button>
                  )}

                  <div className="my-1 border-t border-borda" />

                  <div className="px-2.5 py-1.5 flex items-center gap-3 text-[11px] text-tinta-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-700" />
                      OS ativas <strong className="text-tinta">{serviceOrders.filter(o => o.status === 'IN_PROGRESS').length}</strong>
                    </span>
                    {delayedOSCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        atrasadas <strong>{delayedOSCount}</strong>
                      </span>
                    )}
                    {criticalRequestsCount > 0 && (
                      <span className="text-amber-700">pendências <strong>{criticalRequestsCount}</strong></span>
                    )}
                  </div>
                  {syncBadge && (
                    <div className={`mx-2.5 mb-1 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold ${syncBadge.tone}`} title={syncBadge.title} aria-live="polite">
                      <syncBadge.icon className={`w-3.5 h-3.5 ${syncBadge.spin ? 'animate-spin' : ''}`} />
                      <span>{syncBadge.label}</span>
                    </div>
                  )}

                  <div className="my-1 border-t border-borda" />

                  <button
                    role="menuitem"
                    onClick={() => { setActiveView('help-center'); setShowMoreMenu(false); }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-2 ${
                      activeView === 'help-center' ? 'bg-marca-suave text-marca-escura' : 'text-tinta-2 hover:bg-superficie-2 hover:text-tinta'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-marca-escura shrink-0" />
                    <span>Ajuda &amp; Tutoriais</span>
                  </button>

                  <button
                    role="menuitem"
                    onClick={() => { onOpenCopilot(); setShowMoreMenu(false); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-tinta hover:bg-superficie-2 hover:text-tinta transition flex items-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4 text-marca-escura shrink-0" />
                    <span>IA Copilot (Normas e SST)</span>
                  </button>

                  <button
                    role="menuitem"
                    onClick={() => { onOpenFastTrack(); setShowMoreMenu(false); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-tinta hover:bg-superficie-2 hover:text-tinta transition flex items-center space-x-2"
                  >
                    <PlayCircle className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>Fluxo Master (Lead a Avaliação)</span>
                  </button>

                  <button
                    role="menuitem"
                    onClick={() => { setActiveView('technician-field'); setShowMoreMenu(false); }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-2 ${
                      activeView === 'technician-field' ? 'bg-teal-600/20 text-teal-800' : 'text-tinta hover:bg-superficie-2 hover:text-tinta'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>Campo PWA (Modo Técnico)</span>
                  </button>

                  <div className="my-1 border-t border-borda" />

                  {onOpenShortcutsHelp && (
                    <button
                      role="menuitem"
                      onClick={() => { onOpenShortcutsHelp(); setShowMoreMenu(false); }}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-tinta hover:bg-superficie-2 hover:text-tinta transition flex items-center space-x-2"
                    >
                      <Keyboard className="w-4 h-4 text-tinta-2 shrink-0" />
                      <span>Atalhos de teclado</span>
                    </button>
                  )}

                  <button
                    role="menuitem"
                    onClick={() => { handleRunJobs(); setShowMoreMenu(false); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-tinta hover:bg-superficie-2 hover:text-tinta transition flex items-center space-x-2"
                    title="Executar Robô Diário de Prazos (D-3 / D-1 / D0)"
                  >
                    <RefreshCw className="w-4 h-4 text-tinta-2 shrink-0" />
                    <span>Rodar robô de prazos</span>
                  </button>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="p-2 bg-superficie-2 hover:bg-superficie-3 text-tinta rounded-lg border border-borda relative transition"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-700 text-[10px] font-bold text-white flex items-center justify-center">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-superficie border border-borda rounded-xl shadow-sm z-50 p-3 text-tinta">
                  <div className="flex items-center justify-between pb-2 border-b border-borda">
                    <span className="text-xs font-bold uppercase tracking-wider text-tinta-2">
                      Notificações ({notifications.length})
                    </span>
                    {unreadNotifs.length > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] text-marca-escura hover:underline"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-borda mt-2">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-tinta-2">Nenhuma notificação registrada.</div>
                    ) : (
                      notifications.slice(0, 6).map((notif) => (
                        <div 
                          key={notif.id}
                          onClick={() => markNotificationAsRead(notif.id)}
                          className={`py-2 px-2 rounded-lg cursor-pointer transition text-xs ${
                            notif.status === 'UNREAD' ? 'bg-superficie-2 font-medium' : 'hover:bg-superficie-2 text-tinta-2'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-tinta">{notif.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-superficie-3 text-tinta font-mono">
                              {notif.channel}
                            </span>
                          </div>
                          <p className="text-[11px] text-tinta mt-1 line-clamp-2">{notif.message}</p>
                          <span className="text-[10px] text-tinta-2 mt-1 block">
                            {formatTime(notif.sent_at)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-borda mt-2 flex justify-between">
                    <button
                      onClick={() => {
                        setActiveView('notifications');
                        setShowNotifMenu(false);
                      }}
                      className="text-xs text-marca-escura hover:text-marca-escura font-medium"
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
                className="flex items-center space-x-2 pl-2 pr-3 py-1.5 bg-superficie-2 hover:bg-superficie-3 border border-borda rounded-lg text-xs transition"
              >
                <div className="w-6 h-6 rounded-full bg-marca-escura flex items-center justify-center font-bold text-[11px] text-white">
                  {currentProfile.full_name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-tinta leading-tight">{currentProfile.full_name}</div>
                  <div className="text-[10px] text-marca-escura font-mono font-medium">{currentProfile.role}</div>
                </div>
              </button>

              {/* Role Switcher Dropdown */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-superficie border border-borda rounded-xl shadow-sm z-50 p-2 text-tinta">
                  <div className="px-2 py-1.5 border-b border-borda">
                    <div className="text-[10px] uppercase font-bold text-tinta-2">Alternar Perfil (RBAC Multi-Role)</div>
                    <p className="text-[11px] text-tinta-2 mt-0.5">Teste o sistema com permissões reais:</p>
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
                          currentProfile.role === r.role ? 'bg-marca-suave text-marca-escura border border-marca' : 'hover:bg-superficie-2 text-tinta-2'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-tinta">{r.label}</div>
                          <div className="text-[10px] text-tinta-2">{r.desc}</div>
                        </div>
                        {currentProfile.role === r.role && (
                          <CheckCircle2 className="w-4 h-4 text-marca-escura flex-shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-borda mt-2 px-1 space-y-1">
                    <button
                      onClick={() => {
                        setActiveView('users-management');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-tinta-2 hover:bg-teal-50 border border-teal-200 transition flex items-center space-x-2"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                      <span>Gerenciar Usuários & RBAC</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('login');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-tinta hover:text-tinta hover:bg-superficie-2 transition flex items-center space-x-2"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-marca-escura" />
                      <span>Ir para Tela de Login</span>
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setShowRoleMenu(false);
                        setActiveView('login');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 transition flex items-center space-x-2"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-700" />
                      <span>Encerrar Sessão (Logout)</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-borda mt-1 px-2 text-[10px] text-tinta-2">
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
