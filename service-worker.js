const CACHE = "mpa-v98-20261107";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./translations.js",
  "./vendor/html2canvas.min.js",
  "./vendor/supabase.js",
  "./logo.png",
  "./icon.svg",
  "./manifest.webmanifest",
  "./service-worker.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
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
        const ct = (response && response.headers.get("content-type")) || "";
        if (response && response.ok && !(/\.js$/i.test(url.pathname) && ct.includes("text/html"))) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
    })
  );
});

self.addEventListener("message", event => { if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting(); });

// V80: Open the app on the tapped notification (Android, computers, iPhone Home Screen app).
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const id = event.notification.data && event.notification.data.id;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const client of list) {
      if ("focus" in client) { client.postMessage({ type: "mpa-open-notification", id }); return client.focus(); }
    }
    return self.clients.openWindow("./");
  }));
});

// V84: Push notifications - zinakuja juu ya skrini na lock screen hata app ikiwa imefungwa.
self.addEventListener("push", event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data && event.data.text() }; }
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    // iPhone inahitaji kila push ionyeshe arifa; Android/kompyuta: app ikiwa wazi inaonyesha bango lake.
    const visible = list.some(c => c.visibilityState === "visible" && c.focused);
    if (visible && !/iPhone|iPad/.test(self.navigator.userAgent || "")) return;
    return self.registration.showNotification(d.title || "M-P-A", {
      body: d.body || "Gusa kuona", icon: "./logo.png", badge: "./logo.png",
      tag: "mpa-" + (d.id || Date.now()), renotify: true, silent: false,
      vibrate: [220, 80, 220, 80, 320], data: { id: d.id }
    });
  }));
});
