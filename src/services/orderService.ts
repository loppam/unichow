import { db } from "../firebase/config";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  getDoc,
  getDocs,
  onSnapshot,
  QueryConstraint,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Order,
  OrderStatus,
  Address,
  PaymentStatus,
  UserOrder,
  OrderItem,
} from "../types/order";

export const orderService = {
  async getOrders(
    restaurantId: string,
    statuses: OrderStatus[],
    startDate?: Date
  ): Promise<Order[]> {
    try {
      const ordersRef = collection(db, "orders");

      const constraints: QueryConstraint[] = [
        where("restaurantId", "==", restaurantId),
        where("status", "in", statuses),
        orderBy("createdAt", "asc"),
      ];

      // Add date filter if startDate is provided
      if (startDate) {
        constraints.push(where("createdAt", ">=", startDate.toISOString()));
      }

      const q = query(ordersRef, ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
    } catch (error) {
      console.error("Error getting orders:", error);
      throw error;
    }
  },

  async getOrderById(orderId: string): Promise<Order> {
    try {
      const orderDoc = await getDoc(doc(db, "orders", orderId));
      if (!orderDoc.exists()) {
        throw new Error("Order not found");
      }
      return { id: orderDoc.id, ...orderDoc.data() } as Order;
    } catch (error) {
      console.error("Error fetching order:", error);
      throw error;
    }
  },

  async updateOrderStatus(
    userId: string,
    orderId: string,
    newStatus: OrderStatus
  ): Promise<void> {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...(newStatus === "delivered" && { deliveredAt: serverTimestamp() }),
        ...(newStatus === "picked_up" && { pickedUpAt: serverTimestamp() }),
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
  },

  subscribeToNewOrders(
    restaurantId: string,
    callback: (orders: Order[]) => void
  ) {
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("restaurantId", "==", restaurantId),
      where("status", "in", [
        "pending",
        "accepted",
        "preparing",
        "ready",
        "delivered",
      ]),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      callback(orders);
    });
  },

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    paymentReference?: string
  ): Promise<void> {
    try {
      const orderRef = doc(db, "orders", orderId);
      const updates = {
        paymentStatus,
        ...(paymentReference && { paymentReference }),
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(orderRef, updates);
    } catch (error) {
      console.error("Error updating payment status:", error);
      throw error;
    }
  },

  async getUserOrders(userId: string): Promise<UserOrder[]> {
    try {
      const ordersRef = collection(db, "orders");
      const q = query(
        ordersRef,
        where("customerId", "==", userId),
        orderBy("createdAt", "asc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        lastUpdated: doc.data().updatedAt || doc.data().createdAt,
      })) as UserOrder[];
    } catch (error) {
      console.error("Error fetching user orders:", error);
      throw error;
    }
  },

  async getRestaurantStats(restaurantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const ordersRef = collection(db, "orders");

      // Get completed orders for today
      const completedOrdersQuery = query(
        ordersRef,
        where("restaurantId", "==", restaurantId),
        where("status", "==", "delivered"),
        where("createdAt", ">=", today.toISOString()),
        orderBy("createdAt", "asc")
      );

      // Get pending orders
      const pendingOrdersQuery = query(
        ordersRef,
        where("restaurantId", "==", restaurantId),
        where("status", "==", "pending")
      );

      // Get all completed orders for revenue and popular items
      const allCompletedOrdersQuery = query(
        ordersRef,
        where("restaurantId", "==", restaurantId),
        where("status", "==", "delivered"),
        orderBy("createdAt", "asc"),
        limit(50)
      );

      const [completedToday, pendingOrders, allCompleted] = await Promise.all([
        getDocs(completedOrdersQuery),
        getDocs(pendingOrdersQuery),
        getDocs(allCompletedOrdersQuery),
      ]);

      // Calculate today's revenue from completed orders
      const todayRevenue = completedToday.docs.reduce((acc, doc) => {
        const order = doc.data();
        return acc + order.total;
      }, 0);

      // Get popular items from completed orders
      const itemCounts = new Map();
      allCompleted.docs.forEach((doc) => {
        const order = doc.data();
        order.items.forEach((item: OrderItem) => {
          const count = itemCounts.get(item.id) || 0;
          itemCounts.set(item.id, count + item.quantity);
        });
      });

      return {
        todayOrders: completedToday.docs.length,
        pendingOrders: pendingOrders.docs.length,
        todayRevenue,
        recentOrders: allCompleted.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
        popularItems: Array.from(itemCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
      };
    } catch (error) {
      console.error("Error getting restaurant stats:", error);
      throw error;
    }
  },

  async deleteOrder(orderId: string): Promise<void> {
    await deleteDoc(doc(db, "orders", orderId));
  },

  async createOrder(
    userId: string,
    orderData: {
      packs: {
        id: string;
        restaurantName: string;
        items: {
          id: string;
          name: string;
          price: number;
          quantity: number;
          specialInstructions?: string;
        }[];
      }[];
      restaurantId: string;
      customerName: string;
      customerPhone: string;
      deliveryAddress: Address;
      subtotal: number;
      deliveryFee: number;
      serviceFee: number;
      total: number;
      deliveryConfirmationCode: string;
      paymentMethod: string;
      paymentStatus: string;
    }
  ): Promise<string> {
    try {
      const orderRef = await addDoc(collection(db, "orders"), {
        customerId: userId,
        restaurantId: orderData.restaurantId,
        status: "pending",
        packs: orderData.packs,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        deliveryAddress: orderData.deliveryAddress,
        subtotal: orderData.subtotal,
        deliveryFee: orderData.deliveryFee,
        serviceFee: orderData.serviceFee,
        total: orderData.total,
        deliveryConfirmationCode: orderData.deliveryConfirmationCode,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return orderRef.id;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  },

  async subscribeToRiderOrders(
    riderId: string,
    callback: (orders: Order[]) => void
  ) {
    const ordersRef = collection(db, "orders");

    // Query for orders that are either assigned to this rider or ready for pickup
    const q = query(
      ordersRef,
      where("riderId", "==", riderId),
      where("status", "in", ["assigned", "preparing", "ready", "picked_up"]),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, async (snapshot) => {
      const ordersPromises = snapshot.docs.map(async (docSnapshot) => {
        const orderData = docSnapshot.data();
        // Get restaurant details
        const restaurantRef = doc(db, "restaurants", orderData.restaurantId);
        const restaurantSnap = await getDoc(restaurantRef);
        const restaurantData = restaurantSnap.data();

        return {
          ...orderData,
          id: docSnapshot.id,
          restaurantName: restaurantData?.name || "Unknown Restaurant",
          restaurantAddress: restaurantData?.address || {
            street: "",
            city: "",
            state: "",
            zipCode: "",
          },
        } as Order & {
          restaurantName: string;
          restaurantAddress: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
          };
        };
      });

      const orders = await Promise.all(ordersPromises);
      const filteredOrders = orders.filter(
        (order) => order.riderId === riderId
      );

      callback(filteredOrders);
    });
  },

  subscribeToUserOrders(userId: string, callback: (orders: Order[]) => void) {
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("customerId", "==", userId),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      callback(orders);
    });
  },
};
