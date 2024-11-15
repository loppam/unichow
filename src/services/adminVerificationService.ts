import { db } from "../firebase/config";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  getDoc,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import {
  VerificationDocument,
  VerificationStatus,
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
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("userType", "==", "restaurant"));
    const snapshot = await getDocs(q);

    const verifications: RestaurantVerification[] = [];

    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      const verificationDocs = await getDocs(
        collection(db, `restaurants/${userDoc.id}/verification`)
      );

      const documents = verificationDocs.docs
        .filter((doc) => doc.id !== "status")
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as VerificationDocument[];

      verifications.push({
        restaurantId: userDoc.id,
        restaurantName: userData.restaurantName,
        email: userData.email,
        phone: userData.phone,
        address: userData.address,
        status: {
          isVerified: userData.isApproved === true,
          state: userData.status === 'rejected' ? 'rejected' : 
                 userData.isApproved ? 'approved' : 'pending'
        },
        documents,
      });
    }

    return verifications;
  },

  async reviewDocument(
    restaurantId: string,
    documentId: string,
    status: "approved" | "rejected",
    rejectionReason?: string
  ): Promise<void> {
    const docRef = doc(
      db,
      `restaurants/${restaurantId}/verification/${documentId}`
    );
    await updateDoc(docRef, {
      status,
      reviewedAt: new Date().toISOString(),
      ...(rejectionReason && { rejectionReason }),
    });
  },

  async updateRestaurantVerificationStatus(
    restaurantId: string,
    isVerified: boolean
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      const statusRef = doc(
        db,
        `restaurants/${restaurantId}/verification/status`
      );
      const statusDoc = await getDoc(statusRef);

      const status = {
        isVerified,
        lastUpdated: new Date().toISOString(),
      };

      // If status document doesn't exist, create it
      if (!statusDoc.exists()) {
        await setDoc(statusRef, status);
      } else {
        await updateDoc(statusRef, status);
      }

      // Update restaurant status in both collections
      const restaurantRef = doc(db, "restaurants", restaurantId);
      const userRef = doc(db, "users", restaurantId);

      const updates = {
        status: isVerified ? "approved" : "pending",
        isApproved: isVerified,
        lastUpdated: new Date().toISOString(),
      };

      batch.update(restaurantRef, updates);
      batch.update(userRef, updates);

      await batch.commit();
    } catch (error) {
      console.error("Error updating verification status:", error);
      throw error;
    }
  },
};
