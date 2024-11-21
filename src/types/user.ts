import { Permission } from "./permissions";

interface User {
  role: string;
  permissions?: Permission[];
}

interface CustomUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
} 