importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-messaging-compat.js');

// We'll fetch the config dynamically
let firebaseConfig = null;

async function initializeFirebase() {
  try {
    const response = await fetch('/firebase-config.json');
    firebaseConfig = await response.json();
    
    firebase.initializeApp({
      messagingSenderId: firebaseConfig.messagingSenderId,
      apiKey: firebaseConfig.apiKey,
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId
    });
    
    const messaging = firebase.messaging();
    
    messaging.onBackgroundMessage((payload) => {
      console.log('Received background message:', payload);
      
      const notificationTitle = payload.notification?.title || "New Notification";
      const notificationOptions = {
        body: payload.notification?.body,
        icon: '/whitefavicon192x192.png',
        badge: '/whitefavicon192x192.png',
        data: payload.data,
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View Details'
          }
        ]
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
}

initializeFirebase();

self.addEventListener('push', function(event) {
  const options = {
    body: event.data.text(),
    icon: '/whitefavicon192x192.png',
    badge: '/whitefavicon192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('New Order', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/restaurant/orders')
  );
}); 