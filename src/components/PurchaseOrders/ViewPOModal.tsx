import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, User, Calendar, Package, DollarSign, FileText, Building2 } from 'lucide-react';
import { purchaseOrderService } from '../../services/purchaseOrderService';

interface ViewPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: any;
}

const ViewPOModal: React.FC<ViewPOModalProps> = ({ isOpen, onClose, purchaseOrder }) => {
  const [fullPO, setFullPO] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && purchaseOrder) {
      loadFullPO();
    }
  }, [isOpen, purchaseOrder]);

  const loadFullPO = async () => {
    try {
      setLoading(true);
      const data = await purchaseOrderService.getPurchaseOrder(purchaseOrder.id);
      setFullPO(data);
    } catch (error) {
      console.error('Error loading purchase order details:', error);
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

  if (!isOpen || !purchaseOrder) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-6xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <ShoppingCart className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Purchase Order Details</h2>
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
          ) : fullPO ? (
            <div className="p-4 sm:p-6 space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{fullPO.title}</h3>
                    <p className="text-gray-600">{fullPO.description}</p>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(fullPO.priority)}`}>
                      {fullPO.priority} priority
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(fullPO.status)}`}>
                      {getStatusText(fullPO.status)}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="h-4 w-4 mr-2" />
                    PO Number: {fullPO.po_number}
                  </div>

                  {fullPO.requisition_title && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Package className="h-4 w-4 mr-2" />
                      From Requisition: {fullPO.requisition_title}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    Created by: {fullPO.created_by_name}
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Created: {new Date(fullPO.created_at).toLocaleDateString()}
                  </div>

                  {fullPO.order_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Order Date: {new Date(fullPO.order_date).toLocaleDateString()}
                    </div>
                  )}

                  {fullPO.expected_delivery_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Expected Delivery: {new Date(fullPO.expected_delivery_date).toLocaleDateString()}
                    </div>
                  )}

                  {fullPO.approved_by_name && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      Approved by: {fullPO.approved_by_name}
                    </div>
                  )}
                </div>
              </div>

              {/* Supplier Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Building2 className="h-4 w-4 text-blue-600 mr-2" />
                  Supplier Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">{fullPO.supplier_name}</p>
                    <p className="text-gray-600">Contact: {fullPO.supplier_contact || 'N/A'}</p>
                    <p className="text-gray-600">Email: {fullPO.supplier_email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone: {fullPO.supplier_phone || 'N/A'}</p>
                    <p className="text-gray-600">Address: {fullPO.supplier_address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Order Items</h4>
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
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Received
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fullPO.items?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                              <div className="text-sm text-gray-500">{item.item_description}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.sku || item.inventory_sku || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.quantity} {item.unit_name || 'units'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${item.unit_price?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${item.total_price?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.received_quantity || 0} {item.unit_name || 'units'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Amounts */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Subtotal:</span>
                        <span className="text-sm font-medium text-gray-900">${fullPO.subtotal?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Tax:</span>
                        <span className="text-sm font-medium text-gray-900">${fullPO.tax_amount?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Shipping:</span>
                        <span className="text-sm font-medium text-gray-900">${fullPO.shipping_cost?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
                      <span className="text-lg font-medium text-gray-900">Total:</span>
                      <span className="text-xl font-bold text-blue-600">${fullPO.total_amount?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {(fullPO.notes || fullPO.payment_terms || fullPO.shipping_address) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fullPO.payment_terms && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Payment Terms</h4>
                      <p className="text-gray-700">{fullPO.payment_terms}</p>
                    </div>
                  )}
                  
                  {fullPO.shipping_address && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Shipping Address</h4>
                      <p className="text-gray-700">{fullPO.shipping_address}</p>
                    </div>
                  )}
                  
                  {fullPO.notes && (
                    <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                      <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                      <p className="text-gray-700">{fullPO.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Failed to load purchase order details</p>
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

export default ViewPOModal;