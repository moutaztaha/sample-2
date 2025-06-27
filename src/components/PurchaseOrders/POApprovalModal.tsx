import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Package, AlertTriangle } from 'lucide-react';
import { purchaseOrderService } from '../../services/purchaseOrderService';

interface POApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseOrder: any;
}

interface ItemApproval {
  id: number;
  item_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_name: string;
  approved: boolean;
  notes: string;
}

const POApprovalModal: React.FC<POApprovalModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  purchaseOrder 
}) => {
  const [itemApprovals, setItemApprovals] = useState<ItemApproval[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
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
      
      const approvals: ItemApproval[] = data.items.map((item: any) => ({
        id: item.id,
        item_name: item.item_name,
        sku: item.sku || item.inventory_sku || 'N/A',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        unit_name: item.unit_name || 'units',
        approved: true, // Default to approved
        notes: ''
      }));

      setItemApprovals(approvals);
    } catch (error) {
      console.error('Error loading PO details:', error);
      setError('Failed to load purchase order details');
    }
  };

  const handleItemChange = (index: number, field: keyof ItemApproval, value: any) => {
    setItemApprovals(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSelectAll = (approved: boolean) => {
    setItemApprovals(prev => prev.map(item => ({ ...item, approved })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const hasApprovedItems = itemApprovals.some(item => item.approved);
      const hasRejectedItems = itemApprovals.some(item => !item.approved);

      let finalStatus = 'approved';
      if (!hasApprovedItems) {
        finalStatus = 'rejected';
      } else if (hasRejectedItems) {
        finalStatus = 'partially_approved';
      }

      if (approvalAction === 'reject') {
        finalStatus = 'rejected';
      }

      await purchaseOrderService.updateStatus(purchaseOrder.id, {
        status: finalStatus,
        approval_notes: generalNotes,
        items: itemApprovals.map(item => ({
          id: item.id,
          approved: approvalAction === 'approve' ? item.approved : false,
          notes: item.notes
        }))
      });

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
    setApprovalAction('approve');
    setError('');
  };

  const getApprovedCount = () => itemApprovals.filter(item => item.approved).length;
  const getRejectedCount = () => itemApprovals.filter(item => !item.approved).length;
  const getTotalValue = () => itemApprovals
    .filter(item => item.approved)
    .reduce((sum, item) => sum + item.total_price, 0);

  if (!isOpen || !purchaseOrder) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-6xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Approve Purchase Order</h2>
              <p className="text-sm text-gray-600">{purchaseOrder.po_number}</p>
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
                  <span className="font-medium">Total Amount:</span> ${purchaseOrder.total_amount?.toFixed(2) || '0.00'}
                </div>
                <div>
                  <span className="font-medium">Items:</span> {itemApprovals.length} items
                </div>
              </div>
            </div>

            {/* Action Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approval Action *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setApprovalAction('approve')}
                  className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-colors ${
                    approvalAction === 'approve'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Approve (Item by Item)
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalAction('reject')}
                  className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-colors ${
                    approvalAction === 'reject'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Reject All
                </button>
              </div>
            </div>

            {/* Items Approval */}
            {approvalAction === 'approve' && itemApprovals.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Item Approvals</h3>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      Approve All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Reject All
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {itemApprovals.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                          <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              checked={item.approved}
                              onChange={() => handleItemChange(index, 'approved', true)}
                              className="form-radio h-4 w-4 text-green-600"
                            />
                            <span className="ml-2 text-sm text-gray-700">Approve</span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              checked={!item.approved}
                              onChange={() => handleItemChange(index, 'approved', false)}
                              className="form-radio h-4 w-4 text-red-600"
                            />
                            <span className="ml-2 text-sm text-gray-700">Reject</span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                            {item.quantity} {item.unit_name}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Price
                          </label>
                          <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                            ${item.unit_price.toFixed(2)}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total Price
                          </label>
                          <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                            ${item.total_price.toFixed(2)}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                          </label>
                          <div className={`px-3 py-2 rounded-lg text-sm ${
                            item.approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.approved ? 'Approved' : 'Rejected'}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Optional notes for this item..."
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Approval Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Items:</span>
                      <div className="font-medium">{itemApprovals.length} items</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Approved:</span>
                      <div className="font-medium text-green-600">{getApprovedCount()} items</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Rejected:</span>
                      <div className="font-medium text-red-600">{getRejectedCount()} items</div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-blue-100">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Approved Value:</span>
                      <span className="font-medium text-blue-600">${getTotalValue().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rejection Warning */}
            {approvalAction === 'reject' && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">You are about to reject the entire purchase order</p>
                    <p className="mt-1">
                      This action will reject all items in the purchase order and change its status to "Rejected".
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* General Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {approvalAction === 'approve' ? 'Approval Notes' : 'Rejection Reason'} 
                {approvalAction === 'reject' && ' *'}
              </label>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                required={approvalAction === 'reject'}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={
                  approvalAction === 'approve' 
                    ? 'Optional notes about the approval...'
                    : 'Please provide a reason for rejection...'
                }
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
            className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              approvalAction === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : approvalAction === 'approve' ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Processing...' : (approvalAction === 'approve' ? 'Approve PO' : 'Reject PO')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POApprovalModal;