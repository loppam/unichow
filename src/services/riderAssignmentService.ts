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
} from "firebase/firestore";
import { notificationService } from "./notificationService";
import { Rider } from "../types/rider";
import { Order, OrderNotification } from "../types/order";

const RIDER_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ASSIGNMENT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const riderAssignmentService = {
  async assignRiderToOrder(orderId: string): Promise<string | null> {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc.exists()) throw new Error("Order not found");

      const order = orderDoc.data() as Order;
      console.log("Order status:", order.status); // Debug log

      // Query available riders
      const ridersRef = collection(db, "riders");
      const q = query(ridersRef, where("isVerified", "==", true));

      const ridersSnapshot = await getDocs(q);
      console.log(
        "Found riders:",
        ridersSnapshot.docs.map((doc) => ({
          id: doc.id,
          status: doc.data().status,
          isVerified: doc.data().isVerified,
        }))
      );

      if (ridersSnapshot.empty) {
        console.log("No riders found at all");
        return null;
      }

      // Get the first available rider
      const rider = ridersSnapshot.docs[0];
      const riderId = rider.id;

      // Update order with rider assignment
      await updateDoc(orderRef, {
        riderId,
        status: "assigned",
        assignedAt: serverTimestamp(),
      });

      // Update rider's assigned orders
      await updateDoc(doc(db, "riders", riderId), {
        assignedOrders: arrayUnion(orderId),
        lastActivity: serverTimestamp(),
      });

      console.log("Successfully assigned rider:", riderId); // Debug log
      return riderId;
    } catch (error) {
      console.error("Error assigning rider:", error);
      return null;
    }
  },

  async checkAndReassignOrders(): Promise<void> {
    try {
      const timeoutThreshold = Timestamp.fromMillis(
        Date.now() - ASSIGNMENT_TIMEOUT
      );

      const ordersRef = collection(db, "orders");
      const q = query(
        ordersRef,
        where("status", "==", "assigned"),
        where("assignedAt", "<=", timeoutThreshold)
      );

      const ordersSnapshot = await getDocs(q);

      for (const orderDoc of ordersSnapshot.docs) {
        try {
          const order = orderDoc.data() as Order;

          // Reset order assignment
          await updateDoc(orderDoc.ref, {
            status: "ready",
            riderId: null,
            assignedAt: null,
            updatedAt: serverTimestamp(),
          });

          if (order.riderId) {
            const riderRef = doc(db, "riders", order.riderId);
            const riderDoc = await getDoc(riderRef);
            if (riderDoc.exists()) {
              const rider = riderDoc.data() as Rider;
              const assignedOrders = rider.assignedOrders.filter(
                (id: string) => id !== orderDoc.id
              );
              await updateDoc(riderRef, {
                assignedOrders,
                lastActivity: serverTimestamp(),
              });
            }
          }
        } catch (error) {
          console.error(`Error processing order ${orderDoc.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in checkAndReassignOrders:", error);
      throw error;
    }
  },

  async checkAndMarkIdleRiders(): Promise<void> {
    const idleThreshold = Timestamp.fromMillis(Date.now() - RIDER_IDLE_TIMEOUT);

    const ridersRef = collection(db, "riders");
    const q = query(
      ridersRef,
      where("status", "==", "available"),
      where("lastActivity", "<=", idleThreshold)
    );

    const snapshot = await getDocs(q);

    for (const doc of snapshot.docs) {
      await updateDoc(doc.ref, {
        status: "offline",
        lastActivity: serverTimestamp(),
      });
    }
  },
};
