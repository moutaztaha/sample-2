import React, { useState } from 'react';
import { 
  Package, 
  Edit, 
  Trash2, 
  AlertTriangle,
  Settings,
  History,
  TrendingUp,
  TrendingDown,
  Image
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface InventoryTableProps {
  items: any[];
  loading: boolean;
  pagination: any;
  setPagination: (pagination: any) => void;
  visibleColumns: any[];
  handleEditItem: (id: number) => void;
  handleViewStockMovement: (id: number) => void;
  handleStockAdjustment: (item: any) => void;
  handleDeleteItem: (id: number, name: string) => void;
  handleAddItemClick: () => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  loading,
  pagination,
  setPagination,
  visibleColumns,
  handleEditItem,
  handleViewStockMovement,
  handleStockAdjustment,
  handleDeleteItem,
  handleAddItemClick
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { hasPermission } = useAuth();

  const getStatusColor = (item: any) => {
    if (item.quantity === 0) return 'bg-red-100 text-red-800';
    if (item.is_low_stock) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (item: any) => {
    if (item.quantity === 0) return 'Out of Stock';
    if (item.is_low_stock) return 'Low Stock';
    return 'In Stock';
  };

  const getPriceTrend = (currentPrice: number, lastPrice?: number) => {
    if (!lastPrice || lastPrice === 0) return null;
    
    if (currentPrice > lastPrice) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (currentPrice < lastPrice) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };
  
  const getItemTypeLabel = (itemType: string) => {
    switch (itemType) {
      case 'raw_material': return 'Raw Material';
      case 'semi_finished_product': return 'Semi-Finished';
      case 'finished_product': return 'Finished Product';
      default: return itemType;
    }
  };
  
  const getItemTypeColor = (itemType: string) => {
    switch (itemType) {
      case 'raw_material': return 'bg-blue-100 text-blue-800';
      case 'semi_finished_product': return 'bg-purple-100 text-purple-800';
      case 'finished_product': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setPreviewImage(imageUrl);
  };

  const closeImagePreview = () => {
    setPreviewImage(null);
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
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {visibleColumns.map(column => {
                  switch (column.id) {
                    case 'name':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          </div>
                        </td>
                      );
                    case 'sku':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.sku}
                        </td>
                      );
                    case 'image':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                          {item.image_url ? (
                            <div 
                              className="h-10 w-10 relative rounded overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer"
                              onClick={() => handleImageClick(item.image_url)}
                            >
                              <img 
                                src={item.image_url} 
                                alt={item.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=No+Image';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 flex items-center justify-center rounded bg-gray-100 border border-gray-200">
                              <Image className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </td>
                      );
                    case 'category_name':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.category_name || 'Uncategorized'}
                        </td>
                      );
                    case 'subcategory_name':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.subcategory_name || '-'}
                        </td>
                      );
                    case 'quantity':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            {item.quantity} {item.unit_name && `${item.unit_name}`}
                            {item.is_low_stock && item.quantity > 0 && (
                              <AlertTriangle className="w-4 h-4 text-yellow-500 ml-2" />
                            )}
                          </div>
                        </td>
                      );
                    case 'unit_name':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.unit_name || '-'}
                        </td>
                      );
                    case 'location_name':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.location_name || '-'}
                        </td>
                      );
                    case 'supplier_name':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.supplier_name || '-'}
                        </td>
                      );
                    case 'unit_price':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            ${item.unit_price.toFixed(2)}
                            {getPriceTrend(item.unit_price, item.last_price) && (
                              <span className="ml-2">
                                {getPriceTrend(item.unit_price, item.last_price)}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    case 'last_price':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.last_price ? `$${item.last_price.toFixed(2)}` : '-'}
                        </td>
                      );
                    case 'average_price':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.average_price ? `$${item.average_price.toFixed(2)}` : '-'}
                        </td>
                      );
                    case 'total_value':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${item.total_value.toFixed(2)}
                        </td>
                      );
                    case 'min_quantity':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.min_quantity}
                        </td>
                      );
                    case 'max_quantity':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.max_quantity}
                        </td>
                      );
                    case 'item_type':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getItemTypeColor(item.item_type)}`}>
                            {getItemTypeLabel(item.item_type)}
                          </span>
                        </td>
                      );
                    case 'status':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item)}`}>
                            {getStatusText(item)}
                          </span>
                        </td>
                      );
                    case 'actions':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {hasPermission('inventory.edit') && (
                              <button 
                                onClick={() => handleEditItem(item.id)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                title="Edit Item"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            
                            {hasPermission('inventory.adjust_stock') && (
                              <button 
                                onClick={() => handleStockAdjustment(item)}
                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                                title="Adjust Stock"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                            )}
                            
                            {hasPermission('inventory.view_stock_movements') && (
                              <button 
                                onClick={() => handleViewStockMovement(item.id)}
                                className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                                title="View Stock Movement History"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            )}
                            
                            {hasPermission('inventory.delete') && (
                              <button 
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                title="Delete Item"
                              >
                                <Trash2 className="w-4 h-4" />
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
      
      {items.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first inventory item.
          </p>
          {hasPermission('inventory.create') && (
            <button
              onClick={handleAddItemClick}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Package className="w-4 h-4 mr-2" />
              Add First Item
            </button>
          )}
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeImagePreview}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] object-contain bg-white p-2 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Image+Not+Found';
              }}
            />
            <button 
              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-lg"
              onClick={closeImagePreview}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryTable;