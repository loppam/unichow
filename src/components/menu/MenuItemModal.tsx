import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MenuItem, MenuCategory } from '../../types/menu';
import { X } from 'lucide-react';

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<MenuItem>) => Promise<void>;
  item: MenuItem | null;
  categories: MenuCategory[];
}

export default function MenuItemModal({
  isOpen,
  onClose,
  onSave,
  item,
  categories
}: MenuItemModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    available: true,
    preparationTime: 15,
    allergens: [],
    spicyLevel: 1,
    vegetarian: false,
    featured: false
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      resetForm();
    }
  }, [item]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: categories[0]?.id || '',
      available: true,
      preparationTime: 15,
      allergens: [],
      spicyLevel: 1,
      vegetarian: false,
      featured: false
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      await onSave({
        ...formData,
        price: Number(formData.price)
      });

      resetForm();
      onClose();
    } catch (err) {
      console.error('Error saving menu item:', err);
      setError('Failed to save menu item');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {item ? 'Edit Menu Item' : 'Add Menu Item'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="w-full p-2 border rounded-lg"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  required
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preparation Time (minutes)
                </label>
                <input
                  type="number"
                  value={formData.preparationTime}
                  onChange={e => setFormData(prev => ({ ...prev, preparationTime: Number(e.target.value) }))}
                  className="w-full p-2 border rounded-lg"
                  min="1"
                />
              </div>
            </div>

            {/* Additional Options */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spicy Level
                </label>
                <select
                  value={formData.spicyLevel}
                  onChange={e => setFormData(prev => ({ ...prev, spicyLevel: Number(e.target.value) as 1 | 2 | 3 }))}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value={1}>Mild</option>
                  <option value={2}>Medium</option>
                  <option value={3}>Hot</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allergens
                </label>
                <input
                  type="text"
                  value={formData.allergens?.join(', ')}
                  onChange={e => setFormData(prev => ({ 
                    ...prev, 
                    allergens: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g., nuts, dairy, gluten"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.available}
                  onChange={e => setFormData(prev => ({ ...prev, available: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Available</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.vegetarian}
                  onChange={e => setFormData(prev => ({ ...prev, vegetarian: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Vegetarian</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={e => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Featured</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 