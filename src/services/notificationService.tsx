import { Order, OrderNotification } from '../types/order';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getMessaging } from 'firebase/messaging';

class NotificationService {
  private vapidKeys = {
    publicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
    privateKey: import.meta.env.VITE_VAPID_PRIVATE_KEY
  };

  private subscriptions: Map<string, PushSubscription> = new Map();

  
  async initialize(): Promise<PushSubscription | null> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications not supported');
        return null;
      }

      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      // Get push subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.vapidKeys.publicKey
      });

      return subscription;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return null;
    }
  }

  async getSubscription(restaurantId: string): Promise<PushSubscription | null> {
    try {
      // Check if we already have a subscription
      let subscription = this.subscriptions.get(restaurantId);
      if (subscription) return subscription;

      // If not, get it from the database
      const docRef = doc(db, 'restaurants', restaurantId);
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      
      if (data?.pushSubscription) {
        subscription = JSON.parse(data.pushSubscription);
        this.subscriptions.set(restaurantId, subscription as PushSubscription);
        return subscription as PushSubscription;
      }

      // If no subscription exists, create a new one
      const initResult = await this.initialize();
      if (!initResult) return null;
      subscription = initResult;

      // Save the new subscription
      await updateDoc(docRef, {
        pushSubscription: JSON.stringify(subscription)
      });

      this.subscriptions.set(restaurantId, subscription);
      return subscription;
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }

  async sendNewOrderNotification(restaurantId: string, notification: OrderNotification) {
    try {
      const subscription = await this.getSubscription(restaurantId);
      if (!subscription) return;

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          title: 'Order Update',
          body: notification.message,
          data: { orderId: notification.orderId }
        })
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async requestPermission(userId: string): Promise<PushSubscription | null> {
    return this.initialize();
  }

  setupForegroundListener() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'notification') {
        // Handle foreground notification
        new Notification(event.data.title, {
          body: event.data.body,
          icon: '/whitefavicon192x192.png',
          data: event.data.data
        });
      }
    });
  }
}

export const notificationService = new NotificationService(); 