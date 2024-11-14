import { db } from '../firebase/config';
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { AuditLog, AuditAction, AuditResource } from '../types/audit';

export const auditService = {
  async logAction(
    userId: string,
    userEmail: string,
    action: AuditAction,
    resource: AuditResource,
    resourceId: string,
    details: Record<string, any> = {},
    status: 'success' | 'failure' = 'success',
    errorMessage?: string
  ): Promise<void> {
    try {
      const auditLog: Omit<AuditLog, 'id'> = {
        timestamp: new Date().toISOString(),
        userId,
        userEmail,
        action,
        resource,
        resourceId,
        details,
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
        status,
        ...(errorMessage && { errorMessage })
      };

      await addDoc(collection(db, 'audit_logs'), auditLog);
    } catch (error) {
      console.error('Error logging audit action:', error);
      // Don't throw here to prevent disrupting the main operation
    }
  },

  async getAuditLogs(
    filters: {
      userId?: string;
      resource?: AuditResource;
      action?: AuditAction;
      startDate?: Date;
      endDate?: Date;
    },
    page = 1,
    pageSize = 50
  ): Promise<{ logs: AuditLog[]; hasMore: boolean }> {
    try {
      let q = query(
        collection(db, 'audit_logs'),
        orderBy('timestamp', 'desc'),
        limit(pageSize * page + 1)
      );

      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId));
      }
      if (filters.resource) {
        q = query(q, where('resource', '==', filters.resource));
      }
      if (filters.action) {
        q = query(q, where('action', '==', filters.action));
      }
      if (filters.startDate) {
        q = query(q, where('timestamp', '>=', filters.startDate.toISOString()));
      }
      if (filters.endDate) {
        q = query(q, where('timestamp', '<=', filters.endDate.toISOString()));
      }

      const snapshot = await getDocs(q);
      const logs = snapshot.docs
        .slice((page - 1) * pageSize, page * pageSize)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AuditLog[];

      return {
        logs,
        hasMore: snapshot.docs.length > pageSize
      };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  },

  getClientIP: async function(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }
}; 