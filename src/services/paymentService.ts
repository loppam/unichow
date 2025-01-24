import { db } from "../firebase/config";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import axios from "axios";
import { RestaurantPaymentInfo } from "../types/restaurant";
import { RiderPaymentInfo, Rider } from "../types/rider";

const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY;
const PAYSTACK_API = "https://api.paystack.co";

export const paymentService = {
  async createPaystackSubaccount(data: {
    business_name: string;
    settlement_bank: string;
    account_number: string;
    percentage_charge: number;
  }) {
    try {
      const response = await axios.post(
        "https://api.paystack.co/subaccount",
        {
          business_name: data.business_name,
          settlement_bank: data.settlement_bank,
          account_number: data.account_number,
          percentage_charge: data.percentage_charge,
        },
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error creating Paystack subaccount:", error);
      throw error;
    }
  },

  async updateRestaurantPaymentInfo(
    restaurantId: string,
    paymentInfo: RestaurantPaymentInfo
  ) {
    try {
      const restaurantRef = doc(db, "restaurants", restaurantId);
      await updateDoc(restaurantRef, {
        paymentInfo,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating restaurant payment info:", error);
      throw new Error("Failed to update payment information");
    }
  },

  async verifyBankAccount(accountNumber: string, bankCode: string) {
    try {
      const response = await axios.get(
        `${PAYSTACK_API}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );
      return response.data.data;
    } catch (error) {
      throw new Error("Unable to verify bank account");
    }
  },

  async getBankList() {
    try {
      const response = await axios.get(`${PAYSTACK_API}/bank`, {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      });
      return response.data.data;
    } catch (error) {
      throw new Error("Unable to fetch bank list");
    }
  },

  async createRiderSubaccount(riderId: string, paymentInfo: RiderPaymentInfo) {
    try {
      const subaccountResult = await this.createPaystackSubaccount({
        business_name: `Rider ${riderId}`,
        settlement_bank: paymentInfo.bankName!,
        account_number: paymentInfo.accountNumber!,
        percentage_charge: 0,
      });

      const riderRef = doc(db, "riders", riderId);
      await updateDoc(riderRef, {
        paymentInfo: {
          ...paymentInfo,
          paystackSubaccountCode: subaccountResult.subaccount_code,
          isVerified: true,
          lastUpdated: new Date().toISOString(),
        },
      });

      return subaccountResult;
    } catch (error) {
      console.error("Error creating rider subaccount:", error);
      throw error;
    }
  },

  async updateRiderSubaccount(riderId: string, paymentInfo: RiderPaymentInfo) {
    try {
      const response = await axios.put(
        `${PAYSTACK_API}/subaccount/${paymentInfo.paystackSubaccountCode}`,
        {
          settlement_bank: paymentInfo.bankName,
          account_number: paymentInfo.accountNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const riderRef = doc(db, "riders", riderId);
      await updateDoc(riderRef, {
        paymentInfo: {
          ...paymentInfo,
          lastUpdated: new Date().toISOString(),
        },
      });

      return response.data.data;
    } catch (error) {
      console.error("Error updating rider subaccount:", error);
      throw error;
    }
  },

  async transferDeliveryFee(
    orderId: string,
    riderId: string,
    amount: number
  ): Promise<void> {
    try {
      const riderRef = doc(db, "riders", riderId);
      const riderDoc = await getDoc(riderRef);
      const riderData = riderDoc.data() as Rider;

      if (!riderData.paymentInfo?.paystackSubaccountCode) {
        throw new Error("Rider payment info not found");
      }

      // Transfer delivery fee to rider's subaccount
      const response = await axios.post(
        `${PAYSTACK_API}/transfer`,
        {
          source: "balance",
          amount: amount * 100, // Convert to kobo
          recipient: riderData.paymentInfo.paystackSubaccountCode,
          reason: `Delivery fee for order ${orderId}`,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Update order payment status
      await updateDoc(doc(db, "orders", orderId), {
        deliveryFeeTransferred: true,
        deliveryFeeTransferredAt: serverTimestamp(),
      });

      return response.data.data;
    } catch (error) {
      console.error("Error transferring delivery fee:", error);
      throw error;
    }
  },
};
