const CACHE_NAME = "ctf-finance-v2";
const STATIC_ASSETS = ["/manifest.json", "/ctf.png", "/Logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Gérer les notifications push
self.addEventListener("push", (event) => {
  const data = event.data.json();
  const options = {
    body: data.notification.body,
    icon: data.notification.icon || "/ctf.png",
    badge: "/ctf.png",
    vibrate: [200, 100, 200],
    data: data.notification.data || data.data,
  };

  event.waitUntil(
    self.registration.showNotification(data.notification.title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow("/dashboard");
    })
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // Ne JAMAIS mettre en cache les pages (navigation) ni les API :
  // c'est ce qui causait les erreurs de redirection.
  if (request.mode === "navigate" || url.pathname.startsWith("/api/")) {
    return; // le navigateur gère normalement
  }

  // Static assets uniquement: cache first, fallback réseau
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      });
    })
  );
});
