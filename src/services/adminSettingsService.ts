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

const SETTINGS_DOC_ID = 'delivery'; // Fixed document ID for delivery settings

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

  async getDeliverySettings(): Promise<DeliverySettings> {
    try {
      const settingsRef = doc(db, 'admin/settings');
      const settingsDoc = await getDoc(settingsRef);
      
      if (!settingsDoc.exists() || !settingsDoc.data().delivery) {
        // Create default settings if they don't exist
        const defaultSettings: DeliverySettings = {
          freeDeliveryThreshold: 5000,
          baseDeliveryFee: 500
        };
        await updateDoc(settingsRef, {
          delivery: {
            ...defaultSettings,
            lastUpdated: new Date().toISOString()
          }
        });
        return defaultSettings;
      }

      const { delivery } = settingsDoc.data();
      return {
        freeDeliveryThreshold: delivery.freeDeliveryThreshold,
        baseDeliveryFee: delivery.baseDeliveryFee
      };
    } catch (error) {
      console.error('Error fetching delivery settings:', error);
      throw error;
    }
  },

  async updateDeliverySettings(settings: DeliverySettings): Promise<void> {
    try {
      const settingsRef = doc(db, 'admin/settings');
      const updates = {
        'delivery.baseDeliveryFee': settings.baseDeliveryFee,
        'delivery.freeDeliveryThreshold': settings.freeDeliveryThreshold,
        'delivery.lastUpdated': new Date().toISOString()
      };
      await updateDoc(settingsRef, updates);
    } catch (error) {
      console.error('Error updating delivery settings:', error);
      throw error;
    }
  }
}; 