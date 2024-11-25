import type { VercelRequest, VercelResponse } from "@vercel/node";
import webpush from 'web-push';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    webpush.setVapidDetails(
      'mailto:lolade132@gmail.com',
      process.env.VITE_VAPID_PUBLIC_KEY!,
      process.env.VITE_VAPID_PRIVATE_KEY!
    );

    const { subscription, title, body, data } = req.body;
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, data }));
    
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
