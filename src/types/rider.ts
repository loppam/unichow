export type RiderStatus =
  | "approved"
  | "pending"
  | "rejected"
  | "suspended"
  | "offline";

export interface Rider {
  vehicleType: string;
  vehiclePlate: string;
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  status: RiderStatus;
  lastActivity: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  assignedOrders: string[];
  completedOrders: number;
  rating: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastPreAssignedAt?: string;
  paymentInfo?: RiderPaymentInfo;
}

export interface RiderAssignment {
  orderId: string;
  riderId: string;
  assignedAt: string;
  acknowledgedAt?: string;
  status: "pending" | "acknowledged" | "completed" | "reassigned";
}

export interface RiderPaymentInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  isVerified: boolean;
  lastUpdated: string;
  paystackSubaccountCode: string;
  settlementSchedule: "daily" | "weekly" | "biweekly" | "monthly";
}
