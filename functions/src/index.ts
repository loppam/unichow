import * as admin from 'firebase-admin';
import { syncRestaurantData, updateRestaurantRating } from './restaurants';
import { createAdminUser } from './admin';

// Initialize admin once at the top level
if (!admin.apps.length) {
  admin.initializeApp();
}

export {
  syncRestaurantData,
  updateRestaurantRating,
  createAdminUser
};