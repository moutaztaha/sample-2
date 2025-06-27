import React from 'react';
import { 
  Factory, 
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Calendar,
  DollarSign,
  Play
} from 'lucide-react';

interface ProductionTableProps {
  productionOrders: any[];
  loading: boolean;
  pagination: any;
  setPagination: (pagination: any) => void;
  visibleColumns: any[];
  user: any;
  handleView: (order: any) => void;
  handleEdit: (order: any) => void;
  handleStatusUpdate: (order: any, status: string) => void;
  handleIssueMaterials: (order: any) => void;
  handleCompleteProduction: (order: any) => void;
  handleDelete: (order: any) => void;
}

const ProductionTable: React.FC<ProductionTableProps> = ({
  productionOrders,
  loading,
  pagination,
  setPagination,
  visibleColumns,
  user,
  handleView,
  handleEdit,
  handleStatusUpdate,
  handleIssueMaterials,
  handleCompleteProduction,
  handleDelete
}) => {
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
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress': return <Play className="h-4 w-4 text-blue-500" />;
      case 'planned': return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'draft': return <Clock className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'planned': return 'bg-purple-100 text-purple-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_progress': return 'In Progress';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Permission helpers
  const canEdit = (order: any) => {
    return ['draft', 'planned'].includes(order.status) && 
           (user?.role === 'admin' || user?.role === 'manager');
  };

  const canDelete = (order: any) => {
    return ['draft', 'cancelled'].includes(order.status) && 
           (user?.role === 'admin' || user?.role === 'manager');
  };

  const canIssueMaterials = (order: any) => {
    return ['planned', 'in_progress'].includes(order.status) && 
           (user?.role === 'admin' || user?.role === 'manager');
  };

  const canCompleteProduction = (order: any) => {
    return order.status === 'in_progress' && 
           (user?.role === 'admin' || user?.role === 'manager');
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
              {visibleColumns.map(column => (
                <th 
                  key={column.id} 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productionOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                {visibleColumns.map(column => {
                  switch (column.id) {
                    case 'order_number':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                            <div className="text-sm text-gray-500">{order.title}</div>
                          </div>
                        </td>
                      );
                    case 'product':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{order.finished_product_name || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{order.finished_product_sku || ''}</div>
                          </div>
                        </td>
                      );
                    case 'bom':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.bom_name || 'N/A'}
                        </td>
                      );
                    case 'priority':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                            {order.priority}
                          </span>
                        </td>
                      );
                    case 'status':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(order.status)}
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {getStatusText(order.status)}
                            </span>
                          </div>
                        </td>
                      );
                    case 'quantity':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.quantity}
                        </td>
                      );
                    case 'planned_cost':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${order.planned_cost ? order.planned_cost.toFixed(2) : '0.00'}
                        </td>
                      );
                    case 'due_date':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'Not set'}
                          </div>
                        </td>
                      );
                    case 'created_by':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.created_by_name || 'Unknown'}
                        </td>
                      );
                    case 'created_at':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      );
                    case 'actions':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-1">
                            {/* View Button - Always available */}
                            <button
                              onClick={() => handleView(order)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Edit Button */}
                            {canEdit(order) && (
                              <button
                                onClick={() => handleEdit(order)}
                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                                title="Edit Order"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}

                            {/* Status Transition Buttons */}
                            {order.status === 'draft' && (
                              <button
                                onClick={() => handleStatusUpdate(order, 'planned')}
                                className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                                title="Move to Planned"
                              >
                                <Calendar className="h-4 w-4" />
                              </button>
                            )}

                            {/* Issue Materials Button */}
                            {canIssueMaterials(order) && (
                              <button
                                onClick={() => handleIssueMaterials(order)}
                                className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-50 transition-colors"
                                title="Issue Materials"
                              >
                                <Package className="h-4 w-4" />
                              </button>
                            )}

                            {/* Complete Production Button */}
                            {canCompleteProduction(order) && (
                              <button
                                onClick={() => handleCompleteProduction(order)}
                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                                title="Complete Production"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}

                            {/* Delete Button */}
                            {canDelete(order) && (
                              <button
                                onClick={() => handleDelete(order)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                title="Delete Order"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}

                            {/* Cancel Button */}
                            {['draft', 'planned', 'in_progress'].includes(order.status) && (
                              <button
                                onClick={() => handleStatusUpdate(order, 'cancelled')}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                title="Cancel Order"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    default:
                      return <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>;
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {productionOrders.length === 0 && (
        <div className="text-center py-12">
          <Factory className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No production orders found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first production order.
          </p>
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

export default ProductionTable;