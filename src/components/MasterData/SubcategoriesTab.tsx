import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, RefreshCw } from 'lucide-react';
import { masterDataService } from '../../services/masterDataService';
import { inventoryService } from '../../services/inventoryService';
import SubcategoryModal from './SubcategoryModal';

interface Subcategory {
  id: number;
  name: string;
  description: string;
  category_id: number;
  category_name: string;
  item_count: number;
  created_at: string;
}

const SubcategoriesTab: React.FC = () => {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);

  useEffect(() => {
    fetchSubcategories();
  }, []);

  const fetchSubcategories = async () => {
    try {
      setLoading(true);
      const data = await masterDataService.getSubcategories();
      setSubcategories(data);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      alert('Failed to fetch subcategories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete subcategory "${name}"?`)) {
      try {
        await masterDataService.deleteSubcategory(id);
        fetchSubcategories();
      } catch (error) {
        console.error('Error deleting subcategory:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete subcategory');
      }
    }
  };

  const handleEdit = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingSubcategory(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingSubcategory(null);
  };

  const handleModalSuccess = () => {
    fetchSubcategories();
    handleModalClose();
  };

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
          <h2 className="text-lg font-semibold text-gray-900">Subcategories</h2>
          <p className="text-sm text-gray-600">Manage inventory subcategories</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchSubcategories}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Subcategory
          </button>
        </div>
      </div>

      {/* Subcategories Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subcategory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parent Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subcategories.map((subcategory) => (
                <tr key={subcategory.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-green-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{subcategory.name}</div>
                        <div className="text-sm text-gray-500">{subcategory.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {subcategory.category_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {subcategory.item_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(subcategory.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(subcategory)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(subcategory.id, subcategory.name)}
                        disabled={subcategory.item_count > 0}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={subcategory.item_count > 0 ? 'Cannot delete subcategory with existing items' : 'Delete subcategory'}
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

        {subcategories.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No subcategories found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first subcategory.
            </p>
            <button
              onClick={handleAdd}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Subcategory
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <SubcategoryModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        subcategory={editingSubcategory}
      />
    </div>
  );
};

export default SubcategoriesTab;