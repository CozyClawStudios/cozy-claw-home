/**
 * The Shared House - Service Worker
 * Enables offline play and caching
 */

const CACHE_NAME = 'shared-house-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/game.js',
    '/mobile-controls.js',
    '/mobile.css'
];

const DYNAMIC_CACHE_NAME = 'shared-house-dynamic-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] Static assets cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Cache failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            return name.startsWith('shared-house-') && 
                                   name !== CACHE_NAME && 
                                   name !== DYNAMIC_CACHE_NAME;
                        })
                        .map((name) => {
                            console.log('[Service Worker] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activated successfully');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip Socket.io and API requests (don't cache real-time data)
    if (url.pathname.includes('/socket.io/') || 
        url.pathname.startsWith('/api/')) {
        return;
    }
    
    // Strategy: Cache First for static assets, Network First for dynamic content
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request));
    } else if (isImageAsset(url)) {
        event.respondWith(cacheFirstWithExpiration(request));
    } else {
        event.respondWith(networkFirst(request));
    }
});

// Check if URL is a static asset
function isStaticAsset(url) {
    const staticExtensions = ['.html', '.js', '.css', '.json'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

// Check if URL is an image asset
function isImageAsset(url) {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
    return imageExtensions.some(ext => url.pathname.endsWith(ext));
}

// Cache First strategy
async function cacheFirst(request) {
    const cached = await caches.match(request);
    
    if (cached) {
        return cached;
    }
    
    try {
        const response = await fetch(request);
        
        if (response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.error('[Service Worker] Cache first failed:', error);
        // Return offline fallback if available
        return caches.match('/offline.html');
    }
}

// Cache First with expiration for images
async function cacheFirstWithExpiration(request) {
    const cached = await caches.match(request);
    
    if (cached) {
        // Check if cache is fresh (less than 7 days old)
        const dateHeader = cached.headers.get('date');
        if (dateHeader) {
            const cachedTime = new Date(dateHeader).getTime();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            
            if (Date.now() - cachedTime < maxAge) {
                return cached;
            }
        }
    }
    
    try {
        const response = await fetch(request);
        
        if (response.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        if (cached) {
            return cached;
        }
        throw error;
    }
}

// Network First strategy
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cached = await caches.match(request);
        
        if (cached) {
            return cached;
        }
        
        // Return offline fallback for HTML requests
        if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/offline.html');
        }
        
        throw error;
    }
}

// Background sync for chat messages and actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-chat') {
        event.waitUntil(syncChatMessages());
    } else if (event.tag === 'sync-actions') {
        event.waitUntil(syncPendingActions());
    }
});

async function syncChatMessages() {
    // Sync any queued chat messages when back online
    console.log('[Service Worker] Syncing chat messages...');
    // Implementation would read from IndexedDB and send to server
}

async function syncPendingActions() {
    // Sync any pending game actions
    console.log('[Service Worker] Syncing pending actions...');
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body || 'Something happened in the Shared House!',
            icon: '/assets/icon-192x192.png',
            badge: '/assets/badge-72x72.png',
            tag: data.tag || 'default',
            requireInteraction: false,
            data: data.data || {}
        };
        
        event.waitUntil(
            self.registration.showNotification(
                data.title || 'The Shared House',
                options
            )
        );
    }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then((clientList) => {
                // Focus existing window if open
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window if not already open
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

// Message handling from main thread
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    } else if (event.data.type === 'CACHE_ASSETS') {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then((cache) => cache.addAll(event.data.assets))
        );
    }
});

// Periodic background sync (for updates)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-updates') {
        event.waitUntil(checkForUpdates());
    }
});

async function checkForUpdates() {
    console.log('[Service Worker] Checking for updates...');
    // Check for new content and notify the main thread
}

// Clean up old dynamic cache periodically
setInterval(async () => {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const requests = await cache.keys();
    const maxItems = 100;
    
    if (requests.length > maxItems) {
        // Remove oldest items
        const toDelete = requests.slice(0, requests.length - maxItems);
        await Promise.all(toDelete.map(req => cache.delete(req)));
        console.log('[Service Worker] Cleaned up old cache items');
    }
}, 24 * 60 * 60 * 1000); // Daily
