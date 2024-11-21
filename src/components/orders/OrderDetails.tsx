import { useState } from 'react';
import { Order, OrderStatus } from '../../types/order';
import { Clock, Phone, Mail, MapPin, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface OrderDetailsProps {
  order: Order;
  onStatusUpdate: (orderId: string, status: OrderStatus, estimatedTime?: number) => void;
}

export default function OrderDetails({ order, onStatusUpdate }: OrderDetailsProps) {
  const [estimatedTime, setEstimatedTime] = useState(30);
  const [loading, setLoading] = useState(false);

  const getStatusActions = () => {
    switch (order.status) {
      case 'pending':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Preparation Time (minutes)
              </label>
              <input
                type="number"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(Number(e.target.value))}
                className="w-full p-2 border rounded-lg"
                min="1"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => onStatusUpdate(order.id, 'accepted', estimatedTime)}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                disabled={loading}
              >
                Accept Order
              </button>
              <button
                onClick={() => onStatusUpdate(order.id, 'cancelled')}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                disabled={loading}
              >
                Reject Order
              </button>
            </div>
          </div>
        );
      case 'accepted':
        return (
          <button
            onClick={() => onStatusUpdate(order.id, 'preparing')}
            className="w-full bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
            disabled={loading}
          >
            Start Preparing
          </button>
        );
      case 'preparing':
        return (
          <button
            onClick={() => onStatusUpdate(order.id, 'ready')}
            className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
            disabled={loading}
          >
            Mark as Ready
          </button>
        );
      case 'ready':
        return (
          <button
            onClick={() => onStatusUpdate(order.id, 'delivered')}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            disabled={loading}
          >
            Mark as Delivered
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-semibold">
            Order #{order.id.slice(-6)}
          </h2>
          <p className="text-gray-500">
            {format(new Date(order.createdAt), 'PPp')}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold">
          ₦{order.total.toFixed(2)}
          </div>
          <span className="text-gray-500">
            {order.paymentMethod} · {order.paymentStatus}
          </span>
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <h3 className="font-semibold">Customer Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">{order.customerName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-400" />
            <a href={`tel:${order.customerPhone}`} className="text-blue-500 hover:underline">
              {order.customerPhone}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">{order.deliveryAddress.address}</span>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div>
        <h3 className="font-semibold mb-4">Order Items</h3>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-start">
              <div>
                <div className="font-medium">{item.name}</div>
                {item.specialInstructions && (
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    {item.specialInstructions}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div>₦{(item.price * item.quantity).toFixed(2)}</div>
                <div className="text-sm text-gray-500">
                  {item.quantity} × ₦{item.price.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="mt-6 pt-6 border-t space-y-2">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>₦{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Delivery Fee</span>
            <span>₦{order.deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>₦{order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Special Instructions */}
      {order.specialInstructions && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Special Instructions</h3>
          <p className="text-gray-700">{order.specialInstructions}</p>
        </div>
      )}

      {/* Estimated Time */}
      {order.estimatedDeliveryTime && (
        <div className="flex items-center gap-2 text-gray-500">
          <Clock className="h-5 w-5" />
          <span>
            Estimated delivery by {format(new Date(order.estimatedDeliveryTime), 'p')}
          </span>
        </div>
      )}

      {/* Status Actions */}
      <div className="sticky bottom-0 bg-white pt-4">
        {getStatusActions()}
      </div>
    </div>
  );
}
 