export type UserRole = 'admin' | 'superadmin';

export const ROLES = {
  ADMIN: 'admin' as UserRole,
  SUPERADMIN: 'superadmin' as UserRole,
} as const; 