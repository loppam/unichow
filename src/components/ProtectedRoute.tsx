import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType: 'user' | 'restaurant' | 'admin' | 'rider';
  requireVerification?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  userType,
  requireVerification = true 
}: ProtectedRouteProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        navigate('/login', { replace: true, state: { userType } });
        return;
      }

      // Add a small delay to ensure auth state is ready
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        if (!userData) {
          throw new Error("User data not found");
        }

        if (userType === "restaurant") {
          const restaurantDoc = await getDoc(doc(db, "restaurants", user.uid));
          if (!restaurantDoc.exists()) {
            throw new Error("Restaurant profile not found");
          }
          userData.restaurantData = restaurantDoc.data();
        }

        // Check for admin first
        if (userData.isAdmin === true || userData.isAdmin === "true") {
          const token = await (user as User).getIdTokenResult();
          if (!token.claims.admin) {
            // Refresh token to get updated claims
            await (user as User).getIdToken(true);
          }
          if (userType !== 'admin') {
            navigate('/admin', { replace: true });
            return;
          }
        } else {
          // Check regular user type match
          if (userData.userType !== userType) {
            navigate(userData.userType === 'restaurant' ? '/restaurant-dashboard' : '/home', { replace: true });
            return;
          }
        }

        // Check email verification using Firestore data
        if (requireVerification && !userData.emailVerified) {
          navigate(
            userData.userType === 'restaurant' 
              ? '/restaurant-verify-email' 
              : '/verify-email', 
            { replace: true }
          );
          return;
        }

        // Handle restaurant approval
        if (userType === 'restaurant' && !userData.isApproved) {
          // Only redirect to pending if email is verified
          if (userData.emailVerified) {
            navigate('/restaurant-pending', { replace: true });
            return;
          }
        }

        // Check for admin access
        if (userType === 'admin' && !userData.isAdmin) {
          navigate('/home', { replace: true });
          return;
        }

        // Update the check for rider verification and approval
        if (userType === 'rider') {
          // Don't redirect to verification page if we're already on it
          if (!userData.emailVerified && !location.pathname.includes('verify-email')) {
            navigate("/rider-verify-email", { replace: true });
            return;
          }
          if (!userData.isVerified && userData.emailVerified) {
            navigate("/rider-pending", { replace: true });
            return;
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error checking access:", error);
        navigate('/login', { 
          replace: true, 
          state: { 
            userType,
            error: error instanceof Error ? error.message : "Connection error occurred"
          } 
        });
      }
    };

    checkAccess();
  }, [user, userType, requireVerification, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
} 