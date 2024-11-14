import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

interface Notification {
  id: string;
  type: 'approval' | 'rejection' | 'info';
  message: string;
  timestamp: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        const userDoc = doc(db, 'users', user.uid);
        return onSnapshot(userDoc, (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            const userNotifications = userData.notifications || [];
            setNotifications(userNotifications);
            setUnreadCount(userNotifications.filter((n: Notification) => !n.read).length);
          }
        });
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (notificationId: string) => {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const updatedNotifications = notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true }
        : notification
    );

    await updateDoc(userRef, {
      notifications: updatedNotifications
    });
  };

  const markAllAsRead = async () => {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      read: true
    }));

    await updateDoc(userRef, {
      notifications: updatedNotifications
    });
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead 
    }}>
      {children}
    </NotificationContext.Provider>
  );
} 