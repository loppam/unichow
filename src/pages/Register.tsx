import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import Logo from "../components/Logo";
import Input from "../components/Input";
import { ArrowLeft, Store, User as UserIcon } from "lucide-react"; // Import icons
import { notificationService } from "../services/notificationService";

const CUISINE_TYPES = ["Pastries", "Smoothies", "Fast Food"];

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
    cuisineTypes: [] as string[],
    openingHours: "",
    closingHours: "",
    minimumOrder: 0,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "phone") {
      // Remove any non-digit characters as user types
      const cleaned = value.replace(/\D/g, "");
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
          cuisineTypes: formData.cuisineTypes,
          openingHours: formData.openingHours,
          closingHours: formData.closingHours,
          isApproved: false,
        }),
        ...(userType === "user" && {
          name: `${formData.firstName} ${formData.lastName}`,
          phoneNumber: formData.phone,
          defaultAddress: formData.address,
        }),
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
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // For restaurants, create an additional document in restaurants collection
      if (userType === "restaurant") {
        const restaurantData = {
          restaurantName: formData.restaurantName,
          description: formData.description,
          cuisineTypes: formData.cuisineTypes,
          openingHours: formData.openingHours,
          closingHours: formData.closingHours,
          isApproved: false,
          status: "pending",
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          createdAt: new Date().toISOString(),
        };
        await setDoc(
          doc(db, "restaurants", userCredential.user.uid),
          restaurantData
        );
      }

      // Send verification email
      await sendEmailVerification(userCredential.user);

      // Navigate based on user type
      navigate(
        userType === "restaurant" ? "/restaurant-verify-email" : "/verify-email"
      );

      if (userType === "user") {
        // Create initial customer document
        await setDoc(doc(db, "customers", userCredential.user.uid), {
          email: formData.email,
          name: `${formData.firstName} ${formData.lastName}`,
          phone: formData.phone,
          savedAddresses: [{
            id: Date.now().toString(),
            address: formData.address,
            additionalInstructions: ''
          }]
        });
      }

      // After restaurant login/registration
      const subscription = await notificationService.requestPermission(userCredential.user.uid);
      if (subscription) {
        await updateDoc(doc(db, 'restaurants', userCredential.user.uid), {
          pushSubscription: JSON.stringify(subscription)
        });
      }
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

  // Add this component for the multi-select dropdown
  const CuisineSelect = ({
    selected,
    onChange,
  }: {
    selected: string[];
    onChange: (values: string[]) => void;
  }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-2 border rounded-lg text-left flex justify-between items-center"
        >
          <span className="truncate">
            {selected.length ? selected.join(", ") : "Select Cuisine Types"}
          </span>
          <span className="ml-2">▼</span>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
            {CUISINE_TYPES.map((cuisine) => (
              <label
                key={cuisine}
                className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(cuisine)}
                  onChange={(e) => {
                    const newSelected = e.target.checked
                      ? [...selected, cuisine]
                      : selected.filter((item) => item !== cuisine);
                    onChange(newSelected);
                  }}
                  className="mr-2"
                />
                {cuisine}
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!userType) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center p-4">
        <div className="w-full max-w-md">
          <Logo size="md" />
          <h1 className="text-2xl font-bold mb-8 text-center">
            Create Account
          </h1>

          <div className="space-y-4">
            <button
              onClick={() => setUserType("user")}
              className="w-full p-6 border rounded-lg flex items-center gap-4 hover:bg-gray-50"
            >
              <UserIcon className="w-8 h-8" />
              <div className="text-left">
                <h3 className="font-semibold">Register as Customer</h3>
                <p className="text-sm text-gray-500">
                  Order food from restaurants
                </p>
              </div>
            </button>

            <button
              onClick={() => setUserType("restaurant")}
              className="w-full p-6 border rounded-lg flex items-center gap-4 hover:bg-gray-50"
            >
              <Store className="w-8 h-8" />
              <div className="text-left">
                <h3 className="font-semibold">Register as Restaurant</h3>
                <p className="text-sm text-gray-500">
                  List your restaurant and receive orders
                </p>
              </div>
            </button>
          </div>
        </div>
        <p className="text-center text-gray-600 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-black font-medium">
            Login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4">
      <div className="w-full max-w-md">
        <Logo size="md" />
        <div className="flex items-center gap-2 mb-8">
          <button
            onClick={() => setUserType(null)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-black"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-2xl font-bold text-center">
            {userType === "restaurant"
              ? "Restaurant Registration"
              : "Create Account"}
          </h1>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuisine Types *
                </label>
                <CuisineSelect
                  selected={formData.cuisineTypes}
                  onChange={(values) =>
                    setFormData((prev) => ({ ...prev, cuisineTypes: values }))
                  }
                />
                {formData.cuisineTypes.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    Please select at least one cuisine type
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operating Hours *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Opening Time
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        name="openingHours"
                        value={formData.openingHours}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-lg appearance-none"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">e.g., 09:00AM</p>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Closing Time
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        name="closingHours"
                        value={formData.closingHours}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-lg appearance-none"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">e.g., 10:00PM</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Order Amount (₦) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="minimumOrder"
                    value={formData.minimumOrder}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg"
                    min="0"
                    step="100"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum amount customers must order</p>
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
            placeholder="Full Address"
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
