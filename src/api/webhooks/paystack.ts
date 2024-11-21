import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../../firebase/config';
import { doc, updateDoc, getDoc, increment } from 'firebase/firestore';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export const paystackWebhook = async (req: Request, res: Response) => {
  try {
    // Validate webhook signature
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY!)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).send('Invalid signature');
    }

    const event = req.body;

    // Handle the event
    switch (event.event) {
      case 'charge.success':
        const { reference, metadata } = event.data;
        const { orderId } = metadata;

        // Get order details
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        if (!orderDoc.exists()) {
          return res.status(404).send('Order not found');
        }

        const order = orderDoc.data();

        // Update order payment status
        await updateDoc(doc(db, 'orders', orderId), {
          paymentStatus: 'paid',
          paymentReference: reference,
          updatedAt: new Date().toISOString()
        });

        // Update restaurant and rider balances
        await Promise.all([
          // Update restaurant balance
          updateDoc(doc(db, 'restaurants', order.restaurantId), {
            balance: increment(order.subtotal)
          }),
          
          // Update rider balance
          updateDoc(doc(db, 'riders', order.riderId), {
            balance: increment(order.deliveryFee)
          })
        ]);

        break;

      case 'charge.failed':
        // Handle failed payment
        const failedReference = event.data.reference;
        // Update order status to payment_failed
        break;

      // Handle other webhook events as needed
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
}; 