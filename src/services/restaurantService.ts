import { db } from "../firebase/config";
import {
  doc,
  getDoc,
  writeBatch,
  addDoc,
  collection,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import {
  RestaurantProfile,
  RestaurantRegistrationData,
  RestaurantStats,
} from "../types/restaurant";
import { paystackService } from "./paystackService";
import { Address } from "../types/order";
import { s3Service } from "./s3Service";
import { isValidCuisineType } from "../constants/cuisineTypes";

export const restaurantService = {
  async registerRestaurant(data: RestaurantRegistrationData): Promise<string> {
    try {
      // Save to Firebase first to get the ID
      const docRef = await addDoc(collection(db, "restaurants"), {
        ...data,
        createdAt: new Date().toISOString(),
        status: "pending",
      });

      // Create Paystack subaccount with the generated ID
      const paystackSubaccountCode = await paystackService.createSubaccount(
        docRef.id,
        {
          bankName: data.bankDetails.settlement_bank,
          accountNumber: data.bankDetails.account_number,
          accountName: data.restaurantName,
          settlementSchedule: "weekly",
          isVerified: false,
          lastUpdated: new Date().toISOString(),
        }
      );

      // Update the document with the subaccount code
      await updateDoc(docRef, { paystackSubaccountCode });

      return docRef.id;
    } catch (error) {
      console.error("Error registering restaurant:", error);
      throw error;
    }
  },

  async getRestaurantProfile(
    restaurantId: string
  ): Promise<RestaurantProfile | null> {
    try {
      const restaurantRef = doc(db, "restaurants", restaurantId);
      const restaurantDoc = await getDoc(restaurantRef);

      if (!restaurantDoc.exists()) return null;
      return restaurantDoc.data() as RestaurantProfile;
    } catch (error) {
      console.error("Error fetching restaurant profile:", error);
      throw error;
    }
  },

  async updateProfile(
    restaurantId: string,
    data: Partial<RestaurantProfile>,
    files?: { logo?: File; banner?: File }
  ): Promise<void> {
    try {
      // Validate cuisine types
      if (data.cuisineTypes) {
        const invalidCuisines = data.cuisineTypes.filter(
          (cuisine) => !isValidCuisineType(cuisine)
        );
        if (invalidCuisines.length > 0) {
          throw new Error(
            `Invalid cuisine types: ${invalidCuisines.join(", ")}`
          );
        }
      }

      // Handle address update separately if present
      if (data.address) {
        await this.syncAddressUpdate(restaurantId, data.address);
        delete data.address; // Remove from main update
      }

      const batch = writeBatch(db);
      const updates: Partial<RestaurantProfile> = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      // Handle file uploads if provided
      if (files?.logo) {
        const logoUrl = await this.uploadFile(restaurantId, files.logo, "logo");
        updates.logo = logoUrl;
      }

      if (files?.banner) {
        const bannerUrl = await this.uploadFile(
          restaurantId,
          files.banner,
          "banner"
        );
        updates.bannerImage = bannerUrl;
      }

      // Update restaurant document
      batch.update(doc(db, "restaurants", restaurantId), updates);

      // Update user document with basic info
      const userUpdates = {
        restaurantName: updates.restaurantName,
        phone: updates.phone,
        updatedAt: updates.updatedAt,
      };
      batch.update(doc(db, "users", restaurantId), userUpdates);

      await batch.commit();
    } catch (error) {
      console.error("Error updating restaurant profile:", error);
      throw error;
    }
  },

  async uploadFile(
    restaurantId: string,
    file: File,
    type: "logo" | "banner"
  ): Promise<string> {
    const path = `restaurants/${restaurantId}/${type}/${Date.now()}_${
      file.name
    }`;
    return await s3Service.uploadImage(file, path);
  },

  async getRestaurantStats(restaurantId: string): Promise<RestaurantStats> {
    const restaurantRef = doc(db, "restaurants", restaurantId);
    const statsDoc = await getDoc(restaurantRef);

    if (!statsDoc.exists()) {
      throw new Error("Restaurant not found");
    }

    const data = statsDoc.data();
    return {
      totalOrders: data.totalOrders || 0,
      rating: data.rating || 0,
      totalRevenue: data.totalRevenue || 0,
      averageOrderValue: data.averageOrderValue || 0,
      completionRate: data.completionRate || 0,
    };
  },

  async syncAddressUpdate(
    restaurantId: string,
    address: Address
  ): Promise<void> {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();

    batch.update(doc(db, "restaurants", restaurantId), {
      address,
      updatedAt: timestamp,
    });

    batch.update(doc(db, "users", restaurantId), {
      address: address.address,
      updatedAt: timestamp,
    });

    await batch.commit();
  },

  async fixMalformedAddresses(): Promise<void> {
    const restaurantsRef = collection(db, "restaurants");
    const snapshot = await getDocs(restaurantsRef);

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Check if address is malformed (array)
      if (Array.isArray(data.address)) {
        const fixedAddress = {
          address: data.address.join(""),
          additionalInstructions: "",
        };

        await this.syncAddressUpdate(doc.id, fixedAddress);
      }
    }
  },
};
