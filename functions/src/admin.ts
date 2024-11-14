import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface AdminUserData {
  email: string;
  temporaryPassword: string;
  firstName: string;
  lastName: string;
  role: "admin" | "superadmin";
  permissions: string[];
}

export const createAdminUser = onCall<AdminUserData>(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      // Check if caller is authenticated
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Must be authenticated to create admin users"
        );
      }

      // Check if caller has superadmin role
      const callerDoc = await admin
        .firestore()
        .doc(`users/${request.auth.uid}`)
        .get();
      const callerData = callerDoc.data();

      if (callerData?.role !== "superadmin") {
        throw new HttpsError(
          "permission-denied",
          "Only super admins can create admin users"
        );
      }

      // Create the user
      const userRecord = await admin.auth().createUser({
        email: request.data.email,
        password: request.data.temporaryPassword,
      });

      // Set custom claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        admin: true,
        role: request.data.role,
      });

      const now = new Date().toISOString();
      const name = `${request.data.firstName} ${request.data.lastName}`;

      // Create admin document in Firestore with all required fields
      await admin.firestore().doc(`users/${userRecord.uid}`).set({
        email: request.data.email,
        firstName: request.data.firstName,
        lastName: request.data.lastName,
        name: name,
        role: request.data.role,
        permissions: request.data.permissions,
        userType: "admin",
        status: "active",
        isAdmin: true,
        isSuperAdmin: request.data.role === "superadmin",
        createdAt: now,
        lastUpdated: now,
        emailVerified: true,
      });

      return { success: true, userId: userRecord.uid };
    } catch (error) {
      console.error("Error creating admin:", error);
      throw new HttpsError(
        "internal",
        error instanceof Error ? error.message : "Failed to create admin user"
      );
    }
  }
);
