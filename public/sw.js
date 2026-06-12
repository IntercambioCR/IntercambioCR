const CACHE_NAME = "intercambio-cr-v3";
const OFFLINE_URL = "/offline";
const STATIC_ROUTES = [
  "/",
  "/explorar",
  "/ayuda",
  "/legal",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/maskable-icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png"
];

function logCacheError(context, error) {
  console.warn(`[Intercambio CR SW] ${context}`, error);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ROUTES))
      .then(() => self.skipWaiting())
      .catch((error) => {
        logCacheError("install", error);
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
      .catch((error) => {
        logCacheError("activate", error);
      })
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.hostname.includes("supabase.co")) {
    return;
  }

  if (url.pathname.startsWith("/_next/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(async () => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }

          const copy = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, copy))
            .catch((error) => {
              logCacheError("cache put", error);
            });
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});
