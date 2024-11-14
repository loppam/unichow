import { useEffect, useState } from "react";
import { adminService } from "../../services/adminService";
import { Bar } from "react-chartjs-2";

export default function APIMonitor() {
  const [usage, setUsage] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUsage = async () => {
    const data = await adminService.monitorAPIUsage();
    setUsage(data);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">API Usage Overview</h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Total Requests</div>
            <div className="text-2xl font-semibold">{usage?.totalRequests}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Error Rate</div>
            <div className="text-2xl font-semibold">{usage?.errorRate}%</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Avg Response Time</div>
            <div className="text-2xl font-semibold">
              {usage?.averageResponseTime}ms
            </div>
          </div>
        </div>
        <div className="h-64">
          <Bar data={usage?.endpointUsage} />
        </div>
      </div>
    </div>
  );
}
