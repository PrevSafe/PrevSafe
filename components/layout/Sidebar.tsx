'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { montarCatalogo } from '@/lib/programas';
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
  ChevronDown,
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

  // O catalogo mora em lib/programas.ts: o campo de atalho da barra
  // superior usa a mesma lista, e com ela em dois lugares os codigos
  // divergiriam.
  const menuSections = montarCatalogo({
    serviceOrders,
    proposals,
    contracts,
    requests,
    transactions,
    esocialEvents,
    profiles,
    tenants,
  });

  // Os grupos comecam fechados e abrem com um clique; o grupo da tela em uso
  // abre sozinho, para nao se perder de onde esta. Mesmo comportamento do
  // Semeio Agro.
  const grupoAtivo = menuSections.find((sec) =>
    sec.items.some((item) => item.id === activeView)
  )?.title;

  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(
    () => new Set(grupoAtivo ? [grupoAtivo] : [])
  );

  useEffect(() => {
    if (!grupoAtivo) return;
    setGruposAbertos((atual) =>
      atual.has(grupoAtivo) ? atual : new Set(atual).add(grupoAtivo)
    );
  }, [grupoAtivo]);

  const alternarGrupo = (titulo: string) => {
    setGruposAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(titulo)) novo.delete(titulo);
      else novo.add(titulo);
      return novo;
    });
  };

  const handleSelectView = (viewId: string) => {
    setActiveView(viewId);
    handleClose();
  };

  const renderContent = () => (
    <div className="flex flex-col h-full bg-superficie text-tinta">
      {/* Sidebar Header with Close Button */}
      <div className="p-4 border-b border-borda bg-superficie flex items-center justify-between">
        <div className="min-w-0">
          <div>
            <div className="text-sm font-bold text-tinta flex items-center space-x-1.5">
              <span>PrevSafe</span>
              <span className="text-[9px] uppercase font-mono px-1 py-0.2 bg-marca-suave text-marca-escura border border-marca rounded">Módulos</span>
            </div>
            <p className="text-[10px] text-tinta-2">Navegação Integrada SST</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg bg-superficie-2 hover:bg-superficie-3 text-tinta hover:text-tinta transition active:scale-95 touch-manipulation"
          aria-label="Fechar menu lateral"
          title="Fechar Menu (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Context Header */}
      <div className="p-3.5 sm:p-4 border-b border-borda bg-superficie">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-marca animate-pulse" />
          <span className="text-[11px] font-semibold text-tinta uppercase tracking-wider">
            Nível de Acesso
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-tinta tracking-tight">{currentRole}</span>
          <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-superficie-2 text-tinta border border-borda font-mono">
            Multi-Tenant
          </span>
        </div>

        {/* Quick Filter Search in Sidebar */}
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 text-tinta-2 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar ferramentas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-fundo border border-borda rounded-lg text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-marca-escura"
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

          // Buscando, o grupo com resultado abre sozinho: senao a busca
          // encontraria o item e o esconderia dentro do grupo fechado.
          const grupoAberto = !!searchTerm || gruposAbertos.has(sec.title);
          const idLista = `menu-grupo-${secIdx}`;

          return (
            <div key={secIdx} className="space-y-1">
              <button
                type="button"
                onClick={() => alternarGrupo(sec.title)}
                aria-expanded={grupoAberto}
                aria-controls={idLista}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-tinta-2 uppercase tracking-wider hover:bg-superficie-2 hover:text-tinta transition"
              >
                <span className="truncate text-left">{sec.title}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${
                    grupoAberto ? '' : '-rotate-90'
                  }`}
                />
              </button>

              {/* Desliza ao abrir e fechar. Fechado, os itens saem tambem do
                  Tab e do leitor de tela, nao so da vista. */}
              <div
                id={idLista}
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  grupoAberto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] invisible'
                }`}
              >
                <div className="min-h-0 overflow-hidden space-y-1">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectView(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 sm:py-2 rounded-xl text-xs font-medium transition touch-manipulation min-h-[42px] sm:min-h-0 ${
                      isActive
                        ? 'bg-marca-escura text-white border border-marca-escura shadow-sm'
                        : item.highlight
                        ? 'text-tinta hover:bg-superficie hover:text-tinta bg-superficie border border-borda'
                        : 'text-tinta-2 hover:bg-superficie hover:text-tinta'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-tinta-2'}`} />  {/* contraste-ok: branco sobre o bg-marca-escura do botao pai, 4,9:1 */}
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {item.code && (
                        <span 
                          className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                            isActive
                              ? 'bg-white/15 text-white border-white/30'  /* contraste-ok: branco sobre o bg-marca-escura do botao pai, 4,9:1 */
                              : 'bg-fundo text-marca-escura border-borda hover:border-marca-escura'
                          }`}
                          title={`Digite ${item.code} para ir direto`}
                        >
                          {item.code}
                        </span>
                      )}
                      {item.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                          item.badgeColor || (isActive ? 'bg-marca-escura text-white' : 'bg-superficie-2 text-tinta')
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-white" />}  {/* contraste-ok: branco sobre o bg-marca-escura do botao pai, 4,9:1 */}
                    </div>
                  </button>
                );
              })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-borda bg-superficie text-left space-y-1.5">
        <button
          onClick={() => handleSelectView('settings')}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-marca-suave hover:bg-marca-borda border border-marca-borda transition text-left"
          title="Configurações da Empresa e status do banco Supabase"
        >
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-marca-escura animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-semibold text-marca-escura">Prev Workflow</span>
          </div>
          <span className="text-[10px] font-mono text-marca-escura">Supabase</span>
        </button>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => handleSelectView('login')}
            className="flex items-center justify-center space-x-1.5 p-2 rounded-xl bg-superficie-2 hover:bg-superficie-2 border border-borda text-tinta hover:text-tinta transition text-xs font-semibold"
            title="Acessar Tela de Login"
          >
            <KeyRound className="w-3.5 h-3.5 text-marca-escura" />
            <span>Tela Login</span>
          </button>

          <button
            onClick={() => {
              logout();
              handleSelectView('login');
            }}
            className="flex items-center justify-center space-x-1.5 p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 transition text-xs font-semibold"
            title="Encerrar Sessão"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-700" />
            <span>Sair</span>
          </button>
        </div>

        <div className="text-[10px] text-tinta-2 text-center pt-1">PrevSafe SST • V1.0</div>
      </div>
    </div>
  );

  return (
    <>
      {/*
       * No desktop o menu e uma coluna fixa, sempre visivel: a navegacao do
       * sistema e usada o tempo todo, e uma gaveta que cobre a tela obrigava
       * um clique a mais a cada troca de tela. No celular ele continua gaveta,
       * porque ali nao ha largura para as duas coisas.
       */}
      <nav
        className="hidden lg:flex lg:flex-col lg:w-[258px] lg:flex-shrink-0 lg:h-full border-r border-borda bg-superficie"
        aria-label="Menu principal"
      >
        {renderContent()}
      </nav>

      {/* Gaveta (somente telas pequenas) */}
      {sidebarVisible && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-tinta/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={handleClose}
            aria-hidden="true"
          />
          <div className="relative w-80 max-w-[90vw] bg-superficie border-r border-borda shadow-sm z-10 flex flex-col h-full animate-in slide-in-from-left duration-200">
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
};

