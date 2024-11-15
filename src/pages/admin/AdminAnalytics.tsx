import { useState, useEffect } from 'react';
import { adminAnalyticsService } from '../../services/adminAnalyticsService';
import { Bar } from 'react-chartjs-2';
import { toast } from 'react-hot-toast';
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale
} from 'chart.js';
import { useAdmin } from '../../contexts/AdminContext';

ChartJS.register(
  ArcElement,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale
);

interface DailyStat {
  date: string;
  totalRevenue?: number;
  totalOrders?: number;
  activeUsers?: number;
  newUsers?: number;
}

interface RestaurantData {
  id: string;
  restaurantName: string;
  totalRevenue: number;
}

const generateColors = (count: number) => {
  const colors = [
    'rgba(255, 99, 132, 0.5)',
    'rgba(54, 162, 235, 0.5)',
    'rgba(255, 206, 86, 0.5)',
    'rgba(75, 192, 192, 0.5)',
    'rgba(153, 102, 255, 0.5)',
    'rgba(255, 159, 64, 0.5)',
    'rgba(199, 199, 199, 0.5)',
    'rgba(83, 102, 255, 0.5)',
    'rgba(40, 159, 64, 0.5)',
    'rgba(210, 199, 199, 0.5)',
  ];

  const borderColors = colors.map(color => color.replace('0.5)', '1)'));
  
  // Repeat the colors if we need more
  const repeatedColors = Array(Math.ceil(count / colors.length))
    .fill(colors)
    .flat()
    .slice(0, count);
  
  const repeatedBorders = Array(Math.ceil(count / borderColors.length))
    .fill(borderColors)
    .flat()
    .slice(0, count);

  return { backgroundColor: repeatedColors, borderColor: repeatedBorders };
};

export default function AdminAnalytics() {
  const { isSuperAdmin, loading: adminLoading } = useAdmin();
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [topRestaurants, setTopRestaurants] = useState<RestaurantData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && isSuperAdmin) {
      loadAnalytics();
    }
  }, [adminLoading, isSuperAdmin]);

  const loadAnalytics = async () => {
    try {
      const [stats, restaurantsData] = await Promise.all([
        adminAnalyticsService.getDailyStats(7),
        adminAnalyticsService.getTopRestaurants() as Promise<RestaurantData[]>
      ]);
      
      setDailyStats(stats);
      setTopRestaurants(restaurantsData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load analytics');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (!isSuperAdmin) {
    return (
      <div className="p-6 text-center text-red-500">
        Access denied. Super admin privileges required.
      </div>
    );
  }

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
      <p className="text-lg">No data available</p>
      <p className="text-sm">Check back later for analytics data</p>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Daily Revenue</h2>
          {dailyStats.length === 0 ? <EmptyState /> : (
            <div className="h-[300px]">
              <Bar
                data={{
                  labels: dailyStats.map(stat => stat.date),
                  datasets: [{
                    label: 'Revenue',
                    data: dailyStats.map(stat => stat.totalRevenue || 0),
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgb(75, 192, 192)',
                    borderWidth: 1
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Daily Orders</h2>
          {dailyStats.length === 0 ? <EmptyState /> : (
            <div className="h-[300px]">
              <Bar
                data={{
                  labels: dailyStats.map(stat => stat.date),
                  datasets: [{
                    label: 'Orders',
                    data: dailyStats.map(stat => stat.totalOrders || 0),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgb(54, 162, 235)',
                    borderWidth: 1
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  }
                }}
              />
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">User Activity</h2>
          {dailyStats.length === 0 ? <EmptyState /> : (
            <div className="h-[300px]">
              <Bar
                data={{
                  labels: dailyStats.map(stat => stat.date),
                  datasets: [
                    {
                      label: 'Active Users',
                      data: dailyStats.map(stat => stat.activeUsers || 0),
                      backgroundColor: 'rgba(255, 159, 64, 0.5)',
                      borderColor: 'rgb(255, 159, 64)',
                      borderWidth: 1
                    },
                    {
                      label: 'New Users',
                      data: dailyStats.map(stat => stat.newUsers || 0),
                      backgroundColor: 'rgba(153, 102, 255, 0.5)',
                      borderColor: 'rgb(153, 102, 255)',
                      borderWidth: 1
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  }
                }}
              />
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Top Restaurants</h2>
          {topRestaurants.length === 0 ? <EmptyState /> : (
            <div className="h-[300px]">
              <Bar
                data={{
                  labels: topRestaurants.map(r => r.restaurantName),
                  datasets: [{
                    label: 'Revenue',
                    data: topRestaurants.map(r => r.totalRevenue || 0),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgb(255, 99, 132)',
                    borderWidth: 1
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 