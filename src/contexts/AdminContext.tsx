import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

interface AdminContextType {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
}

const AdminContext = createContext<AdminContextType>({ isAdmin: false, isSuperAdmin: false, loading: true });

export function useAdmin() {
  return useContext(AdminContext);
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const token = await user.getIdTokenResult();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        setIsAdmin(userData?.isAdmin === true || token.claims.admin === true);
        setIsSuperAdmin(userData?.role === "superadmin" || token.claims.role === "superadmin");
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, isSuperAdmin, loading }}>
      {children}
    </AdminContext.Provider>
  );
} 