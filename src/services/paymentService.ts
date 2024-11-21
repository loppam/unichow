import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import axios from 'axios';
import { RestaurantPaymentInfo } from '../types/restaurant';

const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY;
const PAYSTACK_API = 'https://api.paystack.co';

export const paymentService = {
  async createSubaccount(restaurantId: string, paymentInfo: RestaurantPaymentInfo) {
    try {
      // Create Paystack subaccount
      const response = await axios.post(
        `${PAYSTACK_API}/subaccount`,
        {
          business_name: paymentInfo.accountName,
          settlement_bank: paymentInfo.bankName,
          account_number: paymentInfo.accountNumber,
          percentage_charge: 90, // Platform takes 10%
          description: `Restaurant ${restaurantId} subaccount`
        },
        {
          headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update restaurant document with subaccount code
      const restaurantRef = doc(db, 'restaurants', restaurantId);
      await updateDoc(restaurantRef, {
        'paymentInfo.paystackSubaccountCode': response.data.data.subaccount_code,
        'paymentInfo.isVerified': true,
        'paymentInfo.lastUpdated': new Date().toISOString()
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
  }
};