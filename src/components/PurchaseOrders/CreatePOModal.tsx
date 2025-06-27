import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Save, Plus, Trash2 } from 'lucide-react';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { inventoryService } from '../../services/inventoryService';
import { masterDataService } from '../../services/masterDataService';
import { POFormFields, POItemsSection } from './POFormComponents';

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface POItem {
  item_id: number;
  item_name: string;
  item_description: string;
  sku: string;
  quantity: number;
  unit_price: number;
  unit_id: number;
  notes: string;
}

const CreatePOModal: React.FC<CreatePOModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    supplier_id: '',
    priority: 'medium',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    payment_terms: '',
    shipping_address: '',
    billing_address: '',
    notes: ''
  });

  const [items, setItems] = useState<POItem[]>([
    { item_id: 0, item_name: '', item_description: '', sku: '', quantity: 1, unit_price: 0, unit_id: 0, notes: '' }
  ]);

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
    }
  }, [isOpen]);

  const loadDropdownData = async () => {
    try {
      const [inventoryResponse, masterDataResponse] = await Promise.all([
        inventoryService.getItems({ limit: 1000 }),
        masterDataService.getSuppliers()
      ]);
      
      setInventoryItems(inventoryResponse.items);
      setSuppliers(masterDataResponse);
      
      const dropdownData = await inventoryService.getDropdownData();
      setUnits(dropdownData.units);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      setError('Failed to load form data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const validItems = items.filter(item => item.item_id > 0 && item.quantity > 0);
      
      if (validItems.length === 0) {
        setError('Please add at least one item to the purchase order');
        setLoading(false);
        return;
      }

      // Prepare form data with proper null handling for dates
      const submitData = {
        ...formData,
        supplier_id: parseInt(formData.supplier_id),
        expected_delivery_date: formData.expected_delivery_date || null,
        items: validItems
      };

      await purchaseOrderService.createPurchaseOrder(submitData);

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
      title: '',
      description: '',
      supplier_id: '',
      priority: 'medium',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      payment_terms: '',
      shipping_address: '',
      billing_address: '',
      notes: ''
    });
    setItems([{ item_id: 0, item_name: '', item_description: '', sku: '', quantity: 1, unit_price: 0, unit_id: 0, notes: '' }]);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index: number, field: keyof POItem, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-fill item details when item is selected
        if (field === 'item_id') {
          const selectedItem = inventoryItems.find(inv => inv.id === parseInt(value));
          if (selectedItem) {
            updatedItem.item_name = selectedItem.name;
            updatedItem.item_description = selectedItem.description || '';
            updatedItem.sku = selectedItem.sku;
            updatedItem.unit_price = selectedItem.unit_price || 0;
            updatedItem.unit_id = selectedItem.unit_id || 0;
          }
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const addItem = () => {
    setItems(prev => [...prev, { item_id: 0, item_name: '', item_description: '', sku: '', quantity: 1, unit_price: 0, unit_id: 0, notes: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const getTotalAmount = () => {
    const subtotal = items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
    const tax = subtotal * 0.1; // 10% tax
    return subtotal + tax;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-6xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <ShoppingCart className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Create Purchase Order</h2>
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
            <POFormFields 
              formData={formData} 
              handleInputChange={handleInputChange} 
              suppliers={suppliers} 
            />

            {/* Items Section */}
            <POItemsSection 
              items={items}
              inventoryItems={inventoryItems}
              handleItemChange={handleItemChange}
              addItem={addItem}
              removeItem={removeItem}
              getTotalAmount={getTotalAmount}
            />

            {/* Additional Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping Address
                </label>
                <textarea
                  name="shipping_address"
                  value={formData.shipping_address}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter shipping address"
                />
              </div>

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
                  placeholder="Additional notes"
                />
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
            {loading ? 'Creating...' : 'Create Purchase Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePOModal;