import admin from "firebase-admin";
import { createRequire } from "module";
import { getServiceAccountCredentials } from "../utils/serviceAccount";

// Initialize admin SDK with credentials from environment variables
admin.initializeApp({
  credential: admin.credential.cert(getServiceAccountCredentials()),
});

const restoreUsers = async () => {
  try {
    // Get all users from Auth
    const listUsersResult = await admin.auth().listUsers();
    const users = listUsersResult.users;
    let recoveredCount = 0;

    // Get Firestore instance
    const db = admin.firestore();

    for (const userRecord of users) {
      try {
        // Check if user document exists
        const userDoc = await db.collection("users").doc(userRecord.uid).get();

        if (!userDoc.exists) {
          // Determine user type
          let userType = "user";
          if (userRecord.email?.includes("restaurant")) {
            userType = "restaurant";
          } else if (userRecord.email?.includes("rider")) {
            userType = "rider";
          } else if (userRecord.customClaims?.admin) {
            userType = "admin";
          }

          // Create user document
          await db
            .collection("users")
            .doc(userRecord.uid)
            .set({
              email: userRecord.email,
              emailVerified: userRecord.emailVerified,
              userType,
              createdAt: userRecord.metadata.creationTime,
              lastLogin: userRecord.metadata.lastSignInTime,
              ...(userType === "admin" && {
                isAdmin: true,
                role: userRecord.customClaims?.superAdmin
                  ? "superadmin"
                  : "admin",
              }),
            });

          recoveredCount++;
          console.log(`Recovered user: ${userRecord.email}`);
        }
      } catch (error) {
        console.error(`Error recovering user ${userRecord.email}:`, error);
      }
    }

    console.log(`Recovery complete. Recovered ${recoveredCount} users.`);
    return { success: true, recoveredCount };
  } catch (error) {
    console.error("Error in recovery process:", error);
    throw error;
  }
};

// Execute the function
restoreUsers()
  .then((result) => console.log("Success:", result))
  .catch((error) => console.error("Failed:", error))
  .finally(() => process.exit());
