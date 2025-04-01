export type TransactionType = "payment" | "withdrawal" | "fee";
export type TransactionStatus = "pending" | "successful" | "failed";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  fees: number;
  netAmount: number;
  status: TransactionStatus;
  paystackReference?: string;
  subaccountCode: string;
  userId: string; // can be restaurantId or riderId
  userType: "restaurant" | "rider";
  orderId?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Balance {
  totalReceived: number;
  totalFees: number;
  totalWithdrawals: number;
  availableBalance: number;
  lastUpdated: string;
}
