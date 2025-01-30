import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  orderBy,
  limit,
} from "firebase/firestore";
import { Rider } from "../types/rider";
import { Order } from "../types/order";

const RIDER_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ASSIGNMENT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const RETRY_INTERVALS = [30000, 60000, 120000]; // 30s, 1min, 2min

export const riderAssignmentService = {
  async assignRiderToOrder(orderId: string): Promise<string | null> {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc.exists()) throw new Error("Order not found");

      const order = orderDoc.data() as Order;
      console.log("Order status:", order.status);

      // Query available riders
      const ridersRef = collection(db, "riders");
      const q = query(
        ridersRef,
        where("isVerified", "==", true),
        where("status", "==", "available"),
        orderBy("assignedOrders", "asc")
      );

      const ridersSnapshot = await getDocs(q);
      if (ridersSnapshot.empty) {
        console.log("No available riders found");
        return null;
      }

      // Get all riders with minimum number of orders
      const riders = ridersSnapshot.docs;
      const minOrders = riders[0].data().assignedOrders?.length || 0;
      const ridersWithMinOrders = riders.filter(
        (rider) => (rider.data().assignedOrders?.length || 0) === minOrders
      );

      // Randomly select one rider from those with minimum orders
      const selectedRider =
        ridersWithMinOrders[
          Math.floor(Math.random() * ridersWithMinOrders.length)
        ];
      const riderId = selectedRider.id;

      console.log(
        "Found riders with min orders:",
        ridersWithMinOrders.map((doc) => ({
          id: doc.id,
          assignedOrders: doc.data().assignedOrders?.length || 0,
        }))
      );

      // Update rider's assigned orders
      await updateDoc(doc(db, "riders", riderId), {
        assignedOrders: arrayUnion(orderId),
        lastActivity: serverTimestamp(),
      });

      // Update order with rider assignment
      await updateDoc(orderRef, {
        riderId,
        assignedAt: serverTimestamp(),
      });
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
        where("status", "==", "accepted"),
        where("assignedAt", "<=", timeoutThreshold),
        where("riderId", "!=", null) // Only check orders that have a rider assigned
      );

      const ordersSnapshot = await getDocs(q);

      for (const orderDoc of ordersSnapshot.docs) {
        try {
          const order = orderDoc.data() as Order;

          // Reset order assignment but keep status as accepted
          await updateDoc(orderDoc.ref, {
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

          // Start the retry process instead of immediate reassignment
          await this.scheduleRiderAssignment(orderDoc.id);
          console.log(`Started retry process for order ${orderDoc.id}`);
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

  async updateRiderActivity(riderId: string): Promise<void> {
    const riderRef = doc(db, "riders", riderId);
    await updateDoc(riderRef, {
      lastActivity: serverTimestamp(),
    });
  },

  async scheduleRiderAssignment(orderId: string): Promise<void> {
    let retryCount = 0;

    const attemptAssignment = async () => {
      try {
        // Check if order still needs a rider
        const orderRef = doc(db, "orders", orderId);
        const orderDoc = await getDoc(orderRef);
        if (!orderDoc.exists()) return;

        const order = orderDoc.data() as Order;
        if (order.riderId || order.status !== "accepted") return;

        // Try to assign rider
        const riderId = await this.assignRiderToOrder(orderId);

        if (!riderId && retryCount < RETRY_INTERVALS.length) {
          // Schedule next retry
          setTimeout(attemptAssignment, RETRY_INTERVALS[retryCount]);
          retryCount++;
        } else if (!riderId) {
          // All retries failed, update order to need manual intervention
          await updateDoc(orderRef, {
            needsRiderAssignment: true,
            updatedAt: serverTimestamp(),
          });

          // Could also notify admin/restaurant here
          console.error(
            `Failed to assign rider to order ${orderId} after all retries`
          );
        }
      } catch (error) {
        console.error(`Error in retry attempt for order ${orderId}:`, error);
      }
    };

    // Start first retry attempt
    setTimeout(attemptAssignment, RETRY_INTERVALS[0]);
  },
};
