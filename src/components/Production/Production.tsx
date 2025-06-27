import React, { useState, useEffect } from 'react';
import { 
  Factory, 
  Plus, 
  RefreshCw,
  Layers,
  Columns
} from 'lucide-react';
import { productionOrderService } from '../../services/productionService';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import CreateProductionOrderModal from './CreateProductionOrderModal';
import ViewProductionOrderModal from './ViewProductionOrderModal';
import EditProductionOrderModal from './EditProductionOrderModal';
import IssueMaterialsModal from './IssueMaterialsModal';
import CompleteProductionModal from './CompleteProductionModal';
import BOMsTab from '../MasterData/BOMsTab';
import { useLocation } from 'react-router-dom';
import ColumnCustomizerModal from '../Common/ColumnCustomizer';
import { useColumnPreferences } from '../../hooks/useColumnPreferences';
import ProductionTable from './ProductionTable';
import ProductionStats from './ProductionStats';
import ProductionFilters from './ProductionFilters';

const DEFAULT_COLUMNS = [
  { id: 'order_number', label: 'Order Number', visible: true, width: 180, order: 1 },
  { id: 'product', label: 'Product', visible: true, width: 180, order: 2 },
  { id: 'bom', label: 'BOM', visible: true, width: 150, order: 3 },
  { id: 'priority', label: 'Priority', visible: true, width: 100, order: 4 },
  { id: 'status', label: 'Status', visible: true, width: 120, order: 5 },
  { id: 'quantity', label: 'Quantity', visible: true, width: 100, order: 6 },
  { id: 'planned_cost', label: 'Planned Cost', visible: true, width: 120, order: 7 },
  { id: 'due_date', label: 'Due Date', visible: true, width: 120, order: 8 },
  { id: 'created_by', label: 'Created By', visible: false, width: 150, order: 9 },
  { id: 'created_at', label: 'Created', visible: false, width: 150, order: 10 },
  { id: 'actions', label: 'Actions', visible: true, width: 150, order: 11 }
];

const Production: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'boms'>('orders');
  const [productionOrders, setProductionOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [stats, setStats] = useState({
    total_orders: 0,
    draft_count: 0,
    planned_count: 0,
    in_progress_count: 0,
    completed_count: 0,
    cancelled_count: 0,
    total_planned_cost: 0,
    total_actual_cost: 0,
    avg_completion_time_days: 0
  });
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
  } = useColumnPreferences('production_order_columns', DEFAULT_COLUMNS);

  const { socket } = useSocket();
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (activeTab === 'orders') {
      loadProductionOrders();
      loadStats();
    }
    
    // Check if we should open modals from navigation state
    if (location.state) {
      if (location.state.openCreateModal) {
        setShowCreateModal(true);
      }
      if (location.state.viewProductionOrder) {
        const orderId = location.state.viewProductionOrder;
        handleViewById(orderId);
      }
      // Clear the state to prevent reopening on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [searchTerm, statusFilter, pagination.page, location.state, activeTab]);

  useEffect(() => {
    if (socket) {
      socket.on('production_order_created', loadProductionOrders);
      socket.on('production_order_updated', loadProductionOrders);
      socket.on('production_order_deleted', loadProductionOrders);

      return () => {
        socket.off('production_order_created');
        socket.off('production_order_updated');
        socket.off('production_order_deleted');
      };
    }
  }, [socket]);

  const loadProductionOrders = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await productionOrderService.getProductionOrders(params);
      setProductionOrders(response.productionOrders);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading production orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await productionOrderService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleViewById = async (id: number) => {
    try {
      const data = await productionOrderService.getProductionOrder(id);
      if (data) {
        setSelectedOrder(data);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error('Error fetching production order:', error);
    }
  };

  const handleView = (order: any) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  const handleEdit = (order: any) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handleIssueMaterials = (order: any) => {
    setSelectedOrder(order);
    setShowIssueModal(true);
  };

  const handleCompleteProduction = (order: any) => {
    setSelectedOrder(order);
    setShowCompleteModal(true);
  };

  const handleDelete = async (order: any) => {
    if (confirm(`Are you sure you want to delete production order "${order.order_number}"?`)) {
      try {
        await productionOrderService.deleteProductionOrder(order.id);
        loadProductionOrders();
        loadStats();
      } catch (error) {
        console.error('Error deleting production order:', error);
        alert('Failed to delete production order');
      }
    }
  };

  const handleStatusUpdate = async (order: any, newStatus: string) => {
    try {
      await productionOrderService.updateStatus(order.id, newStatus);
      loadProductionOrders();
      loadStats();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleModalSuccess = () => {
    loadProductionOrders();
    loadStats();
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowIssueModal(false);
    setShowCompleteModal(false);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Management</h1>
          <p className="text-gray-600">Manage manufacturing production orders and bills of materials</p>
        </div>
        <div className="flex space-x-3">
          {activeTab === 'orders' && (
            <button
              onClick={() => setShowColumnCustomizer(true)}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Columns className="h-4 w-4 mr-2" />
              Columns
            </button>
          )}
          <button
            onClick={() => activeTab === 'orders' ? loadProductionOrders() : null}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          {activeTab === 'orders' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Production Order
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('orders')}
              className={`${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              <Factory className="h-5 w-5 mr-2" />
              Production Orders
            </button>
            <button
              onClick={() => setActiveTab('boms')}
              className={`${
                activeTab === 'boms'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              <Layers className="h-5 w-5 mr-2" />
              Bills of Materials
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'orders' ? (
            <>
              {/* Stats Cards */}
              <ProductionStats stats={stats} />

              {/* Filters */}
              <ProductionFilters 
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
              />

              {/* Production Orders Table */}
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <ProductionTable 
                  productionOrders={productionOrders}
                  loading={loading}
                  pagination={pagination}
                  setPagination={setPagination}
                  visibleColumns={visibleColumns}
                  user={user}
                  handleView={handleView}
                  handleEdit={handleEdit}
                  handleStatusUpdate={handleStatusUpdate}
                  handleIssueMaterials={handleIssueMaterials}
                  handleCompleteProduction={handleCompleteProduction}
                  handleDelete={handleDelete}
                />
              </div>
            </>
          ) : (
            <BOMsTab />
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateProductionOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleModalSuccess}
      />

      <EditProductionOrderModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedOrder(null);
        }}
        onSuccess={handleModalSuccess}
        productionOrder={selectedOrder}
      />

      <ViewProductionOrderModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedOrder(null);
        }}
        productionOrder={selectedOrder}
      />

      <IssueMaterialsModal
        isOpen={showIssueModal}
        onClose={() => {
          setShowIssueModal(false);
          setSelectedOrder(null);
        }}
        onSuccess={handleModalSuccess}
        productionOrder={selectedOrder}
      />

      <CompleteProductionModal
        isOpen={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setSelectedOrder(null);
        }}
        onSuccess={handleModalSuccess}
        productionOrder={selectedOrder}
      />

      <ColumnCustomizerModal
        isOpen={showColumnCustomizer}
        onClose={() => setShowColumnCustomizer(false)}
        onSave={handleSaveColumnPreferences}
        columns={columns}
        title="Customize Production Order Columns"
      />
    </div>
  );
};

export default Production;