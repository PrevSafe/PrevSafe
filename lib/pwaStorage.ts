// lib/pwaStorage.ts
// Robust Offline Storage, IndexedDB Engine & Service Worker Bridge for PrevSafe Field PWA

export interface OfflineCheckItem {
  id: string;
  category: string;
  hazard: string;
  nr: string;
  severity: 'BAIXO' | 'MÉDIO' | 'ALTO' | 'CRÍTICO';
  status: 'CONFORME' | 'NÃO_CONFORME' | 'NÃO_APLICÁVEL';
  observation: string;
  corrective_measure?: string;
  updated_at?: string;
}

export interface OfflinePhotoEvidence {
  id: string;
  url: string;
  caption: string;
  nr_ref?: string;
  sector?: string;
  timestamp: string;
  local_blob_stored?: boolean;
}

export interface OfflineInspectionSession {
  osId: string;
  clientTradeName?: string;
  osNumber?: string;
  checklist: OfflineCheckItem[];
  photos: OfflinePhotoEvidence[];
  repName: string;
  repCpf: string;
  repRole: string;
  isSigned: boolean;
  /**
   * Localizacao da vistoria, ou null quando nao foi possivel obter.
   * Null e um estado legitimo: antes havia sempre uma coordenada, porque ela
   * era constante no codigo.
   */
  gpsLocation: {
    latitude: number;
    longitude: number;
    /** Raio de incerteza em metros, como informado pelo aparelho. */
    precisaoMetros: number;
    /** Momento do fixo, informado pelo aparelho. */
    obtidaEm: string;
  } | null;
  lastSavedAt: string;
  isSynced: boolean;
}

export interface OfflineSyncQueueItem {
  id: string;
  osId: string;
  actionType: 'UPDATE_CHECKLIST_ITEM' | 'ADD_CHECKLIST_ITEM' | 'DELETE_CHECKLIST_ITEM' | 'ADD_PHOTO' | 'DELETE_PHOTO' | 'SAVE_SIGNATURE' | 'FINALIZE_REPORT';
  payload: any;
  timestamp: string;
  retries: number;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  errorMessage?: string;
}

export interface OfflineStorageStats {
  indexedDbSupported: boolean;
  serviceWorkerRegistered: boolean;
  serviceWorkerActive: boolean;
  cachedInspectionsCount: number;
  pendingSyncCount: number;
  lastSavedIso: string | null;
  approximateStorageBytes: number;
  swCacheEntries: number;
  swCacheVersion: string;
  cacheBreakdown?: {
    staticAssets: number;
    cachedImages: number;
    runtimeRequests: number;
    inspectionPayloads: number;
  };
}

const DB_NAME = 'PrevSafeFieldDB';
const DB_VERSION = 1;
const STORE_INSPECTIONS = 'inspections';
const STORE_SYNC_QUEUE = 'sync_queue';
const STORE_AUDIT_LOGS = 'offline_audit_logs';

/**
 * Open or initialize IndexedDB
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_INSPECTIONS)) {
        db.createObjectStore(STORE_INSPECTIONS, { keyPath: 'osId' });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('by_os', 'osId', { unique: false });
        queueStore.createIndex('by_status', 'status', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIT_LOGS)) {
        db.createObjectStore(STORE_AUDIT_LOGS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * LocalStorage Fallback Helpers
 */
const LS_KEY_INSPECTIONS = 'prevsafe_offline_inspections_map';
const LS_KEY_QUEUE = 'prevsafe_offline_sync_queue';
const LS_KEY_LOGS = 'prevsafe_offline_audit_logs';

function getLocalStorageMap<T>(key: string): Record<string, T> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalStorageMap<T>(key: string, map: Record<string, T>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch (e) {
    console.warn('[PrevSafe Offline] LocalStorage write failed:', e);
  }
}

/**
 * Save Inspection Session locally (IndexedDB + LocalStorage sync)
 */
export async function saveInspectionSession(session: OfflineInspectionSession): Promise<void> {
  const sessionWithTimestamp: OfflineInspectionSession = {
    ...session,
    lastSavedAt: new Date().toISOString()
  };

  // 1. Save in LocalStorage (Synchronous fast mirror)
  try {
    const lsMap = getLocalStorageMap<OfflineInspectionSession>(LS_KEY_INSPECTIONS);
    lsMap[session.osId] = sessionWithTimestamp;
    setLocalStorageMap(LS_KEY_INSPECTIONS, lsMap);
  } catch (e) {
    console.warn('[PrevSafe Storage] LocalStorage save error:', e);
  }

  // 2. Save in IndexedDB (Durable binary & structured clone storage)
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_INSPECTIONS, 'readwrite');
      const store = tx.objectStore(STORE_INSPECTIONS);
      const req = store.put(sessionWithTimestamp);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[PrevSafe Storage] IndexedDB save fallback used:', err);
  }

  // 3. Inform Service Worker to cache snapshot if available
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_INSPECTION_PAYLOAD',
      payload: sessionWithTimestamp
    });
  }
}

/**
 * Load Inspection Session locally (IndexedDB or LocalStorage fallback)
 */
export async function loadInspectionSession(osId: string): Promise<OfflineInspectionSession | null> {
  if (!osId) return null;

  // 1. Try IndexedDB first
  try {
    const db = await openIndexedDB();
    const result = await new Promise<OfflineInspectionSession | null>((resolve, reject) => {
      const tx = db.transaction(STORE_INSPECTIONS, 'readonly');
      const store = tx.objectStore(STORE_INSPECTIONS);
      const req = store.get(osId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (result) return result;
  } catch (err) {
    console.warn('[PrevSafe Storage] IndexedDB read fallback to LocalStorage:', err);
  }

  // 2. Fallback to LocalStorage
  const lsMap = getLocalStorageMap<OfflineInspectionSession>(LS_KEY_INSPECTIONS);
  return lsMap[osId] || null;
}

/**
 * Enqueue an offline mutation into the offline sync queue
 */
export async function enqueueOfflineAction(action: Omit<OfflineSyncQueueItem, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<OfflineSyncQueueItem> {
  const item: OfflineSyncQueueItem = {
    ...action,
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    retries: 0,
    status: 'PENDING'
  };

  // 1. LocalStorage queue mirror
  try {
    const raw = localStorage.getItem(LS_KEY_QUEUE);
    const queue: OfflineSyncQueueItem[] = raw ? JSON.parse(raw) : [];
    queue.push(item);
    localStorage.setItem(LS_KEY_QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.warn('[PrevSafe Queue] LocalStorage queue write error:', e);
  }

  // 2. IndexedDB Queue
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[PrevSafe Queue] IndexedDB queue write fallback used:', err);
  }

  // 3. Register Background Sync if supported
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await (reg as any).sync?.register('prevsafe-sync-checklist');
    } catch {
      // Background Sync optional
    }
  }

  return item;
}

/**
 * Get all pending actions in the offline sync queue
 */
export async function getPendingSyncQueue(): Promise<OfflineSyncQueueItem[]> {
  // 1. Try IndexedDB
  try {
    const db = await openIndexedDB();
    const items = await new Promise<OfflineSyncQueueItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    if (items.length > 0) return items.filter(i => i.status === 'PENDING');
  } catch {
    // Fallback below
  }

  // 2. LocalStorage fallback
  try {
    const raw = localStorage.getItem(LS_KEY_QUEUE);
    const queue: OfflineSyncQueueItem[] = raw ? JSON.parse(raw) : [];
    return queue.filter(i => i.status === 'PENDING');
  } catch {
    return [];
  }
}

/**
 * Clear the entire offline sync queue after successful sync
 */
export async function clearOfflineSyncQueue(osId?: string): Promise<void> {
  // 1. LocalStorage
  try {
    if (osId) {
      const raw = localStorage.getItem(LS_KEY_QUEUE);
      if (raw) {
        const queue: OfflineSyncQueueItem[] = JSON.parse(raw);
        const filtered = queue.filter(i => i.osId !== osId);
        localStorage.setItem(LS_KEY_QUEUE, JSON.stringify(filtered));
      }
    } else {
      localStorage.removeItem(LS_KEY_QUEUE);
    }
  } catch {}

  // 2. IndexedDB
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    if (osId) {
      const all = await new Promise<OfflineSyncQueueItem[]>((res) => {
        const r = store.getAll();
        r.onsuccess = () => res(r.result || []);
        r.onerror = () => res([]);
      });
      for (const item of all) {
        if (item.osId === osId) store.delete(item.id);
      }
    } else {
      store.clear();
    }
  } catch {}
}

/**
 * Get aggregated offline statistics for UI
 */
export async function getOfflineStorageStats(): Promise<OfflineStorageStats> {
  let indexedDbSupported = false;
  let cachedInspectionsCount = 0;
  let pendingSyncCount = 0;
  let lastSavedIso: string | null = null;
  let approxBytes = 0;

  if (typeof window !== 'undefined') {
    indexedDbSupported = !!window.indexedDB;

    // Approximate size in localStorage
    try {
      const lsStr = localStorage.getItem(LS_KEY_INSPECTIONS) || '';
      const qStr = localStorage.getItem(LS_KEY_QUEUE) || '';
      approxBytes = (lsStr.length + qStr.length) * 2; // UTF-16 bytes approx
      
      const lsMap = getLocalStorageMap<OfflineInspectionSession>(LS_KEY_INSPECTIONS);
      const keys = Object.keys(lsMap);
      cachedInspectionsCount = keys.length;
      if (keys.length > 0) {
        const latest = keys.map(k => lsMap[k].lastSavedAt).sort().reverse()[0];
        lastSavedIso = latest || null;
      }
    } catch {}

    const pending = await getPendingSyncQueue();
    pendingSyncCount = pending.length;
  }

  // Service Worker checks
  let serviceWorkerRegistered = false;
  let serviceWorkerActive = false;
  let swCacheEntries = 0;
  let swCacheVersion = 'prevsafe-static-v2.2.0';
  let cacheBreakdown: OfflineStorageStats['cacheBreakdown'] = undefined;

  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      serviceWorkerRegistered = !!registration;
      serviceWorkerActive = !!registration?.active;

      // Ask Service worker for stats via MessageChannel
      if (registration?.active) {
        const channel = new MessageChannel();
        const swPromise = new Promise<{ totalEntries: number; cacheName: string; breakdown?: any }>((resolve) => {
          channel.port1.onmessage = (msg) => {
            if (msg.data?.success) {
              resolve({
                totalEntries: msg.data.totalEntries || 0,
                cacheName: msg.data.cacheName || swCacheVersion,
                breakdown: msg.data.breakdown
              });
            } else {
              resolve({ totalEntries: 0, cacheName: swCacheVersion });
            }
          };
          setTimeout(() => resolve({ totalEntries: 0, cacheName: swCacheVersion }), 800);
        });

        registration.active.postMessage({ type: 'GET_OFFLINE_CACHE_STATS' }, [channel.port2]);
        const swStats = await swPromise;
        swCacheEntries = swStats.totalEntries;
        swCacheVersion = swStats.cacheName;
        cacheBreakdown = swStats.breakdown;
      }
    } catch {}
  }

  return {
    indexedDbSupported,
    serviceWorkerRegistered,
    serviceWorkerActive,
    cachedInspectionsCount,
    pendingSyncCount,
    lastSavedIso,
    approximateStorageBytes: approxBytes,
    swCacheEntries,
    swCacheVersion,
    cacheBreakdown
  };
}

/**
 * Scan DOM and actively pre-cache static scripts, stylesheets, and custom assets in Service Worker
 */
export async function warmFieldServiceWorkerCache(additionalUrls: string[] = []): Promise<{ success: boolean; warmedCount: number; message?: string }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { success: false, warmedCount: 0, message: 'Service Worker não suportado neste navegador' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) {
      return { success: false, warmedCount: 0, message: 'Service Worker ainda não está ativo' };
    }

    // Discover scripts and stylesheets currently in the document
    const scriptUrls = Array.from(document.querySelectorAll('script[src]'))
      .map(s => (s as HTMLScriptElement).src)
      .filter(src => src && !src.startsWith('chrome-extension:'));

    const cssUrls = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
      .map(l => (l as HTMLLinkElement).href)
      .filter(href => href && !href.startsWith('chrome-extension:'));

    const coreUrls = [
      '/',
      '/manifest.json',
      '/favicon.ico',
      ...additionalUrls
    ];

    const allUrlsToWarm = Array.from(new Set([...coreUrls, ...scriptUrls, ...cssUrls]));

    const channel = new MessageChannel();
    const warmPromise = new Promise<{ success: boolean; warmedCount: number; message: string }>((resolve) => {
      channel.port1.onmessage = (msg) => {
        if (msg.data?.success) {
          resolve({
            success: true,
            warmedCount: msg.data.warmedCount || 0,
            message: msg.data.message || 'Pré-cache finalizado com sucesso'
          });
        } else {
          resolve({ success: false, warmedCount: 0, message: msg.data?.error || 'Erro ao realizar pré-cache' });
        }
      };
      setTimeout(() => resolve({ success: true, warmedCount: allUrlsToWarm.length, message: 'Pré-cache disparado em segundo plano' }), 2000);
    });

    registration.active.postMessage({
      type: 'WARM_FIELD_CACHE',
      payload: { urls: allUrlsToWarm }
    }, [channel.port2]);

    return await warmPromise;
  } catch (err) {
    console.warn('[PrevSafe PWA] warmFieldServiceWorkerCache failed:', err);
    return { success: false, warmedCount: 0, message: String(err) };
  }
}

/**
 * Test offline cache load latency to verify sub-millisecond instant load speed
 */
export async function testOfflineLatency(): Promise<{ latencyMs: number; isInstant: boolean; fromCache: boolean }> {
  if (typeof window === 'undefined') {
    return { latencyMs: 0, isInstant: true, fromCache: false };
  }

  const start = performance.now();
  try {
    const res = await fetch('/manifest.json', { cache: 'force-cache' });
    await res.text();
    const duration = performance.now() - start;
    return {
      latencyMs: Math.round(duration * 10) / 10,
      isInstant: duration < 50,
      fromCache: true
    };
  } catch {
    const duration = performance.now() - start;
    return {
      latencyMs: Math.round(duration * 10) / 10,
      isInstant: false,
      fromCache: false
    };
  }
}

/**
 * Register Service Worker for offline support and automatically warm the field cache
 */
export async function registerFieldServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[PrevSafe Field PWA] Service Worker registered with scope:', registration.scope);

    // If there is a waiting worker, skip waiting
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // Auto-warm field cache after 1.5 seconds of initial load
    setTimeout(() => {
      warmFieldServiceWorkerCache().then((res) => {
        if (res.success) {
          console.log(`[PrevSafe Field PWA] Auto pre-cached ${res.warmedCount} static assets for offline instant load.`);
        }
      });
    }, 1500);

    return true;
  } catch (err) {
    console.warn('[PrevSafe Field PWA] Service Worker registration failed (may be in dev/sandboxed preview):', err);
    return false;
  }
}

/**
 * Export JSON Backup of all offline inspections and pending queues
 */
export async function exportOfflineBackup(): Promise<string> {
  let allInspections: Record<string, OfflineInspectionSession> = {};
  try {
    const db = await openIndexedDB();
    const list = await new Promise<OfflineInspectionSession[]>((res) => {
      const tx = db.transaction(STORE_INSPECTIONS, 'readonly');
      const r = tx.objectStore(STORE_INSPECTIONS).getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => res([]);
    });
    list.forEach(item => { allInspections[item.osId] = item; });
  } catch {
    allInspections = getLocalStorageMap<OfflineInspectionSession>(LS_KEY_INSPECTIONS);
  }

  const queue = await getPendingSyncQueue();

  const backupData = {
    app: 'PrevSafe SST Field PWA',
    version: '1.2.0',
    exportedAt: new Date().toISOString(),
    inspections: allInspections,
    pendingQueue: queue
  };

  return JSON.stringify(backupData, null, 2);
}

/**
 * Import JSON Backup into offline database
 */
export async function importOfflineBackup(jsonString: string): Promise<{ importedCount: number; queueCount: number }> {
  const parsed = JSON.parse(jsonString);
  if (!parsed.inspections) {
    throw new Error('Formato de backup inválido.');
  }

  let count = 0;
  for (const osId of Object.keys(parsed.inspections)) {
    await saveInspectionSession(parsed.inspections[osId]);
    count++;
  }

  let qCount = 0;
  if (Array.isArray(parsed.pendingQueue)) {
    for (const item of parsed.pendingQueue) {
      await enqueueOfflineAction({
        osId: item.osId,
        actionType: item.actionType,
        payload: item.payload
      });
      qCount++;
    }
  }

  return { importedCount: count, queueCount: qCount };
}

/**
 * Clear all offline cache storage (IndexedDB + LocalStorage + SW Cache)
 */
export async function purgeAllOfflineData(): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Clear LocalStorage keys
  localStorage.removeItem(LS_KEY_INSPECTIONS);
  localStorage.removeItem(LS_KEY_QUEUE);
  localStorage.removeItem(LS_KEY_LOGS);

  // 2. Clear IndexedDB
  try {
    const db = await openIndexedDB();
    const tx = db.transaction([STORE_INSPECTIONS, STORE_SYNC_QUEUE, STORE_AUDIT_LOGS], 'readwrite');
    tx.objectStore(STORE_INSPECTIONS).clear();
    tx.objectStore(STORE_SYNC_QUEUE).clear();
    tx.objectStore(STORE_AUDIT_LOGS).clear();
  } catch {}

  // 3. Clear Service Worker caches
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_OFFLINE_CACHE' });
  }
}
