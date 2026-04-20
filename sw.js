/* Service Worker — Automatismes 3ème / Brevet
   Stratégie :
   - Shell app (HTML/CSS/JS/icônes) : cache-first avec fallback network
   - Polices Google : stale-while-revalidate
   - MathJax (CDN) : cache-first (gros JS, change rarement)
   - Tout le reste : network-first avec fallback cache

   Incrémente CACHE_VERSION quand on déploie une nouvelle version.
*/

const CACHE_VERSION = 'v2-2026-04-21';
const SHELL_CACHE = `auto3br-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `auto3br-runtime-${CACHE_VERSION}`;

const SHELL_URLS = [
  './',
  './index.html',
  './app.js',
  './questions.js',
  './style.css',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

/* Install : pré-charge le shell */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Pre-cache failed:', err))
  );
});

/* Activate : nettoie les vieux caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('auto3br-') && ![SHELL_CACHE, RUNTIME_CACHE].includes(k))
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Fetch : stratégie par type de ressource */
self.addEventListener('fetch', event => {
  const req = event.request;
  // Ne cache que les GET
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts / MathJax CDN : stale-while-revalidate
  if (url.origin.includes('fonts.googleapis.com') ||
      url.origin.includes('fonts.gstatic.com') ||
      url.origin.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const network = fetch(req).then(resp => {
            if (resp && resp.status === 200) cache.put(req, resp.clone());
            return resp;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // Même origine : cache-first puis network
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const copy = resp.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(req, copy));
          }
          return resp;
        }).catch(() => {
          // Offline fallback : page d'index
          if (req.mode === 'navigate') return caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Autres origines : network-first
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

/* Message : permet au site de demander un skipWaiting (upgrade immédiat) */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
