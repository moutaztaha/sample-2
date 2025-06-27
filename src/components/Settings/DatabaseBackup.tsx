import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Save, 
  RotateCcw, 
  Trash2, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Calendar,
  HardDrive
} from 'lucide-react';
import { backupService } from '../../services/backupService';
import { useAuth } from '../../contexts/AuthContext';

interface Backup {
  name: string;
  size: string;
  time: string;
  date: string;
  timestamp: number;
}

const DatabaseBackup: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const { user } = useAuth();

  // Only admins can access this component
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadBackups();
    }
  }, [isAdmin]);

  const loadBackups = async () => {
    try {
      setLoading(true);
      setError('');
      const backupsList = await backupService.listBackups();
      setBackups(backupsList);
    } catch (error) {
      setError('Failed to load backups');
      console.error('Error loading backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await backupService.createBackup();
      await loadBackups();
      
      setSuccess('Backup created successfully');
    } catch (error) {
      setError('Failed to create backup');
      console.error('Error creating backup:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (backup: Backup) => {
    setSelectedBackup(backup);
    setShowConfirmRestore(true);
  };

  const confirmRestore = async () => {
    if (!selectedBackup) return;
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await backupService.restoreBackup(selectedBackup.name);
      
      setSuccess(`Database restored successfully from backup: ${selectedBackup.name}`);
      setShowConfirmRestore(false);
      setSelectedBackup(null);
    } catch (error) {
      setError('Failed to restore backup');
      console.error('Error restoring backup:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (backup: Backup) => {
    if (!confirm(`Are you sure you want to delete backup: ${backup.name}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await backupService.deleteBackup(backup.name);
      await loadBackups();
      
      setSuccess('Backup deleted successfully');
    } catch (error) {
      setError('Failed to delete backup');
      console.error('Error deleting backup:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async (backup: Backup) => {
    try {
      setLoading(true);
      setError('');
      
      await backupService.downloadBackup(backup.name);
    } catch (error) {
      setError('Failed to download backup');
      console.error('Error downloading backup:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Admin Access Required</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Database backup and restore operations are restricted to administrators only.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Database className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Database Backup & Restore</h2>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadBackups}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleCreateBackup}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            Create Backup
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {/* Backup Information */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex items-start">
          <HardDrive className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">About Database Backups</h3>
            <p className="text-sm text-blue-700 mt-1">
              The system automatically creates backups every 6 hours and keeps the 10 most recent backups.
              You can manually create backups, restore from a previous backup, or download backup files.
            </p>
            <p className="text-sm text-blue-700 mt-2">
              <strong>Note:</strong> Restoring from a backup will replace the current database with the selected backup.
              This action cannot be undone, so make sure to create a backup of the current state first.
            </p>
          </div>
        </div>
      </div>

      {/* Backups List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Available Backups</h3>
        </div>

        {loading && backups.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12">
            <Database className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No backups found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first backup to protect your data.
            </p>
            <button
              onClick={handleCreateBackup}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              Create Backup
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Backup Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map((backup) => (
                  <tr key={backup.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Database className="h-5 w-5 text-blue-500 mr-3" />
                        <div className="text-sm font-medium text-gray-900">
                          {backup.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        {new Date(backup.time).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {backup.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleRestoreBackup(backup)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Restore from this backup"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadBackup(backup)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                          title="Download backup file"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete backup"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {showConfirmRestore && selectedBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Confirm Restore</h2>
              </div>
              <button
                onClick={() => {
                  setShowConfirmRestore(false);
                  setSelectedBackup(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Warning: This action cannot be undone</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Restoring from a backup will replace the current database with the selected backup.
                      All changes made since this backup was created will be lost.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">Backup Details:</h3>
                <p className="mt-1 text-sm text-gray-600">
                  <strong>Name:</strong> {selectedBackup.name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Date:</strong> {new Date(selectedBackup.time).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Size:</strong> {selectedBackup.size}
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmRestore(false);
                    setSelectedBackup(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRestore}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Restoring...' : 'Confirm Restore'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseBackup;