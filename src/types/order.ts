import { ReactNode } from "react";

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  additionalInstructions?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export type PaymentMethod = 'card' | 'cash';
export type PaymentStatus = 'pending' | 'completed' | 'failed';
export type NotificationStatus = "pending" | "cancelled" | "completed";

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
  deliveryAddress: Address;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  preparedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  estimatedDeliveryTime?: string;
  customerName: string;
}

export interface OrderNotification {
  id: string;
  orderId: string;
  message: string;
  timestamp: string | Date;
  read: boolean;
  status: NotificationStatus;
  amount: number;
  customerName: ReactNode;
}
