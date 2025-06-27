import React, { useState, useEffect } from 'react';
import { X, Package, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { requisitionService } from '../../services/requisitionService';

interface IssueItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requisition: any;
}

interface ItemIssue {
  item_id: number;
  item_name: string;
  sku: string;
  approved_quantity: number;
  available_quantity: number;
  unit_name: string;
  issue_quantity: number;
  issue_notes: string;
}

const IssueItemsModal: React.FC<IssueItemsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  requisition 
}) => {
  const [itemIssues, setItemIssues] = useState<ItemIssue[]>([]);
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
      
      // Only show approved items that can be issued
      const approvedItems = data.items.filter((item: any) => 
        item.approved_quantity > 0 && item.status !== 'rejected'
      );

      const issues: ItemIssue[] = approvedItems.map((item: any) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        sku: item.sku,
        approved_quantity: item.approved_quantity || 0,
        available_quantity: item.available_quantity || 0,
        unit_name: item.unit_name || 'units',
        issue_quantity: item.approved_quantity || 0, // Default to full approved quantity
        issue_notes: ''
      }));

      setItemIssues(issues);
    } catch (error) {
      console.error('Error loading requisition details:', error);
      setError('Failed to load requisition details');
    }
  };

  const handleItemChange = (index: number, field: keyof ItemIssue, value: any) => {
    setItemIssues(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleQuickAction = (index: number, action: 'issue_all' | 'issue_available') => {
    setItemIssues(prev => prev.map((item, i) => {
      if (i === index) {
        switch (action) {
          case 'issue_all':
            return {
              ...item,
              issue_quantity: item.approved_quantity
            };
          case 'issue_available':
            return {
              ...item,
              issue_quantity: Math.min(item.approved_quantity, item.available_quantity)
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
      // Validate that all issue quantities are valid
      for (const item of itemIssues) {
        if (item.issue_quantity > item.approved_quantity) {
          setError(`Item "${item.item_name}": Cannot issue more than approved quantity (${item.approved_quantity})`);
          setLoading(false);
          return;
        }
        
        if (item.issue_quantity > item.available_quantity) {
          setError(`Item "${item.item_name}": Cannot issue more than available quantity (${item.available_quantity})`);
          setLoading(false);
          return;
        }

        if (item.issue_quantity < 0) {
          setError(`Item "${item.item_name}": Issue quantity cannot be negative`);
          setLoading(false);
          return;
        }
      }

      const issueData = {
        items: itemIssues.map(item => ({
          item_id: item.item_id,
          issue_quantity: item.issue_quantity,
          issue_notes: item.issue_notes
        })),
        issue_notes: generalNotes
      };

      await requisitionService.issueItems(requisition.id, issueData);
      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to issue items');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setItemIssues([]);
    setGeneralNotes('');
    setError('');
  };

  const getTotalIssued = () => itemIssues.reduce((sum, item) => sum + item.issue_quantity, 0);
  const getTotalApproved = () => itemIssues.reduce((sum, item) => sum + item.approved_quantity, 0);

  if (!isOpen || !requisition) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-6xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Issue Items</h2>
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
                  <span className="font-medium">Status:</span> 
                  <span className="capitalize ml-1">{requisition.status}</span>
                </div>
              </div>
            </div>

            {itemIssues.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No approved items to issue</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This requisition has no approved items that can be issued.
                </p>
              </div>
            ) : (
              <>
                {/* Items Issue */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Items to Issue</h3>
                  
                  <div className="space-y-4">
                    {itemIssues.map((item, index) => (
                      <div key={item.item_id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                            <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => handleQuickAction(index, 'issue_all')}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              Issue All Approved
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAction(index, 'issue_available')}
                              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              Issue Available
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Approved Quantity
                            </label>
                            <div className="px-3 py-2 bg-green-100 rounded-lg text-sm text-green-800">
                              {item.approved_quantity} {item.unit_name}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Available in Stock
                            </label>
                            <div className={`px-3 py-2 rounded-lg text-sm ${
                              item.available_quantity >= item.approved_quantity 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.available_quantity} {item.unit_name}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Issue Quantity *
                            </label>
                            <input
                              type="number"
                              value={item.issue_quantity}
                              onChange={(e) => handleItemChange(index, 'issue_quantity', parseInt(e.target.value) || 0)}
                              min="0"
                              max={Math.min(item.approved_quantity, item.available_quantity)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Remaining
                            </label>
                            <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">
                              {item.approved_quantity - item.issue_quantity} {item.unit_name}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Issue Notes
                          </label>
                          <input
                            type="text"
                            value={item.issue_notes}
                            onChange={(e) => handleItemChange(index, 'issue_notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Optional notes for this item issue..."
                          />
                        </div>

                        {/* Validation warnings */}
                        {item.issue_quantity > item.approved_quantity && (
                          <div className="mt-2 flex items-center text-red-600">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            <span className="text-sm">
                              Cannot issue more than approved quantity ({item.approved_quantity})
                            </span>
                          </div>
                        )}

                        {item.issue_quantity > item.available_quantity && (
                          <div className="mt-2 flex items-center text-red-600">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            <span className="text-sm">
                              Cannot issue more than available quantity ({item.available_quantity})
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Issue Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Approved:</span>
                      <div className="font-medium">{getTotalApproved()} items</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total to Issue:</span>
                      <div className="font-medium text-green-600">{getTotalIssued()} items</div>
                    </div>
                  </div>
                </div>

                {/* General Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    General Issue Notes
                  </label>
                  <textarea
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Optional general notes about this item issue..."
                  />
                </div>
              </>
            )}

            {/* Add some bottom padding for mobile */}
            <div className="h-4 sm:hidden"></div>
          </form>
        </div>

        {/* Fixed Footer */}
        {itemIssues.length > 0 && (
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
              disabled={loading || getTotalIssued() === 0}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Issuing...' : `Issue ${getTotalIssued()} Items`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueItemsModal;