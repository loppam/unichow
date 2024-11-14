import { ReactNode } from "react";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled"
  | "completed";

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentStatus: "pending" | "completed" | "failed";
  paymentMethod: "card" | "cash";
  specialInstructions?: string;
  estimatedDeliveryTime?: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  preparedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface OrderNotification {
  customerName: ReactNode;
  id: string;
  orderId: string;
  message: string;
  timestamp: string | Date;
  read: boolean;
  status: "pending" | "cancelled" | "completed";
  amount: number;
}
