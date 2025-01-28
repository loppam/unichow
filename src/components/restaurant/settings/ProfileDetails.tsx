import React, { useState } from "react";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import { restaurantService } from "../../../services/restaurantService";
import SubaccountBalance from "../../common/SubaccountBalance";
import ImageUpload from "../../common/ImageUpload";
import { CUISINE_TYPES, CuisineType } from "../../../constants/cuisineTypes";

interface ProfileDetailsProps {
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    restaurantName: string;
    description: string;
    cuisineTypes: CuisineType[];
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
    bannerImage: data?.bannerImage || "",
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);

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
      await restaurantService.syncAddressUpdate(user.uid, formData.address);

      const updates = { ...formData };

      if (bannerFile) {
        const bannerUrl = await restaurantService.uploadFile(
          user.uid,
          bannerFile,
          "banner"
        );
        updates.bannerImage = bannerUrl;
      }

      const batch = writeBatch(db);
      const restaurantRef = doc(db, "restaurants", user.uid);
      const userRef = doc(db, "users", user.uid);
      const timestamp = new Date().toISOString();

      const restaurantUpdates = {
        firstName: updates.firstName,
        lastName: updates.lastName,
        phone: updates.phone,
        restaurantName: updates.restaurantName,
        description: updates.description,
        cuisineTypes: updates.cuisineTypes,
        minimumOrder: Number(updates.minimumOrder),
        bannerImage: updates.bannerImage,
        lastUpdated: timestamp,
      };

      const userUpdates = {
        firstName: updates.firstName,
        lastName: updates.lastName,
        phone: updates.phone,
        restaurantName: updates.restaurantName,
        lastUpdated: timestamp,
      };

      batch.update(restaurantRef, restaurantUpdates);
      batch.update(userRef, userUpdates);

      await batch.commit();
      setBannerFile(null);
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

          <div>
            {" "}
            {/* Description and Address column */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                placeholder="Tell customers about your restaurant..."
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="address"
                  value={formData.address.address}
                  onChange={handleAddressChange}
                  placeholder="Enter your restaurant's address"
                  className="w-full p-3 border rounded-lg pr-10 focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div>
            {" "}
            {/* Cuisine Types column */}
            <label className="block text-sm font-medium text-gray-700 ">
              Cuisine Types
            </label>
            <div className="grid grid-cols-2 gap-2 p-2 border rounded-lg bg-gray-50">
              {CUISINE_TYPES.map((cuisine) => (
                <label
                  key={cuisine}
                  className="flex items-center space-x-2 p-1.5 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow cursor-pointer"
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
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    {cuisine}
                  </span>
                </label>
              ))}
            </div>
            {formData.cuisineTypes.length === 0 && (
              <p className="mt-2 text-sm text-red-500">
                Please select at least one cuisine type
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <ImageUpload
              label="Restaurant Banner Image"
              currentImage={formData.bannerImage}
              onImageSelect={(file) => setBannerFile(file)}
              onImageRemove={() => {
                setFormData((prev) => ({ ...prev, bannerImage: "" }));
                setBannerFile(null);
              }}
              className="h-32"
            />
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
