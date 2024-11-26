self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || 'You have a new notification.',
    icon: '/whitefavicon192x192.png',
    badge: '/whitefavicon192x192.png',
    vibrate: [200, 100, 200],
    tag: 'order-notification',
    renotify: true,
    actions: [
      { action: 'view', title: 'View Order' },
      { action: 'close', title: 'Close' }
    ],
    data: {
      ...data.data,
      sound: data.data?.sound || '/notification-sound.mp3'
    },
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'New Notification', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const soundUrl = event.notification.data.sound;
  if (soundUrl) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        if (clientList.length > 0) {
          clientList[0].postMessage({ type: 'PLAY_NOTIFICATION_SOUND', soundUrl });
        }
      })
    );
  }

  if (event.action === 'view') {
    const data = event.notification.data;
    if (data?.orderId) {
      event.waitUntil(clients.openWindow(`/restaurant/orders/${data.orderId}`));
    }
  }
}); 