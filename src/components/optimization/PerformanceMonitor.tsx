import { useEffect, useState } from 'react';
import { loadBalancerService } from '../../services/loadBalancerService';

interface SystemMetrics {
  cpu: number;
  memory: number;
  network: number;
  instances: Instance[];
}

interface Instance {
  id: string;
  region: string;
  status: 'healthy' | 'unhealthy';
  load: number;
}

interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
}

const MetricCard = ({ title, value, description }: MetricCardProps) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <div className="text-2xl font-bold mb-2">{value}</div>
    {description && <div className="text-sm text-gray-500">{description}</div>}
  </div>
);

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const currentMetrics = await loadBalancerService.getCurrentMetrics();
      setMetrics(currentMetrics);
      
      // Auto-scale if needed
      await loadBalancerService.scaleResources(currentMetrics);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(); // Initial fetch
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Loading metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="CPU Usage"
          value={`${metrics?.cpu ?? 0}%`}
          description="Current CPU utilization"
        />
        <MetricCard
          title="Memory Usage"
          value={`${metrics?.memory ?? 0}%`}
          description="Current memory usage"
        />
        <MetricCard
          title="Network I/O"
          value={`${metrics?.network ?? 0} MB/s`}
          description="Current network throughput"
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Active Instances</h3>
        <div className="grid grid-cols-4 gap-4">
          {metrics?.instances.map((instance) => (
            <div
              key={instance.id}
              className={`p-4 rounded-lg ${
                instance.status === 'healthy' ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className="font-medium">{instance.id}</div>
              <div className="text-sm text-gray-500">{instance.region}</div>
              <div className="text-sm">{instance.load}% load</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 