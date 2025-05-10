// Service Worker for Yappin' PWA

const CACHE_VERSION = 'v4';
const CACHE_NAME = `yappin-cache-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Assets to cache initially (static assets)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/optimized.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/firebase-config.js',
  '/js/timeline.js',
  '/manifest.json',
  '/offline.html',
  '/images/icons/icon-192x192.png',
  '/images/icons/logo.svg',
  '/images/icons/favicon.svg',
  '/images/default-avatar.png'
];

// Assets to cache when visited (dynamic assets)
const DYNAMIC_CACHE_URLS = [
  /\.(?:js|css|png|jpg|jpeg|svg|gif)$/
];

// API endpoints to avoid caching
const API_URLS = [
  /firebaseio\.com/,
  /googleapis\.com/,
  /firebasestorage\.googleapis\.com/
];

// Install service worker and cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching app shell and static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Force service worker to activate immediately
  self.skipWaiting();
});

// Activate service worker and clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated and controlling the page');
      // Claim clients so updated service worker takes effect immediately
      return self.clients.claim();
    })
  );
});

// Helper function to determine if request should bypass cache
function shouldBypassCache(request) {
  // Skip non-GET requests
  if (request.method !== 'GET') return true;
  
  // Skip API endpoints
  const url = new URL(request.url);
  if (API_URLS.some(pattern => pattern.test(url.href))) {
    return true;
  }
  
  return false;
}

// Helper to determine if we should cache this response
function shouldCacheResponse(response) {
  // Only cache successful responses
  if (!response || response.status !== 200) return false;
  
  // Don't cache opaque responses (responses from cross-origin requests)
  if (response.type === 'opaque') return false;
  
  return true;
}

// Network first, falling back to cache strategy with dynamic caching
self.addEventListener('fetch', event => {
  const request = event.request;
  
  // Skip requests that should bypass cache
  if (shouldBypassCache(request)) {
    return;
  }
  
  const requestURL = new URL(request.url);
  
  // For navigation requests, try network first, then cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(cachedResponse => {
              return cachedResponse || caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }
  
  // For static and dynamic assets, try cache first, then network
  const isDynamicAsset = DYNAMIC_CACHE_URLS.some(pattern => pattern.test(requestURL.pathname));
  if (isDynamicAsset) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          // Return cached response if available
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Otherwise fetch from network
          return fetch(request)
            .then(response => {
              if (shouldCacheResponse(response)) {
                // Clone and cache the response
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(request, responseToCache);
                });
              }
              return response;
            })
            .catch(error => {
              console.error('Fetch failed:', error);
              // If offline and no cached response, return a generic error
              return new Response('Network error occurred', {
                status: 408,
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
    return;
  }
  
  // For all other requests, try network first then cache
  event.respondWith(
    fetch(request)
      .then(response => {
        if (shouldCacheResponse(response)) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then(cachedResponse => cachedResponse || caches.match(OFFLINE_URL));
      })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  const title = 'Yappin\'';
  const options = {
    body: event.data ? event.data.text() : 'New activity on Yappin\'',
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {action: 'view', title: 'View'},
      {action: 'close', title: 'Close'}
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // This looks to see if the notification action is 'view'
  if (event.action === 'view') {
    // Open the app to the specific content
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'post-yap') {
    event.waitUntil(syncYaps());
  } else if (event.tag === 'like-yap') {
    event.waitUntil(syncLikes());
  } else if (event.tag === 'reyap') {
    event.waitUntil(syncReyaps());
  }
});

// Sync pending yaps from IndexedDB to server
function syncYaps() {
  // This would be implemented with IndexedDB operations
  console.log('Syncing pending yaps');
  return Promise.resolve();
}

// Sync pending likes from IndexedDB to server
function syncLikes() {
  console.log('Syncing pending likes');
  return Promise.resolve();
}

// Sync pending reyaps from IndexedDB to server
function syncReyaps() {
  console.log('Syncing pending reyaps');
  return Promise.resolve();
}
