import { Address } from "./order";

export interface CustomerProfile {
  name?: string;
  email?: string;
  phone?: string;
  savedAddresses?: Address[];
} 