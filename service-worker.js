const CACHE_NAME = 'soloflow-command-center-v1';
const APP_SHELL = [
  './', './index.html', './bootstrap.js', './manifest.webmanifest', './styles/architecture.css',
  './core/state.js', './core/firebase.js',
  './modules/tasks.js', './modules/timer.js', './modules/schedule.js', './modules/calendar.js',
  './modules/inbox.js', './modules/productivity.js', './modules/finance.js', './modules/theme.js',
  './modules/shortcuts.js', './modules/reports.js', './assets/icon.svg'
];
const OPTIONAL_REMOTE_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&family=Space+Grotesk:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
    await cache.addAll(APP_SHELL);
    await Promise.allSettled(OPTIONAL_REMOTE_ASSETS.map((url) => cache.add(url)));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  const cacheableExternalAsset = ['fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'].includes(requestUrl.hostname);
  if (requestUrl.origin !== self.location.origin && !cacheableExternalAsset) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok || response.type === 'opaque') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});
