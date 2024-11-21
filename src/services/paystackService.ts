import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import axios from 'axios';
import { securePaymentService } from './securePaymentService';
import { createPaystackHmac } from '../utils/crypto';
import { RestaurantPaymentInfo } from '../types/restaurant';

const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY;
const PAYSTACK_API = 'https://api.paystack.co';

interface WebhookRequest extends Request {
  body: any;
  headers: Headers & {
    'x-paystack-signature': string;
  };
}

interface TransferData {
  reference: string;
  amount: number;
  status: string;
  recipient: {
    type: string;
    currency: string;
    name: string;
    details: {
      account_number: string;
      bank_code: string;
      bank_name: string;
    };
  };
}

export const paystackService = {
  async createSubaccount(restaurantId: string, paymentInfo: RestaurantPaymentInfo) {
    try {
      // Validate payment info first
      securePaymentService.validatePaymentInfo(paymentInfo);

      // Create Paystack subaccount
      const response = await axios.post(
        `${PAYSTACK_API}/subaccount`,
        {
          business_name: paymentInfo.accountName,
          settlement_bank: paymentInfo.bankName,
          account_number: paymentInfo.accountNumber,
          percentage_charge: 90,
          description: `Restaurant ${restaurantId} subaccount`
        },
        {
          headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Save payment info securely
      await securePaymentService.savePaymentInfo(restaurantId, {
        ...paymentInfo,
        paystackSubaccountCode: response.data.data.subaccount_code,
        isVerified: true,
        lastUpdated: new Date().toISOString()
      });

      return response.data.data;
    } catch (error) {
      console.error('Error creating subaccount:', error);
      throw error;
    }
  },

  async verifyBankAccount(accountNumber: string, bankCode: string) {
    try {
      const response = await axios.get(
        `${PAYSTACK_API}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
          }
        }
      );
      return response.data.data;
    } catch (error) {
      throw new Error('Unable to verify bank account');
    }
  },

  async getBankList() {
    try {
      const response = await axios.get(
        `${PAYSTACK_API}/bank`,
        {
          headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
          }
        }
      );
      return response.data.data;
    } catch (error) {
      throw new Error('Unable to fetch bank list');
    }
  },

  // Webhook handler for payment events
  async handleWebhook(req: WebhookRequest) {
    try {
      const hash = createPaystackHmac(req.body);
      const signature = req.headers['x-paystack-signature'];

      if (hash !== signature) {
        throw new Error('Invalid signature');
      }

      const event = req.body;

      switch (event.event) {
        case 'transfer.success':
          await this.handleTransferSuccess(event.data as TransferData);
          break;
        case 'transfer.failed':
          await this.handleTransferFailed(event.data as TransferData);
          break;
        default:
          console.log(`Unhandled event type: ${event.event}`);
      }

      return { status: 'success' };
    } catch (error) {
      console.error('Webhook error:', error);
      throw error;
    }
  },

  async handleTransferSuccess(data: TransferData) {
    // Update transfer status in database
    const transferRef = doc(db, 'transfers', data.reference);
    await updateDoc(transferRef, {
      status: 'success',
      updatedAt: new Date().toISOString()
    });
  },

  async handleTransferFailed(data: TransferData) {
    // Update transfer status in database
    const transferRef = doc(db, 'transfers', data.reference);
    await updateDoc(transferRef, {
      status: 'failed',
      updatedAt: new Date().toISOString()
    });
  }
}; 