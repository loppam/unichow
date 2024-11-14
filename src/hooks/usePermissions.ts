import { doc } from 'firebase/firestore';
import { getDoc } from 'firebase/firestore';
import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { Permission, ROLE_PERMISSIONS } from "../types/permissions";

export function usePermissions() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserRole(userDoc.data().role);
      }
    };
    fetchUserRole();
  }, [user]);

  const hasPermission = (permission: Permission): boolean => {
    if (!user || !userRole) return false;
    // Super admin has all permissions
    if (userRole === "admin") return true;
    // Check if user's role has the required permission
    return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some((permission) => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every((permission) => hasPermission(permission));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
