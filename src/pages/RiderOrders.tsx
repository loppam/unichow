import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Order } from "../types/order";
import { orderService } from "../services/orderService";
import RiderLayout from "../components/RiderLayout";
import { Clock, CheckCircle, Package } from "lucide-react";
import { format } from "date-fns";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { toast } from "react-hot-toast";
import { paymentService } from "../services/paymentService";
import { Timestamp } from "firebase/firestore";
import { firestoreService } from "../services/firestoreService";

export default function RiderOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time order updates
    const unsubscribe = firestoreService.subscribeToRiderOrders(
      user.uid,
      (updatedOrders) => {
        setOrders(updatedOrders);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "assigned":
        return "bg-yellow-100 text-yellow-800";
      case "picked_up":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-gray-100 text-gray-600";
      case "accepted":
        return "bg-purple-100 text-purple-800";
      case "preparing":
        return "bg-indigo-100 text-indigo-800";
      case "ready":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "active") {
      return !["delivered", "cancelled"].includes(order.status);
    }
    return ["delivered", "cancelled"].includes(order.status);
  });

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: Order["status"]
  ) => {
    setIsProcessing(true);
    try {
      if (!user) return;

      // Get the order first to verify rider assignment
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);
      const orderData = orderDoc.data();

      if (!orderData) {
        toast.error("Order not found");
        return;
      }

      // Verify this rider is assigned to this order
      if (orderData.riderId !== user.uid) {
        toast.error("You are not assigned to this order");
        return;
      }

      // Only allow status updates if order is "ready" or already "picked_up"
      if (orderData.status !== "ready" && orderData.status !== "picked_up") {
        toast.error(
          "Cannot update order status until restaurant marks it ready"
        );
        return;
      }

      // Now update the order status
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...(newStatus === "delivered" && { deliveredAt: serverTimestamp() }),
        ...(newStatus === "picked_up" && { pickedUpAt: serverTimestamp() }),
      });

      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeliveryConfirmation = async (orderId: string) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);
      const orderData = orderDoc.data();

      if (orderData?.deliveryConfirmationCode !== confirmationCode) {
        toast.error("Invalid confirmation code");
        return;
      }

      await handleStatusUpdate(orderId, "delivered");

      // Transfer delivery fee to rider
      await paymentService.transferDeliveryFee(
        orderId,
        user!.uid,
        orderData.deliveryFee
      );

      setShowConfirmationModal(false);
      setConfirmationCode("");
      toast.success("Delivery confirmed and payment processed");
    } catch (error) {
      console.error("Error confirming delivery:", error);
      toast.error("Failed to confirm delivery");
    }
  };

  if (loading) {
    return (
      <RiderLayout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </RiderLayout>
    );
  }

  return (
    <RiderLayout>
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white p-4 shadow-sm">
          <h1 className="text-xl font-semibold">Orders</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto w-full">
            <div className="grid grid-cols-2 divide-x border-b">
              <button
                onClick={() => setActiveTab("active")}
                className={`flex items-center justify-center gap-1 px-1 transition-all ${
                  activeTab === "active"
                    ? "text-blue-600 border-b-2 border-blue-600 -mb-[2px] py-3 text-[11px]"
                    : "text-gray-500 py-3 text-[10px]"
                }`}
              >
                <Clock
                  className={`shrink-0 ${
                    activeTab === "active" ? "w-4 h-4" : "w-3.5 h-3.5"
                  }`}
                />
                <span className="truncate">Active Orders</span>
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
                <span className="truncate">Completed Orders</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4">
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold">
                      Order #{order.id.slice(-6)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {order.createdAt instanceof Timestamp
                        ? format(order.createdAt.toDate(), "PPp")
                        : typeof order.createdAt === "string"
                        ? format(new Date(order.createdAt), "PPp")
                        : "Date not available"}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status.replace("_", " ").charAt(0).toUpperCase() +
                      order.status.slice(1)}
                  </span>
                </div>

                {/* Restaurant Info */}
                <div className="flex items-center gap-2 mb-3 text-gray-600">
                  <Package className="w-4 h-4" />
                  <span>{order.restaurantName}</span>
                </div>

                {/* Customer Info */}
                <div className="text-sm mb-4">
                  <p className="text-gray-600">Customer Details:</p>
                  <p className="font-medium">{order.customerName}</p>
                  <p>{order.customerPhone}</p>
                </div>

                {/* Delivery Address */}
                <div className="text-sm mb-4">
                  <p className="text-gray-600">Delivery Address:</p>
                  <p>{order.deliveryAddress.address}</p>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium">
                      ₦{order.total.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-end">
                  {order.status === "picked_up" &&
                    order.riderId === user?.uid && (
                      <button
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setShowConfirmationModal(true);
                        }}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm"
                      >
                        Confirm Delivery
                      </button>
                    )}
                  {order.status === "ready" && order.riderId === user?.uid && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, "picked_up")}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      {isProcessing ? "Updating..." : "Mark as Picked Up"}
                    </button>
                  )}
                  {["accepted", "preparing"].includes(order.status) &&
                    order.riderId === user?.uid && (
                      <button
                        disabled
                        className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm cursor-not-allowed"
                      >
                        Awaiting Restaurant
                      </button>
                    )}
                </div>
              </div>
            ))}

            {filteredOrders.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No {activeTab} orders found
              </div>
            )}
          </div>
        </div>

        {showConfirmationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h3 className="font-semibold mb-4">
                Enter Delivery Confirmation Code
              </h3>
              <input
                type="text"
                maxLength={4}
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                className="w-full p-2 border rounded-md mb-4"
                placeholder="Enter 4-digit code"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowConfirmationModal(false);
                    setConfirmationCode("");
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeliveryConfirmation(selectedOrderId!)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RiderLayout>
  );
}
