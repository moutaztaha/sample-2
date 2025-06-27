import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Package } from 'lucide-react';
import { requisitionService } from '../../services/requisitionService';

interface PartialApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requisition: any;
}

interface ItemApproval {
  item_id: number;
  item_name: string;
  sku: string;
  requested_quantity: number;
  available_quantity: number;
  unit_name: string;
  approved_quantity: number;
  rejected_quantity: number;
  approval_notes: string;
}

const PartialApprovalModal: React.FC<PartialApprovalModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  requisition 
}) => {
  const [itemApprovals, setItemApprovals] = useState<ItemApproval[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && requisition) {
      loadRequisitionDetails();
    }
  }, [isOpen, requisition]);

  const loadRequisitionDetails = async () => {
    try {
      const data = await requisitionService.getRequisition(requisition.id);
      
      const approvals: ItemApproval[] = data.items.map((item: any) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        sku: item.sku,
        requested_quantity: item.quantity,
        available_quantity: item.available_quantity || 0,
        unit_name: item.unit_name || 'units',
        approved_quantity: item.approved_quantity || 0,
        rejected_quantity: item.rejected_quantity || 0,
        approval_notes: item.approval_notes || ''
      }));

      setItemApprovals(approvals);
    } catch (error) {
      console.error('Error loading requisition details:', error);
      setError('Failed to load requisition details');
    }
  };

  const handleItemChange = (index: number, field: keyof ItemApproval, value: any) => {
    setItemApprovals(prev => prev.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate rejected quantity if approved quantity changes
        if (field === 'approved_quantity') {
          const approved = parseInt(value) || 0;
          const remaining = updatedItem.requested_quantity - approved;
          updatedItem.rejected_quantity = Math.max(0, remaining);
        }
        
        // Auto-calculate approved quantity if rejected quantity changes
        if (field === 'rejected_quantity') {
          const rejected = parseInt(value) || 0;
          const remaining = updatedItem.requested_quantity - rejected;
          updatedItem.approved_quantity = Math.max(0, remaining);
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleQuickAction = (index: number, action: 'approve_all' | 'reject_all' | 'approve_available') => {
    setItemApprovals(prev => prev.map((item, i) => {
      if (i === index) {
        switch (action) {
          case 'approve_all':
            return {
              ...item,
              approved_quantity: item.requested_quantity,
              rejected_quantity: 0
            };
          case 'reject_all':
            return {
              ...item,
              approved_quantity: 0,
              rejected_quantity: item.requested_quantity
            };
          case 'approve_available':
            const availableToApprove = Math.min(item.requested_quantity, item.available_quantity);
            return {
              ...item,
              approved_quantity: availableToApprove,
              rejected_quantity: item.requested_quantity - availableToApprove
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
      // Validate that all quantities are properly allocated
      for (const item of itemApprovals) {
        const total = item.approved_quantity + item.rejected_quantity;
        if (total !== item.requested_quantity) {
          setError(`Item "${item.item_name}": Approved + Rejected quantities must equal requested quantity (${item.requested_quantity})`);
          setLoading(false);
          return;
        }
        
        if (item.approved_quantity > item.available_quantity) {
          setError(`Item "${item.item_name}": Cannot approve more than available quantity (${item.available_quantity})`);
          setLoading(false);
          return;
        }
      }

      const approvalData = {
        items: itemApprovals.map(item => ({
          item_id: item.item_id,
          approved_quantity: item.approved_quantity,
          rejected_quantity: item.rejected_quantity,
          approval_notes: item.approval_notes
        })),
        approval_notes: generalNotes
      };

      await requisitionService.approveRequisition(requisition.id, approvalData);
      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process approval');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setItemApprovals([]);
    setGeneralNotes('');
    setError('');
  };

  const getTotalApproved = () => itemApprovals.reduce((sum, item) => sum + item.approved_quantity, 0);
  const getTotalRejected = () => itemApprovals.reduce((sum, item) => sum + item.rejected_quantity, 0);
  const getTotalRequested = () => itemApprovals.reduce((sum, item) => sum + item.requested_quantity, 0);

  if (!isOpen || !requisition) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-6xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Approve Requisition</h2>
              <p className="text-sm text-gray-600">{requisition.title}</p>
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

            {/* Requisition Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Requisition Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Requested by:</span> {requisition.requester_name}
                </div>
                <div>
                  <span className="font-medium">Department:</span> {requisition.department || 'Not specified'}
                </div>
                <div>
                  <span className="font-medium">Priority:</span> 
                  <span className="capitalize ml-1">{requisition.priority}</span>
                </div>
              </div>
            </div>

            {/* Items Approval */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Item Approvals</h3>
              
              <div className="space-y-4">
                {itemApprovals.map((item, index) => (
                  <div key={item.item_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleQuickAction(index, 'approve_all')}
                          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                        >
                          Approve All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAction(index, 'approve_available')}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          Approve Available
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAction(index, 'reject_all')}
                          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          Reject All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Requested
                        </label>
                        <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                          {item.requested_quantity} {item.unit_name}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Available
                        </label>
                        <div className={`px-3 py-2 rounded-lg text-sm ${
                          item.available_quantity >= item.requested_quantity 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.available_quantity} {item.unit_name}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Approve Quantity
                        </label>
                        <input
                          type="number"
                          value={item.approved_quantity}
                          onChange={(e) => handleItemChange(index, 'approved_quantity', parseInt(e.target.value) || 0)}
                          min="0"
                          max={Math.min(item.requested_quantity, item.available_quantity)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reject Quantity
                        </label>
                        <input
                          type="number"
                          value={item.rejected_quantity}
                          onChange={(e) => handleItemChange(index, 'rejected_quantity', parseInt(e.target.value) || 0)}
                          min="0"
                          max={item.requested_quantity}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Notes
                      </label>
                      <input
                        type="text"
                        value={item.approval_notes}
                        onChange={(e) => handleItemChange(index, 'approval_notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Optional notes for this item..."
                      />
                    </div>

                    {/* Validation warnings */}
                    {(item.approved_quantity + item.rejected_quantity) !== item.requested_quantity && (
                      <div className="mt-2 flex items-center text-yellow-600">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        <span className="text-sm">
                          Total must equal requested quantity ({item.requested_quantity})
                        </span>
                      </div>
                    )}

                    {item.approved_quantity > item.available_quantity && (
                      <div className="mt-2 flex items-center text-red-600">
                        <XCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">
                          Cannot approve more than available quantity ({item.available_quantity})
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Approval Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Requested:</span>
                  <div className="font-medium">{getTotalRequested()} items</div>
                </div>
                <div>
                  <span className="text-gray-600">Total Approved:</span>
                  <div className="font-medium text-green-600">{getTotalApproved()} items</div>
                </div>
                <div>
                  <span className="text-gray-600">Total Rejected:</span>
                  <div className="font-medium text-red-600">{getTotalRejected()} items</div>
                </div>
              </div>
            </div>

            {/* General Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                General Approval Notes
              </label>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional general notes about this approval..."
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
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Processing...' : 'Process Approval'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartialApprovalModal;