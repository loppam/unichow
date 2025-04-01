import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useEffect, useState } from "react";
import { User } from "firebase/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType: "customer" | "restaurant" | "admin" | "rider";
  requireVerification?: boolean;
}

export default function ProtectedRoute({
  children,
  userType,
  requireVerification = true,
}: ProtectedRouteProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        navigate("/login", { replace: true, state: { userType } });
        return;
      }

      // Add a small delay to ensure auth state is ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        if (!userData) {
          throw new Error("User data not found");
        }

        // Check for admin first
        if (userData.isAdmin === true || userData.isAdmin === "true") {
          const token = await (user as User).getIdTokenResult();
          if (!token.claims.admin) {
            // Refresh token to get updated claims
            await (user as User).getIdToken(true);
          }
          if (userType !== "admin") {
            navigate("/admin", { replace: true });
            return;
          }
        } else {
          // Check user type match
          if (userData.userType !== userType) {
            const redirectPath =
              userData.userType === "restaurant"
                ? "/restaurant-dashboard"
                : userData.userType === "rider"
                ? "/rider-dashboard"
                : userData.userType === "customer"
                ? "/home"
                : "/login";

            navigate(redirectPath, { replace: true });
            return;
          }
        }

        // Check email verification
        if (requireVerification && !userData.emailVerified) {
          const verificationPath =
            userData.userType === "restaurant"
              ? "/restaurant-verify-email"
              : userData.userType === "rider"
              ? "/rider-verify-email"
              : "/verify-email";

          navigate(verificationPath, { replace: true });
          return;
        }

        // Additional checks based on user type
        if (userType === "restaurant") {
          const restaurantDoc = await getDoc(doc(db, "restaurants", user.uid));
          if (!restaurantDoc.exists()) {
            throw new Error("Restaurant profile not found");
          }

          if (!userData.isApproved && userData.emailVerified) {
            navigate("/restaurant-pending", { replace: true });
            return;
          }
        }

        if (userType === "rider") {
          const riderDoc = await getDoc(doc(db, "riders", user.uid));
          if (!riderDoc.exists()) {
            throw new Error("Rider profile not found");
          }

          if (!riderDoc.data().isVerified && userData.emailVerified) {
            navigate("/rider-pending", { replace: true });
            return;
          }
        }

        if (userType === "customer") {
          const customerDoc = await getDoc(doc(db, "customers", user.uid));
          if (!customerDoc.exists()) {
            throw new Error("Customer profile not found");
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error checking access:", error);
        navigate("/login", {
          replace: true,
          state: {
            userType,
            error:
              error instanceof Error
                ? error.message
                : "Connection error occurred",
          },
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
