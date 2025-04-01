import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Input from "../components/Input";
import { toast } from "react-hot-toast";

export default function Checkout() {
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">("card");
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const total = queryParams.get("total") || 0; // Retrieve total from URL parameters
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // Payment logic here
      toast.success("Payment processed successfully");
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center">
        <Link to="/cart" className="mr-4">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold">Checkout</h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="font-semibold mb-4">Delivery Address</h2>
          <Input
            label="Delivery Address"
            placeholder="Enter your full delivery address"
            className="mb-2"
          />
          <Input
            label="Additional Instructions"
            placeholder="Any specific instructions for delivery (optional)"
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="font-semibold mb-4">Payment Method</h2>
          <div className="space-y-2">
            <button
              className={`w-full p-4 rounded-lg border ${
                paymentMethod === "card"
                  ? "border-gray-800 bg-gray-50"
                  : "border-gray-200"
              } flex items-center`}
              onClick={() => setPaymentMethod("card")}
            >
              <div className="w-6 h-6 rounded-full border-2 border-gray-800 mr-3 flex items-center justify-center">
                {paymentMethod === "card" && (
                  <div className="w-3 h-3 rounded-full bg-gray-800" />
                )}
              </div>
              <span>Card</span>
            </button>
            <button
              className={`w-full p-4 rounded-lg border ${
                paymentMethod === "bank"
                  ? "border-gray-800 bg-gray-50"
                  : "border-gray-200"
              } flex items-center`}
              onClick={() => setPaymentMethod("bank")}
            >
              <div className="w-6 h-6 rounded-full border-2 border-gray-800 mr-3 flex items-center justify-center">
                {paymentMethod === "bank" && (
                  <div className="w-3 h-3 rounded-full bg-gray-800" />
                )}
              </div>
              <span>Bank Transfer</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex justify-between mb-2">
            <span>Total</span>
            <span className="font-bold">₦{total}</span>
          </div>
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Proceed to Payment"}
          </button>
        </div>
      </main>
    </div>
  );
}
