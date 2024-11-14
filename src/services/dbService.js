import { 
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase/config';

export const dbService = {
  // Meals
  async getAllMeals() {
    const mealsRef = collection(db, 'meals');
    const snapshot = await getDocs(mealsRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  async updateMealStock(mealId, inStock) {
    const mealRef = doc(db, 'meals', mealId);
    await updateDoc(mealRef, { inStock });
  },

  // Sides
  async getMealSides(mealId) {
    const sidesRef = collection(db, 'sides');
    const q = query(sidesRef, where("mealId", "==", mealId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // Orders
  async createOrder(orderData) {
    const ordersRef = collection(db, 'orders');
    return await addDoc(ordersRef, {
      ...orderData,
      createdAt: new Date(),
      status: 'pending'
    });
  },

  async getOrders() {
    const ordersRef = collection(db, 'orders');
    const snapshot = await getDocs(ordersRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
}; 