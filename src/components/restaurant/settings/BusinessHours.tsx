import React, { useState } from "react";
import { firestoreService } from "../../../services/firestoreService";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "react-hot-toast";

interface BusinessHoursProps {
  data: {
    openingHours: string;
    closingHours: string;
  };
}

export default function BusinessHours({ data }: BusinessHoursProps) {
  const { user } = useAuth();
  const [openingHours, setOpeningHours] = useState(data.openingHours);
  const [closingHours, setClosingHours] = useState(data.closingHours);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setLoading(true);
    try {
      await firestoreService.updateDocument("restaurants", user.uid, {
        openingHours,
        closingHours,
        updatedAt: new Date().toISOString(),
      });
      toast.success("Business hours updated successfully");
    } catch (error) {
      console.error("Error updating business hours:", error);
      toast.error("Failed to update business hours");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Opening Hours
        </label>
        <input
          type="time"
          value={openingHours}
          onChange={(e) => setOpeningHours(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Closing Hours
        </label>
        <input
          type="time"
          value={closingHours}
          onChange={(e) => setClosingHours(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {loading ? "Updating..." : "Update Hours"}
      </button>
    </form>
  );
}
