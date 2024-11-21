import { db } from '../firebase/config';
import { collection, doc, query, where, orderBy, limit, updateDoc, getDoc, getDocs, onSnapshot, increment, setDoc } from 'firebase/firestore';
import { Order, OrderStatus, OrderItem, Address, PaymentMethod, PaymentStatus, UserOrder } from '../types/order';
import { notificationService } from './notificationService';

export const orderService = {
  async getOrders(
    restaurantId: string, 
    status?: OrderStatus[], 
    page = 1, 
    pageSize = 10
  ): Promise<Order[]> {
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
  ): Promise<Partial<Order>> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const order = await this.getOrderById(orderId);
      const timestamp = new Date().toISOString();
      
      const updates: Partial<Order> = {
        status,
        updatedAt: timestamp,
      };

      // Add timestamp based on status
      switch (status) {
        case 'accepted':
          updates.acceptedAt = timestamp;
          if (estimatedTime) {
            updates.estimatedDeliveryTime = new Date(
              Date.now() + estimatedTime * 60000
            ).toISOString();
          }
          break;
        case 'preparing':
          updates.preparedAt = timestamp;
          break;
        case 'ready':
          updates.readyAt = timestamp;
          break;
        case 'delivered':
          updates.deliveredAt = timestamp;
          break;
        case 'cancelled':
          updates.cancelledAt = timestamp;
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
        timestamp,
        read: false
      });

      return updates;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  subscribeToNewOrders(
    restaurantId: string, 
    callback: (orders: Order[]) => void
  ): () => void {
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
  },

  async createOrder(data: {
    customerId: string;
    restaurantId: string;
    items: OrderItem[];
    deliveryAddress: Address;
    paymentMethod: PaymentMethod;
    customerName: string;
    total: number;
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    createdAt: string;
    updatedAt: string;
  }): Promise<string> {
    const orderRef = doc(collection(db, 'orders'));
    const timestamp = new Date().toISOString();

    // Calculate order total
    const total = data.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    // Create order and update restaurant stats in parallel
    await Promise.all([
      // Create order document
      setDoc(orderRef, {
        customerId: data.customerId,
        restaurantId: data.restaurantId,
        customerName: data.customerName,
        items: data.items,
        status: 'pending' as OrderStatus,
        total,
        deliveryAddress: data.deliveryAddress,
        paymentMethod: data.paymentMethod,
        paymentStatus: 'pending',
        createdAt: timestamp,
        updatedAt: timestamp
      } as Order),

      // Update restaurant stats
      updateDoc(doc(db, 'restaurants', data.restaurantId), {
        totalOrders: increment(1),
        updatedAt: timestamp
      })
    ]);

    return orderRef.id;
  },

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    paymentReference?: string
  ): Promise<void> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const updates = {
        paymentStatus,
        ...(paymentReference && { paymentReference }),
        updatedAt: new Date().toISOString()
      };
      await updateDoc(orderRef, updates);
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },

  async getUserOrders(userId: string): Promise<UserOrder[]> {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('customerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserOrder[];
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  }
};