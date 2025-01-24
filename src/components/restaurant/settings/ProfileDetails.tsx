import React, { useState } from "react";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import { restaurantService } from "../../../services/restaurantService";
import SubaccountBalance from "../../common/SubaccountBalance";

interface ProfileDetailsProps {
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    restaurantName: string;
    description: string;
    cuisineTypes: string[];
    address: {
      address: string;
      additionalInstructions: string;
    };
    minimumOrder: number;
    logo?: string;
    bannerImage?: string;
    paymentInfo?: {
      paystackSubaccountCode: string;
    };
  };
}

const CUISINE_TYPES = ["Fast Food", "Pastries", "Smoothies"];

export default function ProfileDetails({ data }: ProfileDetailsProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    // Personal Details
    firstName: data?.firstName || "",
    lastName: data?.lastName || "",
    email: data?.email || "",
    phone: data?.phone || "",
    // Company Details
    restaurantName: data?.restaurantName || "",
    description: data?.description || "",
    cuisineTypes: data?.cuisineTypes || [],
    address: data?.address || { address: "", additionalInstructions: "" },
    minimumOrder: data?.minimumOrder || 0,
    logo: data?.logo || "",
    bannerImage: data?.bannerImage || "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [name === "address" ? "address" : "additionalInstructions"]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);

      // First sync the address update
      await restaurantService.syncAddressUpdate(user.uid, formData.address);

      // Create a batch to update both collections
      const batch = writeBatch(db);
      const restaurantRef = doc(db, "restaurants", user.uid);
      const userRef = doc(db, "users", user.uid);
      const timestamp = new Date().toISOString();

      // Updates for restaurant collection
      const restaurantUpdates = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        restaurantName: formData.restaurantName,
        description: formData.description,
        cuisineTypes: formData.cuisineTypes,
        minimumOrder: Number(formData.minimumOrder),
        lastUpdated: timestamp,
      };

      // Updates for user collection - sync relevant fields
      const userUpdates = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        restaurantName: formData.restaurantName,
        lastUpdated: timestamp,
      };

      batch.update(restaurantRef, restaurantUpdates);
      batch.update(userRef, userUpdates);

      await batch.commit();

      toast.success("Profile details updated successfully");
    } catch (error) {
      console.error("Error updating profile details:", error);
      toast.error("Failed to update profile details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-8">
      {/* Personal Details Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Personal Information
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              disabled
              className="w-full p-2 border rounded-lg bg-gray-50"
            />
            <p className="mt-1 text-sm text-gray-500">
              Contact support to change email
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
              required
              pattern="[0-9]{11}"
            />
          </div>
        </div>
        {data.paymentInfo?.paystackSubaccountCode && (
          <div className="mb-6">
            <SubaccountBalance
              subaccountCode={data.paymentInfo.paystackSubaccountCode}
              autoRefreshInterval={300000}
            />
          </div>
        )}
      </div>

      {/* Company Details Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Restaurant Information
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Restaurant Name
            </label>
            <input
              type="text"
              name="restaurantName"
              value={formData.restaurantName}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cuisine Types
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-2 border rounded-lg">
              {CUISINE_TYPES.map((cuisine) => (
                <label
                  key={cuisine}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.cuisineTypes.includes(cuisine)}
                    onChange={(e) => {
                      const updatedCuisine = e.target.checked
                        ? [...formData.cuisineTypes, cuisine]
                        : formData.cuisineTypes.filter((c) => c !== cuisine);
                      setFormData((prev) => ({
                        ...prev,
                        cuisineTypes: updatedCuisine,
                      }));
                    }}
                    className="rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-sm text-gray-700">{cuisine}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address.address}
                onChange={handleAddressChange}
                className="w-full p-2 border rounded-lg mb-2"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
