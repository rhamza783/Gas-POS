const CACHE_NAME = "gas-pos-cache-v1";
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/utils.js",
  "./js/storage.js",
  "./js/pos.js",
  "./js/app.js",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});