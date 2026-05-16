const CACHE_NAME = 'skylens-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/state.js',
  '/js/services/cache.js',
  '/js/services/weather.js',
  '/js/services/geocoding.js',
  '/js/utils/format.js',
  '/js/utils/validators.js',
  '/js/components/ui.js',
  '/js/components/map.js',
  '/js/app.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
];

const API_CACHE_NAME = 'geoweather-api-v1';
const API_CACHE_DURATION = 10 * 60 * 1000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
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

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((fetchResponse) => {
          if (fetchResponse.ok && request.method === 'GET') {
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

  if (url.hostname === 'api.openweathermap.org' || url.hostname === 'nominatim.openstreetmap.org') {
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
            if (cachedResponse) {
              return cachedResponse;
            }
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

  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});