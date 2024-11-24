import { notificationService } from '../services/notificationService';

export async function testNotification(userId: string, userType: 'restaurant' | 'user' = 'user') {
  try {
    const isSupported = await notificationService.isNotificationSupported();
    if (!isSupported) {
      throw new Error('Notifications are not supported in this environment');
    }

    const token = userType === 'restaurant' 
      ? await notificationService.requestRestaurantPermission(userId)
      : await notificationService.requestPermission(userId);
      
    if (!token) {
      throw new Error('Failed to get notification token');
    }

    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        title: 'Test Notification',
        body: 'This is a test notification. If you see this, notifications are working!',
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.details || data.error || 'Failed to send test notification');
    }

    try {
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Test notification failed:', error);
      throw error;
    }
  } catch (error) {
    console.error('Test notification failed:', error);
    throw error;
  }
} 