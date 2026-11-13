/* Guarda la app para usarla sin conexión. Las semanas nuevas llegan al recargar con internet. */
const CACHE = "turno-202611131526";
const ARCHIVOS = ["./", "index.html", "datos.js", "datos.json", "local.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// primero la red (para recibir contenido nuevo); si no hay conexión, lo guardado
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(r => {
      const u = new URL(e.request.url);
      if (r.ok && u.origin === location.origin && !u.pathname.endsWith(".apk")) {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
      }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match(e.request, { ignoreSearch: true })).then(r => r || caches.match("index.html")))
  );
});
