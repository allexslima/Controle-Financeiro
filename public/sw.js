// Service Worker básico para permitir que o navegador reconheça o PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Apenas repassa as requisições (estratégia network-first simplificada)
  event.respondWith(fetch(event.request));
});