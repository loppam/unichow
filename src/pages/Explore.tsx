import { useState, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import { collection, query, getDocs, where } from "firebase/firestore";
import { db } from "../firebase/config";
import BottomNav from "../components/BottomNav";
import RestaurantCard from "../components/RestaurantCard";
import { CUISINE_TYPES, CuisineType } from "../constants/cuisineTypes";
import { useSearchParams, useNavigate } from "react-router-dom";

interface Restaurant {
  id: string;
  restaurantName: string;
  cuisineTypes: CuisineType[]; // Changed from cuisine: string[]
  rating: number;
  deliveryTime: string;
  minOrder: number;
  image: string;
  isOpen: boolean;
  description: string;
}

export default function Explore() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedCuisine, setSelectedCuisine] = useState<string>(
    searchParams.get("cuisine") || ""
  );
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"rating" | "deliveryTime" | "minOrder">(
    "rating"
  );

  const cuisineTypes = ["All", ...CUISINE_TYPES];

  useEffect(() => {
    loadRestaurants();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cuisineFilter = params.get("cuisine");
    if (cuisineFilter) {
      setSelectedCuisine(cuisineFilter);
    }
  }, []);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const restaurantsRef = collection(db, "restaurants");
      const q = query(restaurantsRef, where("isApproved", "==", true));

      const snapshot = await getDocs(q);
      const restaurantData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Restaurant[];

      setRestaurants(restaurantData);
    } catch (err) {
      setError("Failed to load restaurants");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCuisineSelect = (cuisine: string) => {
    setSelectedCuisine(cuisine);
    setSearchParams(cuisine === "All" ? {} : { cuisine });
  };

  const filteredRestaurants = restaurants
    .filter((restaurant) => {
      const matchesSearch =
        restaurant.restaurantName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        restaurant.description
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesCuisine =
        !selectedCuisine ||
        selectedCuisine === "All" ||
        (restaurant.cuisineTypes &&
          restaurant.cuisineTypes.includes(selectedCuisine as CuisineType));

      return matchesSearch && matchesCuisine;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "deliveryTime":
          return parseInt(a.deliveryTime) - parseInt(b.deliveryTime);
        case "minOrder":
          return a.minOrder - b.minOrder;
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="search"
              placeholder="Search restaurants or cuisines"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <Filter className="text-gray-400" size={20} />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-white p-4 rounded-lg border space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Filters</h3>
                <button onClick={() => setShowFilters(false)}>
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuisine Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {cuisineTypes.map((cuisine) => (
                    <button
                      key={cuisine}
                      onClick={() => handleCuisineSelect(cuisine)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedCuisine === cuisine
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="rating">Rating</option>
                  <option value="deliveryTime">Delivery Time</option>
                  <option value="minOrder">Minimum Order</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                name={restaurant.restaurantName}
                bannerImage={restaurant.image}
                minimumOrder={restaurant.minOrder}
                {...restaurant}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
