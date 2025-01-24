import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { walletService } from "../../services/walletService";
import { usePaystackPayment } from "react-paystack";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../../utils/currency";
import { doc, runTransaction } from "firebase/firestore";
import { collection } from "firebase/firestore";
import { db } from "../../firebase/config";

export default function WalletSection() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");

  const loadWalletBalance = useCallback(async () => {
    try {
      const walletData = await walletService.getWallet(user!.uid);
      setBalance(walletData.balance);
    } catch (error) {
      console.error("Error loading wallet:", error);
      toast.error("Failed to load wallet balance");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
      loadWalletBalance();
    }
  }, [user, loadWalletBalance]);

  const handlePaystackSuccess = async (reference: { reference: string }) => {
    try {
      // Update wallet balance immediately
      const numAmount = parseFloat(amount);
      const walletRef = doc(db, "wallets", user!.uid);

      await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        const currentBalance = walletDoc.exists()
          ? walletDoc.data().balance
          : 0;

        // Update wallet balance
        transaction.update(walletRef, {
          balance: currentBalance + numAmount,
          lastUpdated: new Date().toISOString(),
        });

        // Update transaction status
        const transactionRef = collection(db, "walletTransactions");
        transaction.set(doc(transactionRef), {
          userId: user!.uid,
          type: "credit",
          amount: numAmount,
          description: "Wallet funding",
          reference: reference.reference,
          status: "completed",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      // Refresh wallet balance
      await loadWalletBalance();
      setAmount("");
      toast.success("Wallet funded successfully!");
    } catch (error) {
      console.error("Error processing successful payment:", error);
      toast.error("Failed to update wallet balance");
    }
  };

  const config = {
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    email: user?.email || "",
    amount: parseFloat(amount) * 100,
    metadata: {
      type: "wallet_funding",
      userId: user?.uid,
      custom_fields: [],
    },
    onSuccess: handlePaystackSuccess,
    onClose: () => toast.error("Transaction cancelled"),
  };

  const initializePaystack = usePaystackPayment(config);

  const handleFundWallet = async () => {
    if (!user?.email || !amount) return;
    try {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      const { reference } = await walletService.fundWallet(
        user.uid,
        numAmount,
        user.email
      );

      initializePaystack({
        onSuccess: handlePaystackSuccess,
        onClose: () => toast.error("Transaction cancelled"),
      });
    } catch (error) {
      console.error("Error funding wallet:", error);
      toast.error("Failed to fund wallet");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Wallet</h2>

      <div className="mb-6">
        <p className="text-gray-600">Current Balance</p>
        <p className="text-2xl font-bold">
          {loading ? "Loading..." : formatCurrency(balance)}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount to Fund
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter amount"
            min="0"
          />
        </div>

        <button
          onClick={handleFundWallet}
          className="w-full bg-primary text-black py-2 px-4 rounded hover:bg-primary-dark transition-colors border border-black"
          disabled={loading || !amount}
        >
          Fund Wallet
        </button>
      </div>
    </div>
  );
}
