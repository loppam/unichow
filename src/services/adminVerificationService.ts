import { db } from '../firebase/config';
import { collection, doc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { VerificationDocument, VerificationStatus } from '../types/verification';

interface RestaurantVerification {
  restaurantId: string;
  restaurantName: string;
  email: string;
  status: VerificationStatus;
  documents: VerificationDocument[];
}

export const adminVerificationService = {
  async getPendingVerifications(): Promise<RestaurantVerification[]> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('userType', '==', 'restaurant'));
    const snapshot = await getDocs(q);
    
    const verifications: RestaurantVerification[] = [];
    
    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      const verificationDocs = await getDocs(
        collection(db, `restaurants/${userDoc.id}/verification`)
      );
      
      const statusDoc = verificationDocs.docs.find(doc => doc.id === 'status');
      const documents = verificationDocs.docs
        .filter(doc => doc.id !== 'status')
        .map(doc => ({ id: doc.id, ...doc.data() })) as VerificationDocument[];
      
      verifications.push({
        restaurantId: userDoc.id,
        restaurantName: userData.restaurantName,
        email: userData.email,
        status: statusDoc?.data() as VerificationStatus,
        documents
      });
    }
    
    return verifications;
  },

  async reviewDocument(
    restaurantId: string,
    documentId: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string
  ): Promise<void> {
    const docRef = doc(db, `restaurants/${restaurantId}/verification/${documentId}`);
    await updateDoc(docRef, {
      status,
      reviewedAt: new Date().toISOString(),
      ...(rejectionReason && { rejectionReason })
    });
  },

  async updateRestaurantVerificationStatus(
    restaurantId: string,
    isVerified: boolean
  ): Promise<void> {
    const statusRef = doc(db, `restaurants/${restaurantId}/verification/status`);
    await updateDoc(statusRef, {
      isVerified,
      lastUpdated: new Date().toISOString()
    });
  }
}; 