import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { verificationService } from '../services/verificationService';
import { VerificationDocument, VerificationStatus } from '../types/verification';
import { Upload, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import RestaurantLayout from '../components/RestaurantLayout';

export default function RestaurantVerification() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    loadVerificationData();
  }, [user]);

  const loadVerificationData = async () => {
    try {
      const [docs, verificationStatus] = await Promise.all([
        verificationService.getDocuments(user!.uid),
        verificationService.getVerificationStatus(user!.uid)
      ]);
      setDocuments(docs);
      setStatus(verificationStatus);
    } catch (err) {
      setError('Failed to load verification data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    file: File,
    type: VerificationDocument['type'],
    expiryDate?: string
  ) => {
    if (!user) return;

    setUploading(true);
    setError('');

    try {
      const newDoc = await verificationService.uploadDocument(
        user.uid,
        file,
        type,
        expiryDate
      );
      setDocuments(prev => [...prev, newDoc]);
      await loadVerificationData();
    } catch (err) {
      setError('Failed to upload document');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document: VerificationDocument) => {
    if (!user || !window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await verificationService.deleteDocument(user.uid, document);
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
      await loadVerificationData();
    } catch (err) {
      setError('Failed to delete document');
      console.error(err);
    }
  };

  const getStatusIcon = (status: VerificationDocument['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <RestaurantLayout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </RestaurantLayout>
    );
  }

  return (
    <RestaurantLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Status Overview */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Verification Status</h2>
          {status && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${
                  status.isVerified ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span className="font-medium">
                  {status.isVerified ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
              
              {status.pendingDocuments.length > 0 && (
                <div className="text-sm text-gray-600">
                  Required documents:
                  <ul className="list-disc list-inside mt-1">
                    {status.pendingDocuments.map(doc => (
                      <li key={doc}>{doc.replace('_', ' ')}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Document Upload */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['business_license', 'food_permit', 'identity'] as const).map(type => {
              const existingDoc = documents.find(doc => doc.type === type);
              
              return (
                <div key={type} className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">{type.replace('_', ' ')}</h3>
                  
                  {existingDoc ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <span className="text-sm truncate">{existingDoc.fileName}</span>
                        </div>
                        {getStatusIcon(existingDoc.status)}
                      </div>
                      
                      {existingDoc.status === 'rejected' && (
                        <p className="text-sm text-red-500">
                          {existingDoc.rejectionReason}
                        </p>
                      )}
                      
                      <button
                        onClick={() => handleDelete(existingDoc)}
                        className="text-red-500 text-sm hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                      <Upload className="h-6 w-6 text-gray-400" />
                      <span className="mt-2 text-sm text-gray-500">
                        Click to upload
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, type);
                          }
                        }}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Document History */}
        {documents.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Document History</h2>
            <div className="space-y-4">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{doc.type.replace('_', ' ')}</div>
                    <div className="text-sm text-gray-500">
                      Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    {getStatusIcon(doc.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
} 