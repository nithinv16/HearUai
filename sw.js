// Service Worker for HearuAI PWA
// Provides offline functionality and caching

const CACHE_NAME = 'hearuai-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const CACHE_FILES = [
  '/',
  '/index.html',
  '/chat.html',
  '/auth.html',
  '/memory.html',
  '/manifest.json',
  '/js/config.js',
  '/js/auth.js',
  '/js/azure-ai.js',
  '/js/azure-avatar.js',
  '/js/azure-translation.js',
  '/js/chat.js',
  '/js/chat-reference.js',
  '/js/conversation-history.js',
  '/js/memory-manager.js',
  '/js/memory-layers.js',
  '/js/memory-ui.js',
  '/js/voice-call.js',
  // Add essential images that actually exist
  '/images/icon.svg',
  '/images/icon-144x144.png'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching essential files');
        // Cache files individually to handle failures gracefully
        return Promise.allSettled(
          CACHE_FILES.map(url => 
            fetch(url).then(response => {
              if (response.ok) {
                return cache.put(url, response);
              } else {
                console.warn(`Service Worker: Failed to fetch ${url} (${response.status})`);
              }
            }).catch(error => {
              console.warn(`Service Worker: Error caching ${url}:`, error.message);
            })
          )
        );
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip unsupported schemes (chrome-extension, moz-extension, etc.)
  const url = new URL(event.request.url);
  if (!['http:', 'https:'].includes(url.protocol)) {
    return;
  }

  // Skip Azure API calls - these need internet connection
  if (event.request.url.includes('azure.com') || 
      event.request.url.includes('openai.azure.com') ||
      event.request.url.includes('cognitiveservices.azure.com') ||
      event.request.url.includes('microsofttranslator.com')) {
    return;
  }

  // Skip browser extension requests
  if (event.request.url.includes('chrome-extension://') ||
      event.request.url.includes('moz-extension://') ||
      event.request.url.includes('extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Try to fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Additional check before caching
            const requestUrl = new URL(event.request.url);
            if (!['http:', 'https:'].includes(requestUrl.protocol)) {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache the new response with error handling
            caches.open(CACHE_NAME)
              .then((cache) => {
                return cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.warn('Failed to cache request:', event.request.url, error);
              });

            return response;
          })
          .catch(() => {
            // Network failed, try to serve offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            // For other requests, return a generic offline response
            return new Response('Offline - Content not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Sync any pending data when connection is restored
      syncPendingData()
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New message from HearuAI',
    icon: '/images/icon-192x192.png',
    badge: '/images/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open HearuAI',
        icon: '/images/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/images/icon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('HearuAI', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/chat.html')
    );
  }
});

// Helper function to sync pending data
async function syncPendingData() {
  try {
    // Check if there's any pending data to sync
    const pendingData = await getStoredPendingData();
    
    if (pendingData && pendingData.length > 0) {
      console.log('Service Worker: Syncing pending data');
      
      // Process each pending item
      for (const item of pendingData) {
        try {
          await syncDataItem(item);
          await removePendingDataItem(item.id);
        } catch (error) {
          console.error('Service Worker: Failed to sync item', error);
        }
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// Helper functions for data management
async function getStoredPendingData() {
  // Implementation would depend on your data storage strategy
  // This could use IndexedDB or localStorage
  return [];
}

async function syncDataItem(item) {
  // Implementation for syncing individual data items
  console.log('Syncing item:', item);
}

async function removePendingDataItem(itemId) {
  // Implementation for removing synced items from pending queue
  console.log('Removing synced item:', itemId);
}

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});