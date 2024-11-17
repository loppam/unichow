import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { MenuItem, MenuCategory } from '../types/menu';

interface RestaurantData {
  restaurantName: string;
  description: string;
  cuisineTypes: string[];
  openingHours: string;
  closingHours: string;
  address: string;
  phone: string;
}

export default function PublicRestaurantMenu() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);

  useEffect(() => {
    const fetchRestaurantAndMenu = async () => {
      if (!id) return;

      try {
        setLoading(true);
        // Fetch restaurant data
        const restaurantDoc = await getDoc(doc(db, 'users', id));
        if (!restaurantDoc.exists()) {
          setError('Restaurant not found');
          return;
        }
        setRestaurant(restaurantDoc.data() as RestaurantData);

        // Fetch menu categories
        const categoriesSnapshot = await getDocs(collection(db, `users/${id}/categories`));
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MenuCategory[];
        setCategories(categoriesData);

        // Fetch menu items
        const menuSnapshot = await getDocs(collection(db, `users/${id}/menu`));
        const menuData = menuSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MenuItem[];
        setMenuItems(menuData.filter(item => item.isAvailable));

      } catch (err) {
        console.error('Error fetching restaurant data:', err);
        setError('Failed to load restaurant menu');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantAndMenu();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error || 'Restaurant not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Restaurant Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-2xl font-bold mb-2">{restaurant.restaurantName}</h1>
          <p className="text-gray-600 mb-4">{restaurant.description}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {restaurant.cuisineTypes?.map((cuisine) => (
              <span key={cuisine} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                {cuisine}
              </span>
            ))}
          </div>
          <div className="text-sm text-gray-600">
            <p>📍 {restaurant.address}</p>
            <p>⏰ {restaurant.openingHours} - {restaurant.closingHours}</p>
            <p>📞 {restaurant.phone}</p>
          </div>
        </div>
      </div>

      {/* Menu Categories and Items */}
      <div className="max-w-4xl mx-auto p-6">
        {categories.map(category => (
          <div key={category.id} className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{category.name}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {menuItems
                .filter(item => item.category === category.id)
                .map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      </div>
                      <div className="text-lg font-medium">
                        ${item.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No menu items available
          </div>
        )}
      </div>
    </div>
  );
} 