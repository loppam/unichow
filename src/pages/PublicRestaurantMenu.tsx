import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { MenuItem, MenuCategory } from '../types/menu';
import { Plus } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

interface RestaurantData {
  restaurantName: string;
  description: string;
  cuisineTypes: string[];
  openingHours: string;
  closingHours: string;
  address: string;
  phone: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

export default function PublicRestaurantMenu() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const { packs, addToCart, createNewPack } = useCart();
  const navigate = useNavigate();
  
  // Get newPack from URL query params
  const isNewPack = searchParams.get('newPack') === 'true';
  
  // Get existing packs for this restaurant
  const restaurantPacks = packs.filter(pack => pack.restaurantId === id);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurantAndMenu = async () => {
      if (!id) return;

      try {
        setLoading(true);
        // Change from 'users' to 'restaurants' collection
        const restaurantDoc = await getDoc(doc(db, 'restaurants', id));
        if (!restaurantDoc.exists()) {
          setError('Restaurant not found');
          return;
        }
        setRestaurant(restaurantDoc.data() as RestaurantData);

        // Update these paths as well
        const categoriesSnapshot = await getDocs(collection(db, `restaurants/${id}/categories`));
        const menuSnapshot = await getDocs(collection(db, `restaurants/${id}/menu`));

        // Rest of your code remains the same
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MenuCategory[];
        setCategories(categoriesData);

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

  useEffect(() => {
    if (categories.length > 0) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories]);

  useEffect(() => {
    // If it's a new pack, create it and select it
    if (isNewPack && restaurant) {
      const newPackId = createNewPack(id!, restaurant.restaurantName);
      setSelectedPackId(newPackId);
    }
    // If there's only one pack, select it by default
    else if (restaurantPacks.length === 1) {
      setSelectedPackId(restaurantPacks[0].id);
    }
  }, [isNewPack, id, restaurant]);

  const handleAddToCart = (item: MenuItem) => {
    if (!restaurant) return;
    
    if (!selectedPackId) {
      // If no pack is selected, create a new one
      const newPackId = createNewPack(id!, restaurant.restaurantName);
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        restaurantId: id!,
        restaurantName: restaurant.restaurantName,
      }, newPackId);
      setSelectedPackId(newPackId);
    } else {
      // Add to selected pack
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        restaurantId: id!,
        restaurantName: restaurant.restaurantName,
      }, selectedPackId);
    }
  };

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

      {/* Pack Selection */}
      {restaurantPacks.length > 1 && (
        <div className="bg-white shadow-sm p-4 sticky top-0 z-20">
          <div className="max-w-4xl mx-auto">
            <label className="text-sm font-medium text-gray-700">Select Pack:</label>
            <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
              {restaurantPacks.map((pack, index) => (
                <button
                  key={pack.id}
                  onClick={() => setSelectedPackId(pack.id)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                    selectedPackId === pack.id
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Pack {index + 1} ({pack.items.length} items)
                </button>
              ))}
              <button
                onClick={() => navigate(`/restaurant/${id}?newPack=true`)}
                className="px-4 py-2 rounded-full text-sm whitespace-nowrap bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                + New Pack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Navigation */}
      <div className="sticky top-0 bg-white shadow-sm z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex overflow-x-auto no-scrollbar">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-3 whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {menuItems
            .filter(item => item.category === selectedCategory)
            .map(item => (
              <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    <p className="text-lg font-medium mt-2">₦{item.price.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-full hover:bg-gray-800"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Cart Button */}
      {packs.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => navigate('/cart')}
              className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800"
            >
              View Cart ({packs.reduce((acc, pack) => 
                acc + pack.items.reduce((itemAcc, item) => itemAcc + item.quantity, 0), 0
              )} items)
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 