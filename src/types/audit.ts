export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'login'
  | 'logout'
  | 'status_change'
  | 'permission_change'
  | 'verification'
  | 'order_status_change'
  | 'refund'
  | 'settings_change';

export type AuditResource =
  | 'user'
  | 'restaurant'
  | 'order'
  | 'menu'
  | 'review'
  | 'settings'
  | 'verification'
  | 'payment';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
} 