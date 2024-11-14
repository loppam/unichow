import React from 'react';
import { Permission } from '../../types/permissions';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionGuardProps {
  permissions: Permission | Permission[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PermissionGuard({
  permissions,
  requireAll = false,
  children,
  fallback = null
}: PermissionGuardProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  const hasAccess = Array.isArray(permissions)
    ? requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
    : hasPermission(permissions);

  if (!hasAccess) return fallback;

  return <>{children}</>;
} 