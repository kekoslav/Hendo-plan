// 💾 Názov cache (zmeň pri veľkých updatoch)
const CACHE_NAME = "hendo-cache-v1";
const BASE_PATH = "/Hendo-plan/";

// 📦 Soubory, ktoré sa načítajú do cache pri inštalácii
const CORE_ASSETS = [
  `${BASE_PATH}`,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}icons/icon-192.png`,
  `${BASE_PATH}icons/icon-512.png`
];

// ✅ INSTALL EVENT
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Caching core assets");
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ✅ ACTIVATE EVENT
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("Service Worker: Deleting old cache", key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ✅ FETCH EVENT
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // ignoruj externé requesty (napr. GitHub, API mimo domény)
  if (!request.url.startsWith(self.location.origin)) return;

  // 🧠 Ak ide o JSON (payload)
  if (request.url.endsWith(".json")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 🧱 Ostatné – cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(`${BASE_PATH}index.html`));
    })
  );
});
