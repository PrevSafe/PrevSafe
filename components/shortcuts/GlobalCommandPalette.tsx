'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { PriorityLevel, ServiceOrder } from '@/types';
import confetti from 'canvas-confetti';
import {
  Search,
  Plus,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Shield,
  FileText,
  Users,
  CheckSquare,
  Sparkles,
  BarChart3,
  HardHat,
  ShieldCheck,
  AlertTriangle,
  PlayCircle,
  GraduationCap,
  Settings,
  FolderKanban,
  FileSignature,
  DollarSign,
  Smartphone,
  Vote,
  History,
  X,
  ArrowRight,
  Command,
  CornerDownLeft,
  Keyboard,
  UserCheck,
  Target
} from 'lucide-react';

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onOpenNewOS: () => void;
  onOpenCopilot: () => void;
  onOpenFastTrack: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'ACTIONS' | 'MODULES' | 'SERVICE_ORDERS' | 'CLIENTS';
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  shortcut?: string;
  action: () => void;
}

export const GlobalCommandPalette: React.FC<GlobalCommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenNewOS,
  onOpenCopilot,
  onOpenFastTrack
}) => {
  const { serviceOrders = [], clients = [] } = usePrevSafe();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Catalog of system navigation modules
  const moduleItems: CommandItem[] = useMemo(() => [
    {
      id: 'mod-dashboard-exec',
      title: 'Painel Executivo',
      subtitle: 'Indicadores gerais, faturamento e visão macro',
      category: 'MODULES',
      icon: BarChart3,
      badge: 'Dashboard',
      action: () => { onNavigate('dashboard-exec'); onClose(); }
    },
    {
      id: 'mod-dashboard-oper',
      title: 'Painel Operacional & SLA',
      subtitle: 'Monitoramento de prazos, gargalos e capacidade técnica',
      category: 'MODULES',
      icon: Clock,
      badge: 'Operação',
      action: () => { onNavigate('dashboard-oper'); onClose(); }
    },
    {
      id: 'mod-employees',
      title: 'Cadastro de Funcionários & Trabalhadores',
      subtitle: 'Trabalhadores, matrículas eSocial, fichas de EPI e ASO',
      category: 'MODULES',
      icon: Users,
      badge: 'NR-01 / RH',
      shortcut: '100',
      action: () => { onNavigate('sst-engineering'); onClose(); }
    },
    {
      id: 'mod-service-orders',
      title: 'Ordens de Serviço (OS)',
      subtitle: 'Controle de estágios, tarefas de campo e entregas',
      category: 'MODULES',
      icon: Briefcase,
      badge: 'Principal',
      shortcut: '050',
      action: () => { onNavigate('service-orders'); onClose(); }
    },
    {
      id: 'mod-occupational-risks',
      title: 'Catálogo de Riscos Ocupacionais',
      subtitle: 'Banco de riscos Físicos, Químicos, Biológicos, Ergonômicos e Acidentes',
      category: 'MODULES',
      icon: AlertTriangle,
      badge: 'SST / NRs',
      action: () => { onNavigate('occupational-risks-catalog'); onClose(); }
    },
    {
      id: 'mod-sst-engineering',
      title: 'Engenharia SST Unificada',
      subtitle: 'PGR, PCMSO, LTCAT, Hierarquia e GHEs',
      category: 'MODULES',
      icon: HardHat,
      badge: 'Engenharia',
      action: () => { onNavigate('sst-engineering'); onClose(); }
    },
    {
      id: 'mod-cipa',
      title: 'Gestão de CIPA (NR-05)',
      subtitle: 'Dimensionamento legal, cronograma eleitoral e votação',
      category: 'MODULES',
      icon: Vote,
      badge: 'NR-05',
      action: () => { onNavigate('cipa-management'); onClose(); }
    },
    {
      id: 'mod-epi',
      title: 'Gestão de EPIs & CA (NR-06)',
      subtitle: 'Controle de Certificados de Aprovação e fichas de entrega',
      category: 'MODULES',
      icon: ShieldCheck,
      badge: 'NR-06',
      action: () => { onNavigate('epi-management'); onClose(); }
    },
    {
      id: 'mod-cat',
      title: 'CAT & Afastamentos',
      subtitle: 'Comunicações de acidentes e controle de atestados médicos',
      category: 'MODULES',
      icon: Shield,
      badge: 'Previdenciário',
      action: () => { onNavigate('cat-absences'); onClose(); }
    },
    {
      id: 'mod-accidents',
      title: 'Acidentes e Quase Acidentes',
      subtitle: 'Investigação com Diagrama de Ishikawa e Pirâmide de Bird',
      category: 'MODULES',
      icon: AlertTriangle,
      badge: 'Investigação',
      action: () => { onNavigate('accidents-incidents'); onClose(); }
    },
    {
      id: 'mod-esocial',
      title: 'Eventos eSocial SST',
      subtitle: 'S-2210 (CAT), S-2220 (ASO) e S-2240 (Condições Ambientais)',
      category: 'MODULES',
      icon: ShieldCheck,
      badge: 'Governo',
      action: () => { onNavigate('esocial'); onClose(); }
    },
    {
      id: 'mod-crm-clients',
      title: 'Clientes & CRM',
      subtitle: 'Cadastro de empresas contratantes, CNAE, grau de risco e unidades',
      category: 'MODULES',
      icon: Building2,
      badge: 'Comercial',
      action: () => { onNavigate('crm-clients'); onClose(); }
    },
    {
      id: 'mod-proposals',
      title: 'Propostas Comerciais',
      subtitle: 'Elaboração, precificação e envio com aceite digital',
      category: 'MODULES',
      icon: FileText,
      badge: 'Vendas',
      action: () => { onNavigate('proposals'); onClose(); }
    },
    {
      id: 'mod-contracts',
      title: 'Gestão de Contratos',
      subtitle: 'Contratos vigentes, faturamento e serviços acordados',
      category: 'MODULES',
      icon: FileSignature,
      badge: 'Contratos',
      action: () => { onNavigate('contracts'); onClose(); }
    },
    {
      id: 'mod-financial',
      title: 'Módulo Financeiro',
      subtitle: 'Contas a receber, fluxo de caixa e DRE operacional',
      category: 'MODULES',
      icon: DollarSign,
      badge: 'Finanças',
      action: () => { onNavigate('financial'); onClose(); }
    },
    {
      id: 'mod-reports',
      title: 'Central de Relatórios & Laudos',
      subtitle: 'Geração e exportação em PDF de PGR, PCMSO e OS',
      category: 'MODULES',
      icon: FolderKanban,
      badge: 'Documentos',
      action: () => { onNavigate('reports'); onClose(); }
    },
    {
      id: 'mod-technician-field',
      title: 'PWA Técnico de Campo',
      subtitle: 'Checklists offline, coleta de fotos e assinaturas no local',
      category: 'MODULES',
      icon: Smartphone,
      badge: 'Mobile PWA',
      action: () => { onNavigate('technician-field'); onClose(); }
    },
    {
      id: 'mod-help-center',
      title: 'Central de Ajuda & Tutoriais',
      subtitle: 'Manuais passo a passo com prints, vídeos e infográficos',
      category: 'MODULES',
      icon: GraduationCap,
      badge: 'Treinamento',
      action: () => { onNavigate('help-center'); onClose(); }
    },
    {
      id: 'mod-settings',
      title: 'Configurações do Sistema',
      subtitle: 'Parâmetros do SaaS, temas e personalização',
      category: 'MODULES',
      icon: Settings,
      badge: 'Admin',
      action: () => { onNavigate('settings'); onClose(); }
    },
    {
      id: 'mod-users-management',
      title: 'Central de Usuários & Perfis',
      subtitle: 'Controle de acessos, papéis RBAC e segurança',
      category: 'MODULES',
      icon: UserCheck,
      badge: 'Admin / RBAC',
      shortcut: '600',
      action: () => { onNavigate('users-management'); onClose(); }
    },
    {
      id: 'mod-audit',
      title: 'Auditoria & Logs',
      subtitle: 'Trilha de auditoria imutável e acessos de usuários',
      category: 'MODULES',
      icon: History,
      badge: 'Segurança',
      action: () => { onNavigate('audit-logs'); onClose(); }
    }
  ], [onNavigate, onClose]);

  // Quick Action items
  const actionItems: CommandItem[] = useMemo(() => [
    {
      id: 'act-new-os',
      title: 'Nova Ordem de Serviço (OS)',
      subtitle: 'Cadastrar e iniciar imediatamente uma nova OS técnica de SST',
      category: 'ACTIONS',
      icon: Plus,
      badge: 'Atalho Direto',
      shortcut: 'Ctrl+N',
      action: () => {
        onClose();
        onOpenNewOS();
      }
    },
    {
      id: 'act-copilot',
      title: 'Abrir IA Copilot SST',
      subtitle: 'Consultar agente de IA sobre NRs, agentes químicos e enquadramentos',
      category: 'ACTIONS',
      icon: Sparkles,
      badge: 'Inteligência Artificial',
      action: () => {
        onClose();
        onOpenCopilot();
      }
    },
    {
      id: 'act-fast-track',
      title: 'Simular Fluxo Master SST',
      subtitle: 'Demonstração automatizada do ciclo Lead → Proposta → OS → Conclusão',
      category: 'ACTIONS',
      icon: PlayCircle,
      badge: 'Simulação',
      action: () => {
        onClose();
        onOpenFastTrack();
      }
    },
    {
      id: 'act-help',
      title: 'Abrir Central de Ajuda & Tutoriais',
      subtitle: 'Ver passo a passo detalhado de todas as operações administrativas',
      category: 'ACTIONS',
      icon: GraduationCap,
      badge: 'Tutoriais',
      action: () => {
        onClose();
        onNavigate('help-center');
      }
    }
  ], [onClose, onOpenNewOS, onOpenCopilot, onOpenFastTrack, onNavigate]);

  // Filtered Service Orders items
  const osItems: CommandItem[] = useMemo(() => {
    return serviceOrders.slice(0, 10).map((os: ServiceOrder) => {
      const client = clients.find(c => c.id === os.client_id);
      return {
        id: `os-${os.id}`,
        title: `${os.code || 'OS'}: ${os.title}`,
        subtitle: `Cliente: ${client?.trade_name || client?.corporate_name || 'Empresa'} • Status: ${os.status} • Prioridade: ${os.priority}`,
        category: 'SERVICE_ORDERS' as const,
        icon: Briefcase,
        badge: os.priority,
        action: () => {
          onNavigate('service-orders');
          onClose();
        }
      };
    });
  }, [serviceOrders, clients, onNavigate, onClose]);

  // Filtered Clients items
  const clientItems: CommandItem[] = useMemo(() => {
    return clients.slice(0, 8).map(client => ({
      id: `client-${client.id}`,
      title: client.trade_name || client.corporate_name,
      subtitle: `CNPJ: ${client.cnpj || 'Não informado'} • Grau de Risco: ${client.risk_grade || 2} • ${client.segment || 'Indústria'}`,
      category: 'CLIENTS' as const,
      icon: Building2,
      badge: 'Empresa',
      action: () => {
        onNavigate('crm-clients');
        onClose();
      }
    }));
  }, [clients, onNavigate, onClose]);

  // Combined and filtered search results
  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      // Default view: Actions first, followed by key Modules, recent OS, and Clients
      return [...actionItems, ...moduleItems.slice(0, 8), ...osItems.slice(0, 4)];
    }

    const matches = (text?: string) => text ? text.toLowerCase().includes(q) : false;

    const matchedActions = actionItems.filter(
      item => matches(item.title) || matches(item.subtitle) || matches(item.shortcut)
    );

    const matchedModules = moduleItems.filter(
      item => matches(item.title) || matches(item.subtitle) || matches(item.badge) || matches(item.shortcut)
    );

    const matchedOS = osItems.filter(
      item => matches(item.title) || matches(item.subtitle)
    );

    const matchedClients = clientItems.filter(
      item => matches(item.title) || matches(item.subtitle)
    );

    return [...matchedActions, ...matchedModules, ...matchedOS, ...matchedClients];
  }, [query, actionItems, moduleItems, osItems, clientItems]);

  // Clamp selection index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation inside the command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Ensure active item is visible in scroll container
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-900/90 gap-3">
          <Search className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar telas, ordens de serviço, clientes ou ações rápidas..."
            className="w-full bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
              Esc
            </span>
            <span className="text-xs text-slate-500">fechar</span>
          </div>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/40"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 px-6 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">Nenhum resultado encontrado para &quot;{query}&quot;</p>
              <p className="text-xs text-slate-500 mt-1">Tente buscar por &quot;OS&quot;, &quot;PGR&quot;, &quot;CIPA&quot;, &quot;EPI&quot;, ou pressione <span className="font-mono text-emerald-400">Ctrl+N</span> para criar uma OS.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    data-selected={isSelected}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                      isSelected 
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-white' 
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        item.category === 'ACTIONS'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : item.category === 'SERVICE_ORDERS'
                          ? 'bg-blue-500/20 text-blue-400'
                          : item.category === 'CLIENTS'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold tracking-tight text-white truncate">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.shortcut && (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {item.shortcut}
                        </span>
                      )}
                      {isSelected && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <span>Selecionar</span>
                          <CornerDownLeft className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Global Shortcut Guides */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300">↓</kbd>
              <span>Navegar</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300">↵</kbd>
              <span>Abrir</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300">Esc</kbd>
              <span>Fechar</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-emerald-400">
            <kbd className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 font-mono text-[10px] text-emerald-300">
              Ctrl+N
            </kbd>
            <span>Nova OS Direta</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface QuickNewOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

export const QuickNewOSModal: React.FC<QuickNewOSModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { clients = [], serviceTemplates = [], createServiceOrderManual } = usePrevSafe();

  const [clientId, setClientId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('HIGH');
  const [dueDate, setDueDate] = useState('');
  const [technicalResp, setTechnicalResp] = useState('Eng. Eduardo Vasconcelos');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-fill fields on modal open
  useEffect(() => {
    if (isOpen) {
      const defaultClient = clients[0]?.id || '';
      const defaultTemplate = serviceTemplates[0]?.id || '';
      setClientId(defaultClient);
      setTemplateId(defaultTemplate);
      setTitle('Elaboração do PGR 2026 e Inventário de Riscos');
      setPriority('HIGH');
      // 20 days default SLA
      const d = new Date();
      d.setDate(d.getDate() + 20);
      setDueDate(d.toISOString().split('T')[0]);
      setTechnicalResp('Eng. Eduardo Vasconcelos');
      setNotes('');
      setErrorMsg('');
    }
  }, [isOpen, clients, serviceTemplates]);

  // When template changes, auto-suggest title
  const handleTemplateChange = (tmplId: string) => {
    setTemplateId(tmplId);
    const tmpl = serviceTemplates.find(t => t.id === tmplId);
    if (tmpl) {
      setTitle(`${tmpl.name} 2026`);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!clientId) {
      setErrorMsg('Por favor, selecione uma empresa contratante (cliente).');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Por favor, defina um título para a Ordem de Serviço.');
      return;
    }

    try {
      createServiceOrderManual({
        client_id: clientId,
        service_template_id: templateId || undefined,
        title: title.trim(),
        priority,
        due_date: dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        technical_responsible_name: technicalResp.trim() || undefined
      });

      // Joyful feedback
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      onClose();
      onNavigate('service-orders');
    } catch {
      setErrorMsg('Não foi possível criar a Ordem de Serviço. Verifique os dados inseridos.');
    }
  };

  // Keyboard support: Ctrl+Enter saves, Esc closes
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleModalKeyDown}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Nova Ordem de Serviço (OS)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Ctrl + N
                </span>
              </div>
              <p className="text-xs text-slate-400">Atalho rápido para abertura e alocação de equipe técnica</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Cliente */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Empresa Contratante / Cliente <span className="text-emerald-400">*</span>
            </label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              required
              autoFocus
            >
              <option value="">Selecione um cliente contratante...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.trade_name || client.corporate_name} ({client.cnpj || 'Sem CNPJ'})
                </option>
              ))}
            </select>
          </div>

          {/* Modelo de Serviço (Template) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Modelo de Serviço SST
              </label>
              <select
                value={templateId}
                onChange={e => handleTemplateChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Serviço Personalizado (Sem template)</option>
                {serviceTemplates.map(tmpl => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Prioridade da Execução
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as PriorityLevel)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta (Padrão)</option>
                <option value="URGENT">Urgente / Crítica</option>
              </select>
            </div>
          </div>

          {/* Título da OS */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Título da Ordem de Serviço <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Elaboração do PGR 2026 e Inventário de Riscos"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Prazo e Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Prazo de Entrega (SLA) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Responsável Técnico
              </label>
              <input
                type="text"
                value={technicalResp}
                onChange={e => setTechnicalResp(e.target.value)}
                placeholder="Ex: Eng. Eduardo Vasconcelos"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Observações / Instruções de Campo
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detalhes adicionais de alocação de equipamentos de medição, contato na planta, etc."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5">
              <span>Pressione</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300">Ctrl + Enter</kbd>
              <span>para salvar</span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              >
                Cancelar (Esc)
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Ordem de Serviço</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['Ctrl', 'K'], desc: 'Busca Rápida & Paleta de Comandos Global' },
    { keys: ['Ctrl', 'N'], desc: 'Criar Nova Ordem de Serviço (OS)' },
    { keys: ['100'], desc: 'Atalho Numérico Direto: Cadastro de Funcionários' },
    { keys: ['050'], desc: 'Atalho Numérico Direto: Ordens de Serviço (OS)' },
    { keys: ['200'], desc: 'Atalho Numérico Direto: Gestão de EPIs (NR-06)' },
    { keys: ['Esc'], desc: 'Fechar modais, menus laterais e paletas' },
    { keys: ['Ctrl', 'Enter'], desc: 'Confirmar e salvar formulários de criação' },
    { keys: ['↑', '↓'], desc: 'Navegar pelos resultados da busca' },
    { keys: ['↵ Enter'], desc: 'Executar comando ou abrir módulo selecionado' },
    { keys: ['?'], desc: 'Abrir este guia de atalhos de produtividade' }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Atalhos de Teclado Globais</h3>
              <p className="text-xs text-slate-400">Produtividade para usuários administrativos</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-800/50 border border-slate-700/40">
              <span className="text-xs text-slate-300">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, kIdx) => (
                  <kbd key={kIdx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] text-emerald-400 font-semibold shadow-xs">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center text-xs text-slate-400">
          Também compatível com <span className="font-mono text-slate-300">⌘ (Command)</span> no macOS.
        </div>
      </div>
    </div>
  );
};
