import React, { useState } from 'react';
import { X, CheckCircle, XCircle, FileText } from 'lucide-react';
import { requisitionService } from '../../services/requisitionService';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requisition: any;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({ isOpen, onClose, onSuccess, requisition }) => {
  const [action, setAction] = useState<'approved' | 'rejected'>('approved');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await requisitionService.updateRequisitionStatus(requisition.id, {
        status: action,
        approval_notes: notes
      });

      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update requisition status');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAction('approved');
    setNotes('');
    setError('');
  };

  if (!isOpen || !requisition) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            {action === 'approved' ? (
              <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600 mr-3" />
            )}
            <h2 className="text-xl font-semibold text-gray-900">
              {action === 'approved' ? 'Approve' : 'Reject'} Requisition
            </h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Requisition Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">{requisition.title}</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Requested by: {requisition.requester_name}</p>
              <p>Department: {requisition.department || 'Not specified'}</p>
              <p>Priority: <span className="capitalize">{requisition.priority}</span></p>
              <p>Items: {requisition.item_count} items</p>
              <p>Estimated Cost: ${requisition.total_estimated_cost?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          {/* Action Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAction('approved')}
                className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-colors ${
                  action === 'approved'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => setAction('rejected')}
                className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-colors ${
                  action === 'rejected'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <XCircle className="h-5 w-5 mr-2" />
                Reject
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {action === 'approved' ? 'Approval Notes' : 'Rejection Reason'} 
              {action === 'rejected' && ' *'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={action === 'rejected'}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={
                action === 'approved' 
                  ? 'Optional notes about the approval...'
                  : 'Please provide a reason for rejection...'
              }
            />
          </div>

          {/* Warning for Approval */}
          {action === 'approved' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Approval will automatically:</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li>Deduct requested quantities from inventory</li>
                    <li>Update item stock levels</li>
                    <li>Send notification to requester</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                action === 'approved'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : action === 'approved' ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Processing...' : (action === 'approved' ? 'Approve' : 'Reject')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApprovalModal;