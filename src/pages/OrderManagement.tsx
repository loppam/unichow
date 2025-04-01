import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Order } from "../types/order";
import { MenuItem } from "../types/menu";
import OrderList from "../components/orders/OrderList";
import OrderDetails from "../components/orders/OrderDetails";
import { firestoreService } from "../services/firestoreService";
import { toast } from "react-hot-toast";

export default function OrderManagement() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order>();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<Order["status"]>("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to new orders
    const unsubscribeOrders = firestoreService.subscribeToNewOrders(
      user.uid,
      (newOrders) => {
        setOrders(newOrders);
        setLoading(false);
      }
    );

    // Subscribe to menu updates
    const unsubscribeMenu = firestoreService.subscribeToMenuUpdates(
      user.uid,
      (updatedMenu) => {
        setMenu(updatedMenu);
        // Check if any orders need to be updated due to menu changes
        orders.forEach((order) => {
          const unavailableItems = order.items.filter(
            (item) =>
              !updatedMenu.find(
                (menuItem) => menuItem.id === item.id && menuItem.isAvailable
              )
          );
          if (unavailableItems.length > 0) {
            toast.error(
              `Some items in order #${order.id} are no longer available`
            );
          }
        });
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeMenu();
    };
  }, [user?.uid, orders]);

  const handleStatusUpdate = async (
    orderId: string,
    status: Order["status"],
    estimatedTime?: number
  ) => {
    try {
      await firestoreService.updateOrderStatusBatch([{ id: orderId, status }]);
      toast.success("Order status updated successfully");
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await firestoreService.updateOrderStatusBatch([
        { id: orderId, status: "accepted" },
      ]);
      toast.success("Order accepted successfully");
    } catch (error) {
      console.error("Error accepting order:", error);
      toast.error("Failed to accept order");
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await firestoreService.updateOrderStatusBatch([
        { id: orderId, status: "cancelled" },
      ]);
      toast.success("Order cancelled successfully");
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order");
    }
  };

  const filteredOrders = orders.filter(
    (order) => order.status === statusFilter
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Order Management</h1>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6">
        {[
          "pending",
          "accepted",
          "preparing",
          "ready",
          "delivered",
          "cancelled",
          "assignment_failed",
        ].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status as Order["status"])}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === status
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <OrderList
          orders={filteredOrders}
          selectedOrderId={selectedOrder?.id}
          onSelectOrder={(order) => setSelectedOrder(order)}
          onStatusUpdate={handleStatusUpdate}
          onAcceptOrder={handleAcceptOrder}
          onCancelOrder={handleCancelOrder}
        />
        {selectedOrder && (
          <OrderDetails
            order={selectedOrder}
            menu={menu}
            onStatusUpdate={handleStatusUpdate}
          />
        )}
      </div>
    </div>
  );
}
