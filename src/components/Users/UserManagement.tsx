import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, User, RefreshCw, Columns, Settings } from 'lucide-react';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';
import PermissionManager from './PermissionManager';
import UserPermissionsModal from './UserPermissionsModal';
import ColumnCustomizerModal, { Column } from '../Common/ColumnCustomizer';
import { useColumnPreferences } from '../../hooks/useColumnPreferences';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'user', label: 'User', visible: true, width: 200, order: 1 },
  { id: 'role', label: 'Role', visible: true, width: 120, order: 2 },
  { id: 'created', label: 'Created', visible: true, width: 150, order: 3 },
  { id: 'updated', label: 'Last Updated', visible: true, width: 150, order: 4 },
  { id: 'actions', label: 'Actions', visible: true, width: 150, order: 5 }
];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showUserPermissionsModal, setShowUserPermissionsModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<{id: number, username: string, role: string} | null>(null);
  const { user: currentUser, hasPermission } = useAuth();

  const { 
    columns, 
    visibleColumns, 
    showColumnCustomizer, 
    setShowColumnCustomizer, 
    handleSaveColumnPreferences 
  } = useColumnPreferences('user_management_columns', DEFAULT_COLUMNS);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await userService.getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (currentUser?.id === id) {
      alert('You cannot delete your own account');
      return;
    }

    if (confirm(`Are you sure you want to delete user "${username}"?`)) {
      try {
        await userService.deleteUser(id);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete user');
      }
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleManagePermissions = () => {
    setShowPermissionModal(true);
  };

  const handleManageUserPermissions = (userId: number, username: string, role: string) => {
    setSelectedUser({ id: parseInt(userId.toString()), username, role });
    setShowUserPermissionsModal(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'manager':
        return <Users className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const adminCount = users.filter(u => u.role === 'admin').length;
  const managerCount = users.filter(u => u.role === 'manager').length;
  const userCount = users.filter(u => u.role === 'user').length;
  const customRolesCount = users.filter(u => !['admin', 'manager', 'user'].includes(u.role)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage system users and their permissions</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowColumnCustomizer(true)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Columns className="h-4 w-4 mr-2" />
            Columns
          </button>
          <button
            onClick={fetchUsers}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          {hasPermission('user.manage_permissions') && (
            <button
              onClick={handleManagePermissions}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Shield className="h-4 w-4 mr-2" />
              Manage Roles & Permissions
            </button>
          )}
          {hasPermission('user.create') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Administrators</p>
              <p className="text-2xl font-bold text-gray-900">{adminCount}</p>
            </div>
            <Shield className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Managers</p>
              <p className="text-2xl font-bold text-gray-900">{managerCount}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Regular Users</p>
              <p className="text-2xl font-bold text-gray-900">{userCount + customRolesCount}</p>
            </div>
            <User className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {visibleColumns.map(column => (
                  <th 
                    key={column.id} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  {visibleColumns.map(column => {
                    switch (column.id) {
                      case 'user':
                        return (
                          <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.username}
                                {currentUser?.id === user.id && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                        );
                      case 'role':
                        return (
                          <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getRoleIcon(user.role)}
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                {user.role}
                              </span>
                            </div>
                          </td>
                        );
                      case 'created':
                        return (
                          <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        );
                      case 'updated':
                        return (
                          <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(user.updated_at).toLocaleDateString()}
                          </td>
                        );
                      case 'actions':
                        return (
                          <td key={column.id} className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              {hasPermission('user.manage_permissions') && (
                                <button
                                  onClick={() => handleManageUserPermissions(user.id, user.username, user.role)}
                                  className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                                  title="Manage User Permissions"
                                >
                                  <Settings className="h-4 w-4" />
                                </button>
                              )}
                              {hasPermission('user.edit') && (
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                  title="Edit User"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}
                              {hasPermission('user.delete') && (
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.username)}
                                  disabled={currentUser?.id === user.id}
                                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={currentUser?.id === user.id ? "You can't delete your own account" : "Delete User"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      default:
                        return <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>;
                    }
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first user.
            </p>
            {hasPermission('user.create') && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First User
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {hasPermission('user.create') && (
        <AddUserModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onUserAdded={fetchUsers}
        />
      )}

      {hasPermission('user.edit') && (
        <EditUserModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
          onUserUpdated={fetchUsers}
          user={editingUser}
          onManagePermissions={handleManageUserPermissions}
        />
      )}

      {hasPermission('user.manage_permissions') && (
        <PermissionManager
          isOpen={showPermissionModal}
          onClose={() => setShowPermissionModal(false)}
          onSuccess={fetchUsers}
        />
      )}

      {hasPermission('user.manage_permissions') && selectedUser && (
        <UserPermissionsModal
          isOpen={showUserPermissionsModal}
          onClose={() => {
            setShowUserPermissionsModal(false);
            setSelectedUser(null);
          }}
          onSuccess={fetchUsers}
          userId={selectedUser.id}
          username={selectedUser.username}
          userRole={selectedUser.role}
        />
      )}

      <ColumnCustomizerModal
        isOpen={showColumnCustomizer}
        onClose={() => setShowColumnCustomizer(false)}
        onSave={handleSaveColumnPreferences}
        columns={columns}
        title="Customize User Management Columns"
      />
    </div>
  );
};

export default UserManagement;