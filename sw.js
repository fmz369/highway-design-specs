// 公路设计规范 — Service Worker（离线缓存）
var CACHE_NAME = 'highway-specs-v2';
var URLS = [
  './',
  'index.html',
  'css/site.css',
  'css/style.css',
  'js/data.js',
  'js/router.js',
  'js/favorites.js',
  'js/components.js',
  'js/theme.js',
  'js/qa.js',
  'js/render.js',
  'js/render2.js',
  'js/serialize.js',
  'manifest.json',
  'calc/index.html',
  'checklist/index.html',
  'compare/index.html',
  'qa/index.html',
  'quickref/index.html',
  'scenarios/index.html',
  'favorites/index.html',
  'specs/index.html',
  'updates/index.html',
  'category/index.html',
  'projects/index.html',
  'account/index.html'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS);
    })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(r) {
      return r || fetch(e.request).then(function(resp) {
        if (resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      });
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
    })
  );
});
