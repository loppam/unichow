import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin from "firebase-admin";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "unichow-49eb7",
        clientEmail:
          "firebase-adminsdk-5c7np@unichow-49eb7.iam.gserviceaccount.com",
        // Replace with your actual private key from Firebase Console
        privateKey:
          "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC4ezcmIjp5BpJs\nUw7xpcV7TkmZNsGaLd/y5hDjE4rLdBdKmsz1EE6H1bnVU4ogx+i9m52ApbjkLTlj\nQJvw32OOpLDBQshNg5FVd4lw7TmuSvEFvDOffhJ9XjCaK0RW1i9Vl24sMRZA9wNN\neATH1wkimIDxjqDl0Z96rrkBp9hPfx0hRG2BYZ68hE5L/EesG2uS1+K9ppITHs2H\nThxpZUd2UG6pX3o51DWs3FKJo7v9mrWOITUkwN3d75duf0GXEHMScNWFZFQ2GRMe\nxkOKU4UEaNUZO3VofbdyOJoSVYCFN9PsWQDGoZsVW7Amv2MkWUcSimuLc2B6efY2\nI3Mie873AgMBAAECggEAB8VE4unRLbTdqQtslzgk09dN2VLJn91rz/bp4i66C2zV\n6FIR7QalUCpr+/TbXhsdjhMGdNtGKPJQtwILL3+xWVpNia5u8njmv8NbujJ72gAV\nG+k8AW1ViQtVH8FPzRqTftb0kI72wYDGFlbGWMaRf3AOCl64H0YPoiLG7y9rOJnv\nJRqz7M4mJZ5w4BVq04V/A5AG/VwL9UEU62OXK+RbWpDu8f/8SQnu57gbkU4/1Yr9\ngosphkKVzrK/carMr5UB03Jnr8W6A18e6FMoV/I053ykySvUJOol34H9+/zkbfBd\npl//m15G6tLddpmsf4EivlYM221k0plpHb1PjElY/QKBgQD15BzxVHf2JIDQuyUL\nB21M+MPoxe1K0qYx6bRdjywjEiguq5bA1YVio4QUu5IcJsC188jLhbCz7A2O5E8H\nlZweZcobf+Q65nzErqFCGqt40RjIZl+8izEFM8A6ANW2FinAUL81dZoCGrYknXXG\ncftCiMHARj52JOMdRf/kzMt2vQKBgQDAEMs1jjuwT/7OzQvTt51scvB0EPHdXWa9\na8Dr1NeDi95KkcxoPq7P6mpwB6zmMwxZghQm54bcWB7DRfU2ldyfMVYUYIeVhdlk\n4qsiQWBIgf7VTjpsbT8VaV+dgiO19GIWgbajFMLyIt5F/KOyYXElF2mAzIhm1Ytf\n2y/o4hohwwKBgQDt2M6KPbugM2ULAsttJKz8VHEkWzgSNTqfc0GNcm0uK2UE5+N1\n+dQBOswLRfiqFG46Umq7O0FWeJIQ0xUC8BvIZ4udGBOLSeIMWiMQDz4oKpI/Xo9i\nkH1FW+6n7KDMdhnCthiOvIfRW0cumcUPxLdXf3Ny6j+HBl1NtqU1C0gQPQKBgQCU\nTuN7cV8p4DuUGMVfMNPAoGiIV2VMWAkzj3cjI/FexKxbzIWYoX5/UjXqWCLshtKs\nc0N4XyPGFc17YBPfmI0J6CDeD0Pi875Qpq8a/nyIwMi0kXmPrDQgJoQMridBI3py\ngqsy9p8qNj6IsHL/FTs3NwLi0A0ryw2acThnjeA73QKBgFRPH4HxBAfdh+Ovr/ye\nOdX6h1sm/ZXSq+QBKk0I7KYL8hipVeJGujleSgxLyZE7ww58jT1MT9zPY6o4fCkt\nPAKqUVXqmf8QmHCSwsj07/uYsP6tho/ZrYy7TZ2UpmpsIem4LUhUlWa4JmQDlMFo\nGgaaYCkvhNU28cV176CwLbvG\n-----END PRIVATE KEY-----\n",
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const handler = async (req: VercelRequest, res: VercelResponse) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, title, body } = req.body;

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
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          icon: '/whitefavicon192x192.png',
          badge: '/whitefavicon192x192.png',
          requireInteraction: true
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
