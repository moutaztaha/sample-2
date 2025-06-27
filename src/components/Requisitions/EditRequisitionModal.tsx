import React, { useState, useEffect } from 'react';
import { X, ClipboardList, Save, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { requisitionService } from '../../services/requisitionService';
import { inventoryService } from '../../services/inventoryService';
import { masterDataService } from '../../services/masterDataService';

interface EditRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requisition: any;
}

interface RequisitionItem {
  item_id: number;
  item_name?: string;
  quantity: number;
  estimated_cost: number;
  notes: string;
}

const EditRequisitionModal: React.FC<EditRequisitionModalProps> = ({ isOpen, onClose, onSuccess, requisition }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    required_date: '',
    department: ''
  });

  const [items, setItems] = useState<RequisitionItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && requisition) {
      loadRequisitionData();
      loadInventoryItems();
      loadDepartments();
    }
  }, [isOpen, requisition]);

  const loadRequisitionData = async () => {
    try {
      const data = await requisitionService.getRequisition(requisition.id);
      
      setFormData({
        title: data.title || '',
        description: data.description || '',
        priority: data.priority || 'medium',
        required_date: data.required_date ? data.required_date.split('T')[0] : '',
        department: data.department || ''
      });

      if (data.items && data.items.length > 0) {
        setItems(data.items.map((item: any) => ({
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          estimated_cost: item.estimated_cost || 0,
          notes: item.notes || ''
        })));
      } else {
        setItems([{ item_id: 0, quantity: 1, estimated_cost: 0, notes: '' }]);
      }
    } catch (error) {
      console.error('Error loading requisition data:', error);
      setError('Failed to load requisition data');
    }
  };

  const loadInventoryItems = async () => {
    try {
      const response = await inventoryService.getItems({ limit: 1000 });
      setInventoryItems(response.items);
    } catch (error) {
      console.error('Error loading inventory items:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const departmentData = await masterDataService.getDepartments();
      setDepartments(departmentData);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const validItems = items.filter(item => item.item_id > 0 && item.quantity > 0);
      
      if (validItems.length === 0) {
        setError('Please add at least one item to the requisition');
        setLoading(false);
        return;
      }

      await requisitionService.updateRequisition(requisition.id, {
        ...formData,
        items: validItems
      });

      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update requisition');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index: number, field: keyof RequisitionItem, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-fill item name and estimated cost when item is selected
        if (field === 'item_id') {
          const selectedItem = inventoryItems.find(inv => inv.id === parseInt(value));
          if (selectedItem) {
            updatedItem.item_name = selectedItem.name;
            updatedItem.estimated_cost = selectedItem.unit_price || 0;
          }
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const addItem = () => {
    setItems(prev => [...prev, { item_id: 0, quantity: 1, estimated_cost: 0, notes: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const getTotalEstimatedCost = () => {
    return items.reduce((total, item) => total + (item.quantity * item.estimated_cost), 0);
  };

  const getStatusWarning = () => {
    if (!requisition) return null;
    
    const status = requisition.status;
    if (status === 'issued' || status === 'partially_issued') {
      return (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Warning: Editing {status === 'issued' ? 'Issued' : 'Partially Issued'} Requisition</p>
              <p className="mt-1">
                This requisition has already had items issued. Editing will not reverse any inventory changes that were made during item issuance. 
                You may need to manually adjust inventory if you change item quantities or remove items.
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    if (status === 'approved' || status === 'partially_approved') {
      return (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Note: Editing {status === 'approved' ? 'Approved' : 'Partially Approved'} Requisition</p>
              <p className="mt-1">
                This requisition has been approved. Making significant changes may require re-approval.
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  if (!isOpen || !requisition) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-4xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <ClipboardList className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Requisition</h2>
              <p className="text-sm text-gray-600">Status: {requisition.status}</p>
            </div>
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
            {/* Status Warning */}
            {getStatusWarning()}

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
                    placeholder="Enter requisition title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {departments.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No departments found. Please add departments in Master Data.
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
                    Required Date
                  </label>
                  <input
                    type="date"
                    name="required_date"
                    value={formData.required_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Requested Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Item *
                        </label>
                        <select
                          value={item.item_id}
                          onChange={(e) => handleItemChange(index, 'item_id', parseInt(e.target.value))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value={0}>Select Item</option>
                          {inventoryItems.map(invItem => (
                            <option key={invItem.id} value={invItem.id}>
                              {invItem.name} ({invItem.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          min="1"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Est. Cost ($)
                        </label>
                        <input
                          type="number"
                          value={item.estimated_cost}
                          onChange={(e) => handleItemChange(index, 'estimated_cost', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="flex items-end">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="w-full px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4 mx-auto" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Additional notes for this item"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Cost */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Total Estimated Cost:</span>
                  <span className="text-xl font-bold text-blue-600">${getTotalEstimatedCost().toFixed(2)}</span>
                </div>
              </div>
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
            {loading ? 'Updating...' : 'Update Requisition'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditRequisitionModal;