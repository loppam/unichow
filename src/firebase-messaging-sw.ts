import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { firebaseConfig } from './firebase/config';

declare const self: ServiceWorkerGlobalScope;

// Initialize Firebase app in service worker
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

onBackgroundMessage(messaging, (payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/whitefavicon192x192.png',
    badge: '/whitefavicon192x192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

export {}; 