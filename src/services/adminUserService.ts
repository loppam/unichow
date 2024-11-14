import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { UserRole } from '../constants/roles';

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'inactive';
  permissions: string[];
  createdAt: string;
  isAdmin: boolean;
}

async function createNewAdmin(adminData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
  role: string;
}) {
  try {
    const createAdminFunction = httpsCallable(functions, 'createAdminUser');
    const result = await createAdminFunction({
      email: adminData.email,
      temporaryPassword: adminData.password,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      role: adminData.isSuperAdmin ? 'superadmin' : 'admin',
      permissions: []
    });
    
    return result.data;
  } catch (error) {
    console.error("Error creating admin:", error);
    throw error;
  }
}

export { createNewAdmin };
