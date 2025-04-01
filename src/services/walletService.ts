import { db } from "../firebase/config";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  runTransaction,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  increment,
  Timestamp,
} from "firebase/firestore";
import { Wallet, WalletTransaction } from "../types/wallet";
import { paystackService } from "./paystackService";
import { PaystackWebhookEvent } from "../types/paystack";
import { cacheService } from "./cacheService";
import { rateLimiterService } from "./rateLimiterService";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const WALLET_SUBACCOUNT_CODE = import.meta.env
  .VITE_PAYSTACK_WALLET_SUBACCOUNT_CODE;

// Configure rate limits
rateLimiterService.setConfig("wallet_read", {
  maxRequests: 10,
  timeWindow: 60000,
}); // 10 requests per minute
rateLimiterService.setConfig("wallet_write", {
  maxRequests: 5,
  timeWindow: 60000,
}); // 5 requests per minute

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    if (retries === 0 || !error?.code || error.code !== "resource-exhausted") {
      throw error;
    }

    console.log(
      `Retrying operation after ${delay}ms. Retries left: ${retries}`
    );
    await sleep(delay);
    return retryWithBackoff(operation, retries - 1, delay * 2);
  }
};

export const walletService = {
  async getWallet(userId: string): Promise<Wallet> {
    // Check rate limit
    if (!(await rateLimiterService.checkRateLimit("wallet_read"))) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    // Try to get from cache first
    const cacheKey = `wallet_${userId}`;
    const cachedWallet = cacheService.get<Wallet>(cacheKey);
    if (cachedWallet) {
      return cachedWallet;
    }

    return retryWithBackoff(async () => {
      const walletRef = doc(db, "wallets", userId);
      const walletDoc = await getDoc(walletRef);

      if (!walletDoc.exists()) {
        // Create new wallet if it doesn't exist
        const newWallet: Wallet = {
          userId,
          balance: 0,
          lastUpdated: new Date().toISOString(),
        };
        await setDoc(walletRef, newWallet);
        cacheService.set(cacheKey, newWallet);
        return newWallet;
      }

      const walletData = walletDoc.data() as Wallet;
      cacheService.set(cacheKey, walletData);
      return walletData;
    });
  },

  async fundWallet(
    userId: string,
    amount: number,
    email: string
  ): Promise<{ reference: string }> {
    if (!WALLET_SUBACCOUNT_CODE) {
      throw new Error("Wallet subaccount code not configured");
    }

    // Create Paystack transaction for wallet funding
    const response = await paystackService.initializeTransaction({
      email,
      amount: amount * 100, // Convert to kobo
      metadata: {
        type: "wallet_funding",
        userId,
      },
      split: {
        type: "percentage",
        bearer_type: "account",
        subaccounts: [
          {
            subaccount: WALLET_SUBACCOUNT_CODE,
            share: 100, // 100% goes to wallet subaccount
          },
        ],
      },
    });

    // Create pending transaction record
    await addDoc(collection(db, "walletTransactions"), {
      userId,
      type: "credit",
      amount,
      description: "Wallet funding",
      reference: response.reference,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { reference: response.reference };
  },

  async payWithWallet(
    userId: string,
    amount: number,
    orderId: string
  ): Promise<void> {
    if (!WALLET_SUBACCOUNT_CODE) {
      throw new Error("Wallet subaccount code not configured");
    }

    // Get order details to get restaurant subaccount
    const orderDoc = await getDoc(doc(db, "orders", orderId));
    if (!orderDoc.exists()) {
      throw new Error("Order not found");
    }

    const orderData = orderDoc.data();
    const restaurantSubaccountCode =
      orderData.restaurantPaymentInfo?.paystackSubaccountCode;
    if (!restaurantSubaccountCode) {
      throw new Error("Restaurant payment information not found");
    }

    // Calculate splits
    const subtotal = orderData.subtotal;
    const serviceFee = orderData.serviceFee;
    const deliveryFee = orderData.deliveryFee;

    // Restaurant gets 100% of meal cost
    const restaurantShare = Math.floor((subtotal / amount) * 100);
    // Platform gets the rest (service fee + delivery fee)
    const platformShare = 100 - restaurantShare;

    // Create Paystack transfer from wallet subaccount
    const response = await paystackService.initializeTransaction({
      email: orderData.customerEmail,
      amount: amount * 100, // Convert to kobo
      metadata: {
        type: "wallet_payment",
        userId,
        orderId,
      },
      split: {
        type: "percentage",
        bearer_type: "account",
        subaccounts: [
          {
            subaccount: restaurantSubaccountCode,
            share: restaurantShare,
          },
          {
            subaccount: WALLET_SUBACCOUNT_CODE,
            share: platformShare,
          },
        ],
      },
    });

    // Update wallet balance
    await runTransaction(db, async (transaction) => {
      const walletRef = doc(db, "wallets", userId);
      const walletDoc = await transaction.get(walletRef);

      if (!walletDoc.exists()) {
        throw new Error("Wallet not found");
      }

      const currentBalance = walletDoc.data().balance;
      if (currentBalance < amount) {
        throw new Error("Insufficient wallet balance");
      }

      // Deduct from wallet balance
      transaction.update(walletRef, {
        balance: currentBalance - amount,
        lastUpdated: new Date().toISOString(),
      });

      // Record transaction
      const transactionRef = collection(db, "walletTransactions");
      transaction.set(doc(transactionRef), {
        userId,
        type: "debit",
        amount,
        description: `Payment for order ${orderId}`,
        reference: response.reference,
        status: "completed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  },

  async getTransactionHistory(userId: string): Promise<WalletTransaction[]> {
    // Check rate limit
    if (!(await rateLimiterService.checkRateLimit("wallet_read"))) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    // Try to get from cache first
    const cacheKey = `transactions_${userId}`;
    const cachedTransactions = cacheService.get<WalletTransaction[]>(cacheKey);
    if (cachedTransactions) {
      return cachedTransactions;
    }

    return retryWithBackoff(async () => {
      const transactionsRef = collection(db, "walletTransactions");
      const q = query(
        transactionsRef,
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WalletTransaction[];

      cacheService.set(cacheKey, transactions);
      return transactions;
    });
  },

  async handlePaystackWebhook(event: PaystackWebhookEvent): Promise<void> {
    if (
      event.event === "charge.success" &&
      event.data.metadata.type === "wallet_funding"
    ) {
      const { userId } = event.data.metadata;
      const amount = event.data.amount / 100; // Convert from kobo to naira

      await runTransaction(db, async (transaction) => {
        const walletRef = doc(db, "wallets", userId);
        const walletDoc = await transaction.get(walletRef);

        if (!walletDoc.exists()) {
          throw new Error("Wallet not found");
        }

        const currentBalance = walletDoc.data().balance;

        // Update wallet balance
        transaction.update(walletRef, {
          balance: currentBalance + amount,
          lastUpdated: new Date().toISOString(),
        });

        // Update transaction status
        const transactionQuery = query(
          collection(db, "walletTransactions"),
          where("reference", "==", event.data.reference)
        );
        const transactionDocs = await getDocs(transactionQuery);

        transactionDocs.forEach((doc) => {
          transaction.update(doc.ref, {
            status: "completed",
            updatedAt: new Date().toISOString(),
          });
        });
      });
    }
  },

  async createWallet(userId: string, initialBalance = 0) {
    return retryWithBackoff(async () => {
      const walletRef = doc(db, "wallets", userId);
      await setDoc(walletRef, {
        balance: initialBalance,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return { balance: initialBalance };
    });
  },

  async addFunds(userId: string, amount: number, transactionId: string) {
    // Check rate limit
    if (!(await rateLimiterService.checkRateLimit("wallet_write"))) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    return retryWithBackoff(async () => {
      const walletRef = doc(db, "wallets", userId);
      const transactionRef = doc(db, "walletTransactions", transactionId);

      // Create transaction record
      await setDoc(transactionRef, {
        userId,
        amount,
        type: "deposit",
        status: "completed",
        createdAt: Timestamp.now(),
        transactionId,
      });

      // Update wallet balance
      await updateDoc(walletRef, {
        balance: increment(amount),
        updatedAt: Timestamp.now(),
      });

      // Invalidate cache
      cacheService.delete(`wallet_${userId}`);
      cacheService.delete(`transactions_${userId}`);

      return { success: true };
    });
  },

  async deductFunds(userId: string, amount: number, transactionId: string) {
    return retryWithBackoff(async () => {
      const walletRef = doc(db, "wallets", userId);
      const transactionRef = doc(db, "walletTransactions", transactionId);

      // Create transaction record
      await setDoc(transactionRef, {
        userId,
        amount: -amount,
        type: "withdrawal",
        status: "completed",
        createdAt: Timestamp.now(),
        transactionId,
      });

      // Update wallet balance
      await updateDoc(walletRef, {
        balance: increment(-amount),
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    });
  },

  async getTransactions(userId: string) {
    return retryWithBackoff(async () => {
      const transactionsRef = collection(db, "walletTransactions");
      const q = query(transactionsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WalletTransaction[];
    });
  },
};
