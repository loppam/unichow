/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ClipboardList, Clock, CheckCircle, ShoppingBag } from "lucide-react";
import RestaurantNavigation from "../components/RestaurantNavigation";
import { orderService } from "../services/orderService";
import { firestoreService } from "../services/firestoreService";
import { Order } from "../types/order";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import { riderAssignmentService } from "../services/riderAssignmentService";
import { toast } from "react-hot-toast";

export default function RestaurantOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "accepted" | "ready">(
    "pending"
  );
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to real-time order updates
    const unsubscribe = firestoreService.subscribeToNewOrders(
      user.uid,
      (updatedOrders) => {
        // Update orders state with the latest data
        setOrders(updatedOrders);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [user]);

  // Remove the groupedOrders object and use direct filtering
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const acceptedOrders = orders.filter((order) => order.status === "accepted");
  const readyOrders = orders.filter((order) => order.status === "ready");

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "delivered":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: Order["status"]
  ) => {
    setIsProcessing(true);
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // If the order is being accepted, trigger rider assignment
      if (newStatus === "accepted") {
        try {
          await riderAssignmentService.assignRiderToOrder(orderId);
        } catch (error) {
          console.error("Failed to assign rider:", error);
          // Don't block the order acceptance, just log the error
        }
      }

      toast.success("Order status updated successfully");
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold">Orders</h1>
      </div>

      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-3 divide-x border-b">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex items-center justify-center gap-1 px-1 transition-all ${
                activeTab === "pending"
                  ? "text-blue-600 border-b-2 border-blue-600 -mb-[2px] py-3 text-[11px]"
                  : "text-gray-500 py-3 text-[10px]"
              }`}
            >
              <Clock
                className={`shrink-0 ${
                  activeTab === "pending" ? "w-4 h-4" : "w-3.5 h-3.5"
                }`}
              />
              <span className="truncate">Pending ({pendingOrders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("accepted")}
              className={`flex items-center justify-center gap-1 px-1 transition-all ${
                activeTab === "accepted"
                  ? "text-blue-600 border-b-2 border-blue-600 -mb-[2px] py-3 text-[11px]"
                  : "text-gray-500 py-3 text-[10px]"
              }`}
            >
              <ShoppingBag
                className={`shrink-0 ${
                  activeTab === "accepted" ? "w-4 h-4" : "w-3.5 h-3.5"
                }`}
              />
              <span className="truncate">
                Accepted ({acceptedOrders.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab("ready")}
              className={`flex items-center justify-center gap-1 px-1 transition-all ${
                activeTab === "ready"
                  ? "text-blue-600 border-b-2 border-blue-600 -mb-[2px] py-3 text-[11px]"
                  : "text-gray-500 py-3 text-[10px]"
              }`}
            >
              <CheckCircle
                className={`shrink-0 ${
                  activeTab === "ready" ? "w-4 h-4" : "w-3.5 h-3.5"
                }`}
              />
              <span className="truncate">Ready ({readyOrders.length})</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {loading ? (
          <div className="text-center py-8">Loading orders...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">{error}</div>
        ) : pendingOrders.length === 0 &&
          acceptedOrders.length === 0 &&
          readyOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No {activeTab} orders</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === "pending" &&
              pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/restaurant/orders/${order.id}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold">
                        Order #{order.id.slice(-6)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(
                          order.createdAt instanceof Timestamp
                            ? order.createdAt.toDate()
                            : order.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusUpdate(order.id, "accepted");
                        }}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                      >
                        {isProcessing ? "Updating..." : "Accept Order"}
                      </button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Order Items</h4>
                    {order.packs?.map((pack) => (
                      <div key={pack.id}>
                        <div className="text-sm text-gray-600 mb-2">
                          {pack.restaurantName}
                        </div>
                        {pack.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm mb-1"
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
                </div>
              ))}
            {activeTab === "accepted" &&
              acceptedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/restaurant/orders/${order.id}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold">
                        Order #{order.id.slice(-6)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(
                          order.createdAt instanceof Timestamp
                            ? order.createdAt.toDate()
                            : order.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusUpdate(order.id, "ready");
                        }}
                        className="px-3 py-1 bg-green-500 text-white rounded-full text-sm"
                      >
                        Mark Ready
                      </button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Order Items</h4>
                    {order.packs?.map((pack) => (
                      <div key={pack.id}>
                        <div className="text-sm text-gray-600 mb-2">
                          {pack.restaurantName}
                        </div>
                        {pack.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm mb-1"
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
                </div>
              ))}
            {activeTab === "ready" &&
              readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/restaurant/orders/${order.id}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold">
                        Order #{order.id.slice(-6)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(
                          order.createdAt instanceof Timestamp
                            ? order.createdAt.toDate()
                            : order.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Order Items</h4>
                    {order.packs?.map((pack) => (
                      <div key={pack.id}>
                        <div className="text-sm text-gray-600 mb-2">
                          {pack.restaurantName}
                        </div>
                        {pack.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm mb-1"
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
                </div>
              ))}
          </div>
        )}
      </div>
      <RestaurantNavigation />
    </div>
  );
}
