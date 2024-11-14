import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { analyticsService } from '../../services/analyticsService';

export default function DashboardMetrics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  const restaurantId = 'your_restaurant_id_here';
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
  };

  useEffect(() => {
    loadMetrics();
  }, [period, restaurantId]);

  const loadMetrics = async () => {
    const data = await analyticsService.getDashboardMetrics(restaurantId, period);
    setMetrics(data);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Revenue Overview</h3>
        <Line data={metrics?.revenueData} options={chartOptions} />
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Order Statistics</h3>
        <Bar data={metrics?.orderData} options={chartOptions} />
      </div>
    </div>
  );
} 