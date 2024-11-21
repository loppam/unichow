import { db } from '../firebase/config';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { RestaurantPaymentInfo } from '../types/restaurant';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

export const securePaymentService = {
  // Encrypt sensitive data
  encryptData(data: string): string {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  },

  // Decrypt sensitive data
  decryptData(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  },

  // Save payment info securely
  async savePaymentInfo(
    restaurantId: string, 
    paymentInfo: RestaurantPaymentInfo
  ): Promise<void> {
    try {
      // Encrypt sensitive data
      const encryptedInfo = {
        ...paymentInfo,
        accountNumber: this.encryptData(paymentInfo.accountNumber),
        bankName: this.encryptData(paymentInfo.bankName),
        accountName: this.encryptData(paymentInfo.accountName),
      };

      // Split data into public and private parts
      const publicData = {
        paymentInfo: {
          isVerified: paymentInfo.isVerified,
          settlementSchedule: paymentInfo.settlementSchedule,
          lastUpdated: paymentInfo.lastUpdated,
          paystackSubaccountCode: paymentInfo.paystackSubaccountCode,
        }
      };

      const privateData = {
        encryptedPaymentInfo: {
          accountNumber: encryptedInfo.accountNumber,
          bankName: encryptedInfo.bankName,
          accountName: encryptedInfo.accountName,
        }
      };

      // Save to separate collections
      await Promise.all([
        updateDoc(doc(db, 'restaurants', restaurantId), publicData),
        setDoc(
          doc(db, 'restaurants', restaurantId, 'private', 'paymentInfo'), 
          privateData
        )
      ]);
    } catch (error) {
      console.error('Error saving payment info:', error);
      throw new Error('Failed to save payment information securely');
    }
  },

  // Validate payment info
  validatePaymentInfo(paymentInfo: RestaurantPaymentInfo): boolean {
    const accountNumberRegex = /^\d{10}$/;
    if (!accountNumberRegex.test(paymentInfo.accountNumber)) {
      throw new Error('Invalid account number format');
    }
    if (!paymentInfo.bankName || !paymentInfo.accountName) {
      throw new Error('Missing required payment information');
    }
    return true;
  }
}; 