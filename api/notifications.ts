import type { VercelRequest, VercelResponse } from "@vercel/node";
import webpush from 'web-push';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!process.env.VITE_FIREBASE_VAPID_PUBLIC_KEY || !process.env.VITE_FIREBASE_VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured');
    }

    webpush.setVapidDetails(
      'mailto:lolade132@gmail.com',
      process.env.VITE_FIREBASE_VAPID_PUBLIC_KEY,
      process.env.VITE_FIREBASE_VAPID_PRIVATE_KEY
    );

    const { subscription, title, body, data } = req.body;
    
    if (!subscription || !subscription.endpoint) {
      throw new Error('Invalid subscription object');
    }

    const payload = JSON.stringify({
      title,
      body,
      data,
      icon: '/whitefavicon192x192.png',
      badge: '/whitefavicon192x192.png',
      vibrate: [200, 100, 200],
      sound: '/notification-sound.mp3',
      requireInteraction: true,
      silent: false
    });

    await webpush.sendNotification(subscription, payload);
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Notification error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack 
    });
  }
}
