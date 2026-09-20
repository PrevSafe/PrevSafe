'use client';

import React, { useEffect, useRef, useState } from 'react';
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

  // Quando um Service Worker novo assume uma aba que ja estava sendo controlada
  // por um antigo, a pagina aberta continua sendo a versao antiga ate recarregar.
  // Sem este aviso o usuario fica usando um build velho sem nenhum sinal disso -
  // foi assim que a tabela corrigida da NR-04 demorou a chegar.
  const [precisaRecarregar, setPrecisaRecarregar] = useState(false);
  const tinhaControlador = useRef(false);

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

      // 2. Detecta troca de Service Worker numa aba ja controlada
      if ('serviceWorker' in navigator) {
        tinhaControlador.current = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // Na primeira instalacao nao havia controlador: nao ha versao antiga
          // na tela e recarregar seria so um susto.
          if (tinhaControlador.current) setPrecisaRecarregar(true);
        });
      }

      // 3. Register Service Worker & measure cache response latency
      registerFieldServiceWorker().then((registered) => {
        setSwRegistered(registered);
        if (registered) {
          testOfflineLatency().then(metrics => {
            setLatencyMs(metrics.latencyMs);
          });
        }
      });

      // 4. Listen for SW messages
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

  // Tem prioridade sobre os avisos informativos: enquanto nao recarregar, o
  // usuario esta vendo codigo desatualizado.
  if (precisaRecarregar) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] bg-slate-900 border border-emerald-600/50 text-white p-4 rounded-2xl shadow-2xl flex items-start space-x-3">
        <div className="p-2 rounded-xl shrink-0 bg-emerald-500/20 text-emerald-400">
          <RefreshCw className="w-5 h-5" />
        </div>
        <div className="space-y-2 text-xs min-w-0">
          <div className="font-bold text-white">Nova versão do PrevSafe disponível</div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            Esta aba ainda está executando a versão anterior. Recarregue para usar a atualizada —
            cadastros e tabelas oficiais podem ter mudado.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
          >
            Recarregar agora
          </button>
        </div>
      </div>
    );
  }

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
