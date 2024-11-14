import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { MetricCard } from './MetricCard';

interface Metrics {
  serverLoad: number;
  loadTrend: number;
  activeUsers: number;
  usersTrend: number;
  errorRate: number;
  errorTrend: number;
  responseTime: number;
  responseTrend: number;
}

export default function SystemHealth() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    try {
      const data = await adminService.getSystemHealth();
      const formattedData: Metrics = {
        serverLoad: data.serverLoad.cpu + data.serverLoad.memory + data.serverLoad.network,
        loadTrend: 0, // Assuming default or placeholder value
        activeUsers: data.activeUsers,
        usersTrend: 0, // Assuming default or placeholder value
        errorRate: data.systemErrors, // Assuming systemErrors is the correct field for errorRate
        errorTrend: 0, // Assuming default or placeholder value
        responseTime: 0, // Assuming default or placeholder value
        responseTrend: 0, // Assuming default or placeholder value
      };
      setMetrics(formattedData);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Server Load"
        value={`${metrics?.serverLoad ?? 0}%`}
        trend={metrics?.loadTrend}
        description="Current server utilization"
      />
      <MetricCard
        title="Active Users"
        value={metrics?.activeUsers ?? 0}
        trend={metrics?.usersTrend}
        description="Users in last 30 minutes"
      />
      <MetricCard
        title="Error Rate"
        value={`${metrics?.errorRate ?? 0}%`}
        trend={metrics?.errorTrend}
        description="Errors in last hour"
      />
      <MetricCard
        title="Response Time"
        value={`${metrics?.responseTime ?? 0}ms`}
        trend={metrics?.responseTrend}
        description="Average response time"
      />
    </div>
  );
} 