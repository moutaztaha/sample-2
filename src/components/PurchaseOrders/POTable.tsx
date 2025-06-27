import React from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  Calendar,
  Send,
  Edit,
  Trash2,
  Settings,
  CheckSquare
} from 'lucide-react';

interface POTableProps {
  purchaseOrders: any[];
  loading: boolean;
  pagination: any;
  setPagination: (pagination: any) => void;
  user: any;
  onView: (po: any) => void;
  onEdit: (po: any) => void;
  onQuickApproval: (po: any) => void;
  onPartialApproval: (po: any) => void;
  onStatusUpdate: (po: any, status: string) => void;
  onReceiveItems: (po: any) => void;
  onDelete: (po: any) => void;
  onCreateNew: () => void;
}

const POTable: React.FC<POTableProps> = ({ 
  purchaseOrders, 
  loading, 
  pagination, 
  setPagination, 
  user, 
  onView, 
  onEdit,
  onQuickApproval,
  onPartialApproval,
  onStatusUpdate, 
  onReceiveItems, 
  onDelete,
  onCreateNew 
}) => {
  // Helper functions for table
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'sent': return <Send className="h-4 w-4 text-blue-500" />;
      case 'received': return <Truck className="h-4 w-4 text-purple-500" />;
      case 'partially_received': return <Truck className="h-4 w-4 text-orange-500" />;
      case 'pending_approval': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'draft': return <Package className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-purple-100 text-purple-800';
      case 'partially_received': return 'bg-orange-100 text-orange-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'Pending Approval';
      case 'partially_received': return 'Partially Received';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Permission helpers - Updated to allow editing and deleting in all stages
  const canApprove = (po: any) => {
    return po.status === 'pending_approval' && (user?.role === 'admin' || user?.role === 'manager');
  };

  const canReceive = (po: any) => {
    return (po.status === 'sent' || po.status === 'partially_received') && 
           (user?.role === 'admin' || user?.role === 'manager');
  };

  const canEdit = (po: any) => {
    // Allow editing for admin/manager at any stage
    return (user?.role === 'admin' || user?.role === 'manager');
  };

  const canDelete = (po: any) => {
    // Allow deleting for admin/manager at any stage
    return (user?.role === 'admin' || user?.role === 'manager');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PO Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expected Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {purchaseOrders.map((po) => (
              <tr key={po.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{po.po_number}</div>
                    <div className="text-sm text-gray-500">{po.title}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{po.supplier_name}</div>
                    <div className="text-sm text-gray-500">{po.supplier_contact}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(po.priority)}`}>
                    {po.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusIcon(po.status)}
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(po.status)}`}>
                      {getStatusText(po.status)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {po.item_count} items
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${(po.total_amount || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'Not set'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-1">
                    {/* View Button - Always available */}
                    <button
                      onClick={() => onView(po)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {/* Edit Button - Available at any stage for admin/manager */}
                    {canEdit(po) && (
                      <button
                        onClick={() => onEdit(po)}
                        className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                        title="Edit PO"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}

                    {/* STEP 2: Submit for Approval - For draft POs */}
                    {po.status === 'draft' && (
                      <button
                        onClick={() => onStatusUpdate(po, 'pending_approval')}
                        className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50 transition-colors"
                        title="Submit for Approval"
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                    )}

                    {/* STEP 3: Approval Buttons - For pending approval POs */}
                    {po.status === 'pending_approval' && canApprove(po) && (
                      <>
                        <button
                          onClick={() => onPartialApproval(po)}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                          title="Partial Approval (Item by Item)"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onQuickApproval(po)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                          title="Quick Approve All Items"
                        >
                          <CheckSquare className="h-4 w-4" />
                        </button>
                      </>
                    )}

                    {/* STEP 4: Send Button - For approved POs */}
                    {po.status === 'approved' && (
                      <button
                        onClick={() => onStatusUpdate(po, 'sent')}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="Send to Supplier"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    )}

                    {/* STEP 5: Receive Buttons - For sent or partially received POs */}
                    {(po.status === 'sent' || po.status === 'partially_received') && canReceive(po) && (
                      <button
                        onClick={() => onReceiveItems(po)}
                        className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                        title="Receive Items"
                      >
                        <Truck className="h-4 w-4" />
                      </button>
                    )}

                    {/* Delete Button - Available at any stage for admin/manager */}
                    {canDelete(po) && (
                      <button
                        onClick={() => onDelete(po)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete PO"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    {/* Cancel Button - For draft or pending approval POs */}
                    {(po.status === 'draft' || po.status === 'pending_approval') && (
                      <button
                        onClick={() => onStatusUpdate(po, 'cancelled')}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Cancel PO"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {purchaseOrders.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No purchase orders found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first purchase order.
          </p>
          <div className="mt-4 flex justify-center space-x-3">
            <button
              onClick={onCreateNew}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New PO
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
              disabled={pagination.page === pagination.pages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default POTable;