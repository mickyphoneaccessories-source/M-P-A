const CACHE = "mpa-v60-static-20261015";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./logo.png",
  "./icon.svg",
  "./manifest.webmanifest",
  "./service-worker.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("mpa-") && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept/cache Supabase, CDN, or any other cross-origin request.
  // API responses must remain live and must not accumulate in the offline cache.
  if (url.origin !== self.location.origin) return;

  // Only app navigation is network-first, with the last app shell as offline fallback.
  if (request.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put("./index.html", copy)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match("./index.html").then(cached => cached || caches.match("./")))
    );
    return;
  }

  // Cache only known static app assets. All other same-origin requests go to network.
  const isStaticAsset = /\.(?:png|svg|webmanifest|css|js|woff2?)$/i.test(url.pathname);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
    })
  );
});
