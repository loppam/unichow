import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, Timestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { format } from 'date-fns';

interface Order {
  id: string;
  restaurantId: string;
  restaurantName: string;
  customerName: string;
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  createdAt: Timestamp | string;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        // Fetch all unique restaurant documents in parallel
        const restaurantPromises = new Map();
        snapshot.docs.forEach(docSnapshot => {
          const data = docSnapshot.data();
          if (data.restaurantId && !restaurantPromises.has(data.restaurantId)) {
            restaurantPromises.set(
              data.restaurantId,
              getDoc(doc(db, 'restaurants', data.restaurantId))
            );
          }
        });

        const restaurants = await Promise.all(restaurantPromises.values());
        const restaurantData = new Map(
          restaurants.map(doc => [doc.id, doc.data()?.restaurantName])
        );

        const ordersData = snapshot.docs.map(docSnapshot => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            ...data,
            restaurantName: restaurantData.get(data.restaurantId) || 'Unknown Restaurant',
            createdAt: data.createdAt
          };
        }) as Order[];
        
        setOrders(ordersData);
      } catch (err) {
        setError('Failed to fetch orders');
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const formatDate = (date: Timestamp | string | Date) => {
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'PPp');
    } else if (typeof date === 'string') {
      return format(new Date(date), 'PPp');
    }
    return format(date, 'PPp');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Order Management</h1>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Restaurant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {order.restaurantName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {order.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    ₦{order.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 