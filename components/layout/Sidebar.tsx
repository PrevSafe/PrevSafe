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
  ChevronsLeft,
  ShieldCheck,
  X,
  Search,
  Sparkles,
  DollarSign,
  Layers as LayersIcon,
  GraduationCap,
  BookOpen,
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

  /**
   * O protótipo abre a coluna direto no primeiro grupo. O que havia aqui
   * antes era repetição da barra de cima: a marca "PrevSafe · Módulos" (que
   * já está no topo, agora com o escudo) e um bloco "Nível de Acesso /
   * ADMIN / Multi-Tenant" (o papel já aparece sob o nome no avatar). Dois
   * blocos de moldura antes do primeiro item de menu.
   *
   * O X só existe na gaveta do celular: no desktop a coluna é fixa, e quem
   * quer recolher usa o hambúrguer do topo ou o "Recolher menu" do rodapé.
   */
  const renderContent = (emGaveta: boolean) => (
    <div className="flex flex-col h-full bg-superficie text-tinta">
      {emGaveta && (
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-borda">
          <span className="text-[10px] font-bold tracking-[0.1em] text-tinta-3 uppercase">Menu</span>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-tinta-2 hover:text-tinta hover:bg-superficie-2 transition active:scale-95 touch-manipulation"
            aria-label="Fechar menu lateral"
            title="Fechar menu (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-tinta-3 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrar no menu"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Filtrar itens do menu"
            className="w-full h-[34px] pl-8 pr-3 bg-superficie-2 border border-borda rounded-[9px] text-xs text-tinta placeholder:text-tinta-3 focus:outline-none focus:border-marca-escura transition"
          />
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
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
                className="w-full flex items-center justify-between gap-2 px-4 py-2 text-[10px] font-bold text-tinta-3 uppercase tracking-[0.1em] hover:bg-superficie-2 hover:text-tinta transition"
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
                // Contador curto (1, 12) fica na pilula ao lado do codigo, como
                // no prototipo. Texto fica na segunda linha.
                const etiquetaLonga = !!item.badge && String(item.badge).trim().length > 3;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectView(item.id)}
                    className={`w-full flex items-center justify-between gap-2.5 pl-3 pr-3 py-2.5 sm:py-2 text-[13px] transition touch-manipulation min-h-[42px] sm:min-h-0 border-l-[3px] ${
                      isActive
                        ? 'bg-marca-suave text-tinta border-marca font-semibold'
                        : item.highlight
                        ? 'text-tinta bg-superficie-2 border-transparent hover:bg-superficie-3'
                        : 'text-tinta-2 border-transparent hover:bg-superficie-2 hover:text-tinta'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-marca-escura' : 'text-tinta-2'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-left">{item.label}</span>
                        {/* Etiqueta comprida ("NR-01/07/09", "Tabela 24 / NRs")
                            vai para a segunda linha. Na mesma linha do nome ela
                            comia a largura e o rotulo virava "Engenhari...". */}
                        {etiquetaLonga && (
                          <span className="block text-[10px] text-tinta-3 truncate text-left leading-tight mt-0.5">
                            {item.badge}
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {item.code && (
                        <span
                          className={`text-[11px] font-semibold tabular-nums ${
                            isActive ? 'text-marca-escura' : 'text-tinta-3'
                          }`}
                          title={`Digite ${item.code} para ir direto`}
                        >
                          {item.code}
                        </span>
                      )}
                      {item.badge && !etiquetaLonga && (
                        <span className={`text-[10px] px-2 py-px rounded-full font-bold tabular-nums ${
                          item.badgeColor || 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.badge}
                        </span>
                      )}
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

      {/* Rodapé do protótipo: só "Recolher menu". Saíram daqui o botão
          "Prev Workflow / Supabase" (a tela de Configurações é o item 640 do
          próprio menu), o atalho "Tela Login" e o botão "Sair" -- encerrar
          sessão está no menu do avatar, no topo. */}
      <button
        type="button"
        onClick={handleClose}
        className="flex items-center gap-2.5 w-full px-3.5 py-3 text-[12.5px] font-semibold text-tinta-2 border-t border-borda mt-2.5 hover:bg-superficie-2 hover:text-tinta transition"
      >
        <ChevronsLeft className="w-[15px] h-[15px]" />
        Recolher menu
      </button>
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
        {renderContent(false)}
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
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
};

