// Service Worker for Yappin' PWA

const CACHE_NAME = 'yappin-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/firebase-config.js',
  '/js/timeline.js',
  '/manifest.json'
];

// Install service worker and cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
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
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim clients so updated service worker takes effect immediately
  self.clients.claim();
});

// Network first, falling back to cache strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests and Firebase API calls
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('firebaseio.com') ||
    event.request.url.includes('googleapis.com') ||
    event.request.url.includes('firebasestorage.googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response since we'll consume it in multiple places
        const responseToCache = response.clone();

        // Cache the fetched response
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // If network fetch fails, try to return from cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // For navigation requests, return the index page from cache
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          
          return new Response('Network error occurred', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  const title = 'Yappin\'';
  const options = {
    body: event.data.text() || 'New Yappin\' notification',
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/icon-72x72.png'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});
