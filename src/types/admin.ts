import { UserRole } from '../constants/roles';

export interface AdminData {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
  isAdmin: boolean;
  createdAt: string;
}

export interface CreateAdminRequest {
  email: string;
  temporaryPassword: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
} 