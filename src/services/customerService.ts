import { db } from '../firebase/config';
import { collection, doc, setDoc, updateDoc, getDoc, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { CustomerProfile } from '../types/customer';
import { Review } from '../types/review';
import { Address } from '../types/order';

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
  },

  async getSavedAddresses(customerId: string): Promise<Address[]> {
    try {
      const docRef = doc(db, 'customers', customerId);
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      return data?.savedAddresses || [];
    } catch (error) {
      console.error('Error fetching saved addresses:', error);
      return [];
    }
  },

  async saveAddress(customerId: string, address: Address): Promise<void> {
    try {
      const docRef = doc(db, 'customers', customerId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        // Create the customer document if it doesn't exist
        await setDoc(docRef, {
          savedAddresses: [{ ...address, id: Date.now().toString() }]
        });
      } else {
        const currentData = docSnap.data();
        const currentAddresses = currentData?.savedAddresses || [];
        
        await updateDoc(docRef, {
          savedAddresses: [...currentAddresses, { ...address, id: Date.now().toString() }]
        });
      }
    } catch (error) {
      console.error('Error saving address:', error);
      throw new Error('Failed to save address');
    }
  },

  async getInitialAddress(userId: string): Promise<Address | null> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data();
      
      if (userData?.address) {
        return {
          address: userData.address,
          additionalInstructions: ''
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching initial address:', error);
      return null;
    }
  }
}; 