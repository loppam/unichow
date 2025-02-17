export const PERMISSIONS = {
  // Restaurant Management
  MANAGE_RESTAURANTS: 'MANAGE_RESTAURANTS',
  APPROVE_RESTAURANTS: 'APPROVE_RESTAURANTS',
  VIEW_RESTAURANTS: 'VIEW_RESTAURANTS',
  
  // Order Management
  MANAGE_ORDERS: 'MANAGE_ORDERS',
  VIEW_ORDERS: 'VIEW_ORDERS',
  PROCESS_REFUNDS: 'PROCESS_REFUNDS',
  
  // User Management
  MANAGE_USERS: 'MANAGE_USERS',
  VIEW_USERS: 'VIEW_USERS',
  
  // Content Management
  MANAGE_CONTENT: 'MANAGE_CONTENT',
  MODERATE_REVIEWS: 'MODERATE_REVIEWS',
  
  // Settings
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  VIEW_SETTINGS: 'VIEW_SETTINGS',
  
  // Analytics
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  EXPORT_DATA: 'EXPORT_DATA',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS'
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: Object.values(PERMISSIONS),
  moderator: [
    PERMISSIONS.VIEW_RESTAURANTS,
    PERMISSIONS.APPROVE_RESTAURANTS,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.MODERATE_REVIEWS,
    PERMISSIONS.VIEW_ANALYTICS
  ],
  support: [
    PERMISSIONS.VIEW_RESTAURANTS,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MODERATE_REVIEWS
  ]
}; 