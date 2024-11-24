import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { restaurantService } from '../services/restaurantService';
import { toast } from 'react-hot-toast';
import { RestaurantStatus } from '../types/restaurant';
import { Address } from '../types/order';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface RestaurantProfile {
  id: string;
  restaurantName: string;
  description: string;
  cuisine: string[];
  address: Address;
  phone: string;
  email: string;
  openingHours: string;
  closingHours: string;
  minimumOrder: number;
  profileComplete: boolean;
  status: RestaurantStatus;
  isApproved: boolean;
  rating: number;
  totalOrders: number;
  logo?: string;
  bannerImage?: string;
  createdAt: string;
  updatedAt: string;
  lastUpdated?: string;
}

export default function RestaurantProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<RestaurantProfile>({
    id: '',
    restaurantName: '',
    description: '',
    cuisine: [],
    address: {
      address: '',
      additionalInstructions: ''
    },
    phone: '',
    email: '',
    openingHours: '',
    closingHours: '',
    minimumOrder: 0,
    profileComplete: false,
    status: 'pending',
    isApproved: false,
    rating: 0,
    totalOrders: 0,
    createdAt: '',
    updatedAt: ''
  });

  useEffect(() => {
    if (!user) {
      toast.error('Please login to access this page');
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user?.uid) {
      toast.error('Authentication required');
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const restaurantData = await restaurantService.getRestaurantProfile(user.uid);
      if (restaurantData) {
        setProfile(prev => ({
          ...prev,
          ...restaurantData
        }));
      }
    } catch (err) {
      toast.error('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      toast.error('Authentication required');
      navigate('/login');
      return;
    }

    setSaving(true);
    const formElement = e.target as HTMLFormElement;
    const formData = new FormData(formElement);

    try {
      // Validate required fields
      const requiredFields = ['restaurantName', 'description', 'address', 'phone'] as const;
      const missingFields = requiredFields.filter(field => !formData.get(field));
      
      if (missingFields.length > 0) {
        throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      }

      const logoFile = formData.get('logo') as File;
      const bannerFile = formData.get('banner') as File;

      await restaurantService.updateProfile(
        user.uid,
        {
          ...profile,
          restaurantName: formData.get('restaurantName') as string,
          description: formData.get('description') as string,
          address: {
            address: formData.get('address') as string,
            additionalInstructions: formData.get('addressInstructions') as string
          },
          phone: formData.get('phone') as string,
          openingHours: formData.get('openingHours') as string,
          closingHours: formData.get('closingHours') as string,
          minimumOrder: Number(formData.get('minimumOrder')),
          profileComplete: true,
          lastUpdated: new Date().toISOString()
        },
        { logo: logoFile, banner: bannerFile }
      );

      // Check if payment info is set up
      const restaurantDoc = await getDoc(doc(db, 'restaurants', user.uid));
      const restaurantData = restaurantDoc.data();

      if (!restaurantData?.paymentInfo?.isVerified) {
        toast.success('Profile updated successfully. Please set up your payment information to start receiving orders.', {
          duration: 5000,
          icon: '💳'
        });
        navigate('/restaurant-settings?section=payment');
      } else {
        toast.success('Profile updated successfully');
        navigate('/restaurant-dashboard');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Restaurant Profile</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Restaurant Name"
              name="restaurantName"
              value={profile.restaurantName}
              onChange={(value) => setProfile(p => ({ ...p, restaurantName: value }))}
              required
            />

            <FormField
              label="Phone Number"
              name="phone"
              type="tel"
              value={profile.phone}
              onChange={(value) => setProfile(p => ({ ...p, phone: value }))}
              required
            />

            <div className="md:col-span-2">
              <FormField
                label="Description"
                name="description"
                type="textarea"
                value={profile.description}
                onChange={(value) => setProfile(p => ({ ...p, description: value }))}
                required
              />
            </div>

            <div className="md:col-span-2">
              <div className="space-y-4">
                <FormField
                  label="Address"
                  name="address"
                  value={profile.address.address}
                  onChange={(value) => setProfile(p => ({ 
                    ...p, 
                    address: { ...p.address, address: value }
                  }))}
                  required
                />
                <FormField
                  label="Additional Instructions"
                  name="addressInstructions"
                  value={profile.address.additionalInstructions || ''}
                  onChange={(value) => setProfile(p => ({ 
                    ...p, 
                    address: { ...p.address, additionalInstructions: value }
                  }))}
                />
              </div>
            </div>

            <FormField
              label="Opening Hours"
              name="openingHours"
              type="time"
              value={profile.openingHours}
              onChange={(value) => setProfile(p => ({ ...p, openingHours: value }))}
              required
            />

            <FormField
              label="Closing Hours"
              name="closingHours"
              type="time"
              value={profile.closingHours}
              onChange={(value) => setProfile(p => ({ ...p, closingHours: value }))}
              required
            />

            <FormField
              label="Minimum Order (₦)"
              name="minimumOrder"
              type="number"
              value={profile.minimumOrder.toString()}
              onChange={(value) => setProfile(p => ({ ...p, minimumOrder: Number(value) }))}
              min="0"
              step="100"
            />

            <ImageUploadField
              label="Logo"
              name="logo"
              currentImage={profile.logo}
            />

            <ImageUploadField
              label="Banner Image"
              name="banner"
              currentImage={profile.bannerImage}
            />
          </div>

          <FormActions
            onCancel={() => navigate('/restaurant-dashboard')}
            saving={saving}
          />
        </form>
      </div>
    </div>
  );
}

// Utility Components
const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
  </div>
);

const FormField = ({ 
  label, 
  name, 
  type = 'text', 
  value, 
  onChange,
  required = false,
  ...props 
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  [key: string]: any;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && '*'}
    </label>
    {type === 'textarea' ? (
      <textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border rounded-lg"
        rows={4}
        required={required}
        {...props}
      />
    ) : (
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border rounded-lg"
        required={required}
        {...props}
      />
    )}
  </div>
);

const ImageUploadField = ({ 
  label, 
  name, 
  currentImage 
}: {
  label: string;
  name: string;
  currentImage?: string;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
    {currentImage && (
      <img
        src={currentImage}
        alt={label}
        className="w-20 h-20 object-cover rounded-lg mb-2"
      />
    )}
    <input
      type="file"
      name={name}
      accept="image/*"
      className="w-full p-2 border rounded-lg"
    />
  </div>
);

const FormActions = ({ 
  onCancel, 
  saving 
}: {
  onCancel: () => void;
  saving: boolean;
}) => (
  <div className="flex justify-end space-x-4">
    <button
      type="button"
      onClick={onCancel}
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
); 