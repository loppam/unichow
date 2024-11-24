import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import Logo from "../components/Logo";
import { notificationService } from "../services/notificationService";

export default function Login() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(location.state?.error || "");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Retry Firestore query with exponential backoff
      let delay = 1000;
      let attempts = 3;
      let userData = null;

      while (attempts > 0) {
        try {
          const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
          userData = userDoc.data();
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

      if (!userData) {
        throw new Error("User data not found");
      }

      // Check admin first
      if (userData.isAdmin === true || userData.isAdmin === "true") {
        navigate("/admin");
        return;
      }

      // Reload user to get latest email verification status
      await userCredential.user.reload();
      const updatedUser = auth.currentUser;
      
      if (!updatedUser?.emailVerified) {
        navigate(
          userData.userType === "restaurant"
            ? "/restaurant-verify-email"
            : "/verify-email"
        );
        return;
      }

      // Handle restaurant-specific checks
      if (userData.userType === "restaurant") {
        const restaurantDoc = await getDoc(doc(db, "restaurants", userCredential.user.uid));
        if (!restaurantDoc.exists()) {
          throw new Error("Restaurant profile not found");
        }

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
          <Link to="/register" className="text-black font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
