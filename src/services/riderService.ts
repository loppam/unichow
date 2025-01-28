import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  writeBatch,
} from "firebase/firestore";
import { Rider, RiderAssignment } from "../types/rider";
import { Order } from "../types/order";

const RIDER_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ASSIGNMENT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const riderService = {
  async assignRiderToOrder(orderId: string): Promise<string | null> {
    try {
      // Get the order
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc.exists()) throw new Error("Order not found");

      // Query available riders
      const ridersRef = collection(db, "riders");
      const q = query(
        ridersRef,
        where("status", "==", "available"),
        where("isVerified", "==", true),
        orderBy("assignedOrders", "asc"),
        limit(1)
      );

      const ridersSnapshot = await getDocs(q);
      if (ridersSnapshot.empty) return null;

      const riderDoc = ridersSnapshot.docs[0];
      const riderId = riderDoc.id;

      // Update order with rider assignment
      await updateDoc(orderRef, {
        riderId,
        status: "assigned",
        assignedAt: serverTimestamp(),
      });

      // Update rider's assigned orders
      await updateDoc(doc(db, "riders", riderId), {
        assignedOrders: arrayUnion(orderId),
        status: "busy",
        lastActivity: serverTimestamp(),
      });

      return riderId;
    } catch (error) {
      console.error("Error assigning rider:", error);
      return null;
    }
  },

  async checkAndReassignOrders(): Promise<void> {
    const timeoutThreshold = new Date(Date.now() - ASSIGNMENT_TIMEOUT);

    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("status", "==", "assigned"),
      where("assignedAt", "<=", timeoutThreshold.toISOString())
    );

    const snapshot = await getDocs(q);

    for (const document of snapshot.docs) {
      const order = document.data() as Order;

      // Reset order assignment
      await updateDoc(document.ref, {
        status: "ready",
        riderId: null,
        assignedAt: null,
      });

      // Update rider's assigned orders
      if (order.riderId) {
        const riderRef = doc(db, "riders", order.riderId);
        const riderDoc = await getDoc(riderRef);
        if (riderDoc.exists()) {
          const riderData = riderDoc.data() as Rider;
          const assignedOrders = riderData.assignedOrders.filter(
            (id: string) => id !== order.id
          );
          await updateDoc(riderRef, { assignedOrders });
        }
      }

      // Try to assign a new rider
      await this.assignRiderToOrder(order.id);
    }
  },

  async updateRiderActivity(riderId: string): Promise<void> {
    const riderRef = doc(db, "riders", riderId);
    await updateDoc(riderRef, {
      lastActivity: new Date().toISOString(),
    });
  },

  async checkIdleRiders(): Promise<void> {
    const idleThreshold = new Date(Date.now() - RIDER_IDLE_TIMEOUT);

    const ridersRef = collection(db, "riders");
    const q = query(
      ridersRef,
      where("status", "==", "available"),
      where("lastActivity", "<=", idleThreshold.toISOString())
    );

    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { status: "offline" });
    });

    await batch.commit();
  },
};
