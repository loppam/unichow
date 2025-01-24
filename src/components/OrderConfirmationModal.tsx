import { useEffect } from "react";
import { Order } from "../types/order";

interface OrderConfirmationModalProps {
  order: Order;
  onClose: () => void;
}

export default function OrderConfirmationModal({
  order,
  onClose,
}: OrderConfirmationModalProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 10000); // Auto close after 10 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold mb-4">
          Order Placed Successfully!
        </h3>
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600 mb-2">
            Your order confirmation code is:
          </p>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-2xl font-bold text-yellow-800 tracking-wider">
              {order.deliveryConfirmationCode}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Share this code with your rider upon delivery
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2 px-4 bg-primary text-white rounded-lg"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
