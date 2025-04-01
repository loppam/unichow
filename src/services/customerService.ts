import { firestoreService } from "./firestoreService";
import { CustomerProfile } from "../types/customer";
import { Review } from "../types/review";
import { Address } from "../types/order";

export const customerService = {
  async updateProfile(customerId: string, data: Partial<CustomerProfile>) {
    await firestoreService.updateDocument("customers", customerId, data);
  },

  async addFavoriteRestaurant(customerId: string, restaurantId: string) {
    await firestoreService.createDocument(`customers/${customerId}/favorites`, {
      addedAt: new Date().toISOString(),
    });
  },

  async removeFavoriteRestaurant(customerId: string, restaurantId: string) {
    await firestoreService.deleteDocument(
      `customers/${customerId}/favorites`,
      restaurantId
    );
  },

  async getFavoriteRestaurants(customerId: string) {
    return await firestoreService.getCollection(
      `customers/${customerId}/favorites`
    );
  },

  async addReview(customerId: string, restaurantId: string, review: Review) {
    await firestoreService.createDocument(
      `restaurants/${restaurantId}/reviews`,
      {
        ...review,
        customerId,
        createdAt: new Date().toISOString(),
      }
    );
  },

  async updateAddress(customerId: string, address: Address) {
    await firestoreService.updateDocument("customers", customerId, {
      address,
      updatedAt: new Date().toISOString(),
    });
  },

  async getSavedAddresses(customerId: string): Promise<Address[]> {
    const customerDoc = await firestoreService.getDocument(
      "customers",
      customerId
    );
    return customerDoc?.savedAddresses || [];
  },

  async saveAddress(customerId: string, address: Address): Promise<void> {
    const customerDoc = await firestoreService.getDocument(
      "customers",
      customerId
    );
    const savedAddresses = customerDoc?.savedAddresses || [];

    await firestoreService.updateDocument("customers", customerId, {
      savedAddresses: [...savedAddresses, address],
      updatedAt: new Date().toISOString(),
    });
  },

  async getInitialAddress(customerId: string): Promise<Address | null> {
    const addresses = await this.getSavedAddresses(customerId);
    return addresses[0] || null;
  },

  async deleteAddress(
    customerId: string,
    addressToDelete: Address
  ): Promise<void> {
    const customerDoc = await firestoreService.getDocument(
      "customers",
      customerId
    );
    const savedAddresses = customerDoc?.savedAddresses || [];

    if (!savedAddresses || !Array.isArray(savedAddresses)) {
      return;
    }

    await firestoreService.updateDocument("customers", customerId, {
      savedAddresses: savedAddresses.filter(
        (addr: Address) => addr.address !== addressToDelete.address
      ),
      updatedAt: new Date().toISOString(),
    });
  },
};
