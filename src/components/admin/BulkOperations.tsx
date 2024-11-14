import { useState } from 'react';
import { adminService } from '../../services/adminService';
import { Upload, AlertCircle } from 'lucide-react';

export default function BulkOperations() {
    const [uploading, setUploading] = useState(false);
    const [operations, setOperations] = useState<Array<{
        type: string;
        id: string;
        status: 'completed' | 'failed' | 'pending';
    }>>([]);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = async (file: File) => {
        setUploading(true);
        setError(null);
        try {
            const content = await file.text();
            const parsedOperations = JSON.parse(content);
            setOperations(parsedOperations);
            await adminService.bulkUpdateRestaurants(parsedOperations);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setUploading(false);
        }
    }

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Bulk Operations</h2>
        <div className="flex gap-4">
          <input
            type="file"
            accept=".json"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
            id="bulk-upload"
          />
          <label
            htmlFor="bulk-upload"
            className="cursor-pointer flex items-center gap-2 bg-black text-white px-4 py-2 rounded"
          >
            <Upload className="h-4 w-4" />
            Upload Operations
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {operations.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {operations.map((op, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {op.type} - {op.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      op.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      op.status === 'failed' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {op.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 