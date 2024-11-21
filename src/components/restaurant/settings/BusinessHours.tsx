import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface BusinessHoursProps {
  data: {
    openingHours: string;
    closingHours: string;
  };
}

export default function BusinessHours({ data }: BusinessHoursProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState({
    openingHours: data?.openingHours || '',
    closingHours: data?.closingHours || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setHours(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateHours = () => {
    const opening = new Date(`1970-01-01T${hours.openingHours}`);
    const closing = new Date(`1970-01-01T${hours.closingHours}`);
    
    if (closing <= opening) {
      throw new Error('Closing time must be after opening time');
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      validateHours();

      const restaurantRef = doc(db, 'restaurants', user.uid);
      await updateDoc(restaurantRef, {
        openingHours: hours.openingHours,
        closingHours: hours.closingHours,
        lastUpdated: new Date().toISOString()
      });

      toast.success('Business hours updated successfully');
    } catch (error) {
      console.error('Error updating business hours:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update business hours');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Opening Time
          </label>
          <div className="relative">
            <input
              type="time"
              name="openingHours"
              value={hours.openingHours}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg appearance-none"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">e.g., 09:00</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Closing Time
          </label>
          <div className="relative">
            <input
              type="time"
              name="closingHours"
              value={hours.closingHours}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg appearance-none"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">e.g., 22:00</p>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
} 