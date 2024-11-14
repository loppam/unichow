import { db } from '../firebase/config';
import { collection, doc, query, where, orderBy, limit, updateDoc, getDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { Order, OrderStatus } from '../types/order';
import { notificationService } from './notificationService';

export const orderService = {
  async getOrders(restaurantId: string, status?: OrderStatus[], page = 1, pageSize = 10) {
    try {
      const skip = (page - 1) * pageSize;
      let q = query(
        collection(db, 'orders'),
        where('restaurantId', '==', restaurantId),
        orderBy('createdAt', 'desc'),
        skip > 0 ? limit(skip + pageSize) : limit(pageSize)
      );

      if (status && status.length > 0) {
        q = query(q, where('status', 'in', status));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  async getOrderById(orderId: string): Promise<Order> {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }
      return { id: orderDoc.id, ...orderDoc.data() } as Order;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },

  async updateOrderStatus(
    restaurantId: string,
    orderId: string,
    status: OrderStatus,
    estimatedTime?: number
  ) {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const order = await this.getOrderById(orderId);
      
      const updates: any = {
        status,
        updatedAt: new Date().toISOString(),
      };

      // Add timestamp based on status
      switch (status) {
        case 'accepted':
          updates.acceptedAt = new Date().toISOString();
          if (estimatedTime) {
            updates.estimatedDeliveryTime = new Date(
              Date.now() + estimatedTime * 60000
            ).toISOString();
          }
          break;
        case 'preparing':
          updates.preparedAt = new Date().toISOString();
          break;
        case 'delivered':
          updates.deliveredAt = new Date().toISOString();
          break;
        case 'cancelled':
          updates.cancelledAt = new Date().toISOString();
          break;
      }

      await updateDoc(orderRef, updates);

      // Create notification
      await notificationService.createOrderNotification(restaurantId, {
          orderId,
          message: `Order #${orderId.slice(-6)} has been ${status}`,
          status: ['ready', 'delivered'].includes(status) ? 'completed' :
              ['accepted', 'preparing'].includes(status) ? 'pending' : 'cancelled',
          amount: order.total,
          customerName: order.customerName,
          timestamp: '',
          read: false
      });

      return updates;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  subscribeToNewOrders(restaurantId: string, callback: (orders: Order[]) => void) {
    const q = query(
      collection(db, 'orders'),
      where('restaurantId', '==', restaurantId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      callback(orders);
    });
  }
};