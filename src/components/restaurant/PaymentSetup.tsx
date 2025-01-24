import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { paymentService } from "../../services/paymentService";
import { RestaurantPaymentInfo, RestaurantData } from "../../types/restaurant";
import { toast } from "react-hot-toast";

interface PaymentSetupProps {
  data: RestaurantData;
}

interface Bank {
  code: string;
  name: string;
  id?: string;
}

export default function PaymentSetup({ data }: PaymentSetupProps) {
  const { user } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<Partial<RestaurantPaymentInfo>>({
    bankName: data?.paymentInfo?.bankName || "",
    accountNumber: data?.paymentInfo?.accountNumber || "",
    accountName: data?.paymentInfo?.accountName || "",
    settlementSchedule: data?.paymentInfo?.settlementSchedule || "weekly",
  });

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      const bankList = await paymentService.getBankList();
      setBanks(bankList);
    } catch (error) {
      setError("Failed to load banks");
      toast.error("Failed to load bank list");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setLoading(true);
    setError("");

    try {
      // Verify bank account
      const verificationResult = await paymentService.verifyBankAccount(
        formData.accountNumber!,
        formData.bankName!
      );

      // Create Paystack subaccount
      const subaccountResult = await paymentService.createPaystackSubaccount({
        business_name: data.restaurantName,
        settlement_bank: formData.bankName!,
        account_number: formData.accountNumber!,
        percentage_charge: 0.8,
      });

      // Update restaurant payment info
      await paymentService.updateRestaurantPaymentInfo(user.uid, {
        ...formData,
        accountName: verificationResult.account_name,
        paystackSubaccountCode: subaccountResult.subaccount_code,
        isVerified: true,
        lastUpdated: new Date().toISOString(),
      } as RestaurantPaymentInfo);

      toast.success("Payment information setup successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to setup payment information";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">Payment Setup</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Name
          </label>
          <select
            value={formData.bankName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, bankName: e.target.value }))
            }
            className="w-full p-2 border rounded-lg"
            required
          >
            <option value="">Select Bank</option>
            {banks.map((bank) => (
              <option key={`${bank.code}-${bank.name}`} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Number
          </label>
          <input
            type="text"
            value={formData.accountNumber}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                accountNumber: e.target.value,
              }))
            }
            className="w-full p-2 border rounded-lg"
            required
            pattern="[0-9]{10}"
            maxLength={10}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Settlement Schedule
          </label>
          <select
            value={formData.settlementSchedule}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                settlementSchedule: e.target
                  .value as RestaurantPaymentInfo["settlementSchedule"],
              }))
            }
            className="w-full p-2 border rounded-lg"
            required
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Setting up..." : "Setup Payment"}
        </button>
      </form>
    </div>
  );
}
