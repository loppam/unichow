import { firestoreService } from "./firestoreService";
import { where, orderBy, limit } from "firebase/firestore";
import { restaurantService } from "./restaurantService";

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
  restaurantId: string;
  updates: Record<string, any>;
}

export const adminService = {
  async bulkUpdateRestaurants(
    operations: BulkUpdateOperation[]
  ): Promise<void> {
    const batch = operations.map((operation) => ({
      collection: "restaurants",
      id: operation.restaurantId,
      data: operation.updates,
    }));

    await firestoreService.batchUpdate(batch);
  },

  async getActiveUsers(): Promise<number> {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const users = await firestoreService.getCollection("users", [
        where("lastActive", ">=", fifteenMinutesAgo),
      ]);
      return users.length;
    } catch (error) {
      console.error("Error getting active users:", error);
      return 0;
    }
  },

  async getSystemMetrics(): Promise<SystemMetrics> {
    const [activeUsers, pendingOrders, systemErrors] = await Promise.all([
      this.getActiveUsers(),
      this.getPendingOrdersCount(),
      this.getSystemErrorsCount(),
    ]);

    return {
      activeUsers,
      pendingOrders,
      systemErrors,
      serverLoad: await this.getServerLoad(),
    };
  },

  async getPendingOrdersCount(): Promise<number> {
    const orders = await firestoreService.getCollection("orders", [
      where("status", "==", "pending"),
    ]);
    return orders.length;
  },

  async getSystemErrorsCount(): Promise<number> {
    const errors = await firestoreService.getCollection("system_errors", [
      where("timestamp", ">=", new Date(Date.now() - 24 * 60 * 60 * 1000)),
    ]);
    return errors.length;
  },

  async getServerLoad() {
    // This would typically come from a monitoring service
    return {
      cpu: 0,
      memory: 0,
      network: 0,
    };
  },

  async _getMetric(metricName: string): Promise<number> {
    try {
      const q = query(
        collection(db, "api_stats"),
        orderBy("timestamp", "desc"),
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
    return this._getMetric("totalRequests");
  },

  async getErrorRate(): Promise<number> {
    return this._getMetric("errorRate");
  },

  async getAverageResponseTime(): Promise<number> {
    return this._getMetric("avgResponseTime");
  },

  async getActiveEndpoints(): Promise<string[]> {
    try {
      const q = query(
        collection(db, "api_stats"),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs[0]?.data()?.activeEndpoints || [];
    } catch (error) {
      console.error("Error getting active endpoints:", error);
      return [];
    }
  },

  async monitorAPIUsage(): Promise<APIUsageMetrics> {
    try {
      const [totalRequests, errorRate, averageResponseTime, activeEndpoints] =
        await Promise.all([
          this.getTotalRequests(),
          this.getErrorRate(),
          this.getAverageResponseTime(),
          this.getActiveEndpoints(),
        ]);

      return {
        totalRequests,
        errorRate,
        averageResponseTime,
        activeEndpoints,
      };
    } catch (error) {
      console.error("Error monitoring API usage:", error);
      throw new Error("Failed to monitor API usage");
    }
  },

  async updateRestaurantStatus(
    restaurantId: string,
    isApproved: boolean
  ): Promise<void> {
    try {
      await restaurantService.updateProfile(restaurantId, {
        isApproved,
        status: isApproved ? "approved" : "rejected",
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating restaurant status:", error);
      throw new Error("Failed to update restaurant status");
    }
  },
};
