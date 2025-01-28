import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { RestaurantProfile } from "../types/restaurant";
import RestaurantCard from "../components/RestaurantCard";
import { Search, MapPin, ChevronDown, X, Trash } from "lucide-react";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../contexts/AuthContext";
import { customerService } from "../services/customerService";
import { Address } from "../types/order";
import { toast } from "react-hot-toast";
import { useAddress } from "../contexts/AddressContext";
import { useNavigate } from "react-router-dom";
import { Coffee, UtensilsCrossed, IceCream2 } from "lucide-react";
import { CUISINE_TYPES } from "../constants/cuisineTypes";
import { CuisineType } from "../constants/cuisineTypes";
import { LOCATIONS } from "../constants/locations";
import LoadingButton from "../components/LoadingButton";

const getIconForCuisine = (cuisine: CuisineType) => {
  switch (cuisine) {
    case "Pastries":
      return Coffee;
    case "Smoothies":
      return IceCream2;
    default:
      return UtensilsCrossed;
  }
};

const CATEGORIES = CUISINE_TYPES.map((cuisine) => ({
  name: cuisine,
  icon: getIconForCuisine(cuisine),
}));

export default function Home() {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const { currentAddress, setCurrentAddress } = useAddress();
  const [newAddress, setNewAddress] = useState({
    hostelName: "",
    location: "",
  });
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) return;
      try {
        const addresses = await customerService.getSavedAddresses(user.uid);
        setSavedAddresses(addresses);
        if (addresses.length > 0 && !currentAddress.address) {
          setCurrentAddress(addresses[0]);
        }
      } catch (error) {
        console.error("Error fetching addresses:", error);
      }
    };

    fetchAddresses();
  }, [user, currentAddress.address, setCurrentAddress]);

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
        const restaurantData = querySnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as RestaurantProfile)
        );

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

  const handleSaveNewAddress = async () => {
    if (!user) {
      toast.error("Please login to save address");
      return;
    }

    if (!newAddress.hostelName.trim()) {
      toast.error("Please enter a hostel/location name");
      return;
    }

    setIsSaving(true);

    try {
      const formattedAddress = {
        address: `${newAddress.hostelName}(${newAddress.location})`,
        additionalInstructions: "",
      };

      await customerService.saveAddress(user.uid, formattedAddress);
      const addresses = await customerService.getSavedAddresses(user.uid);
      setSavedAddresses(addresses);
      setCurrentAddress(formattedAddress);
      setShowAddressModal(false);
      setNewAddress({ hostelName: "", location: "" });
      toast.success("Address saved successfully");
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Failed to save address");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowAddressModal(true)}
              className="flex items-center space-x-2 flex-1 mr-2"
            >
              <MapPin className="w-5 h-5 text-black shrink-0" />
              <div className="overflow-hidden w-[8.5rem]">
                <span className="font-medium whitespace-nowrap block overflow-x-auto scrollbar-none">
                  {currentAddress.address || "Select address"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 shrink-0" />
            </button>
            <button className="bg-black text-white px-4 py-1 rounded-full text-sm">
              Filter
            </button>
          </div>
        </div>
      </header>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="bg-white rounded-t-xl fixed bottom-0 left-0 right-0 max-h-[90vh] overflow-auto">
            <div className="p-4 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Delivery Address</h3>
                <button onClick={() => setShowAddressModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Saved Addresses */}
              {savedAddresses.map((address, index) => (
                <div
                  key={index}
                  className="flex items-center border rounded-lg space-x-2 w-full"
                >
                  <button
                    onClick={() => {
                      setCurrentAddress(address);
                      setShowAddressModal(false);
                    }}
                    className="flex-1 p-4 text-left flex overflow-hidden items-start space-x-3"
                  >
                    <MapPin className="w-5 h-5 mt-1 shrink-0" />
                    <span className="font-medium overflow-x-auto scrollbar-none whitespace-nowrap">
                      {address.address}
                    </span>
                  </button>
                  <button
                    onClick={async () => {
                      if (!user) return;
                      try {
                        await customerService.deleteAddress(user.uid, address);
                        const updatedAddresses =
                          await customerService.getSavedAddresses(user.uid);
                        setSavedAddresses(updatedAddresses);
                        if (currentAddress.address === address.address) {
                          setCurrentAddress(
                            updatedAddresses[0] || {
                              address: "",
                              additionalInstructions: "",
                            }
                          );
                        }
                        toast.success("Address deleted successfully");
                      } catch (error) {
                        console.error("Error deleting address:", error);
                        toast.error("Failed to delete address");
                      }
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                </div>
              ))}

              {/* Add New Address Form */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Add New Address</h4>
                <input
                  type="text"
                  placeholder="Hostel/Location Name"
                  value={newAddress.hostelName}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, hostelName: e.target.value })
                  }
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <select
                  value={newAddress.location}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, location: e.target.value })
                  }
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="" disabled>
                    Select Landmark
                  </option>
                  {LOCATIONS.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
                <LoadingButton
                  isLoading={isSaving}
                  onClick={handleSaveNewAddress}
                >
                  Save Address
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto p-4 pb-20">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.name}
                onClick={() => navigate(`/explore?cuisine=${category.name}`)}
                className="bg-gray-50 p-4 rounded-lg text-center transition-all hover:bg-gray-100 hover:shadow-md active:scale-95"
              >
                <div className="w-12 h-12 mx-auto mb-2 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Icon className="w-6 h-6 text-black" />
                </div>
                <span className="text-sm font-medium text-gray-800">
                  {category.name}
                </span>
              </button>
            );
          })}
        </div>
        <section>
          <h2 className="text-xl font-bold mb-4">Explore</h2>
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
                  bannerImage={restaurant.bannerImage || ""}
                  rating={restaurant.rating || 0}
                  deliveryTime={`${restaurant.openingHours} - ${restaurant.closingHours}`}
                  minimumOrder={restaurant.minimumOrder || 0}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
