importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

async function fetchFirebaseConfig() {
  const response = await fetch('/api/getFirebaseConfig');
  if (!response.ok) {
    throw new Error('Failed to fetch Firebase configuration');
  }
  return response.json();
}

fetchFirebaseConfig().then(firebaseConfig => {
  console.log("API Key:", firebaseConfig.apiKey);
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  // Precaching configuration
  workbox.precaching.precacheAndRoute([]);

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
}).catch(error => {
  console.error('Error initializing Firebase:', error);
}); 