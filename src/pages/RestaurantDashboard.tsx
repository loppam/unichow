import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import RestaurantNavigation from "../components/RestaurantNavigation";
import NotificationBell from "../components/NotificationBell";
import { orderService } from "../services/orderService";
import { TrendingUp, ShoppingBag, Clock, DollarSign } from "lucide-react";
import { Order, OrderStatus } from "../types/order";
import { MenuItem } from "../types/menu";
import { restaurantService } from '../services/restaurantService';
import { RestaurantProfile } from '../types/restaurant';
import { notificationService } from '../services/notificationService';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  todayRevenue: number;
  averagePreparationTime: number;
}

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    todayRevenue: 0,
    averagePreparationTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [popularItems, setPopularItems] = useState<MenuItem[]>([]);
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [restaurantProfile, completedOrders, pendingOrders] = await Promise.all([
          restaurantService.getRestaurantProfile(user.uid),
          orderService.getOrders(user.uid, ["ready"] as OrderStatus[], todayStart),
          orderService.getOrders(user.uid, ["pending"] as OrderStatus[])
        ]);

        const revenue = completedOrders.reduce(
          (sum, order) => sum + order.total,
          0
        );

        setStats({
          totalOrders: completedOrders.length,
          pendingOrders: pendingOrders.length,
          todayRevenue: revenue,
          averagePreparationTime: restaurantProfile?.averagePreparationTime || 25,
        });

        setRecentOrders(completedOrders.slice(0, 5));

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
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
      restaurantService.getRestaurantProfile(user.uid)
        .then(setProfile)
        .catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    const initializeNotifications = async () => {
      if (!user?.uid) return;
      
      const token = await notificationService.initialize();
      if (token) {
        await notificationService.registerRestaurantDevice(user.uid, token);
      }
    };

    initializeNotifications();
  }, [user]);

  const statsCards = [
    {
      title: "Completed Orders Today",
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: "bg-blue-500",
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders,
      icon: Clock,
      color: "bg-yellow-500",
    },
    {
      title: "Today's Revenue",
      value: `₦${stats.todayRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "bg-green-500",
    },
    {
      title: "Avg. Preparation Time",
      value: `${stats.averagePreparationTime} min`,
      icon: TrendingUp,
      color: "bg-purple-500",
    },
  ];

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

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        ) : (
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
                        {typeof order.createdAt === 'string' 
                          ? new Date(order.createdAt).toLocaleTimeString()
                          : (order.createdAt as any).toDate().toLocaleTimeString()}
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
        )}
      </div>

      <RestaurantNavigation />
    </div>
  );
}
