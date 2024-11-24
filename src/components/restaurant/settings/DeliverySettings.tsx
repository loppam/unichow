import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface DeliverySettingsProps {
  data: {
    minimumOrder: number;
    estimatedDeliveryTime?: string;
    averagePreparationTime?: number;
  };
}

export default function DeliverySettings({ data }: DeliverySettingsProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    minimumOrder: data?.minimumOrder || 0,
    estimatedDeliveryTime: data?.estimatedDeliveryTime || '30-45',
    averagePreparationTime: data?.averagePreparationTime || 25
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: name === 'estimatedDeliveryTime' ? value : Number(value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      const restaurantRef = doc(db, 'restaurants', user.uid);
      
      await updateDoc(restaurantRef, {
        minimumOrder: settings.minimumOrder,
        estimatedDeliveryTime: settings.estimatedDeliveryTime,
        averagePreparationTime: settings.averagePreparationTime,
        lastUpdated: new Date().toISOString()
      });

      toast.success('Delivery settings updated successfully');
    } catch (error) {
      console.error('Error updating delivery settings:', error);
      toast.error('Failed to update delivery settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Order (₦)
          </label>
          <input
            type="number"
            name="minimumOrder"
            value={settings.minimumOrder}
            onChange={handleChange}
            min="0"
            step="100"
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Delivery Time (minutes)
          </label>
          <input
            type="text"
            name="estimatedDeliveryTime"
            value={settings.estimatedDeliveryTime}
            onChange={handleChange}
            placeholder="e.g., 30-45"
            className="w-full p-2 border rounded-lg"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Format: min-max (e.g., 30-45)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Average Preparation Time (minutes)
          </label>
          <input
            type="number"
            name="averagePreparationTime"
            value={settings.averagePreparationTime}
            onChange={handleChange}
            min="1"
            max="120"
            className="w-full p-2 border rounded-lg"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Average time to prepare an order</p>
        </div>
      </div>

      <div className="flex justify-end">
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