import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { notificationService } from "../services/notificationService";
import type { OrderNotification } from "../types/order";

interface OrderNotificationContextType {
  notifications: OrderNotification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  playSound: boolean;
  setPlaySound: (play: boolean) => void;
}

const OrderNotificationContext = createContext<OrderNotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  playSound: true,
  setPlaySound: () => {},
});

export const useOrderNotifications = () => useContext(OrderNotificationContext);

export function OrderNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [playSound, setPlaySound] = useState(true);
  const [notificationSound] = useState(new Audio("/notification-sound.mp3"));

  useEffect(() => {
    if (!user) return;

    // Only subscribe to notifications if the user is a restaurant
    if (user.userType !== "restaurant") {
      setNotifications([]);
      return;
    }

    const unsubscribe = notificationService.subscribeToOrderNotifications(
      user.uid,
      (newNotifications) => {
        setNotifications(newNotifications);

        // Play sound for new notifications
        if (playSound && newNotifications.length > notifications.length) {
          notificationSound.play().catch(console.error);
        }
      }
    );

    return () => unsubscribe();
  }, [user, notifications.length, playSound, notificationSound]);

  const markAsRead = async (notificationId: string) => {
    if (!user || user.userType !== "restaurant") return;
    await notificationService.markAsRead(user.uid, notificationId);
  };

  const markAllAsRead = async () => {
    if (!user || user.userType !== "restaurant") return;
    await notificationService.markAllAsRead(user.uid);
  };

  return (
    <OrderNotificationContext.Provider
      value={{
        notifications,
        unreadCount: notifications.length,
        markAsRead,
        markAllAsRead,
        playSound,
        setPlaySound,
      }}
    >
      {children}
    </OrderNotificationContext.Provider>
  );
}
