import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  getDocs, 
  writeBatch, 
  doc, 
  where, 
  orderBy, 
  limit,
  DocumentData 
} from 'firebase/firestore';
import { restaurantService } from './restaurantService';

interface SystemMetrics {
  activeUsers: number;
  pendingOrders: number;
  systemErrors: number;
  serverLoad: {
    cpu: number;
    memory: number;
    network: number;
  };
}

interface APIUsageMetrics {
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
  activeEndpoints: string[];
}

interface BulkUpdateOperation {
  id: string;
  data: Partial<DocumentData>;
  type?: 'update' | 'delete';
}

export const adminService = {
  async bulkUpdateRestaurants(operations: BulkUpdateOperation[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      operations.forEach(({ id, data, type = 'update' }) => {
        const ref = doc(db, 'restaurants', id);
        if (type === 'delete') {
          batch.delete(ref);
        } else {
          batch.update(ref, {
            ...data,
            updatedAt: new Date().toISOString()
          });
        }
      });

      await batch.commit();
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw new Error('Failed to perform bulk update');
    }
  },

  async getActiveUsers(): Promise<number> {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const q = query(
        collection(db, 'users'),
        where('lastActive', '>=', fifteenMinutesAgo)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting active users:', error);
      return 0;
    }
  },

  async getPendingOrders(): Promise<number> {
    try {
      const q = query(
        collection(db, 'orders'),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting pending orders:', error);
      return 0;
    }
  },

  async getRecentErrors(): Promise<number> {
    try {
      const q = query(
        collection(db, 'system_errors'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting recent errors:', error);
      return 0;
    }
  },

  async getServerLoad() {
    try {
      // In a real application, this would connect to a monitoring service
      // For now, returning mock data
      return {
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        network: Math.floor(Math.random() * 100)
      };
    } catch (error) {
      console.error('Error getting server load:', error);
      return { cpu: 0, memory: 0, network: 0 };
    }
  },

  async _getMetric(metricName: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'api_stats'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs[0]?.data()?.[metricName] || 0;
    } catch (error) {
      console.error(`Error getting ${metricName}:`, error);
      return 0;
    }
  },

  async getTotalRequests(): Promise<number> {
    return this._getMetric('totalRequests');
  },

  async getErrorRate(): Promise<number> {
    return this._getMetric('errorRate');
  },

  async getAverageResponseTime(): Promise<number> {
    return this._getMetric('avgResponseTime');
  },

  async getActiveEndpoints(): Promise<string[]> {
    try {
      const q = query(
        collection(db, 'api_stats'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs[0]?.data()?.activeEndpoints || [];
    } catch (error) {
      console.error('Error getting active endpoints:', error);
      return [];
    }
  },

  async getSystemHealth(): Promise<SystemMetrics> {
    try {
      const [activeUsers, pendingOrders, systemErrors, serverLoad] = await Promise.all([
        this.getActiveUsers(),
        this.getPendingOrders(),
        this.getRecentErrors(),
        this.getServerLoad()
      ]);

      return {
        activeUsers,
        pendingOrders,
        systemErrors,
        serverLoad
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      throw new Error('Failed to get system health metrics');
    }
  },

  async monitorAPIUsage(): Promise<APIUsageMetrics> {
    try {
      const [totalRequests, errorRate, averageResponseTime, activeEndpoints] = await Promise.all([
        this.getTotalRequests(),
        this.getErrorRate(),
        this.getAverageResponseTime(),
        this.getActiveEndpoints()
      ]);

      return {
        totalRequests,
        errorRate,
        averageResponseTime,
        activeEndpoints
      };
    } catch (error) {
      console.error('Error monitoring API usage:', error);
      throw new Error('Failed to monitor API usage');
    }
  },

  async updateRestaurantStatus(
    restaurantId: string, 
    isApproved: boolean
  ): Promise<void> {
    try {
      await restaurantService.updateProfile(restaurantId, {
        isApproved,
        status: isApproved ? 'approved' : 'rejected',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating restaurant status:', error);
      throw new Error('Failed to update restaurant status');
    }
  }
}; 