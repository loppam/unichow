import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import BottomNav from '../components/BottomNav';
import RestaurantCard from '../components/RestaurantCard';

interface Restaurant {
  id: string;
  restaurantName: string;
  image: string;
  isApproved: boolean;
  rating: number;
  deliveryTime: string;
  minOrder: number;
}

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const restaurantsRef = collection(db, 'restaurants');
      const q = query(
        restaurantsRef,
        where('isApproved', '==', true),
        where('status', '==', 'approved'),
        orderBy('rating', 'desc'),
        limit(5)
      );
      
      const snapshot = await getDocs(q);
      const restaurantData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Restaurant[];

      setRestaurants(restaurantData);
    } catch (err) {
      setError('Failed to load restaurants');
      console.error('Error loading restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="search"
              placeholder="Search restaurants"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
            />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        <h2 className="text-xl font-bold mb-4">Popular Restaurants</h2>
        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {restaurants.map(restaurant => (
              <RestaurantCard 
                key={restaurant.id}
                id={restaurant.id}
                name={restaurant.restaurantName}
                image={restaurant.image}
                rating={restaurant.rating}
                deliveryTime={restaurant.deliveryTime}
                minOrder={`₦${restaurant.minOrder}`}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}