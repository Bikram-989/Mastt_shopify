const CACHE_NAME = 'pwa-cache-v1'; 

// List the files you want to work offline
const ASSETS_TO_CACHE = [
'/',
'/index.html',
'/styles.css',
'/app.js',
'/manifest.json',
'/icon-192.png',
'/icon-512.png'
]; 

// 1. Install Event: Triggered when the service worker is first registered
self.addEventListener('install', (event) => {
event.waitUntil(
caches.open(CACHE_NAME).then((cache) => {
console.log('Pre-caching offline assets');
return cache.addAll(ASSETS_TO_CACHE);
}).then(() => {
// Force the waiting service worker to become active immediately
return self.skipWaiting();
})
);
}); 

// 2. Activate Event: Triggered when the service worker takes control
self.addEventListener('activate', (event) => {
event.waitUntil(
caches.keys().then((cacheNames) => {
return Promise.all(
cacheNames.map((cache) => {
// Delete old caches if the version changes
if (cache !== CACHE_NAME) {
console.log('Clearing old cache:', cache);
return caches.delete(cache);
}
})
);
}).then(() => {
// Claim all open browser tabs immediately
return self.clients.claim();
})
);
}); 

// 3. Fetch Event: Intercepts all network requests
self.addEventListener('fetch', (event) => {
// Only handle standard HTTP/HTTPS requests (ignores browser extensions)
if (!event.request.url.startsWith(self.location.origin)) return; 

event.respondWith(
caches.match(event.request).then((cachedResponse) => {
if (cachedResponse) {
// Return cached file if found (Cache-First)
return cachedResponse;
} 

// Otherwise, fetch from the network (Network-First fallback)
return fetch(event.request)
.then((networkResponse) => {
// Check for a valid response before caching it dynamically
if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
return networkResponse;
}
  // Cache newly discovered assets on the fly
  const responseToCache = networkResponse.clone();
  caches.open(CACHE_NAME).then((cache) => {
    cache.put(event.request, responseToCache);
  });

  return networkResponse;
})
.catch(() => {
  // Optional: Return a fallback offline page if network fails completely
  if (event.request.mode === 'navigate') {
    return caches.match('/index.html');
  }
});

})

);
});