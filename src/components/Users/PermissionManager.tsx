import React, { useState, useEffect } from 'react';
import { X, Save, Shield, Search, Check, RefreshCw, Plus, Trash2, Columns } from 'lucide-react';
import { userService } from '../../services/userService';

interface PermissionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Permission {
  id: number;
  name: string;
  description: string;
}

interface RolePermissions {
  role: string;
  permissions: string[];
}

interface ColumnVisibility {
  id: string;
  label: string;
  visible: boolean;
}

const PermissionManager: React.FC<PermissionManagerProps> = ({ isOpen, onClose, onSuccess }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newRoleName, setNewRoleName] = useState('');
  const [showAddRole, setShowAddRole] = useState(false);
  const [addRoleError, setAddRoleError] = useState('');
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility[]>([
    { id: 'permission', label: 'Permission', visible: true },
    { id: 'description', label: 'Description', visible: true }
  ]);

  useEffect(() => {
    if (isOpen) {
      loadPermissions();
      loadRolePermissions();
    }
  }, [isOpen]);

  // Update column visibility when roles change
  useEffect(() => {
    // Keep permission and description columns
    const baseColumns: ColumnVisibility[] = [
      { id: 'permission', label: 'Permission', visible: true },
      { id: 'description', label: 'Description', visible: true }
    ];
    
    // Add role columns
    const roleColumns = rolePermissions.map(rp => ({
      id: rp.role,
      label: rp.role.charAt(0).toUpperCase() + rp.role.slice(1),
      visible: true
    }));
    
    // Merge with existing visibility settings
    const newColumnVisibility = [...baseColumns, ...roleColumns].map(newCol => {
      const existingCol = columnVisibility.find(col => col.id === newCol.id);
      return existingCol ? { ...newCol, visible: existingCol.visible } : newCol;
    });
    
    setColumnVisibility(newColumnVisibility);
  }, [rolePermissions]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await userService.getPermissions();
      setPermissions(data);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setError('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await userService.getRolePermissions();
      console.log('Loaded role permissions:', data);
      setRolePermissions(data);
    } catch (error) {
      console.error('Error loading role permissions:', error);
      setError('Failed to load role permissions');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (role: string, permissionName: string) => {
    setRolePermissions(prev => 
      prev.map(rp => {
        if (rp.role === role) {
          const hasPermission = rp.permissions.includes(permissionName);
          return {
            ...rp,
            permissions: hasPermission
              ? rp.permissions.filter(p => p !== permissionName)
              : [...rp.permissions, permissionName]
          };
        }
        return rp;
      })
    );
  };

  const handleSavePermissions = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await userService.updateRolePermissions(rolePermissions);
      
      setSuccess('Permissions updated successfully');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error saving permissions:', error);
      setError(error instanceof Error ? error.message : 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = async () => {
    try {
      setAddRoleError('');
      
      if (!newRoleName.trim()) {
        setAddRoleError('Role name is required');
        return;
      }
      
      // Check if role already exists
      if (rolePermissions.some(rp => rp.role.toLowerCase() === newRoleName.toLowerCase())) {
        setAddRoleError('Role already exists');
        return;
      }
      
      // Create new role
      await userService.createRole(newRoleName);
      
      // Reload role permissions to ensure we have the latest data
      await loadRolePermissions();
      
      // Reset form
      setNewRoleName('');
      setShowAddRole(false);
      
      // Show success message
      setSuccess(`Role "${newRoleName}" created successfully`);
    } catch (error) {
      console.error('Error adding role:', error);
      setAddRoleError(error instanceof Error ? error.message : 'Failed to add role');
    }
  };

  const handleDeleteRole = async (role: string) => {
    try {
      // Don't allow deleting built-in roles
      if (['admin', 'manager', 'user'].includes(role)) {
        setError('Cannot delete built-in roles');
        return;
      }
      
      if (!confirm(`Are you sure you want to delete the role "${role}"?`)) {
        return;
      }
      
      await userService.deleteRole(role);
      
      // Remove role from local state
      setRolePermissions(prev => prev.filter(rp => rp.role !== role));
      
      // Show success message
      setSuccess(`Role "${role}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting role:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete role');
    }
  };

  const toggleColumnVisibility = (columnId: string) => {
    setColumnVisibility(prev => 
      prev.map(col => col.id === columnId ? { ...col, visible: !col.visible } : col)
    );
  };

  // Get unique permission categories (first part of the permission name before the dot)
  const permissionCategories = Array.from(
    new Set(permissions.map(p => p.name.split('.')[0]))
  ).sort();

  // Filter permissions based on search and category
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = searchTerm === '' || 
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      permission.name.startsWith(`${selectedCategory}.`);
    
    return matchesSearch && matchesCategory;
  });

  // Group permissions by category for display
  const groupedPermissions = filteredPermissions.reduce((groups, permission) => {
    const category = permission.name.split('.')[0];
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(permission);
    return groups;
  }, {} as Record<string, Permission[]>);

  // Get visible columns
  const visibleColumns = columnVisibility.filter(col => col.visible);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-6xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Permission Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Filters and Actions */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {permissionCategories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowColumnSelector(true)}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Columns className="h-4 w-4 mr-2" />
                Columns
              </button>
              <button
                onClick={() => {
                  loadPermissions();
                  loadRolePermissions();
                }}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}
        </div>

        {/* Role Management */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Roles</h3>
            <button
              onClick={() => setShowAddRole(!showAddRole)}
              className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </button>
          </div>

          {showAddRole && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Create New Role</h4>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Enter role name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddRole}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Create Role
                </button>
              </div>
              {addRoleError && (
                <p className="mt-2 text-sm text-red-600">{addRoleError}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Note: New roles will have no permissions by default. You'll need to assign permissions after creation.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {rolePermissions.map(rp => (
              <div key={rp.role} className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                <span className="text-sm font-medium text-gray-700">{rp.role}</span>
                {!['admin', 'manager', 'user'].includes(rp.role) && (
                  <button
                    onClick={() => handleDeleteRole(rp.role)}
                    className="ml-2 text-red-500 hover:text-red-700"
                    title="Delete role"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {visibleColumns.map(column => (
                        <th 
                          key={column.id} 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(groupedPermissions).map(([category, perms]) => (
                      <React.Fragment key={category}>
                        <tr className="bg-gray-50">
                          <td colSpan={visibleColumns.length} className="px-6 py-3">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase">
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </h3>
                          </td>
                        </tr>
                        {perms.map(permission => (
                          <tr key={permission.id} className="hover:bg-gray-50">
                            {visibleColumns.map(column => {
                              if (column.id === 'permission') {
                                return (
                                  <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {permission.name}
                                  </td>
                                );
                              } else if (column.id === 'description') {
                                return (
                                  <td key={column.id} className="px-6 py-4 text-sm text-gray-500">
                                    {permission.description}
                                  </td>
                                );
                              } else {
                                // This is a role column
                                const role = column.id;
                                const roleData = rolePermissions.find(rp => rp.role === role);
                                const hasPermission = roleData?.permissions.includes(permission.name) || false;
                                
                                return (
                                  <td key={column.id} className="px-6 py-4 whitespace-nowrap text-center">
                                    <button
                                      onClick={() => handlePermissionToggle(role, permission.name)}
                                      className={`w-6 h-6 rounded-md flex items-center justify-center ${
                                        hasPermission 
                                          ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                      }`}
                                      disabled={role === 'admin'} // Admin always has all permissions
                                      title={role === 'admin' ? 'Admins always have all permissions' : ''}
                                    >
                                      {hasPermission && <Check className="w-4 h-4" />}
                                    </button>
                                  </td>
                                );
                              }
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSavePermissions}
              disabled={saving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Column Selector Modal */}
        {showColumnSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center">
                  <Columns className="h-6 w-6 text-blue-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Customize Columns</h2>
                </div>
                <button
                  onClick={() => setShowColumnSelector(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-gray-600 mb-4">
                  Select which columns to display in the permissions table.
                </p>

                <div className="space-y-3">
                  {columnVisibility.map(column => (
                    <div key={column.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`column-${column.id}`}
                          checked={column.visible}
                          onChange={() => toggleColumnVisibility(column.id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor={`column-${column.id}`} className="ml-2 text-sm font-medium text-gray-700">
                          {column.label}
                        </label>
                      </div>
                      
                      {/* Disable toggling for required columns */}
                      {(column.id === 'permission') && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Required</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowColumnSelector(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionManager;