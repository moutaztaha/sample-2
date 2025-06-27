import React, { useState, useEffect } from 'react';
import { X, User, Save, Info, AlertTriangle, Settings } from 'lucide-react';
import { userService } from '../../services/userService';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  user: any;
  onManagePermissions: (userId: number, username: string, role: string) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ 
  isOpen, 
  onClose, 
  onUserUpdated, 
  user,
  onManagePermissions
}) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'user',
    password: ''
  });

  const [availableRoles, setAvailableRoles] = useState<string[]>(['admin', 'manager', 'user']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRoles();
    }
  }, [isOpen]);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        role: user.role || 'user',
        password: ''
      });
    }
  }, [user]);

  const loadRoles = async () => {
    try {
      const roles = await userService.getRoles();
      console.log("Available roles for edit:", roles);
      if (Array.isArray(roles) && roles.length > 0) {
        setAvailableRoles(roles);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPasswordErrors([]);

    try {
      await userService.updateUser(user.id, formData);
      onUserUpdated();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
        
        // Check if the error contains password validation details
        try {
          const errorObj = JSON.parse(error.message);
          if (errorObj.details && Array.isArray(errorObj.details)) {
            setPasswordErrors(errorObj.details);
          }
        } catch (e) {
          // Not a JSON error, just use the error message as is
        }
      } else {
        setError('Failed to update user');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <User className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {passwordErrors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">Password requirements not met:</p>
                  <ul className="list-disc list-inside mt-1">
                    {passwordErrors.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter username"
            />
            <p className="text-xs text-gray-500 mt-1">
              3-30 characters, letters, numbers, underscores, and hyphens only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <button 
                type="button" 
                onClick={() => setShowPasswordInfo(!showPasswordInfo)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                <Info className="h-3 w-3 mr-1" />
                Password Requirements
              </button>
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Leave blank to keep current password"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to keep the current password
            </p>
          </div>

          {showPasswordInfo && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-xs">
              <div className="font-medium mb-1">Password must:</div>
              <ul className="list-disc list-inside space-y-1">
                <li>Be at least 8 characters long</li>
                <li>Include at least one uppercase letter</li>
                <li>Include at least one lowercase letter</li>
                <li>Include at least one number</li>
                <li>Include at least one special character</li>
              </ul>
            </div>
          )}

          <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => onManagePermissions(user.id, user.username, user.role)}
              className="flex items-center px-4 py-2 text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Permissions
            </button>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;