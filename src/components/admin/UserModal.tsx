import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PERMISSIONS, Permission, ROLE_PERMISSIONS } from '../../types/permissions';
import { ROLES, UserRole } from '../../constants/roles';
import { AdminUser } from '../../services/adminUserService';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onSubmit: {
    (userId: string, data: Partial<AdminUser>): Promise<void>;
    (data: Omit<AdminUser, 'id' | 'createdAt'> & { password: string }): Promise<void>;
  };
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  role: AdminUser['role'];
  status: AdminUser['status'];
  permissions: Permission[];
  password: string;
}

export default function UserModal({
  isOpen,
  onClose,
  user,
  onSubmit
}: UserModalProps) {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    role: ROLES.ADMIN,
    status: 'active',
    permissions: [],
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
        permissions: user.permissions as Permission[],
        password: ''
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: ROLES.ADMIN,
        status: 'active',
        permissions: ROLE_PERMISSIONS[ROLES.ADMIN] || [],
        password: ''
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (user) {
        await onSubmit(user.id, formData);
      } else {
        const newUserData = {
          ...formData,
          isAdmin: formData.role === ROLES.ADMIN || formData.role === ROLES.SUPERADMIN
        };
        await onSubmit(newUserData);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: AdminUser['role']) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: ROLE_PERMISSIONS[role] || []
    }));
  };

  const handlePermissionToggle = (permission: Permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {user ? 'Edit User' : 'Create User'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                required={!user}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="w-full p-2 border rounded-lg"
                required
              >
                <option value={ROLES.ADMIN}>Admin</option>
                <option value={ROLES.SUPERADMIN}>Super Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as AdminUser['status'] }))}
                className="w-full p-2 border rounded-lg"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(PERMISSIONS).map(([key, value]) => (
                  <label key={value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(value as Permission)}
                      onChange={() => handlePermissionToggle(value as Permission)}
                      className="rounded text-black focus:ring-black"
                    />
                    <span className="text-sm">{key.toLowerCase().replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

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
                {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 