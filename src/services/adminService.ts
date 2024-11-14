import { db } from '../firebase/config';
import { collection, query, getDocs, writeBatch, doc, where, orderBy, limit } from 'firebase/firestore';

export const adminService = {
  async bulkUpdateRestaurants(updates: { id: string; data: any }[]) {
    const batch = writeBatch(db);
    
    updates.forEach(({ id, data }) => {
      const ref = doc(db, 'restaurants', id);
      batch.update(ref, data);
    });

    await batch.commit();
  },

  async getActiveUsers() {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('lastActive', '>=', new Date(Date.now() - 15 * 60 * 1000)));
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  async getPendingOrders() {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  async getRecentErrors() {
    const errorsRef = collection(db, 'system_errors');
    const q = query(errorsRef, orderBy('timestamp', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  async getServerLoad() {
    // This would typically come from a monitoring service
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      network: Math.random() * 100
    };
  },

  async getTotalRequests() {
    const statsRef = collection(db, 'api_stats');
    const q = query(statsRef, orderBy('timestamp', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.docs[0]?.data()?.totalRequests || 0;
  },

  async getErrorRate() {
    const statsRef = collection(db, 'api_stats');
    const q = query(statsRef, orderBy('timestamp', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.docs[0]?.data()?.errorRate || 0;
  },

  async getAverageResponseTime() {
    const statsRef = collection(db, 'api_stats');
    const q = query(statsRef, orderBy('timestamp', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.docs[0]?.data()?.avgResponseTime || 0;
  },

  async getActiveEndpoints() {
    const statsRef = collection(db, 'api_stats');
    const q = query(statsRef, orderBy('timestamp', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.docs[0]?.data()?.activeEndpoints || [];
  },

  async getSystemHealth() {
    const metrics = {
      activeUsers: await this.getActiveUsers(),
      pendingOrders: await this.getPendingOrders(),
      systemErrors: await this.getRecentErrors(),
      serverLoad: await this.getServerLoad()
    };

    return metrics;
  },

  async monitorAPIUsage() {
    const usage = {
      totalRequests: await this.getTotalRequests(),
      errorRate: await this.getErrorRate(),
      averageResponseTime: await this.getAverageResponseTime(),
      activeEndpoints: await this.getActiveEndpoints()
    };

    return usage;
  }
}; 