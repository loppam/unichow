import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../../firebase/config';
import { doc, updateDoc, getDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';

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
    const { metadata, amount } = event.data;

    switch (event.event) {
      case 'charge.success':
        if (metadata?.type === 'wallet_funding') {
          const { userId } = metadata;
          const walletAmount = amount / 100; // Convert from kobo to naira
          
          // Update wallet balance
          const walletRef = doc(db, 'wallets', userId);
          await updateDoc(walletRef, {
            balance: increment(walletAmount),
            lastUpdated: new Date().toISOString()
          });
          
          // Update transaction status
          const transactionQuery = query(
            collection(db, 'walletTransactions'),
            where('reference', '==', event.data.reference)
          );
          const transactionDocs = await getDocs(transactionQuery);
          
          if (!transactionDocs.empty) {
            await updateDoc(doc(db, 'walletTransactions', transactionDocs.docs[0].id), {
              status: 'completed',
              updatedAt: new Date().toISOString()
            });
          }
        }
        break;

      case 'charge.failed':
        if (metadata?.type === 'wallet_funding') {
          const transactionQuery = query(
            collection(db, 'walletTransactions'),
            where('reference', '==', event.data.reference)
          );
          const transactionDocs = await getDocs(transactionQuery);
          
          if (!transactionDocs.empty) {
            await updateDoc(doc(db, 'walletTransactions', transactionDocs.docs[0].id), {
              status: 'failed',
              updatedAt: new Date().toISOString()
            });
          }
        }
        break;
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
}; 