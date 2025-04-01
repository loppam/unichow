import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import {
  useRealtimeData,
  useRealtimeCollection,
} from "../hooks/useRealtimeData";
import { Order } from "../types/order";
import { RestaurantData } from "../types/restaurant";
import RestaurantNavigation from "../components/RestaurantNavigation";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";
import { ORDER_STATUS } from "../constants/orderStatus";
import { ORDER_STATUS_COLORS } from "../constants/orderStatusColors";
import { ORDER_STATUS_LABELS } from "../constants/orderStatusLabels";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { where, query } from "firebase/firestore";
import NotificationBell from "../components/NotificationBell";
import { orderService } from "../services/orderService";
import { TrendingUp, ShoppingBag, Clock, DollarSign } from "lucide-react";
import { MenuItem } from "../types/menu";
import { restaurantService } from "../services/restaurantService";
import { RestaurantProfile } from "../types/restaurant";
import { notificationService } from "../services/notificationService";
import { Timestamp } from "firebase/firestore";
import { paymentService } from "../services/paymentService";
import { Balance } from "../types/balance";
import OnboardingModal from "../components/common/OnboardingModal";

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  todayRevenue: number;
  averagePreparationTime: number;
}

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    todayRevenue: 0,
    averagePreparationTime: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [popularItems, setPopularItems] = useState<MenuItem[]>([]);
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Get restaurant data in real-time
  const { data: restaurantData, loading: restaurantLoading } =
    useRealtimeData<RestaurantData>("restaurants", user?.uid || "");

  // Get orders in real-time
  const { data: orders, loading: ordersLoading } = useRealtimeCollection<Order>(
    "orders",
    [where("restaurantId", "==", user?.uid || "")]
  );

  // Combined effect for access check and initial data loading
  useEffect(() => {
    let isMounted = true;

    const initializeDashboard = async () => {
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        // Check user access
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        if (!userData) {
          throw new Error("User data not found");
        }

        if (userData.userType !== "restaurant") {
          navigate("/home");
          return;
        }

        if (!userData.emailVerified) {
          navigate("/restaurant-verify-email");
          return;
        }

        // Fetch all required data in parallel
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [restaurantProfile, completedOrders, pendingOrders, balance] =
          await Promise.all([
            restaurantService.getRestaurantProfile(user.uid),
            orderService.getOrders(
              user.uid,
              ["ready", "delivered"] as OrderStatus[],
              todayStart
            ),
            orderService.getOrders(user.uid, ["pending"] as OrderStatus[]),
            paymentService.getBalance(user.uid, "restaurant"),
          ]);

        if (!isMounted) return;

        // Update all states at once
        const revenue = completedOrders.reduce(
          (sum, order) => sum + order.total,
          0
        );

        setStats({
          totalOrders: completedOrders.length,
          pendingOrders: pendingOrders.length,
          todayRevenue: revenue,
          averagePreparationTime:
            restaurantProfile?.averagePreparationTime || 25,
        });

        setRecentOrders(completedOrders.slice(0, 5));
        setProfile(restaurantProfile);
        setBalance(balance);

        // Calculate popular items
        const itemCounts = completedOrders.reduce(
          (acc: Record<string, number>, order) => {
            order.items?.forEach((item) => {
              acc[item.name] = (acc[item.name] || 0) + item.quantity;
            });
            return acc;
          },
          {}
        );

        const sortedItems = Object.entries(itemCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(
            ([name, count]) =>
              ({
                id: "",
                name,
                description: "",
                price: 0,
                category: "",
                image: "",
                isAvailable: true,
                preparationTime: 0,
                allergens: [],
                orderCount: count,
                spicyLevel: 0,
                vegetarian: false,
                featured: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              } as MenuItem)
          );

        setPopularItems(sortedItems);

        // Initialize notifications
        const token = await notificationService.initialize();
        if (token) {
          await notificationService.requestPermission(user.uid);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error initializing dashboard:", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeDashboard();

    return () => {
      isMounted = false;
    };
  }, [user, navigate]);

  const statsCards = [
    {
      title: "Available Balance",
      value: balance ? `₦${balance.availableBalance.toLocaleString()}` : "₦0",
      icon: DollarSign,
      color: "bg-purple-500",
    },
    {
      title: "Today's Revenue",
      value: `₦${stats.todayRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: "bg-green-500",
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders,
      icon: Clock,
      color: "bg-yellow-500",
    },
    {
      title: "Completed Orders",
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: "bg-blue-500",
    },
  ];

  if (loading || restaurantLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold">Restaurant Dashboard</h1>
          <NotificationBell />
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statsCards.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{stat.title}</p>
                  <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full text-white`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="font-semibold mb-4">Recent Orders</h2>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded"
                >
                  <div>
                    <p className="font-medium">Order #{order.id.slice(-6)}</p>
                    <p className="text-sm text-gray-500">
                      {order.customerName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₦{order.total.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">
                      {typeof order.createdAt === "string"
                        ? new Date(order.createdAt).toLocaleTimeString()
                        : (order.createdAt as Timestamp)
                            .toDate()
                            .toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="font-semibold mb-4">Popular Items</h2>
            <div className="space-y-4">
              {popularItems.map((item, index) => (
                <div
                  key={item.name}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded"
                >
                  <div className="flex items-center">
                    <span className="w-6 text-gray-500">{index + 1}.</span>
                    <p className="font-medium">{item.name}</p>
                  </div>
                  <p className="text-sm text-gray-500">
                    {item.orderCount} orders
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <RestaurantNavigation />

      {showOnboarding && restaurantData && (
        <OnboardingModal
          userType="restaurant"
          userData={restaurantData}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
