import { Order, OrderNotification } from '../types/order';
import { doc, getDoc, updateDoc, onSnapshot, query, collection, orderBy, where, getDocs, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getMessaging } from 'firebase/messaging';

class NotificationService {
  private vapidKey = import.meta.env.VITE_FIREBASE_VAPID_PUBLIC_KEY;
  private notificationSound: HTMLAudioElement;

  private subscriptions: Map<string, PushSubscription> = new Map();

  constructor() {
    this.notificationSound = new Audio('/notification-sound.mp3');
    // Preload the sound
    this.notificationSound.load();
  }

  private playNotificationSound() {
    this.notificationSound.currentTime = 0; // Reset the audio to start
    return this.notificationSound.play().catch(error => {
      console.error('Error playing notification sound:', error);
    });
  }

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

      // Get push subscription using the PUBLIC key
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.vapidKey
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
      // First save notification to Firestore with all required fields
      const notificationData = {
        ...notification,
        id: notification.id || Date.now().toString(),
        timestamp: serverTimestamp(),
        read: false,
        type: 'order',
        customerName: notification.customerName || 'Customer',
        amount: notification.amount || 0,
        status: notification.status || 'pending',
        orderId: notification.orderId,
        message: notification.message
      };

      await addDoc(collection(db, 'restaurants', restaurantId, 'notifications'), notificationData);

      // Then handle push notification
      const subscription = await this.getSubscription(restaurantId);
      if (!subscription) return;

      // Play sound for foreground notifications
      await this.playNotificationSound();

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          title: 'New Order',
          body: notification.message,
          data: { orderId: notification.orderId }
        })
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  async requestPermission(userId: string): Promise<PushSubscription | null> {
    return this.initialize();
  }

  setupForegroundListener() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'notification') {
        // Play sound for foreground notifications
        this.playNotificationSound();
        
        // Show the notification
        new Notification(event.data.title, {
          body: event.data.body,
          icon: '/whitefavicon192x192.png',
          data: event.data.data
        });
      }
    });
  }

  subscribeToOrderNotifications(restaurantId: string, callback: (notifications: OrderNotification[]) => void) {
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'restaurants', restaurantId, 'notifications'),
        orderBy('timestamp', 'desc')
      ),
      (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as OrderNotification[];
        callback(notifications);
      }
    );

    return unsubscribe;
  }

  async markAsRead(restaurantId: string, notificationId: string) {
    await updateDoc(
      doc(db, 'restaurants', restaurantId, 'notifications', notificationId),
      { read: true }
    );
  }

  async markAllAsRead(restaurantId: string) {
    const notificationsRef = collection(db, 'restaurants', restaurantId, 'notifications');
    const unreadQuery = query(notificationsRef, where('read', '==', false));
    const unreadDocs = await getDocs(unreadQuery);
    
    const batch = writeBatch(db);
    unreadDocs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    
    await batch.commit();
  }
}

export const notificationService = new NotificationService(); 