import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText, RefreshCw, Package, PenTool as Tool, DollarSign, Columns } from 'lucide-react';
import { bomService } from '../../services/bomService';
import BOMModal from './BOMModal';
import ViewBOMModal from './ViewBOMModal';
import ColumnCustomizerModal, { Column } from '../Common/ColumnCustomizer';
import { useColumnPreferences } from '../../hooks/useColumnPreferences';

interface BOM {
  id: number;
  name: string;
  description: string;
  version: string;
  status: string;
  finished_product_name: string;
  finished_product_sku: string;
  unit_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_cost: number;
  component_count: number;
  operation_count: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'bom', label: 'BOM', visible: true, width: 200, order: 1 },
  { id: 'finished_product', label: 'Finished Product', visible: true, width: 200, order: 2 },
  { id: 'status', label: 'Status', visible: true, width: 100, order: 3 },
  { id: 'components', label: 'Components', visible: true, width: 120, order: 4 },
  { id: 'operations', label: 'Operations', visible: true, width: 120, order: 5 },
  { id: 'total_cost', label: 'Total Cost', visible: true, width: 120, order: 6 },
  { id: 'created_by', label: 'Created By', visible: true, width: 150, order: 7 },
  { id: 'actions', label: 'Actions', visible: true, width: 120, order: 8 }
];

const BOMsTab: React.FC = () => {
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);
  const [viewingBOM, setViewingBOM] = useState<BOM | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  const { 
    columns, 
    visibleColumns, 
    showColumnCustomizer, 
    setShowColumnCustomizer, 
    handleSaveColumnPreferences 
  } = useColumnPreferences('bom_columns', DEFAULT_COLUMNS);

  useEffect(() => {
    fetchBOMs();
  }, [searchTerm, statusFilter, pagination.page]);

  const fetchBOMs = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await bomService.getBOMs(params);
      setBOMs(response.boms);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error fetching BOMs:', error);
      alert('Failed to fetch BOMs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete BOM "${name}"?`)) {
      try {
        await bomService.deleteBOM(id);
        fetchBOMs();
      } catch (error) {
        console.error('Error deleting BOM:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete BOM');
      }
    }
  };

  const handleEdit = (bom: BOM) => {
    setEditingBOM(bom);
    setShowModal(true);
  };

  const handleView = (bom: BOM) => {
    setViewingBOM(bom);
    setShowViewModal(true);
  };

  const handleAdd = () => {
    setEditingBOM(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingBOM(null);
  };

  const handleViewModalClose = () => {
    setShowViewModal(false);
    setViewingBOM(null);
  };

  const handleModalSuccess = () => {
    fetchBOMs();
    handleModalClose();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
      case 'inactive':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>;
      case 'draft':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Draft</span>;
      case 'archived':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Archived</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bill of Materials (BOM)</h2>
          <p className="text-sm text-gray-600">Manage manufacturing recipes and assembly instructions</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowColumnCustomizer(true)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Columns className="h-4 w-4 mr-2" />
            Columns
          </button>
          <button
            onClick={fetchBOMs}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add BOM
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search BOMs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* BOMs Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
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
              {boms.map((bom) => (
                <tr key={bom.id} className="hover:bg-gray-50">
                  {visibleColumns.map(column => {
                    switch (column.id) {
                      case 'bom':
                        return (
                          <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FileText className="h-5 w-5 text-blue-500 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{bom.name}</div>
                                <div className="text-xs text-gray-500">v{bom.version}</div>
                              </div>
                            </div>
                          </td>
                        );
                      case 'finished_product':
                        return (
                          <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                            {bom.finished_product_name ? (
                              <div className="text-sm text-gray-900">
                                {bom.finished_product_name}
                                {bom.finished_product_sku && (
                                  <span className="text-xs text-gray-500 ml-1">({bom.finished_product_sku})</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Not specified</span>
                            )}
                          </td>
                        );
                      case 'status':
                        return (
                          <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(bom.status)}
                          </td>
                        );
                      case 'components':
                        return (
                          <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Package className="h-4 w-4 text-gray-400 mr-2" />
                              {bom.component_count || 0}
                            </div>
                          </td>
                        );
                      case 'operations':
                        return (
                          <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Tool className="h-4 w-4 text-gray-400 mr-2" />
                              {bom.operation_count || 0}
                            </div>
                          </td>
                        );
                      case 'total_cost':
                        return (
                          <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                              {bom.total_cost ? bom.total_cost.toFixed(2) : '0.00'}
                            </div>
                          </td>
                        );
                      case 'created_by':
                        return (
                          <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {bom.created_by_name || 'Unknown'}
                          </td>
                        );
                      case 'actions':
                        return (
                          <td key={column.id} className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleView(bom)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                                title="View BOM Details"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(bom)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                title="Edit BOM"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(bom.id, bom.name)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                title="Delete BOM"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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

        {boms.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No BOMs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first Bill of Materials.'
              }
            </p>
            <button
              onClick={handleAdd}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First BOM
            </button>
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
      </div>

      {/* Modals */}
      <BOMModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        bom={editingBOM}
      />

      <ViewBOMModal
        isOpen={showViewModal}
        onClose={handleViewModalClose}
        bom={viewingBOM}
      />

      <ColumnCustomizerModal
        isOpen={showColumnCustomizer}
        onClose={() => setShowColumnCustomizer(false)}
        onSave={handleSaveColumnPreferences}
        columns={columns}
        title="Customize BOM Columns"
      />
    </div>
  );
};

export default BOMsTab;