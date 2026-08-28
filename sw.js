const CACHE_NAME = 'skylens-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/cesium-globe.js',
  '/js/config.js',
  '/manifest.json',
  'https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Widgets/widgets.css',
  'https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Cesium.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
];

const API_CACHE_NAME = 'skylens-api-v2';
const API_CACHE_DURATION = 10 * 60 * 1000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Some static assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Cesium CDN assets - network first, fallback to cache
  if (url.hostname === 'cesium.com') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }

  // API requests - stale-while-revalidate
  if (url.hostname === 'api.openweathermap.org' || url.hostname === 'nominatim.openstreetmap.org' || url.hostname === 'api.open-meteo.com') {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            const cachedTime = cachedResponse.headers.get('x-cached-time');
            if (cachedTime && Date.now() - parseInt(cachedTime) < API_CACHE_DURATION) {
              return cachedResponse;
            }
          }

          return fetch(request).then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              responseClone.headers.set('x-cached-time', Date.now().toString());
              cache.put(request, responseClone);
            }
            return response;
          }).catch(() => {
            if (cachedResponse) return cachedResponse;
            return new Response(JSON.stringify({ error: 'Offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        });
      })
    );
    return;
  }

  // Static assets - cache first, fallback to network
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((fetchResponse) => {
          if (fetchResponse.ok) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
    );
    return;
  }

  // External resources (Tailwind, fonts) - cache first
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).then((fetchResponse) => {
        if (fetchResponse.ok) {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return fetchResponse;
      }).catch(() => {
        return new Response('', { status: 503 });
      });
    })
  );
});
