/* SLOWIX — service worker
   À déposer à côté de index.html (même dossier du dépôt GitHub).

   Ce fichier ne touche JAMAIS aux données : l'historique vit dans le
   localStorage de la page, que le service worker ne voit pas.
   Stratégie « réseau d'abord » : en ligne, on sert toujours la dernière
   version publiée ; hors ligne, la dernière version mise en cache.
   Aucune réinstallation de l'icône n'est donc nécessaire après une mise à jour. */

const CACHE = 'slowix-v2';
const SHELL = './index.html';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.add(new Request(SHELL, { cache: 'reload' })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('slowix-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // contourne le cache HTTP de GitHub Pages (10 min) pour voir tout de suite la nouvelle version
    e.respondWith(
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(SHELL, copy));
          }
          return res;
        })
        .catch(() => caches.match(SHELL))
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
