import { firestoreService } from "./firestoreService";
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
      const verificationDoc: VerificationDocument = {
        type,
        status: "pending",
        fileUrl,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        expiryDate,
        s3Path: path, // Store S3 path for future reference
      };

      const docId = await firestoreService.createDocument(
        `restaurants/${restaurantId}/verification`,
        verificationDoc
      );

      await this.updateVerificationStatus(restaurantId);

      return { id: docId, ...verificationDoc };
    } catch (error) {
      console.error("Error uploading document:", error);
      throw error;
    }
  },

  async updateVerificationStatus(restaurantId: string) {
    const documents = await firestoreService.getCollection(
      `restaurants/${restaurantId}/verification`
    );

    const status = documents.every((doc) => doc.status === "approved")
      ? "approved"
      : documents.some((doc) => doc.status === "rejected")
      ? "rejected"
      : "pending";

    await firestoreService.setDocument(
      `restaurants/${restaurantId}/verification/status`,
      "current",
      {
        status,
        lastUpdated: new Date().toISOString(),
      }
    );
  },

  async getVerificationStatus(restaurantId: string) {
    const statusDoc = await firestoreService.getDocument(
      `restaurants/${restaurantId}/verification/status`,
      "current"
    );
    return statusDoc?.status || "pending";
  },

  async getVerificationDocuments(restaurantId: string) {
    return await firestoreService.getCollection(
      `restaurants/${restaurantId}/verification`
    );
  },
};
