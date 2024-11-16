importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

// Initialize Firebase with your config
firebase.initializeApp({
  apiKey: "AIzaSyB0AEoFjTEtPnAdWRt5plOBvHcpQZDOI4I",
  authDomain: "unichow-49eb7.firebaseapp.com",
  projectId: "unichow-49eb7",
  storageBucket: "unichow-49eb7.appspot.com",
  messagingSenderId: "886342726459",
  appId: "1:886342726459:web:b71e141a1a58085ba1bd1e",
  measurementId: "G-S0863GBS9X"
});

const messaging = firebase.messaging();

// This will be replaced by the manifest at build time
self.__WB_MANIFEST;

workbox.core.clientsClaim();
workbox.core.skipWaiting();

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

messaging.onBackgroundMessage((payload) => {
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