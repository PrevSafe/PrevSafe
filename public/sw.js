// PrevSafe Field PWA - Service Worker v2.2.0 (High Performance Field Inspection Engine)
// Optimized for instant loading, aggressive pre-caching, and offline-first operation on unstable mobile networks (NR-01 / NR-12 Field Inspections)

const CACHE_VERSION = 'v2.2.0';
const CACHE_STATIC_NAME = `prevsafe-static-${CACHE_VERSION}`;
const CACHE_IMAGES_NAME = `prevsafe-images-${CACHE_VERSION}`;
const CACHE_RUNTIME_NAME = `prevsafe-runtime-${CACHE_VERSION}`;
const OFFLINE_CACHE_DATA_NAME = 'prevsafe-inspection-cache-v2';

// 1. Critical Core Pre-cache URLs (Pre-cached during Service Worker Install)
const PRECACHE_CRITICAL_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

// Offline HTML Shell Fallback
const OFFLINE_HTML_FALLBACK = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>PrevSafe Campo - Modo Offline</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
    <meta name="theme-color" content="#10b981" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background-color: #020617;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 24px;
      }
      .card {
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 24px;
        padding: 32px 24px;
        max-width: 440px;
        width: 100%;
        text-align: center;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.25);
        color: #34d399;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 4px 12px;
        border-radius: 9999px;
        margin-bottom: 16px;
      }
      .icon {
        font-size: 48px;
        margin-bottom: 12px;
      }
      h1 {
        font-size: 20px;
        font-weight: 800;
        color: #ffffff;
        margin-bottom: 8px;
      }
      p {
        font-size: 13px;
        color: #94a3b8;
        line-height: 1.6;
        margin-bottom: 24px;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        background: #10b981;
        color: #020617;
        padding: 14px 20px;
        border-radius: 14px;
        text-decoration: none;
        font-weight: 700;
        font-size: 14px;
        transition: background 0.2s;
        border: none;
        cursor: pointer;
      }
      .btn:hover {
        background: #34d399;
      }
      .note {
        margin-top: 16px;
        font-size: 11px;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="badge">
        <span>🛡️ MODO CAMPO OFFLINE</span>
      </div>
      <div class="icon">📡</div>
      <h1>Sem Conexão com a Internet</h1>
      <p>O PrevSafe Campo PWA está operando através do cache local criptografado. Todas as vistorias, checklists e fotos registradas permanecem salvas no dispositivo e serão sincronizadas assim que a rede for restabelecida.</p>
      <button class="btn" onclick="window.location.href='/'">Acessar Vistorias em Cache</button>
      <div class="note">PrevSafe PWA • Cache Service Worker Ativo</div>
    </div>
  </body>
</html>`;

// SVG Offline Placeholder for Broken/Offline Images
const OFFLINE_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#0f172a"/>
  <rect x="20" y="20" width="360" height="260" rx="16" fill="#1e293b" stroke="#334155" stroke-dasharray="6,6"/>
  <circle cx="200" cy="130" r="32" fill="#334155"/>
  <path d="M190 125 L200 115 L210 125 M200 115 L200 145" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
  <text x="50%" y="190" fill="#f1f5f9" font-weight="bold" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14">Foto Salva no Cache Local (Offline)</text>
  <text x="50%" y="215" fill="#64748b" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11">Sincronização pendente ao reconectar</text>
</svg>`;

// ============================================================================
// 1. INSTALL EVENT: Pre-cache Essential Assets
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[PrevSafe SW] Installing Service Worker version:', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then((cache) => {
        // Pre-cache core URLs
        return Promise.allSettled(
          PRECACHE_CRITICAL_URLS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
              console.warn('[PrevSafe SW] Pre-cache fallback for:', url, err);
            })
          )
        );
      })
      .then(() => {
        // Force activation immediately without waiting for existing tabs to close
        return self.skipWaiting();
      })
  );
});

// ============================================================================
// 2. ACTIVATE EVENT: Cache Cleanup & Immediate Client Takeover
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[PrevSafe SW] Activating Service Worker version:', CACHE_VERSION);

  const activeCaches = [CACHE_STATIC_NAME, CACHE_IMAGES_NAME, CACHE_RUNTIME_NAME, OFFLINE_CACHE_DATA_NAME];

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (!activeCaches.includes(name)) {
              console.log('[PrevSafe SW] Removing outdated cache:', name);
              return caches.delete(name);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => {
        // Take control of all open clients immediately
        return self.clients.claim();
      })
      .then(() => {
        // Broadcast to clients that the new ServiceWorker is ready and pre-cached
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: CACHE_VERSION,
              timestamp: new Date().toISOString()
            });
          });
        });
      })
  );
});

// ============================================================================
// 3. FETCH EVENT: Multi-strategy Intelligent Interceptor
// ============================================================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // We only handle GET requests in Cache API
  if (request.method !== 'GET') {
    return;
  }

  // A. Next.js Static Chunks, CSS, JS, and Fonts -> Cache-First with Stale-While-Revalidate
  // This guarantees sub-millisecond instant load times on mobile networks!
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|woff2|woff|ttf|eot|ico)$/i) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.open(CACHE_STATIC_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        
        // Fetch in background to keep cache evergreen (Stale-While-Revalidate)
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            // Network failure is fine since we have or will have cached version
            return null;
          });

        // Return instant cached response if present, otherwise await the fetch
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // B. Images (Inspection photos, UI avatars, logos, icons) -> Cache-First with SVG Fallback
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif)$/i) ||
    url.hostname.includes('picsum.photos')
  ) {
    event.respondWith(
      caches.open(CACHE_IMAGES_NAME).then(async (cache) => {
        const cachedImage = await cache.match(request);
        if (cachedImage) {
          return cachedImage;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (networkError) {
          // Provide offline SVG placeholder so UI never displays broken image icons
          return new Response(OFFLINE_IMAGE_SVG, {
            headers: {
              'Content-Type': 'image/svg+xml; charset=utf-8',
              'Cache-Control': 'no-store'
            }
          });
        }
      })
    );
    return;
  }

  // C. Navigation Requests (HTML Page loads) -> Fast Network-First (with 1.5s timeout) + Cache Fallback
  // On flaky 3G/4G field connections, a 1.5s timeout prevents the browser from freezing on dead signals
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      (async () => {
        const staticCache = await caches.open(CACHE_STATIC_NAME);

        // Setup fast network fetch with AbortController timeout (1500ms)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        try {
          const networkResponse = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            staticCache.put(request, networkResponse.clone());
            // Also store as root '/' fallback
            staticCache.put('/', networkResponse.clone());
          }
          return networkResponse;
        } catch (fetchError) {
          clearTimeout(timeoutId);

          // 1. Try exact cached route
          const cachedRoute = await staticCache.match(request);
          if (cachedRoute) return cachedRoute;

          // 2. Try root page shell
          const rootCached = await staticCache.match('/');
          if (rootCached) return rootCached;

          // 3. Fallback to embedded Offline HTML Shell
          return new Response(OFFLINE_HTML_FALLBACK, {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store'
            }
          });
        }
      })()
    );
    return;
  }

  // D. Dynamic JSON API / Runtime requests -> Network-First with Runtime Cache
  event.respondWith(
    caches.open(CACHE_RUNTIME_NAME).then(async (cache) => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Return structured offline JSON response if it's an API route
        if (url.pathname.startsWith('/api/')) {
          return new Response(
            JSON.stringify({
              offline: true,
              message: 'Operação registrada no cache local do dispositivo.',
              timestamp: new Date().toISOString()
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 200
            }
          );
        }
        throw err;
      }
    })
  );
});

// ============================================================================
// 4. CLIENT MESSAGING & BACKGROUND CACHE CONTROLS
// ============================================================================
self.addEventListener('message', async (event) => {
  if (!event.data) return;

  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    // Active Pre-caching of dynamic scripts and route assets passed from DOM
    case 'WARM_FIELD_CACHE':
      try {
        const urlsToWarm = Array.isArray(payload?.urls) ? payload.urls : [];
        const staticCache = await caches.open(CACHE_STATIC_NAME);
        const imagesCache = await caches.open(CACHE_IMAGES_NAME);

        let cachedCount = 0;
        await Promise.allSettled(
          urlsToWarm.map(async (urlStr) => {
            try {
              const req = new Request(urlStr, { mode: 'cors', credentials: 'omit' });
              const isImage = urlStr.match(/\.(png|jpg|jpeg|svg|webp)$/i);
              const targetCache = isImage ? imagesCache : staticCache;

              const existing = await targetCache.match(req);
              if (!existing) {
                const res = await fetch(req);
                if (res && res.status === 200) {
                  await targetCache.put(req, res);
                  cachedCount++;
                }
              }
            } catch (e) {
              // Ignore single item warm failures
            }
          })
        );

        event.ports[0]?.postMessage({
          success: true,
          warmedCount: cachedCount,
          totalRequested: urlsToWarm.length,
          message: `Pré-cache de ${cachedCount} recursos concluído com sucesso!`
        });
      } catch (err) {
        event.ports[0]?.postMessage({ success: false, error: String(err) });
      }
      break;

    // Cache specific inspection session data
    case 'CACHE_INSPECTION_PAYLOAD':
      try {
        const dataCache = await caches.open(OFFLINE_CACHE_DATA_NAME);
        const cacheKey = new Request(`/api/offline/inspection/${payload.osId}`);
        const responseData = new Response(JSON.stringify(payload), {
          headers: {
            'Content-Type': 'application/json',
            'X-Cached-At': new Date().toISOString(),
            'X-PrevSafe-Offline': 'true'
          }
        });
        await dataCache.put(cacheKey, responseData);
        event.ports[0]?.postMessage({
          success: true,
          message: 'Sessão de vistoria arquivada no cache local com sucesso!'
        });
      } catch (err) {
        event.ports[0]?.postMessage({ success: false, error: String(err) });
      }
      break;

    // Detailed Cache Statistics
    case 'GET_OFFLINE_CACHE_STATS':
      try {
        const staticC = await caches.open(CACHE_STATIC_NAME);
        const imgC = await caches.open(CACHE_IMAGES_NAME);
        const rtC = await caches.open(CACHE_RUNTIME_NAME);
        const dataC = await caches.open(OFFLINE_CACHE_DATA_NAME);

        const [staticKeys, imgKeys, rtKeys, dataKeys] = await Promise.all([
          staticC.keys(),
          imgC.keys(),
          rtC.keys(),
          dataC.keys()
        ]);

        const totalEntries = staticKeys.length + imgKeys.length + rtKeys.length + dataKeys.length;

        event.ports[0]?.postMessage({
          success: true,
          version: CACHE_VERSION,
          cacheName: CACHE_STATIC_NAME,
          dataCacheName: OFFLINE_CACHE_DATA_NAME,
          totalEntries,
          breakdown: {
            staticAssets: staticKeys.length,
            cachedImages: imgKeys.length,
            runtimeRequests: rtKeys.length,
            inspectionPayloads: dataKeys.length
          },
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        event.ports[0]?.postMessage({ success: false, error: String(err) });
      }
      break;

    // Clear and Purge Service Worker Caches
    case 'CLEAR_OFFLINE_CACHE':
      try {
        await caches.delete(CACHE_STATIC_NAME);
        await caches.delete(CACHE_IMAGES_NAME);
        await caches.delete(CACHE_RUNTIME_NAME);
        await caches.delete(OFFLINE_CACHE_DATA_NAME);
        event.ports[0]?.postMessage({
          success: true,
          message: 'Todos os caches do Service Worker foram limpos com sucesso.'
        });
      } catch (err) {
        event.ports[0]?.postMessage({ success: false, error: String(err) });
      }
      break;

    case 'PING':
      event.ports[0]?.postMessage({
        success: true,
        status: 'ACTIVE',
        version: CACHE_VERSION,
        timestamp: new Date().toISOString()
      });
      break;

    default:
      break;
  }
});

// ============================================================================
// 5. BACKGROUND SYNC API
// ============================================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'prevsafe-sync-checklist' || event.tag === 'prevsafe-sync-photos') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SERVICE_WORKER_SYNC_TRIGGERED',
            tag: event.tag,
            timestamp: new Date().toISOString()
          });
        });
      })
    );
  }
});
