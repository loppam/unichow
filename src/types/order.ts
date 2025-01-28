import { Timestamp } from "firebase/firestore";

export interface Address {
  id?: string;
  address: string;
  additionalInstructions: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

export type OrderStatus =
  | "cart"
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled"
  | "assigned"
  | "picked_up";

export type PaymentMethod = "card" | "cash";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type NotificationStatus = "pending" | "cancelled" | "completed";

export interface OrderPack {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress?: string;
  items: OrderItem[];
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  total: number;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: Timestamp | string;
  updatedAt: string;
  acceptedAt?: string;
  preparedAt?: string;
  readyAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  estimatedDeliveryTime?: string;
  deliveryAddress: {
    address: string;
    additionalInstructions?: string;
  };
  packs?: OrderPack[];
  riderId?: string;
  restaurantName: string;
  deliveryConfirmationCode: string;
}

export interface OrderNotification {
  id: string;
  orderId: string;
  customerName: string;
  amount: number;
  status: "pending" | "completed" | "cancelled";
  message: string;
  timestamp: string;
  read: boolean;
  readAt?: string;
  type: "delivery" | "order" | "pre_assignment";
  restaurantId?: string;
  deliveryAddress?: string;
  data?: {
    estimatedPickupTime?: string;
    expiresAt?: string;
  };
}

export interface UserOrder extends Order {
  status: OrderStatus;
  lastUpdated: string;
}
