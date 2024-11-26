import { Order, OrderNotification } from '../types/order';
import { doc, getDoc, updateDoc, onSnapshot, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-hot-toast';

class NotificationService {
  private vapidKeys = {
    publicKey: import.meta.env.VITE_FIREBASE_VAPID_PUBLIC_KEY,
    privateKey: import.meta.env.VITE_FIREBASE_VAPID_PRIVATE_KEY
  };

  private subscriptions: Map<string, PushSubscription> = new Map();

  async initialize(): Promise<PushSubscription | null> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        toast.error('Push notifications are not supported in this browser');
        return null;
      }

      const registration = await navigator.serviceWorker.register('/service-worker.js');
      
      // Convert VAPID public key from base64 to Uint8Array
      const vapidPublicKey = this.urlBase64ToUint8Array(this.vapidKeys.publicKey);
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      });

      return subscription;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      toast.error('Failed to initialize notifications');
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  setupForegroundListener() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data.type === 'PLAY_NOTIFICATION_SOUND') {
        this.playNotificationSound(event.data.soundUrl);
      }
    });
  }

  private async playNotificationSound(soundUrl: string) {
    try {
      const audio = new Audio(soundUrl);
      audio.volume = 1.0;
      await audio.play();
      
      // Play second time after a short delay
      setTimeout(() => {
        const secondPlay = new Audio(soundUrl);
        secondPlay.volume = 1.0;
        secondPlay.play().catch(console.error);
      }, 300);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  subscribeToOrderNotifications(userId: string, callback: (notifications: OrderNotification[]) => void): () => void {
    const userRef = doc(db, 'users', userId);
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const notifications = data.notifications || [];
        callback(notifications);
      }
    }, (error) => {
      console.error('Error subscribing to notifications:', error);
    });

    return unsubscribe;
  }

  async markAsRead(userId: string, notificationId: string) {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const notifications = userDoc.data().notifications || [];
      const notification = notifications.find((n: OrderNotification) => n.id === notificationId);
      
      if (notification) {
        // Remove old notification and add updated one
        await updateDoc(userRef, {
          notifications: arrayRemove(notification)
        });
        
        await updateDoc(userRef, {
          notifications: arrayUnion({
            ...notification,
            read: true
          })
        });
      }
    }
  }

  async markAllAsRead(userId: string) {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const notifications = userDoc.data().notifications || [];
      const updatedNotifications = notifications.map((n: OrderNotification) => ({
        ...n,
        read: true
      }));
      
      await updateDoc(userRef, {
        notifications: updatedNotifications
      });
    }
  }

  async requestPermission(userId: string): Promise<PushSubscription | null> {
    try {
      const subscription = await this.initialize();
      if (!subscription) return null;

      // Save subscription to Firestore
      const userRef = doc(db, 'users', userId);
      const restaurantRef = doc(db, 'restaurants', userId);
      
      // Update both user and restaurant documents
      await Promise.all([
        updateDoc(userRef, {
          pushSubscription: JSON.stringify(subscription)
        }),
        updateDoc(restaurantRef, {
          pushSubscription: JSON.stringify(subscription)
        })
      ]);

      // Save to in-memory map
      this.subscriptions.set(userId, subscription);
      
      return subscription;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return null;
    }
  }

  async sendNewOrderNotification(restaurantId: string, notification: OrderNotification) {
    try {
      // Try in-memory cache first
      let subscription = this.subscriptions.get(restaurantId);

      // If not in cache, try Firestore
      if (!subscription) {
        const userRef = doc(db, 'users', restaurantId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists() || !userDoc.data().pushSubscription) {
          console.error('No subscription found for restaurant:', restaurantId);
          return;
        }

        const parsedSubscription = JSON.parse(userDoc.data().pushSubscription) as PushSubscription;
        if (!parsedSubscription) {
          throw new Error('Invalid push subscription data');
        }
        this.subscriptions.set(restaurantId, parsedSubscription);
      }

      // Send push notification
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          title: 'New Order!',
          body: notification.message,
          data: { 
            orderId: notification.orderId,
            amount: notification.amount,
            customerName: notification.customerName,
            sound: '/notification-sound.mp3'
          }
        })
      });

      // Store notification in Firestore
      const userRef = doc(db, 'users', restaurantId);
      await updateDoc(userRef, {
        notifications: arrayUnion({
          ...notification,
          timestamp: new Date().toISOString(),
          read: false
        })
      });

    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  async deleteNotification(userId: string, notificationId: string) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const notifications = userDoc.data().notifications || [];
        const notification = notifications.find((n: OrderNotification) => n.id === notificationId);
        
        if (notification) {
          await updateDoc(userRef, {
            notifications: arrayRemove(notification)
          });
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  async deleteAllNotifications(userId: string) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        notifications: []
      });
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService(); 