import { db } from "../firebase/config";
import {
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import axios from "axios";
import { RestaurantPaymentInfo } from "../types/restaurant";
import { RiderPaymentInfo, Rider } from "../types/rider";
import { Transaction, Balance } from "../types/transaction";

const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY;
const PAYSTACK_API = "https://api.paystack.co";
const PAYSTACK_FEE_PERCENTAGE = 0.015; // 1.5%
const PAYSTACK_FEE_CAP = 2000; // ₦2000
const PAYSTACK_FLAT_FEE = 100; // ₦100

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
      // First create or update Paystack subaccount if not exists
      if (!paymentInfo.paystackSubaccountCode) {
        // Get restaurant details
        const restaurantDoc = await getDoc(
          doc(db, "restaurants", restaurantId)
        );
        const restaurantData = restaurantDoc.data();

        if (!restaurantData) {
          throw new Error("Restaurant not found");
        }

        // Create Paystack subaccount
        const response = await this.createPaystackSubaccount({
          business_name: restaurantData.restaurantName,
          settlement_bank: paymentInfo.bankName,
          account_number: paymentInfo.accountNumber,
          percentage_charge: 0,
        });

        if (!response.status) {
          throw new Error(
            response.message || "Failed to create Paystack subaccount"
          );
        }

        // Add the subaccount code to payment info
        paymentInfo.paystackSubaccountCode = response.data.subaccount_code;
      }

      // Remove undefined fields from paymentInfo
      const cleanPaymentInfo = Object.fromEntries(
        Object.entries(paymentInfo).filter(([_, value]) => value !== undefined)
      );

      const restaurantRef = doc(db, "restaurants", restaurantId);
      await updateDoc(restaurantRef, {
        paymentInfo: cleanPaymentInfo,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating restaurant payment info:", error);
      throw new Error("Failed to update payment information");
    }
  },

  async verifyBankAccount(accountNumber: string, bankCode: string) {
    try {
      if (!accountNumber || !bankCode) {
        throw new Error("Account number and bank code are required");
      }

      const response = await axios.get(
        `${PAYSTACK_API}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (!response.data.status) {
        throw new Error(
          response.data.message || "Failed to verify bank account"
        );
      }

      return response.data.data;
    } catch (error) {
      console.error("Bank verification error:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message || "Unable to verify bank account"
        );
      }
      throw error;
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

  async createRiderSubaccount(
    riderId: string,
    riderData: {
      name: string;
      email: string;
      phone: string;
      bankCode?: string;
      bankName?: string;
      accountNumber: string;
      accountName: string;
    }
  ) {
    try {
      // Log the received data
      console.log("Creating rider subaccount with data:", {
        riderId,
        ...riderData,
      });

      // Get the bank code from either field
      const bankCode = riderData.bankCode || riderData.bankName;
      if (!bankCode) {
        throw new Error("Bank code is required");
      }

      // Validate input data
      if (!riderData.accountNumber) {
        throw new Error("Account number is required");
      }
      if (!riderData.accountName) {
        throw new Error("Account name is required");
      }

      // Ensure required fields have values
      const name = riderData.name?.trim() || "Rider";
      const email = riderData.email?.trim() || "";
      const phone = riderData.phone?.trim() || "";

      // First verify the bank account
      console.log("Verifying bank account...");
      const bankVerification = await this.verifyBankAccount(
        riderData.accountNumber,
        bankCode
      );

      if (!bankVerification) {
        throw new Error("Bank account verification failed");
      }

      if (
        bankVerification.account_name.toLowerCase() !==
        riderData.accountName.toLowerCase()
      ) {
        throw new Error("Account name does not match bank records");
      }

      // Create subaccount in Paystack
      console.log("Creating Paystack subaccount...");
      const response = await axios.post(
        `${PAYSTACK_API}/subaccount`,
        {
          business_name: name,
          settlement_bank: bankCode,
          account_number: riderData.accountNumber,
          percentage_charge: 0,
          description: `Rider account for ${name}`,
          primary_contact_email: email,
          primary_contact_name: name,
          primary_contact_phone: phone,
          metadata: {
            riderId,
            accountName: riderData.accountName.trim(),
            email,
            phone,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || "Failed to create subaccount");
      }

      const subaccountCode = response.data.data.subaccount_code;
      console.log("Subaccount created successfully:", subaccountCode);

      // Update rider document with subaccount code
      console.log("Updating rider document...");
      await updateDoc(doc(db, "riders", riderId), {
        paymentInfo: {
          paystackSubaccountCode: subaccountCode,
          bankCode: bankCode,
          accountNumber: riderData.accountNumber,
          accountName: riderData.accountName.trim(),
          email,
          phone,
          updatedAt: serverTimestamp(),
        },
      });

      return subaccountCode;
    } catch (error) {
      console.error("Error creating rider subaccount:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message || "Failed to create subaccount"
        );
      }
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
          currency: "NGN",
          metadata: {
            orderId,
            riderId,
            type: "delivery_fee",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || "Transfer failed");
      }

      // Update order payment status
      await updateDoc(doc(db, "orders", orderId), {
        deliveryFeeTransferred: true,
        deliveryFeeTransferredAt: serverTimestamp(),
        deliveryFeeTransferReference: response.data.data.reference,
      });

      return response.data.data;
    } catch (error) {
      console.error("Error transferring delivery fee:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Transfer failed");
      }
      throw error;
    }
  },

  async getRiderBalance(riderId: string): Promise<number> {
    try {
      const riderDoc = await getDoc(doc(db, "riders", riderId));
      if (!riderDoc.exists()) {
        throw new Error("Rider not found");
      }

      const riderData = riderDoc.data();
      if (!riderData.paymentInfo?.paystackSubaccountCode) {
        return 0;
      }

      // Get transactions for the subaccount
      const response = await axios.get(`${PAYSTACK_API}/transaction/totals`, {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
        params: {
          subaccount: riderData.paymentInfo.paystackSubaccountCode,
        },
      });

      if (!response.data.status) {
        throw new Error(response.data.message || "Failed to fetch balance");
      }

      // The total_volume represents the total amount processed
      return response.data.data.total_volume / 100; // Convert from kobo to naira
    } catch (error) {
      console.error("Error fetching rider balance:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message || "Failed to fetch balance"
        );
      }
      throw error;
    }
  },

  // Add new methods for ledger system
  async recordTransaction(
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">
  ) {
    try {
      const now = new Date().toISOString();
      const transactionRef = await addDoc(collection(db, "transactions"), {
        ...transaction,
        createdAt: now,
        updatedAt: now,
      });

      // Update balance
      await this.updateBalance(transaction.userId, transaction.userType, {
        amount: transaction.amount,
        fees: transaction.fees,
        type: transaction.type,
      });

      return transactionRef.id;
    } catch (error) {
      console.error("Error recording transaction:", error);
      throw new Error("Failed to record transaction");
    }
  },

  async updateBalance(
    userId: string,
    userType: "restaurant" | "rider",
    transaction: {
      amount: number;
      fees: number;
      type: "payment" | "withdrawal" | "fee";
    }
  ) {
    try {
      const balanceRef = doc(db, `${userType}s/${userId}/private/balance`);
      const balanceDoc = await getDoc(balanceRef);
      const currentBalance = balanceDoc.exists()
        ? (balanceDoc.data() as Balance)
        : {
            totalReceived: 0,
            totalFees: 0,
            totalWithdrawals: 0,
            availableBalance: 0,
            lastUpdated: new Date().toISOString(),
          };

      // Update balance based on transaction type
      switch (transaction.type) {
        case "payment":
          currentBalance.totalReceived += transaction.amount;
          currentBalance.totalFees += transaction.fees;
          currentBalance.availableBalance +=
            transaction.amount - transaction.fees;
          break;
        case "withdrawal":
          currentBalance.totalWithdrawals += transaction.amount;
          currentBalance.availableBalance -= transaction.amount;
          break;
        case "fee":
          currentBalance.totalFees += transaction.amount;
          currentBalance.availableBalance -= transaction.amount;
          break;
      }

      currentBalance.lastUpdated = new Date().toISOString();

      await updateDoc(balanceRef, currentBalance);
      return currentBalance;
    } catch (error) {
      console.error("Error updating balance:", error);
      throw new Error("Failed to update balance");
    }
  },

  async getBalance(
    userId: string,
    userType: "restaurant" | "rider"
  ): Promise<Balance> {
    try {
      const balanceRef = doc(db, `${userType}s/${userId}/private/balance`);
      const balanceDoc = await getDoc(balanceRef);

      if (!balanceDoc.exists()) {
        return {
          totalReceived: 0,
          totalFees: 0,
          totalWithdrawals: 0,
          availableBalance: 0,
          lastUpdated: new Date().toISOString(),
        };
      }

      return balanceDoc.data() as Balance;
    } catch (error) {
      console.error("Error fetching balance:", error);
      throw new Error("Failed to fetch balance");
    }
  },

  async getTransactionHistory(
    userId: string,
    userType: "restaurant" | "rider"
  ): Promise<Transaction[]> {
    try {
      const transactionsRef = collection(db, "transactions");
      const q = query(
        transactionsRef,
        where("userId", "==", userId),
        where("userType", "==", userType)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      throw new Error("Failed to fetch transaction history");
    }
  },

  calculatePaystackFee(amount: number): number {
    const percentageFee = amount * PAYSTACK_FEE_PERCENTAGE;
    const totalFee = Math.min(
      percentageFee + PAYSTACK_FLAT_FEE,
      PAYSTACK_FEE_CAP
    );
    return totalFee;
  },

  async processRefund(orderId: string, amount: number): Promise<void> {
    try {
      const response = await fetch(`${PAYSTACK_API}/refund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction: orderId,
          amount: amount * 100, // Convert to kobo
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process refund");
      }
    } catch (error) {
      console.error("Error processing refund:", error);
      throw error;
    }
  },
};
