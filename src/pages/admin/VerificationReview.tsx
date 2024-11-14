import { useState, useEffect } from 'react';
import { adminVerificationService } from '../../services/adminVerificationService';
import AdminLayout from '../../components/AdminLayout';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { VerificationDocument } from '../../types/verification';

export default function VerificationReview() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    try {
      const data = await adminVerificationService.getPendingVerifications();
      setVerifications(data);
    } catch (err) {
      setError('Failed to load verifications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (
    restaurantId: string,
    documentId: string,
    status: 'approved' | 'rejected'
  ) => {
    setReviewing(true);
    try {
      await adminVerificationService.reviewDocument(
        restaurantId,
        documentId,
        status,
        status === 'rejected' ? rejectionReason : undefined
      );
      
      // Refresh data
      await loadVerifications();
      setRejectionReason('');
    } catch (err) {
      setError('Failed to review document');
      console.error(err);
    } finally {
      setReviewing(false);
    }
  };

  const handleVerificationStatus = async (restaurantId: string, isVerified: boolean) => {
    try {
      await adminVerificationService.updateRestaurantVerificationStatus(
        restaurantId,
        isVerified
      );
      await loadVerifications();
    } catch (err) {
      setError('Failed to update verification status');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-6">Verification Review</h1>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Restaurants List */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Pending Verifications</h2>
            {verifications.length === 0 ? (
              <div className="bg-white p-6 rounded-lg text-center text-gray-500">
                No pending verifications
              </div>
            ) : (
              verifications.map(verification => (
                <div
                  key={verification.restaurantId}
                  className={`bg-white p-4 rounded-lg cursor-pointer transition-colors ${
                    selectedRestaurant?.restaurantId === verification.restaurantId
                      ? 'ring-2 ring-black'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedRestaurant(verification)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{verification.restaurantName}</h3>
                      <p className="text-sm text-gray-500">{verification.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {verification.documents.length} documents
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        verification.status.isVerified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {verification.status.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Document Review */}
          {selectedRestaurant && (
            <div className="bg-white p-6 rounded-lg">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg font-medium">
                    {selectedRestaurant.restaurantName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedRestaurant.email}
                  </p>
                </div>
                <button
                  onClick={() => handleVerificationStatus(
                    selectedRestaurant.restaurantId,
                    !selectedRestaurant.status.isVerified
                  )}
                  className={`px-4 py-2 rounded-lg ${
                    selectedRestaurant.status.isVerified
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {selectedRestaurant.status.isVerified
                    ? 'Revoke Verification'
                    : 'Verify Restaurant'}
                </button>
              </div>
              <div className="space-y-6">
                {selectedRestaurant.documents.map((doc: VerificationDocument) => (
                  <div key={doc.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-medium">
                          {doc.type.replace('_', ' ')}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Uploaded {format(new Date(doc.uploadedAt), 'PPp')}
                        </p>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View
                      </a>
                    </div>

                    {doc.status === 'pending' ? (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReview(
                              selectedRestaurant.restaurantId,
                              doc.id,
                              'approved'
                            )}
                            className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
                            disabled={reviewing}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(
                              selectedRestaurant.restaurantId,
                              doc.id,
                              'rejected'
                            )}
                            className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
                            disabled={reviewing}
                          >
                            Reject
                          </button>
                        </div>
                        <textarea
                          placeholder="Rejection reason (required for rejection)"
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                          className="w-full p-2 border rounded-lg"
                          rows={3}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {doc.status === 'approved' ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-green-500">Approved</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-red-500" />
                            <span className="text-red-500">
                              Rejected: {doc.rejectionReason ? doc.rejectionReason : 'No reason provided'}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
} 