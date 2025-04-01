import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
  limit,
  startAfter,
  orderBy,
  writeBatch,
  Timestamp,
  DocumentData,
  QueryConstraint,
  Unsubscribe,
  arrayUnion,
  addDoc,
  deleteDoc,
  Firestore,
  DocumentReference,
  WithFieldValue,
  UpdateData,
} from "firebase/firestore";
import { cacheService } from "./cacheService";

// Cache durations
const CACHE_DURATION = {
  RESTAURANT_LIST: 5 * 60 * 1000, // 5 minutes
  MENU: 30 * 60 * 1000, // 30 minutes
  ORDER_HISTORY: 1 * 60 * 1000, // 1 minute
};

export const firestoreService = {
  db: db as Firestore,

  // Core Firestore operations
  collection: collection,
  where: where,
  orderBy: orderBy,
  limit: limit,
  startAfter: startAfter,
  arrayUnion: arrayUnion,

  // Document operations
  async getDocument<T extends DocumentData>(
    collectionName: string,
    documentId: string
  ): Promise<T | null> {
    const docRef = doc(db, collectionName, documentId) as DocumentReference<
      T,
      T
    >;
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  },

  async createDocument<T extends DocumentData>(
    collectionName: string,
    data: WithFieldValue<T>
  ): Promise<string> {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  },

  async updateDocument<T extends DocumentData>(
    collectionName: string,
    documentId: string,
    data: UpdateData<T>
  ): Promise<void> {
    const docRef = doc(db, collectionName, documentId) as DocumentReference<
      T,
      T
    >;
    await updateDoc(docRef, data);
  },

  async deleteDocument(
    collectionName: string,
    documentId: string
  ): Promise<void> {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
  },

  async getCollection<T extends DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<(T & { id: string })[]> {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as T & { id: string })
    );
  },

  // Subscription operations
  subscribeToDocument<T extends DocumentData>(
    collectionName: string,
    documentId: string,
    callback: (doc: T | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const docRef = doc(db, collectionName, documentId) as DocumentReference<
      T,
      T
    >;
    return onSnapshot(
      docRef,
      (doc) => callback(doc.exists() ? doc.data() : null),
      onError
    );
  },

  subscribeToCollection<T extends DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[] = [],
    callback: (docs: (T & { id: string })[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, ...constraints);
    return onSnapshot(
      q,
      (snapshot) =>
        callback(
          snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as T & { id: string })
          )
        ),
      onError
    );
  },

  // Customer Operations
  async getRestaurantList() {
    const cacheKey = "restaurant_list";
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const restaurantsRef = collection(db, "restaurants");
    const q = query(restaurantsRef, where("isActive", "==", true));
    const snapshot = await getDocs(q);
    const restaurants = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    cacheService.set(cacheKey, restaurants, CACHE_DURATION.RESTAURANT_LIST);
    return restaurants;
  },

  subscribeToOrderUpdates(orderId: string, callback: (order: any) => void) {
    const orderRef = doc(db, "orders", orderId);
    return onSnapshot(orderRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      }
    });
  },

  subscribeToUserOrders(userId: string, callback: (orders: any[]) => void) {
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("customerId", "==", userId),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(orders);
    });
  },

  subscribeToRiderOrders(riderId: string, callback: (orders: any[]) => void) {
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("riderId", "==", riderId),
      where("status", "in", [
        "accepted",
        "preparing",
        "ready",
        "picked_up",
        "delivered",
      ]),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(orders);
    });
  },

  async getOrderHistory(userId: string, pageSize = 10, lastDoc?: any) {
    const cacheKey = `order_history_${userId}`;
    if (!lastDoc) {
      const cached = cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const ordersRef = collection(db, "orders");
    let q = query(
      ordersRef,
      where("customerId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (!lastDoc) {
      cacheService.set(cacheKey, orders, CACHE_DURATION.ORDER_HISTORY);
    }
    return orders;
  },

  // Restaurant Operations
  subscribeToNewOrders(
    restaurantId: string,
    callback: (orders: any[]) => void
  ) {
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("restaurantId", "==", restaurantId),
      where("status", "in", ["pending", "accepted", "ready", "delivered"])
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(orders);
    });
  },

  subscribeToMenuUpdates(
    restaurantId: string,
    callback: (menu: any[]) => void
  ) {
    const menuRef = collection(db, "restaurants", restaurantId, "menu");
    return onSnapshot(menuRef, (snapshot) => {
      const menu = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Update cache with new menu data
      cacheService.set(`menu_${restaurantId}`, menu, CACHE_DURATION.MENU);
      callback(menu);
    });
  },

  async updateOrderStatusBatch(orders: { id: string; status: string }[]) {
    const batch = writeBatch(db);
    orders.forEach(({ id, status }) => {
      const orderRef = doc(db, "orders", id);
      batch.update(orderRef, { status, updatedAt: Timestamp.now() });
    });
    await batch.commit();
  },

  // Rider Operations
  subscribeToAssignedOrders(
    riderId: string,
    callback: (orders: any[]) => void
  ) {
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("riderId", "==", riderId),
      where("status", "in", ["assigned", "picked_up"])
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(orders);
    });
  },

  async updateDeliveryStatusBatch(orders: { id: string; status: string }[]) {
    const batch = writeBatch(db);
    orders.forEach(({ id, status }) => {
      const orderRef = doc(db, "orders", id);
      batch.update(orderRef, {
        status,
        updatedAt: Timestamp.now(),
        deliveredAt: status === "delivered" ? Timestamp.now() : null,
      });
    });
    await batch.commit();
  },

  // Admin Operations
  async getAnalytics(startDate: Date, endDate: Date) {
    const cacheKey = `analytics_${startDate.toISOString()}_${endDate.toISOString()}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("createdAt", ">=", Timestamp.fromDate(startDate)),
      where("createdAt", "<=", Timestamp.fromDate(endDate))
    );
    const snapshot = await getDocs(q);
    const analytics = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    cacheService.set(cacheKey, analytics, CACHE_DURATION.ORDER_HISTORY);
    return analytics;
  },

  subscribeToActiveOrders(callback: (orders: any[]) => void) {
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("status", "in", ["pending", "accepted", "assigned", "picked_up"])
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(orders);
    });
  },

  async verifyDeliveryCode(orderId: string, code: string): Promise<boolean> {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error("Order not found");
      }

      const orderData = orderDoc.data();
      return orderData.deliveryCode === code;
    } catch (error) {
      console.error("Error verifying delivery code:", error);
      throw error;
    }
  },
};
