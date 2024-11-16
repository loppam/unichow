import { db } from '../firebase/config';
import { collection, doc, setDoc, updateDoc, query, where, orderBy, limit, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';
import { OrderNotification } from '../types/order';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { toast } from 'react-hot-toast';

class NotificationService {
  private messaging: Messaging | undefined;
  private initialized: boolean = false;

  constructor() {
    this.initializeMessaging();
  }

  private async initializeMessaging() {
    try {
      if (await isSupported()) {
        this.messaging = getMessaging();
        this.initialized = true;
      } else {
        console.warn('Firebase messaging is not supported in this environment');
      }
    } catch (error) {
      console.error('Failed to initialize messaging:', error);
    }
  }

  async isNotificationSupported(): Promise<boolean> {
    return 'Notification' in window && await isSupported();
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

  setupForegroundListener() {
    if (!this.initialized || !this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Received foreground message:', payload);
      
      const sound = new Audio('/notification-sound.mp3');
      sound.play().catch(console.error);
      
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
      });
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

  async saveToken(userId: string, token: string): Promise<void> {
    const tokenRef = doc(db, "users", userId, "fcmTokens", token);
    await setDoc(tokenRef, {
      token,
      createdAt: new Date().toISOString(),
      platform: "web",
      lastActive: new Date().toISOString(),
    });
  }

  async checkPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      return false;
    }
    return Notification.permission === 'granted';
  }
}

export const notificationService = new NotificationService(); 