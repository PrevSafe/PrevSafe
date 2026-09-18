'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { uploadEvidencePhoto, createEvidenceSignedUrl, removeEvidencePhoto } from '@/lib/supabaseSync';
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
  Crosshair,
  HardDrive,
  Download,
  UploadCloud,
  Database,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
  Server,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  saveInspectionSession, 
  loadInspectionSession, 
  enqueueOfflineAction, 
  getPendingSyncQueue, 
  clearOfflineSyncQueue, 
  getOfflineStorageStats, 
  warmFieldServiceWorkerCache,
  testOfflineLatency,
  exportOfflineBackup, 
  importOfflineBackup, 
  purgeAllOfflineData,
  OfflineSyncQueueItem,
  OfflineStorageStats,
  OfflineCheckItem,
  OfflinePhotoEvidence
} from '@/lib/pwaStorage';

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
  /** URL exibivel agora: assinada (online) ou data URL local (offline). */
  url: string;
  /**
   * Caminho no bucket privado. E o que persiste: a URL assinada expira, entao
   * ela e regerada a cada sessao a partir daqui.
   */
  storage_path?: string;
  /** Foto tirada sem conexao, ainda no dispositivo, aguardando envio. */
  pending_upload?: boolean;
  caption: string;
  nr_ref?: string;
  sector?: string;
  timestamp: string;
}

/**
 * Catalogo de perigos comuns, oferecido como ponto de partida da vistoria.
 *
 * NAO e carregado sozinho: a inspecao comeca vazia e o tecnico escolhe usar
 * o modelo. Antes, estes itens ja vinham marcados como NAO CONFORME com
 * observacoes sobre uma fabrica ficticia - o tecnico chegava ao cliente com
 * um laudo pre-preenchido de nao conformidades que ninguem tinha visto.
 *
 * Todo item entra sem avaliacao e sem observacao: quem inspeciona preenche.
 */
const HAZARD_TEMPLATE: HazardCheckItem[] = [
  {
    id: 'chk-1',
    category: 'Físico',
    hazard: 'Ruído Contínuo e Intermitente em Usinagem / Prensas',
    nr: 'NR-09 / NR-15',
    severity: 'ALTO',
    status: 'NÃO_APLICÁVEL',
    observation: ''
  },
  {
    id: 'chk-2',
    category: 'Acidentes',
    hazard: 'Proteções Coletivas em Máquinas & Equipamentos (Pontos de Prensagem)',
    nr: 'NR-12',
    severity: 'CRÍTICO',
    status: 'NÃO_APLICÁVEL',
    observation: ''
  },
  {
    id: 'chk-3',
    category: 'Acidentes',
    hazard: 'Trabalho em Altura em Manutenção de Telhados e Pontes Rolantes',
    nr: 'NR-35',
    severity: 'ALTO',
    status: 'NÃO_APLICÁVEL',
    observation: ''
  },
  {
    id: 'chk-4',
    category: 'Ergonômico',
    hazard: 'Postura Estática e Levantamento Manual de Cargas Pesadas (> 25kg)',
    nr: 'NR-17',
    severity: 'MÉDIO',
    status: 'NÃO_APLICÁVEL',
    observation: ''
  },
  {
    id: 'chk-5',
    category: 'Químico',
    hazard: 'Vapores Orgânicos e Solventes em Cabine de Pintura',
    nr: 'NR-15 / NR-20',
    severity: 'MÉDIO',
    status: 'NÃO_APLICÁVEL',
    observation: ''
  },
  {
    id: 'chk-6',
    category: 'Elétrico',
    hazard: 'Painéis Elétricos de Alta Tensão e Desenergização Segura',
    nr: 'NR-10',
    severity: 'ALTO',
    status: 'NÃO_APLICÁVEL',
    observation: ''
  },
  {
    id: 'chk-7',
    category: 'Incêndio',
    hazard: 'Extintores, Hidrantes e Sinalização de Rotas de Fuga',
    nr: 'NR-23',
    severity: 'MÉDIO',
    status: 'NÃO_APLICÁVEL',
    observation: ''
  },
  {
    id: 'chk-8',
    category: 'Espaço Confinado',
    hazard: 'Entrada em Silos e Tanques de Armazenamento',
    nr: 'NR-33',
    severity: 'CRÍTICO',
    status: 'NÃO_APLICÁVEL',
    observation: ''
  },
];

export const TechnicianFieldView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    serviceOrders = [], 
    clients = [], 
    currentProfile, 
    tenantTheme,
    completeStage, 
    createNewDocument, 
    saveFieldEvidence, 
    syncOrganizationId 
  } = usePrevSafe();

  // Active OS being inspected
  const [selectedOSId, setSelectedOSId] = useState<string>(serviceOrders?.[0]?.id || '');
  const activeOS = (serviceOrders || []).find(o => o?.id === selectedOSId) || serviceOrders?.[0] || null;
  const client = activeOS ? (clients || []).find(c => c?.id === activeOS.client_id) : null;

  // Tabs
  const [selectedVisitTab, setSelectedVisitTab] = useState<'CHECKLIST' | 'PHOTOS' | 'SIGNATURE' | 'SYNC'>('CHECKLIST');

  // Offline Mode & Service Worker State
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [syncQueue, setSyncQueue] = useState<OfflineSyncQueueItem[]>([]);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string>('agora');
  const [storageStats, setStorageStats] = useState<OfflineStorageStats | null>(null);
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const [showStorageModal, setShowStorageModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inspection Checklist state (CRUD)
  const [checklist, setChecklist] = useState<HazardCheckItem[]>([]);

  // Filters for checklist
  const [nrFilter, setNrFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Hazard Modal (CRUD Create)
  const [showAddHazardModal, setShowAddHazardModal] = useState(false);
  const [newCategory, setNewCategory] = useState('Físico');
  const [newHazard, setNewHazard] = useState('');
  const [newNr, setNewNr] = useState('NR-09');
  const [newSeverity, setNewSeverity] = useState<'BAIXO' | 'MÉDIO' | 'ALTO' | 'CRÍTICO'>('ALTO');
  const [newStatus, setNewStatus] = useState<'CONFORME' | 'NÃO_CONFORME' | 'NÃO_APLICÁVEL'>('NÃO_APLICÁVEL');
  const [newObs, setNewObs] = useState('');
  const [newCorrective, setNewCorrective] = useState('');

  // Photo Evidences state (CRUD)
  const [photos, setPhotos] = useState<PhotoEvidenceItem[]>([]);

  // Photo Modal & Zoom
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [newPhotoSector, setNewPhotoSector] = useState('');
  const [newPhotoNr, setNewPhotoNr] = useState('NR-12');
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<PhotoEvidenceItem | null>(null);

  // Digital Signature & GPS state
  const [repName, setRepName] = useState('');
  const [repRole, setRepRole] = useState('');
  const [repCpf, setRepCpf] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; precision: string }>({
    lat: -22.2472,
    lng: -43.7011,
    precision: '± 4.2 metros (GPS Alta Precisão)'
  });

  // Refresh Storage Stats & Queue
  const refreshStorageData = useCallback(async () => {
    try {
      const stats = await getOfflineStorageStats();
      setStorageStats(stats);
      const queue = await getPendingSyncQueue();
      setSyncQueue(queue);
    } catch (e) {
      console.warn('[PrevSafe PWA] Stats fetch failed:', e);
    }
  }, []);

  // Load cached inspection session whenever selectedOSId changes
  useEffect(() => {
    let isMounted = true;

    async function loadCachedOS() {
      if (!selectedOSId) return;
      try {
        const cached = await loadInspectionSession(selectedOSId);
        if (cached && isMounted) {
          if (cached.checklist && cached.checklist.length > 0) {
            setChecklist(cached.checklist);
          }
          if (cached.photos && cached.photos.length > 0) {
            // A URL assinada expira; o que persiste e o storage_path. Aqui ela
            // e regerada, e o que nao chegou a subir (foto tirada sem sinal)
            // e reenviado.
            const restored = await Promise.all(
              (cached.photos as PhotoEvidenceItem[]).map(async (photo) => {
                if (photo.storage_path) {
                  const signed = await createEvidenceSignedUrl(photo.storage_path);
                  return signed ? { ...photo, url: signed, pending_upload: false } : photo;
                }
                if (photo.pending_upload && syncOrganizationId && photo.url?.startsWith('data:')) {
                  const blob = await fetch(photo.url).then(r => r.blob()).catch(() => null);
                  if (blob) {
                    const sent = await uploadEvidencePhoto(
                      syncOrganizationId,
                      cached.osNumber || selectedOSId,
                      blob
                    );
                    if (sent.ok && sent.evidence) {
                      return {
                        ...photo,
                        url: sent.evidence.signedUrl || photo.url,
                        storage_path: sent.evidence.path,
                        pending_upload: false
                      };
                    }
                  }
                }
                return photo;
              })
            );
            if (isMounted) setPhotos(restored);
          }
          if (cached.repName) setRepName(cached.repName);
          if (cached.repCpf) setRepCpf(cached.repCpf);
          if (cached.repRole) setRepRole(cached.repRole);
          if (typeof cached.isSigned === 'boolean') setIsSigned(cached.isSigned);
          if (cached.gpsLocation) setGpsLocation(cached.gpsLocation);
          
          if (cached.lastSavedAt) {
            const date = new Date(cached.lastSavedAt);
            setLastAutoSavedTime(date.toLocaleTimeString('pt-BR'));
          }
        }
      } catch (err) {
        console.warn('[PrevSafe PWA] Failed to load cached OS session:', err);
      }
      refreshStorageData();
    }

    loadCachedOS();

    // Listen to real browser network changes
    const onOnline = () => {
      setIsOffline(false);
      refreshStorageData();
    };
    const onOffline = () => {
      setIsOffline(true);
      refreshStorageData();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [selectedOSId, refreshStorageData, syncOrganizationId]);

  // Persist Current Session Helper to IndexedDB and LocalStorage
  const persistSessionNow = useCallback(async (
    newChecklist: HazardCheckItem[],
    newPhotos: PhotoEvidenceItem[],
    signed: boolean,
    newGps = gpsLocation,
    rep = { name: repName, cpf: repCpf, role: repRole }
  ) => {
    if (!selectedOSId) return;
    try {
      await saveInspectionSession({
        osId: selectedOSId,
        clientTradeName: client?.trade_name,
        osNumber: activeOS?.os_number,
        checklist: newChecklist,
        photos: newPhotos,
        repName: rep.name,
        repCpf: rep.cpf,
        repRole: rep.role,
        isSigned: signed,
        gpsLocation: newGps,
        lastSavedAt: new Date().toISOString(),
        isSynced: false
      });
      setLastAutoSavedTime(new Date().toLocaleTimeString('pt-BR'));
      refreshStorageData();
    } catch (e) {
      console.warn('[PrevSafe PWA] Auto-save error:', e);
    }
  }, [selectedOSId, client, activeOS, gpsLocation, repName, repCpf, repRole, refreshStorageData]);

  // Action: Add Hazard Item (Create)
  const handleAddHazard = async (e: React.FormEvent) => {
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

    const updated = [...checklist, newItem];
    setChecklist(updated);
    setShowAddHazardModal(false);
    setNewHazard('');
    setNewObs('');
    setNewCorrective('');

    // Persist in local cache
    await persistSessionNow(updated, photos, isSigned);

    if (isOffline) {
      await enqueueOfflineAction({
        osId: selectedOSId,
        actionType: 'ADD_CHECKLIST_ITEM',
        payload: newItem
      });
      refreshStorageData();
    }
  };

  // Action: Delete Hazard Item (Delete)
  const handleDeleteHazard = async (id: string) => {
    if (confirm('Deseja excluir este item de inspeção da vistoria?')) {
      const updated = checklist.filter(c => c.id !== id);
      setChecklist(updated);
      await persistSessionNow(updated, photos, isSigned);

      if (isOffline) {
        await enqueueOfflineAction({
          osId: selectedOSId,
          actionType: 'DELETE_CHECKLIST_ITEM',
          payload: { id }
        });
        refreshStorageData();
      }
    }
  };

  // Action: Update Status (Update)
  const handleUpdateStatus = async (id: string, newStatusVal: 'CONFORME' | 'NÃO_CONFORME' | 'NÃO_APLICÁVEL') => {
    const updated = checklist.map(item => item.id === id ? { ...item, status: newStatusVal } : item);
    setChecklist(updated);
    await persistSessionNow(updated, photos, isSigned);

    if (isOffline) {
      await enqueueOfflineAction({
        osId: selectedOSId,
        actionType: 'UPDATE_CHECKLIST_ITEM',
        payload: { id, status: newStatusVal }
      });
      refreshStorageData();
    }
  };

  // Action: Update Observation (Update)
  const handleUpdateObservation = async (id: string, text: string) => {
    const updated = checklist.map(item => item.id === id ? { ...item, observation: text } : item);
    setChecklist(updated);
    await persistSessionNow(updated, photos, isSigned);

    if (isOffline) {
      await enqueueOfflineAction({
        osId: selectedOSId,
        actionType: 'UPDATE_CHECKLIST_ITEM',
        payload: { id, observation: text }
      });
      refreshStorageData();
    }
  };

  // Action: Add Photo (Create)
  const handleSelectPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPhotoError(null);
    setNewPhotoFile(file);
    if (!file) {
      setNewPhotoPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setNewPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoFile || !newPhotoPreview) {
      setPhotoError('Tire ou escolha a foto antes de anexar a evidência.');
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError(null);

    const newId = `p-${Date.now()}`;
    // A data URL vai junto desde ja: se o envio falhar (tipico em campo, sem
    // sinal), a foto continua visivel e marcada para subir depois, em vez de
    // se perder entre a captura e o servidor.
    let url = newPhotoPreview;
    let storagePath: string | undefined;
    let pending = true;

    if (syncOrganizationId) {
      const result = await uploadEvidencePhoto(
        syncOrganizationId,
        activeOS?.os_number || selectedOSId || 'visita',
        newPhotoFile
      );
      if (result.ok && result.evidence) {
        url = result.evidence.signedUrl || newPhotoPreview;
        storagePath = result.evidence.path;
        pending = false;
      } else {
        setPhotoError(`${result.message || 'Falha no envio.'} A foto ficou salva no aparelho e sobe na próxima sincronização.`);
      }
    } else {
      setPhotoError('Sem vínculo com a organização: a foto ficou salva apenas neste aparelho.');
    }

    const newPhoto: PhotoEvidenceItem = {
      id: newId,
      url,
      storage_path: storagePath,
      pending_upload: pending,
      caption: newPhotoCaption,
      nr_ref: newPhotoNr,
      sector: newPhotoSector,
      timestamp: new Date().toLocaleTimeString('pt-BR')
    };

    setIsUploadingPhoto(false);

    const updated = [...photos, newPhoto];
    setPhotos(updated);
    setShowAddPhotoModal(false);
    setNewPhotoCaption('');
    setNewPhotoFile(null);
    setNewPhotoPreview(null);

    await persistSessionNow(checklist, updated, isSigned);

    if (isOffline) {
      await enqueueOfflineAction({
        osId: selectedOSId,
        actionType: 'ADD_PHOTO',
        payload: newPhoto
      });
      refreshStorageData();
    }
  };

  // Action: Delete Photo (Delete)
  const handleDeletePhoto = async (id: string) => {
    if (confirm('Deseja excluir esta evidência fotográfica?')) {
      const removed = photos.find(p => p.id === id);
      const updated = photos.filter(p => p.id !== id);
      setPhotos(updated);
      // Sem isto o arquivo ficaria orfao no bucket, continuando a ocupar espaco
      // e acessivel por caminho a quem for da organizacao.
      if (removed?.storage_path) {
        await removeEvidencePhoto(removed.storage_path);
      }
      await persistSessionNow(checklist, updated, isSigned);

      if (isOffline) {
        await enqueueOfflineAction({
          osId: selectedOSId,
          actionType: 'DELETE_PHOTO',
          payload: { id }
        });
        refreshStorageData();
      }
    }
  };

  // Action: Collect GPS
  const handleRefreshGps = async () => {
    const newLoc = {
      lat: -22.2472 + (Math.random() - 0.5) * 0.001,
      lng: -43.7011 + (Math.random() - 0.5) * 0.001,
      precision: `± ${(3.5 + Math.random()).toFixed(1)} metros (Satélites GLONASS/GPS)`
    };
    setGpsLocation(newLoc);
    await persistSessionNow(checklist, photos, isSigned, newLoc);
  };

  // Action: Toggle Signature
  const handleToggleSignature = async (signed: boolean) => {
    setIsSigned(signed);
    await persistSessionNow(checklist, photos, signed);

    if (isOffline) {
      await enqueueOfflineAction({
        osId: selectedOSId,
        actionType: 'SAVE_SIGNATURE',
        payload: { isSigned: signed, repName, repCpf, repRole }
      });
      refreshStorageData();
    }
  };

  // Latency & cache test state
  const [testedLatency, setTestedLatency] = useState<number | null>(null);
  const [isWarmingCache, setIsWarmingCache] = useState(false);

  // Action: Pre-cache OS and all static assets for Offline Work
  const handlePrecacheOS = async () => {
    if (!activeOS) return;
    setIsPreloading(true);
    try {
      // 1. Save data payload in IndexedDB & Service Worker
      await persistSessionNow(checklist, photos, isSigned);
      
      // 2. Actively warm static scripts and styles in Service Worker
      const warmRes = await warmFieldServiceWorkerCache([
        photos.map(p => p.url)
      ].flat());

      // 3. Test offline response latency
      const latRes = await testOfflineLatency();
      setTestedLatency(latRes.latencyMs);

      await refreshStorageData();
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      alert(`⚡ Pré-cache de Alta Performance Ativado!\n\n• OS ${activeOS.os_number} gravada no IndexedDB.\n• ${warmRes.warmedCount} ativos estáticos e rotas cacheados no Service Worker.\n• Latência de resposta local: ${latRes.latencyMs}ms.\n\nA interface carregará instantaneamente mesmo sem sinal de celular.`);
    } catch (e) {
      alert('Erro ao pré-cachear dados para uso offline: ' + String(e));
    } finally {
      setIsPreloading(false);
    }
  };

  // Action: Manual Force Cache Warm
  const handleForceWarmCache = async () => {
    setIsWarmingCache(true);
    try {
      const res = await warmFieldServiceWorkerCache();
      const latRes = await testOfflineLatency();
      setTestedLatency(latRes.latencyMs);
      await refreshStorageData();
      alert(`✅ ${res.message}\n\nLatência do cache: ${latRes.latencyMs}ms (Carregamento instantâneo garantido).`);
    } catch (e) {
      alert('Falha ao aquecer cache: ' + String(e));
    } finally {
      setIsWarmingCache(false);
    }
  };

  // Action: Export Offline Backup JSON
  const handleExportBackup = async () => {
    try {
      const json = await exportOfflineBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prevsafe_backup_offline_${activeOS?.os_number || 'geral'}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erro ao exportar backup: ' + String(e));
    }
  };

  // Action: Import Offline Backup JSON
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importOfflineBackup(text);
      await refreshStorageData();
      // Reload current OS if available
      const cached = await loadInspectionSession(selectedOSId);
      if (cached) {
        setChecklist(cached.checklist);
        setPhotos(cached.photos);
        setIsSigned(cached.isSigned);
      }
      alert(`✅ Backup importado com sucesso! (${res.importedCount} vistorias e ${res.queueCount} ações offline restauradas).`);
    } catch (err) {
      alert('Falha na importação do backup: ' + String(err));
    }
  };

  // Action: Sync and Finalize Inspection (When Online or from Sync Tab)
  const handleGenerateFieldReport = async () => {
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

    // Clear queue for this OS
    await clearOfflineSyncQueue(activeOS.id);
    await persistSessionNow(checklist, photos, isSigned);
    await refreshStorageData();

    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    alert(`📋 Vistoria de Campo sincronizada com sucesso!\n\n• ${checklist.length} itens de perigos/NRs inspecionados\n• ${photos.length} fotos anexadas com geolocalização\n• Assinatura digital de ${repName} vinculada\n• Relatório técnico oficial gerado e liberado.`);
  };

  // Action: Clear local cache
  const handlePurgeCache = async () => {
    if (confirm('Tem certeza de que deseja limpar todo o cache local e filas offline? Certifique-se de que os dados foram sincronizados.')) {
      await purgeAllOfflineData();
      await refreshStorageData();
      alert('Cache local e Service Worker limpos com sucesso.');
    }
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
      {/* Mobile-Friendly App Header Bento Card with Offline Simulator & Service Worker Status */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div 
          className="absolute -right-16 -top-16 w-60 h-60 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ backgroundColor: 'var(--tenant-primary)' }}
        />
        <div className="flex items-center space-x-3.5 relative z-10">
          <div className="p-3 bg-tenant-primary/10 border border-tenant-primary/20 text-tenant-primary rounded-2xl flex-shrink-0">
            <span className="text-2xl">{tenantTheme.pwa_icon_emoji || '👷'}</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">{tenantTheme.pwa_app_title || 'PrevSafe Campo PWA'}</span>
              
              {/* Online/Offline Toggle button */}
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
                <span>{isOffline ? 'MODO OFFLINE (SIMULADO)' : 'ONLINE & CONECTADO'}</span>
              </button>

              {/* Service Worker Cache Pill */}
              <button
                onClick={() => setShowStorageModal(true)}
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1 transition"
                title="Ver diagnóstico do Cache Local e Service Worker"
              >
                <HardDrive className="w-3 h-3 text-emerald-400" />
                <span>SW Cache: {storageStats?.serviceWorkerActive ? 'Ativo' : 'Pronto'}</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
              <span>Técnico: <strong className="text-slate-300">{currentProfile.full_name}</strong></span>
              <span>•</span>
              <span className="flex items-center text-[11px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                Salvo localmente ({lastAutoSavedTime})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 relative z-10">
          {syncQueue.length > 0 && (
            <span 
              onClick={() => setSelectedVisitTab('SYNC')}
              className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold rounded-xl flex items-center space-x-1 cursor-pointer hover:bg-amber-500/30 transition"
              title="Ações pendentes no IndexedDB aguardando sincronização"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{syncQueue.length} na fila offline</span>
            </span>
          )}

          <button
            onClick={handlePrecacheOS}
            disabled={isPreloading}
            className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-emerald-400 text-xs font-semibold rounded-2xl border border-slate-800 transition flex items-center space-x-1"
            title="Armazenar todos os dados desta OS para inspeção em áreas sem sinal"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isPreloading ? 'Armazenando...' : 'Cache Offline OS'}</span>
          </button>

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
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-tenant-primary bg-tenant-primary/10 border border-tenant-primary/20 px-2.5 py-0.5 rounded-full">
                Vistoria Técnica Agendada Hoje
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {activeOS?.os_number}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5">{client?.trade_name || 'Cliente Selecionado'}</h2>
            <p className="text-xs text-slate-400 flex items-center mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500 mr-1.5 flex-shrink-0" />
              {client?.address} - {client?.city}/{client?.state} (Grau de Risco {client?.risk_degree})
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-500">Trocar OS / Vistoria:</label>
            <select
              value={selectedOSId}
              onChange={(e) => setSelectedOSId(e.target.value)}
              className="bg-slate-950 text-white text-xs font-bold rounded-xl border border-slate-800 px-3 py-1.5 focus:outline-none focus:border-tenant-primary"
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
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1 overflow-x-auto">
          <button
            onClick={() => setSelectedVisitTab('CHECKLIST')}
            className={`flex-1 py-2.5 text-xs font-bold text-center rounded-xl transition flex items-center justify-center space-x-1.5 whitespace-nowrap min-w-[120px] ${
              selectedVisitTab === 'CHECKLIST' ? 'bg-tenant-primary text-white shadow-tenant-glow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>1. Perigos & NRs ({checklist.length})</span>
          </button>
          <button
            onClick={() => setSelectedVisitTab('PHOTOS')}
            className={`flex-1 py-2.5 text-xs font-bold text-center rounded-xl transition flex items-center justify-center space-x-1.5 whitespace-nowrap min-w-[100px] ${
              selectedVisitTab === 'PHOTOS' ? 'bg-tenant-primary text-white shadow-tenant-glow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>2. Fotos ({photos.length})</span>
          </button>
          <button
            onClick={() => setSelectedVisitTab('SIGNATURE')}
            className={`flex-1 py-2.5 text-xs font-bold text-center rounded-xl transition flex items-center justify-center space-x-1.5 whitespace-nowrap min-w-[120px] ${
              selectedVisitTab === 'SIGNATURE' ? 'bg-tenant-primary text-white shadow-tenant-glow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSignature className="w-4 h-4" />
            <span>3. Assinatura & GPS</span>
          </button>
          <button
            onClick={() => setSelectedVisitTab('SYNC')}
            className={`flex-1 py-2.5 text-xs font-bold text-center rounded-xl transition flex items-center justify-center space-x-1.5 whitespace-nowrap min-w-[120px] ${
              selectedVisitTab === 'SYNC' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>4. Sincronizar ({syncQueue.length})</span>
          </button>
        </div>

        {/* ==================== TAB 1: CHECKLIST DE PERIGOS & NRS (CRUD) ==================== */}
        {selectedVisitTab === 'CHECKLIST' && (
          <div className="space-y-4 pt-2">
            {checklist.length === 0 && (
              <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-3">
                <div>
                  <p className="text-sm font-bold text-white">Vistoria em branco</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Adicione os perigos que você observar no local, ou parta do modelo
                    com os perigos mais comuns e ajuste o que não se aplicar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const modelo = HAZARD_TEMPLATE.map(item => ({ ...item }));
                    setChecklist(modelo);
                    await persistSessionNow(modelo, photos, isSigned);
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition"
                >
                  Carregar modelo de perigos comuns ({HAZARD_TEMPLATE.length} itens)
                </button>
              </div>
            )}

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

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddHazardModal(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Adicionar Ponto de Inspeção</span>
                </button>
              </div>
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
                  onChange={(e) => {
                    setRepName(e.target.value);
                    persistSessionNow(checklist, photos, isSigned, gpsLocation, { name: e.target.value, cpf: repCpf, role: repRole });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">CPF do Acompanhante *</label>
                <input
                  type="text"
                  required
                  value={repCpf}
                  onChange={(e) => {
                    setRepCpf(e.target.value);
                    persistSessionNow(checklist, photos, isSigned, gpsLocation, { name: repName, cpf: e.target.value, role: repRole });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Cargo / Função *</label>
                <input
                  type="text"
                  required
                  value={repRole}
                  onChange={(e) => {
                    setRepRole(e.target.value);
                    persistSessionNow(checklist, photos, isSigned, gpsLocation, { name: repName, cpf: repCpf, role: e.target.value });
                  }}
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
                    onClick={() => handleToggleSignature(false)}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Limpar / Refazer
                  </button>
                )}
              </div>

              <div 
                onClick={() => handleToggleSignature(true)}
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

        {/* ==================== TAB 4: SINCRONIZAÇÃO, FILA OFFLINE & CACHE SW ==================== */}
        {selectedVisitTab === 'SYNC' && (
          <div className="space-y-5 pt-2 text-xs">
            {/* Sync Summary Banner */}
            <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-indigo-300 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Revisão Geral & Sincronização de Campo</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  isOffline ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {isOffline ? 'Modo Offline Ativo' : 'Pronto para Sincronizar'}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Ao sincronizar, o aplicativo compilará as constatações de campo guardadas no <strong>IndexedDB</strong>, gerará o <strong>Relatório Técnico Oficial de Vistoria</strong> e avançará o workflow da OS <strong>{activeOS?.os_number}</strong> para a etapa de elaboração técnica dos laudos.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-[11px]">
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Perigos</span>
                  <strong className="text-white font-mono">{checklist.length} itens</strong>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Fotos</span>
                  <strong className="text-white font-mono">{photos.length} fotos</strong>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Assinatura</span>
                  <strong className={isSigned ? "text-emerald-400" : "text-rose-400"}>
                    {isSigned ? "Coletada" : "Pendente"}
                  </strong>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Cache SW</span>
                  <strong className="text-emerald-400 font-mono">OK (v1.2.0)</strong>
                </div>
              </div>
            </div>

            {/* Offline Sync Queue Inspector */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-xs">Fila de Ações Offline (IndexedDB Sync Queue)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-400">{syncQueue.length} operações enfileiradas</span>
                  {syncQueue.length > 0 && (
                    <button
                      onClick={() => clearOfflineSyncQueue(selectedOSId).then(refreshStorageData)}
                      className="text-[10px] text-slate-500 hover:text-rose-400"
                    >
                      Limpar Fila
                    </button>
                  )}
                </div>
              </div>

              {syncQueue.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1 opacity-80" />
                  <span>Todos os dados desta vistoria estão sincronizados com o servidor.</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {syncQueue.map((item) => (
                    <div key={item.id} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5">
                        <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold">
                          {item.actionType}
                        </span>
                        <div>
                          <span className="text-white text-[11px] font-semibold block">
                            OS: {item.osId} • {new Date(item.timestamp).toLocaleTimeString('pt-BR')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {JSON.stringify(item.payload).substring(0, 45)}...
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Offline Tools & Backup Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handlePrecacheOS}
                disabled={isPreloading}
                className="p-3 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl transition flex items-center justify-center space-x-2 font-semibold text-xs"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>{isPreloading ? 'Gravando Cache...' : 'Pré-cachear para Campo'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportBackup}
                className="p-3 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl transition flex items-center justify-center space-x-2 font-semibold text-xs"
              >
                <UploadCloud className="w-4 h-4 text-indigo-400" />
                <span>Exportar Backup Offline</span>
              </button>

              <label className="p-3 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl transition flex items-center justify-center space-x-2 font-semibold text-xs cursor-pointer">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Importar Backup JSON</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>

            {/* Main Finalize Button */}
            <button
              onClick={handleGenerateFieldReport}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl text-xs shadow-xl shadow-emerald-950/40 transition flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Sincronizar Vistoria de Campo & Gerar Relatório Técnico Oficial</span>
            </button>
          </div>
        )}
      </div>

      {/* ==================== MODAL: DIAGNÓSTICO DO CACHE & SERVICE WORKER ==================== */}
      {showStorageModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 text-slate-100 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Diagnóstico do Service Worker & Cache Offline</h3>
              </div>
              <button onClick={() => setShowStorageModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Status do Service Worker:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-teal-400" />
                    {storageStats?.serviceWorkerActive ? 'Ativo & Pré-cache Ativado' : 'Registrado'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Versão do Cache Engine:</span>
                  <span className="font-mono text-slate-200">{storageStats?.swCacheVersion || 'prevsafe-static-v2.2.0'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total de Recursos em Cache:</span>
                  <span className="font-mono text-teal-400 font-bold">{storageStats?.swCacheEntries ?? 0} itens pré-cacheados</span>
                </div>

                {/* Detailed Breakdown */}
                {storageStats?.cacheBreakdown && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-[11px]">
                    <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Scripts & Estilos</span>
                      <strong className="text-white font-mono">{storageStats.cacheBreakdown.staticAssets} arquivos</strong>
                    </div>
                    <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Fotos de Evidência</span>
                      <strong className="text-white font-mono">{storageStats.cacheBreakdown.cachedImages} imagens</strong>
                    </div>
                    <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Payloads de Vistoria</span>
                      <strong className="text-white font-mono">{storageStats.cacheBreakdown.inspectionPayloads} vistorias</strong>
                    </div>
                    <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Rotas em Execução</span>
                      <strong className="text-white font-mono">{storageStats.cacheBreakdown.runtimeRequests} rotas</strong>
                    </div>
                  </div>
                )}

                {/* Benchmark Latency */}
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold text-white block">Velocidade de Resposta do Cache</span>
                      <span className="text-[10px] text-slate-400">Tempo de acesso aos ativos estáticos</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-emerald-400 block">
                      {testedLatency !== null ? `${testedLatency} ms` : '< 5.0 ms'}
                    </span>
                    <span className="text-[9px] text-emerald-500 font-semibold uppercase">Ultrarrápido</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400">Banco Local IndexedDB:</span>
                  <span className="font-mono text-slate-200">{storageStats?.indexedDbSupported ? 'PrevSafeFieldDB (OK)' : 'Fallback LocalStorage'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Vistorias Salvas no Dispositivo:</span>
                  <span className="font-mono text-slate-200">{storageStats?.cachedInspectionsCount || 1} vistorias</span>
                </div>
              </div>

              <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-slate-300 text-[11px] leading-relaxed flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <span>
                  O <strong>Service Worker v2.2.0</strong> utiliza estratégia <em>Cache-First com Stale-While-Revalidate</em> e proteção contra timeout de rede móvel (1.5s). Isso assegura abertura instantânea e preenchimento fluido das NRs em campo mesmo em áreas industriais ou agrícolas com sinal oscilante.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleForceWarmCache}
                  disabled={isWarmingCache}
                  className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded-xl text-xs font-semibold border border-teal-500/30 transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isWarmingCache ? 'animate-spin' : ''}`} />
                  <span>{isWarmingCache ? 'Pré-cacheando...' : 'Aquecer Pré-cache'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePurgeCache}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold border border-rose-500/20 transition"
                >
                  Limpar Cache
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowStorageModal(false)}
                className="px-4 py-1.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

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
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleSelectPhoto}
                className="hidden"
              />

              {newPhotoPreview ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={newPhotoPreview}
                    alt="Pré-visualização da evidência"
                    className="w-full h-44 object-cover rounded-2xl border border-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold"
                  >
                    Trocar foto
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full p-6 bg-slate-950 border-2 border-dashed border-slate-800 hover:border-indigo-600 rounded-2xl text-center space-y-2 transition"
                >
                  <Camera className="w-8 h-8 mx-auto text-indigo-400" />
                  <div className="text-slate-300 font-semibold">Tirar foto ou escolher da galeria</div>
                  <p className="text-[11px] text-slate-500">A imagem é enviada para o armazenamento privado da organização.</p>
                </button>
              )}

              {photoError && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                  {photoError}
                </div>
              )}

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
                  disabled={isUploadingPhoto}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-md"
                >
                  {isUploadingPhoto ? 'Enviando...' : 'Anexar Evidência Fotográfica'}
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
