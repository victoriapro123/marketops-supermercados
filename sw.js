const CACHE_NAME = 'marketops-integrado-v1';
const ARCHIVOS = [
    './', './index.html', './admin.html', './admin.js', './styles.css', './admin.css',
    './script.js', './tecnico.html', './tecnico.js', './encargado.html',
    './detalle-sucursal.html', './historial-incidencias.html',
    './historial-local.html', './reporte-falla.html', './manifest.webmanifest',
    './demo-roles.js', './roles.css', './icons/icon-192.png', './icons/icon-512.png', './pwa.js'
];
self.addEventListener('install', function (evento) {
    evento.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ARCHIVOS)));
    self.skipWaiting();
});
self.addEventListener('activate', function (evento) {
    evento.waitUntil(caches.keys().then(nombres => Promise.all(
        nombres.filter(nombre => nombre !== CACHE_NAME).map(nombre => caches.delete(nombre))
    )));
    self.clients.claim();
});
self.addEventListener('fetch', function (evento) {
    if (evento.request.method !== 'GET') return;
    const url = new URL(evento.request.url);
    if (url.origin !== self.location.origin) return;
    evento.respondWith(fetch(evento.request).then(respuesta => {
        if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(evento.request, copia));
        }
        return respuesta;
    }).catch(() => caches.match(evento.request)));
});
