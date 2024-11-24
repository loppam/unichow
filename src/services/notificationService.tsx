import { db } from '../firebase/config';
import { collection, doc, setDoc, updateDoc, query, where, orderBy, limit, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';
import { Order, OrderNotification } from '../types/order';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { toast } from 'react-hot-toast';

class NotificationService {
  private messaging: Messaging | null = null;
  private initialized = false;

  async initialize() {
    try {
      if (!await this.isNotificationSupported()) {
        console.log('Push notifications not supported');
        return false;
      }

      const messaging = getMessaging();
      this.messaging = messaging;
      this.initialized = true;

      // Request permission and get token
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        });
        return token;
      }
      
      return false;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  async registerRestaurantDevice(restaurantId: string, token: string) {
    try {
      const tokenRef = doc(db, 'restaurants', restaurantId, 'fcmTokens', token);
      await setDoc(tokenRef, {
        token,
        device: 'pwa',
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  }

  async sendNewOrderNotification(restaurantId: string, order: Order) {
    try {
      // Create in-app notification
      await this.createOrderNotification(restaurantId, {
        orderId: order.id,
        customerName: order.customerName,
        amount: order.total,
        status: 'pending',
        message: `New order received from ${order.customerName}`,
        timestamp: new Date().toISOString(),
        type: 'order',
        read: false
      });

      // Get valid FCM tokens
      const tokensSnapshot = await getDocs(collection(db, "restaurants", restaurantId, "fcmTokens"));
      const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

      if (tokens.length === 0) return;

      // Send push notification to all devices
      const notifications = tokens.map(token => 
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            title: 'New Order!',
            body: `Order #${order.id.slice(-6)} - ${order.customerName} - ₦${order.total.toFixed(2)}`,
            data: {
              type: 'order',
              orderId: order.id,
              restaurantId: restaurantId,
              url: `/restaurant/orders/${order.id}`
            },
            icon: '/logo192.png',
            badge: '/logo192.png',
            vibrate: [200, 100, 200],
            tag: `order_${order.id}`,
            requireInteraction: true
          })
        })
      );

      await Promise.all(notifications);
    } catch (error) {
      console.error('Error sending new order notification:', error);
      throw error;
    }
  }

  private setupTokenRefresh() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Received foreground message:', payload);
      this.showNotificationToast(payload);
    });
  }

  private showNotificationToast(payload: any) {
    toast.custom((t) => (
      <div className="notification-toast">
        <div className="notification-content">
          <img src="/logo192.png" alt="" className="notification-icon" />
          <div className="notification-text">
            <p className="notification-title">{payload.notification?.title}</p>
            <p className="notification-body">{payload.notification?.body}</p>
          </div>
        </div>
      </div>
    ), {
      duration: 5000,
      position: 'top-right'
    });
  }

  async requestPermission(userId: string): Promise<string | null> {
    if (!this.initialized) {
      throw new Error('Messaging not initialized');
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }

      const token = await getToken(this.messaging!, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });

      if (token) {
        await this.saveToken(userId, token);
        return token;
      }

      throw new Error('No registration token available');
    } catch (error) {
      console.error('An error occurred while requesting permission:', error);
      throw error;
    }
  }

  async saveToken(userId: string, token: string, userType: 'restaurant' | 'user' = 'user'): Promise<void> {
    const tokenRef = doc(db, `${userType}s`, userId, "fcmTokens", token);
    await setDoc(tokenRef, {
      token,
      createdAt: new Date().toISOString(),
      platform: "web",
      lastActive: new Date().toISOString(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language
      }
    });
  }

  subscribeToOrderNotifications(restaurantId: string, callback: (notifications: OrderNotification[]) => void) {
    const notificationsRef = collection(db, `restaurants/${restaurantId}/notifications`);
    const q = query(
      notificationsRef,
      where('read', '==', false),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OrderNotification[];
      callback(notifications);
    });
  }

  async markAsRead(restaurantId: string, notificationId: string) {
    const notificationRef = doc(db, `restaurants/${restaurantId}/notifications/${notificationId}`);
    await updateDoc(notificationRef, {
      read: true,
      readAt: new Date().toISOString()
    });
  }

  async markAllAsRead(restaurantId: string) {
    const batch = writeBatch(db);
    const notificationsRef = collection(db, `restaurants/${restaurantId}/notifications`);
    const q = query(notificationsRef, where("read", "==", false));
    const snapshot = await getDocs(q);

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        read: true,
        readAt: new Date().toISOString()
      });
    });

    await batch.commit();
  }

  async createOrderNotification(restaurantId: string, notification: Omit<OrderNotification, 'id'>) {
    const notificationsRef = collection(db, `restaurants/${restaurantId}/notifications`);
    const newNotificationRef = doc(notificationsRef);
    await setDoc(newNotificationRef, {
      id: newNotificationRef.id,
      ...notification,
      timestamp: new Date().toISOString(),
      read: false
    });
  }

  async checkPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      return false;
    }
    return Notification.permission === 'granted';
  }

  setupForegroundListener() {
    if (!this.initialized || !this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Received foreground message:', payload);
      
      // Play notification sound
      const sound = new Audio('/notification-sound.mp3');
      sound.play().catch(console.error);
      
      // Show toast notification
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} 
          max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto 
          flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <img className="h-10 w-10 rounded-full" src="/logo192.png" alt="" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {payload.notification?.title}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {payload.notification?.body}
                </p>
              </div>
            </div>
          </div>
        </div>
      ), {
        duration: 5000,
        position: 'top-right'
      });
    });
  }

  async isNotificationSupported(): Promise<boolean> {
    try {
      return 'Notification' in window && await isSupported();
    } catch (error) {
      console.error('Error checking notification support:', error);
      return false;
    }
  }

  async requestRestaurantPermission(restaurantId: string): Promise<string | null> {
    if (!this.initialized) {
      throw new Error('Messaging not initialized');
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }

      const token = await getToken(this.messaging!, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });

      if (token) {
        await this.saveToken(restaurantId, token, 'restaurant');
        return token;
      }

      throw new Error('No registration token available');
    } catch (error) {
      console.error('An error occurred while requesting permission:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService(); 