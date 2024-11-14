import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auditService } from '../services/auditService';
import { AuditAction, AuditResource } from '../types/audit';

export function useAuditLog() {
  const { user } = useAuth();

  const logAction = useCallback(
    async (
      action: AuditAction,
      resource: AuditResource,
      resourceId: string,
      details: Record<string, any> = {}
    ) => {
      if (!user) return;

      try {
        await auditService.logAction(
          user.uid,
          user.email ?? '',
          action,
          resource,
          resourceId,
          details,
          'success'
        );
      } catch (error) {
        await auditService.logAction(
          user.uid,
          user.email ?? '',
          action,
          resource,
          resourceId,
          details,
          'failure',
          error instanceof Error ? error.message : 'Unknown error'  
        );
      }
    },
    [user]
  );

  return { logAction };
} 