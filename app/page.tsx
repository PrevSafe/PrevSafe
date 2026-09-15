'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { ExecutiveDashboard } from '@/components/dashboards/ExecutiveDashboard';
import { OperationalDashboard } from '@/components/dashboards/OperationalDashboard';
import { CommercialDashboard, QualityDashboard } from '@/components/dashboards/CommercialDashboard';
import { ClientsView } from '@/components/crm/ClientsView';
import { LeadsOpportunitiesView } from '@/components/crm/LeadsOpportunitiesView';
import { ProposalsView } from '@/components/commercial/ProposalsView';
import { ContractsView } from '@/components/commercial/ContractsView';
import { ServiceOrdersView } from '@/components/services/ServiceOrdersView';
import { RequestsView, ServiceTemplatesView } from '@/components/services/RequestsView';
import { DocumentsView } from '@/components/documents/DocumentsView';
import { NotificationsView, EvaluationsView } from '@/components/notifications/NotificationsView';
import { AuditLogsView, SettingsView } from '@/components/audit/AuditLogsView';
import { SaaSManagementView } from '@/components/admin/SaaSManagementView';
import { TenantThemeSettingsView } from '@/components/settings/TenantThemeSettingsView';
import { UsersManagementView } from '@/components/users/UsersManagementView';
import { ClientPortalView } from '@/components/client-portal/ClientPortalView';
import { TechnicianFieldView } from '@/components/field-pwa/TechnicianFieldView';
import { ESocialEventsView } from '@/components/esocial/ESocialEventsView';
import { SSTUnifiedEngineeringView } from '@/components/sst/SSTUnifiedEngineeringView';
import { OccupationalRisksCatalogView } from '@/components/sst/OccupationalRisksCatalogView';
import { CipaManagementView } from '@/components/cipa/CipaManagementView';
import { EPIManagementView } from '@/components/sst/EPIManagementView';
import { CatAbsencesView } from '@/components/sst/CatAbsencesView';
import { AccidentsIncidentsView } from '@/components/sst/AccidentsIncidentsView';
import { ReportsCenterView } from '@/components/reports/ReportsCenterView';
import { FinancialView } from '@/components/financial/FinancialView';
import { HelpCenterView } from '@/components/help-center/HelpCenterView';
import { LoginView } from '@/components/auth/LoginView';
import { AICopilotModal, FastTrackFlowModal } from '@/components/ai/AICopilotModal';
import { 
  GlobalCommandPalette, 
  QuickNewOSModal, 
  ShortcutsHelpModal 
} from '@/components/shortcuts/GlobalCommandPalette';
import { NumericQuickJumpIndicator } from '@/components/shortcuts/NumericQuickJump';
import { findNavigationByCode } from '@/lib/navigationCodes';
import { 
  BarChart3, 
  Briefcase, 
  ShieldCheck, 
  Smartphone, 
  Menu,
  CheckSquare,
  Keyboard
} from 'lucide-react';

export default function Home() {
  const [activeView, setActiveView] = useState('dashboard-exec');
  const [sstInitialTab, setSstInitialTab] = useState<'HIERARCHY' | 'GHE_RISKS' | 'EXAMS_PCMSO' | 'EMPLOYEES' | 'WORK_ORDERS_OS' | 'DOCS_XML' | 'INTEGRATION_TRAINING' | 'SIGNATURES'>('HIERARCHY');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isFastTrackOpen, setIsFastTrackOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickNewOSOpen, setIsQuickNewOSOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

  // Numeric Quick Jump state (typing digits like 100 to navigate directly to resources)
  const [numericBuffer, setNumericBuffer] = useState('');
  const [numericTimer, setNumericTimer] = useState<NodeJS.Timeout | null>(null);

  const { 
    isAuthenticated, 
    currentRole, 
    serviceOrders = [], 
    requests = [], 
    esocialEvents = [] 
  } = usePrevSafe();

  // Helper to execute numeric navigation immediately
  const executeNumericNavigation = (code: string) => {
    const item = findNavigationByCode(code);
    if (item) {
      if (item.subTab && item.viewId === 'sst-engineering') {
        setSstInitialTab(item.subTab as 'HIERARCHY' | 'GHE_RISKS' | 'EXAMS_PCMSO' | 'EMPLOYEES' | 'WORK_ORDERS_OS' | 'DOCS_XML' | 'INTEGRATION_TRAINING' | 'SIGNATURES');
      }
      setActiveView(item.viewId);
      setNumericBuffer('');
      if (numericTimer) clearTimeout(numericTimer);
    }
  };

  // Global Keyboard Shortcuts (Ctrl+K, Ctrl+N, Escape, ?, and numeric quick jump e.g. 100)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl or Meta key (Command on macOS)
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

      // Ctrl+K: Quick search and command palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickNewOSOpen(false);
        setIsShortcutsHelpOpen(false);
        setNumericBuffer('');
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // Ctrl+N: Quick new service order
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsCommandPaletteOpen(false);
        setIsShortcutsHelpOpen(false);
        setNumericBuffer('');
        setIsQuickNewOSOpen(prev => !prev);
        return;
      }

      // Escape: Close opened shortcut modals or cancel typed numeric buffer
      if (e.key === 'Escape') {
        if (numericBuffer) {
          setNumericBuffer('');
          if (numericTimer) clearTimeout(numericTimer);
        }
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        if (isQuickNewOSOpen) setIsQuickNewOSOpen(false);
        if (isShortcutsHelpOpen) setIsShortcutsHelpOpen(false);
        return;
      }

      // Don't intercept single keystrokes when typing inside inputs, textareas, selects, or contenteditable
      const target = e.target as HTMLElement;
      const isInput = target && (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        target.isContentEditable
      );
      if (isInput) return;

      // Don't intercept when any modal is currently active
      if (isCommandPaletteOpen || isQuickNewOSOpen || isShortcutsHelpOpen || isCopilotOpen || isFastTrackOpen) {
        return;
      }

      // ?: Open shortcut help modal
      if (e.key === '?' && !hasModifier) {
        e.preventDefault();
        setNumericBuffer('');
        setIsShortcutsHelpOpen(prev => !prev);
        return;
      }

      // Enter key: If there's an active numeric buffer, execute jump immediately
      if (e.key === 'Enter' && numericBuffer) {
        e.preventDefault();
        executeNumericNavigation(numericBuffer);
        return;
      }

      // Numeric keys (0-9): Quick jump to menu resources (e.g. 100 -> Cadastro de Funcionários)
      if (/^[0-9]$/.test(e.key) && !hasModifier) {
        e.preventDefault();
        const nextBuffer = (numericBuffer + e.key).slice(-4); // Max 4 digits
        setNumericBuffer(nextBuffer);

        if (numericTimer) {
          clearTimeout(numericTimer);
        }

        // Check if full code matches an exact entry
        const matched = findNavigationByCode(nextBuffer);
        
        // Auto-navigate after slight delay (800ms) or when exact 3-digit code matched (500ms)
        const delay = (matched && nextBuffer.length >= 3) ? 500 : 1300;
        const newTimer = setTimeout(() => {
          executeNumericNavigation(nextBuffer);
          setNumericBuffer('');
        }, delay);

        setNumericTimer(newTimer);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (numericTimer) clearTimeout(numericTimer);
    };
  }, [
    isCommandPaletteOpen, 
    isQuickNewOSOpen, 
    isShortcutsHelpOpen, 
    isCopilotOpen, 
    isFastTrackOpen, 
    numericBuffer, 
    numericTimer
  ]);

  const activeOSCount = (serviceOrders || []).filter(o => o?.status === 'IN_PROGRESS').length;
  const pendingRequestsCount = (requests || []).filter(r => r?.status === 'OPEN').length;

  const handleLoginSuccess = () => {
    if (currentRole === 'CLIENTE_ADMIN' || currentRole === 'CLIENTE_USER') {
      setActiveView('client-portal');
    } else if (currentRole === 'TÉCNICO') {
      setActiveView('technician-field');
    } else {
      setActiveView('dashboard-exec');
    }
  };

  // If user is logged out or explicitly navigated to login view
  if (!isAuthenticated || activeView === 'login') {
    return (
      <LoginView 
        onSuccess={handleLoginSuccess}
        onNavigateHelp={() => setActiveView('help-center')}
      />
    );
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'login':
        return <LoginView onSuccess={handleLoginSuccess} onNavigateHelp={() => setActiveView('help-center')} />;
      case 'dashboard-exec':
        return <ExecutiveDashboard onNavigate={setActiveView} />;
      case 'dashboard-oper':
        return <OperationalDashboard onNavigate={setActiveView} />;
      case 'dashboard-comm':
        return <CommercialDashboard onNavigate={setActiveView} />;
      case 'dashboard-qual':
        return <QualityDashboard onNavigate={setActiveView} />;
      case 'crm-clients':
        return <ClientsView onNavigate={setActiveView} />;
      case 'crm-leads':
        return <LeadsOpportunitiesView onNavigate={setActiveView} />;
      case 'proposals':
        return <ProposalsView onNavigate={setActiveView} />;
      case 'contracts':
        return <ContractsView onNavigate={setActiveView} />;
      case 'financial':
        return <FinancialView onNavigate={setActiveView} />;
      case 'service-orders':
        return <ServiceOrdersView onNavigate={setActiveView} />;
      case 'sst-engineering':
        return <SSTUnifiedEngineeringView onNavigate={setActiveView} initialTab={sstInitialTab} />;
      case 'occupational-risks-catalog':
      case 'risks-catalog':
        return <OccupationalRisksCatalogView onNavigate={setActiveView} />;
      case 'cipa-management':
        return <CipaManagementView />;
      case 'epi-management':
      case 'epi':
        return <EPIManagementView onNavigate={setActiveView} />;
      case 'cat-absences':
      case 'cat':
      case 'absences':
        return <CatAbsencesView onNavigate={setActiveView} />;
      case 'accidents-incidents':
      case 'accidents':
        return <AccidentsIncidentsView onNavigate={setActiveView} />;
      case 'reports':
        return <ReportsCenterView onNavigate={setActiveView} />;
      case 'esocial':
        return <ESocialEventsView onNavigate={setActiveView} />;
      case 'requests':
        return <RequestsView onNavigate={setActiveView} />;
      case 'service-templates':
        return <ServiceTemplatesView onNavigate={setActiveView} />;
      case 'documents':
        return <DocumentsView onNavigate={setActiveView} />;
      case 'communications':
      case 'notifications':
        return <NotificationsView onNavigate={setActiveView} />;
      case 'evaluations':
        return <EvaluationsView onNavigate={setActiveView} />;
      case 'audit-logs':
        return <AuditLogsView onNavigate={setActiveView} />;
      case 'saas-management':
        return <SaaSManagementView onNavigate={setActiveView} />;
      case 'users-management':
        return <UsersManagementView onNavigate={setActiveView} />;
      case 'tenant-theme-settings':
      case 'theme-settings':
        return <TenantThemeSettingsView onNavigate={setActiveView} />;
      case 'settings':
        return <SettingsView onNavigate={setActiveView} />;
      case 'client-portal':
        return <ClientPortalView onNavigate={setActiveView} />;
      case 'technician-field':
        return <TechnicianFieldView onNavigate={setActiveView} />;
      case 'help-center':
        return <HelpCenterView onNavigate={setActiveView} />;
      default:
        return <ExecutiveDashboard onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
      {/* Top Navbar */}
      <Navbar 
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onOpenFastTrack={() => setIsFastTrackOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        onToggleMobileSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isMobileSidebarOpen={isSidebarOpen}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenNewOS={() => setIsQuickNewOSOpen(true)}
        onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
      />

      {/* Workspace Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar (Slide-over Drawer for Desktop & Mobile with Auto-Collapse on selection) */}
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView} 
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          isMobileOpen={isSidebarOpen}
          setIsMobileOpen={setIsSidebarOpen}
        />

        {/* Main Content Pane with Bento Frame */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-7 pb-24 md:pb-7 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation Bar */}
      <nav 
        aria-label="Navegação rápida inferior"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl select-none"
      >
        <button
          onClick={() => {
            setActiveView('dashboard-exec');
            setIsSidebarOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition touch-manipulation min-w-[56px] ${
            activeView.startsWith('dashboard') ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Painel</span>
        </button>

        <button
          onClick={() => {
            setActiveView('service-orders');
            setIsSidebarOpen(false);
          }}
          className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition touch-manipulation min-w-[56px] ${
            activeView === 'service-orders' ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">OS</span>
          {activeOSCount > 0 && (
            <span className="absolute top-0.5 right-2 w-4 h-4 bg-blue-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              {activeOSCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveView('esocial');
            setIsSidebarOpen(false);
          }}
          className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition touch-manipulation min-w-[56px] ${
            activeView === 'esocial' ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">eSocial</span>
          {esocialEvents.length > 0 && (
            <span className="absolute top-0.5 right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              {esocialEvents.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveView('technician-field');
            setIsSidebarOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition touch-manipulation min-w-[56px] ${
            activeView === 'technician-field' ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">PWA Campo</span>
        </button>

        <button
          onClick={() => setIsSidebarOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition touch-manipulation min-w-[56px] ${
            isSidebarOpen ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Abrir menu completo"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Mais</span>
        </button>
      </nav>

      {/* Discreet Global Shortcut Helper Pill for Desktop */}
      <button
        type="button"
        onClick={() => setIsShortcutsHelpOpen(true)}
        className="hidden lg:flex fixed bottom-5 right-5 z-30 items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-emerald-500/30 backdrop-blur-md shadow-xl text-xs transition active:scale-95 group cursor-pointer"
        title="Atalhos globais de teclado (Ctrl+K para busca, Ctrl+N para nova OS, digite '100' para Funcionários, ? para ajuda)"
        aria-label="Ver atalhos de teclado"
      >
        <Keyboard className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="font-medium text-slate-300">Atalhos:</span>
        <kbd className="font-mono text-[10px] text-emerald-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 group-hover:border-emerald-500/40">Ctrl+K</kbd>
        <kbd className="font-mono text-[10px] text-emerald-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 group-hover:border-emerald-500/40">Ctrl+N</kbd>
        <kbd className="font-mono text-[10px] text-teal-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 group-hover:border-teal-500/40" title="Digite 100 para Funcionários, 050 para OS">100</kbd>
      </button>

      {/* Numeric Quick Jump Floating Toast Indicator */}
      <NumericQuickJumpIndicator
        digits={numericBuffer}
        matchedItem={findNavigationByCode(numericBuffer)}
        onConfirm={() => executeNumericNavigation(numericBuffer)}
        onCancel={() => {
          setNumericBuffer('');
          if (numericTimer) clearTimeout(numericTimer);
        }}
      />

      {/* Modals */}
      <AICopilotModal 
        isOpen={isCopilotOpen} 
        onClose={() => setIsCopilotOpen(false)} 
      />

      <FastTrackFlowModal
        isOpen={isFastTrackOpen}
        onClose={() => setIsFastTrackOpen(false)}
        onNavigate={setActiveView}
      />

      {/* Global Shortcut Modals */}
      <GlobalCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setActiveView}
        onOpenNewOS={() => {
          setIsCommandPaletteOpen(false);
          setIsQuickNewOSOpen(true);
        }}
        onOpenCopilot={() => {
          setIsCommandPaletteOpen(false);
          setIsCopilotOpen(true);
        }}
        onOpenFastTrack={() => {
          setIsCommandPaletteOpen(false);
          setIsFastTrackOpen(true);
        }}
      />

      <QuickNewOSModal
        isOpen={isQuickNewOSOpen}
        onClose={() => setIsQuickNewOSOpen(false)}
        onNavigate={setActiveView}
      />

      <ShortcutsHelpModal
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />
    </div>
  );
}
