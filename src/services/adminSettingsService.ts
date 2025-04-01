import { firestoreService } from "./firestoreService";
import { auth } from "../firebase/config";

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
    throw new Error("Not authenticated");
  }

  const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
  const userData = userDoc.data();

  if (
    !userData?.role ||
    (userData.role !== "admin" && userData.role !== "superadmin")
  ) {
    throw new Error("Unauthorized access: Admin privileges required");
  }

  return true;
}

const SETTINGS_DOC_ID = "delivery"; // Fixed document ID for delivery settings

export const adminSettingsService = {
  async getSettings(): Promise<AdminSettings> {
    const settings = await firestoreService.getDocument("admin", "settings");
    return settings as AdminSettings;
  },

  async updateSettings(settings: Partial<AdminSettings>): Promise<void> {
    await firestoreService.updateDocument("admin", "settings", {
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.uid,
    });
  },

  async getDeliverySettings(): Promise<DeliverySettings> {
    const settings = await this.getSettings();
    return (
      settings.delivery || {
        deliveryRadius: 5,
        freeDeliveryThreshold: 1000,
        baseDeliveryFee: 100,
      }
    );
  },

  async updateDeliverySettings(delivery: AdminSettings["delivery"]) {
    await this.updateSettings({ delivery });
  },
};
