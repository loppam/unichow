import { Address } from './order';

export type RestaurantStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface RestaurantProfile {
  id: string;
  restaurantName: string;
  description: string;
  cuisine: string[];
  address: Address;
  phone: string;
  email: string;
  openingHours: string;
  closingHours: string;
  minimumOrder: number;
  profileComplete: boolean;
  status: RestaurantStatus;
  isApproved: boolean;
  rating: number;
  totalOrders: number;
  logo?: string;
  bannerImage?: string;
  createdAt: string;
  updatedAt: string;
  lastUpdated?: string;
  paystackSubaccountCode: string;
  averagePreparationTime?: number;
}

export interface RestaurantRegistrationData {
  email: string;
  password: string;
  restaurantName: string;
  phone: string;
  address: Address;
  logo?: File;
  description?: string;
  cuisine?: string[];
  openingHours?: string;
  closingHours?: string;
  minimumOrder: number;
  bankDetails: BankDetails;
}

export interface RestaurantUpdateData {
  restaurantName?: string;
  description?: string;
  cuisine?: string[];
  address?: Address;
  phone?: string;
  openingHours?: string;
  closingHours?: string;
  minimumOrder?: number;
  logo?: File;
  bannerImage?: File;
}

export interface RestaurantStats {
  totalOrders: number;
  rating: number;
  totalRevenue: number;
  averageOrderValue: number;
  completionRate: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  preparationTime?: number;
  allergens?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BankDetails {
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
}

export interface RestaurantPaymentInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  paystackSubaccountCode?: string;
  paystackRecipientCode?: string;
  settlementSchedule: 'daily' | 'weekly' | 'monthly';
  isVerified: boolean;
  lastUpdated: string;
}

export interface Restaurant extends RestaurantProfile {
  paymentInfo?: RestaurantPaymentInfo;
}

export interface RestaurantData extends RestaurantProfile {
  paymentInfo?: RestaurantPaymentInfo;
} 