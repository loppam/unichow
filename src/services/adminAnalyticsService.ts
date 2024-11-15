import { db } from '../firebase/config';
import { doc, setDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export const adminAnalyticsService = {
  async updateDailyStats(stats: {
    totalOrders: number;
    totalRevenue: number;
    activeUsers: number;
    newUsers: number;
  }) {
    const date = new Date().toISOString().split('T')[0];
    const docRef = doc(db, 'admin/analytics/daily', date);
    await setDoc(docRef, {
      ...stats,
      timestamp: new Date().toISOString()
    }, { merge: true });
  },

  async updateRestaurantStats(restaurantId: string, stats: {
    orders: number;
    revenue: number;
    rating: number;
  }) {
    const docRef = doc(db, 'admin/analytics/restaurants', restaurantId);
    await setDoc(docRef, {
      ...stats,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  },

  async getTopRestaurants() {
    const q = query(
      collection(db, 'admin/analytics/restaurants'),
      orderBy('revenue', 'desc'),
      limit(10)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  async getDailyStats(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const q = query(
      collection(db, 'admin/analytics/daily'),
      where('timestamp', '>=', startDate.toISOString()),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      date: doc.id,
      ...doc.data()
    }));
  }
}; 