import React, { useState, useEffect } from 'react';
import { X, Package, Send, AlertTriangle } from 'lucide-react';
import { productionOrderService } from '../../services/productionService';

interface IssueMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productionOrder: any;
}

interface MaterialIssue {
  production_order_item_id: number;
  item_name: string;
  item_sku: string;
  required_quantity: number;
  issued_quantity: number;
  available_quantity: number;
  unit_name: string;
  quantity: number;
  notes: string;
}

const IssueMaterialsModal: React.FC<IssueMaterialsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  productionOrder 
}) => {
  const [materialIssues, setMaterialIssues] = useState<MaterialIssue[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && productionOrder) {
      loadProductionOrderDetails();
    }
  }, [isOpen, productionOrder]);

  const loadProductionOrderDetails = async () => {
    try {
      const data = await productionOrderService.getProductionOrder(productionOrder.id);
      
      // Only show items that need to be issued
      const issuableItems = data.items.filter((item: any) => 
        item.required_quantity > item.issued_quantity && item.component_type === 'item'
      );

      const issues: MaterialIssue[] = issuableItems.map((item: any) => ({
        production_order_item_id: item.id,
        item_name: item.item_name,
        item_sku: item.item_sku || 'N/A',
        required_quantity: item.required_quantity,
        issued_quantity: item.issued_quantity,
        available_quantity: item.available_quantity || 0,
        unit_name: item.unit_name || 'units',
        quantity: Math.min(item.required_quantity - item.issued_quantity, item.available_quantity || 0), // Default to max available or needed
        notes: ''
      }));

      setMaterialIssues(issues);
    } catch (error) {
      console.error('Error loading production order details:', error);
      setError('Failed to load production order details');
    }
  };

  const handleItemChange = (index: number, field: keyof MaterialIssue, value: any) => {
    setMaterialIssues(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleQuickAction = (index: number, action: 'issue_all' | 'issue_available' | 'issue_none') => {
    setMaterialIssues(prev => prev.map((item, i) => {
      if (i === index) {
        switch (action) {
          case 'issue_all':
            return {
              ...item,
              quantity: item.required_quantity - item.issued_quantity
            };
          case 'issue_available':
            return {
              ...item,
              quantity: Math.min(item.required_quantity - item.issued_quantity, item.available_quantity)
            };
          case 'issue_none':
            return {
              ...item,
              quantity: 0
            };
          default:
            return item;
        }
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Filter items that have a quantity to issue
      const itemsToIssue = materialIssues
        .filter(item => item.quantity > 0)
        .map(item => ({
          production_order_item_id: item.production_order_item_id,
          quantity: item.quantity,
          notes: item.notes
        }));

      if (itemsToIssue.length === 0) {
        setError('Please specify at least one material to issue');
        setLoading(false);
        return;
      }

      await productionOrderService.issueMaterials(productionOrder.id, {
        items: itemsToIssue,
        notes: generalNotes
      });

      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to issue materials');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMaterialIssues([]);
    setGeneralNotes('');
    setError('');
  };

  const getTotalToIssue = () => materialIssues.reduce((sum, item) => sum + item.quantity, 0);

  if (!isOpen || !productionOrder) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-6xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Issue Materials</h2>
              <p className="text-sm text-gray-600">{productionOrder.order_number}</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
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

            {/* Production Order Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Production Order Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Title:</span> {productionOrder.title}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {productionOrder.status}
                </div>
                <div>
                  <span className="font-medium">Quantity:</span> {productionOrder.quantity} units
                </div>
              </div>
            </div>

            {materialIssues.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No materials to issue</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All materials have been issued or this production order doesn't require any materials.
                </p>
              </div>
            ) : (
              <>
                {/* Materials to Issue */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Materials to Issue</h3>
                  
                  <div className="space-y-4">
                    {materialIssues.map((material, index) => (
                      <div key={material.production_order_item_id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{material.item_name}</h4>
                            <p className="text-sm text-gray-500">SKU: {material.item_sku}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => handleQuickAction(index, 'issue_all')}
                              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              Issue All Required
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAction(index, 'issue_available')}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              Issue Available
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAction(index, 'issue_none')}
                              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Required
                            </label>
                            <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                              {material.required_quantity} {material.unit_name}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Previously Issued
                            </label>
                            <div className="px-3 py-2 bg-blue-100 rounded-lg text-sm text-blue-800">
                              {material.issued_quantity} {material.unit_name}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Available in Stock
                            </label>
                            <div className={`px-3 py-2 rounded-lg text-sm ${
                              material.available_quantity < (material.required_quantity - material.issued_quantity)
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {material.available_quantity} {material.unit_name}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Issue Quantity *
                            </label>
                            <input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              max={Math.min(material.required_quantity - material.issued_quantity, material.available_quantity)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={material.notes}
                            onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Optional notes for this material..."
                          />
                        </div>

                        {/* Validation warnings */}
                        {material.quantity > (material.required_quantity - material.issued_quantity) && (
                          <div className="mt-2 flex items-center text-red-600">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            <span className="text-sm">
                              Cannot issue more than required remaining quantity ({material.required_quantity - material.issued_quantity})
                            </span>
                          </div>
                        )}

                        {material.quantity > material.available_quantity && (
                          <div className="mt-2 flex items-center text-red-600">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            <span className="text-sm">
                              Cannot issue more than available quantity ({material.available_quantity})
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Issue Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Materials:</span>
                      <div className="font-medium">{materialIssues.length} items</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total to Issue:</span>
                      <div className="font-medium text-blue-600">{getTotalToIssue()} units</div>
                    </div>
                  </div>
                </div>

                {/* General Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    General Notes
                  </label>
                  <textarea
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional general notes about this material issue..."
                  />
                </div>
              </>
            )}

            {/* Add some bottom padding for mobile */}
            <div className="h-4 sm:hidden"></div>
          </form>
        </div>

        {/* Fixed Footer */}
        {materialIssues.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-white">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || getTotalToIssue() === 0}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Issuing...' : `Issue Materials`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueMaterialsModal;