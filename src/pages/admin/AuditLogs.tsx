import { useState, useEffect } from 'react';
import { auditService } from '../../services/auditService';
import { AuditLog, AuditAction, AuditResource } from '../../types/audit';
import AdminLayout from '../../components/AdminLayout';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { usePermissions } from '../../hooks/usePermissions';

export default function AuditLogs() {
  const { hasPermission } = usePermissions();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({
    userId: '',
    resource: '' as AuditResource | '',
    action: '' as AuditAction | '',
    startDate: null as Date | null,
    endDate: null as Date | null
  });

  useEffect(() => {
    if (hasPermission('VIEW_AUDIT_LOGS')) {
      loadLogs();
    }
  }, [filters, hasPermission]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { logs: newLogs, hasMore: more } = await auditService.getAuditLogs({
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.resource && { resource: filters.resource as AuditResource }),
        ...(filters.action && { action: filters.action as AuditAction }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });
      
      setLogs(newLogs);
      setHasMore(more);
    } catch (err) {
      setError('Failed to load audit logs. Please try again later.');
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const csvContent = [
        ['Timestamp', 'User', 'Action', 'Resource', 'Resource ID', 'Status', 'Details'],
        ...logs.map(log => [
          format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
          log.userEmail,
          log.action,
          log.resource,
          log.resourceId,
          log.status,
          JSON.stringify(log.details)
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export logs. Please try again later.');
      console.error('Error exporting logs:', err);
    }
  };

  if (!hasPermission('VIEW_AUDIT_LOGS')) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-red-50 text-red-500 p-4 rounded-lg">
            You don't have permission to view audit logs.
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Audit Logs</h1>
          <button
            onClick={exportLogs}
            disabled={loading || logs.length === 0}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Email
              </label>
              <input
                type="text"
                value={filters.userId}
                onChange={e => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                placeholder="Search by email..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource
              </label>
              <select
                value={filters.resource}
                onChange={e => setFilters(prev => ({ ...prev, resource: e.target.value as AuditResource }))}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">All Resources</option>
                <option value="user">User</option>
                <option value="restaurant">Restaurant</option>
                <option value="order">Order</option>
                <option value="menu">Menu</option>
                <option value="review">Review</option>
                <option value="settings">Settings</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action
              </label>
              <select
                value={filters.action}
                onChange={e => setFilters(prev => ({ ...prev, action: e.target.value as AuditAction }))}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="view">View</option>
                <option value="status_change">Status Change</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <DatePicker
                selected={filters.startDate}
                onChange={date => setFilters(prev => ({ ...prev, startDate: date }))}
                className="w-full p-2 border rounded-lg"
                maxDate={filters.endDate || new Date()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <DatePicker
                selected={filters.endDate}
                onChange={date => setFilters(prev => ({ ...prev, endDate: date }))}
                className="w-full p-2 border rounded-lg"
                minDate={filters.startDate || new Date()}
              />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No audit logs found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(log.timestamp), 'PPp')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.userEmail}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.action}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.resource}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {hasMore && (
            <div className="p-4 text-center">
              <button
                onClick={loadLogs}
                disabled={loading}
                className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
} 