import { db } from '../firebase/config';
import { collection, doc, setDoc, updateDoc, query, where, onSnapshot, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore';
import { OrderNotification } from '../types/order';

export const notificationService = {
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
  },

  async markAsRead(restaurantId: string, notificationId: string) {
    const notificationRef = doc(db, `restaurants/${restaurantId}/notifications/${notificationId}`);
    await updateDoc(notificationRef, {
      read: true,
      readAt: new Date().toISOString()
    });
  },

  async markAllAsRead(restaurantId: string) {
    const batch = writeBatch(db);
    const notificationsRef = collection(db, `restaurants/${restaurantId}/notifications`);
    const q = query(notificationsRef, where('read', '==', false));
    const snapshot = await getDocs(q);

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: new Date().toISOString()
      });
    });

    await batch.commit();
  },

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
}; 