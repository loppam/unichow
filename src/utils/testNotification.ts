import { notificationService } from '../services/notificationService';

export async function testNotification(userId: string) {
  try {
    // First check if notifications are supported
    const isSupported = await notificationService.isNotificationSupported();
    if (!isSupported) {
      throw new Error('Notifications are not supported in this environment');
    }

    // Request permission and get token
    const token = await notificationService.requestPermission(userId);
    if (!token) {
      throw new Error('Failed to get notification token');
    }

    const API_URL = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : '';

    // Test sending a notification
    const response = await fetch(`${API_URL}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        token,
        title: 'Test Notification',
        body: 'This is a test notification. If you see this, notifications are working!',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Failed to send test notification');
    }

    return true;
  } catch (error) {
    console.error('Test notification failed:', error);
    throw error;
  }
} 