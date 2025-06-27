import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Minus, AlertTriangle } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: any;
}

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  item 
}) => {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setAdjustmentType('add');
      setQuantity(1);
      setReason('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (quantity <= 0) {
        throw new Error('Quantity must be greater than zero');
      }

      if (!reason.trim()) {
        throw new Error('Reason is required');
      }

      const adjustmentData = {
        item_id: item.id,
        adjustment_type: adjustmentType,
        quantity: quantity,
        reason: reason
      };

      await inventoryService.adjustStock(adjustmentData);
      onSuccess();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            {adjustmentType === 'add' ? (
              <Plus className="h-6 w-6 text-green-600 mr-3" />
            ) : (
              <Minus className="h-6 w-6 text-red-600 mr-3" />
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Stock Adjustment</h2>
              <p className="text-sm text-gray-600">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-gray-700">Current Stock:</span>
                <span className="ml-2 text-lg font-bold text-gray-900">{item.quantity} {item.unit_name}</span>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                item.is_low_stock ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }`}>
                {item.is_low_stock ? 'Low Stock' : 'In Stock'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adjustment Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-colors ${
                  adjustmentType === 'add'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Stock
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('subtract')}
                className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-colors ${
                  adjustmentType === 'subtract'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Minus className="h-5 w-5 mr-2" />
                Remove Stock
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              min="1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {adjustmentType === 'subtract' && quantity > item.quantity && (
            <div className="flex items-start space-x-2 text-yellow-700 bg-yellow-50 p-3 rounded-lg">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
              <div className="text-sm">
                Warning: You are attempting to remove more items than currently in stock. This will result in negative inventory.
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Explain the reason for this adjustment..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                adjustmentType === 'add' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : adjustmentType === 'add' ? (
                <Plus className="h-4 w-4 mr-2" />
              ) : (
                <Minus className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Processing...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustmentModal;