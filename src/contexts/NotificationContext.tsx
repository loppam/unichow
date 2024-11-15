import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';
import { toast } from 'react-hot-toast';

interface NotificationContextType {
  hasPermission: boolean;
  requestPermission: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    checkPermission();
    if (user) {
      notificationService.setupForegroundListener();
    }
  }, [user]);

  const checkPermission = async () => {
    setIsLoading(true);
    try {
      const permission = Notification.permission;
      setHasPermission(permission === 'granted');
    } catch (error) {
      console.error('Error checking notification permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async () => {
    if (!user) {
      toast.error('Please login to enable notifications');
      return;
    }

    try {
      await notificationService.requestPermission(user.uid);
      setHasPermission(true);
      toast.success('Notifications enabled successfully!');
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to enable notifications');
    }
  };

  return (
    <NotificationContext.Provider value={{ hasPermission, requestPermission, isLoading }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 