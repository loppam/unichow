import React from 'react';
import { Order, OrderStatus } from '../../types/order';
import { formatDistanceToNow } from 'date-fns';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface OrderListProps {
  orders: Order[];
  selectedOrderId?: string;
  onSelectOrder: (order: Order) => void;
  onStatusUpdate: (orderId: string, status: OrderStatus) => void;
}

export default function OrderList({
  orders,
  selectedOrderId,
  onSelectOrder,
  onStatusUpdate
}: OrderListProps) {
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-purple-100 text-purple-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuickActions = (order: Order) => {
    switch (order.status) {
      case 'pending':
        return (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusUpdate(order.id, 'accepted');
              }}
              className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
            >
              <CheckCircle className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusUpdate(order.id, 'cancelled');
              }}
              className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        );
      case 'accepted':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusUpdate(order.id, 'preparing');
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
    <div className="divide-y">
      {orders.map((order) => (
        <div
          key={order.id}
          onClick={() => onSelectOrder(order)}
          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
            selectedOrderId === order.id ? 'bg-gray-50' : ''
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="font-medium">#{order.id.slice(-6)}</span>
              <span className="text-sm text-gray-500 ml-2">
                {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
              </span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </div>

          <div className="mb-2">
            <h3 className="font-medium">{order.customerName}</h3>
            <p className="text-sm text-gray-600 truncate">{order.deliveryAddress}</p>
          </div>

          <div className="text-sm text-gray-600">
            {order.items.length} items · ${order.total.toFixed(2)}
          </div>

          {order.estimatedDeliveryTime && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
              <Clock className="h-4 w-4" />
              <span>
                Est. {new Date(order.estimatedDeliveryTime).toLocaleTimeString()}
              </span>
            </div>
          )}

          <div className="mt-3 flex justify-between items-center">
            <div className="flex -space-x-2">
              {order.items.slice(0, 3).map((item, index) => (
                <div
                  key={index}
                  className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium"
                >
                  {item.quantity}
                </div>
              ))}
              {order.items.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium">
                  +{order.items.length - 3}
                </div>
              )}
            </div>

            {getQuickActions(order)}
          </div>
        </div>
      ))}

      {orders.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No orders found
        </div>
      )}
    </div>
  );
} 