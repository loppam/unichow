import { firestoreService } from "./firestoreService";
import { orderBy, limit, where } from "firebase/firestore";

export const adminAnalyticsService = {
  async updateDailyStats(stats: {
    totalOrders: number;
    totalRevenue: number;
    activeUsers: number;
    newUsers: number;
  }) {
    const date = new Date().toISOString().split("T")[0];
    await firestoreService.setDocument(
      "admin/analytics/daily",
      date,
      {
        ...stats,
        timestamp: new Date().toISOString(),
      },
      true
    );
  },

  async updateRestaurantStats(
    restaurantId: string,
    stats: {
      orders: number;
      revenue: number;
      rating: number;
    }
  ) {
    await firestoreService.setDocument(
      "admin/analytics/restaurants",
      restaurantId,
      {
        ...stats,
        lastUpdated: new Date().toISOString(),
      },
      true
    );
  },

  async getTopRestaurants() {
    return await firestoreService.getCollection("admin/analytics/restaurants", [
      orderBy("revenue", "desc"),
      limit(10),
    ]);
  },

  async getDailyStats(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await firestoreService.getCollection("admin/analytics/daily", [
      where("timestamp", ">=", startDate.toISOString()),
      orderBy("timestamp", "desc"),
    ]);
  },
};
