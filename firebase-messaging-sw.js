importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Buradaki bilgiler firebase-config.js ile aynı olmalıdır
firebase.initializeApp({
    apiKey: "AIzaSyAnRdv4snlLgT6pDq-ye6Ljy3LbT8Bd45c",
    authDomain: "yanimdaki.com",
    projectId: "yanimdaki",
    storageBucket: "yanimdaki.firebasestorage.app",
    messagingSenderId: "231861965178",
    appId: "1:231861965178:web:0cdbf3e51878ae1d7c06c3",
    measurementId: "G-H7SJNNPLQV"
});

const messaging = firebase.messaging();

// Arka plan bildirimlerini işlemek için (isteğe bağlı)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Arka plan mesajı alındı: ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
