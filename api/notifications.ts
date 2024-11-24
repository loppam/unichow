import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    clientEmail: process.env.VITE_FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.VITE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  };

  initializeApp({
    credential: cert(serviceAccount)
  });
}

const handler = async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token, title, body, data } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'token, title, and body are required'
      });
    }

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          icon: '/whitefavicon192x192.png',
          badge: '/whitefavicon192x192.png',
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: 'View Details'
            }
          ]
        },
        fcm_options: {
          link: '/notifications'
        }
      }
    };

    const response = await getMessaging().send(message);
    return res.status(200).json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return res.status(500).json({
      error: 'Failed to send notification',
      details: error.message
    });
  }
};

export default handler;
