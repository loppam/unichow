import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Rider } from "../types/rider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import RiderLayout from "../components/RiderLayout";
import { 
  Bike, 
  Package, 
  Star, 
  Clock,
  MapPin
} from "lucide-react";
import { notificationService } from "../services/notificationService";

interface RiderStats {
  totalDeliveries: number;
  todayDeliveries: number;
  rating: number;
  activeOrders: number;
  averageDeliveryTime: number;
}

export default function RiderDashboard() {
  const { user } = useAuth();
  const [rider, setRider] = useState<Rider | null>(null);
  const [stats, setStats] = useState<RiderStats>({
    totalDeliveries: 0,
    todayDeliveries: 0,
    rating: 0,
    activeOrders: 0,
    averageDeliveryTime: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRiderData = async () => {
      if (!user) return;

      try {
        const riderDoc = await getDoc(doc(db, "riders", user.uid));
        if (riderDoc.exists()) {
          const riderData = { id: riderDoc.id, ...riderDoc.data() } as Rider;
          setRider(riderData);
          
          // Update stats based on rider data
          setStats({
            totalDeliveries: riderData.completedOrders || 0,
            todayDeliveries: 0, // Calculate from orders with today's date
            rating: riderData.rating || 0,
            activeOrders: riderData.assignedOrders?.length || 0,
            averageDeliveryTime: 25, // This should be calculated from historical data
          });
        }
      } catch (error) {
        console.error("Error loading rider data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRiderData();
  }, [user]);

  useEffect(() => {
    const initializeNotifications = async () => {
      if (!user?.uid) return;
      
      const token = await notificationService.initialize();
      if (token) {
        await notificationService.requestPermission(user.uid);
      }
    };

    initializeNotifications();
  }, [user]);

  const statsCards = [
    {
      title: "Total Deliveries",
      value: stats.totalDeliveries,
      icon: Package,
      color: "bg-blue-500",
    },
    {
      title: "Today's Deliveries",
      value: stats.todayDeliveries,
      icon: Bike,
      color: "bg-green-500",
    },
    {
      title: "Active Orders",
      value: stats.activeOrders,
      icon: Clock,
      color: "bg-yellow-500",
    },
    {
      title: "Rating",
      value: `${stats.rating.toFixed(1)} ⭐`,
      icon: Star,
      color: "bg-purple-500",
    },
  ];

  if (loading) {
    return (
      <RiderLayout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </RiderLayout>
    );
  }

  return (
    <RiderLayout>
      <div className="p-6">
        {/* Status Banner */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Welcome, {rider?.name}</h1>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${
                  rider?.status === 'available' ? 'bg-green-500' :
                  rider?.status === 'busy' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`} />
                <span className="text-gray-600 capitalize">{rider?.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsCards.map((stat) => (
            <div
              key={stat.title}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Current Location */}
        {rider?.currentLocation && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Current Location</h2>
            </div>
            <p className="text-gray-600">
              Lat: {rider.currentLocation.latitude.toFixed(6)}, 
              Long: {rider.currentLocation.longitude.toFixed(6)}
            </p>
          </div>
        )}
      </div>
    </RiderLayout>
  );
} 