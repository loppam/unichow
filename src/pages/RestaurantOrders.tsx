import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { ClipboardList, Clock, CheckCircle, ShoppingBag } from "lucide-react";
import RestaurantNavigation from "../components/RestaurantNavigation";

interface Order {
  id: string;
  status: 'pending' | 'accepted' | 'ready' | 'cancelled';
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  customerName: string;
  customerAddress: string;
  createdAt: string;
}

export default function RestaurantOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'ready'>('pending');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        const ordersRef = collection(db, "orders");
        const q = query(
          ordersRef,
          where("restaurantId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];

        setOrders(ordersData);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const groupedOrders = {
    pending: orders.filter(order => order.status === 'pending'),
    accepted: orders.filter(order => order.status === 'accepted'),
    ready: orders.filter(order => order.status === 'ready')
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    } catch (err) {
      console.error("Error updating order status:", err);
      // Optionally add error handling UI
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold">Orders</h1>
      </div>

      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-3 divide-x border-b">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center justify-center gap-1 px-1 transition-all ${
                activeTab === 'pending' 
                  ? 'text-blue-600 border-b-2 border-blue-600 -mb-[2px] py-3 text-[11px]' 
                  : 'text-gray-500 py-3 text-[10px]'
              }`}
            >
              <Clock className={`shrink-0 ${
                activeTab === 'pending' ? 'w-4 h-4' : 'w-3.5 h-3.5'
              }`} />
              <span className="truncate">
                Pending ({groupedOrders.pending.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('accepted')}
              className={`flex items-center justify-center gap-1 px-1 transition-all ${
                activeTab === 'accepted' 
                  ? 'text-blue-600 border-b-2 border-blue-600 -mb-[2px] py-3 text-[11px]' 
                  : 'text-gray-500 py-3 text-[10px]'
              }`}
            >
              <ShoppingBag className={`shrink-0 ${
                activeTab === 'accepted' ? 'w-4 h-4' : 'w-3.5 h-3.5'
              }`} />
              <span className="truncate">
                Accepted ({groupedOrders.accepted.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('ready')}
              className={`flex items-center justify-center gap-1 px-1 transition-all ${
                activeTab === 'ready' 
                  ? 'text-blue-600 border-b-2 border-blue-600 -mb-[2px] py-3 text-[11px]' 
                  : 'text-gray-500 py-3 text-[10px]'
              }`}
            >
              <CheckCircle className={`shrink-0 ${
                activeTab === 'ready' ? 'w-4 h-4' : 'w-3.5 h-3.5'
              }`} />
              <span className="truncate">
                Ready ({groupedOrders.ready.length})
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {loading ? (
          <div className="text-center py-8">Loading orders...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">{error}</div>
        ) : groupedOrders[activeTab].length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No {activeTab} orders</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedOrders[activeTab].map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold">Order #{order.id.slice(-6)}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    {activeTab === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'accepted')}
                        className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm"
                      >
                        Accept
                      </button>
                    )}
                    {activeTab === 'accepted' && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'ready')}
                        className="px-3 py-1 bg-green-500 text-white rounded-full text-sm"
                      >
                        Mark Ready
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Order Items</h4>
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm mb-1">
                      <span>{item.quantity}x {item.name}</span>
                      <span>${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <RestaurantNavigation />
    </div>
  );
} 