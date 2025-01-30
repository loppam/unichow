import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { orderService } from "../services/orderService";
import { Order, OrderStatus } from "../types/order";
import OrderList from "../components/orders/OrderList";
import OrderDetails from "../components/orders/OrderDetails";
import { useOrderNotifications } from "../contexts/OrderNotificationContext";
import RestaurantLayout from "../components/RestaurantLayout";
import { Unsubscribe } from "firebase/firestore";
import { riderAssignmentService } from "../services/riderAssignmentService";
import { toast } from "react-hot-toast";

export default function OrderManagement() {
  const { user } = useAuth();
  const { notifications } = useOrderNotifications();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus[]>([
    "pending",
    "accepted",
    "preparing",
  ]);

  useEffect(() => {
    if (!user?.uid) return;

    const loadOrders = async () => {
      try {
        const fetchedOrders = await orderService.getOrders(
          user.uid,
          statusFilter
        );
        setOrders(fetchedOrders);
      } catch (err) {
        setError("Failed to load orders");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();

    // Subscribe to new orders
    let unsubscribe: Unsubscribe;
    const setupSubscription = async () => {
      unsubscribe = await orderService.subscribeToNewOrders(
        user.uid,
        (newOrders) => {
          setOrders((prev) => {
            const existingIds = new Set(prev.map((o) => o.id));
            const uniqueNewOrders = newOrders.filter(
              (o) => !existingIds.has(o.id)
            );
            return [...uniqueNewOrders, ...prev];
          });
        }
      );
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, statusFilter]);

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
    if (!user) return;

    try {
      await orderService.updateOrderStatus(user.uid, orderId, status);

      // Update local state
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err) {
      console.error("Error updating order status:", err);
      setError("Failed to update order status");
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!user) return;

    try {
      // First update order status to accepted
      await orderService.updateOrderStatus(user.uid, orderId, "accepted");

      // Then try to assign a rider immediately
      const riderId = await riderAssignmentService.assignRiderToOrder(orderId);

      if (!riderId) {
        // If rider assignment fails, start retry attempts in background
        await riderAssignmentService.scheduleRiderAssignment(orderId);
        toast.success("Order accepted. Searching for available riders...");
      } else {
        toast.success("Order accepted and rider assigned");
      }

      // Update local state
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: "accepted",
                riderId: riderId || undefined,
              }
            : order
        )
      );
    } catch (err) {
      console.error("Error accepting order:", err);
      setError("Failed to accept order");
    }
  };

  return (
    <RestaurantLayout>
      <div className="flex h-[calc(100vh-64px)]">
        {/* Orders List Sidebar */}
        <div className="w-1/3 border-r overflow-y-auto">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold mb-4">Orders</h2>

            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
              {[
                "pending",
                "accepted",
                "preparing",
                "ready",
                "delivered",
                "cancelled",
              ].map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    setStatusFilter((prev) =>
                      prev.includes(status as OrderStatus)
                        ? prev.filter((s) => s !== status)
                        : [...prev, status as OrderStatus]
                    )
                  }
                  className={`px-3 py-1 rounded-full text-sm ${
                    statusFilter.includes(status as OrderStatus)
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="p-4 bg-red-50 text-red-500">{error}</div>}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <OrderList
              orders={orders}
              selectedOrderId={selectedOrder?.id}
              onSelectOrder={(order) => setSelectedOrder(order)}
              onStatusUpdate={handleStatusUpdate}
            />
          )}
        </div>

        {/* Order Details */}
        <div className="flex-1 overflow-y-auto">
          {selectedOrder ? (
            <OrderDetails
              order={selectedOrder}
              onStatusUpdate={handleStatusUpdate}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select an order to view details
            </div>
          )}
        </div>
      </div>
    </RestaurantLayout>
  );
}
