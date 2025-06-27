import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { productionOrderService } from '../../services/productionService';

interface CompleteProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productionOrder: any;
}

const CompleteProductionModal: React.FC<CompleteProductionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  productionOrder 
}) => {
  const [formData, setFormData] = useState({
    quantity: 0,
    quality_check_passed: true,
    batch_number: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen && productionOrder) {
      setFormData({
        quantity: productionOrder.quantity || 0,
        quality_check_passed: true,
        batch_number: '',
        notes: ''
      });
      setError('');
    }
  }, [isOpen, productionOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.quantity || formData.quantity <= 0) {
        setError('Quantity must be greater than zero');
        setLoading(false);
        return;
      }

      if (formData.quantity > productionOrder.quantity) {
        setError(`Cannot complete more than ordered quantity (${productionOrder.quantity})`);
        setLoading(false);
        return;
      }

      await productionOrderService.completeProduction(productionOrder.id, formData);
      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to complete production');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : type === 'number' 
          ? parseFloat(value) || 0 
          : value
    }));
  };

  if (!isOpen || !productionOrder) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Complete Production</h2>
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

          {/* Production Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">{productionOrder.title}</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Order Number: {productionOrder.order_number}</p>
              <p>Product: {productionOrder.finished_product_name || 'Not specified'}</p>
              <p>Ordered Quantity: {productionOrder.quantity}</p>
            </div>
          </div>

          {/* Completion Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Completed Quantity *
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              min="1"
              max={productionOrder.quantity}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum: {productionOrder.quantity} units
            </p>
          </div>

          {/* Quality Check */}
          <div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="quality_check_passed"
                name="quality_check_passed"
                checked={formData.quality_check_passed}
                onChange={handleInputChange}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="quality_check_passed" className="ml-2 block text-sm text-gray-900">
                Quality Check Passed
              </label>
            </div>
            {!formData.quality_check_passed && (
              <div className="mt-2 flex items-start space-x-2 text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                <div className="text-sm">
                  If quality check fails, the completed quantity will not be added to inventory.
                </div>
              </div>
            )}
          </div>

          {/* Batch Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Number
            </label>
            <input
              type="text"
              name="batch_number"
              value={formData.batch_number}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Optional batch number"
            />
          </div>

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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Optional notes about this completion..."
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
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Processing...' : 'Complete Production'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteProductionModal;