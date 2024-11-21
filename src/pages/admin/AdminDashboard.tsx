import { useEffect, useState } from "react";
import { collection, query, where, getDocs, Timestamp, getDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Users, ShoppingBag, TrendingUp, DollarSign } from "lucide-react";
import { auth } from "../../firebase/config";
import { adminSettingsService } from "../../services/adminSettingsService";
import { toast } from "react-hot-toast";

interface AnalyticsData {
  totalRestaurants: number;
  totalOrders: number;
  recentOrders: number;
  totalRevenue: number;
  adminType: string;
  dailyOrders: Array<{
    date: string;
    count: number;
  }>;
  restaurantsByStatus: {
    approved: number;
    pending: number;
    rejected: number;
  };
}

interface Order {
  id: string;
  createdAt: Timestamp | string;
  total?: number;
  status: string;
}

interface DeliverySettings {
  freeDeliveryThreshold: number;
  baseDeliveryFee: number;
}

async function fetchAnalytics(): Promise<AnalyticsData> {
  try {
    const currentUser = auth.currentUser;
    const userDoc = await getDoc(doc(db, "users", currentUser?.uid || ""));
    const adminType = userDoc.data()?.role === "superadmin" ? "Super Admin" : "Admin";

    const restaurantsRef = collection(db, "users");
    const ordersRef = collection(db, "orders");
    
    // Get restaurants with userType = restaurant
    const restaurantsQuery = query(restaurantsRef, where("userType", "==", "restaurant"));
    const restaurantsSnapshot = await getDocs(restaurantsQuery);
    
    // Get completed orders only
    const ordersQuery = query(ordersRef, where("status", "==", "completed"));
    const ordersSnapshot = await getDocs(ordersQuery);
    const orders = ordersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Order[];
    
    // Calculate daily orders for the last 7 days
    const last7Days = [...Array(7)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0];
    }).reverse();

    const dailyOrders = last7Days.map((date) => ({
      date,
      count: orders.filter((order) => {
        const orderDate = order.createdAt instanceof Timestamp 
          ? order.createdAt.toDate().toISOString().split("T")[0]
          : new Date(order.createdAt).toISOString().split("T")[0];
        return orderDate === date;
      }).length,
    }));

    // Count restaurants by status
    const restaurantsByStatus = {
      approved: restaurantsSnapshot.docs.filter((doc) => doc.data().isApproved === true).length,
      pending: restaurantsSnapshot.docs.filter(doc => 
        doc.data().isApproved !== true && doc.data().status !== "rejected"
      ).length,
      rejected: restaurantsSnapshot.docs.filter(doc => doc.data().status === "rejected").length,
    };

    // Calculate recent orders (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const recentOrders = orders.filter((order) => {
      const orderDate = order.createdAt instanceof Timestamp 
        ? order.createdAt.toDate()
        : new Date(order.createdAt);
      return orderDate >= oneDayAgo;
    }).length;

    return {
      totalRestaurants: restaurantsSnapshot.size,
      totalOrders: ordersSnapshot.size,
      recentOrders,
      totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
      adminType,
      dailyOrders,
      restaurantsByStatus,
    };
  } catch (error) {
    console.error("Error fetching analytics:", error);
    throw new Error("Failed to fetch analytics data");
  }
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({
    freeDeliveryThreshold: 5000,
    baseDeliveryFee: 500
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      try {
        const data = await fetchAnalytics();
        if (isMounted) {
          setAnalytics(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load analytics data");
        }
        console.error(err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const checkAdminAndFetchSettings = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser?.uid || ''));
        const userData = userDoc.data();
        
        if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
          toast.error('Unauthorized: Admin access required');
          return;
        }

        const settings = await adminSettingsService.getDeliverySettings();
        if (settings) {
          setDeliverySettings(settings);
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to load delivery settings');
      }
    };

    if (auth.currentUser) {
      checkAdminAndFetchSettings();
    }
  }, []);

  const handleDeliverySettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDeliverySettings(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  const handleDeliverySettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await adminSettingsService.updateDeliverySettings(deliverySettings);
      toast.success('Delivery settings updated successfully');
    } catch (error) {
      console.error('Error updating delivery settings:', error);
      if (error instanceof Error) {
        if (error.message.includes('Admin privileges')) {
          toast.error('You need admin privileges to update these settings');
        } else {
          toast.error('Failed to update delivery settings');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-lg">
        {error || "Failed to load analytics"}
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Restaurants",
      value: analytics.totalRestaurants,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Total Orders",
      value: analytics.totalOrders,
      icon: ShoppingBag,
      color: "bg-green-500",
    },
    {
      title: "Recent Orders",
      value: analytics.recentOrders,
      icon: TrendingUp,
      color: "bg-yellow-500",
    },
    {
      title: "Total Revenue",
      value: `$${analytics.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Admin Type Badge */}
      <div className="flex justify-end">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          {analytics.adminType}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
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

      {/* Restaurant Status Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">
          Restaurant Status Summary
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {analytics.restaurantsByStatus.approved}
            </p>
            <p className="text-gray-500">Approved</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {analytics.restaurantsByStatus.pending}
            </p>
            <p className="text-gray-500">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {analytics.restaurantsByStatus.rejected}
            </p>
            <p className="text-gray-500">Rejected</p>
          </div>
        </div>
      </div>

      {/* Delivery Settings */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">
          Delivery Settings
        </h2>
        <form onSubmit={handleDeliverySettingsSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Free Delivery Threshold (₦)
              </label>
              <input
                type="number"
                name="freeDeliveryThreshold"
                value={deliverySettings.freeDeliveryThreshold}
                onChange={handleDeliverySettingsChange}
                min="0"
                step="500"
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Delivery Fee (₦)
              </label>
              <input
                type="number"
                name="baseDeliveryFee"
                value={deliverySettings.baseDeliveryFee}
                onChange={handleDeliverySettingsChange}
                min="0"
                step="100"
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
