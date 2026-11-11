/**
 * Catalogo de telas do sistema, com o codigo de cada uma.
 *
 * Mora aqui, e nao dentro da Sidebar, porque duas partes precisam da mesma
 * lista: o menu lateral e o campo de atalho da barra superior. Com a lista
 * em dois lugares os codigos acabariam divergindo -- o campo mandaria para
 * uma tela e o menu mostraria outra.
 *
 * Os cronicos (badge) dependem do contexto, entao o catalogo e montado por
 * uma funcao que recebe os dados. Quem nao precisa de cronico chama sem
 * argumento: as contagens sao todas guardadas com `|| []`.
 */
import React from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Award,
  BarChart3,
  BellRing,
  BookOpen,
  Briefcase,
  Building2,
  CheckSquare,
  DollarSign,
  FileSignature,
  FileSpreadsheet,
  FolderKanban,
  HardHat,
  History,
  Layers,
  MessageSquare,
  Newspaper,
  Palette,
  Settings,
  ShieldCheck,
  Smartphone,
  Star,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Vote,
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  code?: string;
  badge?: string;
  badgeColor?: string;
  highlight?: boolean;
}

export interface MenuSection {
  title: string;
  roles: string[];
  items: MenuItem[];
}

export type ProgramaEncontrado = MenuItem & { grupo: string };

interface DadosDeCronico {
  serviceOrders?: { status?: string }[];
  proposals?: { status?: string }[];
  contracts?: unknown[];
  requests?: { status?: string }[];
  transactions?: unknown[];
  esocialEvents?: unknown[];
  profiles?: unknown[];
  tenants?: unknown[];
}

export function montarCatalogo({
  serviceOrders,
  proposals,
  contracts,
  requests,
  transactions,
  esocialEvents,
  profiles,
  tenants,
}: DadosDeCronico = {}): MenuSection[] {
  return [
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
          badgeColor: 'bg-marca'
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
      // SAUDE: exames, PCMSO e ficha do colaborador ficam aqui.
      roles: ['ADMIN', 'GESTOR', 'TÉCNICO', 'SAUDE'],
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
          badgeColor: 'bg-teal-500',
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
      roles: ['ADMIN', 'GESTOR', 'TÉCNICO', 'SAUDE'],
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
          badgeColor: 'bg-marca' 
        },
      ]
    },
    {
      title: 'DEMANDAS & INTELIGÊNCIA OPERACIONAL',
      roles: ['ADMIN', 'GESTOR', 'TÉCNICO', 'SAUDE'],
      items: [
        { 
          id: 'reports', 
          label: 'Central de Relatórios & BI (Excel/PDF)', 
          icon: FileSpreadsheet, 
          code: '500',
          badge: 'XLSX/PDF',
          badgeColor: 'bg-marca',
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
          badgeColor: 'bg-marca', 
          highlight: true 
        },
        { id: 'site-content', label: 'Site & Conteúdo', icon: Newspaper, code: '650', badge: 'Público', badgeColor: 'bg-marca' },
        { id: 'settings', label: 'Configurações da Empresa', icon: Settings, code: '640' },
      ]
    },
    {
      title: 'SUPORTE & APRENDIZADO',
      roles: ['ADMIN', 'GESTOR', 'COMERCIAL', 'TÉCNICO', 'FINANCEIRO', 'SAUDE', 'CLIENTE_ADMIN', 'CLIENTE_USER'],
      items: [
        { 
          id: 'help-center', 
          label: 'Central de Ajuda & Tutoriais', 
          icon: BookOpen, 
          code: '720',
          badge: 'Prints & Vídeos',
          badgeColor: 'bg-marca',
          highlight: true 
        },
      ]
    },
    {
      title: 'EXPERIÊNCIA DEDICADA',
      roles: ['ADMIN', 'GESTOR', 'COMERCIAL', 'TÉCNICO', 'FINANCEIRO', 'SAUDE', 'CLIENTE_ADMIN', 'CLIENTE_USER'],
      items: [
        { id: 'client-portal', label: 'Portal do Cliente (Visão Externa)', icon: UserCheck, code: '700', highlight: true },
        { id: 'technician-field', label: 'PWA de Campo (Técnico)', icon: Smartphone, code: '710', highlight: true },
      ]
    }
  ];
}

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Busca por codigo ou por nome, na ordem em que a pessoa espera: o codigo
 * exato primeiro (digitou 010 e quer a 010), depois os codigos que comecam
 * com o que ela digitou, depois o nome e o grupo. Sem acento e sem caixa.
 */
export function buscarProgramas(termo: string, papel: string): ProgramaEncontrado[] {
  const todos = montarCatalogo()
    .filter((s) => s.roles.includes(papel))
    .flatMap((s) => s.items.map((item) => ({ ...item, grupo: s.title })));

  const t = normalizar(termo);
  if (!t) return todos;

  const exato = todos.filter((p) => p.code === t);
  const resto = todos.filter(
    (p) =>
      p.code !== t &&
      (p.code?.startsWith(t) || normalizar(`${p.label} ${p.grupo}`).includes(t))
  );
  return [...exato, ...resto];
}
