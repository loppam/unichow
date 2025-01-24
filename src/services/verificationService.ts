import { db } from "../firebase/config";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { s3Service } from "./s3Service";
import {
  VerificationDocument,
  VerificationStatus,
} from "../types/verification";

export const verificationService = {
  async uploadDocument(
    restaurantId: string,
    file: File,
    type: VerificationDocument["type"],
    expiryDate?: string
  ): Promise<VerificationDocument> {
    try {
      // Upload file to S3
      const path = `restaurants/${restaurantId}/verification/${type}_${Date.now()}`;
      const fileUrl = await s3Service.uploadImage(file, path);

      // Create document record in Firestore
      const docRef = doc(
        collection(db, `restaurants/${restaurantId}/verification`)
      );
      const verificationDoc: VerificationDocument = {
        id: docRef.id,
        type,
        status: "pending",
        fileUrl,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        expiryDate,
        s3Path: path, // Store S3 path for future reference
      };

      await setDoc(docRef, verificationDoc);
      await this.updateVerificationStatus(restaurantId);

      return verificationDoc;
    } catch (error) {
      console.error("Error uploading document:", error);
      throw error;
    }
  },

  async getVerificationStatus(
    restaurantId: string
  ): Promise<VerificationStatus> {
    try {
      const statusDoc = await getDoc(
        doc(db, `restaurants/${restaurantId}/verification/status`)
      );

      if (!statusDoc.exists()) {
        const defaultStatus: VerificationStatus = {
          isVerified: false,
          documentsSubmitted: false,
          pendingDocuments: ["business_license", "food_permit", "identity"],
          rejectedDocuments: [],
          lastUpdated: new Date().toISOString(),
        };
        await setDoc(statusDoc.ref, defaultStatus);
        return defaultStatus;
      }

      return statusDoc.data() as VerificationStatus;
    } catch (error) {
      console.error("Error getting verification status:", error);
      throw error;
    }
  },

  async getDocuments(restaurantId: string): Promise<VerificationDocument[]> {
    try {
      const snapshot = await getDocs(
        collection(db, `restaurants/${restaurantId}/verification`)
      );
      return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as VerificationDocument))
        .filter((doc) => doc.type); // Filter out status document
    } catch (error) {
      console.error("Error getting verification documents:", error);
      throw error;
    }
  },

  async updateVerificationStatus(restaurantId: string) {
    try {
      const documents = await this.getDocuments(restaurantId);
      const pendingDocs = new Set([
        "business_license",
        "food_permit",
        "identity",
      ]);
      const rejectedDocs: string[] = [];

      documents.forEach((doc) => {
        if (doc.status === "approved") {
          pendingDocs.delete(doc.type);
        } else if (doc.status === "rejected") {
          rejectedDocs.push(doc.type);
        }
      });

      const status: VerificationStatus = {
        isVerified: pendingDocs.size === 0 && rejectedDocs.length === 0,
        documentsSubmitted: documents.length > 0,
        pendingDocuments: Array.from(pendingDocs),
        rejectedDocuments: rejectedDocs,
        lastUpdated: new Date().toISOString(),
      };

      await setDoc(
        doc(db, `restaurants/${restaurantId}/verification/status`),
        status
      );

      return status;
    } catch (error) {
      console.error("Error updating verification status:", error);
      throw error;
    }
  },

  async deleteDocument(restaurantId: string, document: VerificationDocument) {
    try {
      // Delete file from S3
      if (document.s3Path) {
        await s3Service.deleteImage(document.s3Path);
      }

      // Delete document record
      await deleteDoc(
        doc(db, `restaurants/${restaurantId}/verification/${document.id}`)
      );

      await this.updateVerificationStatus(restaurantId);
    } catch (error) {
      console.error("Error deleting document:", error);
      throw error;
    }
  },
};
