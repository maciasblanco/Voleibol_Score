/* ============================================================
   SERVICE WORKER - Marcador Voleibol FIVB VNL
   Versión: 2.0.0
   Estrategia: Cache-first con stale-while-revalidate
   ============================================================ */

const CACHE_NAME = 'marcador-voleibol-v2.0.0';
const RUNTIME_CACHE = 'marcador-voleibol-runtime-v2.0.0';

// ✅ Rutas verificadas con los nombres REALES de tus iconos
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './icons/launchericon-192x192.png',
    './icons/launchericon-512x512.png'
];

// ================== INSTALL ==================
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando v2.0.0...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cacheando app shell');
                // ✅ Cachear uno por uno para no fallar si falta alguno
                return Promise.all(
                    APP_SHELL.map(url =>
                        cache.add(url).catch(err => {
                            console.warn(`[SW] No se pudo cachear ${url}:`, err);
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// ================== ACTIVATE ==================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando v2.0.0...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map((name) => {
                        console.log('[SW] Eliminando cache antiguo:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ================== FETCH ==================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, networkResponse.clone());
                        });
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                return new Response('Recurso no disponible offline', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            });
        })
    );
});

// ================== MENSAJES ==================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});