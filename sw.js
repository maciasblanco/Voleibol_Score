/* ============================================================
   SERVICE WORKER - Marcador Voleibol FIVB VNL
   Estrategia:
   - Cache-first para el shell (HTML, CSS, JS, iconos)
   - Network-first para peticiones externas (por si acaso)
   - Cachea versiones para permitir uso offline
   ============================================================ */

const CACHE_NAME = 'marcador-voleibol-v1.0.0';
const RUNTIME_CACHE = 'marcador-voleibol-runtime-v1.0.0';

// Archivos del "app shell" que se cachean al instalar
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-48x48.png',
    './icons/icon-72x72.png',
    './icons/icon-96x96.png',
    './icons/icon-144x144.png',
    './icons/icon-192z192.png',
    './icons/icon-512x512.png',
    //'./icons/icon-maskable-512.png'
];

// ================== INSTALL ==================
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cacheando app shell');
                return cache.addAll(APP_SHELL);
            })
            .then(() => self.skipWaiting())
            .catch((err) => console.error('[SW] Error al cachear app shell:', err))
    );
});

// ================== ACTIVATE ==================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando...');
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

    // Ignorar peticiones que no sean GET
    if (request.method !== 'GET') return;

    // Ignorar peticiones a otros orígenes (ej: PayPal, WhatsApp)
    if (url.origin !== self.location.origin) return;

    // Estrategia: Cache-first con fallback a red
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Actualizar en segundo plano (stale-while-revalidate)
                fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, networkResponse.clone());
                        });
                    }
                }).catch(() => { /* offline, ignorar */ });
                return cachedResponse;
            }

            // Si no está en cache, ir a la red
            return fetch(request).then((networkResponse) => {
                // Cachear solo respuestas válidas del mismo origen
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // Si falla la red y es navegación, devolver el index.html cacheado
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
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