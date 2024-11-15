import React, { useState } from 'react';
import { MenuCategory } from '../../types/menu';
import Modal from '../common/Modal';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: MenuCategory) => Promise<void>;
  category: MenuCategory | null;
}

export default function CategoryModal({
  isOpen,
  onClose,
  onSave,
  category
}: CategoryModalProps) {
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      id: category?.id || crypto.randomUUID(),
      name,
      description,
      order: category?.order ?? 0
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-semibold">
          {category ? 'Edit Category' : 'Add Category'}
        </h2>
        
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Explain what types of items belong in this category..."
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
} 