'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  HardHat, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileSignature, 
  Upload, 
  FileText, 
  ArrowLeft, 
  Share2, 
  Calendar, 
  Building2, 
  ShieldAlert,
  Plus,
  Trash2,
  Edit2,
  Wifi,
  WifiOff,
  RefreshCw,
  Search,
  Check,
  X,
  Filter,
  Eye,
  Crosshair
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface HazardCheckItem {
  id: string;
  category: string;
  hazard: string;
  nr: string;
  severity: 'BAIXO' | 'MÉDIO' | 'ALTO' | 'CRÍTICO';
  status: 'CONFORME' | 'NÃO_CONFORME' | 'NÃO_APLICÁVEL';
  observation: string;
  corrective_measure?: string;
}

interface PhotoEvidenceItem {
  id: string;
  url: string;
  caption: string;
  nr_ref?: string;
  sector?: string;
  timestamp: string;
}

export const TechnicianFieldView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    serviceOrders, 
    clients, 
    currentProfile, 
    completeStage, 
    createNewDocument, 
    saveFieldEvidence 
  } = usePrevSafe();

  // Active OS being inspected
  const [selectedOSId, setSelectedOSId] = useState<string>(serviceOrders[0]?.id || '');
  const activeOS = serviceOrders.find(o => o.id === selectedOSId) || serviceOrders[0] || null;
  const client = activeOS ? clients.find(c => c.id === activeOS.client_id) : null;

  // Tabs
  const [selectedVisitTab, setSelectedVisitTab] = useState<'CHECKLIST' | 'PHOTOS' | 'SIGNATURE' | 'SYNC'>('CHECKLIST');

  // Offline Mode Simulator state
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(0);

  // Inspection Checklist state (CRUD)
  const [checklist, setChecklist] = useState<HazardCheckItem[]>([
    {
      id: 'chk-1',
      category: 'Físico',
      hazard: 'Ruído Contínuo e Intermitente em Usinagem / Prensas',
      nr: 'NR-09 / NR-15',
      severity: 'ALTO',
      status: 'NÃO_CONFORME',
      observation: 'Operadores na linha 02 sem protetor auricular plug tipo concha. Dosimetria recomendada.',
      corrective_measure: 'Fornecer protetor auricular CA válido e realizar dosimetria acústica.'
    },
    {
      id: 'chk-2',
      category: 'Acidentes',
      hazard: 'Proteções Coletivas em Máquinas & Equipamentos (Pontos de Prensagem)',
      nr: 'NR-12',
      severity: 'CRÍTICO',
      status: 'NÃO_CONFORME',
      observation: 'Guilhotina hidráulica sem cortina de luz e sem botão de emergência de duplo canal.',
      corrective_measure: 'Instalação imediata de barreira óptica e rearme manual supervisionado.'
    },
    {
      id: 'chk-3',
      category: 'Acidentes',
      hazard: 'Trabalho em Altura em Manutenção de Telhados e Pontes Rolantes',
      nr: 'NR-35',
      severity: 'ALTO',
      status: 'CONFORME',
      observation: 'Linha de vida instalada, colaboradores com treinamento válido e cinto tipo paraquedista.',
      corrective_measure: 'Manter inspeção periódica dos pontos de ancoragem.'
    },
    {
      id: 'chk-4',
      category: 'Ergonômico',
      hazard: 'Postura Estática e Levantamento Manual de Cargas Pesadas (> 25kg)',
      nr: 'NR-17',
      severity: 'MÉDIO',
      status: 'NÃO_CONFORME',
      observation: 'Bancadas de expedição sem ajuste de altura. Necessário elaborar AET com comitê de ergonomia.',
      corrective_measure: 'Adequar bancadas e instalar talhas mecânicas para movimentação.'
    },
    {
      id: 'chk-5',
      category: 'Químico',
      hazard: 'Vapores Orgânicos e Solventes em Cabine de Pintura',
      nr: 'NR-15 / NR-20',
      severity: 'MÉDIO',
      status: 'CONFORME',
      observation: 'Exaustão forçada operando normalmente. FISPQs e respiradores com filtro de carvão ativado.',
      corrective_measure: 'Substituição semestral dos filtros químicos de exaustão.'
    },
    {
      id: 'chk-6',
      category: 'Elétrico',
      hazard: 'Painéis Elétricos de Alta Tensão e Desenergização Segura',
      nr: 'NR-10',
      severity: 'ALTO',
      status: 'CONFORME',
      observation: 'Prontuário das instalações elétricas atualizado e procedimentos de bloqueio e etiquetagem (LOTO) aplicados.',
      corrective_measure: 'Realizar termografia preventiva anual nos quadros de distribuição.'
    },
    {
      id: 'chk-7',
      category: 'Incêndio',
      hazard: 'Extintores, Hidrantes e Sinalização de Rotas de Fuga',
      nr: 'NR-23',
      severity: 'MÉDIO',
      status: 'CONFORME',
      observation: 'Inspeção hidrostática dos extintores de pó químico e CO2 em dia.',
      corrective_measure: 'Manter desobstruídos os acessos aos abrigos de hidrantes.'
    },
    {
      id: 'chk-8',
      category: 'Espaço Confinado',
      hazard: 'Entrada em Silos e Tanques de Armazenamento',
      nr: 'NR-33',
      severity: 'CRÍTICO',
      status: 'NÃO_APLICÁVEL',
      observation: 'Planta fabril não opera espaços confinados neste setor.',
      corrective_measure: 'N/A'
    },
  ]);

  // Filters for checklist
  const [nrFilter, setNrFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Hazard Modal (CRUD Create)
  const [showAddHazardModal, setShowAddHazardModal] = useState(false);
  const [newCategory, setNewCategory] = useState('Físico');
  const [newHazard, setNewHazard] = useState('');
  const [newNr, setNewNr] = useState('NR-09');
  const [newSeverity, setNewSeverity] = useState<'BAIXO' | 'MÉDIO' | 'ALTO' | 'CRÍTICO'>('ALTO');
  const [newStatus, setNewStatus] = useState<'CONFORME' | 'NÃO_CONFORME' | 'NÃO_APLICÁVEL'>('NÃO_CONFORME');
  const [newObs, setNewObs] = useState('');
  const [newCorrective, setNewCorrective] = useState('');

  // Photo Evidences state (CRUD)
  const [photos, setPhotos] = useState<PhotoEvidenceItem[]>([
    {
      id: 'p-1',
      url: 'https://picsum.photos/seed/factory1/400/300',
      caption: 'Ponto de operação de prensa sem enclausuramento de segurança.',
      nr_ref: 'NR-12',
      sector: 'Usinagem Pesada',
      timestamp: new Date().toLocaleTimeString('pt-BR')
    },
    {
      id: 'p-2',
      url: 'https://picsum.photos/seed/pressmachine/400/300',
      caption: 'Quadro elétrico com sinalização de advertência e LOTO aplicado.',
      nr_ref: 'NR-10',
      sector: 'Subestação Principal',
      timestamp: new Date().toLocaleTimeString('pt-BR')
    }
  ]);

  // Photo Modal & Zoom
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [newPhotoSector, setNewPhotoSector] = useState('Linha de Montagem');
  const [newPhotoNr, setNewPhotoNr] = useState('NR-12');
  const [zoomedPhoto, setZoomedPhoto] = useState<PhotoEvidenceItem | null>(null);

  // Digital Signature & GPS state
  const [repName, setRepName] = useState('Carlos Eduardo Mendes');
  const [repRole, setRepRole] = useState('Técnico de Segurança da Fábrica');
  const [repCpf, setRepCpf] = useState('987.654.321-00');
  const [isSigned, setIsSigned] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; precision: string }>({
    lat: -22.2472,
    lng: -43.7011,
    precision: '± 4.2 metros (GPS Alta Precisão)'
  });

  // Action: Add Hazard Item (Create)
  const handleAddHazard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHazard.trim()) return;

    const newItem: HazardCheckItem = {
      id: `chk-${Date.now()}`,
      category: newCategory,
      hazard: newHazard,
      nr: newNr,
      severity: newSeverity,
      status: newStatus,
      observation: newObs || 'Verificação realizada in loco durante vistoria técnica.',
      corrective_measure: newCorrective
    };

    setChecklist([...checklist, newItem]);
    setShowAddHazardModal(false);
    setNewHazard('');
    setNewObs('');
    setNewCorrective('');
    if (isOffline) setOfflinePendingCount(prev => prev + 1);
    alert('Item de risco e inspeção adicionado com sucesso!');
  };

  // Action: Delete Hazard Item (Delete)
  const handleDeleteHazard = (id: string) => {
    if (confirm('Deseja excluir este item de inspeção da vistoria?')) {
      setChecklist(checklist.filter(c => c.id !== id));
      if (isOffline) setOfflinePendingCount(prev => prev + 1);
    }
  };

  // Action: Update Status (Update)
  const handleUpdateStatus = (id: string, newStatusVal: 'CONFORME' | 'NÃO_CONFORME' | 'NÃO_APLICÁVEL') => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, status: newStatusVal } : item));
    if (isOffline) setOfflinePendingCount(prev => prev + 1);
  };

  // Action: Update Observation (Update)
  const handleUpdateObservation = (id: string, text: string) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, observation: text } : item));
    if (isOffline) setOfflinePendingCount(prev => prev + 1);
  };

  // Action: Add Photo (Create)
  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `p-${Date.now()}`;
    const sampleUrl = `https://picsum.photos/seed/evidencia-${Date.now()}/400/300`;

    const newPhoto: PhotoEvidenceItem = {
      id: newId,
      url: sampleUrl,
      caption: newPhotoCaption || 'Evidência fotográfica de campo coletada pelo técnico.',
      nr_ref: newPhotoNr,
      sector: newPhotoSector,
      timestamp: new Date().toLocaleTimeString('pt-BR')
    };

    setPhotos([...photos, newPhoto]);
    setShowAddPhotoModal(false);
    setNewPhotoCaption('');
    if (isOffline) setOfflinePendingCount(prev => prev + 1);
    alert('Foto de evidência capturada e anexada ao relatório!');
  };

  // Action: Delete Photo (Delete)
  const handleDeletePhoto = (id: string) => {
    if (confirm('Deseja excluir esta evidência fotográfica?')) {
      setPhotos(photos.filter(p => p.id !== id));
      if (isOffline) setOfflinePendingCount(prev => prev + 1);
    }
  };

  // Action: Collect GPS
  const handleRefreshGps = () => {
    setGpsLocation({
      lat: -22.2472 + (Math.random() - 0.5) * 0.001,
      lng: -43.7011 + (Math.random() - 0.5) * 0.001,
      precision: `± ${(3.5 + Math.random()).toFixed(1)} metros (Satélites GLONASS/GPS)`
    });
    alert('Coordenadas de geolocalização de campo atualizadas com sucesso!');
  };

  // Action: Sync and Finalize Inspection
  const handleGenerateFieldReport = () => {
    if (!isSigned) {
      alert('Por favor, colete a assinatura do acompanhante da vistoria antes de sincronizar o relatório.');
      setSelectedVisitTab('SIGNATURE');
      return;
    }

    if (!activeOS) return;

    // Save field evidence
    const inspectionText = checklist.map(c => 
      `[${c.nr}] ${c.category} - ${c.hazard}: ${c.status} (${c.observation})${c.corrective_measure ? ` -> Medida: ${c.corrective_measure}` : ''}`
    ).join('\n');

    const fieldPayload = {
      photos: photos.map(p => ({ url: p.url, caption: `${p.nr_ref || ''} [${p.sector || ''}]: ${p.caption}`, timestamp: new Date().toISOString() })),
      client_signature: { name: `${repName} (CPF ${repCpf} - ${repRole})`, signed_at: new Date().toISOString() },
      inspection_notes: inspectionText,
      geo_location: { latitude: gpsLocation.lat, longitude: gpsLocation.lng, label: `${client?.trade_name} - ${client?.city}/${client?.state}` }
    };

    // Find Stage 2 (Vistoria de Campo) or Stage 1
    const stageToComplete = activeOS.stages.find(s => s.status === 'IN_PROGRESS') || activeOS.stages[1] || activeOS.stages[0];

    if (stageToComplete) {
      saveFieldEvidence(activeOS.id, stageToComplete.id, fieldPayload);
      completeStage(activeOS.id, stageToComplete.id);
    }

    // Create official document
    createNewDocument({
      client_id: activeOS.client_id,
      service_order_id: activeOS.id,
      name: `Relatório Técnico de Vistoria de Campo & Evidências - ${client?.trade_name || 'Cliente'}`,
      document_type: 'RELATÓRIO',
      file_name: `relatorio_vistoria_${activeOS.os_number.toLowerCase().replace('-', '_')}.pdf`,
      file_size: 3450000,
      notes: `Vistoria de campo executada por ${currentProfile.full_name}, acompanhada e assinada por ${repName} (${repRole}). Coordenadas GPS: ${gpsLocation.lat.toFixed(4)}, ${gpsLocation.lng.toFixed(4)}.`,
      is_client_released: true
    });

    setOfflinePendingCount(0);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    alert(`📋 Vistoria de Campo sincronizada com sucesso!\n\n• ${checklist.length} itens de perigos/NRs inspecionados\n• ${photos.length} fotos anexadas com geolocalização\n• Assinatura digital de ${repName} vinculada\n• Relatório técnico oficial gerado e liberado.`);
  };

  // Filtered checklist
  const filteredChecklist = checklist.filter(item => {
    const matchesNr = nrFilter === 'ALL' || item.nr.includes(nrFilter);
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesNr && matchesStatus;
  });

  const nonConformCount = checklist.filter(c => c.status === 'NÃO_CONFORME').length;
  const conformCount = checklist.filter(c => c.status === 'CONFORME').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Mobile-Friendly App Header Bento Card with Offline Simulator */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex-shrink-0">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-white">PrevSafe Campo PWA</span>
              <button
                onClick={() => setIsOffline(!isOffline)}
                className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center space-x-1 transition ${
                  isOffline 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
                title="Clique para alternar entre modo Online e Offline"
              >
                {isOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                <span>{isOffline ? 'MODO OFFLINE (SIMULADO)' : 'ONLINE & SINCRONIZADO'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Técnico: <strong className="text-slate-300">{currentProfile.full_name}</strong> • Registro SESMT/MTE Ativo
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {offlinePendingCount > 0 && (
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold rounded-xl flex items-center space-x-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{offlinePendingCount} na fila offline</span>
            </span>
          )}
          <button
            onClick={() => onNavigate('service-orders')}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-2xl border border-slate-800 transition whitespace-nowrap"
          >
            Voltar ao Painel
          </button>
        </div>
      </div>

      {/* Inspection Target Selector & Details Bento Card */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
              Vistoria Técnica Agendada Hoje
            </span>
            <h2 className="text-xl font-bold text-white mt-2">{client?.trade_name || 'Cliente Selecionado'}</h2>
            <p className="text-xs text-slate-400 flex items-center mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500 mr-1.5 flex-shrink-0" />
              {client?.address} - {client?.city}/{client?.state} (Grau de Risco {client?.risk_degree})
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-500">Trocar OS / Vistoria:</label>
            <select
              value={selectedOSId}
              onChange={(e) => setSelectedOSId(e.target.value)}
              className="bg-slate-950 text-white text-xs font-bold rounded-xl border border-slate-800 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              {serviceOrders.map(os => {
                const c = clients.find(cl => cl.id === os.client_id);
                return (
                  <option key={os.id} value={os.id}>
                    {os.os_number} - {c?.trade_name} ({os.service_name})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Inspection Summary Metric Pills */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Inspecionado</span>
            <strong className="text-lg font-mono text-white mt-0.5 block">{checklist.length} itens</strong>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-center">
            <span className="text-rose-400 block text-[10px] uppercase font-bold">Não Conformidades</span>
            <strong className="text-lg font-mono text-rose-300 mt-0.5 block">{nonConformCount} perigos</strong>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center">
            <span className="text-emerald-400 block text-[10px] uppercase font-bold">Conformes / Regulares</span>
            <strong className="text-lg font-mono text-emerald-300 mt-0.5 block">{conformCount} itens</strong>
          </div>
        </div>

        {/* Tab Navigation for Field Work */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1">
          <button
            onClick={() => setSelectedVisitTab('CHECKLIST')}
            className={`flex-1 py-2.5 text-xs font-bold text-center rounded-xl transition flex items-center justify-center space-x-1.5 ${
              selectedVisitTab === 'CHECKLIST' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>1. Perigos & NRs ({checklist.length})</span>
          </button>
          <button
            onClick={() => setSelectedVisitTab('PHOTOS')}
            className={`flex-1 py-2.5 text-xs font-bold text-center rounded-xl transition flex items-center justify-center space-x-1.5 ${
              selectedVisitTab === 'PHOTOS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>2. Fotos ({photos.length})</span>
          </button>
          <button
            onClick={() => setSelectedVisitTab('SIGNATURE')}
            className={`flex-1 py-2.5 text-xs font-bold text-center rounded-xl transition flex items-center justify-center space-x-1.5 ${
              selectedVisitTab === 'SIGNATURE' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSignature className="w-4 h-4" />
            <span>3. Assinatura & GPS</span>
          </button>
          <button
            onClick={() => setSelectedVisitTab('SYNC')}
            className={`flex-1 py-2.5 text-xs font-bold text-center rounded-xl transition flex items-center justify-center space-x-1.5 ${
              selectedVisitTab === 'SYNC' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>4. Sincronizar</span>
          </button>
        </div>

        {/* ==================== TAB 1: CHECKLIST DE PERIGOS & NRS (CRUD) ==================== */}
        {selectedVisitTab === 'CHECKLIST' && (
          <div className="space-y-4 pt-2">
            {/* Action Bar: Filters + Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={nrFilter}
                  onChange={(e) => setNrFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white"
                >
                  <option value="ALL">Todas as NRs</option>
                  <option value="NR-09">NR-09 (Agentes Ambientais)</option>
                  <option value="NR-10">NR-10 (Elétrica)</option>
                  <option value="NR-12">NR-12 (Máquinas)</option>
                  <option value="NR-15">NR-15 (Insalubridade)</option>
                  <option value="NR-17">NR-17 (Ergonomia)</option>
                  <option value="NR-23">NR-23 (Incêndio)</option>
                  <option value="NR-33">NR-33 (Espaço Confinado)</option>
                  <option value="NR-35">NR-35 (Altura)</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white"
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="NÃO_CONFORME">Não Conformes (Críticos)</option>
                  <option value="CONFORME">Conformes</option>
                  <option value="NÃO_APLICÁVEL">N/A</option>
                </select>
              </div>

              <button
                onClick={() => setShowAddHazardModal(true)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Adicionar Ponto de Inspeção</span>
              </button>
            </div>

            {/* Checklist items list */}
            <div className="space-y-3.5">
              {filteredChecklist.map((item) => (
                <div key={item.id} className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3 transition hover:border-slate-700">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 text-indigo-300 font-mono">
                          {item.nr}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">{item.category}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          item.severity === 'CRÍTICO' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          item.severity === 'ALTO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                          item.severity === 'MÉDIO' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          Severidade {item.severity}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mt-1.5">{item.hazard}</h4>
                    </div>

                    <button
                      onClick={() => handleDeleteHazard(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
                      title="Excluir Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Conformity Selector */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(item.id, 'CONFORME')}
                      className={`py-2 text-xs font-bold rounded-xl transition ${
                        item.status === 'CONFORME' 
                          ? 'bg-emerald-600 text-white shadow-md' 
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      ✓ Conforme
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(item.id, 'NÃO_CONFORME')}
                      className={`py-2 text-xs font-bold rounded-xl transition ${
                        item.status === 'NÃO_CONFORME' 
                          ? 'bg-rose-600 text-white shadow-md' 
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      ✕ Não Conforme
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(item.id, 'NÃO_APLICÁVEL')}
                      className={`py-2 text-xs font-bold rounded-xl transition ${
                        item.status === 'NÃO_APLICÁVEL' 
                          ? 'bg-slate-800 text-white shadow-md' 
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      N/A
                    </button>
                  </div>

                  {/* Observation Field */}
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Observação técnica constatada em campo..."
                      value={item.observation}
                      onChange={(e) => handleUpdateObservation(item.id, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    {item.corrective_measure && (
                      <p className="text-[11px] text-amber-300/90 pl-1">
                        <strong>Recomendação PrevSafe:</strong> {item.corrective_measure}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: FOTOS E EVIDÊNCIAS (CRUD) ==================== */}
        {selectedVisitTab === 'PHOTOS' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Galeria de Evidências Fotográficas ({photos.length})</span>
              <button
                onClick={() => setShowAddPhotoModal(true)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>+ Capturar / Adicionar Foto</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {photos.map((item) => (
                <div key={item.id} className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2.5">
                  <div 
                    onClick={() => setZoomedPhoto(item)}
                    className="relative rounded-xl overflow-hidden aspect-video bg-slate-950 cursor-pointer group"
                  >
                    <Image 
                      src={item.url} 
                      alt={item.caption} 
                      fill 
                      className="object-cover group-hover:scale-105 transition duration-300" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <Eye className="w-6 h-6 text-white drop-shadow" />
                    </div>
                    {item.nr_ref && (
                      <span className="absolute top-2 left-2 z-10 bg-slate-950/90 text-indigo-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-slate-800">
                        {item.nr_ref}
                      </span>
                    )}
                    <span className="absolute bottom-2 right-2 z-10 bg-slate-950/90 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-full">
                      {item.timestamp}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {item.sector && (
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">{item.sector}</span>
                      )}
                      <p className="text-xs text-slate-200 mt-0.5">{item.caption}</p>
                    </div>

                    <button
                      onClick={() => handleDeletePhoto(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition flex-shrink-0"
                      title="Excluir Foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: ASSINATURA DIGITAL & GPS ==================== */}
        {selectedVisitTab === 'SIGNATURE' && (
          <div className="space-y-5 pt-2 text-xs">
            {/* GPS Geolocation Panel */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <Crosshair className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Geolocalização de Campo Coletada</div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Lat: {gpsLocation.lat.toFixed(4)} • Lng: {gpsLocation.lng.toFixed(4)} ({gpsLocation.precision})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRefreshGps}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-semibold border border-slate-800 transition flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Atualizar GPS</span>
              </button>
            </div>

            {/* Accompanying Person Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Acompanhante da Fábrica (Nome) *</label>
                <input
                  type="text"
                  required
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">CPF do Acompanhante *</label>
                <input
                  type="text"
                  required
                  value={repCpf}
                  onChange={(e) => setRepCpf(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Cargo / Função *</label>
                <input
                  type="text"
                  required
                  value={repRole}
                  onChange={(e) => setRepRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Signature Canvas Simulator */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block font-semibold text-slate-300">Assinatura Digital na Tela do Dispositivo</label>
                {isSigned && (
                  <button
                    type="button"
                    onClick={() => setIsSigned(false)}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Limpar / Refazer
                  </button>
                )}
              </div>

              <div 
                onClick={() => setIsSigned(true)}
                className="w-full h-36 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition hover:border-slate-700"
              >
                {isSigned ? (
                  <div className="text-center text-emerald-400 font-serif italic text-xl font-bold">
                    ✍️ {repName}
                    <span className="block font-sans text-[10px] text-slate-500 not-italic mt-1 font-mono">
                      Rubrica Digital Coletada às {new Date().toLocaleTimeString('pt-BR')} (CPF: {repCpf})
                    </span>
                  </div>
                ) : (
                  <div className="text-center text-slate-500">
                    <FileSignature className="w-7 h-7 mx-auto mb-1.5 text-slate-600" />
                    <span className="text-xs font-semibold text-slate-300 block">Toque aqui para coletar a assinatura</span>
                    <span className="text-[10px] text-slate-500">Validação com carimbo de tempo e geolocalização</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: SINCRONIZAÇÃO & CONCLUIR ==================== */}
        {selectedVisitTab === 'SYNC' && (
          <div className="space-y-5 pt-2 text-xs">
            <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-indigo-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Revisão Geral antes da Sincronização</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Ao sincronizar, o aplicativo compilará as constatações de campo, gerará o <strong>Relatório Técnico Oficial de Vistoria</strong> e avançará o workflow da OS <strong>{activeOS?.os_number}</strong> para a etapa de elaboração técnica dos laudos.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-[11px]">
                <div className="p-2 bg-slate-950 rounded-xl">
                  <span className="text-slate-500 block">Perigos</span>
                  <strong className="text-white font-mono">{checklist.length} itens</strong>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl">
                  <span className="text-slate-500 block">Fotos</span>
                  <strong className="text-white font-mono">{photos.length} fotos</strong>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl">
                  <span className="text-slate-500 block">Assinatura</span>
                  <strong className={isSigned ? "text-emerald-400" : "text-rose-400"}>
                    {isSigned ? "Coletada" : "Pendente"}
                  </strong>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl">
                  <span className="text-slate-500 block">GPS</span>
                  <strong className="text-emerald-400 font-mono">OK</strong>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateFieldReport}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl text-xs shadow-xl shadow-emerald-950/40 transition flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Sincronizar Vistoria de Campo & Gerar Relatório Técnico</span>
            </button>
          </div>
        )}
      </div>

      {/* ==================== MODAL: ADICIONAR ITEM DE RISCO (CRUD CREATE) ==================== */}
      {showAddHazardModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">Adicionar Ponto de Inspeção / Risco</h3>
              <button onClick={() => setShowAddHazardModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleAddHazard} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Norma Regulamentadora *</label>
                  <select
                    value={newNr}
                    onChange={(e) => setNewNr(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="NR-01">NR-01 (GRO / PGR)</option>
                    <option value="NR-06">NR-06 (EPIs)</option>
                    <option value="NR-09">NR-09 (Agentes Físicos/Químicos)</option>
                    <option value="NR-10">NR-10 (Instalações Elétricas)</option>
                    <option value="NR-12">NR-12 (Máquinas & Equipamentos)</option>
                    <option value="NR-15">NR-15 (Insalubridade)</option>
                    <option value="NR-17">NR-17 (Ergonomia / AET)</option>
                    <option value="NR-20">NR-20 (Inflamáveis)</option>
                    <option value="NR-23">NR-23 (Proteção Contra Incêndio)</option>
                    <option value="NR-33">NR-33 (Espaço Confinado)</option>
                    <option value="NR-35">NR-35 (Trabalho em Altura)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Categoria de Risco *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="Físico">Físico</option>
                    <option value="Químico">Químico</option>
                    <option value="Biológico">Biológico</option>
                    <option value="Ergonômico">Ergonômico</option>
                    <option value="Acidentes">Acidentes / Mecânico</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Descrição do Perigo / Condição Inspecionada *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Trabalho em escadas sem ancoragem na manutenção"
                  value={newHazard}
                  onChange={(e) => setNewHazard(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Severidade Estimada</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="BAIXO">Baixo</option>
                    <option value="MÉDIO">Médio</option>
                    <option value="ALTO">Alto</option>
                    <option value="CRÍTICO">Crítico</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Conformidade Inicial</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="NÃO_CONFORME">Não Conforme</option>
                    <option value="CONFORME">Conforme</option>
                    <option value="NÃO_APLICÁVEL">N/A</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Observação Técnica Constatada</label>
                <textarea
                  rows={2}
                  placeholder="Detalhes específicos da situação encontrada..."
                  value={newObs}
                  onChange={(e) => setNewObs(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Medida Corretiva Recomendada (Plano de Ação PGR)</label>
                <input
                  type="text"
                  placeholder="Ex: Treinamento NR-35 e instalação de ponto de ancoragem"
                  value={newCorrective}
                  onChange={(e) => setNewCorrective(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddHazardModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                >
                  Salvar Item de Risco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CAPTURAR NOVA FOTO ==================== */}
      {showAddPhotoModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">Capturar Foto / Evidência</h3>
              <button onClick={() => setShowAddPhotoModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleAddPhoto} className="space-y-3.5 text-xs">
              <div className="p-6 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-2">
                <Camera className="w-8 h-8 mx-auto text-indigo-400" />
                <div className="text-slate-300 font-semibold">Câmera de Campo Pronta</div>
                <p className="text-[11px] text-slate-500">Resolução otimizada para laudos técnicos com metadados EXIF e carimbo de tempo.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Setor / Linha *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Almoxarifado / Prensa 04"
                    value={newPhotoSector}
                    onChange={(e) => setNewPhotoSector(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">NR Vinculada</label>
                  <select
                    value={newPhotoNr}
                    onChange={(e) => setNewPhotoNr(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="NR-12">NR-12 (Máquinas)</option>
                    <option value="NR-10">NR-10 (Elétrica)</option>
                    <option value="NR-35">NR-35 (Altura)</option>
                    <option value="NR-17">NR-17 (Ergonomia)</option>
                    <option value="NR-06">NR-06 (EPIs)</option>
                    <option value="NR-23">NR-23 (Incêndio)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Legenda Técnica da Evidência *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Descreva o que a imagem comprova (não conformidade ou condição segura)..."
                  value={newPhotoCaption}
                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPhotoModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                >
                  Anexar Evidência Fotográfica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ZOOM DE FOTO ==================== */}
      {zoomedPhoto && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full p-5 shadow-2xl border border-slate-800 text-slate-100 animate-in fade-in zoom-in-95 duration-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-indigo-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                  {zoomedPhoto.nr_ref || 'NR Geral'}
                </span>
                <span className="text-xs font-bold text-white">{zoomedPhoto.sector}</span>
              </div>
              <button onClick={() => setZoomedPhoto(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-950 border border-slate-800">
              <Image 
                src={zoomedPhoto.url} 
                alt={zoomedPhoto.caption} 
                fill 
                className="object-contain" 
                referrerPolicy="no-referrer" 
              />
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <p className="text-slate-200">{zoomedPhoto.caption}</p>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">Horário de captura: {zoomedPhoto.timestamp}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
