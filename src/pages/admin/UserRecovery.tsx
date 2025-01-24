import { useState } from 'react';

export default function UserRecovery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recoveredCount, setRecoveredCount] = useState(0);

  const recoverUsers = async () => {
    if (!window.confirm('Are you sure you want to recover user documents?')) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    setRecoveredCount(0);

    try {
      // Call your backend API endpoint
      const response = await fetch('/api/restore-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add any necessary authentication headers
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Successfully recovered ${data.recoveredCount} user documents`);
        setRecoveredCount(data.recoveredCount);
      } else {
        throw new Error(data.error || 'Failed to recover users');
      }
    } catch (error) {
      console.error('Error in recovery process:', error);
      setError('Failed to recover user documents. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Recovery</h1>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-500 p-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <p className="mb-4">
          This tool will recover user documents from Firebase Authentication.
          Only missing documents will be created.
        </p>
        
        <button
          onClick={recoverUsers}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Recovering...' : 'Recover User Documents'}
        </button>

        {recoveredCount > 0 && (
          <p className="mt-4 text-gray-600">
            Recovered documents: {recoveredCount}
          </p>
        )}
      </div>
    </div>
  );
}
