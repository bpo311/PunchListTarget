/* Punch Checklist PWA — offline-first service worker.
   Strategy: NETWORK-FIRST with cache fallback. Online visits always get
   the newest deployed files (updates go live immediately); when offline,
   everything is served from the cache. Bump CACHE on breaking changes. */

const CACHE = "punch-checklist-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./pdf.js",
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(hit => hit || caches.match("./index.html"))
      )
  );
});
