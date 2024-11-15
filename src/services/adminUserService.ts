import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
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

// Define the interface for admin creation data
interface CreateAdminData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  number: string;
  isSuperAdmin: boolean;
  role: UserRole;
}

async function createNewAdmin(adminData: CreateAdminData) {
  try {
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'superadmin') {
      throw new Error('Only super admins can create new admin accounts');
    }

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      adminData.email,
      adminData.password
    );

    // Determine if the user should be a superadmin based on role
    const isSuperAdmin = adminData.role === 'superadmin';

    // Create user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      email: adminData.email,
      phone: adminData.number,
      role: adminData.role,
      isAdmin: true,
      isSuperAdmin: isSuperAdmin,
      userType: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active',
      permissions: [],
      lastUpdated: new Date().toISOString(),
      emailVerified: true
    });
    
    return userCredential.user;
  } catch (error) {
    console.error("Error creating admin:", error);
    throw error;
  }
}

export { createNewAdmin };
