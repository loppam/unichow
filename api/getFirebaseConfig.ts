import type { VercelRequest, VercelResponse } from "@vercel/node";

export default (req: VercelRequest, res: VercelResponse) => {
  // Add authentication and authorization checks here

  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
    vapidKey: process.env.VITE_FIREBASE_VAPID_KEY,
    privateKey: process.env.VITE_FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.VITE_FIREBASE_CLIENT_EMAIL
  };

  res.status(200).json(firebaseConfig);
}; 