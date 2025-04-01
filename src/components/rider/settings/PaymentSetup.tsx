import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { paymentService } from "../../services/paymentService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

const PaymentSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [hasPaymentInfo, setHasPaymentInfo] = useState(false);
  const [formData, setFormData] = useState({
    bankCode: "",
    accountNumber: "",
    accountName: "",
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        // Load banks
        const bankList = await paymentService.getBankList();
        setBanks(bankList);

        // Load rider data and check payment info
        const riderDoc = await getDoc(doc(db, "riders", user.uid));
        if (riderDoc.exists()) {
          const riderData = riderDoc.data();
          console.log("Rider Data:", riderData); // Debug log

          if (riderData.paymentInfo?.paystackSubaccountCode) {
            setHasPaymentInfo(true);
            // Load balance if payment info exists
            const balance = await paymentService.getRiderBalance(user.uid);
            setBalance(balance);
            console.log("Balance loaded:", balance); // Debug log
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
        toast.error("Failed to load data");
      }
    };

    loadData();
  }, [user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.bankCode) {
      throw new Error("Please select a bank");
    }
    if (!formData.accountNumber) {
      throw new Error("Please enter your account number");
    }
    if (!formData.accountName) {
      throw new Error("Please enter your account name");
    }
    if (formData.accountNumber.length < 10) {
      throw new Error("Account number must be at least 10 digits");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Validate form data
      validateForm();

      // Get rider data
      const riderDoc = await getDoc(doc(db, "riders", user.uid));
      if (!riderDoc.exists()) {
        throw new Error("Rider profile not found");
      }

      const riderData = riderDoc.data();
      console.log("Available rider fields:", Object.keys(riderData));
      console.log("Rider Data:", riderData);

      // Log form data before submission
      console.log("Form Data:", {
        bankCode: formData.bankCode,
        accountNumber: formData.accountNumber,
        accountName: formData.accountName,
      });

      // Create subaccount with all required fields
      const subaccountCode = await paymentService.createRiderSubaccount(
        user.uid,
        {
          name: riderData.firstName
            ? `${riderData.firstName} ${riderData.lastName || ""}`.trim()
            : riderData.fullName ||
              riderData.name ||
              riderData.riderName ||
              "Rider",
          email: user.email || "",
          phone: riderData.phone || riderData.phoneNumber || "",
          bankCode: formData.bankCode,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
        }
      );

      if (subaccountCode) {
        // Load balance after successful subaccount creation
        const newBalance = await paymentService.getRiderBalance(user.uid);
        setBalance(newBalance);
        setHasPaymentInfo(true);
        toast.success("Payment information updated successfully");
        navigate("/rider-dashboard");
      }
    } catch (err) {
      console.error("Error updating payment information:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to update payment information";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Payment Setup</h2>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {hasPaymentInfo && balance !== null && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">
          <h3 className="font-semibold">Available Balance</h3>
          <p className="text-2xl font-bold">₦{balance.toLocaleString()}</p>
        </div>
      )}

      {!hasPaymentInfo && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bank
            </label>
            <select
              name="bankCode"
              value={formData.bankCode}
              onChange={handleInputChange}
              required
              className="w-full p-2 border rounded-lg"
            >
              <option value="">Select a bank</option>
              {banks.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Number
            </label>
            <input
              type="text"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleInputChange}
              required
              className="w-full p-2 border rounded-lg"
              placeholder="Enter your account number"
              pattern="[0-9]{10,}"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Name
            </label>
            <input
              type="text"
              name="accountName"
              value={formData.accountName}
              onChange={handleInputChange}
              required
              className="w-full p-2 border rounded-lg"
              placeholder="Enter your account name"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 px-4 rounded-lg text-white font-medium ${
              isSubmitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSubmitting ? "Updating..." : "Update Payment Information"}
          </button>
        </form>
      )}
    </div>
  );
};

export default PaymentSetup;
