const CACHE_NAME = "checklist-pela-vida-v4";

const APP_SHELL = [
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/icon-180.png",
  "./cards/card-check-status.jpg",
  "./cards/card-regras-vida.jpg",
  "./backgrounds/admin-bg.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Só cuida de requisições GET dentro do próprio site.
  // As chamadas POST para o Google Apps Script sempre vão direto pra rede,
  // já que o checklist precisa ser enviado/salvo em tempo real.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // HTML (index.html, admin.html e a navegação entre páginas): sempre busca
  // a versão mais nova na rede primeiro. Isso evita a demora de "várias
  // recargas" para uma atualização aparecer. Só usa a cópia em cache se
  // o dispositivo estiver offline.
  const isHTML = req.mode === "navigate" || req.destination === "document" || req.url.endsWith(".html");
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Ícones, imagens e manifest: cache primeiro (mais rápido, funciona
  // offline), atualizando a cópia em segundo plano para a próxima visita.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
