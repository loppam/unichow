import {
  collection,
  doc,
  query,
  limit,
  onSnapshot,
  orderBy,
  where,
  DocumentSnapshot,
  QuerySnapshot,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { Order, OrderStatus, UserOrder } from "../types/order";
import { MenuItem } from "../types/menu";
import { Restaurant } from "../types/restaurant";

type OrderCallback = (order: Order) => void;
type OrdersCallback = (orders: Order[]) => void;
type UnsubscribeFunction = () => void;

type OrderData = Omit<Order, "id">;

const mapOrderData = (id: string, data: OrderData): Order => ({
  id,
  customerId: data.customerId,
  restaurantId: data.restaurantId,
  items: data.items,
  status: data.status,
  total: data.total,
  deliveryAddress: data.deliveryAddress,
  paymentMethod: data.paymentMethod,
  paymentStatus: data.paymentStatus,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
  customerName: data.customerName,
  customerPhone: data.customerPhone,
  acceptedAt: data.acceptedAt,
  preparedAt: data.preparedAt,
  deliveredAt: data.deliveredAt,
  cancelledAt: data.cancelledAt,
  estimatedDeliveryTime: data.estimatedDeliveryTime,
  customerAddress: data.customerAddress,
  subtotal: data.subtotal,
  deliveryFee: data.deliveryFee,
  serviceFee: data.serviceFee,
  restaurantName: data.restaurantName || "",
  deliveryConfirmationCode: data.deliveryConfirmationCode || "",
});

export const realtimeService = {
  subscribeToOrder(
    orderId: string,
    callback: OrderCallback
  ): UnsubscribeFunction {
    return onSnapshot(
      doc(db, "orders", orderId),
      (snapshot: DocumentSnapshot) => {
        if (snapshot.exists()) {
          const orderData = snapshot.data() as OrderData;
          callback(mapOrderData(snapshot.id, orderData));
        }
      },
      (error) => {
        console.error("Error subscribing to order:", error);
      }
    );
  },

  subscribeToRestaurantOrders(
    restaurantId: string,
    statuses: OrderStatus[] = ["pending", "accepted", "preparing"],
    callback: OrdersCallback,
    limitCount: number = 50
  ): UnsubscribeFunction {
    const q = query(
      collection(db, "orders"),
      where("restaurantId", "==", restaurantId),
      where("status", "in", statuses),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const orders = snapshot.docs.map((doc) =>
        mapOrderData(doc.id, doc.data() as OrderData)
      );
      callback(orders);
    });
  },

  subscribeToCustomerOrders(
    customerId: string,
    callback: OrdersCallback,
    limitCount: number = 10
  ): UnsubscribeFunction {
    const q = query(
      collection(db, "orders"),
      where("customerId", "==", customerId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const orders = snapshot.docs.map((doc) =>
        mapOrderData(doc.id, doc.data() as OrderData)
      );
      callback(orders);
    });
  },

  subscribeToOrders(restaurantId: string, callback: (orders: Order[]) => void) {
    const q = query(
      collection(db, "orders"),
      where("restaurantId", "==", restaurantId),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      callback(orders);
    });
  },

  subscribeToUserOrders(userId: string, callback: (orders: Order[]) => void) {
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
      })) as Order[];
      callback(orders);
    });
  },

  subscribeToMenu(restaurantId: string, callback: (items: MenuItem[]) => void) {
    const q = query(
      collection(db, "restaurants", restaurantId, "menu"),
      orderBy("updatedAt", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MenuItem[];
      callback(items);
    });
  },

  subscribeToRestaurants(callback: (restaurants: Restaurant[]) => void) {
    const q = query(
      collection(db, "restaurants"),
      where("status", "!=", "deleted")
    );
    return onSnapshot(q, (snapshot) => {
      const restaurants = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Restaurant[];
      callback(restaurants);
    });
  },
};
