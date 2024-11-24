import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { orderService } from "../services/orderService";
import { Order } from "../types/order";
import { Package } from "lucide-react";

export default function RestaurantOrderView() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !orderId) return;

    const fetchOrder = async () => {
      try {
        const orderData = await orderService.getOrderById(orderId);
        setOrder(orderData);
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, user]);

  const handleStatusUpdate = async (newStatus: Order["status"]) => {
    if (!order || !user) return;

    try {
      await orderService.updateOrderStatus(user.uid, order.id, newStatus);
      setOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  if (!order) {
    return <div className="text-center py-8">Order not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold">Order #{order.id.slice(-6)}</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Order Status and Actions */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Status:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium 
                ${
                  order.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : order.status === "accepted"
                    ? "bg-blue-100 text-blue-800"
                    : order.status === "ready"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
            <div className="flex gap-2">
              {order.status === "pending" && (
                <button
                  onClick={() => handleStatusUpdate("accepted")}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                >
                  Accept Order
                </button>
              )}
              {order.status === "accepted" && (
                <button
                  onClick={() => handleStatusUpdate("ready")}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg"
                >
                  Mark Ready
                </button>
              )}
            </div>
          </div>

          {/* Customer Details */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Customer Details</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p>
                <span className="font-medium">Name:</span> {order.customerName}
              </p>
              <p>
                <span className="font-medium">Address:</span>{" "}
                {order.deliveryAddress?.address}
              </p>
            </div>
          </div>

          {/* Order Items by Pack */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Order Details</h2>
            {order.packs?.map((pack, packIndex) => (
              <div key={packIndex} className="mb-6 last:mb-0">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-gray-500" />
                  <h3 className="font-medium">Pack {packIndex + 1}</h3>
                </div>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  {/* Restaurant Info */}
                  <div className="p-4 bg-gray-100">
                    <p className="font-medium">{pack.restaurantName}</p>
                    <p className="text-sm text-gray-600">{pack.restaurantAddress}</p>
                  </div>
                  {/* Pack Items */}
                  <div className="p-4">
                    {pack.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex justify-between py-2 border-b last:border-0">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                          {item.specialInstructions && (
                            <p className="text-sm text-gray-500 mt-1">
                              Note: {item.specialInstructions}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            ₦{(item.price * item.quantity).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            ₦{item.price.toLocaleString()} each
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Pack Subtotal */}
                  <div className="p-4 bg-gray-100 border-t">
                    <div className="flex justify-between font-medium">
                      <span>Pack Subtotal</span>
                      <span>
                        ₦{pack.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="mt-6 pt-4 border-t space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>
                ₦{(order.total - (order.deliveryFee || 0)).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span>₦{(order.deliveryFee || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg pt-3 border-t">
              <span>Total</span>
              <span>₦{order.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
