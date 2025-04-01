import { firestoreService } from "./firestoreService";
import { where } from "firebase/firestore";

export const dbService = {
  // Meals
  async getAllMeals() {
    return await firestoreService.getCollection("meals");
  },

  async updateMealStock(mealId, inStock) {
    await firestoreService.updateDocument("meals", mealId, { inStock });
  },

  // Sides
  async getMealSides(mealId) {
    return await firestoreService.getCollection("sides", [
      where("mealId", "==", mealId),
    ]);
  },

  // Orders
  async createOrder(orderData) {
    return await firestoreService.createDocument("orders", {
      ...orderData,
      createdAt: new Date(),
      status: "pending",
    });
  },

  async getOrders() {
    return await firestoreService.getCollection("orders");
  },
};
