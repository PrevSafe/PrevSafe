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
import { ClientPortalView } from '@/components/client-portal/ClientPortalView';
import { TechnicianFieldView } from '@/components/field-pwa/TechnicianFieldView';
import { ESocialEventsView } from '@/components/esocial/ESocialEventsView';
import { AICopilotModal, FastTrackFlowModal } from '@/components/ai/AICopilotModal';
import { 
  BarChart3, 
  Briefcase, 
  ShieldCheck, 
  Smartphone, 
  Menu,
  CheckSquare
} from 'lucide-react';

export default function Home() {
  const [activeView, setActiveView] = useState('dashboard-exec');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isFastTrackOpen, setIsFastTrackOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const { currentRole, serviceOrders, requests, esocialEvents } = usePrevSafe();

  const activeOSCount = serviceOrders.filter(o => o.status === 'IN_PROGRESS').length;
  const pendingRequestsCount = requests.filter(r => r.status === 'OPEN').length;

  const renderActiveView = () => {
    switch (activeView) {
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
      case 'service-orders':
        return <ServiceOrdersView onNavigate={setActiveView} />;
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
      case 'settings':
        return <SettingsView onNavigate={setActiveView} />;
      case 'client-portal':
        return <ClientPortalView onNavigate={setActiveView} />;
      case 'technician-field':
        return <TechnicianFieldView onNavigate={setActiveView} />;
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
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      {/* Workspace Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar (Responsive: Sticky on Desktop, Slide-over Drawer on Mobile) */}
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView} 
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
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
            setIsMobileSidebarOpen(false);
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
            setIsMobileSidebarOpen(false);
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
            setIsMobileSidebarOpen(false);
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
            setIsMobileSidebarOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition touch-manipulation min-w-[56px] ${
            activeView === 'technician-field' ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">PWA Campo</span>
        </button>

        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition touch-manipulation min-w-[56px] ${
            isMobileSidebarOpen ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Abrir menu completo"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Mais</span>
        </button>
      </nav>

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
    </div>
  );
}
