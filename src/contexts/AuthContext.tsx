import { createContext, useContext, useEffect, useState } from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase/config";
import { firestoreService } from "../services/firestoreService";

interface User {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  userType?: "customer" | "restaurant" | "rider" | "admin";
  createdAt?: string;
  lastUpdated?: string;
  lastLogin?: string;
  isVerified?: boolean;
  role?: string;
  status?: string;
  isSuperAdmin?: boolean;
  // Restaurant specific
  restaurantName?: string;
  description?: string;
  cuisineTypes?: string[];
  openingHours?: string;
  closingHours?: string;
  isApproved?: boolean;
  // Rider specific
  vehicleType?: string;
  vehiclePlate?: string;
  licenseNumber?: string;
  workingHours?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  rating?: number;
  totalDeliveries?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Update last login using firestoreService
      await firestoreService.updateDocument("users", userCredential.user.uid, {
        lastLogin: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("auth/invalid-credential")) {
          throw new Error("Invalid email or password");
        } else if (error.message.includes("auth/too-many-requests")) {
          throw new Error("Too many failed attempts. Please try again later");
        }
        throw error;
      }
      throw new Error("An unexpected error occurred");
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      throw new Error("Failed to sign out");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user data from Firestore using firestoreService
          const userData = await firestoreService.getDocument<User>(
            "users",
            firebaseUser.uid
          );

          if (userData) {
            // Merge Firebase auth user with Firestore user data
            setUser({
              ...userData,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,
            });

            // Check for super admin
            setIsSuperAdmin(
              userData.role === "superadmin" || userData.isSuperAdmin === true
            );
          } else {
            // If no Firestore document exists, just set basic user data
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,
            });
            setIsSuperAdmin(false);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
          });
          setIsSuperAdmin(false);
        }
      } else {
        setUser(null);
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    isSuperAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
