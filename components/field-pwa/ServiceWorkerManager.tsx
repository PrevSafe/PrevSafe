'use client';

import React, { useEffect, useState } from 'react';
import { 
  registerFieldServiceWorker, 
  getOfflineStorageStats, 
  warmFieldServiceWorkerCache,
  testOfflineLatency,
  OfflineStorageStats 
} from '@/lib/pwaStorage';
import { Wifi, WifiOff, HardDrive, RefreshCw, Zap, CheckCircle2, Shield } from 'lucide-react';

export const ServiceWorkerManager: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? navigator.onLine : true;
  });
  const [swRegistered, setSwRegistered] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string>('');
  const [bannerType, setBannerType] = useState<'INFO' | 'SUCCESS' | 'OFFLINE'>('INFO');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => {
        setIsOnline(true);
        setBannerType('SUCCESS');
        setBannerMessage('Conexão restabelecida! A fila offline está pronta para sincronização.');
        setShowBanner(true);
        setTimeout(() => setShowBanner(false), 5000);
      };

      const handleOffline = () => {
        setIsOnline(false);
        setBannerType('OFFLINE');
        setBannerMessage('Você está desconectado. O Service Worker e o Cache Local (IndexedDB) manterão o checklist gravado com carregamento instantâneo.');
        setShowBanner(true);
        setTimeout(() => setShowBanner(false), 6000);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // 2. Register Service Worker & measure cache response latency
      registerFieldServiceWorker().then((registered) => {
        setSwRegistered(registered);
        if (registered) {
          testOfflineLatency().then(metrics => {
            setLatencyMs(metrics.latencyMs);
          });
        }
      });

      // 3. Listen for SW messages
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SW_ACTIVATED') {
            setBannerType('SUCCESS');
            setBannerMessage('Pré-cache de ativos estáticos ativado! Tempo de carregamento da interface otimizado para <10ms.');
            setShowBanner(true);
            setTimeout(() => setShowBanner(false), 4500);
          } else if (event.data?.type === 'SERVICE_WORKER_SYNC_TRIGGERED') {
            setBannerType('INFO');
            setBannerMessage('Service Worker ativou a sincronização de dados de campo em segundo plano.');
            setShowBanner(true);
            setTimeout(() => setShowBanner(false), 4000);
          }
        });
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl shadow-2xl flex items-start space-x-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className={`p-2 rounded-xl flex-shrink-0 ${
        bannerType === 'OFFLINE' ? 'bg-amber-500/20 text-amber-400' :
        bannerType === 'SUCCESS' ? 'bg-teal-500/20 text-teal-400' :
        'bg-indigo-500/20 text-indigo-400'
      }`}>
        {bannerType === 'OFFLINE' ? <WifiOff className="w-5 h-5" /> : 
         bannerType === 'SUCCESS' ? <Zap className="w-5 h-5" /> :
         <Wifi className="w-5 h-5" />}
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-white">{isOnline ? 'Conectado à Rede' : 'Modo Offline Ativado'}</span>
          <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-teal-300 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-teal-400" />
            {swRegistered ? `Pré-cache Ativo ${latencyMs !== null ? `(${latencyMs}ms)` : ''}` : 'Cache Local'}
          </span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">{bannerMessage}</p>
      </div>
      <button 
        onClick={() => setShowBanner(false)}
        className="text-slate-500 hover:text-slate-300 text-xs p-1"
      >
        ✕
      </button>
    </div>
  );
};
