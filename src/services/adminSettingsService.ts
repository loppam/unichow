import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth } from '../firebase/config';

interface AdminSettings {
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  minimumAppVersion: string;
  maxOrdersPerDay: number;
  commissionRate: number;
  supportEmail: string;
  supportPhone: string;
  delivery?: {
    deliveryRadius: number;
    freeDeliveryThreshold: number;
    baseDeliveryFee: number;
  };
}

interface DeliverySettings {
  freeDeliveryThreshold: number;
  baseDeliveryFee: number;
}

async function checkAdminStatus() {
  if (!auth.currentUser) {
    throw new Error('Not authenticated');
  }
  
  const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
  const userData = userDoc.data();
  
  if (!userData?.role || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
    throw new Error('Unauthorized access: Admin privileges required');
  }
  
  return true;
}

export const adminSettingsService = {
  async getSettings(): Promise<AdminSettings> {
    const docRef = doc(db, 'admin/settings');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return {
        maintenanceMode: false,
        allowNewRegistrations: true,
        minimumAppVersion: '1.0.0',
        maxOrdersPerDay: 100,
        commissionRate: 10,
        supportEmail: '',
        supportPhone: '',
        delivery: {
          deliveryRadius: 5,
          freeDeliveryThreshold: 5000,
          baseDeliveryFee: 500
        }
      };
    }
    return docSnap.data() as AdminSettings;
  },

  async updateSettings(settings: Partial<AdminSettings>): Promise<void> {
    const docRef = doc(db, 'admin/settings');
    await updateDoc(docRef, {
      ...settings,
      lastUpdated: new Date().toISOString()
    });
  },

  async getDeliverySettings() {
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) return null;
    
    const docRef = doc(db, 'admin/delivery');
    const docSnap = await getDoc(docRef);
    return docSnap.data() as DeliverySettings;
  },

  async updateDeliverySettings(settings: DeliverySettings) {
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) throw new Error('Unauthorized access: Admin privileges required');
    
    const docRef = doc(db, 'admin/settings');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      // Create the document if it doesn't exist
      await setDoc(docRef, {
        delivery: {
          freeDeliveryThreshold: settings.freeDeliveryThreshold,
          baseDeliveryFee: settings.baseDeliveryFee,
        },
        lastUpdated: new Date().toISOString()
      });
    } else {
      // Update existing document
      await updateDoc(docRef, {
        delivery: {
          freeDeliveryThreshold: settings.freeDeliveryThreshold,
          baseDeliveryFee: settings.baseDeliveryFee,
        },
        lastUpdated: new Date().toISOString()
      });
    }
  }
}; 