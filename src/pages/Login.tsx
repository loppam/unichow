import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { Truck } from "lucide-react";
import Logo from "../components/Logo";

export default function Login() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(location.state?.error || "");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<"user" | "restaurant" | null>(
    location.state?.userType || null
  );
  const navigate = useNavigate();

  useEffect(() => {
    // Clear error when userType changes
    setError("");
  }, [userType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Retry Firestore query with exponential backoff
      let delay = 1000;
      let attempts = 3;
      let userData = null;

      while (attempts > 0) {
        try {
          const userDoc = await getDoc(
            doc(db, "users", userCredential.user.uid)
          );
          userData = userDoc.data();

          // For restaurant users, also check the restaurants collection
          if (userType === "restaurant" && userData) {
            const restaurantDoc = await getDoc(doc(db, "restaurants", userCredential.user.uid));
            if (!restaurantDoc.exists()) {
              throw new Error("Restaurant profile not found");
            }
          }

          break;
        } catch (firestoreError) {
          attempts--;
          if (attempts === 0) {
            throw new Error("Unable to verify account. Please check your internet connection.");
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        }
      }

      // If no userType selected, check for admin
      if (!userType) {
        if (userData?.isAdmin === true || userData?.isAdmin === "true") {
          navigate("/admin");
          return;
        }
        setError("Invalid admin credentials");
        await auth.signOut();
        return;
      }

      // Handle regular user types
      if (!userData || userData.userType !== userType) {
        await auth.signOut();
        throw new Error(`Invalid account type. Please make sure you selected the correct account type.`);
      }

      if (!userCredential.user.emailVerified) {
        navigate(
          userType === "restaurant"
            ? "/restaurant-verify-email"
            : "/verify-email"
        );
        return;
      }

      if (userType === "restaurant") {
        if (!userData.isApproved) {
          if (userData.status === 'rejected') {
            await auth.signOut();
            throw new Error("Your restaurant account has been rejected. Please contact support for more information.");
          }
          await auth.signOut();
          throw new Error("Your restaurant account is pending approval. We'll notify you via email once approved.");
        }
        navigate("/restaurant-dashboard");
      } else {
        navigate("/home");
      }
    } catch (err) {
      console.error("Login error:", err);
      
      if (err instanceof Error) {
        if (err.message.includes('auth/invalid-credential')) {
          setError('Invalid email or password');
        } else if (err.message.includes('auth/too-many-requests')) {
          setError('Too many failed attempts. Please try again later');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }

      if (auth.currentUser) {
        await auth.signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4">
      <div className="w-full max-w-md">
        <Logo size="md" />
        <h1 className="text-2xl font-bold mb-8 text-center">Login</h1>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => setUserType("user")}
            className={`flex-1 p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${
              userType === "user"
                ? "border-black bg-black text-white"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="text-lg font-medium">Customer</span>
          </button>
          <button
            type="button"
            onClick={() => setUserType("restaurant")}
            className={`flex-1 p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${
              userType === "restaurant"
                ? "border-black bg-black text-white"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Truck size={24} />
            <span className="text-lg font-medium">Restaurant</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-transparent outline-none"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-transparent outline-none"
              required
            />
          </div>
          <Link
            to="/forgot-password"
            className="text-sm text-gray-600 hover:text-black block"
          >
            Forgot password?
          </Link>
          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-black font-medium hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
