import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "react-hot-toast";

interface ProfileDetailsProps {
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    restaurantName: string;
    description: string;
    cuisine: string[];
    address: {
      address: string;
      additionalInstructions: string;
    };
    minimumOrder: number;
    logo?: string;
    bannerImage?: string;
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
    cuisine: data?.cuisine || [],
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

  const handleCuisineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(
      (option) => option.value
    );
    setFormData((prev) => ({
      ...prev,
      cuisine: selectedOptions,
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
      const restaurantRef = doc(db, "restaurants", user.uid);
      await updateDoc(restaurantRef, {
        // Personal Details
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        // Company Details
        restaurantName: formData.restaurantName,
        description: formData.description,
        cuisine: formData.cuisine,
        address: formData.address,
        minimumOrder: Number(formData.minimumOrder),
        lastUpdated: new Date().toISOString(),
      });
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
            <select
              multiple
              name="cuisine"
              value={formData.cuisine}
              onChange={handleCuisineChange}
              className="w-full p-2 border rounded-lg"
              required
            >
              {CUISINE_TYPES.map((cuisine) => (
                <option key={cuisine} value={cuisine}>
                  {cuisine}
                </option>
              ))}
            </select>
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
