'use client';

import React, { useState, useMemo } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Printer, 
  Filter, 
  Search, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  DollarSign, 
  HardHat, 
  Activity, 
  Briefcase, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown, 
  Eye, 
  Layers, 
  Share2, 
  Mail, 
  Send, 
  Sparkles, 
  SlidersHorizontal, 
  X,
  PieChart as PieChartIcon,
  BarChart2,
  Table as TableIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  CartesianGrid 
} from 'recharts';

import { 
  exportGenericTableToExcel,
  exportServiceOrdersToExcel,
  exportRisksPgrToExcel,
  exportAsosHealthToExcel,
  exportESocialEventsToExcel,
  exportEpiDeliveriesToExcel,
  exportFinancialToExcel,
  exportCatAndAbsencesToExcel,
  exportTrainingsToExcel,
  exportCommercialToExcel
} from '@/lib/excelExportService';

import {
  exportCustomReportPdf,
  exportServiceOrdersPdf,
  exportRisksPgrPdf,
  exportAsosHealthPdf,
  exportESocialEventsPdf,
  exportEpiDeliveriesPdf,
  exportFinancialPdf
} from '@/lib/reportPdfService';

import { formatDate } from '@/lib/utils';
import type { 
  Employee, 
  EmployeeASOHistory, 
  SSTEnvironmentalRisk, 
  ServiceOrder, 
  Client, 
  ESocialEvent, 
  FinancialTransaction, 
  SSTCATRecord, 
  SSTIntegrationTraining, 
  Contract, 
  Proposal 
} from '@/types';

export type ReportCategory = 
  | 'SERVICE_ORDERS'
  | 'RISKS_PGR'
  | 'ASOS_HEALTH'
  | 'ESOCIAL_EVENTS'
  | 'EPI_MANAGEMENT'
  | 'FINANCIAL'
  | 'CAT_ACCIDENTS'
  | 'TRAININGS_NR01'
  | 'COMMERCIAL_CONTRACTS'
  | 'AUDIT_QUALITY';

export interface ReportsCenterViewProps {
  onNavigate: (view: string) => void;
  defaultCategory?: ReportCategory;
}

export const ReportsCenterView: React.FC<ReportsCenterViewProps> = ({ 
  onNavigate,
  defaultCategory = 'SERVICE_ORDERS' 
}) => {
  const { 
    organization,
    clients = [], 
    units = [], 
    serviceOrders = [], 
    ghes = [], 
    environmentalRisks = [], 
    hierarchySectors = [], 
    examProtocols = [], 
    employees = [], 
    esocialEvents = [], 
    epiCatalog = [], 
    epiDeliveries = [], 
    transactions = [], 
    catRecords = [], 
    workAbsences = [], 
    integrationTrainings = [], 
    proposals = [], 
    contracts = [], 
    auditLogs = [], 
    profiles = [] 
  } = usePrevSafe();

  // Active Category State
  const [activeCategory, setActiveCategory] = useState<ReportCategory>(defaultCategory);

  // Filters State
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL_TIME');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedResponsible, setSelectedResponsible] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Quick Preset Filter
  const [activePreset, setActivePreset] = useState<string>('ALL');

  // UI view toggles
  const [showCharts, setShowCharts] = useState<boolean>(true);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sorting and Pagination
  const [sortField, setSortField] = useState<string>('id');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  // Inspection Modal
  const [selectedRowDetail, setSelectedRowDetail] = useState<Record<string, any> | null>(null);

  // Schedule Modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    frequency: 'WEEKLY',
    emailRecipients: 'diretoria@empresa.com.br, sst@empresa.com.br',
    sendWhatsApp: true,
    includeExecutiveSummary: true,
    format: 'BOTH'
  });

  // Client list filtered units
  const availableUnits = useMemo(() => {
    if (selectedClientId === 'ALL') return units;
    return units.filter(u => u.client_id === selectedClientId);
  }, [units, selectedClientId]);

  // Handle Preset Clicks
  const handleApplyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    setCurrentPage(1);

    if (presetKey === 'ALL') {
      setSelectedStatus('ALL');
      setSelectedTypeFilter('ALL');
      setSelectedPeriod('ALL_TIME');
      setSearchTerm('');
      return;
    }

    if (presetKey === 'ASOS_OVERDUE') {
      setActiveCategory('ASOS_HEALTH');
      setSelectedStatus('OVERDUE_SOON');
    } else if (presetKey === 'OS_DELAYED') {
      setActiveCategory('SERVICE_ORDERS');
      setSelectedStatus('DELAYED');
    } else if (presetKey === 'ESOCIAL_ERRORS') {
      setActiveCategory('ESOCIAL_EVENTS');
      setSelectedStatus('REJECTED');
    } else if (presetKey === 'INSALUBRE_PERICULOSO') {
      setActiveCategory('RISKS_PGR');
      setSelectedTypeFilter('SPECIAL_PAY');
    } else if (presetKey === 'FINANCIAL_PENDING') {
      setActiveCategory('FINANCIAL');
      setSelectedStatus('PENDING');
    } else if (presetKey === 'EPI_UNSIGNED') {
      setActiveCategory('EPI_MANAGEMENT');
      setSelectedStatus('UNSIGNED');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedClientId('ALL');
    setSelectedUnitId('ALL');
    setSelectedPeriod('ALL_TIME');
    setStartDate('');
    setEndDate('');
    setSelectedStatus('ALL');
    setSelectedTypeFilter('ALL');
    setSelectedResponsible('ALL');
    setSearchTerm('');
    setActivePreset('ALL');
    setCurrentPage(1);
  };

  // Helper date checker
  const isDateInPeriod = (dateString?: string) => {
    if (!dateString) return true;
    const itemDate = new Date(dateString);
    const now = new Date();

    if (selectedPeriod === 'ALL_TIME') return true;

    if (selectedPeriod === 'TODAY') {
      return itemDate.toDateString() === now.toDateString();
    }
    if (selectedPeriod === '7_DAYS') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      return itemDate >= past && itemDate <= now;
    }
    if (selectedPeriod === '30_DAYS') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      return itemDate >= past && itemDate <= now;
    }
    if (selectedPeriod === 'THIS_MONTH') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
    if (selectedPeriod === 'THIS_YEAR') {
      return itemDate.getFullYear() === now.getFullYear();
    }
    if (selectedPeriod === 'CUSTOM') {
      if (startDate && itemDate < new Date(startDate)) return false;
      if (endDate && itemDate > new Date(endDate + 'T23:59:59')) return false;
      return true;
    }
    return true;
  };

  // Computed Datasets by Category
  const categoryData = useMemo(() => {
    const term = searchTerm.toLowerCase();

    switch (activeCategory) {
      case 'SERVICE_ORDERS': {
        return serviceOrders.filter((os) => {
          if (selectedClientId !== 'ALL' && os.client_id !== selectedClientId) return false;
          if (!isDateInPeriod(os.created_at || os.due_date)) return false;
          
          if (selectedStatus === 'DELAYED') {
            const isDelayed = (os.status !== 'COMPLETED' && os.status !== 'CANCELLED') && new Date(os.due_date) < new Date();
            if (!isDelayed) return false;
          } else if (selectedStatus !== 'ALL' && os.status !== selectedStatus) {
            return false;
          }

          if (selectedTypeFilter !== 'ALL' && os.priority !== selectedTypeFilter) return false;
          if (selectedResponsible !== 'ALL' && os.technical_responsible_id !== selectedResponsible) return false;

          if (term) {
            const client = clients.find(c => c.id === os.client_id);
            const matchTitle = os.title.toLowerCase().includes(term);
            const matchNumber = (os.os_number || '').toLowerCase().includes(term);
            const matchClient = (client?.trade_name || client?.legal_name || '').toLowerCase().includes(term);
            if (!matchTitle && !matchNumber && !matchClient) return false;
          }
          return true;
        });
      }

      case 'RISKS_PGR': {
        const gheMap = new Map(ghes.map(g => [g.id, g]));
        return environmentalRisks.filter((risk) => {
          const ghe = risk.ghe_id ? gheMap.get(risk.ghe_id) : undefined;
          const clientId = ghe ? ghe.client_id : risk.client_id;

          if (selectedClientId !== 'ALL' && clientId !== selectedClientId) return false;
          if (selectedTypeFilter === 'SPECIAL_PAY' && !risk.insalubridade_applies && !risk.periculosidade_applies) return false;
          if (selectedTypeFilter !== 'ALL' && selectedTypeFilter !== 'SPECIAL_PAY' && risk.risk_category !== selectedTypeFilter && (risk as any).category !== selectedTypeFilter) return false;
          if (selectedStatus !== 'ALL' && risk.risk_level !== selectedStatus && (risk as any).risk_matrix_level !== selectedStatus) return false;

          if (term) {
            const matchAgent = (risk.agent_name || '').toLowerCase().includes(term);
            const matchDesc = (risk.health_effects || (risk as any).description || '').toLowerCase().includes(term);
            const matchSource = (risk.generating_source || '').toLowerCase().includes(term);
            const matchGhe = ghe?.name.toLowerCase().includes(term);
            if (!matchAgent && !matchDesc && !matchSource && !matchGhe) return false;
          }
          return true;
        });
      }

      case 'ASOS_HEALTH': {
        const rows: Array<{ employee: Employee; aso?: EmployeeASOHistory; isOverdue?: boolean; isSoon?: boolean }> = [];
        const today = new Date();

        employees.forEach((emp) => {
          if (selectedClientId !== 'ALL' && emp.client_id !== selectedClientId) return;

          const empAsos = emp.aso_history || (emp as any).asos || [];
          if (empAsos.length === 0) {
            rows.push({ employee: emp, isOverdue: true });
          } else {
            empAsos.forEach((aso) => {
              let isOverdue = false;
              let isSoon = false;
              if (aso.valid_until) {
                const diffDays = Math.round((new Date(aso.valid_until).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays < 0) isOverdue = true;
                else if (diffDays <= 30) isSoon = true;
              }
              rows.push({ employee: emp, aso, isOverdue, isSoon });
            });
          }
        });

        return rows.filter(({ employee, aso, isOverdue, isSoon }) => {
          if (selectedStatus === 'OVERDUE' && !isOverdue) return false;
          if (selectedStatus === 'SOON' && !isSoon) return false;
          if (selectedStatus === 'OVERDUE_SOON' && !isOverdue && !isSoon) return false;
          if (selectedStatus === 'VALID' && (isOverdue || isSoon)) return false;
          const asoType = aso ? (aso.aso_type || (aso as any).exam_type) : undefined;
          if (selectedTypeFilter !== 'ALL' && asoType && asoType !== selectedTypeFilter) return false;

          if (aso?.exam_date && !isDateInPeriod(aso.exam_date)) return false;

          if (term) {
            const matchName = employee.name.toLowerCase().includes(term);
            const matchCpf = (employee.cpf || '').toLowerCase().includes(term);
            const matchJob = (employee.job_title || '').toLowerCase().includes(term);
            if (!matchName && !matchCpf && !matchJob) return false;
          }
          return true;
        });
      }

      case 'ESOCIAL_EVENTS': {
        return esocialEvents.filter((ev) => {
          if (selectedClientId !== 'ALL' && ev.client_id !== selectedClientId) return false;
          if (!isDateInPeriod(ev.created_at || ev.transmitted_at)) return false;
          if (selectedStatus !== 'ALL' && ev.status !== selectedStatus) return false;
          if (selectedTypeFilter !== 'ALL' && ev.event_type !== selectedTypeFilter) return false;

          if (term) {
            const matchType = ev.event_type.toLowerCase().includes(term);
            const matchReceipt = (ev.receipt_number || '').toLowerCase().includes(term);
            const matchProto = (ev.protocol_number || '').toLowerCase().includes(term);
            if (!matchType && !matchReceipt && !matchProto) return false;
          }
          return true;
        });
      }

      case 'EPI_MANAGEMENT': {
        const empMap = new Map(employees.map(e => [e.id, e]));
        const epiMap = new Map(epiCatalog.map(c => [c.id, c]));

        return epiDeliveries.filter((d) => {
          const emp = empMap.get(d.employee_id);
          const epi = epiMap.get(d.epi_id || (d as any).epi_catalog_id);
          const clientId = emp?.client_id || d.client_id;
          const isSigned = d.biometric_face_matched || !!d.signature_data_url || d.status === 'DELIVERED' || (d as any).is_signed;

          if (selectedClientId !== 'ALL' && clientId !== selectedClientId) return false;
          if (!isDateInPeriod(d.delivery_date)) return false;
          if (selectedStatus === 'SIGNED' && !isSigned) return false;
          if (selectedStatus === 'UNSIGNED' && isSigned) return false;
          const method = d.delivery_method || (d as any).signature_method;
          if (selectedTypeFilter !== 'ALL' && method !== selectedTypeFilter) return false;

          if (term) {
            const matchEmp = (d.employee_name || emp?.name || '').toLowerCase().includes(term);
            const matchCpf = (d.employee_cpf || emp?.cpf || '').toLowerCase().includes(term);
            const matchEpi = (d.epi_name || epi?.name || (d as any).custom_epi_name || '').toLowerCase().includes(term);
            const matchCa = (d.ca_number || epi?.ca_number || '').toLowerCase().includes(term);
            if (!matchEmp && !matchCpf && !matchEpi && !matchCa) return false;
          }
          return true;
        });
      }

      case 'FINANCIAL': {
        return transactions.filter((t) => {
          if (selectedClientId !== 'ALL' && t.client_id !== selectedClientId) return false;
          const txDate = t.due_date || t.payment_date || (t as any).paid_date || t.created_at;
          if (!isDateInPeriod(txDate)) return false;
          if (selectedStatus !== 'ALL' && t.status !== selectedStatus) return false;
          if (selectedTypeFilter !== 'ALL' && t.type !== selectedTypeFilter) return false;

          if (term) {
            const matchTitle = t.title.toLowerCase().includes(term);
            const matchCat = (t.category_name || (t.category as string) || '').toLowerCase().includes(term);
            const matchParty = (t.supplier_name || t.client_name || (t as any).counterparty_name || '').toLowerCase().includes(term);
            if (!matchTitle && !matchCat && !matchParty) return false;
          }
          return true;
        });
      }

      case 'CAT_ACCIDENTS': {
        const empMap = new Map(employees.map(e => [e.id, e]));
        return catRecords.filter((cat) => {
          const emp = empMap.get(cat.employee_id);
          const clientId = cat.client_id || emp?.client_id;
          const causedAbsence = (cat.days_away > 0) || (cat as any).caused_absence;
          if (selectedClientId !== 'ALL' && clientId !== selectedClientId) return false;
          if (!isDateInPeriod(cat.accident_date)) return false;
          if (selectedStatus === 'ABSENCE_YES' && !causedAbsence) return false;
          if (selectedStatus === 'ABSENCE_NO' && causedAbsence) return false;
          if (selectedTypeFilter !== 'ALL' && cat.accident_type !== selectedTypeFilter) return false;

          if (term) {
            const matchEmp = (cat.worker_name || emp?.name || '').toLowerCase().includes(term);
            const matchCat = (cat.cat_number || '').toLowerCase().includes(term);
            const matchAgent = (cat.causative_agent_name || (cat as any).causative_agent || '').toLowerCase().includes(term);
            if (!matchEmp && !matchCat && !matchAgent) return false;
          }
          return true;
        });
      }

      case 'TRAININGS_NR01': {
        return integrationTrainings.filter((tr) => {
          if (selectedClientId !== 'ALL' && tr.client_id !== selectedClientId) return false;
          const trainingDate = tr.start_date || (tr as any).training_date;
          if (!isDateInPeriod(trainingDate)) return false;
          if (selectedStatus !== 'ALL' && tr.status !== selectedStatus) return false;
          const modality = tr.modality || (tr as any).training_modality;
          if (selectedTypeFilter !== 'ALL' && modality !== selectedTypeFilter) return false;

          if (term) {
            const matchTitle = tr.title.toLowerCase().includes(term);
            const matchInstr = (tr.instructor_name || '').toLowerCase().includes(term);
            if (!matchTitle && !matchInstr) return false;
          }
          return true;
        });
      }

      case 'COMMERCIAL_CONTRACTS': {
        return contracts.filter((ct) => {
          if (selectedClientId !== 'ALL' && ct.client_id !== selectedClientId) return false;
          if (!isDateInPeriod(ct.start_date || ct.created_at)) return false;
          if (selectedStatus !== 'ALL' && ct.status !== selectedStatus) return false;
          if (selectedTypeFilter !== 'ALL' && ct.recurrence !== selectedTypeFilter) return false;

          if (term) {
            const matchTitle = ct.title.toLowerCase().includes(term);
            const matchNumber = (ct.contract_number || '').toLowerCase().includes(term);
            if (!matchTitle && !matchNumber) return false;
          }
          return true;
        });
      }

      case 'AUDIT_QUALITY': {
        return auditLogs.filter((log) => {
          if (!isDateInPeriod(log.created_at)) return false;
          if (selectedTypeFilter !== 'ALL' && log.action !== selectedTypeFilter) return false;

          if (term) {
            const matchAction = log.action.toLowerCase().includes(term);
            const matchEntity = (log.entity_type || (log as any).entity || '').toLowerCase().includes(term);
            const matchUser = (log.user_name || '').toLowerCase().includes(term);
            if (!matchAction && !matchEntity && !matchUser) return false;
          }
          return true;
        });
      }

      default:
        return [];
    }
  }, [
    activeCategory,
    selectedClientId,
    selectedPeriod,
    startDate,
    endDate,
    selectedStatus,
    selectedTypeFilter,
    selectedResponsible,
    searchTerm,
    serviceOrders,
    environmentalRisks,
    ghes,
    employees,
    esocialEvents,
    epiDeliveries,
    epiCatalog,
    transactions,
    catRecords,
    integrationTrainings,
    contracts,
    auditLogs,
    clients
  ]);

  // Summary KPIs for Active Category
  const summaryKpis = useMemo(() => {
    const total = categoryData.length;

    switch (activeCategory) {
      case 'SERVICE_ORDERS': {
        const list = categoryData as typeof serviceOrders;
        const inProgress = list.filter(o => o.status === 'IN_PROGRESS' || o.status === 'READY' || o.status === 'SCHEDULED').length;
        const completed = list.filter(o => o.status === 'COMPLETED' || o.status === 'ACCEPTED').length;
        const delayed = list.filter(o => (o.status !== 'COMPLETED' && o.status !== 'CANCELLED') && new Date(o.due_date) < new Date()).length;
        const onTimeRate = total > 0 ? Math.round(((total - delayed) / total) * 100) : 100;

        return [
          { label: 'Total de O.S. Filtradas', value: total, icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Em Execução / Agendadas', value: inProgress, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Concluídas / Homologadas', value: completed, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Atrasadas (Fora SLA)', value: delayed, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Taxa de Cumprimento SLA', value: `${onTimeRate}%`, icon: TrendingUp, color: 'text-teal-400', bg: 'bg-teal-500/10' }
        ];
      }

      case 'RISKS_PGR': {
        const list = categoryData as typeof environmentalRisks;
        const physical = list.filter(r => r.risk_category === 'FÍSICO' || (r as any).category === 'PHYSICAL').length;
        const chemical = list.filter(r => r.risk_category === 'QUÍMICO' || (r as any).category === 'CHEMICAL').length;
        const insalubre = list.filter(r => r.insalubridade_applies).length;
        const periculoso = list.filter(r => r.periculosidade_applies).length;

        return [
          { label: 'Total de Riscos PGR', value: total, icon: HardHat, color: 'text-teal-400', bg: 'bg-teal-500/10' },
          { label: 'Riscos Físicos (Ruído/Calor)', value: physical, icon: Activity, color: 'text-sky-400', bg: 'bg-sky-500/10' },
          { label: 'Riscos Químicos', value: chemical, icon: SlidersHorizontal, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Insalubridade (NR-15)', value: insalubre, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Periculosidade (NR-16)', value: periculoso, icon: ShieldCheck, color: 'text-rose-400', bg: 'bg-rose-500/10' }
        ];
      }

      case 'ASOS_HEALTH': {
        const list = categoryData as Array<{ employee: any; aso?: any; isOverdue?: boolean; isSoon?: boolean }>;
        const overdue = list.filter(item => item.isOverdue).length;
        const soon = list.filter(item => item.isSoon).length;
        const valid = list.filter(item => !item.isOverdue && !item.isSoon).length;
        const complianceRate = total > 0 ? Math.round((valid / total) * 100) : 100;

        return [
          { label: 'Colaboradores / ASOs', value: total, icon: Users, color: 'text-teal-400', bg: 'bg-teal-500/10' },
          { label: 'ASOs Vencidos (Crítico)', value: overdue, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'A Vencer em até 30d', value: soon, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'ASOs Vigentes e Regulares', value: valid, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Índice de Regularidade NR-07', value: `${complianceRate}%`, icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10' }
        ];
      }

      case 'ESOCIAL_EVENTS': {
        const list = categoryData as typeof esocialEvents;
        const transmitted = list.filter(e => e.status === 'SUCCESS' || (e.status as string) === 'TRANSMITTED' || (e.status as string) === 'ACCEPTED').length;
        const pending = list.filter(e => e.status === 'DRAFT' || e.status === 'VALIDATED' || e.status === 'READY_TO_SEND' || e.status === 'PROCESSING' || (e.status as string) === 'PENDING').length;
        const rejected = list.filter(e => e.status === 'REJECTED' || (e.status as string) === 'ERROR').length;
        const successRate = total > 0 ? Math.round((transmitted / total) * 100) : 100;

        return [
          { label: 'Total de Eventos SST', value: total, icon: ShieldCheck, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Transmitidos com Recibo Gov', value: transmitted, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Pendentes de Transmissão', value: pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Erros / Rejeitados', value: rejected, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Conformidade eSocial', value: `${successRate}%`, icon: TrendingUp, color: 'text-teal-400', bg: 'bg-teal-500/10' }
        ];
      }

      case 'FINANCIAL': {
        const list = categoryData as typeof transactions;
        const receivable = list.filter(t => t.type === 'RECEIVABLE').reduce((a, t) => a + t.amount, 0);
        const payable = list.filter(t => t.type === 'PAYABLE').reduce((a, t) => a + t.amount, 0);
        const received = list.filter(t => t.type === 'RECEIVABLE' && t.status === 'PAID').reduce((a, t) => a + t.amount, 0);
        const balance = receivable - payable;

        return [
          { label: 'Lançamentos Filtrados', value: total, icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Receitas Totais', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receivable), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Receitas Liquidadas', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(received), icon: CheckCircle2, color: 'text-teal-400', bg: 'bg-teal-500/10' },
          { label: 'Despesas Totais', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payable), icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Saldo Projetado', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance), icon: DollarSign, color: balance >= 0 ? 'text-emerald-400' : 'text-rose-400', bg: 'bg-emerald-500/10' }
        ];
      }

      default: {
        return [
          { label: 'Total de Registros', value: total, icon: FileText, color: 'text-teal-400', bg: 'bg-teal-500/10' },
          { label: 'Clientes Envolvidos', value: selectedClientId === 'ALL' ? clients.length : 1, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Filtro de Período', value: selectedPeriod === 'ALL_TIME' ? 'Todo o Histórico' : selectedPeriod, icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Status da Exportação', value: 'Pronto para Download', icon: Download, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
        ];
      }
    }
  }, [activeCategory, categoryData, clients, selectedClientId, selectedPeriod, serviceOrders, environmentalRisks, esocialEvents, transactions]);

  // Chart Data Preparation
  const chartAnalyticsData = useMemo(() => {
    switch (activeCategory) {
      case 'SERVICE_ORDERS': {
        const list = categoryData as typeof serviceOrders;
        const statusMap: Record<string, number> = {};
        list.forEach(o => {
          statusMap[o.status] = (statusMap[o.status] || 0) + 1;
        });
        const barData = Object.keys(statusMap).map(k => ({ name: k, total: statusMap[k] }));
        return { barData, chartType: 'BAR' };
      }
      case 'RISKS_PGR': {
        const list = categoryData as typeof environmentalRisks;
        const catMap: Record<string, number> = {};
        list.forEach(r => {
          const cat = r.risk_category || (r as any).category || 'Outros';
          catMap[cat] = (catMap[cat] || 0) + 1;
        });
        const pieData = Object.keys(catMap).map(k => ({ name: k, value: catMap[k] }));
        return { pieData, chartType: 'PIE' };
      }
      case 'ESOCIAL_EVENTS': {
        const list = categoryData as typeof esocialEvents;
        const evMap: Record<string, number> = {};
        list.forEach(e => {
          evMap[e.event_type] = (evMap[e.event_type] || 0) + 1;
        });
        const barData = Object.keys(evMap).map(k => ({ name: k, total: evMap[k] }));
        return { barData, chartType: 'BAR' };
      }
      case 'FINANCIAL': {
        const list = categoryData as typeof transactions;
        const flowMap: Record<string, { name: string; receitas: number; despesas: number }> = {};
        list.forEach(t => {
          const key = t.due_date ? t.due_date.substring(0, 7) : 'Geral';
          if (!flowMap[key]) flowMap[key] = { name: key, receitas: 0, despesas: 0 };
          if (t.type === 'RECEIVABLE') flowMap[key].receitas += t.amount;
          else flowMap[key].despesas += t.amount;
        });
        const areaData = Object.values(flowMap).sort((a, b) => a.name.localeCompare(b.name));
        return { areaData, chartType: 'AREA' };
      }
      default:
        return { barData: [{ name: 'Registros', total: categoryData.length }], chartType: 'BAR' };
    }
  }, [activeCategory, categoryData]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return categoryData.slice(startIdx, startIdx + itemsPerPage);
  }, [categoryData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(categoryData.length / itemsPerPage) || 1;

  // Filter Summary String for PDF/Excel Headers
  const filterSummaryString = useMemo(() => {
    const parts = [];
    if (selectedClientId !== 'ALL') {
      const c = clients.find(cl => cl.id === selectedClientId);
      parts.push(`Cliente: ${c ? (c.trade_name || c.legal_name) : selectedClientId}`);
    } else {
      parts.push('Todos os Clientes');
    }

    if (selectedPeriod !== 'ALL_TIME') {
      parts.push(`Período: ${selectedPeriod}`);
    }

    if (selectedStatus !== 'ALL') {
      parts.push(`Status: ${selectedStatus}`);
    }

    if (selectedTypeFilter !== 'ALL') {
      parts.push(`Filtro Específico: ${selectedTypeFilter}`);
    }

    if (searchTerm) {
      parts.push(`Busca: "${searchTerm}"`);
    }

    return parts.join(' | ');
  }, [selectedClientId, selectedPeriod, selectedStatus, selectedTypeFilter, searchTerm, clients]);

  // Universal Excel Export Handler
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      switch (activeCategory) {
        case 'SERVICE_ORDERS':
          exportServiceOrdersToExcel({
            serviceOrders: categoryData as typeof serviceOrders,
            clients,
            profiles,
            organization,
            filterSummary: filterSummaryString
          });
          break;

        case 'RISKS_PGR':
          exportRisksPgrToExcel({
            risks: categoryData as typeof environmentalRisks,
            ghes,
            clients,
            sectors: hierarchySectors,
            organization,
            filterSummary: filterSummaryString
          });
          break;

        case 'ASOS_HEALTH': {
          const list = categoryData as Array<{ employee: typeof employees[0] }>;
          const uniqueEmps = Array.from(new Set(list.map(i => i.employee)));
          exportAsosHealthToExcel({
            employees: uniqueEmps,
            examProtocols,
            clients,
            organization,
            filterSummary: filterSummaryString
          });
          break;
        }

        case 'ESOCIAL_EVENTS':
          exportESocialEventsToExcel({
            events: categoryData as typeof esocialEvents,
            clients,
            organization,
            filterSummary: filterSummaryString
          });
          break;

        case 'EPI_MANAGEMENT':
          exportEpiDeliveriesToExcel({
            deliveries: categoryData as typeof epiDeliveries,
            catalog: epiCatalog,
            employees,
            clients,
            organization,
            filterSummary: filterSummaryString
          });
          break;

        case 'FINANCIAL':
          exportFinancialToExcel({
            transactions: categoryData as typeof transactions,
            clients,
            organization,
            filterSummary: filterSummaryString
          });
          break;

        case 'CAT_ACCIDENTS':
          exportCatAndAbsencesToExcel({
            cats: categoryData as typeof catRecords,
            absences: workAbsences,
            employees,
            clients,
            organization,
            filterSummary: filterSummaryString
          });
          break;

        case 'TRAININGS_NR01':
          exportTrainingsToExcel({
            trainings: categoryData as typeof integrationTrainings,
            employees,
            clients,
            organization,
            filterSummary: filterSummaryString
          });
          break;

        case 'COMMERCIAL_CONTRACTS':
          exportCommercialToExcel({
            proposals,
            contracts: categoryData as typeof contracts,
            clients,
            organization,
            filterSummary: filterSummaryString
          });
          break;

        case 'AUDIT_QUALITY': {
          const headers = ['Data / Hora', 'Ação', 'Entidade', 'Usuário', 'IP', 'Detalhes'];
          const rows = (categoryData as typeof auditLogs).map(l => [
            formatDate(l.created_at),
            l.action,
            l.entity_type || (l as any).entity || 'Geral',
            l.user_name || 'Sistema',
            l.ip_address || '127.0.0.1',
            JSON.stringify(l.new_data || (l as any).details || {})
          ]);
          exportGenericTableToExcel({
            reportTitle: 'Relatório de Logs de Auditoria & Segurança',
            fileName: 'relatorio_auditoria_seguranca_sst',
            headers,
            rows,
            filterSummary: filterSummaryString,
            organizationName: organization?.name
          });
          break;
        }
      }

      setSuccessToast('Relatório em Excel (.xlsx) gerado e baixado com sucesso!');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao exportar para Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  // Universal PDF Export Handler
  const handleExportPdf = () => {
    setIsExporting(true);
    try {
      switch (activeCategory) {
        case 'SERVICE_ORDERS':
          exportServiceOrdersPdf({
            serviceOrders: categoryData as typeof serviceOrders,
            clients,
            profiles,
            organization,
            filterSummary: filterSummaryString
          });
          break;

        case 'RISKS_PGR':
          exportRisksPgrPdf({
            risks: categoryData as typeof environmentalRisks,
            ghes,
            clients,
            organization,
            filterSummary: filterSummaryString
          });
          break;

        case 'ASOS_HEALTH': {
          const list = categoryData as Array<{ employee: typeof employees[0] }>;
          const uniqueEmps = Array.from(new Set(list.map(i => i.employee)));
          exportAsosHealthPdf({
            employees: uniqueEmps,
            clients,
            organization,
            filterSummary: filterSummaryString
          });
          break;
        }

        case 'ESOCIAL_EVENTS':
          exportESocialEventsPdf({
            events: categoryData as typeof esocialEvents,
            clients,
            organization,
            filterSummary: filterSummaryString
          });
          break;

        case 'EPI_MANAGEMENT':
          exportEpiDeliveriesPdf({
            deliveries: categoryData as typeof epiDeliveries,
            catalog: epiCatalog,
            employees,
            clients,
            organization,
            filterSummary: filterSummaryString
          });
          break;

        case 'FINANCIAL':
          exportFinancialPdf({
            transactions: categoryData as typeof transactions,
            clients,
            organization,
            filterSummary: filterSummaryString
          });
          break;

        case 'CAT_ACCIDENTS': {
          const cats = categoryData as typeof catRecords;
          const headers = ['CAT Nº', 'Colaborador', 'Tipo', 'Data', 'Local', 'Agente', 'Afastamento'];
          const empMap = new Map(employees.map(e => [e.id, e]));
          const rows = cats.map(c => {
            const emp = empMap.get(c.employee_id);
            return [
              c.cat_number || c.id.substring(0, 8),
              emp?.name || 'N/A',
              c.accident_type,
              c.accident_date ? formatDate(c.accident_date) : '-',
              c.accident_location || c.location_description || 'Empresa',
              c.causative_agent || c.causative_agent_name || 'Máquinas',
              c.caused_absence !== undefined ? (c.caused_absence ? 'SIM' : 'NÃO') : (c.days_away > 0 ? 'SIM' : 'NÃO')
            ];
          });
          exportCustomReportPdf({
            title: 'Relatório Estatístico de Acidentes de Trabalho (CAT)',
            subtitle: 'Comunicações de Acidentes de Trabalho e enquadramento Previdenciário / eSocial S-2210',
            filterSummary: filterSummaryString,
            headers,
            rows,
            kpis: [
              { label: 'Total de CATs', value: cats.length },
              { label: 'Com Afastamento', value: cats.filter(c => c.caused_absence).length },
              { label: 'Típicos', value: cats.filter(c => c.accident_type === 'TIPICO').length },
              { label: 'Trajeto', value: cats.filter(c => c.accident_type === 'TRAJETO').length }
            ],
            organization,
            orientation: 'landscape',
            fileName: 'relatorio_acidentes_cat'
          });
          break;
        }

        case 'TRAININGS_NR01': {
          const list = categoryData as typeof integrationTrainings;
          const headers = ['Treinamento', 'Empresa', 'Modalidade', 'Carga Horária', 'Instrutor', 'Data', 'Validade'];
          const clientMap = new Map(clients.map(c => [c.id, c]));
          const rows = list.map(t => {
            const client = clientMap.get(t.client_id);
            return [
              t.title,
              client ? (client.trade_name || client.legal_name) : 'N/A',
              t.training_modality || t.modality || 'PRESENCIAL',
              `${t.workload_hours || 4}h`,
              t.instructor_name || 'Eng. SST',
              (t.training_date || t.start_date) ? formatDate(t.training_date || t.start_date) : '-',
              t.valid_until ? formatDate(t.valid_until) : '1 ano'
            ];
          });
          exportCustomReportPdf({
            title: 'Relatório de Capacitações e Treinamentos (NR-01)',
            subtitle: 'Controle de treinamentos admissionais, periódicos e de segurança operacional',
            filterSummary: filterSummaryString,
            headers,
            rows,
            kpis: [
              { label: 'Treinamentos Realizados', value: list.length },
              { label: 'Presenciais', value: list.filter(t => t.training_modality === 'PRESENTIAL').length },
              { label: 'EAD / Online', value: list.filter(t => t.training_modality === 'ONLINE').length }
            ],
            organization,
            orientation: 'landscape',
            fileName: 'relatorio_treinamentos_nr01'
          });
          break;
        }

        case 'COMMERCIAL_CONTRACTS': {
          const list = categoryData as typeof contracts;
          const headers = ['Nº Contrato', 'Cliente', 'Título', 'Valor Mensal', 'Recorrência', 'Status', 'Início', 'Fim'];
          const clientMap = new Map(clients.map(c => [c.id, c]));
          const rows = list.map(c => {
            const cl = clientMap.get(c.client_id);
            return [
              c.contract_number || c.id.substring(0, 8),
              cl ? (cl.trade_name || cl.legal_name) : 'N/A',
              c.title,
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.total_value),
              c.recurrence,
              c.status,
              c.start_date ? formatDate(c.start_date) : '-',
              c.end_date ? formatDate(c.end_date) : 'Indeterminado'
            ];
          });
          exportCustomReportPdf({
            title: 'Relatório Comercial de Contratos Vigentes SST',
            subtitle: 'Contratos corporativos de assessoria em SST, serviços recorrentes e prazos',
            filterSummary: filterSummaryString,
            headers,
            rows,
            kpis: [
              { label: 'Total de Contratos', value: list.length },
              { label: 'Ativos', value: list.filter(c => c.status === 'ACTIVE').length },
              { label: 'Recorrentes Mensais', value: list.filter(c => c.recurrence === 'MONTHLY').length }
            ],
            organization,
            orientation: 'landscape',
            fileName: 'relatorio_contratos_sst'
          });
          break;
        }

        case 'AUDIT_QUALITY': {
          const list = categoryData as typeof auditLogs;
          const headers = ['Data / Hora', 'Ação Registrada', 'Entidade', 'Usuário Operador', 'IP'];
          const rows = list.map(l => [
            formatDate(l.created_at),
            l.action,
            l.entity_type || (l as any).entity || 'Geral',
            l.user_name || 'Sistema',
            l.ip_address || '127.0.0.1'
          ]);
          exportCustomReportPdf({
            title: 'Relatório de Logs de Auditoria & Conformidade',
            subtitle: 'Trilha de auditoria (Audit Trail) de modificações e transações críticas',
            filterSummary: filterSummaryString,
            headers,
            rows,
            kpis: [
              { label: 'Total de Logs', value: list.length },
              { label: 'Ações de Criação', value: list.filter(l => l.action.includes('CREATE')).length },
              { label: 'Ações de Atualização', value: list.filter(l => l.action.includes('UPDATE')).length }
            ],
            organization,
            orientation: 'landscape',
            fileName: 'relatorio_auditoria_logs'
          });
          break;
        }
      }

      setSuccessToast('Relatório em PDF formatado conforme NRs gerado com sucesso!');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao exportar para PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    setIsExporting(true);
    try {
      const items = paginatedData;
      if (items.length === 0) {
        alert('Nenhum dado para exportar.');
        return;
      }

      const keys = Object.keys(items[0] || {});
      const csvRows = [
        keys.join(';'),
        ...items.map(row => keys.map(k => `"${String((row as any)[k] || '').replace(/"/g, '""')}"`).join(';'))
      ];

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\n'));
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      link.setAttribute('download', `relatorio_${activeCategory.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessToast('Arquivo CSV exportado com sucesso!');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // Print Action
  const handlePrint = () => {
    window.print();
  };

  // Category Tabs Configuration
  const categoriesList: Array<{ id: ReportCategory; label: string; icon: any; count: number; badgeColor: string }> = [
    { id: 'SERVICE_ORDERS', label: 'Ordens de Serviço (OS)', icon: Briefcase, count: serviceOrders.length, badgeColor: 'bg-blue-500/20 text-blue-300' },
    { id: 'RISKS_PGR', label: 'Riscos & PGR (NR-01)', icon: HardHat, count: environmentalRisks.length, badgeColor: 'bg-teal-500/20 text-teal-300' },
    { id: 'ASOS_HEALTH', label: 'Saúde & ASOs (NR-07)', icon: Users, count: employees.length, badgeColor: 'bg-emerald-500/20 text-emerald-300' },
    { id: 'ESOCIAL_EVENTS', label: 'Eventos eSocial SST', icon: ShieldCheck, count: esocialEvents.length, badgeColor: 'bg-indigo-500/20 text-indigo-300' },
    { id: 'EPI_MANAGEMENT', label: 'Gestão de EPIs (NR-06)', icon: SlidersHorizontal, count: epiDeliveries.length, badgeColor: 'bg-cyan-500/20 text-cyan-300' },
    { id: 'FINANCIAL', label: 'Financeiro & Fluxo', icon: DollarSign, count: transactions.length, badgeColor: 'bg-emerald-500/20 text-emerald-300' },
    { id: 'CAT_ACCIDENTS', label: 'Acidentes & CAT (S-2210)', icon: AlertTriangle, count: catRecords.length, badgeColor: 'bg-rose-500/20 text-rose-300' },
    { id: 'TRAININGS_NR01', label: 'Treinamentos (NR-01)', icon: Activity, count: integrationTrainings.length, badgeColor: 'bg-amber-500/20 text-amber-300' },
    { id: 'COMMERCIAL_CONTRACTS', label: 'Comercial & Contratos', icon: FileSpreadsheet, count: contracts.length, badgeColor: 'bg-purple-500/20 text-purple-300' },
    { id: 'AUDIT_QUALITY', label: 'Auditoria & Logs', icon: Layers, count: auditLogs.length, badgeColor: 'bg-slate-500/20 text-slate-300' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-900/40">
              <FileSpreadsheet className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Central de Relatórios & BI SST
                <span className="text-xs uppercase font-mono px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-md">
                  Exportador Multi-Formato
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Geração analítica de dados com filtros multidimensionais, exportação em Excel (.xlsx), PDF formatado e agendamento automático.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            title="Programar envio recorrente deste relatório por E-mail ou WhatsApp"
          >
            <Send className="w-4 h-4 text-teal-400" />
            Agendar Relatório
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            title="Imprimir visualização atual do relatório"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            Imprimir
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting || categoryData.length === 0}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
            title="Exportar dados tabulados em CSV para PowerBI / Looker Studio"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            CSV (BI)
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting || categoryData.length === 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-95 disabled:opacity-50"
            title="Exportar planilha Excel completa (.xlsx) com tabelas formatadas e KPIs"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            Exportar Excel (.xlsx)
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting || categoryData.length === 0}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-teal-950/40 active:scale-95 disabled:opacity-50"
            title="Exportar Laudo/Relatório em PDF com cabeçalho oficial e paginação"
          >
            <FileText className="w-4 h-4 text-slate-950" />
            Exportar PDF (.pdf)
          </button>
        </div>
      </div>

      {/* Preset Quick Filters Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-xs font-bold text-slate-400 shrink-0 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          Filtros Rápidos:
        </span>
        {[
          { key: 'ALL', label: 'Todos os Dados' },
          { key: 'ASOS_OVERDUE', label: '⚠️ ASOs Vencidos ou a Vencer (30d)' },
          { key: 'OS_DELAYED', label: '🚨 O.S. Atrasadas (Violação SLA)' },
          { key: 'ESOCIAL_ERRORS', label: '❌ eSocial com Erro/Rejeição' },
          { key: 'INSALUBRE_PERICULOSO', label: '☣️ Riscos Insalubres/Periculosos' },
          { key: 'FINANCIAL_PENDING', label: '💰 Contas a Receber Pendentes' },
          { key: 'EPI_UNSIGNED', label: '✍️ Fichas de EPI Não Assinadas' }
        ].map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => handleApplyPreset(preset.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
              activePreset === preset.key
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Categories Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {categoriesList.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setCurrentPage(1);
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                isActive 
                  ? 'bg-slate-900 border-teal-500/80 shadow-md shadow-teal-950/20 ring-1 ring-teal-500/30' 
                  : 'bg-slate-900/40 hover:bg-slate-900 border-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${cat.badgeColor}`}>
                  {cat.count}
                </span>
              </div>
              <span className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-300'}`}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Advanced Multi-Dimensional Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Painel de Filtros Avançados
            </h3>
            <span className="text-xs text-slate-400">
              ({categoryData.length} registros encontrados)
            </span>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setShowCharts(!showCharts)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
                showCharts ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              {showCharts ? 'Ocultar Gráficos' : 'Exibir Gráficos'}
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Client / Empresa Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              Empresa / Cliente
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSelectedUnitId('ALL');
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition"
            >
              <option value="ALL">Todas as Empresas ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.trade_name || c.legal_name} - {c.document_number}
                </option>
              ))}
            </select>
          </div>

          {/* Period Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              Período de Análise
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition"
            >
              <option value="ALL_TIME">Todo o Histórico</option>
              <option value="TODAY">Hoje</option>
              <option value="7_DAYS">Últimos 7 dias</option>
              <option value="30_DAYS">Últimos 30 dias</option>
              <option value="THIS_MONTH">Este Mês</option>
              <option value="THIS_YEAR">Este Ano (2026)</option>
              <option value="CUSTOM">Intervalo Personalizado</option>
            </select>
          </div>

          {/* Dynamic Status Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              Status / Situação
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition"
            >
              <option value="ALL">Todos os Status</option>
              {activeCategory === 'SERVICE_ORDERS' && (
                <>
                  <option value="IN_PROGRESS">Em Andamento</option>
                  <option value="COMPLETED">Concluída</option>
                  <option value="ACCEPTED">Aceita pelo Cliente</option>
                  <option value="DELAYED">Atrasada (Fora do SLA)</option>
                  <option value="REWORK">Em Retrabalho</option>
                  <option value="CANCELLED">Cancelada</option>
                </>
              )}
              {activeCategory === 'ASOS_HEALTH' && (
                <>
                  <option value="OVERDUE_SOON">Vencidos ou a Vencer (30d)</option>
                  <option value="OVERDUE">Apenas Vencidos</option>
                  <option value="SOON">Apenas a Vencer</option>
                  <option value="VALID">Vigentes e Regulares</option>
                </>
              )}
              {activeCategory === 'ESOCIAL_EVENTS' && (
                <>
                  <option value="TRANSMITTED">Transmitidos com Recibo</option>
                  <option value="VALIDATED">Validados (Prontos)</option>
                  <option value="PENDING">Pendentes de Transmissão</option>
                  <option value="REJECTED">Rejeitados com Erro</option>
                </>
              )}
              {activeCategory === 'FINANCIAL' && (
                <>
                  <option value="PENDING">Pendente / A Vencer</option>
                  <option value="PAID">Liquidado / Pago</option>
                  <option value="OVERDUE">Em Atraso</option>
                  <option value="CANCELLED">Cancelado</option>
                </>
              )}
              {activeCategory === 'EPI_MANAGEMENT' && (
                <>
                  <option value="SIGNED">Assinados (Biometria / Digital)</option>
                  <option value="UNSIGNED">Pendentes de Assinatura</option>
                </>
              )}
              {activeCategory === 'RISKS_PGR' && (
                <>
                  <option value="ALTO (Vermelho)">Risco Alto (Matriz 4x4)</option>
                  <option value="MÉDIO (Amarelo)">Risco Médio</option>
                  <option value="BAIXO (Verde)">Risco Baixo</option>
                </>
              )}
            </select>
          </div>

          {/* Keyword Search */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-teal-400" />
              Busca por Texto
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar em qualquer campo..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Custom Date Range Picker (Only if selectedPeriod === 'CUSTOM') */}
        {selectedPeriod === 'CUSTOM' && (
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-wrap items-center gap-4 animate-fadeIn">
            <span className="text-xs font-bold text-teal-400">Defina o Intervalo:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {summaryKpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm hover:border-slate-700 transition"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div className="overflow-hidden">
                <p className="text-[11px] font-semibold text-slate-400 truncate uppercase tracking-wider">
                  {kpi.label}
                </p>
                <p className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                  {kpi.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Analytics Panel (Collapsible) */}
      {showCharts && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-teal-400" />
              Visão Gráfica & Distribuição Estatística
            </h3>
            <span className="text-xs text-slate-400">
              Dados atualizados em tempo real conforme os filtros aplicados
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartAnalyticsData.chartType === 'AREA' && chartAnalyticsData.areaData ? (
                <AreaChart data={chartAnalyticsData.areaData}>
                  <defs>
                    <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="despGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="receitas" stroke="#10b981" fillOpacity={1} fill="url(#recGrad)" name="Receitas (R$)" />
                  <Area type="monotone" dataKey="despesas" stroke="#f43f5e" fillOpacity={1} fill="url(#despGrad)" name="Despesas (R$)" />
                </AreaChart>
              ) : chartAnalyticsData.chartType === 'PIE' && chartAnalyticsData.pieData ? (
                <PieChart>
                  <Pie
                    data={chartAnalyticsData.pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label={(entry) => `${entry.name} (${entry.value})`}
                  >
                    {chartAnalyticsData.pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#14b8a6', '#06b6d4', '#3b82f6', '#f59e0b', '#ef4444'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                </PieChart>
              ) : (
                <BarChart data={chartAnalyticsData.barData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Bar dataKey="total" fill="#0d9488" radius={[6, 6, 0, 0]} name="Total de Registros" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main Interactive Data Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Tabela de Dados Filtrados
            </h3>
            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
              Página {currentPage} de {totalPages} ({categoryData.length} registros totais)
            </span>
          </div>

          {/* Pagination Controls in Header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span>Exibir:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value={10}>10 por pág.</option>
                <option value={15}>15 por pág.</option>
                <option value={25}>25 por pág.</option>
                <option value={50}>50 por pág.</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Table Content by Category */}
        <div className="overflow-x-auto">
          {categoryData.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Nenhum registro encontrado</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Não há dados correspondentes aos filtros selecionados. Tente limpar os filtros ou selecionar outra categoria.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-bold rounded-xl border border-teal-500/30"
              >
                Resetar Todos os Filtros
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-bold">
                  {activeCategory === 'SERVICE_ORDERS' && (
                    <tr>
                      <th className="p-3.5">Código O.S.</th>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5">Serviço</th>
                      <th className="p-3.5">Prioridade</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Prazo SLA</th>
                      <th className="p-3.5">Responsável</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  )}
  
                  {activeCategory === 'RISKS_PGR' && (
                    <tr>
                      <th className="p-3.5">Agente / Risco</th>
                      <th className="p-3.5">Grupo</th>
                      <th className="p-3.5">Fonte Geradora</th>
                      <th className="p-3.5">Intensidade</th>
                      <th className="p-3.5">Matriz PGR</th>
                      <th className="p-3.5">Insalubridade/Periculosidade</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  )}
  
                  {activeCategory === 'ASOS_HEALTH' && (
                    <tr>
                      <th className="p-3.5">Colaborador</th>
                      <th className="p-3.5">CPF / Cargo</th>
                      <th className="p-3.5">Tipo ASO</th>
                      <th className="p-3.5">Data Exame</th>
                      <th className="p-3.5">Validade</th>
                      <th className="p-3.5">Situação</th>
                      <th className="p-3.5">Aptidão</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  )}
  
                  {activeCategory === 'ESOCIAL_EVENTS' && (
                    <tr>
                      <th className="p-3.5">Evento</th>
                      <th className="p-3.5">Descrição</th>
                      <th className="p-3.5">Status Transmissão</th>
                      <th className="p-3.5">Recibo de Entrega</th>
                      <th className="p-3.5">Data Envio</th>
                      <th className="p-3.5">Ambiente</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  )}
  
                  {activeCategory === 'FINANCIAL' && (
                    <tr>
                      <th className="p-3.5">Código</th>
                      <th className="p-3.5">Tipo</th>
                      <th className="p-3.5">Descrição</th>
                      <th className="p-3.5">Valor</th>
                      <th className="p-3.5">Vencimento</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  )}
  
                  {activeCategory === 'EPI_MANAGEMENT' && (
                    <tr>
                      <th className="p-3.5">Colaborador</th>
                      <th className="p-3.5">Equipamento / EPI</th>
                      <th className="p-3.5">Nº CA</th>
                      <th className="p-3.5">Data Entrega</th>
                      <th className="p-3.5">Método Assinatura</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  )}
  
                  {activeCategory === 'CAT_ACCIDENTS' && (
                    <tr>
                      <th className="p-3.5">Nº CAT</th>
                      <th className="p-3.5">Tipo Acidente</th>
                      <th className="p-3.5">Data Acidente</th>
                      <th className="p-3.5">Local</th>
                      <th className="p-3.5">Agente Causador</th>
                      <th className="p-3.5">Afastamento?</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  )}
  
                  {activeCategory === 'TRAININGS_NR01' && (
                    <tr>
                      <th className="p-3.5">Treinamento</th>
                      <th className="p-3.5">Modalidade</th>
                      <th className="p-3.5">Carga Horária</th>
                      <th className="p-3.5">Data Realização</th>
                      <th className="p-3.5">Validade</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  )}
  
                  {activeCategory === 'COMMERCIAL_CONTRACTS' && (
                    <tr>
                      <th className="p-3.5">Nº Contrato</th>
                      <th className="p-3.5">Título</th>
                      <th className="p-3.5">Valor Recorrente</th>
                      <th className="p-3.5">Recorrência</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Início / Fim</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  )}
  
                  {activeCategory === 'AUDIT_QUALITY' && (
                    <tr>
                      <th className="p-3.5">Data / Hora</th>
                      <th className="p-3.5">Ação</th>
                      <th className="p-3.5">Entidade</th>
                      <th className="p-3.5">Usuário</th>
                      <th className="p-3.5">IP</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  )}
                </thead>
  
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {activeCategory === 'SERVICE_ORDERS' && (paginatedData as typeof serviceOrders).map((os) => {
                    const client = clients.find(c => c.id === os.client_id);
                    const isDelayed = (os.status !== 'COMPLETED' && os.status !== 'CANCELLED') && new Date(os.due_date) < new Date();
                    return (
                      <tr key={os.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono font-bold text-white">{os.os_number || os.id.substring(0, 8)}</td>
                        <td className="p-3.5">{client ? (client.trade_name || client.legal_name) : 'N/A'}</td>
                        <td className="p-3.5 font-semibold text-slate-200">{os.title}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            os.priority === 'URGENT' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            os.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {os.priority}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            os.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                            os.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {os.status}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={isDelayed ? 'text-rose-400 font-bold' : ''}>
                            {os.due_date ? formatDate(os.due_date) : '-'}
                            {isDelayed && ' (Atrasada)'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400">{os.technical_responsible_name || 'Não atribuído'}</td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRowDetail(os)}
                            className="p-1.5 hover:bg-slate-800 text-teal-400 hover:text-teal-300 rounded-lg transition"
                            title="Ver detalhes da O.S."
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
  
                  {activeCategory === 'RISKS_PGR' && (paginatedData as typeof environmentalRisks).map((r) => {
                    return (
                      <tr key={r.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-bold text-white">{r.agent_name || (r as any).description}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
                            {r.risk_category || (r as any).category}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400">{r.generating_source || 'Processo produtivo'}</td>
                        <td className="p-3.5 font-mono">{r.measured_value ? `${r.measured_value} ${r.measurement_unit || ''}` : 'Qualitativo'}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            (r.risk_level || '').includes('ALTO') || (r.risk_level || '').includes('CRITICO') ? 'bg-rose-500/20 text-rose-300' :
                            (r.risk_level || '').includes('MEDIO') ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {r.risk_level || 'MEDIO'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {r.insalubridade_applies && <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] mr-1">Insalubridade</span>}
                          {r.periculosidade_applies && <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[10px]">Periculosidade</span>}
                          {!r.insalubridade_applies && !r.periculosidade_applies && <span className="text-slate-500">Não enquadrado</span>}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRowDetail(r)}
                            className="p-1.5 hover:bg-slate-800 text-teal-400 hover:text-teal-300 rounded-lg transition"
                            title="Ver detalhes do risco"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
  
                  {activeCategory === 'ASOS_HEALTH' && (paginatedData as Array<{ employee: Employee; aso?: EmployeeASOHistory; isOverdue?: boolean; isSoon?: boolean }>).map((item, idx) => {
                    const emp = item.employee;
                    const aso = item.aso;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-bold text-white">{emp.name}</td>
                        <td className="p-3.5 text-slate-400">{emp.cpf} | {emp.job_title}</td>
                        <td className="p-3.5 font-semibold text-teal-300">{aso ? (aso.aso_type || (aso as any).exam_type) : 'Sem ASO'}</td>
                        <td className="p-3.5">{aso?.exam_date ? formatDate(aso.exam_date) : '-'}</td>
                        <td className="p-3.5 font-mono">{aso?.valid_until ? formatDate(aso.valid_until) : '-'}</td>
                        <td className="p-3.5">
                          {item.isOverdue ? (
                            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-[10px] font-bold">
                              VENCIDO
                            </span>
                          ) : item.isSoon ? (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold">
                              A VENCER (30d)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                              VIGENTE
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="text-emerald-400 font-bold">{aso?.result || (aso as any)?.aptitude || 'PENDENTE'}</span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRowDetail({ ...emp, selectedAso: aso })}
                            className="p-1.5 hover:bg-slate-800 text-teal-400 hover:text-teal-300 rounded-lg transition"
                            title="Ver ficha de saúde do colaborador"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
  
                  {activeCategory === 'ESOCIAL_EVENTS' && (paginatedData as typeof esocialEvents).map((ev) => {
                    return (
                      <tr key={ev.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono font-bold text-teal-400">{ev.event_type}</td>
                        <td className="p-3.5 text-slate-200">
                          {ev.event_type === 'S-2210' ? 'CAT - Acidente de Trabalho' :
                           ev.event_type === 'S-2220' ? 'ASO - Monitoramento da Saúde' :
                           ev.event_type === 'S-2240' ? 'Condições Ambientais do Trabalho' : 'Evento SST'}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.status === 'SUCCESS' || (ev.status as string) === 'TRANSMITTED' || (ev.status as string) === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-300' :
                            ev.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {ev.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">{ev.receipt_number || 'Aguardando envio'}</td>
                        <td className="p-3.5">{ev.transmitted_at ? formatDate(ev.transmitted_at) : '-'}</td>
                        <td className="p-3.5 text-slate-400">{ev.environment === 'PRODUCAO' ? 'Produção' : 'Homologação'}</td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRowDetail(ev)}
                            className="p-1.5 hover:bg-slate-800 text-teal-400 hover:text-teal-300 rounded-lg transition"
                            title="Ver detalhes do evento eSocial"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
  
                  {activeCategory === 'FINANCIAL' && (paginatedData as typeof transactions).map((t) => {
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono text-slate-400">{t.id.substring(0, 8)}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.type === 'RECEIVABLE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {t.type === 'RECEIVABLE' ? 'RECEITA' : 'DESPESA'}
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold text-white">{t.title}</td>
                        <td className="p-3.5 font-mono font-bold text-teal-300">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                        </td>
                        <td className="p-3.5">{t.due_date ? formatDate(t.due_date) : '-'}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRowDetail(t)}
                            className="p-1.5 hover:bg-slate-800 text-teal-400 hover:text-teal-300 rounded-lg transition"
                            title="Ver detalhes do lançamento financeiro"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
  
                  {/* Default generic fallback for other categories */}
                  {['EPI_MANAGEMENT', 'CAT_ACCIDENTS', 'TRAININGS_NR01', 'COMMERCIAL_CONTRACTS', 'AUDIT_QUALITY'].includes(activeCategory) &&
                    paginatedData.map((item: any, idx: number) => {
                      const keys = Object.keys(item).slice(0, 6);
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-800/40 transition">
                          {keys.map((k) => (
                            <td key={k} className="p-3.5 max-w-[200px] truncate">
                              {String(item[k] !== undefined && item[k] !== null ? item[k] : '-')}
                            </td>
                          ))}
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedRowDetail(item)}
                              className="p-1.5 hover:bg-slate-800 text-teal-400 hover:text-teal-300 rounded-lg transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Inspection Modal */}
      {selectedRowDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                Detalhamento Completo do Registro
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {Object.entries(selectedRowDetail).map(([key, val]) => (
                <div key={key} className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider mb-0.5">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-200 font-medium break-words">
                    {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '-')}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Automation Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Agendar Envio Automático</h3>
                  <p className="text-[11px] text-slate-400">Programar disparo periódico de relatórios</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Periodicidade de Disparo:</label>
                <select
                  value={scheduleConfig.frequency}
                  onChange={(e) => setScheduleConfig({ ...scheduleConfig, frequency: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value="DAILY">Diário (Todo dia útil às 08:00)</option>
                  <option value="WEEKLY">Semanal (Toda segunda-feira)</option>
                  <option value="BIWEEKLY">Quinzenal (Dias 01 e 15)</option>
                  <option value="MONTHLY">Mensal (1º dia útil do mês)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Destinatários de E-mail (separados por vírgula):</label>
                <input
                  type="text"
                  value={scheduleConfig.emailRecipients}
                  onChange={(e) => setScheduleConfig({ ...scheduleConfig, emailRecipients: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sendWa"
                  checked={scheduleConfig.sendWhatsApp}
                  onChange={(e) => setScheduleConfig({ ...scheduleConfig, sendWhatsApp: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-teal-500"
                />
                <label htmlFor="sendWa" className="text-slate-300">
                  Notificar Diretoria / Gestor via WhatsApp com link seguro
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="incSummary"
                  checked={scheduleConfig.includeExecutiveSummary}
                  onChange={(e) => setScheduleConfig({ ...scheduleConfig, includeExecutiveSummary: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-teal-500"
                />
                <label htmlFor="incSummary" className="text-slate-300">
                  Incluir Resumo Executivo em PDF e Planilha Excel anexada
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsScheduleModalOpen(false);
                  setSuccessToast('Agendamento de relatório configurado e salvo com sucesso!');
                  setTimeout(() => setSuccessToast(null), 4000);
                }}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-teal-950/30"
              >
                Salvar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
