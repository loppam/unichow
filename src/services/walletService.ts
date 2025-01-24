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
} from "firebase/firestore";
import { Wallet, WalletTransaction } from "../types/wallet";
import { paystackService } from "./paystackService";
import { PaystackWebhookEvent } from "../types/paystack";

export const walletService = {
  async getWallet(userId: string): Promise<Wallet> {
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
      return newWallet;
    }

    return walletDoc.data() as Wallet;
  },

  async fundWallet(
    userId: string,
    amount: number,
    email: string
  ): Promise<{ reference: string }> {
    // Create Paystack transaction for wallet funding
    const response = await paystackService.initializeTransaction({
      email,
      amount: amount * 100, // Convert to kobo
      metadata: {
        type: "wallet_funding",
        userId,
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
  ): Promise<boolean> {
    try {
      await runTransaction(db, async (transaction) => {
        const walletRef = doc(db, "wallets", userId);
        const walletDoc = await transaction.get(walletRef);

        if (!walletDoc.exists()) {
          throw new Error("Wallet not found");
        }

        const currentBalance = walletDoc.data().balance;
        if (currentBalance < amount) {
          throw new Error("Insufficient balance");
        }

        // Update wallet balance
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
          orderId,
          status: "completed",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      return true;
    } catch (error) {
      console.error("Error processing wallet payment:", error);
      throw error;
    }
  },

  async getTransactionHistory(userId: string): Promise<WalletTransaction[]> {
    const transactionsRef = collection(db, "walletTransactions");
    const q = query(
      transactionsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WalletTransaction[];
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
};
