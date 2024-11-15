import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import { firebaseConfig } from "./config";

declare const self: ServiceWorkerGlobalScope;

// Initialize Firebase app in service worker
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Handle background messages
onBackgroundMessage(messaging, (payload) => {
  console.log("Received background message:", payload);

  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body,
    icon: "/logo192.png",
    badge: "/logo192.png",
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
