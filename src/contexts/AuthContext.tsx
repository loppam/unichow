import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface User {
  uid: string;
  email: string | null;
  // ... other user properties
}

type CustomUser = User & {
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
};

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  // ... other auth methods
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): { user: CustomUser | null; loading: boolean; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void>; isSuperAdmin: boolean; } {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Update last login
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        lastLogin: new Date().toISOString()
      }, { merge: true });
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('auth/invalid-credential')) {
          throw new Error('Invalid email or password');
        } else if (error.message.includes('auth/too-many-requests')) {
          throw new Error('Too many failed attempts. Please try again later');
        }
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error('Failed to sign out');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsVerified(user?.emailVerified ?? false);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      const checkUserRole = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsSuperAdmin(
              userData.role === 'superadmin' || 
              userData.isSuperAdmin === true
            );
          }
        } catch (error) {
          console.error('Error checking user role:', error);
        }
      };
      
      checkUserRole();
    } else {
      setIsSuperAdmin(false);
    }
  }, [user]);

  const value: AuthContextType = {
    user: user ? {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
    } : null,
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