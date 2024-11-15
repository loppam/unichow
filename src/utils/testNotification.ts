import { notificationService } from '../services/notificationService';

export async function testNotification(userId: string) {
  try {
    const isSupported = await notificationService.isNotificationSupported();
    if (!isSupported) {
      throw new Error('Notifications are not supported in this environment');
    }

    const token = await notificationService.requestPermission(userId);
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

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Notification API error:', data);
      throw new Error(data.details || 'Failed to send test notification');
    }

    return true;
  } catch (error) {
    console.error('Test notification failed:', error);
    throw error;
  }
} 