import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface AdminSettings {
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  minimumAppVersion: string;
  maxOrdersPerDay: number;
  commissionRate: number;
  supportEmail: string;
  supportPhone: string;
}

export const adminSettingsService = {
  async getSettings(): Promise<AdminSettings> {
    const docRef = doc(db, 'admin/settings');
    const docSnap = await getDoc(docRef);
    return docSnap.data() as AdminSettings;
  },

  async updateSettings(settings: Partial<AdminSettings>): Promise<void> {
    const docRef = doc(db, 'admin/settings');
    await updateDoc(docRef, {
      ...settings,
      lastUpdated: new Date().toISOString()
    });
  }
}; 