import { useEffect, useState } from "react";
import { Order } from "../../types/order";
import { orderService } from "../../services/orderService";
import { formatDistanceToNow } from "date-fns";
import { Package, MapPin } from "lucide-react";
import { Timestamp } from "firebase/firestore";

interface ActiveOrdersProps {
  riderId: string;
}

export default function ActiveOrders({ riderId }: ActiveOrdersProps) {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  useEffect(() => {
    let unsubscribe: () => void;

    const setupSubscription = async () => {
      unsubscribe = await orderService.subscribeToRiderOrders(
        riderId,
        (orders) => {
          const filteredOrders = orders
            .filter(
              (order) => !["delivered", "cancelled"].includes(order.status)
            )
            .sort((a, b) => {
              const dateA =
                a.createdAt instanceof Timestamp
                  ? a.createdAt.toDate()
                  : new Date(a.createdAt);
              const dateB =
                b.createdAt instanceof Timestamp
                  ? b.createdAt.toDate()
                  : new Date(b.createdAt);
              return dateA.getTime() - dateB.getTime();
            })
            .slice(0, 5);

          setActiveOrders(filteredOrders);
        }
      );
    };

    setupSubscription();
    return () => unsubscribe?.();
  }, [riderId]);

  if (activeOrders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Active Orders</h2>
        <div className="text-center text-gray-500 py-4">No active orders</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">Active Orders</h2>
      <div className="space-y-4">
        {activeOrders.map((order) => (
          <div key={order.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium">Order #{order.id.slice(-6)}</h3>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  order.status === "ready"
                    ? "bg-green-100 text-green-800"
                    : order.status === "picked_up"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {order.status.replace("_", " ")}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Package className="w-4 h-4" />
              <span>{order.restaurantName}</span>
            </div>

            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 mt-1" />
              <span>{order.deliveryAddress.address}</span>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              {formatDistanceToNow(
                order.createdAt instanceof Timestamp
                  ? order.createdAt.toDate()
                  : new Date(order.createdAt),
                { addSuffix: true }
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
