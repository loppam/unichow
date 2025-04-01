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
  runTransaction,
} from "firebase/firestore";
import { Rider } from "../types/rider";
import { Order } from "../types/order";
import { paymentService } from "./paymentService";

const RIDER_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ASSIGNMENT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_INTERVALS = [5000, 10000, 20000]; // 5s, 10s, 20s
const MAX_ASSIGNMENT_TIME = 5 * 60 * 1000; // 5 minutes

export const riderAssignmentService = {
  async assignRiderToOrder(orderId: string): Promise<string | null> {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc.exists()) throw new Error("Order not found");

      const order = orderDoc.data() as Order;

      // Check if order already has a rider
      if (order.riderId) {
        console.log("Order already has a rider assigned");
        return order.riderId;
      }

      // Check if order is still in a valid state for assignment
      if (!["pending", "accepted"].includes(order.status)) {
        console.log(
          `Order status ${order.status} not valid for rider assignment`
        );
        return null;
      }

      // Query for available riders with minimal orders and good ratings
      const ridersRef = collection(db, "riders");
      const q = query(
        ridersRef,
        where("isVerified", "==", true),
        where("status", "==", "available"),
        orderBy("assignedOrders", "asc"),
        limit(1)
      );

      const ridersSnapshot = await getDocs(q);
      if (ridersSnapshot.empty) {
        console.log("No available riders found");
        return null;
      }

      const selectedRider = ridersSnapshot.docs[0];
      const riderId = selectedRider.id;

      // Use transaction to update both rider and order
      await runTransaction(db, async (transaction) => {
        // Update rider's assigned orders
        transaction.update(doc(db, "riders", riderId), {
          assignedOrders: arrayUnion(orderId),
          lastActivity: serverTimestamp(),
        });

        // Update order with rider assignment
        transaction.update(orderRef, {
          riderId,
          assignedAt: serverTimestamp(),
          status: "accepted",
          updatedAt: serverTimestamp(),
        });
      });

      console.log(`Rider ${riderId} successfully assigned to order ${orderId}`);
      return riderId;
    } catch (error) {
      console.error("Error assigning rider:", error);
      return null;
    }
  },

  async handleAssignmentFailure(
    orderId: string,
    retryCount: number
  ): Promise<void> {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc.exists()) return;

      const order = orderDoc.data() as Order;

      // Check if order has been assigned a rider since last attempt
      if (order.riderId) {
        console.log("Order has been assigned a rider, stopping retries");
        return;
      }

      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        // All retries failed, handle the failure
        await this.handleFinalAssignmentFailure(orderId, order);
      } else {
        // Schedule next retry with exponential backoff
        const delay = RETRY_INTERVALS[retryCount];
        console.log(
          `Scheduling retry ${retryCount + 1} in ${delay / 1000} seconds`
        );

        setTimeout(() => {
          this.scheduleRiderAssignment(orderId, retryCount + 1);
        }, delay);
      }
    } catch (error) {
      console.error("Error handling assignment failure:", error);
    }
  },

  async handleFinalAssignmentFailure(
    orderId: string,
    order: Order
  ): Promise<void> {
    try {
      const orderRef = doc(db, "orders", orderId);

      // Update order status to indicate assignment failure
      await updateDoc(orderRef, {
        status: "assignment_failed",
        needsRiderAssignment: true,
        updatedAt: serverTimestamp(),
        assignmentFailureReason: "No available riders after multiple attempts",
      });

      // Process refund for the customer if payment was made
      if (order.paymentStatus === "paid") {
        await paymentService.processRefund(orderId, order.total);
      }

      // Notify the restaurant
      const restaurantRef = doc(db, "restaurants", order.restaurantId);
      await updateDoc(restaurantRef, {
        notifications: arrayUnion({
          type: "order_assignment_failed",
          orderId,
          message: `Order #${orderId} failed to assign a rider. Please review and take action.`,
          timestamp: serverTimestamp(),
        }),
      });

      // Notify the customer
      const customerRef = doc(db, "customers", order.customerId);
      await updateDoc(customerRef, {
        notifications: arrayUnion({
          type: "order_assignment_failed",
          orderId,
          message:
            "We couldn't find a rider for your order. A refund will be processed.",
          timestamp: serverTimestamp(),
        }),
      });
    } catch (error) {
      console.error("Error handling final assignment failure:", error);
    }
  },

  async scheduleRiderAssignment(
    orderId: string,
    retryCount: number = 0
  ): Promise<void> {
    try {
      // Check if order still needs a rider
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc.exists()) return;

      const order = orderDoc.data() as Order;

      // Check if order has been assigned or is no longer in a valid state
      if (order.riderId || !["pending", "accepted"].includes(order.status)) {
        console.log("Order no longer needs rider assignment");
        return;
      }

      // Check if we've exceeded the maximum assignment time
      const orderAge =
        Date.now() -
        (order.createdAt instanceof Timestamp
          ? order.createdAt.toDate().getTime()
          : new Date(order.createdAt).getTime());
      if (orderAge > MAX_ASSIGNMENT_TIME) {
        console.log("Order assignment timeout exceeded");
        await this.handleFinalAssignmentFailure(orderId, order);
        return;
      }

      // Try to assign rider
      const riderId = await this.assignRiderToOrder(orderId);

      if (!riderId) {
        // Handle assignment failure
        await this.handleAssignmentFailure(orderId, retryCount);
      }
    } catch (error) {
      console.error(`Error in retry attempt for order ${orderId}:`, error);
      await this.handleAssignmentFailure(orderId, retryCount);
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
};
