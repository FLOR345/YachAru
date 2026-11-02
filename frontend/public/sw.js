// Service worker de SimiAru: la app y las lecciones ya abiertas funcionan sin conexión.
// - La app (HTML, JS, CSS, imágenes): se guarda al usarla y se sirve desde la caché.
// - El contenido de la API (unidades, lecciones, diccionario, cultura): primero la red, y si no hay,
//   la última copia guardada. Así una lección abierta una vez se puede repetir sin internet.
// - Lo que escribe datos (POST, PUT, DELETE) nunca se cachea: lo guarda la app y lo envía al volver la conexión.
const VERSION = 'simiaru-v3';
const APP_CACHE = `${VERSION}-app`;
const API_CACHE = `${VERSION}-api`;
const AUDIO_CACHE = 'simiaru-audio-v1'; // sin versión de la app: los audios no cambian (mismo nombre en utils/speech.js)
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png'];

// Contenido de la API que tiene sentido guardar para usar sin conexión
const CACHEABLE_API = [/\/api\/lessons\//, /\/api\/dictionary\//, /\/api\/culture/, /\/api\/validation\/audios\//, /\/api\/progress(\/badges\/all)?$/, /\/api\/auth\/profile$/];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION) && key !== AUDIO_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const networkFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
};

const cacheFirst = async (request) => {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
};

// El reproductor pide audio con no-cors y por rangos: esas respuestas no se pueden guardar.
// Por eso se descarga el archivo completo con CORS, y los rangos se responden desde esa copia.
const audioFile = async (request) => {
  const cache = await caches.open(AUDIO_CACHE);
  let full = await cache.match(request.url);
  if (!full) {
    full = await fetch(request.url, { mode: 'cors', credentials: 'omit' });
    if (full.ok) await cache.put(request.url, full.clone());
  }
  const range = /bytes=(\d+)-(\d*)/.exec(request.headers.get('range') || '');
  if (!range || !full.ok) return full;
  const data = await full.arrayBuffer();
  const start = Number(range[1]);
  const end = range[2] ? Math.min(Number(range[2]), data.byteLength - 1) : data.byteLength - 1;
  return new Response(data.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': full.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${data.byteLength}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Navegación (abrir una pantalla): red primero; sin conexión, la app guardada (es una SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          caches.open(APP_CACHE).then((cache) => cache.put('/index.html', response.clone()));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // API de SimiAru (otro dominio en producción): red primero con copia de respaldo
  if (CACHEABLE_API.some((re) => re.test(url.pathname))) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Archivos de la app y audios: se guardan la primera vez
  if (url.origin === self.location.origin && /\.(js|css|png|jpg|jpeg|webp|svg|woff2?|webm|webmanifest|glb)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (/res\.cloudinary\.com/.test(url.host)) {
    event.respondWith(url.pathname.includes('/video/upload/') ? audioFile(request) : cacheFirst(request));
  }
});
