// Service Worker for Apps Dashboard PWA
const CACHE_NAME = 'apps-dashboard-v2.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/settings.html',
  '/js/app-firebase.js',
  '/js/settings.js',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// התקנת Service Worker
self.addEventListener('install', function(event) {
  console.log('🔄 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('✅ Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ All resources cached');
        return self.skipWaiting();
      })
  );
});

// הפעלת Service Worker
self.addEventListener('activate', function(event) {
  console.log('✅ Service Worker activated');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Claiming clients');
      return self.clients.claim();
    })
  );
});

// טיפול בבקשות
self.addEventListener('fetch', function(event) {
  // עבור Firebase - לא נשמור במטמון
  if (event.request.url.includes('firebaseio.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // מחזירים מהמטמון אם קיים, אחרת טוענים מהרשת
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(function(response) {
          // בודקים אם התשובה תקינה
          if(!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // משכפלים את התשובה
          var responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(function() {
        // במקרה של חוסר חיבור, מחזירים דף אופף
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// טיפול בהתראות push (לעתיד)
self.addEventListener('push', function(event) {
  console.log('📨 Push message received', event);
  
  const options = {
    body: event.data ? event.data.text() : 'עדכון חדש בלוח האפליקציות!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'apps-dashboard-update',
    renotify: true,
    actions: [
      {
        action: 'open',
        title: 'פתח אפליקציה'
      },
      {
        action: 'close',
        title: 'סגור'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('לוח אפליקציות', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('🔔 Notification click received', event);
  
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});