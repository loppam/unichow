import { db } from '../firebase/config';
import { collection, doc, updateDoc, query, where, getDoc, writeBatch, getDocs, runTransaction } from 'firebase/firestore';

// Define interfaces
interface RestaurantProfile {
  restaurantName: string;
  description: string;
  cuisine: string;
  address: string;
  phone: string;
  email: string;
  openingHours: string;
  closingHours: string;
  minimumOrder: number;
  logo?: string;
  bannerImage?: string;
  updatedAt: string;
}

interface Restaurant extends RestaurantProfile {
  id: string;
  isApproved: boolean;
  status: 'pending' | 'approved' | 'suspended';
  rating: number;
  numberOfReviews: number;
  createdAt: string;
}

interface RestaurantFilters {
  isApproved?: boolean;
  cuisine?: string;
  status?: Restaurant['status'];
}

export const restaurantService = {
  async updateProfile(restaurantId: string, data: Partial<RestaurantProfile>): Promise<void> {
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    await updateDoc(restaurantRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  },

  async getRestaurantProfile(restaurantId: string): Promise<Restaurant> {
    const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
    if (!restaurantDoc.exists()) {
      throw new Error('Restaurant not found');
    }
    return { id: restaurantDoc.id, ...restaurantDoc.data() } as Restaurant;
  },

  async getAllRestaurants(filters?: RestaurantFilters): Promise<Restaurant[]> {
    let q = query(collection(db, 'restaurants'));
    const conditions = [];
    
    if (filters?.isApproved !== undefined) {
      conditions.push(where('isApproved', '==', filters.isApproved));
    }
    
    if (filters?.cuisine) {
      conditions.push(where('cuisine', '==', filters.cuisine));
    }

    if (filters?.status) {
      conditions.push(where('status', '==', filters.status));
    }

    if (conditions.length > 0) {
      q = query(q, ...conditions);
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Restaurant));
  },

  async bulkUpdateRestaurants(updates: { id: string; data: Partial<Restaurant> }[]): Promise<void> {
    const batch = writeBatch(db);
    
    updates.forEach(({ id, data }) => {
      const ref = doc(db, 'restaurants', id);
      batch.update(ref, {
        ...data,
        updatedAt: new Date().toISOString()
      });
    });

    await batch.commit();
  },

  async updateRestaurantRating(restaurantId: string, newRating: number): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const restaurantRef = doc(db, 'restaurants', restaurantId);
        const restaurantDoc = await transaction.get(restaurantRef);

        if (!restaurantDoc.exists()) {
          throw new Error('Restaurant not found');
        }

        const data = restaurantDoc.data();
        const currentRating = data.rating || 0;
        const numRatings = data.numRatings || 0;

        // Calculate new average rating
        const updatedRating = (currentRating * numRatings + newRating) / (numRatings + 1);

        transaction.update(restaurantRef, {
          rating: updatedRating,
          numRatings: numRatings + 1,
          lastRatingUpdate: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error('Error updating restaurant rating:', error);
      throw error;
    }
  },

  async syncRestaurantData(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const restaurantRef = doc(db, 'restaurants', userId);

      const [userDoc, restaurantDoc] = await Promise.all([
        getDoc(userRef),
        getDoc(restaurantRef)
      ]);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      
      // Update or create restaurant document
      await updateDoc(restaurantRef, {
        email: userData.email,
        restaurantName: userData.restaurantName || '',
        phone: userData.phone || '',
        address: userData.address || '',
        lastSync: new Date().toISOString(),
        // Add any other fields you want to sync
      });
    } catch (error) {
      console.error('Error syncing restaurant data:', error);
      throw error;
    }
  }
};
