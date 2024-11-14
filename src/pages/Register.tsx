import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import Logo from "../components/Logo";
import Input from "../components/Input";
import { Store, User as UserIcon } from "lucide-react"; // Import icons

export default function Register() {
  const [userType, setUserType] = useState<"user" | "restaurant" | null>(null);
  const [formData, setFormData] = useState({
    phone: "",
    email: "",
    firstName: "",
    lastName: "",
    birthday: "",
    address: "",
    password: "",
    // Additional fields for restaurants
    restaurantName: "",
    description: "",
    cuisine: "",
    openingHours: "",
    closingHours: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      // Remove any non-digit characters as user types
      const cleaned = value.replace(/\D/g, '');
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!userType) {
      setError("Please select an account type");
      setLoading(false);
      return;
    }

    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Prepare user data
      const userData = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        birthday: formData.birthday,
        address: formData.address,
        userType: userType,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        ...(userType === "restaurant" && {
          restaurantName: formData.restaurantName,
          description: formData.description,
          cuisine: formData.cuisine,
          openingHours: formData.openingHours,
          closingHours: formData.closingHours,
          isApproved: false,
        }),
        ...(userType === "user" && {
          name: `${formData.firstName} ${formData.lastName}`,
          phoneNumber: formData.phone,
          defaultAddress: formData.address,
        })
      };

      // Store in Firestore with retry logic
      let retries = 3;
      while (retries > 0) {
        try {
          await setDoc(doc(db, "users", userCredential.user.uid), userData);
          break;
        } catch (firestoreError) {
          retries--;
          if (retries === 0) {
            throw firestoreError;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // For restaurants, create an additional document in restaurants collection
      if (userType === "restaurant") {
        const restaurantData = {
          restaurantName: formData.restaurantName,
          description: formData.description,
          cuisine: formData.cuisine,
          openingHours: formData.openingHours,
          closingHours: formData.closingHours,
          isApproved: false,
          status: 'pending',
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "restaurants", userCredential.user.uid), restaurantData);
      }

      // Send verification email
      await sendEmailVerification(userCredential.user);

      // Navigate based on user type
      navigate(
        userType === "restaurant" 
          ? "/restaurant-verify-email"
          : "/verify-email"
      );
    } catch (err) {
      console.error("Registration error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create account");
      }
      
      // Clean up if registration fails
      if (auth.currentUser) {
        try {
          await auth.currentUser.delete();
        } catch (deleteError) {
          console.error("Cleanup failed:", deleteError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (!userType) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center p-4">
        <div className="w-full max-w-md">
          <Logo size="md" />
          <h1 className="text-2xl font-bold mb-8 text-center">Create Account</h1>
          
          <div className="space-y-4">
            <button
              onClick={() => setUserType("user")}
              className="w-full p-6 border rounded-lg flex items-center gap-4 hover:bg-gray-50"
            >
              <UserIcon className="w-8 h-8" />
              <div className="text-left">
                <h3 className="font-semibold">Register as Customer</h3>
                <p className="text-sm text-gray-500">Order food from restaurants</p>
              </div>
            </button>

            <button
              onClick={() => setUserType("restaurant")}
              className="w-full p-6 border rounded-lg flex items-center gap-4 hover:bg-gray-50"
            >
              <Store className="w-8 h-8" />
              <div className="text-left">
                <h3 className="font-semibold">Register as Restaurant</h3>
                <p className="text-sm text-gray-500">List your restaurant and receive orders</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4">
      <div className="w-full max-w-md">
        <Logo size="md" />
        <div className="flex items-center gap-2 mb-8">
          <h1 className="text-2xl font-bold text-center">
            {userType === "restaurant" ? "Restaurant Registration" : "Create Account"}
          </h1>
          <button 
            onClick={() => setUserType(null)}
            className="text-sm text-gray-500 hover:text-black"
          >
            Change
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {userType === "restaurant" ? (
            // Restaurant-specific fields
            <>
              <Input
                name="restaurantName"
                placeholder="Restaurant Name"
                value={formData.restaurantName}
                onChange={handleChange}
                required
              />
              <Input
                name="description"
                placeholder="Restaurant Description"
                value={formData.description}
                onChange={handleChange}
                required
              />
              <Input
                name="cuisine"
                placeholder="Cuisine Type"
                value={formData.cuisine}
                onChange={handleChange}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  name="openingHours"
                  type="time"
                  placeholder="Opening Hours"
                  value={formData.openingHours}
                  onChange={handleChange}
                  required
                />
                <Input
                  name="closingHours"
                  type="time"
                  placeholder="Closing Hours"
                  value={formData.closingHours}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          ) : null}

          {/* Common fields for both types */}
          <Input
            name="email"
            type="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <Input
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <Input
            name="phone"
            placeholder="Phone number"
            value={formData.phone}
            onChange={handleChange}
            pattern="[0-9]*"
            inputMode="numeric"
            required
          />
          {userType === "user" && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                name="firstName"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              <Input
                name="lastName"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          )}
          <Input
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
            required
          />
          {userType === "user" && (
            <Input
              name="birthday"
              type="date"
              placeholder="Birthday"
              value={formData.birthday}
              onChange={handleChange}
            />
          )}
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create your account"}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-black font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
