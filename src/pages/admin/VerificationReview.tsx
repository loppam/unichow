import { useState, useEffect } from 'react';
import { adminVerificationService } from '../../services/adminVerificationService';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { VerificationDocument } from '../../types/verification';

interface Verification {
  restaurantId: string;
  restaurantName: string;
  email: string;
  phone?: string;
  address?: string;
  status: {
    isVerified: boolean;
    state?: 'pending' | 'approved' | 'rejected';
  };
  documents: VerificationDocument[];
}

export default function VerificationReview() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    try {
      const data = await adminVerificationService.getPendingVerifications();
      setVerifications(data);
    } catch (err) {
      toast.error('Failed to load verifications');
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
      
      await loadVerifications();
      setRejectionReason('');
      toast.success(`Document ${status} successfully`);
    } catch (err) {
      toast.error('Failed to review document');
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
      toast.success(`Restaurant ${isVerified ? 'verified' : 'verification revoked'} successfully`);
    } catch (err) {
      toast.error('Failed to update verification status');
      console.error(err);
    }
  };

  const filteredVerifications = verifications.filter(verification => {
    if (!verification) return false;
    
    if (!verification.status) {
      verification.status = { 
        isVerified: false,
        state: 'pending'
      };
    }

    switch (filter) {
      case 'approved':
        return verification.status.isVerified;
      case 'pending':
        return !verification.status.isVerified && verification.status.state !== 'rejected';
      case 'rejected':
        return verification.status.state === 'rejected';
      default:
        return true;
    }
  });

  const FilterButton = ({ value }: { value: string }) => (
    <button
      onClick={() => setFilter(value as any)}
      className={`px-4 py-2 rounded-lg capitalize transition-colors ${
        filter === value
          ? 'bg-black text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {value}
    </button>
  );

  const StatusBadge = ({ status }: { status: any }) => {
    if (!status) return null;

    const getStatus = () => {
      if (status.isVerified) return 'approved';
      if (status.state === 'rejected') return 'rejected';
      return 'pending';
    };

    const currentStatus = getStatus();
    
    const styles = {
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    }[currentStatus];

    return (
      <span className={`px-2 py-1 rounded-full text-sm ${styles}`}>
        {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
      </span>
    );
  };

  const RestaurantCard = ({ 
    verification,
    isExpanded,
    onToggleExpand 
  }: {
    verification: Verification;
    isExpanded: boolean;
    onToggleExpand: () => void;
  }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold">{verification.restaurantName}</h3>
          <p className="text-sm text-gray-500">{verification.documents.length} documents</p>
        </div>
        <StatusBadge status={verification.status} />
      </div>

      <div className="space-y-2 text-gray-600 mb-4">
        <p className="flex items-center gap-2">
          <span className="w-5">📧</span> {verification.email}
        </p>
        {verification.phone && (
          <p className="flex items-center gap-2">
            <span className="w-5">📱</span> {verification.phone}
          </p>
        )}
        {verification.address && (
          <p className="flex items-center gap-2">
            <span className="w-5">📍</span> {verification.address}
          </p>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          {verification.documents.map(doc => (
            <div key={doc.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{doc.type.replace('_', ' ')}</h4>
                  <p className="text-sm text-gray-500">
                    Uploaded {format(new Date(doc.uploadedAt), 'PPp')}
                  </p>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  View File
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <button
          onClick={onToggleExpand}
          className="text-blue-500 hover:text-blue-700"
        >
          {isExpanded ? 'Hide Documents' : 'View Documents'}
        </button>
        <button
          onClick={() => handleVerificationStatus(
            verification.restaurantId,
            !verification.status.isVerified
          )}
          className={`px-4 py-2 rounded-lg ${
            verification.status.isVerified
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {verification.status.isVerified ? 'Revoke Verification' : 'Verify Restaurant'}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
          <h1 className="text-2xl font-semibold mb-4 lg:mb-0">Restaurant Verification</h1>
          <div className="flex flex-wrap gap-2">
            {['all', 'approved', 'pending', 'rejected'].map((filterOption) => (
              <FilterButton key={filterOption} value={filterOption} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Restaurants List */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Restaurants</h2>
            {filteredVerifications.length === 0 ? (
              <div className="bg-white p-6 rounded-lg text-center text-gray-500">
                No restaurants found
              </div>
            ) : (
              filteredVerifications.map(verification => (
                <RestaurantCard
                  key={verification.restaurantId}
                  verification={verification}
                  isExpanded={expandedId === verification.restaurantId}
                  onToggleExpand={() => setExpandedId(prevId => prevId === verification.restaurantId ? null : verification.restaurantId)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 