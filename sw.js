/* ============================================================
   Mathe App - Service Worker

   Ziel: Die App aktualisiert sich von selbst, sobald sie geöffnet wird,
   funktioniert aber ohne Internet weiterhin.

   Zwei Sicherungen greifen ineinander:
   1. VERSION unten hochzählen -> der Browser erkennt einen neuen Service
      Worker, installiert ihn sofort (skipWaiting) und die Seite lädt einmal
      neu.
   2. Zusätzlich holt der Worker eigene Dateien immer zuerst frisch aus dem
      Netz (mit kurzem Zeitlimit) und greift nur auf den Cache zurück, wenn
      das Netz nicht antwortet. Dadurch landet ein neuer Stand auch dann auf
      dem Gerät, wenn das Hochzählen der VERSION mal vergessen wurde.
   ============================================================ */

const VERSION = '1.5.0';
const CACHE = 'mathe-app-v' + VERSION;
const NET_TIMEOUT = 2500;   /* ms, danach wird der Cache benutzt */

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/config.js',
  './js/pixel.js',
  './js/leaderboard.js',
  './js/mathgen.js',
  './js/minigames.js',
  './js/audio.js',
  './js/backgrounds.js',
  './js/game.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .catch(() => { })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Die Seite darf nach der laufenden Version fragen */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'version') {
    if (e.ports && e.ports[0]) e.ports[0].postMessage({ version: VERSION });
  }
  if (e.data && e.data.type === 'skipWaiting') self.skipWaiting();
});

function fromNetwork(req) {
  /* no-cache umgeht den HTTP-Cache des Browsers - wichtig auf GitHub Pages */
  const fresh = new Request(req.url, {
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: req.headers,
    mode: req.mode === 'navigate' ? 'same-origin' : req.mode,
    redirect: 'follow'
  });
  return fetch(fresh);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Fremde Quellen (Schriften): Cache zuerst, im Hintergrund auffrischen */
  if (url.origin !== location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => { });
        return res;
      }).catch(() => hit))
    );
    return;
  }

  /* Eigene Dateien: erst das Netz (mit Zeitlimit), sonst der Cache */
  e.respondWith((async () => {
    const cached = await caches.match(req);
    try {
      const res = await Promise.race([
        fromNetwork(req),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), NET_TIMEOUT))
      ]);
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => { });
      }
      return res;
    } catch (err) {
      if (cached) return cached;
      /* Offline und nichts im Cache: wenigstens die Startseite ausliefern */
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
