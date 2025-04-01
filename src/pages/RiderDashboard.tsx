import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import {
  useRealtimeData,
  useRealtimeCollection,
} from "../hooks/useRealtimeData";
import { Order } from "../types/order";
import { Rider } from "../types/rider";
import RiderNavigation from "../components/RiderNavigation";
import { where } from "firebase/firestore";
import RiderLayout from "../components/RiderLayout";
import { Bike, Package, Star, Clock, MapPin, DollarSign } from "lucide-react";
import { notificationService } from "../services/notificationService";
import ActiveOrders from "../components/rider/ActiveOrders";
import { paymentService } from "../services/paymentService";
import { Balance } from "../types/transaction";
import OnboardingModal from "../components/common/OnboardingModal";
import { firestoreService } from "../services/firestoreService";
import { toast } from "react-hot-toast";
import { Timestamp } from "firebase/firestore";
import { OrderStatus } from "../types/order";

interface RiderStats {
  totalDeliveries: number;
  todayDeliveries: number;
  rating: number;
  activeOrders: number;
  averageDeliveryTime: number;
}

// Add DeliveryCodeModal component
function DeliveryCodeModal({
  isOpen,
  onClose,
  onSubmit,
  orderId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
  orderId: string;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onSubmit(code);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid delivery code");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Enter Delivery Code</h2>
        <p className="text-gray-600 mb-4">
          Please enter the delivery code provided by the customer for order #
          {orderId.slice(-6)}
        </p>
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4"
            placeholder="Enter 6-digit code"
            maxLength={6}
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RiderDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rider, setRider] = useState<Rider | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [stats, setStats] = useState<RiderStats>({
    totalDeliveries: 0,
    todayDeliveries: 0,
    rating: 0,
    activeOrders: 0,
    averageDeliveryTime: 0,
  });
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Get rider data in real-time
  const { data: riderData, loading: riderLoading } = useRealtimeData<Rider>(
    "riders",
    user?.uid || ""
  );

  // Get active orders in real-time
  const { data: activeOrders, loading: activeOrdersLoading } =
    useRealtimeCollection<Order>("orders", [
      where("riderId", "==", user?.uid || ""),
      where("status", "in", ["accepted", "picked_up"]),
    ]);

  // Get completed orders in real-time
  const { data: completedOrders, loading: completedOrdersLoading } =
    useRealtimeCollection<Order>("orders", [
      where("riderId", "==", user?.uid || ""),
      where("status", "==", "delivered"),
    ]);

  useEffect(() => {
    const checkAccess = async () => {
      console.log("Starting access check...");

      if (!user) {
        console.log("No user found, redirecting to login");
        navigate("/login");
        return;
      }

      try {
        console.log("Fetching user document...");
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        if (!userData) {
          console.log("No user data found");
          throw new Error("User data not found");
        }

        if (userData.userType !== "rider") {
          console.log("Not a rider, redirecting to home");
          navigate("/home");
          return;
        }

        if (!userData.emailVerified) {
          console.log("Email not verified, redirecting to verification");
          navigate("/rider-verify-email");
          return;
        }

        // Get fresh rider data to ensure we have the latest verification status
        console.log("Fetching fresh rider data...");
        const riderDoc = await getDoc(doc(db, "riders", user.uid));
        const freshRiderData = riderDoc.data();

        if (!freshRiderData || !freshRiderData.isVerified) {
          console.log("Rider not verified, redirecting to pending");
          navigate("/rider-pending");
          return;
        }

        // Check if bank account is added
        if (!freshRiderData.paymentInfo?.paystackSubaccountCode) {
          console.log("No payment info, redirecting to settings");
          navigate("/rider-settings");
          return;
        }

        console.log("All checks passed, setting loading to false");
        setLoading(false);
      } catch (error) {
        console.error("Error in access check:", error);
        navigate("/login", {
          state: {
            error:
              error instanceof Error
                ? error.message
                : "Connection error occurred",
          },
        });
      }
    };

    checkAccess();
  }, [user, navigate]);

  useEffect(() => {
    const initializeNotifications = async () => {
      if (!user?.uid) return;

      const token = await notificationService.initialize();
      if (token) {
        await notificationService.requestPermission(user.uid);
      }
    };

    initializeNotifications();
  }, [user]);

  // Separate useEffect for real-time data updates
  useEffect(() => {
    if (riderData && !loading) {
      setRider(riderData);
      setStats({
        totalDeliveries: completedOrders?.length || 0,
        todayDeliveries: 0,
        rating: riderData.rating || 0,
        activeOrders: activeOrders?.length || 0,
        averageDeliveryTime: 25,
      });
    }
  }, [riderData, completedOrders, activeOrders, loading]);

  useEffect(() => {
    const loadBalance = async () => {
      if (!user) return;
      try {
        const balance = await paymentService.getBalance(user.uid, "rider");
        setBalance(balance);
      } catch (error) {
        console.error("Error loading balance:", error);
      }
    };
    loadBalance();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to assigned orders
    const unsubscribe = firestoreService.subscribeToAssignedOrders(
      user.uid,
      (assignedOrders) => {
        setOrders(assignedOrders);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleStatusUpdate = async (
    orderId: string,
    status: Order["status"]
  ) => {
    try {
      if (status === "delivered") {
        setSelectedOrder(orders.find((o) => o.id === orderId) || null);
        setDeliveryModalOpen(true);
        return;
      }

      await firestoreService.updateDeliveryStatusBatch([
        { id: orderId, status },
      ]);
      toast.success("Order status updated successfully");
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    }
  };

  const handleDeliveryCodeSubmit = async (code: string) => {
    if (!selectedOrder) return;

    try {
      // Verify the delivery code
      const isValid = await firestoreService.verifyDeliveryCode(
        selectedOrder.id,
        code
      );

      if (!isValid) {
        throw new Error("Invalid delivery code");
      }

      // Update the order status
      await firestoreService.updateDeliveryStatusBatch([
        { id: selectedOrder.id, status: "delivered" },
      ]);

      toast.success("Order marked as delivered successfully");
    } catch (error) {
      console.error("Error verifying delivery code:", error);
      throw error;
    }
  };

  const statsCards = [
    {
      title: "Available Balance",
      value: balance ? `₦${balance.availableBalance.toLocaleString()}` : "₦0",
      icon: DollarSign,
      color: "bg-purple-500",
    },
    {
      title: "Total Deliveries",
      value: stats.totalDeliveries,
      icon: Package,
      color: "bg-blue-500",
    },
    {
      title: "Today's Deliveries",
      value: stats.todayDeliveries,
      icon: Bike,
      color: "bg-green-500",
    },
    {
      title: "Active Orders",
      value: stats.activeOrders,
      icon: Clock,
      color: "bg-yellow-500",
    },
    {
      title: "Rating",
      value: `${stats.rating.toFixed(1)} ⭐`,
      icon: Star,
      color: "bg-green-500",
    },
  ];

  if (loading && !riderData) {
    console.log("Still loading: waiting for initial data");
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RiderNavigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <RiderLayout>
          <div className="p-6">
            {/* Status Banner */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-2">
                    Welcome, {rider?.name}
                  </h1>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        rider?.status === "available"
                          ? "bg-green-500"
                          : rider?.status === "busy"
                          ? "bg-yellow-500"
                          : "bg-gray-500"
                      }`}
                    />
                    <span className="text-gray-600 capitalize">
                      {rider?.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statsCards.map((stat) => (
                <div
                  key={stat.title}
                  className="bg-white rounded-lg shadow-sm p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-2xl font-semibold">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Active Orders */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Active Orders</h2>
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-lg shadow p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">
                          Order #{order.id.slice(-6)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {order.createdAt instanceof Timestamp
                            ? order.createdAt.toDate().toLocaleString()
                            : new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          order.status === "ready"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Customer:</span>
                        <span>{order.customerName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-medium">
                          ₦{order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {order.status === "ready" && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(order.id, "picked_up")
                        }
                        className="w-full mt-4 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                      >
                        Mark as Picked Up
                      </button>
                    )}
                    {order.status === "picked_up" && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(order.id, "delivered")
                        }
                        className="w-full mt-4 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                      >
                        Mark as Delivered
                      </button>
                    )}
                  </div>
                ))}
                {orders.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No active orders
                  </p>
                )}
              </div>
            </div>

            {/* Current Location */}
            {rider?.currentLocation && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold">Current Location</h2>
                </div>
                <p className="text-gray-600">
                  Lat: {rider.currentLocation.latitude.toFixed(6)}, Long:{" "}
                  {rider.currentLocation.longitude.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </RiderLayout>
      </div>

      {showOnboarding && riderData && (
        <OnboardingModal
          userType="rider"
          userData={riderData}
          onClose={() => setShowOnboarding(false)}
        />
      )}

      {/* Add DeliveryCodeModal */}
      <DeliveryCodeModal
        isOpen={deliveryModalOpen}
        onClose={() => {
          setDeliveryModalOpen(false);
          setSelectedOrder(null);
        }}
        onSubmit={handleDeliveryCodeSubmit}
        orderId={selectedOrder?.id || ""}
      />
    </div>
  );
}
