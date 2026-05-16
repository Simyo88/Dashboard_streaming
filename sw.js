var CACHE = "streamboard-v1";
var SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(SHELL); })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(e) {
  var url = new URL(e.request.url);

  // API-Requests nie cachen – immer live
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Supabase & externe APIs nie cachen
  if (url.hostname.includes("supabase.co") ||
      url.hostname.includes("themoviedb.org") ||
      url.hostname.includes("justwatch.com") ||
      url.hostname.includes("anthropic.com")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // CDN-Assets (Supabase JS, simple-icons): Network first, Cache als Fallback
  if (url.hostname.includes("cdn.jsdelivr.net")) {
    e.respondWith(
      fetch(e.request)
        .then(function(res) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          return res;
        })
        .catch(function() { return caches.match(e.request); })
    );
    return;
  }

  // App-Shell: Cache first, Network als Fallback
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return res;
      });
    })
  );
});
