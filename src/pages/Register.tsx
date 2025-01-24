import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import Logo from "../components/Logo";
import Input from "../components/Input";
import { ArrowLeft, Store, User as UserIcon, Bike } from "lucide-react"; // Import icons
import { notificationService } from "../services/notificationService";
import { RiderStatus } from "../types/rider";

const CUISINE_TYPES = ["Pastries", "Smoothies", "Fast Food"];

export default function Register() {
  const [userType, setUserType] = useState<
    "user" | "restaurant" | "rider" | null
  >(null);
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
    vehicleType: "motorcycle",
    vehiclePlate: "",
    // Additional rider fields
    licenseNumber: "",
    workingHours: "full-time",
    emergencyContact: "",
    emergencyPhone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

      // Wait for auth state to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

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
        ...(userType === "rider" && {
          vehicleType: formData.vehicleType,
          vehiclePlate: formData.vehiclePlate,
          status: "offline",
          isVerified: false,
          rating: 0,
          totalDeliveries: 0,
          licenseNumber: formData.licenseNumber,
          workingHours: formData.workingHours,
          emergencyContact: formData.emergencyContact,
          emergencyPhone: formData.emergencyPhone,
        }),
      };

      // Store in Firestore
      const batch = writeBatch(db);

      // Update user document
      batch.set(doc(db, "users", userCredential.user.uid), userData);

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
          address: {
            address: formData.address,
            additionalInstructions: ""
          },
          createdAt: new Date().toISOString(),
        };

        // Update restaurant document
        batch.set(doc(db, "restaurants", userCredential.user.uid), restaurantData);
      }

      // For riders, create additional rider document
      if (userType === "rider") {
        const riderData = {
          id: userCredential.user.uid,
          userId: userCredential.user.uid,
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
          vehicleType: formData.vehicleType,
          vehiclePlate: formData.vehiclePlate,
          status: "offline" as RiderStatus,
          lastActivity: new Date().toISOString(),
          assignedOrders: [],
          completedOrders: 0,
          rating: 0,
          isVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          licenseNumber: formData.licenseNumber,
          workingHours: formData.workingHours,
          emergencyContact: formData.emergencyContact,
          emergencyPhone: formData.emergencyPhone,
        };
        batch.set(doc(db, "riders", userCredential.user.uid), riderData);
      }

      // Send verification email
      await sendEmailVerification(userCredential.user);

      // Set up notifications for restaurants
      if (userType === "restaurant") {
        const subscription = await notificationService.requestPermission(
          userCredential.user.uid
        );
        if (subscription) {
          await updateDoc(doc(db, "restaurants", userCredential.user.uid), {
            pushSubscription: JSON.stringify(subscription),
          });
        }
      }

      // Navigate based on user type
      navigate(
        userType === "restaurant" 
          ? "/restaurant-verify-email" 
          : userType === "rider"
            ? "/rider-verify-email"
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

  // Add this consistent input style class
  const inputClassName = "w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent";

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
              className="w-full p-6 border rounded-lg flex items-center gap-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Register as Customer</h3>
                <p className="text-sm text-gray-500">
                  Order food from restaurants
                </p>
              </div>
            </button>

            <button
              onClick={() => setUserType("restaurant")}
              className="w-full p-6 border rounded-lg flex items-center gap-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Store className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Register as Restaurant</h3>
                <p className="text-sm text-gray-500">
                  List your restaurant and receive orders
                </p>
              </div>
            </button>

            <button
              onClick={() => setUserType("rider")}
              className="w-full p-6 border rounded-lg flex items-center gap-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Bike className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Register as Rider</h3>
                <p className="text-sm text-gray-500">
                  Join as a delivery partner
                </p>
              </div>
            </button>
          </div>

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
          {userType === "restaurant" && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restaurant Name *
                  </label>
                  <input
                    name="restaurantName"
                    placeholder="Enter restaurant name"
                    value={formData.restaurantName}
                    onChange={handleChange}
                    className={inputClassName}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restaurant Description *
                  </label>
                  <input
                    name="description"
                    placeholder="Enter restaurant description"
                    value={formData.description}
                    onChange={handleChange}
                    className={inputClassName}
                    required
                  />
                </div>

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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Opening Time
                      </label>
                      <input
                        type="time"
                        name="openingHours"
                        value={formData.openingHours}
                        onChange={handleChange}
                        className={inputClassName}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Closing Time
                      </label>
                      <input
                        type="time"
                        name="closingHours"
                        value={formData.closingHours}
                        onChange={handleChange}
                        className={inputClassName}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Order Amount (₦) *
                  </label>
                  <input
                    type="number"
                    name="minimumOrder"
                    placeholder="Enter minimum order amount"
                    value={formData.minimumOrder}
                    onChange={handleChange}
                    className={inputClassName}
                    min="0"
                    step="100"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Common fields for all user types */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                name="email"
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                className={inputClassName}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <input
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className={inputClassName}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                name="phone"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
                pattern="[0-9]*"
                inputMode="numeric"
                className={inputClassName}
                required
              />
            </div>

            {userType === "user" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      name="firstName"
                      placeholder="Enter first name"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={inputClassName}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      name="lastName"
                      placeholder="Enter last name"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={inputClassName}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Birthday
                  </label>
                  <input
                    name="birthday"
                    type="date"
                    placeholder="Select your birthday"
                    value={formData.birthday}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Address *
              </label>
              <input
                name="address"
                placeholder="Enter your full address"
                value={formData.address}
                onChange={handleChange}
                className={inputClassName}
                required
              />
            </div>
          </div>

          {userType === "rider" && (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      name="firstName"
                      placeholder="Enter first name"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={inputClassName}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      name="lastName"
                      placeholder="Enter last name"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={inputClassName}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type *
                  </label>
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className={inputClassName}
                    required
                  >
                    <option value="">Select vehicle type</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="bicycle">Bicycle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Plate Number *
                  </label>
                  <input
                    type="text"
                    name="vehiclePlate"
                    value={formData.vehiclePlate}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="Enter vehicle plate number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Driver's License Number *
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="Enter driver's license number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Hours
                  </label>
                  <select
                    name="workingHours"
                    value={formData.workingHours}
                    onChange={handleChange}
                    className={inputClassName}
                  >
                    <option value="">Select working hours</option>
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                    <option value="weekends">Weekends Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact Name *
                  </label>
                  <input
                    type="text"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="Enter emergency contact name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact Phone *
                  </label>
                  <input
                    type="tel"
                    name="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="Enter emergency contact phone"
                    required
                  />
                </div>
              </div>
            </>
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
