import PermissionGuard from './auth/PermissionGuard';
import { PERMISSIONS } from '../types/permissions';

export default function SomeProtectedComponent() {
  return (
    <PermissionGuard
      permissions={[PERMISSIONS.MANAGE_USERS, PERMISSIONS.VIEW_USERS]}
      requireAll={false}
      fallback={<div>You don't have permission to view this content</div>}
    >
      <div>Protected content here</div>
    </PermissionGuard>
  );
} 