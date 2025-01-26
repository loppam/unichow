import { useState, useEffect, useCallback } from "react";
import { paystackService } from "../../services/paystackService";
import { RefreshCw } from "lucide-react";

interface SubaccountBalanceProps {
  subaccountCode: string;
  autoRefreshInterval?: number; // in milliseconds
}

export default function SubaccountBalance({
  subaccountCode,
  autoRefreshInterval = 300000, // 5 minutes default
}: SubaccountBalanceProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      setRefreshing(true);
      const balance = await paystackService.getSubaccountBalance(
        subaccountCode
      );
      setBalance(balance);
      setError(null);
    } catch (error) {
      setError("Failed to fetch balance");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subaccountCode]);

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
        <p className="text-2xl font-bold">₦{balance?.toLocaleString() || 0}</p>
      )}
    </div>
  );
}
