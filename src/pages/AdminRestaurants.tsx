import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import AdminLayout from '../components/AdminLayout';
import { toast } from 'react-hot-toast';

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
  cuisine?: string;
  logo?: string;
}

export default function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "restaurants"),
        where("status", "!=", "deleted")
      );

      const querySnapshot = await getDocs(q);
      const restaurantList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Restaurant[];

      setRestaurants(restaurantList);
    } catch (err) {
      console.error("Error fetching restaurants:", err);
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (restaurantId: string, approve: boolean) => {
    try {
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();
      const newStatus = approve ? 'active' : 'rejected';

      batch.update(doc(db, "restaurants", restaurantId), {
        isApproved: approve,
        status: newStatus,
        updatedAt: timestamp
      });

      batch.update(doc(db, "users", restaurantId), {
        isApproved: approve,
        status: newStatus,
        updatedAt: timestamp
      });

      await batch.commit();
      
      setRestaurants(prev => 
        prev.map(restaurant => 
          restaurant.id === restaurantId 
            ? { ...restaurant, isApproved: approve, status: newStatus }
            : restaurant
        )
      );

      toast.success(`Restaurant ${approve ? 'approved' : 'rejected'} successfully`);
    } catch (error) {
      console.error("Error updating restaurant status:", error);
      toast.error('Failed to update restaurant status');
    }
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    switch (filter) {
      case 'approved':
        return restaurant.isApproved;
      case 'pending':
        return !restaurant.isApproved && restaurant.status !== 'rejected';
      case 'rejected':
        return restaurant.status === 'rejected';
      default:
        return true;
    }
  });

  const FilterButton = ({ value }: { value: string }) => (
    <button
      onClick={() => setFilter(value)}
      className={`px-4 py-2 rounded-lg capitalize transition-colors ${
        filter === value
          ? 'bg-black text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {value}
    </button>
  );

  const RestaurantCard = ({ restaurant }: { restaurant: Restaurant }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          {restaurant.logo ? (
            <img 
              src={restaurant.logo} 
              alt={restaurant.restaurantName}
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/default-restaurant.png'; // Make sure this image exists in your public folder
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 text-xl">
                {restaurant.restaurantName.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold">{restaurant.restaurantName}</h2>
            {restaurant.cuisine && (
              <p className="text-sm text-gray-500">{restaurant.cuisine}</p>
            )}
          </div>
        </div>
        <StatusBadge status={restaurant.status} />
      </div>

      <div className="space-y-2 text-gray-600 mb-4">
        <p className="flex items-center gap-2">
          <span className="w-5">📧</span> {restaurant.email}
        </p>
        <p className="flex items-center gap-2">
          <span className="w-5">📱</span> {restaurant.phone}
        </p>
        <p className="flex items-center gap-2">
          <span className="w-5">📍</span> {restaurant.address}
        </p>
        <p className="text-sm text-gray-500">
          Registered: {new Date(restaurant.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex gap-2">
        {!restaurant.isApproved && (
          <ActionButton
            onClick={() => handleStatusChange(restaurant.id, true)}
            variant="success"
          >
            {restaurant.status === 'rejected' ? 'Reactivate' : 'Approve'}
          </ActionButton>
        )}
        {restaurant.status !== 'rejected' && (
          <ActionButton
            onClick={() => handleStatusChange(restaurant.id, false)}
            variant="danger"
          >
            Reject
          </ActionButton>
        )}
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Manage Restaurants</h1>
          <div className="flex gap-2">
            {['all', 'approved', 'pending', 'rejected'].map((filterOption) => (
              <FilterButton key={filterOption} value={filterOption} />
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
            {filteredRestaurants.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                No restaurants found
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    active: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  }[status] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`px-2 py-1 rounded-full text-sm ${styles}`}>
      {status}
    </span>
  );
};

const ActionButton = ({ 
  children, 
  onClick, 
  variant 
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  variant: 'success' | 'danger'; 
}) => (
  <button
    onClick={onClick}
    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
      variant === 'success' 
        ? 'bg-green-500 hover:bg-green-600 text-white' 
        : 'bg-red-500 hover:bg-red-600 text-white'
    }`}
  >
    {children}
  </button>
); 