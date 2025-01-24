import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { ClipboardCheck, AlertCircle } from "lucide-react";

interface VerificationStatus {
  isVerified: boolean;
  pendingDocuments?: string[];
  message?: string;
}

export default function RestaurantPending() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!user?.uid) return;

      try {
        const restaurantDoc = await getDoc(doc(db, "restaurants", user.uid));
        if (restaurantDoc.exists()) {
          const restaurantData = restaurantDoc.data();
          setStatus({
            isVerified: restaurantData.isVerified || false,
            pendingDocuments: restaurantData.pendingDocuments,
            message: restaurantData.verificationMessage
          });
        }
      } catch (error) {
        console.error("Error checking verification status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkVerificationStatus();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!user?.uid) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="text-red-500">Please log in to view verification status</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4">
      <div className="w-full max-w-md">
        <Logo size="md" />
        
        <div className="mt-8">
          <h1 className="text-2xl font-bold mb-6">Restaurant Verification</h1>

          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Checking verification status...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Card */}
              <div className="bg-white rounded-lg shadow-sm p-6 border">
                <div className="flex items-start gap-4">
                  {status?.isVerified ? (
                    <ClipboardCheck className="w-6 h-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                  )}
                  <div>
                    <h2 className="text-lg font-semibold mb-2">
                      {status?.isVerified ? "Restaurant Verified" : "Verification Pending"}
                    </h2>
                    <p className="text-gray-600">
                      {status?.isVerified
                        ? "Your restaurant has been verified. You can now start accepting orders."
                        : "Your restaurant is currently under review. We'll notify you once the verification is complete."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Required Documents */}
              {status?.pendingDocuments && status.pendingDocuments.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-6">
                  <h3 className="font-semibold mb-2">Required Documents</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {status.pendingDocuments.map((doc) => (
                      <li key={doc}>{doc.replace(/_/g, " ")}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Additional Message */}
              {status?.message && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="font-semibold mb-2">Additional Information</h3>
                  <p className="text-sm text-gray-700">{status.message}</p>
                </div>
              )}

              {/* Contact Support */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold mb-2">Need Help?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  If you have any questions about your restaurant verification status, please contact our support team.
                </p>
                <a
                  href="mailto:support@example.com"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  support@example.com
                </a>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 