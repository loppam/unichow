import { Order, OrderStatus } from "../../types/order";
import { formatDistanceToNow } from "date-fns";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";

const formatAddress = (address: string) => {
  return address.replace(/\n/g, ", ");
};

interface OrderListProps {
  orders: Order[];
  selectedOrderId?: string;
  onSelectOrder: (order: Order) => void;
  onStatusUpdate: (orderId: string, status: OrderStatus) => void;
  onAcceptOrder: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
}

export default function OrderList({
  orders,
  selectedOrderId,
  onSelectOrder,
  onStatusUpdate,
  onAcceptOrder,
  onCancelOrder,
}: OrderListProps) {
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
      case "delivered":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "assignment_failed":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "accepted":
      case "preparing":
      case "ready":
        return <Clock className="w-4 h-4" />;
      case "delivered":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
      case "assignment_failed":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getQuickActions = (order: Order) => {
    switch (order.status) {
      case "pending":
        return (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusUpdate(order.id, "accepted");
              }}
              className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
            >
              <CheckCircle className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusUpdate(order.id, "cancelled");
              }}
              className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        );
      case "accepted":
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusUpdate(order.id, "preparing");
            }}
            className="text-sm px-3 py-1 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200"
          >
            Start Preparing
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer transition-all ${
            selectedOrderId === order.id
              ? "ring-2 ring-black"
              : "hover:shadow-md"
          }`}
          onClick={() => onSelectOrder(order)}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold">Order #{order.id.slice(-6)}</h3>
              <p className="text-sm text-gray-500">
                {formatDate(order.createdAt)}
              </p>
            </div>
            <span
              className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${getStatusColor(
                order.status
              )}`}
            >
              {getStatusIcon(order.status)}
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Customer:</span>
              <span>{order.customerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {order.status === "assignment_failed" && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-orange-600 mb-2">
                {order.assignmentFailureReason}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelOrder(order.id);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                >
                  Cancel Order
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAcceptOrder(order.id);
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                >
                  Retry Assignment
                </button>
              </div>
            </div>
          )}

          {order.status === "pending" && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAcceptOrder(order.id);
                }}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
              >
                Accept Order
              </button>
            </div>
          )}

          {order.status === "ready" && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusUpdate(order.id, "delivered");
                }}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
              >
                Mark as Delivered
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
