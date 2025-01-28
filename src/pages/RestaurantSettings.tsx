import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import RestaurantNavigation from "../components/RestaurantNavigation";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import PaymentSetup from "../components/restaurant/PaymentSetup";
import ProfileDetails from "../components/restaurant/settings/ProfileDetails";
import BusinessHours from "../components/restaurant/settings/BusinessHours";
import DeliverySettings from "../components/restaurant/settings/DeliverySettings";
import { ChevronDown } from "lucide-react";
import SubaccountBalance from "../components/common/SubaccountBalance";
import { RestaurantData } from "../types/restaurant";

export default function RestaurantSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(
    null
  );
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;

      try {
        const docRef = doc(db, "restaurants", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setRestaurantData(docSnap.data() as RestaurantData);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
        setError("Failed to load restaurant settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      setError("Failed to sign out");
    }
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  if (loading || error || !restaurantData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <RestaurantNavigation />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          {loading && <div className="text-gray-500">Loading settings...</div>}
          {error && <div className="text-red-500">{error}</div>}
          {!restaurantData && (
            <div className="text-gray-500">No restaurant data found</div>
          )}
        </div>
      </div>
    );
  }

  const sections = [
    {
      id: "profile",
      title: "Profile Details",
      component: <ProfileDetails data={restaurantData} />,
    },
    {
      id: "hours",
      title: "Business Hours",
      component: <BusinessHours data={restaurantData} />,
    },
    {
      id: "payment",
      title: "Payment Settings",
      component: <PaymentSetup data={restaurantData} />,
    },
    {
      id: "delivery",
      title: "Delivery Settings",
      component: <DeliverySettings data={restaurantData} />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <RestaurantNavigation />

      <div className="max-w-4xl mx-auto py-6 space-y-4 px-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
        {restaurantData.paymentInfo?.paystackSubaccountCode && (
          <div className="mb-6">
            <SubaccountBalance
              subaccountCode={restaurantData.paymentInfo.paystackSubaccountCode}
              autoRefreshInterval={300000}
            />
          </div>
        )}
        {sections.map((section) => (
          <div key={section.id} className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full p-6 flex justify-between items-center border-b hover:bg-gray-50"
            >
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <ChevronDown
                className={`transform transition-transform ${
                  activeSection === section.id ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`transition-all duration-200 ease-in-out overflow-hidden ${
                activeSection === section.id ? "max-h-[1000px]" : "max-h-0"
              }`}
            >
              {section.component}
            </div>
          </div>
        ))}

        {/* Sign Out Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
