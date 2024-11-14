export const ROLES = {
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES]; 