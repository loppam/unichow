import { firestoreService } from "./firestoreService";
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
    callback: OrderCallback,
    onError?: (error: Error) => void
  ) {
    return firestoreService.subscribeToDocument(
      "orders",
      orderId,
      (doc) => {
        if (doc) {
          callback(doc as Order);
        }
      },
      onError
    );
  },

  subscribeToRestaurantOrders(
    restaurantId: string,
    statuses: OrderStatus[] = ["pending", "accepted", "preparing"],
    callback: OrdersCallback,
    limitCount: number = 50
  ): UnsubscribeFunction {
    const q = firestoreService.query(
      firestoreService.collection("orders"),
      firestoreService.where("restaurantId", "==", restaurantId),
      firestoreService.where("status", "in", statuses),
      firestoreService.orderBy("createdAt", "desc"),
      firestoreService.limit(limitCount)
    );

    return firestoreService.subscribeToQuery(q, (snapshot) => {
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
    const q = firestoreService.query(
      firestoreService.collection("orders"),
      firestoreService.where("customerId", "==", customerId),
      firestoreService.orderBy("createdAt", "desc"),
      firestoreService.limit(limitCount)
    );

    return firestoreService.subscribeToQuery(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) =>
        mapOrderData(doc.id, doc.data() as OrderData)
      );
      callback(orders);
    });
  },

  subscribeToOrders(restaurantId: string, callback: (orders: Order[]) => void) {
    const q = firestoreService.query(
      firestoreService.collection("orders"),
      firestoreService.where("restaurantId", "==", restaurantId),
      firestoreService.orderBy("createdAt", "desc")
    );
    return firestoreService.subscribeToQuery(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      callback(orders);
    });
  },

  subscribeToUserOrders(userId: string, callback: (orders: Order[]) => void) {
    const ordersRef = firestoreService.collection("orders");
    const q = firestoreService.query(
      ordersRef,
      firestoreService.where("customerId", "==", userId),
      firestoreService.orderBy("createdAt", "desc")
    );

    return firestoreService.subscribeToQuery(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      callback(orders);
    });
  },

  subscribeToMenu(restaurantId: string, callback: (items: MenuItem[]) => void) {
    return firestoreService.subscribeToCollection(
      `restaurants/${restaurantId}/menu`,
      [firestoreService.orderBy("updatedAt", "desc")],
      (docs) => {
        const items = docs.map((doc) => ({
          id: doc.id,
          ...doc,
        })) as MenuItem[];
        callback(items);
      }
    );
  },

  subscribeToRestaurants(callback: (restaurants: Restaurant[]) => void) {
    return firestoreService.subscribeToCollection(
      "restaurants",
      [firestoreService.where("status", "!=", "deleted")],
      (docs) => {
        const restaurants = docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Restaurant[];
        callback(restaurants);
      }
    );
  },
};
