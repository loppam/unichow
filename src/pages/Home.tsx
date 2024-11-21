import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import BottomNav from "../components/BottomNav";
import RestaurantCard from "../components/RestaurantCard";
import { RestaurantProfile } from "../types/restaurant";

export default function Home() {
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        const restaurantsRef = collection(db, "restaurants");
        const q = query(
          restaurantsRef,
          where("isApproved", "==", true),
          where("status", "==", "approved")
        );

        const querySnapshot = await getDocs(q);
        const restaurantData = querySnapshot.docs.map((doc) => {
          const data = {
            id: doc.id,
            ...doc.data(),
          } as RestaurantProfile;
          return data;
        });

        setRestaurants(restaurantData);
      } catch (err) {
        console.error("Error fetching restaurants:", err);
        setError("Failed to load restaurants");
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
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
            {restaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                id={restaurant.id}
                name={restaurant.restaurantName}
                image={restaurant.logo || ""}
                rating={restaurant.rating}
                deliveryTime={`${restaurant.openingHours} - ${restaurant.closingHours}`}
                minimumOrder={restaurant.minimumOrder || 0}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
