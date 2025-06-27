import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Ruler, RefreshCw } from 'lucide-react';
import { masterDataService } from '../../services/masterDataService';
import UnitModal from './UnitModal';

interface Unit {
  id: number;
  name: string;
  abbreviation: string;
  item_count: number;
  created_at: string;
}

const UnitsTab: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const data = await masterDataService.getUnits();
      setUnits(data);
    } catch (error) {
      console.error('Error fetching units:', error);
      alert('Failed to fetch units');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete unit "${name}"?`)) {
      try {
        await masterDataService.deleteUnit(id);
        fetchUnits();
      } catch (error) {
        console.error('Error deleting unit:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete unit');
      }
    }
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingUnit(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingUnit(null);
  };

  const handleModalSuccess = () => {
    fetchUnits();
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
          <h2 className="text-lg font-semibold text-gray-900">Units of Measurement</h2>
          <p className="text-sm text-gray-600">Manage measurement units for inventory items</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchUnits}
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
            Add Unit
          </button>
        </div>
      </div>

      {/* Units Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abbreviation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items Using
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
              {units.map((unit) => (
                <tr key={unit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Ruler className="h-5 w-5 text-purple-500 mr-3" />
                      <div className="text-sm font-medium text-gray-900">{unit.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {unit.abbreviation}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {unit.item_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(unit.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(unit)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(unit.id, unit.name)}
                        disabled={unit.item_count > 0}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={unit.item_count > 0 ? 'Cannot delete unit with existing items' : 'Delete unit'}
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

        {units.length === 0 && (
          <div className="text-center py-12">
            <Ruler className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No units found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first measurement unit.
            </p>
            <button
              onClick={handleAdd}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Unit
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <UnitModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        unit={editingUnit}
      />
    </div>
  );
};

export default UnitsTab;