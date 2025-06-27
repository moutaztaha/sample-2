import React, { useState, useEffect } from 'react';
import { X, Truck, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { purchaseOrderService } from '../../services/purchaseOrderService';

interface ReceiveItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseOrder: any;
}

interface ItemReceiving {
  po_item_id: number;
  item_name: string;
  sku: string;
  quantity: number;
  received_quantity: number;
  remaining_quantity: number;
  unit_name: string;
  batch_number: string;
  expiry_date: string;
  quality_check_passed: boolean;
  notes: string;
}

const ReceiveItemsModal: React.FC<ReceiveItemsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  purchaseOrder 
}) => {
  const [itemsReceiving, setItemsReceiving] = useState<ItemReceiving[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && purchaseOrder) {
      loadPODetails();
    }
  }, [isOpen, purchaseOrder]);

  const loadPODetails = async () => {
    try {
      const data = await purchaseOrderService.getPurchaseOrder(purchaseOrder.id);
      
      const receiving: ItemReceiving[] = data.items.map((item: any) => ({
        po_item_id: item.id,
        item_name: item.item_name,
        sku: item.sku || item.inventory_sku || 'N/A',
        quantity: item.quantity,
        received_quantity: item.received_quantity || 0,
        remaining_quantity: item.quantity - (item.received_quantity || 0),
        unit_name: item.unit_name || 'units',
        batch_number: '',
        expiry_date: '',
        quality_check_passed: true,
        notes: ''
      }));

      setItemsReceiving(receiving);
    } catch (error) {
      console.error('Error loading PO details:', error);
      setError('Failed to load purchase order details');
    }
  };

  const handleItemChange = (index: number, field: keyof ItemReceiving, value: any) => {
    setItemsReceiving(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleQuickAction = (index: number, action: 'receive_all' | 'receive_none') => {
    setItemsReceiving(prev => prev.map((item, i) => {
      if (i === index) {
        switch (action) {
          case 'receive_all':
            return {
              ...item,
              receive_quantity: item.remaining_quantity
            };
          case 'receive_none':
            return {
              ...item,
              receive_quantity: 0
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
      // Filter items that have a receive quantity
      const itemsToReceive = itemsReceiving
        .filter(item => item.receive_quantity > 0)
        .map(item => ({
          po_item_id: item.po_item_id,
          received_quantity: item.receive_quantity,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date || null,
          quality_check_passed: item.quality_check_passed
        }));

      if (itemsToReceive.length === 0) {
        setError('Please specify at least one item to receive');
        setLoading(false);
        return;
      }

      await purchaseOrderService.receiveItems(purchaseOrder.id, {
        items: itemsToReceive,
        notes: generalNotes
      });

      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to receive items');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setItemsReceiving([]);
    setGeneralNotes('');
    setError('');
  };

  if (!isOpen || !purchaseOrder) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-6xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <Truck className="h-6 w-6 text-purple-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Receive Items</h2>
              <p className="text-sm text-gray-600">PO: {purchaseOrder.po_number}</p>
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

            {/* PO Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Purchase Order Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Supplier:</span> {purchaseOrder.supplier_name}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {purchaseOrder.status}
                </div>
                <div>
                  <span className="font-medium">Total Amount:</span> ${purchaseOrder.total_amount?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>

            {itemsReceiving.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No items to receive</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This purchase order has no items that can be received.
                </p>
              </div>
            ) : (
              <>
                {/* Items to Receive */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Items to Receive</h3>
                  
                  <div className="space-y-4">
                    {itemsReceiving.map((item, index) => (
                      <div key={item.po_item_id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                            <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => handleQuickAction(index, 'receive_all')}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              Receive All Remaining
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAction(index, 'receive_none')}
                              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Ordered Quantity
                            </label>
                            <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                              {item.quantity} {item.unit_name}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Previously Received
                            </label>
                            <div className="px-3 py-2 bg-blue-100 rounded-lg text-sm text-blue-800">
                              {item.received_quantity} {item.unit_name}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Remaining
                            </label>
                            <div className="px-3 py-2 bg-yellow-100 rounded-lg text-sm text-yellow-800">
                              {item.remaining_quantity} {item.unit_name}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Receive Quantity *
                            </label>
                            <input
                              type="number"
                              value={item.receive_quantity || 0}
                              onChange={(e) => handleItemChange(index, 'receive_quantity', parseInt(e.target.value) || 0)}
                              min="0"
                              max={item.remaining_quantity}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Batch Number
                            </label>
                            <input
                              type="text"
                              value={item.batch_number}
                              onChange={(e) => handleItemChange(index, 'batch_number', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Optional batch number"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Expiry Date
                            </label>
                            <input
                              type="date"
                              value={item.expiry_date}
                              onChange={(e) => handleItemChange(index, 'expiry_date', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quality Check
                            </label>
                            <div className="flex items-center space-x-4 mt-2">
                              <label className="inline-flex items-center">
                                <input
                                  type="radio"
                                  checked={item.quality_check_passed}
                                  onChange={() => handleItemChange(index, 'quality_check_passed', true)}
                                  className="form-radio h-4 w-4 text-green-600"
                                />
                                <span className="ml-2 text-sm text-gray-700">Passed</span>
                              </label>
                              <label className="inline-flex items-center">
                                <input
                                  type="radio"
                                  checked={!item.quality_check_passed}
                                  onChange={() => handleItemChange(index, 'quality_check_passed', false)}
                                  className="form-radio h-4 w-4 text-red-600"
                                />
                                <span className="ml-2 text-sm text-gray-700">Failed</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Notes
                          </label>
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Optional notes for this item..."
                          />
                        </div>

                        {/* Validation warnings */}
                        {(item.receive_quantity || 0) > item.remaining_quantity && (
                          <div className="mt-2 flex items-center text-red-600">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            <span className="text-sm">
                              Cannot receive more than remaining quantity ({item.remaining_quantity})
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* General Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    General Receiving Notes
                  </label>
                  <textarea
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Optional general notes about this receiving..."
                  />
                </div>
              </>
            )}

            {/* Add some bottom padding for mobile */}
            <div className="h-4 sm:hidden"></div>
          </form>
        </div>

        {/* Fixed Footer */}
        {itemsReceiving.length > 0 && (
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
              disabled={loading || itemsReceiving.every(item => !item.receive_quantity)}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Processing...' : 'Confirm Receipt'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiveItemsModal;