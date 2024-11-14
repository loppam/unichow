import { db } from '../firebase/config';
import { collection, doc, setDoc, updateDoc, getDoc, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { CustomerProfile } from '../types/customer';
import { Review } from '../types/review';

export const customerService = {
  async updateProfile(customerId: string, data: Partial<CustomerProfile>) {
    const customerRef = doc(db, 'customers', customerId);
    await updateDoc(customerRef, data);
  },

  async getOrderHistory(customerId: string) {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('customerId', '==', customerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async toggleFavorite(customerId: string, restaurantId: string) {
    const favRef = doc(db, `customers/${customerId}/favorites/${restaurantId}`);
    const favDoc = await getDoc(favRef);
    
    if (favDoc.exists()) {
      await deleteDoc(favRef);
    } else {
      await setDoc(favRef, { addedAt: new Date().toISOString() });
    }
  },

  async addReview(restaurantId: string, customerId: string, review: Review) {
    const reviewRef = collection(db, `restaurants/${restaurantId}/reviews`);
    await addDoc(reviewRef, {
      ...review,
      customerId,           
      createdAt: new Date().toISOString()
    });
  }
}; 