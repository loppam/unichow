import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';

interface RestaurantProfile {
  restaurantName: string;
  description: string;
  cuisine: string[];
  address: string;
  phone: string;
  openingHours: string;
  closingHours: string;
  minimumOrder: number;
  profileComplete: boolean;
  logo?: string;
  bannerImage?: string;
  lastUpdated?: string;
}

export default function RestaurantProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState<RestaurantProfile>({
    restaurantName: '',
    description: '',
    cuisine: [],
    address: '',
    phone: '',
    openingHours: '',
    closingHours: '',
    minimumOrder: 0,
    profileComplete: false
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(prevProfile => ({
            ...prevProfile,
            ...docSnap.data()
          }));
        }
      } catch (err) {
        setError('Failed to load profile');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleImageUpload = async (file: File, type: 'logo' | 'banner') => {
    if (!user) return null;
    const storageRef = ref(storage, `restaurants/${user.uid}/${type}/${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let updates = { ...profile };

      if (logoFile) {
        const logoUrl = await handleImageUpload(logoFile, 'logo');
        if (logoUrl) updates.logo = logoUrl;
      }
      if (bannerFile) {
        const bannerUrl = await handleImageUpload(bannerFile, 'banner');
        if (bannerUrl) updates.bannerImage = bannerUrl;
      }

      // Validate required fields
      const requiredFields = ['restaurantName', 'description', 'cuisine', 'address', 'phone'] as const;
      const missingFields = requiredFields.filter(field => !updates[field as keyof RestaurantProfile]);
      
      if (missingFields.length > 0) {
        throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      }

      updates.profileComplete = true;
      updates.lastUpdated = new Date().toISOString();

      await updateDoc(doc(db, 'users', user.uid), updates);
      setSuccess('Profile updated successfully');
      navigate('/restaurant-dashboard');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Complete Your Restaurant Profile</h1>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 text-green-500 p-4 rounded-lg mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant Name *
              </label>
              <input
                type="text"
                value={profile.restaurantName}
                onChange={e => setProfile(p => ({ ...p, restaurantName: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={profile.description}
                onChange={e => setProfile(p => ({ ...p, description: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                rows={4}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <input
                type="text"
                value={profile.address}
                onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opening Hours *
              </label>
              <input
                type="time"
                value={profile.openingHours}
                onChange={e => setProfile(p => ({ ...p, openingHours: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing Hours *
              </label>
              <input
                type="time"
                value={profile.closingHours}
                onChange={e => setProfile(p => ({ ...p, closingHours: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Order ($)
              </label>
              <input
                type="number"
                value={profile.minimumOrder}
                onChange={e => setProfile(p => ({ ...p, minimumOrder: Number(e.target.value) }))}
                className="w-full p-2 border rounded-lg"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo
              </label>
              <input
                type="file"
                onChange={e => setLogoFile(e.target.files?.[0] || null)}
                accept="image/*"
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banner Image
              </label>
              <input
                type="file"
                onChange={e => setBannerFile(e.target.files?.[0] || null)}
                accept="image/*"
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/restaurant-dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 