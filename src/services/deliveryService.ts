import { db } from '../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, GeoPoint } from 'firebase/firestore';

function calculateMinBounds(location: GeoPoint, radius: number): GeoPoint {
  return new GeoPoint(
    location.latitude - radius,
    location.longitude - radius
  );
}

function calculateMaxBounds(location: GeoPoint, radius: number): GeoPoint {
  return new GeoPoint(
    location.latitude + radius,
    location.longitude + radius
  );
}

export const deliveryService = {
  async assignDriver(orderId: string, driverId: string) {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      driverId,
      status: 'assigned_driver',
      assignedAt: new Date().toISOString()
    });
  },

  calculateDeliveryFee(distance: number, baseRate: number, perKmRate: number): number {
    return baseRate + (distance * perKmRate);
  },

  async getAvailableDrivers(restaurantLocation: GeoPoint, radius: number) {
    const driversRef = collection(db, 'drivers');
    const q = query(
      driversRef,
      where('status', '==', 'available'),
      where('location', '>=', calculateMinBounds(restaurantLocation, radius)),
      where('location', '<=', calculateMaxBounds(restaurantLocation, radius))
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}; 