import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Save, Package } from 'lucide-react';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { requisitionService } from '../../services/requisitionService';
import { masterDataService } from '../../services/masterDataService';

interface CreateFromRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateFromRequisitionModal: React.FC<CreateFromRequisitionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    requisition_id: '',
    title: '',
    description: '',
    supplier_id: '',
    priority: 'medium',
    expected_delivery_date: ''
  });

  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedRequisition, setSelectedRequisition] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
    }
  }, [isOpen]);

  const loadDropdownData = async () => {
    try {
      // Get approved requisitions
      const requisitionsResponse = await requisitionService.getRequisitions({
        status: 'approved,partially_approved',
        limit: 100
      });
      
      setRequisitions(requisitionsResponse.requisitions || []);
      
      // Get suppliers
      const suppliersData = await masterDataService.getSuppliers();
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      setError('Failed to load form data');
    }
  };

  const handleRequisitionChange = async (requisitionId: string) => {
    if (!requisitionId) {
      setSelectedRequisition(null);
      return;
    }

    try {
      const requisition = await requisitionService.getRequisition(parseInt(requisitionId));
      setSelectedRequisition(requisition);
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        requisition_id: requisitionId,
        title: `PO for Requisition: ${requisition.title}`,
        description: `Purchase order created from requisition: ${requisition.title}`,
        priority: requisition.priority || 'medium'
      }));
    } catch (error) {
      console.error('Error loading requisition details:', error);
      setError('Failed to load requisition details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.supplier_id) {
        setError('Please select a supplier');
        setLoading(false);
        return;
      }

      if (!formData.requisition_id) {
        setError('Please select a requisition');
        setLoading(false);
        return;
      }

      // Prepare data with proper null handling for dates
      const submitData = {
        supplier_id: parseInt(formData.supplier_id),
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        expected_delivery_date: formData.expected_delivery_date || null
      };

      await purchaseOrderService.createFromRequisition(
        parseInt(formData.requisition_id),
        submitData
      );

      onSuccess();
      resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      requisition_id: '',
      title: '',
      description: '',
      supplier_id: '',
      priority: 'medium',
      expected_delivery_date: ''
    });
    setSelectedRequisition(null);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'requisition_id') {
      handleRequisitionChange(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-4xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-green-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Create PO from Requisition</h2>
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

            {/* Select Requisition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Requisition *
              </label>
              <select
                name="requisition_id"
                value={formData.requisition_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Requisition</option>
                {requisitions.map(req => (
                  <option key={req.id} value={req.id}>
                    {req.title} - {req.requester_name} ({req.status})
                  </option>
                ))}
              </select>
              {requisitions.length === 0 && (
                <p className="text-sm text-yellow-600 mt-2">
                  No approved requisitions found. Approve requisitions first to create purchase orders from them.
                </p>
              )}
            </div>

            {/* Requisition Details */}
            {selectedRequisition && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Requisition Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><span className="font-medium">Title:</span> {selectedRequisition.title}</p>
                    <p><span className="font-medium">Requester:</span> {selectedRequisition.requester_name}</p>
                    <p><span className="font-medium">Department:</span> {selectedRequisition.department || 'N/A'}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Status:</span> {selectedRequisition.status}</p>
                    <p><span className="font-medium">Priority:</span> {selectedRequisition.priority}</p>
                    <p><span className="font-medium">Items:</span> {selectedRequisition.items?.length || 0} items</p>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">PO Information</h3>
                
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
                    placeholder="Enter PO title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier *
                  </label>
                  <select
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
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
                <h3 className="text-lg font-medium text-gray-900">Details</h3>
                
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    name="expected_delivery_date"
                    value={formData.expected_delivery_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Items Preview */}
            {selectedRequisition && selectedRequisition.items && selectedRequisition.items.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Items to Order</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Approved Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estimated Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedRequisition.items
                        .filter((item: any) => item.approved_quantity > 0)
                        .map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                                <div className="text-sm text-gray-500">{item.category_name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.sku}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.approved_quantity} {item.unit_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${item.current_unit_price?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${((item.approved_quantity || 0) * (item.current_unit_price || 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Estimate */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Estimated Total:</span>
                    <span className="text-xl font-bold text-blue-600">
                      ${selectedRequisition.items
                        .filter((item: any) => item.approved_quantity > 0)
                        .reduce((total: number, item: any) => 
                          total + ((item.approved_quantity || 0) * (item.current_unit_price || 0)), 0
                        ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

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
            disabled={loading || !selectedRequisition || !formData.supplier_id}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <ShoppingCart className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Creating...' : 'Create Purchase Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateFromRequisitionModal;