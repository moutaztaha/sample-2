import React, { useState, useEffect } from 'react';
import { X, Factory, User, Calendar, Package, DollarSign, FileText, CheckCircle, XCircle, Play, Clock } from 'lucide-react';
import { productionOrderService } from '../../services/productionService';

interface ViewProductionOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionOrder: any;
}

const ViewProductionOrderModal: React.FC<ViewProductionOrderModalProps> = ({ isOpen, onClose, productionOrder }) => {
  const [fullOrder, setFullOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (isOpen && productionOrder) {
      loadFullOrder();
    }
  }, [isOpen, productionOrder]);

  const loadFullOrder = async () => {
    try {
      setLoading(true);
      const data = await productionOrderService.getProductionOrder(productionOrder.id);
      setFullOrder(data);
    } catch (error) {
      console.error('Error loading production order details:', error);
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

  const getOperationStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'skipped': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOperationStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Play className="h-4 w-4 text-blue-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'skipped': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!isOpen || !productionOrder) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-6xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <Factory className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Production Order Details</h2>
              <p className="text-sm text-gray-600">{productionOrder.order_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('details')}
              className={`${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              <FileText className="h-5 w-5 mr-2" />
              Details
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`${
                activeTab === 'materials'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              <Package className="h-5 w-5 mr-2" />
              Materials
            </button>
            <button
              onClick={() => setActiveTab('operations')}
              className={`${
                activeTab === 'operations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              <Play className="h-5 w-5 mr-2" />
              Operations
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              <Clock className="h-5 w-5 mr-2" />
              History
            </button>
          </nav>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : fullOrder ? (
            <div className="p-4 sm:p-6">
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Header Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{fullOrder.title}</h3>
                        <p className="text-gray-600">{fullOrder.description}</p>
                      </div>

                      <div className="flex items-center space-x-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(fullOrder.priority)}`}>
                          {fullOrder.priority} priority
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(fullOrder.status)}`}>
                          {getStatusText(fullOrder.status)}
                        </span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Package className="h-4 w-4 mr-2" />
                        BOM: {fullOrder.bom_name} (v{fullOrder.bom_version})
                      </div>

                      {fullOrder.finished_product_name && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Package className="h-4 w-4 mr-2" />
                          Finished Product: {fullOrder.finished_product_name}
                          {fullOrder.finished_product_sku && ` (${fullOrder.finished_product_sku})`}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        Created by: {fullOrder.created_by_name}
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        Created: {new Date(fullOrder.created_at).toLocaleDateString()}
                      </div>

                      {fullOrder.start_date && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          Start Date: {new Date(fullOrder.start_date).toLocaleDateString()}
                        </div>
                      )}

                      {fullOrder.due_date && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          Due Date: {new Date(fullOrder.due_date).toLocaleDateString()}
                        </div>
                      )}

                      {fullOrder.completion_date && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          Completion Date: {new Date(fullOrder.completion_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Production Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Production Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Quantity to Produce</p>
                        <p className="text-lg font-semibold text-gray-900">{fullOrder.quantity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Materials</p>
                        <p className="text-lg font-semibold text-gray-900">{fullOrder.items?.length || 0} items</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Operations</p>
                        <p className="text-lg font-semibold text-gray-900">{fullOrder.operations?.length || 0} steps</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Planned Cost</p>
                        <p className="text-lg font-semibold text-gray-900">${fullOrder.planned_cost?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {fullOrder.notes && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                      <p className="text-gray-700">{fullOrder.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Materials Tab */}
              {activeTab === 'materials' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Required Materials</h3>
                  
                  {fullOrder.items && fullOrder.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Material
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Required Qty
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Issued Qty
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Available
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cost
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {fullOrder.items.map((item: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                                  <div className="text-sm text-gray-500">{item.item_sku}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.component_type === 'bom' ? 'Sub-Assembly' : 'Inventory Item'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.required_quantity} {item.unit_name || 'units'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.issued_quantity} {item.unit_name || 'units'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className={item.available_quantity < (item.required_quantity - item.issued_quantity) ? 'text-red-600' : 'text-green-600'}>
                                  {item.available_quantity || 0} {item.unit_name || 'units'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  item.status === 'issued' ? 'bg-green-100 text-green-800' :
                                  item.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${item.total_cost?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Package className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No materials found</p>
                    </div>
                  )}

                  {/* Material Issues History */}
                  {fullOrder.issues && fullOrder.issues.length > 0 && (
                    <div className="mt-8">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Material Issue History</h4>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        {fullOrder.issues.map((issue: any, index: number) => (
                          <div key={index} className="bg-white p-3 rounded border border-gray-200">
                            <div className="flex justify-between">
                              <div>
                                <span className="font-medium">{issue.item_name}</span>
                                <span className="text-sm text-gray-600 ml-2">
                                  {issue.quantity} units issued
                                </span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(issue.issued_date).toLocaleString()}
                              </div>
                            </div>
                            <div className="mt-1 text-sm">
                              <span className="text-gray-600">Issued by: </span>
                              <span className="text-gray-900">{issue.issued_by_name}</span>
                            </div>
                            {issue.notes && (
                              <div className="mt-1 text-sm text-gray-600">
                                Notes: {issue.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Operations Tab */}
              {activeTab === 'operations' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Manufacturing Operations</h3>
                  
                  {fullOrder.operations && fullOrder.operations.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Sequence
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Operation
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Estimated Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actual Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Machine/Equipment
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Assigned To
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {fullOrder.operations.map((operation: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {operation.sequence_number}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{operation.operation_name}</div>
                                  <div className="text-sm text-gray-500">{operation.description}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {getOperationStatusIcon(operation.status)}
                                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOperationStatusColor(operation.status)}`}>
                                    {operation.status.charAt(0).toUpperCase() + operation.status.slice(1)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {operation.estimated_time_minutes} min
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {operation.actual_time_minutes ? `${operation.actual_time_minutes} min` : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {operation.machine_required || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {operation.assigned_to_name || 'Unassigned'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Play className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No operations found</p>
                    </div>
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Production History</h3>
                  
                  {/* Completion Records */}
                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-3">Completion Records</h4>
                    {fullOrder.completions && fullOrder.completions.length > 0 ? (
                      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        {fullOrder.completions.map((completion: any, index: number) => (
                          <div key={index} className="bg-white p-3 rounded border border-gray-200">
                            <div className="flex justify-between">
                              <div>
                                <span className="font-medium">Completed: {completion.quantity} units</span>
                                <span className={`ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  completion.quality_check_passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {completion.quality_check_passed ? 'Quality Passed' : 'Quality Failed'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(completion.completion_date).toLocaleString()}
                              </div>
                            </div>
                            <div className="mt-1 text-sm">
                              <span className="text-gray-600">Completed by: </span>
                              <span className="text-gray-900">{completion.completed_by_name}</span>
                            </div>
                            {completion.batch_number && (
                              <div className="mt-1 text-sm text-gray-600">
                                Batch: {completion.batch_number}
                              </div>
                            )}
                            {completion.notes && (
                              <div className="mt-1 text-sm text-gray-600">
                                Notes: {completion.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">No completion records found</p>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-3">Production Timeline</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="relative border-l-2 border-gray-200 ml-3 pl-8 space-y-6">
                        {/* Created */}
                        <div className="relative">
                          <div className="absolute -left-10 mt-1.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <FileText className="h-3 w-3 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Order Created</p>
                            <p className="text-sm text-gray-600">
                              {new Date(fullOrder.created_at).toLocaleString()} by {fullOrder.created_by_name}
                            </p>
                          </div>
                        </div>

                        {/* Started */}
                        {fullOrder.status !== 'draft' && (
                          <div className="relative">
                            <div className="absolute -left-10 mt-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                              <Calendar className="h-3 w-3 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Production Planned</p>
                              <p className="text-sm text-gray-600">
                                {fullOrder.start_date ? new Date(fullOrder.start_date).toLocaleDateString() : 'No start date set'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* In Progress */}
                        {['in_progress', 'completed'].includes(fullOrder.status) && (
                          <div className="relative">
                            <div className="absolute -left-10 mt-1.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                              <Play className="h-3 w-3 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Production Started</p>
                              <p className="text-sm text-gray-600">
                                Materials issued and production in progress
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Completed */}
                        {fullOrder.status === 'completed' && (
                          <div className="relative">
                            <div className="absolute -left-10 mt-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                              <CheckCircle className="h-3 w-3 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Production Completed</p>
                              <p className="text-sm text-gray-600">
                                {fullOrder.completion_date ? new Date(fullOrder.completion_date).toLocaleDateString() : 'Completion date not recorded'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Cancelled */}
                        {fullOrder.status === 'cancelled' && (
                          <div className="relative">
                            <div className="absolute -left-10 mt-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                              <XCircle className="h-3 w-3 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Production Cancelled</p>
                              <p className="text-sm text-gray-600">
                                Order was cancelled
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Failed to load production order details</p>
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

export default ViewProductionOrderModal;