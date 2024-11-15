import { auth, db, storage } from '../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc,
  writeBatch 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  RestaurantProfile, 
  RestaurantRegistrationData, 
  RestaurantStats 
} from '../types/restaurant';

// Helper functions for file uploads
const uploadFile = async (path: string, file: File): Promise<string> => {
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
};

export const restaurantService = {
  async registerRestaurant(data: RestaurantRegistrationData): Promise<string> {
    try {
      // 1. Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const { uid } = userCredential.user;

      // 2. Create initial documents (parallel operations)
      const timestamp = new Date().toISOString();
      
      await Promise.all([
        // Create user document
        setDoc(doc(db, 'users', uid), {
          email: data.email,
          userType: 'restaurant',
          restaurantName: data.restaurantName,
          createdAt: timestamp,
          updatedAt: timestamp
        }),

        // Create restaurant document
        setDoc(doc(db, 'restaurants', uid), {
          restaurantName: data.restaurantName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          description: data.description || '',
          cuisine: data.cuisine || [],
          openingHours: data.openingHours || '',
          closingHours: data.closingHours || '',
          status: 'pending',
          isApproved: false,
          rating: 0,
          totalOrders: 0,
          minimumOrder: 0,
          profileComplete: false,
          createdAt: timestamp,
          updatedAt: timestamp
        } as RestaurantProfile)
      ]);

      // 3. Handle logo upload separately (non-blocking)
      if (data.logo) {
        const logoUrl = await uploadFile(
          `restaurants/${uid}/logo`,
          data.logo
        );
        await updateDoc(doc(db, 'restaurants', uid), { logo: logoUrl });
      }

      return uid;
    } catch (error) {
      console.error('Error registering restaurant:', error);
      throw error;
    }
  },

  async getRestaurantProfile(restaurantId: string): Promise<RestaurantProfile | null> {
    try {
      const restaurantRef = doc(db, 'restaurants', restaurantId);
      const restaurantDoc = await getDoc(restaurantRef);
      
      if (!restaurantDoc.exists()) return null;
      return restaurantDoc.data() as RestaurantProfile;
    } catch (error) {
      console.error('Error fetching restaurant profile:', error);
      throw error;
    }
  },

  async updateProfile(
    restaurantId: string,
    data: Partial<RestaurantProfile>,
    files?: { logo?: File; banner?: File }
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      const updates: Partial<RestaurantProfile> = {
        ...data,
        updatedAt: new Date().toISOString()
      };

      // Handle file uploads if provided
      if (files?.logo) {
        const logoUrl = await this.uploadFile(restaurantId, files.logo, 'logo');
        updates.logo = logoUrl;
      }

      if (files?.banner) {
        const bannerUrl = await this.uploadFile(restaurantId, files.banner, 'banner');
        updates.bannerImage = bannerUrl;
      }

      // Update restaurant document
      batch.update(doc(db, 'restaurants', restaurantId), updates);

      // Update user document with basic info
      batch.update(doc(db, 'users', restaurantId), {
        restaurantName: updates.restaurantName,
        phone: updates.phone,
        updatedAt: updates.updatedAt
      });

      await batch.commit();
    } catch (error) {
      console.error('Error updating restaurant profile:', error);
      throw error;
    }
  },

  uploadFile(restaurantId: string, file: File, type: 'logo' | 'banner'): Promise<string> {
    const storageRef = ref(storage, `restaurants/${restaurantId}/${type}/${file.name}`);
    return uploadBytes(storageRef, file)
      .then(() => getDownloadURL(storageRef));
  },

  async getRestaurantStats(restaurantId: string): Promise<RestaurantStats> {
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    const statsDoc = await getDoc(restaurantRef);
    
    if (!statsDoc.exists()) {
      throw new Error('Restaurant not found');
    }

    const data = statsDoc.data();
    return {
      totalOrders: data.totalOrders || 0,
      rating: data.rating || 0,
      totalRevenue: data.totalRevenue || 0,
      averageOrderValue: data.averageOrderValue || 0,
      completionRate: data.completionRate || 0
    };
  }
};
