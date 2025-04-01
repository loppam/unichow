import { firestoreService } from "./firestoreService";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  getDocs,
  onSnapshot,
  QueryConstraint,
  Timestamp,
  DocumentSnapshot,
} from "firebase/firestore";
import {
  Order,
  OrderStatus,
  OrderItem,
} from "../types/order";
import { toast } from "react-hot-toast";

type OrderWithoutId = Omit<Order, "id">;

export const orderService = {
  async getOrders(restaurantId: string): Promise<Order[]> {
    try {
      return await firestoreService.getCollection<Order>("orders", [
        firestoreService.where("restaurantId", "==", restaurantId),
        firestoreService.orderBy("createdAt", "desc"),
      ]);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
      return [];
    }
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      return await firestoreService.getDocument<Order>("orders", orderId);
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Failed to fetch order");
      return null;
    }
  },

  async createOrder(order: OrderWithoutId): Promise<string> {
    try {
      const orderData = {
        ...order,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as unknown as Order;
      return await firestoreService.createDocument<Order>("orders", orderData);
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order");
      throw error;
    }
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    try {
      await firestoreService.updateDocument<Order>("orders", orderId, {
        status,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
      throw error;
    }
  },

  async updateOrderAddress(orderId: string, address: string): Promise<void> {
    try {
      await firestoreService.updateDocument<Order>("orders", orderId, {
        deliveryAddress: {
          address,
          additionalInstructions: "",
        },
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error updating order address:", error);
      toast.error("Failed to update order address");
      throw error;
    }
  },

  async updateOrderPaymentStatus(
    orderId: string,
    isPaid: boolean
  ): Promise<void> {
    try {
      await firestoreService.updateDocument<Order>("orders", orderId, {
        paymentStatus: isPaid ? "paid" : "pending",
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Failed to update payment status");
      throw error;
    }
  },

  async deleteOrder(orderId: string): Promise<void> {
    try {
      await firestoreService.deleteDocument("orders", orderId);
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Failed to delete order");
      throw error;
    }
  },

  async getOrderHistory(userId: string, startDate?: Date): Promise<Order[]> {
    try {
      const constraints = [
        firestoreService.where("customerId", "==", userId),
        firestoreService.orderBy("createdAt", "desc"),
      ];

      if (startDate) {
        constraints.push(
          firestoreService.where(
            "createdAt",
            ">=",
            Timestamp.fromDate(startDate)
          )
        );
      }

      return await firestoreService.getCollection<Order>("orders", constraints);
    } catch (error) {
      console.error("Error fetching order history:", error);
      toast.error("Failed to fetch order history");
      return [];
    }
  },

  subscribeToOrderUpdates(
    orderId: string,
    callback: (order: Order | null) => void
  ): () => void {
    return firestoreService.subscribeToDocument<Order>(
      "orders",
      orderId,
      callback
    );
  },

  subscribeToActiveOrders(callback: (orders: Order[]) => void): () => void {
    return firestoreService.subscribeToCollection<Order>(
      "orders",
      [
        firestoreService.where("status", "in", [
          "pending",
          "accepted",
          "assigned",
          "picked_up",
        ]),
      ],
      callback
    );
  },

  async getUserOrders(userId: string): Promise<Order[]> {
    try {
      return await firestoreService.getCollection<Order>("orders", [
        firestoreService.where("customerId", "==", userId),
        firestoreService.orderBy("createdAt", "desc"),
      ]);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      toast.error("Failed to fetch user orders");
      return [];
    }
  },

  async getRestaurantStats(restaurantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const ordersRef = collection(firestoreService.db, "orders");

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

  async getOrderHistoryWithPagination(
    userId: string,
    pageSize: number = 10,
    lastDoc?: DocumentSnapshot
  ): Promise<{ orders: Order[]; lastDoc: DocumentSnapshot | null }> {
    try {
      const constraints: QueryConstraint[] = [
        firestoreService.where("customerId", "==", userId),
        firestoreService.orderBy("createdAt", "desc"),
        firestoreService.limit(pageSize),
      ];

      if (lastDoc) {
        constraints.push(firestoreService.startAfter(lastDoc));
      }

      const orders = await firestoreService.getCollection<Order>(
        "orders",
        constraints
      );
      const lastOrder = orders[orders.length - 1];
      const lastDocSnapshot = lastOrder
        ? await getDoc(doc(firestoreService.db, "orders", lastOrder.id))
        : null;

      return {
        orders,
        lastDoc: lastDocSnapshot,
      };
    } catch (error) {
      console.error("Error getting order history:", error);
      toast.error("Failed to fetch order history");
      return { orders: [], lastDoc: null };
    }
  },

  async subscribeToRiderOrders(
    riderId: string,
    callback: (orders: Order[]) => void
  ) {
    const ordersRef = collection(firestoreService.db, "orders");

    // Query for orders assigned to this rider
    const q = query(
      ordersRef,
      where("riderId", "==", riderId),
      where("status", "in", ["accepted", "preparing", "ready", "picked_up"]),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, async (snapshot) => {
      const ordersPromises = snapshot.docs.map(async (docSnapshot) => {
        const orderData = docSnapshot.data();
        // Get restaurant details
        const restaurantRef = doc(
          firestoreService.db,
          "restaurants",
          orderData.restaurantId
        );
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
    const ordersRef = collection(firestoreService.db, "orders");
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

  async getOrder(orderId: string): Promise<Order | null> {
    return await firestoreService.getDocument("orders", orderId);
  },

  async updateOrderItems(orderId: string, items: OrderItem[]) {
    await firestoreService.updateDocument("orders", orderId, {
      items,
      updatedAt: new Date().toISOString(),
    });
  },
};
