import { ReactNode } from "react";
import { Timestamp, FieldValue } from 'firebase/firestore';

export interface Address {
  id?: string;
  address: string;
  additionalInstructions?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

export type OrderStatus = 'cart' | 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export type PaymentMethod = 'card' | 'cash';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
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
  createdAt: string | FieldValue;
  updatedAt: string | FieldValue;
  acceptedAt?: string;
  preparedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  estimatedDeliveryTime?: string;
  customerName: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  readyAt?: string;
  customerPhone: string;
  specialInstructions?: string;
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

export interface UserOrder extends Order {
  status: OrderStatus;
  lastUpdated: string;
}
