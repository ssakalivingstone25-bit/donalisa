/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
// Service Worker for Firebase Cloud Messaging (Background Notifications)
// Imported scripts for Firebase v11 Compat libraries in SW environment

importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-messaging-compat.js');

// Initialize Firebase App in SW
firebase.initializeApp({
  apiKey: "AIzaSyD_10vwrGAB4qLeO-4ubxtIXXppoBQ6-9M",
  authDomain: "bizlinkuganda-21a58.firebaseapp.com",
  projectId: "bizlinkuganda-21a58",
  storageBucket: "bizlinkuganda-21a58.firebasestorage.app",
  messagingSenderId: "228160504133",
  appId: "1:228160504133:web:fad07e5a7b681604c27e2c",
  measurementId: "G-S47QSH7037"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background push:', payload);

  const notificationTitle = payload.notification?.title || 'DONALISA New Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'Check out the latest releases on DONALISA.',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    data: {
      url: payload.data?.actionUrl || '/browse'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/browse';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
