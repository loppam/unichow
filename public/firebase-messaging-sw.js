importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

async function fetchFirebaseConfig() {
  const response = await fetch('/api/getFirebaseConfig');
  if (!response.ok) {
    throw new Error('Failed to fetch Firebase configuration');
  }
  return response.json();
}

fetchFirebaseConfig().then(firebaseConfig => {
  firebase.initializeApp(firebaseConfig);
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
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  if (data?.type === 'order') {
    // Navigate to specific order
    clients.openWindow(`/restaurant/orders/${data.orderId}`);
  } else {
    // Default action
    clients.openWindow('/');
  }
}); 