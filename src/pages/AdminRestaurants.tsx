import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import AdminLayout from '../components/AdminLayout';

interface Restaurant {
  id: string;
  email: string;
  restaurantName: string;
  phone: string;
  address: string;
  isApproved: boolean;
  status: string;
  emailVerified: boolean;
  createdAt: string;
}

export default function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, approved, pending, rejected

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("userType", "==", "restaurant")
        );

        const querySnapshot = await getDocs(q);
        const restaurantList: Restaurant[] = [];
        querySnapshot.forEach((doc) => {
          restaurantList.push({ id: doc.id, ...doc.data() } as Restaurant);
        });
        setRestaurants(restaurantList);
      } catch (err) {
        console.error("Error fetching restaurants:", err);
        setError('Failed to load restaurants');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const filteredRestaurants = restaurants.filter(restaurant => {
    if (filter === 'all') return true;
    if (filter === 'approved') return restaurant.isApproved;
    if (filter === 'pending') return !restaurant.isApproved && restaurant.status !== 'rejected';
    if (filter === 'rejected') return restaurant.status === 'rejected';
    return true;
  });

  const handleStatusChange = async (restaurantId: string, approve: boolean) => {
    try {
      await updateDoc(doc(db, "users", restaurantId), {
        isApproved: approve,
        status: approve ? 'approved' : 'rejected',
        lastUpdated: new Date().toISOString()
      });
      
      // Update local state
      setRestaurants(prev => 
        prev.map(restaurant => 
          restaurant.id === restaurantId 
            ? { ...restaurant, isApproved: approve, status: approve ? 'approved' : 'rejected' }
            : restaurant
        )
      );
    } catch (error) {
      console.error("Error updating restaurant status:", error);
      setError('Failed to update restaurant status');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Manage Restaurants</h1>
          <div className="flex gap-2">
            {['all', 'approved', 'pending', 'rejected'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filter === filterOption
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRestaurants.map((restaurant) => (
              <div key={restaurant.id} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold">{restaurant.restaurantName}</h2>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    restaurant.isApproved 
                      ? 'bg-green-100 text-green-800'
                      : restaurant.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {restaurant.status || 'pending'}
                  </span>
                </div>
                <div className="space-y-2 text-gray-600 mb-4">
                  <p>📧 {restaurant.email}</p>
                  <p>📱 {restaurant.phone}</p>
                  <p>📍 {restaurant.address}</p>
                  <p className="text-sm">
                    Registered: {new Date(restaurant.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!restaurant.isApproved && (
                    <button
                      onClick={() => handleStatusChange(restaurant.id, true)}
                      className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  {restaurant.status === 'rejected' && (
                    <button
                      onClick={() => handleStatusChange(restaurant.id, true)}
                      className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Reactivate
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusChange(restaurant.id, false)}
                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
            {filteredRestaurants.length === 0 && !loading && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No restaurants found
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
} 