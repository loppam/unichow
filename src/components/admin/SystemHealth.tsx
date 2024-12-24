import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { toast } from 'react-hot-toast';
import { MetricCard } from './MetricCard';

interface SystemMetrics {
  serverLoad: {
    cpu: number;
  };
  activeUsers: number;
  systemErrors: number;
  averageResponseTime: number;
}

export default function SystemHealth() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        const data = await adminService.getSystemHealth();
        if ('serverLoad' in data && 'activeUsers' in data && 'systemErrors' in data && 'averageResponseTime' in data) {
          setMetrics(data as SystemMetrics);
        } else {
          throw new Error('Invalid metrics data format');
        }
      } catch (error) {
        toast.error('Failed to load system metrics');
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading ) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Server Load"
        value={`${metrics?.serverLoad.cpu ?? 0}%`}
        trend={metrics?.serverLoad.cpu}
        description="Current server utilization"
      />
      <MetricCard
        title="Active Users"
        value={metrics?.activeUsers ?? 0}
        trend={metrics?.activeUsers}
        description="Users in last 30 minutes"
      />
      <MetricCard
        title="Error Rate"
        value={`${metrics?.systemErrors ?? 0}%`}
        trend={metrics?.systemErrors}
        description="Errors in last hour"
      />
      <MetricCard
        title="Response Time"
        value={`${metrics?.averageResponseTime ?? 0}ms`}
        trend={metrics?.averageResponseTime}
        description="Average response time"
      />
    </div>
  );
} 