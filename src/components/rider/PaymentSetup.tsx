import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { paymentService } from "../../services/paymentService";
import { toast } from "react-hot-toast";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import SubaccountBalance from "../common/SubaccountBalance";
import { RiderPaymentInfo } from "../../types/rider";

interface Bank {
  code: string;
  name: string;
  id?: string;
}

export default function RiderPaymentSetup() {
  const { user } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingPaymentInfo, setExistingPaymentInfo] =
    useState<RiderPaymentInfo | null>(null);
  const [formData, setFormData] = useState<Partial<RiderPaymentInfo>>({
    bankName: "",
    accountNumber: "",
    accountName: "",
    settlementSchedule: "weekly",
  });

  const loadExistingPaymentInfo = useCallback(async () => {
    if (!user) return;
    try {
      const riderDoc = await getDoc(doc(db, "riders", user.uid));
      if (riderDoc.exists() && riderDoc.data().paymentInfo) {
        const paymentInfo = riderDoc.data().paymentInfo as RiderPaymentInfo;
        setExistingPaymentInfo(paymentInfo);
      }
    } catch (error) {
      console.error("Error loading payment info:", error);
    }
  }, [user]);

  useEffect(() => {
    loadBanks();
    loadExistingPaymentInfo();
  }, [user, loadExistingPaymentInfo]);

  const loadBanks = async () => {
    try {
      const bankList = await paymentService.getBankList();
      const uniqueBanks = bankList.filter(
        (bank: Bank, index: number, self: Bank[]) =>
          index ===
          self.findIndex((b) => b.code === bank.code && b.name === bank.name)
      );
      setBanks(uniqueBanks);
    } catch (error) {
      setError("Failed to load banks");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // First verify the bank account
      const verifiedAccount = await paymentService.verifyBankAccount(
        formData.accountNumber!,
        formData.bankName!
      );

      if (existingPaymentInfo?.paystackSubaccountCode) {
        // Update existing subaccount
        await paymentService.updateRiderSubaccount(user!.uid, {
          ...formData,
          accountName: verifiedAccount.account_name,
          isVerified: true,
          lastUpdated: new Date().toISOString(),
          paystackSubaccountCode: existingPaymentInfo.paystackSubaccountCode,
          settlementSchedule: formData.settlementSchedule || "weekly",
        } as RiderPaymentInfo);
      } else {
        // Create new subaccount
        await paymentService.createRiderSubaccount(user!.uid, {
          ...formData,
          accountName: verifiedAccount.account_name,
          isVerified: true,
          lastUpdated: new Date().toISOString(),
          settlementSchedule: formData.settlementSchedule || "weekly",
        } as RiderPaymentInfo);
      }

      toast.success("Payment information updated successfully");
      await loadExistingPaymentInfo(); // Refresh the displayed info
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

  const getBankName = (bankCode: string) => {
    const bank = banks.find((b) => b.code === bankCode);
    return bank?.name || bankCode;
  };

  if (existingPaymentInfo?.isVerified) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        {existingPaymentInfo?.paystackSubaccountCode && (
          <div className="mt-6">
            <SubaccountBalance
              subaccountCode={existingPaymentInfo.paystackSubaccountCode}
              autoRefreshInterval={300000}
            />
          </div>
        )}
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-600">Last Updated</span>
          <span className="text-sm text-gray-500">
            {new Date(existingPaymentInfo.lastUpdated).toLocaleDateString()}
          </span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Payment Information</h2>
          <button
            onClick={() => setExistingPaymentInfo(null)}
            className="text-sm px-3 py-1 text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50"
          >
            Edit
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Bank Name</span>
            <span className="font-medium">
              {getBankName(existingPaymentInfo.bankName)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Account Number</span>
            <span className="font-medium">
              {existingPaymentInfo.accountNumber}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Account Name</span>
            <span className="font-medium">
              {existingPaymentInfo.accountName}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Settlement Schedule</span>
            <span className="font-medium capitalize">
              {existingPaymentInfo.settlementSchedule}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">Payment Information</h2>

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
                  .value as RiderPaymentInfo["settlementSchedule"],
              }))
            }
            className="w-full p-2 border rounded-lg"
            required
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
        >
          {loading ? "Saving..." : "Save Payment Information"}
        </button>
      </form>
    </div>
  );
}
