/**
 * Shramik Sathi — Service Worker
 * Provides offline support for attendance marking, caching of critical assets,
 * and background sync for queued attendance/report submissions.
 */

const CACHE_NAME = 'shramik-sathi-v12';
const OFFLINE_URL = '/offline.html';

// Critical assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/worker-login.html',
  '/worker-registration.html',
  '/worker-jobs.html',
  '/get-hired.html',
  '/hire.html',
  '/employer-login.html',
  '/employer-register.html',
  '/manifest.json',
  '/supabase-config.js',
  '/jobs-app.js',
  '/payroll.js',
  '/biometric-bridge.js',
  '/offline.html',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  'https://unpkg.com/lucide@latest',
];

// ──────────────── INSTALL ────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Shramik Sathi Service Worker v11');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching critical assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-cache failed (non-critical):', err.message);
        return self.skipWaiting();
      })
  );
});

// ──────────────── ACTIVATE ────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating — clearing old caches');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ──────────────── FETCH ────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests (POST/PUT to Supabase should pass through)
  if (request.method !== 'GET') return;

  // For navigation requests — Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh page
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // For API calls to Supabase — Network only (no caching)
  if (request.url.includes('supabase.co')) {
    event.respondWith(fetch(request));
    return;
  }

  // For all other assets — Cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Return nothing for failed non-critical requests
        return new Response('', { status: 408, statusText: 'Offline' });
      });
    })
  );
});

// ──────────────── BACKGROUND SYNC ────────────────
// Queue attendance/report submissions when offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    console.log('[SW] Background sync: attendance');
    event.waitUntil(syncQueuedData('attendance-queue'));
  }
  if (event.tag === 'sync-reports') {
    console.log('[SW] Background sync: reports');
    event.waitUntil(syncQueuedData('reports-queue'));
  }
});

async function syncQueuedData(storeName) {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const items = await getAllFromStore(store);

    for (const item of items) {
      try {
        const response = await fetch(item.url, {
          method: 'POST',
          headers: item.headers,
          body: JSON.stringify(item.body),
        });
        if (response.ok) {
          store.delete(item.id);
          console.log(`[SW] Synced queued item: ${item.id}`);
        }
      } catch (err) {
        console.warn(`[SW] Sync failed for item ${item.id}:`, err.message);
      }
    }
  } catch (err) {
    console.warn('[SW] syncQueuedData error:', err.message);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ShramikSathiOffline', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('attendance-queue')) db.createObjectStore('attendance-queue', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('reports-queue')) db.createObjectStore('reports-queue', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ──────────────── PUSH NOTIFICATIONS ────────────────
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Shramik Sathi';
  const options = {
    body: data.body || 'New notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/get-hired.html' },
    actions: data.actions || [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/get-hired.html';
  event.waitUntil(clients.openWindow(url));
});

console.log('[SW] Shramik Sathi Service Worker loaded');
