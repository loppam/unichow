import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { OrderStatus, Order } from "../types/order";
import { firestoreService } from "../services/firestoreService";
import { toast } from "react-hot-toast";

import { ShoppingCart, Clock, CheckCircle, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { realtimeService } from "../services/realtimeService";
import OrderConfirmationModal from "../components/OrderConfirmationModal";
import { Timestamp } from "firebase/firestore";

export default function UserOrders() {
  const { user } = useAuth();
  const { packs, clearCart, removePack } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"saved" | "ongoing" | "completed">(
    "saved"
  );
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to real-time order updates
    const unsubscribe = firestoreService.subscribeToUserOrders(
      user.uid,
      (updatedOrders) => {
        setOrders(updatedOrders);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (location.state?.showConfirmation && location.state?.order) {
      setConfirmedOrder(location.state.order);
      setShowConfirmationModal(true);
      // Clean up location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "preparing":
        return "bg-purple-100 text-purple-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "assigned":
        return "bg-yellow-100 text-yellow-800";
      case "picked_up":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "ongoing") {
      return [
        "pending",
        "accepted",
        "preparing",
        "ready",
        "assigned",
        "picked_up",
      ].includes(order.status);
    } else if (activeTab === "completed") {
      return ["delivered", "cancelled"].includes(order.status);
    }
    return false; // For "saved" tab, we handle it separately
  });

  const handleCheckout = () => {
    navigate("/cart");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <>
      {showConfirmationModal && confirmedOrder && (
        <OrderConfirmationModal
          order={confirmedOrder}
          onClose={() => {
            setShowConfirmationModal(false);
            setConfirmedOrder(null);
          }}
        />
      )}
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white p-4 shadow-sm">
          <h1 className="text-xl font-semibold">My Orders</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto w-full">
            <div className="grid grid-cols-3 divide-x border-b">
              <button
                onClick={() => setActiveTab("saved")}
                className={`flex items-center justify-center gap-1 px-1 transition-all ${
                  activeTab === "saved"
                    ? "text-blue-600 border-b-2 border-blue-600 -mb-[2px] py-3 text-[11px]"
                    : "text-gray-500 py-3 text-[10px]"
                }`}
              >
                <ShoppingCart
                  className={`shrink-0 ${
                    activeTab === "saved" ? "w-4 h-4" : "w-3.5 h-3.5"
                  }`}
                />
                <span className="truncate">Cart ({packs.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("ongoing")}
                className={`flex items-center justify-center gap-1 px-1 transition-all ${
                  activeTab === "ongoing"
                    ? "text-blue-600 border-b-2 border-blue-600 -mb-[2px] py-3 text-[11px]"
                    : "text-gray-500 py-3 text-[10px]"
                }`}
              >
                <Clock
                  className={`shrink-0 ${
                    activeTab === "ongoing" ? "w-4 h-4" : "w-3.5 h-3.5"
                  }`}
                />
                <span className="truncate">
                  Ongoing (
                  {
                    filteredOrders.filter((order) =>
                      [
                        "pending",
                        "assigned",
                        "accepted",
                        "preparing",
                        "ready",
                        "picked_up",
                      ].includes(order.status)
                    ).length
                  }
                  )
                </span>
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`flex items-center justify-center gap-1 px-1 transition-all ${
                  activeTab === "completed"
                    ? "text-blue-600 border-b-2 border-blue-600 -mb-[2px] py-3 text-[11px]"
                    : "text-gray-500 py-3 text-[10px]"
                }`}
              >
                <CheckCircle
                  className={`shrink-0 ${
                    activeTab === "completed" ? "w-4 h-4" : "w-3.5 h-3.5"
                  }`}
                />
                <span className="truncate">
                  Completed (
                  {
                    filteredOrders.filter((order) =>
                      ["delivered", "cancelled"].includes(order.status)
                    ).length
                  }
                  )
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4">
          {activeTab === "saved" && packs.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-semibold">Orders</h1>
                <button
                  onClick={() => clearCart()}
                  className="text-sm text-gray-600 hover:text-red-600"
                >
                  Clear Cart
                </button>
              </div>

              {packs.map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm p-4 mb-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden">
                        {/* Restaurant image placeholder */}
                      </div>
                      <div>
                        <h3 className="font-medium">{item.restaurantName}</h3>
                        <p className="text-sm text-gray-500">
                          {item.items.length}{" "}
                          {item.items.length === 1 ? "Item" : "Items"} •
                          {formatCurrency(
                            item.items.reduce(
                              (sum, item) => sum + item.price * item.quantity,
                              0
                            )
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removePack(item.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <button
                      onClick={() => navigate(`/cart`)}
                      className="text-zinc-600 text-sm font-medium"
                    >
                      View Selection
                    </button>
                    <button
                      onClick={handleCheckout}
                      className="bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Checkout
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No {activeTab} orders
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-sm p-4"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold">
                        Order #{order.id.slice(-6)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {order.createdAt instanceof Timestamp
                          ? order.createdAt.toDate().toLocaleString()
                          : typeof order.createdAt === "string"
                          ? new Date(order.createdAt).toLocaleString()
                          : "Date not available"}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {order.packs?.map((pack) => (
                      <div key={pack.id} className="border-t pt-4">
                        <div className="text-sm font-medium mb-2">
                          {pack.restaurantName}
                        </div>
                        {pack.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm"
                          >
                            <span>
                              {item.quantity}x {item.name}
                            </span>
                            <span>₦{item.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total</span>
                      <span>₦{order.total.toFixed(2)}</span>
                    </div>
                    {order.deliveryConfirmationCode && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Delivery Code</span>
                          <span className="font-mono font-medium">
                            {order.deliveryConfirmationCode}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </>
  );
}
