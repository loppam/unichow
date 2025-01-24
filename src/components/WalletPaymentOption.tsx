import { Wallet } from "../types/wallet";

interface WalletPaymentOptionProps {
  wallet: Wallet | null;
  paymentMethod: "paystack" | "wallet";
  calculateTotal: () => number;
  onSelect: (method: "paystack" | "wallet") => void;
  variant?: "radio" | "button";
}

export default function WalletPaymentOption({
  wallet,
  paymentMethod,
  calculateTotal,
  onSelect,
  variant = "radio",
}: WalletPaymentOptionProps) {
  const isDisabled = !wallet || wallet.balance < calculateTotal();

  if (variant === "radio") {
    return (
      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="paymentMethod"
          value="wallet"
          checked={paymentMethod === "wallet"}
          onChange={() => onSelect("wallet")}
          disabled={isDisabled}
          className="form-radio"
        />
        <span>
          Pay with Wallet (Balance: ₦{wallet?.balance.toLocaleString() || 0})
        </span>
        {isDisabled && wallet && (
          <div className="text-sm text-red-600">
            Insufficient wallet balance. Please fund your wallet or choose
            another payment method.
          </div>
        )}
      </label>
    );
  }

  return (
    <button
      className={`w-full p-4 rounded-lg border ${
        paymentMethod === "wallet"
          ? "border-gray-800 bg-gray-50"
          : "border-gray-200"
      } flex items-center justify-between`}
      onClick={() => onSelect("wallet")}
      disabled={isDisabled}
    >
      <div className="flex items-center">
        <div className="w-6 h-6 rounded-full border-2 border-gray-800 mr-3 flex items-center justify-center">
          {paymentMethod === "wallet" && (
            <div className="w-3 h-3 rounded-full bg-gray-800" />
          )}
        </div>
        <span>Wallet</span>
      </div>
      <div className="text-right">
        <div>Balance: ₦{wallet?.balance.toLocaleString() || 0}</div>
        {isDisabled && wallet && (
          <div className="text-sm text-red-600">Insufficient balance</div>
        )}
      </div>
    </button>
  );
}
