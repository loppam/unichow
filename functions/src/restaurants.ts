import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const syncRestaurantData = onDocumentWritten(
  { 
    document: "users/{userId}",
    memory: "256MiB",
    timeoutSeconds: 60
  },
  async (event) => {
    const userId = event.params.userId;
    const change = event.data;
    const newData = change?.after?.data();

    // Only proceed if this is a restaurant user
    if (newData?.userType !== "restaurant") {
      return;
    }

    const restaurantRef = admin.firestore().doc(`restaurants/${userId}`);
    
    // If user is deleted, archive the restaurant
    if (!newData) {
      try {
        await restaurantRef.update({
          status: 'suspended',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error("Error archiving restaurant:", error);
      }
      return;
    }

    // Create/Update restaurant document
    try {
      await restaurantRef.set({
        restaurantName: newData.restaurantName || "",
        description: newData.description || "",
        cuisine: newData.cuisine || "",
        address: newData.address || "",
        phone: newData.phone || "",
        email: newData.email,
        isApproved: newData.isApproved || false,
        status: newData.status || "pending",
        openingHours: newData.openingHours || "",
        closingHours: newData.closingHours || "",
        minimumOrder: newData.minimumOrder || 0,
        logo: newData.logo || "",
        bannerImage: newData.bannerImage || "",
        rating: newData.rating || 0,
        numberOfReviews: newData.numberOfReviews || 0,
        createdAt: newData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error syncing restaurant:", error);
    }
  }
);

export const updateRestaurantRating = onDocumentWritten(
  {
    document: "restaurants/{restaurantId}/reviews/{reviewId}",
    memory: "256MiB",
    timeoutSeconds: 60
  },
  async (event) => {
    const restaurantId = event.params.restaurantId;
    const change = event.data;
    const restaurantRef = admin.firestore().doc(`restaurants/${restaurantId}`);

    // Add check for deleted review
    if (change && !change.after.exists) {
      try {
        const reviewsSnapshot = await admin
          .firestore()
          .collection(`restaurants/${restaurantId}/reviews`)
          .get();

        let totalRating = 0;
        let numberOfReviews = 0;

        reviewsSnapshot.forEach((doc) => {
          const review = doc.data();
          if (review.rating) {
            totalRating += review.rating;
            numberOfReviews++;
          }
        });

        const averageRating = numberOfReviews > 0 ? totalRating / numberOfReviews : 0;

        await restaurantRef.update({
          rating: averageRating,
          numberOfReviews,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Recalculated rating after deletion for restaurant ${restaurantId}: ${averageRating}`);
        return;
      } catch (error) {
        console.error("Error recalculating rating after deletion:", error);
        return;
      }
    }

    // Add data validation
    if (!change?.after.exists) {
      console.error("Review does not exist");
      return;
    }

    const review = change.after.data();
    if (!review?.rating || 
        typeof review.rating !== "number" || 
        review.rating < 0 || 
        review.rating > 5) {
      console.error("Invalid rating value");
      return;
    }

    try {
      const reviewsSnapshot = await admin
        .firestore()
        .collection(`restaurants/${restaurantId}/reviews`)
        .get();

      let totalRating = 0;
      let numberOfReviews = 0;

      reviewsSnapshot.forEach((doc) => {
        const review = doc.data();
        if (review.rating) {
          totalRating += review.rating;
          numberOfReviews++;
        }
      });

      const averageRating = numberOfReviews > 0 ? totalRating / numberOfReviews : 0;

      await restaurantRef.update({
        rating: averageRating,
        numberOfReviews,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Updated rating for restaurant ${restaurantId}: ${averageRating}`);
    } catch (error) {
      console.error("Error updating restaurant rating:", error);
    }
  }
);
