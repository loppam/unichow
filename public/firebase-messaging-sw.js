importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

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