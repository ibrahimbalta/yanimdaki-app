const CACHE_NAME = 'yanimdaki-cache-v3.3.0';
const assets = [
    '/',
    '/index.html',
    '/app.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Fredoka:wght@600&family=Outfit:wght@300;400;600;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Yeni versiyonu anında aktif et
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(assets);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // CSS, JS, HTML gibi kritik dosyalarda daima Network First kullan:
    const url = new URL(event.request.url);
    const isStaticAsset = url.pathname.endsWith('.css') || 
                          url.pathname.endsWith('.js') || 
                          url.pathname.endsWith('.html') || 
                          event.request.mode === 'navigate';

    if (isStaticAsset && event.request.method === 'GET') {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

// Firebase Messaging Background Handling
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAnRdv4snlLgT6pDq-ye6Ljy3LbT8Bd45c",
    authDomain: "yanimdaki.com",
    projectId: "yanimdaki",
    storageBucket: "yanimdaki.firebasestorage.app",
    messagingSenderId: "231861965178",
    appId: "1:231861965178:web:0cdbf3e51878ae1d7c06c3"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[sw.js] Background message received:', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/app.html')
    );
});
