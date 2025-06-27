import React, { useState, useEffect } from 'react';
import { X, Factory, Save, Calendar } from 'lucide-react';
import { productionOrderService } from '../../services/productionService';
import { bomService } from '../../services/bomService';

interface CreateProductionOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateProductionOrderModal: React.FC<CreateProductionOrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bom_id: '',
    quantity: 1,
    priority: 'medium',
    start_date: '',
    due_date: '',
    notes: ''
  });

  const [boms, setBoms] = useState<any[]>([]);
  const [selectedBom, setSelectedBom] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadBOMs();
    }
  }, [isOpen]);

  const loadBOMs = async () => {
    try {
      const response = await bomService.getBOMs({ status: 'active', limit: 100 });
      setBoms(response.boms || []);
    } catch (error) {
      console.error('Error loading BOMs:', error);
      setError('Failed to load BOMs');
    }
  };

  const handleBOMChange = async (bomId: string) => {
    if (!bomId) {
      setSelectedBom(null);
      return;
    }

    try {
      const bom = await bomService.getBOM(parseInt(bomId));
      setSelectedBom(bom);
      
      // Update form title if empty
      if (!formData.title.trim()) {
        setFormData(prev => ({
          ...prev,
          title: `Production: ${bom.name}`
        }));
      }
    } catch (error) {
      console.error('Error loading BOM details:', error);
      setError('Failed to load BOM details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.bom_id) {
        setError('Please select a BOM');
        setLoading(false);
        return;
      }

      if (formData.quantity <= 0) {
        setError('Quantity must be greater than zero');
        setLoading(false);
        return;
      }

      await productionOrderService.createProductionOrder({
        ...formData,
        bom_id: parseInt(formData.bom_id),
        quantity: parseInt(formData.quantity.toString())
      });

      onSuccess();
      resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create production order');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      bom_id: '',
      quantity: 1,
      priority: 'medium',
      start_date: '',
      due_date: '',
      notes: ''
    });
    setSelectedBom(null);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'bom_id') {
      handleBOMChange(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Calculate estimated cost based on BOM and quantity
  const getEstimatedCost = () => {
    if (!selectedBom || !formData.quantity) return 0;
    return selectedBom.total_cost * formData.quantity;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-4xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <Factory className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Create Production Order</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter production order title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bill of Materials (BOM) *
                  </label>
                  <select
                    name="bom_id"
                    value={formData.bom_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select BOM</option>
                    {boms.map(bom => (
                      <option key={bom.id} value={bom.id}>
                        {bom.name} (v{bom.version})
                      </option>
                    ))}
                  </select>
                  {boms.length === 0 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      No active BOMs found. Please create and activate a BOM first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter description"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Production Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity to Produce *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BOM Preview */}
            {selectedBom && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">BOM Summary</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">BOM Name:</span> {selectedBom.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Version:</span> {selectedBom.version}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Components:</span> {selectedBom.components?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Operations:</span> {selectedBom.operations?.length || 0}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Unit Cost:</span> ${selectedBom.total_cost?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Finished Product:</span> {selectedBom.finished_product_name || 'Not specified'}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-800">Estimated Production Cost:</span>
                    <span className="text-lg font-bold text-blue-800">${getEstimatedCost().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes for this production order"
              />
            </div>

            {/* Add some bottom padding for mobile */}
            <div className="h-4 sm:hidden"></div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Creating...' : 'Create Production Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProductionOrderModal;