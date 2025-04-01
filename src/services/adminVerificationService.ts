import { firestoreService } from "./firestoreService";
import {
  VerificationDocument,
  VerificationStatus,
  RiderVerification,
} from "../types/verification";

interface RestaurantVerification {
  restaurantId: string;
  restaurantName: string;
  email: string;
  phone: string;
  address: string;
  status: VerificationStatus;
  documents: VerificationDocument[];
}

export const adminVerificationService = {
  async getPendingVerifications(): Promise<RestaurantVerification[]> {
    const verifications = await firestoreService.getCollection("verification", [
      firestoreService.where("status", "==", "pending"),
    ]);
    return verifications as RestaurantVerification[];
  },

  async getRiderVerifications(): Promise<RiderVerification[]> {
    const verifications = await firestoreService.getCollection("rider_verifications", [
      firestoreService.where("status", "==", "pending"),
    ]);
    return verifications as RiderVerification[];
  },

  async updateVerificationStatus(
    verificationId: string,
    status: VerificationStatus,
    notes?: string
  ): Promise<void> {
    await firestoreService.updateDocument("verification", verificationId, {
      status,
      notes,
      updatedAt: new Date().toISOString(),
      updatedBy: firestoreService.auth.currentUser?.uid,
    });
  },

  async updateRiderVerificationStatus(
    verificationId: string,
    status: VerificationStatus,
    notes?: string
  ): Promise<void> {
    await firestoreService.updateDocument("rider_verifications", verificationId, {
      status,
      notes,
      updatedAt: new Date().toISOString(),
      updatedBy: firestoreService.auth.currentUser?.uid,
    });
  },
};
