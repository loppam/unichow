import { useState, useEffect, useCallback } from "react";
import { paymentService } from "../../services/paymentService";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Balance } from "../../types/transaction";

interface SubaccountBalanceProps {
  subaccountCode: string;
  userType: "restaurant" | "rider";
  autoRefreshInterval?: number; // in milliseconds
}

export default function SubaccountBalance({
  subaccountCode,
  userType,
  autoRefreshInterval = 300000, // 5 minutes default
}: SubaccountBalanceProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setRefreshing(true);
      const balanceData = await paymentService.getBalance(user.uid, userType);
      setBalance(balanceData);
      setError(null);
    } catch (error) {
      setError("Failed to fetch balance");
      console.error("Error fetching balance:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid, userType]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [fetchBalance, autoRefreshInterval]);

  if (loading) return <div>Loading balance...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Available Balance</h3>
        <button
          onClick={fetchBalance}
          disabled={refreshing}
          className="text-sm px-3 py-1 text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>
      {error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div>
          <p className="text-2xl font-bold">
            ₦{balance?.availableBalance.toLocaleString() || 0}
          </p>
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Total Received:</span>
              <span>₦{balance?.totalReceived.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Fees:</span>
              <span>₦{balance?.totalFees.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Withdrawals:</span>
              <span>₦{balance?.totalWithdrawals.toLocaleString() || 0}</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Last updated:{" "}
              {balance?.lastUpdated
                ? new Date(balance.lastUpdated).toLocaleString()
                : "Never"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
