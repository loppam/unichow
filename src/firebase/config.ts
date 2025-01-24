import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";
// import {
//   getAnalytics,
//   setAnalyticsCollectionEnabled,
// } from "firebase/analytics";

// Add type safety for collections
export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

// Check for required environment variables
const requiredEnvVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
  "VITE_FIREBASE_VAPID_PRIVATE_KEY",
  "VITE_FIREBASE_PRIVATE_KEY",
  "VITE_FIREBASE_CLIENT_EMAIL",
] as const;

requiredEnvVars.forEach((varName) => {
  if (!import.meta.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  vapidKey: import.meta.env.VITE_FIREBASE_VAPID_PRIVATE_KEY,
  privateKey: import.meta.env.VITE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  clientEmail: import.meta.env.VITE_FIREBASE_CLIENT_EMAIL,
} as const;

// Initialize Firebase with analytics disabled
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({
      forceOwnership: true,
    }),
    cacheSizeBytes: 50000000,
  }),
});

// Add region specification for functions
export const functions = getFunctions(app, "us-central1");

// Disable analytics to prevent ad blocker errors
// const analytics = getAnalytics(app);
// setAnalyticsCollectionEnabled(analytics, false);

// Add these collections with type safety
export const COLLECTIONS = {
  USERS: "users",
  ADMINS: "admins",
  RESTAURANTS: "restaurants",
  RESTAURANT_REQUESTS: "restaurant_requests",
  ORDERS: "orders",
  REVIEWS: "reviews",
  SYSTEM_ERRORS: "system_errors",
  AUDIT_LOGS: "audit_logs",
} as const;

export default app;
