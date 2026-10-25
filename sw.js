/* Keeps the site available with spotty signal: network first, cached copy as backup.
   If the network has not answered in a few seconds, the cached copy is shown instead.
   Bump VERSION on every deploy so phones refresh. */
const VERSION = 'fox-2027-v14';
const SLOW_MS = 3500;
const CORE = ['./', 'index.html', 'styles.css', 'js/boot.js', 'js/util.js', 'js/components.js', 'js/weather.js', 'js/check.js', 'js/pages.js', 'js/home.js', 'js/houses.js', 'js/app.js',
  'data/config.json', 'data/houses.json', 'data/locations.json', 'data/families.json', 'data/schedule.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const cached = () => caches.match(e.request, { ignoreSearch: true });
  const network = fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
    return r;
  });
  const slow = new Promise((ok) => setTimeout(() => ok(cached()), SLOW_MS));
  // A slow network loses to the cache only when a cached copy exists; otherwise keep waiting for the network.
  e.respondWith(Promise.race([network, slow.then((c) => c || network)]).catch(() => cached()).then((r) => r || network));
});