importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase with required config only
firebase.initializeApp({
  apiKey: '__VITE_FIREBASE_API_KEY__',
  projectId: '__VITE_FIREBASE_PROJECT_ID__',
  messagingSenderId: '__VITE_FIREBASE_MESSAGING_SENDER_ID__',
  appId: '__VITE_FIREBASE_APP_ID__',
  vapidKey: '__VITE_FIREBASE_VAPID_PUBLIC_KEY__'
});

const messaging = firebase.messaging();

// Play notification sound
const playNotificationSound = () => {
  const audio = new Audio('/notification-sound.mp3');
  return audio.play().catch(error => {
    console.error('Error playing sound:', error);
  });
};

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/whitefavicon192x192.png',
    badge: '/whitefavicon192x192.png',
    data: payload.data,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    silent: false // This ensures the default notification sound plays
  };

  // Play our custom sound
  playNotificationSound();

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/whitefavicon192x192.png',
    badge: '/whitefavicon192x192.png',
    vibrate: [200, 100, 200],
    data: data.data || {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    requireInteraction: true,
    silent: false // This ensures the default notification sound plays
  };

  // Play our custom sound
  playNotificationSound();

  event.waitUntil(
    self.registration.showNotification(data.title || 'New Order', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/restaurant/orders')
  );
}); 