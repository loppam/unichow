self.addEventListener('push', event => {
  const data = event.data.json();
  
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/whitefavicon192x192.png',
    data: data.data
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data;
  
  if (data?.orderId) {
    clients.openWindow(`/restaurant/orders/${data.orderId}`);
  }
}); 