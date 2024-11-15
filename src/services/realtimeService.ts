import { collection, doc, query, limit, onSnapshot, orderBy, where, DocumentSnapshot, QuerySnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Order, OrderStatus } from '../types/order';

type OrderCallback = (order: Order) => void;
type OrdersCallback = (orders: Order[]) => void;
type UnsubscribeFunction = () => void;

const mapOrderData = (id: string, data: any): Order => ({
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
  acceptedAt: data.acceptedAt,
  preparedAt: data.preparedAt,
  deliveredAt: data.deliveredAt,
  cancelledAt: data.cancelledAt,
  estimatedDeliveryTime: data.estimatedDeliveryTime,
});

export const realtimeService = {
  subscribeToOrder(
    orderId: string, 
    callback: OrderCallback
  ): UnsubscribeFunction {
    return onSnapshot(
      doc(db, 'orders', orderId),
      (snapshot: DocumentSnapshot) => {
        if (snapshot.exists()) {
          const orderData = snapshot.data();
          callback(mapOrderData(snapshot.id, orderData));
        }
      },
      (error) => {
        console.error('Error subscribing to order:', error);
      }
    );
  },

  subscribeToRestaurantOrders(
    restaurantId: string,
    statuses: OrderStatus[] = ['pending', 'accepted', 'preparing'],
    callback: OrdersCallback,
    limitCount: number = 50
  ): UnsubscribeFunction {
    const q = query(
      collection(db, 'orders'),
      where('restaurantId', '==', restaurantId),
      where('status', 'in', statuses),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const orders = snapshot.docs.map(doc => 
        mapOrderData(doc.id, doc.data())
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
      collection(db, 'orders'),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const orders = snapshot.docs.map(doc => 
        mapOrderData(doc.id, doc.data())
      );
      callback(orders);
    });
  }
};  