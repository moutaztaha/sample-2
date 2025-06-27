import React, { useState, useEffect } from 'react';
import { X, ClipboardList, User, Calendar, Package, DollarSign, FileText } from 'lucide-react';
import { requisitionService } from '../../services/requisitionService';

interface ViewRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: any;
}

const ViewRequisitionModal: React.FC<ViewRequisitionModalProps> = ({ isOpen, onClose, requisition }) => {
  const [fullRequisition, setFullRequisition] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && requisition) {
      loadFullRequisition();
    }
  }, [isOpen, requisition]);

  const loadFullRequisition = async () => {
    try {
      setLoading(true);
      const data = await requisitionService.getRequisition(requisition.id);
      setFullRequisition(data);
    } catch (error) {
      console.error('Error loading requisition details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen || !requisition) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-4xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <ClipboardList className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Requisition Details</h2>
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
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : fullRequisition ? (
            <div className="p-4 sm:p-6 space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{fullRequisition.title}</h3>
                    <p className="text-gray-600">{fullRequisition.description}</p>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(fullRequisition.priority)}`}>
                      {fullRequisition.priority} priority
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(fullRequisition.status)}`}>
                      {fullRequisition.status}
                    </span>
                  </div>

                  {fullRequisition.department && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Package className="h-4 w-4 mr-2" />
                      Department: {fullRequisition.department}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    Requested by: {fullRequisition.requester_name}
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Created: {new Date(fullRequisition.created_at).toLocaleDateString()}
                  </div>

                  {fullRequisition.required_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Required by: {new Date(fullRequisition.required_date).toLocaleDateString()}
                    </div>
                  )}

                  {fullRequisition.approver_name && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      {fullRequisition.status === 'approved' ? 'Approved' : 'Rejected'} by: {fullRequisition.approver_name}
                    </div>
                  )}

                  {fullRequisition.approval_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {fullRequisition.status === 'approved' ? 'Approved' : 'Rejected'} on: {new Date(fullRequisition.approval_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Notes */}
              {fullRequisition.approval_notes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <FileText className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="font-medium text-gray-900">Approval Notes</span>
                  </div>
                  <p className="text-gray-700">{fullRequisition.approval_notes}</p>
                </div>
              )}

              {/* Items List */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Requested Items</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Est. Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fullRequisition.items?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                              <div className="text-sm text-gray-500">{item.category_name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.quantity} {item.unit_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${item.estimated_cost?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${((item.quantity || 0) * (item.estimated_cost || 0)).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {item.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Cost */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total Estimated Cost:</span>
                    <span className="text-xl font-bold text-blue-600">
                      ${fullRequisition.items?.reduce((total: number, item: any) => 
                        total + ((item.quantity || 0) * (item.estimated_cost || 0)), 0
                      ).toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Failed to load requisition details</p>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewRequisitionModal;